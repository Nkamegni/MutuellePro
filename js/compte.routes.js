// =====================================================================
// Mutuelle Pro Assurances — Helpdesk Volet 2
// Routes légères, publiques ou semi-publiques (19/08/2026) :
//
//   GET /api/verifier-compte?identifiant=...
//     Indique si un compte existe déjà pour cet email/téléphone —
//     utilisé pour afficher "Client déjà inscrit" / "Nouveau contact"
//     dans le mémo, l'email et le message WhatsApp des formulaires
//     devis/sinistre/contact.
//
//   GET /api/session
//     Endpoint léger "qui suis-je" pour l'indicateur de connexion dans
//     la topbar — volontairement distinct de /api/mes-tickets pour ne
//     pas charger la liste complète des tickets sur CHAQUE page vue,
//     alors que la topbar a juste besoin de savoir si on est connecté.
// =====================================================================
//
// Intégration dans server.js (2 lignes) :
//
//   const compteRouter = require('./routes/compte.routes')(pool);
//   app.use('/api', compteRouter);
// =====================================================================

const express = require('express');

module.exports = function (pool) {
    const router = express.Router();

    router.get('/verifier-compte', async (req, res) => {
        const identifiant = (req.query.identifiant || '').trim();
        if (!identifiant) {
            return res.status(400).json({ succes: false, erreurs: ['identifiant requis'] });
        }
        try {
            const resultat = await pool.query(
                'SELECT 1 FROM site.utilisateurs WHERE email = $1 OR telephone = $1 LIMIT 1',
                [identifiant]
            );
            return res.status(200).json({ succes: true, existe: resultat.rowCount > 0 });
        } catch (err) {
            console.error('[GET /api/verifier-compte] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.get('/session', async (req, res) => {
        if (!req.session || !req.session.id_utilisateur) {
            return res.status(401).json({ succes: false, connecte: false });
        }
        try {
            const resultat = await pool.query(
                'SELECT email, telephone FROM site.utilisateurs WHERE id_utilisateur = $1',
                [req.session.id_utilisateur]
            );
            if (resultat.rowCount === 0) {
                // Compte supprimé entre-temps mais session encore valide —
                // cas limite, on traite comme non connecté plutôt que de
                // renvoyer une erreur 500.
                // NNR 22/08/2026 - GEM : return res.status(401).json({ succes: false, connecte: false });
                return res.status(200).json({ succes: false, connecte: false });
            }
            return res.status(200).json({ succes: true, connecte: true, compte: resultat.rows[0] });
        } catch (err) {
            console.error('[GET /api/session] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    return router;
};
