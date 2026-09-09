-- =====================================================================
-- Mutuelle Pro Assurances -- Mot de passe oublie, Personnel + Partenaire
-- Redige le 03/09/2026 -- table partagee (type_compte/id_compte), sur
-- le meme principe que historique_connexions et
-- codes_verification_connexion cette nuit. Client garde sa propre table
-- (site.reinitialisation_mdp_tokens, liee par FK directe) -- non touchee.
-- =====================================================================

BEGIN;

CREATE TABLE site.tokens_reinitialisation_mdp (
    token            VARCHAR(64) PRIMARY KEY,
    type_compte      VARCHAR(12) NOT NULL CHECK (type_compte IN ('staff', 'partenaire')),
    id_compte        INTEGER NOT NULL,
    date_creation    TIMESTAMPTZ NOT NULL DEFAULT now(),
    date_expiration  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour')
);
CREATE INDEX idx_tokens_reinit_compte ON site.tokens_reinitialisation_mdp (type_compte, id_compte);
CREATE INDEX idx_tokens_reinit_expiration ON site.tokens_reinitialisation_mdp (date_expiration);

COMMIT;

-- Droits (hors transaction) :
--   GRANT SELECT, INSERT, DELETE ON site.tokens_reinitialisation_mdp TO mutuellepro;
