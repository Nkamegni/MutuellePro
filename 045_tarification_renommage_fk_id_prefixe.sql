-- =====================================================================
-- Renommage des 27 clés étrangères du schéma tarification (id_nomchamp)
-- Généré le 02/10/2026 à partir de audit_fk_complet.txt
--
-- Usage :
--   essai à blanc (tout est annulé à la fin) :
--     sudo -u postgres psql -d vpiclist -v ON_ERROR_STOP=1 -v commit=false -f renommage_fk.sql
--   application réelle :
--     sudo -u postgres psql -d vpiclist -v ON_ERROR_STOP=1 -v commit=true  -f renommage_fk.sql
--
-- Toute erreur arrête le script et annule l'ensemble (une seule transaction).
-- La vue tarification.compagnies n'est PAS modifiée : elle continue
-- d'exposer partenaire_id (voir décision en attente en fin de fichier).
-- =====================================================================
\set QUIET on
\pset footer off
BEGIN;

\echo '--- 0. Jeux de test figés AVANT renommage ---'
CREATE TEMP TABLE _t_params AS
SELECT
  (SELECT t.categorie_code FROM tarification.tarif t JOIN tarification.bareme_tranche bt ON bt.tarif_id = t.id
    WHERE t.garantie_code = 'AUTO_RC__RESPONSABILITE_CIVILE_STRICTE' AND t.statut = 'ACTIF'
      AND t.categorie_code NOT IN ('06','07ARC','07SRC','04B') AND bt.borne_min IS NOT NULL
    ORDER BY bt.id LIMIT 1) AS rc_cat,
  (SELECT bt.criteres->>'zone' FROM tarification.tarif t JOIN tarification.bareme_tranche bt ON bt.tarif_id = t.id
    WHERE t.garantie_code = 'AUTO_RC__RESPONSABILITE_CIVILE_STRICTE' AND t.statut = 'ACTIF'
      AND t.categorie_code NOT IN ('06','07ARC','07SRC','04B') AND bt.borne_min IS NOT NULL
    ORDER BY bt.id LIMIT 1)::bpchar AS rc_zone,
  (SELECT bt.borne_min FROM tarification.tarif t JOIN tarification.bareme_tranche bt ON bt.tarif_id = t.id
    WHERE t.garantie_code = 'AUTO_RC__RESPONSABILITE_CIVILE_STRICTE' AND t.statut = 'ACTIF'
      AND t.categorie_code NOT IN ('06','07ARC','07SRC','04B') AND bt.borne_min IS NOT NULL
    ORDER BY bt.id LIMIT 1)::int AS rc_ff,
  (SELECT bt.criteres->>'zone' FROM tarification.tarif t JOIN tarification.bareme_tranche bt ON bt.tarif_id = t.id
    WHERE t.categorie_code = '04B' AND t.garantie_code = 'AUTO_RC__RESPONSABILITE_CIVILE_STRICTE' AND t.statut = 'ACTIF'
      AND (bt.criteres->>'nombre_places')::int = 40 AND bt.borne_min IS NOT NULL ORDER BY bt.id LIMIT 1)::bpchar AS b_zone,
  (SELECT bt.borne_min FROM tarification.tarif t JOIN tarification.bareme_tranche bt ON bt.tarif_id = t.id
    WHERE t.categorie_code = '04B' AND t.garantie_code = 'AUTO_RC__RESPONSABILITE_CIVILE_STRICTE' AND t.statut = 'ACTIF'
      AND (bt.criteres->>'nombre_places')::int = 40 AND bt.borne_min IS NOT NULL ORDER BY bt.id LIMIT 1)::int AS b_ff,
  g.code_sous_garantie AS gd_code, g.id_compagnie AS gd_cie, g.categorie_code AS gd_cat
FROM (SELECT 1) x
LEFT JOIN LATERAL (
  SELECT sg.code_sous_garantie, t.id_compagnie, t.categorie_code
    FROM tarification.garantie_lien gl
    JOIN tarification.sous_garantie sg ON sg.id_sous_garantie = gl.id_sous_garantie_declencheur
    JOIN tarification.tarif t ON t.garantie_code = sg.code_sous_garantie AND t.statut = 'ACTIF'
    JOIN tarification.bareme_tranche bt ON bt.tarif_id = t.id
   WHERE gl.mode = 'ASSIETTE'
   ORDER BY t.id LIMIT 1) g ON true;

