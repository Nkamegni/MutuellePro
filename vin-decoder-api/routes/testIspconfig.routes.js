// =====================================================================
// Mutuelle Pro Assurances -- Test du pont PHP ISPConfig (temporaire)
// Route : POST /api/staff/test-ispconfig-creation
// =====================================================================
// Endpoint provisoire, reserve Administrateur -- teste un cycle complet
// creation + suppression sur une adresse fournie explicitement par
// l'appelant (jamais generee/devinee, pour eviter toute creation
// accidentelle). A retirer une fois la creation automatisee reellement
// branchee aux formulaires Personnel/Partenaires (28/08/2026).
// =====================================================================

const express = require('express');
const requireStaffAuth = require('../middleware/requireStaffAuth');
const requireStaffRole = require('../middleware/requireStaffRole');
const { creerBoiteMail, supprimerBoiteMail } = require('../lib/ispconfig');

module.exports = function (pool) {
    const router = express.Router();

    router.post('/test-ispconfig-creation', requireStaffAuth, requireStaffRole(['administrateur', 'superadmin']), async (req, res) => {
        const { email, mot_de_passe } = req.body;
        if (!email || !mot_de_passe) {
            return res.status(400).json({ succes: false, erreurs: ['email et mot_de_passe requis dans le corps de la requête'] });
        }

        try {
            const resultatCreation = await creerBoiteMail({ email, motDePasse: mot_de_passe });
            const resultatSuppression = await supprimerBoiteMail({ email });
            return res.status(200).json({
                succes: true,
                message: 'Cycle complet création + suppression réussi.',
                creation: resultatCreation,
                suppression: resultatSuppression,
            });
        } catch (err) {
            console.error('[POST /api/staff/test-ispconfig-creation] Erreur :', err);
            return res.status(500).json({ succes: false, erreurs: [err.message || 'Erreur du pont PHP ISPConfig'] });
        }
    });

    return router;
};
