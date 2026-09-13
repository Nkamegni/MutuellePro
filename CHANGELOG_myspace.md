# Changelog — myspace.html

Convention de version : `AAAA.MM.JJ-lettre` (lettre incrémentée à chaque déploiement distinct le même jour).

---

## 2026.09.11-a
- **Journal des envois no-reply@** — nouvelle page Admin/Superadmin (lecture seule), demandée par la session "Création d'un serveur de messagerie" pour la visibilité du staff. Alimentée par `lib/verificationConnexion.js`, qui journalise désormais chaque code de connexion envoyé (`message_id`, destinataire, type, référence compte) dans `site.no_reply_messages_envoyes` — table déjà créée par leur session pour leurs propres tests, réutilisée telle quelle. Journalisation non-bloquante : un échec n'empêche jamais l'envoi du code lui-même
- Périmètre couvert : uniquement les codes de connexion (`verificationConnexion.js`) — 12 autres fichiers envoient aussi via `no-reply@`, extension laissée à une décision explicite plutôt qu'étendue silencieusement cette nuit

## 2026.09.09-n
- Message "mot de passe oublié" reformulé, plus affirmatif ("Si cet identifiant correspond à un compte, vous recevrez un lien de réinitialisation dans quelques instants. Vérifiez aussi vos indésirables.") — même principe de sécurité conservé (jamais confirmer/infirmer l'existence d'un compte, contre l'énumération de comptes), approuvé par Roger

## 2026.09.09-m
- **Correctif de largeur** (signalé par Roger — "extrêmement désagréable sur laptop") : `#vue-inscription-client` n'avait aucune contrainte de largeur propre, contrairement à `#vue-login` (`max-width:820px`) — une seule carte avec `flex:1`, sans plafond de conteneur, s'étirait jusqu'au bord de l'écran. Classe partagée `.conteneur-vue-connexion` introduite, appliquée aux 3 vues du bloc (Connexion, Nouveau mot de passe, Inscription) — **le même défaut existait déjà sur "Nouveau mot de passe"**, jamais remarqué faute de test visuel régulier (déclenchée uniquement par lien email). Styles des titres/sous-titres et marge mobile réduite consolidés dans la même classe au passage, plus de duplication entre les 3 vues

## 2026.09.09-l
- **Refonte de l'inscription Client, à la demande de Roger** : la modale (09.09-j/k) remplacée par une vraie vue sœur de `#vue-login` (`#vue-inscription-client`), sur le motif déjà établi par `#vue-nouveau-mdp` — argument de Roger : une modale, avec son fond assombri, suggère une urgence/un stress mal adaptés à un acte aussi tranquille que créer un compte. Résout la même contrainte de hauteur qu'avant, mais plus proprement : quand cette vue s'affiche, "Connexion" et "Suivre ma demande" sont tous deux masqués, leur équilibre mutuel n'a plus à être maintenu à ce moment précis
- Nettoyage : l'enveloppe `DOMContentLoaded` ajoutée en 09.09-k pour contourner le problème d'ordre d'exécution de la modale n'est plus nécessaire — le formulaire vit désormais juste après `#vue-login`, bien avant l'exécution du script, retirée

## 2026.09.09-k
- **Correctif critique, régression introduite par 09.09-j** : `Uncaught TypeError: Cannot read properties of null` au chargement de **toute** page (signalé par Roger) — le déplacement du formulaire d'inscription en modale (fin de `<body>`) laissait `document.getElementById('form-inscription-client').addEventListener(...)` s'exécuter avant que le navigateur n'ait analysé jusque-là. Liaison différée jusqu'à `DOMContentLoaded` ; les 3 formulaires de connexion, plus haut dans le document, n'étaient pas affectés

## 2026.09.09-j
- **Bug corrigé** (signalé par Roger, capture d'écran à l'appui) : après création de compte, basculer sur "Je suis Personnel" laissait le formulaire de connexion Client visible en dessous — `basculerInscriptionClient(false)` réaffichait sans condition `form-login-client`, écrasant le masquage correct fait juste avant par `basculerTypeConnexion`
- **Inscription Client déplacée en modale** (exigence explicite de Roger, 3 points) : (1) connexion et inscription Client ne doivent jamais être visibles ensemble, (2) l'inscription ne doit jamais exister dans le contexte Personnel/Partenaire, (3) la hauteur de la carte Connexion doit rester strictement constante — égale à celle de "Suivre ma demande" — quel que soit l'état de l'inscription. Un formulaire en ligne (plus long qu'un simple formulaire de connexion) aurait fait grandir les deux colonnes ensemble par l'étirement flex, créant le vide visible sur la capture. La modale règle les 3 points par construction, sans surveillance manuelle
- **Nom affiché après connexion** (Personnel/Partenaire) — `GET /api/staff/session` et `GET /api/partenaire/session` ne renvoyaient que le rôle/l'identifiant technique, jamais le nom de la personne (signalé par Roger). Les deux routes interrogent désormais `nom`/`prenom`, une requête supplémentaire mais uniquement à la vérification de session
- **Délai réel avant déblocage** sur le message de limitation de débit (`server.js`, hors dépôt Git) — "réessayez dans quelques minutes" remplacé par un calcul exact à partir de la fenêtre glissante, plus l'en-tête HTTP standard `Retry-After`

