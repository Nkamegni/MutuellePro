-- =====================================================================
-- Lot « Numérotation & branche Assistance » — 06/10/2026
--
--  A. Doublon de numérotation : RISQUES_TECHNIQUES 13 -> 09 (art. 328, 9°)
--     + contrainte d'unicité sur code_numerotation
--  B. Création de la branche ASSISTANCE (art. 328, 18°), numérotation 18
--  C. Reclassement : produit 4 (VOYAGE_ASSISTANCE) et garantie 226
--     (SANTE_ASSURANCE_VOYAGE) rattachés à ASSISTANCE ; garantie 239 inchangée
--  D. [OPTIONNEL, désactivé par défaut] Barème des accessoires : activation des
--     lignes 12 et 97 — uniquement avec -v accessoires=true (voir analyse du 06/10)
--
-- Usage :
--   essai à blanc : sudo -u postgres psql -d vpiclist -P pager=off -v ON_ERROR_STOP=1 -v commit=false -f lot_assistance_numerotation.sql
--   application   : sudo -u postgres psql -d vpiclist -P pager=off -v ON_ERROR_STOP=1 -v commit=true  -f lot_assistance_numerotation.sql
-- =====================================================================
\set QUIET on
\pset footer off

\echo '=== 0. Lecture préalable : fonction(s) de calcul des accessoires ==='
\echo '(à relire AVANT validation : la ligne 97 vaut 1 000 FCFA et n a ni branche ni catégorie)'
SELECT n.nspname AS schema, p.proname AS fonction, pg_get_functiondef(p.oid) AS definition
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE p.proname ILIKE '%accessoire%' AND n.nspname NOT IN ('pg_catalog','information_schema');

BEGIN;

-- ---------------------------------------------------------------------
\echo '=== A. Doublon de numérotation 13 ==='
SELECT * FROM site.production_branches_numerotation ORDER BY code_numerotation;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM site.contrats WHERE code_branche = 'RISQUES_TECHNIQUES') THEN
    RAISE EXCEPTION '[ÉCHEC]  des contrats Risques Techniques existent : arbitrage nécessaire';
  END IF;
  IF EXISTS (SELECT 1 FROM site.production_branches_numerotation WHERE code_numerotation IN ('09','18')) THEN
    RAISE EXCEPTION '[ÉCHEC]  le code 09 ou 18 est déjà attribué';
  END IF;
  IF EXISTS (SELECT 1 FROM site.compteurs_polices WHERE code_numerotation IN ('09','18')) THEN
    RAISE EXCEPTION '[ÉCHEC]  un compteur 09 ou 18 existe déjà';
  END IF;
  RAISE NOTICE '[OK]     Aucun contrat Risques Techniques, codes 09 et 18 libres';
END $$;

UPDATE site.production_branches_numerotation SET code_numerotation = '09' WHERE code_branche = 'RISQUES_TECHNIQUES';
ALTER TABLE site.production_branches_numerotation
  ADD CONSTRAINT production_branches_numerotation_code_numerotation_key UNIQUE (code_numerotation);
\echo '[OK]     RISQUES_TECHNIQUES -> 09, unicité ajoutée'

-- ---------------------------------------------------------------------
\echo '=== B. Branche ASSISTANCE ==='
DO $$
DECLARE seq text; v int;
BEGIN
  IF EXISTS (SELECT 1 FROM tarification.branche WHERE code_branche = 'ASSISTANCE') THEN
    RAISE EXCEPTION '[ÉCHEC]  la branche ASSISTANCE existe déjà';
  END IF;
  seq := pg_get_serial_sequence('tarification.branche', 'id_branche');
  IF seq IS NOT NULL THEN
    -- recaler la séquence au cas où des lignes ont été insérées avec un id explicite
    PERFORM setval(seq, (SELECT max(id_branche) FROM tarification.branche));
    INSERT INTO tarification.branche (code_branche, libelle)
    VALUES ('ASSISTANCE', 'Assistance') RETURNING id_branche INTO v;
  ELSE
    INSERT INTO tarification.branche (id_branche, code_branche, libelle)
    SELECT max(id_branche) + 1, 'ASSISTANCE', 'Assistance' FROM tarification.branche
    RETURNING id_branche INTO v;
  END IF;
  RAISE NOTICE '[OK]     Branche ASSISTANCE créée (id_branche = %)', v;
END $$;

INSERT INTO site.production_branches_numerotation (code_branche, code_numerotation) VALUES ('ASSISTANCE', '18');
\echo '[OK]     Numérotation ASSISTANCE = 18'

