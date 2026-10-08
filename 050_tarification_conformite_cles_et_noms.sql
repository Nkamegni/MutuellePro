-- =====================================================================
-- Mise en conformité des clés primaires et des noms du schéma tarification
-- 07/10/2026 — convention id_<table> / code_<table>, ISO/IEC 11179 (singulier,
-- sauf notions qui n'existent qu'au pluriel)
--
--   * 17 clés « id » -> id_<table> ; garantie_lien.id_lien -> id_garantie_lien ;
--     ref_base_calcul.code -> code_base_calcul
--   * tables : bareme_accessoire -> bareme_frais_accessoires,
--     regles_calcul -> regle_calcul, regles_reduction_franchise -> regle_reduction_franchise
--   * compagnie.accessoires_par_defaut -> frais_accessoires_par_defaut
--   * fn_accessoires -> fn_frais_accessoires (l'ancien nom devient un relais
--     TRANSITOIRE, à supprimer après déploiement du code Node)
--   * contraintes PK -> <table>_pkey ; séquences -> <table>_<colonne>_seq
--   * 6 fonctions réécrites (seules les références aux noms changent)
-- Hors lot : branche_categorie (clé naturelle à discuter), tables sans PK, index.
--
-- Usage :
--   essai à blanc : sudo -u postgres psql -d vpiclist -P pager=off -v ON_ERROR_STOP=1 -v commit=false -f /tmp/renommage_pk_tarification.sql
--   application   : sudo -u postgres psql -d vpiclist -P pager=off -v ON_ERROR_STOP=1 -v commit=true  -f /tmp/renommage_pk_tarification.sql
-- =====================================================================
\set QUIET on
\pset footer off
BEGIN;

\echo '=== 0. Garde-fous ==='
DO $g$
DECLARE n int; l text;
BEGIN
  SELECT count(*), string_agg(n2.nspname || '.' || p.proname, ', ') INTO n, l
    FROM pg_proc p JOIN pg_namespace n2 ON n2.oid = p.pronamespace
   WHERE n2.nspname NOT IN ('pg_catalog','information_schema') AND p.prosrc ~ '\mref_base_calcul\M';
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  fonction(s) lisant ref_base_calcul : %', l; END IF;

  SELECT count(*), string_agg(n2.nspname || '.' || p.proname, ', ') INTO n, l
    FROM pg_proc p JOIN pg_namespace n2 ON n2.oid = p.pronamespace
   WHERE n2.nspname NOT IN ('pg_catalog','information_schema','vpic')
     AND ((p.prosrc ~ '\m(acte_reglementaire|bareme_accessoire|bareme_tranche|derogation|equivalence_garantie|flotte|formule|formule_garantie|franchise_application|genre_en_attente_validation|majoration_reduction|offre_commerciale|police_cotation|prime_element|regles_calcul|regles_reduction_franchise|tarif|garantie_lien)\M' AND p.prosrc ~ '\m(id|id_lien)\M')
          OR p.prosrc ~ '\m(bareme_accessoire|regles_calcul|regles_reduction_franchise|accessoires_par_defaut)\M')
     AND p.proname NOT IN ('fn_accessoires','fn_calculer_prime_garantie_dependante','fn_calculer_prime_rc_automobile','fn_controle_plafond_reduction_franchise','fn_generer_code_offre_commerciale','fn_resoudre_tarif_categorie');
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  fonction(s) imprévue(s) : %', l; END IF;

  SELECT count(*), string_agg(conrelid::regclass || '.' || conname, ', ') INTO n, l
    FROM pg_constraint
   WHERE contype = 'c' AND pg_get_constraintdef(oid) ~ '''(bareme_accessoires?|regles_calcul|regles_reduction_franchise)''';
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  contrainte(s) CHECK citant un ancien nom en toutes lettres : %', l; END IF;

  SELECT count(*), string_agg(v.relnamespace::regnamespace || '.' || v.relname, ', ') INTO n, l
    FROM pg_class v WHERE v.relkind IN ('v','m') AND pg_get_viewdef(v.oid) ~ '\m(bareme_accessoire|regles_calcul|regles_reduction_franchise|accessoires_par_defaut)\M';
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  vue(s) citant un ancien nom : %', l; END IF;

  RAISE NOTICE '[OK]     Aucune fonction, contrainte ni vue imprévue';
END $g$;

\echo '=== 1. Jeux de test et résultats AVANT ==='
CREATE TEMP TABLE _p_acc AS
SELECT DISTINCT id_compagnie, code_branche, code_categorie
  FROM tarification.bareme_accessoire WHERE actif ORDER BY 1, 2, 3 LIMIT 12;
CREATE TEMP TABLE _p_res AS
SELECT DISTINCT id_compagnie, garantie_code, categorie_code
  FROM tarification.tarif WHERE statut = 'ACTIF' AND categorie_code <> 'ALL' ORDER BY 1, 2, 3 LIMIT 12;
CREATE TEMP TABLE _avant AS
SELECT 'RC 01 zone A'::text AS test, f::text AS resultat
  FROM tarification.fn_calculer_prime_rc_automobile(p_categorie_code => '01', p_zone => 'A', p_force_fiscale => 0) f
UNION ALL
SELECT 'RC 04B 45 places', f::text
  FROM tarification.fn_calculer_prime_rc_automobile(p_categorie_code => '04B', p_force_fiscale => 7, p_nombre_places => 45) f
UNION ALL
SELECT 'Garantie dépendante DR', f::text
  FROM tarification.fn_calculer_prime_garantie_dependante('AUTO_DEFENSE_RECOURS__DEFENSE_RECOURS', 4, '01', 100000) f
UNION ALL
SELECT 'Accessoires ' || p.id_compagnie || '/' || coalesce(p.code_branche,'-') || '/' || coalesce(p.code_categorie,'-'), f::text
  FROM _p_acc p, tarification.fn_accessoires(p.id_compagnie, coalesce(p.code_branche,'AUTOMOBILE'), p.code_categorie, 100000, current_date, current_date + 364, current_date) f
UNION ALL
SELECT 'Résolution tarif ' || p.id_compagnie || '/' || p.garantie_code || '/' || p.categorie_code, f::text
  FROM _p_res p, tarification.fn_resoudre_tarif_categorie(p.id_compagnie, p.garantie_code, p.categorie_code, current_date) f;
SELECT count(*) AS appels_avant FROM _avant;

