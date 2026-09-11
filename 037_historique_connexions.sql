-- =====================================================================
-- Mutuelle Pro Assurances — Recréation de site.historique_connexions
-- 09/09/2026 -- table manquante, découverte en conditions réelles
-- (erreur 42P01 lors d'une connexion Client), probablement disparue
-- lors de la reconstruction des 4 tables centrales début septembre
-- sans que sa recréation n'ait suivi.
-- =====================================================================
-- Structure déduite des 3 systèmes de connexion (auth.routes.js,
-- staffAuth.routes.js, partenaireAuth.routes.js) et de la fonctionnalité
-- "Journal de connexions" (staffAuth.routes.js, Lot B, 02/09/2026,
-- GET /api/staff/mes-connexions) -- tous cassés silencieusement tant
-- que cette table n'existe pas (écriture et lecture toutes deux dans
-- des try/catch qui ne font que journaliser l'erreur, jamais bloquer
-- la connexion elle-même -- dégradation silencieuse déjà en place,
-- mais la fonctionnalité de journal était réellement absente).
--
-- Polymorphe (type_compte + id_compte), même patron que
-- site.preferences_dashboard -- une seule table pour les 3 rôles,
-- cohérent avec le reste du schéma.
--
-- À renuméroter selon la suite réelle des migrations déployées.
-- =====================================================================

CREATE TABLE site.historique_connexions (
    id_historique   SERIAL PRIMARY KEY,
    type_compte     VARCHAR(20) NOT NULL,   -- 'client' | 'staff' | 'partenaire'
    id_compte       INT NOT NULL,
    adresse_ip      VARCHAR(45),            -- IPv4 ou IPv6, texte plutôt que INET pour rester simple, cohérent avec le reste du schéma
    date_connexion  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_historique_connexions_compte ON site.historique_connexions (type_compte, id_compte, date_connexion DESC);

COMMENT ON TABLE site.historique_connexions IS
    'Historique des connexions réussies, par compte, tous rôles confondus (type_compte + id_compte, polymorphe). Alimentée à chaque connexion (les 3 routes verifier-code), consultée par GET /api/staff/mes-connexions.';

GRANT SELECT, INSERT, UPDATE, DELETE ON site.historique_connexions TO mutuellepro;
GRANT USAGE, SELECT ON SEQUENCE site.historique_connexions_id_historique_seq TO mutuellepro;
