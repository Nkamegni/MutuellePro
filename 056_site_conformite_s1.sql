-- =====================================================================
-- Phase site — Lot S1 (07/10/2026) : conformité de quatre tables
--   bareme_dta                 : id -> id_bareme_dta
--   parametres_site            -> parametre_site            ; id -> id_parametre_site
--   historique_parametres_site -> historique_parametre_site ; id -> id_historique_parametre_site ;
--                                 utilisateur_id -> id_staff (clé étrangère vers site.staff)
--   no_reply_messages_envoyes  -> no_reply_message_envoye   ; id -> id_no_reply_message_envoye ;
--                                 message_id -> message_id_rfc (identifiant RFC du courriel, pas une clé)
-- Contraintes, index et séquences renommés selon les conventions <table>_pkey, <table>_<colonne>_fkey,
-- <table>_<colonne>_seq. Aucune vue de compatibilité : aucun consommateur externe (vérifié).
--
--   essai à blanc : sudo -u postgres psql -d vpiclist -P pager=off -v ON_ERROR_STOP=1 -v commit=false -f /tmp/lot_s1_site_conformite.sql
--   application   : sudo -u postgres psql -d vpiclist -P pager=off -v ON_ERROR_STOP=1 -v commit=true  -f /tmp/lot_s1_site_conformite.sql
-- =====================================================================
\set QUIET on
\set VERBOSITY terse
\pset footer off
BEGIN;

\echo '=== 0. Garde-fous ==='
DO $g$
DECLARE n int; l text;
BEGIN
  IF to_regclass('site.parametre_site') IS NOT NULL OR to_regclass('site.no_reply_message_envoye') IS NOT NULL THEN
    RAISE EXCEPTION '[ÉCHEC]  lot déjà appliqué';
  END IF;
  SELECT count(*), string_agg(n2.nspname || '.' || p.proname, ', ') INTO n, l
    FROM pg_proc p JOIN pg_namespace n2 ON n2.oid = p.pronamespace JOIN pg_language lg ON lg.oid = p.prolang
   WHERE lg.lanname IN ('sql', 'plpgsql')
     AND p.prosrc ~ '(parametres_site|no_reply_messages_envoyes)';
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  fonction(s) utilisant les anciens noms : %', l; END IF;
  SELECT count(*), string_agg(v.oid::regclass::text, ', ') INTO n, l
    FROM pg_depend d JOIN pg_rewrite r ON r.oid = d.objid JOIN pg_class v ON v.oid = r.ev_class
   WHERE d.refobjid IN ('site.bareme_dta'::regclass, 'site.parametres_site'::regclass,
                        'site.historique_parametres_site'::regclass, 'site.no_reply_messages_envoyes'::regclass)
     AND v.oid <> d.refobjid;
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  vue(s) dépendante(s) : %', l; END IF;
  RAISE NOTICE '[OK]     Aucune fonction ni vue ne dépend des anciens noms';
END $g$;

CREATE TEMP TABLE _volumes_avant AS
SELECT (SELECT count(*) FROM site.bareme_dta) AS bareme_dta,
       (SELECT count(*) FROM site.parametres_site) AS parametre_site,
       (SELECT count(*) FROM site.historique_parametres_site) AS historique_parametre_site,
       (SELECT count(*) FROM site.no_reply_messages_envoyes) AS no_reply_message_envoye;

\echo '=== 1. Tables et colonnes ==='
ALTER TABLE site.bareme_dta RENAME COLUMN id TO id_bareme_dta;

ALTER TABLE site.parametres_site RENAME TO parametre_site;
ALTER TABLE site.parametre_site RENAME COLUMN id TO id_parametre_site;

ALTER TABLE site.historique_parametres_site RENAME TO historique_parametre_site;
ALTER TABLE site.historique_parametre_site RENAME COLUMN id TO id_historique_parametre_site;
ALTER TABLE site.historique_parametre_site RENAME COLUMN utilisateur_id TO id_staff;

ALTER TABLE site.no_reply_messages_envoyes RENAME TO no_reply_message_envoye;
ALTER TABLE site.no_reply_message_envoye RENAME COLUMN id TO id_no_reply_message_envoye;
ALTER TABLE site.no_reply_message_envoye RENAME COLUMN message_id TO message_id_rfc;