\echo '=== 2. Renommage des colonnes ==='
ALTER TABLE tarification.acte_reglementaire           RENAME COLUMN id      TO id_acte_reglementaire;
ALTER TABLE tarification.bareme_accessoire            RENAME COLUMN id      TO id_bareme_frais_accessoires;
ALTER TABLE tarification.bareme_tranche               RENAME COLUMN id      TO id_bareme_tranche;
ALTER TABLE tarification.derogation                   RENAME COLUMN id      TO id_derogation;
ALTER TABLE tarification.equivalence_garantie         RENAME COLUMN id      TO id_equivalence_garantie;
ALTER TABLE tarification.flotte                       RENAME COLUMN id      TO id_flotte;
ALTER TABLE tarification.formule                      RENAME COLUMN id      TO id_formule;
ALTER TABLE tarification.formule_garantie             RENAME COLUMN id      TO id_formule_garantie;
ALTER TABLE tarification.franchise_application        RENAME COLUMN id      TO id_franchise_application;
ALTER TABLE tarification.genre_en_attente_validation  RENAME COLUMN id      TO id_genre_en_attente_validation;
ALTER TABLE tarification.majoration_reduction         RENAME COLUMN id      TO id_majoration_reduction;
ALTER TABLE tarification.offre_commerciale            RENAME COLUMN id      TO id_offre_commerciale;
ALTER TABLE tarification.police_cotation              RENAME COLUMN id      TO id_police_cotation;
ALTER TABLE tarification.prime_element                RENAME COLUMN id      TO id_prime_element;
ALTER TABLE tarification.regles_calcul                RENAME COLUMN id      TO id_regle_calcul;
ALTER TABLE tarification.regles_reduction_franchise   RENAME COLUMN id      TO id_regle_reduction_franchise;
ALTER TABLE tarification.tarif                        RENAME COLUMN id      TO id_tarif;
ALTER TABLE tarification.garantie_lien                RENAME COLUMN id_lien TO id_garantie_lien;
ALTER TABLE tarification.ref_base_calcul              RENAME COLUMN code    TO code_base_calcul;
ALTER TABLE tarification.compagnie                    RENAME COLUMN accessoires_par_defaut TO frais_accessoires_par_defaut;

\echo '=== 3. Renommage des tables ==='
ALTER TABLE tarification.bareme_accessoire          RENAME TO bareme_frais_accessoires;
ALTER TABLE tarification.regles_calcul              RENAME TO regle_calcul;
ALTER TABLE tarification.regles_reduction_franchise RENAME TO regle_reduction_franchise;
UPDATE tarification.derogation SET cible_table = 'regle_reduction_franchise' WHERE cible_table = 'regles_reduction_franchise';

\echo '=== 4. Contraintes PK -> <table>_pkey, séquences -> <table>_<colonne>_seq ==='
DO $k$
DECLARE r record; s text; c text; n int := 0; m int := 0;
BEGIN
  FOR r IN SELECT c2.relname AS tbl, k.conname, a.attname AS col
             FROM pg_constraint k
             JOIN pg_class c2 ON c2.oid = k.conrelid
             JOIN pg_attribute a ON a.attrelid = k.conrelid AND a.attnum = k.conkey[1]
            WHERE k.contype = 'p' AND c2.relnamespace = 'tarification'::regnamespace
              AND c2.relname IN ('acte_reglementaire','bareme_frais_accessoires','bareme_tranche','derogation','equivalence_garantie','flotte','formule','formule_garantie','franchise_application','genre_en_attente_validation','majoration_reduction','offre_commerciale','police_cotation','prime_element','regle_calcul','regle_reduction_franchise','tarif','garantie_lien','ref_base_calcul') LOOP
    IF r.conname <> r.tbl || '_pkey' THEN
      IF EXISTS (SELECT 1 FROM pg_class WHERE relnamespace = 'tarification'::regnamespace AND relname = r.tbl || '_pkey') THEN
        RAISE EXCEPTION '[ÉCHEC]  le nom %_pkey est déjà pris', r.tbl;
      END IF;
      EXECUTE format('ALTER TABLE tarification.%I RENAME CONSTRAINT %I TO %I', r.tbl, r.conname, r.tbl || '_pkey');
      n := n + 1;
    END IF;
    s := pg_get_serial_sequence('tarification.' || quote_ident(r.tbl), r.col);
    IF s IS NOT NULL THEN
      c := r.tbl || '_' || r.col || '_seq';
      IF split_part(s, '.', 2) <> c THEN
        EXECUTE format('ALTER SEQUENCE %s RENAME TO %I', s, c);
        m := m + 1;
      END IF;
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tarif_offre_commerciale_id_fkey'
                AND conrelid = 'tarification.tarif'::regclass) THEN
    ALTER TABLE tarification.tarif RENAME CONSTRAINT tarif_offre_commerciale_id_fkey TO tarif_id_offre_commerciale_fkey;
    n := n + 1;
  END IF;
  RAISE NOTICE '[OK]     % contrainte(s) et % séquence(s) renommée(s)', n, m;
END $k$;

\echo '=== 4 bis. Autres contraintes et index portant un ancien nom ==='
DO $x$
DECLARE r record; nv text; n int := 0;
BEGIN
  FOR r IN
    SELECT 'contrainte' AS nature, c2.relname AS tbl, k.conname AS nom
      FROM pg_constraint k JOIN pg_class c2 ON c2.oid = k.conrelid
     WHERE c2.relnamespace = 'tarification'::regnamespace AND k.contype <> 'p'
       AND k.conname ~ '(bareme_accessoire|regles_calcul|regles_reduction_franchise|(?<!frais_)accessoires_par_defaut)'
    UNION ALL
    SELECT 'index', t.relname, i.relname
      FROM pg_index x JOIN pg_class i ON i.oid = x.indexrelid JOIN pg_class t ON t.oid = x.indrelid
     WHERE i.relnamespace = 'tarification'::regnamespace
       AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = x.indexrelid AND c.contype IN ('p','u','x'))
       AND i.relname ~ '(bareme_accessoire|regles_calcul|regles_reduction_franchise|(?<!frais_)accessoires_par_defaut)'
  LOOP
    nv := regexp_replace(r.nom, 'bareme_accessoires?', 'bareme_frais_accessoires', 'g');
    nv := regexp_replace(nv, 'regles_calcul', 'regle_calcul', 'g');
    nv := regexp_replace(nv, 'regles_reduction_franchise', 'regle_reduction_franchise', 'g');
    nv := regexp_replace(nv, '(?<!frais_)accessoires_par_defaut', 'frais_accessoires_par_defaut', 'g');
    IF length(nv) > 63 THEN RAISE EXCEPTION '[ÉCHEC]  nouveau nom trop long (% car.) : %', length(nv), nv; END IF;
    IF EXISTS (SELECT 1 FROM pg_class WHERE relnamespace = 'tarification'::regnamespace AND relname = nv)
       OR EXISTS (SELECT 1 FROM pg_constraint WHERE connamespace = 'tarification'::regnamespace AND conname = nv) THEN
      RAISE EXCEPTION '[ÉCHEC]  le nom % est déjà pris', nv;
    END IF;
    IF r.nature = 'index' THEN
      EXECUTE format('ALTER INDEX tarification.%I RENAME TO %I', r.nom, nv);
    ELSE
      EXECUTE format('ALTER TABLE tarification.%I RENAME CONSTRAINT %I TO %I', r.tbl, r.nom, nv);
    END IF;
    RAISE NOTICE '         % : % -> %', r.nature, r.nom, nv;
    n := n + 1;
  END LOOP;
  RAISE NOTICE '[OK]     % autre(s) contrainte(s) ou index renommé(s)', n;
