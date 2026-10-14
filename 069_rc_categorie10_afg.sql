-- =====================================================================
-- 069_rc_categorie10_afg.sql   (migration 069, attribuée par Git le 14/10/2026)
-- Session Tarification. Crée le tarif RC propre à AFG (compagnie 9, offre 154) pour les catégories 10A, 10B, 10C.
--   * 10A : colonne 10A du tarif 1995 (ambulances, corbillards, fourgons funéraires).
--   * 10B : deux variantes dans bareme_tranche.criteres, clé "tonnage_label" : MOINS_3_5T (colonne 10B du document) et PLUS_3_5T (colonne « collectivité plus de 3,5 t »).
--   * 10C : tracteurs (colonne « 10D - 10E » du document, terminologie propre à AFG). 2 CV et 3-6 CV : tarif minimum connu (7-10 CV), noté sur chaque ligne.
--   * Zones A/B/C dans criteres->>'zone', comme la compagnie 0. Prime unique. 72 lignes de barème au total (18 + 36 + 18).
-- Validité 16/11/1994 (à confirmer par Roger), acte 1, règle de calcul 1. Aucune ligne de la compagnie 0 n'est modifiée. Aucune catégorie créée.
-- Les montants viennent du document AFG. Pour 10A, deux montants diffèrent de la base compagnie 0 (11-14 CV zone A : 79 057 contre 79 054 ; 24 CV et plus zone A : 118 686 contre 118 868) : le document est repris tel quel pour AFG.
-- Exécution :  sudo -u postgres psql -d vpiclist -X -v ON_ERROR_STOP=1 -v commit=false -f - < fichier   (essai à blanc)
--              sudo -u postgres psql -d vpiclist -X -v ON_ERROR_STOP=1 -f - < fichier                      (application)
-- =====================================================================
\if :{?commit}
\else
\set commit true
\endif
BEGIN;
SET LOCAL search_path = tarification, public;

-- 0. Garde-fous et volumes avant -------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tarification.compagnie WHERE id_compagnie = 9) THEN RAISE EXCEPTION 'compagnie 9 (AFG) introuvable'; END IF;
  IF NOT EXISTS (SELECT 1 FROM tarification.offre_commerciale WHERE id_offre_commerciale = 154 AND id_compagnie = 9 AND id_sous_garantie = 217) THEN RAISE EXCEPTION 'offre 154 (AFG, RC) introuvable ou différente'; END IF;
  IF (SELECT count(*) FROM tarification.tarif WHERE id_tarif IN (48,49,50) AND id_compagnie = 0 AND id_offre_commerciale = 298 AND categorie_code IN ('10A','10B','10C')) <> 3 THEN RAISE EXCEPTION 'tarifs modèles 48, 49, 50 introuvables ou différents'; END IF;
  IF EXISTS (SELECT 1 FROM tarification.tarif WHERE id_compagnie = 9 AND categorie_code IN ('10A','10B','10C') AND garantie_code = 'AUTO_RC__RESPONSABILITE_CIVILE_STRICTE') THEN RAISE EXCEPTION 'AFG a déjà un tarif RC en catégorie 10 : migration déjà appliquée ?'; END IF;
  IF (SELECT count(*) FROM tarification.bareme_tranche WHERE id_tarif = 48) <> 18 THEN RAISE EXCEPTION 'le modèle 48 n''a pas 18 lignes'; END IF;
END $$;
CREATE TEMP TABLE _volumes_avant AS
  SELECT (SELECT count(*) FROM tarification.tarif) AS nb_tarif,
         (SELECT count(*) FROM tarification.bareme_tranche) AS nb_bareme_tranche,
         (SELECT count(*) FROM tarification.tarif WHERE id_compagnie = 0) AS nb_tarif_cie0,
         (SELECT count(*) FROM tarification.bareme_tranche WHERE id_tarif IN (48,49,50)) AS nb_bareme_modeles;

