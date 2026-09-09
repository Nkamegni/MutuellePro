-- =====================================================================
-- Mutuelle Pro Assurances -- Reconstruction complete des 4 tables
-- centrales (03/09/2026) -- ordre des colonnes normalise, nom_complet
-- elimine, nom NOT NULL partout, regle de separation CORRIGEE appliquee
-- directement (dernier mot = prenom, reste = nom -- pas la regle
-- fausse de la migration 028, jamais appliquee non plus a l'identique
-- ici puisqu'on redérive depuis nom_complet directement).
--
-- IMPORTANT : ce script REMPLACE les migrations 029 et 030, qui
-- deviennent inutiles -- ne pas les executer, ni avant ni apres celui-ci.
--
-- Une seule transaction pour les 4 tables -- tout ou rien.
-- =====================================================================

BEGIN;

-- =====================================================================
-- 1. site.utilisateurs (Client) -- deja nom/prenom corrects (jamais eu
--    nom_complet), aucune reinterpretation necessaire.
-- =====================================================================

ALTER TABLE site.prospects DROP CONSTRAINT prospects_id_utilisateur_fkey;
ALTER TABLE site.reinitialisation_mdp_tokens DROP CONSTRAINT reinitialisation_mdp_tokens_id_utilisateur_fkey;
ALTER TABLE site.staff DROP CONSTRAINT staff_id_utilisateur_lie_fkey;
ALTER TABLE site.tickets DROP CONSTRAINT tickets_id_utilisateur_fkey;
ALTER TABLE site.verification_email_tokens DROP CONSTRAINT verification_email_tokens_id_utilisateur_fkey;

CREATE TABLE site.utilisateurs_new (
    id_utilisateur           serial PRIMARY KEY,
    nom                      varchar(100) NOT NULL,
    prenom                   varchar(100),
    email                    citext NOT NULL,
    telephone                varchar(20) NOT NULL,
    mot_de_passe_hache       text NOT NULL,
    statut_compte            varchar(20) NOT NULL DEFAULT 'actif'
        CHECK (statut_compte IN ('actif', 'suspendu')),
    date_naissance           date,
    adresse                  text,
    email_verifie            boolean NOT NULL DEFAULT false,
    telephone_verifie        boolean NOT NULL DEFAULT false,
    date_creation            timestamptz NOT NULL DEFAULT now(),
    date_derniere_connexion  timestamptz
);

INSERT INTO site.utilisateurs_new (
    id_utilisateur, nom, prenom, email, telephone, mot_de_passe_hache,
    statut_compte, date_naissance, adresse, email_verifie,
    telephone_verifie, date_creation, date_derniere_connexion
)
SELECT
    id_utilisateur, nom, prenom, email, telephone, mot_de_passe_hache,
    statut_compte, date_naissance, adresse, email_verifie,
    telephone_verifie, date_creation, date_derniere_connexion
FROM site.utilisateurs;

SELECT setval('site.utilisateurs_new_id_utilisateur_seq', COALESCE((SELECT MAX(id_utilisateur) FROM site.utilisateurs_new), 1));

DROP TABLE site.utilisateurs;
ALTER TABLE site.utilisateurs_new RENAME TO utilisateurs;
ALTER SEQUENCE site.utilisateurs_new_id_utilisateur_seq RENAME TO utilisateurs_id_utilisateur_seq;

CREATE UNIQUE INDEX utilisateurs_email_key ON site.utilisateurs (email);
CREATE UNIQUE INDEX utilisateurs_telephone_key ON site.utilisateurs (telephone);
CREATE INDEX idx_utilisateurs_email ON site.utilisateurs (email);
CREATE INDEX idx_utilisateurs_telephone ON site.utilisateurs (telephone);
ALTER TABLE site.utilisateurs ADD CONSTRAINT utilisateurs_email_key UNIQUE USING INDEX utilisateurs_email_key;
ALTER TABLE site.utilisateurs ADD CONSTRAINT utilisateurs_telephone_key UNIQUE USING INDEX utilisateurs_telephone_key;

CREATE TRIGGER trig_normaliser_telephone BEFORE INSERT OR UPDATE ON site.utilisateurs
    FOR EACH ROW EXECUTE FUNCTION site.trig_normaliser_telephone();

-- =====================================================================
-- 2. site.staff (Personnel) -- nom/prenom REDERIVES depuis nom_complet
--    avec la regle corrigee (dernier mot = prenom), pas copies depuis
--    les colonnes existantes (qui portent encore la regle fausse).
--    Exception nominative pour rnkamegni@ (Roger = prenom, le reste = nom).
-- =====================================================================

ALTER TABLE site.activation_staff_tokens DROP CONSTRAINT activation_staff_tokens_id_staff_fkey;
ALTER TABLE site.contacts_telephoniques DROP CONSTRAINT contacts_telephoniques_id_staff_modificateur_fkey;
ALTER TABLE site.emails_cache DROP CONSTRAINT emails_cache_id_staff_fkey;
ALTER TABLE site.interactions_prospect DROP CONSTRAINT interactions_prospect_id_staff_fkey;
ALTER TABLE site.journal_audit DROP CONSTRAINT journal_audit_id_staff_fkey;
ALTER TABLE site.parametres_workflow DROP CONSTRAINT parametres_workflow_id_staff_valeur_fkey;
ALTER TABLE site.prospects DROP CONSTRAINT prospects_id_staff_assigne_fkey;
ALTER TABLE site.taches DROP CONSTRAINT taches_id_staff_createur_fkey;
ALTER TABLE site.taches DROP CONSTRAINT taches_id_staff_responsable_fkey;
ALTER TABLE site.taches DROP CONSTRAINT taches_id_staff_responsable_original_fkey;
ALTER TABLE site.tickets DROP CONSTRAINT tickets_id_staff_assigne_fkey;

CREATE TABLE site.staff_new (
    id_staff                     serial PRIMARY KEY,
    matricule                    varchar(20) NOT NULL,
    nom                          varchar(100) NOT NULL,
    prenom                       varchar(100),
    email                        citext NOT NULL,
    telephone                    varchar(20),
    mot_de_passe_hache           text NOT NULL,
    mot_de_passe_defini          boolean NOT NULL DEFAULT true,
    id_role                      integer NOT NULL REFERENCES site.role_staff (id_role),
    id_utilisateur_lie           integer REFERENCES site.utilisateurs (id_utilisateur),
    statut_compte                varchar(20) NOT NULL DEFAULT 'actif'
        CHECK (statut_compte IN ('actif', 'suspendu')),
    date_naissance                date,
    adresse                       text,
    email_validation              citext,
    imap_mot_de_passe_chiffre     text,
    est_compte_racine             boolean NOT NULL DEFAULT false,
    suppression_reservee_racine   boolean NOT NULL DEFAULT false,
    date_creation                 timestamptz NOT NULL DEFAULT now(),
    date_derniere_connexion       timestamptz
);

INSERT INTO site.staff_new (
    id_staff, matricule, nom, prenom, email, telephone, mot_de_passe_hache,
    mot_de_passe_defini, id_role, id_utilisateur_lie, statut_compte,
    date_naissance, adresse, email_validation, imap_mot_de_passe_chiffre,
    est_compte_racine, suppression_reservee_racine, date_creation,
    date_derniere_connexion
)
SELECT
    id_staff, matricule,
    CASE
        WHEN email = 'rnkamegni@mutuelleproassurances.com' THEN 'Nkamegni Noupeu'
        WHEN position(' ' in nom_complet) = 0 THEN nom_complet
        ELSE trim(regexp_replace(nom_complet, '\s+[^ ]+$', ''))
    END AS nom,
    CASE
        WHEN email = 'rnkamegni@mutuelleproassurances.com' THEN 'Roger'
        WHEN position(' ' in nom_complet) = 0 THEN NULL
        ELSE trim(substring(nom_complet from '[^ ]+$'))
    END AS prenom,
    email, telephone, mot_de_passe_hache,
    mot_de_passe_defini, id_role, id_utilisateur_lie, statut_compte,
    date_naissance, adresse, email_validation, imap_mot_de_passe_chiffre,
    est_compte_racine, suppression_reservee_racine, date_creation,
    date_derniere_connexion
FROM site.staff;

SELECT setval('site.staff_new_id_staff_seq', COALESCE((SELECT MAX(id_staff) FROM site.staff_new), 1));

DROP TABLE site.staff;
ALTER TABLE site.staff_new RENAME TO staff;
ALTER SEQUENCE site.staff_new_id_staff_seq RENAME TO staff_id_staff_seq;

CREATE UNIQUE INDEX staff_email_key ON site.staff (email);
CREATE UNIQUE INDEX staff_matricule_key ON site.staff (matricule);
CREATE INDEX idx_staff_email ON site.staff (email);
ALTER TABLE site.staff ADD CONSTRAINT staff_email_key UNIQUE USING INDEX staff_email_key;
ALTER TABLE site.staff ADD CONSTRAINT staff_matricule_key UNIQUE USING INDEX staff_matricule_key;

CREATE TRIGGER trg_interdire_suppression_compte_racine BEFORE DELETE ON site.staff
    FOR EACH ROW EXECUTE FUNCTION site.fn_interdire_suppression_compte_racine();
CREATE TRIGGER trg_proteger_identifiant_staff BEFORE UPDATE ON site.staff
    FOR EACH ROW EXECUTE FUNCTION site.fn_proteger_identifiant_staff();
CREATE TRIGGER trg_proteger_mot_de_passe_racine BEFORE UPDATE ON site.staff
    FOR EACH ROW EXECUTE FUNCTION site.fn_proteger_mot_de_passe_racine();
CREATE TRIGGER trig_normaliser_telephone BEFORE INSERT OR UPDATE ON site.staff
    FOR EACH ROW EXECUTE FUNCTION site.trig_normaliser_telephone();

-- =====================================================================
-- 3. site.partenaires -- meme redérivation depuis nom_complet, regle
--    corrigee, sans exception nominative.
-- =====================================================================

ALTER TABLE site.activation_partenaire_tokens DROP CONSTRAINT activation_partenaire_tokens_id_partenaire_fkey;
ALTER TABLE site.emails_cache DROP CONSTRAINT emails_cache_id_partenaire_fkey;
ALTER TABLE site.partenaire_contacts DROP CONSTRAINT partenaire_contacts_id_partenaire_fkey;
ALTER TABLE site.partenaire_types DROP CONSTRAINT partenaire_types_id_partenaire_fkey;
ALTER TABLE site.tickets DROP CONSTRAINT tickets_id_partenaire_assigne_fkey;

CREATE TABLE site.partenaires_new (
    id_partenaire               serial PRIMARY KEY,
    matricule                   varchar(20) NOT NULL,
    nom                         varchar(100) NOT NULL,
    prenom                      varchar(100),
    email                       citext NOT NULL,
    telephone                   varchar(20),
    mot_de_passe_hache          text NOT NULL,
    mot_de_passe_defini         boolean NOT NULL DEFAULT false,
    statut_compte               varchar(20) NOT NULL DEFAULT 'actif'
        CHECK (statut_compte IN ('actif', 'suspendu')),
    email_notification          citext,
    imap_mot_de_passe_chiffre   text,
    date_creation                timestamptz NOT NULL DEFAULT now(),
    date_derniere_connexion      timestamptz
);

INSERT INTO site.partenaires_new (
    id_partenaire, matricule, nom, prenom, email, telephone,
    mot_de_passe_hache, mot_de_passe_defini, statut_compte,
    email_notification, imap_mot_de_passe_chiffre, date_creation,
    date_derniere_connexion
)
SELECT
    id_partenaire, matricule,
    CASE
        WHEN position(' ' in nom_complet) = 0 THEN nom_complet
        ELSE trim(regexp_replace(nom_complet, '\s+[^ ]+$', ''))
    END AS nom,
    CASE
        WHEN position(' ' in nom_complet) = 0 THEN NULL
        ELSE trim(substring(nom_complet from '[^ ]+$'))
    END AS prenom,
    email, telephone, mot_de_passe_hache, mot_de_passe_defini,
    statut_compte, email_notification, imap_mot_de_passe_chiffre,
    date_creation, date_derniere_connexion
FROM site.partenaires;

SELECT setval('site.partenaires_new_id_partenaire_seq', COALESCE((SELECT MAX(id_partenaire) FROM site.partenaires_new), 1));

DROP TABLE site.partenaires;
ALTER TABLE site.partenaires_new RENAME TO partenaires;
ALTER SEQUENCE site.partenaires_new_id_partenaire_seq RENAME TO partenaires_id_partenaire_seq;

CREATE UNIQUE INDEX partenaires_matricule_key ON site.partenaires (matricule);
ALTER TABLE site.partenaires ADD CONSTRAINT partenaires_matricule_key UNIQUE USING INDEX partenaires_matricule_key;
CREATE INDEX idx_partenaires_email ON site.partenaires (email);
CREATE UNIQUE INDEX idx_partenaires_email_actif ON site.partenaires (email) WHERE statut_compte = 'actif';

CREATE TRIGGER trig_normaliser_telephone BEFORE INSERT OR UPDATE ON site.partenaires
    FOR EACH ROW EXECUTE FUNCTION site.trig_normaliser_telephone();

-- =====================================================================
-- 4. site.prospects -- base confirmee vide par Roger, NOT NULL sur nom
--    applique sans risque. Aucune valeur inventee en cas de
--    nom_complet NULL inattendu -- la transaction echouerait proprement
--    plutot que d'inserer un nom fictif.
-- =====================================================================

ALTER TABLE site.interactions_prospect DROP CONSTRAINT interactions_prospect_id_prospect_fkey;

CREATE TABLE site.prospects_new (
    id_prospect          serial PRIMARY KEY,
    nom                  varchar(100) NOT NULL,
    prenom               varchar(100),
    email                citext,
    telephone            varchar(20),
    id_utilisateur       integer REFERENCES site.utilisateurs (id_utilisateur),
    id_staff_assigne     integer REFERENCES site.staff (id_staff),
    id_ticket_origine    integer REFERENCES site.tickets (id_ticket),
    statut_opportunite   varchar(20) NOT NULL DEFAULT 'nouveau'
        CHECK (statut_opportunite IN ('nouveau', 'qualifie', 'propose', 'gagne', 'perdu')),
    branche_interet      varchar(100),
    date_creation        timestamptz NOT NULL DEFAULT now(),
    date_maj             timestamptz NOT NULL DEFAULT now()
);

INSERT INTO site.prospects_new (
    id_prospect, nom, prenom, email, telephone, id_utilisateur,
    id_staff_assigne, id_ticket_origine, statut_opportunite,
    branche_interet, date_creation, date_maj
)
SELECT
    id_prospect,
    CASE
        WHEN position(' ' in nom_complet) = 0 THEN nom_complet
        ELSE trim(regexp_replace(nom_complet, '\s+[^ ]+$', ''))
    END AS nom,
    CASE
        WHEN position(' ' in nom_complet) = 0 THEN NULL
        ELSE trim(substring(nom_complet from '[^ ]+$'))
    END AS prenom,
    email, telephone, id_utilisateur, id_staff_assigne, id_ticket_origine,
    statut_opportunite, branche_interet, date_creation, date_maj
FROM site.prospects;

SELECT setval('site.prospects_new_id_prospect_seq', COALESCE((SELECT MAX(id_prospect) FROM site.prospects_new), 1));

DROP TABLE site.prospects;
ALTER TABLE site.prospects_new RENAME TO prospects;
ALTER SEQUENCE site.prospects_new_id_prospect_seq RENAME TO prospects_id_prospect_seq;

CREATE INDEX idx_prospects_staff_assigne ON site.prospects (id_staff_assigne);
CREATE INDEX idx_prospects_statut ON site.prospects (statut_opportunite);
CREATE INDEX idx_prospects_ticket_origine ON site.prospects (id_ticket_origine);

CREATE TRIGGER trg_prospects_touch_date_maj BEFORE UPDATE ON site.prospects
    FOR EACH ROW EXECUTE FUNCTION site.fn_touch_date_maj();
CREATE TRIGGER trig_normaliser_telephone BEFORE INSERT OR UPDATE ON site.prospects
    FOR EACH ROW EXECUTE FUNCTION site.trig_normaliser_telephone();

-- =====================================================================
-- 5. Recreation de TOUTES les contraintes retirees plus haut -- 22 au
--    total, une par une, pointant desormais vers les nouvelles tables.
-- =====================================================================

-- --- vers site.utilisateurs ---
ALTER TABLE site.prospects ADD CONSTRAINT prospects_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES site.utilisateurs (id_utilisateur);
ALTER TABLE site.reinitialisation_mdp_tokens ADD CONSTRAINT reinitialisation_mdp_tokens_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES site.utilisateurs (id_utilisateur) ON DELETE CASCADE;
ALTER TABLE site.staff ADD CONSTRAINT staff_id_utilisateur_lie_fkey FOREIGN KEY (id_utilisateur_lie) REFERENCES site.utilisateurs (id_utilisateur);
ALTER TABLE site.tickets ADD CONSTRAINT tickets_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES site.utilisateurs (id_utilisateur);
ALTER TABLE site.verification_email_tokens ADD CONSTRAINT verification_email_tokens_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES site.utilisateurs (id_utilisateur) ON DELETE CASCADE;

-- --- vers site.staff ---
ALTER TABLE site.activation_staff_tokens ADD CONSTRAINT activation_staff_tokens_id_staff_fkey FOREIGN KEY (id_staff) REFERENCES site.staff (id_staff) ON DELETE CASCADE;
ALTER TABLE site.contacts_telephoniques ADD CONSTRAINT contacts_telephoniques_id_staff_modificateur_fkey FOREIGN KEY (id_staff_modificateur) REFERENCES site.staff (id_staff);
ALTER TABLE site.emails_cache ADD CONSTRAINT emails_cache_id_staff_fkey FOREIGN KEY (id_staff) REFERENCES site.staff (id_staff);
ALTER TABLE site.interactions_prospect ADD CONSTRAINT interactions_prospect_id_staff_fkey FOREIGN KEY (id_staff) REFERENCES site.staff (id_staff);
ALTER TABLE site.journal_audit ADD CONSTRAINT journal_audit_id_staff_fkey FOREIGN KEY (id_staff) REFERENCES site.staff (id_staff);
ALTER TABLE site.parametres_workflow ADD CONSTRAINT parametres_workflow_id_staff_valeur_fkey FOREIGN KEY (id_staff_valeur) REFERENCES site.staff (id_staff);
ALTER TABLE site.prospects ADD CONSTRAINT prospects_id_staff_assigne_fkey FOREIGN KEY (id_staff_assigne) REFERENCES site.staff (id_staff);
ALTER TABLE site.taches ADD CONSTRAINT taches_id_staff_createur_fkey FOREIGN KEY (id_staff_createur) REFERENCES site.staff (id_staff);
ALTER TABLE site.taches ADD CONSTRAINT taches_id_staff_responsable_fkey FOREIGN KEY (id_staff_responsable) REFERENCES site.staff (id_staff);
ALTER TABLE site.taches ADD CONSTRAINT taches_id_staff_responsable_original_fkey FOREIGN KEY (id_staff_responsable_original) REFERENCES site.staff (id_staff);
ALTER TABLE site.tickets ADD CONSTRAINT tickets_id_staff_assigne_fkey FOREIGN KEY (id_staff_assigne) REFERENCES site.staff (id_staff);

-- --- vers site.partenaires ---
ALTER TABLE site.activation_partenaire_tokens ADD CONSTRAINT activation_partenaire_tokens_id_partenaire_fkey FOREIGN KEY (id_partenaire) REFERENCES site.partenaires (id_partenaire) ON DELETE CASCADE;
ALTER TABLE site.emails_cache ADD CONSTRAINT emails_cache_id_partenaire_fkey FOREIGN KEY (id_partenaire) REFERENCES site.partenaires (id_partenaire);
ALTER TABLE site.partenaire_contacts ADD CONSTRAINT partenaire_contacts_id_partenaire_fkey FOREIGN KEY (id_partenaire) REFERENCES site.partenaires (id_partenaire) ON DELETE CASCADE;
ALTER TABLE site.partenaire_types ADD CONSTRAINT partenaire_types_id_partenaire_fkey FOREIGN KEY (id_partenaire) REFERENCES site.partenaires (id_partenaire) ON DELETE CASCADE;
ALTER TABLE site.tickets ADD CONSTRAINT tickets_id_partenaire_assigne_fkey FOREIGN KEY (id_partenaire_assigne) REFERENCES site.partenaires (id_partenaire);

-- --- vers site.prospects ---
ALTER TABLE site.interactions_prospect ADD CONSTRAINT interactions_prospect_id_prospect_fkey FOREIGN KEY (id_prospect) REFERENCES site.prospects (id_prospect) ON DELETE CASCADE;

COMMIT;
