-- =====================================================================
-- Mutuelle Pro Assurances — Espace unifié, Partenaires externes (MVP)
-- Rédigé le 21/08/2026
-- =====================================================================
-- Portée volontairement minimale : référentiel de types + comptes +
-- règle de visibilité simple ("le partenaire ne voit que ses dossiers
-- assignés"). Le système de groupes de permissions avec hiérarchie
-- (accord/refus révocable, arbitrage entre groupes) reste à concevoir
-- dans une session dédiée — non inclus ici.
-- =====================================================================

BEGIN;

CREATE TABLE site.categorie_partenaire (
    id_categorie    serial PRIMARY KEY,
    code_categorie  varchar(30) NOT NULL UNIQUE,
    libelle_fr      varchar(100) NOT NULL
);

INSERT INTO site.categorie_partenaire (code_categorie, libelle_fr) VALUES
    ('distribution_vente',    'Distribution / Vente'),
    ('soin_indemnisation',    'Soin / Indemnisation'),
    ('finance_securisation',  'Finance / Sécurisation'),
    ('risque_conformite',     'Risque & Conformité'),
    ('technique_operations',  'Technique & Opérations'),
    ('institutionnel',        'Institutionnel'),
    ('clients_groupes',       'Clients Groupés');

CREATE TABLE site.type_partenaire (
    id_type_partenaire  serial PRIMARY KEY,
    id_categorie        int NOT NULL REFERENCES site.categorie_partenaire (id_categorie),
    libelle_fr           varchar(100) NOT NULL
);

INSERT INTO site.type_partenaire (id_categorie, libelle_fr)
SELECT id_categorie, libelle FROM site.categorie_partenaire, (VALUES
    ('distribution_vente', 'Courtier'),
    ('distribution_vente', 'Agent Général'),
    ('distribution_vente', 'Apporteur d''Affaires'),
    ('distribution_vente', 'Conseiller Commercial'),
    ('distribution_vente', 'Téléconseiller'),
    ('distribution_vente', 'Partenaire Bancassurance'),
    ('soin_indemnisation', 'Médecin Conseil'),
    ('soin_indemnisation', 'Médecin Expert'),
    ('soin_indemnisation', 'Pharmacien conventionné'),
    ('soin_indemnisation', 'Laborantin'),
    ('soin_indemnisation', 'Opticien conventionné'),
    ('soin_indemnisation', 'Dentiste conventionné'),
    ('soin_indemnisation', 'Gestionnaire de clinique / Directeur d''hôpital'),
    ('soin_indemnisation', 'Expert Automobile'),
    ('soin_indemnisation', 'Garagiste / Carrossier'),
    ('soin_indemnisation', 'Expert Immobilier / Expert Bâtiment'),
    ('finance_securisation', 'Réassureur'),
    ('finance_securisation', 'Actuaire'),
    ('finance_securisation', 'Gestionnaire d''Actifs'),
    ('finance_securisation', 'Trésorier'),
    ('finance_securisation', 'Commissaire aux Comptes'),
    ('finance_securisation', 'Auditeur'),
    ('finance_securisation', 'Banquier'),
    ('risque_conformite', 'Juriste / Avocat'),
    ('risque_conformite', 'Responsable Conformité CIMA'),
    ('risque_conformite', 'Responsable LBC/FT'),
    ('risque_conformite', 'Délégué à la Protection des Données (DPO)'),
    ('risque_conformite', 'Gestionnaire de Risques'),
    ('risque_conformite', 'Enquêteur Fraude'),
    ('technique_operations', 'Gestionnaire Sinistre'),
    ('technique_operations', 'Gestionnaire Contrat / Souscripteur'),
    ('technique_operations', 'Gestionnaire Prestations Santé'),
    ('technique_operations', 'Chargé de Recouvrement'),
    ('technique_operations', 'Chargé d''Indemnisation'),
    ('technique_operations', 'Téléopérateur Centre d''Appels'),
    ('technique_operations', 'Développeur Logiciel de Gestion'),
    ('technique_operations', 'Hébergeur / Infogérant'),
    ('technique_operations', 'Intégrateur Mobile Money (OM / MoMo)'),
    ('technique_operations', 'Fournisseur SMS / WhatsApp API'),
    ('institutionnel', 'Régulateur CIMA / ACAM'),
    ('institutionnel', 'Inspecteur MINFI'),
    ('institutionnel', 'Représentant Association Professionnelle (ASAC)'),
    ('institutionnel', 'Médiateur Assurance'),
    ('clients_groupes', 'DRH d''entreprise cliente'),
    ('clients_groupes', 'Responsable Coopérative / Mutuelle de base'),
    ('clients_groupes', 'Responsable de Syndicat'),
    ('clients_groupes', 'Intendant d''établissement scolaire')
) AS types(code_categorie, libelle)
WHERE site.categorie_partenaire.code_categorie = types.code_categorie;

CREATE TABLE site.partenaires (
    id_partenaire            serial PRIMARY KEY,
    matricule                varchar(20) NOT NULL UNIQUE,
    email                    citext NOT NULL UNIQUE,
    mot_de_passe_hache       text NOT NULL,
    id_type_partenaire       int NOT NULL REFERENCES site.type_partenaire (id_type_partenaire),
    nom_complet              varchar(150) NOT NULL,
    telephone                varchar(20),
    statut_compte            varchar(20) NOT NULL DEFAULT 'actif' CHECK (statut_compte IN ('actif','suspendu')),
    date_creation            timestamptz NOT NULL DEFAULT now(),
    date_derniere_connexion  timestamptz
);

CREATE INDEX idx_partenaires_email ON site.partenaires (email);
CREATE INDEX idx_partenaires_type ON site.partenaires (id_type_partenaire);

-- Store de session DISTINCT du client et du staff (cookie
-- "connect.sid.partenaire") — troisième cloison étanche, même principe
-- que la séparation client/staff déjà en place.
CREATE TABLE site.session_partenaire (
    sid     varchar NOT NULL COLLATE "default",
    sess    json    NOT NULL,
    expire  timestamp(6) NOT NULL
) WITH (OIDS = FALSE);

ALTER TABLE site.session_partenaire
    ADD CONSTRAINT session_partenaire_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX idx_session_partenaire_expire ON site.session_partenaire (expire);

-- Assignation d'un ticket à un partenaire externe — distincte de
-- l'assignation staff (id_staff_assigne), un ticket peut avoir les deux
-- (ex: un gestionnaire interne ET un garagiste externe sur un sinistre).
ALTER TABLE site.tickets
    ADD COLUMN id_partenaire_assigne int REFERENCES site.partenaires (id_partenaire);

CREATE INDEX idx_tickets_id_partenaire_assigne ON site.tickets (id_partenaire_assigne);

COMMIT;

-- Droits (hors transaction) :
--   GRANT SELECT ON site.categorie_partenaire TO mutuellepro;
--   GRANT SELECT ON site.type_partenaire TO mutuellepro;
--   GRANT SELECT, INSERT, UPDATE ON site.partenaires TO mutuellepro;
--   GRANT USAGE, SELECT ON site.partenaires_id_partenaire_seq TO mutuellepro;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON site.session_partenaire TO mutuellepro;
