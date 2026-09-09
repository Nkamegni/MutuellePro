# Scénarios de test manuel — Tableau de bord
**Rédigés le 05/09/2026, pour clôturer la checklist §7 du cahier des charges Lot C**

---

## Préalable

- Avoir sous la main : 1 compte Client, 1 compte Personnel non-admin, 1 compte Personnel Administrateur (ou SuperAdmin), 1 compte Partenaire.
- Tester sur au moins 2 tailles d'écran : un smartphone réel (pas seulement un émulateur, pour la vibration) et un laptop/desktop.
- Avant de commencer : vérifier que les 2 migrations (`seuils_alerte_staff`, `snapshot_kpis_quotidien`) sont bien déployées, sinon certains points ci-dessous seront non applicables (dégradation silencieuse attendue, pas une erreur).

---

## A. Rôle Client

| # | Scénario | Résultat attendu |
|---|---|---|
| A1 | Connexion avec un compte Client ayant au moins 1 ticket | Atterrissage automatique sur `Tableau de bord`, jamais sur `Mon Profil` |
| A2 | Compte Client sans aucun ticket | Message d'orientation affiché ("Créer une demande →"), aucune carte à zéro affichée |
| A3 | Cartes du haut | 3 cartes : Total demandes / En cours / Résolues — largeur égale entre elles |
| A4 | Camembert + activité récente | Camembert affiche la répartition réelle ; liste des 5 dernières activités avec badge de statut coloré |
| A5 | Cartes verrouillées en bas | 2 cartes 🔒 visibles ("Mes véhicules & cartes vertes", "Mes échéances de renouvellement") — pas de raison colorée (spécifique Personnel/admin) |
| A6 | Infobulle desktop | Survol de chaque carte affiche une description cohérente |
| A7 | Infobulle smartphone | Effleurement d'une carte affiche la bulle après un court délai, avec vibration (Android) — pas de vibration attendue sur iPhone, c'est normal |

## B. Rôle Personnel — non-admin

| # | Scénario | Résultat attendu |
|---|---|---|
| B1 | Connexion Personnel non-admin | Atterrissage sur Tableau de bord ; sélecteur de modèle visible avec seulement **Support** et **Portefeuille** (bouton Commercial absent) |
| B2 | Modèle Support par défaut | 4 cartes (non assignés / en attente / en retard / temps moyen) + 2 cartes de flux (créés/résolus 7j) + camembert + courbe |
| B3 | Sélecteur de période | Cliquer Semaine/Mois/Trimestre/Année change les valeurs des cartes concernées, jamais leur nombre ni leur disposition |
| B4 | Période "Semaine" avec peu de tickets | Si aucun ticket créé sur la fenêtre, le camembert disparaît et la courbe occupe 100% de la largeur (pas de zone vide) |
| B5 | Cartes "à venir" | **Absentes** pour ce rôle (aucune carte 🔒, aucune section Sinistralité/Finance) |
| B6 | Bascule modèle Portefeuille | 2 cartes (Clients actifs / Partenaires actifs), camembert "Répartition du portefeuille", pas de courbe, pas de cartes à-venir |
| B7 | Aucun rechargement réseau au changement de modèle | Vérifier dans les outils réseau du navigateur qu'aucune requête `/api/staff/kpis` supplémentaire ne part en changeant de modèle |
| B8 | Configuration du seuil d'alerte | Dans "Mon Profil", modifier le seuil "tâches en retard", enregistrer, revenir au dashboard : la carte "Tâches en retard" reflète le nouveau seuil, avec le libellé `(seuil : +Nj)` |
| B9 | Export Excel | Cliquer "Exporter (Excel)" sur le modèle Support → téléchargement d'un fichier `.xlsx` avec au moins les feuilles Résumé et Tickets, aucune feuille Administration |
| B10 | Bouton Kanban/Commercial | Confirmer qu'aucun moyen (URL directe, inspection) ne permet à ce compte de voir le Kanban Prospects ou les cartes à-venir |

## C. Rôle Personnel — Administrateur / SuperAdmin

