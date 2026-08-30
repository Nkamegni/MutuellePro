// =====================================================================
// Mutuelle Pro Assurances — Pilotage & KPIs (version basique, 27/08/2026)
// Route : GET /api/staff/kpis
// =====================================================================
// Volontairement limité aux données déjà réellement en base — pas
// d'attente du module Production pour livrer une première valeur.
// =====================================================================

const express = require('express');
const requireStaffAuth = require('../middleware/requireStaffAuth');

module.exports = function (pool) {
    const router = express.Router();

    router.get('/kpis', requireStaffAuth, async (req, res) => {
        try {
            const [parStatut, parType, partenaires, clients, nonAssignes] = await Promise.all([
                pool.query(`
                    SELECT st.libelle_fr, COUNT(*)::int AS total
                    FROM site.tickets t JOIN site.statut_ticket st ON st.id_statut_ticket = t.id_statut_ticket
                    GROUP BY st.libelle_fr, st.id_statut_ticket ORDER BY st.id_statut_ticket
                `),
                pool.query(`
                    SELECT tt.libelle_fr, COUNT(*)::int AS total
                    FROM site.tickets t JOIN site.type_ticket tt ON tt.id_type_ticket = t.id_type_ticket
                    GROUP BY tt.libelle_fr ORDER BY total DESC
                `),
                pool.query(`SELECT COUNT(*)::int AS total FROM site.partenaires WHERE statut_compte = 'actif'`),
                pool.query(`SELECT COUNT(*)::int AS total FROM site.utilisateurs WHERE statut_compte = 'actif'`),
                pool.query(`SELECT COUNT(*)::int AS total FROM site.tickets WHERE id_staff_assigne IS NULL AND id_statut_ticket != 3`),
            ]);

            return res.status(200).json({
                succes: true,
                tickets_par_statut: parStatut.rows,
                tickets_par_type: parType.rows,
                partenaires_actifs: partenaires.rows[0].total,
                clients_actifs: clients.rows[0].total,
                tickets_non_assignes: nonAssignes.rows[0].total,
            });
        } catch (err) {
            console.error('[GET /api/staff/kpis] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    return router;
};
