// =====================================================================
// Mutuelle Pro Assurances — Helpdesk Volet 2
// Routes : POST /api/connexion, POST /api/deconnexion
// =====================================================================
//
// Nouvelles dépendances npm requises sur le VPS AVANT déploiement :
//
//   npm install express-session connect-pg-simple
//
// Prérequis : table site.session créée (voir 002_helpdesk_volet2_session.sql)
// et middleware de session déjà configuré dans server.js (voir bloc à
// insérer séparément, fourni avec ce fichier) AVANT le montage de ce
// routeur, sinon req.session sera undefined.
// =====================================================================

const express = require('express');
const argon2 = require('argon2');
const nodemailer = require('nodemailer');
const { gabaritEmail, corpsConnexionReussie } = require('../lib/gabaritEmail');
const { analyserNavigateur, analyserSysteme } = require('../lib/analyseurUserAgent');
const { genererEtEnvoyerCode, verifierCode } = require('../lib/verificationConnexion');
const { masquerEmail, masquerTelephone } = require('../lib/masquage');

const mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
});

// ---------------------------------------------------------------------
// Limitation anti-brute-force — auto-contenue dans ce fichier plutôt que
// de dépendre de createRateLimiter() déjà présent ailleurs dans server.js,
// pour ne pas coupler ce routeur à l'implémentation interne d'un autre
// fichier. Même principe : compteur en mémoire par clé (ici IP + email/
// téléphone tenté), fenêtre glissante.
//
// Limite : 5 tentatives / 15 minutes par couple (IP, identifiant tenté).
// Le blocage porte sur le COUPLE, pas sur l'IP seule ni l'identifiant
// seul : ça évite qu'un attaquant bloque le compte d'un client légitime
// en multipliant les échecs depuis une autre IP (déni de service ciblé),
// tout en limitant le brute-force classique depuis une même IP.
// ---------------------------------------------------------------------
const tentatives = new Map(); // clé: "ip|identifiant" -> [timestamps]
const FENETRE_MS = 15 * 60 * 1000;
const MAX_TENTATIVES = 5;

function estBloque(cle) {
    const maintenant = Date.now();
    const historique = (tentatives.get(cle) || []).filter(t => maintenant - t < FENETRE_MS);
    tentatives.set(cle, historique);
    return historique.length >= MAX_TENTATIVES;
}

function enregistrerEchec(cle) {
    const historique = tentatives.get(cle) || [];
    historique.push(Date.now());
    tentatives.set(cle, historique);
}

function reinitialiser(cle) {
    tentatives.delete(cle);
}