-- 1. Trois tarifs AFG, copiés des modèles de la compagnie 0 ----------
INSERT INTO tarification.tarif
  (id_acte_reglementaire, categorie_code, garantie_code, id_regle_calcul, libelle, date_debut_validite, date_fin_validite, statut,
   criteres_objet, criteres_risque, prime_minimum, source_page, note, id_garantie, id_sous_categorie, id_compagnie, id_sous_garantie, id_offre_commerciale)
SELECT t.id_acte_reglementaire, t.categorie_code, t.garantie_code, t.id_regle_calcul,
       'RC Automobile - Catégorie ' || t.categorie_code || ' (AFG)', DATE '1994-11-16', DATE '2099-12-31', 'ACTIF',
       t.criteres_objet, t.criteres_risque, t.prime_minimum, NULL,
       CASE t.categorie_code
         WHEN '10A' THEN 'AFG : ambulances, corbillards, fourgons funéraires (colonne 10A du document)'
         WHEN '10B' THEN 'AFG : voirie, collectivité locale ; variantes tonnage_label MOINS_3_5T et PLUS_3_5T dans le barème'
         WHEN '10C' THEN 'AFG : tracteurs agricoles ou forestiers hors route (colonne « 10D - 10E » du document)'
       END,
       t.id_garantie, t.id_sous_categorie, 9, t.id_sous_garantie, 154
  FROM tarification.tarif t
 WHERE t.id_tarif IN (48,49,50);

-- 2. Barème : structure des lignes modèles (bornes, forces fiscales diesel, zone), montants du document
INSERT INTO tarification.bareme_tranche
  (id_tarif, borne_min, borne_max, force_fiscale_min_diesel, force_fiscale_max_diesel, prime_unique, criteres, source_page, note)
