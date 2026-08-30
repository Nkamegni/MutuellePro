-- =====================================================================
-- Mutuelle Pro Assurances — Partenaires : types multiples + contact
-- Rédigé le 21/08/2026
-- =====================================================================

BEGIN;

-- Un partenaire (personne morale, ex: prestataire technique) peut
-- exercer plusieurs rôles à la fois — table de liaison plutôt qu'un
-- FK unique.
CREATE TABLE site.partenaire_types (
    id_partenaire        int NOT NULL REFERENCES site.partenaires (id_partenaire) ON DELETE CASCADE,
    id_type_partenaire   int NOT NULL REFERENCES site.type_partenaire (id_type_partenaire),
    PRIMARY KEY (id_partenaire, id_type_partenaire)
);

-- Reprise des types déjà assignés (colonne unique existante) dans la
-- nouvelle table de liaison, avant suppression de la colonne.
INSERT INTO site.partenaire_types (id_partenaire, id_type_partenaire)
SELECT id_partenaire, id_type_partenaire FROM site.partenaires;

ALTER TABLE site.partenaires DROP COLUMN id_type_partenaire;

-- Champs du contact humain au sein de l'entité partenaire (ex: le
-- "nom_complet" est souvent une raison sociale — ALPHA ACCESS SARL —
-- distincte de la personne physique à contacter).
ALTER TABLE site.partenaires
    ADD COLUMN nom_contact       varchar(100),
    ADD COLUMN prenom_contact    varchar(100),
    ADD COLUMN fonction_contact  varchar(100),
    ADD COLUMN telephone_contact varchar(20);

COMMIT;

-- Droits (hors transaction) :
--   GRANT SELECT, INSERT, DELETE ON site.partenaire_types TO mutuellepro;
