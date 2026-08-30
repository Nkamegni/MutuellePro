// =====================================================================
// Mutuelle Pro Assurances — Activation de compte Personnel par lien
// Route : POST /api/staff/activer-compte
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

module.exports = function (pool) {
    const router = express.Router();

    router.post('/renvoyer-activation', async (req, res) => {
        const email = (req.body.email || '').trim();
        if (!email) {
            return res.status(400).json({ succes: false, erreurs: ['email requis'] });
        }
        try {
            const resultat = await pool.query(
                'SELECT id_staff, nom_complet, email_validation FROM site.staff WHERE email = $1 AND mot_de_passe_defini = false',
                [email]
            );
            if (resultat.rowCount === 0 || !resultat.rows[0].email_validation) {
                return res.status(200).json({ succes: true });
            }
            const { id_staff, nom_complet, email_validation } = resultat.rows[0];

            await pool.query('DELETE FROM site.activation_staff_tokens WHERE id_staff = $1', [id_staff]);
            const token = crypto.randomBytes(32).toString('hex');
            await pool.query('INSERT INTO site.activation_staff_tokens (token, id_staff) VALUES ($1, $2)', [token, id_staff]);

            const lien = `https://mutuelleproassurances.com/activation-staff.html?token=${token}`;
            mailTransporter.sendMail({
                from: '"Mutuelle Pro Assurances" <admin@mutuelleproassurances.com>',
                to: email_validation,
                subject: 'Mutuelle Pro Assurances — Nouveau lien d\'activation',
                html: `<p>Bonjour,</p><p>Voici votre nouveau lien d'activation pour <strong>${nom_complet}</strong> (valable 72 heures) :</p><p><a href="${lien}">${lien}</a></p>`,
            }).catch((err) => console.error('[POST /api/staff/renvoyer-activation] Erreur envoi email :', err));

            return res.status(200).json({ succes: true });
        } catch (err) {
            console.error('[POST /api/staff/renvoyer-activation] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.post('/activer-compte', async (req, res) => {
        const { token, mot_de_passe, mot_de_passe_confirmation } = req.body;

        if (!token || typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
            return res.status(400).json({ succes: false, erreurs: ['lien d\'activation invalide'] });
        }
        if (typeof mot_de_passe !== 'string' || mot_de_passe.length < 10 || !/[a-zA-Z]/.test(mot_de_passe) || !/[0-9]/.test(mot_de_passe) || !/[^a-zA-Z0-9]/.test(mot_de_passe)) {
            return res.status(400).json({ succes: false, erreurs: ['mot de passe doit contenir au moins 10 caractères, avec une lettre, un chiffre et un caractère spécial'] });
        }
        if (mot_de_passe !== mot_de_passe_confirmation) {
            return res.status(400).json({ succes: false, erreurs: ['la confirmation du mot de passe ne correspond pas'] });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const resultat = await client.query(
                'SELECT id_staff, date_expiration FROM site.activation_staff_tokens WHERE token = $1',
                [token]
            );
            if (resultat.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ succes: false, erreurs: ['ce lien est invalide ou a déjà été utilisé'] });
            }

            const { id_staff, date_expiration } = resultat.rows[0];
            if (new Date(date_expiration) < new Date()) {
                await client.query('DELETE FROM site.activation_staff_tokens WHERE token = $1', [token]);
                await client.query('COMMIT');
                return res.status(410).json({ succes: false, erreurs: ['ce lien a expiré, contactez un administrateur'] });
            }

            const hache = await argon2.hash(mot_de_passe, { type: argon2.argon2id });
            await client.query('UPDATE site.staff SET mot_de_passe_hache = $1, mot_de_passe_defini = true WHERE id_staff = $2', [hache, id_staff]);
            await client.query('DELETE FROM site.activation_staff_tokens WHERE token = $1', [token]);

            await client.query('COMMIT');
            return res.status(200).json({ succes: true });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('[POST /api/staff/activer-compte] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        } finally {
            client.release();
        }
    });

    return router;
};
