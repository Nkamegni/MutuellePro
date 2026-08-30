-- =====================================================================
-- Mutuelle Pro Assurances — Règle métier : un seul compte ACTIF par
-- adresse email partenaire (plusieurs comptes suspendus peuvent
-- partager la même adresse — cas des changements de titulaire de boîte
-- mail sans supprimer l'historique)
-- Rédigé le 21/08/2026
-- =====================================================================

BEGIN;

-- Retrait de la contrainte d'unicité globale posée à la création de la
-- table (site.partenaires_email_key) — trop stricte pour ce cas d'usage.
ALTER TABLE site.partenaires DROP CONSTRAINT IF EXISTS partenaires_email_key;

-- Unicité partielle : uniquement parmi les comptes actifs. PostgreSQL
-- refuse alors nativement toute tentative d'activer/créer un compte
-- actif dont l'email correspond à un autre compte déjà actif —
-- équivalent fonctionnel d'un trigger, sans le risque de bug d'une
-- logique procédurale maison.
CREATE UNIQUE INDEX idx_partenaires_email_actif ON site.partenaires (email) WHERE statut_compte = 'actif';

COMMIT;