SELECT * FROM _t_params;

CREATE TEMP TABLE _t_avant AS
SELECT 'RC_principal'::text AS test, f.prime_base, f.prime_totale, f.tarif_id, f.bareme_id_base, f.avertissements::text AS avert
  FROM _t_params p, tarification.fn_calculer_prime_rc_automobile(p_categorie_code => p.rc_cat, p_zone => p.rc_zone, p_force_fiscale => p.rc_ff) f
 WHERE p.rc_cat IS NOT NULL
UNION ALL
SELECT 'RC_extrapolation_04B', f.prime_base, f.prime_totale, f.tarif_id, f.bareme_id_base, f.avertissements::text
  FROM _t_params p, tarification.fn_calculer_prime_rc_automobile(p_categorie_code => '04B', p_zone => p.b_zone, p_force_fiscale => p.b_ff, p_nombre_places => 45) f
 WHERE p.b_ff IS NOT NULL
UNION ALL
SELECT 'Garantie_dependante', f.prime_calculee, f.taux_applique, f.id_sous_garantie_base, NULL, f.avertissements::text
  FROM _t_params p, tarification.fn_calculer_prime_garantie_dependante(p.gd_code, p.gd_cie, p.gd_cat, 100000) f
 WHERE p.gd_code IS NOT NULL;

\echo '--- 1. Renommage des 27 colonnes ---'
ALTER TABLE tarification.acte_reglementaire                   RENAME COLUMN acte_abroge_id                 TO id_acte_abroge;
ALTER TABLE tarification.bareme_tranche                       RENAME COLUMN tarif_id                       TO id_tarif;
ALTER TABLE tarification.categorie                            RENAME COLUMN branche_id                     TO id_branche;
ALTER TABLE tarification.compagnie                            RENAME COLUMN partenaire_id                  TO id_partenaire;
ALTER TABLE tarification.derogation                           RENAME COLUMN cible_id                       TO id_cible;
ALTER TABLE tarification.derogation                           RENAME COLUMN police_cotation_id             TO id_police_cotation;
ALTER TABLE tarification.equivalence_garantie                 RENAME COLUMN compagnie_id                   TO id_compagnie;
ALTER TABLE tarification.equivalence_garantie_sous_garantie   RENAME COLUMN equivalence_garantie_id        TO id_equivalence_garantie;
ALTER TABLE tarification.formule_garantie                     RENAME COLUMN formule_id                     TO id_formule;
ALTER TABLE tarification.franchise_application                RENAME COLUMN acte_reglementaire_id          TO id_acte_reglementaire;
ALTER TABLE tarification.garantie                             RENAME COLUMN acte_reglementaire_id          TO id_acte_reglementaire;
ALTER TABLE tarification.garantie                             RENAME COLUMN branche_id                     TO id_branche;
ALTER TABLE tarification.genre                                RENAME COLUMN branche_id                     TO id_branche;
ALTER TABLE tarification.majoration_reduction                 RENAME COLUMN acte_reglementaire_id          TO id_acte_reglementaire;
ALTER TABLE tarification.offre_commerciale                    RENAME COLUMN equivalence_garantie_id        TO id_equivalence_garantie;
ALTER TABLE tarification.police_cotation                      RENAME COLUMN flotte_id                      TO id_flotte;
ALTER TABLE tarification.police_cotation                      RENAME COLUMN tarif_id                       TO id_tarif;
ALTER TABLE tarification.prime_element                        RENAME COLUMN base_calcul_element_id         TO id_base_calcul_element;
ALTER TABLE tarification.prime_element                        RENAME COLUMN derogation_id                  TO id_derogation;
ALTER TABLE tarification.prime_element                        RENAME COLUMN flotte_id                      TO id_flotte;
ALTER TABLE tarification.prime_element                        RENAME COLUMN police_cotation_id             TO id_police_cotation;
ALTER TABLE tarification.prime_element                        RENAME COLUMN regle_reduction_franchise_id   TO id_regle_reduction_franchise;
ALTER TABLE tarification.produit                              RENAME COLUMN branche_id                     TO id_branche;
ALTER TABLE tarification.regles_reduction_franchise           RENAME COLUMN acte_reglementaire_id          TO id_acte_reglementaire;
ALTER TABLE tarification.tarif                                RENAME COLUMN acte_reglementaire_id          TO id_acte_reglementaire;
ALTER TABLE tarification.tarif                                RENAME COLUMN regle_calcul_id                TO id_regle_calcul;
ALTER TABLE tarification.taux_fiscalite                       RENAME COLUMN acte_reglementaire_id          TO id_acte_reglementaire;

