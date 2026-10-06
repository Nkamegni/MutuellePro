-- =====================================================================
-- MAJ_BASE_03102026.sql — mises à jour de la base décidées par Roger (03/10/2026)
--   A. Compagnies : SAMIRIS inactive, noms alignés
--   B. Accessoires : valeurs de la source Frais_et_accessoires.csv (2 500 FCFA), AFRINS 3 150 (catégorie 1),
--      Pool TPV 2 500, SUNU selon son manuel, ZENITHE rétablie
--   C. PROPOSITION (non demandée) : permis récent à 2 ans — à valider ou à retirer avant exécution
-- Exécution : une seule transaction, arrêt à la première erreur.
--   sudo -u postgres pg_dump -d vpiclist -n tarification -F c -f /tmp/backup_avant_maj_03102026.dump
--   sudo -u postgres psql -d vpiclist -v ON_ERROR_STOP=1 --single-transaction -f /tmp/MAJ_BASE_03102026.sql
-- Chaque UPDATE ou INSERT est gardé par une condition sur l'état actuel : rejouer le script ne change rien.
-- Détail des décisions et des lignes : RUT 7.6 et RUT_annexe_F_comparaison_accessoires.md
-- =====================================================================
SET search_path TO tarification;

-- ---------- A. Compagnies : SAMIRIS inactive, noms alignés sur les codes ----------
\echo '--- A. compagnie (avant) ---'
SELECT id_compagnie, code_compagnie, nom, nom_commercial, actif_site, statut_agrement FROM compagnie WHERE id_compagnie IN (13, 21) ORDER BY 1;

UPDATE compagnie SET actif_site = false, nom = 'SAMIRIS', nom_commercial = 'SAMIRIS'
 WHERE id_compagnie = 21 AND code_compagnie = 'SAMIRIS' AND (actif_site IS TRUE OR nom = 'ALPHA');
UPDATE compagnie SET nom = 'ZENITHE'
 WHERE id_compagnie = 13 AND code_compagnie = 'ZENITHE' AND nom = 'SOCAR';

\echo '--- A. compagnie (après) ---'
SELECT id_compagnie, code_compagnie, nom, nom_commercial, actif_site, statut_agrement FROM compagnie WHERE id_compagnie IN (13, 21) ORDER BY 1;
-- Effet de bord attendu : SAMIRIS disparaît de la liste publique du site (actif_site = false).
-- statut_agrement n'est pas modifié (décision non donnée).

-- ---------- B. Accessoires ----------
\echo '--- B. lignes à 3 000 FCFA (avant) : attendu 35 ---'
SELECT count(*) AS lignes_a_3000 FROM bareme_accessoire WHERE montant = 3000;

-- B1. AFRINS : la ligne « [NON IDENTIFIEE] » à 3 000 devient la ligne Automobile à 2 500 (source du 03/10 et tarif AFRINS)
UPDATE bareme_accessoire SET code_branche = 'AUTOMOBILE', risque_source = 'Automobile', montant = 2500
 WHERE id = 106 AND risque_source = '[NON IDENTIFIEE]'
   AND id_compagnie = (SELECT id_compagnie FROM compagnie WHERE code_compagnie = 'AFRINS');

-- B2. AFRINS : catégorie 1, contrat annuel (1 an et plus), prime nette supérieure à 100 000 : 3 150
--     (source officielle indiquée par Roger ; même encodage de la durée annuelle que les lignes PROASSUR « 01 an »)
INSERT INTO bareme_accessoire (id_compagnie, code_branche, code_categorie, risque_source, type_palier, prime_min, prime_max,
                               palier_source, duree_min, duree_max, duree_source, montant, actif, date_debut, date_fin)
SELECT b.id_compagnie, 'AUTOMOBILE', '01', 'Automobile', 'plage', 100001, NULL,
       'de 100 001 au-delà', interval '1 year', NULL, '01 an', 3150, true, b.date_debut, b.date_fin
  FROM bareme_accessoire b
 WHERE b.id = 106
   AND NOT EXISTS (SELECT 1 FROM bareme_accessoire x
                    WHERE x.id_compagnie = b.id_compagnie AND x.code_categorie = '01' AND x.montant = 3150);

-- B3. Pool TPV (04A, 04B, 04C), niveau générique : accessoires 2 500 (libellés de la source du 03/10).
--     Le Fichier central du Pool (500 FCFA) n'est pas dans ce barème : voir RUT 7.6 et la demande à Production & Souscription.
INSERT INTO bareme_accessoire (id_compagnie, code_branche, code_categorie, risque_source, type_palier, prime_min, prime_max,
                               palier_source, duree_min, duree_max, duree_source, montant, actif, date_debut, date_fin)
