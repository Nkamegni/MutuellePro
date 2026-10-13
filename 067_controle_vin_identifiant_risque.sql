-- Migration 067 — Contrôle du VIN (Automobile) et identifiant du risque (autres branches)
-- Session Normalisation — réserve : Git/GitHub (feat/normalisation)
-- Vérifications préalables (13/10/2026, lecture seule sur vpiclist) :
--   - site.mouvements, par branche : AUTOMOBILE (8 lignes, 0 sans VIN, 0 VIN court),
--     RC_GENERALE (1 ligne, 1 sans VIN [NULL, permis], 0 VIN court) — AUCUNE violation.
--   - 0 mouvement sans contrat associé (couverture totale de la jointure).
--   - site.contrats.code_branche est en texte ('AUTOMOBILE', 'RC_GENERALE').
--   - Schéma 'site' appartient à 'postgres' ; GRANT nécessaire pour 'mutuellepro'.
--   - Aucune séquence 'seq_identifiant_risque' préexistante.
-- Application : Roger, sur le VPS, après essai à blanc.

BEGIN;

-- 1. VIN : au moins 10 caractères si renseigné (toutes branches confondues ;
-- l'obligation de le renseigner pour l'Automobile en NAF/REN est portée par le
-- serveur, seul à connaître branche + nature du mouvement).
-- Posée VALIDÉE directement : aucune ligne existante n'y contrevient (vérifié ci-dessus).
ALTER TABLE site.mouvements
  ADD CONSTRAINT mouvements_vin_longueur_min
  CHECK (vin IS NULL OR length(vin) >= 10);

-- 2. Identifiant du risque (branches hors Automobile) : séquence globale,
-- unique pour toute la base, utilisée par le serveur pour générer VIN quand
-- il est vide (ex. MAISON0042). Même principe que site.seq_matricule_client.
CREATE SEQUENCE IF NOT EXISTS site.seq_identifiant_risque;
GRANT USAGE, SELECT ON SEQUENCE site.seq_identifiant_risque TO mutuellepro;

COMMIT;
