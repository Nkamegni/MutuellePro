-- =====================================================================
-- Mutuelle Pro Assurances — Espace Collaboratif Unifié, Phase 2c
-- Table site.reinitialisation_mdp_tokens
-- Rédigé le 21/08/2026
-- =====================================================================

BEGIN;

CREATE TABLE site.reinitialisation_mdp_tokens (
    token               varchar(64) PRIMARY KEY,
    id_utilisateur      int NOT NULL REFERENCES site.utilisateurs (id_utilisateur) ON DELETE CASCADE,
    date_creation       timestamptz NOT NULL DEFAULT now(),
    date_expiration     timestamptz NOT NULL DEFAULT (now() + interval '1 hour')  -- plus court que la vérification email : action sensible
);

CREATE INDEX idx_reinit_mdp_tokens_utilisateur ON site.reinitialisation_mdp_tokens (id_utilisateur);
CREATE INDEX idx_reinit_mdp_tokens_expiration ON site.reinitialisation_mdp_tokens (date_expiration);

COMMIT;

-- Droits (hors transaction) :
--   GRANT SELECT, INSERT, DELETE ON site.reinitialisation_mdp_tokens TO mutuellepro;
