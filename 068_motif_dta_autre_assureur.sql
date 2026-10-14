-- Migration 068 — Motif DTA « déjà acquittée auprès d'un autre assureur »
-- Session Normalisation — réserve : Git/GitHub.
-- Répond à : DEMANDE_MOTIF_DTA_AUTRE_ASSUREUR_13102026.md
--
-- Structure réelle vérifiée (13-14/10/2026, lecture seule) :
--   site.dta_motifs_exemption : code varchar(20) PK, libelle varchar(250),
--   ordre int — aucune colonne de date ni d'indicateur d'activité, aucun
--   GRANT nécessaire (table existante). 10 motifs actuels, ordre 1 à 10
--   (ADMIN … ETRANGER_3M).
--   Contrainte FK déjà en place : mouvements_dta_code_motif_exemption_fkey
--   (site.mouvements.dta_code_motif_exemption, varchar(20) — longueur
--   identique — -> site.dta_motifs_exemption.code).
--
-- Historique : premier essai à blanc refusé (14/10) — le code initialement
-- proposé, ACQUITTEE_AUTRE_ASSUREUR (24 caractères), dépassait la limite de
-- 20. Remplacé par ACQUITTEE_AILLEURS (18 caractères), sur proposition de
-- Git/GitHub. Le libellé (~77 caractères) tient largement dans varchar(250).

BEGIN;

INSERT INTO site.dta_motifs_exemption (code, libelle, ordre)
VALUES (
  'ACQUITTEE_AILLEURS',
  'DTA de l''exercice déjà acquittée auprès d''un autre assureur (reçu présenté)',
  11
);

COMMIT;
