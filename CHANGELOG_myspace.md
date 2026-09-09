# Changelog — myspace.html

Convention de version : `AAAA.MM.JJ-lettre` (lettre incrémentée à chaque déploiement distinct le même jour).

---

## 2026.09.09-c
- Bulles d'aide ajoutées sur les 10 occurrences de la poignée (`⠿` — "Glissez pour réordonner ce bloc") et du bouton `👁️` ("Afficher ou masquer ce bloc") — aucune indication n'existait auparavant, signalé par Roger

## 2026.09.09-b
- **Correctif** : le glisser-déposer Personnel restait inerte depuis son intégration (09/09-a) — `initSortableDashboard('staff')` cherchait un conteneur `dashboard-staff-widgets` qui n'a jamais existé, le vrai conteneur s'appelant `dashboard-personnel-widgets` (nommage antérieur à la généralisation à 3 rôles). Aucune erreur visible, `Sortable` n'était simplement jamais instancié. Corrigé par une fonction de traduction ciblée (`prefixeDomDashboard`), sans toucher aux tables d'état/URL qui utilisent correctement `'staff'` par ailleurs
- **Correctif** (`dashboardPreferences.routes.js`) : erreur PostgreSQL `42P08` ("text versus character varying") sur la requête d'enregistrement et sur la réassignation de vue active à la suppression — paramètres `$1`/`$2` réutilisés dans une sous-requête sans type explicite, cast `::varchar`/`::int` ajoutés aux deux endroits

## 2026.09.09-a
- Personnalisation du dashboard (glisser-déposer + masquage) généralisée à Client et Partenaire, unifiée avec Personnel via un seul mécanisme paramétré par rôle
- Vues multiples nommées (créer / activer / supprimer une disposition)
- **Bug trouvé et corrigé** : l'habillage glisser-déposer (poignée, titre, bouton masquer) n'était jamais visible pour Client/Partenaire — la classe CSS conditionnelle nécessaire n'était posée que pour Personnel
- Export Excel des KPI reconstruit pour réutiliser `construireDonneesKpis()` sans divergence, export programmé (cron) écrit — correctif `dotenv` appliqué par avance (même bug déjà rencontré sur le snapshot quotidien)

## 2026.09.08-a
- Glisser-déposer du dashboard Personnel — reçu de la session Tableau de bord, conçu à l'origine pour 6 widgets incluant Portefeuille et Kanban Prospects, qui se sont révélés être des **modèles entiers** (onglets Support/Portefeuille/Commercial), pas des widgets du modèle Support — corrigé et scopé aux 4 vrais widgets (Vue d'ensemble, Flux, Graphiques, À venir), par décision de Roger
- L'habillage glisser-déposer (poignée, titre, bouton masquer) ne s'affiche que sur le modèle Support — les zones partagées avec Portefeuille/Commercial restent toujours fonctionnelles, seul l'habillage se masque
- Nouvelle route `GET/POST /api/staff/dashboard-preferences`, table `site.preferences_dashboard` (avec `GRANT` inclus dès la migration — leçon retenue du 04/09)

## 2026.09.05-d
- Grille Prospects : largeurs de colonnes ajustées (Nom +2/5 d'Email, Assigné à +1/5 chacune de Branche/Statut/Mis à jour)
- Grille Prospects : retrait du radical "H01 — " dans la colonne Type, n'affiche plus que "Prospect"

## 2026.09.05-c
- Grille Prospects : ajout des colonnes Email et Téléphone (signalé par Roger — jamais visibles, email servait seulement de repli d'affichage si le nom manquait)
- Grille Personnel : ajout de la colonne Téléphone (signalé par Roger — donnée déjà présente mais jamais affichée, seulement disponible via le formulaire d'édition)

## 2026.09.05-b
- Moteur d'import générique intégré (panneau modal + suivi temps réel SSE, validation à blanc puis import réel, 4 cas de qualification) — reçu et vérifié de la session "Amélioration de l'interface et ergonomie"
- Migration des boutons Import Prospects et Import Partenaires vers ce nouveau moteur, anciennes fonctions retirées
- Bandeau de filtre actif générique — s'affiche automatiquement sur les 4 tableaux triables (Personnel, Partenaires, Clients, Prospects) dès qu'un filtre de colonne est actif, avec retrait individuel ou global
- "Promouvoir en Client" déplacé d'une colonne par ligne vers une action groupée (cohérent avec "Marquer perdu"/"Supprimer")
- Entrée "Modèles d'import" ajoutée au menu Administrateur, marquée Prochainement

## 2026.09.05-a
- Dashboard Personnel : 3 modèles au choix (Support/Portefeuille/Commercial), ce dernier réservé Administrateur/SuperAdmin — changement de modèle sans nouvel appel réseau (payload déjà en cache côté client)
- Retours tactiles mobiles : infobulle + vibration sur les cartes et graphiques du tableau de bord
- Alertes du tableau de bord (ex. comptes sans boîte mail) dédupliquées par construction, quel que soit le nombre de changements de période
- Export Excel des KPI (`GET /api/staff/kpis/export`) : feuilles Résumé, Tickets, et Administration (admin/superadmin uniquement) — réutilise exactement les mêmes requêtes que l'affichage JSON, jamais une copie divergente
- Refactorisation de `staffKpis.routes.js` : construction de la réponse extraite en fonction réutilisable, sans changer la façon dont `server.js` monte la route

## 2026.09.04-c
- **Lot C** : tableau de bord par rôle (Client/Personnel/Partenaire), intégré depuis la session dédiée "Tableau de bord"
- **Seuils d'alerte configurables** : personnalisation du seuil "tâche en retard" par membre du staff (Mon Profil)
- **Snapshots quotidiens KPI** : indicateurs d'évolution (↑/↓ vs veille) sur les cartes d'état (tickets non assignés, tâches en attente/retard, clients/partenaires actifs)
- Correctif : `adresse_ip_actuelle` ajouté aux réponses de connexion (Client/Personnel/Partenaire), manquant lors de la première intégration du Lot C

## 2026.09.04-b
- Correctif de sécurité urgent : corps HTML des messages (module Messagerie) isolé en `<iframe sandbox>`, empêchant toute exécution de script — faille signalée le 01/09, jamais refermée jusqu'ici
- Correctif d'affichage : filtre "Type Partenariat" affichait uniquement les codes, libellés complets restaurés ; alignement des cases à cocher du filtre corrigé (largeur, retour à la ligne)

## 2026.09.04-a
- **Reconstruction complète des 4 tables centrales** (`site.utilisateurs`, `site.staff`, `site.partenaires`, `site.prospects`) : ordre des colonnes normalisé, `nom_complet` éliminé physiquement, `nom` obligatoire partout, contraintes nettoyées, droits d'accès réparés
- Élimination de `nom_complet` dans tout le code applicatif référençant les 4 tables (11 fichiers backend, ce fichier)
- Fonction utilitaire partagée `nomAffiche()` introduite
- Système générique de tri/filtre/pagination construit et appliqué aux tableaux Personnel, Partenaires, Clients, Prospects
- Normalisation des numéros de téléphone (format `+237` systématique, trigger permanent)
- Système de numérotation Client (`CLI-XXXXXX`)
- "Mot de passe oublié" construit pour Personnel et Partenaires (n'existait que pour Client)
- Import CSV Prospects/Partenaires : séparateur généralisé au point-virgule, colonnes Nom/Prénom séparées

---

*Entrées antérieures au 04/09/2026 non reconstituées rétroactivement — historique disponible dans les transcripts de session (voir `journal.txt`).*