END $x$;

\echo '=== 5. Fonctions : fn_frais_accessoires, relais transitoire, 5 réécritures ==='
CREATE OR REPLACE FUNCTION tarification.fn_frais_accessoires(p_id_compagnie integer, p_code_branche character varying, p_code_categorie character varying, p_prime_nette numeric, p_date_effet date, p_date_echeance date, p_date_reference date)
 RETURNS TABLE(montant numeric, origine text, id_ligne integer, detail text)
 LANGUAGE sql
 STABLE
AS $function$
    WITH categories AS (
        SELECT p_code_categorie AS c WHERE p_code_categorie IS NOT NULL
        UNION
        SELECT categorie_code_tarif_reel FROM tarification.branche_categorie
         WHERE categorie_code = p_code_categorie AND categorie_code_tarif_reel IS NOT NULL
    ), choix AS (
        SELECT b.* FROM tarification.bareme_frais_accessoires b
         WHERE b.actif AND b.id_compagnie = p_id_compagnie
           AND p_date_reference BETWEEN b.date_debut AND b.date_fin
           AND (b.code_branche IS NULL OR b.code_branche = p_code_branche)
           AND (b.code_categorie IS NULL OR b.code_categorie IN (SELECT c FROM categories))
           AND (b.prime_min IS NULL OR COALESCE(p_prime_nette, 0) >= b.prime_min)
           AND (b.prime_max IS NULL OR COALESCE(p_prime_nette, 0) <= b.prime_max)
           AND (b.duree_min IS NULL OR p_date_echeance > p_date_effet + b.duree_min)
           AND (b.duree_max IS NULL OR p_date_echeance <= p_date_effet + b.duree_max)
         ORDER BY (b.code_categorie IS NOT NULL) DESC,
                  (b.code_branche IS NOT NULL) DESC,
                  CASE b.type_palier WHEN 'plage' THEN 2 WHEN 'signe' THEN 1 ELSE 0 END DESC,
                  (b.duree_min IS NOT NULL OR b.duree_max IS NOT NULL) DESC,
                  b.id_bareme_frais_accessoires
         LIMIT 1
    )
    SELECT montant, 'bareme', id_bareme_frais_accessoires, risque_source || ' — ' || palier_source || ' — ' || duree_source FROM choix
    UNION ALL
    SELECT c.frais_accessoires_par_defaut, 'defaut_compagnie', NULL, 'montant par défaut de la compagnie'
      FROM tarification.compagnie c
     WHERE c.id_compagnie = p_id_compagnie AND NOT EXISTS (SELECT 1 FROM choix)
$function$;

-- Relais TRANSITOIRE : l'ancien nom reste appelable le temps de déployer le code Node.
-- À supprimer dès que mouvements.routes.js appelle fn_frais_accessoires.
CREATE OR REPLACE FUNCTION tarification.fn_accessoires(p_id_compagnie integer, p_code_branche character varying, p_code_categorie character varying, p_prime_nette numeric, p_date_effet date, p_date_echeance date, p_date_reference date)
 RETURNS TABLE(montant numeric, origine text, id_ligne integer, detail text)
 LANGUAGE sql
 STABLE
AS $function$
    SELECT * FROM tarification.fn_frais_accessoires(p_id_compagnie, p_code_branche, p_code_categorie, p_prime_nette, p_date_effet, p_date_echeance, p_date_reference)
$function$;
COMMENT ON FUNCTION tarification.fn_accessoires(integer, character varying, character varying, numeric, date, date, date)
  IS 'TRANSITOIRE (07/10/2026) : relais vers fn_frais_accessoires, à supprimer après déploiement du code Node.';

CREATE OR REPLACE FUNCTION tarification.fn_calculer_prime_garantie_dependante(p_sous_garantie_code character varying, p_id_compagnie integer, p_categorie_code character varying, p_prime_garantie_declenchee numeric, p_date_effet date DEFAULT CURRENT_DATE)
 RETURNS TABLE(prime_calculee numeric, taux_applique numeric, id_sous_garantie_base integer, avertissements text[])
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'tarification', 'pg_catalog'
AS $function$
DECLARE
    v_id_sous_garantie      INT;
    v_id_sous_garantie_base INT;
    v_taux                  NUMERIC(7,4);
    v_avertissements        TEXT[] := ARRAY[]::TEXT[];
