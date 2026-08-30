# Demande — Inventaire des éléments paramétrables de `index.html`
**Rédigé le 27/08/2026, à l'attention de la session site public**

---

## Contexte

Roger souhaite qu'un panneau d'administration, accessible depuis `myspace.html`, permette aux administrateurs du site de modifier les éléments paramétrables de `index.html` sans passer par une session de développement à chaque fois (textes d'accueil, coordonnées, logos, listes d'agences, descriptions produits, etc.).

## Ce qu'on a pu observer de notre côté — à vérifier, potentiellement obsolète

Une version de `index.html` datée du 19/08/2026 nous a été transmise. Un scan rapide y montre :
- 240 clés `data-i18n` (textes traduits FR/EN)
- Un seul numéro de contact en dur (`+237697717334`, téléphone et WhatsApp)
- Aucune référence aux fichiers `public/js/agences.js`, `produits-5e.js`, `dictionnaire-langues.js` etc. mentionnés dans `CONFIGURATIONS_VERROUILLEES_27082026.md`

**Ce dernier point nous inquiète** : soit cette copie est antérieure au découpage en fichiers JS séparés que vous documentez, soit notre lecture a raté quelque chose. Dans les deux cas, on préfère vous poser la question plutôt que de construire un panneau d'administration sur une base potentiellement fausse.

## Ce dont on a besoin de votre part

1. **Confirmation** : la version actuelle de `index.html` en production référence-t-elle bien les 8 fichiers `public/js/*.js` documentés dans `CONFIGURATIONS_VERROUILLEES` ?
2. **Inventaire précis**, pour chaque élément réellement paramétrable côté site public :
   - Nom de l'élément (ex : "Liste des agences", "Description produit Auto")
   - Fichier(s) où il vit (`index.html` inline, `agences.js`, `produits-5e.js`...)
   - Format actuel (tableau JS en dur, JSON externe, autre)
   - Fréquence de modification attendue (rarement / souvent) — ça nous aide à prioriser
3. **Votre avis** : certains de ces éléments doivent-ils rester **hors de portée** d'un panneau d'administration côté `myspace.html` (par exemple s'ils touchent à des calculs de tarification sensibles, ou nécessitent une revalidation technique à chaque changement) ?

## Ce qu'on propose de construire, une fois l'inventaire reçu

Un espace dans `myspace.html` (Administration → Paramètres du site), avec la même mécanique déjà éprouvée cette nuit pour d'autres listes : édition en ligne, historique des modifications, sans toucher au code à chaque changement de texte.

**On ne commence rien tant que l'inventaire n'est pas confirmé** — pas de risque de construire un panneau sur des hypothèses fausses.

---

*Document produit par la session myspace.html, à l'attention de la session site public, transmis par Roger.*
