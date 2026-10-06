--
-- PostgreSQL database dump
--

\restrict m2NM6AX5MXwKVel4YBDKVYbOx3WC4q74mE7t7G7X3tmJjK3wAHf0V2eQZdqXItQ

-- Dumped from database version 17.11 (Debian 17.11-0+deb13u1)
-- Dumped by pg_dump version 17.11 (Debian 17.11-0+deb13u1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: tarification; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA tarification;


ALTER SCHEMA tarification OWNER TO postgres;

--
-- Name: fn_accessoires(integer, character varying, character varying, numeric, date, date, date); Type: FUNCTION; Schema: tarification; Owner: postgres
--

CREATE FUNCTION tarification.fn_accessoires(p_id_compagnie integer, p_code_branche character varying, p_code_categorie character varying, p_prime_nette numeric, p_date_effet date, p_date_echeance date, p_date_reference date) RETURNS TABLE(montant numeric, origine text, id_ligne integer, detail text)
    LANGUAGE sql STABLE
    AS $$
    WITH categories AS (
        SELECT p_code_categorie AS c WHERE p_code_categorie IS NOT NULL
        UNION
        SELECT categorie_code_tarif_reel FROM tarification.branche_categorie
         WHERE categorie_code = p_code_categorie AND categorie_code_tarif_reel IS NOT NULL
    ), choix AS (
        SELECT b.* FROM tarification.bareme_accessoire b
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
                  b.id
         LIMIT 1
    )
    SELECT montant, 'bareme', id, risque_source || ' — ' || palier_source || ' — ' || duree_source FROM choix
    UNION ALL
    SELECT c.accessoires_par_defaut, 'defaut_compagnie', NULL, 'montant par défaut de la compagnie'
      FROM tarification.compagnie c
     WHERE c.id_compagnie = p_id_compagnie AND NOT EXISTS (SELECT 1 FROM choix)
$$;


ALTER FUNCTION tarification.fn_accessoires(p_id_compagnie integer, p_code_branche character varying, p_code_categorie character varying, p_prime_nette numeric, p_date_effet date, p_date_echeance date, p_date_reference date) OWNER TO postgres;

--
-- Name: fn_calculer_prime_garantie_dependante(character varying, integer, character varying, numeric, date); Type: FUNCTION; Schema: tarification; Owner: postgres
--

CREATE FUNCTION tarification.fn_calculer_prime_garantie_dependante(p_sous_garantie_code character varying, p_id_compagnie integer, p_categorie_code character varying, p_prime_garantie_declenchee numeric, p_date_effet date DEFAULT CURRENT_DATE) RETURNS TABLE(prime_calculee numeric, taux_applique numeric, id_sous_garantie_base integer, avertissements text[])
    LANGUAGE plpgsql STABLE
    SET search_path TO 'tarification', 'pg_catalog'
    AS $$
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
      JOIN offre_commerciale oc ON oc.id = t.id_offre_commerciale
      JOIN bareme_tranche bt ON bt.id_tarif = t.id
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
$$;


ALTER FUNCTION tarification.fn_calculer_prime_garantie_dependante(p_sous_garantie_code character varying, p_id_compagnie integer, p_categorie_code character varying, p_prime_garantie_declenchee numeric, p_date_effet date) OWNER TO postgres;

--
-- Name: FUNCTION fn_calculer_prime_garantie_dependante(p_sous_garantie_code character varying, p_id_compagnie integer, p_categorie_code character varying, p_prime_garantie_declenchee numeric, p_date_effet date); Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON FUNCTION tarification.fn_calculer_prime_garantie_dependante(p_sous_garantie_code character varying, p_id_compagnie integer, p_categorie_code character varying, p_prime_garantie_declenchee numeric, p_date_effet date) IS 'V2 (Phase 5, 02/10/2026) : jointure via offre_commerciale_id au lieu de (id_compagnie, garantie_code) directement. Logique inchangee.';


--
-- Name: fn_calculer_prime_rc_automobile(character varying, character, integer, character varying, integer, boolean, boolean, boolean, boolean, character varying, integer, character varying, character varying, character varying, date, character varying); Type: FUNCTION; Schema: tarification; Owner: postgres
--

CREATE FUNCTION tarification.fn_calculer_prime_rc_automobile(p_categorie_code character varying, p_zone character DEFAULT NULL::bpchar, p_force_fiscale integer DEFAULT NULL::integer, p_cylindree_label character varying DEFAULT NULL::character varying, p_nombre_places integer DEFAULT NULL::integer, p_avec_remorque boolean DEFAULT false, p_matiere_inflammable boolean DEFAULT false, p_avec_double_commande boolean DEFAULT NULL::boolean, p_avec_rc_eleves boolean DEFAULT NULL::boolean, p_tonnage_label character varying DEFAULT NULL::character varying, p_nombre_cartes integer DEFAULT NULL::integer, p_rang_vehicule character varying DEFAULT NULL::character varying, p_type_vehicule_base character varying DEFAULT NULL::character varying, p_vin character varying DEFAULT NULL::character varying, p_date_effet date DEFAULT CURRENT_DATE, p_energie character varying DEFAULT 'ESSENCE'::character varying) RETURNS TABLE(prime_base numeric, surprime_matiere_inflam numeric, prime_totale numeric, id_tarif integer, id_bareme_base integer, id_bareme_surprime integer, source_page integer, force_fiscale_utilisee integer, cylindree_utilisee character varying, avertissements text[])
    LANGUAGE plpgsql
    SET search_path TO 'tarification', 'pg_catalog'
    AS $$
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
        t.id, bt.id,
        CASE WHEN p_avec_remorque THEN bt.prime_avec_remorque
             ELSE COALESCE(bt.prime_sans_remorque, bt.prime_unique) END,
        bt.source_page,
        CASE WHEN p_matiere_inflammable THEN bt.surprime_matiere_inflammable END
      INTO v_id_tarif_base, v_id_bareme_base, v_base_montant, v_base_source_page, v_surprime_montant
      FROM tarif t
      JOIN offre_commerciale oc ON oc.id = t.id_offre_commerciale
      JOIN bareme_tranche bt ON bt.id_tarif = t.id
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
     ) DESC, bt.id
     LIMIT 1;

    IF v_base_montant IS NULL AND p_categorie_code = '04B'
       AND p_nombre_places IS NOT NULL AND p_nombre_places > 40 THEN
        SELECT t.id, bt.id, COALESCE(bt.prime_sans_remorque, bt.prime_unique), bt.source_page
          INTO v_id_tarif_base, v_id_bareme_base, v_base_montant, v_base_source_page
          FROM tarif t
          JOIN offre_commerciale oc ON oc.id = t.id_offre_commerciale
          JOIN bareme_tranche bt ON bt.id_tarif = t.id
         WHERE t.categorie_code = '04B'
           AND oc.id_sous_garantie = v_id_sous_garantie_rc
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
        v_id_tarif_base,
        v_id_bareme_base,
        v_id_bareme_surprime,
        v_base_source_page,
        v_force_fiscale,
        v_cylindree_label,
        v_avertissements;
END;
$$;


ALTER FUNCTION tarification.fn_calculer_prime_rc_automobile(p_categorie_code character varying, p_zone character, p_force_fiscale integer, p_cylindree_label character varying, p_nombre_places integer, p_avec_remorque boolean, p_matiere_inflammable boolean, p_avec_double_commande boolean, p_avec_rc_eleves boolean, p_tonnage_label character varying, p_nombre_cartes integer, p_rang_vehicule character varying, p_type_vehicule_base character varying, p_vin character varying, p_date_effet date, p_energie character varying) OWNER TO postgres;

--
-- Name: fn_controle_plafond_reduction_franchise(); Type: FUNCTION; Schema: tarification; Owner: postgres
--

CREATE FUNCTION tarification.fn_controle_plafond_reduction_franchise() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'tarification', 'pg_catalog'
    AS $$
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
$$;


ALTER FUNCTION tarification.fn_controle_plafond_reduction_franchise() OWNER TO postgres;

--
-- Name: fn_detecter_ecart_genre(); Type: FUNCTION; Schema: tarification; Owner: postgres
--

CREATE FUNCTION tarification.fn_detecter_ecart_genre() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_trouve BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM genre WHERE lower(libelle) = lower(NEW.genre_canonique)
    ) INTO v_trouve;

    IF NOT v_trouve THEN
        INSERT INTO genre_en_attente_validation (genre_canonique_site, carrosserie_origine)
        VALUES (NEW.genre_canonique, NEW.nom)
        ON CONFLICT (genre_canonique_site) DO NOTHING;

        RAISE NOTICE 'Genre "%" (carrosserie "%") absent de tarification.genre — mis en attente de validation, PAS créé automatiquement.',
            NEW.genre_canonique, NEW.nom;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION tarification.fn_detecter_ecart_genre() OWNER TO postgres;

--
-- Name: FUNCTION fn_detecter_ecart_genre(); Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON FUNCTION tarification.fn_detecter_ecart_genre() IS 'Ne synchronise jamais automatiquement (sens d''autorité inversé : tarification.genre est la référence). Se contente de signaler tout genre_canonique inconnu, pour décision manuelle.';


--
-- Name: fn_generer_code_franchise(); Type: FUNCTION; Schema: tarification; Owner: postgres
--

CREATE FUNCTION tarification.fn_generer_code_franchise() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'tarification', 'pg_catalog'
    AS $$
BEGIN
    IF NEW.code IS NOT NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.garantie_code IS NULL THEN
        RAISE EXCEPTION 'Impossible de générer le code de la franchise : garantie_code est vide. Associez une sous-garantie avant d''enregistrer.'
            USING ERRCODE = 'FR001';
    END IF;

    IF NEW.taux_franchise IS NULL THEN
        RAISE EXCEPTION 'Impossible de générer le code de la franchise : taux_franchise est vide (garantie=%). Renseignez un taux avant d''enregistrer.', NEW.garantie_code
            USING ERRCODE = 'FR002';
    END IF;

    IF NEW.type_franchise IS NULL THEN
        RAISE EXCEPTION 'Impossible de générer le code de la franchise : type_franchise est vide (garantie=%, taux=%). Choisissez Obligatoire ou Facultative avant d''enregistrer.', NEW.garantie_code, NEW.taux_franchise
            USING ERRCODE = 'FR003';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM sous_garantie WHERE code_sous_garantie = NEW.garantie_code) THEN
        RAISE EXCEPTION 'Impossible de générer le code de la franchise : "%" n''est pas une sous-garantie connue. Vérifiez l''association choisie.', NEW.garantie_code
            USING ERRCODE = 'FR004';
    END IF;

    NEW.code := 'FR_' ||
        CASE NEW.type_franchise WHEN 'OBLIGATOIRE' THEN 'OBL' ELSE 'FAC' END ||
        '_' || NEW.garantie_code ||
        '_' || LPAD(ROUND(NEW.taux_franchise)::TEXT, 2, '0');

    RETURN NEW;
END;
$$;


ALTER FUNCTION tarification.fn_generer_code_franchise() OWNER TO postgres;

--
-- Name: FUNCTION fn_generer_code_franchise(); Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON FUNCTION tarification.fn_generer_code_franchise() IS 'Construit automatiquement franchise.code (FR_OBL|FAC_[sous-garantie]_nn) si NULL à l''insertion. Lève une erreur explicite et son propre code (FR001-FR004) dès qu''un champ requis manque ou qu''une garantie_code invalide est fournie — jamais de code silencieusement incorrect ni de violation de contrainte opaque en aval.';


--
-- Name: fn_generer_code_offre_commerciale(); Type: FUNCTION; Schema: tarification; Owner: postgres
--

CREATE FUNCTION tarification.fn_generer_code_offre_commerciale() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'tarification', 'pg_catalog'
    AS $$
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
$$;


ALTER FUNCTION tarification.fn_generer_code_offre_commerciale() OWNER TO postgres;

--
-- Name: fn_resoudre_tarif_categorie(integer, character varying, character varying, date); Type: FUNCTION; Schema: tarification; Owner: postgres
--

CREATE FUNCTION tarification.fn_resoudre_tarif_categorie(p_id_compagnie integer, p_garantie_code character varying, p_categorie_code character varying, p_date_effet date DEFAULT CURRENT_DATE) RETURNS TABLE(tarif_id integer, categorie_utilisee character varying, est_generique boolean)
    LANGUAGE sql STABLE
    SET search_path TO 'tarification', 'pg_catalog'
    AS $$
    SELECT t.id, t.categorie_code, (t.categorie_code = 'ALL')
      FROM tarif t
     WHERE t.id_compagnie = p_id_compagnie
       AND t.garantie_code = p_garantie_code
       AND (t.categorie_code = p_categorie_code OR t.categorie_code = 'ALL')
       AND t.statut = 'ACTIF'
       AND p_date_effet BETWEEN t.date_debut_validite AND t.date_fin_validite
     ORDER BY (t.categorie_code = p_categorie_code) DESC
     LIMIT 1;
$$;


ALTER FUNCTION tarification.fn_resoudre_tarif_categorie(p_id_compagnie integer, p_garantie_code character varying, p_categorie_code character varying, p_date_effet date) OWNER TO postgres;