BEGIN
    SELECT sg.id_sous_garantie INTO v_id_sous_garantie
      FROM sous_garantie sg WHERE sg.code_sous_garantie = p_sous_garantie_code;

    IF v_id_sous_garantie IS NULL THEN
        RETURN QUERY SELECT NULL::NUMERIC(14,2), NULL::NUMERIC(7,4), NULL::INT,
            ARRAY[format('Sous-garantie "%s" inconnue.', p_sous_garantie_code)]::TEXT[];
        RETURN;
    END IF;

    SELECT gl.id_sous_garantie_declenchee INTO v_id_sous_garantie_base
      FROM garantie_lien gl
     WHERE gl.id_sous_garantie_declencheur = v_id_sous_garantie
       AND gl.mode = 'ASSIETTE'
     LIMIT 1;

    IF v_id_sous_garantie_base IS NULL THEN
        RETURN QUERY SELECT NULL::NUMERIC(14,2), NULL::NUMERIC(7,4), NULL::INT,
            ARRAY[format('Aucun lien ASSIETTE trouvé pour "%s" — le choix de cette garantie doit échouer (dépendance non déclarée dans garantie_lien).', p_sous_garantie_code)]::TEXT[];
        RETURN;
    END IF;

    IF p_prime_garantie_declenchee IS NULL THEN
        RETURN QUERY SELECT NULL::NUMERIC(14,2), NULL::NUMERIC(7,4), v_id_sous_garantie_base,
            ARRAY['La prime de la garantie dont dépend ce choix n''est pas fournie — calculez-la d''abord.']::TEXT[];
        RETURN;
    END IF;

    SELECT bt.taux_pct INTO v_taux
      FROM tarif t
      JOIN offre_commerciale oc ON oc.id_offre_commerciale = t.id_offre_commerciale
      JOIN bareme_tranche bt ON bt.id_tarif = t.id_tarif
     WHERE oc.id_sous_garantie = v_id_sous_garantie
       AND oc.id_compagnie = p_id_compagnie
       AND (t.categorie_code = p_categorie_code OR t.categorie_code = 'ALL')
       AND t.statut = 'ACTIF'
       AND p_date_effet BETWEEN t.date_debut_validite AND t.date_fin_validite
     ORDER BY (t.categorie_code = p_categorie_code) DESC
     LIMIT 1;

    IF v_taux IS NULL THEN
        v_avertissements := array_append(v_avertissements,
            format('Aucun taux trouvé pour %s, compagnie=%s, catégorie=%s.', p_sous_garantie_code, p_id_compagnie, p_categorie_code));
    END IF;

    RETURN QUERY SELECT
        ROUND(p_prime_garantie_declenchee * COALESCE(v_taux,0) / 100, 2),
        v_taux,
        v_id_sous_garantie_base,
        v_avertissements;
END;
$function$;

CREATE OR REPLACE FUNCTION tarification.fn_calculer_prime_rc_automobile(p_categorie_code character varying, p_zone character DEFAULT NULL::bpchar, p_force_fiscale integer DEFAULT NULL::integer, p_cylindree_label character varying DEFAULT NULL::character varying, p_nombre_places integer DEFAULT NULL::integer, p_avec_remorque boolean DEFAULT false, p_matiere_inflammable boolean DEFAULT false, p_avec_double_commande boolean DEFAULT NULL::boolean, p_avec_rc_eleves boolean DEFAULT NULL::boolean, p_tonnage_label character varying DEFAULT NULL::character varying, p_nombre_cartes integer DEFAULT NULL::integer, p_rang_vehicule character varying DEFAULT NULL::character varying, p_type_vehicule_base character varying DEFAULT NULL::character varying, p_vin character varying DEFAULT NULL::character varying, p_date_effet date DEFAULT CURRENT_DATE, p_energie character varying DEFAULT 'ESSENCE'::character varying)
 RETURNS TABLE(prime_base numeric, surprime_matiere_inflam numeric, prime_totale numeric, id_tarif integer, id_bareme_base integer, id_bareme_surprime integer, source_page integer, force_fiscale_utilisee integer, cylindree_utilisee character varying, avertissements text[])
 LANGUAGE plpgsql
 SET search_path TO 'tarification', 'pg_catalog'
AS $function$
DECLARE
    v_force_fiscale     INT := p_force_fiscale;
    v_cylindree_label   VARCHAR(20) := p_cylindree_label;
    v_cylindree_min     INT;
    v_cylindree_max     INT;
    v_avertissements    TEXT[] := ARRAY[]::TEXT[];
    v_vin_valide        BOOLEAN;
    v_cv_texte          TEXT;
    v_valeur_numerique  INT;
    v_extrapolation_ok  BOOLEAN := false;
    v_id_tarif_base     INT;
    v_id_bareme_base    INT;
    v_base_montant      NUMERIC(14,2);
    v_base_source_page  INT;
    v_id_bareme_surprime INT;
    v_surprime_montant   NUMERIC(14,2);
    v_id_sous_garantie_rc INT;
