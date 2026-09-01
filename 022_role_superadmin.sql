-- =====================================================================
-- Mutuelle Pro Assurances -- Role SuperAdmin
-- Redige le 31/08/2026
-- =====================================================================
-- Roger (rnkamegni@) devient "superadmin", distinct de "administrateur"
-- (le role du compte admin@, generique, attribuable a quiconque
-- administre le site). Les comptes SuperAdmin sont invisibles aux
-- comptes qui ne le sont pas eux-memes -- reserve a l'equipe de
-- programmation, demande explicite de Roger le 31/08/2026.
-- =====================================================================

BEGIN;

INSERT INTO site.role_staff (code_role, libelle_fr, libelle_en)
SELECT 'superadmin', 'SuperAdmin', 'SuperAdmin'
WHERE NOT EXISTS (SELECT 1 FROM site.role_staff WHERE code_role = 'superadmin');

UPDATE site.staff
SET id_role = (SELECT id_role FROM site.role_staff WHERE code_role = 'superadmin')
WHERE email = 'rnkamegni@mutuelleproassurances.com';

COMMIT;
