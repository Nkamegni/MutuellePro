-- =====================================================================
-- Mutuelle Pro Assurances -- Corrections ponctuelles de donnees (03/09/2026)
-- Suite a la verification des donnees reelles post-reconstruction.
-- =====================================================================

BEGIN;

-- Administrateur -- meme telephone que le reste du Personnel, par analogie.
UPDATE site.staff SET telephone = '+237697717334' WHERE matricule = 'MPA-0002';

-- Mukete -- correction donnee directement par Roger (nom de naissance).
UPDATE site.staff SET nom = 'Mukete née Etane', prenom = 'Marie' WHERE matricule = 'MPA-0005';

-- Partenaires -- personnes morales, pas de prenom (confirme au tour precedent).
UPDATE site.partenaires SET nom = 'ALEF ASSURTECH', prenom = NULL WHERE matricule = 'PART-0002';
UPDATE site.partenaires SET nom = 'ALPHA ACCESS', prenom = NULL WHERE matricule = 'PART-0003';

COMMIT;
