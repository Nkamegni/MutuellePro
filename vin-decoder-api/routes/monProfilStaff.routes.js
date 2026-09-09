// =====================================================================
// Mutuelle Pro Assurances — Profil personnel Staff (self-service)
// Routes :
//   GET   /api/staff/mon-profil
//   PATCH /api/staff/mon-profil
// =====================================================================
// L'email n'est JAMAIS modifiable ici (protégé par trigger pour les
// comptes racine/admin, et volontairement non exposé pour tous les
// autres — l'email reste l'identifiant de connexion).
// =====================================================================

const express = require('express');
const requireStaffAuth = require('../middleware/requireStaffAuth');

module.exports = function (pool) {
    const router = express.Router();

    router.get('/mon-profil', requireStaffAuth, async (req, res) => {
        try {
            const resultat = await pool.query(
                `SELECT email, nom, prenom, telephone, date_naissance, adresse, est_compte_racine, suppression_reservee_racine
                 FROM site.staff WHERE id_staff = $1`,
                [req.session.id_staff]
            );
            if (resultat.rowCount === 0) {
                return res.status(404).json({ succes: false, erreurs: ['compte introuvable'] });
            }
            return res.status(200).json({ succes: true, profil: resultat.rows[0] });
        } catch (err) {
            console.error('[GET /api/staff/mon-profil] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.patch('/mon-profil', requireStaffAuth, async (req, res) => {
        const { nom, prenom, telephone, date_naissance, adresse } = req.body;
        try {
            await pool.query(
                `UPDATE site.staff
                 SET nom = COALESCE($1, nom),
                     prenom = COALESCE($2, prenom),
                     telephone = COALESCE($3, telephone),
                     date_naissance = $4,
                     adresse = COALESCE($5, adresse)
                 WHERE id_staff = $6`,
                [nom || null, prenom || null, telephone || null, date_naissance || null, adresse || null, req.session.id_staff]
            );
            return res.status(200).json({ succes: true });
        } catch (err) {
            console.error('[PATCH /api/staff/mon-profil] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    return router;
};
