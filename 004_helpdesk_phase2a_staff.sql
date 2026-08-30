-- =====================================================================
-- Mutuelle Pro Assurances — Espace Collaboratif Unifié, Phase 2a
-- Tables site.role_staff, site.staff, site.session_staff
-- Rédigé le 20/08/2026
-- =====================================================================

BEGIN;

CREATE TABLE site.role_staff (
    id_role         serial PRIMARY KEY,
    code_role       varchar(30) NOT NULL UNIQUE,
    libelle_fr      varchar(100) NOT NULL,
    libelle_en      varchar(100) NOT NULL
);

INSERT INTO site.role_staff (code_role, libelle_fr, libelle_en) VALUES
    ('agent',                       'Agent',                                'Agent'),
    ('gestionnaire',                'Gestionnaire Production/Sinistre',     'Production/Claims Manager'),
    ('comptable_superviseur',       'Comptable / Superviseur',              'Accountant / Supervisor'),
    ('administrateur',              'Administrateur',                      'Administrator');

CREATE TABLE site.staff (
    id_staff                serial PRIMARY KEY,
    matricule               varchar(20) NOT NULL UNIQUE,
    email                   citext NOT NULL UNIQUE,
    mot_de_passe_hache      text NOT NULL,
    id_role                 int NOT NULL REFERENCES site.role_staff (id_role),
    nom_complet             varchar(150) NOT NULL,
    telephone               varchar(20),
    statut_compte           varchar(20) NOT NULL DEFAULT 'actif' CHECK (statut_compte IN ('actif','suspendu')),
    date_creation           timestamptz NOT NULL DEFAULT now(),
    date_derniere_connexion timestamptz
);

CREATE INDEX idx_staff_email ON site.staff (email);

-- Store de session DISTINCT du client (cookie "connect.sid.staff"), pour
-- qu'une session client et une session staff ne puissent jamais se
-- confondre, même sur un poste d'agence partagé.
CREATE TABLE site.session_staff (
    sid     varchar NOT NULL COLLATE "default",
    sess    json    NOT NULL,
    expire  timestamp(6) NOT NULL
) WITH (OIDS = FALSE);

ALTER TABLE site.session_staff
    ADD CONSTRAINT session_staff_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX idx_session_staff_expire ON site.session_staff (expire);

COMMIT;

-- ---------------------------------------------------------------------
-- Droits (hors transaction) :
--   GRANT SELECT ON site.role_staff TO mutuellepro;
--   GRANT SELECT, INSERT, UPDATE ON site.staff TO mutuellepro;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON site.session_staff TO mutuellepro;
-- Pas de droit DELETE sur site.staff : suspension via statut_compte,
-- jamais de suppression physique d'un compte staff (traçabilité).
-- ---------------------------------------------------------------------
