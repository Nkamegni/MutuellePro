// =====================================================================
// Mutuelle Pro Assurances — Pilotage & KPIs
// Route : GET /api/staff/kpis
// =====================================================================
// Volontairement limité aux données déjà réellement en base — pas
// d'attente du module Production pour livrer une première valeur.
//
// Lot C v2 (04/09/2026) — ajouts strictement additifs, rétrocompatibles :
//   - ?periode=semaine|mois|trimestre|annee : fenêtre optionnelle appliquée
//     à tickets_par_statut, tickets_par_type, temps_traitement_moyen_jours
//     et tendance_tickets. SANS ce paramètre, comportement rigoureusement
//     identique à la version précédente (toutes dates confondues / fenêtres
//     fixes d'origine) -- aucune régression pour les appelants existants.
//   - evolution_tickets_crees / evolution_tickets_resolus : comparaison
//     glissante 7 jours vs 7 jours précédents, toujours calculée,
//     indépendante de ?periode (cadence hebdomadaire fixe, lecture rapide).
//   - prospects_kanban : liste plafonnée (6 par statut) pour la vue Kanban
//     Personnel -- admin/superadmin uniquement, même garde que
//     prospects_par_statut et taches_par_responsable.
//
// Catégorie 2 / item priorisé n°1 (04/09/2026) :
//   - taches_en_retard respecte désormais le seuil personnalisé du staff
//     (site.seuils_alerte_staff, code 'tache_retard_jours'), configurable
//     via GET/POST /api/staff/seuils-alerte. Sans ligne en base pour ce
//     staff, comportement strictement inchangé (0 jour de marge).
//     seuil_retard_jours_applique exposé dans la réponse pour affichage.
//
// Catégorie 2 / item priorisé n°2 (04/09/2026) :
//   - evolution_tickets_non_assignes / evolution_taches_en_attente /
//     evolution_taches_en_retard / evolution_clients_actifs /
//     evolution_partenaires_actifs : comparaison vs le dernier snapshot
//     disponible (site.snapshot_kpis_quotidien, alimenté par
//     cron_snapshot_kpis_quotidien.js). Lecture protégée séparément du
//     reste du endpoint : si la table n'existe pas encore (migration pas
//     déployée) ou si aucun snapshot n'a encore été pris, ces 5 champs
//     valent null -- dégradation silencieuse, le reste du KPI continue de
//     fonctionner normalement, aucune régression possible selon l'ordre
//     de déploiement migration/route.
//   - evolution_taches_en_retard compare TOUJOURS au seuil PAR DÉFAUT
//     (0 jour), jamais au seuil personnalisé du staff connecté -- le
//     snapshot est une référence partagée entre tous les staffs, pas un
//     instantané par utilisateur (voir commentaire de colonne dans la
//     migration correspondante).
//
// Catégorie 2 / item priorisé n°3 (05/09/2026) :
//   - REFACTORISATION -- la construction de la réponse est extraite dans
//     construireDonneesKpis(pool, req), exposée en propriété de ce module
//     (module.exports.construireDonneesKpis), SANS changer la signature
//     d'appel principale (module.exports reste la factory de routeur
//     attendue par server.js : require('./staffKpis.routes')(pool)).
//     Objectif unique : GET /api/staff/kpis/export (staffKpisExport.routes.js)
//     réutilise EXACTEMENT cette même fonction, jamais une copie divergente
//     des requêtes SQL.
// =====================================================================

const express = require('express');
const requireStaffAuth = require('../middleware/requireStaffAuth');

// Mapping fermé -- jamais de valeur utilisateur interpolée directement
// dans une requête SQL. Toute valeur numérique passe en paramètre lié ($n).
const MAPPING_PERIODE_JOURS = { semaine: 7, mois: 30, trimestre: 90, annee: 365 };