SELECT n.id_tarif, m.borne_min, m.borne_max, m.force_fiscale_min_diesel, m.force_fiscale_max_diesel, v.montant,
       m.criteres || CASE WHEN v.variante IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('tonnage_label', v.variante) END,
       NULL, COALESCE(v.note, 'Tarif 1995, document AFG')
  FROM (VALUES
  ('10A','A',0,44870,NULL,NULL),
  ('10A','A',3,54516,NULL,NULL),
  ('10A','A',7,60578,NULL,NULL),
  ('10A','A',11,79057,NULL,NULL),
  ('10A','A',15,100654,NULL,NULL),
  ('10A','A',24,118686,NULL,NULL),
  ('10A','B',0,43001,NULL,NULL),
  ('10A','B',3,52245,NULL,NULL),
  ('10A','B',7,58054,NULL,NULL),
  ('10A','B',11,75763,NULL,NULL),
  ('10A','B',15,96460,NULL,NULL),
  ('10A','B',24,113741,NULL,NULL),
  ('10A','C',0,41131,NULL,NULL),
  ('10A','C',3,49973,NULL,NULL),
  ('10A','C',7,55530,NULL,NULL),
  ('10A','C',11,72469,NULL,NULL),
  ('10A','C',15,92266,NULL,NULL),
  ('10A','C',24,108796,NULL,NULL),
  ('10B','A',0,50435,'MOINS_3_5T',NULL),
  ('10B','A',3,60913,'MOINS_3_5T',NULL),
  ('10B','A',7,69455,'MOINS_3_5T',NULL),
  ('10B','A',11,104040,'MOINS_3_5T',NULL),
  ('10B','A',15,128824,'MOINS_3_5T',NULL),
  ('10B','A',24,148999,'MOINS_3_5T',NULL),
  ('10B','B',0,48418,'MOINS_3_5T',NULL),
  ('10B','B',3,58476,'MOINS_3_5T',NULL),
  ('10B','B',7,66677,'MOINS_3_5T',NULL),
  ('10B','B',11,99878,'MOINS_3_5T',NULL),
  ('10B','B',15,123671,'MOINS_3_5T',NULL),
  ('10B','B',24,143039,'MOINS_3_5T',NULL),
  ('10B','C',0,45997,'MOINS_3_5T',NULL),
  ('10B','C',3,55552,'MOINS_3_5T',NULL),
  ('10B','C',7,63343,'MOINS_3_5T',NULL),
  ('10B','C',11,94884,'MOINS_3_5T',NULL),
  ('10B','C',15,117487,'MOINS_3_5T',NULL),
  ('10B','C',24,135887,'MOINS_3_5T',NULL),
  ('10B','A',0,80721,'PLUS_3_5T',NULL),
  ('10B','A',3,99604,'PLUS_3_5T',NULL),
  ('10B','A',7,114073,'PLUS_3_5T',NULL),
  ('10B','A',11,168475,'PLUS_3_5T',NULL),
  ('10B','A',15,214763,'PLUS_3_5T',NULL),
  ('10B','A',24,249196,'PLUS_3_5T',NULL),
  ('10B','B',0,77492,'PLUS_3_5T',NULL),
  ('10B','B',3,95620,'PLUS_3_5T',NULL),
  ('10B','B',7,109510,'PLUS_3_5T',NULL),
  ('10B','B',11,161736,'PLUS_3_5T',NULL),
  ('10B','B',15,206172,'PLUS_3_5T',NULL),
  ('10B','B',24,239228,'PLUS_3_5T',NULL),
  ('10B','C',0,73617,'PLUS_3_5T',NULL),
  ('10B','C',3,90839,'PLUS_3_5T',NULL),
  ('10B','C',7,104035,'PLUS_3_5T',NULL),
  ('10B','C',11,153649,'PLUS_3_5T',NULL),
  ('10B','C',15,195863,'PLUS_3_5T',NULL),
  ('10B','C',24,227267,'PLUS_3_5T',NULL),
  ('10C','A',0,48618,NULL,'Tarif minimum connu (7-10 CV) : la ligne est vide au tarif 1995 - décision de Roger du 13/10/2026'),
  ('10C','A',3,48618,NULL,'Tarif minimum connu (7-10 CV) : la ligne est vide au tarif 1995 - décision de Roger du 13/10/2026'),
  ('10C','A',7,48618,NULL,NULL),
  ('10C','A',11,72828,NULL,NULL),
  ('10C','A',15,90177,NULL,NULL),
  ('10C','A',24,104299,NULL,NULL),
  ('10C','B',0,48618,NULL,'Tarif minimum connu (7-10 CV) : la ligne est vide au tarif 1995 - décision de Roger du 13/10/2026'),
  ('10C','B',3,48618,NULL,'Tarif minimum connu (7-10 CV) : la ligne est vide au tarif 1995 - décision de Roger du 13/10/2026'),
  ('10C','B',7,48618,NULL,NULL),
  ('10C','B',11,72828,NULL,NULL),
  ('10C','B',15,90177,NULL,NULL),
  ('10C','B',24,104299,NULL,NULL),
  ('10C','C',0,48618,NULL,'Tarif minimum connu (7-10 CV) : la ligne est vide au tarif 1995 - décision de Roger du 13/10/2026'),
  ('10C','C',3,48618,NULL,'Tarif minimum connu (7-10 CV) : la ligne est vide au tarif 1995 - décision de Roger du 13/10/2026'),
  ('10C','C',7,48618,NULL,NULL),
  ('10C','C',11,72828,NULL,NULL),
  ('10C','C',15,90177,NULL,NULL),
  ('10C','C',24,104299,NULL,NULL)
  ) AS v(cat, zone, borne_min, montant, variante, note)
  JOIN tarification.tarif n ON n.id_compagnie = 9 AND n.categorie_code = v.cat
       AND n.garantie_code = 'AUTO_RC__RESPONSABILITE_CIVILE_STRICTE' AND n.id_offre_commerciale = 154
  JOIN tarification.bareme_tranche m ON m.id_tarif = CASE v.cat WHEN '10A' THEN 48 WHEN '10B' THEN 49 WHEN '10C' THEN 50 END
       AND m.criteres->>'zone' = v.zone AND m.borne_min = v.borne_min;