## 2026.09.09-i
- **Inscription Client** réintégrée à la porte d'entrée unique de `myspace.html` — migration restée inachevée depuis le retrait de l'ancien formulaire d'`index.html` le 25/08/2026 (l'ancien système avait été retiré en vue de cette consolidation, mais le nouveau formulaire n'avait jamais été construit côté Client). Réutilise le contrat déjà vérifié en conditions réelles ce soir (`POST /api/inscription`, mêmes 4 champs). Réservée au Client — Personnel et Partenaire n'ont pas d'auto-inscription
- **Bug trouvé et corrigé en cours de construction** : le message de succès réutilisait la zone d'erreur de connexion en vert, sans jamais réinitialiser la couleur — une vraie erreur de connexion survenant juste après aurait pu s'afficher à tort en vert. Corrigé sur les 4 points d'entrée de cette zone partagée (3 formulaires de connexion + vérification du code 2FA)

## 2026.09.09-h
- **Édition des coordonnées d'un prospect** (nom/prénom/email/téléphone) — décidée par Roger, aucune correction n'était possible jusqu'ici, seul le statut était modifiable. Route `PATCH /api/staff/prospects/:id`, restreinte Administrateur/Superadmin (choix explicite de Roger). Bouton ✏️ dans la colonne Nom, visible aux mêmes rôles côté front, journalisée dans `site.journal_audit` (avant/après dans un seul champ JSON, aucune colonne `donnees_avant` séparée en base)
- **Message d'erreur explicite sur doublon de téléphone** à la promotion (`utilisateurs_telephone_key`) — remplace un "erreur serveur" générique par un message exploitable

## 2026.09.09-g
- **Traçabilité de la promotion groupée Prospect → Client** (signalé par Roger — "processus pas très bavard") : le backend renvoyait déjà un motif d'échec précis (`data.erreurs`), jamais lu jusqu'ici — un simple compteur muet remplacé par un panneau listant chaque prospect en échec avec son motif exact
- Trouvé et corrigé au passage, en conditions réelles : `superadmin` absent de 4 contrôles de rôle (`prospectPromotion`, `prospectQualification`, et la constante `ROLES_ECRITURE` dupliquée dans `staffPartenaires`/`staffTickets`) ; `matricule` jamais généré à la création d'un compte Client via promotion ; `GRANT` manquant sur `site.seq_matricule_client` (bloquait aussi l'inscription publique) ; `site.historique_connexions` disparue, recréée

## 2026.09.09-f
- **Correctif** : la vue "Défaut" du système de personnalisation du dashboard est désormais **jamais supprimable**, sur les 3 rôles (front + back) — trouvé lors du test manuel B8 (protocole "Tableau de bord") : la règle précédente ne protégeait que "la dernière vue restante", "Défaut" pouvait donc être supprimée tant qu'au moins une autre vue existait

## 2026.09.09-e
- **Mode comparaison** (reconception demandée directement par Roger à la session Tableau de bord, remplace le widget "Suivi comparatif" de 09-d) : "Vue d'ensemble" et "Flux" basculent en place vers une comparaison Période N / N-1 (bouton "⇄ Mode comparaison"), plutôt qu'un widget séparé qui dupliquait des cartes déjà affichées ailleurs. Graphiques et Bientôt disponible restent inchangés dans les deux cas
- **Correctif backend** (`staffKpis.routes.js`) : `calculerEvolution()` ne retournait pas `variation_absolue`, pourtant lu par la nouvelle carte comparative — sans ce champ, "Écart : undefined" se serait affiché littéralement sur chaque carte. Vérifié avant et après correctif (simulation exacte de l'affichage résultant)
- Le widget séparé, sa fonction `chargerSuiviComparatif`, et son entrée dans les listes de widgets connus (front + back) sont retirés partout, cohérence vérifiée entre les deux fichiers

## 2026.09.09-d
- Widget "Suivi comparatif" (5ᵉ widget du modèle Support Personnel) — compare la dernière période calendaire complète à la période précédente (4 granularités), sur `?comparatif=` de `GET /api/staff/kpis`. Bornes calculées via `date_trunc()` SQL, vérifiées indépendamment (4 granularités, date réelle du jour) — correctes
- Indicateurs d'état comparés seulement si un snapshot existe à ±3 jours de chaque borne — "Historique insuffisant" affiché explicitement sinon, jamais un chiffre approximé silencieusement
- **Fusion manuelle nécessaire** : le fichier reçu de la session Tableau de bord repartait d'une copie antérieure à 09/09-c (correctif glisser-déposer, bulles d'aide) — les deux réintégrés en fusionnant leur nouveauté sur la bonne base plutôt que de régresser
- **Régression SQL évitée** (`dashboardPreferences.routes.js`) : la copie reçue ne contenait pas non plus le correctif du bug `42P08` déjà résolu — réappliqué avant déploiement

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
