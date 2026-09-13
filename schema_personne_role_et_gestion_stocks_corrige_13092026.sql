-- ============================================================================
-- SCHEMA CONSOLIDE — 09/09/2026, corrigé le 13/09/2026
-- 1) Pivot Personne/Rôle (additif, non-destructif — ne touche pas à
--    site.utilisateurs / site.staff / site.partenaires / site.prospects
--    ni aux 3 systèmes de session existants)
-- 2) Module Gestion des Stocks/Fournitures, adapté du schéma
--    "Gesiard Gold 2021" (Alpha Access, éd. 10/11/2020) au contexte
--    multi-compagnies / multi-circuits de Mutuelle Pro Assurances
--
-- Convention de migration du projet : INSERT/UPDATE, jamais de DELETE
-- sur les données existantes.
--
-- Corrections du 13/09/2026 (demande session Git/GitHub) :
--   - TIMESTAMP -> TIMESTAMPTZ sur l'ensemble des 19 colonnes concernées
--   - Ajout des GRANT explicites (PARTIE 3, en fin de fichier) vers le
--     rôle applicatif "mutuellepro"
-- ============================================================================


-- ============================================================
-- PARTIE 1 — PIVOT PERSONNE / RÔLE
-- ============================================================

CREATE TABLE site.personne (
    id_personne             SERIAL PRIMARY KEY,
    personne_morale         BOOLEAN NOT NULL DEFAULT FALSE,
    nom                     VARCHAR(255) NOT NULL,   -- nom ou raison sociale
    prenom                  VARCHAR(255),             -- vide si personne morale
    civilite                VARCHAR(20),              -- libre (M./Mme/Ets...) ; à raccorder à un référentiel Civilité si vous en créez un plus tard
    numero_piece            VARCHAR(50),              -- CNI ou Numéro RC
    date_delivrance_piece   DATE,
    lieu_delivrance_piece   VARCHAR(255),
    date_naissance          DATE,
    lieu_naissance          VARCHAR(255),
    email                   VARCHAR(255),
    telephone               VARCHAR(50),
    adresse                 TEXT,
    actif                   BOOLEAN NOT NULL DEFAULT TRUE,
    date_creation            TIMESTAMPTZ NOT NULL DEFAULT now(),
    date_maj                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tables de liaison : 1 personne <-> 0..1 compte de chaque type existant.
-- id_utilisateur_lie (déjà présent sur site.staff) sert de donnée d'amorçage
-- pour la première liaison personne_staff / personne_utilisateur.

CREATE TABLE site.personne_utilisateur (
    id_personne_utilisateur SERIAL PRIMARY KEY,
    id_personne             INTEGER NOT NULL REFERENCES site.personne(id_personne),
    id_utilisateur          INTEGER NOT NULL REFERENCES site.utilisateurs(id_utilisateur) UNIQUE,
    date_creation           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE site.personne_staff (
    id_personne_staff       SERIAL PRIMARY KEY,
    id_personne             INTEGER NOT NULL REFERENCES site.personne(id_personne),
    id_staff                INTEGER NOT NULL REFERENCES site.staff(id_staff) UNIQUE,
    date_creation           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE site.personne_partenaire (
    id_personne_partenaire  SERIAL PRIMARY KEY,
    id_personne             INTEGER NOT NULL REFERENCES site.personne(id_personne),
    id_partenaire           INTEGER NOT NULL REFERENCES site.partenaires(id_partenaire) UNIQUE,
    date_creation           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE site.personne_prospect (
    id_personne_prospect    SERIAL PRIMARY KEY,
    id_personne             INTEGER NOT NULL REFERENCES site.personne(id_personne),
    id_prospect             INTEGER NOT NULL REFERENCES site.prospects(id_prospect) UNIQUE,
    date_creation           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rôles : accrochés à id_personne, pas aux comptes — c'est ici que se résout
-- le cumul (Assureur = Fournisseur + Régleur ; Employé = Apporteur + Resp. magasin)
-- sans toucher à l'authentification.

CREATE TABLE site.role_assureur (
    id_role_assureur        SERIAL PRIMARY KEY,
    id_personne              INTEGER NOT NULL REFERENCES site.personne(id_personne),
    code_assureur            VARCHAR(30) UNIQUE NOT NULL,
    agrement_production      VARCHAR(100),
    siege_social             VARCHAR(255),
    directeur_general        VARCHAR(255),
    date_debut               DATE NOT NULL DEFAULT CURRENT_DATE,
    date_fin                 DATE,
    actif                    BOOLEAN NOT NULL DEFAULT TRUE,
    date_creation            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Généralise la notion de "convention_partenaire" évoquée plus tôt dans la conception :
-- conditionne l'autorisation de recevoir des documents numérotés de ce partenaire.
CREATE TABLE site.role_convention_partenaire (
    id_convention            SERIAL PRIMARY KEY,
    id_role_assureur         INTEGER NOT NULL REFERENCES site.role_assureur(id_role_assureur),
    reference_convention     VARCHAR(100),
    date_debut               DATE,
    date_fin                 DATE,
    statut                   VARCHAR(20) NOT NULL DEFAULT 'actif'
                               CHECK (statut IN ('actif','inactif','suspendu')),
    document_scan_url        TEXT,
    date_creation             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE site.role_regleur_sinistre (
    id_role_regleur          SERIAL PRIMARY KEY,
    id_personne               INTEGER NOT NULL REFERENCES site.personne(id_personne),
    date_debut                DATE NOT NULL DEFAULT CURRENT_DATE,
    date_fin                  DATE,
    actif                     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE site.role_apporteur_affaires (
    id_role_apporteur         SERIAL PRIMARY KEY,
    id_personne                INTEGER NOT NULL REFERENCES site.personne(id_personne),
    date_debut                 DATE NOT NULL DEFAULT CURRENT_DATE,
    date_fin                   DATE,
    actif                      BOOLEAN NOT NULL DEFAULT TRUE
);

-- Remarque : Profil_Utilisateur / Action_Profil_responsable du Gesiard d'origine
-- ne sont PAS repris ici — site.role_staff existe déjà (gestionnaire / administrateur /
-- superadmin, cf. réponse de la session Authentification) et sert de base au
-- contrôle d'accès. role_responsable_magasin ci-dessous s'appuie dessus plutôt
-- que de recréer un système de permissions parallèle.

CREATE TABLE site.role_responsable_magasin (
    id_role_responsable       SERIAL PRIMARY KEY,
    id_personne                 INTEGER NOT NULL REFERENCES site.personne(id_personne),
    id_unite_gestion            INTEGER NOT NULL REFERENCES site.unite_gestion(id_unite_gestion),
    identifiant                 VARCHAR(50) UNIQUE,
    date_debut_activites        DATE,
    date_fin_activites          DATE,
    actif                       BOOLEAN NOT NULL DEFAULT TRUE,
    date_creation                TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- PARTIE 2 — GESTION DES STOCKS / FOURNITURES
-- ============================================================

-- --- Réseau et magasins ---------------------------------------------------

CREATE TABLE site.reseau (
    id_reseau                 SERIAL PRIMARY KEY,
    code_reseau                VARCHAR(30) UNIQUE NOT NULL,
    libelle_reseau              VARCHAR(255) NOT NULL,
    reseau_actif                 BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE site.unite_gestion (   -- "magasin", avec hiérarchie (ajout du 08/09)
    id_unite_gestion              SERIAL PRIMARY KEY,
    id_reseau                     INTEGER REFERENCES site.reseau(id_reseau),
    id_unite_gestion_parent       INTEGER REFERENCES site.unite_gestion(id_unite_gestion),
    code_unite_gestion             VARCHAR(30) UNIQUE NOT NULL,
    libelle_unite_gestion           VARCHAR(255) NOT NULL,
    emplacement                     TEXT,
    designation_magasin             VARCHAR(255),
    magasin_actif                   BOOLEAN NOT NULL DEFAULT TRUE
);

-- --- Typologie des fournitures (générique zone CIMA) ----------------------

CREATE TABLE site.nature_fourniture (
    id_nature_fourniture       SERIAL PRIMARY KEY,
    code_nature_fourniture      VARCHAR(30) UNIQUE NOT NULL,
    libelle_nature_fourniture    VARCHAR(255) NOT NULL,
    numerotation_continue        BOOLEAN NOT NULL DEFAULT FALSE,
    serie_permise                 BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE site.type_fourniture (
    id_type_fourniture           SERIAL PRIMARY KEY,
    id_nature_fourniture          INTEGER NOT NULL REFERENCES site.nature_fourniture(id_nature_fourniture),
    code_type_fourniture           VARCHAR(30) UNIQUE NOT NULL,
    libelle_type_fourniture         VARCHAR(255) NOT NULL,
    type_fourniture_actif            BOOLEAN NOT NULL DEFAULT TRUE,
    delai_peremption_moyen           INTEGER,   -- jours
    cout_unitaire                     NUMERIC(12,2),
    taux_taxes                        NUMERIC(5,2)
);

-- --- Deux circuits fournisseurs distincts (décidé le 08/09) ---------------

CREATE TABLE site.fournisseur_assurance (   -- fournisseur physique des documents pour un Assureur
    id_fournisseur_assurance    SERIAL PRIMARY KEY,
    id_role_assureur             INTEGER NOT NULL REFERENCES site.role_assureur(id_role_assureur),
    code_fournisseur              VARCHAR(30) UNIQUE NOT NULL,
    libelle_fournisseur            VARCHAR(255) NOT NULL,
    adresse                         TEXT,
    ville                           VARCHAR(100),
    code_postal                     VARCHAR(20),
    fournisseur_actif                BOOLEAN NOT NULL DEFAULT TRUE,
    exoneration_taxes                BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE site.fournisseur_goodies (   -- goodies / fournitures de bureau, sans lien Assureur
    id_fournisseur_goodies       SERIAL PRIMARY KEY,
    code_fournisseur               VARCHAR(30) UNIQUE NOT NULL,
    libelle_fournisseur             VARCHAR(255) NOT NULL,
    contact                          VARCHAR(255),
    telephone                        VARCHAR(50),
    adresse                          TEXT,
    fournisseur_actif                 BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE site.fourniture (
    id_fourniture                 SERIAL PRIMARY KEY,
    id_type_fourniture             INTEGER NOT NULL REFERENCES site.type_fourniture(id_type_fourniture),
    id_fournisseur_assurance        INTEGER REFERENCES site.fournisseur_assurance(id_fournisseur_assurance),
    id_fournisseur_goodies           INTEGER REFERENCES site.fournisseur_goodies(id_fournisseur_goodies),
    code_fourniture                   VARCHAR(30) UNIQUE NOT NULL,
    libelle_fourniture                 VARCHAR(255) NOT NULL,
    fourniture_active                   BOOLEAN NOT NULL DEFAULT TRUE,
    appliquer_delai_peremption           BOOLEAN NOT NULL DEFAULT FALSE,
    cout_unitaire                         NUMERIC(12,2),
    cout_manutention                      NUMERIC(12,2),
    cout_expedition                       NUMERIC(12,2),
    taux_douane                           NUMERIC(5,2),
    cout_douanes                          NUMERIC(12,2),
    cout_controles                        NUMERIC(12,2),
    cout_importation                      NUMERIC(12,2),
    autres_cout                           NUMERIC(12,2),
    taux_taxe                             NUMERIC(5,2),
    CONSTRAINT chk_fourniture_un_seul_fournisseur CHECK (
        (id_fournisseur_assurance IS NOT NULL)::int
      + (id_fournisseur_goodies IS NOT NULL)::int = 1
    )
);

CREATE TABLE site.unite_gestion_fourniture (   -- seuils par magasin
    id_unite_gestion_fourniture   SERIAL PRIMARY KEY,
    id_fourniture                   INTEGER NOT NULL REFERENCES site.fourniture(id_fourniture),
    id_unite_gestion                 INTEGER NOT NULL REFERENCES site.unite_gestion(id_unite_gestion),
    actif                              BOOLEAN NOT NULL DEFAULT TRUE,
    delai_peremption                   INTEGER,
    stock_securite                      INTEGER,
    appliquer_stock_securite             BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (id_fourniture, id_unite_gestion)
);

-- --- Numérotation (compteur), liée au type de document et au partenaire (ajout du 08/09) ---

CREATE TABLE site.entite_numerotation (
    id_entite_numerotation        SERIAL PRIMARY KEY,
    id_type_fourniture              INTEGER NOT NULL REFERENCES site.type_fourniture(id_type_fourniture),
    id_role_assureur                 INTEGER NOT NULL REFERENCES site.role_assureur(id_role_assureur),
    code_entite_numerotation          VARCHAR(30) UNIQUE NOT NULL,
    libelle_entite_numerotation        VARCHAR(255) NOT NULL,
    format_prefixe                      VARCHAR(20),
    format_longueur                     INTEGER
);

CREATE TABLE site.numerotation_entite (   -- le compteur lui-même
    id_numerotation_entite         SERIAL PRIMARY KEY,
    id_entite_numerotation           INTEGER NOT NULL REFERENCES site.entite_numerotation(id_entite_numerotation),
    id_reseau                         INTEGER NOT NULL REFERENCES site.reseau(id_reseau),
    annee_exercice                     INTEGER NOT NULL,
    valeur_compteur                     BIGINT NOT NULL DEFAULT 0,
    UNIQUE (id_entite_numerotation, id_reseau, annee_exercice)
);

-- --- Articles, mouvements, traçabilité -------------------------------------

CREATE TABLE site.article (
    id_article                    SERIAL PRIMARY KEY,
    id_fourniture                   INTEGER NOT NULL REFERENCES site.fourniture(id_fourniture),
    serie                             VARCHAR(30),
    numero                            VARCHAR(30),
    numero_serie                      VARCHAR(60) UNIQUE,
    date_creation                      TIMESTAMPTZ NOT NULL DEFAULT now(),
    article_actif                       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE site.sens_mouvement (
    id_sens_mouvement              SERIAL PRIMARY KEY,
    code_sens_mouvement              VARCHAR(20) UNIQUE NOT NULL,
    libelle_sens_mouvement             VARCHAR(100) NOT NULL,
    augmentation_stock                  BOOLEAN NOT NULL DEFAULT FALSE,
    diminution_stock                    BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE site.type_mouvement (
    id_type_mouvement               SERIAL PRIMARY KEY,
    id_sens_mouvement                 INTEGER NOT NULL REFERENCES site.sens_mouvement(id_sens_mouvement),
    code_type_mouvement                VARCHAR(30) UNIQUE NOT NULL,
    libelle_type_mouvement               VARCHAR(100) NOT NULL,
    type_mouvement_actif                  BOOLEAN NOT NULL DEFAULT TRUE,
    id_type_mouvement_associe               INTEGER REFERENCES site.type_mouvement(id_type_mouvement),
    declencher_type_mouvement_associe        BOOLEAN NOT NULL DEFAULT FALSE
);
-- Valeurs de référence à insérer : Initialisation, Importation fichier, Livraison,
-- Retour, Annulation Mouvement, Démonétisation, Réception, Déstockage

CREATE TABLE site.mouvement (
    id_mouvement                    SERIAL PRIMARY KEY,
    id_type_mouvement                 INTEGER NOT NULL REFERENCES site.type_mouvement(id_type_mouvement),
    id_role_responsable                INTEGER NOT NULL REFERENCES site.role_responsable_magasin(id_role_responsable),
    numero_mouvement                    VARCHAR(50) UNIQUE NOT NULL,
    libelle_mouvement                     VARCHAR(255),
    date_mouvement                         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE site.mouvement_inter_unite (
    id_mouvement_inter_unite         SERIAL PRIMARY KEY,
    id_type_mouvement                  INTEGER NOT NULL REFERENCES site.type_mouvement(id_type_mouvement),
    id_unite_gestion_source              INTEGER NOT NULL REFERENCES site.unite_gestion(id_unite_gestion),
    id_unite_gestion_destination          INTEGER NOT NULL REFERENCES site.unite_gestion(id_unite_gestion),
    mouvement_inter_unite_actif             BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE site.mouvement_fourniture (   -- le LOT (plage de numéros)
    id_mouvement_fourniture           SERIAL PRIMARY KEY,
    id_mouvement                        INTEGER NOT NULL REFERENCES site.mouvement(id_mouvement),
    id_fourniture                        INTEGER NOT NULL REFERENCES site.fourniture(id_fourniture),
    identifiant_lot_mouvement              VARCHAR(50) UNIQUE,
    numero_debut_serie                      VARCHAR(30),
    numero_fin_serie                         VARCHAR(30),
    quantite                                  INTEGER NOT NULL CHECK (quantite > 0)
);

CREATE TABLE site.statut_article (
    id_statut_article                  SERIAL PRIMARY KEY,
    code_statut_article                  VARCHAR(30) UNIQUE NOT NULL,
    libelle_statut_article                 VARCHAR(100) NOT NULL,
    rend_article_disponible                  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE site.situation_article (   -- traçabilité article x lot (chaque article garde tout son historique)
    id_situation_article                 SERIAL PRIMARY KEY,
    id_mouvement_fourniture                INTEGER NOT NULL REFERENCES site.mouvement_fourniture(id_mouvement_fourniture),
    id_article                              INTEGER NOT NULL REFERENCES site.article(id_article),
    id_statut_article                        INTEGER NOT NULL REFERENCES site.statut_article(id_statut_article),
    serie                                      VARCHAR(30),
    numero                                     VARCHAR(30),
    numero_serie                                VARCHAR(60),
    date_peremption                              DATE,
    operation_reference                           VARCHAR(100),
    identifiant_affectation                        VARCHAR(100),
    id_personne_destinataire                        INTEGER REFERENCES site.personne(id_personne),  -- Suivi analytique relation-client (nouveau)
    date_creation                                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE site.historique_modification_statut (
    id_historique                        SERIAL PRIMARY KEY,
    code_historique                        VARCHAR(30),
    id_situation_article_initiale            INTEGER REFERENCES site.situation_article(id_situation_article),
    id_situation_article_finale               INTEGER NOT NULL REFERENCES site.situation_article(id_situation_article),
    date_creation                              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --- Commandes internes (réapprovisionnement) et externes (fournisseurs) --

CREATE TABLE site.demande_approvisionnement (
    id_demande_approvisionnement        SERIAL PRIMARY KEY,
    id_unite_gestion_source               INTEGER NOT NULL REFERENCES site.unite_gestion(id_unite_gestion),
    id_unite_gestion_destination           INTEGER NOT NULL REFERENCES site.unite_gestion(id_unite_gestion),
    numero_demande                          VARCHAR(50) UNIQUE NOT NULL,
    date_demande                             TIMESTAMPTZ NOT NULL DEFAULT now(),
    demande_annulee                           BOOLEAN NOT NULL DEFAULT FALSE,
    date_annulation                            TIMESTAMPTZ,
    montant_brut                                NUMERIC(14,2),
    frais_manutention                            NUMERIC(12,2),
    frais_expedition                              NUMERIC(12,2),
    autres_frais                                   NUMERIC(12,2),
    taxes                                           NUMERIC(12,2),
    total_ttc                                        NUMERIC(14,2)
);

CREATE TABLE site.approvisionnement_fourniture (
    id_approvisionnement_fourniture     SERIAL PRIMARY KEY,
    id_fourniture                          INTEGER NOT NULL REFERENCES site.fourniture(id_fourniture),
    id_demande_approvisionnement            INTEGER NOT NULL REFERENCES site.demande_approvisionnement(id_demande_approvisionnement),
    numero_approvisionnement                 VARCHAR(50),
    quantite_demande                          INTEGER NOT NULL,
    prix_unitaire                              NUMERIC(12,2),
    montant_manutention                         NUMERIC(12,2),
    montant_expedition                           NUMERIC(12,2),
    autres_montants                               NUMERIC(12,2),
    montant_taxes                                  NUMERIC(12,2)
);

CREATE TABLE site.bon_commande_fournisseur (
    id_bon_commande                      SERIAL PRIMARY KEY,
    id_fournisseur_assurance                INTEGER REFERENCES site.fournisseur_assurance(id_fournisseur_assurance),
    id_fournisseur_goodies                   INTEGER REFERENCES site.fournisseur_goodies(id_fournisseur_goodies),
    numero_bon_commande                       VARCHAR(50) UNIQUE NOT NULL,
    date_bon_commande                          TIMESTAMPTZ NOT NULL DEFAULT now(),
    bon_commande_annule                         BOOLEAN NOT NULL DEFAULT FALSE,
    date_annulation                              TIMESTAMPTZ,
    montant_brut                                  NUMERIC(14,2),
    frais_manutention                              NUMERIC(12,2),
    frais_expedition                                NUMERIC(12,2),
    frais_douanes                                    NUMERIC(12,2),
    frais_controles                                   NUMERIC(12,2),
    frais_importation                                  NUMERIC(12,2),
    autres_frais                                        NUMERIC(12,2),
    taxes                                                NUMERIC(12,2),
    total_ttc                                             NUMERIC(14,2),
    CONSTRAINT chk_bon_commande_un_seul_fournisseur CHECK (
        (id_fournisseur_assurance IS NOT NULL)::int
      + (id_fournisseur_goodies IS NOT NULL)::int = 1
    )
);

CREATE TABLE site.commande_fourniture (
    id_commande_fourniture                SERIAL PRIMARY KEY,
    id_bon_commande                          INTEGER NOT NULL REFERENCES site.bon_commande_fournisseur(id_bon_commande),
    id_fourniture                             INTEGER NOT NULL REFERENCES site.fourniture(id_fourniture),
    quantite_commande                          INTEGER NOT NULL,
    prix_unitaire                               NUMERIC(12,2),
    prix_total                                   NUMERIC(14,2),
    montant_manutention                           NUMERIC(12,2),
    montant_douanes                                NUMERIC(12,2),
    montant_controles                               NUMERIC(12,2),
    montant_importation                              NUMERIC(12,2),
    autres_montants                                   NUMERIC(12,2),
    montant_taxes                                      NUMERIC(12,2)
);

-- --- Dérogations (module transverse, drag-and-drop web + Android) ---------

CREATE TABLE site.derogation (
    id_derogation                         SERIAL PRIMARY KEY,
    code_derogation                          VARCHAR(30) UNIQUE NOT NULL,
    libelle_derogation                         VARCHAR(255) NOT NULL
);
-- Valeurs de référence : Dépassement de capacités, Mise en rebus,
-- Annulation de mouvement, Modification de statut

CREATE TABLE site.demande_derogation (
    id_demande_derogation                 SERIAL PRIMARY KEY,
    id_derogation                            INTEGER NOT NULL REFERENCES site.derogation(id_derogation),
    id_staff_demandeur                        INTEGER NOT NULL REFERENCES site.staff(id_staff),
    numero_demande                             VARCHAR(50) UNIQUE NOT NULL,
    id_demande_approvisionnement                INTEGER REFERENCES site.demande_approvisionnement(id_demande_approvisionnement),
    id_mouvement_fourniture                      INTEGER REFERENCES site.mouvement_fourniture(id_mouvement_fourniture),
    objet_derogation                              TEXT,
    date_enregistrement                            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE site.traitement_derogation (
    id_traitement_derogation               SERIAL PRIMARY KEY,
    id_demande_derogation                     INTEGER NOT NULL REFERENCES site.demande_derogation(id_demande_derogation),
    id_staff_traitant                          INTEGER NOT NULL REFERENCES site.staff(id_staff),
    statut_reponse                              VARCHAR(20) NOT NULL CHECK (statut_reponse IN ('accordee','refusee')),
    date_traitement                              TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- PARTIE 3 — GRANTS (correction demandée par la session Git/GitHub, 13/09)
-- Cible : rôle applicatif mutuellepro (cf. /areas/mutuellepro-platform.md)
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON site.personne TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.personne_utilisateur TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.personne_staff TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.personne_partenaire TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.personne_prospect TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.role_assureur TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.role_convention_partenaire TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.role_regleur_sinistre TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.role_apporteur_affaires TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.role_responsable_magasin TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.reseau TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.unite_gestion TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.nature_fourniture TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.type_fourniture TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.fournisseur_assurance TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.fournisseur_goodies TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.fourniture TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.unite_gestion_fourniture TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.entite_numerotation TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.numerotation_entite TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.article TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.sens_mouvement TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.type_mouvement TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.mouvement TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.mouvement_inter_unite TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.mouvement_fourniture TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.statut_article TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.situation_article TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.historique_modification_statut TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.demande_approvisionnement TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.approvisionnement_fourniture TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.bon_commande_fournisseur TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.commande_fourniture TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.derogation TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.demande_derogation TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.traitement_derogation TO mutuellepro;

-- Séquences des clés primaires SERIAL des tables ci-dessus
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA site TO mutuellepro;
