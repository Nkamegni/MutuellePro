-- =====================================================================
-- Mutuelle Pro Assurances -- Reparation des droits d'acces (04/09/2026)
-- Meme piege que la migration 035 plus tot cette nuit : les 2 nouvelles
-- tables (seuils_alerte_staff, snapshot_kpis_quotidien) n'ont jamais
-- recu de GRANT pour l'utilisateur applicatif "mutuellepro" -- aucune
-- des deux migrations d'origine n'en contenait. PostgreSQL n'accorde
-- jamais de droits automatiquement sur un nouvel objet.
-- =====================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON site.seuils_alerte_staff TO mutuellepro;
GRANT SELECT, INSERT, UPDATE ON site.snapshot_kpis_quotidien TO mutuellepro;
GRANT USAGE, SELECT ON site.snapshot_kpis_quotidien_id_snapshot_seq TO mutuellepro;
