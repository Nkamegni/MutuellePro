-- =====================================================================
-- Mise en conformité du schéma catalogue — 07/10/2026
--   vehicules_catalogue -> vehicule_catalogue   (id -> id_vehicule_catalogue)
--   vehicules_sources   -> vehicule_source      (id -> id_vehicule_source,
--                                                 profil_id -> id_vehicule_catalogue)
--   anomalies_fusion    -> anomalie_fusion      (id -> id_anomalie_fusion)
--   contraintes, index, séquences renommés ; vpic.decode_vin_flat mise à jour ;
--   vue TRANSITOIRE catalogue.vehicules_catalogue (expose l'ancienne colonne id)
--   pour le server.js actuel, à supprimer après son déploiement.
--
-- Usage :
--   essai à blanc : sudo -u postgres psql -d vpiclist -P pager=off -v ON_ERROR_STOP=1 -v commit=false -f /tmp/conformite_catalogue.sql
--   application   : sudo -u postgres psql -d vpiclist -P pager=off -v ON_ERROR_STOP=1 -v commit=true  -f /tmp/conformite_catalogue.sql
-- =====================================================================
\set QUIET on
\pset footer off
BEGIN;

\echo '=== 0. Garde-fous ==='
DO $g$
DECLARE n int; l text;
BEGIN
  SELECT count(*), string_agg(n2.nspname || '.' || p.proname, ', ') INTO n, l
    FROM pg_proc p JOIN pg_namespace n2 ON n2.oid = p.pronamespace JOIN pg_language lg ON lg.oid = p.prolang
   WHERE lg.lanname <> 'c' AND n2.nspname NOT IN ('pg_catalog','information_schema')
     AND p.prosrc ~ '\m(vehicules_catalogue|vehicules_sources|anomalies_fusion)\M'
     AND NOT (n2.nspname = 'vpic' AND p.proname = 'decode_vin_flat');
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  fonction(s) imprévue(s) : %', l; END IF;

  SELECT count(*), string_agg(v.relnamespace::regnamespace || '.' || v.relname, ', ') INTO n, l
    FROM pg_class v WHERE v.relkind IN ('v','m')
     AND v.relnamespace NOT IN ('pg_catalog'::regnamespace, 'information_schema'::regnamespace)
     AND pg_get_viewdef(v.oid) ~ '\m(vehicules_catalogue|vehicules_sources|anomalies_fusion)\M';
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  vue(s) imprévue(s) : %', l; END IF;
  RAISE NOTICE '[OK]     Seule vpic.decode_vin_flat lit le catalogue';
END $g$;

\echo '=== 1. Jeux de test et résultats AVANT ==='
CREATE TEMP TABLE _vins AS
SELECT vin FROM (SELECT DISTINCT vin FROM catalogue.vehicules_catalogue ORDER BY vin LIMIT 4) a
UNION ALL
SELECT vin FROM (SELECT vin FROM catalogue.vehicules_catalogue GROUP BY vin HAVING count(*) > 1 ORDER BY vin LIMIT 2) b
UNION ALL SELECT '1HGCM82633A004352';

CREATE TEMP TABLE _avant AS
SELECT 'decode ' || v.vin AS test, d::text AS resultat FROM _vins v, vpic.decode_vin_flat(v.vin) d
UNION ALL
SELECT 'similarite TOYOTA', string_agg(c.id || ':' || c.marque, ',' ORDER BY c.id)
  FROM (SELECT id, marque FROM catalogue.vehicules_catalogue WHERE catalogue.similarity(marque, 'TOYOTA') > 0.3 ORDER BY id LIMIT 20) c
UNION ALL
SELECT 'jointure sources', string_agg(s.id || '>' || c.id, ',' ORDER BY s.id)
  FROM (SELECT * FROM catalogue.vehicules_sources ORDER BY id LIMIT 20) s
  JOIN catalogue.vehicules_catalogue c ON c.id = s.profil_id
UNION ALL
SELECT 'volumes', (SELECT count(*) FROM catalogue.vehicules_catalogue) || '/' ||
                  (SELECT count(*) FROM catalogue.vehicules_sources) || '/' ||
                  (SELECT count(*) FROM catalogue.anomalies_fusion);
SELECT test, left(resultat, 90) AS resultat FROM _avant ORDER BY test;

\echo '=== 2. Renommage des colonnes et des tables ==='
ALTER TABLE catalogue.vehicules_catalogue RENAME COLUMN id        TO id_vehicule_catalogue;
ALTER TABLE catalogue.vehicules_sources   RENAME COLUMN id        TO id_vehicule_source;
ALTER TABLE catalogue.vehicules_sources   RENAME COLUMN profil_id TO id_vehicule_catalogue;
ALTER TABLE catalogue.anomalies_fusion    RENAME COLUMN id        TO id_anomalie_fusion;
ALTER TABLE catalogue.vehicules_catalogue RENAME TO vehicule_catalogue;
ALTER TABLE catalogue.vehicules_sources   RENAME TO vehicule_source;
ALTER TABLE catalogue.anomalies_fusion    RENAME TO anomalie_fusion;

\echo '=== 3. Contraintes, index et séquences ==='
CREATE FUNCTION pg_temp.nouveau_nom(n text) RETURNS text LANGUAGE sql AS $f$
  SELECT replace(replace(replace(replace(replace(replace(replace(replace(n,
    'idx_sources_profil', 'idx_vehicule_source_id_vehicule_catalogue'),
    'idx_sources_',       'idx_vehicule_source_'),
    'idx_anomalies_',     'idx_anomalie_fusion_'),
    'idx_catalogue_',     'idx_vehicule_catalogue_'),
    'vehicules_catalogue','vehicule_catalogue'),
    'vehicules_sources',  'vehicule_source'),
    'anomalies_fusion',   'anomalie_fusion'),
    'profil_id',          'id_vehicule_catalogue')
$f$;

DO $k$
DECLARE r record; nv text; s text; n int := 0; m int := 0;
BEGIN
  FOR r IN SELECT c.relname AS tbl, k.conname AS nom FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid
            WHERE k.connamespace = 'catalogue'::regnamespace LOOP
    nv := pg_temp.nouveau_nom(r.nom);
    IF nv <> r.nom THEN
      IF length(nv) > 63 THEN RAISE EXCEPTION '[ÉCHEC]  nom trop long : %', nv; END IF;
      EXECUTE format('ALTER TABLE catalogue.%I RENAME CONSTRAINT %I TO %I', r.tbl, r.nom, nv);
      RAISE NOTICE '         contrainte : % -> %', r.nom, nv; n := n + 1;
    END IF;
  END LOOP;
  FOR r IN SELECT i.relname AS nom FROM pg_index x JOIN pg_class i ON i.oid = x.indexrelid
            WHERE i.relnamespace = 'catalogue'::regnamespace
              AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = x.indexrelid AND c.contype IN ('p','u','x')) LOOP
    nv := pg_temp.nouveau_nom(r.nom);
    IF nv <> r.nom THEN
      IF length(nv) > 63 THEN RAISE EXCEPTION '[ÉCHEC]  nom trop long : %', nv; END IF;
      EXECUTE format('ALTER INDEX catalogue.%I RENAME TO %I', r.nom, nv);
      RAISE NOTICE '         index : % -> %', r.nom, nv; n := n + 1;
    END IF;
  END LOOP;
  FOR r IN SELECT t, c FROM (VALUES ('vehicule_catalogue','id_vehicule_catalogue'),
                                    ('vehicule_source','id_vehicule_source'),
                                    ('anomalie_fusion','id_anomalie_fusion')) v(t, c) LOOP
    s := pg_get_serial_sequence('catalogue.' || r.t, r.c);
    IF s IS NOT NULL AND split_part(s, '.', 2) <> r.t || '_' || r.c || '_seq' THEN
      EXECUTE format('ALTER SEQUENCE %s RENAME TO %I', s, r.t || '_' || r.c || '_seq');
      m := m + 1;
    END IF;
  END LOOP;
  RAISE NOTICE '[OK]     % contrainte(s)/index et % séquence(s) renommé(s)', n, m;
