-- =====================================================================
-- Mutuelle Pro Assurances — refonte du barème DTA (DTA_utf8.csv)
-- Rédigée le 29/09/2026 — session "Production & Souscription"
-- =====================================================================
-- REMPLACE l'ancien barème (6 tranches, construit sur la seule note DGI
-- de 2017 -- addendum2, §7). Source : DTA_utf8.csv (139 lignes),
-- transmis par myspace.html le 28/09, structuré par catégorie CIMA
-- précise et 4 périodes d'effet historiques (2017, 2020, 2021, 2023).
--
-- Transformation, faite par script (139 lignes sources -> 103 lignes
-- propres après dédoublonnage, 101 conservées) :
--   * Le "Genre ou Classe" distingue motos (2 roues) de tricycles/
--     triporteurs (3 roues) -- repris sur genre_vehicule (MOTO2/MOTO3),
--     comme le reste du système.
--   * Les tranches de puissance sont lues sur le LIBELLÉ descriptif
--     ("DTA de 02 de 07 CV"...), pas sur le champ technique "Capacité
--     ou puissance", dont l'encodage s'est révélé incohérent pour au
--     moins une tranche (même intervalle technique "[00-08[" affiché
--     pour deux libellés différents, "00 à 08" et "02 de 07").
--   * Catégorie 09 (source) éclatée en deux, sur la base du genre :
--     - "Engin Manutention"/"Engin Manutention + Remorque" (famille
--       "Engins de Manutention" du fichier) -> 09A (Engins portuaires
--       et de manutention), montant FIXE (200 000), quelle que soit
--       la puissance ;
--     - tous les autres genres de la catégorie 09 (Benne Grue, Camion
--       Benne, Camion Citerne, Engin de chantier, Engin grands
--       travaux[+Remorque]) -> 09B (Autres engins, notamment de grands
--       travaux), même barème par tranches que les autres catégories
--       (montants identiques constatés sur les 5 genres du fichier :
--       une seule ligne conservée par tranche après dédoublonnage).
--   * Catégorie "07" nue (sans ARC/SRC) : montants identiques à "07ARC"
--     et "07SRC" dans le fichier -- ligne redondante écartée (aucune
--     catégorie "07" nue n'existe dans tarification.branches_categories).
--   * Avant 2023 (familles "VP/Camion/Engins", 2017-2022) : barème
--     générique par tranche de CV, sans distinction de catégorie
--     (code_categorie NULL = repli, utilisé quand aucune ligne plus
--     précise ne correspond) -- la granularité par catégorie n'existait
--     pas encore. Un correctif ponctuel du 01/01/2021 relève la tranche
--     21 CV et plus de 100 000 à 150 000 (conservé tel quel, 2 lignes
--     successives).
--   * Montant 0 (catégorie xx, 0-1 CV) : dispense réelle, conservée
--     comme n'importe quel autre montant, pas une donnée manquante.
--
-- HORS PÉRIMÈTRE DE CETTE MIGRATION (signalé, pas deviné) :
--   * Remorques (famille "Droit de Timbre Automobile Remorques",
--     toujours 0, 2 lignes source) -- la notion de remorque n'existe
--     pas dans le genre de véhicule actuel de l'écran (GENRES =
--     MOTO2/MOTO3/VEHICULE seulement). Non importées : les ajouter
--     supposerait d'abord un genre "REMORQUE" sur l'écran, qui n'a pas
--     été demandé.
--   * La petite table de libellé/alias jointe à l'addendum 2 (DTA =
--     Vignette Automobile = Droit de Timbre Automobile) confirme une
--     terminologie déjà appliquée telle quelle -- rien à construire.
--
-- Schéma `site` uniquement -- aucun accord externe requis.
-- =====================================================================

BEGIN;

-- 01/10/2026 (Roger, en production) : le garde-fou initial ("aucun
-- mouvement ne doit déjà avoir un DTA calculé") a été retiré. Il partait
-- d'une prudence excessive : le montant DTA de chaque mouvement déjà
-- émis est une valeur figée au moment de l'émission (stockée dans
-- site.mouvements.dta), jamais recalculée dynamiquement depuis
-- site.bareme_dta après coup -- reconstruire cette table de référence
-- ne modifie donc aucun montant déjà facturé.

