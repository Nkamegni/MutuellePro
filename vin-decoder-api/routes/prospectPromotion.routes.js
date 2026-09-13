// =====================================================================
// Mutuelle Pro Assurances — Promotion Prospect → Client
// Route : POST /api/staff/prospects/:id/promouvoir-client
// =====================================================================
// Bascule en un clic (demande explicite de Roger, 21/08/2026) : crée le
// compte Client à partir des données déjà connues du prospect, sans
// ressaisie, et envoie un email de bienvenue réutilisant le mécanisme
// EXISTANT de réinitialisation de mot de passe (site.reinitialisation_mdp_tokens
// + reinitialisation.html) plutôt qu'un nouveau système parallèle.
//
// Les tables restent séparées (site.prospects / site.utilisateurs) —
// choix retenu pour préserver la distinction légale entre données de
// prospection et données client (voir échange du 21/08/2026).
// =====================================================================

const express = require('express');
const argon2 = require('argon2');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const requireStaffAuth = require('../middleware/requireStaffAuth');
const requireStaffRole = require('../middleware/requireStaffRole');

const mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
});

module.exports = function (pool) {
    const router = express.Router();

    router.post('/prospects/:id/promouvoir-client', requireStaffAuth, requireStaffRole(['gestionnaire', 'administrateur', 'superadmin']), async (req, res) => {
        const idProspect = parseInt(req.params.id, 10);
        if (!Number.isInteger(idProspect)) {
            return res.status(400).json({ succes: false, erreurs: ['id de prospect invalide'] });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const prospectRes = await client.query('SELECT * FROM site.prospects WHERE id_prospect = $1', [idProspect]);
            if (prospectRes.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ succes: false, erreurs: ['prospect introuvable'] });
            }
            const prospect = prospectRes.rows[0];

            if (prospect.id_utilisateur) {
                await client.query('ROLLBACK');
                return res.status(409).json({ succes: false, erreurs: ['ce prospect est déjà lié à un compte client'] });
            }
            if (!prospect.email) {
                await client.query('ROLLBACK');
                return res.status(400).json({ succes: false, erreurs: ['ce prospect n\'a pas d\'adresse email — impossible de créer un compte client'] });
            }

            // Un compte existe peut-être déjà sur cette adresse (ex: le
            // prospect avait déjà un compte avant d'être suivi en CRM) —
            // dans ce cas on relie, sans dupliquer.
            let idUtilisateur;
            const existant = await client.query('SELECT id_utilisateur FROM site.utilisateurs WHERE email = $1', [prospect.email]);
            let compteReutilise = false;

            if (existant.rowCount > 0) {
                idUtilisateur = existant.rows[0].id_utilisateur;
                compteReutilise = true;
            } else {
                const hacheInutilisable = crypto.randomBytes(32).toString('hex');
                // Correctif 09/09/2026 -- matricule jamais généré ici,
                // NOT NULL en base (site.utilisateurs.matricule), cause du
                // 500 en production. Même mécanisme que inscription.routes.js
                // (seule autre route qui insère dans site.utilisateurs) :
                // séquence dédiée site.seq_matricule_client, format CLI-000123.
                const resultatMatricule = await client.query("SELECT nextval('site.seq_matricule_client') AS n");
                const matricule = 'CLI-' + String(resultatMatricule.rows[0].n).padStart(6, '0');
                const insere = await client.query(
                    `INSERT INTO site.utilisateurs (matricule, email, telephone, nom, prenom, mot_de_passe_hache, email_verifie, statut_compte)
                     VALUES ($1, $2, $3, $4, $5, $6, false, 'actif')
                     RETURNING id_utilisateur`,
                    [matricule, prospect.email, prospect.telephone || null, prospect.nom, prospect.prenom || null, hacheInutilisable]
                );
                idUtilisateur = insere.rows[0].id_utilisateur;
            }

            await client.query(
                `UPDATE site.prospects SET id_utilisateur = $1, statut_opportunite = 'gagne' WHERE id_prospect = $2`,
                [idUtilisateur, idProspect]
            );

            await client.query(
                `INSERT INTO site.journal_audit (id_staff, action, table_concernee, id_enregistrement, donnees_apres, adresse_ip)
                 VALUES ($1, 'prospect.promotion_client', 'prospects', $2, $3::jsonb, $4)`,
                [req.session.id_staff, idProspect, JSON.stringify({ id_utilisateur: idUtilisateur, compte_reutilise: compteReutilise }), req.ip]
            );

            let lienEnvoye = false;
            if (!compteReutilise) {
                const token = crypto.randomBytes(32).toString('hex');
                await client.query(
                    'INSERT INTO site.reinitialisation_mdp_tokens (token, id_utilisateur) VALUES ($1, $2)',
                    [token, idUtilisateur]
                );

                const lien = `https://mutuelleproassurances.com/reinitialisation.html?token=${token}`;
                mailTransporter.sendMail({
                    from: '"Mutuelle Pro Assurances" <no-reply@mutuelleproassurances.com>',
                    to: prospect.email,
                    subject: 'Mutuelle Pro Assurances — Bienvenue, activez votre espace Client',
                    html: `
                        <p>Bonjour,</p>
                        <p>Votre espace Client Mutuelle Pro Assurances est prêt.</p>
                        <p>Pour l'activer et définir votre mot de passe, cliquez sur le lien ci-dessous (valable 1 heure) :</p>
                        <p><a href="${lien}">${lien}</a></p>
                        <p>Passé ce délai, utilisez "Mot de passe oublié" sur l'espace Client pour recevoir un nouveau lien.</p>
                    `,
                }).then((info) => {
                    // pool, pas client -- l'envoi est asynchrone et peut
                    // se résoudre après la libération de la connexion
                    // transactionnelle (COMMIT/release juste après ici).
                    pool.query(
                        `INSERT INTO site.no_reply_messages_envoyes (message_id, destinataire, type_message, reference_compte)
                         VALUES ($1, $2, $3, $4)`,
                        [info.messageId, prospect.email, 'bienvenue_promotion', String(idUtilisateur)]
                    ).catch((err) => console.error('[promouvoir-client] Erreur journalisation no-reply (ignorée) :', err));
                }).catch((err) => console.error('[promouvoir-client] Erreur envoi email :', err));
                lienEnvoye = true;
            }

            await client.query('COMMIT');
            return res.status(200).json({ succes: true, id_utilisateur: idUtilisateur, compte_reutilise: compteReutilise, lien_envoye: lienEnvoye });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('[POST /api/staff/prospects/:id/promouvoir-client] Erreur base de données :', err);
            // Traduction du doublon de téléphone (09/09/2026, signalé par
            // Roger -- "erreur serveur" ne dit rien d'exploitable). Le
            // doublon d'email est déjà géré en amont (compte réutilisé,
            // jamais une tentative d'INSERT) -- seul le téléphone peut
            // encore heurter la contrainte UNIQUE ici, faute d'une
            // vérification préalable équivalente.
            if (err.code === '23505' && err.constraint === 'utilisateurs_telephone_key') {
                return res.status(409).json({
                    succes: false,
                    erreurs: [`le numéro de téléphone de ce prospect est déjà utilisé par un autre compte Client -- vérifier s'il s'agit d'un doublon avant de réessayer`],
                });
            }
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        } finally {
            client.release();
        }
    });

    return router;
};