END $k$;

\echo '=== 4. vpic.decode_vin_flat mise à jour ==='
CREATE OR REPLACE FUNCTION vpic.decode_vin_flat(p_vin character varying, p_year integer DEFAULT NULL::integer)
 RETURNS TABLE(vin character varying, error_code character varying, error_text character varying, is_valid boolean, make character varying, model character varying, model_year character varying, trim_level character varying, vehicle_type character varying, manufacturer character varying, body_class character varying, doors character varying, engine_cylinders character varying, engine_displacement_l character varying, engine_hp_from character varying, fuel_type character varying, engine_model character varying, transmission_style character varying, transmission_speeds character varying, gvwr_from character varying, gvwr_to character varying, plant_city character varying, plant_state character varying, plant_country character varying, source character varying, catalogue_marque character varying, catalogue_modele character varying, catalogue_energie character varying, catalogue_puissance_fiscale_cv character varying, catalogue_nombre_places character varying, catalogue_charge_utile_kg character varying, catalogue_nb_profils integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_error_code       varchar;
    v_error_text       varchar;
    v_make             varchar;
    v_model            varchar;
    v_model_year       varchar;
    v_trim_level       varchar;
    v_vehicle_type     varchar;
    v_manufacturer     varchar;
    v_body_class       varchar;
    v_doors            varchar;
    v_engine_cylinders varchar;
    v_engine_displ     varchar;
    v_engine_hp_from   varchar;
    v_fuel_type        varchar;
    v_engine_model     varchar;
    v_trans_style      varchar;
    v_trans_speeds     varchar;
    v_gvwr_from        varchar;
    v_gvwr_to          varchar;
    v_plant_city       varchar;
    v_plant_state      varchar;
    v_plant_country    varchar;

    v_vpic_incomplet   boolean;
    v_source           varchar := 'vpic';

    v_cat_marque        varchar;
    v_cat_modele        varchar;
    v_cat_energie       varchar;
    v_cat_puissance     varchar;
    v_cat_places        varchar;
    v_cat_charge_utile  varchar;
    v_cat_nb_profils    integer := 0;
BEGIN
    -- ------------------------------------------------------------
    -- 1) Decodage vPIC standard -- logique ORIGINALE, non modifiee
    -- ------------------------------------------------------------
    SELECT
        MAX(CASE WHEN d.variable = 'Error Code' THEN d.value END),
        MAX(CASE WHEN d.variable = 'Error Text' THEN d.value END),
        MAX(CASE WHEN d.variable = 'Make' THEN d.value END),
        MAX(CASE WHEN d.variable = 'Model' THEN d.value END),
        MAX(CASE WHEN d.variable = 'Model Year' THEN d.value END),
        MAX(CASE WHEN d.variable = 'Trim' THEN d.value END),
        MAX(CASE WHEN d.variable = 'Vehicle Type' THEN d.value END),
        MAX(CASE WHEN d.variable = 'Manufacturer Name' THEN d.value END),
        MAX(CASE WHEN d.variable = 'Body Class' THEN d.value END),
        MAX(CASE WHEN d.variable = 'Doors' THEN d.value END),
        MAX(CASE WHEN d.variable = 'Engine Number of Cylinders' THEN d.value END),
        MAX(CASE WHEN d.variable = 'Displacement (L)' THEN d.value END),
        MAX(CASE WHEN d.variable = 'Engine Brake (hp) From' THEN d.value END),
        MAX(CASE WHEN d.variable = 'Fuel Type - Primary' THEN d.value END),
        MAX(CASE WHEN d.variable = 'Engine Model' THEN d.value END),
        MAX(CASE WHEN d.variable = 'Transmission Style' THEN d.value END),
        MAX(CASE WHEN d.variable = 'Transmission Speeds' THEN d.value END),
        MAX(CASE WHEN d.variable = 'Gross Vehicle Weight Rating From' THEN d.value END),
        MAX(CASE WHEN d.variable = 'Gross Vehicle Weight Rating To' THEN d.value END),
        MAX(CASE WHEN d.variable = 'Plant City' THEN d.value END),
        MAX(CASE WHEN d.variable = 'Plant State' THEN d.value END),
        MAX(CASE WHEN d.variable = 'Plant Country' THEN d.value END)
    INTO
        v_error_code, v_error_text, v_make, v_model, v_model_year, v_trim_level,
        v_vehicle_type, v_manufacturer, v_body_class, v_doors, v_engine_cylinders,
        v_engine_displ, v_engine_hp_from, v_fuel_type, v_engine_model, v_trans_style,
        v_trans_speeds, v_gvwr_from, v_gvwr_to, v_plant_city, v_plant_state, v_plant_country
    FROM vpic.spvindecode(p_vin, false, p_year) d;

    -- ------------------------------------------------------------
    -- 2) vPIC est-il incomplet pour ce VIN (hors marche US/Canada) ?
    -- ------------------------------------------------------------
    v_vpic_incomplet := (v_error_code IS DISTINCT FROM '0') OR (v_make IS NULL);

    -- ------------------------------------------------------------
    -- 3) Repli sur catalogue.vehicule_catalogue si necessaire.
    --    On prend le profil le plus recent si plusieurs existent
    --    pour ce VIN (cf. gestion multi-motorisation) ; le nombre
    --    total de profils connus est expose separement.
    -- ------------------------------------------------------------
    IF v_vpic_incomplet THEN
        SELECT c.marque, c.modele, c.energie, c.puissance,
               c.nombre_places::varchar, c.charge_utile::varchar
        INTO v_cat_marque, v_cat_modele, v_cat_energie, v_cat_puissance,
             v_cat_places, v_cat_charge_utile
        FROM catalogue.vehicule_catalogue c
        WHERE c.vin = UPPER(p_vin)
        ORDER BY c.date_creation DESC
        LIMIT 1;

        SELECT COUNT(*) INTO v_cat_nb_profils
        FROM catalogue.vehicule_catalogue c2
        WHERE c2.vin = UPPER(p_vin);

        IF v_cat_nb_profils > 0 THEN
            v_source := CASE WHEN v_make IS NOT NULL THEN 'vpic+catalogue' ELSE 'catalogue' END;

            -- Enrichissement NON DESTRUCTIF : on complete uniquement les
            -- champs que vPIC n'a pas fournis, on n'ecrase jamais une
            -- donnee vPIC deja presente.
            v_make      := COALESCE(v_make, v_cat_marque);
            v_model     := COALESCE(v_model, v_cat_modele);
            v_fuel_type := COALESCE(v_fuel_type, v_cat_energie);
            -- engine_hp_from : JAMAIS enrichi depuis v_cat_puissance
            -- (unites incompatibles, cf. note en tete de fichier).
        END IF;
    END IF;

    RETURN QUERY SELECT
        p_vin::varchar,
        v_error_code,
        v_error_text,
        (v_error_code = '0'),                          -- is_valid : sens original, inchange
        v_make,
        v_model,
        v_model_year,
        v_trim_level,
        v_vehicle_type,
        v_manufacturer,
        v_body_class,
        v_doors,
        v_engine_cylinders,
        v_engine_displ,
        v_engine_hp_from,
        v_fuel_type,
        v_engine_model,
        v_trans_style,
        v_trans_speeds,
        v_gvwr_from,
        v_gvwr_to,
        v_plant_city,
        v_plant_state,
        v_plant_country,
        v_source,
        v_cat_marque,
        v_cat_modele,
        v_cat_energie,
        v_cat_puissance,
        v_cat_places,
        v_cat_charge_utile,
        v_cat_nb_profils;
