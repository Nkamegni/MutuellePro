-- =====================================================================
-- Mutuelle Pro Assurances — Espace unifié Client/Collaborateur
-- Lien optionnel staff → client, pour les personnes qui ont les deux
-- comptes (ex: un collaborateur qui est aussi client de l'agence).
-- Jamais une fusion d'identité — juste un pointeur facultatif.
-- Rédigé le 21/08/2026
-- =====================================================================

BEGIN;

ALTER TABLE site.staff
    ADD COLUMN id_utilisateur_lie int REFERENCES site.utilisateurs (id_utilisateur);

COMMIT;

-- Droit déjà couvert par le GRANT UPDATE existant sur site.staff.
