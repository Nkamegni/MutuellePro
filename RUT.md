# RUT — Référentiel Unique de Tarification
**v1.0 — Fondations du RC Ministériel — 03/10/2026**

Document source, humain, de référence unique. `areas/tarification.md` (mémoire technique auto-générée) reste un journal de travail ; le RUT est ce qui fait autorité au-dessus — y compris, à terme, matérialisable directement en base de données.

**Périmètre strict de ce v1.0** : le tarif RC (Responsabilité Civile) automobile ministériel, tel qu'il existait **avant** toute mécanique de calcul construite pour l'exploiter — sa lecture brute. Rien d'autre. DR, IPT/IAC, Dommages, Vol, Incendie, `equivalence_garantie`, `offre_commerciale` : tout ça est extérieur au tarif RC ministériel lui-même et n'a pas sa place ici — réservé au RUT v1.n, périmètre étendu, une fois ce socle validé.

---

## ⚠️ REGISTRE DES ANOMALIES — à consulter à chaque référence à ce document

Trois anomalies **non résolues** existent dans le barème RC ministériel tel que construit. Elles doivent être rappelées systématiquement dès que le RUT est utilisé pour répondre à une question de tarification touchant les cas ci-dessous.

**Réponse standard à produire si une requête tombe sur l'un de ces cas** :
> *"Anomalie dans la tarification en notre possession ; se rapprocher des services techniques pour obtenir le montant de la prime. Merci de votre compréhension."*

| # | Catégorie | Tranche/critère concerné | Nature de l'anomalie | Statut |
|---|---|---|---|---|
| 1 | 04A | 0-2 CV, nombre_places=2, Zones B/C | Écart ×9 par rapport à la loi de zone attendue (103 500 FCFA d'écart) | **Non résolu** — tarif à lecture directe AFRINS non comparable (structure différente à cette catégorie) |
| 2 | 03 | 7-10 CV, surprime matière inflammable, Zone B | Écart de 51% par rapport à la loi de zone attendue | **Cause racine identifiée (03/10/2026)** — `Tarif_automobile_automatisé.csv` (GMCSA) révèle que la surprime matière inflammable varie en réalité par **genre de véhicule** (Benne=20263, Camion=23414, Camion/DC+Remorque=22439 pour 11-14CV Zone B) — une dimension **absente de notre modèle actuel**, qui ne porte qu'une valeur unique par (catégorie, zone, force fiscale). Notre valeur stockée (22439) est juste, mais seulement pour un genre précis. **Correction requise : ajouter la dimension "genre de véhicule" au modèle**, pas une simple correction de valeur — chantier à part, non fait dans ce v1.0 |
| 3 | 03 | 11-14 CV, surprime matière inflammable, Zone B | Écart de 6% par rapport à la loi de zone attendue | **Même cause racine que #2** |
| 4 | 04B | 7-10 CV, 22 places | Écart de 12 000 FCFA par rapport à la progression linéaire confirmée (+9 133/place) — valeur attendue 386 514, valeur actuelle 398 514 | **Non résolu** — à vérifier au PDF source |

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
- **21 compagnies actives au marché** (hors couverture RC elle-même, universelle) : ACTIVA, AFG, AFRINS, AGC, ALLIANZ, AREA, AUCUNE (niveau générique/POOL), AXA, BELIFE, CHANAS, CPA, GMCSA, LDASA, NSIA, PROASSUR, ROYAL ONYX, SAAR, SANLAM, SUNU, ZENITHE. **Non actives** : ALPHA.

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

## Pilier 3 — Mémoire : décisions et justifications (scopées RC ministériel)

| Date | Décision | Justification |
|---|---|---|
| 30/09 | RC V5 : séparation Essence/Diesel, remorque/matière inflammable en colonnes distinctes | Le tarif ministériel distingue ces cas explicitement, une seule table aplatie masquait la vraie structure |
| 30/09 | Triangulation avec le fichier GMCSA | 8 écarts apparents entre le PDF ministériel et notre lecture initiale, tous confirmés comme des erreurs de lecture du PDF après re-vérification — le barème construit est correct |
| 01/10 | Cat.06 nécessite `rang_vehicule` explicite, Cat.07 nécessite `type_vehicule_base` explicite | Plusieurs lignes de tarif existent avec des critères par ailleurs identiques — impossible de choisir sans ambiguïté sans ce paramètre |
| 01/10 | Cat.04B, extrapolation au-delà de 40 places : base 40 places + 5 000 FCFA/place supplémentaire | Règle explicite du document source, page 31 |
| 03/10 | RUT v1.0 recentré strictement sur le RC ministériel, sans aucune mécanique extérieure (DR, IPT/IAC, Dommages...) | Première version jugée hors-périmètre par Roger — l'objectif de ce document est de vérifier qu'on comprend soi-même le métier, pas de documenter l'ensemble du moteur d'un coup |

---

## Pilier 4 — Pilotage

### Dettes identifiées sur ce périmètre
- **Dimension "genre de véhicule" manquante** (découverte 03/10/2026, via `Tarif_automobile_automatisé.csv`) — la surprime matière inflammable (et peut-être d'autres éléments) varie par genre (Benne/Camion/Camion+Remorque...) pour Cat.02/03 au moins, non capturée aujourd'hui. Cause des anomalies #2/#3. Vérifier si d'autres catégories sont concernées avant de modéliser.
- **Format des tableaux du Pilier 2.3** — actuellement une colonne "Autres critères" en texte libre (JSON). Devrait devenir des colonnes explicites propres à chaque catégorie (nombre de places, remorque, RC élèves, genre de véhicule...) plutôt qu'un bloc texte — aurait rendu l'anomalie "genre de véhicule" visible immédiatement au lieu de la masquer. Restructuration non faite dans ce v1.0, risque trop élevé en fin de session.
- Sous-catégories 04A/B/C, 05/05bis, 06, 07ARC/SRC, 09A/B, 10A/B/C : la logique de distinction entre elles n'est documentée nulle part de façon narrative — seulement implicite dans la structure du barème. À expliciter si une vraie règle écrite existe.
- Directives de souscription par compagnie : absentes de ce document, jamais fournies à cette session.
- Catégories 10B et 10C portent exactement les mêmes montants que 10A — à confirmer si c'est une vraie distinction réglementaire (trois catégories séparées existant pour une autre raison que le montant) ou une simplification de notre construction.

### Chantiers hors périmètre de ce v1.0 (RUT v1.n, périmètre étendu)
DR, IPT/IAC, Dommages/Tierce, Vol, Incendie, Bris de glaces, `equivalence_garantie`, `offre_commerciale`, franchises, majorations/réductions, catalogue hors-automobile.

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
