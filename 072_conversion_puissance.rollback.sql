-- Retour arrière de PROVISOIRE_conversion_puissance_15102026.sql (supprime les deux fonctions et les deux tables).
-- Aucun autre objet ne dépend de ces éléments tant que le moteur ne les appelle pas.
\if :{?commit}
\else
  \set commit false
\endif
BEGIN;
DROP FUNCTION IF EXISTS tarification.fn_determiner_cas_conversion(varchar,numeric,numeric,boolean);
DROP FUNCTION IF EXISTS tarification.fn_convertir_puissance_en_cv(integer,varchar,varchar,varchar,numeric,date);
DROP TABLE IF EXISTS tarification.tranche_conversion_puissance;
DROP TABLE IF EXISTS tarification.regle_conversion_puissance;
\if :commit
COMMIT;
\echo '>>> RETOUR ARRIÈRE APPLIQUÉ.'
\else
ROLLBACK;
\echo '>>> ESSAI À BLANC : annulé.'
\endif
