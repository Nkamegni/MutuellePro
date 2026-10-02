-- =====================================================================
-- Renommage des contraintes et index portant encore un ancien nom de
-- colonne (suite du renommage FK du 02/10/2026, schéma tarification)
--
-- Usage :
--   essai à blanc :  sudo -u postgres psql -d vpiclist -v ON_ERROR_STOP=1 -v commit=false -f renommage_contraintes_fk.sql
--   application   :  sudo -u postgres psql -d vpiclist -v ON_ERROR_STOP=1 -v commit=true  -f renommage_contraintes_fk.sql
--
-- Règles :
--   - FK mono-colonne dont le nom contient un ancien nom de colonne
--       -> nom par défaut PostgreSQL : <table>_<colonne>_fkey
--   - autres contraintes et index autonomes dont le nom contient un ancien
--     nom de colonne -> remplacement de l'ancien nom par le nouveau
-- Abandon complet si : collision, nom > 63 caractères, ou fonction qui
-- cite un ancien nom de contrainte/index.
-- =====================================================================
\set QUIET on
\pset footer off
BEGIN;

CREATE TEMP TABLE _tok(old text, new text);
INSERT INTO _tok VALUES
  ('acte_abroge_id','id_acte_abroge'), ('tarif_id','id_tarif'),
  ('branche_id','id_branche'), ('partenaire_id','id_partenaire'),
  ('cible_id','id_cible'), ('police_cotation_id','id_police_cotation'),
  ('compagnie_id','id_compagnie'), ('equivalence_garantie_id','id_equivalence_garantie'),
  ('formule_id','id_formule'), ('acte_reglementaire_id','id_acte_reglementaire'),
  ('flotte_id','id_flotte'), ('base_calcul_element_id','id_base_calcul_element'),
  ('derogation_id','id_derogation'), ('regle_reduction_franchise_id','id_regle_reduction_franchise'),
  ('regle_calcul_id','id_regle_calcul');

CREATE FUNCTION pg_temp.remplacer_jetons(n text) RETURNS text LANGUAGE plpgsql AS $f$
DECLARE r record;
BEGIN
  FOR r IN SELECT old, new FROM _tok ORDER BY length(old) DESC LOOP
    n := replace(n, r.old, r.new);
  END LOOP;
  RETURN n;
END $f$;

CREATE FUNCTION pg_temp.a_jeton(n text) RETURNS boolean LANGUAGE sql AS
$f$ SELECT EXISTS (SELECT 1 FROM _tok WHERE position(old IN n) > 0) $f$;

CREATE TEMP TABLE _plan(nature text, tbl text, ancien text, nouveau text);

-- 1. FK mono-colonne -> nom par défaut PostgreSQL
INSERT INTO _plan
SELECT 'FK', cl.relname, con.conname, cl.relname || '_' || a.attname || '_fkey'
  FROM pg_constraint con
  JOIN pg_class cl     ON cl.oid = con.conrelid
  JOIN pg_attribute a  ON a.attrelid = con.conrelid AND a.attnum = con.conkey[1]
 WHERE con.connamespace = 'tarification'::regnamespace
   AND con.contype = 'f' AND cardinality(con.conkey) = 1
   AND pg_temp.a_jeton(con.conname);

-- 2. Autres contraintes (PK, UNIQUE, CHECK, EXCLUDE, FK multi-colonnes)
INSERT INTO _plan
SELECT CASE con.contype WHEN 'p' THEN 'PK' WHEN 'u' THEN 'UNIQUE' WHEN 'c' THEN 'CHECK'
                        WHEN 'x' THEN 'EXCLUDE' WHEN 'f' THEN 'FK multi' ELSE con.contype::text END,
       cl.relname, con.conname, pg_temp.remplacer_jetons(con.conname)
  FROM pg_constraint con
  JOIN pg_class cl ON cl.oid = con.conrelid
 WHERE con.connamespace = 'tarification'::regnamespace
   AND pg_temp.a_jeton(con.conname)
   AND con.conname NOT IN (SELECT ancien FROM _plan);

-- 3. Index autonomes (ceux qui portent une PK/UNIQUE/EXCLUDE suivent leur contrainte)
INSERT INTO _plan
SELECT 'INDEX', t.relname, i.relname, pg_temp.remplacer_jetons(i.relname)
  FROM pg_index x
  JOIN pg_class i ON i.oid = x.indexrelid
  JOIN pg_class t ON t.oid = x.indrelid
 WHERE i.relnamespace = 'tarification'::regnamespace
   AND pg_temp.a_jeton(i.relname)
   AND NOT EXISTS (SELECT 1 FROM pg_constraint c
                    WHERE c.conindid = x.indexrelid AND c.contype IN ('p','u','x'));

\echo '--- 1. Plan de renommage ---'
SELECT nature, tbl AS "table", ancien, nouveau, length(nouveau) AS lg
  FROM _plan ORDER BY tbl, nature, ancien;

