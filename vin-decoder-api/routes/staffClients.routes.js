// =====================================================================
// Mutuelle Pro Assurances — Administration des Clients (vue Staff)
// Routes (Administrateur uniquement) :
//   GET   /api/staff/clients
//   PATCH /api/staff/clients/:id
// =====================================================================
// L'anonymisation RGPD existe déjà séparément (staffAnonymisation.routes.js).
// =====================================================================

const express = require('express');
const requireStaffAuth = require('../middleware/requireStaffAuth');
const requireStaffRole = require('../middleware/requireStaffRole');

module.exports = function (pool) {
    const router = express.Router();

    router.get('/clients', requireStaffAuth, requireStaffRole(['administrateur']), async (req, res) => {
        try {
            const resultat = await pool.query(
                `SELECT id_utilisateur, email, telephone, nom, prenom, statut_compte, email_verifie, telephone_verifie, date_creation, date_derniere_connexion
                 FROM site.utilisateurs
                 ORDER BY date_creation DESC
                 LIMIT 500`
            );
            return res.status(200).json({ succes: true, clients: resultat.rows });
        } catch (err) {
            console.error('[GET /api/staff/clients] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.patch('/clients/:id', requireStaffAuth, requireStaffRole(['administrateur']), async (req, res) => {
        const idUtilisateur = parseInt(req.params.id, 10);
        const { statut_compte } = req.body;
        if (!Number.isInteger(idUtilisateur)) {
            return res.status(400).json({ succes: false, erreurs: ['id invalide'] });
        }
        if (!['actif', 'suspendu'].includes(statut_compte)) {
            return res.status(400).json({ succes: false, erreurs: ['statut_compte invalide'] });
        }
        try {
            const resultat = await pool.query('UPDATE site.utilisateurs SET statut_compte = $1 WHERE id_utilisateur = $2 RETURNING id_utilisateur', [statut_compte, idUtilisateur]);
            if (resultat.rowCount === 0) {
                return res.status(404).json({ succes: false, erreurs: ['client introuvable'] });
            }
            if (statut_compte === 'suspendu') {
                await pool.query(`DELETE FROM site.session WHERE sess::jsonb->>'id_utilisateur' = $1::text`, [idUtilisateur.toString()]);
            }
            return res.status(200).json({ succes: true });
        } catch (err) {
            console.error('[PATCH /api/staff/clients/:id] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    return router;
};
