-- =====================================================================
-- Lot R (07/10/2026) — Nomenclatures partagées déplacées dans le schéma referentiel
--   site.constructeurs     -> referentiel.constructeur      ; id   -> id_constructeur
--   site.energies_vehicule -> referentiel.energie_vehicule  ; code -> code_energie_vehicule
--   site.unites_puissance  -> referentiel.unite_puissance   ; clé = code_unite_puissance (id supprimé)
--   site.usages_categories -> referentiel.categorie_usage   ; clé = code_categorie_usage (id supprimé)
--   Clés étrangères vers les catégories renommées code_categorie_usage[_rôle] (6 colonnes) ;
--   colonne de la vue catalogue.profil_vehicule renommée ; déclencheurs de synchronisation
--   tarification.fn_sync_categorie_* réécrits (NEW/OLD.code -> code_categorie_usage).
--
--   essai à blanc : sudo -u postgres psql -d vpiclist -P pager=off -v ON_ERROR_STOP=1 -v commit=false -f /tmp/lot_r_nomenclatures_referentiel.sql
--   application   : sudo -u postgres psql -d vpiclist -P pager=off -v ON_ERROR_STOP=1 -v commit=true  -f /tmp/lot_r_nomenclatures_referentiel.sql
-- =====================================================================
\set QUIET on
\set VERBOSITY terse
\pset footer off
BEGIN;

\echo '=== 0. Garde-fous ==='
DO $g$
DECLARE n int; l text;
BEGIN
  IF to_regclass('referentiel.categorie_usage') IS NOT NULL THEN RAISE EXCEPTION '[ÉCHEC]  lot déjà appliqué'; END IF;
  SELECT count(*), string_agg(n2.nspname || '.' || p.proname, ', ') INTO n, l
    FROM pg_proc p JOIN pg_namespace n2 ON n2.oid = p.pronamespace JOIN pg_language lg ON lg.oid = p.prolang
   WHERE lg.lanname IN ('sql', 'plpgsql')
     AND p.prosrc ~ '(usages_categories|unites_puissance|energies_vehicule|constructeurs)';
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  fonction(s) citant les anciens noms : %', l; END IF;
  SELECT count(*), string_agg(v.oid::regclass::text, ', ') INTO n, l
    FROM pg_depend d JOIN pg_rewrite r ON r.oid = d.objid JOIN pg_class v ON v.oid = r.ev_class
   WHERE d.refobjid IN ('site.constructeurs'::regclass, 'site.energies_vehicule'::regclass,
                        'site.unites_puissance'::regclass, 'site.usages_categories'::regclass)
     AND v.oid <> d.refobjid;
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  vue(s) dépendante(s) : %', l; END IF;
  RAISE NOTICE '[OK]     Aucune fonction ni vue ne cite les anciens noms';
END $g$;

CREATE TEMP TABLE _volumes_avant AS
SELECT (SELECT count(*) FROM site.constructeurs) AS constructeur, (SELECT count(*) FROM site.energies_vehicule) AS energie_vehicule,
       (SELECT count(*) FROM site.unites_puissance) AS unite_puissance, (SELECT count(*) FROM site.usages_categories) AS categorie_usage;

\echo '=== 1. Constructeur, énergie, unité de puissance ==='
ALTER TABLE site.constructeurs SET SCHEMA referentiel;
ALTER TABLE referentiel.constructeurs RENAME TO constructeur;
ALTER TABLE referentiel.constructeur RENAME COLUMN id TO id_constructeur;

ALTER TABLE site.energies_vehicule SET SCHEMA referentiel;
ALTER TABLE referentiel.energies_vehicule RENAME TO energie_vehicule;
ALTER TABLE referentiel.energie_vehicule RENAME COLUMN code TO code_energie_vehicule;

ALTER TABLE site.unites_puissance SET SCHEMA referentiel;
ALTER TABLE referentiel.unites_puissance RENAME TO unite_puissance;
DO $u$
DECLARE o record;
BEGIN
  FOR o IN SELECT conname FROM pg_constraint WHERE conrelid = 'referentiel.unite_puissance'::regclass AND contype IN ('p', 'u') LOOP
    EXECUTE format('ALTER TABLE referentiel.unite_puissance DROP CONSTRAINT %I', o.conname);
  END LOOP;
END $u$;
ALTER TABLE referentiel.unite_puissance DROP COLUMN id;
ALTER TABLE referentiel.unite_puissance RENAME COLUMN code TO code_unite_puissance;
ALTER TABLE referentiel.unite_puissance ALTER COLUMN code_unite_puissance SET NOT NULL;
ALTER TABLE referentiel.unite_puissance ADD CONSTRAINT unite_puissance_pkey PRIMARY KEY (code_unite_puissance);

\echo '=== 2. Catégorie d usage : clé sur le code, clés étrangères renommées ==='
CREATE TEMP TABLE _fk_categorie AS
SELECT k.conrelid::regclass AS table_source, a.attname AS colonne, k.conname
  FROM pg_constraint k JOIN pg_attribute a ON a.attrelid = k.conrelid AND a.attnum = k.conkey[1]
 WHERE k.contype = 'f' AND k.confrelid = 'site.usages_categories'::regclass;