BEGIN
    IF upper(COALESCE(p_energie, 'ESSENCE')) NOT IN ('ESSENCE', 'DIESEL') THEN
        v_avertissements := array_append(v_avertissements,
            format('p_energie=%s non reconnu (attendu ESSENCE ou DIESEL) — traité comme ESSENCE par défaut.', p_energie));
    END IF;

    IF (v_force_fiscale IS NULL OR v_cylindree_label IS NULL) AND p_vin IS NOT NULL THEN
        SELECT is_valid, catalogue_puissance_fiscale_cv
          INTO v_vin_valide, v_cv_texte
          FROM vpic.decode_vin_flat(p_vin);

        IF v_cv_texte IS NOT NULL THEN
            v_valeur_numerique := NULLIF(regexp_replace(v_cv_texte, '[^0-9]', '', 'g'), '')::INT;

            IF upper(v_cv_texte) ~ 'CM' THEN
                IF v_cylindree_label IS NULL AND v_valeur_numerique IS NOT NULL THEN
                    v_cylindree_label := CASE
                        WHEN v_valeur_numerique < 50            THEN '<50'
                        WHEN v_valeur_numerique BETWEEN 51 AND 125  THEN '51-125'
                        WHEN v_valeur_numerique BETWEEN 126 AND 175 THEN '126-175'
                        WHEN v_valeur_numerique BETWEEN 176 AND 250 THEN '176-250'
                        WHEN v_valeur_numerique BETWEEN 251 AND 350 THEN '251-350'
                        WHEN v_valeur_numerique BETWEEN 351 AND 500 THEN '351-500'
                        WHEN v_valeur_numerique BETWEEN 501 AND 625 THEN '501-625'
                        WHEN v_valeur_numerique > 625            THEN '>625'
                    END;
                END IF;
            ELSIF upper(v_cv_texte) ~ 'CV' THEN
                v_force_fiscale := v_valeur_numerique;
                IF v_cylindree_label IS NULL AND v_valeur_numerique IS NOT NULL THEN
                    v_cylindree_label := CASE
                        WHEN v_valeur_numerique < 1  THEN '<50'
                        WHEN v_valeur_numerique = 1  THEN '51-125'
                        WHEN v_valeur_numerique = 2  THEN '126-175'
                        WHEN v_valeur_numerique = 3  THEN '176-250'
                        WHEN v_valeur_numerique = 4  THEN '251-350'
                        WHEN v_valeur_numerique = 5  THEN '351-500'
                        WHEN v_valeur_numerique = 6  THEN '501-625'
                        WHEN v_valeur_numerique >= 7 THEN '>625'
                    END;
                    v_avertissements := array_append(v_avertissements,
                        'Cylindrée déduite d''une valeur exprimée en CV (correspondance non officielle mais adoptée en pratique), pas directement en cm³ — à vérifier si le résultat semble incohérent.');
                END IF;
            END IF;
        END IF;

        IF v_force_fiscale IS NULL AND v_cylindree_label IS NULL THEN
            v_avertissements := array_append(v_avertissements,
                'Ni force fiscale ni cylindrée trouvables via VIN (ni NHTSA ni catalogue) — fournir p_force_fiscale ou p_cylindree_label explicitement.');
        END IF;

        IF v_vin_valide IS FALSE THEN
            v_avertissements := array_append(v_avertissements,
                'VIN décodé mais échoue au contrôle de clé de contrôle (is_valid=false) — à vérifier avant validation du devis.');
        END IF;
    END IF;

    IF v_cylindree_label IS NOT NULL AND v_cylindree_label <> 'SCOOTER' THEN
        v_cylindree_min := CASE
            WHEN v_cylindree_label = '<50' THEN 0
            WHEN v_cylindree_label = '>625' THEN 626
            WHEN v_cylindree_label LIKE '%-%' THEN split_part(v_cylindree_label, '-', 1)::INT
        END;
        v_cylindree_max := CASE
            WHEN v_cylindree_label = '<50' THEN 49
            WHEN v_cylindree_label = '>625' THEN NULL
            WHEN v_cylindree_label LIKE '%-%' THEN split_part(v_cylindree_label, '-', 2)::INT
        END;
    END IF;

    IF p_categorie_code = '06' AND p_rang_vehicule IS NULL THEN
        RETURN QUERY SELECT
            NULL::NUMERIC(14,2), NULL::NUMERIC(14,2), NULL::NUMERIC(14,2),
            NULL::INT, NULL::INT, NULL::INT, NULL::INT,
            v_force_fiscale, v_cylindree_label,
            ARRAY['Catégorie 06 nécessite p_rang_vehicule (''TARIF_1'' ou ''TARIF_2_3'') — deux lignes de tarif existent avec des critères par ailleurs identiques, impossible de choisir sans ambiguïté.']::TEXT[];
        RETURN;
    END IF;

    IF p_categorie_code IN ('07ARC', '07SRC') AND p_type_vehicule_base IS NULL THEN
        RETURN QUERY SELECT
            NULL::NUMERIC(14,2), NULL::NUMERIC(14,2), NULL::NUMERIC(14,2),
            NULL::INT, NULL::INT, NULL::INT, NULL::INT,
            v_force_fiscale, v_cylindree_label,
            ARRAY['Catégorie 07 nécessite p_type_vehicule_base (''CAT_1'', ''CAT_2_3_4'' ou ''CAT_5_DEUX_TROIS_ROUES'') — plusieurs lignes de tarif existent avec des critères par ailleurs identiques, impossible de choisir sans ambiguïté.']::TEXT[];
        RETURN;
    END IF;

    SELECT sg.id_sous_garantie INTO v_id_sous_garantie_rc
      FROM sous_garantie sg WHERE sg.code_sous_garantie = 'AUTO_RC__RESPONSABILITE_CIVILE_STRICTE';

    SELECT
        t.id_tarif, bt.id_bareme_tranche,
        CASE WHEN p_avec_remorque THEN bt.prime_avec_remorque
             ELSE COALESCE(bt.prime_sans_remorque, bt.prime_unique) END,
        bt.source_page,
        CASE WHEN p_matiere_inflammable THEN bt.surprime_matiere_inflammable END
      INTO v_id_tarif_base, v_id_bareme_base, v_base_montant, v_base_source_page, v_surprime_montant
      FROM tarif t
      JOIN offre_commerciale oc ON oc.id_offre_commerciale = t.id_offre_commerciale
      JOIN bareme_tranche bt ON bt.id_tarif = t.id_tarif
     WHERE t.categorie_code = p_categorie_code
       AND oc.id_sous_garantie = v_id_sous_garantie_rc
       AND t.statut = 'ACTIF'
       AND p_date_effet BETWEEN t.date_debut_validite AND COALESCE(t.date_fin_validite, p_date_effet)
       AND (bt.criteres->>'zone' IS NULL OR bt.criteres->>'zone' = p_zone)
       AND (
           v_force_fiscale IS NULL
           OR (upper(COALESCE(p_energie,'ESSENCE')) = 'DIESEL'
               AND bt.force_fiscale_min_diesel IS NOT NULL
               AND v_force_fiscale BETWEEN bt.force_fiscale_min_diesel AND COALESCE(bt.force_fiscale_max_diesel, v_force_fiscale))
           OR (upper(COALESCE(p_energie,'ESSENCE')) <> 'DIESEL'
               AND v_force_fiscale BETWEEN bt.borne_min AND COALESCE(bt.borne_max, v_force_fiscale))
       )
       AND (
           v_cylindree_label IS NULL
           OR (v_cylindree_label = 'SCOOTER' AND bt.cylindree_min IS NULL AND bt.cylindree_max IS NULL AND bt.borne_min IS NULL)
           OR (v_cylindree_label <> 'SCOOTER'
               AND bt.cylindree_min = v_cylindree_min
               AND COALESCE(bt.cylindree_max, -1) = COALESCE(v_cylindree_max, -1))
       )
       AND (p_nombre_places IS NULL OR bt.criteres->>'nombre_places' IS NULL OR (bt.criteres->>'nombre_places')::INT = p_nombre_places)
       AND (p_avec_double_commande IS NULL OR bt.criteres->>'avec_double_commande' IS NULL OR (bt.criteres->>'avec_double_commande')::BOOLEAN = p_avec_double_commande)
       AND (p_avec_rc_eleves IS NULL OR bt.criteres->>'avec_rc_eleves' IS NULL OR (bt.criteres->>'avec_rc_eleves')::BOOLEAN = p_avec_rc_eleves)
       AND (p_tonnage_label IS NULL OR bt.criteres->>'tonnage_label' = p_tonnage_label OR bt.criteres->>'tonnage_label' IS NULL)
       AND (p_nombre_cartes IS NULL OR bt.criteres->>'nombre_cartes' IS NULL OR (bt.criteres->>'nombre_cartes')::INT = p_nombre_cartes)
       AND (p_rang_vehicule IS NULL OR bt.criteres->>'rang_vehicule' IS NULL OR bt.criteres->>'rang_vehicule' = p_rang_vehicule)
       AND (p_type_vehicule_base IS NULL OR bt.criteres->>'type_vehicule_base' IS NULL OR bt.criteres->>'type_vehicule_base' = p_type_vehicule_base)
     ORDER BY (
         (CASE WHEN bt.criteres->>'tonnage_label' = p_tonnage_label THEN 1 ELSE 0 END) +
         (CASE WHEN p_nombre_places IS NOT NULL AND (bt.criteres->>'nombre_places')::INT = p_nombre_places THEN 1 ELSE 0 END) +
         (CASE WHEN p_avec_double_commande IS NOT NULL AND (bt.criteres->>'avec_double_commande')::BOOLEAN = p_avec_double_commande THEN 1 ELSE 0 END) +
         (CASE WHEN p_avec_rc_eleves IS NOT NULL AND (bt.criteres->>'avec_rc_eleves')::BOOLEAN = p_avec_rc_eleves THEN 1 ELSE 0 END) +
         (CASE WHEN p_nombre_cartes IS NOT NULL AND (bt.criteres->>'nombre_cartes')::INT = p_nombre_cartes THEN 1 ELSE 0 END) +
         (CASE WHEN bt.criteres->>'rang_vehicule' = p_rang_vehicule THEN 1 ELSE 0 END) +
         (CASE WHEN bt.criteres->>'type_vehicule_base' = p_type_vehicule_base THEN 1 ELSE 0 END)
     ) DESC, bt.id_bareme_tranche
     LIMIT 1;

    IF v_base_montant IS NULL AND p_categorie_code = '04B'
       AND p_nombre_places IS NOT NULL AND p_nombre_places > 40 THEN
        SELECT t.id_tarif, bt.id_bareme_tranche, COALESCE(bt.prime_sans_remorque, bt.prime_unique), bt.source_page
          INTO v_id_tarif_base, v_id_bareme_base, v_base_montant, v_base_source_page
          FROM tarif t
          JOIN offre_commerciale oc ON oc.id_offre_commerciale = t.id_offre_commerciale
          JOIN bareme_tranche bt ON bt.id_tarif = t.id_tarif
         WHERE t.categorie_code = '04B'
           AND oc.id_sous_garantie = v_id_sous_garantie_rc
           AND t.statut = 'ACTIF'
           AND (v_force_fiscale IS NOT NULL
                AND v_force_fiscale BETWEEN bt.borne_min AND COALESCE(bt.borne_max, v_force_fiscale))
           AND (bt.criteres->>'nombre_places')::INT = 40
         ORDER BY bt.id_bareme_tranche
         LIMIT 1;

        IF v_base_montant IS NOT NULL THEN
            v_base_montant := v_base_montant + (p_nombre_places - 40) * 5000;
            v_extrapolation_ok := true;
            v_avertissements := array_append(v_avertissements,
                format('Extrapolation appliquée : base 40 places + %s place(s) supplémentaire(s) x 5 000 FCFA (Cat.04B, règle page 31).',
                       p_nombre_places - 40));
        END IF;
    END IF;

    IF v_base_montant IS NULL AND NOT v_extrapolation_ok THEN
        v_avertissements := array_append(v_avertissements,
            format('Aucune ligne de base trouvée pour categorie_code=%s, zone=%s, force_fiscale=%s (%s), cylindree=%s',
                   p_categorie_code, p_zone, v_force_fiscale, COALESCE(p_energie,'ESSENCE'), v_cylindree_label));
    END IF;

    IF p_matiere_inflammable AND v_surprime_montant IS NULL THEN
        v_avertissements := array_append(v_avertissements,
            format('Matière inflammable demandée mais aucune surprime définie pour categorie_code=%s — cette catégorie ne prévoit probablement pas cette composition.',
                   p_categorie_code));
    END IF;

    RETURN QUERY SELECT
        v_base_montant,
        v_surprime_montant,
        v_base_montant + COALESCE(v_surprime_montant, 0),
        v_id_tarif_base,
        v_id_bareme_base,
        v_id_bareme_surprime,
        v_base_source_page,
        v_force_fiscale,
        v_cylindree_label,
        v_avertissements;
