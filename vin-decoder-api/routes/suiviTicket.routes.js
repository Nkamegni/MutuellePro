// =====================================================================
// Mutuelle Pro Assurances — Suivi de ticket anonyme (par identifiant)
// Routes publiques, sans authentification :
//   POST /api/suivi-ticket/demander-code
//   POST /api/suivi-ticket/verifier-code
// =====================================================================
// Clé d'entrée : email OU téléphone fourni au moment de la demande
// d'origine (décision de Roger, 27/08/2026). Réponse volontairement
// neutre côté "demander-code" — ne révèle jamais si un identifiant a
// des tickets ou non.
//
// Canal d'envoi RÉEL selon le type d'identifiant :
//   - email      -> envoi effectif dès maintenant (SMTP déjà configuré)
//   - téléphone  -> en attente (SMS/WhatsApp Business API non choisi,
//                   voir lib/envoiCodeSuivi.js, décision du 27/08/2026)
// =====================================================================

const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { envoyerCodeSuivi } = require('../lib/envoiCodeSuivi');

const mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
});

function estUnEmail(identifiant) {
    return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(identifiant);
}

async function envoyerCodeParEmail(email, code) {
    try {
        await mailTransporter.sendMail({
            from: '"Mutuelle Pro Assurances" <no-reply@mutuelleproassurances.com>',
            to: email,
            subject: `Code de suivi du statut de votre demande : ${code}`,
            html: `
                <p>Bonjour,</p>
                <p>Voici votre code pour suivre le statut de votre demande (valable 10 minutes) :</p>
                <p style="font-size:24px; font-weight:bold; letter-spacing:4px;">${code}</p>
            `,
        });
        return true;
    } catch (err) {
        console.error('[envoyerCodeParEmail] Erreur envoi :', err);
        return false;
    }
}

const tentativesParIp = new Map();
const FENETRE_MS = 15 * 60 * 1000;
const MAX_DEMANDES = 5;
function estBloque(cle) {
    const maintenant = Date.now();
    const historique = (tentativesParIp.get(cle) || []).filter((t) => maintenant - t < FENETRE_MS);
    tentativesParIp.set(cle, historique);
    return historique.length >= MAX_DEMANDES;
}
function enregistrerDemande(cle) {
    const historique = tentativesParIp.get(cle) || [];
    historique.push(Date.now());
    tentativesParIp.set(cle, historique);
}

module.exports = function (pool) {
    const router = express.Router();

    router.post('/demander-code', async (req, res) => {
        const identifiant = (req.body.identifiant || '').trim();
        if (!identifiant || identifiant.length < 6) {
            return res.status(400).json({ succes: false, erreurs: ['email ou téléphone invalide'] });
        }

        const cle = `${req.ip}|${identifiant}`;
        if (estBloque(cle)) {
            return res.status(429).json({ succes: false, erreurs: ['trop de demandes, réessayez dans quelques minutes'] });
        }
        enregistrerDemande(cle);

        try {
            const code = crypto.randomInt(100000, 999999).toString();
            await pool.query(
                'INSERT INTO site.suivi_ticket_codes (identifiant, code) VALUES ($1, $2)',
                [identifiant, code]
            );

            let canalDisponible;
            if (estUnEmail(identifiant)) {
                canalDisponible = await envoyerCodeParEmail(identifiant, code);
            } else {
                const resultatEnvoi = await envoyerCodeSuivi(identifiant, code);
                canalDisponible = resultatEnvoi.envoye;
            }

            // Réponse TOUJOURS générique sur l'existence de tickets pour cet
            // identifiant (pas d'énumération possible) — mais honnête sur
            // l'état du canal, qui ne dépend que du TYPE d'identifiant.
            return res.status(200).json({ succes: true, canal_disponible: canalDisponible });
        } catch (err) {
            console.error('[POST /api/suivi-ticket/demander-code] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    router.post('/verifier-code', async (req, res) => {
        const identifiant = (req.body.identifiant || '').trim();
        const code = (req.body.code || '').trim();
        if (!identifiant || !code) {
            return res.status(400).json({ succes: false, erreurs: ['identifiant et code requis'] });
        }

        try {
            const resultat = await pool.query(
                `SELECT id_code, tentatives FROM site.suivi_ticket_codes
                 WHERE identifiant = $1 AND code = $2 AND utilise = false AND date_expiration > now()
                 ORDER BY date_creation DESC LIMIT 1`,
                [identifiant, code]
            );

            if (resultat.rowCount === 0) {
                await pool.query(
                    `UPDATE site.suivi_ticket_codes SET tentatives = tentatives + 1
                     WHERE identifiant = $1 AND utilise = false AND date_expiration > now()`,
                    [identifiant]
                );
                return res.status(401).json({ succes: false, erreurs: ['code invalide ou expiré'] });
            }

            const { id_code, tentatives } = resultat.rows[0];
            if (tentatives >= 5) {
                return res.status(429).json({ succes: false, erreurs: ['trop de tentatives, demandez un nouveau code'] });
            }

            await pool.query('UPDATE site.suivi_ticket_codes SET utilise = true WHERE id_code = $1', [id_code]);

            const tickets = await pool.query(
                `SELECT t.code_ticket, tt.libelle_fr AS type_libelle_fr, st.libelle_fr AS statut_libelle_fr, t.date_creation
                 FROM site.tickets t
                 JOIN site.type_ticket tt ON tt.id_type_ticket = t.id_type_ticket
                 JOIN site.statut_ticket st ON st.id_statut_ticket = t.id_statut_ticket
                 WHERE t.email_contact = $1 OR t.telephone_contact = $1
                 ORDER BY t.date_creation DESC`,
                [identifiant]
            );

            return res.status(200).json({ succes: true, tickets: tickets.rows });
        } catch (err) {
            console.error('[POST /api/suivi-ticket/verifier-code] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    return router;
};
