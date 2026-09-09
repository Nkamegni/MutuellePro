-- Migration 014 — Fondation du module Messagerie : tâches, cache email, paramètres workflow
-- Suite logique de 013_nature_ticket_codification.sql
-- Rédigée le 01/09/2026, corrigée après réception des schémas réels de production.

BEGIN;

-- ============================================================
-- 1. Cache applicatif des métadonnées email référencées par une tâche
--    (la boîte reste IMAP — on ne duplique jamais le corps du message)
-- ============================================================
CREATE TABLE site.emails_cache (
    id_email_cache      SERIAL PRIMARY KEY,
    id_staff            INTEGER REFERENCES site.staff(id_staff),
    id_partenaire       INTEGER REFERENCES site.partenaires(id_partenaire),  -- nom de table supposé, à confirmer
    dossier_imap        VARCHAR(100) NOT NULL,
    uid_imap            INTEGER NOT NULL,
    uidvalidity         BIGINT NOT NULL,
    message_id_rfc       VARCHAR(998),  -- source de vérité pour retrouver l'email dans le temps
    expediteur           VARCHAR(255),
    objet                 VARCHAR(998),
    date_reception        TIMESTAMP,
    a_piece_jointe        BOOLEAN NOT NULL DEFAULT false,
    derniere_synchro      TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT chk_emails_cache_compte_unique CHECK (
        (id_staff IS NOT NULL AND id_partenaire IS NULL) OR
        (id_staff IS NULL AND id_partenaire IS NOT NULL)
    )
);
CREATE INDEX idx_emails_cache_message_id ON site.emails_cache(message_id_rfc);
CREATE INDEX idx_emails_cache_uid ON site.emails_cache(id_staff, dossier_imap, uid_imap);

-- ============================================================
-- 2. Coeur du dispositif — la tâche
--    Réutilise site.nature_ticket (code_nature = 'task', PAS 'tache_interne')
--    et référence optionnellement site.tickets pour rester visible dans le
--    système de tickets existant.
-- ============================================================
CREATE TABLE site.taches (
    id_tache                        SERIAL PRIMARY KEY,
    titre                            VARCHAR(255) NOT NULL,
    description                      TEXT,
    id_nature_ticket                 INTEGER NOT NULL REFERENCES site.nature_ticket(id_nature_ticket),
    id_ticket                        INTEGER REFERENCES site.tickets(id_ticket),
    origine_type                     VARCHAR(20) NOT NULL DEFAULT 'manuel'
                                        CHECK (origine_type IN ('email', 'manuel', 'autre')),
    id_email_cache                   INTEGER REFERENCES site.emails_cache(id_email_cache),
    statut                           VARCHAR(20) NOT NULL DEFAULT 'a_faire'
                                        CHECK (statut IN ('a_faire', 'en_cours', 'fait', 'annule')),
    priorite                         VARCHAR(10) NOT NULL DEFAULT 'normale'
                                        CHECK (priorite IN ('basse', 'normale', 'haute')),
    id_staff_createur                INTEGER REFERENCES site.staff(id_staff),
    id_staff_responsable             INTEGER REFERENCES site.staff(id_staff),
    id_staff_responsable_original    INTEGER REFERENCES site.staff(id_staff),  -- historique, rempli seulement si escalade
    date_creation                    TIMESTAMP NOT NULL DEFAULT now(),
    date_echeance                    TIMESTAMP,
    date_cloture                     TIMESTAMP,
    email_source_disponible          BOOLEAN NOT NULL DEFAULT true,
    date_escalade                    TIMESTAMP
);
CREATE INDEX idx_taches_statut_echeance ON site.taches(statut, date_echeance);
CREATE INDEX idx_taches_responsable ON site.taches(id_staff_responsable);
CREATE INDEX idx_taches_email_cache ON site.taches(id_email_cache);

-- ============================================================
-- 3. Relances — distinctes de la tâche pour permettre plusieurs relances
-- ============================================================
CREATE TABLE site.taches_relances (
    id_relance        SERIAL PRIMARY KEY,
    id_tache          INTEGER NOT NULL REFERENCES site.taches(id_tache) ON DELETE CASCADE,
    date_prevue       TIMESTAMP NOT NULL,
    date_effective    TIMESTAMP,
    canal             VARCHAR(20) NOT NULL DEFAULT 'badge'
                         CHECK (canal IN ('badge', 'email')),  -- 'email' seulement à partir de la Phase 2a (SMTP)
    statut            VARCHAR(20) NOT NULL DEFAULT 'planifiee'
                         CHECK (statut IN ('planifiee', 'envoyee', 'annulee')),
    note              TEXT
);
CREATE INDEX idx_taches_relances_tache ON site.taches_relances(id_tache);

-- ============================================================
-- 4. Paramètres du workflow — destinataire d'escalade par défaut, extensible
--    Roger doit pouvoir changer cette valeur sans intervention technique.
-- ============================================================
CREATE TABLE site.parametres_workflow (
    id_parametre       SERIAL PRIMARY KEY,
    cle                 VARCHAR(100) NOT NULL UNIQUE,
    id_staff_valeur      INTEGER REFERENCES site.staff(id_staff)
);
INSERT INTO site.parametres_workflow (cle, id_staff_valeur)
VALUES ('destinataire_escalade_defaut', NULL);
-- NULL au départ : Roger doit fixer cette valeur avant que l'escalade puisse
-- réassigner une tâche. Tant qu'elle est NULL, l'escalade marque la tâche
-- 'email_source_disponible = false' mais ne réassigne personne (à gérer
-- explicitement côté application, pas seulement côté SQL).

COMMIT;

-- ============================================================
-- Vérifications post-migration recommandées
-- ============================================================
-- SELECT id_nature_ticket, code_nature FROM site.nature_ticket WHERE code_nature = 'task';
--   -> doit retourner id_nature_ticket = 3
-- \d site.taches
-- \d site.emails_cache