function calculerEvolution(ligne) {
    const actuelle = ligne.actuelle;
    const precedente = ligne.precedente;
    const variation_pct = precedente > 0 ? Math.round(((actuelle - precedente) / precedente) * 1000) / 10 : null;
    return { actuelle, precedente, variation_pct };
}

// Construit l'intégralité de la réponse KPI -- utilisée par GET /api/staff/kpis
// (JSON) ET par GET /api/staff/kpis/export (xlsx). Ne fait aucune supposition
// sur res : ne répond jamais elle-même, ne fait que retourner l'objet ou
// laisser remonter une exception à l'appelant.
async function construireDonneesKpis(pool, req) {
    const joursPeriode = MAPPING_PERIODE_JOURS[req.query.periode] || null;

    // Seuil "tâche en retard" -- personnalisable via
    // /api/staff/seuils-alerte (catégorie 2, item priorisé n°1).
    // Absence de ligne = comportement historique inchangé (0 jour
    // de marge, soit date_echeance < now() strictement).
    const seuilRetard = await pool.query(
        `SELECT valeur FROM site.seuils_alerte_staff WHERE id_staff = $1 AND code_seuil = 'tache_retard_jours'`,
        [req.session.id_staff]
    );
    const joursMargeRetard = seuilRetard.rows[0] ? seuilRetard.rows[0].valeur : 0;

    // Fenêtre/granularité de la courbe de tendance -- identique à
    // l'origine (90 jours / semaine) si aucune période n'est
    // fournie, pour ne rien changer au comportement déjà en prod.
    const joursFenetreTendance = joursPeriode || 90;
    let bucketTendance = 'week';
    if (joursFenetreTendance <= 7) bucketTendance = 'day';
    else if (joursFenetreTendance > 120) bucketTendance = 'month';
    // bucketTendance provient exclusivement de ce mapping interne
    // (jamais de req.query.* interpolé), donc sûr à insérer dans
    // date_trunc() malgré l'absence de paramètre lié à cet endroit.

    const [
        parStatut, parType, partenaires, clients, nonAssignes,
        tachesEnAttente, tachesEnRetard, tachesSemaine, tempsTraitement,
        tendanceTickets, fluxCreations, fluxResolutions,
    ] = await Promise.all([
        pool.query(`
            SELECT st.libelle_fr, COUNT(*)::int AS total
            FROM site.tickets t JOIN site.statut_ticket st ON st.id_statut_ticket = t.id_statut_ticket
            WHERE ($1::int IS NULL OR t.date_creation >= now() - ($1::int || ' days')::interval)
            GROUP BY st.libelle_fr, st.id_statut_ticket ORDER BY st.id_statut_ticket
        `, [joursPeriode]),
        pool.query(`
            SELECT tt.libelle_fr, COUNT(*)::int AS total
            FROM site.tickets t JOIN site.type_ticket tt ON tt.id_type_ticket = t.id_type_ticket
            WHERE ($1::int IS NULL OR t.date_creation >= now() - ($1::int || ' days')::interval)
            GROUP BY tt.libelle_fr ORDER BY total DESC
        `, [joursPeriode]),
        pool.query(`SELECT COUNT(*)::int AS total FROM site.partenaires WHERE statut_compte = 'actif'`),
        pool.query(`SELECT COUNT(*)::int AS total FROM site.utilisateurs WHERE statut_compte = 'actif'`),
        pool.query(`SELECT COUNT(*)::int AS total FROM site.tickets WHERE id_staff_assigne IS NULL AND id_statut_ticket != 3`),
        pool.query(`SELECT COUNT(*)::int AS total FROM site.taches WHERE statut IN ('a_faire', 'en_cours')`),
        pool.query(`
            SELECT COUNT(*)::int AS total FROM site.taches
            WHERE statut IN ('a_faire', 'en_cours')
            AND date_echeance < now() - ($1::int || ' days')::interval
        `, [joursMargeRetard]),
        pool.query(`SELECT COUNT(*)::int AS total FROM site.taches WHERE date_creation >= now() - interval '7 days'`),
        pool.query(`
            SELECT ROUND(AVG(EXTRACT(EPOCH FROM (date_cloture - date_creation)) / 86400)::numeric, 1) AS moyenne
            FROM site.taches
            WHERE date_cloture IS NOT NULL
            AND ($1::int IS NULL OR date_cloture >= now() - ($1::int || ' days')::interval)
        `, [joursPeriode]),
        pool.query(`
            SELECT date_trunc('${bucketTendance}', date_creation) AS periode, COUNT(*)::int AS total
            FROM site.tickets
            WHERE date_creation >= now() - ($1::int || ' days')::interval
            GROUP BY periode ORDER BY periode
        `, [joursFenetreTendance]),
        // Tendance de flux -- créations, cadence fixe 7j vs 7j précédents
        pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE date_creation >= now() - interval '7 days')::int AS actuelle,
                COUNT(*) FILTER (WHERE date_creation >= now() - interval '14 days' AND date_creation < now() - interval '7 days')::int AS precedente
            FROM site.tickets
        `),
        // Tendance de flux -- résolutions. date_maj sert de proxy de date
        // de résolution pour un ticket au statut "résolu" (même convention
        // que les listes Client/Partenaire déjà en prod, cf. §6.9/6.11).
        pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE id_statut_ticket = 3 AND date_maj >= now() - interval '7 days')::int AS actuelle,
                COUNT(*) FILTER (WHERE id_statut_ticket = 3 AND date_maj >= now() - interval '14 days' AND date_maj < now() - interval '7 days')::int AS precedente
            FROM site.tickets
        `),
    ]);

    const reponse = {
        succes: true,
        periode_appliquee: joursPeriode ? req.query.periode : null,
        tickets_par_statut: parStatut.rows,
        tickets_par_type: parType.rows,
        partenaires_actifs: partenaires.rows[0].total,
        clients_actifs: clients.rows[0].total,
        tickets_non_assignes: nonAssignes.rows[0].total,
        taches_en_attente: tachesEnAttente.rows[0].total,
        taches_en_retard: tachesEnRetard.rows[0].total,
        seuil_retard_jours_applique: joursMargeRetard,
        taches_creees_semaine: tachesSemaine.rows[0].total,
        temps_traitement_moyen_jours: tempsTraitement.rows[0].moyenne !== null ? Number(tempsTraitement.rows[0].moyenne) : null,
        tendance_tickets: tendanceTickets.rows,
        evolution_tickets_crees: calculerEvolution(fluxCreations.rows[0]),
        evolution_tickets_resolus: calculerEvolution(fluxResolutions.rows[0]),
    };

    // Snapshots quotidiens (catégorie 2, item priorisé n°2) -- lecture
    // protégée SÉPARÉMENT du Promise.all principal : si la table
    // n'existe pas encore (migration pas déployée), ou si aucun
    // snapshot n'a encore été pris, le reste du KPI continue de
    // fonctionner normalement, simplement sans ces 5 champs
    // (dégradation silencieuse, même principe que comptes-sans-boite).
    let evolutionEtat = {
        evolution_tickets_non_assignes: null,
        evolution_taches_en_attente: null,
        evolution_taches_en_retard: null,
        evolution_clients_actifs: null,
        evolution_partenaires_actifs: null,
        date_dernier_snapshot: null,
    };
    try {
        const dernierSnapshot = await pool.query(
            `SELECT * FROM site.snapshot_kpis_quotidien ORDER BY date_snapshot DESC LIMIT 1`
        );
        if (dernierSnapshot.rowCount > 0) {
            const s = dernierSnapshot.rows[0];
            // Comparaison "pommes avec pommes" pour taches_en_retard :
            // le snapshot est toujours capturé au seuil PAR DÉFAUT
            // (0j) -- on compare donc à une lecture au seuil par
            // défaut, jamais à reponse.taches_en_retard qui, lui,
            // reflète le seuil personnalisé du staff connecté.
            const tachesEnRetardDefaut = await pool.query(
                `SELECT COUNT(*)::int AS total FROM site.taches WHERE statut IN ('a_faire', 'en_cours') AND date_echeance < now()`
            );
            evolutionEtat = {
                evolution_tickets_non_assignes: calculerEvolution({ actuelle: reponse.tickets_non_assignes, precedente: s.tickets_non_assignes }),
                evolution_taches_en_attente: calculerEvolution({ actuelle: reponse.taches_en_attente, precedente: s.taches_en_attente }),
                evolution_taches_en_retard: calculerEvolution({ actuelle: tachesEnRetardDefaut.rows[0].total, precedente: s.taches_en_retard }),
                evolution_clients_actifs: calculerEvolution({ actuelle: reponse.clients_actifs, precedente: s.clients_actifs }),
                evolution_partenaires_actifs: calculerEvolution({ actuelle: reponse.partenaires_actifs, precedente: s.partenaires_actifs }),
                date_dernier_snapshot: s.date_snapshot,
            };
        }
    } catch (err) {
        console.error('[construireDonneesKpis] Snapshots indisponibles, dégradation silencieuse :', err.message);
    }
    Object.assign(reponse, evolutionEtat);

    // Agrégation par responsable, pipeline et Kanban Prospects --
    // UNIQUEMENT ajoutés à la réponse pour Administrateur/SuperAdmin.
    // Un rôle standard ne reçoit jamais ces clés, pas seulement une
    // version non affichée (exigence explicite de la session
    // Messagerie, 01/09/2026, reconduite ici à l'identique).
    if (req.session.code_role === 'administrateur' || req.session.code_role === 'superadmin') {
        const [parResponsable, prospectsParStatut, prospectsKanban] = await Promise.all([
            pool.query(`
                SELECT TRIM(COALESCE(s.prenom, '') || ' ' || s.nom) AS nom, COUNT(t.id_tache)::int AS total
                FROM site.taches t JOIN site.staff s ON s.id_staff = t.id_staff_responsable
                GROUP BY s.nom, s.prenom ORDER BY total DESC
            `),
            pool.query(`
                SELECT statut_opportunite, COUNT(*)::int AS total
                FROM site.prospects
                GROUP BY statut_opportunite
            `),
            // Top 6 prospects les plus récemment mis à jour, par statut --
            // alimente les colonnes de la vue Kanban sans tout rapatrier.
            pool.query(`
                SELECT id_prospect, nom, prenom, statut_opportunite, branche_interet, date_maj
                FROM (
                    SELECT id_prospect, nom, prenom, statut_opportunite, branche_interet, date_maj,
                           ROW_NUMBER() OVER (PARTITION BY statut_opportunite ORDER BY date_maj DESC) AS rang
                    FROM site.prospects
                ) x
                WHERE rang <= 6
                ORDER BY statut_opportunite, rang
            `),
        ]);
        reponse.taches_par_responsable = parResponsable.rows;
        reponse.prospects_par_statut = prospectsParStatut.rows;
        reponse.prospects_kanban = prospectsKanban.rows;
    }

    return reponse;
}

module.exports = function (pool) {
    const router = express.Router();

    router.get('/kpis', requireStaffAuth, async (req, res) => {
        try {
            const reponse = await construireDonneesKpis(pool, req);
            return res.status(200).json(reponse);
        } catch (err) {
            console.error('[GET /api/staff/kpis] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    return router;
};

// Exposée en propriété de la factory -- n'affecte pas l'appel existant
// require('./staffKpis.routes')(pool) dans server.js. Seule
// staffKpisExport.routes.js importe cette propriété directement, sans
// invoquer la factory.
module.exports.construireDonneesKpis = construireDonneesKpis;
