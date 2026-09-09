-- =====================================================================
-- Mutuelle Pro Assurances -- Nettoyage post-reconstruction (03/09/2026)
-- Corrige deux imperfections trouvees apres verification de la
-- migration 031 : contraintes en double (declarees a la fois en ligne
-- dans CREATE TABLE et explicitement ensuite), et noms de contraintes
-- ayant garde le suffixe "_new" du renommage de table.
-- Aucun effet sur les donnees -- uniquement des noms et des doublons.
-- =====================================================================

BEGIN;

-- --- Retrait des 3 contraintes en double (garder la version proprement nommee) ---
ALTER TABLE site.staff DROP CONSTRAINT staff_new_id_utilisateur_lie_fkey;
ALTER TABLE site.prospects DROP CONSTRAINT prospects_new_id_utilisateur_fkey;
ALTER TABLE site.prospects DROP CONSTRAINT prospects_new_id_staff_assigne_fkey;

-- --- Renommage des contraintes ayant garde le suffixe "_new" ---
ALTER TABLE site.utilisateurs RENAME CONSTRAINT utilisateurs_new_pkey TO utilisateurs_pkey;
ALTER TABLE site.utilisateurs RENAME CONSTRAINT utilisateurs_new_statut_compte_check TO utilisateurs_statut_compte_check;

ALTER TABLE site.staff RENAME CONSTRAINT staff_new_pkey TO staff_pkey;
ALTER TABLE site.staff RENAME CONSTRAINT staff_new_statut_compte_check TO staff_statut_compte_check;
ALTER TABLE site.staff RENAME CONSTRAINT staff_new_id_role_fkey TO staff_id_role_fkey;

ALTER TABLE site.partenaires RENAME CONSTRAINT partenaires_new_pkey TO partenaires_pkey;
ALTER TABLE site.partenaires RENAME CONSTRAINT partenaires_new_statut_compte_check TO partenaires_statut_compte_check;

ALTER TABLE site.prospects RENAME CONSTRAINT prospects_new_pkey TO prospects_pkey;
ALTER TABLE site.prospects RENAME CONSTRAINT prospects_new_statut_opportunite_check TO prospects_statut_opportunite_check;
ALTER TABLE site.prospects RENAME CONSTRAINT prospects_new_id_ticket_origine_fkey TO prospects_id_ticket_origine_fkey;

COMMIT;
