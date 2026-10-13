-- =====================================================================
-- 062_surprimes_facteurs.sql   (migration 062, attribuée par Git le 13/10/2026)
-- Session Tarification. Crée les nomenclatures et les tables des surprimes (facteurs de risque),
-- et charge : 13 facteurs, 3 modes d'application, 8 tarifs de surprime, 76 tranches.
--   * Article 9 du tarif 1995 (forte/faible circulation, moins de 25 ans, permis de moins de 2 ans) : catégorie ALL, compagnie 0, en pourcentage de la prime RC (cumul par addition).
--   * Passagers hors cabine / à l'insu de l'assuré : catégories 02 et 03, compagnie 0, forfait par puissance et par zone (72 valeurs).
-- Validité 16/11/1994, acte 1 (RC : décision de Roger du 13/10/2026). Aucune modification des tables existantes.
-- Exécution :  sudo -u postgres psql -d vpiclist -X -v ON_ERROR_STOP=1 -v commit=false -f - < fichier   (essai à blanc)
--              sudo -u postgres psql -d vpiclist -X -v ON_ERROR_STOP=1 -f - < fichier                      (application)
-- =====================================================================
\if :{?commit}
\else
\set commit true
\endif
BEGIN;
SET LOCAL search_path = tarification, public;

-- 0. Garde-fous et volumes avant -------------------------------------
DO $$
BEGIN
  IF to_regclass('tarification.facteur_surprime') IS NOT NULL OR to_regclass('tarification.tarif_surprime') IS NOT NULL
     OR to_regclass('tarification.tranche_tarif_surprime') IS NOT NULL OR to_regclass('tarification.mode_application_surprime') IS NOT NULL THEN
    RAISE EXCEPTION 'Une table de surprime existe déjà : migration déjà appliquée ou conflit de nom';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tarification.compagnie WHERE id_compagnie = 0) THEN RAISE EXCEPTION 'compagnie 0 introuvable'; END IF;
  IF NOT EXISTS (SELECT 1 FROM tarification.branche_categorie WHERE categorie_code = 'ALL') THEN RAISE EXCEPTION 'catégorie ALL introuvable'; END IF;
  IF NOT EXISTS (SELECT 1 FROM tarification.branche_categorie WHERE categorie_code IN ('02')) OR NOT EXISTS (SELECT 1 FROM tarification.branche_categorie WHERE categorie_code = '03') THEN RAISE EXCEPTION 'catégories 02 ou 03 introuvables'; END IF;
  IF NOT EXISTS (SELECT 1 FROM tarification.acte_reglementaire WHERE id_acte_reglementaire = 1) THEN RAISE EXCEPTION 'acte réglementaire 1 introuvable'; END IF;
  IF NOT EXISTS (SELECT 1 FROM tarification.sous_garantie WHERE id_sous_garantie = 217) THEN RAISE EXCEPTION 'sous-garantie 217 (RC stricte) introuvable'; END IF;
  IF NOT EXISTS (SELECT 1 FROM tarification.ref_base_calcul WHERE code_base_calcul = 'PRIME_ELEMENT_MEME_POLICE') THEN RAISE EXCEPTION 'base de calcul PRIME_ELEMENT_MEME_POLICE introuvable'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'btree_gist') THEN RAISE EXCEPTION 'extension btree_gist absente'; END IF;
END $$;
CREATE TEMP TABLE _volumes_avant AS
  SELECT (SELECT count(*) FROM tarification.tarif) AS nb_tarif, (SELECT count(*) FROM tarification.bareme_tranche) AS nb_bareme_tranche;

-- 1. Nomenclatures -----------------------------------------------------
CREATE TABLE tarification.mode_application_surprime (
  code_mode_application_surprime    varchar(20) PRIMARY KEY,
  libelle_mode_application_surprime text        NOT NULL,
  ordre_affichage                   integer     NOT NULL,
  est_actif                         boolean     NOT NULL DEFAULT true
);
COMMENT ON TABLE tarification.mode_application_surprime IS 'Façon d''appliquer une surprime : forfait, forfait par passager, pourcentage d''une assiette.';