SELECT 0, 'AUTOMOBILE', v.cat, v.risque, 'aucun', NULL, NULL,
       '[PAS DE PALIER]', NULL, NULL, '[AUCUNE SEGMENTATION]', 2500, true, DATE '2000-01-01', DATE '2099-12-31'
  FROM (VALUES
        ('04A', 'Taxi et autobus autocar ou véhicule aménagé pour transport urbain à titre payant.'),
        ('04B', 'Bus, autocar ou véhicule aménagé pour le transport public interurbain des voyageurs à titre payant.'),
        ('04C', 'Autocar de transport des élèves et du personnel à titre gratuit.')) AS v(cat, risque)
 WHERE NOT EXISTS (SELECT 1 FROM bareme_accessoire x WHERE x.id_compagnie = 0 AND x.code_categorie = v.cat);

-- B4. Alignement sur la source : 30 lignes passent de 3 000 à 2 500.
--     Sont exclues : les lignes PROASSUR issues de sa note de service (107, 110), la tranche annuelle SUNU 0-200 000 (20)
--     issue de son manuel, et les cas particuliers B1 (106) et B5 (21).
UPDATE bareme_accessoire SET montant = 2500
 WHERE id IN (2, 8, 15, 24, 26, 30, 32, 36, 37, 41, 43, 44, 45, 47, 48, 49, 51, 53, 63, 72, 74, 81, 82, 85, 87, 95, 96, 98, 99, 100)
   AND montant = 3000;

-- B5. SUNU, contrat mono-véhicule de courte période : manuel = 2 750 dont 250 de FC, soit 2 500 hors FC
UPDATE bareme_accessoire SET montant = 2500
 WHERE id = 21 AND montant = 3000 AND duree_source = 'De 0 à 6 mois'
   AND id_compagnie = (SELECT id_compagnie FROM compagnie WHERE code_compagnie = 'SUNU');

-- B6. SUNU, « Autres risques » (manuel, page 34) : 2 500 jusqu'à 100 000, 5 000 jusqu'à 1 000 000, 10 000 au-delà
INSERT INTO bareme_accessoire (id_compagnie, code_branche, code_categorie, risque_source, type_palier, prime_min, prime_max,
                               palier_source, duree_min, duree_max, duree_source, montant, actif, date_debut, date_fin)
SELECT (SELECT id_compagnie FROM compagnie WHERE code_compagnie = 'SUNU'), NULL, NULL, 'Autres risques', 'plage', v.pmin, v.pmax,
       v.palier, NULL, NULL, '[AUCUNE SEGMENTATION]', v.montant, true, DATE '2000-01-01', DATE '2099-12-31'
  FROM (VALUES (0, 100000, 'de 0 à 100 000', 2500),
               (100001, 1000000, 'de 100 001 à 1 000 000', 5000),
               (1000001, NULL::int, 'de 1 000 001 au-delà', 10000)) AS v(pmin, pmax, palier, montant)
 WHERE NOT EXISTS (SELECT 1 FROM bareme_accessoire x
                    WHERE x.id_compagnie = (SELECT id_compagnie FROM compagnie WHERE code_compagnie = 'SUNU')
                      AND x.risque_source = 'Autres risques');

-- B7. ZENITHE : ligne perdue au renommage, rétablie (source du 03/10 : 2 500, risque non identifié)
INSERT INTO bareme_accessoire (id_compagnie, code_branche, code_categorie, risque_source, type_palier, prime_min, prime_max,
                               palier_source, duree_min, duree_max, duree_source, montant, actif, date_debut, date_fin)
SELECT (SELECT id_compagnie FROM compagnie WHERE code_compagnie = 'ZENITHE'), NULL, NULL, '[NON IDENTIFIEE]', 'aucun', NULL, NULL,
       '[PAS DE PALIER]', NULL, NULL, '[AUCUNE SEGMENTATION]', 2500, true, DATE '2000-01-01', DATE '2099-12-31'
 WHERE NOT EXISTS (SELECT 1 FROM bareme_accessoire x
                    WHERE x.id_compagnie = (SELECT id_compagnie FROM compagnie WHERE code_compagnie = 'ZENITHE'));

-- Contrôle : il ne doit rester que 3 lignes à 3 000 (PROASSUR 107 et 110, SUNU 20)
\echo '--- B. lignes à 3 000 FCFA (après) : attendu 3 (ids 20, 107, 110) ---'
SELECT b.id, k.code_compagnie, b.risque_source, b.duree_source, b.palier_source, b.montant
  FROM bareme_accessoire b JOIN compagnie k USING (id_compagnie) WHERE b.montant = 3000 ORDER BY b.id;