-- 3. Contrôles finaux ----------------------------------------------------
DO $$
DECLARE av record; n_t int; n_b int; s numeric; n_b10a int; n_b10b int; n_b10c int; n_var int;
BEGIN
  SELECT * INTO av FROM _volumes_avant;
  SELECT count(*) INTO n_t FROM tarification.tarif WHERE id_compagnie = 9 AND categorie_code IN ('10A','10B','10C') AND id_offre_commerciale = 154;
  SELECT count(*), sum(b.prime_unique) INTO n_b, s FROM tarification.bareme_tranche b JOIN tarification.tarif t USING (id_tarif)
   WHERE t.id_compagnie = 9 AND t.categorie_code IN ('10A','10B','10C');
  SELECT count(*) INTO n_b10a FROM tarification.bareme_tranche b JOIN tarification.tarif t USING (id_tarif) WHERE t.id_compagnie = 9 AND t.categorie_code = '10A';
  SELECT count(*) INTO n_b10b FROM tarification.bareme_tranche b JOIN tarification.tarif t USING (id_tarif) WHERE t.id_compagnie = 9 AND t.categorie_code = '10B';
  SELECT count(*) INTO n_b10c FROM tarification.bareme_tranche b JOIN tarification.tarif t USING (id_tarif) WHERE t.id_compagnie = 9 AND t.categorie_code = '10C';
  SELECT count(*) INTO n_var FROM tarification.bareme_tranche b JOIN tarification.tarif t USING (id_tarif) WHERE t.id_compagnie = 9 AND t.categorie_code = '10B' AND b.criteres ? 'tonnage_label';
  IF n_t <> 3 THEN RAISE EXCEPTION '% tarifs AFG créés au lieu de 3', n_t; END IF;
  IF n_b <> 72 OR n_b10a <> 18 OR n_b10b <> 36 OR n_b10c <> 18 OR n_var <> 36 THEN
    RAISE EXCEPTION 'Lignes de barème inattendues : total %, 10A %, 10B %, 10C %, avec variante % (attendu 72, 18, 36, 18, 36)', n_b, n_b10a, n_b10b, n_b10c, n_var;
  END IF;
  IF s <> 6835099 THEN RAISE EXCEPTION 'Somme des primes % différente de 6835099', s; END IF;
  IF EXISTS (SELECT 1 FROM tarification.bareme_tranche WHERE id_tarif IN (SELECT id_tarif FROM tarification.tarif WHERE id_compagnie = 9 AND categorie_code IN ('10A','10B','10C')) AND prime_unique IS NULL) THEN RAISE EXCEPTION 'ligne sans montant'; END IF;
  IF (SELECT count(*) FROM tarification.tarif) <> av.nb_tarif + 3
     OR (SELECT count(*) FROM tarification.bareme_tranche) <> av.nb_bareme_tranche + 72
     OR (SELECT count(*) FROM tarification.tarif WHERE id_compagnie = 0) <> av.nb_tarif_cie0
     OR (SELECT count(*) FROM tarification.bareme_tranche WHERE id_tarif IN (48,49,50)) <> av.nb_bareme_modeles THEN
    RAISE EXCEPTION 'Les volumes de la compagnie 0 ou les totaux ne correspondent pas';
  END IF;
END $$;

SELECT t.id_tarif, t.categorie_code, t.id_compagnie, t.id_offre_commerciale, t.date_debut_validite, count(b.*) AS lignes_bareme
  FROM tarification.tarif t JOIN tarification.bareme_tranche b USING (id_tarif)
 WHERE t.id_compagnie = 9 AND t.categorie_code IN ('10A','10B','10C') GROUP BY 1,2,3,4,5 ORDER BY 2;
SELECT 'tarif avant' AS mesure, nb_tarif AS valeur FROM _volumes_avant UNION ALL SELECT 'tarif après', count(*) FROM tarification.tarif
UNION ALL SELECT 'bareme_tranche avant', nb_bareme_tranche FROM _volumes_avant UNION ALL SELECT 'bareme_tranche après', count(*) FROM tarification.bareme_tranche;

\if :commit
COMMIT;
\else
ROLLBACK;
\echo 'ESSAI A BLANC : rien n''est conserve'
\endif