--
-- Name: FUNCTION fn_resoudre_tarif_categorie(p_id_compagnie integer, p_garantie_code character varying, p_categorie_code character varying, p_date_effet date); Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON FUNCTION tarification.fn_resoudre_tarif_categorie(p_id_compagnie integer, p_garantie_code character varying, p_categorie_code character varying, p_date_effet date) IS 'Résolution "spécifique avant générique" pour une garantie facultative : renvoie la ligne dont categorie_code correspond exactement si elle existe, sinon la ligne ALL (repli universel). est_generique indique laquelle des deux a été retenue. Ne gère pas encore NONE (la dimension catégorie n''a alors aucun sens pour ce tarif — hors périmètre de cette fonction, qui suppose qu''une catégorie réelle est toujours fournie en entrée).';


--
-- Name: fn_sync_categorie_depuis_site(); Type: FUNCTION; Schema: tarification; Owner: postgres
--

CREATE FUNCTION tarification.fn_sync_categorie_depuis_site() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'tarification', 'pg_catalog'
    AS $$
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
$$;


ALTER FUNCTION tarification.fn_sync_categorie_depuis_site() OWNER TO postgres;

--
-- Name: FUNCTION fn_sync_categorie_depuis_site(); Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON FUNCTION tarification.fn_sync_categorie_depuis_site() IS 'Propage toute évolution de site.usages_categories vers branches_categories (legacy) ET categorie/sous_categorie (V2, id/code). Crée automatiquement la Categorie générique parente si elle n''existe pas encore (libellé provisoire à affiner manuellement).';


--
-- Name: fn_sync_categorie_supprimee_depuis_site(); Type: FUNCTION; Schema: tarification; Owner: postgres
--

CREATE FUNCTION tarification.fn_sync_categorie_supprimee_depuis_site() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'tarification', 'pg_catalog'
    AS $$
BEGIN
    DELETE FROM sous_categorie WHERE code_sous_categorie = OLD.code;
    DELETE FROM branche_categorie WHERE categorie_code = OLD.code;
    RETURN OLD;
END;
$$;


ALTER FUNCTION tarification.fn_sync_categorie_supprimee_depuis_site() OWNER TO postgres;

--
-- Name: FUNCTION fn_sync_categorie_supprimee_depuis_site(); Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON FUNCTION tarification.fn_sync_categorie_supprimee_depuis_site() IS 'Propage les suppressions de site.usages_categories vers sous_categorie/branches_categories. Si une vraie donnée commerciale (produit_sous_categorie) référence encore la ligne, la suppression échoue proprement (contrainte FK) plutôt que de supprimer en cascade — comportement voulu, pas un bug.';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: compagnie; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.compagnie (
    id_compagnie integer NOT NULL,
    code_compagnie character varying(30) NOT NULL,
    nom character varying(150) NOT NULL,
    id_partenaire integer,
    numero_agrement character varying(50),
    date_agrement date,
    statut_agrement character varying(20) DEFAULT 'ACTIF'::character varying NOT NULL,
    date_revocation date,
    nom_commercial character varying(150),
    partenaire_site boolean DEFAULT false NOT NULL,
    actif_site boolean DEFAULT true NOT NULL,
    logo_path character varying(200),
    poids_apparition integer DEFAULT 1 NOT NULL,
    ordre_affichage integer DEFAULT 0,
    accessoires_par_defaut numeric(14,0) DEFAULT 2500 NOT NULL,
    CONSTRAINT chk_statut_agrement CHECK (((statut_agrement)::text = ANY ((ARRAY['ACTIF'::character varying, 'SUSPENDU'::character varying, 'REVOQUE'::character varying])::text[]))),
    CONSTRAINT compagnie_accessoires_par_defaut_check CHECK ((accessoires_par_defaut >= (0)::numeric)),
    CONSTRAINT compagnie_partenaire_site_check CHECK (((NOT partenaire_site) OR ((nom_commercial IS NOT NULL) AND (logo_path IS NOT NULL)))),
    CONSTRAINT compagnie_poids_apparition_check CHECK ((poids_apparition >= 0))
);


ALTER TABLE tarification.compagnie OWNER TO postgres;

--
-- Name: COLUMN compagnie.statut_agrement; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON COLUMN tarification.compagnie.statut_agrement IS 'ACTIF = peut être proposée dans une nouvelle cotation. SUSPENDU/REVOQUE = ne doit plus apparaître dans aucune nouvelle Offre, mais l''historique (cotations déjà transmises) reste intact — jamais de suppression rétroactive.';


--
-- Name: acte_reglementaire; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.acte_reglementaire (
    id integer NOT NULL,
    autorite_emettrice character varying(100) NOT NULL,
    type_acte character varying(30) NOT NULL,
    reference character varying(100) NOT NULL,
    date_signature date,
    date_publication date,
    territoire character varying(10) DEFAULT 'CM'::character varying NOT NULL,
    devise character(3) DEFAULT 'XAF'::bpchar NOT NULL,
    id_acte_abroge integer,
    source_document text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_type_acte CHECK (((type_acte)::text = ANY ((ARRAY['ARRETE'::character varying, 'CIRCULAIRE'::character varying, 'BAREME_INTERNE'::character varying, 'CONVENTION'::character varying, 'LOI'::character varying, 'DECRET'::character varying])::text[])))
);


ALTER TABLE tarification.acte_reglementaire OWNER TO postgres;

--
-- Name: TABLE acte_reglementaire; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON TABLE tarification.acte_reglementaire IS 'Textes qui donnent sa légitimité juridique à un tarif. acte_abroge_id trace le versioning réglementaire.';


--
-- Name: actes_reglementaires_id_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.actes_reglementaires_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.actes_reglementaires_id_seq OWNER TO postgres;

--
-- Name: actes_reglementaires_id_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.actes_reglementaires_id_seq OWNED BY tarification.acte_reglementaire.id;


--
-- Name: bareme_accessoire; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.bareme_accessoire (
    id integer NOT NULL,
    id_compagnie integer NOT NULL,
    code_branche character varying(50),
    code_categorie character varying(20),
    risque_source character varying(150) NOT NULL,
    type_palier character varying(10) NOT NULL,
    prime_min numeric(14,0),
    prime_max numeric(14,0),
    palier_source character varying(60) NOT NULL,
    duree_min interval,
    duree_max interval,
    duree_source character varying(40) NOT NULL,
    montant numeric(14,0) NOT NULL,
    actif boolean DEFAULT true NOT NULL,
    date_debut date NOT NULL,
    date_fin date DEFAULT '2099-12-31'::date NOT NULL,
    CONSTRAINT bareme_accessoires_categorie_check CHECK (((code_categorie IS NULL) OR (code_branche IS NOT NULL))),
    CONSTRAINT bareme_accessoires_dates_check CHECK ((date_fin >= date_debut)),
    CONSTRAINT bareme_accessoires_duree_check CHECK (((duree_min IS NULL) OR (duree_max IS NULL) OR (duree_min < duree_max))),
    CONSTRAINT bareme_accessoires_montant_check CHECK ((montant >= (0)::numeric)),
    CONSTRAINT bareme_accessoires_prime_check CHECK (((prime_min IS NULL) OR (prime_max IS NULL) OR (prime_min <= prime_max))),
    CONSTRAINT bareme_accessoires_type_palier_check CHECK (((((type_palier)::text = 'aucun'::text) AND (prime_min IS NULL) AND (prime_max IS NULL)) OR (((type_palier)::text = ANY ((ARRAY['signe'::character varying, 'plage'::character varying])::text[])) AND ((prime_min IS NOT NULL) OR (prime_max IS NOT NULL)))))
);


ALTER TABLE tarification.bareme_accessoire OWNER TO postgres;

--
-- Name: TABLE bareme_accessoire; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON TABLE tarification.bareme_accessoire IS 'Accessoires par compagnie, risque, palier de prime nette et durée (25/09/2026) — lu par tarification.fn_accessoires';


--
-- Name: bareme_accessoires_id_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.bareme_accessoires_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.bareme_accessoires_id_seq OWNER TO postgres;

--
-- Name: bareme_accessoires_id_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.bareme_accessoires_id_seq OWNED BY tarification.bareme_accessoire.id;


--
-- Name: bareme_tranche; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.bareme_tranche (
    id integer NOT NULL,
    id_tarif integer NOT NULL,
    borne_min numeric(16,2),
    borne_max numeric(16,2),
    taux_pct numeric(7,4),
    montant_fixe numeric(14,2),
    criteres jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_page integer,
    note text,
    force_fiscale_min_diesel integer,
    force_fiscale_max_diesel integer,
    cylindree_min integer,
    cylindree_max integer,
    prime_sans_remorque numeric(14,2),
    prime_avec_remorque numeric(14,2),
    prime_unique numeric(14,2),
    surprime_matiere_inflammable numeric(14,2),
    CONSTRAINT chk_borne_tranche CHECK (((borne_max IS NULL) OR (borne_max > borne_min))),
    CONSTRAINT chk_valeur_tranche CHECK (((taux_pct IS NOT NULL) OR (montant_fixe IS NOT NULL) OR (prime_sans_remorque IS NOT NULL) OR (prime_avec_remorque IS NOT NULL) OR (prime_unique IS NOT NULL)))
);


ALTER TABLE tarification.bareme_tranche OWNER TO postgres;

--
-- Name: COLUMN bareme_tranche.force_fiscale_min_diesel; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON COLUMN tarification.bareme_tranche.force_fiscale_min_diesel IS 'Borne Diesel correspondant à force_fiscale_min/max (Essence, colonnes borne_min/borne_max). Correspondance universelle confirmée sur 6 catégories (01,02,03,04C,07,08) : Jusqu''à2/—, 3-6/2-4, 7-10/5-7, 11-14/8-10, 15-23/11-16, 24+/17+. Exception connue : Cat.04B (Diesel "jusqu''à 7" au lieu de "5-7" sur sa tranche la plus basse).';


--
-- Name: baremes_tranches_id_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.baremes_tranches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.baremes_tranches_id_seq OWNER TO postgres;

--
-- Name: baremes_tranches_id_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.baremes_tranches_id_seq OWNED BY tarification.bareme_tranche.id;


--
-- Name: branche; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.branche (
    id_branche integer NOT NULL,
    code_branche character varying(50) NOT NULL,
    libelle character varying(150) NOT NULL
);


ALTER TABLE tarification.branche OWNER TO postgres;

--
-- Name: branche_categorie; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.branche_categorie (
    categorie_code character varying(20) NOT NULL,
    branche_code character varying(20) NOT NULL,
    branche_libelle character varying(100) NOT NULL,
    categorie_libelle character varying(150) NOT NULL,
    description text,
    groupe_categorie character varying(10),
    categorie_code_tarif_reel character varying(20)
);


ALTER TABLE tarification.branche_categorie OWNER TO postgres;

--
-- Name: TABLE branche_categorie; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON TABLE tarification.branche_categorie IS 'Périmètre d''application (branche + catégorie). categorie_code aligné sur site.usages_categories.code via synchronisation (voir Partie 3).';


--
-- Name: COLUMN branche_categorie.groupe_categorie; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON COLUMN tarification.branche_categorie.groupe_categorie IS 'Regroupement informatif des sous-catégories réelles partageant une même famille tarifaire dans l''arrêté (ex: 04A/04B/04C -> groupe "04"). Purement documentaire, aucune ligne "04" seule n''existe dans site.usages_categories.';


--
-- Name: COLUMN branche_categorie.categorie_code_tarif_reel; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON COLUMN tarification.branche_categorie.categorie_code_tarif_reel IS 'Si renseigné : cette catégorie n''a pas de grille tarifaire propre, elle utilise celle de la catégorie référencée. Cas de 05-TRI (Tricycle) : carrosserie/genre au sens du légiste, pas une sous-catégorie tarifaire — partage le barème de 05.';


--
-- Name: branche_id_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.branche_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.branche_id_seq OWNER TO postgres;

--
-- Name: branche_id_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.branche_id_seq OWNED BY tarification.branche.id_branche;


--
-- Name: categorie; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.categorie (
    id_categorie integer NOT NULL,
    id_branche integer NOT NULL,
    code_categorie character varying(20) NOT NULL,
    libelle character varying(150) NOT NULL
);


ALTER TABLE tarification.categorie OWNER TO postgres;

--
-- Name: categorie_id_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.categorie_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.categorie_id_seq OWNER TO postgres;

--
-- Name: categorie_id_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.categorie_id_seq OWNED BY tarification.categorie.id_categorie;


--
-- Name: compagnie_id_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.compagnie_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.compagnie_id_seq OWNER TO postgres;

--
-- Name: compagnie_id_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.compagnie_id_seq OWNED BY tarification.compagnie.id_compagnie;


--
-- Name: compagnies; Type: VIEW; Schema: tarification; Owner: postgres
--

CREATE VIEW tarification.compagnies AS
 SELECT code_compagnie AS compagnie_code,
    nom,
    id_partenaire AS partenaire_id
   FROM tarification.compagnie
  WHERE (id_compagnie > 0);


ALTER VIEW tarification.compagnies OWNER TO postgres;

--
-- Name: VIEW compagnies; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON VIEW tarification.compagnies IS 'Vue de compatibilité (25/09/2026) — ex-table doublon de tarification.compagnie';


