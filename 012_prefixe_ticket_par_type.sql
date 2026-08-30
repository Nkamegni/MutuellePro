-- =====================================================================
-- Mutuelle Pro Assurances — Préfixes de code par type de ticket
-- Rédigé le 21/08/2026
-- =====================================================================
-- Remplace le préfixe générique "TCK-" par un préfixe explicite selon
-- le type de ticket (DDEV, DSIN, DINFO). Format résultant :
--   PREFIXE-AAMMJJ-NNNN   (ex: DDEV-260821-0013)
-- Numérotation : séquentielle centrale (id_ticket), pas de compteur
-- séparé par type — plus simple, conforme à l'option "numéro central"
-- retenue par Roger.
--
-- La taxonomie complète (ALERTE/TASK/PROJET/INC-MAJ/QC) proposée par
-- Roger reste hors périmètre de cette migration — voir CDCF, nouveau
-- chapitre à rédiger avant toute implémentation (déclencheurs système,
-- interface de création staff, logique d'auto-ouverture QC).
-- =====================================================================

BEGIN;

ALTER TABLE site.type_ticket ADD COLUMN prefixe_code varchar(10);

UPDATE site.type_ticket SET prefixe_code = CASE code_type_ticket
    WHEN 'devis'    THEN 'DDEV'
    WHEN 'sinistre' THEN 'DSIN'
    WHEN 'info'     THEN 'DINFO'
END;

ALTER TABLE site.type_ticket ALTER COLUMN prefixe_code SET NOT NULL;

COMMIT;