module.exports = function (pool) {
    const router = express.Router();

    router.post('/connexion', async (req, res) => {
        const { identifiant, mot_de_passe } = req.body; // identifiant = email OU téléphone

        if (!identifiant || !mot_de_passe) {
            return res.status(400).json({ succes: false, erreurs: ['identifiant et mot_de_passe requis'] });
        }

        const cle = `${req.ip}|${identifiant}`;
        if (estBloque(cle)) {
            return res.status(429).json({
                succes: false,
                erreurs: ['trop de tentatives, réessayez dans quelques minutes']
            });
        }

        try {
            const resultat = await pool.query(
                `SELECT id_utilisateur, email, telephone, nom, prenom, mot_de_passe_hache, statut_compte
                 FROM site.utilisateurs
                 WHERE email = $1 OR telephone = $1`,
                [identifiant]
            );

            // Message volontairement identique en cas d'identifiant inconnu
            // OU de mot de passe incorrect — ne jamais révéler lequel des
            // deux est en cause (évite l'énumération de comptes existants).
            if (resultat.rowCount === 0) {
                enregistrerEchec(cle);
                return res.status(401).json({ succes: false, erreurs: ['identifiant ou mot de passe incorrect'] });
            }

            const compte = resultat.rows[0];

            if (compte.statut_compte !== 'actif') {
                return res.status(403).json({ succes: false, erreurs: ['compte suspendu, contactez-nous'] });
            }

            const motDePasseValide = await argon2.verify(compte.mot_de_passe_hache, mot_de_passe);
            if (!motDePasseValide) {
                enregistrerEchec(cle);
                return res.status(401).json({ succes: false, erreurs: ['identifiant ou mot de passe incorrect'] });
            }

            reinitialiser(cle);

            // 2FA (02/09/2026) : plus de session créée ici. On génère et
            // envoie le code, la session ne sera créée qu'après vérification
            // (voir POST /connexion/verifier-code plus bas).
            const nomAffiche = [compte.prenom, compte.nom].filter(Boolean).join(' ') || compte.email;
            try {
                await genererEtEnvoyerCode({
                    pool, mailTransporter, typeCompte: 'client', idCompte: compte.id_utilisateur,
                    email: compte.email, nomComplet: nomAffiche, referenceCompte: compte.id_utilisateur, req,
                });
            } catch (err) {
                console.error('[POST /api/connexion] Erreur génération/envoi du code :', err);
                return res.status(500).json({ succes: false, erreurs: ["erreur lors de l'envoi du code de connexion, veuillez réessayer"] });
            }

            return res.status(200).json({
                succes: true, code_requis: true, id_compte: compte.id_utilisateur,
                email_masque: masquerEmail(compte.email),
                telephone_masque: masquerTelephone(compte.telephone),
            });
        } catch (err) {
            console.error('[POST /api/connexion] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    // 2FA (02/09/2026) — étape 2 : vérifie le code, ne crée la session
    // qu'à ce moment-là. C'est ICI que vit désormais toute la logique
    // qui était avant dans le callback de regenerate().
    router.post('/connexion/verifier-code', async (req, res) => {
        const { id_compte, code } = req.body;
        if (!Number.isInteger(id_compte) || !code) {
            return res.status(400).json({ succes: false, erreurs: ['id_compte et code requis'] });
        }

        try {
            const resultatVerif = await verifierCode({ pool, typeCompte: 'client', idCompte: id_compte, code });
            if (!resultatVerif.valide) {
                const messages = {
                    aucun_code_actif: 'aucun code actif — recommencez la connexion',
                    trop_de_tentatives: 'trop de tentatives — recommencez la connexion',
                    expire: 'code expiré — recommencez la connexion',
                    code_incorrect: 'code incorrect',
                };
                return res.status(401).json({ succes: false, erreurs: [messages[resultatVerif.motif] || 'code invalide'] });
            }

            const resultatCompte = await pool.query(
                'SELECT id_utilisateur, email, telephone, nom, prenom FROM site.utilisateurs WHERE id_utilisateur = $1',
                [id_compte]
            );
            if (resultatCompte.rowCount === 0) {
                return res.status(404).json({ succes: false, erreurs: ['compte introuvable'] });
            }
            const compte = resultatCompte.rows[0];

            let derniereConnexionPrecedente = null;
            try {
                const precedente = await pool.query(
                    `SELECT date_connexion, adresse_ip FROM site.historique_connexions
                     WHERE type_compte = 'client' AND id_compte = $1
                     ORDER BY date_connexion DESC LIMIT 1`,
                    [id_compte]
                );
                if (precedente.rowCount > 0) derniereConnexionPrecedente = precedente.rows[0];
            } catch (err) {
                console.error('[POST /api/connexion/verifier-code] Erreur lecture historique_connexions :', err);
            }

            req.session.regenerate(async (err) => {
                if (err) {
                    console.error('[POST /api/connexion/verifier-code] Erreur régénération session :', err);
                    return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
                }

                req.session.id_utilisateur = compte.id_utilisateur;

                pool.query(
                    'UPDATE site.utilisateurs SET date_derniere_connexion = now() WHERE id_utilisateur = $1',
                    [compte.id_utilisateur]
                ).catch(err => console.error('[POST /api/connexion/verifier-code] Erreur mise à jour date_derniere_connexion :', err));

                try {
                    const inseree = await pool.query(
                        `INSERT INTO site.historique_connexions (type_compte, id_compte, adresse_ip)
                         VALUES ('client', $1, $2) RETURNING id_historique`,
                        [compte.id_utilisateur, req.ip]
                    );
                    req.session.id_historique_connexion = inseree.rows[0].id_historique;
                } catch (err) {
                    console.error('[POST /api/connexion/verifier-code] Erreur écriture historique_connexions :', err);
                }

                const nomAffiche = [compte.prenom, compte.nom].filter(Boolean).join(' ') || compte.email;
                mailTransporter.sendMail({
                    from: '"Mutuelle Pro Assurances" <no-reply@mutuelleproassurances.com>',
                    to: compte.email,
                    subject: 'Connexion réussie à votre espace client',
                    html: gabaritEmail('Connexion réussie à votre espace client', corpsConnexionReussie({
                        nomComplet: nomAffiche,
                        typeCompte: 'client',
                        referenceCompte: compte.id_utilisateur,
                        date: new Date(),
                        ip: req.ip,
                        navigateur: analyserNavigateur(req.headers['user-agent']),
                        systeme: analyserSysteme(req.headers['user-agent']),
                    })),
                }).then((info) => {
                    pool.query(
                        `INSERT INTO site.no_reply_messages_envoyes (message_id, destinataire, type_message, reference_compte)
                         VALUES ($1, $2, $3, $4)`,
                        [info.messageId, compte.email, 'notification_connexion_client', String(compte.id_utilisateur)]
                    ).catch((err) => console.error('[POST /api/connexion/verifier-code] Erreur journalisation no-reply (ignorée) :', err));
                }).catch(err => console.error('[POST /api/connexion/verifier-code] Erreur envoi notification connexion :', err));

                return res.status(200).json({
                    succes: true,
                    compte: {
                        id_utilisateur: compte.id_utilisateur,
                        email: compte.email,
                        telephone: compte.telephone
                    },
                    derniere_connexion_precedente: derniereConnexionPrecedente,
                    adresse_ip_actuelle: req.ip
                });
            });
        } catch (err) {
            console.error('[POST /api/connexion/verifier-code] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    router.post('/deconnexion', (req, res) => {
        if (!req.session) {
            return res.status(200).json({ succes: true });
        }

        req.session.destroy((err) => {
            if (err) {
                console.error('[POST /api/deconnexion] Erreur destruction session :', err);
                return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
            }
            res.clearCookie('connect.sid');
            return res.status(200).json({ succes: true });
        });
    });

    return router;
};

// =====================================================================
// Exemples d'appel côté frontend (à intégrer au §6.3, pas dans ce tour) :
//
// fetch('/api/connexion', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     credentials: 'include',           // indispensable pour envoyer/recevoir le cookie de session
//     body: JSON.stringify({ identifiant: 'client@exemple.com', mot_de_passe: '...' })
// });
//
// fetch('/api/deconnexion', { method: 'POST', credentials: 'include' });
// =====================================================================
