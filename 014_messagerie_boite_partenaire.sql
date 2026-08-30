-- =====================================================================
-- Mutuelle Pro Assurances — Messagerie intégrée, Phase 1 (lecture)
-- Rédigé le 21/08/2026
-- =====================================================================
-- Chaque partenaire a sa propre boîte IMAP isolée (créée manuellement
-- par l'administrateur dans ISPConfig, même adresse que site.partenaires.email).
-- Le mot de passe de cette boîte est stocké CHIFFRÉ (AES-256-GCM),
-- jamais en clair, déchiffré uniquement côté serveur au moment de la
-- connexion IMAP.
-- =====================================================================

BEGIN;

ALTER TABLE site.partenaires ADD COLUMN imap_mot_de_passe_chiffre text;

COMMIT;