CREATE TABLE tarification.facteur_surprime (
  id_facteur_surprime                 integer GENERATED ALWAYS AS IDENTITY,
  code_facteur_surprime               varchar(60)  NOT NULL,
  libelle_facteur_surprime            text         NOT NULL,
  nature_valeur_facteur_surprime      varchar(10)  NOT NULL,
  unite_facteur_surprime              varchar(10),
  valeur_facteur_surprime_fichier_source integer,
  note_facteur_surprime               text,
  ordre_affichage                     integer      NOT NULL,
  est_actif                           boolean      NOT NULL DEFAULT true,
  CONSTRAINT facteur_surprime_pkey PRIMARY KEY (id_facteur_surprime),
  CONSTRAINT facteur_surprime_code_facteur_surprime_key UNIQUE (code_facteur_surprime),
  CONSTRAINT facteur_surprime_valeur_facteur_surprime_fichier_source_key UNIQUE (valeur_facteur_surprime_fichier_source),
  CONSTRAINT facteur_surprime_nature_valeur_facteur_surprime_check CHECK (nature_valeur_facteur_surprime IN ('OUI_NON','NOMBRE'))
);
COMMENT ON TABLE tarification.facteur_surprime IS 'Facteurs de risque donnant lieu à surprime ou réduction (référentiel hérité, branche automobile). L''identifiant est propre à la base ; l''ancien numéro du fichier source n''est jamais une clé.';

-- 2. Tarifs de surprime ------------------------------------------------
CREATE TABLE tarification.tarif_surprime (
  id_tarif_surprime               integer GENERATED ALWAYS AS IDENTITY,
  id_compagnie                    integer      NOT NULL,
  categorie_code                  varchar      NOT NULL,
  id_facteur_surprime             integer      NOT NULL,
  code_mode_application_surprime  varchar(20)  NOT NULL,
  code_base_calcul                varchar,
  id_sous_garantie_assiette       integer,
  id_acte_reglementaire           integer      NOT NULL,
  date_debut_validite             date         NOT NULL,
  date_fin_validite               date         NOT NULL,
  statut                          varchar      NOT NULL DEFAULT 'ACTIF',
  libelle_tarif_surprime          text,
  note_tarif_surprime             text,
  source_page                     integer,
  CONSTRAINT tarif_surprime_pkey PRIMARY KEY (id_tarif_surprime),
  CONSTRAINT tarif_surprime_id_compagnie_fkey FOREIGN KEY (id_compagnie) REFERENCES tarification.compagnie (id_compagnie),
  CONSTRAINT tarif_surprime_categorie_code_fkey FOREIGN KEY (categorie_code) REFERENCES tarification.branche_categorie (categorie_code),
  CONSTRAINT tarif_surprime_id_facteur_surprime_fkey FOREIGN KEY (id_facteur_surprime) REFERENCES tarification.facteur_surprime (id_facteur_surprime),
  CONSTRAINT tarif_surprime_code_mode_application_surprime_fkey FOREIGN KEY (code_mode_application_surprime) REFERENCES tarification.mode_application_surprime (code_mode_application_surprime),
  CONSTRAINT tarif_surprime_code_base_calcul_fkey FOREIGN KEY (code_base_calcul) REFERENCES tarification.ref_base_calcul (code_base_calcul),
  CONSTRAINT tarif_surprime_id_sous_garantie_assiette_fkey FOREIGN KEY (id_sous_garantie_assiette) REFERENCES tarification.sous_garantie (id_sous_garantie),
  CONSTRAINT tarif_surprime_id_acte_reglementaire_fkey FOREIGN KEY (id_acte_reglementaire) REFERENCES tarification.acte_reglementaire (id_acte_reglementaire),
  CONSTRAINT tarif_surprime_date_fin_validite_check CHECK (date_fin_validite > date_debut_validite),
  CONSTRAINT tarif_surprime_statut_check CHECK (statut IN ('ACTIF','INACTIF','SUSPENDU','ABROGE')),
  CONSTRAINT tarif_surprime_code_base_calcul_check CHECK (code_mode_application_surprime <> 'TAUX_PCT' OR (code_base_calcul IS NOT NULL AND id_sous_garantie_assiette IS NOT NULL)),
  CONSTRAINT tarif_surprime_id_compagnie_categorie_code_id_facteur_excl EXCLUDE USING gist
    (id_compagnie WITH =, categorie_code WITH =, id_facteur_surprime WITH =, daterange(date_debut_validite, date_fin_validite, '[]') WITH &&)
);
COMMENT ON TABLE tarification.tarif_surprime IS 'Un facteur de surprime tarifé pour une compagnie (0 = défaut) et une catégorie (ALL = toutes). Mode et assiette sont des données : un changement de tarification est une nouvelle ligne datée.';