DROP TABLE site.bareme_dta;

CREATE TABLE site.bareme_dta (
    id               SERIAL        PRIMARY KEY,
    genre_vehicule   VARCHAR(10)   NOT NULL,
    code_categorie   VARCHAR(20)   REFERENCES tarification.branches_categories(categorie_code),  -- NULL = repli générique (motos, avant 2023)
    cv_min           INTEGER,      -- NULL = pas de tranche (motos, montant fixe)
    cv_max           INTEGER,      -- NULL = pas de borne haute (21 CV et plus)
    montant          NUMERIC(14,0) NOT NULL CHECK (montant >= 0),
    date_debut       DATE          NOT NULL,
    date_fin         DATE          NOT NULL DEFAULT '2099-12-31',
    libelle          VARCHAR(200)  NOT NULL,
    texte_reference  VARCHAR(200)  NOT NULL,
    CONSTRAINT bareme_dta_genre_check CHECK (genre_vehicule IN ('MOTO2', 'MOTO3', 'VEHICULE')),
    CONSTRAINT bareme_dta_cv_check CHECK (cv_max IS NULL OR cv_min IS NULL OR cv_max >= cv_min),
    CONSTRAINT bareme_dta_dates_check CHECK (date_fin >= date_debut)
);
CREATE INDEX idx_bareme_dta_lookup ON site.bareme_dta (genre_vehicule, code_categorie, date_debut);
COMMENT ON TABLE site.bareme_dta IS
    'Barème DTA (29/09/2026) -- DTA_utf8.csv, 4 périodes d''effet historiques, par catégorie CIMA depuis 2023';

INSERT INTO site.bareme_dta
    (genre_vehicule, code_categorie, cv_min, cv_max, montant, date_debut, date_fin, libelle, texte_reference)
