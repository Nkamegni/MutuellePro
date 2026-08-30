// =====================================================================
// Mutuelle Pro Assurances — Phase 2a
// Route : GET /api/staff/tickets — tableau de bord en lecture seule
//         (tous les tickets, filtrables par statut/type)
// =====================================================================
//
// Intégration dans server.js :
//
//   const staffTicketsRouter = require('./routes/staffTickets.routes')(pool);
//   app.use('/api/staff', staffTicketsRouter);
// =====================================================================

const express = require('express');
const requireStaffAuth = require('../middleware/requireStaffAuth');

module.exports = function (pool) {
    const router = express.Router();

    router.get('/tickets', requireStaffAuth, async (req, res) => {
        const { statut, type } = req.query;
        const conditions = [];
        const valeurs = [];

        if (statut) {
            valeurs.push(statut);
            conditions.push(`st.code_statut_ticket = $${valeurs.length}`);
        }
        if (type) {
            valeurs.push(type);
            conditions.push(`tt.code_type_ticket = $${valeurs.length}`);
        }
        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        try {
            const resultat = await pool.query(
                `SELECT
                    t.id_ticket,
                    t.code_ticket,
                    tt.code_type_ticket,
                    tt.libelle_fr AS type_libelle_fr,
                    tt.libelle_en AS type_libelle_en,
                    st.code_statut_ticket,
                    st.libelle_fr AS statut_libelle_fr,
                    st.libelle_en AS statut_libelle_en,
                    t.contenu,
                    t.email_contact,
                    t.telephone_contact,
                    t.id_utilisateur,
                    u.email AS compte_email,
                    t.date_creation,
                    t.date_maj
                 FROM site.tickets t
                 JOIN site.type_ticket tt ON tt.id_type_ticket = t.id_type_ticket
                 JOIN site.statut_ticket st ON st.id_statut_ticket = t.id_statut_ticket
                 LEFT JOIN site.utilisateurs u ON u.id_utilisateur = t.id_utilisateur
                 ${whereClause}
                 ORDER BY t.date_creation DESC
                 LIMIT 200`,
                valeurs
            );

            return res.status(200).json({ succes: true, tickets: resultat.rows });
        } catch (err) {
            console.error('[GET /api/staff/tickets] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    return router;
};
