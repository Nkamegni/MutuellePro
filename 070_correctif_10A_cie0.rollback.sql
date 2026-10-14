-- 070_correctif_10A_cie0.rollback.sql   (annulation de la migration 070)
-- Rétablit les deux montants d'origine du tarif 48 (10A, compagnie 0, zone A). Refuse si les lignes n'ont pas les valeurs corrigées.
-- Essai à blanc (exécute l'annulation puis ROLLBACK) : ajouter -v commit=false
-- Exécution : sudo -u postgres psql -d vpiclist -X -v ON_ERROR_STOP=1 -f - < 070_correctif_10A_cie0.rollback.sql
\if :{?commit}
\else
\set commit true
\endif
BEGIN;
DO $$
BEGIN
  IF (SELECT count(*) FROM tarification.bareme_tranche WHERE (id_bareme_tranche, prime_unique) IN ((1806,79057),(1808,118686))) <> 2 THEN
    RAISE EXCEPTION 'les lignes 1806 et 1808 n''ont pas les valeurs corrigées : arrêt';
  END IF;
END $$;
UPDATE tarification.bareme_tranche SET prime_unique = 79054  WHERE id_bareme_tranche = 1806 AND id_tarif = 48;
UPDATE tarification.bareme_tranche SET prime_unique = 118868 WHERE id_bareme_tranche = 1808 AND id_tarif = 48;
SELECT id_bareme_tranche, prime_unique FROM tarification.bareme_tranche WHERE id_bareme_tranche IN (1806,1808) ORDER BY 1;
\if :commit
COMMIT;
\else
ROLLBACK;
\echo 'ESSAI A BLANC : rien n''est conserve'
\endif
