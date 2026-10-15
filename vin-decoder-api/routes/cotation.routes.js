// =====================================================================
// Mutuelle Pro Assurances — Production & Souscription
// routes/cotation.routes.js : route mince de cotation (PERSONNEL SEULEMENT)
// PREMIÈRE VERSION, 15/10/2026 -- NOUVEAU FICHIER, non monté.
// =====================================================================
// Elle valide les entrées, appelle lib/cotation.js, renvoie le détail.
// Aucune règle métier ici.
//
//   GET /api/staff/cotation/automobile?code_categorie=&date_effet=&date_expiration=
//       [&zone=&puissance_cv=&cylindree=&nombre_places=&avec_remorque=&matiere_inflammable=
//        &double_commande=&rc_eleves=&tonnage=&nombre_cartes=&rang_vehicule=&type_vehicule_base=
//        &vin=&energie=&genre_vehicule=]
//
// Route ANONYME (site public) : NON FOURNIE. Elle ne se met en service
// qu'après les corrections de server.js (limite de débit par req.ip, cors(),
// validation des entrées) et un nouvel accord écrit de Roger.
//
// Intégration dans server.js (une ligne, dans la révision de routage prévue) :
//   const cotationRouter = require('./routes/cotation.routes')(pool);
//   app.use('/api', cotationRouter);
// =====================================================================
const express = require('express');
const requireStaffAuth = require('../middleware/requireStaffAuth');
const requireStaffRole = require('../middleware/requireStaffRole');
const { cotationAutomobile, ErreurCotation } = require('../lib/cotation');

const ROLES_COTATION = ['gestionnaire', 'administrateur', 'superadmin'];

module.exports = function (pool) {
    const router = express.Router();
    const garde = [requireStaffAuth, requireStaffRole(ROLES_COTATION)];

    router.get('/staff/cotation/automobile', ...garde, async (req, res) => {
        const q = req.query;
        try {
            const cotation = await cotationAutomobile(pool, {
                categorieCode: q.code_categorie, zone: q.zone, puissanceCv: q.puissance_cv,
                cylindreeLabel: q.cylindree, nombrePlaces: q.nombre_places, avecRemorque: q.avec_remorque,
                matiereInflammable: q.matiere_inflammable, avecDoubleCommande: q.double_commande,
                avecRcEleves: q.rc_eleves, tonnageLabel: q.tonnage, nombreCartes: q.nombre_cartes,
                rangVehicule: q.rang_vehicule, typeVehiculeBase: q.type_vehicule_base,
                vin: q.vin, energie: q.energie, genreVehicule: q.genre_vehicule,
                dateEffet: q.date_effet, dateExpiration: q.date_expiration,
            });
            return res.json({ succes: true, cotation });
        } catch (err) {
            if (err instanceof ErreurCotation) return res.status(err.statut).json({ succes: false, erreurs: [err.message] });
            console.error('[GET /api/staff/cotation/automobile] Erreur :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    return router;
};
