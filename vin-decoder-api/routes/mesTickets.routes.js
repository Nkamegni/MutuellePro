// =====================================================================
// Mutuelle Pro Assurances — Helpdesk Volet 2
// Route : GET /api/mes-tickets — liste des tickets du compte connecté
//         (ébauche "Mon espace", §6.3 du cahier des charges)
// =====================================================================
//
// Intégration dans server.js (2 lignes, juste après le montage d'auth.routes) :
//
//   const mesTicketsRouter = require('./routes/mesTickets.routes')(pool);
//   app.use('/api', mesTicketsRouter);
// =====================================================================

const express = require('express');
const requireAuth = require('../middleware/requireAuth');

module.exports = function (pool) {
    const router = express.Router();

    router.get('/mes-tickets', requireAuth, async (req, res) => {
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
                    t.date_creation,
                    t.date_maj
                 FROM site.tickets t
                 JOIN site.type_ticket tt ON tt.id_type_ticket = t.id_type_ticket
                 JOIN site.statut_ticket st ON st.id_statut_ticket = t.id_statut_ticket
                 WHERE t.id_utilisateur = $1
                 ORDER BY t.date_creation DESC`,
                [req.session.id_utilisateur]
            );

            return res.status(200).json({
                succes: true,
                tickets: resultat.rows
            });
        } catch (err) {
            console.error('[GET /api/mes-tickets] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    return router;
};

// =====================================================================
// Exemple d'appel côté frontend (à intégrer au §6.3, pas dans ce tour) :
//
// fetch('/api/mes-tickets', { credentials: 'include' })
//     .then(r => r.json())
//     .then(data => { /* data.tickets : tableau, code_statut_ticket pour
//                        colorer/filtrer, libelle_fr/libelle_en pour
//                        affichage bilingue cohérent avec data-i18n */ });
//
// Réponse 401 si non connecté — le frontend doit rediriger vers la
// connexion dans ce cas plutôt que d'afficher une erreur brute.
// =====================================================================
