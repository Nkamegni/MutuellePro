-- 062_surprimes_facteurs.rollback.sql   (migration 062)
-- Supprime les quatre tables des surprimes créées par la migration. N'agit sur aucune table existante.
-- Garde-fou : refuse de supprimer si une autre table dépend de ces tables ou si les volumes ne sont pas ceux de la migration.
-- Exécution : sudo -u postgres psql -d vpiclist -X -v ON_ERROR_STOP=1 -f - < 062_surprimes_facteurs.rollback.sql
BEGIN;
DO $$
DECLARE n_tr int; n_ts int;
BEGIN
  IF to_regclass('tarification.tranche_tarif_surprime') IS NULL THEN RAISE EXCEPTION 'Tables des surprimes absentes : rien à annuler'; END IF;
  SELECT count(*) INTO n_tr FROM tarification.tranche_tarif_surprime;
  SELECT count(*) INTO n_ts FROM tarification.tarif_surprime;
  IF n_tr <> 76 OR n_ts <> 8 THEN
    RAISE EXCEPTION 'Volumes modifiés depuis la migration (% tranches, % tarifs au lieu de 76 et 8) : arrêt, consulter la session Tarification', n_tr, n_ts;
  END IF;
END $$;
-- sans CASCADE : échoue si un objet extérieur dépend de ces tables
DROP TABLE tarification.tranche_tarif_surprime;
DROP TABLE tarification.tarif_surprime;
DROP TABLE tarification.facteur_surprime;
DROP TABLE tarification.mode_application_surprime;
SELECT count(*) AS tables_surprime_restantes FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'tarification' AND c.relkind = 'r' AND c.relname ~ 'surprime';
COMMIT;