| # | Scénario | Résultat attendu |
|---|---|---|
| C1 | Sélecteur de modèle | 3 boutons visibles : Support, Portefeuille, **Commercial** |
| C2 | Modèle Support — cartes à-venir | 3 sections visibles : Sinistralité & Indemnisation (4 cartes rouges), Finance/Commissions/Performance (4 cartes rouges), Personnalisation avancée (2 cartes, 1 jaune "Disposition", 1 jaune "Export programmé") |
| C3 | Carte "Export automatisé programmé" | Toujours verrouillée (jaune), mais sa description mentionne l'export ponctuel disponible par ailleurs |
| C4 | Modèle Portefeuille — cartes à-venir | Section Rétention & Portefeuille, 4 cartes rouges |
| C5 | Modèle Commercial | 3 cartes chiffrées (Total prospects / En négociation / Taux de conversion proxy) + camembert pipeline + **Kanban Prospects** en position centrale + section à-venir Commercial & Conversion (4 cartes rouges) |
| C6 | Kanban — colonnes | 5 colonnes (Nouveau/Qualifié/Proposé/Gagné/Perdu), compteur exact par colonne, jusqu'à 6 cartes affichées puis lien "+N de plus →" vers la page Prospects complète |
| C7 | Alerte comptes sans boîte mail | Si au moins 1 compte staff/partenaire sans boîte pro : message dans `#dashboard-alertes` (en-tête), avec liens fonctionnels vers Personnel/Partenaires |
| C8 | Pas de duplication d'alerte | Cliquer successivement sur Semaine → Mois → Trimestre → Année → Tout : le message d'alerte reste affiché **une seule fois**, jamais dupliqué |
| C9 | Badges d'évolution (vs hier) | Si au moins 1 snapshot existe en base : badges ↑/↓ % visibles sur les cartes Tickets non assignés / Tâches en attente / Tâches en retard / Clients actifs / Partenaires actifs |
| C10 | Absence de snapshot | Si la table est vide (premier jour) : aucun badge, libellé sans "(vs hier)" — pas d'erreur affichée |
| C11 | Export Excel — feuille Administration | Le fichier `.xlsx` exporté contient une feuille "Administration" avec Tâches par responsable et Prospects par statut |
| C12 | Titre de l'en-tête | "Tableau" / "de bord" toujours sur 2 lignes, ancré en haut de la carte, même quand une alerte s'étire sur plusieurs lignes |
| C13 | Sélecteur de modèle dans l'en-tête | Toujours ancré à droite de la carte d'en-tête, distinct visuellement (onglets + icônes) du sélecteur de période resté dans le corps de page |

## D. Rôle Partenaire

| # | Scénario | Résultat attendu |
|---|---|---|
| D1 | Connexion avec au moins 1 dossier | 3 cartes (En attente / En cours / Clôturés), camembert, liste "Dossiers nécessitant une action" triée par date décroissante |
| D2 | Aucun dossier assigné | Message "Aucun dossier ne vous est actuellement assigné", pas de cartes à zéro |
| D3 | Cartes verrouillées | 2 cartes 🔒 (Commissions dues/versées, Volume d'affaires apportées) |

## E. Multi-rôles / transverse

| # | Scénario | Résultat attendu |
|---|---|---|
| E1 | Hauteur des graphiques (hors smartphone) | Camembert et courbe visuellement de même hauteur, jamais l'un 5x plus grand que l'autre |
| E2 | Titres des graphiques | "Répartition des tickets par statut" et "Évolution du nombre de création des tickets" visibles discrètement en haut de chaque graphique (Personnel uniquement) |
| E3 | Tooltip graphique au survol/effleurement | La valeur au point le plus proche s'affiche même sans viser exactement le point (mode "index") |
| E4 | Vibration tactile (Android uniquement) | Vibration courte à l'apparition de la bulle, vibration continue tant que le doigt reste posé, sur une carte ET sur un graphique |
| E5 | Cohérence visuelle des cartes | Dans une même ligne (2, 3 ou 4 cartes), toutes de largeur égale, jamais l'une étirée par rapport aux autres |

---

## Ce qu'il reste à valider après ces tests

Si tous les scénarios ci-dessus passent, la checklist §7 du cahier des charges Lot C peut être définitivement cochée. En cas d'anomalie, la reporter avec le numéro de scénario (ex. "C8 échoue : l'alerte se duplique encore") plutôt qu'une description libre — ça accélère le diagnostic, comme on l'a vérifié plusieurs fois dans cette session.
