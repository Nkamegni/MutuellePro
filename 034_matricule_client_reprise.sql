-- =====================================================================
-- Mutuelle Pro Assurances -- Reprise matricule Client (03/09/2026)
-- La migration 027 n'a jamais ete reellement executee sur ce serveur
-- (deployee en fichier seulement) -- confirme via la sauvegarde
-- d'avant reconstruction, qui ne montre pas la colonne. On repart
-- proprement : sequence + colonne + attribution au seul Client existant.
-- =====================================================================

BEGIN;

CREATE SEQUENCE IF NOT EXISTS site.seq_matricule_client START 1;

ALTER TABLE site.utilisateurs ADD COLUMN IF NOT EXISTS matricule varchar(20);

-- Attribution au(x) compte(s) existant(s), par ordre de creation --
-- un seul Client actuellement (rnkamegni@), recevra CLI-000001.
DO $$
DECLARE
    ligne RECORD;
BEGIN
    FOR ligne IN SELECT id_utilisateur FROM site.utilisateurs WHERE matricule IS NULL ORDER BY date_creation LOOP
        UPDATE site.utilisateurs
        SET matricule = 'CLI-' || LPAD(nextval('site.seq_matricule_client')::text, 6, '0')
        WHERE id_utilisateur = ligne.id_utilisateur;
    END LOOP;
END $$;

ALTER TABLE site.utilisateurs ALTER COLUMN matricule SET NOT NULL;
ALTER TABLE site.utilisateurs ADD CONSTRAINT utilisateurs_matricule_key UNIQUE (matricule);

COMMIT;
