# Réponse — structure d'authentification et cartographie
**Rédigée le 09/09/2026, par la session myspace.html, à l'attention de la session "Gestion des Stocks (Fournitures)"**

---

## Point de départ — précision de Roger

Votre demande visait "la session ayant construit l'authentification multi-rôles (19–22 août 2026)". Nous ne sommes probablement pas cette session d'origine — notre trace documentée commence début septembre. **Mais nous avons travaillé intensivement sur ce système d'authentification tout au long de la nuit dernière** (élimination de `nom_complet`, ajout de champs aux réponses de connexion, vérification ligne par ligne des 3 routes de connexion) — Roger confirme que nous pouvons répondre directement, plutôt que de vous renvoyer ailleurs sans rien apporter.

---

## 1. Structure complète actuelle des 3 tables (+ Prospects)

```
site.utilisateurs (Client) :
  id_utilisateur, nom (NOT NULL), prenom, email, telephone, mot_de_passe_hache,
  statut_compte, date_naissance, adresse, email_verifie, telephone_verifie,
  date_creation, date_derniere_connexion, matricule (CLI-XXXXXX)

site.staff (Personnel) :
  id_staff, matricule (MPA-XXXX), nom (NOT NULL), prenom, email, telephone,
  mot_de_passe_hache, mot_de_passe_defini, id_role (FK role_staff),
  id_utilisateur_lie (FK utilisateurs — voir §4), statut_compte,
  date_naissance, adresse, email_validation, imap_mot_de_passe_chiffre,
  est_compte_racine, suppression_reservee_racine, date_creation, date_derniere_connexion

site.partenaires (Fournisseurs) :
  id_partenaire, matricule (PART-XXXX), nom (NOT NULL), prenom, email, telephone,
  mot_de_passe_hache, mot_de_passe_defini, statut_compte, email_notification,
  imap_mot_de_passe_chiffre, date_creation, date_derniere_connexion

site.prospects :
  id_prospect, nom (NOT NULL), prenom, email, telephone, id_utilisateur (FK,
  si promu Client), id_staff_assigne (FK staff), id_ticket_origine (FK tickets),
  statut_opportunite, branche_interet, date_creation, date_maj
```

Les 4 tables ont été **entièrement reconstruites le 03-04/09/2026** — `nom` obligatoire partout, `prenom` facultatif, **aucune colonne `nom_complet` nulle part** (éliminée du schéma ET de tout le code applicatif qui la référençait). Si votre conception du pivot Personne prévoyait de s'appuyer sur `nom_complet`, il faudra l'ajuster — c'est `nom`/`prenom` séparés qui font foi désormais.

## 2. Cartographie des dépendances entrantes (FK)

```
→ site.utilisateurs :
    site.tickets.id_utilisateur
    site.prospects.id_utilisateur (si promu)
    site.staff.id_utilisateur_lie (voir §4)

→ site.staff :
    site.prospects.id_staff_assigne
    site.taches.id_staff_createur, id_staff_responsable
    site.interactions_prospect.id_staff
    site.activation_staff_tokens.id_staff
    site.seuils_alerte_staff.id_staff

→ site.partenaires :
    site.partenaire_types.id_partenaire
    site.partenaire_contacts.id_partenaire
    site.activation_partenaire_tokens.id_partenaire

Polymorphes (type_compte + id_compte, pas de vraie FK) :
    site.historique_connexions, site.tokens_reinitialisation_mdp,
    site.preferences_dashboard, site.codes_verification_connexion
```

**Angle mort de notre côté** : le module Messagerie/Helpdesk est construit par une session distincte, jamais entièrement partagé avec nous — nous ne pouvons pas garantir l'exhaustivité de cette liste sur ce point précis. Une proposition de schéma "Cube/Objectifs/Sinistres" est également en attente d'arbitrage de Roger (`site.sinistres.id_staff_gestionnaire` y figurerait, mais rien n'est construit à ce jour).

## 3. Mécanique du login et des sessions

**Aucune table de credentials intermédiaire** — chaque table (`utilisateurs`/`staff`/`partenaires`) porte directement son propre `mot_de_passe_hache`. **3 tables de session strictement séparées** :
```
site.session            — Client   (secret : SESSION_SECRET)
site.session_staff      — Personnel (secret : STAFF_SESSION_SECRET)
site.session_partenaire — Partenaire (secret : PARTENAIRE_SESSION_SECRET)
```
Chacune avec son propre préfixe de route (`/api`, `/api/staff`, `/api/partenaire`). Le rôle Personnel (`gestionnaire`/`administrateur`/`superadmin`) est déterminé par jointure avec `site.role_staff` au moment de la connexion, stocké dans `req.session.code_role`. **Important pour votre conception** : une réorganisation autour d'un pivot Personne devra composer avec ces 3 mécanismes de session **totalement indépendants** — ce n'est pas une seule authentification à généraliser, mais 3 systèmes parallèles à faire coexister avec le nouveau pivot.

## 4. Cas déjà rencontrés — un précédent réel, mais partiel

**`site.staff.id_utilisateur_lie`** existe déjà — un mécanisme de rattachement d'un compte Personnel à son propre compte Client, exactement le genre de cas que vous évoquez (un Employé qui est aussi Client). C'est un vrai précédent dans le schéma, pas une supposition de notre part.

**Nous n'avons en revanche aucune trace d'un cas Partenaire-qui-est-aussi-Client**, ni de comment ce genre de situation a été géré en pratique historiquement — c'est une question d'usage/d'historique que nous ne pouvons pas trancher avec certitude. Nous recommandons de vérifier ce point directement avec Roger plutôt que de supposer un comportement.

---

## Sur la note de gouvernance (§4 de votre demande)

Nous prenons note de la convention "branche dédiée + git worktree, consultation avant onboarding" — mais nous n'avons pas nous-mêmes de visibilité sur le dépôt Git ni sur la session qui le gère. Ce point reste à traiter directement avec Roger ou la session Git/GitHub.

---

*Nous restons disponibles si des questions de suivi se posent en avançant sur la conception du pivot Personne/Rôle.*