\echo '--- 2. Réécriture des 5 fonctions (seules les références aux colonnes changent) ---'
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
      JOIN bareme_tranche bt ON bt.id_tarif = t.id
     WHERE t.garantie_code = p_sous_garantie_code
       AND t.id_compagnie = p_id_compagnie
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
 RETURNS TABLE(prime_base numeric, surprime_matiere_inflam numeric, prime_totale numeric, tarif_id integer, bareme_id_base integer, bareme_id_surprime integer, source_page integer, force_fiscale_utilisee integer, cylindree_utilisee character varying, avertissements text[])
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
    v_base_tarif_id     INT;
    v_base_bareme_id    INT;
    v_base_montant      NUMERIC(14,2);
    v_base_source_page  INT;
    v_surprime_bareme_id INT;
    v_surprime_montant   NUMERIC(14,2);
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

    SELECT
        t.id, bt.id,
        CASE WHEN p_avec_remorque THEN bt.prime_avec_remorque
             ELSE COALESCE(bt.prime_sans_remorque, bt.prime_unique) END,
        bt.source_page,
        CASE WHEN p_matiere_inflammable THEN bt.surprime_matiere_inflammable END
      INTO v_base_tarif_id, v_base_bareme_id, v_base_montant, v_base_source_page, v_surprime_montant
      FROM tarif t
      JOIN bareme_tranche bt ON bt.id_tarif = t.id
     WHERE t.categorie_code = p_categorie_code
       AND t.garantie_code = 'AUTO_RC__RESPONSABILITE_CIVILE_STRICTE'
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
     ) DESC, bt.id
     LIMIT 1;

    IF v_base_montant IS NULL AND p_categorie_code = '04B'
       AND p_nombre_places IS NOT NULL AND p_nombre_places > 40 THEN
        SELECT t.id, bt.id, COALESCE(bt.prime_sans_remorque, bt.prime_unique), bt.source_page
          INTO v_base_tarif_id, v_base_bareme_id, v_base_montant, v_base_source_page
          FROM tarif t
          JOIN bareme_tranche bt ON bt.id_tarif = t.id
         WHERE t.categorie_code = '04B'
           AND t.garantie_code = 'AUTO_RC__RESPONSABILITE_CIVILE_STRICTE'
           AND t.statut = 'ACTIF'
           AND (v_force_fiscale IS NOT NULL
                AND v_force_fiscale BETWEEN bt.borne_min AND COALESCE(bt.borne_max, v_force_fiscale))
           AND (bt.criteres->>'nombre_places')::INT = 40
         ORDER BY bt.id
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
        v_base_tarif_id,
        v_base_bareme_id,
        v_surprime_bareme_id,
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
      FROM police_cotation WHERE id = NEW.id_police_cotation;

    SELECT taux_min_pct, taux_max_pct
      INTO v_taux_min, v_taux_max
      FROM regles_reduction_franchise
     WHERE id = NEW.id_regle_reduction_franchise
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
        SELECT id INTO v_derogation_id
          FROM derogation
         WHERE cible_table = 'regles_reduction_franchise'
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
          FROM equivalence_garantie eg WHERE eg.id = NEW.id_equivalence_garantie;
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

CREATE OR REPLACE FUNCTION tarification.fn_sync_categorie_depuis_site()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'tarification', 'pg_catalog'
AS $function$
DECLARE
    v_prefixe        VARCHAR(20);
    v_id_categorie   INT;
