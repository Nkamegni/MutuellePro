-- =====================================================================
-- Mutuelle Pro Assurances — cylindrée (cm³) des motos et tricycles
-- Rédigée le 27/09/2026 — session "Production & Souscription"
-- =====================================================================
-- Source : TOPO_VIN_GENRE_PUISSANCE_26092026.md (myspace.html) et
-- confirmation de Roger le 27/09 -- « La Puissance : Elle s'exprime en
-- CV mais également en Cm3 » : le barème CIMA ne raisonne pas de la
-- même façon selon la famille de véhicule -- puissance fiscale (CV)
-- pour l'Automobile 4 roues, cylindrée BRUTE (cm³) pour la Catégorie 5
-- (2/3 roues, genres MOTO2/MOTO3), en tranches directes du Tarif
-- Ministériel -- jamais de conversion en CV pour cette famille.
-- Schéma `site` uniquement -- aucun accord externe requis.
-- =====================================================================

BEGIN;

ALTER TABLE site.mouvements
    ADD COLUMN cylindree_cm3 INTEGER CHECK (cylindree_cm3 IS NULL OR cylindree_cm3 > 0);
COMMENT ON COLUMN site.mouvements.cylindree_cm3 IS
    'Cylindrée brute (cm³) -- genres MOTO2/MOTO3 uniquement ; puissance_cv reste le champ de référence pour VEHICULE (4 roues)';

COMMIT;

-- Vérification : \d site.mouvements   -- colonne cylindree_cm3 présente
-- Retour arrière : ALTER TABLE site.mouvements DROP COLUMN cylindree_cm3;
