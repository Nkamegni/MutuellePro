-- =====================================================================
-- Mutuelle Pro Assurances — Espace Collaboratif Unifié, Phase 2b
-- Assignation des tickets + journal d'audit
-- Rédigé le 21/08/2026
-- =====================================================================

BEGIN;

ALTER TABLE site.tickets
    ADD COLUMN id_staff_assigne int REFERENCES site.staff (id_staff);

CREATE INDEX idx_tickets_id_staff_assigne ON site.tickets (id_staff_assigne);

CREATE TABLE site.journal_audit (
    id_journal          bigserial PRIMARY KEY,
    id_staff            int REFERENCES site.staff (id_staff),
    action               varchar(50) NOT NULL,
    table_concernee      varchar(50),
    id_enregistrement    int,
    donnees_avant        jsonb,
    donnees_apres        jsonb,
    adresse_ip           varchar(45),
    date_action          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_journal_audit_id_staff ON site.journal_audit (id_staff);
CREATE INDEX idx_journal_audit_table_id ON site.journal_audit (table_concernee, id_enregistrement);

COMMIT;

-- Droits (hors transaction) :
--   GRANT SELECT, INSERT ON site.journal_audit TO mutuellepro;
--   GRANT USAGE, SELECT ON site.journal_audit_id_journal_seq TO mutuellepro;
-- Pas de UPDATE/DELETE sur journal_audit : un journal d'audit ne se
-- modifie ni ne se supprime jamais, par construction.