CREATE TABLE tarification.tranche_tarif_surprime (
  id_tranche_tarif_surprime    integer GENERATED ALWAYS AS IDENTITY,
  id_tarif_surprime            integer      NOT NULL,
  puissance_fiscale_min        numeric,
  puissance_fiscale_max        numeric,
  puissance_fiscale_diesel_min integer,
  puissance_fiscale_diesel_max integer,
  criteres_tranche_surprime    jsonb        NOT NULL DEFAULT '{}'::jsonb,
  taux_surprime                numeric,
  montant_surprime             numeric,
  source_page                  integer,
  note_tranche_surprime        text,
  CONSTRAINT tranche_tarif_surprime_pkey PRIMARY KEY (id_tranche_tarif_surprime),
  CONSTRAINT tranche_tarif_surprime_id_tarif_surprime_fkey FOREIGN KEY (id_tarif_surprime) REFERENCES tarification.tarif_surprime (id_tarif_surprime) ON DELETE CASCADE,
  CONSTRAINT tranche_tarif_surprime_puissance_fiscale_max_check CHECK (puissance_fiscale_max IS NULL OR puissance_fiscale_max > puissance_fiscale_min),
  CONSTRAINT tranche_tarif_surprime_taux_surprime_check CHECK ((taux_surprime IS NOT NULL) <> (montant_surprime IS NOT NULL))
);
CREATE UNIQUE INDEX tranche_tarif_surprime_tarif_puissance_zone_idx
  ON tarification.tranche_tarif_surprime (id_tarif_surprime, COALESCE(puissance_fiscale_min, -1), criteres_tranche_surprime);
COMMENT ON TABLE tarification.tranche_tarif_surprime IS 'Valeurs d''un tarif de surprime : taux (pourcentage, négatif pour une réduction) ou montant, par puissance fiscale et critères (zone).';

-- Droits : mêmes bénéficiaires que tarification.bareme_tranche
DO $$
DECLARE g record;
BEGIN
  FOR g IN SELECT DISTINCT grantee, privilege_type FROM information_schema.role_table_grants
           WHERE table_schema = 'tarification' AND table_name = 'bareme_tranche' AND grantee <> current_user LOOP
    EXECUTE format('GRANT %s ON tarification.mode_application_surprime, tarification.facteur_surprime, tarification.tarif_surprime, tarification.tranche_tarif_surprime TO %I', g.privilege_type, g.grantee);
  END LOOP;
END $$;

-- 3. Chargement --------------------------------------------------------
INSERT INTO tarification.mode_application_surprime (code_mode_application_surprime, libelle_mode_application_surprime, ordre_affichage) VALUES
  ('FORFAIT','Montant forfaitaire',1),
  ('PAR_PASSAGER','Montant par passager',2),
  ('TAUX_PCT','Pourcentage de l''assiette (négatif : réduction)',3);

