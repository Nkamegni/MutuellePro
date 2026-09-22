-- =====================================================================
-- Mutuelle Pro Assurances -- site.messages_dossier (Lot E, 15/09/2026)
-- Messagerie fil-par-dossier, temps réel -- Client, Staff, Partenaire
-- (extension Partenaires du 15/09 intégrée dès la création, la table
-- n'avait jamais été appliquée -- pas de ALTER/DROP CONSTRAINT
-- nécessaire, confirmé par \d site.messages_dossier -- relation
-- introuvable).
-- =====================================================================

CREATE TABLE IF NOT EXISTS site.messages_dossier (
    id_message       SERIAL PRIMARY KEY,
    id_ticket        INTEGER NOT NULL REFERENCES site.tickets(id_ticket),
    type_auteur      VARCHAR(10) NOT NULL CHECK (type_auteur IN ('client', 'staff', 'partenaire')),
    id_auteur        INTEGER NOT NULL,
    contenu          TEXT NOT NULL,
    date_creation    TIMESTAMPTZ NOT NULL DEFAULT now(),
    lu_par_client     BOOLEAN NOT NULL DEFAULT false,
    lu_par_staff      BOOLEAN NOT NULL DEFAULT false,
    lu_par_partenaire BOOLEAN NOT NULL DEFAULT false,
    visible_client    BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_messages_dossier_ticket ON site.messages_dossier (id_ticket, date_creation);

GRANT SELECT, INSERT, UPDATE ON site.messages_dossier TO mutuellepro;
GRANT USAGE, SELECT ON site.messages_dossier_id_message_seq TO mutuellepro;