BEGIN
    INSERT INTO branche_categorie
        (categorie_code, branche_code, branche_libelle, categorie_libelle, description)
    VALUES
        (NEW.code, 'AUTOMOBILE', 'Automobile', NEW.designation, NEW.groupe)
    ON CONFLICT (categorie_code) DO UPDATE
        SET categorie_libelle = EXCLUDED.categorie_libelle,
            description       = EXCLUDED.description;

    v_prefixe := substring(NEW.code FROM '^[0-9]+');

    IF v_prefixe IS NOT NULL THEN
        SELECT id_categorie INTO v_id_categorie
          FROM categorie WHERE code_categorie = v_prefixe;

        IF NOT FOUND THEN
            INSERT INTO categorie (id_branche, code_categorie, libelle)
            VALUES (
                (SELECT id_branche FROM branche WHERE code_branche = 'AUTOMOBILE'),
                v_prefixe,
                'Catégorie ' || v_prefixe || ' (libellé provisoire — à affiner)'
            )
            RETURNING id_categorie INTO v_id_categorie;
        END IF;

        INSERT INTO sous_categorie (id_categorie, code_sous_categorie, libelle)
        VALUES (v_id_categorie, NEW.code, NEW.designation)
        ON CONFLICT (code_sous_categorie) DO UPDATE
            SET libelle = EXCLUDED.libelle,
                id_categorie = EXCLUDED.id_categorie;
    ELSE
        RAISE NOTICE 'fn_sync_categorie_depuis_site : code "%" sans préfixe numérique, non rattaché automatiquement.', NEW.code;
    END IF;

    RETURN NEW;
END;
$function$;

\echo '--- 3. Audit de contrôle : doit renvoyer 0 ligne ---'
WITH cols(old_name) AS (VALUES
  ('acte_abroge_id'),('tarif_id'),('branche_id'),('partenaire_id'),
  ('cible_id'),('police_cotation_id'),('compagnie_id'),
  ('equivalence_garantie_id'),('formule_id'),('acte_reglementaire_id'),
  ('flotte_id'),('base_calcul_element_id'),('derogation_id'),
  ('regle_reduction_franchise_id'),('regle_calcul_id')
)
SELECT c.old_name, n.nspname AS schema, p.proname AS fonction
FROM cols c
JOIN pg_proc p      ON p.prosrc ~ ('\m' || c.old_name || '\M')
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname NOT IN ('pg_catalog','information_schema')
ORDER BY 1,2,3;

DO $a$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n
    FROM information_schema.columns c
    JOIN pg_class k ON k.relname = c.table_name AND k.relnamespace = 'tarification'::regnamespace AND k.relkind = 'r'
   WHERE c.table_schema = 'tarification' AND c.column_name ~ '_id$';
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  % colonne(s) *_id subsistent dans les tables', n; END IF;
  RAISE NOTICE '[OK]     Plus aucune colonne *_id dans les tables du schéma';
END $a$;

\echo '--- 4. Non-régression des moteurs de calcul (avant = après) ---'
CREATE TEMP TABLE _t_apres AS
SELECT 'RC_principal'::text AS test, f.prime_base, f.prime_totale, f.tarif_id, f.bareme_id_base, f.avertissements::text AS avert
  FROM _t_params p, tarification.fn_calculer_prime_rc_automobile(p_categorie_code => p.rc_cat, p_zone => p.rc_zone, p_force_fiscale => p.rc_ff) f
 WHERE p.rc_cat IS NOT NULL
UNION ALL
SELECT 'RC_extrapolation_04B', f.prime_base, f.prime_totale, f.tarif_id, f.bareme_id_base, f.avertissements::text
  FROM _t_params p, tarification.fn_calculer_prime_rc_automobile(p_categorie_code => '04B', p_zone => p.b_zone, p_force_fiscale => p.b_ff, p_nombre_places => 45) f
 WHERE p.b_ff IS NOT NULL
UNION ALL
SELECT 'Garantie_dependante', f.prime_calculee, f.taux_applique, f.id_sous_garantie_base, NULL, f.avertissements::text
  FROM _t_params p, tarification.fn_calculer_prime_garantie_dependante(p.gd_code, p.gd_cie, p.gd_cat, 100000) f
 WHERE p.gd_code IS NOT NULL;

SELECT 'avant' AS cote, * FROM _t_avant
UNION ALL
SELECT 'après', * FROM _t_apres
ORDER BY test, cote DESC;