END;
$function$;

\echo '=== 5. Vue TRANSITOIRE pour le server.js actuel ==='
CREATE VIEW catalogue.vehicules_catalogue AS
SELECT id_vehicule_catalogue AS id, vin, wmi, marque, modele, genre, energie, puissance,
       charge_utile, nombre_places, taille_vin, date_creation
  FROM catalogue.vehicule_catalogue;
COMMENT ON VIEW catalogue.vehicules_catalogue IS
  'TRANSITOIRE (07/10/2026) : ancien nom pour le server.js actuel. À supprimer après déploiement du correctif.';

\echo '=== 6. Contrôles ==='
DO $c$
DECLARE n int; l text;
BEGIN
  SELECT count(*), string_agg(table_name || '.' || column_name, ', ') INTO n, l
    FROM information_schema.columns
   WHERE table_schema = 'catalogue' AND table_name IN ('vehicule_catalogue','vehicule_source','anomalie_fusion')
     AND column_name IN ('id','profil_id');
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  colonnes non renommées : %', l; END IF;

  SELECT count(*), string_agg(nom, ', ') INTO n, l FROM (
    SELECT conname AS nom FROM pg_constraint WHERE connamespace = 'catalogue'::regnamespace
    UNION ALL SELECT relname FROM pg_class WHERE relnamespace = 'catalogue'::regnamespace AND relkind IN ('i','S')) x
   WHERE nom ~ '(vehicules_|anomalies_|profil_id|idx_sources_|idx_catalogue_)';
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  noms hérités restants : %', l; END IF;

  SELECT count(*) INTO n FROM pg_proc p
   WHERE p.pronamespace = 'vpic'::regnamespace AND p.proname = 'decode_vin_flat'
     AND p.prosrc ~ 'vehicules_catalogue';
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  decode_vin_flat cite encore l ancien nom'; END IF;
  RAISE NOTICE '[OK]     Colonnes, contraintes, index, séquences et fonction conformes';
