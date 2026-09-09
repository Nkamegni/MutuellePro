-- =====================================================================
-- Mutuelle Pro Assurances — Préférences de disposition du Tableau de bord
-- Personnalisation (drag & drop + masquage), 04/09/2026
-- À renuméroter selon la suite réelle des migrations déployées.
-- =====================================================================
-- Table polymorphe -- même patron que site.historique_connexions
-- (type_compte + id_compte) plutôt que 3 tables séparées, puisque la
-- disposition n'a de sens que rattachée à UN compte d'UN rôle précis
-- et que la structure (JSON) est strictement identique pour les 3.
--
-- IMPORTANT (retenu du déploiement seuils_alerte/snapshots) : le GRANT
-- explicite est inclus DANS cette même migration, pas en correctif après
-- coup -- PostgreSQL n'accorde jamais de droits automatiquement sur un
-- nouvel objet.
-- =====================================================================

CREATE TABLE site.preferences_dashboard (
    type_compte VARCHAR(20) NOT NULL,   -- 'client' | 'staff' | 'partenaire'
    id_compte   INT NOT NULL,
    disposition JSONB NOT NULL DEFAULT '[]'::jsonb,
    date_maj    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (type_compte, id_compte)
);

COMMENT ON TABLE site.preferences_dashboard IS
    'Disposition personnalisée (ordre + visibilité des widgets) du tableau de bord, par compte. Absence de ligne = disposition par défaut (voir WIDGETS_DASHBOARD_PERSONNEL_DEFAUT côté application, un tableau équivalent existera par rôle à mesure que Client/Partenaire seront personnalisables).';
COMMENT ON COLUMN site.preferences_dashboard.disposition IS
    'Tableau JSON ordonné, ex. [{"id":"kpi-principaux","visible":true}, {"id":"kanban-prospects","visible":false}, ...]. L''ordre du tableau EST l''ordre d''affichage.';

GRANT SELECT, INSERT, UPDATE, DELETE ON site.preferences_dashboard TO mutuellepro;
