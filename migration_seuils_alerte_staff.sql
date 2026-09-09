-- =====================================================================
-- Mutuelle Pro Assurances — Seuils d'alerte configurables (Staff)
-- Catégorie 2 (infrastructure data dashboard), item priorisé n°1
-- Rédigée le 04/09/2026 — à renuméroter selon la suite réelle des
-- migrations déjà déployées (19 au 22/08/2026, probablement davantage
-- depuis).
-- =====================================================================

CREATE TABLE site.seuils_alerte_staff (
    id_staff    INT NOT NULL REFERENCES site.staff(id_staff) ON DELETE CASCADE,
    code_seuil  VARCHAR(50) NOT NULL,
    valeur      INT NOT NULL,
    date_maj    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id_staff, code_seuil)
);

COMMENT ON TABLE site.seuils_alerte_staff IS
    'Seuils d''alerte personnalisés par membre du staff. Absence de ligne = comportement par défaut (voir VALEUR_DEFAUT côté application).';
COMMENT ON COLUMN site.seuils_alerte_staff.code_seuil IS
    'Identifiant du type de seuil. Connu à ce jour : tache_retard_jours (marge en jours avant échéance déclenchant "en retard" ; 0 = comportement actuel, dépassement strict de date_echeance).';
COMMENT ON COLUMN site.seuils_alerte_staff.valeur IS
    'Valeur entière du seuil. Pour tache_retard_jours : nombre de jours de marge (peut être négatif pour alerter avant échéance, positif pour tolérer un dépassement).';
