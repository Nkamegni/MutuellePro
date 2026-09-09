-- =====================================================================
-- Mutuelle Pro Assurances — Vues multiples nommées du Tableau de bord
-- Extension de site.preferences_dashboard, 08/09/2026
-- À renuméroter selon la suite réelle des migrations déployées.
-- =====================================================================
-- Choix : une ligne PAR vue nommée (modèle relationnel), plutôt qu'un
-- objet JSON englobant toutes les vues dans une seule cellule -- cohérent
-- avec le reste du schéma (site.* est relationnel, pas orienté document),
-- et évite de charger/réécrire toutes les vues d'un coup pour n'en
-- modifier qu'une seule.
--
-- Rétrocompatible : les lignes déjà déployées (une par compte, disposition
-- au format v1 [{"id":..,"visible":..}]) deviennent automatiquement leur
-- vue "Défaut", active, sans script de migration de données séparé --
-- les valeurs par défaut des 2 nouvelles colonnes suffisent.
-- =====================================================================

ALTER TABLE site.preferences_dashboard
    DROP CONSTRAINT preferences_dashboard_pkey;

ALTER TABLE site.preferences_dashboard
    ADD COLUMN nom_vue VARCHAR(50) NOT NULL DEFAULT 'Défaut',
    ADD COLUMN est_active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE site.preferences_dashboard
    ADD PRIMARY KEY (type_compte, id_compte, nom_vue);

COMMENT ON COLUMN site.preferences_dashboard.nom_vue IS
    'Nom de la vue choisi par l''utilisateur (ex. "Vue trésorerie", "Vue croissance"). "Défaut" pour toute ligne créée avant cette extension ou non renommée.';
COMMENT ON COLUMN site.preferences_dashboard.est_active IS
    'Une seule vue active à la fois par compte -- appliqué au niveau applicatif (pas de contrainte SQL dédiée, le volume par compte est trop faible pour le justifier).';

-- Le GRANT existant (table-level, posé lors de la création) couvre déjà
-- les nouvelles colonnes -- rien à réaccorder ici.
