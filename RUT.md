# RUT — Référentiel Unique de Tarification
**v3.0 — Automobile, écosystème complet de la Prime TTC — 03/10/2026**

Document source, humain, de référence unique. `areas/tarification.md` (mémoire technique auto-générée) reste un journal de travail ; le RUT est ce qui fait autorité au-dessus — y compris, à terme, matérialisable directement en base de données.

**Périmètre de cette v3.0** : Automobile uniquement. Hérite du RC ministériel (v1.0), de DR, IPT/IAC, des garanties facultatives (Dommages/Tierce, Vol, Incendie, Bris de glaces) et de `equivalence_garantie`/`offre_commerciale` (v2.0), et ajoute l'assemblage de la Prime TTC (accessoires, Fichier central, Carte rose, DTA, TVA, durées) ainsi que l'état des formules et directives de souscription (v3.0). Toujours au niveau des règles de tarification elles-mêmes, **pas** de la définition de l'application de gestion. Hors-automobile exclu, reporté à une v3.n séparée.

**Principe de lecture** : ce document est une photographie de la connaissance à la date indiquée. Toute affirmation qui n'est pas sourcée dans nos données est marquée « à confirmer ».

---

## Table des matières

- [⚠️ REGISTRE DES ANOMALIES — à consulter à chaque référence à ce document](#-registre-des-anomalies--à-consulter-à-chaque-référence-à-ce-document)
  - [Mécanisme de correction](#mécanisme-de-correction)
- [Pilier 1 — Fondations](#pilier-1--fondations)
  - [Acteurs](#acteurs)
  - [Texte réglementaire fondateur](#texte-réglementaire-fondateur)
- [Pilier 1-bis — Règles de gouvernance vivantes](#pilier-1-bis--règles-de-gouvernance-vivantes)
- [Pilier 2 — Moteur : le tarif RC ministériel](#pilier-2--moteur--le-tarif-rc-ministériel)
  - [2.1 — Mécanisme de lecture](#21--mécanisme-de-lecture)
  - [2.2 — Directives de souscription par Compagnie](#22--directives-de-souscription-par-compagnie)
  - [2.2bis — Lois structurelles découvertes (analyse du 03/10/2026)](#22bis--lois-structurelles-découvertes-analyse-du-03102026)
  - [2.3 — Barème RC complet (712 lignes, source officielle)](#23--barème-rc-complet-712-lignes-source-officielle)
- [Pilier 2 (v2.0) — Défense et Recours (DR)](#pilier-2-v20--défense-et-recours-dr)
  - [Mécanisme — formule unique, deux paramètres](#mécanisme--formule-unique-deux-paramètres)
  - [Barème complet, 20 compagnies + générique](#barème-complet-20-compagnies--générique)
- [Pilier 2 (v2.0) — IPT / IAC (Individuelle Personnes Transportées / Accidents Conducteur)](#pilier-2-v20--ipt--iac-individuelle-personnes-transportées--accidents-conducteur)
  - [Mécanisme](#mécanisme)
  - [IAC — barème complet (forfait, par compagnie et formule)](#iac--barème-complet-forfait-par-compagnie-et-formule)
  - [IPT — barème complet (par place, par compagnie et formule)](#ipt--barème-complet-par-place-par-compagnie-et-formule)
- [Pilier 2 (v2.0) — Dommages, Vol, Incendie, Bris de glaces](#pilier-2-v20--dommages-vol-incendie-bris-de-glaces)
  - [Mécanisme générique](#mécanisme-générique)
  - [Loi structurelle confirmée — Vol Partiel = Vol Braquage](#loi-structurelle-confirmée--vol-partiel--vol-braquage)
  - [Matrice de couverture — qui a des taux pour quelle garantie](#matrice-de-couverture--qui-a-des-taux-pour-quelle-garantie)
  - [Dommages par accident (fusionnée avec l'ex-Tierce Collision)](#dommages-par-accident-fusionnée-avec-lex-tierce-collision)
  - [Tierce collision (ex-Tierce, nom conservé)](#tierce-collision-ex-tierce-nom-conservé)
  - [Vol véhicule](#vol-véhicule)
  - [Vol partiel](#vol-partiel)
  - [Vol braquage](#vol-braquage)
  - [Vol des accessoires](#vol-des-accessoires)
  - [Brigandage](#brigandage)
  - [Incendie](#incendie)
  - [Bris de glaces](#bris-de-glaces)
  - [Bris de glaces et blocs feux (garantie distincte)](#bris-de-glaces-et-blocs-feux-garantie-distincte)
- [Pilier 2 (v2.0) — equivalence_garantie / offre_commerciale](#pilier-2-v20--equivalence_garantie--offre_commerciale)
  - [Le problème que cette architecture résout](#le-problème-que-cette-architecture-résout)
  - [equivalence_garantie — le dictionnaire des dénominations réelles](#equivalence_garantie--le-dictionnaire-des-dénominations-réelles)
  - [equivalence_garantie_sous_garantie — la composition des bouquets](#equivalence_garantie_sous_garantie--la-composition-des-bouquets)
  - [offre_commerciale — le catalogue qui porte le vrai nom](#offre_commerciale--le-catalogue-qui-porte-le-vrai-nom)
- [Pilier 2 (v3.0) — Composition de la Prime TTC et écosystème de souscription](#pilier-2-v30--composition-de-la-prime-ttc-et-écosystème-de-souscription)
  - [3.1 — Rubriques de la Prime TTC et formule d'assemblage](#31--rubriques-de-la-prime-ttc-et-formule-dassemblage)
  - [3.1bis — Durée du contrat et prime nette (coefficients de court terme)](#31bis--durée-du-contrat-et-prime-nette-coefficients-de-court-terme)
  - [3.2 — Accessoires (bareme_accessoire)](#32--accessoires-bareme_accessoire)
  - [3.3 — Fichier central (ASAC)](#33--fichier-central-asac)
  - [3.4 — Carte rose](#34--carte-rose)
  - [3.5 — DTA (Droit de Timbre Automobile)](#35--dta-droit-de-timbre-automobile)
  - [Barème DTA complet, véhicules (site.bareme_dta, source : site, historisée)](#barème-dta-complet-véhicules-sitebareme_dta-source--site-historisée)
  - [Barème DTA, motos/tricycles (site.bareme_dta)](#barème-dta-motostricycles-sitebareme_dta)
  - [3.6 — TVA et fiscalité](#36--tva-et-fiscalité)
  - [3.7 — Formules de souscription admises par compagnie](#37--formules-de-souscription-admises-par-compagnie)
  - [3.8 — Directives de souscription par compagnie](#38--directives-de-souscription-par-compagnie)
  - [Ce que cette section ne peut pas encore garantir](#ce-que-cette-section-ne-peut-pas-encore-garantir)
- [Pilier 3 — Mémoire : décisions et justifications](#pilier-3--mémoire--décisions-et-justifications)
- [Pilier 4 — Pilotage](#pilier-4--pilotage)
  - [Dettes identifiées sur ce périmètre](#dettes-identifiées-sur-ce-périmètre)
  - [Chantiers hors périmètre de cette v3.0 (RUT v3.n, périmètre étendu)](#chantiers-hors-périmètre-de-cette-v30-rut-v3n-périmètre-étendu)
  - [Système d'évaluation de la performance](#système-dévaluation-de-la-performance)
- [Historique des modifications](#historique-des-modifications)

---

## ⚠️ REGISTRE DES ANOMALIES — à consulter à chaque référence à ce document

Les anomalies ci-dessous sont celles connues à ce jour dans le barème RC ministériel et dans les données qui s'y rattachent ; leur statut (non résolu, piste identifiée, corrigé) figure dans la dernière colonne. Elles doivent être rappelées systématiquement dès que le RUT est utilisé pour répondre à une question de tarification touchant les cas ci-dessous.

**Réponse standard à produire si une requête tombe sur l'un de ces cas** :
> *"Anomalie dans la tarification en notre possession ; se rapprocher des services techniques pour obtenir le montant de la prime. Merci de votre compréhension."*

| # | Catégorie | Tranche/critère concerné | Nature de l'anomalie | Statut |
|---|---|---|---|---|
| 1 | 04A | 0-2 CV, nombre_places=2, Zones B/C | Écart ×9 par rapport à la loi de zone attendue (103 500 FCFA d'écart) | **Non résolu** — tarif à lecture directe AFRINS non comparable (structure différente à cette catégorie) |
| 2 | 03 | 7-10 CV, surprime matière inflammable, Zone B | Écart de 51% par rapport à la loi de zone attendue | **Cause racine identifiée (03/10/2026)** — `Tarif_automobile_automatisé.csv` (GMCSA) révèle que la surprime matière inflammable varie en réalité par **genre de véhicule** (Benne=20263, Camion=23414, Camion/DC+Remorque=22439 pour 11-14CV Zone B) — une dimension **absente de notre modèle actuel**, qui ne porte qu'une valeur unique par (catégorie, zone, force fiscale). Notre valeur stockée (22439) est juste, mais seulement pour un genre précis. **Correction requise : ajouter la dimension "genre de véhicule" au modèle**, pas une simple correction de valeur — chantier à part, non fait dans ce v1.0 |
| 3 | 03 | 11-14 CV, surprime matière inflammable, Zone B | Écart de 6% par rapport à la loi de zone attendue | **Même cause racine que #2** |
| 4 | 04B | 7-10 CV, 22 places | Écart de 12 000 FCFA par rapport à la progression linéaire confirmée (+9 133/place) — valeur attendue 386 514, valeur actuelle 398 514 | **Non résolu** — à vérifier au PDF source |
| 5 | IPT | ROYAL ONYX, formule 3 | Décès=1000 mais Incapacité Permanente=500 — rupture de parité avec les 5 autres formules de la même compagnie (où Décès=IPP systématiquement) | **Non résolu** — à vérifier auprès de la compagnie ou du document source |
| 6 | IPT | Frais Médicaux absents pour au moins une formule chez 13 compagnies (ACTIVA, AFG, AGC, AREA, AUCUNE, BELIFE, CHANAS, CPA, GMCSA, SAAR, SANLAM, SUNU, LDASA) | Case vide — soit une vraie absence de couverture à cette formule (variante "Sans FM"), soit un oubli de saisie | **Non résolu** — nature de l'absence à confirmer |
| 7 | IPT | ALLIANZ, toutes formules (Décès/IPP) | Doublon — même `tarif_id`, deux `bareme_tranche` distincts portant la même valeur pour chaque formule (10 lignes au lieu de 5 attendues) | **Corrigé le 03/10/2026** — audit exhaustif de `bareme_tranche` (12 doublons trouvés, exactement #7+#8, aucun autre cas) puis suppression des lignes redondantes |
| 8 | Vol | SUNU, Vol Braquage/Partiel | Doublon — vérifié sur toutes les colonnes (dates de validité, statut, critères, offre commerciale identiques) : seul `bareme_tranche.id` diffère | **Corrigé le 03/10/2026** — même nettoyage que #7 |
| 9 | Incendie | ROYAL ONYX, Cat.02 | Taux de 2,4%, alors que toutes les autres catégories (ROYAL ONYX et le reste du marché) se situent entre 0,18% et 0,5% — exactement 10× la valeur PROASSUR à la même catégorie (0,24%) | **Non résolu** — ressemble fortement à une virgule décalée, à vérifier auprès de la compagnie |
| 10 | DTA | `site.bareme_dta`, lignes "par catégorie, 2023" | Redondance — valeurs reprises d'un tarif à lecture directe (AFRINS) sans vérifier si elles différaient du barème général ministériel ; interprétées à tort comme un changement réglementaire réel dans une version antérieure de ce document | **Confirmé par Roger, non corrigé dans cette session** — `bareme_dta` sera purgée par son équipe propriétaire ; cette session ne fait que cartographier |
| 11 | Accessoires | AFRINS, Zones B et C, Cat.1, 365 jours, tranches 15-23 CV et 24 CV et + | 4 lignes à 3 150 FCFA alors que les 500 autres lignes du document (dont les mêmes tranches en Zone A) sont à 2 500 FCFA. Aucun seuil de prime ne l'explique (nombreuses lignes à 2 500 avec une prime nette supérieure). TVA et TTC restent cohérents avec ces 3 150. | **Non résolu** — coquille du document AFRINS ou règle propre aux zones B/C, à confirmer |
| 12 | IPT | AFRINS, absent de la base | Le tarif à lecture directe AFRINS prévoit une IPT forfaitaire (7 500 FCFA en Cat.1 et 2 ; 5 000 FCFA en Cat.3 et 5A) mais AFRINS n'a aucune ligne IPT/IAC en base (17 compagnies seulement) | **Lacune constatée, non corrigée** — cette phase cartographie sans modifier le système |

**Anomalies mineures, probable simple arrondi du document source** (écart <5%, mentionnées pour complétude, pas nécessairement bloquantes) :
- Cat.06, nombre_cartes=5/TARIF_2_3, Zone B non réduite par rapport à Zone A (écart Zone C seul : 4,35%)
- Cat.07SRC, 11-14CV, double commande/CAT_1, Zones B/C (écart 2,07%)

### Mécanisme de correction
Quand une anomalie est résolue (retour au PDF ministériel original, ou toute autre source faisant autorité), la ligne correspondante de ce registre passe de "Non résolu" à "Corrigé le JJ/MM/AAAA — source : [référence]", et la valeur corrigée est mise à jour dans le barème (Pilier 2.3) et consignée au chapitre Historique en bas de document — jamais supprimée silencieusement.

---

## Pilier 1 — Fondations

### Acteurs
- **CIMA / Zone CEMAC** — autorité réglementaire de référence pour le tarif RC ministériel.
- **MINEFI (Ministère des Finances, Cameroun)** — autorité d'application locale.
- **19 compagnies actives au marché** : ACTIVA, AFG (ex-ATLANTIQUE), AFRINS, AGC, ALLIANZ, AREA, AXA, BELIFE (ex-BENEFICIAL), CHANAS, CPA, GMCSA, LDASA, NSIA, PROASSUR, ROYAL ONYX, SAAR, SANLAM, SUNU, ZENITHE (code réaffecté, ex-SOCAR). **Niveau générique** : AUCUNE (POOL, `id_compagnie=0`) — ce n'est pas une compagnie. **Non active** : ALPHA (liquidation judiciaire terminée). **SAMIRIS** (code réaffecté à l'ancien code ALPHA le 02/10/2026) figure en base, mais son statut d'activité n'a pas été confirmé — **à confirmer**.

### Texte réglementaire fondateur
Tarif ministériel RC automobile — barème CIMA/Zone CEMAC par catégorie, zone, force fiscale (Essence/Diesel distincts), cylindrée (2-3 roues). Source brute : document PDF ministériel, triangulé avec le fichier GMCSA (8 écarts trouvés, 8 fois la lecture confirmée correcte).

---

## Pilier 1-bis — Règles de gouvernance vivantes

Checklist obligatoire avant toute création de table, colonne ou fonction. Née de violations réelles commises puis corrigées — pas des principes abstraits.

1. **`id_nomchamp`, jamais `nomchamp_id`.** Vaut aussi pour les colonnes de sortie des fonctions et les variables internes (`v_id_xxx`), pas seulement les tables.
2. **Pas de pluriel sur les noms de table.** `tarif`, pas `tarifs`.
3. **`code` lisible généré par trigger, jamais saisi à la main.**
4. **Jamais de `DELETE` sur une règle active — `actif=false` + date de fin.**
5. **Avant toute suppression ou renommage touchant une table : audit exhaustif des dépendances via `information_schema`, jamais une liste de mémoire.**
6. **Avant tout renommage de table/colonne : audit exhaustif de `pg_proc.prosrc` pour toute fonction qui la référence, puis re-audit après.**
7. **Un tarif se rattache toujours à la sous-garantie, jamais à la garantie parente.**
8. **La compagnie ne vit que dans la colonne compagnie dédiée — jamais dans un code canonique de garantie.**
9. **Toute donnée issue d'un import externe est vérifiée avant d'être insérée — jamais propagée telle quelle si elle semble incohérente.**
10. **Une valeur issue d'un tarif à lecture directe (ex: AFRINS) ne crée un nouvel enregistrement que si elle contredit la source générale (ex: barème ministériel).** Si elle correspond, c'est une simple relecture compagnie par compagnie, sans valeur distinctive — l'insérer comme donnée séparée crée une redondance prise plus tard pour un vrai changement réglementaire (incident fondateur : interprétation erronée d'une "évolution 2023" du DTA, corrigée par Roger le 03/10/2026).
11. **Toute affirmation qui n'est pas sourcée dans nos données est marquée « à confirmer ».** Une hypothèse plausible n'est pas un fait : elle ne s'écrit jamais au présent de l'indicatif sans source (incident fondateur : la nature fiscale du DTA et la définition de la Carte rose, écrites comme des faits dans une version antérieure alors qu'aucune de nos données ne les établit).

---

## Pilier 2 — Moteur : le tarif RC ministériel

### 2.1 — Mécanisme de lecture

**Étape 1 — Catégorisation du véhicule (genre → catégorie CIMA)**

| Catégorie | Libellé officiel |
|---|---|
| 01 | Véhicules de tourisme (promenade/profession) |
| 02 | Marchandises de l'assuré |
| 03 | Marchandises de tiers |
| 04 (A/B/C) | Transport de personnes (payant/gratuit) |
| 05 / 05bis | Véhicules à 2/3 roues |
| 06 | Garage / Remorquage / Essai |
| 07 (ARC/SRC) | Auto-école |
| 08 | Location |
| 09 (A/B) | Engins |
| 10 (A/B/C) | Ambulance / Voirie / Agricole |

*Sous-catégories A/B/C et variantes (ARC/SRC, bis) non détaillées dans la table `categorie` elle-même — présentes uniquement dans la structure du barème (Pilier 2.3). À documenter plus précisément si cette distinction a sa propre règle écrite quelque part.*

**Étape 2 — Résolution de la ligne de barème**, par (catégorie, zone, force fiscale **ou** cylindrée, énergie Essence/Diesel). Critères additionnels selon la catégorie : remorque (01-04, 08-09), matière inflammable (02-03), nombre de places (04A/B), nombre de cartes/rang véhicule (06), double commande/RC élèves/type véhicule (07), tonnage (08).

```
prime_RC = bareme[categorie, zone, force_fiscale|cylindree, energie, ...criteres_additionnels]
```

Pas de formule arithmétique — lecture directe dans le barème officiel, tableau par tableau, exactement comme le document ministériel lui-même le présente.

**Correspondance cylindrée ↔ force fiscale (2-3 roues, catégorie 05/05bis)**, confirmée par le tarif à lecture directe AFRINS : 51-125cm³=1CV, 126-175cm³=2CV, 176-250cm³=3CV, 251-350cm³=4CV, 352-500cm³=5CV, 501-625cm³=6CV.

### 2.2 — Directives de souscription par Compagnie

*Non renseigné à ce stade.* Si des directives existent (zones couvertes, catégories refusées, pièces exigées par compagnie), elles n'ont pas été fournies à cette session — à compléter plutôt que supposées vides par défaut.

### 2.2bis — Lois structurelles découvertes (analyse du 03/10/2026)

Vérification exhaustive, valeur par valeur, sur les 17 catégories (535 tests) :

```
prime_zone_B = prime_zone_A × 23/24   (527/535 tests conformes, tolérance 0,5%)
prime_zone_C = prime_zone_A × 11/12
```
S'applique à **toute** colonne de prix (base, avec remorque, surprime matière inflammable) — vérifié, pas supposé. Les 8 écarts réels sont consignés au Registre des anomalies ci-dessus.

```
prime_avec_remorque = prime_sans_remorque × coefficient_remorque_categorie
```
Coefficient **constant et sans exception** par catégorie (144/144 tests conformes, bruit d'arrondi écarté) : 01=1,1 ; 02/05/05bis/09B=1,2 ; 03/09A=1,3.

**Conséquence architecturale** : le barème pourrait être stocké à Zone A seule (environ 1/3 du volume actuel) + 2 coefficients de zone universels + un coefficient de remorque par catégorie, plutôt que de répéter les valeurs dérivées ligne par ligne. Non encore implémenté — décision à prendre séparément.

**Catégorie 04B (transport de personnes, grande capacité), nombre de places — deux régimes linéaires distincts, vérifiés exhaustivement sur les 4 tranches de force fiscale** :
```
prime(places) = prime(20) + (places − 20) × 9 133        pour 20 ≤ places ≤ 30
prime(places) = prime(30) + (places − 30) × 6 576        pour 31 ≤ places ≤ 40
prime(30) − [prime(31) extrapolée depuis le régime bas]  = −25 572 FCFA (rupture de palier constante, confirmée sur les 4 tranches)
prime(9) = prime(20) − 3 634 FCFA (3 tranches sur 4 ; 1 écart mineur sur la 4ᵉ)
```
Une anomalie isolée (#4 au registre) rompt ce motif à la tranche 7-10CV/22 places.

**Catégorie 04A (taxi de ville), nombre de places — incrément linéaire par tranche CV entre 4 et 7 places**, pente propre à chaque tranche de force fiscale (non universelle). Le passage de 3→4 places vaut environ le double de l'incrément normal (motif régulier, observé sur toutes les tranches/zones — pas une anomalie). La 8ᵉ place suit le même incrément partout, sauf à la tranche 24CV+ où un écart systématique d'environ 0,36%, identique sur les 3 zones, suggère une règle distincte à cette tranche précise plutôt qu'une erreur.

**Catégorie 08 (location), coefficient de tonnage — dépend de la tranche de force fiscale (pas universel comme la remorque), mais constant entre zones A/B/C** pour une même tranche. Varie de ×1,12 à ×1,31 (Moins de 3,5T) et de ×1,79 à ×2,13 (Plus de 3,5T) selon la puissance.

**Tranches de force fiscale/cylindrée : pas de loi exploitable.** Analyse des largeurs et ratios entre bornes successives — une inspiration approximative à ~1,4× (proche de √2) apparaît sur plusieurs transitions de cylindrée et sur le ratio Essence/Diesel à bracket équivalent, mais avec des exceptions franches (tranche 51-125cm³, ratio 2,55 ; tranche 501-625cm³, ratio 1,25 ; largeurs CV irrégulières : 4/4/4 puis 9). **Les tranches doivent rester une table explicite**, non calculable par une règle — tentative de compression testée et écartée, pas simplement non essayée.

### 2.3 — Barème RC complet (712 lignes, source officielle)


#### Catégorie 01 (18 lignes)

| Zone | Force fiscale / Cylindrée | Autres critères | Prime(s) (FCFA) | Page |
|---|---|---|---|---|
| A | 0-2 CV |  | Sans remorque **52 499** / Avec remorque **57 748** | 25 |
| A | 3-6 CV |  | Sans remorque **63 784** / Avec remorque **70 162** | 25 |
| A | 7-10 CV |  | Sans remorque **70 877** / Avec remorque **77 964** | 25 |
| A | 11-14 CV |  | Sans remorque **92 497** / Avec remorque **101 747** | 25 |
| A | 15-23 CV |  | Sans remorque **117 764** / Avec remorque **129 541** | 25 |
| A | 24-+ CV |  | Sans remorque **138 863** / Avec remorque **152 749** | 25 |
| B | 0-2 CV |  | Sans remorque **50 311** / Avec remorque **55 341** | 25 |
| B | 3-6 CV |  | Sans remorque **61 126** / Avec remorque **67 238** | 25 |
| B | 7-10 CV |  | Sans remorque **67 924** / Avec remorque **74 716** | 25 |
| B | 11-14 CV |  | Sans remorque **88 643** / Avec remorque **97 507** | 25 |
| B | 15-23 CV |  | Sans remorque **112 858** / Avec remorque **124 144** | 25 |
| B | 24-+ CV |  | Sans remorque **133 077** / Avec remorque **146 385** | 25 |
| C | 0-2 CV |  | Sans remorque **48 124** / Avec remorque **52 935** | 26 |
| C | 3-6 CV |  | Sans remorque **58 468** / Avec remorque **64 315** | 26 |
| C | 7-10 CV |  | Sans remorque **64 970** / Avec remorque **71 467** | 26 |
| C | 11-14 CV |  | Sans remorque **84 789** / Avec remorque **93 268** | 26 |
| C | 15-23 CV |  | Sans remorque **107 951** / Avec remorque **118 746** | 26 |
| C | 24-+ CV |  | Sans remorque **127 291** / Avec remorque **140 020** | 26 |

#### Catégorie 02 (18 lignes)

| Zone | Force fiscale / Cylindrée | Autres critères | Prime(s) (FCFA) | Page |
|---|---|---|---|---|
| A | 0-2 CV |  | Sans remorque **58 759** / Avec remorque **70 504** / (+13 213 si matière inflammable) | 27 |
| A | 3-6 CV |  | Sans remorque **71 183** / Avec remorque **85 420** / (+13 213 si matière inflammable) | 27 |
| A | 7-10 CV |  | Sans remorque **80 918** / Avec remorque **97 102** / (+13 213 si matière inflammable) | 27 |
| A | 11-14 CV |  | Sans remorque **121 212** / Avec remorque **145 454** / (+21 144 si matière inflammable) | 27 |
| A | 15-23 CV |  | Sans remorque **150 086** / Avec remorque **180 103** / (+21 144 si matière inflammable) | 27 |
| A | 24-+ CV |  | Sans remorque **173 591** / Avec remorque **208 309** / (+21 144 si matière inflammable) | 27 |
| B | 0-2 CV |  | Sans remorque **56 311** / Avec remorque **67 566** / (+12 663 si matière inflammable) | 27 |
| B | 3-6 CV |  | Sans remorque **68 217** / Avec remorque **81 860** / (+12 663 si matière inflammable) | 27 |
| B | 7-10 CV |  | Sans remorque **77 547** / Avec remorque **93 056** / (+12 663 si matière inflammable) | 27 |
| B | 11-14 CV |  | Sans remorque **116 162** / Avec remorque **139 394** / (+20 263 si matière inflammable) | 27 |
| B | 15-23 CV |  | Sans remorque **143 833** / Avec remorque **172 599** / (+20 263 si matière inflammable) | 27 |
| B | 24-+ CV |  | Sans remorque **166 358** / Avec remorque **199 630** / (+20 263 si matière inflammable) | 27 |
| C | 0-2 CV |  | Sans remorque **53 863** / Avec remorque **64 628** / (+12 112 si matière inflammable) | 27 |
| C | 3-6 CV |  | Sans remorque **65 251** / Avec remorque **78 301** / (+12 112 si matière inflammable) | 27 |
| C | 7-10 CV |  | Sans remorque **74 175** / Avec remorque **89 010** / (+12 112 si matière inflammable) | 27 |
| C | 11-14 CV |  | Sans remorque **111 111** / Avec remorque **133 333** / (+19 382 si matière inflammable) | 27 |
| C | 15-23 CV |  | Sans remorque **137 579** / Avec remorque **165 095** / (+19 382 si matière inflammable) | 27 |
| C | 24-+ CV |  | Sans remorque **159 125** / Avec remorque **190 950** / (+19 382 si matière inflammable) | 27 |

#### Catégorie 03 (18 lignes)

| Zone | Force fiscale / Cylindrée | Autres critères | Prime(s) (FCFA) | Page |
|---|---|---|---|---|
| A | 0-2 CV |  | Sans remorque **94 044** / Avec remorque **122 257** / (+15 511 si matière inflammable) | 28 |
| A | 3-6 CV |  | Sans remorque **116 045** / Avec remorque **150 858** / (+15 511 si matière inflammable) | 28 |
| A | 7-10 CV |  | Sans remorque **132 900** / Avec remorque **172 771** / (+15 511 si matière inflammable) | 28 |
| A | 11-14 CV |  | Sans remorque **196 282** / Avec remorque **255 167** / (+23 414 si matière inflammable) | 28 |
| A | 15-23 CV |  | Sans remorque **250 210** / Avec remorque **325 272** / (+24 818 si matière inflammable) | 28 |
| A | 24-+ CV |  | Sans remorque **290 326** / Avec remorque **377 426** / (+24 818 si matière inflammable) | 28 |
| B | 0-2 CV |  | Sans remorque **90 126** / Avec remorque **117 163** / (+14 865 si matière inflammable) | 28 |
| B | 3-6 CV |  | Sans remorque **111 210** / Avec remorque **144 572** / (+14 865 si matière inflammable) | 28 |
| B | 7-10 CV |  | Sans remorque **127 363** / Avec remorque **165 572** / (+22 439 si matière inflammable) | 28 |
| B | 11-14 CV |  | Sans remorque **188 103** / Avec remorque **244 535** / (+23 784 si matière inflammable) | 28 |
| B | 15-23 CV |  | Sans remorque **239 794** / Avec remorque **311 719** / (+23 784 si matière inflammable) | 28 |
| B | 24-+ CV |  | Sans remorque **278 229** / Avec remorque **361 700** | 28 |
| C | 0-2 CV |  | Sans remorque **86 207** / Avec remorque **112 069** / (+14 219 si matière inflammable) | 28 |
| C | 3-6 CV |  | Sans remorque **106 374** / Avec remorque **138 287** / (+14 219 si matière inflammable) | 28 |
| C | 7-10 CV |  | Sans remorque **121 825** / Avec remorque **158 374** / (+14 219 si matière inflammable) | 28 |
| C | 11-14 CV |  | Sans remorque **179 925** / Avec remorque **233 903** / (+21 463 si matière inflammable) | 28 |
| C | 15-23 CV |  | Sans remorque **229 359** / Avec remorque **298 166** / (+22 750 si matière inflammable) | 28 |
| C | 24-+ CV |  | Sans remorque **266 132** / Avec remorque **345 974** / (+22 750 si matière inflammable) | 28 |

#### Catégorie 04A (90 lignes)

| Zone | Force fiscale / Cylindrée | Autres critères | Prime(s) (FCFA) | Page |
|---|---|---|---|---|
| A | 0-2 CV | nombre_places=2 | **11 953** | 29 |
| A | 0-2 CV | nombre_places=4 | **159 938** | 29 |
| A | 3-6 CV | nombre_places=6 | **250 333** | 29 |
| A | 3-6 CV | nombre_places=3 | **136 614** | 29 |
| A | 3-6 CV | nombre_places=4 | **193 808** | 29 |
| A | 3-6 CV | nombre_places=5 | **222 070** | 29 |
| A | 3-6 CV | nombre_places=7 | **278 596** | 29 |
| A | 3-6 CV | nombre_places=8 | **306 859** | 29 |
| A | 7-10 CV | nombre_places=3 | **165 545** | 29 |
| A | 7-10 CV | nombre_places=4 | **215 897** | 29 |
| A | 7-10 CV | nombre_places=5 | **247 382** | 29 |
| A | 7-10 CV | nombre_places=6 | **278 867** | 29 |
| A | 7-10 CV | nombre_places=7 | **310 351** | 29 |
| A | 7-10 CV | nombre_places=8 | **341 838** | 29 |
| A | 11-14 CV | nombre_places=8 | **446 130** | 29 |
| A | 11-14 CV | nombre_places=7 | **405 038** | 29 |
| A | 11-14 CV | nombre_places=6 | **363 944** | 29 |
| A | 11-14 CV | nombre_places=5 | **322 856** | 29 |
| A | 11-14 CV | nombre_places=4 | **281 766** | 29 |
| A | 11-14 CV | nombre_places=3 | **184 411** | 29 |
| A | 15-23 CV | nombre_places=7 | **539 779** | 29 |
| A | 15-23 CV | nombre_places=6 | **485 018** | 29 |
| A | 15-23 CV | nombre_places=4 | **375 498** | 29 |
| A | 15-23 CV | nombre_places=5 | **430 038** | 29 |
| A | 15-23 CV | nombre_places=8 | **594 532** | 29 |
| A | 24-+ CV | nombre_places=6 | **546 356** | 29 |
| A | 24-+ CV | nombre_places=8 | **667 327** | 29 |
| A | 24-+ CV | nombre_places=7 | **608 041** | 29 |
| A | 24-+ CV | nombre_places=5 | **484 670** | 29 |
| A | 24-+ CV | nombre_places=4 | **422 989** | 29 |
| B | 0-2 CV | nombre_places=2 | **114 955** | 29 |
| B | 0-2 CV | nombre_places=4 | **153 274** | 29 |
| B | 3-6 CV | nombre_places=7 | **266 987** | 29 |
| B | 3-6 CV | nombre_places=5 | **212 817** | 29 |
| B | 3-6 CV | nombre_places=4 | **185 733** | 29 |
| B | 3-6 CV | nombre_places=3 | **130 922** | 29 |
| B | 3-6 CV | nombre_places=8 | **294 073** | 29 |
| B | 3-6 CV | nombre_places=6 | **239 903** | 29 |
| B | 7-10 CV | nombre_places=7 | **297 420** | 29 |
| B | 7-10 CV | nombre_places=3 | **158 647** | 29 |
| B | 7-10 CV | nombre_places=4 | **206 901** | 29 |
| B | 7-10 CV | nombre_places=8 | **327 595** | 29 |
| B | 7-10 CV | nombre_places=5 | **237 075** | 29 |
| B | 7-10 CV | nombre_places=6 | **267 247** | 29 |
| B | 11-14 CV | nombre_places=6 | **348 780** | 29 |
| B | 11-14 CV | nombre_places=8 | **427 541** | 29 |
| B | 11-14 CV | nombre_places=4 | **270 026** | 29 |
| B | 11-14 CV | nombre_places=3 | **176 647** | 29 |
| B | 11-14 CV | nombre_places=5 | **309 404** | 29 |
| B | 11-14 CV | nombre_places=7 | **388 162** | 29 |
| B | 15-23 CV | nombre_places=6 | **464 809** | 29 |
| B | 15-23 CV | nombre_places=5 | **412 446** | 29 |
| B | 15-23 CV | nombre_places=4 | **359 852** | 29 |
| B | 15-23 CV | nombre_places=7 | **517 288** | 29 |
| B | 15-23 CV | nombre_places=8 | **569 759** | 29 |
| B | 24-+ CV | nombre_places=8 | **639 522** | 29 |
| B | 24-+ CV | nombre_places=4 | **405 365** | 29 |
| B | 24-+ CV | nombre_places=5 | **464 476** | 29 |
| B | 24-+ CV | nombre_places=6 | **523 592** | 29 |
| B | 24-+ CV | nombre_places=7 | **582 706** | 29 |
| C | 0-2 CV | nombre_places=4 | **146 610** | 30 |
| C | 0-2 CV | nombre_places=2 | **109 957** | 30 |
| C | 3-6 CV | nombre_places=5 | **203 564** | 30 |
| C | 3-6 CV | nombre_places=3 | **125 230** | 30 |
| C | 3-6 CV | nombre_places=4 | **177 658** | 30 |
| C | 3-6 CV | nombre_places=8 | **281 288** | 30 |
| C | 3-6 CV | nombre_places=7 | **255 379** | 30 |
| C | 3-6 CV | nombre_places=6 | **229 472** | 30 |
| C | 7-10 CV | nombre_places=8 | **313 352** | 30 |
| C | 7-10 CV | nombre_places=6 | **255 628** | 30 |
| C | 7-10 CV | nombre_places=7 | **284 489** | 30 |
| C | 7-10 CV | nombre_places=5 | **226 767** | 30 |
| C | 7-10 CV | nombre_places=4 | **197 905** | 30 |
| C | 7-10 CV | nombre_places=3 | **151 749** | 30 |
| C | 11-14 CV | nombre_places=4 | **258 286** | 30 |
| C | 11-14 CV | nombre_places=3 | **169 044** | 30 |
| C | 11-14 CV | nombre_places=5 | **295 952** | 30 |
| C | 11-14 CV | nombre_places=6 | **333 616** | 30 |
| C | 11-14 CV | nombre_places=7 | **371 285** | 30 |
| C | 11-14 CV | nombre_places=8 | **408 953** | 30 |
| C | 15-23 CV | nombre_places=4 | **344 207** | 30 |
| C | 15-23 CV | nombre_places=5 | **394 514** | 30 |
| C | 15-23 CV | nombre_places=6 | **444 600** | 30 |
| C | 15-23 CV | nombre_places=7 | **494 798** | 30 |
| C | 15-23 CV | nombre_places=8 | **544 987** | 30 |
| C | 24-+ CV | nombre_places=8 | **611 717** | 30 |
| C | 24-+ CV | nombre_places=7 | **557 371** | 30 |
| C | 24-+ CV | nombre_places=6 | **500 827** | 30 |
| C | 24-+ CV | nombre_places=5 | **444 281** | 30 |
| C | 24-+ CV | nombre_places=4 | **387 740** | 30 |

#### Catégorie 04B (88 lignes)

| Zone | Force fiscale / Cylindrée | Autres critères | Prime(s) (FCFA) | Page |
|---|---|---|---|---|
| — | 7-10 CV | nombre_places=25 | **413 914** | 31 |
| — | 7-10 CV | nombre_places=40 | **525 340** | 31 |
| — | 7-10 CV | nombre_places=39 | **518 764** | 31 |
| — | 7-10 CV | nombre_places=38 | **512 188** | 31 |
| — | 7-10 CV | nombre_places=37 | **505 612** | 31 |
| — | 7-10 CV | nombre_places=36 | **499 036** | 31 |
| — | 7-10 CV | nombre_places=35 | **492 460** | 31 |
| — | 7-10 CV | nombre_places=34 | **485 884** | 31 |
| — | 7-10 CV | nombre_places=33 | **479 308** | 31 |
| — | 7-10 CV | nombre_places=32 | **472 732** | 31 |
| — | 7-10 CV | nombre_places=31 | **466 156** | 31 |
| — | 7-10 CV | nombre_places=30 | **459 580** | 31 |
| — | 7-10 CV | nombre_places=29 | **450 446** | 31 |
| — | 7-10 CV | nombre_places=28 | **441 313** | 31 |
| — | 7-10 CV | nombre_places=27 | **432 180** | 31 |
| — | 7-10 CV | nombre_places=26 | **423 047** | 31 |
| — | 7-10 CV | nombre_places=9 | **364 614** | 31 |
| — | 7-10 CV | nombre_places=20 | **368 248** | 31 |
| — | 7-10 CV | nombre_places=21 | **377 381** | 31 |
| — | 7-10 CV | nombre_places=22 | **398 514** | 31 |
| — | 7-10 CV | nombre_places=23 | **395 646** | 31 |
| — | 7-10 CV | nombre_places=24 | **404 780** | 31 |
| — | 11-14 CV | nombre_places=35 | **581 177** | 31 |
| — | 11-14 CV | nombre_places=40 | **614 057** | 31 |
| — | 11-14 CV | nombre_places=39 | **607 481** | 31 |
| — | 11-14 CV | nombre_places=38 | **600 905** | 31 |
| — | 11-14 CV | nombre_places=37 | **594 329** | 31 |
| — | 11-14 CV | nombre_places=36 | **587 753** | 31 |
| — | 11-14 CV | nombre_places=34 | **574 601** | 31 |
| — | 11-14 CV | nombre_places=33 | **568 025** | 31 |
| — | 11-14 CV | nombre_places=32 | **561 449** | 31 |
| — | 11-14 CV | nombre_places=31 | **554 873** | 31 |
| — | 11-14 CV | nombre_places=30 | **548 297** | 31 |
| — | 11-14 CV | nombre_places=29 | **539 164** | 31 |
| — | 11-14 CV | nombre_places=28 | **530 030** | 31 |
| — | 11-14 CV | nombre_places=27 | **520 896** | 31 |
| — | 11-14 CV | nombre_places=26 | **511 764** | 31 |
| — | 11-14 CV | nombre_places=25 | **502 631** | 31 |
| — | 11-14 CV | nombre_places=9 | **453 331** | 31 |
| — | 11-14 CV | nombre_places=20 | **457 085** | 31 |
| — | 11-14 CV | nombre_places=21 | **466 098** | 31 |
| — | 11-14 CV | nombre_places=22 | **475 231** | 31 |
| — | 11-14 CV | nombre_places=23 | **484 364** | 31 |
| — | 11-14 CV | nombre_places=24 | **493 498** | 31 |
| — | 15-23 CV | nombre_places=28 | **605 389** | 31 |
| — | 15-23 CV | nombre_places=22 | **550 590** | 31 |
| — | 15-23 CV | nombre_places=21 | **541 457** | 31 |
| — | 15-23 CV | nombre_places=20 | **532 324** | 31 |
| — | 15-23 CV | nombre_places=9 | **528 690** | 31 |
| — | 15-23 CV | nombre_places=27 | **596 256** | 31 |
| — | 15-23 CV | nombre_places=26 | **587 123** | 31 |
| — | 15-23 CV | nombre_places=25 | **577 990** | 31 |
| — | 15-23 CV | nombre_places=24 | **568 856** | 31 |
| — | 15-23 CV | nombre_places=40 | **689 416** | 31 |
| — | 15-23 CV | nombre_places=23 | **559 723** | 31 |
| — | 15-23 CV | nombre_places=39 | **682 840** | 31 |
| — | 15-23 CV | nombre_places=38 | **676 284** | 31 |
| — | 15-23 CV | nombre_places=37 | **669 688** | 31 |
| — | 15-23 CV | nombre_places=36 | **663 112** | 31 |
| — | 15-23 CV | nombre_places=35 | **656 536** | 31 |
| — | 15-23 CV | nombre_places=34 | **649 960** | 31 |
| — | 15-23 CV | nombre_places=33 | **643 384** | 31 |
| — | 15-23 CV | nombre_places=32 | **636 804** | 31 |
| — | 15-23 CV | nombre_places=31 | **630 232** | 31 |
| — | 15-23 CV | nombre_places=30 | **623 656** | 31 |
| — | 15-23 CV | nombre_places=29 | **614 522** | 31 |
| — | 24-+ CV | nombre_places=40 | **745 474** | 31 |
| — | 24-+ CV | nombre_places=38 | **732 322** | 31 |
| — | 24-+ CV | nombre_places=37 | **725 746** | 31 |
| — | 24-+ CV | nombre_places=36 | **719 170** | 31 |
| — | 24-+ CV | nombre_places=35 | **712 594** | 31 |
| — | 24-+ CV | nombre_places=34 | **706 018** | 31 |
| — | 24-+ CV | nombre_places=33 | **699 442** | 31 |
| — | 24-+ CV | nombre_places=32 | **692 866** | 31 |
| — | 24-+ CV | nombre_places=31 | **686 290** | 31 |
| — | 24-+ CV | nombre_places=30 | **679 714** | 31 |
| — | 24-+ CV | nombre_places=29 | **670 580** | 31 |
| — | 24-+ CV | nombre_places=28 | **661 447** | 31 |
| — | 24-+ CV | nombre_places=27 | **652 314** | 31 |
| — | 24-+ CV | nombre_places=26 | **643 181** | 31 |
| — | 24-+ CV | nombre_places=25 | **634 048** | 31 |
| — | 24-+ CV | nombre_places=24 | **624 914** | 31 |
| — | 24-+ CV | nombre_places=23 | **615 781** | 31 |
| — | 24-+ CV | nombre_places=22 | **606 648** | 31 |
| — | 24-+ CV | nombre_places=21 | **597 515** | 31 |
| — | 24-+ CV | nombre_places=20 | **588 382** | 31 |
| — | 24-+ CV | nombre_places=9 | **584 748** | 31 |
| — | 24-+ CV | nombre_places=39 | **738 898** | 31 |

#### Catégorie 04C (18 lignes)

| Zone | Force fiscale / Cylindrée | Autres critères | Prime(s) (FCFA) | Page |
|---|---|---|---|---|
| A | 0-2 CV |  | **112 321** | 32 |
| A | 3-6 CV |  | **138 692** | 32 |
| A | 7-10 CV |  | **158 618** | 32 |
| A | 11-14 CV |  | **234 445** | 32 |
| A | 15-23 CV |  | **298 854** | 32 |
| A | 24-+ CV |  | **346 768** | 32 |
| B | 0-2 CV |  | **107 641** | 32 |
| B | 3-6 CV |  | **132 914** | 32 |
| B | 7-10 CV |  | **152 009** | 32 |
| B | 11-14 CV |  | **224 677** | 32 |
| B | 15-23 CV |  | **286 402** | 32 |
| B | 24-+ CV |  | **332 319** | 32 |
| C | 0-2 CV |  | **102 961** | 32 |
| C | 3-6 CV |  | **127 135** | 32 |
| C | 7-10 CV |  | **145 400** | 32 |
| C | 11-14 CV |  | **214 908** | 32 |
| C | 15-23 CV |  | **273 950** | 32 |
| C | 24-+ CV |  | **317 870** | 32 |

#### Catégorie 05 (27 lignes)

| Zone | Force fiscale / Cylindrée | Autres critères | Prime(s) (FCFA) | Page |
|---|---|---|---|---|
| A | 501-625 cm³ |  | Sans remorque **34 045** / Avec remorque **40 854** | 33 |
| A | 251-350 cm³ |  | Sans remorque **26 850** / Avec remorque **32 220** | 33 |
| A | 176-250 cm³ |  | Sans remorque **22 984** / Avec remorque **27 580** | 33 |
| A | 126-175 cm³ |  | Sans remorque **18 580** / Avec remorque **22 295** | 33 |
| A | 51-125 cm³ |  | Sans remorque **10 739** / Avec remorque **12 886** | 33 |
| A | 0-49 cm³ |  | Sans remorque **7 732** / Avec remorque **9 277** | 33 |
| A | — |  | Sans remorque **16 110** / Avec remorque **19 332** | 33 |
| A | 626-+ cm³ |  | Sans remorque **38 078** / Avec remorque **45 694** | 33 |
| A | 351-500 cm³ |  | Sans remorque **30 930** / Avec remorque **37 116** | 33 |
| B | 176-250 cm³ |  | Sans remorque **22 026** / Avec remorque **26 430** | 33 |
| B | 0-49 cm³ |  | Sans remorque **7 409** / Avec remorque **8 891** | 33 |
| B | — |  | Sans remorque **15 439** / Avec remorque **18 527** | 33 |
| B | 51-125 cm³ |  | Sans remorque **10 291** / Avec remorque **12 349** | 33 |
| B | 126-175 cm³ |  | Sans remorque **17 805** / Avec remorque **21 366** | 33 |
| B | 251-350 cm³ |  | Sans remorque **25 731** / Avec remorque **30 878** | 33 |
| B | 351-500 cm³ |  | Sans remorque **29 641** / Avec remorque **35 570** | 33 |
| B | 501-625 cm³ |  | Sans remorque **32 627** / Avec remorque **39 152** | 33 |
| B | 626-+ cm³ |  | Sans remorque **36 492** / Avec remorque **43 790** | 33 |
| C | 126-175 cm³ |  | Sans remorque **17 031** / Avec remorque **20 437** | 34 |
| C | 51-125 cm³ |  | Sans remorque **9 844** / Avec remorque **11 812** | 34 |
| C | — |  | Sans remorque **14 768** / Avec remorque **17 721** | 34 |
| C | 0-49 cm³ |  | Sans remorque **7 087** / Avec remorque **8 504** | 34 |
| C | 351-500 cm³ |  | Sans remorque **28 353** / Avec remorque **34 023** | 34 |
| C | 626-+ cm³ |  | Sans remorque **34 905** / Avec remorque **41 886** | 34 |
| C | 501-625 cm³ |  | Sans remorque **31 208** / Avec remorque **37 450** | 34 |
| C | 251-350 cm³ |  | Sans remorque **24 613** / Avec remorque **29 535** | 34 |
| C | 176-250 cm³ |  | Sans remorque **21 068** / Avec remorque **25 281** | 34 |

#### Catégorie 05bis (27 lignes)

| Zone | Force fiscale / Cylindrée | Autres critères | Prime(s) (FCFA) | Page |
|---|---|---|---|---|
| A | 126-175 cm³ |  | Sans remorque **22 295** / Avec remorque **26 754** | 35 |
| A | 251-350 cm³ |  | Sans remorque **32 220** / Avec remorque **38 664** | 35 |
| A | 351-500 cm³ |  | Sans remorque **37 116** / Avec remorque **44 539** | 35 |
| A | 501-625 cm³ |  | Sans remorque **40 854** / Avec remorque **49 025** | 35 |
| A | 626-+ cm³ |  | Sans remorque **45 694** / Avec remorque **54 833** | 35 |
| A | 0-49 cm³ |  | Sans remorque **9 277** / Avec remorque **11 132** | 35 |
| A | — |  | Sans remorque **19 332** / Avec remorque **23 198** | 35 |
| A | 51-125 cm³ |  | Sans remorque **12 886** / Avec remorque **15 463** | 35 |
| A | 176-250 cm³ |  | Sans remorque **27 580** / Avec remorque **33 096** | 35 |
| B | 251-350 cm³ |  | Sans remorque **30 878** / Avec remorque **37 053** | 35 |
| B | 176-250 cm³ |  | Sans remorque **26 430** / Avec remorque **31 717** | 35 |
| B | 126-175 cm³ |  | Sans remorque **21 366** / Avec remorque **25 639** | 35 |
| B | 51-125 cm³ |  | Sans remorque **12 349** / Avec remorque **14 819** | 35 |
| B | — |  | Sans remorque **18 527** / Avec remorque **22 232** | 35 |
| B | 0-49 cm³ |  | Sans remorque **8 891** / Avec remorque **10 669** | 35 |
| B | 626-+ cm³ |  | Sans remorque **43 790** / Avec remorque **52 548** | 35 |
| B | 501-625 cm³ |  | Sans remorque **39 152** / Avec remorque **46 982** | 35 |
| B | 351-500 cm³ |  | Sans remorque **35 570** / Avec remorque **42 683** | 35 |
| C | 351-500 cm³ |  | Sans remorque **34 023** / Avec remorque **40 828** | 35 |
| C | 501-625 cm³ |  | Sans remorque **37 450** / Avec remorque **44 939** | 35 |
| C | 626-+ cm³ |  | Sans remorque **41 886** / Avec remorque **50 263** | 35 |
| C | 0-49 cm³ |  | Sans remorque **8 504** / Avec remorque **10 205** | 35 |
| C | — |  | Sans remorque **17 721** / Avec remorque **21 265** | 35 |
| C | 51-125 cm³ |  | Sans remorque **11 812** / Avec remorque **14 175** | 35 |
| C | 126-175 cm³ |  | Sans remorque **20 437** / Avec remorque **24 525** | 35 |
| C | 176-250 cm³ |  | Sans remorque **25 281** / Avec remorque **30 338** | 35 |
| C | 251-350 cm³ |  | Sans remorque **29 535** / Avec remorque **35 442** | 35 |

#### Catégorie 06 (66 lignes)

| Zone | Force fiscale / Cylindrée | Autres critères | Prime(s) (FCFA) | Page |
|---|---|---|---|---|
| A | 51-+ cm³ | nombre_cartes=4 | **249 596** | 37 |
| A | — | nombre_cartes=1, rang_vehicule=TARIF_1 | **356 059** | 36 |
| A | — | nombre_cartes=1, rang_vehicule=TARIF_2_3 | **445 104** | 36 |
| A | — | nombre_cartes=2, rang_vehicule=TARIF_1 | **534 089** | 36 |
| A | — | nombre_cartes=2, rang_vehicule=TARIF_2_3 | **667 656** | 36 |
| A | — | nombre_cartes=3, rang_vehicule=TARIF_1 | **712 118** | 36 |
| A | — | nombre_cartes=3, rang_vehicule=TARIF_2_3 | **890 208** | 36 |
| A | — | nombre_cartes=4, rang_vehicule=TARIF_1 | **890 148** | 36 |
| A | — | nombre_cartes=4, rang_vehicule=TARIF_2_3 | **1 112 760** | 36 |
| A | — | nombre_cartes=5, rang_vehicule=TARIF_1 | **1 068 178** | 36 |
| A | — | nombre_cartes=5, rang_vehicule=TARIF_2_3 | **1 279 329** | 36 |
| A | — | rang_vehicule=TARIF_1 | **178 030** | 36 |
| A | — | rang_vehicule=TARIF_2_3 | **222 552** | 36 |
| A | 0-49 cm³ | nombre_cartes=1 | **25 898** | 37 |
| A | 0-49 cm³ | nombre_cartes=2 | **38 848** | 37 |
| A | 0-49 cm³ | nombre_cartes=3 | **51 797** | 37 |
| A | 0-49 cm³ | nombre_cartes=4 | **64 746** | 37 |
| A | 0-49 cm³ |  | **12 949** | 37 |
| A | 51-+ cm³ | nombre_cartes=1 | **99 838** | 37 |
| A | 51-+ cm³ | nombre_cartes=2 | **149 755** | 37 |
| A | 51-+ cm³ | nombre_cartes=3 | **199 676** | 37 |
| A | 51-+ cm³ |  | **49 920** | 37 |
| B | — | nombre_cartes=4, rang_vehicule=TARIF_1 | **853 059** | 36 |
| B | — | nombre_cartes=3, rang_vehicule=TARIF_2_3 | **853 116** | 36 |
| B | — | nombre_cartes=3, rang_vehicule=TARIF_1 | **682 447** | 36 |
| B | — | nombre_cartes=2, rang_vehicule=TARIF_2_3 | **639 837** | 36 |
| B | — | nombre_cartes=2, rang_vehicule=TARIF_1 | **511 835** | 36 |
| B | — | nombre_cartes=1, rang_vehicule=TARIF_2_3 | **426 558** | 36 |
| B | — | nombre_cartes=1, rang_vehicule=TARIF_1 | **341 223** | 36 |
| B | 51-+ cm³ |  | **47 840** | 37 |
| B | 51-+ cm³ | nombre_cartes=4 | **239 197** | 37 |
| B | 51-+ cm³ | nombre_cartes=3 | **191 357** | 37 |
| B | 51-+ cm³ | nombre_cartes=2 | **143 515** | 37 |
| B | 51-+ cm³ | nombre_cartes=1 | **95 678** | 37 |
| B | 0-49 cm³ |  | **12 410** | 37 |
| B | 0-49 cm³ | nombre_cartes=4 | **62 048** | 37 |
| B | 0-49 cm³ | nombre_cartes=3 | **49 639** | 37 |
| B | 0-49 cm³ | nombre_cartes=2 | **37 229** | 37 |
| B | 0-49 cm³ | nombre_cartes=1 | **24 819** | 37 |
| B | — | rang_vehicule=TARIF_2_3 | **213 279** | 36 |
| B | — | rang_vehicule=TARIF_1 | **170 612** | 36 |
| B | — | nombre_cartes=5, rang_vehicule=TARIF_2_3 | **1 279 329** | 36 |
| B | — | nombre_cartes=5, rang_vehicule=TARIF_1 | **1 023 670** | 36 |
| B | — | nombre_cartes=4, rang_vehicule=TARIF_2_3 | **1 066 395** | 36 |
| C | 51-+ cm³ |  | **45 760** | 37 |
| C | — | nombre_cartes=1, rang_vehicule=TARIF_1 | **326 388** | 36 |
| C | — | nombre_cartes=1, rang_vehicule=TARIF_2_3 | **408 012** | 36 |
| C | — | nombre_cartes=2, rang_vehicule=TARIF_1 | **489 581** | 36 |
| C | — | nombre_cartes=2, rang_vehicule=TARIF_2_3 | **612 018** | 36 |
| C | — | nombre_cartes=3, rang_vehicule=TARIF_1 | **652 775** | 36 |
| C | — | nombre_cartes=3, rang_vehicule=TARIF_2_3 | **816 024** | 36 |
| C | — | nombre_cartes=4, rang_vehicule=TARIF_1 | **815 969** | 36 |
| C | — | nombre_cartes=4, rang_vehicule=TARIF_2_3 | **1 020 030** | 36 |
| C | — | nombre_cartes=5, rang_vehicule=TARIF_1 | **979 163** | 36 |
| C | — | nombre_cartes=5, rang_vehicule=TARIF_2_3 | **1 223 706** | 36 |
| C | — | rang_vehicule=TARIF_1 | **163 194** | 36 |
| C | — | rang_vehicule=TARIF_2_3 | **204 006** | 36 |
| C | 0-49 cm³ | nombre_cartes=1 | **23 740** | 37 |
| C | 0-49 cm³ | nombre_cartes=2 | **35 610** | 37 |
| C | 0-49 cm³ | nombre_cartes=3 | **47 480** | 37 |
| C | 0-49 cm³ | nombre_cartes=4 | **59 351** | 37 |
| C | 0-49 cm³ |  | **11 870** | 37 |
| C | 51-+ cm³ | nombre_cartes=1 | **91 518** | 37 |
| C | 51-+ cm³ | nombre_cartes=2 | **137 276** | 37 |
| C | 51-+ cm³ | nombre_cartes=3 | **183 037** | 37 |
| C | 51-+ cm³ | nombre_cartes=4 | **228 797** | 37 |

#### Catégorie 07ARC (99 lignes)

| Zone | Force fiscale / Cylindrée | Autres critères | Prime(s) (FCFA) | Page |
|---|---|---|---|---|
| A | 0-2 CV | avec_rc_eleves=True, type_vehicule_base=CAT_1, avec_double_commande=True | **67 306** | 38 |
| A | 0-2 CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4 | **88 000** | 40 |
| A | 0-2 CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **75 334** | 40 |
| A | 0-2 CV | avec_rc_eleves=True, type_vehicule_base=CAT_1 | **80 767** | 38 |
| A | 3-6 CV | avec_rc_eleves=True, type_vehicule_base=CAT_1 | **98 129** | 38 |
| A | 3-6 CV | avec_rc_eleves=True, type_vehicule_base=CAT_1, avec_double_commande=True | **81 774** | 38 |
| A | 3-6 CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4 | **109 512** | 40 |
| A | 3-6 CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **91 261** | 40 |
| A | 7-10 CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **103 742** | 40 |
| A | 7-10 CV | avec_rc_eleves=True, type_vehicule_base=CAT_1, avec_double_commande=True | **90 868** | 38 |
| A | 7-10 CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4 | **124 492** | 40 |
| A | 7-10 CV | avec_rc_eleves=True, type_vehicule_base=CAT_1 | **109 042** | 38 |
| A | 11-14 CV | avec_rc_eleves=True, type_vehicule_base=CAT_1 | **142 304** | 38 |
| A | 11-14 CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4 | **186 481** | 40 |
| A | 11-14 CV | avec_rc_eleves=True, type_vehicule_base=CAT_1, avec_double_commande=True | **118 586** | 38 |
| A | 11-14 CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **155 400** | 40 |
| A | 15-23 CV | avec_rc_eleves=True, type_vehicule_base=CAT_1 | **181 176** | 38 |
| A | 15-23 CV | avec_rc_eleves=True, type_vehicule_base=CAT_1, avec_double_commande=True | **150 980** | 38 |
| A | 15-23 CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4 | **230 902** | 40 |
| A | 15-23 CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **192 419** | 40 |
| A | 24-+ CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **222 552** | 40 |
| A | 24-+ CV | avec_rc_eleves=True, type_vehicule_base=CAT_1, avec_double_commande=True | **178 031** | 38 |
| A | 24-+ CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4 | **267 062** | 40 |
| A | 24-+ CV | avec_rc_eleves=True, type_vehicule_base=CAT_1 | **213 637** | 38 |
| A | 251-350 cm³ | avec_rc_eleves=True, type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **48 145** | 41 |
| A | 0-49 cm³ | avec_rc_eleves=True, type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **15 539** | 41 |
| A | — | avec_rc_eleves=True, type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **30 596** | 41 |
| A | 51-125 cm³ | avec_rc_eleves=True, type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **21 821** | 41 |
| A | 126-175 cm³ | avec_rc_eleves=True, type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **34 634** | 41 |
| A | 176-250 cm³ | avec_rc_eleves=True, type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **41 827** | 41 |
| A | 351-500 cm³ | avec_rc_eleves=True, type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **54 814** | 41 |
| A | 501-625 cm³ | avec_rc_eleves=True, type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **59 904** | 41 |
| A | 626-+ cm³ | avec_rc_eleves=True, type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **66 493** | 41 |
| B | 0-2 CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **72 195** | 40 |
| B | 0-2 CV | avec_rc_eleves=True, type_vehicule_base=CAT_1 | **77 402** | 38 |
| B | 0-2 CV | avec_rc_eleves=True, type_vehicule_base=CAT_1, avec_double_commande=True | **64 501** | 38 |
| B | 0-2 CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4 | **84 333** | 40 |
| B | 3-6 CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4 | **104 949** | 40 |
| B | 3-6 CV | avec_rc_eleves=True, type_vehicule_base=CAT_1, avec_double_commande=True | **78 367** | 38 |
| B | 3-6 CV | avec_rc_eleves=True, type_vehicule_base=CAT_1 | **94 040** | 38 |
| B | 3-6 CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **87 459** | 40 |
| B | 7-10 CV | avec_rc_eleves=True, type_vehicule_base=CAT_1 | **104 498** | 38 |
| B | 7-10 CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **99 420** | 40 |
| B | 7-10 CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4 | **119 304** | 40 |
| B | 7-10 CV | avec_rc_eleves=True, type_vehicule_base=CAT_1, avec_double_commande=True | **87 081** | 38 |
| B | 11-14 CV | avec_rc_eleves=True, type_vehicule_base=CAT_1, avec_double_commande=True | **113 645** | 38 |
| B | 11-14 CV | avec_rc_eleves=True, type_vehicule_base=CAT_1 | **136 375** | 38 |
| B | 11-14 CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **148 925** | 40 |
| B | 11-14 CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4 | **178 711** | 40 |
| B | 15-23 CV | avec_rc_eleves=True, type_vehicule_base=CAT_1, avec_double_commande=True | **144 690** | 38 |
| B | 15-23 CV | avec_rc_eleves=True, type_vehicule_base=CAT_1 | **173 627** | 38 |
| B | 15-23 CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **184 401** | 40 |
| B | 15-23 CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4 | **221 281** | 40 |
| B | 24-+ CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **213 279** | 40 |
| B | 24-+ CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4 | **255 935** | 40 |
| B | 24-+ CV | avec_rc_eleves=True, type_vehicule_base=CAT_1 | **204 736** | 38 |
| B | 24-+ CV | avec_rc_eleves=True, type_vehicule_base=CAT_1, avec_double_commande=True | **170 613** | 38 |
| B | — | avec_rc_eleves=True, type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **29 322** | 41 |
| B | 0-49 cm³ | avec_rc_eleves=True, type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **14 891** | 41 |
| B | 51-125 cm³ | avec_rc_eleves=True, type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **20 912** | 41 |
| B | 126-175 cm³ | avec_rc_eleves=True, type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **33 191** | 41 |
| B | 176-250 cm³ | avec_rc_eleves=True, type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **40 084** | 41 |
| B | 251-350 cm³ | avec_rc_eleves=True, type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **46 139** | 41 |
| B | 351-500 cm³ | avec_rc_eleves=True, type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **52 530** | 41 |
| B | 501-625 cm³ | avec_rc_eleves=True, type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **57 408** | 41 |
| B | 626-+ cm³ | avec_rc_eleves=True, type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **63 723** | 41 |
| C | 0-2 CV | avec_rc_eleves=True, type_vehicule_base=CAT_1, avec_double_commande=True | **61 697** | 39 |
| C | 0-2 CV | avec_rc_eleves=True, type_vehicule_base=CAT_1 | **74 037** | 39 |
| C | 0-2 CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **69 056** | 40 |
| C | 0-2 CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4 | **80 666** | 40 |
| C | 3-6 CV | avec_rc_eleves=True, type_vehicule_base=CAT_1, avec_double_commande=True | **74 960** | 39 |
| C | 3-6 CV | avec_rc_eleves=True, type_vehicule_base=CAT_1 | **89 951** | 39 |
| C | 3-6 CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **83 656** | 40 |
| C | 3-6 CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4 | **100 386** | 40 |
| C | 7-10 CV | avec_rc_eleves=True, type_vehicule_base=CAT_1, avec_double_commande=True | **83 295** | 39 |
| C | 7-10 CV | avec_rc_eleves=True, type_vehicule_base=CAT_1 | **99 955** | 39 |
| C | 7-10 CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **95 097** | 40 |
| C | 7-10 CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4 | **114 117** | 40 |
| C | 11-14 CV | avec_rc_eleves=True, type_vehicule_base=CAT_1, avec_double_commande=True | **108 704** | 39 |
| C | 11-14 CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4 | **170 941** | 40 |
| C | 11-14 CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **142 450** | 40 |
| C | 11-14 CV | avec_rc_eleves=True, type_vehicule_base=CAT_1 | **130 446** | 39 |
| C | 15-23 CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4 | **211 660** | 40 |
| C | 15-23 CV | avec_rc_eleves=True, type_vehicule_base=CAT_1, avec_double_commande=True | **138 399** | 39 |
| C | 15-23 CV | avec_rc_eleves=True, type_vehicule_base=CAT_1 | **166 078** | 39 |
| C | 15-23 CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **176 384** | 40 |
| C | 24-+ CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **204 006** | 40 |
| C | 24-+ CV | avec_rc_eleves=True, type_vehicule_base=CAT_2_3_4 | **244 807** | 40 |
| C | 24-+ CV | avec_rc_eleves=True, type_vehicule_base=CAT_1, avec_double_commande=True | **163 195** | 39 |
| C | 24-+ CV | avec_rc_eleves=True, type_vehicule_base=CAT_1 | **195 834** | 39 |
| C | 351-500 cm³ | avec_rc_eleves=True, type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **50 246** | 41 |
| C | 51-125 cm³ | avec_rc_eleves=True, type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **20 002** | 41 |
| C | 126-175 cm³ | avec_rc_eleves=True, type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **31 748** | 41 |
| C | 176-250 cm³ | avec_rc_eleves=True, type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **38 342** | 41 |
| C | — | avec_rc_eleves=True, type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **28 047** | 41 |
| C | 251-350 cm³ | avec_rc_eleves=True, type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **44 133** | 41 |
| C | 0-49 cm³ | avec_rc_eleves=True, type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **14 244** | 41 |
| C | 626-+ cm³ | avec_rc_eleves=True, type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **60 952** | 41 |
| C | 501-625 cm³ | avec_rc_eleves=True, type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **54 912** | 41 |

#### Catégorie 07SRC (99 lignes)

| Zone | Force fiscale / Cylindrée | Autres critères | Prime(s) (FCFA) | Page |
|---|---|---|---|---|
| A | 0-2 CV | type_vehicule_base=CAT_1 | **67 306** | 38 |
| A | 0-2 CV | type_vehicule_base=CAT_2_3_4 | **75 334** | 40 |
| A | 0-2 CV | type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **62 778** | 40 |
| A | 0-2 CV | type_vehicule_base=CAT_1, avec_double_commande=True | **56 088** | 38 |
| A | 3-6 CV | type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **76 050** | 40 |
| A | 3-6 CV | type_vehicule_base=CAT_1 | **81 774** | 38 |
| A | 3-6 CV | type_vehicule_base=CAT_1, avec_double_commande=True | **68 144** | 38 |
| A | 3-6 CV | type_vehicule_base=CAT_2_3_4 | **91 261** | 40 |
| A | 7-10 CV | type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **86 452** | 40 |
| A | 7-10 CV | type_vehicule_base=CAT_1 | **90 868** | 38 |
| A | 7-10 CV | type_vehicule_base=CAT_1, avec_double_commande=True | **75 724** | 38 |
| A | 7-10 CV | type_vehicule_base=CAT_2_3_4 | **103 742** | 40 |
| A | 11-14 CV | type_vehicule_base=CAT_2_3_4 | **155 400** | 40 |
| A | 11-14 CV | type_vehicule_base=CAT_1 | **118 586** | 38 |
| A | 11-14 CV | type_vehicule_base=CAT_1, avec_double_commande=True | **96 821** | 38 |
| A | 11-14 CV | type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **129 499** | 40 |
| A | 15-23 CV | type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **160 349** | 40 |
| A | 15-23 CV | type_vehicule_base=CAT_1 | **150 980** | 38 |
| A | 15-23 CV | type_vehicule_base=CAT_1, avec_double_commande=True | **125 816** | 38 |
| A | 15-23 CV | type_vehicule_base=CAT_2_3_4 | **192 419** | 40 |
| A | 24-+ CV | type_vehicule_base=CAT_1, avec_double_commande=True | **148 358** | 38 |
| A | 24-+ CV | type_vehicule_base=CAT_1 | **178 031** | 38 |
| A | 24-+ CV | type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **185 460** | 40 |
| A | 24-+ CV | type_vehicule_base=CAT_2_3_4 | **222 552** | 40 |
| A | 126-175 cm³ | type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **28 864** | 41 |
| A | 51-125 cm³ | type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **18 185** | 41 |
| A | — | type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **25 496** | 41 |
| A | 0-49 cm³ | type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **12 949** | 41 |
| A | 501-625 cm³ | type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **49 920** | 41 |
| A | 351-500 cm³ | type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **45 678** | 41 |
| A | 251-350 cm³ | type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **40 121** | 41 |
| A | 176-250 cm³ | type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **34 864** | 41 |
| A | 626-+ cm³ | type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **55 411** | 41 |
| B | 0-2 CV | type_vehicule_base=CAT_1, avec_double_commande=True | **53 751** | 38 |
| B | 0-2 CV | type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **60 162** | 40 |
| B | 0-2 CV | type_vehicule_base=CAT_1 | **64 501** | 38 |
| B | 0-2 CV | type_vehicule_base=CAT_2_3_4 | **72 195** | 40 |
| B | 3-6 CV | type_vehicule_base=CAT_1 | **78 367** | 38 |
| B | 3-6 CV | type_vehicule_base=CAT_2_3_4 | **87 459** | 40 |
| B | 3-6 CV | type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **72 881** | 40 |
| B | 3-6 CV | type_vehicule_base=CAT_1, avec_double_commande=True | **65 305** | 38 |
| B | 7-10 CV | type_vehicule_base=CAT_2_3_4 | **99 420** | 40 |
| B | 7-10 CV | type_vehicule_base=CAT_1, avec_double_commande=True | **72 568** | 38 |
| B | 7-10 CV | type_vehicule_base=CAT_1 | **87 081** | 38 |
| B | 7-10 CV | type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **82 849** | 40 |
| B | 11-14 CV | type_vehicule_base=CAT_2_3_4 | **148 925** | 40 |
| B | 11-14 CV | type_vehicule_base=CAT_1, avec_double_commande=True | **94 704** | 38 |
| B | 11-14 CV | type_vehicule_base=CAT_1 | **113 645** | 38 |
| B | 11-14 CV | type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **124 103** | 40 |
| B | 15-23 CV | type_vehicule_base=CAT_2_3_4 | **184 401** | 40 |
| B | 15-23 CV | type_vehicule_base=CAT_1, avec_double_commande=True | **120 574** | 38 |
| B | 15-23 CV | type_vehicule_base=CAT_1 | **144 690** | 38 |
| B | 15-23 CV | type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **153 668** | 40 |
| B | 24-+ CV | type_vehicule_base=CAT_2_3_4 | **213 279** | 40 |
| B | 24-+ CV | type_vehicule_base=CAT_1, avec_double_commande=True | **142 177** | 38 |
| B | 24-+ CV | type_vehicule_base=CAT_1 | **170 613** | 38 |
| B | 24-+ CV | type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **177 733** | 40 |
| B | 176-250 cm³ | type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **33 411** | 41 |
| B | 126-175 cm³ | type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **27 661** | 41 |
| B | 0-49 cm³ | type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **12 410** | 41 |
| B | — | type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **24 434** | 41 |
| B | 51-125 cm³ | type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **17 427** | 41 |
| B | 501-625 cm³ | type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **47 840** | 41 |
| B | 626-+ cm³ | type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **53 102** | 41 |
| B | 351-500 cm³ | type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **43 775** | 41 |
| B | 251-350 cm³ | type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **38 449** | 41 |
| C | 0-2 CV | type_vehicule_base=CAT_1, avec_double_commande=True | **51 414** | 39 |
| C | 0-2 CV | type_vehicule_base=CAT_2_3_4 | **69 056** | 40 |
| C | 0-2 CV | type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **57 547** | 40 |
| C | 0-2 CV | type_vehicule_base=CAT_1 | **61 697** | 39 |
| C | 3-6 CV | type_vehicule_base=CAT_1 | **74 960** | 39 |
| C | 3-6 CV | type_vehicule_base=CAT_1, avec_double_commande=True | **62 466** | 39 |
| C | 3-6 CV | type_vehicule_base=CAT_2_3_4 | **83 656** | 40 |
| C | 3-6 CV | type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **69 713** | 40 |
| C | 7-10 CV | type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **79 247** | 40 |
| C | 7-10 CV | type_vehicule_base=CAT_1, avec_double_commande=True | **69 413** | 39 |
| C | 7-10 CV | type_vehicule_base=CAT_1 | **83 295** | 39 |
| C | 7-10 CV | type_vehicule_base=CAT_2_3_4 | **95 097** | 40 |
| C | 11-14 CV | type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **118 708** | 40 |
| C | 11-14 CV | type_vehicule_base=CAT_2_3_4 | **142 450** | 40 |
| C | 11-14 CV | type_vehicule_base=CAT_1 | **108 704** | 39 |
| C | 11-14 CV | type_vehicule_base=CAT_1, avec_double_commande=True | **90 586** | 39 |
| C | 15-23 CV | type_vehicule_base=CAT_2_3_4 | **176 384** | 40 |
| C | 15-23 CV | type_vehicule_base=CAT_1, avec_double_commande=True | **115 332** | 39 |
| C | 15-23 CV | type_vehicule_base=CAT_1 | **138 399** | 39 |
| C | 15-23 CV | type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **146 986** | 40 |
| C | 24-+ CV | type_vehicule_base=CAT_1, avec_double_commande=True | **135 995** | 39 |
| C | 24-+ CV | type_vehicule_base=CAT_2_3_4, avec_double_commande=True | **170 005** | 40 |
| C | 24-+ CV | type_vehicule_base=CAT_2_3_4 | **204 006** | 40 |
| C | 24-+ CV | type_vehicule_base=CAT_1 | **163 195** | 39 |
| C | — | type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **23 372** | 41 |
| C | 126-175 cm³ | type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **26 458** | 41 |
| C | 51-125 cm³ | type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **16 669** | 41 |
| C | 0-49 cm³ | type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **11 870** | 41 |
| C | 626-+ cm³ | type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **50 794** | 41 |
| C | 501-625 cm³ | type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **45 760** | 41 |
| C | 351-500 cm³ | type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **41 872** | 41 |
| C | 251-350 cm³ | type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **36 777** | 41 |
| C | 176-250 cm³ | type_vehicule_base=CAT_5_DEUX_TROIS_ROUES | **31 958** | 41 |

#### Catégorie 08 (54 lignes)

| Zone | Force fiscale / Cylindrée | Autres critères | Prime(s) (FCFA) | Page |
|---|---|---|---|---|
| A | 0-2 CV |  | **89 742** | 42 |
| A | 0-2 CV | tonnage_label=MOINS_3_5T | **100 444** | 42 |
| A | 0-2 CV | tonnage_label=PLUS_3_5T | **160 760** | 42 |
| A | 3-6 CV | tonnage_label=MOINS_3_5T | **121 680** | 42 |
| A | 3-6 CV |  | **109 034** | 42 |
| A | 3-6 CV | tonnage_label=PLUS_3_5T | **198 240** | 42 |
| A | 7-10 CV | tonnage_label=MOINS_3_5T | **138 323** | 42 |
| A | 7-10 CV | tonnage_label=PLUS_3_5T | **227 180** | 42 |
| A | 7-10 CV |  | **121 158** | 42 |
| A | 11-14 CV | tonnage_label=PLUS_3_5T | **334 326** | 42 |
| A | 11-14 CV | tonnage_label=MOINS_3_5T | **207 200** | 42 |
| A | 11-14 CV |  | **158 114** | 42 |
| A | 15-23 CV |  | **201 306** | 42 |
| A | 15-23 CV | tonnage_label=PLUS_3_5T | **427 709** | 42 |
| A | 15-23 CV | tonnage_label=MOINS_3_5T | **256 558** | 42 |
| A | 24-+ CV |  | **237 373** | 42 |
| A | 24-+ CV | tonnage_label=MOINS_3_5T | **296 736** | 42 |
| A | 24-+ CV | tonnage_label=PLUS_3_5T | **496 285** | 42 |
| B | 0-2 CV | tonnage_label=MOINS_3_5T | **96 258** | 42 |
| B | 0-2 CV | tonnage_label=PLUS_3_5T | **154 062** | 42 |
| B | 0-2 CV |  | **86 003** | 42 |
| B | 3-6 CV | tonnage_label=MOINS_3_5T | **116 610** | 42 |
| B | 3-6 CV | tonnage_label=PLUS_3_5T | **189 980** | 42 |
| B | 3-6 CV |  | **104 491** | 42 |
| B | 7-10 CV | tonnage_label=MOINS_3_5T | **132 559** | 42 |
| B | 7-10 CV |  | **116 110** | 42 |
| B | 7-10 CV | tonnage_label=PLUS_3_5T | **217 715** | 42 |
| B | 11-14 CV | tonnage_label=MOINS_3_5T | **198 567** | 42 |
| B | 11-14 CV | tonnage_label=PLUS_3_5T | **320 396** | 42 |
| B | 11-14 CV |  | **151 526** | 42 |
| B | 15-23 CV | tonnage_label=PLUS_3_5T | **409 888** | 42 |
| B | 15-23 CV | tonnage_label=MOINS_3_5T | **245 868** | 42 |
| B | 15-23 CV |  | **192 921** | 42 |
| B | 24-+ CV |  | **227 483** | 42 |
| B | 24-+ CV | tonnage_label=MOINS_3_5T | **284 372** | 42 |
| B | 24-+ CV | tonnage_label=PLUS_3_5T | **475 607** | 42 |
| C | 0-2 CV | tonnage_label=MOINS_3_5T | **92 073** | 42 |
| C | 0-2 CV |  | **82 264** | 42 |
| C | 0-2 CV | tonnage_label=PLUS_3_5T | **147 364** | 42 |
| C | 3-6 CV | tonnage_label=PLUS_3_5T | **181 720** | 42 |
| C | 3-6 CV | tonnage_label=MOINS_3_5T | **111 540** | 42 |
| C | 3-6 CV |  | **99 948** | 42 |
| C | 7-10 CV |  | **111 062** | 42 |
| C | 7-10 CV | tonnage_label=PLUS_3_5T | **208 249** | 42 |
| C | 7-10 CV | tonnage_label=MOINS_3_5T | **126 796** | 42 |
| C | 11-14 CV | tonnage_label=PLUS_3_5T | **306 466** | 42 |
| C | 11-14 CV | tonnage_label=MOINS_3_5T | **189 934** | 42 |
| C | 11-14 CV |  | **144 938** | 42 |
| C | 15-23 CV | tonnage_label=PLUS_3_5T | **392 006** | 42 |
| C | 15-23 CV | tonnage_label=MOINS_3_5T | **235 178** | 42 |
| C | 15-23 CV |  | **184 533** | 42 |
| C | 24-+ CV | tonnage_label=PLUS_3_5T | **454 928** | 42 |
| C | 24-+ CV | tonnage_label=MOINS_3_5T | **272 008** | 42 |
| C | 24-+ CV |  | **217 592** | 42 |

#### Catégorie 09A (18 lignes)

| Zone | Force fiscale / Cylindrée | Autres critères | Prime(s) (FCFA) | Page |
|---|---|---|---|---|
| A | 0-2 CV |  | Sans remorque **80 380** / Avec remorque **104 494** | 43 |
| A | 3-6 CV |  | Sans remorque **99 184** / Avec remorque **128 939** | 43 |
| A | 7-10 CV |  | Sans remorque **113 590** / Avec remorque **147 666** | 43 |
| A | 11-14 CV |  | Sans remorque **167 762** / Avec remorque **218 092** | 43 |
| A | 15-23 CV |  | Sans remorque **213 854** / Avec remorque **278 011** | 43 |
| A | 24-+ CV |  | Sans remorque **248 143** / Avec remorque **322 586** | 43 |
| B | 0-2 CV |  | Sans remorque **77 030** / Avec remorque **100 140** | 43 |
| B | 3-6 CV |  | Sans remorque **95 051** / Avec remorque **123 566** | 43 |
| B | 7-10 CV |  | Sans remorque **108 857** / Avec remorque **141 513** | 43 |
| B | 11-14 CV |  | Sans remorque **160 772** / Avec remorque **209 004** | 43 |
| B | 15-23 CV |  | Sans remorque **204 944** / Avec remorque **266 427** | 43 |
| B | 24-+ CV |  | Sans remorque **237 804** / Avec remorque **309 145** | 43 |
| C | 0-2 CV |  | Sans remorque **73 681** / Avec remorque **95 786** | 43 |
| C | 3-6 CV |  | Sans remorque **90 918** / Avec remorque **118 194** | 43 |
| C | 7-10 CV |  | Sans remorque **104 124** / Avec remorque **135 361** | 43 |
| C | 11-14 CV |  | Sans remorque **153 782** / Avec remorque **199 917** | 43 |
| C | 15-23 CV |  | Sans remorque **196 033** / Avec remorque **254 844** | 43 |
| C | 24-+ CV |  | Sans remorque **227 465** / Avec remorque **295 704** | 43 |

#### Catégorie 09B (18 lignes)

| Zone | Force fiscale / Cylindrée | Autres critères | Prime(s) (FCFA) | Page |
|---|---|---|---|---|
| A | 0-2 CV |  | Sans remorque **50 222** / Avec remorque **60 266** | 43 |
| A | 3-6 CV |  | Sans remorque **60 840** / Avec remorque **73 008** | 43 |
| A | 7-10 CV |  | Sans remorque **69 162** / Avec remorque **82 994** | 43 |
| A | 11-14 CV |  | Sans remorque **103 600** / Avec remorque **124 320** | 43 |
| A | 15-23 CV |  | Sans remorque **125 639** / Avec remorque **150 767** | 43 |
| A | 24-+ CV |  | Sans remorque **148 368** / Avec remorque **178 042** | 43 |
| B | 0-2 CV |  | Sans remorque **48 130** / Avec remorque **57 755** | 43 |
| B | 3-6 CV |  | Sans remorque **58 130** / Avec remorque **69 966** | 43 |
| B | 7-10 CV |  | Sans remorque **66 280** / Avec remorque **79 536** | 43 |
| B | 11-14 CV |  | Sans remorque **99 283** / Avec remorque **119 140** | 43 |
| B | 15-23 CV |  | Sans remorque **120 404** / Avec remorque **144 485** | 43 |
| B | 24-+ CV |  | Sans remorque **142 186** / Avec remorque **170 623** | 43 |
| C | 0-2 CV |  | Sans remorque **46 037** / Avec remorque **55 244** | 43 |
| C | 3-6 CV |  | Sans remorque **55 770** / Avec remorque **66 924** | 43 |
| C | 7-10 CV |  | Sans remorque **63 399** / Avec remorque **76 078** | 43 |
| C | 11-14 CV |  | Sans remorque **94 966** / Avec remorque **113 960** | 43 |
| C | 15-23 CV |  | Sans remorque **115 169** / Avec remorque **138 203** | 43 |
| C | 24-+ CV |  | Sans remorque **136 004** / Avec remorque **163 205** | 43 |

#### Catégorie 10A (18 lignes)

| Zone | Force fiscale / Cylindrée | Autres critères | Prime(s) (FCFA) | Page |
|---|---|---|---|---|
| A | 0-2 CV |  | **44 870** | — |
| A | 3-6 CV |  | **54 516** | — |
| A | 7-10 CV |  | **60 578** | — |
| A | 11-14 CV |  | **79 054** | — |
| A | 15-23 CV |  | **100 654** | — |
| A | 24-+ CV |  | **118 868** | — |
| B | 0-2 CV |  | **43 001** | — |
| B | 3-6 CV |  | **52 245** | — |
| B | 7-10 CV |  | **58 054** | — |
| B | 11-14 CV |  | **75 763** | — |
| B | 15-23 CV |  | **96 460** | — |
| B | 24-+ CV |  | **113 741** | — |
| C | 0-2 CV |  | **41 131** | — |
| C | 3-6 CV |  | **49 973** | — |
| C | 7-10 CV |  | **55 530** | — |
| C | 11-14 CV |  | **72 469** | — |
| C | 15-23 CV |  | **92 266** | — |
| C | 24-+ CV |  | **108 796** | — |

#### Catégorie 10B (18 lignes)

| Zone | Force fiscale / Cylindrée | Autres critères | Prime(s) (FCFA) | Page |
|---|---|---|---|---|
| A | 0-2 CV |  | **44 870** | — |
| A | 3-6 CV |  | **54 516** | — |
| A | 7-10 CV |  | **60 578** | — |
| A | 11-14 CV |  | **79 054** | — |
| A | 15-23 CV |  | **100 654** | — |
| A | 24-+ CV |  | **118 868** | — |
| B | 0-2 CV |  | **43 001** | — |
| B | 3-6 CV |  | **52 245** | — |
| B | 7-10 CV |  | **58 054** | — |
| B | 11-14 CV |  | **75 763** | — |
| B | 15-23 CV |  | **96 460** | — |
| B | 24-+ CV |  | **113 741** | — |
| C | 0-2 CV |  | **41 131** | — |
| C | 3-6 CV |  | **49 973** | — |
| C | 7-10 CV |  | **55 530** | — |
| C | 11-14 CV |  | **72 469** | — |
| C | 15-23 CV |  | **92 266** | — |
| C | 24-+ CV |  | **108 796** | — |

#### Catégorie 10C (18 lignes)

| Zone | Force fiscale / Cylindrée | Autres critères | Prime(s) (FCFA) | Page |
|---|---|---|---|---|
| A | 0-2 CV |  | **44 870** | — |
| A | 3-6 CV |  | **54 516** | — |
| A | 7-10 CV |  | **60 578** | — |
| A | 11-14 CV |  | **79 054** | — |
| A | 15-23 CV |  | **100 654** | — |
| A | 24-+ CV |  | **118 868** | — |
| B | 0-2 CV |  | **43 001** | — |
| B | 3-6 CV |  | **52 245** | — |
| B | 7-10 CV |  | **58 054** | — |
| B | 11-14 CV |  | **75 763** | — |
| B | 15-23 CV |  | **96 460** | — |
| B | 24-+ CV |  | **113 741** | — |
| C | 0-2 CV |  | **41 131** | — |
| C | 3-6 CV |  | **49 973** | — |
| C | 7-10 CV |  | **55 530** | — |
| C | 11-14 CV |  | **72 469** | — |
| C | 15-23 CV |  | **92 266** | — |
| C | 24-+ CV |  | **108 796** | — |
---


## Pilier 2 (v2.0) — Défense et Recours (DR)

### Mécanisme — formule unique, deux paramètres

Garantie dépendante de RC (mode `ASSIETTE` dans `garantie_lien`) — la prime RC doit être connue avant de calculer DR. Une seule formule couvre les deux mécaniques, l'un des deux paramètres pouvant être nul :

```
prime_DR = montant_fixe_minimum + prime_RC_ajustee × taux_DR_pct / 100
```

**Compagnie "forfait"** : `taux_DR_pct = 0`, `montant_fixe_minimum` porte la valeur.
**Compagnie "%RC"** : `montant_fixe_minimum = 0`, `taux_DR_pct` porte la valeur.

**Date de validité** : quand elle n'est pas mentionnée explicitement pour une ligne, c'est celle du bordereau actif de la compagnie qui s'applique — pas une date par défaut arbitraire.

### Barème complet, 20 compagnies + générique

| Compagnie | Montant fixe (FCFA) | Taux (%RC) | Catégories | Date de validité |
|---|---|---|---|---|
| ACTIVA | 0 | 2,5% | Toutes | Bordereau actif |
| AFG | 2 000 | 0 | Toutes | Bordereau actif |
| AFRINS | 2 000 | 0 | Toutes | Bordereau actif (corrigé 02/10/2026, source : tarif à lecture directe officiel) |
| AGC | 0 | 3% | Toutes | Bordereau actif |
| ALLIANZ | 0 | 3% | Toutes | Bordereau actif |
| AREA | 1 500 | 0 | Toutes | Bordereau actif |
| AUCUNE (générique) | 0 | 5% | Toutes, sauf 04A/04B/04C | Bordereau actif |
| AUCUNE (générique) | 2 000 | 0 | 04A, 04B, 04C uniquement | Bordereau actif |
| AXA | 1 500 | 0 | Toutes | Bordereau actif |
| BELIFE | 0 | 2,5% | Toutes | Bordereau actif |
| CHANAS | 3 500 | 0 | Toutes | Bordereau actif |
| CPA | 0 | 2,5% | Toutes | Bordereau actif |
| GMCSA | 0 | 2,5% | Toutes | Bordereau actif |
| LDASA | 1 500 | 0 | Toutes | Bordereau actif |
| NSIA | 0 | 2,5% | Toutes | Bordereau actif |
| PROASSUR | 1 000 | 0 | Cat.01 | Bordereau actif |
| PROASSUR | 1 500 | 0 | Cat.02, 03, 05, 05bis | Bordereau actif |
| PROASSUR | 0 | 3% | Cat.06, 07ARC, 07SRC, 08, 09A, 09B, 10A, 10B, 10C | Bordereau actif |
| ROYAL ONYX | 0 | 2,5% | Toutes | Bordereau actif |
| SAAR | 0 | 5% | Toutes | Bordereau actif |
| SAMIRIS | 0 | 2,5% | Toutes | Bordereau actif |
| SANLAM | 0 | 5% | Toutes | Bordereau actif |
| SUNU | 1 500 | 0 | Toutes | Bordereau actif |
| ZENITHE | 1 500 | 0 | Toutes | Bordereau actif |

**Particularité PROASSUR** : seule compagnie à faire varier le *mécanisme lui-même* (pas seulement la valeur) selon la catégorie — forfait pour les catégories "véhicules standards" (01-03, 05/05bis), pourcentage pour les catégories "à risque professionnel accru" (06 et au-delà). Confirmé par relecture directe du PDF source le 01/10/2026, taux 3% uniforme sur Cat.6-10 (corrigé depuis une lecture initiale erronée de 4/5/4/3/2%, confusion avec la ligne adjacente "Dommages Tous Accidents" du même tableau).

**Particularité AUCUNE (générique)** : seule entrée à distinguer les catégories 04A/B/C (forfait 2000) du reste du marché (5% RC) — reflète le POOL TPV, dont le tarif Transport de personnes suit une logique propre.


---

## Pilier 2 (v2.0) — IPT / IAC (Individuelle Personnes Transportées / Accidents Conducteur)

### Mécanisme

Décomposées en 3 sous-garanties indépendantes : Décès, Incapacité Permanente, Frais médicaux. IAC toujours en forfait fixe (par formule) ; IPT majoritairement en forfait par place (`montant_fixe_par_place × nombre_places_vehicule`), sauf AFG qui reste en forfait simple.

```
prime_composante = montant_fixe                              (IAC, toutes compagnies)
prime_composante = montant_fixe_par_place × nombre_places     (IPT, majorité des compagnies)
prime_IPT_ou_IAC_totale = prime_Deces + prime_IPP + prime_FraisMedicaux
```

**Important** : le numéro de formule n'est **pas comparable** d'une compagnie à l'autre — la formule 3 de PROASSUR n'a aucun rapport avec la formule 3 de SUNU. Chaque compagnie définit sa propre échelle d'options.

### IAC — barème complet (forfait, par compagnie et formule)

| Compagnie | Formule | Décès | Incapacité Perm. | Frais Médicaux |
|---|---|---|---|---|
| ACTIVA | 1 | 2000.00 | 2000.00 | 2600.00 |
| AFG | 1 | 2000.00 | 2000.00 | 2600.00 |
| ALLIANZ | 1 | 2000.00 | 2000.00 | 2600.00 |
| AREA | 1 | 2000.00 | 2000.00 | 2600.00 |
| BELIFE | 1 | 2000.00 | 2000.00 | 2600.00 |
| CHANAS | 1 | 2000.00 | 2000.00 | 2600.00 |
| CPA | 1 | 2000.00 | 2000.00 | 2600.00 |
| GMCSA | 1 | 2000.00 | 2000.00 | 2600.00 |
| LDASA | 1 | 2000.00 | 2000.00 | 2600.00 |
| NSIA | 1 | 2000.00 | 2000.00 | 2600.00 |
| PROASSUR | 1 | 2000.00 | 2000.00 | 2600.00 |
| ROYAL ONYX | 1 | 2000.00 | 2000.00 | 2600.00 |
| SUNU | 1 | 2000.00 | 2000.00 | 2600.00 |
| SUNU | 2 | 4000.00 | 2000.00 | 2600.00 |
| SUNU | 3 | 6000.00 | 3000.00 | 3900.00 |
| SUNU | 4 | 8000.00 | 4000.00 | 5200.00 |
**Particularité SUNU** : seule compagnie à proposer plusieurs formules IAC (4, contre 1 pour les 12 autres) — une vraie échelle progressive, pas un forfait unique.

### IPT — barème complet (par place, par compagnie et formule)

| Compagnie | Formule | Décès/place | IPP/place | Frais Médicaux/place |
|---|---|---|---|---|
| ACTIVA | 1 | 500.00 | 500.00 | 1050.00 |
| ACTIVA | 2 | 1000.00 | 1000.00 | 2100.00 |
| ACTIVA | 3 | 500.00 | 500.00 | - |
| AFG | 1 | 1500.00 | 1500.00 | 3450.00 |
| AFG | 2 | 750.00 | 750.00 | 1150.00 |
| AFG | 3 | 500.00 | 500.00 | - |
| AGC | 1 | 500.00 | 500.00 | - |
| AGC | 2 | 500.00 | 500.00 | 1050.00 |
| AGC | 3 | 1000.00 | 1000.00 | 2100.00 |
| ALLIANZ | 1 | 500.00 | 500.00 | 1500.00 |
| ALLIANZ | 2 | 1000.00 | 1000.00 | 3000.00 |
| ALLIANZ | 3 | 1500.00 | 1500.00 | 4500.00 |
| ALLIANZ | 4 | 2000.00 | 2000.00 | 6000.00 |
| ALLIANZ | 5 | 2500.00 | 2500.00 | 7500.00 |
| AREA | 1 | 500.00 | 500.00 | 1050.00 |
| AREA | 2 | 1000.00 | 1000.00 | 2100.00 |
| AREA | 3 | 500.00 | 500.00 | - |
| AUCUNE | 1 | 500.00 | 500.00 | 1050.00 |
| AUCUNE | 2 | 1000.00 | 1000.00 | 2100.00 |
| AUCUNE | 3 | 500.00 | 500.00 | - |
| BELIFE | 1 | 500.00 | 500.00 | 1050.00 |
| BELIFE | 2 | 1000.00 | 1000.00 | 2100.00 |
| BELIFE | 3 | 500.00 | 500.00 | - |
| CHANAS | 1 | 500.00 | 500.00 | 1050.00 |
| CHANAS | 2 | 1000.00 | 1000.00 | 2100.00 |
| CHANAS | 3 | 500.00 | 500.00 | - |
| CPA | 1 | 500.00 | 500.00 | 1050.00 |
| CPA | 2 | 1000.00 | 1000.00 | 2100.00 |
| CPA | 3 | 500.00 | 500.00 | - |
| GMCSA | 1 | 500.00 | 500.00 | 1050.00 |
| GMCSA | 2 | 1000.00 | 1000.00 | 2100.00 |
| GMCSA | 3 | 500.00 | 500.00 | - |
| LDASA | 1 | 500.00 | 500.00 | - |
| LDASA | 2 | 700.00 | 700.00 | 1100.00 |
| LDASA | 3 | 750.00 | 750.00 | 2500.00 |
| LDASA | 4 | 1450.00 | 1450.00 | 2500.00 |
| LDASA | 5 | 2000.00 | 2000.00 | 2500.00 |
| LDASA | 6 | 2500.00 | 2500.00 | 5500.00 |
| NSIA | 1 | 250.00 | 250.00 | 750.00 |
| NSIA | 2 | 500.00 | 500.00 | 1500.00 |
| NSIA | 3 | 1000.00 | 1000.00 | 1500.00 |
| NSIA | 4 | 2000.00 | 2000.00 | 1500.00 |
| NSIA | 5 | 2000.00 | 2000.00 | 3000.00 |
| NSIA | 6 | 2500.00 | 2500.00 | 7500.00 |
| PROASSUR | 1 | 250.00 | 250.00 | 1000.00 |
| PROASSUR | 2 | 1000.00 | 1000.00 | 1500.00 |
| PROASSUR | 3 | 1250.00 | 1250.00 | 3000.00 |
| PROASSUR | 4 | 2000.00 | 2000.00 | 6000.00 |
| PROASSUR | 5 | 3000.00 | 3000.00 | 9000.00 |
| PROASSUR | 6 | 4000.00 | 4000.00 | 12000.00 |
| PROASSUR | 7 | 5000.00 | 5000.00 | 15000.00 |
| ROYAL ONYX | 1 | 375.00 | 375.00 | 250.00 |
| ROYAL ONYX | 2 | 500.00 | 500.00 | 500.00 |
| ROYAL ONYX | 3 | 1000.00 | 500.00 | 1000.00 |
| ROYAL ONYX | 4 | 1070.00 | 1070.00 | 1500.00 |
| ROYAL ONYX | 5 | 1500.00 | 1500.00 | 2000.00 |
| ROYAL ONYX | 6 | 1774.00 | 1774.00 | 2500.00 |
| SAAR | 1 | 500.00 | 500.00 | 1050.00 |
| SAAR | 2 | 500.00 | 500.00 | - |
| SAAR | 3 | 1000.00 | 1000.00 | 1000.00 |
| SAAR | 4 | 2000.00 | 2000.00 | 2000.00 |
| SANLAM | 1 | 500.00 | 500.00 | 1050.00 |
| SANLAM | 2 | 1000.00 | 1000.00 | 2100.00 |
| SANLAM | 3 | 500.00 | 500.00 | - |
| SUNU | 1 | 500.00 | 500.00 | - |
| SUNU | 2 | 500.00 | 500.00 | 1050.00 |
| SUNU | 3 | 1000.00 | 1000.00 | 2100.00 |
| SUNU | 4 | 1500.00 | 1500.00 | 3150.00 |
**Lacunes de données constatées** (cases "-") : plusieurs compagnies (ACTIVA, AFG, AGC, AREA, AUCUNE, BELIFE, CHANAS, CPA, GMCSA, SAAR, SANLAM, SUNU formule 1, LDASA formule 1) n'ont pas de valeur Frais Médicaux renseignée pour au moins une formule — à vérifier si c'est une vraie absence de couverture à cette formule (type "Sans FM") ou un oubli de saisie.

**Anomalie potentielle — ROYAL ONYX, formule 3** : Décès=1000 mais Incapacité Permanente=500 — rupture de parité avec les autres formules de la même compagnie (où Décès=IPP systématiquement). À vérifier.

**Lacune — AFRINS** : aucune ligne IPT/IAC en base pour AFRINS (comme pour AXA, ZENITHE et SAMIRIS ; 17 compagnies seulement sont renseignées). Son tarif à lecture directe indique pourtant une IPT forfaitaire : 7 500 FCFA en Cat.1 et 2, 5 000 FCFA en Cat.3 et 5A (504 lignes lues, aucune exception). Consigné au registre (#12).


---


---

## Pilier 2 (v2.0) — Dommages, Vol, Incendie, Bris de glaces

### Mécanisme générique

```
prime = valeur_assuree × taux_pct / 100
```

Lecture directe par (compagnie, sous-garantie, catégorie) — chaque sous-garantie reste indépendante, jamais de calcul dérivé d'une autre.

### Loi structurelle confirmée — Vol Partiel = Vol Braquage

```
taux_Vol_Partiel = taux_Vol_Braquage, dans toutes les catégories où les deux existent
```
Vérifié exhaustivement sur les deux compagnies ayant des taux complets (PROASSUR : 5/5 catégories où les deux sont définies ; ROYAL ONYX : 7/7) — **aucune exception**. Règle métier réelle, pas une coïncidence : les deux risques sont tarifés de façon identique.

**Pas de loi trouvée** entre Dommages/Tierce et Vol véhicule (ratio variant de 2,0 à 7,5 selon la catégorie chez PROASSUR — pas de relation constante exploitable).

### Matrice de couverture — qui a des taux pour quelle garantie

| Compagnie | Dommages | Tierce | Vol véh. | Vol part. | Vol braq. | Vol acc. | Brigand. | Incendie | Bris gl. | Bris BF |
|---|---|---|---|---|---|---|---|---|---|---|
| ACTIVA | — | — | — | — | — | ✓ | — | — | — | — |
| AFG | — | — | — | — | — | ✓ | — | — | — | — |
| ALLIANZ | — | — | — | — | — | ✓ | — | — | — | — |
| AREA | — | — | — | — | — | ✓ | — | — | — | — |
| AUCUNE (générique) | — | ✓ | ✓ | — | — | ✓ | ✓ | ✓ | ✓ | — |
| BELIFE | — | — | — | — | — | ✓ | — | — | — | — |
| CHANAS | — | — | — | — | — | ✓ | — | — | — | — |
| CPA | — | — | — | — | — | ✓ | ✓ | — | — | — |
| GMCSA | — | — | — | — | — | ✓ | — | — | — | — |
| LDASA | — | — | — | — | — | — | ✓ | — | — | — |
| NSIA | — | — | — | — | — | ✓ | — | — | — | — |
| **PROASSUR** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| **ROYAL ONYX** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | — | ✓ |
| SAAR | — | — | — | — | — | ✓ | ✓ | — | — | — |
| SANLAM | — | — | — | — | — | ✓ | — | — | — | — |
| SUNU | — | — | ✓ | ✓ | ✓ | — | — | — | — | — |

**Priorité de complétion suggérée par cette matrice** : Dommages/Tierce/Incendie n'existent nulle part ailleurs que PROASSUR, ROYAL ONYX et le générique — 13 compagnies sur 16 présentes dans ce tableau n'ont aucun taux sur ces trois garanties pourtant centrales.

### Dommages par accident (fusionnée avec l'ex-Tierce Collision)
| Compagnie | Catégorie | Taux |
|---|---|---|
| PROASSUR | 01 | 2.5% |
| PROASSUR | 02 | 3% |
| PROASSUR | 03 | 3.5% |
| PROASSUR | 06 | 4% |
| PROASSUR | 07ARC | 5% |
| PROASSUR | 07SRC | 5% |
| PROASSUR | 08 | 4% |
| PROASSUR | 09A | 3% |
| PROASSUR | 09B | 3% |
| PROASSUR | 10A | 2% |
| PROASSUR | 10B | 2% |
| PROASSUR | 10C | 2% |
| ROYAL ONYX | 02 | 3.5% |
| ROYAL ONYX | 03 | 4% |
| ROYAL ONYX | 04A | 8% |
| ROYAL ONYX | 04C | 8% |
| ROYAL ONYX | 07ARC | 3.75% |
| ROYAL ONYX | 07SRC | 3.75% |
| ROYAL ONYX | 08 | 4% |
| ROYAL ONYX | 09A | 2.5% |
| ROYAL ONYX | 09B | 2.5% |
| ROYAL ONYX | 10A | 10% |
| ROYAL ONYX | 10B | 10% |
| ROYAL ONYX | 10C | 10% |

### Tierce collision (ex-Tierce, nom conservé)

| Compagnie | Catégorie | Taux |
|---|---|---|
| AUCUNE | 04A | 4% |
| AUCUNE | 04B | 4% |
| AUCUNE | 04C | 4% |
| PROASSUR | 01 | 2% |
| PROASSUR | 02 | 2% |
| PROASSUR | 03 | 2% |
| PROASSUR | 06 | 3% |
| PROASSUR | 07ARC | 3% |
| PROASSUR | 07SRC | 3% |
| PROASSUR | 08 | 3.25% |
| PROASSUR | 09A | 1.95% |
| PROASSUR | 09B | 1.95% |
| PROASSUR | 10A | 2% |
| PROASSUR | 10B | 2% |
| PROASSUR | 10C | 2% |
| ROYAL ONYX | 02 | 2.5% |
| ROYAL ONYX | 03 | 3% |
| ROYAL ONYX | 04A | 4% |
| ROYAL ONYX | 04C | 4% |
| ROYAL ONYX | 07ARC | 3.75% |
| ROYAL ONYX | 07SRC | 3.75% |
| ROYAL ONYX | 08 | 3.5% |
| ROYAL ONYX | 09A | 1.5% |
| ROYAL ONYX | 09B | 1.5% |
| ROYAL ONYX | 10A | 7% |
| ROYAL ONYX | 10B | 7% |
| ROYAL ONYX | 10C | 7% |

### Vol véhicule

| Compagnie | Catégorie | Taux |
|---|---|---|
| AUCUNE | 04A | 2% |
| AUCUNE | 04B | 2% |
| AUCUNE | 04C | 2% |
| PROASSUR | 01 | 1% |
| PROASSUR | 02 | 1% |
| PROASSUR | 03 | 1% |
| PROASSUR | 06 | 1.5% |
| PROASSUR | 07ARC | 1.5% |
| PROASSUR | 07SRC | 1.5% |
| PROASSUR | 08 | 1% |
| PROASSUR | 09A | 0.4% |
| PROASSUR | 09B | 0.4% |
| PROASSUR | 10A | 1% |
| PROASSUR | 10B | 1% |
| PROASSUR | 10C | 1% |
| ROYAL ONYX | 02 | 1% |
| ROYAL ONYX | 03 | 1% |
| ROYAL ONYX | 04A | 1.5% |
| ROYAL ONYX | 04C | 1.5% |
| ROYAL ONYX | 07ARC | 1% |
| ROYAL ONYX | 07SRC | 1% |
| ROYAL ONYX | 08 | 1.5% |
| SUNU | ALL | 1.5% |

### Vol partiel

| Compagnie | Catégorie | Taux |
|---|---|---|
| PROASSUR | 01 | 0.5% |
| PROASSUR | 02 | 0.5% |
| PROASSUR | 03 | 0.5% |
| PROASSUR | 06 | 1% |
| PROASSUR | 07ARC | 1% |
| PROASSUR | 07SRC | 1% |
| PROASSUR | 08 | 0.5% |
| PROASSUR | 09A | 0.35% |
| PROASSUR | 09B | 0.35% |
| PROASSUR | 10A | 0.5% |
| PROASSUR | 10B | 0.5% |
| PROASSUR | 10C | 0.5% |
| ROYAL ONYX | 02 | 0.5% |
| ROYAL ONYX | 03 | 0.5% |
| ROYAL ONYX | 04A | 0.5% |
| ROYAL ONYX | 04C | 0.5% |
| ROYAL ONYX | 07ARC | 0.5% |
| ROYAL ONYX | 07SRC | 0.5% |
| ROYAL ONYX | 08 | 0.5% |
| SUNU | ALL | 0.25% |

### Vol braquage

| Compagnie | Catégorie | Taux |
|---|---|---|
| PROASSUR | 01 | 0.5% |
| PROASSUR | 02 | 0.5% |
| PROASSUR | 03 | 0.5% |
| PROASSUR | 06 | 1% |
| ROYAL ONYX | 02 | 0.5% |
| ROYAL ONYX | 03 | 0.5% |
| ROYAL ONYX | 04A | 0.5% |
| ROYAL ONYX | 04C | 0.5% |
| ROYAL ONYX | 07ARC | 0.5% |
| ROYAL ONYX | 07SRC | 0.5% |
| ROYAL ONYX | 08 | 0.5% |
| SUNU | ALL | 0.5% |

### Vol des accessoires

| Compagnie | Catégorie | Taux |
|---|---|---|
| ACTIVA | ALL | 0.5% |
| AFG | ALL | 0% |
| ALLIANZ | ALL | 0.5% |
| AREA | ALL | 0.7% |
| AUCUNE | ALL | 2.5% |
| BELIFE | ALL | 0.7% |
| CHANAS | ALL | 2.5% |
| CPA | ALL | 0% |
| GMCSA | ALL | 0.7% |
| NSIA | ALL | 2.5% |
| PROASSUR | ALL | 2.5% |
| ROYAL ONYX | ALL | 0.7% |
| SAAR | ALL | 0.7% |
| SANLAM | ALL | 0.7% |

### Brigandage

| Compagnie | Catégorie | Taux |
|---|---|---|
| AUCUNE | ALL | 1.2% |
| CPA | ALL | 0.5% |
| LDASA | ALL | 1.5% |
| SAAR | ALL | 1% |

### Incendie

| Compagnie | Catégorie | Taux |
|---|---|---|
| AUCUNE | 04A | 0.25% |
| AUCUNE | 04B | 0.25% |
| AUCUNE | 04C | 0.25% |
| PROASSUR | 01 | 0.18% |
| PROASSUR | 02 | 0.22% |
| PROASSUR | 03 | 0.24% |
| PROASSUR | 06 | 0.24% |
| PROASSUR | 07ARC | 0.24% |
| PROASSUR | 07SRC | 0.24% |
| PROASSUR | 08 | 0.24% |
| PROASSUR | 09A | 0.35% |
| PROASSUR | 09B | 0.35% |
| PROASSUR | 10A | 0.25% |
| PROASSUR | 10B | 0.25% |
| PROASSUR | 10C | 0.25% |
| ROYAL ONYX | 02 | 2.4% |
| ROYAL ONYX | 03 | 0.24% |
| ROYAL ONYX | 04A | 0.25% |
| ROYAL ONYX | 04C | 0.25% |
| ROYAL ONYX | 07ARC | 0.24% |
| ROYAL ONYX | 07SRC | 0.24% |
| ROYAL ONYX | 08 | 0.24% |
| ROYAL ONYX | 09A | 0.37% |
| ROYAL ONYX | 09B | 0.37% |
| ROYAL ONYX | 10A | 0.5% |
| ROYAL ONYX | 10B | 0.5% |
| ROYAL ONYX | 10C | 0.5% |

### Bris de glaces

| Compagnie | Catégorie | Taux |
|---|---|---|
| AUCUNE | 04A | 0.5% |
| AUCUNE | 04B | 0.5% |
| AUCUNE | 04C | 0.5% |
| PROASSUR | 01 | 0.3% |
| PROASSUR | 02 | 0.3% |
| PROASSUR | 03 | 0.4% |
| PROASSUR | 06 | 0.5% |
| PROASSUR | 07ARC | 0.5% |
| PROASSUR | 07SRC | 0.5% |
| PROASSUR | 08 | 0.5% |
| PROASSUR | 10A | 0.5% |
| PROASSUR | 10B | 0.5% |
| PROASSUR | 10C | 0.5% |

### Bris de glaces et blocs feux (garantie distincte)

| Compagnie | Catégorie | Taux |
|---|---|---|
| PROASSUR | 01 | 0.6% |
| PROASSUR | 02 | 0.6% |
| PROASSUR | 03 | 0.6% |
| PROASSUR | 06 | 0.9% |
| PROASSUR | 07ARC | 0.9% |
| PROASSUR | 07SRC | 0.9% |
| PROASSUR | 08 | 0.9% |
| PROASSUR | 10A | 0.9% |
| PROASSUR | 10B | 0.9% |
| PROASSUR | 10C | 0.9% |
| ROYAL ONYX | 02 | 0.3% |
| ROYAL ONYX | 03 | 0.3% |
| ROYAL ONYX | 04A | 0.5% |
| ROYAL ONYX | 04C | 0.5% |
| ROYAL ONYX | 08 | 0.3% |
| ROYAL ONYX | 09A | 1% |
| ROYAL ONYX | 09B | 1% |
| ROYAL ONYX | 10A | 1% |
| ROYAL ONYX | 10B | 1% |
| ROYAL ONYX | 10C | 1% |---


---

## Pilier 2 (v2.0) — `equivalence_garantie` / `offre_commerciale`

### Le problème que cette architecture résout

Chaque compagnie nomme ses garanties à sa façon ("Protection circulation", "Assistance Auto", "RC/RTI"...) — jamais le code canonique. Sans rattachement explicite, impossible de savoir que ces libellés désignent la même chose d'une compagnie à l'autre, ou de générer un écran de cotation lisible pour le client.

### `equivalence_garantie` — le dictionnaire des dénominations réelles

```
Une ligne = (compagnie, dénomination réelle) → sous-garantie canonique
```

Contrainte d'unicité sur `(garantie_code, id_compagnie, denomination)` — deux compagnies peuvent légitimement partager un même mot courant ("Vol véhicule") sans se bloquer mutuellement.

**État actuel** : 385 dénominations réelles, dont 14 génériques (niveau POOL/AUCUNE, sans compagnie précise), couvrant 20 des 21 entrées de la table `compagnie` (générique AUCUNE incluse).

### `equivalence_garantie_sous_garantie` — la composition des bouquets

Certaines dénominations couvrent **plusieurs** sous-garanties à la fois (IPT, IAC, RC — "Protection circulation Avec FM" = Décès + IPP + Frais médicaux en une seule fois). `equivalence_garantie.garantie_code` reste la sous-garantie "principale" (référence d'affichage simple) ; cette table de liaison porte la composition complète.

```
prime_bouquet_totale = Σ prime_composante, pour chaque sous-garantie liée dans equivalence_garantie_sous_garantie
```

**État actuel** : 616 liens, couvrant les 385 dénominations (1 lien pour une dénomination simple, 2-3 pour un bouquet).

### `offre_commerciale` — le catalogue qui porte le vrai nom

Point de jonction entre une compagnie, une sous-garantie, et sa dénomination réelle (via `id_equivalence_garantie`). `tarif.id_offre_commerciale` est la seule vraie clé de regroupement pour une ligne tarifaire — les anciennes colonnes (`id_compagnie`/`id_garantie`/`id_sous_garantie`/`garantie_code` sur `tarif`) restent en doublon volontaire, retrait prévu après confiance éprouvée.

**État actuel** : 300 offres commerciales, dont 103 rattachées à une dénomination réelle confirmée (le reste porte un libellé "PLACEHOLDER" généré automatiquement en Phase 4, faute de dénomination connue — pas une vraie valeur commerciale). `tarif.id_offre_commerciale` couvre 100% des 343 lignes tarifaires (Phases 4-5, 02/10/2026).

**Dette explicite** : 197 offres encore sur un libellé générique plutôt qu'une vraie dénomination compagnie — pas une anomalie de calcul (le tarif reste juste), mais un écran de cotation basé dessus afficherait un nom provisoire, pas le vrai nom commercial.


---


---

## Pilier 2 (v3.0) — Composition de la Prime TTC et écosystème de souscription

### 3.1 — Rubriques de la Prime TTC et formule d'assemblage

Établie et vérifiée sur le tarif à lecture directe AFRINS : **504 lignes sur 504 conformes** (à ±1 FCFA près, arrondi), plus 3 lignes de la fiche Cat.4A (format 3/6/12 mois). Source unique à ce jour pour la structure complète d'une Prime TTC ; le taux de TVA est recoupé par deux autres fichiers (voir 3.6).

```
Prime nette de la période = coefficient_durée × (RC + DR + IPT/IAC annuels)   [+ garanties facultatives souscrites]
Assiette de TVA           = Prime nette + Accessoires + Fichier central
TVA                       = 19,25 % × Assiette de TVA
Prime TTC                 = Prime nette + Accessoires + Fichier central + TVA + Carte rose
```

- **Accessoires, Fichier central, Carte rose** : montants fixes par contrat, **non proratisés** selon la durée (AFRINS : mêmes valeurs à 60, 120, 180, 240 et 365 jours).
- **Carte rose** : hors assiette de TVA (vérifié sur 504 lignes).
- **DTA** : absent de la Prime TTC dans les tarifs AFRINS, qui l'indiquent à part (« à ajouter au besoin »). Sa nature exacte (taxe d'État collectée via le contrat et non reversée à l'assureur) est une **hypothèse non sourcée dans nos données — à confirmer**.
- **Garanties facultatives** : le tarif AFRINS ne contient que RC + DR + IPT. Que Dommages, Vol, etc. entrent dans la prime nette et dans l'assiette de TVA de la même façon est une **hypothèse — à confirmer**.
- **Autres compagnies** : cette formule n'est vérifiée que sur AFRINS. Aucun autre tarif à lecture directe ne nous a été fourni.

### 3.1bis — Durée du contrat et prime nette (coefficients de court terme)

Observé dans le tarif AFRINS, Cat.1, 2 et 3 (90 lignes par durée, 100 % conformes) :

| Durée | Coefficient appliqué à (RC + DR + IPT) annuels |
|---|---|
| 60 jours (2 mois) | 20 % |
| 120 jours (4 mois) | 40 % |
| 180 jours (6 mois) | 60 % |
| 240 jours (8 mois) | 80 % |
| 365 jours (1 an) | 100 % |

Fiche Cat.4A (format Pool TPV) : 3 mois = 25 %, 6 mois = 50 %, 12 mois = 100 % (3 valeurs vérifiées). Cat.5A : prime annuelle seulement.

Ce n'est **pas** un prorata au jour (60/365 = 16,4 %, et non 20 %). **À confirmer** : s'agit-il d'un barème réglementaire de court terme ou d'une convention propre à AFRINS ? Tant que ce n'est pas établi, la règle 10 s'applique : elle n'est pas généralisée aux autres compagnies. Cette notion de durée est la même que celle qui borne les paliers d'accessoires (3.2).

### 3.2 — Accessoires (`bareme_accessoire`)

**Algorithme conceptuel** (pas le code — la règle elle-même) :

```
accessoire = f(compagnie, branche, catégorie, prime_nette, durée_contrat)
```

Le montant retenu dépend de deux paliers combinés :
- **Palier de prime** : soit un seuil unique ("à partir de X FCFA de prime nette"), soit une plage (prime nette entre X et Y)
- **Palier de durée** : la durée du contrat peut elle-même restreindre quel palier de prime s'applique

Le palier le plus spécifique l'emporte (compagnie+catégorie précise avant compagnie seule, durée précisée avant durée libre) — même logique de spécificité que RC (Pilier 2.1, v1.0).

**Valeurs observées chez AFRINS** : 2 500 FCFA sur 500 lignes sur 504, indépendamment de la durée, de la zone et de la tranche de puissance. Quatre lignes à 3 150 FCFA (anomalie #11). En Cat.4A, la fiche présente « Accessoires + Fichier ASAC » ensemble (3 000 FCFA) sans les décomposer.

**État des données en base** : table peuplée pour plusieurs compagnies, non auditée exhaustivement dans cette version.

### 3.3 — Fichier central (ASAC)

**Valeurs observées chez AFRINS** : 1 000 FCFA en Cat.1, 2 et 3 (450 lignes) ; 500 FCFA en Cat.5A (54 lignes) ; montant fixe par contrat, non proratisé selon la durée ; il entre dans l'assiette de TVA (vérifié). En Cat.4A il est présenté avec les accessoires (3 000 FCFA au total, non décomposé).

**Aucune table dédiée dans notre schéma.** Source unique : le tarif à lecture directe AFRINS. Qui fixe ce montant et selon quelle règle (catégorie, compagnie, date) n'est pas établi — **à confirmer**. *(Correction : une version antérieure indiquait « 1 000 à 1 500 FCFA », valeur inexacte.)*

### 3.4 — Carte rose

**Fonction** *(à confirmer — définition issue de la connaissance générale du métier, non sourcée dans nos données)* : attestation de couverture RC pour circuler en zone CEMAC hors du pays d'immatriculation, pendant commercial de la sous-garantie `AUTO_RC__EXTENSION_CEMAC`.

**Calcul observé chez AFRINS** : forfait de 1 000 FCFA sur les 504 lignes lues, quelles que soient la catégorie, la zone et la durée ; hors assiette de TVA. Aucune autre compagnie vérifiée, aucune table dédiée dans notre schéma.

### 3.5 — DTA (Droit de Timbre Automobile)

Table source : `site.bareme_dta` (schéma `site`, propriété historique de Production & Souscription — lu ici comme référence, jamais modifié depuis cette session). Structure par (genre de véhicule, catégorie, tranche CV, période de validité) — **conçue nativement pour historiser les changements réglementaires dans le temps**, exactement ce que cette section du RUT doit documenter.

**Lacune découverte en construisant cette section** : la distinction par cylindrée pour les motos/tricycles (genre MOTO2/MOTO3), visible dans le barème CIMA général (AFRINS : 2-7CV=30000, 8-13CV=50000...), **n'existe pas** dans `site.bareme_dta` — un seul montant par genre, toutes cylindrées confondues. Soit une autre source la porte, soit elle n'a jamais été saisie. Non résolu dans cette version — exactement le genre de trou que le RUT est fait pour révéler, pas pour cacher.

**⚠️ Correction (Roger, 03/10/2026)** : la phrase ci-dessous, présente dans une version antérieure de ce document, était une **erreur d'interprétation** — conservée biffée pour traçabilité, pas effacée silencieusement.

~~Évolution structurelle découverte : avant 2023, le DTA suivait un barème général unique, indépendant de la catégorie CIMA. À partir du 01/01/2023, chaque catégorie a son propre barème par tranche de force fiscale — changement réglementaire réel, pas une incohérence de nos données.~~

**Ce qui est réellement arrivé** : les lignes "par catégorie, 2023" ne sont pas un nouveau barème réglementaire — ce sont des valeurs reprises d'un **tarif à lecture directe** (AFRINS), qui relit simplement le barème général ministériel compagnie par catégorie, pour la commodité de lecture. Une valeur issue d'un tarif à lecture directe **ne doit générer un nouvel enregistrement dans `bareme_dta` que si elle contredit le barème général ministériel** — si elle y correspond, elle n'apporte aucune valeur distinctive et n'a pas lieu d'exister comme ligne séparée. `site.bareme_dta` contient actuellement cette redondance, non intentionnelle.

**Conséquence** : `site.bareme_dta` sera purgée de ces doublons. Cette session ("Mise en place du RUT") ne modifie pas le système de tarification — seule la cartographie de l'état actuel est faite ici, la purge revient à la session/équipe propriétaire de cette table.

### Barème DTA complet, véhicules (`site.bareme_dta`, source : `site`, historisée)


**Barème général (sans distinction de catégorie, 2017-2022)**

| CV min | CV max | Montant (FCFA) | Du | Au | Référence |
|---|---|---|---|---|---|
| 0 | 7 | 15 000 | 2017-01-01 | 2019-12-31 | DTA_utf8.csv, réf. 3 |
| 0 | 7 | 15 000 | 2020-01-01 | 2022-12-31 | DTA_utf8.csv, réf. 9 |
| 8 | 13 | 25 000 | 2017-01-01 | 2019-12-31 | DTA_utf8.csv, réf. 4 |
| 8 | 13 | 25 000 | 2020-01-01 | 2022-12-31 | DTA_utf8.csv, réf. 10 |
| 14 | 20 | 50 000 | 2017-01-01 | 2019-12-31 | DTA_utf8.csv, réf. 5 |
| 14 | 20 | 50 000 | 2020-01-01 | 2022-12-31 | DTA_utf8.csv, réf. 11 |
| 21 | — | 100 000 | 2017-01-01 | 2019-12-31 | DTA_utf8.csv, réf. 6 |
| 21 | — | 100 000 | 2020-01-01 | 2020-12-31 | DTA_utf8.csv, réf. 12 |
| 21 | — | 150 000 | 2021-01-01 | 2022-12-31 | DTA_utf8.csv, réf. 14 |

**Catégorie 01**

| CV min | CV max | Montant (FCFA) | Du | Au | Référence |
|---|---|---|---|---|---|
| 0 | 1 | 0 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 38 |
| 2 | 7 | 30 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 39 |
| 8 | 13 | 50 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 40 |
| 14 | 20 | 75 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 41 |
| 21 | — | 200 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 42 |

**Catégorie 02**

| CV min | CV max | Montant (FCFA) | Du | Au | Référence |
|---|---|---|---|---|---|
| 0 | 1 | 0 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 43 |
| 2 | 7 | 30 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 44 |
| 8 | 13 | 50 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 45 |
| 14 | 20 | 75 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 46 |
| 21 | — | 200 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 47 |

**Catégorie 03**

| CV min | CV max | Montant (FCFA) | Du | Au | Référence |
|---|---|---|---|---|---|
| 0 | 1 | 0 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 17 |
| 2 | 7 | 15 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 18 |
| 8 | 13 | 25 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 19 |
| 14 | 20 | 50 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 22 |
| 21 | — | 150 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 20 |

**Catégorie 04A**

| CV min | CV max | Montant (FCFA) | Du | Au | Référence |
|---|---|---|---|---|---|
| 0 | 1 | 0 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 23 |
| 2 | 7 | 15 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 24 |
| 8 | 13 | 25 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 25 |
| 14 | 20 | 50 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 26 |
| 21 | — | 150 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 27 |

**Catégorie 04B**

| CV min | CV max | Montant (FCFA) | Du | Au | Référence |
|---|---|---|---|---|---|
| 0 | 1 | 0 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 28 |
| 2 | 7 | 15 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 29 |
| 8 | 13 | 25 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 30 |
| 14 | 20 | 50 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 31 |
| 21 | — | 150 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 32 |

**Catégorie 04C**

| CV min | CV max | Montant (FCFA) | Du | Au | Référence |
|---|---|---|---|---|---|
| 0 | 1 | 0 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 33 |
| 2 | 7 | 30 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 34 |
| 8 | 13 | 50 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 35 |
| 14 | 20 | 75 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 36 |
| 21 | — | 200 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 37 |

**Catégorie 05**

| CV min | CV max | Montant (FCFA) | Du | Au | Référence |
|---|---|---|---|---|---|
| 0 | 1 | 0 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 48 |
| 2 | 7 | 30 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 49 |
| 8 | 13 | 50 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 50 |
| 14 | 20 | 75 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 51 |
| 21 | — | 200 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 52 |

**Catégorie 05bis**

| CV min | CV max | Montant (FCFA) | Du | Au | Référence |
|---|---|---|---|---|---|
| 0 | 1 | 0 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 53 |
| 2 | 7 | 30 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 54 |
| 8 | 13 | 50 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 55 |
| 14 | 20 | 75 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 56 |
| 21 | — | 200 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 57 |

**Catégorie 06**

| CV min | CV max | Montant (FCFA) | Du | Au | Référence |
|---|---|---|---|---|---|
| 0 | 1 | 0 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 58 |
| 2 | 7 | 30 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 59 |
| 8 | 13 | 50 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 60 |
| 14 | 20 | 75 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 61 |
| 21 | — | 200 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 62 |

**Catégorie 07ARC**

| CV min | CV max | Montant (FCFA) | Du | Au | Référence |
|---|---|---|---|---|---|
| 0 | 1 | 0 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 68 |
| 2 | 7 | 30 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 69 |
| 8 | 13 | 50 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 70 |
| 14 | 20 | 75 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 71 |
| 21 | — | 200 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 72 |

**Catégorie 07SRC**

| CV min | CV max | Montant (FCFA) | Du | Au | Référence |
|---|---|---|---|---|---|
| 0 | 1 | 0 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 73 |
| 2 | 7 | 30 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 74 |
| 8 | 13 | 50 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 75 |
| 14 | 20 | 75 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 76 |
| 21 | — | 200 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 77 |

**Catégorie 08**

| CV min | CV max | Montant (FCFA) | Du | Au | Référence |
|---|---|---|---|---|---|
| 0 | 1 | 0 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 78 |
| 2 | 7 | 30 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 79 |
| 8 | 13 | 50 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 80 |
| 14 | 20 | 75 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 81 |
| 21 | — | 200 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 82 |

**Catégorie 09A**

| CV min | CV max | Montant (FCFA) | Du | Au | Référence |
|---|---|---|---|---|---|
| — | — | 200 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 113 |

**Catégorie 09B**

| CV min | CV max | Montant (FCFA) | Du | Au | Référence |
|---|---|---|---|---|---|
| 0 | 1 | 0 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 83 |
| 2 | 7 | 30 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 84 |
| 8 | 13 | 50 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 85 |
| 14 | 20 | 75 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 86 |
| 21 | — | 200 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 87 |

**Catégorie 10A**

| CV min | CV max | Montant (FCFA) | Du | Au | Référence |
|---|---|---|---|---|---|
| 0 | 1 | 0 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 88 |
| 2 | 7 | 30 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 89 |
| 8 | 13 | 50 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 90 |
| 14 | 20 | 75 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 91 |
| 21 | — | 200 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 92 |

**Catégorie 10B**

| CV min | CV max | Montant (FCFA) | Du | Au | Référence |
|---|---|---|---|---|---|
| 0 | 1 | 0 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 93 |
| 2 | 7 | 30 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 94 |
| 8 | 13 | 50 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 95 |
| 14 | 20 | 75 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 96 |
| 21 | — | 200 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 97 |

**Catégorie 10C**

| CV min | CV max | Montant (FCFA) | Du | Au | Référence |
|---|---|---|---|---|---|
| 0 | 1 | 0 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 98 |
| 2 | 7 | 30 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 99 |
| 8 | 13 | 50 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 100 |
| 14 | 20 | 75 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 101 |
| 21 | — | 200 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 102 |

### Barème DTA, motos/tricycles (`site.bareme_dta`)

| Genre | Montant (FCFA) | Du | Au | Référence |
|---|---|---|---|---|
| MOTO2 | 2 000 | 2017-01-01 | 2019-12-31 | DTA_utf8.csv, réf. 1 |
| MOTO2 | 10 000 | 2020-01-01 | 2022-12-31 | DTA_utf8.csv, réf. 7 |
| MOTO2 | 10 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 15 |
| MOTO3 | 5 000 | 2017-01-01 | 2019-12-31 | DTA_utf8.csv, réf. 2 |
| MOTO3 | 15 000 | 2020-01-01 | 2022-12-31 | DTA_utf8.csv, réf. 8 |
| MOTO3 | 30 000 | 2023-01-01 | 2099-12-31 | DTA_utf8.csv, réf. 16 |

### 3.6 — TVA et fiscalité

**Taux : 19,25 %**, établi par trois sources indépendantes :

| Source | Constat |
|---|---|
| Tarif à lecture directe AFRINS | TVA = 19,25 % × (prime nette + accessoires + Fichier central) sur 504 lignes sur 504, et sur 3 lignes de la fiche Cat.4A (écart maximal 0,4 FCFA) |
| `Tarif_automobile_automatisé.csv` (GMCSA) | Colonne « Taux Taxes » = 19,25 % sur 5 112 lignes sur 5 112 |
| `Offre_commerciale_autre_source.csv` | Colonne `Taux_TVA` = 19,25 sur 1 170 lignes (35 sans valeur), avec un `Code_Taxe` par branche (code 2 sur 162 lignes, correspondant au nombre de lignes de la branche Automobile) |

**Assiette** : prime nette + accessoires + Fichier central. Carte rose et DTA sont exclus.

**Réserves** :
- `Garanties_canoniques.csv` porte une colonne « Taux Taxes » à 0,00 % sur 244 lignes : sens à clarifier (peut-être une autre taxe).
- La colonne `Taux_TCA` de `Offre_commerciale_autre_source.csv` vaut 0,00 sur toutes les lignes : aucune TCA n'apparaît dans cette source — à confirmer.
- Aucune historisation du taux de TVA n'est disponible (date d'entrée en vigueur, évolutions). Le RUT reste ouvert pour la consigner.
- `tarification.taux_fiscalite` ne contient qu'une ligne illustrative : la valeur réelle est connue du RUT, mais pas encore de la base.
- Piège de lecture rencontré : ce dernier fichier contient deux colonnes nommées `Taux_TVA` (la première à 0,00, la seconde à 19,25). Une lecture par nom de colonne ne voit que l'une des deux.

### 3.7 — Formules de souscription admises par compagnie

**Ce qui existe, déjà documenté (v2.0)** : les formules IPT/IAC — un numéro de formule par compagnie, jamais comparable d'une compagnie à l'autre (Pilier 2 v2.0, section IPT/IAC).

**Ce qui n'existe pas encore** : le "Produit" commercial transversal (Essentiel/Classique/Confort/Premium ou équivalent), qui combine plusieurs garanties en un seul choix pour le client — identifié comme chantier non résolu depuis le cahier des charges du 01/10/2026, toujours sans modèle de données ni donnée réelle à ce jour. C'est, de l'aveu même de Roger, la section la plus importante du RUT — et c'est celle où le système en sait le moins aujourd'hui.

### 3.8 — Directives de souscription par compagnie

**Non renseigné.** Aucune donnée disponible sur les règles d'acceptation, de refus, de zones couvertes ou de pièces exigées par compagnie — ni en base, ni fournie à cette session à ce jour. Lacune assumée depuis le v1.0 (Pilier 2.2), toujours ouverte.

### Ce que cette section ne peut pas encore garantir

L'objectif annoncé — calculer une Prime TTC comparable entre compagnies sur un contrat multi-garanties — est **atteint pour AFRINS sur RC + DR + IPT** (structure complète vérifiée sur 504 lignes), et **pas encore pour les autres compagnies** : Fichier central, Carte rose, accessoires et coefficients de durée ne sont connus que par AFRINS. Le taux de TVA (19,25 %) et le DTA (table `site`) sont connus. Le Produit transversal et les directives de souscription n'ont aucune donnée. Le RUT rend ce manque visible plutôt que de laisser croire à une comparabilité qui n'existe pas encore dans les données.


---

## Pilier 3 — Mémoire : décisions et justifications

| Date | Décision | Justification |
|---|---|---|
| 30/09 | RC V5 : séparation Essence/Diesel, remorque/matière inflammable en colonnes distinctes | Le tarif ministériel distingue ces cas explicitement, une seule table aplatie masquait la vraie structure |
| 30/09 | Triangulation avec le fichier GMCSA | 8 écarts apparents entre le PDF ministériel et notre lecture initiale, tous confirmés comme des erreurs de lecture du PDF après re-vérification — le barème construit est correct |
| 01/10 | Cat.06 nécessite `rang_vehicule` explicite, Cat.07 nécessite `type_vehicule_base` explicite | Plusieurs lignes de tarif existent avec des critères par ailleurs identiques — impossible de choisir sans ambiguïté sans ce paramètre |
| 01/10 | Cat.04B, extrapolation au-delà de 40 places : base 40 places + 5 000 FCFA/place supplémentaire | Règle explicite du document source, page 31 |
| 03/10 | RUT v1.0 recentré strictement sur le RC ministériel, sans aucune mécanique extérieure (DR, IPT/IAC, Dommages...) | Première version jugée hors-périmètre par Roger — l'objectif de ce document est de vérifier qu'on comprend soi-même le métier, pas de documenter l'ensemble du moteur d'un coup |
| 01/10 | Dommages et Tierce Collision fusionnées sous une seule garantie (6 sous-garanties) | « Tierce » n'était pas une garantie distincte de Dommages ; 145 lignes sur 6 tables redirigées après audit exhaustif des dépendances |
| 01/10 | Sous-garanties « Perte totale » (Dommages, Incendie) gardées séparées | Même assiette de prime que la version standard, périmètre de couverture non confirmé. Principe : garder le maximum séparé, `equivalence_garantie` gère les rapprochements confirmés |
| 02/10 | 14 tables renommées au singulier, 27 colonnes en `id_nomchamp`, 24 contraintes alignées | Maintenance et migration. Le renommage des tables avait cassé 7 fonctions sans qu'on s'en aperçoive ; elles ont été rattrapées et un audit systématique est devenu la règle 6 |
| 02/10 | BENEFICIAL→BELIFE, ATLANTIQUE→AFG ; codes SOCAR→ZENITHE et ALPHA→SAMIRIS réaffectés | SOCAR et ALPHA en liquidation judiciaire terminée ; les codes sont réaffectés à des entités distinctes, pas une fusion commerciale |
| 02/10 | AFRINS DR : forfait 2 000 FCFA au lieu de 5 % de RC avec minimum 80 000 | Le tarif à lecture directe officiel contredisait l'extraction CSV de la veille ; la source officielle fait foi |
| 02/10 | Architecture « bouquet » : `equivalence_garantie_sous_garantie` | Une dénomination (ex. « Protection circulation Avec FM ») couvre plusieurs sous-garanties ; une seule colonne `garantie_code` ne pouvait pas le représenter |
| 02/10 | `tarif.id_offre_commerciale` (343 lignes sur 343) ; fonctions RC et DR via `offre_commerciale` | Phases 4-5 de la restructuration ; 125 lignes encore au niveau garantie parente ont été corrigées en chemin |
| 03/10 | 12 doublons de `bareme_tranche` supprimés (ALLIANZ, SUNU) | Audit exhaustif de la table : exactement ces 12, aucun autre cas. Un premier passage avait produit 139 faux positifs (RC n'utilise pas `montant_fixe`/`taux_pct`) |
| 03/10 | « Évolution 2023 du DTA » : interprétation retirée | Corrigée par Roger : relecture d'un tarif à lecture directe, pas un nouveau barème (règle 10) |
| 03/10 | TVA = 19,25 % sur prime nette + accessoires + Fichier central, Carte rose exclue | Vérifiée sur 504 lignes AFRINS et recoupée par deux autres fichiers |
| 03/10 | Coefficients de court terme (20/40/60/80/100 %) consignés sans être généralisés | Observés chez AFRINS seul ; généralité à confirmer |

---

## Pilier 4 — Pilotage

### Dettes identifiées sur ce périmètre
- **197 des 300 `offre_commerciale` portent un libellé "PLACEHOLDER"** généré automatiquement en Phase 4, faute de vraie dénomination compagnie connue — le tarif associé reste correct, mais un écran de cotation basé dessus afficherait un nom provisoire.
- **Dimension "genre de véhicule" manquante** (découverte 03/10/2026, via `Tarif_automobile_automatisé.csv`) — la surprime matière inflammable (et peut-être d'autres éléments) varie par genre (Benne/Camion/Camion+Remorque...) pour Cat.02/03 au moins, non capturée aujourd'hui. Cause des anomalies #2/#3. Vérifier si d'autres catégories sont concernées avant de modéliser.
- **Format des tableaux du Pilier 2.3** — actuellement une colonne "Autres critères" en texte libre (JSON). Devrait devenir des colonnes explicites propres à chaque catégorie (nombre de places, remorque, RC élèves, genre de véhicule...) plutôt qu'un bloc texte — aurait rendu l'anomalie "genre de véhicule" visible immédiatement au lieu de la masquer. Restructuration non faite dans ce v1.0, risque trop élevé en fin de session.
- Sous-catégories 04A/B/C, 05/05bis, 06, 07ARC/SRC, 09A/B, 10A/B/C : la logique de distinction entre elles n'est documentée nulle part de façon narrative — seulement implicite dans la structure du barème. À expliciter si une vraie règle écrite existe.
- Directives de souscription par compagnie : absentes de ce document, jamais fournies à cette session.
- Catégories 10B et 10C portent exactement les mêmes montants que 10A — à confirmer si c'est une vraie distinction réglementaire (trois catégories séparées existant pour une autre raison que le montant) ou une simplification de notre construction.
- **Deux sources de vérité, aucun contrôle automatique.** Le RUT et la base peuvent diverger sans que personne ne le voie, ce qui recréerait le problème que le RUT devait résoudre. À construire : un script qui compare chaque tableau du RUT à la base et signale les écarts (priorité haute).
- **Cause d'origine des doublons ALLIANZ/SUNU non recherchée** : 12 lignes supprimées, mais pas pourquoi elles existaient (script rejoué ? import sans clé d'unicité ?). Risque de récidive au prochain import.
- **Dimension « genre de véhicule » à auditer sur Dommages et Vol** (Benne/Camion/Camion+Remorque) : hypothèse non vérifiée, par analogie avec la matière inflammable.
- **Couverture des garanties facultatives** : 13 compagnies sur 16 n'ont aucun taux sur Dommages, Vol, Incendie (matrice du Pilier 2). Compléter d'abord les plus grosses compagnies du marché.
- **Statut de SAMIRIS** non confirmé (voir Acteurs). **IPT AFRINS** absente de la base (#12). **Accessoires 3 150 chez AFRINS** (#11).
- **Sections 3.2 à 3.4 et 3.1bis reposent sur AFRINS seul** : appliquer la règle 10 avant de les généraliser ou de chercher une deuxième compagnie.
- **Affirmations marquées « à confirmer »** : nature fiscale du DTA, définition de la Carte rose, qui fixe le Fichier central, traitement des garanties facultatives dans l'assiette de TVA, généralité des coefficients de durée.
- **Taille du document** : si une version future ajoute un barème aussi dense que celui du DTA, sortir les grands tableaux dans des fichiers annexes liés et garder le RUT centré sur les formules, les principes et le registre d'anomalies.

### Chantiers hors périmètre de cette v3.0 (RUT v3.n, périmètre étendu)
Franchises (`franchise`, `franchise_application`, non branchées au calcul de la prime), majorations et réductions hors RC (dont la réduction Vol SUNU de −20 %), Produit transversal (Essentiel/Classique/Confort/Premium), bordereau comme entité datée, catalogue hors-automobile (reconstruit le 02/10 depuis une source compagnie ; Crédit et Cautions vide).

### Système d'évaluation de la performance
*Non défini à ce stade — à construire avec Roger.*

---

## Historique des modifications

| Date | Auteur | Décision | Justification |
|---|---|---|---|
| 03/10/2026 | Session Tarification | Création RUT v1.0 — première version, périmètre large (Automobile entière) | Remédier aux itérations répétées constatées par Roger |
| 03/10/2026 | Session Tarification, sur arbitrage Roger | RUT v1.0 recentré : RC ministériel seul, barème complet inclus, mécanisme de catégorisation genre→catégorie ajouté | La v1.0 doit vérifier la compréhension du métier lui-même, pas documenter le moteur construit après coup ; granularité insuffisante pour répondre directement à une question de prime sans ce recentrage |
| 03/10/2026 | Session Tarification | Lois de zone (23/24, 11/12) et de remorque (coefficient par catégorie) découvertes et vérifiées exhaustivement (535+144 tests) ; registre d'anomalies créé (3 anomalies non résolues, réponse standard définie) ; tentative de loi sur les tranches CV/cylindrée testée et écartée | Roger : "nous n'avons pas le droit à l'erreur, tout doit être vérifié valeur après valeur" — aucune règle admise sans vérification exhaustive, aucune anomalie masquée |
| 03/10/2026 | Session Tarification | Analyse étendue à 04A/04B/08 : deux régimes linéaires en 04B (places), incrément par tranche en 04A, coefficient de tonnage dépendant de la force fiscale en 08 — tous confirmés par zone ; 4ᵉ anomalie trouvée (04B, 22 places, tranche 7-10CV) | Poursuite de la rigueur exhaustive demandée ; aucune loi admise sans vérification sur toutes les zones disponibles |
| 03/10/2026 | Session Tarification | Cause racine des anomalies #2/#3 identifiée : dimension "genre de véhicule" absente du modèle (confirmé via `Tarif_automobile_automatisé.csv`, colonne "Genre ou Classe") — pas une erreur de saisie mais une variable manquante. Discussion sur le format des tableaux (large vs long) tranchée : structure longue avec critères explicites par catégorie, pas de table universelle à colonnes fixes | Roger a questionné l'efficacité du format texte libre "autres critères" ; cette anomalie en est la preuve directe — un format à colonnes explicites l'aurait révélée immédiatement |
| 03/10/2026 | Session Tarification | RUT passé en v2.0 — périmètre étendu à DR (21 compagnies + générique, taux réels) et IPT/IAC (21 compagnies, barème complet par formule) ; 2 nouvelles anomalies trouvées (ROYAL ONYX formule 3, Frais Médicaux absents chez 13 compagnies) | Roger : "les vrais taux, et notre fameuse mécanique de calcul" — périmètre Automobile étendu au-delà du RC seul, hors-automobile toujours exclu |
| 03/10/2026 | Session Tarification | DR reformulé en une seule formule à deux paramètres (`montant_fixe_minimum + prime_RC_ajustee × taux_DR_pct / 100`, l'un des deux nul selon la compagnie) ; règle de date de validité par défaut (bordereau actif) explicitée ; doublon ALLIANZ confirmé réel en base (même `tarif_id`, deux `bareme_tranche` par formule) | Roger a proposé le format unifié, plus simple à exploiter que deux mécaniques séparées ; la requête de vérification a confirmé le doublon, pas un artefact de comptage |
| 03/10/2026 | Session Tarification | Dommages/Tierce, Vol, Incendie, Bris de glaces ajoutés (PROASSUR et ROYAL ONYX, taux complets par catégorie ; reste du marché limité à Vol accessoires/braquage/brigandage) ; 2 nouvelles anomalies (doublon SUNU, taux Incendie ROYAL ONYX Cat.02 hors échelle) | Complète le périmètre v2.0 annoncé ; couverture volontairement partielle documentée plutôt que masquée — la plupart des compagnies n'ont pas encore de taux construits pour ces garanties facultatives |
| 03/10/2026 | Session Tarification | Doublon SUNU confirmé (pas seulement probable) — vérification élargie à toutes les colonnes (dates, statut, critères, offre commerciale), toutes identiques sauf l'id `bareme_tranche` | Roger a demandé d'élargir la recherche avant de conclure à un doublon plutôt que de se fier à un seul motif apparent |
| 03/10/2026 | Session Tarification | `equivalence_garantie`/`offre_commerciale` ajoutée (385 dénominations, 616 liens de composition, 300 offres dont 103 avec vrai nom commercial) — v2.0 complète sur le périmètre annoncé | Dernier bloc du périmètre v2.0 validé par Roger ; dette des 197 offres "PLACEHOLDER" consignée explicitement plutôt que masquée |
| 03/10/2026 | Session Tarification | Audit exhaustif de `bareme_tranche` (premier passage faussé par une colonne manquante dans le `GROUP BY`, corrigé) — 12 doublons confirmés, exactement les anomalies #7/#8, aucun autre cas dans toute la table. Doublons supprimés, second audit à 0 ligne | Roger a donné quitus pour l'optimisation du RUT ; audit corrigé après qu'un premier passage ait produit 139 faux positifs (RC n'utilise pas `montant_fixe`/`taux_pct`) |
| 03/10/2026 | Session Tarification | Optimisation terminée : table des matières ajoutée ; loi Vol Partiel=Vol Braquage découverte et vérifiée (12/12 cas, deux compagnies) ; matrice de couverture par compagnie/garantie construite | Clôture des 4 axes d'optimisation proposés (anomalies, lois structurelles, couverture, navigabilité) |
| 03/10/2026 | Session Tarification | RUT v3.0 — composition complète de la Prime TTC documentée (accessoires, fichier central, carte rose, DTA via `site.bareme_dta`, TVA, formules/directives de souscription) ; lacune découverte sur la distinction cylindrée des motos en DTA | Roger : objectif de comparabilité des offres multi-garanties entre compagnies ; le RUT rend les lacunes visibles (Fichier central/Carte rose vérifiés chez AFRINS seul, TVA quasi vide, Produit transversal toujours sans donnée) plutôt que de prétendre à une comparabilité qui n'existe pas encore |
| 03/10/2026 | Session Tarification | Barème DTA complet intégré (96 lignes, `site.bareme_dta`) | Confirme que `site.bareme_dta` est bien conçu pour historiser ce type de changement réglementaire, usage visé par cette section du RUT |
| 03/10/2026 | Roger (correction) | L'"évolution structurelle 2023" du DTA était une erreur d'interprétation — les lignes "par catégorie" ne sont qu'une relecture d'un tarif à lecture directe (AFRINS), redondante avec le barème général ministériel, pas un nouveau barème réglementaire. `bareme_dta` sera purgée de cette redondance (hors scope de cette session, qui cartographie sans modifier) | Principe posé par Roger : une valeur issue d'un tarif à lecture directe ne crée un nouvel enregistrement que si elle contredit la source ministérielle générale — sinon elle n'apporte aucune valeur distinctive |
| 03/10/2026 | Session Tarification, quitus Roger | Corrections avant Git : formule d'assemblage de la Prime TTC et TVA 19,25 % vérifiées (504/504 lignes AFRINS, recoupées par deux fichiers) ; coefficients de durée ajoutés ; Fichier central corrigé (500 ou 1 000 FCFA, et non « 1 000 à 1 500 ») ; 2 anomalies et 1 lacune ajoutées au registre ; compte des compagnies corrigé (19 actives + générique + SAMIRIS à confirmer) ; Pilier 3 étendu à toutes les décisions depuis le 01/10 ; règle 11 ajoutée ; table des matières régénérée depuis les titres | Revue critique de la carte : affirmations non sourcées marquées « à confirmer », sections figées sur l'ancien périmètre mises à jour, et une erreur d'analyse corrigée (la TVA avait été écrite comme « sans aucune valeur disponible » alors qu'elle se déduit des tarifs à lecture directe) |