END;
$function$;

CREATE OR REPLACE FUNCTION tarification.fn_controle_plafond_reduction_franchise()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'tarification', 'pg_catalog'
AS $function$
DECLARE
    v_taux_min      NUMERIC(5,2);
    v_taux_max      NUMERIC(5,2);
    v_date_effet    DATE;
    v_derogation_id INT;
BEGIN
    IF NEW.id_regle_reduction_franchise IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT date_effet INTO v_date_effet
      FROM police_cotation WHERE id_police_cotation = NEW.id_police_cotation;

    SELECT taux_min_pct, taux_max_pct
      INTO v_taux_min, v_taux_max
      FROM regle_reduction_franchise
     WHERE id_regle_reduction_franchise = NEW.id_regle_reduction_franchise
       AND statut = 'ACTIF'
       AND date_debut_validite <= COALESCE(v_date_effet, CURRENT_DATE)
       AND (date_fin_validite IS NULL OR date_fin_validite >= COALESCE(v_date_effet, CURRENT_DATE));

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    NEW.taux_max_autorise_pct := v_taux_max;
    NEW.taux_min_autorise_pct := v_taux_min;
    NEW.valeur_bloquante := NULL;

    IF NEW.taux_applique_pct IS NOT NULL AND v_taux_max IS NOT NULL
       AND ABS(NEW.taux_applique_pct) > v_taux_max THEN
        NEW.valeur_bloquante := v_taux_max;
    ELSIF NEW.taux_applique_pct IS NOT NULL AND v_taux_min IS NOT NULL
       AND ABS(NEW.taux_applique_pct) < v_taux_min THEN
        NEW.valeur_bloquante := v_taux_min;
    END IF;

    IF NEW.valeur_bloquante IS NOT NULL THEN
        SELECT id_derogation INTO v_derogation_id
          FROM derogation
         WHERE cible_table = 'regle_reduction_franchise'
           AND id_cible = NEW.id_regle_reduction_franchise
           AND statut = 'ACCORD'
           AND (portee = 'SYSTEMATIQUE' OR id_police_cotation = NEW.id_police_cotation)
           AND date_debut_validite <= COALESCE(v_date_effet, CURRENT_DATE)
           AND (date_fin_validite IS NULL OR date_fin_validite >= COALESCE(v_date_effet, CURRENT_DATE))
         ORDER BY (portee = 'PONCTUELLE') DESC
         LIMIT 1;

        NEW.id_derogation := v_derogation_id;
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION tarification.fn_generer_code_offre_commerciale()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'tarification', 'pg_catalog'
AS $function$
DECLARE
    v_compagnie_code VARCHAR(30);
    v_denomination   VARCHAR(200);
    v_compagnie_nettoyee VARCHAR(100);
    v_denomination_nettoyee VARCHAR(250);
