// =====================================================================
// Mutuelle Pro Assurances — Helpdesk Volet 2
// Route : POST /api/inscription — création de compte + réclamation
//         automatique des tickets non réclamés (email ou téléphone)
//         + email de bienvenue et de vérification (19/08/2026)
// =====================================================================
//
// Nouvelle dépendance npm requise sur le VPS AVANT déploiement :
//
//   npm install argon2
//   (nodemailer est déjà présent — server.js l'utilise déjà)
//
// Prérequis : table site.verification_email_tokens créée (voir
// 003_helpdesk_volet2_verification_email.sql).
//
// Intégration dans server.js (2 lignes, à ajouter juste après celles de
// tickets.routes.js) :
//
//   const inscriptionRouter = require('./routes/inscription.routes')(pool);
//   app.use('/api', inscriptionRouter);
// =====================================================================

const express = require('express');
const argon2 = require('argon2');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Transporteur SMTP dédié — mêmes variables .env que celles déjà
// utilisées dans server.js pour /api/send-quote-email, mais recréé ici
// car les routeurs sont des modules indépendants sans accès direct aux
// constantes locales de server.js.
const mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
});

// ---------------------------------------------------------------------
// Validation — règles de robustesse du mot de passe (§6.4 du cahier,
// renforcées le 19/08/2026 sur demande de Roger) : au moins 10
// caractères, une lettre, un chiffre, ET un caractère spécial.
// ---------------------------------------------------------------------
function motDePasseRobuste(mdp) {
    if (typeof mdp !== 'string' || mdp.length < 10) return false;
    if (!/[a-zA-Z]/.test(mdp)) return false;
    if (!/[0-9]/.test(mdp)) return false;
    if (!/[^a-zA-Z0-9]/.test(mdp)) return false; // caractère spécial
    return true;
}

function validerPayload(body) {
    const erreurs = [];

    if (!body.email || typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
        erreurs.push('email invalide ou manquant');
    }
    if (!body.telephone || typeof body.telephone !== 'string' || body.telephone.trim().length < 8) {
        erreurs.push('telephone invalide ou manquant');
    }
    if (!motDePasseRobuste(body.mot_de_passe)) {
        erreurs.push('mot_de_passe doit contenir au moins 10 caractères, avec au moins une lettre, un chiffre et un caractère spécial');
    }
    if (body.mot_de_passe !== body.mot_de_passe_confirmation) {
        erreurs.push('la confirmation du mot de passe ne correspond pas');
    }

    return erreurs;
}

async function envoyerEmailBienvenueEtVerification(email, token) {
    const lienVerification = `https://mutuelleproassurances.com/api/verifier-email/${token}`;
    const html = `
        <p>Bienvenue chez Mutuelle Pro Assurances !</p>
        <p>Votre compte a été créé avec succès. Pour confirmer votre adresse email, merci de cliquer sur le lien ci-dessous (valable 48 heures) :</p>
        <p><a href="${lienVerification}">${lienVerification}</a></p>
        <p>Si vous n'êtes pas à l'origine de cette création de compte, vous pouvez ignorer ce message.</p>
    `;
    await mailTransporter.sendMail({
        from: '"Mutuelle Pro Assurances" <no-reply@mutuelleproassurances.com>',
        to: email,
        subject: 'Bienvenue chez Mutuelle Pro Assurances — Confirmez votre email',
        html,
    });
}

module.exports = function (pool) {
    const router = express.Router();

    router.post('/inscription', async (req, res) => {
        const erreurs = validerPayload(req.body);
        if (erreurs.length > 0) {
            return res.status(400).json({ succes: false, erreurs });
        }

        const { email, telephone, mot_de_passe } = req.body;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Hachage argon2id — paramètres par défaut de la librairie,
            // déjà alignés sur les recommandations OWASP actuelles.
            const hache = await argon2.hash(mot_de_passe, { type: argon2.argon2id });

            const resultatCompte = await client.query(
                `INSERT INTO site.utilisateurs (email, telephone, mot_de_passe_hache)
                 VALUES ($1, $2, $3)
                 RETURNING id_utilisateur, email, telephone, date_creation`,
                [email, telephone, hache]
            );
            const compte = resultatCompte.rows[0];

            // Réclamation automatique des tickets non encore rattachés à un
            // compte, correspondant à l'email OU au téléphone fourni (§4
            // du cahier — recommandation retenue par Roger).
            const resultatReclamation = await client.query(
                `UPDATE site.tickets
                 SET id_utilisateur = $1
                 WHERE id_utilisateur IS NULL
                   AND (email_contact = $2 OR telephone_contact = $3)
                 RETURNING id_ticket, code_ticket`,
                [compte.id_utilisateur, email, telephone]
            );

            // Jeton de vérification email — généré même transaction pour
            // garantir sa cohérence avec le compte qui vient d'être créé.
            const token = crypto.randomBytes(32).toString('hex');
            await client.query(
                `INSERT INTO site.verification_email_tokens (token, id_utilisateur) VALUES ($1, $2)`,
                [token, compte.id_utilisateur]
            );

            await client.query('COMMIT');

            // Envoi de l'email de bienvenue + vérification APRÈS le commit
            // (jamais avant : si l'envoi échoue, le compte doit rester
            // créé — on ne fait pas dépendre la transaction DB d'un appel
            // réseau externe). Un échec d'envoi est loggé mais ne fait pas
            // échouer l'inscription : le compte existe, l'utilisateur peut
            // toujours se connecter, seule la vérification email est
            // différée (à ré-implémenter : bouton "renvoyer l'email").
            envoyerEmailBienvenueEtVerification(email, token).catch((err) => {
                console.error('[POST /api/inscription] Erreur envoi email de bienvenue :', err);
            });

            return res.status(201).json({
                succes: true,
                compte: {
                    id_utilisateur: compte.id_utilisateur,
                    email: compte.email,
                    telephone: compte.telephone,
                    date_creation: compte.date_creation
                },
                tickets_reclames: resultatReclamation.rows
            });
        } catch (err) {
            await client.query('ROLLBACK');

            // Code 23505 = violation de contrainte unique (email ou
            // téléphone déjà utilisé par un autre compte).
            if (err.code === '23505') {
                return res.status(409).json({
                    succes: false,
                    erreurs: ['un compte existe déjà avec cet email ou ce téléphone']
                });
            }

            console.error('[POST /api/inscription] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        } finally {
            client.release();
        }
    });

    return router;
};

// =====================================================================
// Exemple d'appel côté frontend :
//
// fetch('/api/inscription', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     credentials: 'include',
//     body: JSON.stringify({
//         email: 'client@exemple.com',
//         telephone: '+237690000000',
//         mot_de_passe: 'MonMotDePasse123!',
//         mot_de_passe_confirmation: 'MonMotDePasse123!'
//     })
// });
// =====================================================================