END $c$;

CREATE TEMP TABLE _apres AS
SELECT 'decode ' || v.vin AS test, d::text AS resultat FROM _vins v, vpic.decode_vin_flat(v.vin) d
UNION ALL
SELECT 'similarite TOYOTA', string_agg(c.id_vehicule_catalogue || ':' || c.marque, ',' ORDER BY c.id_vehicule_catalogue)
  FROM (SELECT id_vehicule_catalogue, marque FROM catalogue.vehicule_catalogue WHERE catalogue.similarity(marque, 'TOYOTA') > 0.3 ORDER BY id_vehicule_catalogue LIMIT 20) c
UNION ALL
SELECT 'jointure sources', string_agg(s.id_vehicule_source || '>' || c.id_vehicule_catalogue, ',' ORDER BY s.id_vehicule_source)
  FROM (SELECT * FROM catalogue.vehicule_source ORDER BY id_vehicule_source LIMIT 20) s
  JOIN catalogue.vehicule_catalogue c ON c.id_vehicule_catalogue = s.id_vehicule_catalogue
UNION ALL
SELECT 'volumes', (SELECT count(*) FROM catalogue.vehicule_catalogue) || '/' ||
                  (SELECT count(*) FROM catalogue.vehicule_source) || '/' ||
                  (SELECT count(*) FROM catalogue.anomalie_fusion);

