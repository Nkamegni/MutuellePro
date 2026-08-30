-- =====================================================================
-- Mutuelle Pro Assurances — Protection des comptes racine/admin,
-- complément de profil Personnel, activation de compte staff par lien
-- Rédigé le 21/08/2026
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Marqueurs de protection — deux niveaux distincts :
--   est_compte_racine          : jamais supprimable, par personne (trigger)
--   suppression_reservee_racine : supprimable UNIQUEMENT par un compte
--                                  est_compte_racine (vérifié applicatif)
-- Les DEUX ont leur identifiant (email) protégé de toute modification.
-- ---------------------------------------------------------------------
ALTER TABLE site.staff
    ADD COLUMN est_compte_racine boolean NOT NULL DEFAULT false,
    ADD COLUMN suppression_reservee_racine boolean NOT NULL DEFAULT false;

UPDATE site.staff SET est_compte_racine = true WHERE email = 'rnkamegni@mutuelleproassurances.com';

-- Complément de profil (parité avec les autres populations : client,
-- partenaire) — pour permettre à Roger de "documenter proprement" son
-- compte, comme demandé.
ALTER TABLE site.staff
    ADD COLUMN date_naissance date,
    ADD COLUMN adresse text;

-- Infrastructure d'activation par lien (parité avec les partenaires) —
-- pour tout NOUVEAU compte staff créé désormais (ex: admin@), plutôt
-- qu'un mot de passe temporaire affiché à l'écran.
ALTER TABLE site.staff
    ADD COLUMN mot_de_passe_defini boolean NOT NULL DEFAULT true,  -- true pour les comptes déjà actifs (ex: rnkamegni@)
    ADD COLUMN email_validation citext;  -- adresse personnelle recevant le lien d'activation

CREATE TABLE site.activation_staff_tokens (
    token               varchar(64) PRIMARY KEY,
    id_staff            int NOT NULL REFERENCES site.staff (id_staff) ON DELETE CASCADE,
    date_creation       timestamptz NOT NULL DEFAULT now(),
    date_expiration     timestamptz NOT NULL DEFAULT (now() + interval '72 hours')
);

CREATE INDEX idx_activation_staff_tokens_id_staff ON site.activation_staff_tokens (id_staff);

-- ---------------------------------------------------------------------
-- Trigger n°1 — suppression du compte racine STRICTEMENT interdite, au
-- niveau base de données (demande explicite de Roger : garantie
-- absolue, même une commande SQL directe malencontreuse est bloquée).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION site.fn_interdire_suppression_compte_racine()
RETURNS trigger AS $$
BEGIN
    IF OLD.est_compte_racine THEN
        RAISE EXCEPTION 'Ce compte est le compte racine de la plateforme — sa suppression est interdite, sans exception.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_interdire_suppression_compte_racine
    BEFORE DELETE ON site.staff
    FOR EACH ROW
    EXECUTE FUNCTION site.fn_interdire_suppression_compte_racine();

-- ---------------------------------------------------------------------
-- Trigger n°2 — identifiant (email) protégé de toute modification pour
-- les comptes racine ET les comptes à suppression réservée (ex: admin@).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION site.fn_proteger_identifiant_staff()
RETURNS trigger AS $$
BEGIN
    IF (OLD.est_compte_racine OR OLD.suppression_reservee_racine) AND NEW.email IS DISTINCT FROM OLD.email THEN
        RAISE EXCEPTION 'L''identifiant de ce compte est protégé — il ne peut pas être modifié.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_proteger_identifiant_staff
    BEFORE UPDATE ON site.staff
    FOR EACH ROW
    EXECUTE FUNCTION site.fn_proteger_identifiant_staff();

COMMIT;

-- Droits (hors transaction) :
--   GRANT SELECT, INSERT, DELETE ON site.activation_staff_tokens TO mutuellepro;
--   GRANT USAGE ON SCHEMA site TO mutuellepro; -- déjà accordé, rappel
-- Remarque : les fonctions trigger appartiennent au propriétaire du
-- schéma (postgres), s'exécutent avec ses droits — mutuellepro n'a pas
-- besoin de droits supplémentaires pour que les triggers s'appliquent.