\echo '=== 2. Contraintes, index et séquences ==='
DO $r$
DECLARE
  -- table renommée, ancien préfixe des noms
  cartes jsonb := '[{"table": "bareme_dta", "ancien": "bareme_dta"},
                    {"table": "parametre_site", "ancien": "parametres_site"},
                    {"table": "historique_parametre_site", "ancien": "historique_parametres_site"},
                    {"table": "no_reply_message_envoye", "ancien": "no_reply_messages_envoyes"}]';
  c jsonb; o record; nouveau text; t regclass;
BEGIN
  FOR c IN SELECT * FROM jsonb_array_elements(cartes) LOOP
    t := ('site.' || (c->>'table'))::regclass;
    -- contraintes : nom recalculé d'après les colonnes (clé primaire, étrangère, unique)
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
    -- index sans contrainte : <table>_<colonnes>_idx
    FOR o IN SELECT i.relname,
                    (SELECT string_agg(a.attname, '_' ORDER BY array_position(x.indkey::int2[], a.attnum))
                       FROM pg_attribute a WHERE a.attrelid = x.indrelid AND a.attnum = ANY (x.indkey::int2[])) AS cols
               FROM pg_index x JOIN pg_class i ON i.oid = x.indexrelid
              WHERE x.indrelid = t AND NOT EXISTS (SELECT 1 FROM pg_constraint k2 WHERE k2.conindid = x.indexrelid) LOOP
      nouveau := (c->>'table') || '_' || coalesce(o.cols, 'expr') || '_idx';
      IF nouveau <> o.relname THEN
        EXECUTE format('ALTER INDEX site.%I RENAME TO %I', o.relname, nouveau);
        RAISE NOTICE 'index       % -> %', o.relname, nouveau;
      END IF;
    END LOOP;
    -- séquences possédées : <table>_<colonne>_seq
    FOR o IN SELECT s.relname, a.attname FROM pg_class s
               JOIN pg_depend d ON d.objid = s.oid AND d.deptype IN ('a', 'i')
               JOIN pg_attribute a ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
              WHERE s.relkind = 'S' AND d.refobjid = t LOOP
      nouveau := (c->>'table') || '_' || o.attname || '_seq';
      IF nouveau <> o.relname THEN
        EXECUTE format('ALTER SEQUENCE site.%I RENAME TO %I', o.relname, nouveau);
        RAISE NOTICE 'séquence    % -> %', o.relname, nouveau;
      END IF;
    END LOOP;
  END LOOP;
END $r$;

\echo '=== 3. Contrôles ==='
DO $k$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
   WHERE c.oid IN ('site.bareme_dta'::regclass, 'site.parametre_site'::regclass,
                   'site.historique_parametre_site'::regclass, 'site.no_reply_message_envoye'::regclass)
     AND a.attnum > 0 AND NOT a.attisdropped AND (a.attname = 'id' OR a.attname ~ '_id$');
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  % colonne(s) encore non conformes', n; END IF;
  SELECT count(*) INTO n FROM pg_class
   WHERE relnamespace = 'site'::regnamespace AND relname ~ '(parametres_site|no_reply_messages_envoyes|bareme_dta_id_seq)';
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  % objet(s) portent encore un ancien nom', n; END IF;
  IF NOT has_table_privilege('mutuellepro', 'site.no_reply_message_envoye', 'INSERT')
     OR NOT has_table_privilege('mutuellepro', 'site.parametre_site', 'UPDATE')
     OR NOT has_table_privilege('mutuellepro', 'site.historique_parametre_site', 'INSERT')
     OR NOT has_sequence_privilege('mutuellepro', 'site.no_reply_message_envoye_id_no_reply_message_envoye_seq', 'USAGE') THEN
    RAISE EXCEPTION '[ÉCHEC]  droits de mutuellepro perdus';
  END IF;
  RAISE NOTICE '[OK]     Colonnes conformes, plus aucun ancien nom, droits conservés';
END $k$;

SELECT 'avant' AS etat, * FROM _volumes_avant
UNION ALL
SELECT 'après', (SELECT count(*) FROM site.bareme_dta), (SELECT count(*) FROM site.parametre_site),
       (SELECT count(*) FROM site.historique_parametre_site), (SELECT count(*) FROM site.no_reply_message_envoye);

\echo '=== Fin ==='
\if :commit
  COMMIT;
  \echo '>>> VALIDÉ : lot S1 appliqué. Appliquer AUSSITÔT le correctif Node (patch_s1_node.py).'
\else
  ROLLBACK;
  \echo '>>> ESSAI À BLANC : tout a été annulé. Relancer avec -v commit=true pour appliquer.'
\endif
