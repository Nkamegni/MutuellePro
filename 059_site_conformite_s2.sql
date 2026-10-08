-- =====================================================================
-- Phase site — Lot S2 (08/10/2026) : singulier et clés de 14 tables (voie B : jusqu'aux écrans)
--   categorie_partenaire        : id_categorie -> id_categorie_partenaire (et dans type_partenaire)
--   partenaire_types            -> partenaire_type
--   partenaire_contacts         -> partenaire_contact        ; id_contact     -> id_partenaire_contact
--   journal_audit               : id_journal     -> id_journal_audit
--   historique_connexions       -> historique_connexion      ; id_historique  -> id_historique_connexion
--   interactions_prospect       -> interaction_prospect      ; id_interaction -> id_interaction_prospect
--   messages_dossier            -> message_dossier           ; id_message     -> id_message_dossier
--   emails_cache                -> email_cache
--   preferences_dashboard       -> preference_dashboard
--   seuils_alerte_staff         -> seuil_alerte_staff
--   snapshot_kpis_quotidien     -> snapshot_kpi_quotidien    ; id_snapshot    -> id_snapshot_kpi_quotidien
--   taches_relances             -> tache_relance             ; id_relance     -> id_tache_relance
--   parametres_workflow         -> parametre_workflow        ; id_parametre   -> id_parametre_workflow
-- Reportés au lot S3 (avec mouvements / staff / agence) : dta_motifs_exemption, production_natures_mouvement,
-- production_frais_fixes, bareme_fractionnement, role_staff, cube_kpi.
--
--   essai à blanc : sudo -u postgres psql -d vpiclist -P pager=off -v ON_ERROR_STOP=1 -v commit=false -f /tmp/lot_s2_site.sql
--   application   : sudo -u postgres psql -d vpiclist -P pager=off -v ON_ERROR_STOP=1 -v commit=true  -f /tmp/lot_s2_site.sql
-- =====================================================================
\set QUIET on
\set VERBOSITY terse
\pset footer off
BEGIN;

\echo '=== 0. Garde-fous ==='
DO $g$
DECLARE n int; l text;
BEGIN
  IF to_regclass('site.message_dossier') IS NOT NULL THEN RAISE EXCEPTION '[ÉCHEC]  lot déjà appliqué'; END IF;
  SELECT count(*), string_agg(n2.nspname || '.' || p.proname, ', ') INTO n, l
    FROM pg_proc p JOIN pg_namespace n2 ON n2.oid = p.pronamespace JOIN pg_language lg ON lg.oid = p.prolang
   WHERE lg.lanname IN ('sql', 'plpgsql')
     AND p.prosrc ~ '(partenaire_types|partenaire_contacts|historique_connexions|interactions_prospect|messages_dossier|emails_cache|preferences_dashboard|seuils_alerte_staff|snapshot_kpis_quotidien|taches_relances|parametres_workflow|id_categorie\M.*categorie_partenaire|id_message\M|id_historique\M|id_interaction\M|id_contact\M|id_snapshot\M|id_relance\M)';
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  fonction(s) utilisant les anciens noms : %', l; END IF;
  SELECT count(*), string_agg(DISTINCT v.oid::regclass::text, ', ') INTO n, l
    FROM pg_depend d JOIN pg_rewrite r ON r.oid = d.objid JOIN pg_class v ON v.oid = r.ev_class
   WHERE d.refobjid IN (SELECT oid FROM pg_class WHERE relnamespace = 'site'::regnamespace AND relname IN
          ('categorie_partenaire', 'type_partenaire', 'partenaire_types', 'partenaire_contacts', 'journal_audit',
           'historique_connexions', 'interactions_prospect', 'messages_dossier', 'emails_cache', 'preferences_dashboard',
           'seuils_alerte_staff', 'snapshot_kpis_quotidien', 'taches_relances', 'parametres_workflow'))
     AND v.oid <> d.refobjid;
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  vue(s) dépendante(s) : %', l; END IF;
  RAISE NOTICE '[OK]     Aucune fonction ni vue ne dépend des anciens noms';
END $g$;

CREATE TEMP TABLE _avant AS
SELECT 'messages_dossier' AS t, count(*) AS n FROM site.messages_dossier
UNION ALL SELECT 'historique_connexions', count(*) FROM site.historique_connexions
UNION ALL SELECT 'interactions_prospect', count(*) FROM site.interactions_prospect
UNION ALL SELECT 'partenaire_contacts', count(*) FROM site.partenaire_contacts
UNION ALL SELECT 'journal_audit', count(*) FROM site.journal_audit
UNION ALL SELECT 'snapshot_kpis_quotidien', count(*) FROM site.snapshot_kpis_quotidien;

\echo '=== 1. Tables et colonnes ==='
ALTER TABLE site.categorie_partenaire RENAME COLUMN id_categorie TO id_categorie_partenaire;
ALTER TABLE site.type_partenaire RENAME COLUMN id_categorie TO id_categorie_partenaire;
ALTER TABLE site.partenaire_types RENAME TO partenaire_type;
ALTER TABLE site.partenaire_contacts RENAME TO partenaire_contact;
ALTER TABLE site.partenaire_contact RENAME COLUMN id_contact TO id_partenaire_contact;
ALTER TABLE site.journal_audit RENAME COLUMN id_journal TO id_journal_audit;
ALTER TABLE site.historique_connexions RENAME TO historique_connexion;
ALTER TABLE site.historique_connexion RENAME COLUMN id_historique TO id_historique_connexion;
ALTER TABLE site.interactions_prospect RENAME TO interaction_prospect;
ALTER TABLE site.interaction_prospect RENAME COLUMN id_interaction TO id_interaction_prospect;
ALTER TABLE site.messages_dossier RENAME TO message_dossier;
ALTER TABLE site.message_dossier RENAME COLUMN id_message TO id_message_dossier;
ALTER TABLE site.emails_cache RENAME TO email_cache;
ALTER TABLE site.preferences_dashboard RENAME TO preference_dashboard;
ALTER TABLE site.seuils_alerte_staff RENAME TO seuil_alerte_staff;
ALTER TABLE site.snapshot_kpis_quotidien RENAME TO snapshot_kpi_quotidien;
ALTER TABLE site.snapshot_kpi_quotidien RENAME COLUMN id_snapshot TO id_snapshot_kpi_quotidien;
ALTER TABLE site.taches_relances RENAME TO tache_relance;
ALTER TABLE site.tache_relance RENAME COLUMN id_relance TO id_tache_relance;
ALTER TABLE site.parametres_workflow RENAME TO parametre_workflow;
ALTER TABLE site.parametre_workflow RENAME COLUMN id_parametre TO id_parametre_workflow;

\echo '=== 2. Contraintes, index et séquences ==='
DO $r$
DECLARE
  -- table renommée, ancien préfixe des noms
  cartes jsonb := '[{"table": "categorie_partenaire", "ancien": "categorie_partenaire"},
                    {"table": "type_partenaire", "ancien": "type_partenaire"},
                    {"table": "partenaire_type", "ancien": "partenaire_types"},
                    {"table": "partenaire_contact", "ancien": "partenaire_contacts"},
                    {"table": "journal_audit", "ancien": "journal_audit"},
                    {"table": "historique_connexion", "ancien": "historique_connexions"},
                    {"table": "interaction_prospect", "ancien": "interactions_prospect"},
                    {"table": "message_dossier", "ancien": "messages_dossier"},
                    {"table": "email_cache", "ancien": "emails_cache"},
                    {"table": "preference_dashboard", "ancien": "preferences_dashboard"},
                    {"table": "seuil_alerte_staff", "ancien": "seuils_alerte_staff"},
                    {"table": "snapshot_kpi_quotidien", "ancien": "snapshot_kpis_quotidien"},
                    {"table": "tache_relance", "ancien": "taches_relances"},
                    {"table": "parametre_workflow", "ancien": "parametres_workflow"}]';
  c jsonb; o record; nouveau text; t regclass; base text; k int;
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
      base := (c->>'table') || '_' || coalesce(o.cols, 'expr') || '_idx';
      nouveau := base; k := 1;
      WHILE nouveau <> o.relname AND to_regclass('site.' || quote_ident(nouveau)) IS NOT NULL LOOP
        k := k + 1; nouveau := base || '_' || k;
      END LOOP;
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
  SELECT count(*) INTO n FROM pg_class
   WHERE relnamespace = 'site'::regnamespace
     AND relname ~ '(partenaire_types|partenaire_contacts|historique_connexions|interactions_prospect|messages_dossier|emails_cache|preferences_dashboard|seuils_alerte_staff|snapshot_kpis_quotidien|taches_relances|parametres_workflow)';
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  % objet(s) portent encore un ancien nom', n; END IF;
  IF NOT has_table_privilege('mutuellepro', 'site.message_dossier', 'INSERT')
     OR NOT has_table_privilege('mutuellepro', 'site.historique_connexion', 'INSERT')
     OR NOT has_table_privilege('mutuellepro', 'site.interaction_prospect', 'INSERT')
     OR NOT has_table_privilege('mutuellepro', 'site.preference_dashboard', 'UPDATE') THEN
    RAISE EXCEPTION '[ÉCHEC]  droits de mutuellepro perdus';
  END IF;
  RAISE NOTICE '[OK]     Plus aucun ancien nom, droits conservés';
