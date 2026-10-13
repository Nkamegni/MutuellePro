-- Rollback migration 067 — Contrôle du VIN et identifiant du risque
-- Session Normalisation. Version finale corrigée (13/10/2026).
--
-- Historique des défauts corrigés :
-- 1. Version initiale (MD5 17f3d166…, 1856 octets) : REVOKE sur la séquence
--    exécuté sans condition, avant toute vérification d'existence. Sur une
--    séquence absente, REVOKE/DROP lèvent une erreur et font échouer toute
--    la transaction.
-- 2. Deuxième version : lisait `is_called` dans la vue `pg_sequences`. Cette
--    vue N'A PAS de colonne `is_called` (elle expose seulement : schemaname,
--    sequencename, sequenceowner, data_type, start_value, min_value,
--    max_value, increment_by, cycle, cache_size, last_value) — même erreur,
--    pour une raison différente (colonne inexistante).
-- Version présente : vérifie l'existence avec to_regclass (renvoie NULL sans
-- erreur si absent), puis lit is_called directement sur la séquence
-- elle-même (SELECT is_called FROM <sequence>, où la colonne existe bien).
--
-- Garde sur le volume (même principe que la migration 062) : la séquence
-- n'est supprimée que si elle n'a jamais été tirée (nextval jamais appelé) --
-- sinon, des identifiants de risque générés existeraient déjà dans des
-- mouvements réels, et la supprimer romprait la correspondance avec ces
-- lignes. Dans ce cas, le rollback retire le droit d'accès mais laisse la
-- séquence en place pour inspection manuelle.

BEGIN;

-- 1. Contrainte VIN : retrait sans condition (aucune donnée n'en dépend
-- pour exister, seulement pour être refusée à la saisie). DROP CONSTRAINT
-- IF EXISTS ne lève jamais d'erreur si elle est déjà absente.
ALTER TABLE site.mouvements
  DROP CONSTRAINT IF EXISTS mouvements_vin_longueur_min;

-- 2. Séquence identifiant du risque.
DO $$
DECLARE
  deja_utilisee boolean;
BEGIN
  IF to_regclass('site.seq_identifiant_risque') IS NULL THEN
    RAISE NOTICE 'Séquence site.seq_identifiant_risque introuvable — rien à faire.';
    RETURN;
  END IF;

  -- is_called se lit sur la séquence elle-même (pas dans pg_sequences, qui
  -- n'expose pas cette colonne).
  EXECUTE 'SELECT is_called FROM site.seq_identifiant_risque' INTO deja_utilisee;

  IF deja_utilisee THEN
    -- nextval() déjà appelé : des identifiants générés dépendent probablement
    -- de cette séquence. On ne la supprime pas, on retire seulement l'accès.
    EXECUTE 'REVOKE USAGE, SELECT ON SEQUENCE site.seq_identifiant_risque FROM mutuellepro';
    RAISE NOTICE 'Séquence déjà utilisée (nextval appelé) — accès révoqué pour mutuellepro, séquence NON supprimée. Vérification manuelle requise avant toute suppression.';
  ELSE
    -- Jamais utilisée : suppression sûre, rien n'en dépend.
    EXECUTE 'DROP SEQUENCE site.seq_identifiant_risque';
    RAISE NOTICE 'Séquence site.seq_identifiant_risque supprimée (jamais utilisée).';
  END IF;
END $$;

COMMIT;
