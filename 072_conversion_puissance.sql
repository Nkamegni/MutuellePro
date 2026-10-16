-- =====================================================================
-- Conversion de la puissance (cm³, kW) en CV fiscaux — tables, fonctions, valeurs de la compagnie 0
-- Session Tarification, 15/10/2026. Conception : conception_conversion_puissance_15102026.md (sections 5 à 14).
-- Numéro de migration : à attribuer par la session Git.  PROVISOIRE : jamais exécuté.
-- Avant application : pg_dump du schéma tarification.
--   essai : psql -v ON_ERROR_STOP=1 -v commit=false -d vpiclist -f - < fichier
--   appli : psql -v ON_ERROR_STOP=1 -v commit=true  -d vpiclist -f - < fichier
-- À exécuter avec un rôle propriétaire du schéma tarification (postgres), pas mutuellepro.
-- Les coefficients voitures sont une base approximative de marché (non officielle, marquée « estimée »),
-- à vérifier par Roger. La table moto vient d'AFRINS (+ règle française), non vérifiée dans le texte camerounais.
-- =====================================================================
\if :{?commit}
\else
  \set commit false
\endif
BEGIN;

-- ---------- Garde-fous ----------
DO $$
BEGIN
    IF to_regclass('tarification.regle_conversion_puissance') IS NOT NULL
       OR to_regclass('tarification.tranche_conversion_puissance') IS NOT NULL THEN
        RAISE EXCEPTION 'Les tables de conversion existent déjà : migration déjà appliquée ?';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM tarification.compagnie WHERE id_compagnie = 0) THEN
        RAISE EXCEPTION 'Compagnie 0 introuvable dans tarification.compagnie';
    END IF;
    IF to_regprocedure('tarification.fn_calculer_prime_rc_automobile(character varying,character,integer,character varying,integer,boolean,boolean,boolean,boolean,character varying,integer,character varying,character varying,character varying,date,character varying)') IS NULL
       AND NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                       WHERE n.nspname='tarification' AND p.proname='fn_calculer_prime_rc_automobile') THEN
        RAISE EXCEPTION 'Fonction RC introuvable : état inattendu du schéma tarification';
    END IF;
END $$;

-- ---------- Tables ----------
CREATE TABLE tarification.regle_conversion_puissance (
    id_regle_conversion_puissance integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_compagnie            integer NOT NULL REFERENCES tarification.compagnie(id_compagnie),  -- 0 = règle générique
    cas_conversion          varchar(8),            -- '01','02','03','MOTO' ; NULL = tous
    code_energie            varchar(20),           -- 'ESSENCE','DIESEL' ; NULL = toutes
    code_unite_puissance    varchar(8) NOT NULL CHECK (code_unite_puissance IN ('cm3','kW')),
    mode_conversion         varchar(10) NOT NULL CHECK (mode_conversion IN ('POLYNOME','TRANCHES')),
    coef_a2                 numeric NOT NULL DEFAULT 0,
    coef_a1                 numeric NOT NULL DEFAULT 0,
    coef_a0                 numeric NOT NULL DEFAULT 0,
    diviseur_valeur         numeric NOT NULL DEFAULT 1 CHECK (diviseur_valeur > 0),
    mode_arrondi            varchar(12) NOT NULL DEFAULT 'PLUS_PROCHE'
                            CHECK (mode_arrondi IN ('PLUS_PROCHE','TRONQUE','SUPERIEUR')),
    estimee                 boolean NOT NULL DEFAULT true,
    source                  text NOT NULL,
    note                    text,
    date_debut_validite     date NOT NULL,
    date_fin_validite       date,
    statut                  varchar(10) NOT NULL DEFAULT 'ACTIF' CHECK (statut IN ('ACTIF','INACTIF')),
    CHECK (date_fin_validite IS NULL OR date_fin_validite >= date_debut_validite),
    CHECK (cas_conversion IS NULL OR cas_conversion IN ('01','02','03','MOTO'))
);
CREATE UNIQUE INDEX uq_regle_conversion_puissance_cle
    ON tarification.regle_conversion_puissance
       (id_compagnie, COALESCE(cas_conversion,''), COALESCE(code_energie,''), code_unite_puissance, date_debut_validite);

