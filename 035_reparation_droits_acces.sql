-- =====================================================================
-- Mutuelle Pro Assurances -- Reparation des droits d'acces (03/09/2026)
-- La reconstruction des 4 tables (migration 031, DROP + CREATE) a fait
-- perdre a l'utilisateur applicatif "mutuellepro" tous ses droits sur
-- ces tables -- PostgreSQL ne les reporte jamais automatiquement sur
-- une table recreee, meme sous le meme nom. Oubli de ma part lors de
-- la migration 031, corrige ici en urgence.
-- =====================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON site.utilisateurs TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.staff TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.partenaires TO mutuellepro;
GRANT SELECT, INSERT, UPDATE, DELETE ON site.prospects TO mutuellepro;

GRANT USAGE, SELECT ON site.utilisateurs_id_utilisateur_seq TO mutuellepro;
GRANT USAGE, SELECT ON site.staff_id_staff_seq TO mutuellepro;
GRANT USAGE, SELECT ON site.partenaires_id_partenaire_seq TO mutuellepro;
GRANT USAGE, SELECT ON site.prospects_id_prospect_seq TO mutuellepro;