-- ---------------------------------------------------------------------
\echo '=== C. Reclassement produit 4 et garantie 226 ==='
\echo '--- Dépendances, pour information (non modifiées) ---'
SELECT 'tarif' AS objet, count(*) AS nb FROM tarification.tarif WHERE id_garantie = 226
UNION ALL SELECT 'offre (produit 4)', count(*) FROM tarification.offre WHERE id_produit = 4
UNION ALL SELECT 'cotation (produit 4)', count(*) FROM tarification.cotation WHERE id_produit = 4
UNION ALL SELECT 'cotation_session (produit 4)', count(*) FROM tarification.cotation_session WHERE id_produit = 4;

DO $$
DECLARE v int; n int;
BEGIN
  SELECT id_branche INTO v FROM tarification.branche WHERE code_branche = 'ASSISTANCE';

  UPDATE tarification.produit SET id_branche = v
   WHERE id_produit = 4 AND code_produit = 'VOYAGE_ASSISTANCE';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION '[ÉCHEC]  produit 4 : % ligne(s) modifiée(s) au lieu de 1', n; END IF;

  UPDATE tarification.garantie SET id_branche = v
   WHERE id_garantie = 226 AND code_garantie = 'SANTE_ASSURANCE_VOYAGE';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION '[ÉCHEC]  garantie 226 : % ligne(s) modifiée(s) au lieu de 1', n; END IF;

  RAISE NOTICE '[OK]     Produit 4 et garantie 226 rattachés à ASSISTANCE (garantie 239 inchangée)';
END $$;

-- ---------------------------------------------------------------------
\if :{?accessoires}
\if :accessoires
\echo '=== D. Barème des accessoires ==='
DO $$
DECLARE n int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'tarification' AND table_name = 'bareme_accessoire'
                    AND column_name = 'actif') THEN
    RAISE EXCEPTION '[ÉCHEC]  colonne « actif » introuvable dans bareme_accessoire';
  END IF;

  UPDATE tarification.bareme_accessoire ba SET actif = true
   WHERE ba.id = 12 AND ba::text ILIKE '%Assurance Voyage OK%';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION '[ÉCHEC]  accessoire 12 : % ligne(s) au lieu de 1', n; END IF;

  UPDATE tarification.bareme_accessoire ba SET actif = true
   WHERE ba.id = 97 AND ba::text ILIKE '%Green Assistance Conducteur%';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION '[ÉCHEC]  accessoire 97 : % ligne(s) au lieu de 1', n; END IF;

  RAISE NOTICE '[OK]     Accessoires 12 (Assurance Voyage) et 97 (Green Assistance) activés';
END $$;

\echo '--- Équivalences Green Assistance (doivent rester actives, non modifiées) ---'
SELECT * FROM tarification.equivalence_garantie WHERE id IN (497, 741);

\else
\echo '=== D. Barème des accessoires : NON EXÉCUTÉ (passer -v accessoires=true pour l inclure) ==='
\endif
\else
\echo '=== D. Barème des accessoires : NON EXÉCUTÉ (passer -v accessoires=true pour l inclure) ==='
\endif

-- ---------------------------------------------------------------------
\echo '=== Contrôle final ==='
SELECT b.id_branche, b.code_branche, b.libelle, n.code_numerotation
  FROM tarification.branche b
  LEFT JOIN site.production_branches_numerotation n USING (code_branche)
 ORDER BY n.code_numerotation NULLS LAST;

SELECT 'produit' AS objet, p.id_produit AS id, p.code_produit AS code, b.code_branche
  FROM tarification.produit p JOIN tarification.branche b USING (id_branche) WHERE p.id_produit = 4
UNION ALL
SELECT 'garantie', g.id_garantie, g.code_garantie, b.code_branche
  FROM tarification.garantie g JOIN tarification.branche b USING (id_branche) WHERE g.id_garantie IN (226, 239);

SELECT * FROM tarification.bareme_accessoire WHERE id IN (12, 97);

\echo '--- Polices émises, pour contrôle de cohérence des numéros ---'
SELECT code_branche, numero_police, date_creation FROM site.contrats ORDER BY code_branche, numero_police;

\echo '=== Fin ==='
\if :commit
  COMMIT;
  \echo '>>> VALIDÉ : lot Numérotation & Assistance appliqué.'
\else
  ROLLBACK;
  \echo '>>> ESSAI À BLANC : tout a été annulé. Relancer avec -v commit=true pour appliquer.'
\endif
