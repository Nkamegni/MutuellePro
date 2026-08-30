// =====================================================================
// Mutuelle Pro Assurances — Helpdesk Volet 2
// Route : GET /api/verifier-email/:token — confirme l'adresse email
//         d'un compte à partir du lien envoyé par email (19/08/2026)
// =====================================================================
//
// Intégration dans server.js (2 lignes) :
//
//   const verificationRouter = require('./routes/verification.routes')(pool);
//   app.use('/api', verificationRouter);
// =====================================================================

const express = require('express');

module.exports = function (pool) {
    const router = express.Router();

    router.get('/verifier-email/:token', async (req, res) => {
        const { token } = req.params;

        // Format attendu : 64 caractères hexadécimaux (crypto.randomBytes(32)).
        // Rejet immédiat si le format ne correspond pas, avant toute requête DB.
        if (!/^[a-f0-9]{64}$/.test(token)) {
            return res.status(400).send('<h1>Lien de vérification invalide.</h1>');
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const resultat = await client.query(
                `SELECT id_utilisateur, date_expiration
                 FROM site.verification_email_tokens
                 WHERE token = $1`,
                [token]
            );

            if (resultat.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).send('<h1>Ce lien de vérification est invalide ou a déjà été utilisé.</h1>');
            }

            const { id_utilisateur, date_expiration } = resultat.rows[0];

            if (new Date(date_expiration) < new Date()) {
                await client.query('DELETE FROM site.verification_email_tokens WHERE token = $1', [token]);
                await client.query('COMMIT');
                return res.status(410).send('<h1>Ce lien de vérification a expiré (48h). Merci de vous reconnecter pour en recevoir un nouveau.</h1>');
            }

            await client.query(
                'UPDATE site.utilisateurs SET email_verifie = true WHERE id_utilisateur = $1',
                [id_utilisateur]
            );
            // Jeton à usage unique — supprimé après utilisation.
            await client.query('DELETE FROM site.verification_email_tokens WHERE token = $1', [token]);

            await client.query('COMMIT');

            return res.status(200).send(`
                <!DOCTYPE html>
                <html lang="fr">
                <head><meta charset="UTF-8"><title>Email vérifié</title></head>
                <body style="font-family: sans-serif; text-align: center; padding: 60px 20px;">
                    <h1>✅ Adresse email confirmée avec succès !</h1>
                    <p>Vous pouvez fermer cette page et retourner sur le site.</p>
                    <a href="https://mutuelleproassurances.com/">Retour à l'accueil</a>
                </body>
                </html>
            `);
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('[GET /api/verifier-email] Erreur base de données :', err);
            return res.status(500).send('<h1>Erreur serveur, veuillez réessayer.</h1>');
        } finally {
            client.release();
        }
    });

    return router;
};
