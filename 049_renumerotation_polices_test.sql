-- =====================================================================
-- Renumérotation des polices de TEST au format P99 AAAA BB 99999 — 06/10/2026
-- Appliqué le 06/10/2026 (environnement de test, aucune police n'avait circulé).
-- Archive : ne pas rejouer.
--
-- Usage d'origine :
--   sudo -u postgres psql -d vpiclist -P pager=off -v ON_ERROR_STOP=1 -v commit=true -f renumerotation_polices_test_06102026.sql
-- =====================================================================
BEGIN;
CREATE TEMP TABLE _renum(ancien text, nouveau text);
INSERT INTO _renum VALUES
  ('P01 2026 01 0001', 'P01 2026 10 00001'),
  ('P01 2026 10 0002', 'P01 2026 10 00002'),
  ('P01 2026 13 0001', 'P01 2026 13 00001');

\echo '--- Numéros au format police dans police_cotation (doit être vide) ---'
SELECT numero_police FROM tarification.police_cotation WHERE numero_police ~ '^P[0-9]{2} ';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM site.contrats c JOIN _renum r ON c.numero_police = r.nouveau) THEN
    RAISE EXCEPTION '[ÉCHEC]  un nouveau numéro existe déjà';
  END IF;
END $$;

UPDATE site.contrats c SET numero_police = r.nouveau FROM _renum r WHERE c.numero_police = r.ancien;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM site.contrats
   WHERE numero_police !~ '^P[0-9]{2} [0-9]{4} [0-9]{2} [0-9]{5}$';
  IF n > 0 THEN RAISE EXCEPTION '[ÉCHEC]  % numéro(s) hors format', n; END IF;
  RAISE NOTICE '[OK]     Tous les numéros au format P99 AAAA BB 99999';
END $$;

\if :commit
  COMMIT;
\else
  ROLLBACK;
\endif
