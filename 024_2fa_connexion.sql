-- =====================================================================
-- Mutuelle Pro Assurances -- 2FA a la connexion, 3 roles (02/09/2026)
-- Demande de Roger : securiser la connexion des l'entree, pas seulement
-- signaler apres coup (email "Connexion reussie" deja livre au Lot B).
-- =====================================================================

BEGIN;

CREATE TABLE site.codes_verification_connexion (
    id_code          SERIAL PRIMARY KEY,
    type_compte      VARCHAR(12) NOT NULL CHECK (type_compte IN ('client', 'staff', 'partenaire')),
    id_compte        INTEGER NOT NULL,
    code             VARCHAR(6) NOT NULL,
    date_creation    TIMESTAMPTZ NOT NULL DEFAULT now(),
    date_expiration  TIMESTAMPTZ NOT NULL,
    tentatives       INTEGER NOT NULL DEFAULT 0,
    utilise          BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX idx_codes_verif_compte ON site.codes_verification_connexion (type_compte, id_compte, utilise);

COMMIT;