INSERT INTO tarification.facteur_surprime
  (valeur_facteur_surprime_fichier_source, code_facteur_surprime, libelle_facteur_surprime, nature_valeur_facteur_surprime, unite_facteur_surprime, note_facteur_surprime, ordre_affichage)
VALUES
  (1,'FORTE_CIRCULATION','Profession à forte circulation','OUI_NON',NULL,'Délégués médicaux, agents publicitaires, agents d''affaires (liste de l''article 9-1 du tarif 1995)',1),
  (2,'FAIBLE_CIRCULATION','Profession à faible circulation (membres du clergé)','OUI_NON',NULL,'Membres du clergé et organismes confessionnels (article 9-2 du tarif 1995)',2),
  (3,'CONDUCTEUR_MOINS_25_ANS','Conducteur habituel de moins de 25 ans','OUI_NON',NULL,NULL,3),
  (4,'PERMIS_MOINS_2_ANS','Conducteur titulaire d''un permis de moins de deux ans','OUI_NON',NULL,NULL,4),
  (5,'PASSAGERS_HORS_CABINE','Transport de passagers hors cabine','NOMBRE','u',NULL,5),
  (8,'USAGE_COMMERCIAL','Usage commercial du véhicule','OUI_NON',NULL,NULL,6),
  (9,'ELEVES_NON_PAYANTS','Transport des élèves non payants','NOMBRE','u',NULL,7),
  (10,'PASSAGERS_A_L_INSU','Transport de passagers à l''insu de l''assuré','NOMBRE','u',NULL,8),
  (11,'PASSAGERS_SUPPLEMENTAIRES_PAYANTS','Transport de passagers supplémentaires payants','NOMBRE','u',NULL,9),
  (12,'PERSONNELS_NON_PAYANTS','Transport de personnels non payants','NOMBRE','u',NULL,10),
  (13,'SALARIES_TRANSPORTES','Transport de salariés','NOMBRE','u',NULL,11),
  (14,'PASSAGERS_CABINE_SECONDAIRE','Transport de passagers supplémentaires en cabine secondaire','NOMBRE','u',NULL,12),
  (15,'PASSAGERS_CABINE_PRINCIPALE','Transport de passagers supplémentaires en cabine principale','NOMBRE','u',NULL,13);

-- Article 9 : pourcentages de la prime RC, toutes catégories (ALL), compagnie 0
INSERT INTO tarification.tarif_surprime
  (id_compagnie, categorie_code, id_facteur_surprime, code_mode_application_surprime, code_base_calcul, id_sous_garantie_assiette,
   id_acte_reglementaire, date_debut_validite, date_fin_validite, libelle_tarif_surprime, note_tarif_surprime)
SELECT 0, 'ALL', f.id_facteur_surprime, 'TAUX_PCT', 'PRIME_ELEMENT_MEME_POLICE', 217, 1, DATE '1994-11-16', DATE '2099-12-31',
       'Article 9 - ' || f.libelle_facteur_surprime,
       CASE f.code_facteur_surprime
         WHEN 'PERMIS_MOINS_2_ANS' THEN 'Cumulable par addition avec les autres facteurs. Au tarif 1995, en 05bis (5B), ne vise que les véhicules de plus de 50 cm3 : condition non codée à ce stade.'
         ELSE 'Cumulable par addition avec les autres facteurs (décision du 13/10/2026).' END
  FROM tarification.facteur_surprime f
 WHERE f.code_facteur_surprime IN ('FORTE_CIRCULATION','FAIBLE_CIRCULATION','CONDUCTEUR_MOINS_25_ANS','PERMIS_MOINS_2_ANS');

INSERT INTO tarification.tranche_tarif_surprime (id_tarif_surprime, taux_surprime)
SELECT ts.id_tarif_surprime, CASE f.code_facteur_surprime WHEN 'FAIBLE_CIRCULATION' THEN -10 ELSE 10 END
  FROM tarification.tarif_surprime ts JOIN tarification.facteur_surprime f USING (id_facteur_surprime)
 WHERE ts.categorie_code = 'ALL' AND ts.id_compagnie = 0;

