-- Rollback migration 068 — Motif DTA « déjà acquittée auprès d'un autre assureur »
-- Session Normalisation. Code final : ACQUITTEE_AILLEURS (18 caractères).
--
-- Pas de garde explicite nécessaire : la contrainte FK existante
-- mouvements_dta_code_motif_exemption_fkey (RESTRICT par défaut) empêche déjà
-- la suppression si un mouvement utilise ce motif — le DELETE échoue alors
-- de lui-même, ce qui est le comportement voulu.

BEGIN;

DELETE FROM site.dta_motifs_exemption WHERE code = 'ACQUITTEE_AILLEURS';

COMMIT;
