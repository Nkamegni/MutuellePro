// =====================================================================
// Mutuelle Pro Assurances — Snapshot quotidien des KPI d'état
// =====================================================================
// Catégorie 2 (infrastructure data dashboard), item priorisé n°2.
// Prérequis : table site.snapshot_kpis_quotidien créée (voir
// migration_snapshot_kpis_quotidien.sql) AVANT la première exécution.
//
// Invocation cron (crontab système, une fois par jour à 23h55) :
//   55 23 * * * /usr/bin/node /chemin/vers/cron_snapshot_kpis_quotidien.js >> /var/log/mutuellepro/snapshot_kpis.log 2>&1
//
// Ou via un module de tâches planifiées pm2, si préféré côté VPS --
// dans les deux cas, ce script tourne HORS du process Express : il ouvre
// sa propre connexion PostgreSQL (voir bloc de connexion en bas de
// fichier, à adapter à la configuration réelle déjà utilisée par
// server.js -- variables d'environnement ou chaîne de connexion directe).
//
// Réutilise volontairement les MÊMES requêtes que staffKpis.routes.js
// pour les 5 métriques d'état, plutôt que d'en dupliquer une version
// divergente. tickets_non_assignes / taches_en_attente sont neutres
// (pas de notion de seuil). taches_en_retard est capturé avec le seuil
// PAR DÉFAUT (0 jour) -- volontairement, cette table est une référence
// partagée entre tous les staffs, pas un instantané personnalisé par
// utilisateur (voir commentaire sur la colonne dans la migration).
// =====================================================================

const path = require('path');
// Correctif du 04/09/2026 -- ce script tourne HORS du process Express
// (invoqué seul par cron), donc les variables d'environnement ne sont
// JAMAIS chargées automatiquement comme elles le sont dans server.js
// (qui fait require('dotenv').config() en tout début de fichier).
// Sans cette ligne, process.env.PGPASSWORD (et les autres) valent
// undefined, d'où l'erreur "client password must be a string" -- chemin
// absolu (pas juste require('dotenv').config()) : cron n'exécute pas
// forcément depuis ce dossier, le répertoire de travail réel ne doit
// jamais empêcher de retrouver le bon fichier .env.
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

async function executerSnapshot(pool) {
    const [nonAssignes, tachesEnAttente, tachesEnRetard, clients, partenaires] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS total FROM site.tickets WHERE id_staff_assigne IS NULL AND id_statut_ticket != 3`),
        pool.query(`SELECT COUNT(*)::int AS total FROM site.taches WHERE statut IN ('a_faire', 'en_cours')`),
        pool.query(`SELECT COUNT(*)::int AS total FROM site.taches WHERE statut IN ('a_faire', 'en_cours') AND date_echeance < now()`),
        pool.query(`SELECT COUNT(*)::int AS total FROM site.utilisateurs WHERE statut_compte = 'actif'`),
        pool.query(`SELECT COUNT(*)::int AS total FROM site.partenaires WHERE statut_compte = 'actif'`),
    ]);

    const valeurs = {
        tickets_non_assignes: nonAssignes.rows[0].total,
        taches_en_attente: tachesEnAttente.rows[0].total,
        taches_en_retard: tachesEnRetard.rows[0].total,
        clients_actifs: clients.rows[0].total,
        partenaires_actifs: partenaires.rows[0].total,
    };

    // ON CONFLICT DO UPDATE -- idempotent en cas de relance manuelle le
    // même jour (pas de doublon, pas d'échec bruyant sur la contrainte
    // UNIQUE(date_snapshot)).
    await pool.query(`
        INSERT INTO site.snapshot_kpis_quotidien
            (date_snapshot, tickets_non_assignes, taches_en_attente, taches_en_retard, clients_actifs, partenaires_actifs)
        VALUES (CURRENT_DATE, $1, $2, $3, $4, $5)
        ON CONFLICT (date_snapshot) DO UPDATE SET
            tickets_non_assignes = $1, taches_en_attente = $2, taches_en_retard = $3,
            clients_actifs = $4, partenaires_actifs = $5
    `, [valeurs.tickets_non_assignes, valeurs.taches_en_attente, valeurs.taches_en_retard, valeurs.clients_actifs, valeurs.partenaires_actifs]);

    return valeurs;
}

module.exports = executerSnapshot;

// Exécution directe (cron) uniquement -- si ce fichier est require() par
// autre chose (tests, réutilisation future), executerSnapshot(pool) est
// utilisable seul sans ouvrir de connexion supplémentaire.
if (require.main === module) {
    (async () => {
        // À ADAPTER : cette configuration doit correspondre exactement à
        // celle déjà utilisée par server.js pour se connecter à `vpiclist`
        // (rôle `mutuellepro`). Variables d'environnement supposées ici à
        // titre indicatif -- remplacer par le mécanisme réel si différent.
        const pool = new Pool({
            host: process.env.PGHOST,
            port: process.env.PGPORT || 5432,
            user: process.env.PGUSER,
            password: process.env.PGPASSWORD,
            database: process.env.PGDATABASE,
        });
        try {
            const resultat = await executerSnapshot(pool);
            console.log(`[snapshot_kpis] ${new Date().toISOString()} — snapshot enregistré :`, resultat);
        } catch (err) {
            console.error(`[snapshot_kpis] ${new Date().toISOString()} — erreur :`, err);
            process.exitCode = 1;
        } finally {
            await pool.end();
        }
    })();
}
