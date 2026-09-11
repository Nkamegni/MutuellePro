-- =====================================================================
-- Mutuelle Pro Assurances — GRANT manquant sur seq_matricule_client
-- 11/09/2026 -- signalé par la session Git/GitHub : 034_matricule_
-- client_reprise.sql crée la séquence sans jamais l'accorder, ni ce
-- fichier ni aucun autre du dépôt (035 couvre les 4 tables centrales
-- et leurs séquences propres, pas celle-ci). Droit déjà accordé à la
-- main en base à un moment donné (confirmé par la session Git) -- ce
-- fichier ne fait que combler le trou dans l'historique versionné,
-- rien à appliquer en base.
--
-- Même situation que historique_connexions, trouvée le même soir.
-- =====================================================================

GRANT USAGE, SELECT ON site.seq_matricule_client TO mutuellepro;