SELECT table_source, colonne FROM _fk_categorie ORDER BY 1;
DO $d$
DECLARE o record;
BEGIN
  FOR o IN SELECT * FROM _fk_categorie LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', o.table_source, o.conname);
  END LOOP;
END $d$;

ALTER TABLE site.usages_categories SET SCHEMA referentiel;
ALTER TABLE referentiel.usages_categories RENAME TO categorie_usage;
DO $c$
DECLARE o record;
BEGIN
  FOR o IN SELECT conname FROM pg_constraint WHERE conrelid = 'referentiel.categorie_usage'::regclass AND contype IN ('p', 'u') LOOP
    EXECUTE format('ALTER TABLE referentiel.categorie_usage DROP CONSTRAINT %I', o.conname);
  END LOOP;
END $c$;
ALTER TABLE referentiel.categorie_usage DROP COLUMN id;
ALTER TABLE referentiel.categorie_usage RENAME COLUMN code TO code_categorie_usage;
ALTER TABLE referentiel.categorie_usage ALTER COLUMN code_categorie_usage SET NOT NULL;
ALTER TABLE referentiel.categorie_usage ADD CONSTRAINT categorie_usage_pkey PRIMARY KEY (code_categorie_usage);
COMMENT ON TABLE referentiel.categorie_usage IS
  'Catégories tarifaires d usage (01 à 10C) : maître des catégories, synchronisé vers tarification par déclencheurs.';

ALTER TABLE referentiel.terme_vehicule                  RENAME COLUMN code_categorie_imposee  TO code_categorie_usage_imposee;
ALTER TABLE referentiel.terme_vehicule_genre            RENAME COLUMN code_categorie_defaut   TO code_categorie_usage_defaut;
ALTER TABLE referentiel.combinaison_categorie           RENAME COLUMN code_categorie          TO code_categorie_usage;
ALTER TABLE referentiel.usage_genre                     RENAME COLUMN code_categorie          TO code_categorie_usage;
ALTER TABLE referentiel.correspondance_libelle_vehicule RENAME COLUMN code_categorie_suggeree TO code_categorie_usage_suggeree;
ALTER TABLE catalogue.vehicule_catalogue                RENAME COLUMN code_categorie_suggeree TO code_categorie_usage_suggeree;
ALTER VIEW  catalogue.profil_vehicule                   RENAME COLUMN code_categorie_suggeree TO code_categorie_usage_suggeree;

DO $f$
DECLARE o record; col text;
BEGIN
  FOR o IN SELECT * FROM _fk_categorie LOOP
    col := CASE o.colonne
             WHEN 'code_categorie_imposee'  THEN 'code_categorie_usage_imposee'
             WHEN 'code_categorie_defaut'   THEN 'code_categorie_usage_defaut'
             WHEN 'code_categorie'          THEN 'code_categorie_usage'
             WHEN 'code_categorie_suggeree' THEN 'code_categorie_usage_suggeree'
             ELSE NULL END;
    IF col IS NULL THEN RAISE EXCEPTION '[ÉCHEC]  clé étrangère imprévue : %.%', o.table_source, o.colonne; END IF;
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES referentiel.categorie_usage (code_categorie_usage)',
                   o.table_source, split_part(o.table_source::text, '.', 2) || '_' || col || '_fkey', col);
    RAISE NOTICE 'clé étrangère  %.% -> categorie_usage', o.table_source, col;
  END LOOP;
END $f$;

\echo '=== 3. Déclencheurs de synchronisation vers la tarification ==='
DO $t$
DECLARE def text; f regprocedure;
BEGIN
  FOREACH f IN ARRAY ARRAY['tarification.fn_sync_categorie_depuis_site()'::regprocedure,
                           'tarification.fn_sync_categorie_supprimee_depuis_site()'::regprocedure] LOOP
    def := regexp_replace(pg_get_functiondef(f), '\m(NEW|OLD)\.code\M', '\1.code_categorie_usage', 'g');
    EXECUTE def;
  END LOOP;
END $t$;

\echo '=== 4. Contraintes, index et séquences ==='
DO $r$
DECLARE
  cartes jsonb := '[{"table": "constructeur", "ancien": "constructeurs"},
                    {"table": "energie_vehicule", "ancien": "energies_vehicule"},
                    {"table": "unite_puissance", "ancien": "unites_puissance"},
                    {"table": "categorie_usage", "ancien": "usages_categories"},
                    {"table": "usage_genre", "ancien": "usage_genre"}]';
  c jsonb; o record; nouveau text; t regclass;
