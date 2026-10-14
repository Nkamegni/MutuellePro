-- =====================================================================
-- 070_correctif_10A_cie0.sql   (migration 070, attribuée par Git le 14/10/2026)
-- Session Tarification. Corrige deux montants RC de la compagnie 0, catégorie 10A, zone A (tarif 48), arbitrés par Roger le 14/10/2026,
-- confirmés par un tarif tiers et conformes au document 1995 :
--   11 à 14 CV essence (8 à 10 CV diesel) : 79 054 -> 79 057        (ligne 1806)
--   24 CV et plus essence (17 et plus diesel) : 118 868 -> 118 686  (ligne 1808)
-- 15 à 23 CV (11 à 16 diesel) : 100 654, déjà exact, inchangé. Zones B et C : déjà conformes, inchangées.
-- Garde-fou : refuse si la ligne n'a pas la valeur attendue avant correction.
-- Exécution :  sudo -u postgres psql -d vpiclist -X -v ON_ERROR_STOP=1 -v commit=false -f - < fichier   (essai à blanc)
--              sudo -u postgres psql -d vpiclist -X -v ON_ERROR_STOP=1 -f - < fichier                      (application)
-- =====================================================================
\if :{?commit}
\else
\set commit true
\endif
BEGIN;
SET LOCAL search_path = tarification, public;
DO $$
BEGIN
  IF (SELECT prime_unique FROM bareme_tranche WHERE id_bareme_tranche = 1806 AND id_tarif = 48 AND borne_min = 11 AND criteres->>'zone' = 'A') IS DISTINCT FROM 79054 THEN
    RAISE EXCEPTION 'ligne 1806 absente ou différente de 79054';
  END IF;
  IF (SELECT prime_unique FROM bareme_tranche WHERE id_bareme_tranche = 1808 AND id_tarif = 48 AND borne_min = 24 AND criteres->>'zone' = 'A') IS DISTINCT FROM 118868 THEN
    RAISE EXCEPTION 'ligne 1808 absente ou différente de 118868';
  END IF;
END $$;
CREATE TEMP TABLE _avant AS SELECT id_bareme_tranche, prime_unique FROM bareme_tranche WHERE id_bareme_tranche IN (1806,1808);
UPDATE bareme_tranche SET prime_unique = 79057  WHERE id_bareme_tranche = 1806 AND id_tarif = 48;
UPDATE bareme_tranche SET prime_unique = 118686 WHERE id_bareme_tranche = 1808 AND id_tarif = 48;
DO $$
BEGIN
  IF (SELECT count(*) FROM bareme_tranche WHERE (id_bareme_tranche, prime_unique) IN ((1806,79057),(1808,118686))) <> 2 THEN RAISE EXCEPTION 'correction non appliquée'; END IF;
  IF (SELECT count(*) FROM bareme_tranche WHERE id_tarif = 48) <> 18 THEN RAISE EXCEPTION 'volume du tarif 48 modifié'; END IF;
END $$;
SELECT a.id_bareme_tranche, a.prime_unique AS avant, b.prime_unique AS apres
  FROM _avant a JOIN bareme_tranche b USING (id_bareme_tranche) ORDER BY 1;
\if :commit
COMMIT;
\else
ROLLBACK;
\echo 'ESSAI A BLANC : rien n''est conserve'
\endif