END $k$;
SELECT a.t AS table_avant, a.n AS lignes_avant,
       CASE a.t WHEN 'messages_dossier' THEN (SELECT count(*) FROM site.message_dossier)
                WHEN 'historique_connexions' THEN (SELECT count(*) FROM site.historique_connexion)
                WHEN 'interactions_prospect' THEN (SELECT count(*) FROM site.interaction_prospect)
                WHEN 'partenaire_contacts' THEN (SELECT count(*) FROM site.partenaire_contact)
                WHEN 'journal_audit' THEN (SELECT count(*) FROM site.journal_audit)
                WHEN 'snapshot_kpis_quotidien' THEN (SELECT count(*) FROM site.snapshot_kpi_quotidien) END AS lignes_apres
  FROM _avant a;

\echo '=== Fin ==='
\if :commit
  COMMIT;
  \echo '>>> VALIDÉ : lot S2 appliqué. Appliquer AUSSITÔT le correctif du code (patch_s2.sh).'
\else
  ROLLBACK;
  \echo '>>> ESSAI À BLANC : tout a été annulé. Relancer avec -v commit=true pour appliquer.'
\endif

-- Complément appliqué à la main après la migration (08/10/2026) :
-- nom définitif de l'index unique partiel (contact par défaut d'un partenaire).
ALTER INDEX IF EXISTS site.partenaire_contact_id_partenaire_idx_2
  RENAME TO partenaire_contact_id_partenaire_est_defaut_key;
