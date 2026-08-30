-- =====================================================================
-- Mutuelle Pro Assurances — Messagerie Personnel : une boîte par compte
-- Rédigé le 21/08/2026
-- =====================================================================
-- Jusqu'ici, TOUT le Personnel partageait la boîte admin@ (identifiants
-- fixes .env) — un membre voyait la boîte d'un autre, jamais la sienne.
-- Même principe que pour les partenaires : chaque compte staff a
-- maintenant son propre mot de passe de boîte mail, chiffré.
-- =====================================================================

BEGIN;

ALTER TABLE site.staff ADD COLUMN imap_mot_de_passe_chiffre text;

COMMIT;
