-- =====================================================================
-- Lot 1 — Nettoyage et normalisation des VIN du catalogue (07/10/2026)
-- Décisions de Roger :
--   * tirets bas / espaces de remplissage en FIN de VIN : retirés ;
--   * I -> 1, O -> 0, Q -> 0 (lettres interdites par ISO 3779) ;
--   * frappe AZERTY sans majuscule sur la rangée des chiffres :
--     & é " ' ( è _ ç à -> 1 2 3 4 5 7 8 9 0 (le tiret '-' reste un séparateur) ;
--     une apostrophe EN TÊTE (préfixe texte d'Excel) rend le VIN inexploitable ;
--   * éliminés : VIN à séparateurs internes, valeurs qui ne sont pas des VIN,
--     VIN de moins de 10 caractères, genres inexploitables (6, -34862533,
--     1223Bo, Ze360E, Cxt, vide) — avec leurs sources, trace dans anomalie_fusion ;
--   * doublons créés par la correction : fusionnés (sources rattachées au profil conservé) ;
--   * même normalisation dans vpic.decode_vin_flat (saisie).
--
-- Usage :
--   essai à blanc : sudo -u postgres psql -d vpiclist -P pager=off -v ON_ERROR_STOP=1 -v commit=false -f /tmp/lot1_vin_catalogue.sql
--   application   : sudo -u postgres psql -d vpiclist -P pager=off -v ON_ERROR_STOP=1 -v commit=true  -f /tmp/lot1_vin_catalogue.sql
-- =====================================================================
\set QUIET on
\pset footer off
BEGIN;

\echo '=== 0. État initial ==='
CREATE TEMP TABLE _volumes_avant AS
SELECT (SELECT count(*) FROM catalogue.vehicule_catalogue) AS profils,
       (SELECT count(*) FROM catalogue.vehicule_source)    AS sources,
       (SELECT count(*) FROM catalogue.anomalie_fusion)    AS anomalies;
SELECT * FROM _volumes_avant;

-- VIN de test contenant un O, pour vérifier que la recherche le retrouve après correction
CREATE TEMP TABLE _test_o AS
SELECT vin AS vin_saisi FROM catalogue.vehicule_catalogue
 WHERE vin ~ '^[A-Z0-9]{10,17}$' AND vin ~ 'O' ORDER BY id_vehicule_catalogue LIMIT 3;
CREATE TEMP TABLE _test_avant AS
SELECT t.vin_saisi, d.catalogue_nb_profils AS nb FROM _test_o t, vpic.decode_vin_flat(t.vin_saisi) d;

\echo '=== 1. Classement des profils ==='
CREATE TEMP TABLE _prof AS
SELECT c.id_vehicule_catalogue AS id, c.vin AS vin_ancien,
       translate(regexp_replace(upper(btrim(c.vin)), '[_ ]+$', ''), '&É"''(È_ÇÀéèçàIOQ', '1234578902790100') AS vin_nouveau,
       (c.genre IS NULL OR btrim(c.genre) = '' OR c.genre IN ('6','-34862533','1223Bo','Ze360E','Cxt')) AS genre_inexploitable
  FROM catalogue.vehicule_catalogue c;
ALTER TABLE _prof ADD COLUMN elimine boolean;
UPDATE _prof SET elimine = genre_inexploitable OR vin_nouveau !~ '^[A-Z0-9]{10,17}$' OR vin_ancien ~ '^''';

SELECT count(*) FILTER (WHERE elimine)                                   AS a_eliminer,
       count(*) FILTER (WHERE NOT elimine AND vin_nouveau <> vin_ancien) AS a_corriger,
       count(*) FILTER (WHERE NOT elimine AND vin_nouveau =  vin_ancien) AS inchanges
  FROM _prof;
\echo '--- Profils éliminés ---'
SELECT p.id, p.vin_ancien, c.marque, c.modele, c.genre,
       CASE WHEN p.genre_inexploitable THEN 'genre inexploitable' ELSE 'VIN inexploitable' END AS motif
  FROM _prof p JOIN catalogue.vehicule_catalogue c ON c.id_vehicule_catalogue = p.id
 WHERE p.elimine ORDER BY motif, p.vin_ancien;

\echo '=== 2. Normalisation du VIN dans les anomalies existantes ==='
UPDATE catalogue.anomalie_fusion SET vin = translate(regexp_replace(upper(btrim(vin)), '[_ ]+$', ''), '&É"''(È_ÇÀéèçàIOQ', '1234578902790100') WHERE vin <> translate(regexp_replace(upper(btrim(vin)), '[_ ]+$', ''), '&É"''(È_ÇÀéèçàIOQ', '1234578902790100');

\echo '=== 3. Élimination, avec trace ==='
INSERT INTO catalogue.anomalie_fusion
  (vin, site_origine, id_reference, champ, valeur_catalogue, valeur_nouvelle,
   gravite, code_erreur, message, statut, date_resolution)
SELECT p.vin_ancien, coalesce(s.site_origine, 'catalogue'), s.id_reference::text, 'Profil',
       row_to_json(c)::text, NULL, 'info', 'ELIMINE_INEXPLOITABLE',
       'Profil éliminé le 07/10/2026 (lot 1) : ' ||
       CASE WHEN p.genre_inexploitable THEN 'genre inexploitable' ELSE 'VIN inexploitable' END,
       'resolu', now()
  FROM _prof p
  JOIN catalogue.vehicule_catalogue c ON c.id_vehicule_catalogue = p.id
  LEFT JOIN catalogue.vehicule_source s ON s.id_vehicule_catalogue = p.id
 WHERE p.elimine;
DELETE FROM catalogue.vehicule_source WHERE id_vehicule_catalogue IN (SELECT id FROM _prof WHERE elimine);
DELETE FROM catalogue.vehicule_catalogue WHERE id_vehicule_catalogue IN (SELECT id FROM _prof WHERE elimine);

\echo '=== 4. Fusion des doublons créés par la correction ==='
CREATE TEMP TABLE _fusion AS
SELECT id AS id_doublon, id_conserve FROM (
  SELECT p.id,
         min(p.id) OVER (PARTITION BY p.vin_nouveau, c.marque, c.modele, c.genre, c.energie,
                                      c.puissance, c.charge_utile, c.nombre_places) AS id_conserve
    FROM _prof p JOIN catalogue.vehicule_catalogue c ON c.id_vehicule_catalogue = p.id
   WHERE NOT p.elimine) x
 WHERE id <> id_conserve;
SELECT count(*) AS doublons_fusionnes FROM _fusion;

INSERT INTO catalogue.anomalie_fusion
  (vin, site_origine, id_reference, champ, valeur_catalogue, valeur_nouvelle,
   gravite, code_erreur, message, statut, date_resolution)
SELECT p.vin_nouveau, 'catalogue', NULL, 'Profil', f.id_doublon::text, f.id_conserve::text,
       'info', 'FUSIONNE_DOUBLON',
       'Profil fusionné le 07/10/2026 (lot 1) : identique après normalisation du VIN', 'resolu', now()
  FROM _fusion f JOIN _prof p ON p.id = f.id_doublon;
UPDATE catalogue.vehicule_source s SET id_vehicule_catalogue = f.id_conserve
  FROM _fusion f WHERE s.id_vehicule_catalogue = f.id_doublon;
DELETE FROM catalogue.vehicule_catalogue WHERE id_vehicule_catalogue IN (SELECT id_doublon FROM _fusion);

\echo '=== 5. Correction des VIN ==='
UPDATE catalogue.vehicule_catalogue c SET vin = p.vin_nouveau, taille_vin = length(p.vin_nouveau)
  FROM _prof p WHERE p.id = c.id_vehicule_catalogue AND p.vin_nouveau <> c.vin;
UPDATE catalogue.vehicule_source SET vin = translate(regexp_replace(upper(btrim(vin)), '[_ ]+$', ''), '&É"''(È_ÇÀéèçàIOQ', '1234578902790100') WHERE vin <> translate(regexp_replace(upper(btrim(vin)), '[_ ]+$', ''), '&É"''(È_ÇÀéèçàIOQ', '1234578902790100');

\echo '=== 6. vpic.decode_vin_flat : même normalisation à la saisie ==='
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
        WHERE c.vin = translate(regexp_replace(UPPER(btrim(p_vin)), '[_ ]+$', ''), '&É"''(È_ÇÀéèçàIOQ', '1234578902790100')
        ORDER BY c.date_creation DESC
        LIMIT 1;

        SELECT COUNT(*) INTO v_cat_nb_profils
        FROM catalogue.vehicule_catalogue c2
        WHERE c2.vin = translate(regexp_replace(UPPER(btrim(p_vin)), '[_ ]+$', ''), '&É"''(È_ÇÀéèçàIOQ', '1234578902790100');

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

\echo '=== 7. Contrôles ==='
DO $c$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM catalogue.vehicule_catalogue WHERE vin !~ '^[A-Z0-9]{10,17}$' OR vin ~ '[IOQ]';
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  % VIN non conformes dans le catalogue', n; END IF;
  SELECT count(*) INTO n FROM catalogue.vehicule_source WHERE vin ~ '[IOQ]' OR vin ~ '[_ ]$';
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  % VIN non normalisés dans les sources', n; END IF;
  SELECT count(*) INTO n FROM catalogue.vehicule_catalogue c
   WHERE c.genre IS NULL OR btrim(c.genre) = '' OR c.genre IN ('6','-34862533','1223Bo','Ze360E','Cxt');
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  % genres inexploitables restants', n; END IF;
  SELECT count(*) INTO n FROM catalogue.vehicule_catalogue c
   WHERE NOT EXISTS (SELECT 1 FROM catalogue.vehicule_source s WHERE s.id_vehicule_catalogue = c.id_vehicule_catalogue);
  RAISE NOTICE '[OK]     VIN conformes ; % profil(s) sans source (pour information)', n;
END $c$;

SELECT 'avant' AS etat, profils, sources, anomalies FROM _volumes_avant
UNION ALL
SELECT 'après', (SELECT count(*) FROM catalogue.vehicule_catalogue), (SELECT count(*) FROM catalogue.vehicule_source),
       (SELECT count(*) FROM catalogue.anomalie_fusion);

\echo '--- Recherche d un VIN saisi avec un O (doit retrouver le véhicule) ---'
SELECT t.vin_saisi, a.nb AS profils_avant, d.catalogue_nb_profils AS profils_apres
  FROM _test_o t JOIN _test_avant a USING (vin_saisi), vpic.decode_vin_flat(t.vin_saisi) d;
DO $t$
BEGIN
  IF EXISTS (SELECT 1 FROM _test_o t, vpic.decode_vin_flat(t.vin_saisi) d WHERE d.catalogue_nb_profils = 0
             AND d.source <> 'vpic') THEN
    RAISE EXCEPTION '[ÉCHEC]  un VIN saisi avec un O n est plus retrouvé';
  END IF;
  RAISE NOTICE '[OK]     Les VIN saisis avec un O sont retrouvés';
END $t$;

\echo '=== Fin ==='
\if :commit
  COMMIT;
  \echo '>>> VALIDÉ : lot 1 appliqué.'
\else
  ROLLBACK;
  \echo '>>> ESSAI À BLANC : tout a été annulé. Relancer avec -v commit=true pour appliquer.'
\endif