VALUES
    ('MOTO2', NULL, NULL, NULL, 2000, '2017-01-01', '2019-12-31', 'Motocyclette (Motocyclette)', 'DTA_utf8.csv, réf. 1'),
    ('MOTO3', NULL, NULL, NULL, 5000, '2017-01-01', '2019-12-31', 'Tricycle/Triporteur (Tricycle)', 'DTA_utf8.csv, réf. 2'),
    ('VEHICULE', NULL, 0, 7, 15000, '2017-01-01', '2019-12-31', 'VP/Camion/Engins 0-7 CV (avant 2023, toutes catégories)', 'DTA_utf8.csv, réf. 3'),
    ('VEHICULE', NULL, 8, 13, 25000, '2017-01-01', '2019-12-31', 'VP/Camion/Engins 8-13 CV (avant 2023, toutes catégories)', 'DTA_utf8.csv, réf. 4'),
    ('VEHICULE', NULL, 14, 20, 50000, '2017-01-01', '2019-12-31', 'VP/Camion/Engins 14-20 CV (avant 2023, toutes catégories)', 'DTA_utf8.csv, réf. 5'),
    ('VEHICULE', NULL, 21, NULL, 100000, '2017-01-01', '2019-12-31', 'VP/Camion/Engins 21-+ CV (avant 2023, toutes catégories)', 'DTA_utf8.csv, réf. 6'),
    ('MOTO2', NULL, NULL, NULL, 10000, '2020-01-01', '2022-12-31', 'Motocyclette (Motocyclette)', 'DTA_utf8.csv, réf. 7'),
    ('MOTO3', NULL, NULL, NULL, 15000, '2020-01-01', '2022-12-31', 'Tricycle/Triporteur (Tricycle)', 'DTA_utf8.csv, réf. 8'),
    ('VEHICULE', NULL, 0, 7, 15000, '2020-01-01', '2022-12-31', 'VP/Camion/Engins 0-7 CV (avant 2023, toutes catégories)', 'DTA_utf8.csv, réf. 9'),
    ('VEHICULE', NULL, 8, 13, 25000, '2020-01-01', '2022-12-31', 'VP/Camion/Engins 8-13 CV (avant 2023, toutes catégories)', 'DTA_utf8.csv, réf. 10'),
    ('VEHICULE', NULL, 14, 20, 50000, '2020-01-01', '2022-12-31', 'VP/Camion/Engins 14-20 CV (avant 2023, toutes catégories)', 'DTA_utf8.csv, réf. 11'),
    ('VEHICULE', NULL, 21, NULL, 100000, '2020-01-01', '2020-12-31', 'VP/Camion/Engins 21-+ CV (avant 2023, toutes catégories)', 'DTA_utf8.csv, réf. 12'),
    ('VEHICULE', NULL, 21, NULL, 150000, '2021-01-01', '2022-12-31', 'VP/Camion/Engins 21-+ CV (avant 2023, toutes catégories)', 'DTA_utf8.csv, réf. 14'),
    ('MOTO2', NULL, NULL, NULL, 10000, '2023-01-01', '2099-12-31', 'Motocyclette (Motocyclette)', 'DTA_utf8.csv, réf. 15'),
    ('MOTO3', NULL, NULL, NULL, 30000, '2023-01-01', '2099-12-31', 'Tricycle/Triporteur (Tricycle)', 'DTA_utf8.csv, réf. 16'),
    ('VEHICULE', '03', 0, 1, 0, '2023-01-01', '2099-12-31', 'Transports en commun 03, 0-1 CV', 'DTA_utf8.csv, réf. 17'),
    ('VEHICULE', '03', 2, 7, 15000, '2023-01-01', '2099-12-31', 'Transports en commun 03, 2-7 CV', 'DTA_utf8.csv, réf. 18'),
    ('VEHICULE', '03', 8, 13, 25000, '2023-01-01', '2099-12-31', 'Transports en commun 03, 8-13 CV', 'DTA_utf8.csv, réf. 19'),
    ('VEHICULE', '03', 21, NULL, 150000, '2023-01-01', '2099-12-31', 'Transports en commun 03, 21-+ CV', 'DTA_utf8.csv, réf. 20'),
    ('VEHICULE', '03', 14, 20, 50000, '2023-01-01', '2099-12-31', 'Transports en commun 03, 14-20 CV', 'DTA_utf8.csv, réf. 22'),
    ('VEHICULE', '04A', 0, 1, 0, '2023-01-01', '2099-12-31', 'Transports en commun 04A, 0-1 CV', 'DTA_utf8.csv, réf. 23'),
    ('VEHICULE', '04A', 2, 7, 15000, '2023-01-01', '2099-12-31', 'Transports en commun 04A, 2-7 CV', 'DTA_utf8.csv, réf. 24'),
    ('VEHICULE', '04A', 8, 13, 25000, '2023-01-01', '2099-12-31', 'Transports en commun 04A, 8-13 CV', 'DTA_utf8.csv, réf. 25'),
    ('VEHICULE', '04A', 14, 20, 50000, '2023-01-01', '2099-12-31', 'Transports en commun 04A, 14-20 CV', 'DTA_utf8.csv, réf. 26'),
    ('VEHICULE', '04A', 21, NULL, 150000, '2023-01-01', '2099-12-31', 'Transports en commun 04A, 21-+ CV', 'DTA_utf8.csv, réf. 27'),
    ('VEHICULE', '04B', 0, 1, 0, '2023-01-01', '2099-12-31', 'Transports en commun 04B, 0-1 CV', 'DTA_utf8.csv, réf. 28'),
    ('VEHICULE', '04B', 2, 7, 15000, '2023-01-01', '2099-12-31', 'Transports en commun 04B, 2-7 CV', 'DTA_utf8.csv, réf. 29'),
    ('VEHICULE', '04B', 8, 13, 25000, '2023-01-01', '2099-12-31', 'Transports en commun 04B, 8-13 CV', 'DTA_utf8.csv, réf. 30'),
    ('VEHICULE', '04B', 14, 20, 50000, '2023-01-01', '2099-12-31', 'Transports en commun 04B, 14-20 CV', 'DTA_utf8.csv, réf. 31'),
    ('VEHICULE', '04B', 21, NULL, 150000, '2023-01-01', '2099-12-31', 'Transports en commun 04B, 21-+ CV', 'DTA_utf8.csv, réf. 32'),
    ('VEHICULE', '04C', 0, 1, 0, '2023-01-01', '2099-12-31', 'Transports en commun 04C, 0-1 CV', 'DTA_utf8.csv, réf. 33'),
    ('VEHICULE', '04C', 2, 7, 30000, '2023-01-01', '2099-12-31', 'Transports en commun 04C, 2-7 CV', 'DTA_utf8.csv, réf. 34'),
    ('VEHICULE', '04C', 8, 13, 50000, '2023-01-01', '2099-12-31', 'Transports en commun 04C, 8-13 CV', 'DTA_utf8.csv, réf. 35'),
    ('VEHICULE', '04C', 14, 20, 75000, '2023-01-01', '2099-12-31', 'Transports en commun 04C, 14-20 CV', 'DTA_utf8.csv, réf. 36'),
    ('VEHICULE', '04C', 21, NULL, 200000, '2023-01-01', '2099-12-31', 'Transports en commun 04C, 21-+ CV', 'DTA_utf8.csv, réf. 37'),
    ('VEHICULE', '01', 0, 1, 0, '2023-01-01', '2099-12-31', 'Hors Transports Communs 01, 0-1 CV', 'DTA_utf8.csv, réf. 38'),
    ('VEHICULE', '01', 2, 7, 30000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 01, 2-7 CV', 'DTA_utf8.csv, réf. 39'),
    ('VEHICULE', '01', 8, 13, 50000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 01, 8-13 CV', 'DTA_utf8.csv, réf. 40'),
    ('VEHICULE', '01', 14, 20, 75000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 01, 14-20 CV', 'DTA_utf8.csv, réf. 41'),
    ('VEHICULE', '01', 21, NULL, 200000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 01, 21-+ CV', 'DTA_utf8.csv, réf. 42'),
    ('VEHICULE', '02', 0, 1, 0, '2023-01-01', '2099-12-31', 'Hors Transports Communs 02, 0-1 CV', 'DTA_utf8.csv, réf. 43'),
    ('VEHICULE', '02', 2, 7, 30000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 02, 2-7 CV', 'DTA_utf8.csv, réf. 44'),
    ('VEHICULE', '02', 8, 13, 50000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 02, 8-13 CV', 'DTA_utf8.csv, réf. 45'),
    ('VEHICULE', '02', 14, 20, 75000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 02, 14-20 CV', 'DTA_utf8.csv, réf. 46'),
    ('VEHICULE', '02', 21, NULL, 200000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 02, 21-+ CV', 'DTA_utf8.csv, réf. 47'),
    ('VEHICULE', '05', 0, 1, 0, '2023-01-01', '2099-12-31', 'Hors Transports Communs 05, 0-1 CV', 'DTA_utf8.csv, réf. 48'),
    ('VEHICULE', '05', 2, 7, 30000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 05, 2-7 CV', 'DTA_utf8.csv, réf. 49'),
    ('VEHICULE', '05', 8, 13, 50000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 05, 8-13 CV', 'DTA_utf8.csv, réf. 50'),
    ('VEHICULE', '05', 14, 20, 75000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 05, 14-20 CV', 'DTA_utf8.csv, réf. 51'),
    ('VEHICULE', '05', 21, NULL, 200000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 05, 21-+ CV', 'DTA_utf8.csv, réf. 52'),
    ('VEHICULE', '05bis', 0, 1, 0, '2023-01-01', '2099-12-31', 'Hors Transports Communs 05bis, 0-1 CV', 'DTA_utf8.csv, réf. 53'),
    ('VEHICULE', '05bis', 2, 7, 30000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 05bis, 2-7 CV', 'DTA_utf8.csv, réf. 54'),
    ('VEHICULE', '05bis', 8, 13, 50000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 05bis, 8-13 CV', 'DTA_utf8.csv, réf. 55'),
    ('VEHICULE', '05bis', 14, 20, 75000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 05bis, 14-20 CV', 'DTA_utf8.csv, réf. 56'),
    ('VEHICULE', '05bis', 21, NULL, 200000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 05bis, 21-+ CV', 'DTA_utf8.csv, réf. 57'),
    ('VEHICULE', '06', 0, 1, 0, '2023-01-01', '2099-12-31', 'Hors Transports Communs 06, 0-1 CV', 'DTA_utf8.csv, réf. 58'),
    ('VEHICULE', '06', 2, 7, 30000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 06, 2-7 CV', 'DTA_utf8.csv, réf. 59'),
    ('VEHICULE', '06', 8, 13, 50000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 06, 8-13 CV', 'DTA_utf8.csv, réf. 60'),
    ('VEHICULE', '06', 14, 20, 75000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 06, 14-20 CV', 'DTA_utf8.csv, réf. 61'),
    ('VEHICULE', '06', 21, NULL, 200000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 06, 21-+ CV', 'DTA_utf8.csv, réf. 62'),
    ('VEHICULE', '07ARC', 0, 1, 0, '2023-01-01', '2099-12-31', 'Hors Transports Communs 07ARC, 0-1 CV', 'DTA_utf8.csv, réf. 68'),
    ('VEHICULE', '07ARC', 2, 7, 30000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 07ARC, 2-7 CV', 'DTA_utf8.csv, réf. 69'),
    ('VEHICULE', '07ARC', 8, 13, 50000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 07ARC, 8-13 CV', 'DTA_utf8.csv, réf. 70'),
    ('VEHICULE', '07ARC', 14, 20, 75000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 07ARC, 14-20 CV', 'DTA_utf8.csv, réf. 71'),
    ('VEHICULE', '07ARC', 21, NULL, 200000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 07ARC, 21-+ CV', 'DTA_utf8.csv, réf. 72'),
    ('VEHICULE', '07SRC', 0, 1, 0, '2023-01-01', '2099-12-31', 'Hors Transports Communs 07SRC, 0-1 CV', 'DTA_utf8.csv, réf. 73'),
    ('VEHICULE', '07SRC', 2, 7, 30000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 07SRC, 2-7 CV', 'DTA_utf8.csv, réf. 74'),
    ('VEHICULE', '07SRC', 8, 13, 50000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 07SRC, 8-13 CV', 'DTA_utf8.csv, réf. 75'),
    ('VEHICULE', '07SRC', 14, 20, 75000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 07SRC, 14-20 CV', 'DTA_utf8.csv, réf. 76'),
    ('VEHICULE', '07SRC', 21, NULL, 200000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 07SRC, 21-+ CV', 'DTA_utf8.csv, réf. 77'),
    ('VEHICULE', '08', 0, 1, 0, '2023-01-01', '2099-12-31', 'Hors Transports Communs 08, 0-1 CV', 'DTA_utf8.csv, réf. 78'),
    ('VEHICULE', '08', 2, 7, 30000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 08, 2-7 CV', 'DTA_utf8.csv, réf. 79'),
    ('VEHICULE', '08', 8, 13, 50000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 08, 8-13 CV', 'DTA_utf8.csv, réf. 80'),
    ('VEHICULE', '08', 14, 20, 75000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 08, 14-20 CV', 'DTA_utf8.csv, réf. 81'),
    ('VEHICULE', '08', 21, NULL, 200000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 08, 21-+ CV', 'DTA_utf8.csv, réf. 82'),
    ('VEHICULE', '09B', 0, 1, 0, '2023-01-01', '2099-12-31', 'Hors Transports Communs 09B, 0-1 CV', 'DTA_utf8.csv, réf. 83'),
    ('VEHICULE', '09B', 2, 7, 30000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 09B, 2-7 CV', 'DTA_utf8.csv, réf. 84'),
    ('VEHICULE', '09B', 8, 13, 50000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 09B, 8-13 CV', 'DTA_utf8.csv, réf. 85'),
    ('VEHICULE', '09B', 14, 20, 75000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 09B, 14-20 CV', 'DTA_utf8.csv, réf. 86'),
    ('VEHICULE', '09B', 21, NULL, 200000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 09B, 21-+ CV', 'DTA_utf8.csv, réf. 87'),
    ('VEHICULE', '10A', 0, 1, 0, '2023-01-01', '2099-12-31', 'Hors Transports Communs 10A, 0-1 CV', 'DTA_utf8.csv, réf. 88'),
    ('VEHICULE', '10A', 2, 7, 30000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 10A, 2-7 CV', 'DTA_utf8.csv, réf. 89'),
    ('VEHICULE', '10A', 8, 13, 50000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 10A, 8-13 CV', 'DTA_utf8.csv, réf. 90'),
    ('VEHICULE', '10A', 14, 20, 75000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 10A, 14-20 CV', 'DTA_utf8.csv, réf. 91'),
    ('VEHICULE', '10A', 21, NULL, 200000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 10A, 21-+ CV', 'DTA_utf8.csv, réf. 92'),
    ('VEHICULE', '10B', 0, 1, 0, '2023-01-01', '2099-12-31', 'Hors Transports Communs 10B, 0-1 CV', 'DTA_utf8.csv, réf. 93'),
    ('VEHICULE', '10B', 2, 7, 30000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 10B, 2-7 CV', 'DTA_utf8.csv, réf. 94'),
    ('VEHICULE', '10B', 8, 13, 50000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 10B, 8-13 CV', 'DTA_utf8.csv, réf. 95'),
    ('VEHICULE', '10B', 14, 20, 75000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 10B, 14-20 CV', 'DTA_utf8.csv, réf. 96'),
    ('VEHICULE', '10B', 21, NULL, 200000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 10B, 21-+ CV', 'DTA_utf8.csv, réf. 97'),
    ('VEHICULE', '10C', 0, 1, 0, '2023-01-01', '2099-12-31', 'Hors Transports Communs 10C, 0-1 CV', 'DTA_utf8.csv, réf. 98'),
    ('VEHICULE', '10C', 2, 7, 30000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 10C, 2-7 CV', 'DTA_utf8.csv, réf. 99'),
    ('VEHICULE', '10C', 8, 13, 50000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 10C, 8-13 CV', 'DTA_utf8.csv, réf. 100'),
    ('VEHICULE', '10C', 14, 20, 75000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 10C, 14-20 CV', 'DTA_utf8.csv, réf. 101'),
    ('VEHICULE', '10C', 21, NULL, 200000, '2023-01-01', '2099-12-31', 'Hors Transports Communs 10C, 21-+ CV', 'DTA_utf8.csv, réf. 102'),
    ('VEHICULE', '09A', NULL, NULL, 200000, '2023-01-01', '2099-12-31', 'Engins de manutention (Engin Manutention)', 'DTA_utf8.csv, réf. 113');

-- Garde-fou d'ambiguïté : deux lignes ne peuvent jamais correspondre au
-- même véhicule à la même date (même principe que le barème accessoires).
DO $$
DECLARE n INTEGER;
BEGIN
    SELECT count(*) INTO n
      FROM site.bareme_dta a JOIN site.bareme_dta b ON a.id < b.id
       AND a.genre_vehicule = b.genre_vehicule
       AND a.code_categorie IS NOT DISTINCT FROM b.code_categorie
       AND numrange(COALESCE(a.cv_min, -1), COALESCE(a.cv_max, 999), '[]') && numrange(COALESCE(b.cv_min, -1), COALESCE(b.cv_max, 999), '[]')
       AND a.date_debut <= b.date_fin AND b.date_debut <= a.date_fin;
    IF n > 0 THEN
        RAISE EXCEPTION 'Barème DTA ambigu : % paire(s) se recouvrent -- rien n''est créé', n;
    END IF;
END $$;

GRANT SELECT ON site.bareme_dta TO mutuellepro;

COMMIT;

-- Vérification : SELECT count(*) FROM site.bareme_dta;  [96]
-- Retour arrière : réappliquer le §DTA de migration_production_mouvements_p1bis_24092026.sql
--                  (6 lignes, note DGI 2017 seule -- structure d'origine, sans code_categorie).