BEGIN
  FOR c IN SELECT * FROM jsonb_array_elements(cartes) LOOP
    t := ('referentiel.' || (c->>'table'))::regclass;
    FOR o IN SELECT k.conname, k.contype,
                    (SELECT string_agg(a.attname, '_' ORDER BY array_position(k.conkey, a.attnum))
                       FROM pg_attribute a WHERE a.attrelid = k.conrelid AND a.attnum = ANY (k.conkey)) AS cols
               FROM pg_constraint k WHERE k.conrelid = t LOOP
      nouveau := CASE o.contype
                   WHEN 'p' THEN (c->>'table') || '_pkey'
                   WHEN 'f' THEN (c->>'table') || '_' || o.cols || '_fkey'
                   WHEN 'u' THEN (c->>'table') || '_' || o.cols || '_key'
                   ELSE regexp_replace(o.conname, '^' || (c->>'ancien'), c->>'table') END;
      IF nouveau <> o.conname THEN
        EXECUTE format('ALTER TABLE %s RENAME CONSTRAINT %I TO %I', t, o.conname, nouveau);
        RAISE NOTICE 'contrainte  % -> %', o.conname, nouveau;
      END IF;
    END LOOP;
    FOR o IN SELECT i.relname,
                    (SELECT string_agg(a.attname, '_' ORDER BY array_position(x.indkey::int2[], a.attnum))
                       FROM pg_attribute a WHERE a.attrelid = x.indrelid AND a.attnum = ANY (x.indkey::int2[])) AS cols
               FROM pg_index x JOIN pg_class i ON i.oid = x.indexrelid
              WHERE x.indrelid = t AND NOT EXISTS (SELECT 1 FROM pg_constraint k2 WHERE k2.conindid = x.indexrelid) LOOP
      nouveau := (c->>'table') || '_' || coalesce(o.cols, 'expr') || '_idx';
      IF nouveau <> o.relname THEN
        EXECUTE format('ALTER INDEX referentiel.%I RENAME TO %I', o.relname, nouveau);
        RAISE NOTICE 'index       % -> %', o.relname, nouveau;
      END IF;
    END LOOP;
    FOR o IN SELECT s.relname, a.attname FROM pg_class s
               JOIN pg_depend d ON d.objid = s.oid AND d.deptype IN ('a', 'i')
               JOIN pg_attribute a ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
              WHERE s.relkind = 'S' AND d.refobjid = t LOOP
      nouveau := (c->>'table') || '_' || o.attname || '_seq';
      IF nouveau <> o.relname THEN
        EXECUTE format('ALTER SEQUENCE referentiel.%I RENAME TO %I', o.relname, nouveau);
        RAISE NOTICE 'séquence    % -> %', o.relname, nouveau;
      END IF;
    END LOOP;
  END LOOP;
END $r$;

\echo '=== 5. Contrôles ==='
DO $k$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM pg_constraint WHERE contype = 'f' AND confrelid = 'referentiel.categorie_usage'::regclass;
  IF n <> 6 THEN RAISE EXCEPTION '[ÉCHEC]  % clé(s) étrangère(s) vers categorie_usage au lieu de 6', n; END IF;
  SELECT count(*) INTO n FROM pg_proc WHERE proname IN ('fn_sync_categorie_depuis_site', 'fn_sync_categorie_supprimee_depuis_site')
     AND prosrc ~ '\m(NEW|OLD)\.code\M';
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  déclencheur encore sur l ancienne colonne'; END IF;
  -- le déclencheur de synchronisation doit fonctionner sur la nouvelle colonne
  UPDATE referentiel.categorie_usage SET designation = designation WHERE code_categorie_usage = '01';
  SELECT count(*) INTO n FROM pg_class
   WHERE relnamespace IN ('site'::regnamespace, 'referentiel'::regnamespace)
     AND relname ~ '(usages_categories|unites_puissance|energies_vehicule|constructeurs)';
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  % objet(s) portent encore un ancien nom', n; END IF;
  IF NOT has_table_privilege('mutuellepro', 'referentiel.categorie_usage', 'SELECT')
     OR NOT has_table_privilege('mutuellepro', 'referentiel.energie_vehicule', 'SELECT')
     OR NOT has_table_privilege('mutuellepro', 'referentiel.constructeur', 'SELECT')
     OR NOT has_table_privilege('mutuellepro', 'referentiel.unite_puissance', 'SELECT') THEN
    RAISE EXCEPTION '[ÉCHEC]  droits de lecture de mutuellepro perdus';
  END IF;
  PERFORM 1 FROM site.genres_usages LIMIT 1;
  PERFORM 1 FROM site.carrosserie_usage_combinaisons LIMIT 1;
  PERFORM code_categorie_usage_suggeree FROM catalogue.profil_vehicule LIMIT 1;
  RAISE NOTICE '[OK]     6 clés étrangères, déclencheurs à jour et fonctionnels, droits et vues intacts';
END $k$;

SELECT 'avant' AS etat, * FROM _volumes_avant
UNION ALL
SELECT 'après', (SELECT count(*) FROM referentiel.constructeur), (SELECT count(*) FROM referentiel.energie_vehicule),
       (SELECT count(*) FROM referentiel.unite_puissance), (SELECT count(*) FROM referentiel.categorie_usage);

\echo '=== Fin ==='
\if :commit
  COMMIT;
  \echo '>>> VALIDÉ : nomenclatures dans referentiel. Appliquer AUSSITÔT le correctif du code.'
\else
  ROLLBACK;
  \echo '>>> ESSAI À BLANC : tout a été annulé. Relancer avec -v commit=true pour appliquer.'
\endif
