-- =====================================================================
-- Mutuelle Pro Assurances — Système d'étiquetage des tickets par nature
-- Rédigé le 21/08/2026
-- =====================================================================
-- Codifie la taxonomie complète proposée par Roger (qui ouvre le ticket
-- + formulation), pour permettre un décompte par nature dès maintenant.
-- Les MÉCANISMES DE CRÉATION des types ALERTE/TASK/PROJET/INC-MAJ/QC ne
-- sont PAS construits ici — seule la structure de référence existe,
-- l'implémentation se fera au moment de chaque module concerné
-- (Production, Stocks, etc.), conformément à la décision de Roger.
-- =====================================================================

BEGIN;

CREATE TABLE site.nature_ticket (
    id_nature_ticket    serial PRIMARY KEY,
    code_nature         varchar(20) NOT NULL UNIQUE,
    libelle_fr          varchar(100) NOT NULL,
    qui_ouvre_fr         varchar(100) NOT NULL,
    formulation_type     varchar(50) NOT NULL  -- ex: "Demande de...", "Alerte:..."
);

INSERT INTO site.nature_ticket (code_nature, libelle_fr, qui_ouvre_fr, formulation_type) VALUES
    ('demande', 'Demande',            'Client / Utilisateur',       'Demande de...'),
    ('alerte',  'Alerte système',     'Système (automatique)',      'Alerte:...'),
    ('task',    'Tâche interne',      'Collaborateur / Partenaire', 'Faire...'),
    ('projet',  'Projet / Changement','Collaborateur / Partenaire', 'Déployer...'),
    ('inc_maj', 'Incident majeur',    'Collaborateur / Partenaire', '(constat direct)'),
    ('qc',      'Contrôle qualité',   'Système (auto, à la clôture d''une Demande)', 'QC - Vérifier...');

ALTER TABLE site.type_ticket ADD COLUMN id_nature_ticket int REFERENCES site.nature_ticket (id_nature_ticket);

-- Les 3 types existants (info/devis/sinistre) sont tous de nature "demande".
UPDATE site.type_ticket SET id_nature_ticket = (SELECT id_nature_ticket FROM site.nature_ticket WHERE code_nature = 'demande');

-- Deux types "demande" supplémentaires, cités par Roger, pas encore
-- reliés à un formulaire public — codifiés dès maintenant.
INSERT INTO site.type_ticket (code_type_ticket, libelle_fr, libelle_en, prefixe_code, id_nature_ticket)
SELECT 'incident', 'Incident', 'Incident', 'DINC', id_nature_ticket FROM site.nature_ticket WHERE code_nature = 'demande';

INSERT INTO site.type_ticket (code_type_ticket, libelle_fr, libelle_en, prefixe_code, id_nature_ticket)
SELECT 'reclamation', 'Réclamation', 'Complaint', 'DREC', id_nature_ticket FROM site.nature_ticket WHERE code_nature = 'demande';

ALTER TABLE site.type_ticket ALTER COLUMN id_nature_ticket SET NOT NULL;

-- Un type par nature restante (ALERTE/TASK/PROJET/INC-MAJ/QC) — sert de
-- point d'ancrage pour le décompte, sans mécanisme de création actif.
INSERT INTO site.type_ticket (code_type_ticket, libelle_fr, libelle_en, prefixe_code, id_nature_ticket)
SELECT 'alerte_systeme', 'Alerte système', 'System alert', 'ALERTE', id_nature_ticket FROM site.nature_ticket WHERE code_nature = 'alerte';

INSERT INTO site.type_ticket (code_type_ticket, libelle_fr, libelle_en, prefixe_code, id_nature_ticket)
SELECT 'tache_interne', 'Tâche interne', 'Internal task', 'TASK', id_nature_ticket FROM site.nature_ticket WHERE code_nature = 'task';

INSERT INTO site.type_ticket (code_type_ticket, libelle_fr, libelle_en, prefixe_code, id_nature_ticket)
SELECT 'projet_changement', 'Projet / Changement', 'Project / Change', 'PROJET', id_nature_ticket FROM site.nature_ticket WHERE code_nature = 'projet';

INSERT INTO site.type_ticket (code_type_ticket, libelle_fr, libelle_en, prefixe_code, id_nature_ticket)
SELECT 'incident_majeur', 'Incident majeur', 'Major incident', 'INC-MAJ', id_nature_ticket FROM site.nature_ticket WHERE code_nature = 'inc_maj';

INSERT INTO site.type_ticket (code_type_ticket, libelle_fr, libelle_en, prefixe_code, id_nature_ticket)
SELECT 'controle_qualite', 'Contrôle qualité', 'Quality control', 'QC', id_nature_ticket FROM site.nature_ticket WHERE code_nature = 'qc';

COMMIT;

-- Droits (hors transaction) :
--   GRANT SELECT ON site.nature_ticket TO mutuellepro;
