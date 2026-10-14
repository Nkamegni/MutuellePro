-- 069_rc_categorie10_afg.rollback.sql
-- Supprime les trois tarifs RC AFG de catégorie 10 (10A, 10B, 10C) et leurs 72 lignes de barème (suppression en cascade).
-- Garde-fous : refuse si les volumes ne sont pas ceux de la migration ou si une cotation a déjà utilisé un de ces tarifs.
-- Essai à blanc (exécute l'annulation puis ROLLBACK) : ajouter -v commit=false
-- Exécution : sudo -u postgres psql -d vpiclist -X -v ON_ERROR_STOP=1 -f - < 069_rc_categorie10_afg.rollback.sql
\if :{?commit}
\else
\set commit true
\endif
BEGIN;
DO $$
DECLARE n_t int; n_b int; n_c int;
BEGIN
  SELECT count(*) INTO n_t FROM tarification.tarif WHERE id_compagnie = 9 AND id_offre_commerciale = 154 AND categorie_code IN ('10A','10B','10C');
  SELECT count(*) INTO n_b FROM tarification.bareme_tranche WHERE id_tarif IN (SELECT id_tarif FROM tarification.tarif WHERE id_compagnie = 9 AND id_offre_commerciale = 154 AND categorie_code IN ('10A','10B','10C'));
  SELECT count(*) INTO n_c FROM tarification.police_cotation WHERE id_tarif IN (SELECT id_tarif FROM tarification.tarif WHERE id_compagnie = 9 AND id_offre_commerciale = 154 AND categorie_code IN ('10A','10B','10C'));
  IF n_t <> 3 OR n_b <> 72 THEN RAISE EXCEPTION 'Volumes modifiés depuis la migration (% tarifs, % lignes au lieu de 3 et 72) : arrêt, consulter la session Tarification', n_t, n_b; END IF;
  IF n_c <> 0 THEN RAISE EXCEPTION '% cotation(s) utilisent ces tarifs : arrêt', n_c; END IF;
END $$;
DELETE FROM tarification.tarif WHERE id_compagnie = 9 AND id_offre_commerciale = 154 AND categorie_code IN ('10A','10B','10C');
SELECT count(*) AS tarifs_afg_cat10_restants FROM tarification.tarif WHERE id_compagnie = 9 AND categorie_code IN ('10A','10B','10C');
\if :commit
COMMIT;
\else
ROLLBACK;
\echo 'ESSAI A BLANC : rien n''est conserve'
\endif
