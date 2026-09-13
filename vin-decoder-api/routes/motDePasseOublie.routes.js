// =====================================================================
// Mutuelle Pro Assurances — Phase 2c
// Routes :
//   POST /api/mot-de-passe-oublie          — demande de réinitialisation
//   POST /api/reinitialiser-mot-de-passe   — application du nouveau mot de passe
// =====================================================================
//
// Intégration dans server.js :
//
//   const motDePasseOublieRouter = require('./routes/motDePasseOublie.routes')(pool);
//   app.use('/api', motDePasseOublieRouter);
// =====================================================================

const express = require('express');
const argon2 = require('argon2');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
});

function motDePasseRobuste(mdp) {
    if (typeof mdp !== 'string' || mdp.length < 10) return false;
    if (!/[a-zA-Z]/.test(mdp)) return false;
    if (!/[0-9]/.test(mdp)) return false;
    if (!/[^a-zA-Z0-9]/.test(mdp)) return false;
    return true;
}

module.exports = function (pool) {
    const router = express.Router();

    router.post('/mot-de-passe-oublie', async (req, res) => {
        const identifiant = (req.body.identifiant || '').trim();
        if (!identifiant) {
            return res.status(400).json({ succes: false, erreurs: ['identifiant requis'] });
        }

        try {
            const resultat = await pool.query(
                'SELECT id_utilisateur, email FROM site.utilisateurs WHERE email = $1 OR telephone = $1',
                [identifiant]
            );

            // Réponse IDENTIQUE que le compte existe ou non — ne jamais
            // révéler si un email/téléphone correspond à un compte
            // (évite l'énumération de comptes existants via ce formulaire).
            if (resultat.rowCount === 0) {
                return res.status(200).json({ succes: true, message: 'si un compte correspond, un email a été envoyé' });
            }

            const compte = resultat.rows[0];
            const token = crypto.randomBytes(32).toString('hex');

            await pool.query(
                'INSERT INTO site.reinitialisation_mdp_tokens (token, id_utilisateur) VALUES ($1, $2)',
                [token, compte.id_utilisateur]
            );

            const lien = `https://mutuelleproassurances.com/reinitialisation.html?token=${token}`;
            mailTransporter.sendMail({
                from: '"Mutuelle Pro Assurances" <no-reply@mutuelleproassurances.com>',
                to: compte.email,
                subject: 'Mutuelle Pro Assurances — Réinitialisation de votre mot de passe',
                html: `
                    <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
                    <p>Ce lien est valable 1 heure : <a href="${lien}">${lien}</a></p>
                    <p>Si vous n'êtes pas à l'origine de cette demande, ignorez ce message — votre mot de passe actuel reste inchangé.</p>
                `,
            }).then((info) => {
                pool.query(
                    `INSERT INTO site.no_reply_messages_envoyes (message_id, destinataire, type_message, reference_compte)
                     VALUES ($1, $2, $3, $4)`,
                    [info.messageId, compte.email, 'reinitialisation_mdp_client', String(compte.id_utilisateur)]
                ).catch((err) => console.error('[POST /api/mot-de-passe-oublie] Erreur journalisation no-reply (ignorée) :', err));
            }).catch((err) => console.error('[POST /api/mot-de-passe-oublie] Erreur envoi email :', err));

            return res.status(200).json({ succes: true, message: 'si un compte correspond, un email a été envoyé' });
        } catch (err) {
            console.error('[POST /api/mot-de-passe-oublie] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    router.post('/reinitialiser-mot-de-passe', async (req, res) => {
        const { token, mot_de_passe, mot_de_passe_confirmation } = req.body;

        if (!token || typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
            return res.status(400).json({ succes: false, erreurs: ['lien de réinitialisation invalide'] });
        }
        if (!motDePasseRobuste(mot_de_passe)) {
            return res.status(400).json({ succes: false, erreurs: ['mot de passe doit contenir au moins 10 caractères, avec une lettre, un chiffre et un caractère spécial'] });
        }
        if (mot_de_passe !== mot_de_passe_confirmation) {
            return res.status(400).json({ succes: false, erreurs: ['la confirmation du mot de passe ne correspond pas'] });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const resultat = await client.query(
                'SELECT id_utilisateur, date_expiration FROM site.reinitialisation_mdp_tokens WHERE token = $1',
                [token]
            );
            if (resultat.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ succes: false, erreurs: ['ce lien est invalide ou a déjà été utilisé'] });
            }

            const { id_utilisateur, date_expiration } = resultat.rows[0];
            if (new Date(date_expiration) < new Date()) {
                await client.query('DELETE FROM site.reinitialisation_mdp_tokens WHERE token = $1', [token]);
                await client.query('COMMIT');
                return res.status(410).json({ succes: false, erreurs: ['ce lien a expiré, merci de refaire une demande'] });
            }

            const hache = await argon2.hash(mot_de_passe, { type: argon2.argon2id });
            await client.query('UPDATE site.utilisateurs SET mot_de_passe_hache = $1 WHERE id_utilisateur = $2', [hache, id_utilisateur]);

            // Jeton à usage unique — supprimé après utilisation.
            await client.query('DELETE FROM site.reinitialisation_mdp_tokens WHERE token = $1', [token]);

            // Révocation de toutes les sessions actives de ce compte — un
            // mot de passe compromis (raison probable d'une réinitialisation)
            // ne doit laisser aucune session ouverte ailleurs.
            await client.query(
                `DELETE FROM site.session WHERE sess::jsonb->>'id_utilisateur' = $1::text`,
                [id_utilisateur]
            );

            await client.query('COMMIT');

            return res.status(200).json({ succes: true });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('[POST /api/reinitialiser-mot-de-passe] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        } finally {
            client.release();
        }
    });

    return router;
};