-- Passagers hors cabine / à l'insu de l'assuré : forfaits par puissance fiscale et zone, catégories 02 et 03
INSERT INTO tarification.tarif_surprime
  (id_compagnie, categorie_code, id_facteur_surprime, code_mode_application_surprime, id_acte_reglementaire, date_debut_validite, date_fin_validite, libelle_tarif_surprime, note_tarif_surprime)
SELECT 0, c.categorie_code, f.id_facteur_surprime, 'FORFAIT', 1, DATE '1994-11-16', DATE '2099-12-31',
       'RC Automobile - Catégorie ' || c.categorie_code || ' - ' || f.libelle_facteur_surprime,
       'Forfait unique quel que soit le nombre de passagers (décision du 13/10/2026) ; mode modifiable.'
  FROM tarification.facteur_surprime f
 CROSS JOIN (VALUES ('02'),('03')) AS c(categorie_code)
 WHERE f.code_facteur_surprime IN ('PASSAGERS_HORS_CABINE','PASSAGERS_A_L_INSU');

INSERT INTO tarification.tranche_tarif_surprime
  (id_tarif_surprime, puissance_fiscale_min, puissance_fiscale_max, puissance_fiscale_diesel_min, puissance_fiscale_diesel_max, criteres_tranche_surprime, montant_surprime)
