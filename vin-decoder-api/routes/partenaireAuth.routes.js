// =====================================================================
// Mutuelle Pro Assurances — Espace Partenaire (MVP, 21/08/2026)
// Routes :
//   POST /api/partenaire/connexion
//   POST /api/partenaire/deconnexion
//   GET  /api/partenaire/session
//   GET  /api/partenaire/mes-dossiers   — UNIQUEMENT les tickets assignés
// =====================================================================
//
// Session totalement distincte du client ET du staff (cookie
// "connect.sid.partenaire", voir bloc de montage server.js fourni
// séparément).
//
// Intégration dans server.js :
//
//   const partenaireAuthRouter = require('./routes/partenaireAuth.routes')(pool);
//   app.use('/api/partenaire', partenaireAuthRouter);
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

const tentatives = new Map();
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
function reinitialiser(cle) { tentatives.delete(cle); }

module.exports = function (pool) {
    const router = express.Router();

    // Même mécanique que côté Personnel — vérification sans consommation.
    router.get('/verifier-token-activation', async (req, res) => {
        const token = req.query.token;
        if (!token || typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
            return res.status(200).json({ valide: false, motif: 'invalide' });
        }
        try {
            const resultat = await pool.query(
                `SELECT t.date_expiration, p.nom_complet
                 FROM site.activation_partenaire_tokens t
                 JOIN site.partenaires p ON p.id_partenaire = t.id_partenaire
                 WHERE t.token = $1`,
                [token]
            );
            if (resultat.rowCount === 0) {
                return res.status(200).json({ valide: false, motif: 'invalide' });
            }
            const { date_expiration, nom_complet } = resultat.rows[0];
            if (new Date(date_expiration) < new Date()) {
                return res.status(200).json({ valide: false, motif: 'expire', nom_complet });
            }
            return res.status(200).json({ valide: true, nom_complet });
        } catch (err) {
            console.error('[GET /api/partenaire/verifier-token-activation] Erreur base de données :', err);
            return res.status(200).json({ valide: false, motif: 'invalide' });
        }
    });

    router.post('/connexion', async (req, res) => {
        const { email, mot_de_passe } = req.body;
        if (!email || !mot_de_passe) {
            return res.status(400).json({ succes: false, erreurs: ['email et mot_de_passe requis'] });
        }
        const cle = `${req.ip}|${email}`;
        if (estBloque(cle)) {
            return res.status(429).json({ succes: false, erreurs: ['trop de tentatives, réessayez dans quelques minutes'] });
        }

        try {
            const resultat = await pool.query(
                `SELECT p.id_partenaire, p.email, p.mot_de_passe_hache, p.nom_complet, p.statut_compte,
                        COALESCE(string_agg(tp.libelle_fr, ', ' ORDER BY tp.libelle_fr), '') AS types_libelles
                 FROM site.partenaires p
                 LEFT JOIN site.partenaire_types pty ON pty.id_partenaire = p.id_partenaire
                 LEFT JOIN site.type_partenaire tp ON tp.id_type_partenaire = pty.id_type_partenaire
                 WHERE p.email = $1
                 GROUP BY p.id_partenaire`,
                [email]
            );
            if (resultat.rowCount === 0) {
                enregistrerEchec(cle);
                return res.status(401).json({ succes: false, erreurs: ['identifiants incorrects'] });
            }
            const partenaire = resultat.rows[0];
            if (partenaire.statut_compte !== 'actif') {
                return res.status(403).json({ succes: false, erreurs: ['compte suspendu, contactez Mutuelle Pro Assurances'] });
            }
            const valide = await argon2.verify(partenaire.mot_de_passe_hache, mot_de_passe);
            if (!valide) {
                enregistrerEchec(cle);
                return res.status(401).json({ succes: false, erreurs: ['identifiants incorrects'] });
            }
            reinitialiser(cle);

            req.session.regenerate((err) => {
                if (err) {
                    console.error('[POST /api/partenaire/connexion] Erreur régénération session :', err);
                    return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
                }
                req.session.id_partenaire = partenaire.id_partenaire;

                pool.query('UPDATE site.partenaires SET date_derniere_connexion = now() WHERE id_partenaire = $1', [partenaire.id_partenaire])
                    .catch(err => console.error('[POST /api/partenaire/connexion] Erreur mise à jour date :', err));

                return res.status(200).json({
                    succes: true,
                    partenaire: {
                        id_partenaire: partenaire.id_partenaire,
                        email: partenaire.email,
                        nom_complet: partenaire.nom_complet,
                        types_libelles: partenaire.types_libelles
                    }
                });
            });
        } catch (err) {
            console.error('[POST /api/partenaire/connexion] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    router.post('/deconnexion', (req, res) => {
        if (!req.session) return res.status(200).json({ succes: true });
        req.session.destroy((err) => {
            if (err) return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
            res.clearCookie('connect.sid.partenaire');
            return res.status(200).json({ succes: true });
        });
    });

    router.get('/session', (req, res) => {
        if (!req.session || !req.session.id_partenaire) {
            return res.status(401).json({ succes: false, connecte: false });
        }
        return res.status(200).json({ succes: true, connecte: true, id_partenaire: req.session.id_partenaire });
    });

    // Sessions actives — même mécanique que côté Client/Personnel (27/08/2026).
    router.get('/mes-sessions', async (req, res) => {
        if (!req.session || !req.session.id_partenaire) {
            return res.status(401).json({ succes: false, erreurs: ['authentification requise'] });
        }
        try {
            const resultat = await pool.query(
                `SELECT sid, expire FROM site.session_partenaire
                 WHERE sess::jsonb->>'id_partenaire' = $1
                 ORDER BY expire DESC`,
                [req.session.id_partenaire.toString()]
            );
            const sessions = resultat.rows.map((s) => ({
                sid: s.sid,
                expire: s.expire,
                est_courante: s.sid === req.sessionID,
            }));
            return res.status(200).json({ succes: true, sessions });
        } catch (err) {
            console.error('[GET /api/partenaire/mes-sessions] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.delete('/mes-sessions/:sid', async (req, res) => {
        if (!req.session || !req.session.id_partenaire) {
            return res.status(401).json({ succes: false, erreurs: ['authentification requise'] });
        }
        try {
            await pool.query(
                `DELETE FROM site.session_partenaire WHERE sid = $1 AND sess::jsonb->>'id_partenaire' = $2`,
                [req.params.sid, req.session.id_partenaire.toString()]
            );
            return res.status(200).json({ succes: true });
        } catch (err) {
            console.error('[DELETE /api/partenaire/mes-sessions/:sid] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    // Règle de visibilité centrale : UNIQUEMENT les tickets où ce
    // partenaire est explicitement assigné — jamais une vue globale.
    router.get('/mes-dossiers', async (req, res) => {
        if (!req.session || !req.session.id_partenaire) {
            return res.status(401).json({ succes: false, erreurs: ['authentification requise'] });
        }
        try {
            const resultat = await pool.query(
                `SELECT t.id_ticket, t.code_ticket, tt.libelle_fr AS type_libelle_fr,
                        st.code_statut_ticket, st.libelle_fr AS statut_libelle_fr,
                        t.contenu, t.date_creation, t.date_maj
                 FROM site.tickets t
                 JOIN site.type_ticket tt ON tt.id_type_ticket = t.id_type_ticket
                 JOIN site.statut_ticket st ON st.id_statut_ticket = t.id_statut_ticket
                 WHERE t.id_partenaire_assigne = $1
                 ORDER BY t.date_maj DESC`,
                [req.session.id_partenaire]
            );
            return res.status(200).json({ succes: true, dossiers: resultat.rows });
        } catch (err) {
            console.error('[GET /api/partenaire/mes-dossiers] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    // Activation de compte — le partenaire clique le lien reçu par email
    // et définit son propre mot de passe pour la première fois.
    router.post('/activer-compte', async (req, res) => {
        const { token, mot_de_passe, mot_de_passe_confirmation } = req.body;

        if (!token || typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
            return res.status(400).json({ succes: false, erreurs: ['lien d\'activation invalide'] });
        }
        if (typeof mot_de_passe !== 'string' || mot_de_passe.length < 10 || !/[a-zA-Z]/.test(mot_de_passe) || !/[0-9]/.test(mot_de_passe) || !/[^a-zA-Z0-9]/.test(mot_de_passe)) {
            return res.status(400).json({ succes: false, erreurs: ['mot de passe doit contenir au moins 10 caractères, avec une lettre, un chiffre et un caractère spécial'] });
        }
        if (mot_de_passe !== mot_de_passe_confirmation) {
            return res.status(400).json({ succes: false, erreurs: ['la confirmation ne correspond pas'] });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const resultat = await client.query(
                'SELECT id_partenaire, date_expiration FROM site.activation_partenaire_tokens WHERE token = $1',
                [token]
            );
            if (resultat.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ succes: false, erreurs: ['ce lien est invalide ou a déjà été utilisé'] });
            }

            const { id_partenaire, date_expiration } = resultat.rows[0];
            if (new Date(date_expiration) < new Date()) {
                await client.query('DELETE FROM site.activation_partenaire_tokens WHERE token = $1', [token]);
                await client.query('COMMIT');
                return res.status(410).json({ succes: false, erreurs: ['ce lien a expiré, contactez Mutuelle Pro Assurances'] });
            }

            const hache = await argon2.hash(mot_de_passe, { type: argon2.argon2id });
            await client.query('UPDATE site.partenaires SET mot_de_passe_hache = $1, mot_de_passe_defini = true WHERE id_partenaire = $2', [hache, id_partenaire]);
            await client.query('DELETE FROM site.activation_partenaire_tokens WHERE token = $1', [token]);

            await client.query('COMMIT');
            return res.status(200).json({ succes: true });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('[POST /api/partenaire/activer-compte] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        } finally {
            client.release();
        }
    });

    // Renvoi du lien d'activation — cas d'un lien expiré (72h) ou perdu.
    // Réponse volontairement identique que le compte existe ou non, même
    // principe que /api/mot-de-passe-oublie côté client.
    router.post('/renvoyer-activation', async (req, res) => {
        const email = (req.body.email || '').trim();
        if (!email) {
            return res.status(400).json({ succes: false, erreurs: ['email requis'] });
        }

        try {
            const resultat = await pool.query(
                'SELECT id_partenaire, nom_complet, email_notification FROM site.partenaires WHERE email = $1 AND mot_de_passe_defini = false',
                [email]
            );
            if (resultat.rowCount === 0) {
                // Compte inexistant OU déjà activé — même réponse neutre.
                return res.status(200).json({ succes: true });
            }

            const { id_partenaire, nom_complet, email_notification } = resultat.rows[0];
            if (!email_notification) {
                // Compte créé avant l'ajout de l'adresse de notification —
                // cas limite, à régulariser par le staff.
                return res.status(200).json({ succes: true });
            }

            // Les anciens jetons de ce partenaire sont invalidés avant
            // d'en émettre un nouveau — un seul lien valide à la fois.
            await pool.query('DELETE FROM site.activation_partenaire_tokens WHERE id_partenaire = $1', [id_partenaire]);

            const token = crypto.randomBytes(32).toString('hex');
            await pool.query('INSERT INTO site.activation_partenaire_tokens (token, id_partenaire) VALUES ($1, $2)', [token, id_partenaire]);

            const lien = `https://mutuelleproassurances.com/activation-partenaire.html?token=${token}`;
            mailTransporter.sendMail({
                from: '"Mutuelle Pro Assurances" <admin@mutuelleproassurances.com>',
                to: email_notification,
                subject: 'Mutuelle Pro Assurances — Nouveau lien d\'activation',
                html: `
                    <p>Bonjour,</p>
                    <p>Voici votre nouveau lien d'activation pour <strong>${nom_complet}</strong> (valable 72 heures) :</p>
                    <p><a href="${lien}">${lien}</a></p>
                `,
            }).catch((err) => console.error('[POST /api/partenaire/renvoyer-activation] Erreur envoi email :', err));

            return res.status(200).json({ succes: true });
        } catch (err) {
            console.error('[POST /api/partenaire/renvoyer-activation] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    return router;
};
