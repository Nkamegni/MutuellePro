-- =====================================================================
-- Mutuelle Pro Assurances — Suivi de ticket anonyme (par identifiant)
-- Rédigé le 27/08/2026, révisé le 27/08/2026 (identifiant email OU
-- téléphone, plutôt que téléphone seul — décision de Roger)
-- =====================================================================
-- Permet à un visiteur non enregistré de consulter le statut de ses
-- tickets avec pour seule clé l'email OU le téléphone fourni au moment
-- de sa demande, après un défi à code à usage unique (6 chiffres,
-- 10 min). Canal réel : e-mail (fonctionnel dès maintenant) si un
-- email est fourni ; SMS/WhatsApp (en attente de fournisseur) si un
-- téléphone est fourni — voir lib/envoiCodeSuivi.js.
-- =====================================================================

BEGIN;

CREATE TABLE site.suivi_ticket_codes (
    id_code           serial PRIMARY KEY,
    identifiant       varchar(255) NOT NULL,
    code              varchar(6) NOT NULL,
    date_creation     timestamptz NOT NULL DEFAULT now(),
    date_expiration   timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
    tentatives        int NOT NULL DEFAULT 0,
    utilise           boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_suivi_ticket_codes_identifiant ON site.suivi_ticket_codes (identifiant);

COMMIT;

-- Droits (hors transaction) :
--   GRANT SELECT, INSERT, UPDATE, DELETE ON site.suivi_ticket_codes TO mutuellepro;
--   GRANT USAGE, SELECT ON site.suivi_ticket_codes_id_code_seq TO mutuellepro;