CREATE TABLE tarification.tranche_conversion_puissance (
    id_tranche_conversion_puissance integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_regle_conversion_puissance   integer NOT NULL
        REFERENCES tarification.regle_conversion_puissance(id_regle_conversion_puissance) ON DELETE CASCADE,
    borne_min     numeric NOT NULL,     -- la tranche s'applique de borne_min jusqu'à la borne_min suivante (exclue)
    cv_resultat   integer NOT NULL,
    pas_valeur    numeric,              -- dernière tranche : +pas_cv par pas_valeur entamé au-delà de borne_min
    pas_cv        integer,
    CHECK ((pas_valeur IS NULL) = (pas_cv IS NULL)),
    UNIQUE (id_regle_conversion_puissance, borne_min)
);

COMMENT ON TABLE tarification.regle_conversion_puissance IS
 'Règles de conversion cm³/kW -> CV fiscaux. Compagnie 0 = règle générique ; la compagnie demandée l''emporte. Les règles voitures sont estimées (non officielles).';

-- ---------- Fonction de conversion ----------
CREATE FUNCTION tarification.fn_convertir_puissance_en_cv(
    p_id_compagnie integer, p_cas_conversion varchar, p_code_energie varchar,
    p_code_unite_puissance varchar, p_valeur numeric, p_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (cv integer, est_estimee boolean, id_compagnie_retenue integer,
               id_regle_retenue integer, avertissement text)
LANGUAGE plpgsql STABLE AS $f$
DECLARE
    r      tarification.regle_conversion_puissance%ROWTYPE;
    t      tarification.tranche_conversion_puissance%ROWTYPE;
    v_x    numeric;
    v_raw  numeric;
    v_cv   numeric;
BEGIN
    IF p_valeur IS NULL OR p_valeur < 0 OR p_code_unite_puissance IS NULL THEN
        RETURN;
    END IF;
    SELECT g.* INTO r
      FROM tarification.regle_conversion_puissance g
     WHERE g.statut = 'ACTIF'
       AND g.id_compagnie IN (COALESCE(p_id_compagnie,0), 0)
       AND g.code_unite_puissance = p_code_unite_puissance
       AND (g.cas_conversion IS NULL OR g.cas_conversion = p_cas_conversion)
       AND (g.code_energie  IS NULL OR g.code_energie  = p_code_energie)
       AND g.date_debut_validite <= p_date
       AND (g.date_fin_validite IS NULL OR g.date_fin_validite >= p_date)
     ORDER BY (g.id_compagnie = COALESCE(p_id_compagnie,0)) DESC,
              (g.cas_conversion IS NOT NULL) DESC,
              (g.code_energie  IS NOT NULL) DESC,
              g.id_regle_conversion_puissance
     LIMIT 1;
    IF NOT FOUND THEN
        RETURN;                       -- aucune règle applicable : aucun résultat, jamais de défaut
    END IF;

    IF r.mode_conversion = 'POLYNOME' THEN
        v_x   := p_valeur / r.diviseur_valeur;
        v_raw := r.coef_a2 * v_x * v_x + r.coef_a1 * v_x + r.coef_a0;
    ELSE
        SELECT tc.* INTO t
          FROM tarification.tranche_conversion_puissance tc
         WHERE tc.id_regle_conversion_puissance = r.id_regle_conversion_puissance
           AND tc.borne_min <= p_valeur
         ORDER BY tc.borne_min DESC LIMIT 1;
        IF NOT FOUND THEN
            RETURN;
        END IF;
        v_raw := t.cv_resultat
                 + CASE WHEN t.pas_valeur IS NOT NULL
                        THEN floor((p_valeur - t.borne_min) / t.pas_valeur) * t.pas_cv ELSE 0 END;
    END IF;

    v_cv := CASE r.mode_arrondi WHEN 'PLUS_PROCHE' THEN floor(v_raw + 0.5)
                                WHEN 'TRONQUE'     THEN floor(v_raw)
                                ELSE ceil(v_raw) END;
    RETURN QUERY SELECT v_cv::integer, r.estimee, r.id_compagnie, r.id_regle_conversion_puissance,
        CASE WHEN r.mode_conversion = 'POLYNOME' AND v_cv < 1
             THEN 'CV calculé inférieur à 1 : valeur à vérifier' ELSE NULL END;
END
$f$;

-- ---------- Fonction : cas de conversion selon le genre (décisions de Roger des 15/10) ----------
CREATE FUNCTION tarification.fn_determiner_cas_conversion(
    p_code_genre varchar, p_nombre_places numeric DEFAULT NULL,
    p_charge_utile_kg numeric DEFAULT NULL, p_motorise boolean DEFAULT NULL)
RETURNS TABLE (cas_conversion varchar, avertissement text)
LANGUAGE plpgsql IMMUTABLE AS $f$
BEGIN
    IF p_nombre_places IS NOT NULL AND p_nombre_places = 'NaN'::numeric THEN p_nombre_places := NULL; END IF;
    CASE p_code_genre
        WHEN 'VEHICULE_TOURISME', 'AMBULANCE', 'VEHICULE_FUNERAIRE' THEN
            RETURN QUERY SELECT '01'::varchar, NULL::text;
        WHEN 'VEHICULE_COLLECTIVITE_LOCALE' THEN
            RETURN QUERY SELECT '02'::varchar, NULL::text;
        WHEN 'ENGIN_SPECIAL', 'TRACTEUR_AGRICOLE_FORESTIER' THEN
            RETURN QUERY SELECT '03'::varchar, NULL::text;
        WHEN 'VEHICULE_UTILITAIRE' THEN
            IF p_charge_utile_kg IS NULL THEN
                RETURN QUERY SELECT NULL::varchar, 'Charge utile manquante : cas 02/03 indéterminé'::text;
            ELSIF p_charge_utile_kg <= 3500 THEN
                RETURN QUERY SELECT '02'::varchar, NULL::text;
            ELSE
                RETURN QUERY SELECT '03'::varchar, NULL::text;
            END IF;
        WHEN 'VEHICULE_TRANSPORT_EN_COMMUN' THEN
            IF p_nombre_places IS NULL THEN
                RETURN QUERY SELECT NULL::varchar, 'Nombre de places manquant : cas 02/03 indéterminé'::text;
            ELSIF p_nombre_places <= 40 THEN
                RETURN QUERY SELECT '02'::varchar, NULL::text;
            ELSE
                RETURN QUERY SELECT '03'::varchar, NULL::text;
            END IF;
        WHEN 'MOTOCYCLETTE', 'SCOOTER', 'TRICYCLE', 'TRIPORTEUR' THEN
            RETURN QUERY SELECT 'MOTO'::varchar, NULL::text;
        WHEN 'VEHICULE_REMORQUAGE' THEN
            IF p_motorise IS TRUE THEN
                RETURN QUERY SELECT '02'::varchar, NULL::text;
            ELSIF p_motorise IS FALSE THEN
                RETURN QUERY SELECT 'AUCUN'::varchar, NULL::text;
            ELSE
                RETURN QUERY SELECT NULL::varchar, 'Véhicule de remorquage : motorisé ou non ? indéterminé'::text;
            END IF;
        WHEN 'REMORQUE', 'SEMI_REMORQUE' THEN
            RETURN QUERY SELECT 'AUCUN'::varchar, NULL::text;      -- pas de puissance propre
        ELSE
            RETURN QUERY SELECT NULL::varchar, ('Genre sans règle de conversion : ' || COALESCE(p_code_genre,'NULL'))::text;
    END CASE;
END
$f$;

-- Même mode d'exécution que la fonction RC (lecture de tables que le rôle applicatif ne lit pas directement)
DO $$
DECLARE v_secdef boolean;
BEGIN
    SELECT bool_or(p.prosecdef) INTO v_secdef FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='tarification' AND p.proname='fn_calculer_prime_rc_automobile';
    IF v_secdef IS TRUE THEN
        ALTER FUNCTION tarification.fn_convertir_puissance_en_cv(integer,varchar,varchar,varchar,numeric,date)
            SECURITY DEFINER SET search_path = tarification, pg_temp;
        RAISE NOTICE 'Fonction de conversion créée en SECURITY DEFINER (comme la fonction RC).';
    ELSE
        RAISE NOTICE 'Fonction RC non SECURITY DEFINER : la fonction de conversion s''exécute avec les droits de l''appelant.';
    END IF;
END $$;

-- ---------- Valeurs de la compagnie 0 ----------
-- Voitures : CV = (cylindrée × k + 5) / 1000, arrondi au plus proche (fiche de marché, 14/10/2026)
INSERT INTO tarification.regle_conversion_puissance
 (id_compagnie, cas_conversion, code_energie, code_unite_puissance, mode_conversion,
  coef_a1, coef_a0, source, note, date_debut_validite) VALUES
 (0,'01','ESSENCE','cm3','POLYNOME',0.00573,0.005,'Fiche de marché fournie par Roger le 14/10/2026 (non officielle)','À vérifier (cas de contrôle de Roger)','2026-10-14'),
 (0,'01','DIESEL' ,'cm3','POLYNOME',0.00401,0.005,'Fiche de marché fournie par Roger le 14/10/2026 (non officielle)','À vérifier (cas de contrôle de Roger)','2026-10-14'),
 (0,'02','ESSENCE','cm3','POLYNOME',0.00477,0.005,'Fiche de marché fournie par Roger le 14/10/2026 (non officielle)','À vérifier (cas de contrôle de Roger)','2026-10-14'),
 (0,'02','DIESEL' ,'cm3','POLYNOME',0.00334,0.005,'Fiche de marché fournie par Roger le 14/10/2026 (non officielle)','À vérifier (cas de contrôle de Roger)','2026-10-14'),
 (0,'03','ESSENCE','cm3','POLYNOME',0.00277,0.005,'Fiche de marché fournie par Roger le 14/10/2026 (non officielle)','À vérifier (cas de contrôle de Roger)','2026-10-14'),
 (0,'03','DIESEL' ,'cm3','POLYNOME',0.00267,0.005,'Fiche de marché fournie par Roger le 14/10/2026 (non officielle)','À vérifier (cas de contrôle de Roger)','2026-10-14');

-- kW : formule française, tous véhicules, toutes énergies (décision de Roger, 15/10/2026)
INSERT INTO tarification.regle_conversion_puissance
 (id_compagnie, cas_conversion, code_energie, code_unite_puissance, mode_conversion,
  coef_a2, coef_a1, coef_a0, diviseur_valeur, source, note, date_debut_validite) VALUES
 (0,NULL,NULL,'kW','POLYNOME',1.8,3.87,1.34,100,'Formule française de la puissance fiscale (cartegrise.com)',
  'CV = 1,8·(kW/100)² + 3,87·(kW/100) + 1,34 ; appliquée à tous les véhicules (approximation pour les thermiques anciens)','2026-10-14');

-- Motos : table AFRINS (cas MOTO, cm³), non estimée pour la RC (lue par tranche de cm³)
WITH r AS (
 INSERT INTO tarification.regle_conversion_puissance
  (id_compagnie, cas_conversion, code_energie, code_unite_puissance, mode_conversion,
   estimee, source, note, date_debut_validite)
 VALUES (0,'MOTO',NULL,'cm3','TRANCHES',false,
   'Table AFRINS 05/05bis (05-TRI -> 05) + règle française des motos',
   'Texte camerounais non vérifié. Moins de 50 cm³ : 0 CV. Au-delà de 625 cm³ : +1 CV par tranche de 125 cm³ entamée.','2026-10-14')
 RETURNING id_regle_conversion_puissance)
INSERT INTO tarification.tranche_conversion_puissance
 (id_regle_conversion_puissance, borne_min, cv_resultat, pas_valeur, pas_cv)
SELECT r.id_regle_conversion_puissance, b.borne_min, b.cv, b.pas_valeur, b.pas_cv
  FROM r, (VALUES (0::numeric,0,NULL::numeric,NULL::int), (51,1,NULL,NULL), (126,2,NULL,NULL), (176,3,NULL,NULL),
                  (251,4,NULL,NULL), (351,5,NULL,NULL), (501,6,NULL,NULL), (626,7,125::numeric,1)) b(borne_min,cv,pas_valeur,pas_cv);

-- ---------- Droits ----------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mutuellepro') THEN
        GRANT EXECUTE ON FUNCTION tarification.fn_convertir_puissance_en_cv(integer,varchar,varchar,varchar,numeric,date) TO mutuellepro;
        GRANT EXECUTE ON FUNCTION tarification.fn_determiner_cas_conversion(varchar,numeric,numeric,boolean) TO mutuellepro;
    END IF;
END $$;

-- ---------- Recette (arrête la migration au premier écart) ----------
DO $$
DECLARE
    v record;
    n int;
BEGIN
    -- R1 voitures (valeurs recalculées à la main : (cylindrée × k + 5) / 1000)
    PERFORM 1 WHERE (SELECT cv FROM tarification.fn_convertir_puissance_en_cv(0,'01','ESSENCE','cm3',1000,'2026-10-15')) = 6;   -- 5,735
    IF NOT FOUND THEN RAISE EXCEPTION 'R1a'; END IF;
    PERFORM 1 WHERE (SELECT cv FROM tarification.fn_convertir_puissance_en_cv(0,'01','ESSENCE','cm3',1600,'2026-10-15')) = 9;   -- 9,173
    IF NOT FOUND THEN RAISE EXCEPTION 'R1b'; END IF;
    PERFORM 1 WHERE (SELECT cv FROM tarification.fn_convertir_puissance_en_cv(0,'01','DIESEL','cm3',2000,'2026-10-15')) = 8;    -- 8,025
    IF NOT FOUND THEN RAISE EXCEPTION 'R1c'; END IF;
    PERFORM 1 WHERE (SELECT cv FROM tarification.fn_convertir_puissance_en_cv(0,'02','DIESEL','cm3',2500,'2026-10-15')) = 8;    -- 8,355
    IF NOT FOUND THEN RAISE EXCEPTION 'R1d'; END IF;
    PERFORM 1 WHERE (SELECT cv FROM tarification.fn_convertir_puissance_en_cv(0,'03','ESSENCE','cm3',3000,'2026-10-15')) = 8;   -- 8,315
    IF NOT FOUND THEN RAISE EXCEPTION 'R1e'; END IF;
    -- R2 kW : 100 kW -> 1,8 + 3,87 + 1,34 = 7,01 -> 7
    PERFORM 1 WHERE (SELECT cv FROM tarification.fn_convertir_puissance_en_cv(0,'01','ESSENCE','kW',100,'2026-10-15')) = 7;
    IF NOT FOUND THEN RAISE EXCEPTION 'R2'; END IF;
    -- R3 motos : bornes AFRINS
    FOR v IN SELECT * FROM (VALUES (0,0),(50,0),(51,1),(125,1),(126,2),(175,2),(176,3),(250,3),(251,4),(350,4),
                                   (351,5),(500,5),(501,6),(625,6),(626,7),(750,7),(751,8),(875,8),(876,9)) t(cm3,att) LOOP
        PERFORM 1 WHERE (SELECT cv FROM tarification.fn_convertir_puissance_en_cv(0,'MOTO',NULL,'cm3',v.cm3,'2026-10-15')) = v.att;
        IF NOT FOUND THEN RAISE EXCEPTION 'R3 moto % cm3 : résultat inattendu', v.cm3; END IF;
    END LOOP;
    -- R4 aucune règle : énergie hors ESSENCE/DIESEL, date antérieure, unité CV
    SELECT count(*) INTO n FROM tarification.fn_convertir_puissance_en_cv(0,'01','GPL','cm3',1600,'2026-10-15');
    IF n <> 0 THEN RAISE EXCEPTION 'R4a'; END IF;
    SELECT count(*) INTO n FROM tarification.fn_convertir_puissance_en_cv(0,'01','ESSENCE','cm3',1600,'2026-10-01');
    IF n <> 0 THEN RAISE EXCEPTION 'R4b'; END IF;
    -- R5 priorité à la compagnie demandée (règle d'essai annulée par sous-transaction)
    BEGIN
        INSERT INTO tarification.regle_conversion_puissance
          (id_compagnie, cas_conversion, code_energie, code_unite_puissance, mode_conversion, coef_a1, coef_a0, source, date_debut_validite)
        VALUES (9,'01','ESSENCE','cm3','POLYNOME',0.01,0,'recette','2026-10-14');
        PERFORM 1 WHERE (SELECT cv FROM tarification.fn_convertir_puissance_en_cv(9,'01','ESSENCE','cm3',1000,'2026-10-15')) = 10
                    AND (SELECT id_compagnie_retenue FROM tarification.fn_convertir_puissance_en_cv(9,'01','ESSENCE','cm3',1000,'2026-10-15')) = 9;
        IF NOT FOUND THEN RAISE EXCEPTION 'R5a : règle de la compagnie 9 non retenue'; END IF;
        PERFORM 1 WHERE (SELECT cv FROM tarification.fn_convertir_puissance_en_cv(0,'01','ESSENCE','cm3',1000,'2026-10-15')) = 6;
        IF NOT FOUND THEN RAISE EXCEPTION 'R5b : la compagnie 0 ne doit pas lire la règle de la compagnie 9'; END IF;
        PERFORM 1 WHERE (SELECT cv FROM tarification.fn_convertir_puissance_en_cv(5,'01','ESSENCE','cm3',1000,'2026-10-15')) = 6;
        IF NOT FOUND THEN RAISE EXCEPTION 'R5c : une compagnie sans règle propre doit retomber sur la compagnie 0'; END IF;
        RAISE EXCEPTION 'RECETTE_OK_ANNULATION';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> 'RECETTE_OK_ANNULATION' THEN RAISE; END IF;
    END;
    -- R6 cas de conversion selon le genre
    FOR v IN SELECT * FROM (VALUES
        ('VEHICULE_TOURISME',NULL::numeric,NULL::numeric,NULL::boolean,'01'),
        ('AMBULANCE',NULL,NULL,NULL,'01'), ('VEHICULE_FUNERAIRE',NULL,NULL,NULL,'01'),
        ('VEHICULE_COLLECTIVITE_LOCALE',NULL,NULL,NULL,'02'),
        ('ENGIN_SPECIAL',NULL,NULL,NULL,'03'), ('TRACTEUR_AGRICOLE_FORESTIER',NULL,NULL,NULL,'03'),
        ('VEHICULE_UTILITAIRE',NULL,3500,NULL,'02'), ('VEHICULE_UTILITAIRE',NULL,3501,NULL,'03'),
        ('VEHICULE_TRANSPORT_EN_COMMUN',40,NULL,NULL,'02'), ('VEHICULE_TRANSPORT_EN_COMMUN',41,NULL,NULL,'03'),
        ('MOTOCYCLETTE',NULL,NULL,NULL,'MOTO'), ('SCOOTER',NULL,NULL,NULL,'MOTO'),
        ('TRICYCLE',NULL,NULL,NULL,'MOTO'), ('TRIPORTEUR',NULL,NULL,NULL,'MOTO'),
        ('VEHICULE_REMORQUAGE',NULL,NULL,TRUE,'02'), ('VEHICULE_REMORQUAGE',NULL,NULL,FALSE,'AUCUN'),
        ('REMORQUE',NULL,NULL,NULL,'AUCUN'), ('SEMI_REMORQUE',NULL,NULL,NULL,'AUCUN')
      ) t(g,pl,ch,mo,att) LOOP
        PERFORM 1 WHERE (SELECT cas_conversion FROM tarification.fn_determiner_cas_conversion(v.g,v.pl,v.ch,v.mo)) = v.att;
        IF NOT FOUND THEN RAISE EXCEPTION 'R6 genre % : résultat inattendu', v.g; END IF;
    END LOOP;
    -- données manquantes ou inconnues : aucun cas, avec avertissement
    SELECT count(*) INTO n FROM tarification.fn_determiner_cas_conversion('VEHICULE_UTILITAIRE',NULL,NULL,NULL) WHERE cas_conversion IS NULL AND avertissement IS NOT NULL;
    IF n <> 1 THEN RAISE EXCEPTION 'R6b'; END IF;
    SELECT count(*) INTO n FROM tarification.fn_determiner_cas_conversion('VEHICULE_TRANSPORT_EN_COMMUN','NaN'::numeric,NULL,NULL) WHERE cas_conversion IS NULL AND avertissement IS NOT NULL;
    IF n <> 1 THEN RAISE EXCEPTION 'R6c (NaN)'; END IF;
    SELECT count(*) INTO n FROM tarification.fn_determiner_cas_conversion('GENRE_INCONNU') WHERE cas_conversion IS NULL AND avertissement IS NOT NULL;
    IF n <> 1 THEN RAISE EXCEPTION 'R6d'; END IF;
    -- R7 aucune période chevauchante entre règles actives de même clé
    SELECT count(*) INTO n FROM tarification.regle_conversion_puissance a
      JOIN tarification.regle_conversion_puissance b
        ON a.id_regle_conversion_puissance < b.id_regle_conversion_puissance
       AND a.id_compagnie = b.id_compagnie
       AND COALESCE(a.cas_conversion,'') = COALESCE(b.cas_conversion,'')
       AND COALESCE(a.code_energie,'')  = COALESCE(b.code_energie,'')
       AND a.code_unite_puissance = b.code_unite_puissance
       AND a.statut='ACTIF' AND b.statut='ACTIF'
       AND a.date_debut_validite <= COALESCE(b.date_fin_validite,'infinity')
       AND b.date_debut_validite <= COALESCE(a.date_fin_validite,'infinity');
    IF n <> 0 THEN RAISE EXCEPTION 'R7 : périodes chevauchantes'; END IF;
    RAISE NOTICE 'RECETTE : toutes les vérifications sont passées.';
END $$;

SELECT id_regle_conversion_puissance, id_compagnie, cas_conversion, code_energie, code_unite_puissance, mode_conversion, estimee
  FROM tarification.regle_conversion_puissance ORDER BY 1;

\if :commit
COMMIT;
\echo '>>> APPLIQUÉ.'
\else
ROLLBACK;
\echo '>>> ESSAI À BLANC : annulé.'
\endif