\echo '--- B. lignes ajoutées ou modifiées (AFRINS, Pool, SUNU autres risques, ZENITHE) ---'
SELECT b.id, k.code_compagnie, b.code_branche, b.code_categorie, b.risque_source, b.type_palier, b.prime_min, b.prime_max, b.duree_source, b.montant
  FROM bareme_accessoire b JOIN compagnie k USING (id_compagnie)
 WHERE k.code_compagnie IN ('AFRINS', 'ZENITHE')
    OR (b.id_compagnie = 0 AND b.code_categorie IN ('04A', '04B', '04C'))
    OR (k.code_compagnie = 'SUNU' AND (b.risque_source = 'Autres risques' OR b.id = 21)) ORDER BY b.id;

-- Signature de la fonction, pour la recette manuelle
SELECT oid::regprocedure FROM pg_proc WHERE proname = 'fn_accessoires';

-- Recette (lecture seule). Attendus : T1 3150 ; T2 2500 ; T3 2500 ; T4 2500 ; T5 2500 ; T6 3000 ; T7 2500 ; T8 5000
SELECT 'T1 AFRINS cat 01, 122358, 1 an' AS test, * FROM fn_accessoires((SELECT id_compagnie FROM compagnie WHERE code_compagnie='AFRINS'),'AUTOMOBILE','01',122358, DATE '2026-10-03', DATE '2027-10-03', DATE '2026-10-03');
SELECT 'T2 AFRINS cat 01, 98143, 1 an'  AS test, * FROM fn_accessoires((SELECT id_compagnie FROM compagnie WHERE code_compagnie='AFRINS'),'AUTOMOBILE','01', 98143, DATE '2026-10-03', DATE '2027-10-03', DATE '2026-10-03');
SELECT 'T3 AFRINS cat 02, 150000, 1 an' AS test, * FROM fn_accessoires((SELECT id_compagnie FROM compagnie WHERE code_compagnie='AFRINS'),'AUTOMOBILE','02',150000, DATE '2026-10-03', DATE '2027-10-03', DATE '2026-10-03');
SELECT 'T4 Pool 04A, niveau générique'   AS test, * FROM fn_accessoires(0,'AUTOMOBILE','04A',50000, DATE '2026-10-03', DATE '2027-10-03', DATE '2026-10-03');
SELECT 'T5 SUNU mono-véhicule, 3 mois'  AS test, * FROM fn_accessoires((SELECT id_compagnie FROM compagnie WHERE code_compagnie='SUNU'),'AUTOMOBILE',NULL::varchar,150000, DATE '2026-10-03', DATE '2027-01-03', DATE '2026-10-03');
SELECT 'T6 SUNU mono-véhicule, annuel 150000' AS test, * FROM fn_accessoires((SELECT id_compagnie FROM compagnie WHERE code_compagnie='SUNU'),'AUTOMOBILE',NULL::varchar,150000, DATE '2026-10-03', DATE '2027-10-03', DATE '2026-10-03');
SELECT 'T7 SUNU autres risques, 80000'  AS test, * FROM fn_accessoires((SELECT id_compagnie FROM compagnie WHERE code_compagnie='SUNU'),'INCENDIE',NULL::varchar, 80000, DATE '2026-10-03', DATE '2027-10-03', DATE '2026-10-03');
SELECT 'T8 SUNU autres risques, 500000' AS test, * FROM fn_accessoires((SELECT id_compagnie FROM compagnie WHERE code_compagnie='SUNU'),'INCENDIE',NULL::varchar,500000, DATE '2026-10-03', DATE '2027-10-03', DATE '2026-10-03');

-- ---------- C. PROPOSITION (non demandée) : majoration « permis récent » à 2 ans (arrêté 00380/MINEF/DCE/A, art. 5-3), et non 3 ----------
-- Retirer ce bloc si la correction n'est pas validée.
\echo '--- C. majoration_reduction (avant) ---'
SELECT id, critere, description FROM majoration_reduction WHERE critere = 'CONDUCTEUR_JEUNE_OU_PERMIS_RECENT';
UPDATE majoration_reduction
   SET description = 'Conducteur habituel de moins de 25 ans OU permis de conduire de moins de 2 ans — RC uniquement (arrêté 00380/MINEF/DCE/A du 16/11/1994, art. 5-3)'
 WHERE critere = 'CONDUCTEUR_JEUNE_OU_PERMIS_RECENT' AND description LIKE '%3 ans%';
\echo '--- C. majoration_reduction (après) ---'
SELECT id, critere, description FROM majoration_reduction WHERE critere = 'CONDUCTEUR_JEUNE_OU_PERMIS_RECENT';
-- Si une fonction ou une application code « 3 ans » en dur, elle est à corriger séparément.
