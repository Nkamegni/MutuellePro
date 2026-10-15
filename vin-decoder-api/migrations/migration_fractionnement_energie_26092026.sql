-- =====================================================================
-- Mutuelle Pro Assurances — fractionnement du Tarif Ministériel (Art. 6)
-- et champ Énergie du véhicule
-- Rédigée le 26/09/2026 — session "Production & Souscription"
-- =====================================================================
-- PRÉREQUIS : migration_production_mouvements_p1bis_24092026.sql
-- (site.mouvements, tarification.branches_categories) appliquée.
-- SCHÉMA `site` UNIQUEMENT -- aucun accord externe requis (ni site
-- public, ni session Tarification) : ces tables sont propres à la
-- Production, comme site.bareme_dta ou site.production_frais_fixes.
--
-- Source : Tarif Ministériel camerounais, Article 6 (extrait transmis
-- par Roger, Tarif_page_14.pdf) et addendum3_fractionnement_26092026.md.
--
--   * Art. 6(2) -- catégories AUTOMOBILE autres que 04A/04B/04C :
--     une garantie de moins d'un an paie un POURCENTAGE PAR PALIER de
--     la prime annuelle (1 à 60 j = 20 %, 61-120 = 40 %, 121-180 = 60 %,
--     181-240 = 80 %, 241-365 = 100 %), jamais un prorata linéaire.
--     Texte : « Tout fonctionnement de primes contraires aux
--     dispositions ci-dessus est interdit. »
--   * Catégorie 04 (04A/04B/04C) : fractionnement MENSUEL et linéaire
--     (N mois / 12), en mois CALENDAIRES PLEINS -- tout mois entamé
--     compte pour un mois entier (exemple donné par Roger : 1er au 28
--     février = un seul mois, quelle que soit sa longueur réelle).
--   * Extraction de l'annuité (addendum3 §3.3) : à l'émission d'une
--     affaire nouvelle ou d'un renouvellement automobile, le serveur
--     calcule et conserve la prime annuelle équivalente, déduite de la
--     prime nette saisie par le palier applicable. Non calculée pour
--     les avenants (leur prime nette n'est pas une prime de garantie
--     complète soumise au même barème).
--   * Champ Énergie (addendum3 §3.1) : liste PROPOSÉE par l'addendum
--     (essence, diesel, électrique, hybride) -- À CONFIRMER par Roger,
--     modifiable sans code (table de référence, comme
--     site.dta_motifs_exemption).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Barème « courte période », Article 6(2) -- hors catégorie 04
-- ---------------------------------------------------------------------
CREATE TABLE site.bareme_fractionnement (
    palier           VARCHAR(20)   PRIMARY KEY,
    jours_min        INTEGER       NOT NULL CHECK (jours_min > 0),
    jours_max        INTEGER       NOT NULL,
    pourcentage      NUMERIC(5,2)  NOT NULL CHECK (pourcentage > 0 AND pourcentage <= 100),
    date_debut       DATE          NOT NULL,
    date_fin         DATE          NOT NULL DEFAULT '2099-12-31',
    texte_reference  VARCHAR(200)  NOT NULL,
    CONSTRAINT bareme_fractionnement_jours_check CHECK (jours_max >= jours_min),
    CONSTRAINT bareme_fractionnement_dates_check CHECK (date_fin >= date_debut)
);
INSERT INTO site.bareme_fractionnement (palier, jours_min, jours_max, pourcentage, date_debut, texte_reference) VALUES
    ('1-60',    1,   60,  20,  '2000-01-01', 'Tarif Ministériel, Article 6(2)a'),
    ('61-120',  61,  120, 40,  '2000-01-01', 'Tarif Ministériel, Article 6(2)b'),
    ('121-180', 121, 180, 60,  '2000-01-01', 'Tarif Ministériel, Article 6(2)c'),
    ('181-240', 181, 240, 80,  '2000-01-01', 'Tarif Ministériel, Article 6(2)d'),
    ('241-365', 241, 365, 100, '2000-01-01', 'Tarif Ministériel, Article 6(2)e');

-- ---------------------------------------------------------------------
-- 2. Énergie du véhicule -- liste PROPOSÉE, à confirmer (voir en-tête)
-- ---------------------------------------------------------------------
CREATE TABLE site.energies_vehicule (
    code     VARCHAR(20)  PRIMARY KEY,
    libelle  VARCHAR(50)  NOT NULL,
    ordre    INTEGER      NOT NULL,
    actif    BOOLEAN      NOT NULL DEFAULT true
);
INSERT INTO site.energies_vehicule (code, libelle, ordre) VALUES
    ('essence',    'Essence',    1),
    ('diesel',     'Diesel',     2),
    ('electrique', 'Électrique', 3),
    ('hybride',    'Hybride',    4);

-- ---------------------------------------------------------------------
-- 3. Compléments à site.mouvements
-- ---------------------------------------------------------------------
ALTER TABLE site.mouvements
    ADD COLUMN energie VARCHAR(20) REFERENCES site.energies_vehicule(code),
    -- Prime annuelle équivalente, déduite de la prime nette par le
    -- palier de fractionnement applicable. NULL hors Automobile, pour
    -- un avenant, ou si la prime nette est nulle.
    ADD COLUMN prime_annuelle_reference NUMERIC(14,0) CHECK (prime_annuelle_reference IS NULL OR prime_annuelle_reference >= 0);

GRANT SELECT ON site.bareme_fractionnement, site.energies_vehicule TO mutuellepro;

COMMIT;

-- Vérification après application (résultat attendu entre []) :
--   SELECT count(*) FROM site.bareme_fractionnement;                 [5]
--   SELECT count(*) FROM site.energies_vehicule;                     [4]
--   \d site.mouvements   -- colonnes energie, prime_annuelle_reference présentes
--
-- Retour arrière :
--   BEGIN;
--   ALTER TABLE site.mouvements DROP COLUMN energie, DROP COLUMN prime_annuelle_reference;
--   DROP TABLE site.energies_vehicule, site.bareme_fractionnement;
--   COMMIT;
