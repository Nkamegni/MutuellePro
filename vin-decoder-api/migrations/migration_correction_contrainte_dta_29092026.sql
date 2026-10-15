-- =====================================================================
-- Mutuelle Pro Assurances — correction de la contrainte de cohérence DTA
-- Rédigée le 29/09/2026 — session "Production & Souscription"
-- =====================================================================
-- Deux assouplissements, révélés par le nouveau barème (DTA_utf8.csv) :
--
-- 1. `dta > 0` -> `dta >= 0`. Certaines tranches sont RÉELLEMENT à 0 FCFA
--    (ex. 0 à 1 CV) -- une dispense TARIFAIRE, décidée par le barème
--    lui-même, distincte d'une exemption MOTIVÉE (statut 'exempte', qui
--    exige un motif et un justificatif). Les deux comptent comme le DTA
--    de l'exercice pour ce véhicule (index d'unicité déjà en place),
--    mais seule 'exempte' doit porter une justification.
--
-- 2. `dta_code_categorie IS NOT NULL` -> plus exigé. Pour une moto ou un
--    tricycle, c'est le GENRE (MOTO2/MOTO3) qui détermine le montant, pas
--    une catégorie CIMA -- la colonne reste légitimement vide dans ce
--    cas. Avec l'ANCIEN barème, cette colonne portait un code articiel
--    ('MOTO2', 'MOTO3', propre à la table, jamais une vraie catégorie
--    CIMA), d'où l'exigence d'origine ; le nouveau barème distingue
--    correctement "vraie catégorie CIMA" (Automobile 4 roues) de "pas de
--    catégorie, seulement un genre" (motos/tricycles) -- la contrainte
--    doit suivre.
--
-- Schéma `site` uniquement -- aucun accord externe requis.
-- =====================================================================

BEGIN;

ALTER TABLE site.mouvements DROP CONSTRAINT mouvements_dta_coherence_check;
ALTER TABLE site.mouvements ADD CONSTRAINT mouvements_dta_coherence_check CHECK (
       (dta_statut = 'non_applicable' AND dta = 0 AND dta_exercice IS NULL)
    OR (dta_statut = 'du'             AND dta >= 0 AND dta_exercice IS NOT NULL AND cle_vehicule IS NOT NULL)
    OR (dta_statut = 'deja_acquitte'  AND dta = 0 AND dta_exercice IS NOT NULL AND dta_id_mouvement_reference IS NOT NULL)
    OR (dta_statut = 'exempte'        AND dta = 0 AND dta_exercice IS NOT NULL AND cle_vehicule IS NOT NULL
        AND dta_code_motif_exemption IS NOT NULL AND NULLIF(btrim(dta_justificatif), '') IS NOT NULL));

COMMIT;

-- Vérification : \d site.mouvements -- mouvements_dta_coherence_check présente, dta >= 0, plus de contrainte sur dta_code_categorie
-- Retour arrière : réappliquer la contrainte d'origine (dta > 0 ET
-- dta_code_categorie IS NOT NULL) -- désactive alors à nouveau toute
-- émission sur une tranche à 0 FCFA ou sans catégorie CIMA (motos).