SELECT ts.id_tarif_surprime, v.pmin, v.pmax, v.dmin, v.dmax, jsonb_build_object('zone', v.zone), v.montant
  FROM (VALUES
  ('PASSAGERS_HORS_CABINE','02','A',0,2,NULL,NULL,20566),
  ('PASSAGERS_A_L_INSU','02','A',0,2,NULL,NULL,11752),
  ('PASSAGERS_HORS_CABINE','02','A',3,6,2,4,24915),
  ('PASSAGERS_A_L_INSU','02','A',3,6,2,4,14237),
  ('PASSAGERS_HORS_CABINE','02','A',7,10,5,7,28322),
  ('PASSAGERS_A_L_INSU','02','A',7,10,5,7,16184),
  ('PASSAGERS_HORS_CABINE','02','A',11,14,8,10,42425),
  ('PASSAGERS_A_L_INSU','02','A',11,14,8,10,24243),
  ('PASSAGERS_HORS_CABINE','02','A',15,23,11,16,52531),
  ('PASSAGERS_A_L_INSU','02','A',15,23,11,16,30018),
  ('PASSAGERS_HORS_CABINE','02','A',24,NULL,17,NULL,60757),
  ('PASSAGERS_A_L_INSU','02','A',24,NULL,17,NULL,34719),
  ('PASSAGERS_HORS_CABINE','02','B',0,2,NULL,NULL,19709),
  ('PASSAGERS_A_L_INSU','02','B',0,2,NULL,NULL,11263),
  ('PASSAGERS_HORS_CABINE','02','B',3,6,2,4,23876),
  ('PASSAGERS_A_L_INSU','02','B',3,6,2,4,13644),
  ('PASSAGERS_HORS_CABINE','02','B',7,10,5,7,27142),
  ('PASSAGERS_A_L_INSU','02','B',7,10,5,7,15510),
  ('PASSAGERS_HORS_CABINE','02','B',11,14,8,10,40657),
  ('PASSAGERS_A_L_INSU','02','B',11,14,8,10,23233),
  ('PASSAGERS_HORS_CABINE','02','B',15,23,11,16,50342),
  ('PASSAGERS_A_L_INSU','02','B',15,23,11,16,28767),
  ('PASSAGERS_HORS_CABINE','02','B',24,NULL,17,NULL,58226),
  ('PASSAGERS_A_L_INSU','02','B',24,NULL,17,NULL,33272),
  ('PASSAGERS_HORS_CABINE','02','C',0,2,NULL,NULL,18853),
  ('PASSAGERS_A_L_INSU','02','C',0,2,NULL,NULL,10773),
  ('PASSAGERS_HORS_CABINE','02','C',3,6,2,4,22838),
  ('PASSAGERS_A_L_INSU','02','C',3,6,2,4,13051),
  ('PASSAGERS_HORS_CABINE','02','C',7,10,5,7,25962),
  ('PASSAGERS_A_L_INSU','02','C',7,10,5,7,14835),
  ('PASSAGERS_HORS_CABINE','02','C',11,14,8,10,38889),
  ('PASSAGERS_A_L_INSU','02','C',11,14,8,10,22223),
  ('PASSAGERS_HORS_CABINE','02','C',15,23,11,16,48153),
  ('PASSAGERS_A_L_INSU','02','C',15,23,11,16,27516),
  ('PASSAGERS_HORS_CABINE','02','C',24,NULL,17,NULL,55694),
  ('PASSAGERS_A_L_INSU','02','C',24,NULL,17,NULL,31825),
  ('PASSAGERS_HORS_CABINE','03','A',0,2,NULL,NULL,32916),
  ('PASSAGERS_A_L_INSU','03','A',0,2,NULL,NULL,18809),
  ('PASSAGERS_HORS_CABINE','03','A',3,6,2,4,40616),
  ('PASSAGERS_A_L_INSU','03','A',3,6,2,4,23209),
  ('PASSAGERS_HORS_CABINE','03','A',7,10,5,7,46515),
  ('PASSAGERS_A_L_INSU','03','A',7,10,5,7,26580),
  ('PASSAGERS_HORS_CABINE','03','A',11,14,8,10,68699),
  ('PASSAGERS_A_L_INSU','03','A',11,14,8,10,39257),
  ('PASSAGERS_HORS_CABINE','03','A',15,23,11,16,87574),
  ('PASSAGERS_A_L_INSU','03','A',15,23,11,16,50042),
  ('PASSAGERS_HORS_CABINE','03','A',24,NULL,17,NULL,101615),
  ('PASSAGERS_A_L_INSU','03','A',24,NULL,17,NULL,58066),
  ('PASSAGERS_HORS_CABINE','03','B',0,2,NULL,NULL,31545),
  ('PASSAGERS_A_L_INSU','03','B',0,2,NULL,NULL,18026),
  ('PASSAGERS_HORS_CABINE','03','B',3,6,2,4,38924),
  ('PASSAGERS_A_L_INSU','03','B',3,6,2,4,22242),
  ('PASSAGERS_HORS_CABINE','03','B',7,10,5,7,44578),
  ('PASSAGERS_A_L_INSU','03','B',7,10,5,7,25473),
  ('PASSAGERS_HORS_CABINE','03','B',11,14,8,10,65837),
  ('PASSAGERS_A_L_INSU','03','B',11,14,8,10,37621),
  ('PASSAGERS_HORS_CABINE','03','B',15,23,11,16,83925),
  ('PASSAGERS_A_L_INSU','03','B',15,23,11,16,47957),
  ('PASSAGERS_HORS_CABINE','03','B',24,NULL,17,NULL,97381),
  ('PASSAGERS_A_L_INSU','03','B',24,NULL,17,NULL,55646),
  ('PASSAGERS_HORS_CABINE','03','C',0,2,NULL,NULL,30173),
  ('PASSAGERS_A_L_INSU','03','C',0,2,NULL,NULL,17242),
  ('PASSAGERS_HORS_CABINE','03','C',3,6,2,4,37231),
  ('PASSAGERS_A_L_INSU','03','C',3,6,2,4,21275),
  ('PASSAGERS_HORS_CABINE','03','C',7,10,5,7,42639),
  ('PASSAGERS_A_L_INSU','03','C',7,10,5,7,24365),
  ('PASSAGERS_HORS_CABINE','03','C',11,14,8,10,62974),
  ('PASSAGERS_A_L_INSU','03','C',11,14,8,10,35985),
  ('PASSAGERS_HORS_CABINE','03','C',15,23,11,16,80276),
  ('PASSAGERS_A_L_INSU','03','C',15,23,11,16,45872),
  ('PASSAGERS_HORS_CABINE','03','C',24,NULL,17,NULL,93147),
  ('PASSAGERS_A_L_INSU','03','C',24,NULL,17,NULL,53227)
  ) AS v(code_facteur_surprime, categorie_code, zone, pmin, pmax, dmin, dmax, montant)
  JOIN tarification.facteur_surprime f ON f.code_facteur_surprime = v.code_facteur_surprime
  JOIN tarification.tarif_surprime ts ON ts.id_facteur_surprime = f.id_facteur_surprime AND ts.categorie_code = v.categorie_code AND ts.id_compagnie = 0;