\echo '--- 2. Garde-fous ---'
DO $g$
DECLARE n int; l text;
BEGIN
  -- noms trop longs
  SELECT count(*), string_agg(nouveau, ', ') INTO n, l FROM _plan WHERE length(nouveau) > 63;
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  % nom(s) > 63 caractères : %', n, l; END IF;

  -- doublons dans le plan
  SELECT count(*), string_agg(nouveau, ', ') INTO n, l
    FROM (SELECT nouveau FROM _plan GROUP BY nouveau HAVING count(*) > 1) d;
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  doublon(s) dans le plan : %', l; END IF;

  -- collision avec un index/relation existant(e) du schéma
  SELECT count(*), string_agg(p.nouveau, ', ') INTO n, l
    FROM _plan p
    JOIN pg_class c ON c.relname = p.nouveau AND c.relnamespace = 'tarification'::regnamespace
   WHERE p.nouveau <> p.ancien;
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  collision avec un objet existant : %', l; END IF;

  -- collision avec une contrainte existante de la même table
  SELECT count(*), string_agg(p.nouveau, ', ') INTO n, l
    FROM _plan p
    JOIN pg_constraint con ON con.conname = p.nouveau
                          AND con.conrelid = ('tarification.' || quote_ident(p.tbl))::regclass
   WHERE p.nouveau <> p.ancien;
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  collision avec une contrainte existante : %', l; END IF;

  -- fonctions (tous schémas) qui citent un ancien nom
  SELECT count(*), string_agg(DISTINCT n2.nspname || '.' || pr.proname || ' -> ' || p.ancien, '; ') INTO n, l
    FROM _plan p
    JOIN pg_proc pr       ON position(p.ancien IN pr.prosrc) > 0
    JOIN pg_namespace n2  ON n2.oid = pr.pronamespace
   WHERE n2.nspname NOT IN ('pg_catalog','information_schema');
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  fonction(s) citant un ancien nom : %', l; END IF;

  RAISE NOTICE '[OK]     Aucune collision, aucun nom trop long, aucune fonction concernée';
END $g$;

\echo '--- 3. Renommage ---'
DO $r$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN SELECT * FROM _plan WHERE nouveau <> ancien ORDER BY tbl, ancien LOOP
    IF r.nature = 'INDEX' THEN
      EXECUTE format('ALTER INDEX tarification.%I RENAME TO %I', r.ancien, r.nouveau);
    ELSE
      EXECUTE format('ALTER TABLE tarification.%I RENAME CONSTRAINT %I TO %I', r.tbl, r.ancien, r.nouveau);
    END IF;
    n := n + 1;
  END LOOP;
  RAISE NOTICE '[OK]     % objet(s) renommé(s)', n;
END $r$;

\echo '--- 4. Contrôle final ---'
DO $c$
DECLARE n int; l text;
BEGIN
  -- Vérification exacte (et non par fragment de texte : un nom par défaut
  -- comme tarif_id_regle_calcul_fkey contient légitimement « tarif_id »)
  -- a) plus aucun ancien nom du plan n'existe
  SELECT count(*), string_agg(p.ancien, ', ') INTO n, l
    FROM _plan p
   WHERE p.nouveau <> p.ancien
     AND (EXISTS (SELECT 1 FROM pg_constraint c
                   WHERE c.connamespace = 'tarification'::regnamespace AND c.conname = p.ancien)
       OR EXISTS (SELECT 1 FROM pg_class c
                   WHERE c.relnamespace = 'tarification'::regnamespace AND c.relname = p.ancien));
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  % ancien(s) nom(s) encore présent(s) : %', n, l; END IF;

  -- b) chaque nouveau nom existe
  SELECT count(*), string_agg(p.nouveau, ', ') INTO n, l
    FROM _plan p
   WHERE NOT EXISTS (SELECT 1 FROM pg_constraint c
                      WHERE c.connamespace = 'tarification'::regnamespace AND c.conname = p.nouveau)
     AND NOT EXISTS (SELECT 1 FROM pg_class c
                      WHERE c.relnamespace = 'tarification'::regnamespace AND c.relname = p.nouveau);
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  % nouveau(x) nom(s) introuvable(s) : %', n, l; END IF;

  -- c) aucune FK mono-colonne visée ne s'écarte encore du nom par défaut
  SELECT count(*), string_agg(con.conname, ', ') INTO n, l
    FROM pg_constraint con
    JOIN pg_class cl    ON cl.oid = con.conrelid
    JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = con.conkey[1]
   WHERE con.connamespace = 'tarification'::regnamespace
     AND con.contype = 'f' AND cardinality(con.conkey) = 1
     AND con.conname IN (SELECT nouveau FROM _plan)
     AND con.conname <> cl.relname || '_' || a.attname || '_fkey';
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  FK hors convention : %', l; END IF;

  RAISE NOTICE '[OK]     Plan entièrement appliqué : anciens noms disparus, nouveaux noms présents';
END $c$;

\echo '--- 5. Fin ---'
\if :commit
  COMMIT;
  \echo '>>> VALIDÉ : renommage des contraintes et index appliqué.'
\else
  ROLLBACK;
  \echo '>>> ESSAI À BLANC : tout a été annulé. Relancer avec -v commit=true pour appliquer.'
\endif
