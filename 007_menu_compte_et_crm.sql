-- =====================================================================
-- Mutuelle Pro Assurances — Menu "Gestion de mon compte" + Phase 3a CRM
-- Rédigé le 21/08/2026
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Extension du profil client — champs texte uniquement ce soir (nom,
-- prénom, date de naissance, adresse). Documents/avatar/photo NON
-- inclus ici — nécessitent une infrastructure de stockage de fichiers,
-- volontairement différée (voir menu grisé côté frontend).
-- ---------------------------------------------------------------------
ALTER TABLE site.utilisateurs
    ADD COLUMN nom             varchar(100),
    ADD COLUMN prenom          varchar(100),
    ADD COLUMN date_naissance  date,
    ADD COLUMN adresse         text;

-- ---------------------------------------------------------------------
-- CRM & Prospection (§2.1 du CDCF) — transformation d'un ticket en
-- fiche Prospect 360°, historique des interactions.
-- ---------------------------------------------------------------------
CREATE TABLE site.prospects (
    id_prospect          serial PRIMARY KEY,
    id_ticket_origine    int REFERENCES site.tickets (id_ticket),
    id_utilisateur       int REFERENCES site.utilisateurs (id_utilisateur),
    nom_complet           varchar(150),
    email                citext,
    telephone            varchar(20),
    branche_interet       varchar(100),
    statut_opportunite    varchar(20) NOT NULL DEFAULT 'nouveau'
                              CHECK (statut_opportunite IN ('nouveau','qualifie','propose','gagne','perdu')),
    id_staff_assigne     int REFERENCES site.staff (id_staff),
    date_creation        timestamptz NOT NULL DEFAULT now(),
    date_maj             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_prospects_statut ON site.prospects (statut_opportunite);
CREATE INDEX idx_prospects_staff_assigne ON site.prospects (id_staff_assigne);
CREATE INDEX idx_prospects_ticket_origine ON site.prospects (id_ticket_origine);

CREATE TABLE site.interactions_prospect (
    id_interaction     serial PRIMARY KEY,
    id_prospect        int NOT NULL REFERENCES site.prospects (id_prospect) ON DELETE CASCADE,
    id_staff           int REFERENCES site.staff (id_staff),
    type_interaction    varchar(30) NOT NULL,  -- appel / email / note / rdv
    contenu             text NOT NULL,
    date_interaction    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_interactions_prospect_id_prospect ON site.interactions_prospect (id_prospect);

CREATE TRIGGER trg_prospects_touch_date_maj
    BEFORE UPDATE ON site.prospects
    FOR EACH ROW
    EXECUTE FUNCTION site.fn_touch_date_maj();

COMMIT;

-- Droits (hors transaction) :
--   GRANT SELECT, UPDATE ON site.utilisateurs TO mutuellepro; -- déjà accordé, rappel
--   GRANT SELECT, INSERT, UPDATE ON site.prospects TO mutuellepro;
--   GRANT USAGE, SELECT ON site.prospects_id_prospect_seq TO mutuellepro;
--   GRANT SELECT, INSERT ON site.interactions_prospect TO mutuellepro;
--   GRANT USAGE, SELECT ON site.interactions_prospect_id_interaction_seq TO mutuellepro;