-- 4. Contrôles finaux ----------------------------------------------------
DO $$
DECLARE n_mode int; n_fac int; n_ts int; n_tr int; s numeric; n_long int; av record; ap record;
BEGIN
  SELECT count(*) INTO n_mode FROM tarification.mode_application_surprime;
  SELECT count(*) INTO n_fac  FROM tarification.facteur_surprime;
  SELECT count(*) INTO n_ts   FROM tarification.tarif_surprime;
  SELECT count(*) INTO n_tr   FROM tarification.tranche_tarif_surprime;
  SELECT sum(montant_surprime) INTO s FROM tarification.tranche_tarif_surprime;
  IF n_mode <> 3 OR n_fac <> 13 OR n_ts <> 8 OR n_tr <> 76 THEN
    RAISE EXCEPTION 'Volumes inattendus : modes %, facteurs %, tarifs %, tranches % (attendu 3, 13, 8, 76)', n_mode, n_fac, n_ts, n_tr;
  END IF;
  IF s <> 2744381 THEN RAISE EXCEPTION 'Somme des forfaits % différente de 2744381', s; END IF;
  SELECT * INTO av FROM _volumes_avant;
  SELECT (SELECT count(*) FROM tarification.tarif) AS nb_tarif, (SELECT count(*) FROM tarification.bareme_tranche) AS nb_bareme_tranche INTO ap;
  IF av.nb_tarif <> ap.nb_tarif OR av.nb_bareme_tranche <> ap.nb_bareme_tranche THEN RAISE EXCEPTION 'Les tables existantes ont changé'; END IF;
  -- noms de 63 caractères ou plus (convention § 8)
  SELECT count(*) INTO n_long FROM (
    SELECT c.relname AS nom FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'tarification' AND c.relname ~ '(surprime)' 
    UNION ALL SELECT conname FROM pg_constraint WHERE conname ~ 'surprime') x WHERE length(nom) >= 63;
  IF n_long <> 0 THEN RAISE EXCEPTION '% nom(s) de 63 caractères ou plus', n_long; END IF;
END $$;

SELECT 'mode_application_surprime' AS table_, count(*) AS lignes FROM tarification.mode_application_surprime
UNION ALL SELECT 'facteur_surprime', count(*) FROM tarification.facteur_surprime
UNION ALL SELECT 'tarif_surprime', count(*) FROM tarification.tarif_surprime
UNION ALL SELECT 'tranche_tarif_surprime', count(*) FROM tarification.tranche_tarif_surprime
UNION ALL SELECT 'tarif (inchangé)', count(*) FROM tarification.tarif
UNION ALL SELECT 'bareme_tranche (inchangé)', count(*) FROM tarification.bareme_tranche;
SELECT id_facteur_surprime, valeur_facteur_surprime_fichier_source AS ancien_numero, code_facteur_surprime FROM tarification.facteur_surprime ORDER BY 1;

\if :commit
COMMIT;
\else
ROLLBACK;
\echo 'ESSAI A BLANC : rien n''est conserve'
\endif
