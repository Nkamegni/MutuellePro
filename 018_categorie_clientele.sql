-- =====================================================================
-- Mutuelle Pro Assurances — Référentiel : catégorie H (Clientèle)
-- Rédigé le 21/08/2026
-- =====================================================================
-- Ajout au référentiel ouvert, pour cohérence documentaire avec la
-- taxonomie complète — H01/H02 ne sont PAS liés par clé étrangère aux
-- tables site.prospects / site.utilisateurs (structurellement
-- distinctes de site.partenaires) ; ils servent d'étiquette d'affichage
-- fixe, non modifiable, dans les interfaces Prospects/Clients — pour
-- rester visuellement cohérent avec la colonne "Type" de l'interface
-- Partenaires, sans forcer une relation de données qui n'a pas de sens.
-- =====================================================================

BEGIN;

INSERT INTO site.categorie_partenaire (code_categorie, libelle_fr, code_lettre)
VALUES ('clientele', 'Clientèle', 'H');

INSERT INTO site.type_partenaire (id_categorie, libelle_fr, code)
SELECT id_categorie, 'Prospect', 'H01' FROM site.categorie_partenaire WHERE code_categorie = 'clientele';

INSERT INTO site.type_partenaire (id_categorie, libelle_fr, code)
SELECT id_categorie, 'Client', 'H02' FROM site.categorie_partenaire WHERE code_categorie = 'clientele';

COMMIT;
