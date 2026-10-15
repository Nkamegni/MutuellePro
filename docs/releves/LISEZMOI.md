# Releves de tables de reference (etat de la base)
Ces fichiers sont des **releves de l'etat de la base `vpiclist`**, pris le 15/10/2026 par `psql` (`\d` et `COPY ... CSV HEADER`). Ce ne sont **pas** des migrations.

| Table | Lignes | Fichiers |
|---|---|---|
| `site.bareme_dta` | 96 (ids 1 a 96) | `2026-10-15_bareme_dta.csv`, `2026-10-15_bareme_dta_structure.txt` |
| `site.bareme_fractionnement` | 5 (paliers 1-60 a 241-365 jours) | `2026-10-15_bareme_fractionnement.csv`, `2026-10-15_bareme_fractionnement_structure.txt` |

Constat du 15/10/2026 : aucune migration versee ne cree ni ne remplit ces deux tables. Les migrations 056 (`bareme_dta`) et 059 (`bareme_fractionnement`, citee seulement comme reportee au lot S3) ne font que renommer des colonnes ou des objets.
Point ouvert : les references `DTA_utf8.csv` citees dans `texte_reference` ont des trous (reff. 13, 21, 63 a 67, 103 a 112, et aucune apres la 113). A confirmer avec le fichier source.
Point ouvert : la cle primaire de `bareme_fractionnement` porte sur `palier` seul, malgre `date_debut`/`date_fin`.
