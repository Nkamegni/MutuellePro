-- =====================================================================
-- Mutuelle Pro Assurances -- nom/prenom, Personnel et Partenaires
-- Redige le 03/09/2026, demande de Roger.
--
-- nom_complet EST CONSERVE (pas supprime) -- trop de code existant en
-- depend (emails deja construits, affichage myspace.html). nom/prenom
-- s'ajoutent comme vrais champs editables, tenus synchronises par le
-- code applicatif a chaque creation/modification desormais.
--
-- Separation automatique des comptes deja existants, a la demande de
-- Roger malgre le risque d'inversion : premier mot = prenom, reste =
-- nom (aucune convention garantie dans les donnees existantes).
-- =====================================================================

BEGIN;

ALTER TABLE site.staff ADD COLUMN nom varchar(100);
ALTER TABLE site.staff ADD COLUMN prenom varchar(100);
ALTER TABLE site.partenaires ADD COLUMN nom varchar(100);
ALTER TABLE site.partenaires ADD COLUMN prenom varchar(100);

UPDATE site.staff
SET prenom = split_part(nom_complet, ' ', 1),
    nom = CASE
        WHEN position(' ' in nom_complet) > 0 THEN substring(nom_complet from position(' ' in nom_complet) + 1)
        ELSE nom_complet
    END;

UPDATE site.partenaires
SET prenom = split_part(nom_complet, ' ', 1),
    nom = CASE
        WHEN position(' ' in nom_complet) > 0 THEN substring(nom_complet from position(' ' in nom_complet) + 1)
        ELSE nom_complet
    END;

ALTER TABLE site.staff ALTER COLUMN nom SET NOT NULL;
ALTER TABLE site.partenaires ALTER COLUMN nom SET NOT NULL;

COMMIT;
