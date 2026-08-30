-- =====================================================================
-- Mutuelle Pro Assurances — Partenaires : codification, multi-contacts,
-- activation par email
-- Rédigé le 21/08/2026
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Codification lettre (catégorie) + numéro (type) — ouverte à évolution
-- future (nouvelles lettres, numéros au-delà de 2 chiffres si besoin).
-- ---------------------------------------------------------------------
ALTER TABLE site.categorie_partenaire ADD COLUMN code_lettre varchar(2) UNIQUE;

UPDATE site.categorie_partenaire SET code_lettre = CASE code_categorie
    WHEN 'distribution_vente'   THEN 'A'
    WHEN 'soin_indemnisation'   THEN 'B'
    WHEN 'finance_securisation' THEN 'C'
    WHEN 'risque_conformite'    THEN 'D'
    WHEN 'technique_operations' THEN 'E'
    WHEN 'institutionnel'       THEN 'F'
    WHEN 'clients_groupes'      THEN 'G'
END;

ALTER TABLE site.categorie_partenaire ALTER COLUMN code_lettre SET NOT NULL;

ALTER TABLE site.type_partenaire ADD COLUMN code varchar(6) UNIQUE;

-- Numérotation séquentielle par catégorie, dans l'ordre alphabétique du
-- libellé — reproduit exactement la liste numérotée fournie par Roger.
WITH numerotation AS (
    SELECT tp.id_type_partenaire,
           cp.code_lettre || LPAD(ROW_NUMBER() OVER (PARTITION BY tp.id_categorie ORDER BY tp.libelle_fr)::text, 2, '0') AS code_genere
    FROM site.type_partenaire tp
    JOIN site.categorie_partenaire cp ON cp.id_categorie = tp.id_categorie
)
UPDATE site.type_partenaire tp
SET code = n.code_genere
FROM numerotation n
WHERE n.id_type_partenaire = tp.id_type_partenaire;

ALTER TABLE site.type_partenaire ALTER COLUMN code SET NOT NULL;

-- ---------------------------------------------------------------------
-- Contacts multiples par partenaire, avec un contact par défaut
-- obligatoire (utile pour les campagnes de mailing).
-- ---------------------------------------------------------------------
CREATE TABLE site.partenaire_contacts (
    id_contact       serial PRIMARY KEY,
    id_partenaire    int NOT NULL REFERENCES site.partenaires (id_partenaire) ON DELETE CASCADE,
    nom              varchar(100) NOT NULL,
    prenom           varchar(100),
    fonction         varchar(100),
    telephone        varchar(20),
    email            citext,
    est_defaut       boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_partenaire_contacts_id_partenaire ON site.partenaire_contacts (id_partenaire);

-- Un seul contact par défaut par partenaire, garanti au niveau base.
CREATE UNIQUE INDEX idx_partenaire_contacts_un_seul_defaut
    ON site.partenaire_contacts (id_partenaire)
    WHERE est_defaut = true;

-- Reprise des contacts uniques déjà saisis (colonnes historiques de
-- site.partenaires) dans la nouvelle table, marqués par défaut.
INSERT INTO site.partenaire_contacts (id_partenaire, nom, prenom, fonction, telephone, est_defaut)
SELECT id_partenaire, nom_contact, prenom_contact, fonction_contact, telephone_contact, true
FROM site.partenaires
WHERE nom_contact IS NOT NULL;

ALTER TABLE site.partenaires
    DROP COLUMN nom_contact,
    DROP COLUMN prenom_contact,
    DROP COLUMN fonction_contact,
    DROP COLUMN telephone_contact;

-- ---------------------------------------------------------------------
-- Activation de compte par email (remplace le mot de passe temporaire
-- affiché à l'écran) — même principe que verification_email_tokens
-- côté client.
-- ---------------------------------------------------------------------
CREATE TABLE site.activation_partenaire_tokens (
    token               varchar(64) PRIMARY KEY,
    id_partenaire       int NOT NULL REFERENCES site.partenaires (id_partenaire) ON DELETE CASCADE,
    date_creation       timestamptz NOT NULL DEFAULT now(),
    date_expiration     timestamptz NOT NULL DEFAULT (now() + interval '72 hours')
);

CREATE INDEX idx_activation_partenaire_tokens_id_partenaire ON site.activation_partenaire_tokens (id_partenaire);

ALTER TABLE site.partenaires ADD COLUMN mot_de_passe_defini boolean NOT NULL DEFAULT false;

COMMIT;

-- Droits (hors transaction) :
--   GRANT SELECT, INSERT, UPDATE, DELETE ON site.partenaire_contacts TO mutuellepro;
--   GRANT USAGE, SELECT ON site.partenaire_contacts_id_contact_seq TO mutuellepro;
--   GRANT SELECT, INSERT, DELETE ON site.activation_partenaire_tokens TO mutuellepro;
