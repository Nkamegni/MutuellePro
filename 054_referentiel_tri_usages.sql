-- 054 — Ordre d'affichage des usages par genre (appliqué à la main le 07/10/2026,
-- avant le lot R : la colonne s'appelait encore code_categorie).
-- Rang = ordre alphabétique (catégorie d'usage, libellé) à l'intérieur de chaque genre.
BEGIN;
UPDATE referentiel.usage_genre u
   SET ordre_affichage = r.rang
  FROM (SELECT id_usage_genre,
               row_number() OVER (PARTITION BY id_genre ORDER BY code_categorie, libelle_usage) AS rang
          FROM referentiel.usage_genre) r
 WHERE r.id_usage_genre = u.id_usage_genre;
COMMIT;