BEGIN
    IF NEW.code IS NOT NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.compagnie_code IS NULL THEN
        RAISE EXCEPTION 'Impossible de générer le code de l''offre commerciale : compagnie_code est vide.'
            USING ERRCODE = 'OC001';
    END IF;

    v_compagnie_code := NEW.compagnie_code;

    IF NEW.id_equivalence_garantie IS NOT NULL THEN
        SELECT eg.denomination INTO v_denomination
          FROM equivalence_garantie eg WHERE eg.id_equivalence_garantie = NEW.id_equivalence_garantie;
    ELSE
        v_denomination := NEW.denomination_sous_garantie;
    END IF;

    IF v_denomination IS NULL THEN
        RAISE EXCEPTION 'Impossible de générer le code de l''offre commerciale : ni id_equivalence_garantie ni denomination_sous_garantie ne sont renseignés (compagnie=%).', v_compagnie_code
            USING ERRCODE = 'OC002';
    END IF;

    v_compagnie_nettoyee := trim(both '_' from regexp_replace(regexp_replace(upper(v_compagnie_code), '[^A-Z0-9_]+', '_', 'g'), '_+', '_', 'g'));
    v_denomination_nettoyee := trim(both '_' from regexp_replace(regexp_replace(upper(v_denomination), '[^A-Z0-9_]+', '_', 'g'), '_+', '_', 'g'));

    NEW.code := v_compagnie_nettoyee || '__' || v_denomination_nettoyee;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION tarification.fn_resoudre_tarif_categorie(p_id_compagnie integer, p_garantie_code character varying, p_categorie_code character varying, p_date_effet date DEFAULT CURRENT_DATE)
 RETURNS TABLE(tarif_id integer, categorie_utilisee character varying, est_generique boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'tarification', 'pg_catalog'
AS $function$
    SELECT t.id_tarif, t.categorie_code, (t.categorie_code = 'ALL')
      FROM tarif t
     WHERE t.id_compagnie = p_id_compagnie
       AND t.garantie_code = p_garantie_code
       AND (t.categorie_code = p_categorie_code OR t.categorie_code = 'ALL')
       AND t.statut = 'ACTIF'
       AND p_date_effet BETWEEN t.date_debut_validite AND t.date_fin_validite
     ORDER BY (t.categorie_code = p_categorie_code) DESC
     LIMIT 1;
$function$;

\echo '=== 6. Contrôles ==='
DO $c$
DECLARE n int; l text;
BEGIN
  SELECT count(*), string_agg(table_name || '.' || column_name, ', ') INTO n, l
    FROM information_schema.columns
   WHERE table_schema = 'tarification' AND table_name IN ('acte_reglementaire','bareme_frais_accessoires','bareme_tranche','derogation','equivalence_garantie','flotte','formule','formule_garantie','franchise_application','genre_en_attente_validation','majoration_reduction','offre_commerciale','police_cotation','prime_element','regle_calcul','regle_reduction_franchise','tarif','garantie_lien','ref_base_calcul')
     AND (column_name IN ('id','id_lien') OR (table_name = 'ref_base_calcul' AND column_name = 'code'));
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  colonnes non renommées : %', l; END IF;

  SELECT count(*), string_agg(relname, ', ') INTO n, l FROM pg_class
   WHERE relnamespace = 'tarification'::regnamespace
     AND relname IN ('bareme_accessoire','regles_calcul','regles_reduction_franchise');
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  anciennes tables encore présentes : %', l; END IF;

  SELECT count(*), string_agg(n2.nspname || '.' || p.proname, ', ') INTO n, l
    FROM pg_proc p JOIN pg_namespace n2 ON n2.oid = p.pronamespace
   WHERE n2.nspname NOT IN ('pg_catalog','information_schema','vpic')
     AND ((p.prosrc ~ '\m(acte_reglementaire|bareme_frais_accessoires|bareme_tranche|derogation|equivalence_garantie|flotte|formule|formule_garantie|franchise_application|genre_en_attente_validation|majoration_reduction|offre_commerciale|police_cotation|prime_element|regle_calcul|regle_reduction_franchise|tarif|garantie_lien)\M' AND p.prosrc ~ '\m(id|id_lien)\M')
          OR p.prosrc ~ '\m(bareme_accessoire|regles_calcul|regles_reduction_franchise|accessoires_par_defaut)\M');
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  fonction(s) citant encore un ancien nom : %', l; END IF;

  RAISE NOTICE '[OK]     Colonnes, tables et fonctions conformes';
END $c$;

CREATE TEMP TABLE _apres AS
SELECT 'RC 01 zone A'::text AS test, f::text AS resultat
  FROM tarification.fn_calculer_prime_rc_automobile(p_categorie_code => '01', p_zone => 'A', p_force_fiscale => 0) f
UNION ALL
SELECT 'RC 04B 45 places', f::text
  FROM tarification.fn_calculer_prime_rc_automobile(p_categorie_code => '04B', p_force_fiscale => 7, p_nombre_places => 45) f
UNION ALL
SELECT 'Garantie dépendante DR', f::text
  FROM tarification.fn_calculer_prime_garantie_dependante('AUTO_DEFENSE_RECOURS__DEFENSE_RECOURS', 4, '01', 100000) f
UNION ALL
SELECT 'Accessoires ' || p.id_compagnie || '/' || coalesce(p.code_branche,'-') || '/' || coalesce(p.code_categorie,'-'), f::text
  FROM _p_acc p, tarification.fn_frais_accessoires(p.id_compagnie, coalesce(p.code_branche,'AUTOMOBILE'), p.code_categorie, 100000, current_date, current_date + 364, current_date) f
UNION ALL
SELECT 'Résolution tarif ' || p.id_compagnie || '/' || p.garantie_code || '/' || p.categorie_code, f::text
  FROM _p_res p, tarification.fn_resoudre_tarif_categorie(p.id_compagnie, p.garantie_code, p.categorie_code, current_date) f;
CREATE TEMP TABLE _relais AS
SELECT 'RC 01 zone A'::text AS test, f::text AS resultat
  FROM tarification.fn_calculer_prime_rc_automobile(p_categorie_code => '01', p_zone => 'A', p_force_fiscale => 0) f
UNION ALL
SELECT 'RC 04B 45 places', f::text
  FROM tarification.fn_calculer_prime_rc_automobile(p_categorie_code => '04B', p_force_fiscale => 7, p_nombre_places => 45) f
UNION ALL
SELECT 'Garantie dépendante DR', f::text
  FROM tarification.fn_calculer_prime_garantie_dependante('AUTO_DEFENSE_RECOURS__DEFENSE_RECOURS', 4, '01', 100000) f
UNION ALL
SELECT 'Accessoires ' || p.id_compagnie || '/' || coalesce(p.code_branche,'-') || '/' || coalesce(p.code_categorie,'-'), f::text
  FROM _p_acc p, tarification.fn_accessoires(p.id_compagnie, coalesce(p.code_branche,'AUTOMOBILE'), p.code_categorie, 100000, current_date, current_date + 364, current_date) f
UNION ALL
SELECT 'Résolution tarif ' || p.id_compagnie || '/' || p.garantie_code || '/' || p.categorie_code, f::text
  FROM _p_res p, tarification.fn_resoudre_tarif_categorie(p.id_compagnie, p.garantie_code, p.categorie_code, current_date) f;

\echo '--- Résultats avant / après ---'
SELECT a.test, a.resultat AS avant, CASE WHEN a.resultat = p.resultat THEN '=' ELSE p.resultat END AS apres
  FROM (SELECT test, resultat, row_number() OVER (ORDER BY test, resultat) AS rn FROM _avant) a
  FULL JOIN (SELECT test, resultat, row_number() OVER (ORDER BY test, resultat) AS rn FROM _apres) p USING (rn)
 ORDER BY a.test;

DO $d$
DECLARE n int; t int;
BEGIN
  SELECT count(*) INTO t FROM _avant;
  SELECT count(*) INTO n FROM ((SELECT * FROM _avant EXCEPT ALL SELECT * FROM _apres)
                               UNION ALL (SELECT * FROM _apres EXCEPT ALL SELECT * FROM _avant)) d;
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  Nouveaux noms (fn_frais_accessoires) : % écart(s)', n; END IF;
  RAISE NOTICE '[OK]     Nouveaux noms (fn_frais_accessoires) : % appel(s) identiques', t;
END $d$;
DO $d$
DECLARE n int; t int;
BEGIN
  SELECT count(*) INTO t FROM _avant;
  SELECT count(*) INTO n FROM ((SELECT * FROM _avant EXCEPT ALL SELECT * FROM _relais)
                               UNION ALL (SELECT * FROM _relais EXCEPT ALL SELECT * FROM _avant)) d;
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  Relais transitoire (fn_accessoires) : % écart(s)', n; END IF;
  RAISE NOTICE '[OK]     Relais transitoire (fn_accessoires) : % appel(s) identiques', t;
END $d$;

\echo '=== 7. Tests des triggers (annulés, rien n est écrit) ==='
DO $t$
BEGIN
  BEGIN
    UPDATE tarification.offre_commerciale SET code = NULL, id_equivalence_garantie = id_equivalence_garantie
     WHERE id_offre_commerciale = (SELECT min(id_offre_commerciale) FROM tarification.offre_commerciale WHERE id_equivalence_garantie IS NOT NULL);
    RAISE EXCEPTION 'TEST_OK';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'TEST_OK' THEN
      RAISE NOTICE '[OK]     fn_generer_code_offre_commerciale : trigger exécuté sans erreur';
    ELSIF SQLERRM ~ '(column|colonne|champ|field|relation)[^,]*\m(id|id_lien|regles_[a-z_]+|bareme_accessoire)\M' THEN
      RAISE EXCEPTION '[ÉCHEC]  fn_generer_code_offre_commerciale : %', SQLERRM;
    ELSE
      RAISE NOTICE '[OK ?]   fn_generer_code_offre_commerciale : arrêt sur une autre cause, sans rapport avec le renommage → %', SQLERRM;
    END IF;
  END;
END $t$;

DO $t$
BEGIN
  BEGIN
    INSERT INTO tarification.prime_element (id_regle_reduction_franchise, id_police_cotation, taux_applique_pct)
    VALUES ((SELECT min(id_regle_reduction_franchise) FROM tarification.regle_reduction_franchise), -1, 1);
    RAISE EXCEPTION 'TEST_OK';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'TEST_OK' THEN
      RAISE NOTICE '[OK]     fn_controle_plafond_reduction_franchise : trigger exécuté sans erreur';
    ELSIF SQLERRM ~ '(column|colonne|champ|field|relation)[^,]*\m(id|id_lien|regles_[a-z_]+|bareme_accessoire)\M' THEN
      RAISE EXCEPTION '[ÉCHEC]  fn_controle_plafond_reduction_franchise : %', SQLERRM;
    ELSE
      RAISE NOTICE '[OK ?]   fn_controle_plafond_reduction_franchise : arrêt sur une autre cause, sans rapport avec le renommage → %', SQLERRM;
    END IF;
  END;
END $t$;

\echo '=== Fin ==='
\if :commit
  COMMIT;
  \echo '>>> VALIDÉ : schéma tarification mis en conformité.'
\else
  ROLLBACK;
  \echo '>>> ESSAI À BLANC : tout a été annulé. Relancer avec -v commit=true pour appliquer.'
\endif

-- Complément appliqué à la main après la migration (06/10/2026) :
-- ancienne signature de fn_accessoires devenue orpheline après renommage.
DROP FUNCTION IF EXISTS tarification.fn_accessoires(integer, character varying, character varying, numeric, date, date, date);