CREATE TEMP TABLE _vue AS
SELECT 'similarite TOYOTA (vue transitoire)' AS test, string_agg(c.id || ':' || c.marque, ',' ORDER BY c.id) AS resultat
  FROM (SELECT id, marque FROM catalogue.vehicules_catalogue WHERE catalogue.similarity(marque, 'TOYOTA') > 0.3 ORDER BY id LIMIT 20) c;

DO $d$
DECLARE n int; t int;
BEGIN
  SELECT count(*) INTO t FROM _avant;
  SELECT count(*) INTO n FROM ((SELECT * FROM _avant EXCEPT ALL SELECT * FROM _apres)
                               UNION ALL (SELECT * FROM _apres EXCEPT ALL SELECT * FROM _avant)) d;
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  % écart(s) entre avant et après', n; END IF;
  IF (SELECT resultat FROM _vue) IS DISTINCT FROM (SELECT resultat FROM _avant WHERE test = 'similarite TOYOTA') THEN
    RAISE EXCEPTION '[ÉCHEC]  la vue transitoire ne restitue pas les mêmes résultats';
  END IF;
  RAISE NOTICE '[OK]     % contrôle(s) identiques avant et après, vue transitoire conforme', t;
END $d$;

\echo '=== Fin ==='
\if :commit
  COMMIT;
  \echo '>>> VALIDÉ : schéma catalogue mis en conformité.'
\else
  ROLLBACK;
  \echo '>>> ESSAI À BLANC : tout a été annulé. Relancer avec -v commit=true pour appliquer.'
\endif

-- Complément appliqué à la main après la migration (07/10/2026) :
GRANT SELECT ON catalogue.vehicules_catalogue TO mutuellepro;