DO $c$
DECLARE n_diff int; n_tests int;
BEGIN
  SELECT count(*) INTO n_tests FROM _t_avant;
  SELECT count(*) INTO n_diff FROM ((SELECT * FROM _t_avant EXCEPT SELECT * FROM _t_apres)
                                    UNION ALL (SELECT * FROM _t_apres EXCEPT SELECT * FROM _t_avant)) d;
  IF n_diff > 0 THEN RAISE EXCEPTION '[ÉCHEC]  % écart(s) entre avant et après', n_diff; END IF;
  RAISE NOTICE '[OK]     % appel(s) de calcul identiques avant et après', n_tests;
END $c$;

\echo '--- 5. Tests des 3 triggers (chaque test est annulé, rien n est écrit) ---'
DO $t$
BEGIN
  BEGIN
    INSERT INTO site.usages_categories (code, designation, groupe)
    VALUES ('999ZZTEST', 'Test renommage FK', 'TEST');
    RAISE EXCEPTION 'TEST_OK';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'TEST_OK' THEN
      RAISE NOTICE '[OK]     fn_sync_categorie_depuis_site : trigger exécuté sans erreur';
    ELSIF SQLERRM ~ '\m(acte_abroge_id|tarif_id|branche_id|partenaire_id|cible_id|police_cotation_id|compagnie_id|equivalence_garantie_id|formule_id|acte_reglementaire_id|flotte_id|base_calcul_element_id|derogation_id|regle_reduction_franchise_id|regle_calcul_id)\M' THEN
      RAISE EXCEPTION '[ÉCHEC]  fn_sync_categorie_depuis_site : %', SQLERRM;
    ELSE
      RAISE NOTICE '[OK ?]   fn_sync_categorie_depuis_site : arrêt sur une autre cause, sans rapport avec le renommage → %', SQLERRM;
    END IF;
  END;
END $t$;

DO $t$
BEGIN
  BEGIN
    UPDATE tarification.offre_commerciale
       SET code = NULL, id_equivalence_garantie = id_equivalence_garantie
     WHERE ctid = (SELECT ctid FROM tarification.offre_commerciale
                    WHERE id_equivalence_garantie IS NOT NULL LIMIT 1);
    IF NOT FOUND THEN RAISE EXCEPTION 'aucune offre avec id_equivalence_garantie pour tester'; END IF;
    RAISE EXCEPTION 'TEST_OK';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'TEST_OK' THEN
      RAISE NOTICE '[OK]     fn_generer_code_offre_commerciale : trigger exécuté sans erreur';
    ELSIF SQLERRM ~ '\m(acte_abroge_id|tarif_id|branche_id|partenaire_id|cible_id|police_cotation_id|compagnie_id|equivalence_garantie_id|formule_id|acte_reglementaire_id|flotte_id|base_calcul_element_id|derogation_id|regle_reduction_franchise_id|regle_calcul_id)\M' THEN
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
    VALUES (-1, -1, 1);
    RAISE EXCEPTION 'TEST_OK';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'TEST_OK' THEN
      RAISE NOTICE '[OK]     fn_controle_plafond_reduction_franchise : trigger exécuté sans erreur';
    ELSIF SQLERRM ~ '\m(acte_abroge_id|tarif_id|branche_id|partenaire_id|cible_id|police_cotation_id|compagnie_id|equivalence_garantie_id|formule_id|acte_reglementaire_id|flotte_id|base_calcul_element_id|derogation_id|regle_reduction_franchise_id|regle_calcul_id)\M' THEN
      RAISE EXCEPTION '[ÉCHEC]  fn_controle_plafond_reduction_franchise : %', SQLERRM;
    ELSE
      RAISE NOTICE '[OK ?]   fn_controle_plafond_reduction_franchise : arrêt sur une autre cause, sans rapport avec le renommage → %', SQLERRM;
    END IF;
  END;
END $t$;

\echo '--- 6. Fin ---'
\if :commit
  COMMIT;
  \echo '>>> VALIDÉ : renommage appliqué.'
\else
  ROLLBACK;
  \echo '>>> ESSAI À BLANC : tout a été annulé. Relancer avec -v commit=true pour appliquer.'
\endif

-- Décision en attente (non exécutée) : aligner la vue de compatibilité ?
-- ALTER VIEW tarification.compagnies RENAME COLUMN partenaire_id TO id_partenaire;
