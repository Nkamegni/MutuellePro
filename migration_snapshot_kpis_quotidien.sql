-- =====================================================================
-- Mutuelle Pro Assurances — Snapshots journaliers des KPI d'état
-- Catégorie 2 (infrastructure data dashboard), item priorisé n°2
-- Rédigée le 04/09/2026 — à renuméroter selon la suite réelle des
-- migrations déjà déployées.
-- =====================================================================
-- Objet : capturer un instantané quotidien des KPI "d'état" (comptages
-- à un instant T, sans notion de flux) pour permettre l'affichage d'une
-- évolution (↑/↓ vs hier) sur des cartes qui n'en ont aujourd'hui aucune,
-- sur le même principe que evolution_tickets_crees / evolution_tickets_resolus
-- déjà en place (Lot C v2) pour les métriques de flux.
-- =====================================================================

CREATE TABLE site.snapshot_kpis_quotidien (
    id_snapshot          SERIAL PRIMARY KEY,
    date_snapshot        DATE NOT NULL UNIQUE,
    tickets_non_assignes INT NOT NULL,
    taches_en_attente    INT NOT NULL,
    taches_en_retard     INT NOT NULL,
    clients_actifs       INT NOT NULL,
    partenaires_actifs   INT NOT NULL,
    date_creation        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE site.snapshot_kpis_quotidien IS
    'Instantané quotidien des KPI d''état du staff (alimenté par cron, voir cron_snapshot_kpis_quotidien.js). Une ligne par jour, UNIQUE sur date_snapshot empêche tout doublon.';
COMMENT ON COLUMN site.snapshot_kpis_quotidien.taches_en_retard IS
    'Capturé avec le seuil PAR DÉFAUT (0 jour de marge), jamais avec un seuil personnalisé de staff -- cette table est une référence partagée, pas propre à un utilisateur. Voir staffKpis.routes.js pour la logique de comparaison "pommes avec pommes" côté lecture.';
