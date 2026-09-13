# Matrice des rôles et permissions — myspace.html
**Rédigée le 12/09/2026, fondée sur une vérification directe de chaque route, pas une estimation**

---

## Principe directeur

Deux natures de tâches, jamais confondues dans cette matrice :

- **Administration des données** — le quotidien d'un commercial ou d'un rédacteur en production : gérer des prospects, consulter des partenaires, suivre des indicateurs. N'affecte jamais la structure du système.
- **Administration de la base** — créer/modifier/supprimer des comptes, des structures organisationnelles, importer en masse. Impact réel sur l'intégrité des données, réservé à un cercle restreint.

## Rôles Personnel (staff)

| Domaine | Gestionnaire | Administrateur | Superadmin |
|---|---|---|---|
| **Tickets, Messagerie, Tâches** | Complet | Complet | Complet |
| **Tableau de bord** (personnalisation) | Complet | Complet | Complet |
| **Prospects** — créer, lister, changer statut, interactions | Oui | Oui | Oui |
| **Prospects** — promouvoir en Client | Oui | Oui | Oui |
| **Prospects** — éditer une fiche complète | Non | Oui | Oui |
| **Prospects** — supprimer, importer en masse | Non | Oui | Oui |
| **Partenaires** — consulter la liste | Oui | Oui | Oui |
| **Partenaires** — assigner un ticket | Oui | Oui | Oui |
| **Partenaires** — créer, éditer, supprimer, suspendre, boîte mail, importer | Non | Oui | Oui |
| **Pilotage & KPIs** — consulter, exporter | Oui | Oui | Oui |
| **Clients** — consulter, éditer statut | Non | Oui | Oui |
| **Personnel** — tout (créer, éditer, supprimer, boîte mail) | Non | Oui | Oui |
| **Journal no-reply** — consulter | Non | Oui | Oui |

## Comptes externes (portée strictement limitée à leurs propres données)

| Domaine | Client | Partenaire |
|---|---|---|
| Ses propres demandes/dossiers | Oui | Oui |
| Messagerie | Oui | Oui |
| Personnalisation de son propre tableau de bord | Oui | Oui |
| Toute donnée d'un autre compte | Non | Non |
| Toute fonction d'Administration | Non | Non |

## Écarts corrigés le 12/09/2026

- Le menu ne reflétait aucune de ces distinctions avant ce jour — un seul groupe "Administration", verrouillé Admin/Superadmin, masquait Prospects/Partenaires/Pilotage à un Gestionnaire alors que les routes le permettaient déjà
- Les actions structurantes de Partenaires (créer/éditer/supprimer/suspendre/importer) sont désormais explicitement masquées pour un Gestionnaire dans l'interface — elles l'étaient déjà côté route, mais restaient visibles à l'écran sans jamais fonctionner

## Angles morts identifiés, non traités ce soir

- **Aucun rôle "commercial" ni "rédacteur en production" distinct n'existe** dans le code (`code_role` ne connaît que `gestionnaire`/`administrateur`/`superadmin`) — la distinction métier que vous décrivez (commerciaux et rédacteurs en production comme profils de Gestionnaire) n'est donc pas encore représentée informatiquement, seulement conceptuellement dans cette matrice
- **`PATCH /prospects/:id/statut`** (changer le statut) n'a aucune restriction de rôle du tout — accessible à n'importe quel Personnel connecté, pas seulement Gestionnaire+. Comportement déjà en place, jamais remis en question ce soir, à valider explicitement si vous le souhaitez
- **Groupes de permissions (Partenaires)** apparaît déjà comme "Prochainement" dans le menu — probablement l'endroit naturel où une granularité plus fine par type de Partenaire serait à construire, hors périmètre de cette matrice

---

*Cette matrice reflète l'état réel du code au 12/09/2026, vérifié route par route — pas une intention ni un document de conception antérieur.*
