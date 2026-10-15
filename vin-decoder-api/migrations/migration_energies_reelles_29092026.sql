-- =====================================================================
-- Mutuelle Pro Assurances — correction de la liste des énergies
-- Rédigée le 29/09/2026 — session "Production & Souscription"
-- =====================================================================
-- La liste provisoire du 27/09 (4 valeurs, essence/diesel/electrique/
-- hybride) est remplacée par les 12 valeurs RÉELLES du site public
-- (index.html, <select id="auto_energy">), transmises par myspace.html
-- le 28/09 et confirmées par une seconde source indépendante (site
-- public) -- concordance vérifiée caractère pour caractère.
--
-- Changement de modèle : `code` porte désormais le LIBELLÉ EXACT tel
-- qu'utilisé côté public, au lieu d'un code interne abrégé. Nécessaire
-- pour que le rapprochement automatique depuis le décodage VIN
-- (data.resultats[].energie) puisse comparer une valeur EXACTE, comme
-- l'exige la note de livraison du 28/09 : « vos valeurs d'options
-- doivent correspondre caractère pour caractère à ces libellés ».
-- Schéma `site` uniquement -- aucun accord externe requis.
-- =====================================================================

BEGIN;

ALTER TABLE site.energies_vehicule ALTER COLUMN code TYPE VARCHAR(60);

-- Aucun mouvement n'utilise encore les anciennes valeurs courtes
-- (fonctionnalité livrée le 27/09, à peine déployée) : suppression
-- directe, sans migration de données.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM site.mouvements WHERE energie IN ('essence', 'diesel', 'electrique', 'hybride')) THEN
        RAISE EXCEPTION 'Des mouvements utilisent déjà les anciens codes courts -- migration de données requise avant de continuer, rien n''est modifié';
    END IF;
END $$;

DELETE FROM site.energies_vehicule;
INSERT INTO site.energies_vehicule (code, libelle, ordre) VALUES
    ('Essence',                          'Essence',                          1),
    ('Diesel (Gasoil)',                  'Diesel (Gasoil)',                  2),
    ('Hybride (Essence-Électrique)',     'Hybride (Essence-Électrique)',     3),
    ('Hybride Rechargeable (Plug-in)',   'Hybride Rechargeable (Plug-in)',   4),
    ('Électrique',                       'Électrique',                       5),
    ('GPL (Gaz de Pétrole Liquéfié)',    'GPL (Gaz de Pétrole Liquéfié)',    6),
    ('GNC (Gaz Naturel Comprimé)',       'GNC (Gaz Naturel Comprimé)',       7),
    ('Flex-fuel (Essence/Éthanol)',      'Flex-fuel (Essence/Éthanol)',      8),
    ('Éthanol (E85)',                    'Éthanol (E85)',                    9),
    ('Hydrogène',                        'Hydrogène',                        10),
    ('Bicarburation Essence/GPL',        'Bicarburation Essence/GPL',        11),
    ('Autre / Non précisé',              'Autre / Non précisé',              12);

COMMIT;

-- Vérification : SELECT count(*) FROM site.energies_vehicule;  [12]
-- Retour arrière : réappliquer les 4 lignes du 27/09 (voir
-- migration_fractionnement_energie_26092026.sql, §2) après ALTER COLUMN
-- code TYPE VARCHAR(20).