--
-- Name: cotation; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.cotation (
    id_cotation bigint NOT NULL,
    id_cotation_session bigint,
    id_produit integer NOT NULL,
    id_sous_categorie integer NOT NULL,
    id_genre integer,
    vin character varying(17),
    criteres jsonb DEFAULT '{}'::jsonb NOT NULL,
    garanties_choisies integer[],
    prime_totale numeric(14,2) NOT NULL,
    detail_calcul jsonb,
    numero_reference character varying(50) NOT NULL,
    statut character varying(20) DEFAULT 'TRANSMIS'::character varying NOT NULL,
    transmis_le timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE tarification.cotation OWNER TO postgres;

--
-- Name: TABLE cotation; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON TABLE tarification.cotation IS 'Devis transmis, archivé de façon permanente. numero_reference : référence lisible à donner au client. statut : TRANSMIS / EN_TRAITEMENT / VALIDE / EXPIRE — valeurs à confirmer selon le workflow métier réel.';


--
-- Name: cotation_id_cotation_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.cotation_id_cotation_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.cotation_id_cotation_seq OWNER TO postgres;

--
-- Name: cotation_id_cotation_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.cotation_id_cotation_seq OWNED BY tarification.cotation.id_cotation;


--
-- Name: cotation_session; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.cotation_session (
    id_cotation_session bigint NOT NULL,
    jeton_session character varying(100) NOT NULL,
    id_produit integer,
    id_sous_categorie integer,
    id_genre integer,
    vin character varying(17),
    criteres jsonb DEFAULT '{}'::jsonb NOT NULL,
    garanties_choisies integer[],
    prime_calculee numeric(14,2),
    detail_calcul jsonb,
    cree_le timestamp without time zone DEFAULT now() NOT NULL,
    modifie_le timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE tarification.cotation_session OWNER TO postgres;

--
-- Name: TABLE cotation_session; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON TABLE tarification.cotation_session IS 'Devis en cours de composition, avant transmission par le client. Pas de sentinelle 0 (table de faits, pas de référentiel). Structure de premier jet : champs client (identité, contact) volontairement absents, à ajouter une fois le besoin précisé.';


--
-- Name: cotation_session_id_cotation_session_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.cotation_session_id_cotation_session_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.cotation_session_id_cotation_session_seq OWNER TO postgres;

--
-- Name: cotation_session_id_cotation_session_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.cotation_session_id_cotation_session_seq OWNED BY tarification.cotation_session.id_cotation_session;


--
-- Name: derogation; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.derogation (
    id integer NOT NULL,
    reference character varying(50) NOT NULL,
    objet text NOT NULL,
    cible_table character varying(50) NOT NULL,
    id_cible integer NOT NULL,
    portee character varying(15) NOT NULL,
    id_police_cotation integer,
    demandeur character varying(150),
    motif text,
    statut character varying(15) DEFAULT 'EN_ATTENTE'::character varying NOT NULL,
    date_demande date DEFAULT CURRENT_DATE NOT NULL,
    date_decision date,
    decideur character varying(150),
    date_debut_validite date,
    date_fin_validite date,
    note text,
    CONSTRAINT chk_dates_derogation CHECK (((date_fin_validite IS NULL) OR (date_debut_validite IS NULL) OR (date_fin_validite > date_debut_validite))),
    CONSTRAINT chk_portee_derogation CHECK (((portee)::text = ANY ((ARRAY['SYSTEMATIQUE'::character varying, 'PONCTUELLE'::character varying])::text[]))),
    CONSTRAINT chk_portee_ponctuelle CHECK ((((portee)::text = 'SYSTEMATIQUE'::text) OR (id_police_cotation IS NOT NULL))),
    CONSTRAINT chk_statut_derogation CHECK (((statut)::text = ANY ((ARRAY['EN_ATTENTE'::character varying, 'ACCORD'::character varying, 'REFUS'::character varying])::text[])))
);


ALTER TABLE tarification.derogation OWNER TO postgres;

--
-- Name: TABLE derogation; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON TABLE tarification.derogation IS 'Mécanisme générique de dérogation (cible_table/cible_id, pas de FK réelle — contrôle applicatif assumé, cf. décision du 16/08/2026). portee=SYSTEMATIQUE couvre toute ligne future référençant cible_id ; PONCTUELLE ne couvre qu''une police.';


--
-- Name: derogations_id_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.derogations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.derogations_id_seq OWNER TO postgres;

--
-- Name: derogations_id_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.derogations_id_seq OWNED BY tarification.derogation.id;


--
-- Name: detail_offre; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.detail_offre (
    id_detail_offre integer NOT NULL,
    id_offre integer NOT NULL,
    id_sous_garantie integer NOT NULL,
    denomination character varying(200),
    actif boolean DEFAULT true NOT NULL,
    date_debut_validite date DEFAULT '2000-01-01'::date NOT NULL,
    date_fin_validite date DEFAULT '2099-12-31'::date NOT NULL,
    CONSTRAINT chk_dates_detail_offre CHECK (((date_fin_validite IS NULL) OR (date_fin_validite > date_debut_validite)))
);


ALTER TABLE tarification.detail_offre OWNER TO postgres;

--
-- Name: detail_offre_id_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.detail_offre_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.detail_offre_id_seq OWNER TO postgres;

--
-- Name: detail_offre_id_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.detail_offre_id_seq OWNED BY tarification.detail_offre.id_detail_offre;


--
-- Name: equivalence_garantie; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.equivalence_garantie (
    id integer NOT NULL,
    garantie_code character varying(150) NOT NULL,
    id_compagnie integer,
    denomination character varying(200) NOT NULL,
    id_garantie integer,
    actif boolean DEFAULT true NOT NULL,
    date_liaison date DEFAULT CURRENT_DATE NOT NULL,
    date_delaison date,
    variante character varying(30),
    note text
);


ALTER TABLE tarification.equivalence_garantie OWNER TO postgres;

--
-- Name: TABLE equivalence_garantie; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON TABLE tarification.equivalence_garantie IS 'Vocabulaire commercial par compagnie pour une garantie technique canonique (ex: "Avance recours" vs "Avance sur recours"). compagnie_id en attente de raccordement.';


--
-- Name: COLUMN equivalence_garantie.actif; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON COLUMN tarification.equivalence_garantie.actif IS 'Lier = actif=true (nouvelle ligne ou reactivation). Delier = actif=false + date_delaison renseignee, JAMAIS de DELETE.';


--
-- Name: COLUMN equivalence_garantie.variante; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON COLUMN tarification.equivalence_garantie.variante IS 'Texte libre (ex: AVEC_FM, SANS_FM) — meme garantie canonique, contenu de couverture different. NULL si la garantie n''a pas cette distinction.';


--
-- Name: equivalence_garantie_id_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.equivalence_garantie_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.equivalence_garantie_id_seq OWNER TO postgres;

--
-- Name: equivalence_garantie_id_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.equivalence_garantie_id_seq OWNED BY tarification.equivalence_garantie.id;


--
-- Name: equivalence_garantie_sous_garantie; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.equivalence_garantie_sous_garantie (
    id_equivalence_garantie integer NOT NULL,
    id_sous_garantie integer NOT NULL
);


ALTER TABLE tarification.equivalence_garantie_sous_garantie OWNER TO postgres;

--
-- Name: TABLE equivalence_garantie_sous_garantie; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON TABLE tarification.equivalence_garantie_sous_garantie IS 'Composition complete d''une denomination compagnie : quelles sous-garanties elle couvre reellement. Une ligne pour les cas simples (1:1, reprend garantie_code) ; plusieurs pour les bouquets (IPT/IAC/RC) ou aucune sous-garantie seule ne suffit a representer la denomination.';


--
-- Name: flotte; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.flotte (
    id integer NOT NULL,
    souscripteur character varying(200) NOT NULL,
    nombre_vehicules integer NOT NULL,
    date_constitution date DEFAULT CURRENT_DATE NOT NULL,
    CONSTRAINT chk_nombre_vehicules CHECK ((nombre_vehicules >= 2))
);


ALTER TABLE tarification.flotte OWNER TO postgres;

--
-- Name: flottes_id_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.flottes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.flottes_id_seq OWNER TO postgres;

--
-- Name: flottes_id_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.flottes_id_seq OWNED BY tarification.flotte.id;


--
-- Name: formule; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.formule (
    id integer NOT NULL,
    critere_genre character varying(30) NOT NULL,
    critere_age character varying(20),
    numero_formule integer NOT NULL,
    libelle character varying(200)
);


ALTER TABLE tarification.formule OWNER TO postgres;

--
-- Name: formule_categorie_mapping; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.formule_categorie_mapping (
    categorie_code character varying(20),
    critere_genre_formule character varying(30) NOT NULL,
    note text,
    id_sous_categorie integer
);


ALTER TABLE tarification.formule_categorie_mapping OWNER TO postgres;

--
-- Name: formule_garantie; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.formule_garantie (
    id integer NOT NULL,
    id_formule integer NOT NULL,
    garantie_code character varying(150) NOT NULL,
    ordre integer DEFAULT 0,
    id_garantie integer,
    id_sous_garantie integer
);


ALTER TABLE tarification.formule_garantie OWNER TO postgres;

--
-- Name: TABLE formule_garantie; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON TABLE tarification.formule_garantie IS 'garantie_code peut désigner soit une garantie PARENTE (= inclure toutes ses sous-garanties), soit une SOUS-GARANTIE précise (cas Vol : seulement Vol véhicule + Vol Partiel, jamais tout Vol).';


--
-- Name: formule_garanties_id_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.formule_garanties_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.formule_garanties_id_seq OWNER TO postgres;

--
-- Name: formule_garanties_id_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.formule_garanties_id_seq OWNED BY tarification.formule_garantie.id;


--
-- Name: formules_id_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.formules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.formules_id_seq OWNER TO postgres;

--
-- Name: formules_id_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.formules_id_seq OWNED BY tarification.formule.id;


--
-- Name: franchise; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.franchise (
    id_franchise integer NOT NULL,
    code character varying(200) NOT NULL,
    garantie_code character varying(150) NOT NULL,
    libelle character varying(100) NOT NULL,
    taux_franchise numeric(5,2) NOT NULL,
    type_franchise character varying(15) DEFAULT 'OBLIGATOIRE'::character varying NOT NULL,
    date_debut_validite date DEFAULT '2000-01-01'::date NOT NULL,
    date_fin_validite date DEFAULT '2099-12-31'::date NOT NULL,
    CONSTRAINT franchise_check CHECK ((date_fin_validite > date_debut_validite)),
    CONSTRAINT franchise_type_franchise_check CHECK (((type_franchise)::text = ANY ((ARRAY['OBLIGATOIRE'::character varying, 'FACULTATIVE'::character varying])::text[])))
);


ALTER TABLE tarification.franchise OWNER TO postgres;

--
-- Name: TABLE franchise; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON TABLE tarification.franchise IS 'Répertoire générique des franchises (taux + garantie + type Obligatoire/Facultative + validité propre), indépendant de la compagnie et de la catégorie. La garantie fait partie de l''identité de la franchise (ex: "10% Dommages" ≠ "10% Tierce Collision") ; seule la catégorie reste un pur contexte d''application.';


--
-- Name: franchise_application; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.franchise_application (
    id integer NOT NULL,
    id_franchise integer NOT NULL,
    id_compagnie integer NOT NULL,
    categorie_code character varying(20) NOT NULL,
    montant_minimum numeric(14,2),
    montant_maximum numeric(14,2),
    reduction_prime_pct numeric(5,2),
    actif boolean DEFAULT true NOT NULL,
    id_acte_reglementaire integer,
    date_debut_validite date DEFAULT '2000-01-01'::date NOT NULL,
    date_fin_validite date DEFAULT '2099-12-31'::date NOT NULL,
    CONSTRAINT franchise_application_check CHECK ((date_fin_validite > date_debut_validite))
);


ALTER TABLE tarification.franchise_application OWNER TO postgres;

--
-- Name: TABLE franchise_application; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON TABLE tarification.franchise_application IS 'Applique une franchise générique (déjà liée à sa garantie) à une compagnie et une catégorie précises, avec ses propres montants min/max et sa propre validité. actif=false = déliée, sans suppression.';


--
-- Name: COLUMN franchise_application.reduction_prime_pct; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON COLUMN tarification.franchise_application.reduction_prime_pct IS 'Réduction de prime accordée pour ce choix de franchise facultative. NULL = non encore connu — à compléter via myspace.html.';


--
-- Name: franchise_application_id_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.franchise_application_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.franchise_application_id_seq OWNER TO postgres;

--
-- Name: franchise_application_id_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.franchise_application_id_seq OWNED BY tarification.franchise_application.id;


--
-- Name: franchise_id_franchise_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.franchise_id_franchise_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.franchise_id_franchise_seq OWNER TO postgres;

--
-- Name: franchise_id_franchise_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.franchise_id_franchise_seq OWNED BY tarification.franchise.id_franchise;


--
-- Name: garantie; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.garantie (
    id_garantie integer NOT NULL,
    id_branche integer NOT NULL,
    code_garantie character varying(150) NOT NULL,
    libelle character varying(200) NOT NULL,
    type_garantie character varying(20) NOT NULL,
    date_debut_validite date DEFAULT '2000-01-01'::date NOT NULL,
    date_fin_validite date DEFAULT '2099-12-31'::date NOT NULL,
    statut character varying(15) DEFAULT 'ACTIF'::character varying NOT NULL,
    id_acte_reglementaire integer,
    CONSTRAINT chk_dates_garantie CHECK (((date_fin_validite IS NULL) OR (date_fin_validite > date_debut_validite))),
    CONSTRAINT chk_statut_garantie CHECK (((statut)::text = ANY ((ARRAY['ACTIF'::character varying, 'INACTIF'::character varying, 'ABROGE'::character varying])::text[])))
);


ALTER TABLE tarification.garantie OWNER TO postgres;

--
-- Name: COLUMN garantie.date_debut_validite; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON COLUMN tarification.garantie.date_debut_validite IS 'Date de première trace en base (18/08/2026), pas nécessairement la date réelle de création de la garantie — aucune source ne documente cette date par garantie individuelle à ce stade.';


--
-- Name: garantie_id_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.garantie_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.garantie_id_seq OWNER TO postgres;

--
-- Name: garantie_id_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.garantie_id_seq OWNED BY tarification.garantie.id_garantie;


--
-- Name: garantie_lien; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.garantie_lien (
    id_lien integer NOT NULL,
    id_sous_garantie_declencheur integer NOT NULL,
    id_sous_garantie_declenchee integer NOT NULL,
    mode character varying(20) DEFAULT 'ADDITIF'::character varying NOT NULL,
    note text,
    CONSTRAINT garantie_liens_mode_check CHECK (((mode)::text = ANY ((ARRAY['ADDITIF'::character varying, 'ASSIETTE'::character varying])::text[])))
);


ALTER TABLE tarification.garantie_lien OWNER TO postgres;

--
-- Name: TABLE garantie_lien; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON TABLE tarification.garantie_lien IS 'Une sous-garantie déclencheur entraîne automatiquement une sous-garantie déclenchée ; la prime totale additionne les deux valeurs stockées. Cas d''usage initial : Vol Partiel/Vol Braquage déclenchent toujours Vol Total (Roger, 30/09/2026).';


--
-- Name: garantie_liens_id_lien_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.garantie_liens_id_lien_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.garantie_liens_id_lien_seq OWNER TO postgres;

--
-- Name: garantie_liens_id_lien_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.garantie_liens_id_lien_seq OWNED BY tarification.garantie_lien.id_lien;


--
-- Name: genre; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.genre (
    id_genre integer NOT NULL,
    id_branche integer NOT NULL,
    code_genre character varying(100) NOT NULL,
    libelle character varying(150) NOT NULL
);


ALTER TABLE tarification.genre OWNER TO postgres;

--
-- Name: genre_en_attente_validation; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.genre_en_attente_validation (
    id integer NOT NULL,
    genre_canonique_site character varying(150) NOT NULL,
    carrosserie_origine character varying(150),
    detecte_le timestamp without time zone DEFAULT now() NOT NULL,
    statut character varying(20) DEFAULT 'EN_ATTENTE'::character varying NOT NULL
);


ALTER TABLE tarification.genre_en_attente_validation OWNER TO postgres;

--
-- Name: TABLE genre_en_attente_validation; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON TABLE tarification.genre_en_attente_validation IS 'Genres observés côté site.carrosseries.genre_canonique sans correspondance dans tarification.genre. File d''attente pour arbitrage manuel — jamais créés automatiquement dans genre, puisque tarification.genre est la référence, pas site.';


--
-- Name: genre_en_attente_validation_id_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.genre_en_attente_validation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.genre_en_attente_validation_id_seq OWNER TO postgres;

--
-- Name: genre_en_attente_validation_id_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.genre_en_attente_validation_id_seq OWNED BY tarification.genre_en_attente_validation.id;


--
-- Name: genre_id_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.genre_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.genre_id_seq OWNER TO postgres;

--
-- Name: genre_id_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.genre_id_seq OWNED BY tarification.genre.id_genre;


--
-- Name: majoration_reduction; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.majoration_reduction (
    id integer NOT NULL,
    id_compagnie integer NOT NULL,
    garantie_code character varying(150) NOT NULL,
    type_ajustement character varying(20) NOT NULL,
    critere character varying(100) NOT NULL,
    description text,
    taux_ajustement numeric(5,2) NOT NULL,
    id_acte_reglementaire integer,
    date_debut_validite date DEFAULT '2000-01-01'::date NOT NULL,
    date_fin_validite date DEFAULT '2099-12-31'::date NOT NULL,
    statut character varying(15) DEFAULT 'ACTIF'::character varying NOT NULL,
    CONSTRAINT majorations_reductions_check CHECK ((date_fin_validite > date_debut_validite)),
    CONSTRAINT majorations_reductions_statut_check CHECK (((statut)::text = ANY ((ARRAY['ACTIF'::character varying, 'INACTIF'::character varying])::text[]))),
    CONSTRAINT majorations_reductions_type_ajustement_check CHECK (((type_ajustement)::text = ANY ((ARRAY['MAJORATION'::character varying, 'REDUCTION'::character varying])::text[])))
);


ALTER TABLE tarification.majoration_reduction OWNER TO postgres;

--
-- Name: TABLE majoration_reduction; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON TABLE tarification.majoration_reduction IS 'Modificateurs multiplicatifs appliqués APRÈS le calcul de base d''une garantie. garantie_code exact uniquement — jamais de motif LIKE, cohérent avec la convention ALL/NONE (une famille de garanties = une ligne par garantie, pas un joker).';


--
-- Name: majorations_reductions_id_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.majorations_reductions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.majorations_reductions_id_seq OWNER TO postgres;

--
-- Name: majorations_reductions_id_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.majorations_reductions_id_seq OWNED BY tarification.majoration_reduction.id;


--
-- Name: offre; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.offre (
    id_offre integer NOT NULL,
    id_produit integer,
    id_compagnie integer,
    id_garantie integer NOT NULL,
    code_offre character varying(80) NOT NULL,
    denomination character varying(200),
    actif boolean DEFAULT true NOT NULL,
    date_debut_validite date DEFAULT '2000-01-01'::date NOT NULL,
    date_fin_validite date DEFAULT '2099-12-31'::date NOT NULL,
    CONSTRAINT chk_dates_offre CHECK (((date_fin_validite IS NULL) OR (date_fin_validite > date_debut_validite)))
);


ALTER TABLE tarification.offre OWNER TO postgres;

--
-- Name: TABLE offre; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON TABLE tarification.offre IS 'id_produit NULL = portée réelle (quelle compagnie, quelles sous-catégories) pas encore résolue via Produit. id_compagnie est une béquille transitoire pour ne pas perdre la donnée déjà migrée depuis offres_commerciales en attendant.';


--
-- Name: offre_commerciale; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.offre_commerciale (
    id integer NOT NULL,
    compagnie_code character varying(30) NOT NULL,
    garantie_code character varying(150) NOT NULL,
    denomination_garantie character varying(200),
    sous_garantie_code character varying(150) NOT NULL,
    denomination_sous_garantie character varying(200),
    id_compagnie integer,
    id_garantie integer,
    id_sous_garantie integer,
    id_equivalence_garantie integer,
    code character varying(250),
    note text
);


ALTER TABLE tarification.offre_commerciale OWNER TO postgres;

--
-- Name: TABLE offre_commerciale; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON TABLE tarification.offre_commerciale IS 'Une ligne = une sous-garantie que cette compagnie propose réellement, avec sa dénomination commerciale propre. garantie_code est porté en plus de sous_garantie_code par commodité de requête (évite une jointure vers garanties.garantie_parent_code à chaque lecture).';


--
-- Name: COLUMN offre_commerciale.id_equivalence_garantie; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON COLUMN tarification.offre_commerciale.id_equivalence_garantie IS 'Référence vers la vraie dénomination compagnie (equivalence_garantie). NULL pour les garanties-bouquet (IAC/IPT/RC), qui utilisent encore denomination_sous_garantie en texte libre en attendant le chantier Produit/bouquet.';


--
-- Name: COLUMN offre_commerciale.code; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON COLUMN tarification.offre_commerciale.code IS 'Code lisible généré automatiquement (compagnie + dénomination réelle), sur le modèle de franchise.code. Jamais saisi manuellement.';


--
-- Name: offre_id_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.offre_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.offre_id_seq OWNER TO postgres;

--
-- Name: offre_id_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.offre_id_seq OWNED BY tarification.offre.id_offre;


--
-- Name: offres_commerciales_id_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.offres_commerciales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.offres_commerciales_id_seq OWNER TO postgres;

--
-- Name: offres_commerciales_id_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.offres_commerciales_id_seq OWNED BY tarification.offre_commerciale.id;


--
-- Name: police_cotation; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.police_cotation (
    id integer NOT NULL,
    numero_police character varying(50),
    categorie_code character varying(20) NOT NULL,
    id_tarif integer,
    date_effet date NOT NULL,
    date_echeance date,
    duree_garantie_jours integer,
    caracteristiques_objet jsonb DEFAULT '{}'::jsonb NOT NULL,
    caracteristiques_risque jsonb DEFAULT '{}'::jsonb NOT NULL,
    bonus_malus_pct numeric(5,2) DEFAULT 0 NOT NULL,
    id_flotte integer,
    statut character varying(20) DEFAULT 'EN_COURS'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_statut_police CHECK (((statut)::text = ANY ((ARRAY['DEVIS'::character varying, 'EN_COURS'::character varying, 'RESILIE'::character varying, 'ECHU'::character varying])::text[])))
);


ALTER TABLE tarification.police_cotation OWNER TO postgres;

--
-- Name: polices_cotations_id_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.polices_cotations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.polices_cotations_id_seq OWNER TO postgres;

--
-- Name: polices_cotations_id_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.polices_cotations_id_seq OWNED BY tarification.police_cotation.id;


--
-- Name: prime_element; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.prime_element (
    id integer NOT NULL,
    id_police_cotation integer NOT NULL,
    garantie_code character varying(150),
    type_element character varying(30) NOT NULL,
    montant numeric(14,2) NOT NULL,
    taux_applique_pct numeric(6,3),
    ordre_affichage integer DEFAULT 0 NOT NULL,
    id_base_calcul_element integer,
    id_flotte integer,
    id_regle_reduction_franchise integer,
    taux_max_autorise_pct numeric(6,3),
    taux_min_autorise_pct numeric(6,3),
    valeur_bloquante numeric(6,3),
    id_derogation integer,
    id_garantie integer,
    CONSTRAINT chk_type_element CHECK (((type_element)::text = ANY ((ARRAY['PRIME_PURE'::character varying, 'CHARGEMENT_SECURITE'::character varying, 'PRIME_NETTE'::character varying, 'ACCESSOIRES'::character varying, 'TCA'::character varying, 'FGA'::character varying, 'COMMISSION'::character varying, 'BONUS_MALUS'::character varying, 'REDUCTION'::character varying, 'FRANCHISE'::character varying, 'PRIME_TOTALE'::character varying])::text[])))
);


ALTER TABLE tarification.prime_element OWNER TO postgres;

--
-- Name: TABLE prime_element; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON TABLE tarification.prime_element IS 'Décomposition financière de la prime. base_calcul_element_id exprime qu''une ligne dépend du montant d''une autre ligne de la même police (ex: Accessoires = f(Prime Nette)). valeur_bloquante/derogation_id : conformité informative, jamais bloquante (cf. Partie 2, trigger).';


--
-- Name: prime_elements_id_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.prime_elements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.prime_elements_id_seq OWNER TO postgres;

--
-- Name: prime_elements_id_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.prime_elements_id_seq OWNED BY tarification.prime_element.id;


--
-- Name: produit; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.produit (
    id_produit integer NOT NULL,
    id_branche integer NOT NULL,
    id_compagnie integer NOT NULL,
    code_produit character varying(60) NOT NULL,
    libelle character varying(200) NOT NULL,
    segment character varying(20),
    actif boolean DEFAULT true NOT NULL,
    date_debut_validite date DEFAULT '2000-01-01'::date NOT NULL,
    date_fin_validite date DEFAULT '2099-12-31'::date NOT NULL,
    CONSTRAINT chk_dates_produit CHECK (((date_fin_validite IS NULL) OR (date_fin_validite > date_debut_validite)))
);


ALTER TABLE tarification.produit OWNER TO postgres;

--
-- Name: TABLE produit; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON TABLE tarification.produit IS 'branche_id = étiquette principale ; 0 (sentinelle) pour les bundles multibranches (ex: RC Pro & Multirisque) où aucune branche unique ne s''applique — la portée réelle est portée par produit_sous_categorie, pas par cette colonne.';


--
-- Name: produit_id_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.produit_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.produit_id_seq OWNER TO postgres;

--
-- Name: produit_id_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.produit_id_seq OWNED BY tarification.produit.id_produit;


--
-- Name: produit_sous_categorie; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.produit_sous_categorie (
    id_produit integer NOT NULL,
    id_sous_categorie integer NOT NULL
);


ALTER TABLE tarification.produit_sous_categorie OWNER TO postgres;

--
-- Name: ref_base_calcul; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.ref_base_calcul (
    code character varying(30) NOT NULL,
    libelle character varying(150) NOT NULL,
    description text
);


ALTER TABLE tarification.ref_base_calcul OWNER TO postgres;

--
-- Name: regles_calcul; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.regles_calcul (
    id integer NOT NULL,
    code character varying(40) NOT NULL,
    libelle character varying(150) NOT NULL,
    mode_calcul character varying(30) NOT NULL,
    base_calcul_code character varying(30),
    formule text,
    description text,
    CONSTRAINT chk_mode_calcul CHECK (((mode_calcul)::text = ANY ((ARRAY['TAUX_POURCENTAGE'::character varying, 'MONTANT_FORFAITAIRE'::character varying, 'BAREME_TRANCHE'::character varying, 'FONCTION_VALEUR_ASSUREE'::character varying])::text[])))
);


ALTER TABLE tarification.regles_calcul OWNER TO postgres;

--
-- Name: regles_calcul_id_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.regles_calcul_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.regles_calcul_id_seq OWNER TO postgres;

--
-- Name: regles_calcul_id_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.regles_calcul_id_seq OWNED BY tarification.regles_calcul.id;


--
-- Name: regles_reduction_franchise; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.regles_reduction_franchise (
    id integer NOT NULL,
    categorie_code character varying(20),
    garantie_code character varying(150),
    id_acte_reglementaire integer,
    type_regle character varying(20) NOT NULL,
    caractere character varying(20) NOT NULL,
    taux_min_pct numeric(5,2),
    taux_max_pct numeric(5,2),
    montant_min numeric(14,2),
    montant_max numeric(14,2),
    libelle character varying(200),
    note text,
    date_debut_validite date NOT NULL,
    date_fin_validite date DEFAULT '2099-12-31'::date NOT NULL,
    statut character varying(15) DEFAULT 'ACTIF'::character varying NOT NULL,
    id_garantie integer,
    id_sous_categorie integer,
    CONSTRAINT chk_caractere CHECK (((caractere)::text = ANY ((ARRAY['OBLIGATOIRE'::character varying, 'FACULTATIVE'::character varying])::text[]))),
    CONSTRAINT chk_dates_regle CHECK (((date_fin_validite IS NULL) OR (date_fin_validite > date_debut_validite))),
    CONSTRAINT chk_statut_regle CHECK (((statut)::text = ANY ((ARRAY['ACTIF'::character varying, 'INACTIF'::character varying, 'SUSPENDU'::character varying, 'ABROGE'::character varying])::text[]))),
    CONSTRAINT chk_taux_bornes CHECK (((taux_max_pct IS NULL) OR (taux_min_pct IS NULL) OR (taux_max_pct >= taux_min_pct))),
    CONSTRAINT chk_type_regle CHECK (((type_regle)::text = ANY ((ARRAY['REDUCTION'::character varying, 'FRANCHISE'::character varying])::text[])))
);


ALTER TABLE tarification.regles_reduction_franchise OWNER TO postgres;

--
-- Name: TABLE regles_reduction_franchise; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON TABLE tarification.regles_reduction_franchise IS 'Plafonds/planchers réglementaires, datés et versionnés comme un tarif (une règle n''est pas absolue, elle est applicable dans une fenêtre de validité).';


--
-- Name: regles_reduction_franchise_id_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.regles_reduction_franchise_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.regles_reduction_franchise_id_seq OWNER TO postgres;

--
-- Name: regles_reduction_franchise_id_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.regles_reduction_franchise_id_seq OWNED BY tarification.regles_reduction_franchise.id;


--
-- Name: sous_categorie; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.sous_categorie (
    id_sous_categorie integer NOT NULL,
    id_categorie integer NOT NULL,
    code_sous_categorie character varying(20) NOT NULL,
    libelle character varying(150) NOT NULL
);


ALTER TABLE tarification.sous_categorie OWNER TO postgres;

--
-- Name: sous_categorie_id_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.sous_categorie_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.sous_categorie_id_seq OWNER TO postgres;

--
-- Name: sous_categorie_id_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.sous_categorie_id_seq OWNED BY tarification.sous_categorie.id_sous_categorie;


--
-- Name: sous_garantie; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.sous_garantie (
    id_sous_garantie integer NOT NULL,
    id_garantie integer NOT NULL,
    code_sous_garantie character varying(150) NOT NULL,
    libelle character varying(200) NOT NULL,
    id_compagnie integer DEFAULT 0 NOT NULL,
    date_debut_validite date DEFAULT '2000-01-01'::date NOT NULL,
    date_fin_validite date DEFAULT '2099-12-31'::date NOT NULL,
    statut character varying(15) DEFAULT 'ACTIF'::character varying NOT NULL,
    CONSTRAINT chk_dates_sous_garantie CHECK (((date_fin_validite IS NULL) OR (date_fin_validite > date_debut_validite))),
    CONSTRAINT chk_statut_sous_garantie CHECK (((statut)::text = ANY ((ARRAY['ACTIF'::character varying, 'INACTIF'::character varying, 'ABROGE'::character varying])::text[])))
);


ALTER TABLE tarification.sous_garantie OWNER TO postgres;

--
-- Name: COLUMN sous_garantie.id_compagnie; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON COLUMN tarification.sous_garantie.id_compagnie IS 'Même convention que garantie.id_compagnie.';


--
-- Name: sous_garantie_id_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.sous_garantie_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.sous_garantie_id_seq OWNER TO postgres;

--
-- Name: sous_garantie_id_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.sous_garantie_id_seq OWNED BY tarification.sous_garantie.id_sous_garantie;


--
-- Name: tarif; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.tarif (
    id integer NOT NULL,
    id_acte_reglementaire integer NOT NULL,
    categorie_code character varying(20) NOT NULL,
    garantie_code character varying(150),
    id_regle_calcul integer NOT NULL,
    libelle character varying(200),
    date_debut_validite date NOT NULL,
    date_fin_validite date DEFAULT '2099-12-31'::date NOT NULL,
    statut character varying(15) DEFAULT 'ACTIF'::character varying NOT NULL,
    criteres_objet jsonb DEFAULT '{}'::jsonb NOT NULL,
    criteres_risque jsonb DEFAULT '{}'::jsonb NOT NULL,
    prime_minimum numeric(14,2),
    source_page integer,
    note text,
    id_garantie integer,
    id_sous_categorie integer,
    id_compagnie integer DEFAULT 0 NOT NULL,
    id_sous_garantie integer,
    id_offre_commerciale integer,
    CONSTRAINT chk_dates_tarif CHECK (((date_fin_validite IS NULL) OR (date_fin_validite > date_debut_validite))),
    CONSTRAINT chk_statut_tarif CHECK (((statut)::text = ANY ((ARRAY['ACTIF'::character varying, 'INACTIF'::character varying, 'SUSPENDU'::character varying, 'ABROGE'::character varying])::text[])))
);


ALTER TABLE tarification.tarif OWNER TO postgres;

--
-- Name: TABLE tarif; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON TABLE tarification.tarif IS 'Ligne tarifaire active. criteres_objet (Famille D) / criteres_risque (Famille E) en JSONB : une branche future loge ses propres clés sans migration de schéma.';


--
-- Name: COLUMN tarif.id_compagnie; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON COLUMN tarification.tarif.id_compagnie IS '0 = tarif ministériel/homologué, partagé par toutes les compagnies (ex: RC/RTI automobile, arrêté 1994). Un id réel = taux propre à cette compagnie. STATUT MARITIME (FAP Sauf / Tous Risques) EN ATTENTE : rôle du GUCE confirmé comme contrôle de l''obligation d''assurance, pas encore confirmé comme fixation de tarif (Roger, 18/08/2026) — les 891 lignes RC existantes restent à 0 (confirmé), aucune ligne maritime n''est encore concernée puisqu''aucun vrai tarif maritime n''a encore été chargé en base (l''exemple Facultés Maritimes du tout début du projet était illustratif, jamais des données réelles).';


--
-- Name: COLUMN tarif.id_sous_garantie; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON COLUMN tarification.tarif.id_sous_garantie IS 'Optionnel — renseigné quand le tarif se pilote au niveau de la sous-garantie (la prestation), pas de la garantie parente. Ex: Vol Total/Partiel/Braquage, futures RC "Responsabilité civile stricte"/"Recours de tiers Incendie"/"Extension CEMAC", IPT par Décès/Invalidité/Frais médicaux/Frais funéraires, Dommages "Tous risques"/"Tierce collision" (mutuellement exclusives), Bris de glaces/Bris de blocs feux/Brigandage, Incendie/Incendie au garage.';


--
-- Name: tarifs_id_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.tarifs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.tarifs_id_seq OWNER TO postgres;

--
-- Name: tarifs_id_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.tarifs_id_seq OWNED BY tarification.tarif.id;


--
-- Name: taux_fiscalite; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.taux_fiscalite (
    id_taux_fiscalite integer NOT NULL,
    code_taux character varying(30) NOT NULL,
    libelle character varying(150) NOT NULL,
    taux_pct numeric(6,3) NOT NULL,
    date_debut_validite date NOT NULL,
    date_fin_validite date DEFAULT '2099-12-31'::date NOT NULL,
    id_acte_reglementaire integer,
    statut character varying(15) DEFAULT 'ACTIF'::character varying NOT NULL,
    CONSTRAINT chk_dates_taux CHECK (((date_fin_validite IS NULL) OR (date_fin_validite > date_debut_validite))),
    CONSTRAINT chk_statut_taux CHECK (((statut)::text = ANY ((ARRAY['ACTIF'::character varying, 'INACTIF'::character varying, 'ABROGE'::character varying])::text[])))
);


ALTER TABLE tarification.taux_fiscalite OWNER TO postgres;

--
-- Name: TABLE taux_fiscalite; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON TABLE tarification.taux_fiscalite IS 'Taux fiscaux applicables aux primes (TCA, FGA...), versionnés dans le temps. AUCUNE VALEUR RÉELLE peuplée à ce stade — les 8%/1% de l''exemple maritime initial étaient explicitement illustratifs. À compléter avec les taux réels et leur base légale (acte_reglementaire_id) une fois disponibles.';


--
-- Name: taux_fiscalite_id_seq; Type: SEQUENCE; Schema: tarification; Owner: postgres
--

CREATE SEQUENCE tarification.taux_fiscalite_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE tarification.taux_fiscalite_id_seq OWNER TO postgres;

--
-- Name: taux_fiscalite_id_seq; Type: SEQUENCE OWNED BY; Schema: tarification; Owner: postgres
--

ALTER SEQUENCE tarification.taux_fiscalite_id_seq OWNED BY tarification.taux_fiscalite.id_taux_fiscalite;


--
-- Name: tmp_benchmark_meta; Type: TABLE; Schema: tarification; Owner: postgres
--

CREATE TABLE tarification.tmp_benchmark_meta (
    cle character varying(50),
    valeur text
);


ALTER TABLE tarification.tmp_benchmark_meta OWNER TO postgres;

--
-- Name: acte_reglementaire id; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.acte_reglementaire ALTER COLUMN id SET DEFAULT nextval('tarification.actes_reglementaires_id_seq'::regclass);


--
-- Name: bareme_accessoire id; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.bareme_accessoire ALTER COLUMN id SET DEFAULT nextval('tarification.bareme_accessoires_id_seq'::regclass);


--
-- Name: bareme_tranche id; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.bareme_tranche ALTER COLUMN id SET DEFAULT nextval('tarification.baremes_tranches_id_seq'::regclass);


--
-- Name: branche id_branche; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.branche ALTER COLUMN id_branche SET DEFAULT nextval('tarification.branche_id_seq'::regclass);


--
-- Name: categorie id_categorie; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.categorie ALTER COLUMN id_categorie SET DEFAULT nextval('tarification.categorie_id_seq'::regclass);


--
-- Name: compagnie id_compagnie; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.compagnie ALTER COLUMN id_compagnie SET DEFAULT nextval('tarification.compagnie_id_seq'::regclass);


--
-- Name: cotation id_cotation; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.cotation ALTER COLUMN id_cotation SET DEFAULT nextval('tarification.cotation_id_cotation_seq'::regclass);


--
-- Name: cotation_session id_cotation_session; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.cotation_session ALTER COLUMN id_cotation_session SET DEFAULT nextval('tarification.cotation_session_id_cotation_session_seq'::regclass);


--
-- Name: derogation id; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.derogation ALTER COLUMN id SET DEFAULT nextval('tarification.derogations_id_seq'::regclass);


--
-- Name: detail_offre id_detail_offre; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.detail_offre ALTER COLUMN id_detail_offre SET DEFAULT nextval('tarification.detail_offre_id_seq'::regclass);


--
-- Name: equivalence_garantie id; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.equivalence_garantie ALTER COLUMN id SET DEFAULT nextval('tarification.equivalence_garantie_id_seq'::regclass);


--
-- Name: flotte id; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.flotte ALTER COLUMN id SET DEFAULT nextval('tarification.flottes_id_seq'::regclass);


--
-- Name: formule id; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.formule ALTER COLUMN id SET DEFAULT nextval('tarification.formules_id_seq'::regclass);


--
-- Name: formule_garantie id; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.formule_garantie ALTER COLUMN id SET DEFAULT nextval('tarification.formule_garanties_id_seq'::regclass);


--
-- Name: franchise id_franchise; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.franchise ALTER COLUMN id_franchise SET DEFAULT nextval('tarification.franchise_id_franchise_seq'::regclass);


--
-- Name: franchise_application id; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.franchise_application ALTER COLUMN id SET DEFAULT nextval('tarification.franchise_application_id_seq'::regclass);


--
-- Name: garantie id_garantie; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.garantie ALTER COLUMN id_garantie SET DEFAULT nextval('tarification.garantie_id_seq'::regclass);


--
-- Name: garantie_lien id_lien; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.garantie_lien ALTER COLUMN id_lien SET DEFAULT nextval('tarification.garantie_liens_id_lien_seq'::regclass);


--
-- Name: genre id_genre; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.genre ALTER COLUMN id_genre SET DEFAULT nextval('tarification.genre_id_seq'::regclass);


--
-- Name: genre_en_attente_validation id; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.genre_en_attente_validation ALTER COLUMN id SET DEFAULT nextval('tarification.genre_en_attente_validation_id_seq'::regclass);


--
-- Name: majoration_reduction id; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.majoration_reduction ALTER COLUMN id SET DEFAULT nextval('tarification.majorations_reductions_id_seq'::regclass);


--
-- Name: offre id_offre; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.offre ALTER COLUMN id_offre SET DEFAULT nextval('tarification.offre_id_seq'::regclass);


--
-- Name: offre_commerciale id; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.offre_commerciale ALTER COLUMN id SET DEFAULT nextval('tarification.offres_commerciales_id_seq'::regclass);


--
-- Name: police_cotation id; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.police_cotation ALTER COLUMN id SET DEFAULT nextval('tarification.polices_cotations_id_seq'::regclass);


--
-- Name: prime_element id; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.prime_element ALTER COLUMN id SET DEFAULT nextval('tarification.prime_elements_id_seq'::regclass);


--
-- Name: produit id_produit; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.produit ALTER COLUMN id_produit SET DEFAULT nextval('tarification.produit_id_seq'::regclass);


--
-- Name: regles_calcul id; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.regles_calcul ALTER COLUMN id SET DEFAULT nextval('tarification.regles_calcul_id_seq'::regclass);


--
-- Name: regles_reduction_franchise id; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.regles_reduction_franchise ALTER COLUMN id SET DEFAULT nextval('tarification.regles_reduction_franchise_id_seq'::regclass);


--
-- Name: sous_categorie id_sous_categorie; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.sous_categorie ALTER COLUMN id_sous_categorie SET DEFAULT nextval('tarification.sous_categorie_id_seq'::regclass);


--
-- Name: sous_garantie id_sous_garantie; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.sous_garantie ALTER COLUMN id_sous_garantie SET DEFAULT nextval('tarification.sous_garantie_id_seq'::regclass);


--
-- Name: tarif id; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.tarif ALTER COLUMN id SET DEFAULT nextval('tarification.tarifs_id_seq'::regclass);


--
-- Name: taux_fiscalite id_taux_fiscalite; Type: DEFAULT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.taux_fiscalite ALTER COLUMN id_taux_fiscalite SET DEFAULT nextval('tarification.taux_fiscalite_id_seq'::regclass);


--
-- Name: acte_reglementaire actes_reglementaires_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.acte_reglementaire
    ADD CONSTRAINT actes_reglementaires_pkey PRIMARY KEY (id);


--
-- Name: acte_reglementaire actes_reglementaires_reference_key; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.acte_reglementaire
    ADD CONSTRAINT actes_reglementaires_reference_key UNIQUE (reference);


--
-- Name: bareme_accessoire bareme_accessoires_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.bareme_accessoire
    ADD CONSTRAINT bareme_accessoires_pkey PRIMARY KEY (id);


--
-- Name: bareme_tranche baremes_tranches_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.bareme_tranche
    ADD CONSTRAINT baremes_tranches_pkey PRIMARY KEY (id);


--
-- Name: branche branche_code_branche_key; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.branche
    ADD CONSTRAINT branche_code_branche_key UNIQUE (code_branche);


--
-- Name: branche branche_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.branche
    ADD CONSTRAINT branche_pkey PRIMARY KEY (id_branche);


--
-- Name: branche_categorie branches_categories_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.branche_categorie
    ADD CONSTRAINT branches_categories_pkey PRIMARY KEY (categorie_code);


--
-- Name: categorie categorie_code_categorie_key; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.categorie
    ADD CONSTRAINT categorie_code_categorie_key UNIQUE (code_categorie);


--
-- Name: categorie categorie_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.categorie
    ADD CONSTRAINT categorie_pkey PRIMARY KEY (id_categorie);


--
-- Name: compagnie compagnie_code_compagnie_key; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.compagnie
    ADD CONSTRAINT compagnie_code_compagnie_key UNIQUE (code_compagnie);


--
-- Name: compagnie compagnie_nom_commercial_key; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.compagnie
    ADD CONSTRAINT compagnie_nom_commercial_key UNIQUE (nom_commercial);


--
-- Name: compagnie compagnie_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.compagnie
    ADD CONSTRAINT compagnie_pkey PRIMARY KEY (id_compagnie);


--
-- Name: cotation cotation_numero_reference_key; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.cotation
    ADD CONSTRAINT cotation_numero_reference_key UNIQUE (numero_reference);


--
-- Name: cotation cotation_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.cotation
    ADD CONSTRAINT cotation_pkey PRIMARY KEY (id_cotation);


--
-- Name: cotation_session cotation_session_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.cotation_session
    ADD CONSTRAINT cotation_session_pkey PRIMARY KEY (id_cotation_session);


--
-- Name: derogation derogations_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.derogation
    ADD CONSTRAINT derogations_pkey PRIMARY KEY (id);


--
-- Name: derogation derogations_reference_key; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.derogation
    ADD CONSTRAINT derogations_reference_key UNIQUE (reference);


--
-- Name: detail_offre detail_offre_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.detail_offre
    ADD CONSTRAINT detail_offre_pkey PRIMARY KEY (id_detail_offre);


--
-- Name: equivalence_garantie equivalence_garantie_code_compagnie_denomination_key; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.equivalence_garantie
    ADD CONSTRAINT equivalence_garantie_code_compagnie_denomination_key UNIQUE (garantie_code, id_compagnie, denomination);


--
-- Name: equivalence_garantie equivalence_garantie_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.equivalence_garantie
    ADD CONSTRAINT equivalence_garantie_pkey PRIMARY KEY (id);


--
-- Name: equivalence_garantie_sous_garantie equivalence_garantie_sous_garantie_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.equivalence_garantie_sous_garantie
    ADD CONSTRAINT equivalence_garantie_sous_garantie_pkey PRIMARY KEY (id_equivalence_garantie, id_sous_garantie);


--
-- Name: tarif excl_tarif_non_chevauchement_v2; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.tarif
    ADD CONSTRAINT excl_tarif_non_chevauchement_v2 EXCLUDE USING gist (id_offre_commerciale WITH =, COALESCE(categorie_code, ''::character varying) WITH =, daterange(date_debut_validite, date_fin_validite, '[]'::text) WITH &&);


--
-- Name: tarif excl_tarifs_non_chevauchement; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.tarif
    ADD CONSTRAINT excl_tarifs_non_chevauchement EXCLUDE USING gist (id_compagnie WITH =, garantie_code WITH =, COALESCE(categorie_code, ''::character varying) WITH =, daterange(date_debut_validite, date_fin_validite, '[]'::text) WITH &&);


--
-- Name: CONSTRAINT excl_tarifs_non_chevauchement ON tarif; Type: COMMENT; Schema: tarification; Owner: postgres
--

COMMENT ON CONSTRAINT excl_tarifs_non_chevauchement ON tarification.tarif IS 'Empêche deux bordereaux actifs sur les mêmes dates pour un même (compagnie, garantie, catégorie). COALESCE(categorie_code, '''') traite les tarifs sans catégorie (ex: garanties non liées à une catégorie précise) comme un groupe à part cohérent — pas comme des lignes indépendantes qui échapperaient au contrôle.';


--
-- Name: flotte flottes_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.flotte
    ADD CONSTRAINT flottes_pkey PRIMARY KEY (id);


--
-- Name: formule_garantie formule_garanties_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.formule_garantie
    ADD CONSTRAINT formule_garanties_pkey PRIMARY KEY (id);


--
-- Name: formule formules_critere_genre_critere_age_numero_formule_key; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.formule
    ADD CONSTRAINT formules_critere_genre_critere_age_numero_formule_key UNIQUE (critere_genre, critere_age, numero_formule);


--
-- Name: formule formules_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.formule
    ADD CONSTRAINT formules_pkey PRIMARY KEY (id);


--
-- Name: franchise_application franchise_application_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.franchise_application
    ADD CONSTRAINT franchise_application_pkey PRIMARY KEY (id);


--
-- Name: franchise franchise_code_key; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.franchise
    ADD CONSTRAINT franchise_code_key UNIQUE (code);


--
-- Name: franchise franchise_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.franchise
    ADD CONSTRAINT franchise_pkey PRIMARY KEY (id_franchise);


--
-- Name: garantie garantie_code_garantie_key; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.garantie
    ADD CONSTRAINT garantie_code_garantie_key UNIQUE (code_garantie);


--
-- Name: garantie_lien garantie_liens_id_sous_garantie_declencheur_id_sous_garanti_key; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.garantie_lien
    ADD CONSTRAINT garantie_liens_id_sous_garantie_declencheur_id_sous_garanti_key UNIQUE (id_sous_garantie_declencheur, id_sous_garantie_declenchee);


--
-- Name: garantie_lien garantie_liens_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.garantie_lien
    ADD CONSTRAINT garantie_liens_pkey PRIMARY KEY (id_lien);


--
-- Name: garantie garantie_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.garantie
    ADD CONSTRAINT garantie_pkey PRIMARY KEY (id_garantie);


--
-- Name: genre genre_code_genre_key; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.genre
    ADD CONSTRAINT genre_code_genre_key UNIQUE (code_genre);


--
-- Name: genre_en_attente_validation genre_en_attente_validation_genre_canonique_site_key; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.genre_en_attente_validation
    ADD CONSTRAINT genre_en_attente_validation_genre_canonique_site_key UNIQUE (genre_canonique_site);


--
-- Name: genre_en_attente_validation genre_en_attente_validation_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.genre_en_attente_validation
    ADD CONSTRAINT genre_en_attente_validation_pkey PRIMARY KEY (id);


--
-- Name: genre genre_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.genre
    ADD CONSTRAINT genre_pkey PRIMARY KEY (id_genre);


--
-- Name: majoration_reduction majorations_reductions_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.majoration_reduction
    ADD CONSTRAINT majorations_reductions_pkey PRIMARY KEY (id);


--
-- Name: offre offre_code_offre_key; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.offre
    ADD CONSTRAINT offre_code_offre_key UNIQUE (code_offre);


--
-- Name: offre offre_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.offre
    ADD CONSTRAINT offre_pkey PRIMARY KEY (id_offre);


--
-- Name: offre_commerciale offres_commerciales_compagnie_code_sous_garantie_code_key; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.offre_commerciale
    ADD CONSTRAINT offres_commerciales_compagnie_code_sous_garantie_code_key UNIQUE (compagnie_code, sous_garantie_code);


--
-- Name: offre_commerciale offres_commerciales_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.offre_commerciale
    ADD CONSTRAINT offres_commerciales_pkey PRIMARY KEY (id);


--
-- Name: police_cotation polices_cotations_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.police_cotation
    ADD CONSTRAINT polices_cotations_pkey PRIMARY KEY (id);


--
-- Name: prime_element prime_elements_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.prime_element
    ADD CONSTRAINT prime_elements_pkey PRIMARY KEY (id);


--
-- Name: produit produit_code_produit_key; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.produit
    ADD CONSTRAINT produit_code_produit_key UNIQUE (code_produit);


--
-- Name: produit produit_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.produit
    ADD CONSTRAINT produit_pkey PRIMARY KEY (id_produit);


--
-- Name: produit_sous_categorie produit_sous_categorie_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.produit_sous_categorie
    ADD CONSTRAINT produit_sous_categorie_pkey PRIMARY KEY (id_produit, id_sous_categorie);


--
-- Name: ref_base_calcul ref_base_calcul_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.ref_base_calcul
    ADD CONSTRAINT ref_base_calcul_pkey PRIMARY KEY (code);


--
-- Name: regles_calcul regles_calcul_code_key; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.regles_calcul
    ADD CONSTRAINT regles_calcul_code_key UNIQUE (code);


--
-- Name: regles_calcul regles_calcul_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.regles_calcul
    ADD CONSTRAINT regles_calcul_pkey PRIMARY KEY (id);


--
-- Name: regles_reduction_franchise regles_reduction_franchise_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.regles_reduction_franchise
    ADD CONSTRAINT regles_reduction_franchise_pkey PRIMARY KEY (id);


--
-- Name: sous_categorie sous_categorie_code_sous_categorie_key; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.sous_categorie
    ADD CONSTRAINT sous_categorie_code_sous_categorie_key UNIQUE (code_sous_categorie);


--
-- Name: sous_categorie sous_categorie_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.sous_categorie
    ADD CONSTRAINT sous_categorie_pkey PRIMARY KEY (id_sous_categorie);


--
-- Name: sous_garantie sous_garantie_code_sous_garantie_key; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.sous_garantie
    ADD CONSTRAINT sous_garantie_code_sous_garantie_key UNIQUE (code_sous_garantie);


--
-- Name: sous_garantie sous_garantie_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.sous_garantie
    ADD CONSTRAINT sous_garantie_pkey PRIMARY KEY (id_sous_garantie);


--
-- Name: tarif tarifs_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.tarif
    ADD CONSTRAINT tarifs_pkey PRIMARY KEY (id);


--
-- Name: taux_fiscalite taux_fiscalite_pkey; Type: CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.taux_fiscalite
    ADD CONSTRAINT taux_fiscalite_pkey PRIMARY KEY (id_taux_fiscalite);


--
-- Name: idx_bareme_accessoires_compagnie; Type: INDEX; Schema: tarification; Owner: postgres
--

CREATE INDEX idx_bareme_accessoires_compagnie ON tarification.bareme_accessoire USING btree (id_compagnie);


--
-- Name: idx_baremes_criteres; Type: INDEX; Schema: tarification; Owner: postgres
--

CREATE INDEX idx_baremes_criteres ON tarification.bareme_tranche USING gin (criteres);


--
-- Name: idx_baremes_tarif; Type: INDEX; Schema: tarification; Owner: postgres
--

CREATE INDEX idx_baremes_tarif ON tarification.bareme_tranche USING btree (id_tarif);


--
-- Name: idx_cotation_session_jeton; Type: INDEX; Schema: tarification; Owner: postgres
--

CREATE INDEX idx_cotation_session_jeton ON tarification.cotation_session USING btree (jeton_session);


--
-- Name: idx_derogations_cible; Type: INDEX; Schema: tarification; Owner: postgres
--

CREATE INDEX idx_derogations_cible ON tarification.derogation USING btree (cible_table, id_cible);


--
-- Name: idx_derogations_police; Type: INDEX; Schema: tarification; Owner: postgres
--

CREATE INDEX idx_derogations_police ON tarification.derogation USING btree (id_police_cotation);


--
-- Name: idx_polices_caract_objet; Type: INDEX; Schema: tarification; Owner: postgres
--

CREATE INDEX idx_polices_caract_objet ON tarification.police_cotation USING gin (caracteristiques_objet);


--
-- Name: idx_polices_caract_risque; Type: INDEX; Schema: tarification; Owner: postgres
--

CREATE INDEX idx_polices_caract_risque ON tarification.police_cotation USING gin (caracteristiques_risque);


--
-- Name: idx_prime_elements_base_calcul; Type: INDEX; Schema: tarification; Owner: postgres
--

CREATE INDEX idx_prime_elements_base_calcul ON tarification.prime_element USING btree (id_base_calcul_element);


--
-- Name: idx_prime_elements_flotte; Type: INDEX; Schema: tarification; Owner: postgres
--

CREATE INDEX idx_prime_elements_flotte ON tarification.prime_element USING btree (id_flotte);


--
-- Name: idx_prime_elements_police; Type: INDEX; Schema: tarification; Owner: postgres
--

CREATE INDEX idx_prime_elements_police ON tarification.prime_element USING btree (id_police_cotation);


--
-- Name: idx_tarifs_categorie; Type: INDEX; Schema: tarification; Owner: postgres
--

CREATE INDEX idx_tarifs_categorie ON tarification.tarif USING btree (categorie_code);


--
-- Name: idx_tarifs_criteres_objet; Type: INDEX; Schema: tarification; Owner: postgres
--

CREATE INDEX idx_tarifs_criteres_objet ON tarification.tarif USING gin (criteres_objet);


--
-- Name: idx_tarifs_criteres_risque; Type: INDEX; Schema: tarification; Owner: postgres
--

CREATE INDEX idx_tarifs_criteres_risque ON tarification.tarif USING gin (criteres_risque);


--
-- Name: idx_tarifs_validite; Type: INDEX; Schema: tarification; Owner: postgres
--

CREATE INDEX idx_tarifs_validite ON tarification.tarif USING btree (date_debut_validite, date_fin_validite);


--
-- Name: prime_element trg_controle_plafond_reduction_franchise; Type: TRIGGER; Schema: tarification; Owner: postgres
--

CREATE TRIGGER trg_controle_plafond_reduction_franchise BEFORE INSERT OR UPDATE ON tarification.prime_element FOR EACH ROW EXECUTE FUNCTION tarification.fn_controle_plafond_reduction_franchise();


--
-- Name: offre_commerciale trg_generer_code_offre_commerciale; Type: TRIGGER; Schema: tarification; Owner: postgres
--

CREATE TRIGGER trg_generer_code_offre_commerciale BEFORE INSERT ON tarification.offre_commerciale FOR EACH ROW EXECUTE FUNCTION tarification.fn_generer_code_offre_commerciale();


--
-- Name: offre_commerciale trg_generer_code_offre_commerciale_update; Type: TRIGGER; Schema: tarification; Owner: postgres
--

CREATE TRIGGER trg_generer_code_offre_commerciale_update BEFORE UPDATE ON tarification.offre_commerciale FOR EACH ROW EXECUTE FUNCTION tarification.fn_generer_code_offre_commerciale();


--
-- Name: acte_reglementaire acte_reglementaire_id_acte_abroge_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.acte_reglementaire
    ADD CONSTRAINT acte_reglementaire_id_acte_abroge_fkey FOREIGN KEY (id_acte_abroge) REFERENCES tarification.acte_reglementaire(id);


--
-- Name: bareme_accessoire bareme_accessoires_code_branche_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.bareme_accessoire
    ADD CONSTRAINT bareme_accessoires_code_branche_fkey FOREIGN KEY (code_branche) REFERENCES tarification.branche(code_branche);


--
-- Name: bareme_accessoire bareme_accessoires_code_categorie_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.bareme_accessoire
    ADD CONSTRAINT bareme_accessoires_code_categorie_fkey FOREIGN KEY (code_categorie) REFERENCES tarification.branche_categorie(categorie_code);


--
-- Name: bareme_accessoire bareme_accessoires_id_compagnie_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.bareme_accessoire
    ADD CONSTRAINT bareme_accessoires_id_compagnie_fkey FOREIGN KEY (id_compagnie) REFERENCES tarification.compagnie(id_compagnie);


--
-- Name: bareme_tranche bareme_tranche_id_tarif_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.bareme_tranche
    ADD CONSTRAINT bareme_tranche_id_tarif_fkey FOREIGN KEY (id_tarif) REFERENCES tarification.tarif(id) ON DELETE CASCADE;


--
-- Name: branche_categorie branches_categories_categorie_code_tarif_reel_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.branche_categorie
    ADD CONSTRAINT branches_categories_categorie_code_tarif_reel_fkey FOREIGN KEY (categorie_code_tarif_reel) REFERENCES tarification.branche_categorie(categorie_code);


--
-- Name: categorie categorie_id_branche_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.categorie
    ADD CONSTRAINT categorie_id_branche_fkey FOREIGN KEY (id_branche) REFERENCES tarification.branche(id_branche);


--
-- Name: cotation cotation_id_cotation_session_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.cotation
    ADD CONSTRAINT cotation_id_cotation_session_fkey FOREIGN KEY (id_cotation_session) REFERENCES tarification.cotation_session(id_cotation_session);


--
-- Name: cotation cotation_id_genre_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.cotation
    ADD CONSTRAINT cotation_id_genre_fkey FOREIGN KEY (id_genre) REFERENCES tarification.genre(id_genre);


--
-- Name: cotation cotation_id_produit_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.cotation
    ADD CONSTRAINT cotation_id_produit_fkey FOREIGN KEY (id_produit) REFERENCES tarification.produit(id_produit);


--
-- Name: cotation cotation_id_sous_categorie_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.cotation
    ADD CONSTRAINT cotation_id_sous_categorie_fkey FOREIGN KEY (id_sous_categorie) REFERENCES tarification.sous_categorie(id_sous_categorie);


--
-- Name: cotation_session cotation_session_id_genre_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.cotation_session
    ADD CONSTRAINT cotation_session_id_genre_fkey FOREIGN KEY (id_genre) REFERENCES tarification.genre(id_genre);


--
-- Name: cotation_session cotation_session_id_produit_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.cotation_session
    ADD CONSTRAINT cotation_session_id_produit_fkey FOREIGN KEY (id_produit) REFERENCES tarification.produit(id_produit);


--
-- Name: cotation_session cotation_session_id_sous_categorie_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.cotation_session
    ADD CONSTRAINT cotation_session_id_sous_categorie_fkey FOREIGN KEY (id_sous_categorie) REFERENCES tarification.sous_categorie(id_sous_categorie);


--
-- Name: derogation derogation_id_police_cotation_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.derogation
    ADD CONSTRAINT derogation_id_police_cotation_fkey FOREIGN KEY (id_police_cotation) REFERENCES tarification.police_cotation(id);


--
-- Name: detail_offre detail_offre_id_offre_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.detail_offre
    ADD CONSTRAINT detail_offre_id_offre_fkey FOREIGN KEY (id_offre) REFERENCES tarification.offre(id_offre);


--
-- Name: detail_offre detail_offre_id_sous_garantie_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.detail_offre
    ADD CONSTRAINT detail_offre_id_sous_garantie_fkey FOREIGN KEY (id_sous_garantie) REFERENCES tarification.sous_garantie(id_sous_garantie);


--
-- Name: equivalence_garantie equivalence_garantie_id_garantie_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.equivalence_garantie
    ADD CONSTRAINT equivalence_garantie_id_garantie_fkey FOREIGN KEY (id_garantie) REFERENCES tarification.garantie(id_garantie);


--
-- Name: equivalence_garantie_sous_garantie equivalence_garantie_sous_garantie_id_equivalence_garantie_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.equivalence_garantie_sous_garantie
    ADD CONSTRAINT equivalence_garantie_sous_garantie_id_equivalence_garantie_fkey FOREIGN KEY (id_equivalence_garantie) REFERENCES tarification.equivalence_garantie(id) ON DELETE CASCADE;


--
-- Name: equivalence_garantie_sous_garantie equivalence_garantie_sous_garantie_id_sous_garantie_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.equivalence_garantie_sous_garantie
    ADD CONSTRAINT equivalence_garantie_sous_garantie_id_sous_garantie_fkey FOREIGN KEY (id_sous_garantie) REFERENCES tarification.sous_garantie(id_sous_garantie);


--
-- Name: formule_categorie_mapping formule_categorie_mapping_categorie_code_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.formule_categorie_mapping
    ADD CONSTRAINT formule_categorie_mapping_categorie_code_fkey FOREIGN KEY (categorie_code) REFERENCES tarification.branche_categorie(categorie_code);


--
-- Name: formule_categorie_mapping formule_categorie_mapping_id_sous_categorie_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.formule_categorie_mapping
    ADD CONSTRAINT formule_categorie_mapping_id_sous_categorie_fkey FOREIGN KEY (id_sous_categorie) REFERENCES tarification.sous_categorie(id_sous_categorie);


--
-- Name: formule_garantie formule_garantie_id_formule_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.formule_garantie
    ADD CONSTRAINT formule_garantie_id_formule_fkey FOREIGN KEY (id_formule) REFERENCES tarification.formule(id) ON DELETE CASCADE;


--
-- Name: formule_garantie formule_garanties_id_garantie_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.formule_garantie
    ADD CONSTRAINT formule_garanties_id_garantie_fkey FOREIGN KEY (id_garantie) REFERENCES tarification.garantie(id_garantie);


--
-- Name: formule_garantie formule_garanties_id_sous_garantie_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.formule_garantie
    ADD CONSTRAINT formule_garanties_id_sous_garantie_fkey FOREIGN KEY (id_sous_garantie) REFERENCES tarification.sous_garantie(id_sous_garantie);


--
-- Name: franchise_application franchise_application_id_acte_reglementaire_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.franchise_application
    ADD CONSTRAINT franchise_application_id_acte_reglementaire_fkey FOREIGN KEY (id_acte_reglementaire) REFERENCES tarification.acte_reglementaire(id);


--
-- Name: franchise_application franchise_application_id_compagnie_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.franchise_application
    ADD CONSTRAINT franchise_application_id_compagnie_fkey FOREIGN KEY (id_compagnie) REFERENCES tarification.compagnie(id_compagnie);


--
-- Name: franchise_application franchise_application_id_franchise_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.franchise_application
    ADD CONSTRAINT franchise_application_id_franchise_fkey FOREIGN KEY (id_franchise) REFERENCES tarification.franchise(id_franchise);


--
-- Name: franchise franchise_garantie_code_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.franchise
    ADD CONSTRAINT franchise_garantie_code_fkey FOREIGN KEY (garantie_code) REFERENCES tarification.sous_garantie(code_sous_garantie);


--
-- Name: garantie garantie_id_acte_reglementaire_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.garantie
    ADD CONSTRAINT garantie_id_acte_reglementaire_fkey FOREIGN KEY (id_acte_reglementaire) REFERENCES tarification.acte_reglementaire(id);


--
-- Name: garantie garantie_id_branche_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.garantie
    ADD CONSTRAINT garantie_id_branche_fkey FOREIGN KEY (id_branche) REFERENCES tarification.branche(id_branche);


--
-- Name: garantie_lien garantie_liens_id_sous_garantie_declenchee_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.garantie_lien
    ADD CONSTRAINT garantie_liens_id_sous_garantie_declenchee_fkey FOREIGN KEY (id_sous_garantie_declenchee) REFERENCES tarification.sous_garantie(id_sous_garantie);


--
-- Name: garantie_lien garantie_liens_id_sous_garantie_declencheur_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.garantie_lien
    ADD CONSTRAINT garantie_liens_id_sous_garantie_declencheur_fkey FOREIGN KEY (id_sous_garantie_declencheur) REFERENCES tarification.sous_garantie(id_sous_garantie);


--
-- Name: genre genre_id_branche_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.genre
    ADD CONSTRAINT genre_id_branche_fkey FOREIGN KEY (id_branche) REFERENCES tarification.branche(id_branche);


--
-- Name: majoration_reduction majoration_reduction_id_acte_reglementaire_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.majoration_reduction
    ADD CONSTRAINT majoration_reduction_id_acte_reglementaire_fkey FOREIGN KEY (id_acte_reglementaire) REFERENCES tarification.acte_reglementaire(id);


--
-- Name: majoration_reduction majorations_reductions_id_compagnie_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.majoration_reduction
    ADD CONSTRAINT majorations_reductions_id_compagnie_fkey FOREIGN KEY (id_compagnie) REFERENCES tarification.compagnie(id_compagnie);


--
-- Name: offre_commerciale offre_commerciale_id_equivalence_garantie_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.offre_commerciale
    ADD CONSTRAINT offre_commerciale_id_equivalence_garantie_fkey FOREIGN KEY (id_equivalence_garantie) REFERENCES tarification.equivalence_garantie(id);


--
-- Name: offre offre_id_compagnie_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.offre
    ADD CONSTRAINT offre_id_compagnie_fkey FOREIGN KEY (id_compagnie) REFERENCES tarification.compagnie(id_compagnie);


--
-- Name: offre offre_id_garantie_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.offre
    ADD CONSTRAINT offre_id_garantie_fkey FOREIGN KEY (id_garantie) REFERENCES tarification.garantie(id_garantie);


--
-- Name: offre offre_id_produit_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.offre
    ADD CONSTRAINT offre_id_produit_fkey FOREIGN KEY (id_produit) REFERENCES tarification.produit(id_produit);


--
-- Name: offre_commerciale offres_commerciales_compagnie_code_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.offre_commerciale
    ADD CONSTRAINT offres_commerciales_compagnie_code_fkey FOREIGN KEY (compagnie_code) REFERENCES tarification.compagnie(code_compagnie) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: offre_commerciale offres_commerciales_id_compagnie_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.offre_commerciale
    ADD CONSTRAINT offres_commerciales_id_compagnie_fkey FOREIGN KEY (id_compagnie) REFERENCES tarification.compagnie(id_compagnie);


--
-- Name: offre_commerciale offres_commerciales_id_garantie_v2_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.offre_commerciale
    ADD CONSTRAINT offres_commerciales_id_garantie_v2_fkey FOREIGN KEY (id_garantie) REFERENCES tarification.garantie(id_garantie);


--
-- Name: offre_commerciale offres_commerciales_id_sous_garantie_v2_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.offre_commerciale
    ADD CONSTRAINT offres_commerciales_id_sous_garantie_v2_fkey FOREIGN KEY (id_sous_garantie) REFERENCES tarification.sous_garantie(id_sous_garantie);


--
-- Name: police_cotation police_cotation_id_flotte_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.police_cotation
    ADD CONSTRAINT police_cotation_id_flotte_fkey FOREIGN KEY (id_flotte) REFERENCES tarification.flotte(id);


--
-- Name: police_cotation police_cotation_id_tarif_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.police_cotation
    ADD CONSTRAINT police_cotation_id_tarif_fkey FOREIGN KEY (id_tarif) REFERENCES tarification.tarif(id);


--
-- Name: police_cotation polices_cotations_categorie_code_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.police_cotation
    ADD CONSTRAINT polices_cotations_categorie_code_fkey FOREIGN KEY (categorie_code) REFERENCES tarification.branche_categorie(categorie_code);


--
-- Name: prime_element prime_element_id_base_calcul_element_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.prime_element
    ADD CONSTRAINT prime_element_id_base_calcul_element_fkey FOREIGN KEY (id_base_calcul_element) REFERENCES tarification.prime_element(id);


--
-- Name: prime_element prime_element_id_derogation_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.prime_element
    ADD CONSTRAINT prime_element_id_derogation_fkey FOREIGN KEY (id_derogation) REFERENCES tarification.derogation(id);


--
-- Name: prime_element prime_element_id_flotte_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.prime_element
    ADD CONSTRAINT prime_element_id_flotte_fkey FOREIGN KEY (id_flotte) REFERENCES tarification.flotte(id);


--
-- Name: prime_element prime_element_id_police_cotation_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.prime_element
    ADD CONSTRAINT prime_element_id_police_cotation_fkey FOREIGN KEY (id_police_cotation) REFERENCES tarification.police_cotation(id) ON DELETE CASCADE;


--
-- Name: prime_element prime_element_id_regle_reduction_franchise_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.prime_element
    ADD CONSTRAINT prime_element_id_regle_reduction_franchise_fkey FOREIGN KEY (id_regle_reduction_franchise) REFERENCES tarification.regles_reduction_franchise(id);


--
-- Name: prime_element prime_elements_id_garantie_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.prime_element
    ADD CONSTRAINT prime_elements_id_garantie_fkey FOREIGN KEY (id_garantie) REFERENCES tarification.garantie(id_garantie);


--
-- Name: produit produit_id_branche_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.produit
    ADD CONSTRAINT produit_id_branche_fkey FOREIGN KEY (id_branche) REFERENCES tarification.branche(id_branche);


--
-- Name: produit produit_id_compagnie_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.produit
    ADD CONSTRAINT produit_id_compagnie_fkey FOREIGN KEY (id_compagnie) REFERENCES tarification.compagnie(id_compagnie);


--
-- Name: produit_sous_categorie produit_sous_categorie_id_produit_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.produit_sous_categorie
    ADD CONSTRAINT produit_sous_categorie_id_produit_fkey FOREIGN KEY (id_produit) REFERENCES tarification.produit(id_produit);


--
-- Name: produit_sous_categorie produit_sous_categorie_id_sous_categorie_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.produit_sous_categorie
    ADD CONSTRAINT produit_sous_categorie_id_sous_categorie_fkey FOREIGN KEY (id_sous_categorie) REFERENCES tarification.sous_categorie(id_sous_categorie);


--
-- Name: regles_calcul regles_calcul_base_calcul_code_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.regles_calcul
    ADD CONSTRAINT regles_calcul_base_calcul_code_fkey FOREIGN KEY (base_calcul_code) REFERENCES tarification.ref_base_calcul(code);


--
-- Name: regles_reduction_franchise regles_reduction_franchise_categorie_code_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.regles_reduction_franchise
    ADD CONSTRAINT regles_reduction_franchise_categorie_code_fkey FOREIGN KEY (categorie_code) REFERENCES tarification.branche_categorie(categorie_code);


--
-- Name: regles_reduction_franchise regles_reduction_franchise_id_acte_reglementaire_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.regles_reduction_franchise
    ADD CONSTRAINT regles_reduction_franchise_id_acte_reglementaire_fkey FOREIGN KEY (id_acte_reglementaire) REFERENCES tarification.acte_reglementaire(id);


--
-- Name: regles_reduction_franchise regles_reduction_franchise_id_garantie_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.regles_reduction_franchise
    ADD CONSTRAINT regles_reduction_franchise_id_garantie_fkey FOREIGN KEY (id_garantie) REFERENCES tarification.garantie(id_garantie);


--
-- Name: regles_reduction_franchise regles_reduction_franchise_id_sous_categorie_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.regles_reduction_franchise
    ADD CONSTRAINT regles_reduction_franchise_id_sous_categorie_fkey FOREIGN KEY (id_sous_categorie) REFERENCES tarification.sous_categorie(id_sous_categorie);


--
-- Name: sous_categorie sous_categorie_id_categorie_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.sous_categorie
    ADD CONSTRAINT sous_categorie_id_categorie_fkey FOREIGN KEY (id_categorie) REFERENCES tarification.categorie(id_categorie);


--
-- Name: sous_garantie sous_garantie_id_compagnie_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.sous_garantie
    ADD CONSTRAINT sous_garantie_id_compagnie_fkey FOREIGN KEY (id_compagnie) REFERENCES tarification.compagnie(id_compagnie);


--
-- Name: sous_garantie sous_garantie_id_garantie_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.sous_garantie
    ADD CONSTRAINT sous_garantie_id_garantie_fkey FOREIGN KEY (id_garantie) REFERENCES tarification.garantie(id_garantie);


--
-- Name: tarif tarif_id_acte_reglementaire_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.tarif
    ADD CONSTRAINT tarif_id_acte_reglementaire_fkey FOREIGN KEY (id_acte_reglementaire) REFERENCES tarification.acte_reglementaire(id);


--
-- Name: tarif tarif_id_regle_calcul_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.tarif
    ADD CONSTRAINT tarif_id_regle_calcul_fkey FOREIGN KEY (id_regle_calcul) REFERENCES tarification.regles_calcul(id);


--
-- Name: tarif tarif_offre_commerciale_id_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.tarif
    ADD CONSTRAINT tarif_offre_commerciale_id_fkey FOREIGN KEY (id_offre_commerciale) REFERENCES tarification.offre_commerciale(id);


--
-- Name: tarif tarifs_categorie_code_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.tarif
    ADD CONSTRAINT tarifs_categorie_code_fkey FOREIGN KEY (categorie_code) REFERENCES tarification.branche_categorie(categorie_code);


--
-- Name: tarif tarifs_id_compagnie_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.tarif
    ADD CONSTRAINT tarifs_id_compagnie_fkey FOREIGN KEY (id_compagnie) REFERENCES tarification.compagnie(id_compagnie);


--
-- Name: tarif tarifs_id_garantie_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.tarif
    ADD CONSTRAINT tarifs_id_garantie_fkey FOREIGN KEY (id_garantie) REFERENCES tarification.garantie(id_garantie);


--
-- Name: tarif tarifs_id_sous_categorie_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.tarif
    ADD CONSTRAINT tarifs_id_sous_categorie_fkey FOREIGN KEY (id_sous_categorie) REFERENCES tarification.sous_categorie(id_sous_categorie);


--
-- Name: tarif tarifs_id_sous_garantie_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.tarif
    ADD CONSTRAINT tarifs_id_sous_garantie_fkey FOREIGN KEY (id_sous_garantie) REFERENCES tarification.sous_garantie(id_sous_garantie);


--
-- Name: taux_fiscalite taux_fiscalite_id_acte_reglementaire_fkey; Type: FK CONSTRAINT; Schema: tarification; Owner: postgres
--

ALTER TABLE ONLY tarification.taux_fiscalite
    ADD CONSTRAINT taux_fiscalite_id_acte_reglementaire_fkey FOREIGN KEY (id_acte_reglementaire) REFERENCES tarification.acte_reglementaire(id);


--
-- Name: SCHEMA tarification; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA tarification TO mutuellepro;


--
-- Name: FUNCTION fn_accessoires(p_id_compagnie integer, p_code_branche character varying, p_code_categorie character varying, p_prime_nette numeric, p_date_effet date, p_date_echeance date, p_date_reference date); Type: ACL; Schema: tarification; Owner: postgres
--

GRANT ALL ON FUNCTION tarification.fn_accessoires(p_id_compagnie integer, p_code_branche character varying, p_code_categorie character varying, p_prime_nette numeric, p_date_effet date, p_date_echeance date, p_date_reference date) TO mutuellepro;


--
-- Name: TABLE compagnie; Type: ACL; Schema: tarification; Owner: postgres
--

GRANT SELECT ON TABLE tarification.compagnie TO mutuellepro;


--
-- Name: TABLE bareme_accessoire; Type: ACL; Schema: tarification; Owner: postgres
--

GRANT SELECT ON TABLE tarification.bareme_accessoire TO mutuellepro;


--
-- Name: TABLE branche; Type: ACL; Schema: tarification; Owner: postgres
--

GRANT SELECT ON TABLE tarification.branche TO mutuellepro;


--
-- Name: TABLE branche_categorie; Type: ACL; Schema: tarification; Owner: postgres
--

GRANT SELECT ON TABLE tarification.branche_categorie TO mutuellepro;


--
-- Name: TABLE compagnies; Type: ACL; Schema: tarification; Owner: postgres
--

GRANT SELECT ON TABLE tarification.compagnies TO mutuellepro;


--
-- Name: TABLE genre; Type: ACL; Schema: tarification; Owner: postgres
--

GRANT SELECT ON TABLE tarification.genre TO mutuellepro;


--
-- PostgreSQL database dump complete
--

\unrestrict m2NM6AX5MXwKVel4YBDKVYbOx3WC4q74mE7t7G7X3tmJjK3wAHf0V2eQZdqXItQ

