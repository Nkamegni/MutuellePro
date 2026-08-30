// =====================================================================
// Mutuelle Pro Assurances — Messagerie intégrée
// Routes :
//   GET   /api/staff/messagerie              — boîte propre au membre du Personnel connecté
//   GET   /api/staff/messagerie/:uid
//   PATCH /api/staff/boite-mail                — self-service, met à jour SA PROPRE boîte
//   GET   /api/partenaire/messagerie         — boîte propre au partenaire connecté
//   GET   /api/partenaire/messagerie/:uid
// =====================================================================
//
// Isolation stricte, même principe pour le Personnel ET les Partenaires :
// jamais de boîte partagée, jamais de paramètre permettant de désigner
// la boîte d'un tiers — toujours req.session.id_staff / id_partenaire.
//
// Intégration dans server.js :
//
//   const messagerieRouter = require('./routes/messagerie.routes')(pool);
//   app.use('/api', messagerieRouter);
// =====================================================================

const express = require('express');
const requireStaffAuth = require('../middleware/requireStaffAuth');
const { listerEmails, lireEmail, testerConnexion, estEchecAuthentification } = require('../lib/imap');
const { chiffrer, dechiffrer } = require('../lib/chiffrement');

module.exports = function (pool) {
    const router = express.Router();

    // ---------------- Personnel (boîte propre, isolée par compte) ----------------

    router.get('/staff/messagerie', requireStaffAuth, async (req, res) => {
        try {
            const resultat = await pool.query('SELECT email, imap_mot_de_passe_chiffre FROM site.staff WHERE id_staff = $1', [req.session.id_staff]);
            if (resultat.rowCount === 0 || !resultat.rows[0].imap_mot_de_passe_chiffre) {
                return res.status(409).json({ succes: false, erreurs: ['votre boîte mail n\'est pas encore configurée — voir « Mon Profil » ou demandez à un administrateur'] });
            }
            const { email, imap_mot_de_passe_chiffre } = resultat.rows[0];
            const motDePasse = dechiffrer(imap_mot_de_passe_chiffre);
            const messages = await listerEmails(email, motDePasse, 30);
            return res.status(200).json({ succes: true, messages });
        } catch (err) {
            if (estEchecAuthentification(err)) {
                return res.status(401).json({ succes: false, code: 'AUTH_ECHEC', erreurs: ['le mot de passe enregistré ne fonctionne plus'] });
            }
            console.error('[GET /api/staff/messagerie] Erreur IMAP :', err);
            return res.status(500).json({ succes: false, erreurs: ['impossible de contacter la messagerie, réessayez plus tard'] });
        }
    });

    router.get('/staff/messagerie/:uid', requireStaffAuth, async (req, res) => {
        const uid = parseInt(req.params.uid, 10);
        if (!Number.isInteger(uid)) {
            return res.status(400).json({ succes: false, erreurs: ['uid invalide'] });
        }
        try {
            const resultat = await pool.query('SELECT email, imap_mot_de_passe_chiffre FROM site.staff WHERE id_staff = $1', [req.session.id_staff]);
            if (resultat.rowCount === 0 || !resultat.rows[0].imap_mot_de_passe_chiffre) {
                return res.status(409).json({ succes: false, erreurs: ['votre boîte mail n\'est pas encore configurée'] });
            }
            const { email, imap_mot_de_passe_chiffre } = resultat.rows[0];
            const motDePasse = dechiffrer(imap_mot_de_passe_chiffre);
            const message = await lireEmail(email, motDePasse, uid);
            if (!message) return res.status(404).json({ succes: false, erreurs: ['message introuvable'] });
            return res.status(200).json({ succes: true, message });
        } catch (err) {
            if (estEchecAuthentification(err)) {
                return res.status(401).json({ succes: false, code: 'AUTH_ECHEC', erreurs: ['le mot de passe enregistré ne fonctionne plus'] });
            }
            console.error('[GET /api/staff/messagerie/:uid] Erreur :', err);
            return res.status(500).json({ succes: false, erreurs: ['impossible de contacter la messagerie, réessayez plus tard'] });
        }
    });

    // Mise à jour SELF-SERVICE du mot de passe de boîte mail Personnel —
    // même principe que côté partenaire : testé avant d'être enregistré.
    router.patch('/staff/boite-mail', requireStaffAuth, async (req, res) => {
        const { mot_de_passe } = req.body;
        if (!mot_de_passe || typeof mot_de_passe !== 'string') {
            return res.status(400).json({ succes: false, erreurs: ['mot_de_passe requis'] });
        }
        try {
            const resultat = await pool.query('SELECT email FROM site.staff WHERE id_staff = $1', [req.session.id_staff]);
            if (resultat.rowCount === 0) {
                return res.status(404).json({ succes: false, erreurs: ['compte introuvable'] });
            }
            const { email } = resultat.rows[0];

            const test = await testerConnexion(email, mot_de_passe);
            if (!test.ok) {
                if (test.panneServeur) {
                    return res.status(503).json({ succes: false, erreurs: ['le serveur de messagerie est actuellement injoignable — ce n\'est pas votre mot de passe qui est en cause'] });
                }
                return res.status(401).json({ succes: false, erreurs: ['ce mot de passe ne fonctionne pas pour cette boîte mail'] });
            }

            const chiffre = chiffrer(mot_de_passe);
            await pool.query('UPDATE site.staff SET imap_mot_de_passe_chiffre = $1 WHERE id_staff = $2', [chiffre, req.session.id_staff]);
            return res.status(200).json({ succes: true });
        } catch (err) {
            console.error('[PATCH /api/staff/boite-mail] Erreur :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    // ---------------- Partenaire (boîte propre, isolée) ----------------

    router.get('/partenaire/messagerie', async (req, res) => {
        if (!req.session || !req.session.id_partenaire) {
            return res.status(401).json({ succes: false, erreurs: ['authentification requise'] });
        }
        try {
            const resultat = await pool.query(
                'SELECT email, imap_mot_de_passe_chiffre FROM site.partenaires WHERE id_partenaire = $1',
                [req.session.id_partenaire]
            );
            if (resultat.rowCount === 0 || !resultat.rows[0].imap_mot_de_passe_chiffre) {
                return res.status(409).json({ succes: false, erreurs: ['votre boîte mail n\'est pas encore configurée, contactez Mutuelle Pro Assurances'] });
            }
            const { email, imap_mot_de_passe_chiffre } = resultat.rows[0];
            const motDePasse = dechiffrer(imap_mot_de_passe_chiffre);
            const messages = await listerEmails(email, motDePasse, 30);
            return res.status(200).json({ succes: true, messages });
        } catch (err) {
            // Distinction cruciale (21/08/2026) : un échec d'authentification
            // propose une mise à jour du mot de passe, une panne serveur non
            // — ne jamais laisser croire à tort que le mot de passe est en cause.
            if (estEchecAuthentification(err)) {
                return res.status(401).json({ succes: false, code: 'AUTH_ECHEC', erreurs: ['le mot de passe enregistré ne fonctionne plus'] });
            }
            console.error('[GET /api/partenaire/messagerie] Erreur :', err);
            return res.status(500).json({ succes: false, erreurs: ['impossible de contacter le serveur de messagerie, réessayez plus tard'] });
        }
    });

    router.get('/partenaire/messagerie/:uid', async (req, res) => {
        if (!req.session || !req.session.id_partenaire) {
            return res.status(401).json({ succes: false, erreurs: ['authentification requise'] });
        }
        const uid = parseInt(req.params.uid, 10);
        if (!Number.isInteger(uid)) {
            return res.status(400).json({ succes: false, erreurs: ['uid invalide'] });
        }
        try {
            const resultat = await pool.query(
                'SELECT email, imap_mot_de_passe_chiffre FROM site.partenaires WHERE id_partenaire = $1',
                [req.session.id_partenaire]
            );
            if (resultat.rowCount === 0 || !resultat.rows[0].imap_mot_de_passe_chiffre) {
                return res.status(409).json({ succes: false, erreurs: ['votre boîte mail n\'est pas encore configurée'] });
            }
            const { email, imap_mot_de_passe_chiffre } = resultat.rows[0];
            const motDePasse = dechiffrer(imap_mot_de_passe_chiffre);
            const message = await lireEmail(email, motDePasse, uid);
            if (!message) return res.status(404).json({ succes: false, erreurs: ['message introuvable'] });
            return res.status(200).json({ succes: true, message });
        } catch (err) {
            if (estEchecAuthentification(err)) {
                return res.status(401).json({ succes: false, code: 'AUTH_ECHEC', erreurs: ['le mot de passe enregistré ne fonctionne plus'] });
            }
            console.error('[GET /api/partenaire/messagerie/:uid] Erreur :', err);
            return res.status(500).json({ succes: false, erreurs: ['impossible de contacter le serveur de messagerie, réessayez plus tard'] });
        }
    });

    // Mise à jour SELF-SERVICE du mot de passe de boîte mail — déclenchée
    // uniquement quand le partenaire a rencontré un AUTH_ECHEC (jamais en
    // libre accès sans ce contexte). Le nouveau mot de passe est TESTÉ par
    // une vraie connexion IMAP avant d'être chiffré et enregistré — on ne
    // stocke jamais une valeur non vérifiée.
    router.patch('/partenaire/boite-mail', async (req, res) => {
        if (!req.session || !req.session.id_partenaire) {
            return res.status(401).json({ succes: false, erreurs: ['authentification requise'] });
        }
        const { mot_de_passe } = req.body;
        if (!mot_de_passe || typeof mot_de_passe !== 'string') {
            return res.status(400).json({ succes: false, erreurs: ['mot_de_passe requis'] });
        }

        try {
            const resultat = await pool.query('SELECT email FROM site.partenaires WHERE id_partenaire = $1', [req.session.id_partenaire]);
            if (resultat.rowCount === 0) {
                return res.status(404).json({ succes: false, erreurs: ['compte introuvable'] });
            }
            const { email } = resultat.rows[0];

            const test = await testerConnexion(email, mot_de_passe);
            if (!test.ok) {
                if (test.panneServeur) {
                    return res.status(503).json({ succes: false, erreurs: ['le serveur de messagerie est actuellement injoignable — réessayez plus tard, ce n\'est pas votre mot de passe qui est en cause'] });
                }
                return res.status(401).json({ succes: false, erreurs: ['ce mot de passe ne fonctionne pas pour cette boîte mail'] });
            }

            const chiffre = chiffrer(mot_de_passe);
            await pool.query('UPDATE site.partenaires SET imap_mot_de_passe_chiffre = $1 WHERE id_partenaire = $2', [chiffre, req.session.id_partenaire]);

            return res.status(200).json({ succes: true });
        } catch (err) {
            console.error('[PATCH /api/partenaire/boite-mail] Erreur :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    return router;
};
