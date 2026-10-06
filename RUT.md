# RUT — Référentiel Unique de Tarification
**v5.3 — Automobile (règles de calcul), cartographie hors automobile, architecture cible, référentiels, texte réglementaire de 1994 — 03/10/2026** (v3.0 livrée puis complétée en v3.1, étendue en v4.0, v5.0 et v5.1 : voir l'Historique)

Document source, humain, de référence unique. `areas/tarification.md` (mémoire technique auto-générée) reste un journal de travail ; le RUT est ce qui fait autorité au-dessus — y compris, à terme, matérialisable directement en base de données.

**Périmètre de cette version (v5.2)** : tout le contenu de la v4.0 (Automobile avec ses règles de calcul, cartographie hors automobile), **plus** la description de l'architecture cible : une table de tarif unique, ses tables de concepts, ses mécanismes et ses procédures (Pilier 2, v5.0). Toujours au niveau des règles et de la conception, **pas** de l'application de gestion. **Rien n'est implémenté** : le système n'est pas modifié par cette phase.

**Principe de lecture** : ce document est une photographie de la connaissance à la date indiquée. Toute affirmation qui n'est pas sourcée dans nos données est marquée « à confirmer ».

**Principe de lecture** : ce document est une photographie de la connaissance à la date indiquée. Toute affirmation qui n'est pas sourcée dans nos données est marquée « à confirmer ».

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
- [Pilier 2 (v4.0) — Branches hors automobile : cartographie de l'existant](#pilier-2-v40--branches-hors-automobile--cartographie-de-lexistant)
  - [4.1 — État d'avancement par branche](#41--état-davancement-par-branche)
  - [4.2 — Catalogue canonique en base : 88 garanties](#42--catalogue-canonique-en-base--88-garanties)
  - [4.3 — Deux référentiels de garanties non rapprochés](#43--deux-référentiels-de-garanties-non-rapprochés)
  - [4.4 — Dénominations par compagnie hors automobile (Garanties.csv)](#44--dénominations-par-compagnie-hors-automobile-garantiescsv)
  - [4.5 — Crédit et Cautions : information disponible, non intégrée en base](#45--crédit-et-cautions--information-disponible-non-intégrée-en-base)
  - [4.6 — Paramètres d'offre génériques (Offre_commerciale_autre_source.csv)](#46--paramètres-doffre-génériques-offre_commerciale_autre_sourcecsv)
  - [4.7 — Taxes hors automobile](#47--taxes-hors-automobile)
  - [4.8 — Sources de prix disponibles, non exploitées](#48--sources-de-prix-disponibles-non-exploitées)
  - [4.9 — Ce que le RUT ne peut pas dire hors automobile](#49--ce-que-le-rut-ne-peut-pas-dire-hors-automobile)
- [Pilier 2 (v5.0) — Architecture cible : une table de tarif unique et ses concepts](#pilier-2-v50--architecture-cible--une-table-de-tarif-unique-et-ses-concepts)
  - [5.1 — Principe et choix de conception](#51--principe-et-choix-de-conception)
  - [5.2 — État actuel du schéma (inventaire du 03/10/2026)](#52--état-actuel-du-schéma-inventaire-du-03102026)
  - [5.3 — La table de tarif cible](#53--la-table-de-tarif-cible)
  - [5.4 — Les tables de concepts](#54--les-tables-de-concepts)
  - [5.5 — Mécanismes](#55--mécanismes)
  - [5.6 — Procédures stockées](#56--procédures-stockées)
  - [5.7 — Passage de l'état actuel à la cible](#57--passage-de-létat-actuel-à-la-cible)
  - [5.8 — Ce que cette conception ne résout pas](#58--ce-que-cette-conception-ne-résout-pas)
- [Pilier 2 (v5.1) — Contenu des référentiels et des règles stockées en base](#pilier-2-v51--contenu-des-référentiels-et-des-règles-stockées-en-base)
  - [6.1 — Compagnies](#61--compagnies)
  - [6.2 — Actes réglementaires et bordereaux (15)](#62--actes-réglementaires-et-bordereaux-15)
  - [6.3 — Majorations et réductions (majoration_reduction, 6 lignes)](#63--majorations-et-réductions-majoration_reduction-6-lignes)
  - [6.4 — Liens entre garanties (garantie_lien, 5 lignes)](#64--liens-entre-garanties-garantie_lien-5-lignes)
  - [6.5 — Franchises et réductions réglementaires](#65--franchises-et-réductions-réglementaires)
  - [6.6 — Formules de souscription automobile (formule, 16 lignes)](#66--formules-de-souscription-automobile-formule-16-lignes)
  - [6.7 — Produits et offres historiques](#67--produits-et-offres-historiques)
  - [6.8 — Règles de calcul et bases de calcul](#68--règles-de-calcul-et-bases-de-calcul)
  - [6.9 — Accessoires en base (bareme_accessoire, 110 lignes)](#69--accessoires-en-base-bareme_accessoire-110-lignes)
  - [6.10 — Dénominations par compagnie (equivalence_garantie, 385 lignes)](#610--dénominations-par-compagnie-equivalence_garantie-385-lignes)
  - [6.11 — Registre des sources](#611--registre-des-sources)
  - [6.12 — Pièges de lecture des sources](#612--pièges-de-lecture-des-sources)
- [Pilier 2 (v5.2) — Texte réglementaire de 1994 et directives de souscription SUNU](#pilier-2-v52--texte-réglementaire-de-1994-et-directives-de-souscription-sunu)
  - [7.1 — L'arrêté n° 00380/MINEF/DCE/A du 16 novembre 1994](#71--larrêté-n-00380minefdcea-du-16-novembre-1994)
  - [7.2 — Directives de souscription du risque automobile (SUNU, pages 7 à 13)](#72--directives-de-souscription-du-risque-automobile-sunu-pages-7-à-13)
  - [7.3 — Options IPT et IAC de SUNU (page 33)](#73--options-ipt-et-iac-de-sunu-page-33)
  - [7.4 — Accessoires SUNU (page 34) et comparaison avec la base](#74--accessoires-sunu-page-34-et-comparaison-avec-la-base)
  - [7.5 — Décisions de Roger du 03/10/2026 : accessoires, Fichier central, mise à jour de la base](#75--décisions-de-roger-du-03102026--accessoires-fichier-central-mise-à-jour-de-la-base)
  - [7.6 — Source Frais_et_accessoires.csv : décisions du 03/10/2026](#76--source-frais_et_accessoirescsv--décisions-du-03102026)
- [Pilier 3 — Mémoire : décisions et justifications](#pilier-3--mémoire--décisions-et-justifications)
- [Pilier 4 — Pilotage](#pilier-4--pilotage)
  - [Dettes identifiées sur ce périmètre](#dettes-identifiées-sur-ce-périmètre)
  - [Chantiers hors périmètre de cette v5.0 (RUT v5.n, périmètre étendu)](#chantiers-hors-périmètre-de-cette-v50-rut-v5n-périmètre-étendu)
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
| 11 | Accessoires | AFRINS, catégorie 1, contrat annuel, prime nette supérieure à 100 000 FCFA | Règle : 3 150 FCFA (2 500 FCFA sinon). Le PDF AFRINS l'applique en Zones B et C ; en Zone A, trois lignes (101 997, 127 264, 148 363 FCFA) restent à 2 500 | **Résolu par décision de Roger (03/10/2026)** : règle maintenue, « source officielle » ; les trois lignes de la Zone A sont traitées comme des écarts du PDF, non vérifiés auprès d'AFRINS ; implémentée en B2, script non exécuté |
| 12 | IPT | AFRINS, absent de la base | Le tarif à lecture directe AFRINS prévoit une IPT forfaitaire (7 500 FCFA en Cat.1 et 2 ; 5 000 FCFA en Cat.3 et 5A) mais AFRINS n'a aucune ligne IPT/IAC en base (17 compagnies seulement) | **Lacune constatée, non corrigée** — cette phase cartographie sans modifier le système |
| 13 | Hors auto | Catalogue en base vs `Garanties.csv` | Deux référentiels de garanties non rapprochés. Noms identiques (garanties en base concernées) : Santé 5 sur 28, Incendie 19 sur 29, RC générale 10 sur 11, Transport 9 sur 12, Risques techniques 1 sur 2, Aviation 4 sur 6. Test strict : le recouvrement réel est probablement supérieur | **Non résolu** — pas de rapprochement à ce stade |
| 14 | Hors auto | Crédit et Cautions | Branche vide en base alors que `Garanties.csv` en porte 33 lignes (17 garanties, GMCSA, SAMIRIS copie, SANLAM 1 ligne) | **Information consignée (RUT 4.0, section 4.5), non intégrée en base** sur décision de Roger |
| 15 | Hors auto | Codes de taxe 1 à 4 | La source porte un code de taxe par branche, la table qui les définit n'est pas fournie | **Lacune consignée** sur décision de Roger (03/10/2026) |
| 16 | Hors auto | SAMIRIS (ex-ALPHA) | 225 lignes hors automobile identiques, une à une, à des lignes de GMCSA (225/225) : copie, non source indépendante, d'une compagnie inactive | **Constaté, non corrigé** — non répétées en annexe B |
| 17 | Hors auto | Assiette de prime dans `Garanties.csv` | « Nombre passagers » dominante y compris pour Crédit, RC générale, Incendie, Aviation : valeur par défaut sans sens | **Non résolu** — assiette hors automobile inexploitable en l'état |
| 18 | Hors auto | Tarifs et offres | Aucun tarif ni offre commerciale en base ; six sources de prix (Individuelle accidents ×4, MRH, Voyage) en notre possession mais écartées | **Écarté sur décision de Roger (03/10/2026)** — voir 4.8 |
| 19 | Hors auto | `Garanties.csv`, branche Transport | « Défense Recours », « Responsabilité civile des médecins » et « Responsabilité civile exploitation » sont classées sous la branche Transport alors qu'elles relèvent de la responsabilité civile (mauvais classement probable) ; toutes les lignes Transport à base de prime renseignée sont de ces trois garanties | **Non résolu** — à confirmer |
| 20 | Architecture | `fn_calculer_prime_nette_totale` | La fonction présentée comme « API bloquante pour myspace » dans la note de transmission Git du 02/10 **n'existe pas en base** (inventaire du 03/10) : elle a été écrite mais jamais déployée. Aucune procédure ne calcule une Prime nette ou TTC | **Constaté, non corrigé** — la note de transmission d'état initial est inexacte sur ce point |
| 21 | Architecture | `tarif` | Colonnes redondantes (`id_compagnie`, `id_garantie`, `id_sous_garantie`, `garantie_code`) en doublon de `id_offre_commerciale` ; deux contraintes d'exclusion en parallèle ; `id_offre_commerciale` nullable alors que renseignée sur 343 lignes sur 343 ; champs JSON `criteres_objet`/`criteres_risque` hérités, contenu non audité | **Constaté** — retrait prévu à la bascule (5.7) |
| 22 | Architecture | `fn_generer_code_franchise` | Fonction sans trigger rattaché dans le schéma d'après l'inventaire : le code de franchise n'est peut-être plus généré automatiquement | **À vérifier** |
| 23 | Architecture | `genre` | Le concept « genre de véhicule » existe en table (16 lignes) mais aucune colonne de `tarif` ni de `bareme_tranche` ne le référence : chaînon manquant de la cause racine des anomalies #2/#3 | **Constaté** — se résout par la coordonnée `id_genre` de la table cible |
| 24 | Architecture | `tmp_benchmark_meta` | Table résiduelle de 16 lignes, hors convention (préfixe `tmp_`) | **À vérifier avant suppression** — hors périmètre de cette phase |
| 25 | Compagnies | `compagnie` | SAMIRIS (id 21) : `actif_site = true` et agrément ACTIF en base alors que Roger l'a déclarée inactive ; nom commercial « Alpha Assurances ». ZENITHE : `nom` resté « SOCAR » et `nom_commercial` vide (`nom` conserve aussi ATLANTIQUE pour AFG et BENEFICIAL pour BELIFE, non touchés car non demandés). Numéro et date d'agrément vides pour les 21 compagnies | **Mise à jour autorisée par Roger le 03/10/2026** — script `MAJ_BASE_03102026.sql` (bloc A) préparé, non exécuté à la rédaction |
| 26 | Dénominations | `offre`, `offre_commerciale`, `equivalence_garantie` | Trois structures pour la même notion ; `offre.id_produit` renseigné sur 1 ligne seulement des 146 ; aucun rapprochement | **Constaté** — à consolider dans la table cible (5.4) |
| 27 | RUT | Section 3.7 (v3.0 à v5.0) | Le RUT affirmait que les formules de souscription n'avaient « aucune donnée » alors que la base en contient 16 | **Corrigé en v5.1** (6.6) |
| 28 | Sources | 19 fichiers non cités jusqu'à la v5.0 | Sources sans trace dans le RUT ; 3 contenus non relus (garanties facultatives n° 2, `Garanties_IAC_et_IPT.csv`, `OFFRE_COMMERCIALE.sql`), 2 scans non exploités pour les conditions de souscription et les zones, `devis.js` non analysé | **Partiellement traité** — registre des sources (6.11), lectures restantes en dettes |
| 29 | Accessoires | Valeurs génériques et AFRINS | Trois valeurs concurrentes : 2 500 FCFA (`compagnie.accessoires_par_defaut`), 3 000 FCFA (`bareme_accessoire`, AUCUNE, Automobile) et une ligne AFRINS à 3 000 FCFA « [NON IDENTIFIEE] » | **Résolu par décision de Roger (03/10/2026)** : la valeur juste est **2 500 FCFA** (source `Frais_et_accessoires.csv`, tarif AFRINS, découpage du Pool, manuel SUNU) ; la base, qui porte 35 lignes à 3 000, est à corriger par `MAJ_BASE_03102026.sql`, non exécuté |
| 30 | Majorations | `majoration_reduction` id 2 | Description « permis de moins de **3 ans** » alors que l'arrêté de 1994 (art. 5-3 b, vérifié visuellement) dit **« moins deux (2) ans »** ; le RUT 6.3 avait repris l'erreur | **Correction proposée, non demandée par Roger** — incluse comme bloc C de `MAJ_BASE_03102026.sql` (à retirer si elle n'est pas validée), non exécutée. Une fonction ou une application qui coderait « 3 ans » en dur est à corriger |
| 31 | SUNU | Garanties facultatives | Tierce complète (2,50 %), Tierce collision (1,75 %), Incendie (0,25 %, minimum 5 000), Bris de glaces (0,50 % et 1,50 %), Avance sur recours (2,50 %), Assistance en réparation (1,50 %) : taux dans le document SUNU, **absents de la base** (qui n'a de SUNU que le Vol et la DR). Franchises SUNU absentes aussi | **Constaté, non corrigé** — à charger après décision |
| 32 | SUNU | Accessoires | Base différente du manuel : courte période à 3 000 FCFA (manuel : 2 500 hors Fichier central) ; ligne « autres risques » de 0 à 100 000 FCFA absente ; tranche 5 000 FCFA rattachée à Flotte Automobile | **Résolu par décision de Roger (03/10/2026)** : le manuel de SUNU prévaut ; corrections B5 et B6 du script, non exécuté |
| 33 | SUNU | IPT, formule 3 (page 33) | Capitaux imprimés (invalidité 1 000 000, frais médicaux 100 000) incohérents avec la prime imprimée de 20 500 pour 5 places ; elle suppose 2 000 000 et 200 000. La base suit la prime | **Anomalie de la source** — consignée |
| 34 | Sources | `acte_reglementaire` n° 1 | L'arrêté de 1994 n'a pas de `source_document` en base ; il figure dans `Tarif_Ministériel.pdf` (p.2-6), fichier fourni par SUNU | **Constaté, non corrigé** |
| 35 | Accessoires | `bareme_accessoire` | Décalage systématique de +500 FCFA : 35 lignes à 3 000 FCFA là où la source dit 2 500 (15 compagnies) ; BELIFE a perdu une tranche ; trois lignes Pool, la ligne ZENITHE et les « autres risques » SUNU sont absentes | **Décidé le 03/10/2026** (7.6) : alignement sur la source, lignes ajoutées ; script `MAJ_BASE_03102026.sql` prêt, non exécuté |
| 36 | Fichier central | `Frais_et_accessoires.csv` | Fichier central à 0 sur 14 lignes (GMCSA hors automobile, Green Assistance, Voyage, montants négatifs) | **Erreur de saisie** selon Roger : 1 000 FCFA partout, 500 FCFA pour le Pool ; aucune correction nécessaire dans la base (le Fichier central n'y figure pas) |
| 37 | SUNU | Flotte | Le manuel donne un minimum de 5 000 et un maximum de 10 000 FCFA par flotte, plus 250 FCFA par véhicule ; la base le représente par deux tranches de prime (0 à 1 000 000 : 5 000 ; au-delà : 10 000) | **Approximation constatée, non corrigée** — `bareme_accessoire` ne sait pas porter un minimum et un maximum |

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
- **19 compagnies actives au marché** : ACTIVA, AFG (ex-ATLANTIQUE), AFRINS, AGC, ALLIANZ, AREA, AXA, BELIFE (ex-BENEFICIAL), CHANAS, CPA, GMCSA, LDASA, NSIA, PROASSUR, ROYAL ONYX, SAAR, SANLAM, SUNU, ZENITHE (code réaffecté, ex-SOCAR). **Niveau générique** : AUCUNE (POOL, `id_compagnie=0`) — ce n'est pas une compagnie. **Non active** : SAMIRIS (`Actif = False`, confirmé par Roger le 03/10/2026) ; son code a été réaffecté le 02/10/2026 à partir de l'ancien code ALPHA, dont l'entité d'origine est en liquidation judiciaire terminée. Ses données (par exemple dans le barème DR) restent en base. **La base ne reflète pas encore cette décision** : `actif_site = true` et `statut_agrement = ACTIF` pour SAMIRIS ; ZENITHE a son `nom` resté SOCAR et un `nom_commercial` vide (6.1, anomalie #25).

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
12. **Repli générique : quand l'information spécifique d'une compagnie n'est pas disponible, c'est l'information générique (niveau AUCUNE, `id_compagnie=0`) qui s'applique** (principe posé par Roger le 03/10/2026). Le repli ne vaut que là où une valeur générique existe : voir le tableau de couverture à la fin de la section Prime TTC (Pilier 2, v3.0).

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

Ces coefficients sont ceux de l'**article 6 de l'arrêté de 1994** (1 à 60 jours : 20 % ; 61 à 120 : 40 % ; 121 à 180 : 60 % ; 181 à 240 : 80 % ; 241 à 365 : 100 %) : ils sont **réglementaires et valables pour toutes les compagnies** (7.1). Ce n'est pas un prorata au jour (60/365 = 16,4 %). Le tarif AFRINS ne fait que les appliquer. La fiche Cat.4A (Pool TPV) a ses propres coefficients (25 % et 50 %). Cette notion de durée est la même que celle qui borne les paliers d'accessoires (3.2).

### 3.2 — Accessoires (`bareme_accessoire`)

**Algorithme conceptuel** (pas le code — la règle elle-même) :

```
accessoire = f(compagnie, branche, catégorie, prime_nette, durée_contrat)
```

Le montant retenu dépend de deux paliers combinés :
- **Palier de prime** : soit un seuil unique ("à partir de X FCFA de prime nette"), soit une plage (prime nette entre X et Y)
- **Palier de durée** : la durée du contrat peut elle-même restreindre quel palier de prime s'applique

Le palier le plus spécifique l'emporte (compagnie+catégorie précise avant compagnie seule, durée précisée avant durée libre) — même logique de spécificité que RC (Pilier 2.1, v1.0).

**Valeurs observées chez AFRINS** : 2 500 FCFA sur 500 lignes sur 504, 3 150 FCFA sur 4 lignes ; montant fixe par contrat, non proratisé. **Règle donnée par Roger** : 3 150 FCFA pour un contrat annuel de plus de 100 000 FCFA de prime nette (RC/RTI), 2 500 FCFA sinon — ce qui correspond exactement au schéma « palier de prime à seuil + palier de durée » décrit plus haut. Le tableau AFRINS ne l'applique pas partout : périmètre à confirmer (anomalie #11). En Cat.4A, la fiche présente « Accessoires + Fichier ASAC » ensemble (3 000 FCFA) sans les décomposer.

**État des données en base** : table peuplée pour plusieurs compagnies, non auditée exhaustivement dans cette version.

**État des données en base** : table peuplée pour plusieurs compagnies, non auditée exhaustivement dans cette version.

### 3.3 — Fichier central (ASAC)

**Valeurs observées chez AFRINS** : 1 000 FCFA en Cat.1, 2 et 3 (450 lignes) ; 500 FCFA en Cat.5A (54 lignes) ; montant fixe par contrat, non proratisé selon la durée ; il entre dans l'assiette de TVA (vérifié). En Cat.4A il est présenté avec les accessoires (3 000 FCFA au total, non décomposé).

**Aucune table dédiée dans notre schéma.** Source unique : le tarif à lecture directe AFRINS. Qui fixe ce montant et selon quelle règle (catégorie, compagnie, date) n'est pas établi — **à confirmer**. *(Correction : une version antérieure indiquait « 1 000 à 1 500 FCFA », valeur inexacte.)*

### 3.4 — Carte rose

**Fonction** : attestation de couverture RC pour circuler en zone CEMAC hors du pays d'immatriculation, pendant commercial de la sous-garantie `AUTO_RC__EXTENSION_CEMAC`. **Corroborée par la base** : l'acte réglementaire n° 9 s'intitule « Extension territoriale CEMAC (Carte Rose) » (convention CIMA / zone CEMAC), et la RC rend l'Extension CEMAC obligatoire en lien ADDITIF (6.4). *Le lien exact entre cette garantie et le forfait de 1 000 FCFA d'AFRINS reste à confirmer.*

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

**Corrigé en v5.1.** La base contient **16 formules de souscription automobile** génériques, avec leur composition en garanties et leur famille de catégories : voir **6.6**. Ce sont des paquets de garanties selon l'âge du véhicule et son genre (par exemple, véhicule de moins de 3 ans : formule 1 = RC + DR + IPT ; formule 2 = + Vol, Incendie, Bris de glaces ; formule 3 = + Dommages).

**Ce qui existe par ailleurs** (v2.0) : les niveaux de capital IPT/IAC propres à chaque compagnie, numérotés par compagnie et jamais comparables d'une compagnie à l'autre.

**Ce qui n'existe pas encore** : des noms commerciaux (Essentiel, Classique, Confort, Premium), un regroupement des formules par compagnie, et la liste des formules réellement admises par chaque compagnie.

### 3.8 — Directives de souscription par compagnie

**Corrigé en v5.2.** Les directives de souscription **de SUNU** sont documentées en **7.2** : principes, garanties minimales, pièces exigées, conditions de souscription des garanties dommages, règle du Vol, tableau des taux, franchises. Pour les autres compagnies, aucune règle d'acceptation, de refus ou de pièces exigées n'est renseignée, en base ou en document. Une source existe pour PROASSUR : la note de service n° 0012/22 (WAFA Assurance), « tarif et conditions de souscription », 7 pages, scan sans texte, **encore à lire** (registre des sources, 6.11).

### Ce que cette section ne peut pas encore garantir

L'objectif annoncé — calculer une Prime TTC comparable entre compagnies sur un contrat multi-garanties — est **atteint pour AFRINS sur RC + DR + IPT** (structure complète vérifiée sur 504 lignes), et **pas encore pour les autres compagnies** : Fichier central, Carte rose, accessoires et coefficients de durée ne sont connus que par AFRINS. Le taux de TVA (19,25 %) et le DTA (table `site`) sont connus. Le Produit transversal et les directives de souscription n'ont aucune donnée. Le RUT rend ce manque visible plutôt que de laisser croire à une comparabilité qui n'existe pas encore dans les données.

**Repli générique (règle 12) — où une valeur générique existe aujourd'hui :**

| Composant | Valeur générique disponible ? |
|---|---|
| RC | Oui — barème universel (`id_compagnie=0`) |
| DR | Oui — AUCUNE : 5 % de la RC (forfait 2 000 FCFA en Cat.04A/B/C) |
| IPT | Oui — AUCUNE, formules 1 à 3 |
| IAC | **Non** — aucune ligne AUCUNE |
| Dommages | **Non** |
| Tierce, Vol véhicule, Incendie, Bris de glaces | **Partiel** — AUCUNE seulement en Cat.04A/B/C |
| Vol des accessoires, Brigandage | Oui — AUCUNE (2,5 % ; 1,2 %) |
| Accessoires | **Oui** — 2 500 FCFA (décision de Roger, 03/10/2026) ; `compagnie.accessoires_par_defaut` vaut déjà 2 500 ; la base porte encore 3 000 pour AUCUNE tant que `MAJ_BASE_03102026.sql` n'est pas exécuté |
| Fichier central | **Oui** — 1 000 FCFA hors catégorie 4 ; Pool TPV (4A, 4B, 4C) : 500 FCFA (décision de Roger, 03/10/2026) ; paramètre `site.production_frais_fixes` |
| Carte rose | **Non établi** — valeur connue chez AFRINS seul (1 000 FCFA) ; aucune décision de la promouvoir en valeur générique |
| TVA | Oui — 19,25 % |
| DTA | Oui — `site.bareme_dta` (à purger de la redondance, anomalie #10) |

Comparer deux compagnies composant par composant n'a donc de sens que là où chacune a sa valeur propre ou un repli générique. Ailleurs, le résultat serait un trou, ou pire une valeur AFRINS prise pour générique sans décision explicite.


---

## Pilier 2 (v4.0) — Branches hors automobile : cartographie de l'existant

**Nature de cette section** : une cartographie, pas une tarification. Hors automobile, **aucun prix n'est exploitable aujourd'hui** (aucun tarif ni offre commerciale en base) et il n'existe donc aucune formule de Prime TTC à documenter. Le RUT consigne ce que nous détenons, ce qui manque, et ce qui est écarté. Les listes volumineuses sont en [annexe A](RUT_annexe_A_catalogue_hors_auto.md) et [annexe B](RUT_annexe_B_garanties_hors_auto_par_compagnie.md), rattachées au même commit et à placer dans le même dossier que le RUT.

### 4.1 — État d'avancement par branche

| Branche | Catalogue en base (garanties / sous-garanties) | Dénominations par compagnie (`Garanties.csv`) | Code de taxe | Tarifs et offres en base |
|---|---|---|---|---|
| Maladie et assurances des personnes | 28 / 186 | 113 lignes ; GMCSA, SAMIRIS, SANLAM | 1 | aucun |
| Incendie et autres dommages | 29 / 226 | 146 lignes ; GMCSA, SAMIRIS | 3 | aucun |
| Responsabilité civile générale | 11 / 36 | 82 lignes ; GMCSA, SAMIRIS | 1 | aucun |
| Transport, corps et facultés | 12 / 55 | 81 lignes ; AUCUNE, AXA, CHANAS, CPA, GMCSA, NSIA, SAAR, SAMIRIS, SANLAM, ZENITHE | 4 | aucun |
| Risques techniques | 2 / 9 | 8 lignes ; BELIFE, GMCSA, SAAR, SAMIRIS | 1 | aucun |
| Aviation | 6 / 14 | 8 lignes ; GMCSA, SAMIRIS | 1 | aucun |
| Crédit et cautions | 0 / 0 | 33 lignes ; GMCSA, SAMIRIS, SANLAM | non fourni | aucun |

Les compagnies sont désignées par leur nom actuel (ALPHA→SAMIRIS, inactive ; BENEFICIAL→BELIFE). Voir 4.4 pour la portée réelle de ces dénominations.

### 4.2 — Catalogue canonique en base : 88 garanties

Reconstruit le 02/10/2026 depuis `Offre_commerciale_autre_source.csv` (ancien contenu d'août, partiel, vidé au préalable). Une garantie est **obligatoire** si au moins une de ses lignes l'est dans la source ; les 526 sous-garanties sont en annexe A.

**Maladie et assurances des personnes** — 28 garanties, 186 sous-garanties

| Code | Garantie | Type | Sous-garanties |
|---|---|---|---|
| `SANTE_ANALYSE_BIOLOGIQUES` | ANALYSE BIOLOGIQUES | Optionnelle | 3 |
| `SANTE_ASSISTANCE` | ASSISTANCE | Optionnelle | 9 |
| `SANTE_ASSISTANCE_EVACUATION_SANITAIRE` | ASSISTANCE EVACUATION SANITAIRE | Obligatoire | 10 |
| `SANTE_ASSURANCE_VOYAGE` | ASSURANCE VOYAGE | Optionnelle | 4 |
| `SANTE_AUXILIAIRES_MEDICAUX` | AUXILIAIRES MEDICAUX | Optionnelle | 6 |
| `SANTE_CHIRURGIE` | CHIRURGIE | Optionnelle | 5 |
| `SANTE_COMPLEMENTAIRE_ACCIDENT_DE_TRAVAIL` | COMPLEMENTAIRE ACCIDENT DE TRAVAIL | Optionnelle | 4 |
| `SANTE_CONSULTATION` | CONSULTATION | Optionnelle | 11 |
| `SANTE_EXTENSION` | EXTENSION | Optionnelle | 5 |
| `SANTE_FRAIS_FUNERAIRES` | FRAIS FUNERAIRES | Obligatoire | 3 |
| `SANTE_GARANTIE_SANTE` | Garantie santé | Optionnelle | 1 |
| `SANTE_HOSPITALISATION` | HOSPITALISATION | Optionnelle | 47 |
| `SANTE_INDIVIDUELLE_ACCIDENT` | INDIVIDUELLE ACCIDENT | Obligatoire | 5 |
| `SANTE_INDIVIDUELLE_ACCIDENT_GROUPE` | INDIVIDUELLE ACCIDENT GROUPE | Optionnelle | 5 |
| `SANTE_INDIVIDUELLE_CONDUCTEUR` | INDIVIDUELLE CONDUCTEUR | Optionnelle | 4 |
| `SANTE_INDIVIDUELLE_PERSONNES_TRANSPORTEES` | INDIVIDUELLE PERSONNES TRANSPORTEES | Optionnelle | 4 |
| `SANTE_INDIVIDUELLE_VOYAGE` | INDIVIDUELLE VOYAGE | Optionnelle | 2 |
| `SANTE_MALADIES_FAMILLE` | MALADIES FAMILLE | Optionnelle | 5 |
| `SANTE_MALADIE_GROUPE` | MALADIE GROUPE | Optionnelle | 12 |
| `SANTE_MATERNITE` | MATERNITE | Optionnelle | 5 |
| `SANTE_MULTIRISQUES_SANTE` | MULTIRISQUES SANTE | Optionnelle | 4 |
| `SANTE_OPTIQUE` | OPTIQUE | Optionnelle | 4 |
| `SANTE_PETITE_CHIRURGIE` | PETITE CHIRURGIE | Optionnelle | 2 |
| `SANTE_PHARMACIE` | PHARMACIE | Optionnelle | 3 |
| `SANTE_RADIO` | RADIO | Optionnelle | 4 |
| `SANTE_REEDUCATION` | REEDUCATION | Optionnelle | 2 |
| `SANTE_SOINS_DENTAIRES` | SOINS DENTAIRES | Optionnelle | 6 |
| `SANTE_VISITES` | VISITES | Optionnelle | 11 |

**Incendie et autres dommages** — 29 garanties, 226 sous-garanties

| Code | Garantie | Type | Sous-garanties |
|---|---|---|---|
| `INCENDIE_BRIS_DE_GLACES` | BRIS DE GLACES | Optionnelle | 1 |
| `INCENDIE_BRIS_DE_MACHINES` | BRIS DE MACHINES | Optionnelle | 9 |
| `INCENDIE_BRIS_DE_MACHINES_POSTES_FIXES` | BRIS DE MACHINES POSTES FIXES | Optionnelle | 9 |
| `INCENDIE_BRIS_DE_MACHINES_POSTES_MOBILES` | BRIS DE MACHINES POSTES MOBILES | Optionnelle | 9 |
| `INCENDIE_COULAGE` | COULAGE | Optionnelle | 1 |
| `INCENDIE_DEGATS_DES_EAUX` | DEGATS DES EAUX | Optionnelle | 6 |
| `INCENDIE_GLOBALE_BANQUE` | GLOBALE BANQUE | Optionnelle | 7 |
| `INCENDIE_INCENDIE` | INCENDIE | Optionnelle | 21 |
| `INCENDIE_INCENDIE_RISQUES_COMMERCIAUX` | INCENDIE RISQUES COMMERCIAUX | Optionnelle | 20 |
| `INCENDIE_INCENDIE_RISQUES_INDUSTRIELS` | INCENDIE RISQUES INDUSTRIELS | Optionnelle | 20 |
| `INCENDIE_INCENDIE_RISQUES_SIMPLES` | INCENDIE RISQUES SIMPLES | Optionnelle | 25 |
| `INCENDIE_MARCHANDISES_EN_CHAMBRES_FROIDES_ARRET_FRIGORIFIQUE` | MARCHANDISES EN CHAMBRES FROIDES  (ARRET FRIGORIFIQUE) | Optionnelle | 1 |
| `INCENDIE_PERTE_DE_MOYENS_DE_PAIEMENT` | PERTE DE MOYENS DE PAIEMENT | Obligatoire | 2 |
| `INCENDIE_PERTE_EXPLOITATION_APRES_BRIS_DE_MACHINES` | PERTE EXPLOITATION APRÈS BRIS DE MACHINES | Optionnelle | 6 |
| `INCENDIE_PERTE_EXPLOITATION_APRES_INCENDIE` | PERTE EXPLOITATION APRES INCENDIE | Optionnelle | 5 |
| `INCENDIE_RC_APRES_LIVRAISON` | RC APRES LIVRAISON | Optionnelle | 1 |
| `INCENDIE_RC_APRES_TRAVAUX` | RC APRES TRAVAUX | Optionnelle | 1 |
| `INCENDIE_RC_EXPLOITATION` | RC EXPLOITATION | Optionnelle | 9 |
| `INCENDIE_RC_PRODUITS` | RC PRODUITS | Optionnelle | 1 |
| `INCENDIE_RC_PROPRIETAIRE_D_IMMEUBLE` | RC PROPRIETAIRE D'IMMEUBLE | Optionnelle | 2 |
| `INCENDIE_RISQUES_EXCEPTIONNELS` | RISQUES EXCEPTIONNELS | Optionnelle | 1 |
| `INCENDIE_TOUS_RISQUES_BIJOUTIER` | TOUS RISQUES BIJOUTIER | Optionnelle | 3 |
| `INCENDIE_TOUS_RISQUES_CHANTIERS` | TOUS RISQUES CHANTIERS | Optionnelle | 12 |
| `INCENDIE_TOUS_RISQUES_INFORMATIQUES` | TOUS RISQUES INFORMATIQUES | Optionnelle | 5 |
| `INCENDIE_TOUS_RISQUES_MONTAGE` | TOUS RISQUES MONTAGE | Optionnelle | 12 |
| `INCENDIE_TOUS_RISQUES_SAUF` | TOUS RISQUES SAUF | Optionnelle | 20 |
| `INCENDIE_VOL` | VOL | Optionnelle | 9 |
| `INCENDIE_VOLS_AVEC_EFFRACTION` | VOLS AVEC EFFRACTION | Optionnelle | 7 |
| `INCENDIE_VOL_TRANSPORT_DE_FONDS` | VOL TRANSPORT DE FONDS | Optionnelle | 1 |

**Responsabilité civile générale** — 11 garanties, 36 sous-garanties

| Code | Garantie | Type | Sous-garanties |
|---|---|---|---|
| `RC_GENERALE_INDIVIDUELLE_ACCIDENT` | INDIVIDUELLE ACCIDENT | Optionnelle | 3 |
| `RC_GENERALE_RC_APRES_LIVRAISON` | RC APRES LIVRAISON | Optionnelle | 1 |
| `RC_GENERALE_RC_APRES_TRAVAUX` | RC APRES TRAVAUX | Optionnelle | 1 |
| `RC_GENERALE_RC_AUTRES_PROFESSIONS` | RC AUTRES PROFESSIONS | Optionnelle | 2 |
| `RC_GENERALE_RC_CHEF_DE_FAMILLE` | RC CHEF DE FAMILLE | Optionnelle | 7 |
| `RC_GENERALE_RC_COLLECTIVITES` | RC COLLECTIVITES | Optionnelle | 2 |
| `RC_GENERALE_RC_DIVERSES` | RC DIVERSES | Optionnelle | 2 |
| `RC_GENERALE_RC_EXPLOITATION` | RC EXPLOITATION | Optionnelle | 10 |
| `RC_GENERALE_RC_PRODUITS` | RC PRODUITS | Optionnelle | 1 |
| `RC_GENERALE_RC_PROFESSIONNELLE` | RC PROFESSIONNELLE | Optionnelle | 1 |
| `RC_GENERALE_RESPONSABILITE_CIVILE` | RESPONSABILITE CIVILE | Optionnelle | 6 |

**Transport, corps et facultés** — 12 garanties, 55 sous-garanties

| Code | Garantie | Type | Sous-garanties |
|---|---|---|---|
| `TRANSPORT_CORPS_FLUVIAUX_LAGUNAIRES` | CORPS FLUVIAUX/LAGUNAIRES | Optionnelle | 7 |
| `TRANSPORT_CORPS_MARITIMES` | CORPS MARITIMES | Optionnelle | 10 |
| `TRANSPORT_CORPS_PLAISANCE` | CORPS PLAISANCE | Optionnelle | 7 |
| `TRANSPORT_FACULTES_AERIENNES` | FACULTÉS AERIENNES | Obligatoire | 6 |
| `TRANSPORT_FACULTES_FLUVIALES` | FACULTÉS FLUVIALES | Optionnelle | 2 |
| `TRANSPORT_FACULTES_MARITIMES` | FACULTÉS MARITIMES | Obligatoire | 6 |
| `TRANSPORT_FACULTES_TERRESTRES` | FACULTÉS TERRESTRES | Optionnelle | 3 |
| `TRANSPORT_RC_AFFRETEUR` | RC AFFRETEUR | Optionnelle | 2 |
| `TRANSPORT_RC_CONSTRUCTEUR_DE_NAVIRE` | RC CONSTRUCTEUR DE NAVIRE | Optionnelle | 4 |
| `TRANSPORT_RC_FACULTES_TERRESTRES` | RC FACULTÉS TERRESTRES | Optionnelle | 3 |
| `TRANSPORT_RC_MARITIMES_TRANSPORTS_ET_OU_AFFRETEUR` | RC MARITIMES (TRANSPORTS ET/OU AFFRETEUR) | Optionnelle | 3 |
| `TRANSPORT_RC_NAVIGATION_DE_PLAISANCE` | RC NAVIGATION DE PLAISANCE | Optionnelle | 2 |

**Risques techniques** — 2 garanties, 9 sous-garanties

| Code | Garantie | Type | Sous-garanties |
|---|---|---|---|
| `RISQUES_TECHNIQUES_OFFSHORE` | OFFSHORE | Optionnelle | 6 |
| `RISQUES_TECHNIQUES_RC_RISQUES_PETROLIERS_ARMATEUR` | RC RISQUES PETROLIERS (ARMATEUR) | Optionnelle | 3 |

**Aviation** — 6 garanties, 14 sous-garanties

| Code | Garantie | Type | Sous-garanties |
|---|---|---|---|
| `AVIATION_CORPS_AERIEN` | CORPS AERIEN | Optionnelle | 2 |
| `AVIATION_INDIVIDUELLE_AVIATION` | INDIVIDUELLE AVIATION | Optionnelle | 3 |
| `AVIATION_INDIVIDUELLE_AVIATION_PASSAGERS` | INDIVIDUELLE AVIATION PASSAGERS | Optionnelle | 2 |
| `AVIATION_RC_AERIEN_TRANSPORT_ET_OU_AFFRETEUR` | RC AERIEN (TRANSPORT ET/OU AFFRETEUR) | Optionnelle | 3 |
| `AVIATION_RC_EXPLOITATION_AVIATION` | RC EXPLOITATION AVIATION | Optionnelle | 1 |
| `AVIATION_RESPONSABILITE_CIVILE_AVIATION` | RESPONSABILITE CIVILE AVIATION | Optionnelle | 3 |

### 4.3 — Deux référentiels de garanties non rapprochés

Le catalogue en base (4.2) et la liste des garanties génériques de `Garanties.csv` décrivent les mêmes branches avec des granularités différentes. Comparaison des noms après normalisation (majuscules, accents, ponctuation) :

| Branche | Garanties distinctes dans `Garanties.csv` | Garanties en base | Noms identiques |
|---|---|---|---|
| Maladie et assurances des personnes | 56 | 28 | 5 |
| Incendie et autres dommages | 71 | 29 | 19 |
| Responsabilité civile générale | 39 | 11 | 10 |
| Transport, corps et facultés | 32 | 12 | 9 |
| Risques techniques | 3 | 2 | 1 |
| Aviation | 4 | 6 | 4 |

Le test est strict (noms identiques) : des garanties qui ne diffèrent que par le singulier, le pluriel ou une reformulation ne sont pas comptées. Le recouvrement réel est donc probablement plus élevé, mais la Santé n'a que quelques noms en commun. Aucun rapprochement n'est fait à ce stade (anomalie #13).

### 4.4 — Dénominations par compagnie hors automobile (`Garanties.csv`)

Nombre de lignes par compagnie et par branche, noms actuels des compagnies :

| Compagnie | Maladie et assurances des personnes | Incendie et autres dommages | Responsabilité civile générale | Transport, corps et facultés | Risques techniques | Aviation | Crédit et cautions | Total |
|---|---|---|---|---|---|---|---|---|
| GMCSA | 56 | 73 | 41 | 34 | 3 | 4 | 16 | 227 |
| SAMIRIS | 56 | 73 | 41 | 34 | 2 | 4 | 16 | 226 |
| SANLAM | 1 | — | — | 3 | — | — | 1 | 5 |
| SAAR | — | — | — | 3 | 1 | — | — | 4 |
| BELIFE | — | — | — | — | 2 | — | — | 2 |
| AXA | — | — | — | 2 | — | — | — | 2 |
| CPA | — | — | — | 1 | — | — | — | 1 |
| CHANAS | — | — | — | 1 | — | — | — | 1 |
| AUCUNE | — | — | — | 1 | — | — | — | 1 |
| NSIA | — | — | — | 1 | — | — | — | 1 |
| ZENITHE | — | — | — | 1 | — | — | — | 1 |

**Constat** : les 225 lignes hors automobile attribuées à ALPHA (SAMIRIS, inactive) sont **identiques, une à une, à des lignes de GMCSA** (225 sur 225). Ce n'est pas une seconde source mais une copie. Les dénominations hors automobile reposent donc en pratique sur **GMCSA**, avec quelques lignes isolées d'autres compagnies (surtout en Transport).

**Assiette de prime déclarée** (hors lignes ALPHA) :

| Branche | Lignes | Assiettes observées |
|---|---|---|
| Maladie et assurances des personnes | 57 | Forfait (29), Nombre passagers (27), Lecture directe (1) |
| Incendie et autres dommages | 73 | Nombre passagers (72), Montant Indemnité journalière (1) |
| Responsabilité civile générale | 41 | Nombre passagers (41) |
| Transport, corps et facultés | 48 | Nombre passagers (31), Forfait (15), Lecture directe (2) |
| Risques techniques | 6 | Capital Assuré Bris de glaces (4), Nombre passagers (2) |
| Aviation | 4 | Nombre passagers (4) |
| Crédit et cautions | 17 | Nombre passagers (17) |

« Nombre passagers » est la valeur dominante, y compris pour le Crédit, la RC générale et l'Incendie où elle n'a aucun sens : c'est une valeur par défaut, pas une mécanique de calcul (anomalie #17). Les seules mécaniques exploitables sont « Forfait », « Lecture directe », « Montant indemnité journalière » et « Capital assuré bris de glaces ».

**Taux de franchise** : une seule valeur sur les 246 lignes, `0,00%` — aucune franchise réelle n'est renseignée. Non exploitée.

**Bases de prime renseignées** (21 lignes seulement, tous autres cas vides ou nuls) :

| Branche | Compagnie | Garantie | Assiette | Base de prime |
|---|---|---|---|---|
| Risques techniques | BELIFE | Bris de glaces | Capital Assuré Bris de glaces | 10000 |
| Risques techniques | BELIFE | Bris de glaces | Capital Assuré Bris de glaces | 10000 |
| Risques techniques | GMCSA | Bris de glaces | Capital Assuré Bris de glaces | 10000 |
| Risques techniques | SAAR | Bris de glaces | Capital Assuré Bris de glaces | 10000 |
| Transport, corps et facultés | AUCUNE | Défense Recours | Forfait | 0,0006 |
| Transport, corps et facultés | AXA | Défense Recours | Forfait | 0,0006 |
| Transport, corps et facultés | AXA | Défense Recours | Forfait | 0,0006 |
| Transport, corps et facultés | CHANAS | Défense Recours | Forfait | 0,0006 |
| Transport, corps et facultés | CPA | Défense Recours | Forfait | 0,0006 |
| Transport, corps et facultés | GMCSA | Défense Recours | Forfait | 0,0006 |
| Transport, corps et facultés | GMCSA | Responsabilité civile des Médecins | Forfait | 0,001 |
| Transport, corps et facultés | GMCSA | Responsabilté civile exploitation | Forfait | 100000 |
| Transport, corps et facultés | NSIA | Défense Recours | Forfait | 0,0006 |
| Transport, corps et facultés | SAAR | Défense Recours | Forfait | 0,0006 |
| Transport, corps et facultés | SAAR | Responsabilité civile des Médecins | Lecture directe | 1 |
| Transport, corps et facultés | SAAR | Responsabilté civile exploitation | Forfait | 100000 |
| Transport, corps et facultés | SAMIRIS | Défense Recours | Forfait | 0,0006 |
| Transport, corps et facultés | SANLAM | Défense Recours | Forfait | 0,0006 |
| Transport, corps et facultés | SANLAM | Responsabilité civile des Médecins | Lecture directe | 1 |
| Transport, corps et facultés | SANLAM | Responsabilté civile exploitation | Forfait | 100000 |
| Transport, corps et facultés | ZENITHE | Défense Recours | Forfait | 0,0006 |

Ces valeurs n'ont pas été validées. Les doublons apparents (BELIFE, AXA) sont repris tels quels de la source ; BELIFE figure sous ses deux noms (BENEFICIAL et BELIFE). **Observation** : « Défense Recours », « Responsabilité civile des médecins » et « Responsabilité civile exploitation » sont classées sous la branche *Transport* dans cette source, alors qu'elles relèvent de la responsabilité civile — mauvais classement probable, **à confirmer** (anomalie #19). La liste complète des lignes est en annexe B.

### 4.5 — Crédit et Cautions : information disponible, non intégrée en base

La branche est **vide en base** (ses 16 garanties d'août ont été supprimées le 02/10/2026 lors de la reconstruction du catalogue, la source de cette reconstruction ne la couvrant pas). `Garanties.csv` en porte pourtant 33 lignes (17 garanties génériques). Décision de Roger (03/10/2026) : les consigner ici comme information disponible, sans les intégrer en base.

| Garantie générique | Compagnies (noms actuels) |
|---|---|
| Agents de douane | SANLAM |
| Agents du voyage | GMCSA, SAMIRIS |
| Agents immobilier | GMCSA, SAMIRIS |
| Autres cautions | GMCSA, SAMIRIS |
| Autres cautions légales | GMCSA, SAMIRIS |
| Autres cautions marches | GMCSA, SAMIRIS |
| Autres garanties de prêts à la consommation | GMCSA, SAMIRIS |
| Banque | GMCSA, SAMIRIS |
| Caution avance démarrage | GMCSA, SAMIRIS |
| Caution bonne fin de travaux | GMCSA, SAMIRIS |
| Caution financement | GMCSA, SAMIRIS |
| Caution restitution d'acomptes | GMCSA, SAMIRIS |
| Caution retenue garantie | GMCSA, SAMIRIS |
| Caution soumission | GMCSA, SAMIRIS |
| Courtiers d'assurance | GMCSA, SAMIRIS |
| Insolvabilité | GMCSA, SAMIRIS |
| Societe de crédit | GMCSA, SAMIRIS |

L'assiette déclarée est « Nombre passagers » sur les 33 lignes : valeur par défaut, inexploitable. Les lignes SAMIRIS sont des copies de GMCSA (4.4). Seule SANLAM apporte une ligne propre (Agents de douane).

### 4.6 — Paramètres d'offre génériques (`Offre_commerciale_autre_source.csv`)

Source de niveau générique (compagnie 0), 1008 lignes hors automobile. **Elle ne contient aucun prix.** Paramètres lisibles :

| Paramètre | Valeurs observées |
|---|---|
| Proratisable | 1 (1003), 0 (5) |
| Âge minimum | 0 (1006), 1 (2) |
| Âge maximum | 100 (968), 120 (40) |
| Durée minimale de couverture | 0 (997), 1 (11) |
| Durée maximale de couverture | 366 (1008) |
| Capitaux par défaut | 0 (998), 1000000 (4), 100000 (2), 150000 (2), 6000000 (2) |

La durée maximale est identique sur toutes les lignes et l'âge minimum quasi uniforme : ce sont des valeurs par défaut plus que des règles. Aucune franchise n'est renseignée dans cette source.

**Garanties obligatoires** (lignes marquées obligatoires dans la source) :

| Branche | Garantie | Sous-garanties obligatoires |
|---|---|---|
| Accidents corporels et maladie | ASSISTANCE EVACUATION SANITAIRE | Evacuation sanitaire, Assistance maladie |
| Accidents corporels et maladie | FRAIS FUNERAIRES | Frais Funéraires, Prime |
| Accidents corporels et maladie | INDIVIDUELLE ACCIDENT | Décès Accidentel, Incapacité partielle ou totale |
| Incendies et multirisques | PERTE DE MOYENS DE PAIEMENT | Protection Cartes et chèques, Protection papier |
| Transports | FACULTÉS AERIENNES | Perte totale, Tous risques + Vol, Tous risques + Vol + Casse |
| Transports | FACULTÉS MARITIMES | Perte totale, FAP Absolument, FAP Sauf + Disparition |

### 4.7 — Taxes hors automobile

- **TVA** : la source porte 19,25 % sur toutes les lignes hors automobile. Que cette TVA s'applique réellement à chaque branche (certaines assurances de personnes peuvent en être exonérées) n'est pas établi — **à confirmer**.
- **Code de taxe** : la source en porte un par branche, mais **la table qui définit ces codes n'est pas fournie** (lacune consignée sur décision de Roger, 03/10/2026) :

| Code de taxe | Branches concernées |
|---|---|
| 1 | Maladie et personnes, RC générale, Risques techniques, Aviation |
| 2 | Automobile (hors périmètre de cette section) |
| 3 | Incendie et autres dommages |
| 4 | Transport, corps et facultés |
| — | Crédit et Cautions : non fourni |

Sans cette table, on ignore quelles taxes, autres que la TVA, distinguent ces quatre classes (anomalie #15).

### 4.8 — Sources de prix disponibles, non exploitées

Plusieurs documents de tarification hors automobile sont en notre possession. **Décision de Roger (03/10/2026) : on ne les utilise pas à ce stade.** Ils sont listés pour que le RUT sache ce qui existe, sans en tirer aucune valeur.

| Fichier | Contenu apparent | Statut |
|---|---|---|
| `TARIF_A_LECTURE_DIRECTE_INDIVIDUELLE_ACCIDENTS.xlsx` | Individuelle accidents, tarif à lecture directe (feuilles « Paysage », « Portrait ») | Non exploité |
| `Tarif_à_lecture_directe_-_Assurance_Individuelle_Accidents.xlsx` | Idem (feuille « IND ACC ») | Non exploité |
| `Tarif_à_lecture_directe_Assurance_Individuelle_Accidents.xlsx` | Idem, avec primes nettes par risque, primes par option, tarif de base, surprimes, grilles par capital (250 000, 500 000…) | Non exploité |
| `TARIF_IA_AUTOMATISE.xlsm` | Classeur automatisé Individuelle accidents (information générale, tarif) | Non exploité |
| `TARIF_A_LECTURE_DIRECTE_MRH.xlsx` | Multirisque habitation, primes par option choisie | Non exploité |
| `TARIF_ASSURANCES_VOYAGE.pdf` | Assurance voyage, 1 page | Non exploité |

Le contenu de ces fichiers n'a pas été lu en détail pour cette section ; la compagnie émettrice n'est pas vérifiée pour le MRH et le Voyage.

### 4.9 — Ce que le RUT ne peut pas dire hors automobile

Le RUT ne peut calculer **aucune prime** hors automobile : pas de tarif en base, pas d'offre commerciale, pas de formule, une seule compagnie réellement documentée (GMCSA), une branche vide (Crédit et Cautions) et une taxation partielle. Une demande de prime hors automobile n'a donc pas de réponse tarifaire dans cette base de connaissance.

**Réponse proposée (à valider par Roger)** :
> *« Tarification de cette branche non disponible dans notre base de connaissance à ce stade ; se rapprocher des services techniques pour obtenir le montant de la prime. Merci de votre compréhension. »*

---

## Pilier 2 (v5.0) — Architecture cible : une table de tarif unique et ses concepts

**Nature de cette section** : une conception, pas une implémentation. Elle décrit (1) l'état réel du schéma au 03/10/2026, relevé par inventaire, (2) la cible posée par Roger : **une seule table de tarif qui contient tout le tarif**, accompagnée de tables annexes qui décrivent chaque concept du métier de l'assureur, (3) les mécanismes et procédures stockées qui l'exploitent, (4) le chemin pour passer de l'un à l'autre. **Rien n'est modifié dans le système** : cette phase cartographie et conçoit. Les choix marqués « proposée » sont ceux de la session Tarification, retenus par défaut en l'absence de contre-ordre de Roger — **à valider**.

### 5.1 — Principe et choix de conception

**Principe (Roger, 03/10/2026)** : il y a une seule table de tarif ; elle contient tout le tarif. Pour que ses lignes soient lisibles, tous les éléments de description du métier l'accompagnent : chaque concept est décrit et stocké dans une table annexe. C'est un schéma « en étoile » : une table de faits (le tarif) entourée de tables de description (les concepts).

Chaque choix ci-dessous est rattaché à l'incident qui le justifie :

| # | Choix | Alternative écartée | Raison (incident fondateur) | Statut |
|---|---|---|---|---|
| C1 | Chaque coordonnée de lecture est une **colonne explicite**. Une coordonnée vide signifie « toutes les valeurs ». | Un champ JSON `criteres` | Le JSON a masqué la dimension « genre de véhicule » (anomalies #2/#3). Une colonne est typée, indexable, visible. Coût : ajouter une dimension demande une migration, ce qui est voulu (règle 7). | Proposée |
| C2 | Les valeurs **officielles sont stockées telles que lues**. Les lois (zone 23/24 et 11/12, remorque, Vol partiel = Vol braquage) sont des **contrôles**, pas des sources de calcul. | Calculer la Zone B et C depuis la Zone A | Le tarif à lecture directe fait foi ; une dérivation donne des écarts d'un franc (arrondis) et ferait disparaître les 8 écarts réels aux lois, qui sont précisément ce que le RUT doit montrer. | Proposée |
| C3 | Le calcul de la Prime TTC est une **suite d'étapes stockée en table**, lue par une procédure. | Formules écrites dans le code des fonctions | Principe « aucune donnée en dur » : l'assiette de TVA, les coefficients de durée, l'ordre des étapes sont des règles métier datées, appelées à changer. | Proposée |
| C4 | Entrent dans la table tous les **montants, taux et coefficients** qui servent à une prime ou à une taxe. Les **conditions de garantie** (franchises, capitaux, âges) restent dans des tables de concepts. | Tout mettre dans la table | Une franchise est une condition de couverture, pas un prix. | Proposée |
| C5 | Une ligne par énergie (Essence ou Diesel). | Deux jeux de bornes de puissance dans la même ligne (état actuel) | Une ligne ne dit qu'une chose. Conséquence : plus de lignes pour les catégories à puissance fiscale. | Proposée |
| C6 | On ne supprime jamais : `actif`, dates de validité, statut de contrôle. | `DELETE` | Règle 4 ; historique réglementaire (DTA 2017-2023). | Décidée (règle 4) |
| C7 | L'unicité est garantie par une **contrainte d'exclusion** sur toutes les coordonnées et la période. | Contrôles a posteriori | Les 12 doublons ALLIANZ/SUNU auraient été refusés à l'insertion. | Proposée |
| C8 | Résolution : compagnie spécifique avant générique (règle 12), puis ligne la plus spécifique, puis la plus récente. **Égalité parfaite = échec explicite**, jamais de choix silencieux. | Choisir la première ligne trouvée | Cat.06 et 07 : plusieurs lignes aux critères identiques ; la fonction RC actuelle exige déjà un paramètre explicite. | Proposée |

### 5.2 — État actuel du schéma (inventaire du 03/10/2026)

40 objets dans le périmètre (schéma `tarification` et la table `site.bareme_dta`), regroupés par rôle. Nombre de lignes exact au moment de l'inventaire.

| Rôle | Contenu | Tables et lignes |
|---|---|---|
| **Référentiel métier** | Ce que sont les branches, catégories, genres, compagnies, garanties | `branche` 9, `branche_categorie` 21, `categorie` 11, `sous_categorie` 18, `genre` 16, `genre_en_attente_validation` 0, `compagnie` 21, `compagnies` (vue) —, `garantie` 109, `sous_garantie` 571, `garantie_lien` 5 |
| **Valeurs de tarification** | Les montants, taux et barèmes eux-mêmes | `tarif` 343, `bareme_tranche` 1 198, `bareme_accessoire` 110, `bareme_dta` 96, `taux_fiscalite` 1, `majoration_reduction` 6 |
| **Règles de calcul et sources** | Comment une valeur s'utilise, et d'où elle vient | `regles_calcul` 6, `ref_base_calcul` 6, `acte_reglementaire` 15 |
| **Offre commerciale et dénominations** | Les noms réels des garanties par compagnie | `offre_commerciale` 300, `equivalence_garantie` 385, `equivalence_garantie_sous_garantie` 616, `offre` 146, `detail_offre` 234 |
| **Produits et formules** | Regroupements commerciaux de garanties | `produit` 9, `produit_sous_categorie` 34, `formule` 16, `formule_garantie` 78, `formule_categorie_mapping` 17 |
| **Franchises** | Conditions de franchise et plafonds de réduction | `franchise` 9, `franchise_application` 36, `regles_reduction_franchise` 4 |
| **Cotation (vide à date)** | Devis, polices et flottes : mécanique construite, jamais alimentée | `cotation` 0, `cotation_session` 0, `police_cotation` 0, `prime_element` 0, `flotte` 0, `derogation` 0 |
| **Résidu** | Table hors convention | `tmp_benchmark_meta` 16 |

**Le tarif aujourd'hui tient en deux tables** :

- `tarif` (343 lignes) : l'en-tête — `categorie_code`, `criteres_objet`, `criteres_risque`, `date_debut_validite`, `date_fin_validite`, `garantie_code`, `id`, `id_acte_reglementaire`, `id_compagnie`, `id_garantie`, `id_offre_commerciale`, `id_regle_calcul`, `id_sous_categorie`, `id_sous_garantie`, `libelle`, `note`, `prime_minimum`, `source_page`, `statut`.
- `bareme_tranche` (1 198 lignes) : les valeurs — `borne_max`, `borne_min`, `criteres`, `cylindree_max`, `cylindree_min`, `force_fiscale_max_diesel`, `force_fiscale_min_diesel`, `id`, `id_tarif`, `montant_fixe`, `note`, `prime_avec_remorque`, `prime_sans_remorque`, `prime_unique`, `source_page`, `surprime_matiere_inflammable`, `taux_pct`.

Constats de structure :

- Les valeurs sont réparties sur **cinq colonnes de montant** (`montant_fixe`, `taux_pct`, `prime_sans_remorque`, `prime_avec_remorque`, `prime_unique`, plus `surprime_matiere_inflammable`) selon le type de garantie, et les critères sur des **colonnes dédiées plus un champ JSON** `criteres`.
- `tarif` porte **encore** `id_compagnie`, `id_garantie`, `id_sous_garantie` et `garantie_code`, redondants avec `id_offre_commerciale` (anomalie #21).
- **Deux contraintes d'exclusion** coexistent sur `tarif` : l'ancienne (compagnie + code de garantie + catégorie + période) et la nouvelle (offre commerciale + catégorie + période).
- Les autres tarifs sont **hors** de ces deux tables : accessoires (`bareme_accessoire`), DTA (`site.bareme_dta`), TVA (`taux_fiscalite`, une seule ligne), majorations (`majoration_reduction`). Fichier central, Carte rose et coefficients de durée n'ont **aucune table**.
- Le concept « genre de véhicule » existe (`genre`, 16 lignes) mais **aucune colonne de `tarif` ni de `bareme_tranche` ne le référence** (anomalie #23).
- Toute la mécanique de cotation (`cotation`, `cotation_session`, `police_cotation`, `prime_element`, `flotte`, `derogation`) est **vide**.

**Règles de calcul existantes** (`regles_calcul`, 6 lignes ; contenu vérifié par l'export du 03/10/2026, détail en 6.8) :

| Code | Mode | Base de calcul |
|---|---|---|
| `AUTO_BAREME_FF_ZONE` | BAREME_TRANCHE | GRILLE_ZONE_FORCE_FISCALE |
| `DR_POURCENTAGE_RC` | TAUX_POURCENTAGE | PRIME_ELEMENT_MEME_POLICE |
| `IPT_FORFAIT_PALIER` | MONTANT_FORFAITAIRE | CAPITAL_GARANTIE_CHOISI |
| `NOMBRE_PLACES_FORFAIT_PAR_PLACE` | MONTANT_FORFAITAIRE | NOMBRE_PLACES_VEHICULE |
| `TAUX_POURCENTAGE_SIMPLE` | TAUX_POURCENTAGE | VALEUR_ASSUREE_OBJET |
| `VOL_TAUX_AGE_VEHICULE` | TAUX_POURCENTAGE | VALEUR_ASSUREE_OBJET |

Elles couvrent le barème, les taux et les forfaits. **Elles ne couvrent pas** les coefficients (durée, zone, remorque), le palier de prime (accessoires), les montants fixes par contrat (Fichier central, Carte rose), les ajustements en pourcentage (majorations) ni la taxe sur assiette cumulée (TVA) : ces modes sont à créer (5.5).

### 5.3 — La table de tarif cible

Une ligne = **un fait tarifaire** : une valeur, ses coordonnées de lecture, sa période de validité et sa source. Colonnes proposées (les noms suivent les conventions : `id_nomchamp`, singulier, `code` généré par trigger) :

| Groupe | Colonne | Rôle | Concept qui la décrit |
|---|---|---|---|
| Identité | `id_tarif`, `code` | Clé et code lisible généré par trigger (règle 3) | — |
| Quoi | `id_element_tarifaire` | Ce qui est tarifé : une sous-garantie, un accessoire, une taxe, un coefficient, un ajustement | `element_tarifaire` |
| Pour qui | `id_compagnie` | Compagnie ; 0 = générique (règle 12) | `compagnie` |
|  | `id_offre_commerciale` | Renseignée quand l'élément est une garantie vendue : donne la dénomination réelle | `offre_commerciale` |
| Coordonnées (vide = toutes) | `categorie_code` | Catégorie CIMA | `branche_categorie` |
|  | `id_genre` | Genre de véhicule (benne, camion…) | `genre` |
|  | `zone` | Zone A, B ou C | `dimension_tarifaire` |
|  | `energie` | Essence ou Diesel (une ligne par énergie) | `dimension_tarifaire` |
|  | `unite_puissance`, `puissance_min`, `puissance_max` | Force fiscale (CV) ou cylindrée (cm³), bornes incluses | `unite` |
|  | `nombre_places`, `numero_formule` | Capacité ; option IPT/IAC propre à la compagnie | `dimension_tarifaire` |
|  | `tonnage`, `rang_vehicule`, `nombre_cartes`, `type_vehicule_base` | Critères propres aux catégories 06, 07, 08 | `dimension_tarifaire` |
|  | `avec_remorque`, `double_commande`, `rc_eleves` | Critères booléens | `dimension_tarifaire` |
|  | `duree_jours`, `prime_nette_min`, `prime_nette_max` | Durée du contrat ; palier de prime nette (accessoires) | `dimension_tarifaire` |
| | `age_vehicule_min`, `age_vehicule_max` | Âge du véhicule en années (taux Vol par tranche d'âge ; formules jusqu'à 3 ans et plus de 3 ans) | `dimension_tarifaire` |
| Valeur | `valeur`, `id_unite` | Le montant, taux ou coefficient, et son unité (FCFA, %, coefficient, FCFA par place) | `unite` |
|  | `id_regle_calcul` | Comment la valeur s'utilise | `regles_calcul` |
| Validité et source | `date_debut_validite`, `date_fin_validite` | Période ; sans date explicite, celle du bordereau actif | — |
|  | `id_acte_reglementaire`, `source_document`, `source_page` | Bordereau ou texte légal, fichier, page | `acte_reglementaire` |
| Qualité | `actif`, `statut_controle`, `id_anomalie_tarifaire` | Jamais de suppression ; VERIFIE, A_CONFIRMER ou ANOMALIE ; lien vers le registre | `anomalie_tarifaire` |

**Unicité** : une contrainte d'exclusion sur (compagnie, élément, toutes les coordonnées, période) remplace les deux contraintes actuelles.

**Exemples de lignes** (valeurs issues des sections précédentes du RUT) :

| Élément | Compagnie | Coordonnées | Valeur | Mode | Source |
|---|---|---|---|---|---|
| RC (base) | 0 (générique) | Cat.01, zone A, Essence, 7 à 10 CV, sans remorque | 70 877 FCFA | Lecture du barème | Barème ministériel, p.25 |
| RC (base) | 0 (générique) | Cat.01, zone A, Essence, 7 à 10 CV, avec remorque | 77 964 FCFA | Lecture du barème | Barème ministériel, p.25 |
| DR | ROYAL ONYX | toutes catégories | 2,5 % | Taux sur prime RC ajustée | Compléments DR |
| Accessoires | AFRINS | durée 365 jours, prime nette supérieure à 100 000 | 3 150 FCFA | Palier de prime | Tarif AFRINS, règle de Roger — périmètre à confirmer (#11) |
| TVA | 0 (générique) | aucune | 19,25 % | Taux sur assiette (prime nette + accessoires + Fichier central) | Trois sources (RUT 3.6) |

Ordre de grandeur : environ 1 400 lignes à la migration (1 198 lignes de barème, 110 d'accessoires, quelques dizaines de taxes, coefficients et ajustements), avant le dédoublement par énergie. Estimation non calculée précisément. Le volume reste sans enjeu de performance.

### 5.4 — Les tables de concepts

Chaque coordonnée, chaque unité, chaque étape de calcul et chaque notion du métier a sa ligne dans une table annexe. Le tarif ne contient que des codes ; le sens est dans les concepts.

| Table | Rôle | État |
|---|---|---|
| `compagnie`, `branche`, `branche_categorie`, `categorie`, `sous_categorie`, `genre` | Qui, quelle branche, quelle catégorie, quel genre de véhicule | Existent (21, 9, 21, 11, 18, 16 lignes) |
| `garantie`, `sous_garantie`, `garantie_lien` | Les garanties canoniques et leurs dépendances (ex. DR dépend de RC) | Existent (109, 571, 5) |
| `offre_commerciale`, `equivalence_garantie`, `equivalence_garantie_sous_garantie` | Le nom réel d'une garantie chez une compagnie, et sa composition | Existent (300, 385, 616) |
| `acte_reglementaire` | Bordereau ou texte légal, avec sa période et ses abrogations | Existe (15) |
| `regles_calcul`, `ref_base_calcul` | Mode de calcul et base de calcul | Existent (6, 6) ; modes manquants à créer |
| `majoration_reduction`, `taux_fiscalite`, `franchise`, `franchise_application` | Ajustements, taux fiscaux, conditions de franchise | Existent, peu alimentées (6, 1, 9, 36) |
| `element_tarifaire`, `type_element_tarifaire` | Ce qui est tarifé : garantie, accessoire, taxe, coefficient, ajustement ; une sous-garantie y est représentée par un lien | **À créer** |
| `dimension_tarifaire` | Décrit chaque coordonnée (code, libellé, type, valeurs admises) et la rattache au glossaire | **À créer** |
| `unite` | FCFA, pourcentage, coefficient, FCFA par place, CV, cm³, jours | **À créer** |
| `etape_calcul` | La suite ordonnée des étapes de la Prime TTC (5.5) | **À créer** |
| `loi_tarifaire` | Les lois vérifiées (zone, remorque…) : énoncé, périmètre, tolérance | **À créer** |
| `anomalie_tarifaire` | Le registre des anomalies du RUT, dans la base | **À créer** |
| `concept` | Glossaire du métier : définition, source, statut (établi ou « à confirmer ») | **À créer** |

**Notions à définir dans le glossaire à date** : RC, DR, IAC, IPT, Dommages, Tierce, Vol, Incendie, Bris de glaces, accessoires, Fichier central (ASAC), Carte rose, DTA, TVA, prime nette, Prime TTC, zone, force fiscale, cylindrée, catégorie CIMA, genre, formule, bordereau, tarif à lecture directe, repli générique, compagnie générique. Les définitions viennent du RUT ; celles qui n'y sont pas sourcées (nature fiscale du DTA, fonction de la Carte rose) entrent avec le statut « à confirmer » (règle 11).

### 5.5 — Mécanismes

**Résolution d'un tarif** (une seule procédure pour tous les éléments) :

1. On retient les lignes de l'élément demandé, **actives**, dont la période couvre la date du contrat.
2. On retient celles de la compagnie demandée ; **à défaut, celles du générique** (règle 12).
3. Pour chaque coordonnée, une ligne est éligible si sa valeur est vide ou égale à celle de la demande ; une plage de puissance vaut si la demande y tombe.
4. Parmi les éligibles : la plus **spécifique** (le plus de coordonnées renseignées qui correspondent), puis la plus récente.
5. Si deux lignes sont à égalité parfaite, ou si une coordonnée absente de la demande départagerait des candidats : **échec explicite** avec le nom du paramètre manquant.
6. Si la ligne retenue a le statut `ANOMALIE`, la réponse n'est pas un montant mais la **réponse standard** du registre.

**Calcul de la Prime TTC** : les étapes sont des lignes de `etape_calcul`, exécutées dans l'ordre. Étapes connues à date (formule vérifiée sur AFRINS, 504 lignes ; extensions aux autres compagnies et aux garanties facultatives **à confirmer**) :

| Rang | Étape | Formule | Statut |
|---|---|---|---|
| 1 | RC de base | Lecture du barème (catégorie, zone, puissance, énergie, remorque…) | Établi |
| 2 | Surprime matière inflammable | Lecture, si demandée (catégories 02 et 03) | Établi ; genre de véhicule à ajouter (#2/#3) |
| 3 | Ajustements RC réglementaires | RC × (1 + somme des ajustements en %) : art. 5 (socioprofessionnel, jeune conducteur ou permis de moins de 2 ans, clergé), art. 8 (surprime de sinistralité), art. 9 et 10 (bonification jusqu'à 10 %) | Établi (règle de cumul à confirmer) |
| 4 | DR | montant fixe + RC ajustée × taux | Établi |
| 5 | IPT / IAC | Forfait, ou montant par place × nombre de places, par composante | Établi (17 compagnies) |
| 6 | Garanties facultatives | Valeur assurée × taux ; **Vol partiel et Vol braquage s'ajoutent au Vol véhicule** (liens ADDITIF, 6.4) | Établi pour PROASSUR et ROYAL ONYX seulement |
| 7 | Coefficient de durée | Appliqué à RC + DR + IPT annuels (art. 6 de l'arrêté de 1994) | **Réglementaire** (toutes compagnies) |
| 8 | Accessoires | Palier selon prime nette et durée ; 2 500 FCFA par défaut ; 3 150 FCFA pour AFRINS, catégorie 1, annuel, prime nette supérieure à 100 000 | Établi par décision de Roger (03/10/2026) |
| 9 | Fichier central | Montant fixe par contrat : 1 000 FCFA, 500 FCFA pour le Pool TPV | Établi par décision de Roger (03/10/2026) ; absent de `tarification` |
| 10 | Assiette de TVA | Prime nette + accessoires + Fichier central | Établi sur AFRINS |
| 11 | TVA | 19,25 % × assiette | Établi (trois sources) |
| 12 | Carte rose | Montant fixe par contrat, hors assiette de TVA | Observé chez AFRINS seul |
| 13 | Prime TTC | Prime nette + accessoires + Fichier central + TVA + Carte rose | Établi sur AFRINS |
| hors prime | DTA | Lu dans le barème DTA, ajouté à la quittance | Nature à confirmer |

**Modes de calcul à créer** pour ces étapes : coefficient, palier de prime, montant fixe par contrat, ajustement en pourcentage, taxe sur assiette cumulée.

**Contrôles** : chaque loi de `loi_tarifaire` a une procédure qui liste ses violations. Lois établies à date :

| Loi | Énoncé | Conformité constatée |
|---|---|---|
| Zone | Zone B = Zone A × 23/24 ; Zone C = Zone A × 11/12 (toutes colonnes de prix) | 527 sur 535 valeurs (tolérance 0,5 %) |
| Remorque | Avec remorque = sans remorque × coefficient de la catégorie (1,1 ; 1,2 ; 1,3) | 144 sur 144, arrondis écartés |
| Vol | Taux Vol partiel = taux Vol braquage | 12 sur 12 (PROASSUR, ROYAL ONYX) |
| Cat.04B | Deux régimes linéaires par nombre de places (+9 133 puis +6 576 FCFA par place) | Confirmée, 1 anomalie isolée (#4) |

Une violation ne modifie jamais une valeur : elle alimente `anomalie_tarifaire` et fait passer la ligne en `A_CONFIRMER` ou `ANOMALIE`.

**Lisibilité** : une vue `v_tarif_lisible` remplace chaque code par son libellé (compagnie, élément, catégorie, genre, unité, source) ; chaque colonne porte un commentaire pointant vers son concept ; le glossaire donne le sens métier. Une ligne se lit alors comme une phrase : « chez ROYAL ONYX, la Défense et Recours vaut 2,5 % de la RC ajustée, pour toutes catégories, depuis telle date, selon tel document ».

### 5.6 — Procédures stockées

**Existantes** (schéma `tarification`, inventaire du 03/10/2026) :

| Procédure | Rôle | Remarque |
|---|---|---|
| `fn_calculer_prime_rc_automobile` | RC : lecture du barème selon catégorie, zone, puissance, énergie, remorque et critères propres aux catégories 06/07/08 | Passe par `offre_commerciale`. Sera remplacée par la résolution générale. |
| `fn_calculer_prime_garantie_dependante` | Prime d'une garantie qui dépend d'une autre (DR : taux × prime RC) | Lit `garantie_lien` en mode ASSIETTE. |
| `fn_resoudre_tarif_categorie` | Résolution « spécifique avant générique » d'une garantie facultative | Sa colonne de sortie `tarif_id` n'est pas alignée sur la règle 1 (visible à l'inventaire). Corps de la fonction non relu : si elle lit encore les colonnes redondantes de `tarif`, elle devra être réécrite. |
| `fn_accessoires` | Accessoires selon compagnie, branche, catégorie, prime nette, durée | Lit `bareme_accessoire`. |
| `fn_generer_code_offre_commerciale` | Génère `offre_commerciale.code` | Deux triggers (insertion, modification). |
| `fn_controle_plafond_reduction_franchise` | Contrôle des plafonds de réduction de franchise | Trigger sur `prime_element`, table vide. |
| `fn_generer_code_franchise` | Devait générer `franchise.code` | **Aucun trigger rattaché** dans le schéma d'après l'inventaire (#22). |
| `fn_sync_categorie_depuis_site`, `fn_sync_categorie_supprimee_depuis_site`, `fn_detecter_ecart_genre` | Synchronisation avec le schéma `site` | Les deux premières propagent des évolutions de `site.usages_categories` (commentaire en base). Le déclencheur de la troisième n'est pas dans le schéma `tarification` : probablement côté `site`, non inventorié. |

**Absente** : `fn_calculer_prime_nette_totale`, présentée comme l'API de prime pour myspace, **n'existe pas en base**. Elle a été écrite mais jamais déployée (anomalie #20). **Il n'existe aujourd'hui aucune procédure qui calcule une Prime nette ou TTC.**

**Cibles** (non implémentées) :

| Procédure cible | Rôle |
|---|---|
| `fn_resoudre_tarif(compagnie, élément, date, demande)` | La résolution décrite en 5.5 ; renvoie la ligne retenue, les candidates, la spécificité et le repli utilisé |
| `fn_calculer_prime_ttc(demande)` | Lit `etape_calcul`, appelle la résolution à chaque étape, renvoie le détail ligne par ligne, le total et un statut (OK, ANOMALIE, INCOMPLET) ; produit l'API attendue par myspace |
| `fn_controler_loi(code)` | Liste les violations d'une loi de `loi_tarifaire` |
| `fn_controler_rut()` | Compare le RUT à la base et signale les écarts (dette « deux sources de vérité ») |
| Triggers | Génération du `code`, journal des modifications, refus de suppression d'une ligne de tarif |

### 5.7 — Passage de l'état actuel à la cible

Où va chaque source :

| Source actuelle | Lignes | Destination dans la cible |
|---|---|---|
| `tarif` + `bareme_tranche` | 343 + 1 198 | Lignes de la table cible : RC, DR, IPT/IAC, Dommages, Vol, Incendie, Bris de glaces. Les cinq colonnes de montant deviennent `valeur` + `id_unite` ; remorque et matière inflammable deviennent une coordonnée ou un élément |
| `bareme_accessoire` | 110 | Lignes de l'élément Accessoires, avec palier de prime et durée |
| `site.bareme_dta` | 96 | Lignes de l'élément DTA, **après purge** de la redondance (#10) : seul le barème général ministériel y entre |
| `taux_fiscalite` | 1 | Lignes de l'élément TVA (19,25 %, à saisir : la ligne actuelle est illustrative) |
| `majoration_reduction` | 6 | Lignes de l'élément Ajustement |
| Fichier central, Carte rose, coefficients de durée | aucune table | Nouvelles lignes, valeurs AFRINS seules ; promotion en générique : décision de Roger en attente |
| `franchise`, `franchise_application` | 9 + 36 | Restent des concepts (C4) |

Retirés à la bascule : les colonnes redondantes de `tarif`, le champ JSON `criteres`, l'ancienne contrainte d'exclusion.

**Étapes** (aucune n'est engagée) :

1. Créer et charger les tables de concepts à partir du RUT.
2. Créer la table de tarif cible **à côté** de l'existante.
3. Charger par correspondance, avec contrôle de réconciliation : mêmes comptes, mêmes valeurs, ligne à ligne.
4. Écrire la résolution et le calcul de la Prime TTC.
5. Recetter, puis basculer les consommateurs (myspace) et retirer les anciennes tables après audit des dépendances (règles 5 et 6).
6. Poser le contrôle automatique RUT ↔ base.

**Tests de recette**, déjà disponibles :

| Test | Contenu |
|---|---|
| RC | Les 712 lignes de `bareme_rc_complet.csv` retrouvées valeur par valeur. Les cas de référence du 01/10 n'ont pas été conservés dans le RUT : liste à reconstituer |
| DR | 12 407,13 FCFA = 2,5 % de 496 285 FCFA de RC (test de la Phase 5, 02/10/2026) |
| Prime TTC | Les 504 lignes du tarif AFRINS : la procédure doit retrouver chaque TTC à ±1 FCFA |
| Lois | Les contrôles du tableau 5.5 doivent redonner les mêmes comptes de conformité |

### 5.8 — Ce que cette conception ne résout pas

- **Hors automobile** : aucune valeur à charger (4.9). Les coordonnées des autres branches (capital, âge…) ne sont pas définies.
- **Produit transversal** (Essentiel, Classique…) : les tables `produit`, `formule` et `formule_garantie` existent (9, 16 et 78 lignes) mais le modèle de regroupement commercial n'est pas conçu ; ce n'est pas un prix.
- **Valeurs génériques manquantes** (IAC, Dommages, Fichier central, Carte rose, accessoires) : l'architecture sait les accueillir, elle ne les invente pas.
- **Données connues d'AFRINS seul** : la table les stockera, avec leur source, sans les généraliser (règle 10).
- **Un seul point d'entrée** ne dispense pas de l'audit : tout renommage ou retrait reste soumis aux règles 5 et 6.

---

## Pilier 2 (v5.1) — Contenu des référentiels et des règles stockées en base

**Nature de cette section** : le contenu réel des tables de référence et de règles, relevé par export le 03/10/2026, qui manquait au RUT (jusqu'à la v5.0, il n'en donnait que les comptes). Il permet de répondre sans requête. Les listes complètes sont en [annexe C](RUT_annexe_C_referentiels.md), [annexe D](RUT_annexe_D_denominations_par_compagnie.md) et [annexe E](RUT_annexe_E_accessoires.md). **Les valeurs sont celles de la base, qui peut différer des décisions prises hors base** (voir 6.1).

### 6.1 — Compagnies

| id | Code | Nom commercial (à défaut, `nom`) | Actif site | Statut agrément |
|---|---|---|---|---|
| 0 | AUCUNE | Aucune (Mutuelle Pro Assurances) | True | ACTIF |
| 1 | GMCSA | Garantie Mutuelle des Cadres | True | ACTIF |
| 2 | NSIA | NSIA Cameroun | True | ACTIF |
| 3 | AREA | AREA Assurances SA | True | ACTIF |
| 4 | PROASSUR | Société Pro Assur | True | ACTIF |
| 5 | CHANAS | Chanas Assurances SA | True | ACTIF |
| 6 | BELIFE | Belife General Insurance | True | ACTIF |
| 7 | CPA | CPA - Assurances | True | ACTIF |
| 8 | ROYAL ONYX | Royal Onyx | True | ACTIF |
| 9 | AFG | AFG Assurances Cameroun | True | ACTIF |
| 10 | ACTIVA | Activa Assurances SA | True | ACTIF |
| 11 | ALLIANZ | Allianz Assurances | True | ACTIF |
| 12 | AGC | Assurances Générales du Cameroun | True | ACTIF |
| 13 | ZENITHE | SOCAR | True | ACTIF |
| 14 | SAAR | Société Africaine d'Assurance et de Réassurance SA | True | ACTIF |
| 15 | SUNU | SUNU Assurances IARD Cameroun | True | ACTIF |
| 16 | SANLAM | Sanlam Cameroun | True | ACTIF |
| 17 | LDASA | LD Assurances SA | True | ACTIF |
| 18 | AXA | AXA Assurances Cameroun | True | ACTIF |
| 19 | AFRINS | Afri Insurance | True | ACTIF |
| 21 | SAMIRIS | Alpha Assurances | True | ACTIF |

Constats :

- **SAMIRIS (id 21)** : la base indique `actif_site = true` et `statut_agrement = ACTIF`, alors que Roger l'a déclarée inactive le 03/10/2026. Son nom commercial en base est « Alpha Assurances ». **La base n'a pas été mise à jour** (anomalie #25).
- **ZENITHE (id 13)** : `nom` est resté « SOCAR » et `nom_commercial` est vide. `nom` garde de même ATLANTIQUE (AFG), BENEFICIAL (BELIFE) et ALPHA (SAMIRIS) : le renommage n'a porté que sur `code_compagnie`. Le script `MAJ_BASE_03102026.sql` aligne `nom` de ZENITHE et de SAMIRIS sur leur code (anomalie #25).
- **Aucune compagnie n'a de numéro ni de date d'agrément, ni de date de révocation** : ces colonnes sont vides pour les 21 lignes. L'id 20 n'existe pas.
- **Accessoires par défaut : 2 500 FCFA pour les 21 compagnies** (colonne `accessoires_par_defaut`) — valeur retrouvée dans le tarif AFRINS. Mais le barème générique `bareme_accessoire` (AUCUNE, branche Automobile) donne **3 000 FCFA** : deux valeurs génériques concurrentes (anomalie #29).

### 6.2 — Actes réglementaires et bordereaux (15)

Chaque ligne de tarif renvoie à un acte. Un acte est un texte légal, une convention ou un barème interne de compagnie :

| id | Référence | Type | Autorité | Signé le |
|---|---|---|---|---|
| 1 | N°00380/MINEF/DCE/A | ARRETE | MINISTERE_FINANCES | 1994-11-16 |
| 6 | Note de service N°0012/22 | BAREME_INTERNE | PROASSUR SA (WAFA Assurance) | — |
| 7 | Tarif Automobile Garantie facultative POOL (usages 04A/04B/04C) | CONVENTION | Pool TPV (GIE) | — |
| 9 | Extension territoriale CEMAC (Carte Rose) | CONVENTION | CIMA / Zone CEMAC | — |
| 10 | Tarif Automobile SUNU (barème interne, hors RC) | BAREME_INTERNE | SUNU | — |
| 12 | Tarif Automobile SUNU - Vol (barème interne) | BAREME_INTERNE | SUNU | — |
| 13 | Tarif Automobile Royal Onyx (barème interne) | BAREME_INTERNE | ROYAL ONYX INSURANCE | — |
| 14 | Tarif Automobile Royal Onyx par catégorie (barème interne) | BAREME_INTERNE | ROYAL ONYX INSURANCE | — |
| 15 | Franchises Automobile (standard et facultatives) | BAREME_INTERNE | Multi-compagnies (LDASA, GMCSA, SAAR) | — |
| 18 | Individuelle Personnes Transportées / Accidents Conducteur (barèmes internes multi-compagnies) | BAREME_INTERNE | Multi-compagnies (17 compagnies + niveau générique) | — |
| 19 | Brigandage et Vol des accessoires (barèmes internes multi-compagnies) | BAREME_INTERNE | Multi-compagnies (LDASA, SAAR, CPA + niveau générique) | — |
| 22 | IAC/IPT décomposé par sous-garantie (Décès/IPP/Frais médicaux) | BAREME_INTERNE | Multi-compagnies (17 compagnies + niveau générique) | — |
| 23 | Défense Recours — taux générique 5% RC/RTI | BAREME_INTERNE | Référentiel canonique (toutes compagnies par défaut) | — |
| 24 | Défense Recours — 14 compagnies (forfait ou %RC, sans distinction de catégorie) | BAREME_INTERNE | Multi-compagnies (14 compagnies) | — |
| 25 | Défense Recours — 5 compagnies complémentaires | BAREME_INTERNE | Multi-compagnies (AFRINS, ALLIANZ, ALPHA, AXA, SOCAR) | — |

Territoire et devise : CM / XAF (15). Le texte fondateur du barème RC est l'**arrêté n° 00380/MINEF/DCE/A du 16/11/1994** (Ministère des Finances). La note de service n° 0012/22 de PROASSUR (WAFA Assurance) est l'acte n° 6 ; la convention du Pool TPV (usages 04A, 04B, 04C) est l'acte n° 7 ; l'**Extension territoriale CEMAC (Carte rose)** est l'acte n° 9, une convention CIMA / zone CEMAC.

### 6.3 — Majorations et réductions (`majoration_reduction`, 6 lignes)

| id | Compagnie | Garantie | Critère | Type | Taux % | Description |
|---|---|---|---|---|---|---|
| 1 | AUCUNE | RC / RESPONSABILITE_CIVILE_STRICTE | CATEGORIE_SOCIOPRO_FORTE_CIRCULATION | MAJORATION | 10 | Délégués médicaux, Agents publicitaires, Agents d'affaires — RC uniquement |
| 2 | AUCUNE | RC / RESPONSABILITE_CIVILE_STRICTE | CONDUCTEUR_JEUNE_OU_PERMIS_RECENT | MAJORATION | 10 | Conducteur de moins de 25 ans OU permis de conduire de moins de 3 ans — RC uniquement |
| 3 | AUCUNE | RC / RESPONSABILITE_CIVILE_STRICTE | CLERGE_FAIBLE_CIRCULATION | REDUCTION | -10 | Membres du clergé classés catégorie à faible circulation — RC uniquement |
| 4 | SUNU | VOL / VOL_BRAQUAGE | DISPOSITIF_ALARME_ANTI_BRAQUAGE | REDUCTION | -20 | Installation d'un dispositif d'alarme ou de protection contre le braquage — Vol uniquement |
| 5 | SUNU | VOL / VOL_PARTIEL | DISPOSITIF_ALARME_ANTI_BRAQUAGE | REDUCTION | -20 | Installation d'un dispositif d'alarme ou de protection contre le braquage — Vol uniquement |
| 6 | SUNU | VOL / VOL_VEHICULE | DISPOSITIF_ALARME_ANTI_BRAQUAGE | REDUCTION | -20 | Installation d'un dispositif d'alarme ou de protection contre le braquage — Vol uniquement |

Les trois premières s'appliquent à la **RC uniquement**, au niveau générique (toutes compagnies, repli règle 12) : +10 % pour les délégués médicaux, agents publicitaires et agents d'affaires ; +10 % pour un conducteur de moins de 25 ans ou un permis de moins de 2 ans (l'arrêté dit 2 ans, la base dit 3 ans : anomalie #30) ; −10 % pour le clergé classé à faible circulation. Les trois autres sont des **réductions de 20 % chez SUNU** sur le Vol (véhicule, partiel, braquage) en cas de dispositif d'alarme ou de protection contre le braquage. Toutes sont en vigueur depuis le 01/01/2000. **Règle de cumul non documentée** : additif ou multiplicatif — à confirmer.

### 6.4 — Liens entre garanties (`garantie_lien`, 5 lignes)

Un lien dit qu'une garantie en entraîne une autre. Deux modes : **ADDITIF** (les deux primes s'additionnent) et **ASSIETTE** (la prime de l'une est la base de l'autre).

| id | Mode | Garantie déclenchante | Garantie déclenchée | Note de la base |
|---|---|---|---|---|
| 1 | ADDITIF | VOL / VOL_PARTIEL | VOL / VOL_VEHICULE | Vol Partiel stocke un différentiel — combiné = Vol Total + Vol Partiel |
| 2 | ADDITIF | VOL / VOL_BRAQUAGE | VOL / VOL_VEHICULE | Vol Braquage stocke sa valeur pleine, indépendante — combiné = Vol Total + Vol Braquage |
| 5 | ADDITIF | RC / RESPONSABILITE_CIVILE_STRICTE | RC / RECOURS_TIERS_INCENDIE | Obligatoire au choix de la RC (Roger, 30/09/2026) |
| 6 | ADDITIF | RC / RESPONSABILITE_CIVILE_STRICTE | RC / EXTENSION_CEMAC | Obligatoire au choix de la RC (Roger, 30/09/2026) |
| 7 | ASSIETTE | DEFENSE_RECOURS / DEFENSE_RECOURS | RC / RESPONSABILITE_CIVILE_STRICTE | Défense et recours Cat.6-10 (%RC) -- repris le 01/10/2026 apres abandon au profit de prime_elements, toujours inutilise |

Conséquences pour le calcul :

- **Choisir la RC rend obligatoires, en plus, le Recours des tiers après incendie et l'Extension CEMAC** (décision de Roger, 30/09/2026). La présence de l'Extension CEMAC dans la prime RC est à rapprocher de la Carte rose chez AFRINS (1 000 FCFA, 3.4) : le lien entre les deux n'est pas établi — **à confirmer**.
- **Vol partiel et Vol braquage s'ajoutent au Vol véhicule** : la prime combinée vaut Vol véhicule + Vol partiel, ou Vol véhicule + Vol braquage. La base précise que le Vol partiel stocke un différentiel et le Vol braquage une valeur pleine ; les taux stockés sont pourtant égaux (loi Vol partiel = Vol braquage, 4.x). **Interprétation à confirmer.**
- **La DR est calculée sur la prime RC** (mode ASSIETTE, catégories 6 à 10 en pourcentage). Le lien avait été abandonné au profit de `prime_element`, resté inutilisé, puis repris le 01/10/2026.

### 6.5 — Franchises et réductions réglementaires

**Franchises** (`franchise`, 9 lignes) — sur Tierce collision et Dommages par accident :

| Garantie | Franchise | Caractère | Taux % |
|---|---|---|---|
| TIERCE_COLLISION / TIERCE_COLLISION | Franchise 10% (obligatoire) | OBLIGATOIRE | 10 |
| TIERCE_COLLISION / TIERCE_COLLISION | Franchise 5% | OBLIGATOIRE | 5 |
| TIERCE_COLLISION / TIERCE_COLLISION | 1% Valeur neuve actualisée | OBLIGATOIRE | 1 |
| DOMMAGES_PAR_ACCIDENT / DOMMAGES_PAR_ACCIDENT | Franchise 30% (facultative) | FACULTATIVE | 30 |
| DOMMAGES_PAR_ACCIDENT / DOMMAGES_PAR_ACCIDENT | Franchise 20% (facultative) | FACULTATIVE | 20 |
| DOMMAGES_PAR_ACCIDENT / DOMMAGES_PAR_ACCIDENT | Franchise 10% (facultative) | FACULTATIVE | 10 |
| DOMMAGES_PAR_ACCIDENT / DOMMAGES_PAR_ACCIDENT | Franchise 10% (obligatoire) | OBLIGATOIRE | 10 |
| DOMMAGES_PAR_ACCIDENT / DOMMAGES_PAR_ACCIDENT | Franchise 5% | OBLIGATOIRE | 5 |
| DOMMAGES_PAR_ACCIDENT / DOMMAGES_PAR_ACCIDENT | 1% Valeur neuve actualisée | OBLIGATOIRE | 1 |

**Règles réglementaires** (`regles_reduction_franchise`, 4 lignes, catégorie 01) :

| Règle | Caractère | Type | Taux min % | Taux max % | Source |
|---|---|---|---|---|---|
| Réduction pluralité 2 à 20 véhicules | FACULTATIVE | REDUCTION | 0 | 10 | Art.12(2)a |
| Réduction pluralité plus de 20 véhicules | FACULTATIVE | REDUCTION | 0 | 15 | Art.12(2)b |
| Franchise RC Catégorie 1/10B | OBLIGATOIRE | FRANCHISE | 5 | 5 | Page 24 — min 75 000 FCFA, non négociable |
| Franchise avance sur recours | FACULTATIVE | FRANCHISE | 0 | 25 | Page 24 — reversée à l'assuré à l'aboutissement du recours |

Lecture : une franchise RC obligatoire de 5 % avec un minimum de 75 000 FCFA, non négociable ; une franchise facultative d'avance sur recours de 0 à 25 %, reversée à l'assuré quand le recours aboutit (page 24 du texte) ; une **réduction pour pluralité de véhicules** jusqu'à 10 % pour 2 à 20 véhicules et jusqu'à 15 % au-delà de 20 (art. 12-2 a et b). Ces réductions concernent les flottes ; la base de calcul `SOMME_PRIMES_FLOTTE` existe (6.8).

**Applications par compagnie** (`franchise_application`, 36 lignes, détail en annexe C) :

| Compagnie | Lignes | Réductions de prime % | Catégories |
|---|---|---|---|
| GMCSA | 3 | — | 01 |
| LDASA | 30 | — | 01, 02, 03, 04A, 04B, 04C, 06, 07ARC, 07SRC, 08, 09A, 10A, 10B, 10C |
| SAAR | 3 | — | 01 |

### 6.6 — Formules de souscription automobile (`formule`, 16 lignes)

**Correction** : les versions v3.0 à v5.0 du RUT affirmaient que les formules n'avaient « aucune donnée ». C'est inexact : la base contient 16 formules et 78 liens formule/garantie. Ce qui n'existe pas, ce sont des noms commerciaux (Essentiel, Classique…) et un regroupement par compagnie.

Une formule est un **paquet de garanties**, choisi selon l'âge du véhicule et son genre. Les formules sont génériques (sans compagnie).

| id | Genre | Âge | N° | Libellé | Garanties (dans l'ordre) |
|---|---|---|---|---|---|
| 1 | DEUX_TROIS_ROUES | — | 1 | Formule unique 2-3 roues : RC/RTI + DR | RC_AUTO ; DEFENSE_RECOURS |
| 2 | TAXI | — | 1 | Formule unique Taxi : RC/RTI + DR + IAC | RC_AUTO ; DEFENSE_RECOURS ; INDIVIDUELLE_ACCIDENTS_CONDUCTEUR |
| 3 | ENGIN | — | 1 | Formule Engin 1 : RC/RTI + DR | RC_AUTO ; DEFENSE_RECOURS |
| 4 | ENGIN | — | 2 | Formule Engin 2 : RC/RTI + DR + IAC | RC_AUTO ; DEFENSE_RECOURS ; INDIVIDUELLE_ACCIDENTS_CONDUCTEUR |
| 5 | AUTRE | JUSQUA_3_ANS | 1 | Formule 1 (<=3 ans) : RC/RTI + DR + IPT | RC_AUTO ; DEFENSE_RECOURS ; INDIVIDUELLE_PERSONNES_TRANSPORTEES |
| 6 | AUTRE | JUSQUA_3_ANS | 2 | Formule 2 (<=3 ans) : + Vol (véhicule+partiel) + Incendie + Bris de glaces | RC_AUTO ; DEFENSE_RECOURS ; INDIVIDUELLE_PERSONNES_TRANSPORTEES ; VOL / VOL_VEHICULE ; VOL / VOL_PARTIEL ; INCENDIE / INCENDIE ; BRIS_DE_GLACES |
| 7 | AUTRE | JUSQUA_3_ANS | 3 | Formule 3 (<=3 ans) : + Vol (véhicule+partiel) + Incendie + Tierce Complète | RC_AUTO ; DEFENSE_RECOURS ; INDIVIDUELLE_PERSONNES_TRANSPORTEES ; VOL / VOL_VEHICULE ; VOL / VOL_PARTIEL ; INCENDIE / INCENDIE ; DOMMAGES_PAR_ACCIDENT |
| 8 | AUTRE | PLUS_3_ANS | 1 | Formule 1 (>3 ans) : RC/RTI + DR + IPT | RC_AUTO ; DEFENSE_RECOURS ; INDIVIDUELLE_PERSONNES_TRANSPORTEES |
| 9 | AUTRE | PLUS_3_ANS | 2 | Formule 2 (>3 ans) : + Vol (véhicule+partiel) + Incendie + Avance sur Recours | RC_AUTO ; DEFENSE_RECOURS ; INDIVIDUELLE_PERSONNES_TRANSPORTEES ; VOL / VOL_VEHICULE ; VOL / VOL_PARTIEL ; INCENDIE / INCENDIE ; AVANCE_RECOURS |
| 10 | AUTRE | PLUS_3_ANS | 3 | Formule 3 (>3 ans) : + Vol (véhicule+partiel) + Incendie + Tierce Collision | RC_AUTO ; DEFENSE_RECOURS ; INDIVIDUELLE_PERSONNES_TRANSPORTEES ; VOL / VOL_VEHICULE ; VOL / VOL_PARTIEL ; INCENDIE / INCENDIE ; DOMMAGES_PAR_ACCIDENT |
| 11 | AUTRE_IAC | JUSQUA_3_ANS | 1 | Formule 1 (<=3 ans, 04B/04C) : RC/RTI + DR + IAC | RC_AUTO ; DEFENSE_RECOURS ; INDIVIDUELLE_ACCIDENTS_CONDUCTEUR |
| 12 | AUTRE_IAC | JUSQUA_3_ANS | 2 | Formule 2 (<=3 ans, 04B/04C) : + Vol (véhicule+partiel) + Incendie + Bris de glaces | RC_AUTO ; DEFENSE_RECOURS ; INDIVIDUELLE_ACCIDENTS_CONDUCTEUR ; VOL / VOL_VEHICULE ; VOL / VOL_PARTIEL ; INCENDIE / INCENDIE ; BRIS_DE_GLACES |
| 13 | AUTRE_IAC | JUSQUA_3_ANS | 3 | Formule 3 (<=3 ans, 04B/04C) : + Vol (véhicule+partiel) + Incendie + Tierce Complète | RC_AUTO ; DEFENSE_RECOURS ; INDIVIDUELLE_ACCIDENTS_CONDUCTEUR ; VOL / VOL_VEHICULE ; VOL / VOL_PARTIEL ; INCENDIE / INCENDIE ; DOMMAGES_PAR_ACCIDENT |
| 14 | AUTRE_IAC | PLUS_3_ANS | 1 | Formule 1 (>3 ans, 04B/04C) : RC/RTI + DR + IAC | RC_AUTO ; DEFENSE_RECOURS ; INDIVIDUELLE_ACCIDENTS_CONDUCTEUR |
| 15 | AUTRE_IAC | PLUS_3_ANS | 2 | Formule 2 (>3 ans, 04B/04C) : + Vol (véhicule+partiel) + Incendie + Avance sur Recours | RC_AUTO ; DEFENSE_RECOURS ; INDIVIDUELLE_ACCIDENTS_CONDUCTEUR ; VOL / VOL_VEHICULE ; VOL / VOL_PARTIEL ; INCENDIE / INCENDIE ; AVANCE_RECOURS |
| 16 | AUTRE_IAC | PLUS_3_ANS | 3 | Formule 3 (>3 ans, 04B/04C) : + Vol (véhicule+partiel) + Incendie + Tierce Collision | RC_AUTO ; DEFENSE_RECOURS ; INDIVIDUELLE_ACCIDENTS_CONDUCTEUR ; VOL / VOL_VEHICULE ; VOL / VOL_PARTIEL ; INCENDIE / INCENDIE ; DOMMAGES_PAR_ACCIDENT |

**Quelle famille de formules pour quelle catégorie** (`formule_categorie_mapping`) :

| Famille de formules | Catégories |
|---|---|
| AUTRE | 01, 02, 03, 07ARC, 07SRC, 08, 10A, 10B, 10C |
| AUTRE_IAC | 04B, 04C |
| DEUX_TROIS_ROUES | 05, 05bis, 06 |
| ENGIN | 09A, 09B |
| TAXI | 04A |

Lecture : les formules 1, 2 et 3 d'une famille « Autre » ajoutent progressivement Vol (véhicule et partiel), Incendie, puis Bris de glaces (formule 2, véhicule récent) ou Avance sur recours (formule 2, véhicule ancien), puis Dommages par accident (formule 3, présentée « Tierce complète » ou « Tierce collision » selon l'âge). La famille « Autre IAC » (04B, 04C) remplace l'IPT par l'IAC. **Ne pas confondre** avec les numéros de formule IPT/IAC de chaque compagnie (v2.0), qui désignent des niveaux de capital propres à la compagnie.

### 6.7 — Produits et offres historiques

| Code | Produit | Segment | Branche en base | Sous-catégories liées |
|---|---|---|---|---|
| AUCUN | Aucun / Non applicable | — | Aucune / Non applicable | 0 |
| AUTO_MONO_VEHICULE | Assurance Automobile mono véhicule | PARTICULIERS | Automobile | 17 |
| SANTE_MATERNITE | Santé & Maternité | PARTICULIERS | Maladie et assurances des personnes | 0 |
| MULTIRISQUE_HABITATION | Multirisque Habitation | PARTICULIERS | Incendie & autres dommages | 0 |
| VOYAGE_ASSISTANCE | Voyage & Assistance | PARTICULIERS | Transport, Corps et Facultés | 0 |
| FLOTTES_AUTOMOBILE | Flottes Automobile | ENTREPRISES | Automobile | 17 |
| SANTE_COLLECTIVE_SALARIES | Santé Collective Salariés | ENTREPRISES | Maladie et assurances des personnes | 0 |
| RC_PRO_MULTIRISQUE | RC Pro & Multirisque | ENTREPRISES | Aucune / Non applicable | 0 |
| TRANSPORT_MARCHANDISES | Transport de Marchandises | ENTREPRISES | Transport, Corps et Facultés | 0 |

Il existe **trois structures** pour le nom commercial d'une garantie chez une compagnie : `offre` (146 lignes) avec `detail_offre` (234), `offre_commerciale` (300) et `equivalence_garantie` (385). La première est historique ; son champ `id_produit` n'est renseigné que sur 1 des 146 lignes. Elles ne sont pas rapprochées (anomalie #26). Le produit `RC_PRO_MULTIRISQUE` n'est rattaché à aucune branche (identifiant 0) ; seuls les deux produits automobile (mono véhicule et flottes) ont des sous-catégories liées (17 chacun).

### 6.8 — Règles de calcul et bases de calcul

**Règles** (`regles_calcul`, 6 lignes — contenu vérifié par l'export du 03/10/2026) :

| Code | Mode | Base | Formule |
|---|---|---|---|
| AUTO_BAREME_FF_ZONE | BAREME_TRANCHE | GRILLE_ZONE_FORCE_FISCALE | lookup(force_fiscale, zone, avec_remorque) -> montant_fixe |
| IPT_FORFAIT_PALIER | MONTANT_FORFAITAIRE | CAPITAL_GARANTIE_CHOISI | lookup(formule_choisie) -> montant_fixe |
| TAUX_POURCENTAGE_SIMPLE | TAUX_POURCENTAGE | VALEUR_ASSUREE_OBJET | valeur_assuree x taux_pct |
| VOL_TAUX_AGE_VEHICULE | TAUX_POURCENTAGE | VALEUR_ASSUREE_OBJET | valeur_assuree x taux_pct, tranche selon age_vehicule_annees |
| NOMBRE_PLACES_FORFAIT_PAR_PLACE | MONTANT_FORFAITAIRE | NOMBRE_PLACES_VEHICULE | montant_fixe x nombre_places_vehicule |
| DR_POURCENTAGE_RC | TAUX_POURCENTAGE | PRIME_ELEMENT_MEME_POLICE | prime_RC_deja_calculee x taux_pct -- subordonne a garantie_liens mode ASSIETTE |

**Bases** (`ref_base_calcul`, 6 lignes) :

| Code | Libellé | Description |
|---|---|---|
| SOMME_PRIMES_FLOTTE | Somme des primes d'une flotte | Dépend de la somme des primes de plusieurs polices regroupées |
| GRILLE_ZONE_FORCE_FISCALE | Grille par zone/force fiscale/tonnage... | Lecture directe dans baremes_tranches, cas standard |
| NOMBRE_PLACES_VEHICULE | Nombre de places du véhicule | Le montant stocké est un tarif PAR PLACE — la prime réelle est ce montant multiplié par le nombre de places du véhicule assuré. |
| VALEUR_ASSUREE_OBJET | Valeur assurée de l'objet | Lit criteres_objet/caracteristiques_objet.valeur_assuree |
| CAPITAL_GARANTIE_CHOISI | Capital de garantie choisi (palier) | Palier fixe choisi par le souscripteur — forfait, pas un pourcentage |
| PRIME_ELEMENT_MEME_POLICE | Une autre ligne de prime de la même police | Dépend d'un prime_elements.id précédent |

La règle `VOL_TAUX_AGE_VEHICULE` indique que le taux de Vol varie par **tranche d'âge du véhicule** : cette coordonnée n'existe pas encore dans le barème (elle est ajoutée à la table cible, 5.3). `taux_fiscalite` ne contient qu'une ligne « Aucun / non applicable » à 0 % : la TVA à 19,25 % n'y est pas.

### 6.9 — Accessoires en base (`bareme_accessoire`, 110 lignes)

Détail en [annexe E](RUT_annexe_E_accessoires.md). Résumé par compagnie :

| Compagnie | Lignes | Montants distincts (FCFA) | Paliers | Branches |
|---|---|---|---|---|
| ACTIVA | 2 | 3 000 | aucun | AUTOMOBILE, SANTE |
| AFG | 27 | 0, 3 000, 3 500, 5 000, 10 000, 20 000, 25 000, 50 000, 100 000 | plage | AUTOMOBILE, RC_GENERALE, RISQUES_TECHNIQUES, TRANSPORT |
| AFRINS | 1 | 3 000 | aucun | toutes (vide) |
| AGC | 4 | 5 000, 100 000 | plage | AUTOMOBILE |
| ALLIANZ | 6 | 3 000, 5 000, 10 000, 20 000 | aucun, plage, signe | AUTOMOBILE |
| AREA | 8 | 3 000, 7 000, 10 000, 15 000, 25 000, 40 000 | aucun, plage | AUTOMOBILE, CREDIT_CAUTIONS, INCENDIE, toutes (vide), RC_GENERALE, RISQUES_TECHNIQUES, SANTE, TRANSPORT |
| AUCUNE | 2 | 1 000, 3 000 | aucun | AUTOMOBILE, toutes (vide) |
| BELIFE | 3 | 3 000, 10 000, 25 000 | plage | toutes (vide) |
| CHANAS | 4 | 3 000, 10 000, 20 000, 50 000 | aucun, plage | toutes (vide) |
| CPA | 5 | 0, 3 000, 5 000 | aucun, plage, signe | AUTOMOBILE, toutes (vide) |
| GMCSA | 17 | 0, 3 000, 5 000, 10 000, 15 000, 25 000, 50 000 | aucun, plage, signe | AUTOMOBILE, AVIATION, CREDIT_CAUTIONS, INCENDIE, toutes (vide), RC_GENERALE, RISQUES_TECHNIQUES, SANTE, TRANSPORT |
| LDASA | 5 | 5 000, 10 000, 20 000, 25 000, 50 000 | plage | AUTOMOBILE |
| NSIA | 4 | 3 000, 5 000, 10 000 | plage, signe | AUTOMOBILE |
| PROASSUR | 5 | 2 500, 3 000, 5 000 | aucun | AUTOMOBILE, toutes (vide) |
| ROYAL ONYX | 9 | 3 000, 4 000, 5 000 | aucun, plage, signe | AUTOMOBILE |
| SAAR | 1 | 3 000 | aucun | toutes (vide) |
| SANLAM | 1 | 3 000 | aucun | toutes (vide) |
| SUNU | 6 | 3 000, 4 000, 5 000, 10 000 | aucun, plage | AUTOMOBILE |

**Lecture** : « toutes (vide) » signifie que la branche n'est pas renseignée dans la ligne. **AFRINS n'a qu'une ligne**, à 3 000 FCFA, sans palier, sans branche, avec le risque source « [NON IDENTIFIEE] ». Le tarif AFRINS donne pourtant 2 500 FCFA d'accessoires (3 150 FCFA au-delà de 100 000 FCFA de prime nette, règle de Roger) **plus** un Fichier central de 1 000 ou 500 FCFA ; 3 000 FCFA est le montant de « Accessoires + Fichier ASAC » de la fiche Cat.4A. Le niveau générique (AUCUNE) porte 3 000 FCFA pour l'Automobile et 1 000 FCFA (inactif) pour « Green Assistance Conducteur » (anomalie #29). **Décision du 03/10/2026 (7.6)** : les 3 000 FCFA sont une erreur de la base ; la valeur juste est 2 500 FCFA.

### 6.10 — Dénominations par compagnie (`equivalence_garantie`, 385 lignes)

Liste complète en [annexe D](RUT_annexe_D_denominations_par_compagnie.md). Nombre de dénominations par compagnie :

| Compagnie | Dénominations |
|---|---|
| CPA | 29 |
| NSIA | 25 |
| ALLIANZ | 24 |
| LDASA | 24 |
| AREA | 23 |
| SUNU | 22 |
| ZENITHE | 21 |
| AUCUNE | 20 |
| SAAR | 20 |
| ROYAL ONYX | 18 |
| AFG | 17 |
| AGC | 17 |
| GMCSA | 16 |
| ACTIVA | 15 |
| PROASSUR | 15 |
| CHANAS | 15 |
| SANLAM | 15 |
| None | 14 |
| AFRINS | 14 |
| BELIFE | 13 |
| SAMIRIS | 8 |

### 6.11 — Registre des sources

Les fichiers sur lesquels repose le RUT, leur nature, ce qu'on en a tiré et ce qui reste à faire. Jusqu'à la v5.0, 19 d'entre eux n'étaient pas cités.

| Fichier | Nature | Taille | Exploitation |
|---|---|---|---|
| `Tarif_Ministériel.pdf` | **Document fourni par SUNU** (acte n° 10), 34 pages : arrêté de 1994 (p.2-6), directives de souscription SUNU (p.7-13), barèmes RC par zone et catégorie (p.14-32), options IPT/IAC SUNU (p.33), accessoires SUNU (p.34) | 34 p., **scan sans texte** | **Lu en v5.2** par OCR (7.1 à 7.4) ; source de `bareme_rc_complet.csv` |
| `bareme_rc_complet.csv` | Extraction du barème RC | 712 lignes | Chargé en base ; base du RUT 2.3 |
| `AFRI_INSURANCE_SA_-_TARIF_AUTOMOBILE_A_LECTURE_DIRECTE.pdf` | Tarif à lecture directe AFRINS : RC + DR + IPT, Cat.1 à 3 en zones A, B, C sur 5 durées, Cat.4A, Cat.5A | 22 p., texte | 504 lignes lues et vérifiées (RUT 3.1) ; seule source de la Prime TTC |
| `NOTE_DE_SERVICE_N_0012_PORTANT_TARIF_ET_CONDITIONS_DE_SOUSCRIPTION_AUTOMOBILE_PROASSUR__WAFA_ASSURANCE_-2.pdf` | Note de service n° 0012/22 PROASSUR (WAFA) : tarif et conditions de souscription (acte n° 6) | 7 p., **scan sans texte** | Tarif exploité (DR PROASSUR) ; **conditions de souscription non exploitées** |
| `Tarif_Automobile_Garantie_facultative_POOL.pdf` | Garanties facultatives du Pool TPV, usages 04A/04B/04C (acte n° 7) | 1 p., **scan sans texte** | Exploité (RUT 4.x, AUCUNE en Cat.04) |
| `Tarif_Automobile_garanties_facultatives__2_.pdf` | Garanties facultatives automobile | 2 p., **scan sans texte** | Contenu non relu dans cette phase |
| `Tarif_automobile_automatisé.csv` | Tarif automatisé GMCSA, colonne « Genre ou Classe », « Taux Taxes » 19,25 % | 5112 lignes | Source de la découverte du genre de véhicule (#2/#3) et de la TVA ; rapprochement avec la base non fait |
| `Tarif_automobile_automatisé_autres.csv` | Tarif automatisé des autres compagnies (ALLIANZ, AREA, CPA, GMCSA, LDASA, PROASSUR, ROYAL ONYX, SUNU, générique) | 798 lignes | Non citée jusqu'à la v5.0 ; rapprochement avec la base non fait |
| `Tarif_automobile_base_autres.csv` | Tarif de base des autres compagnies (30 colonnes, anciens noms de compagnies) | 338 lignes | Non citée jusqu'à la v5.0 ; rapprochement avec la base non fait |
| `Garanties.csv` | Dénominations de garanties par compagnie, toutes branches | 878 lignes | Automobile : base ; hors automobile : annexe B |
| `Garanties_canoniques.csv` | Garanties canoniques, colonne « Taux Taxes » à 0,00 % | 256 lignes | Sens de la colonne à clarifier (RUT 3.6) |
| `Garanties_IAC_et_IPT.csv` | Garanties IAC et IPT par compagnie, avec colonnes de franchise | 89 lignes | Contenu non relu dans cette phase |
| `Compléments_DR.csv` | Défense et recours : 5 compagnies complémentaires (AFRINS, ALLIANZ, ALPHA, AXA, SOCAR), acte n° 25 | 5 lignes | Exploité (RUT DR) |
| `Frais_et_accessoires.csv` | Table d'origine du 25/09 des frais accessoires et du Fichier central par compagnie, risque, palier de prime et durée | 115 lignes | **Source des accessoires** : décisions du 03/10 en 7.6, comparaison en annexe F ; en cas de divergence avec une autre source, décision au cas par cas |
| `Franchises.csv` | Franchises Automobile (LDASA, GMCSA, SAAR), acte n° 15 | 36 lignes | Exploité (6.5) |
| `Offre_commerciale_autre_source.csv` | Offres génériques de toutes les branches (compagnie 0) | 1205 lignes | Source du catalogue hors automobile (RUT 4.2) ; **ne contient aucun prix** |
| `OFFRE_COMMERCIALE.sql` | Script SQL de l'offre commerciale | — | Contenu non relu dans cette phase |
| `extraction_dta.csv` | Barème DTA (96 lignes, `site.bareme_dta`) | 96 lignes | Intégré (RUT 3.5) ; redondance à purger (#10) |
| `livraison_bareme_accessoires_25092026__1_.md` | Livraison du barème des accessoires | — | Contexte de `bareme_accessoire` (6.9) |
| `PASSATION_TARIFICATION_16082026.md` | Passation technique du 16/08 : système Genre → État → Usage → Catégorie, légende des codes catégorie CIMA | — | Contexte de la classification des véhicules |
| `RETOUR_TARIFICATION_*_18082026.md (3 fichiers)` | Clôture du point 05-TRI ; bascule `id_genre` (questions de la Phase 3) ; précision sur le tricycle | — | Décisions d'août, non reprises dans le Pilier 3 |
| `demande_accord_*_25092026.md, relance_accord_tarification_28092026.md, relance_flotte_99_26092026.md` | Accords entre sessions : compagnies (`compagnies` devenue une vue), barème des accessoires, code 99 (Flotte) | — | Décisions de coordination, non reprises dans le Pilier 3 ; état de l'accord Flotte 99 non vérifié |
| `devis.js, index.html` | Code du site public | — | **Non analysés** : la logique de devis côté site reste à documenter |
| `Tarifs à lecture directe Individuelle accidents (4 classeurs), MRH, Voyage` | Tarifs hors automobile | — | Écartés sur décision de Roger (4.8) |

### 6.12 — Pièges de lecture des sources

- **Deux PDF sont des scans sans couche texte** (le tarif SUNU / ministériel et la note PROASSUR) : une extraction automatique ne renvoie rien. **L'OCR fonctionne** (Tesseract, modèle français, 200 dpi) mais confond des chiffres et perd des mots : tout montant critique doit être vérifié visuellement. Cas rencontrés : tableau de taux SUNU illisible, « 105 % » pour 1,05 %, « 0,50%0 » pour 0,50 ‰, « 1056 » pour 10 %, « 0080 » pour 00380.
- **Les CSV sont en ISO-8859-1**, séparateur point-virgule ; une lecture en UTF-8 corrompt les accents.
- **Colonnes dupliquées** : `Offre_commerciale_autre_source.csv` a deux colonnes `Obligatoire`, deux `Taux_TVA` (la première à 0,00, la seconde à 19,25) et deux `Taux_Taxe_Enregistrement`. Une lecture par nom de colonne n'en voit qu'une.
- **Anciens noms de compagnie** dans les sources : ALPHA, BENEFICIAL, ATLANTIQUE, SOCAR, `<DOSSIERS>`, `<GENERIQUE>` ; ils se rapprochent de SAMIRIS, BELIFE, AFG, ZENITHE, AUCUNE.
- **Valeurs par défaut sans sens** : assiette « Nombre passagers » hors transport de personnes ; durée maximale de couverture identique sur toutes les lignes ; accessoires de 2 500 FCFA par défaut pour les 21 compagnies.
- **Copies** : les lignes hors automobile d'ALPHA sont une copie de GMCSA (4.4).
- **Extraction du PDF AFRINS** : les milliers sont séparés par des espaces et des espaces insécables, ce qui fait fusionner des colonnes si on ne distingue pas un espace simple d'un espacement de tableau.
- **La base peut différer des décisions** : SAMIRIS inactive, nom commercial de ZENITHE (6.1).

---

## Pilier 2 (v5.2) — Texte réglementaire de 1994 et directives de souscription SUNU

**Nature de cette section** : le contenu de `Tarif_Ministériel.pdf`, fichier fourni par SUNU (acte n° 10), jusque-là cité mais **non lu** : un scan de 34 pages sans couche texte. Il a été lu par OCR (Tesseract, modèle français) le 03/10/2026, et les points critiques (permis, tableau de sinistralité, taux SUNU, options IPT) ont été **vérifiés visuellement**. Le reste est une lecture OCR, signalée comme telle. Contenu du fichier : arrêté de 1994 (pages 2 à 6), directives de souscription SUNU (7 à 13), barèmes RC par zone et catégorie (14 à 32, déjà dans le RUT 2.3), options IPT/IAC SUNU (33), accessoires SUNU (34).

### 7.1 — L'arrêté n° 00380/MINEF/DCE/A du 16 novembre 1994

Signé à Yaoundé par le ministre de l'Économie et des Finances, il fixe les **tarifs minimaux de Responsabilité civile** des véhicules terrestres à moteur circulant au Cameroun. Il vise la loi n° 65/DF/9 du 22/05/1965 (assurance automobile obligatoire) et l'ordonnance n° 85/003 du 31/08/1985, et **abroge l'arrêté n° 0083/MINEFI/DCE/A du 28/04/1987** (art. 16). Le tarif minimal repose sur trois critères : la zone géographique de circulation, l'usage du véhicule, le statut socioprofessionnel et les caractéristiques du conducteur habituel (art. 2).

**Zones géographiques de circulation** (art. 3) :

| Zone | Localités |
|---|---|
| A | Douala, Yaoundé, Bafoussam, Garoua, Bamenda |
| B | Maroua, Ngaoundéré, Ebolowa, Buéa et tous les autres chefs-lieux de département |
| C | Autres localités et campagnes |

**Dix usages** (art. 4) : I Tourisme ; II Commerce ; III Transport public de marchandises ; IV Transport public de voyageurs ; V Deux roues ; VI Véhicules confiés aux garagistes et aux vendeurs ; VII Véhicules des auto-écoles ; VIII Location de véhicules ; IX Engins mobiles de chantier ; X Ambulances, corbillards et fourgons funèbres. Les codes de catégorie du RUT (01 à 10C) en sont des subdivisions (4A, 4B, 4C, 5 et 5bis, 7ARC et 7SRC, 9A et 9B, 10A, 10B et 10C).

**Majorations et réductions** (art. 5) — elles portent sur le tarif de base de la RC :

| Critère | Ajustement | Texte |
|---|---|---|
| Délégués médicaux, agents publicitaires, agents d'affaires (forte circulation) | +10 % pour chacune de ces catégories | art. 5-1 |
| Membres du clergé (faible circulation) | −10 % | art. 5-2 |
| Conducteur habituel de moins de 25 ans | +10 % | art. 5-3 a |
| Conducteur titulaire d'un permis de moins de **deux (2) ans** | +10 % | art. 5-3 b — vérifié visuellement |

**La base dit « moins de 3 ans »** pour ce dernier critère (`majoration_reduction`, id 2), et le RUT 6.3 l'avait repris : c'est une erreur de la base, corrigée dans le script `MAJ_BASE_03102026.sql` (anomalie #30).

**Assurances temporaires** (art. 6) — les primes s'entendent pour un an. Pour une garantie plus courte, la prime est une fraction de la prime annuelle :

| Durée consécutive de garantie | Part de la prime annuelle |
|---|---|
| 1 à 60 jours | 20 % |
| 61 à 120 jours | 40 % |
| 121 à 180 jours | 60 % |
| 181 à 240 jours | 80 % |
| 241 à 365 jours | 100 % |

**Ces coefficients sont réglementaires**, donc valables pour toutes les compagnies : c'est la réponse à la question laissée ouverte en 3.1bis (le tarif AFRINS ne fait que les appliquer). Autres règles de l'article 6 : au-delà de 240 jours en plusieurs fractionnements, la somme des fractions perçues ne peut dépasser **105 %** de la prime annuelle ; aucune attestation ne peut couvrir une durée supérieure à celle payée au comptant ; au renouvellement d'un contrat de moins d'un an, la prime de la période continue de garantie suit le même barème.

**Suspension de garantie** (art. 7) : au-delà de quatre semaines consécutives de suspension non consécutive à un sinistre, l'assuré obtient un remboursement du prorata de prime non absorbée ou un report d'échéance (police mono-véhicule), ou la même chose au prorata des véhicules retirés (flotte). Les fractions exactes sont illisibles à l'OCR. **La suspension dure au plus 12 mois** ; au-delà, le contrat est résilié et les primes échues restent acquises à l'assureur.

**Majoration pour sinistralité** (art. 8) — les compagnies sont libres de majorer le tarif selon le taux de sinistre de l'assuré pour un même véhicule, et doivent communiquer mensuellement leurs statistiques à la centrale des risques tenue par l'ASAC. Barème de surprime (tableau vérifié visuellement) :

| Sinistres sur 12 derniers mois | sur 24 derniers mois | sur 36 derniers mois | Surprime, toutes catégories |
|---|---|---|---|
| 1 | 2 | 3 | 0 % |
| 2 | 3 | 4 | 15 % |
| 3 | 4 | 5 | 20 % |
| 4 | 5 | 6 | 30 % |
| 5 | 6 | 7 | 50 % |

Le tableau donne trois seuils par ligne ; **le texte ne dit pas** s'il faut les trois ou l'un des trois pour que la surprime s'applique — à confirmer. Les sinistres pris en compte sont ceux qui font jouer la RC, hors sinistres déclarés pour ordre (responsabilité totale d'un tiers identifié, véhicule en stationnement non responsable).

**Bonification pour non-déclaration de sinistre** (art. 9 et 10) : jusqu'à **10 %** de la prime pour une police mono-véhicule sans sinistre sur l'année (ou avec une attestation de non-sinistre de moins de 7 jours signée de la compagnie précédente) ; elle est supprimée à l'échéance suivant un sinistre. Pour une police de flotte de plus d'un véhicule, jusqu'à 10 % également, sur une portion de prime calculée par une formule dont les termes (véhicules, sinistres) sont illisibles à l'OCR.

**Flotte** (art. 11 et 12) :

- Les primes d'une flotte sont celles du tarif plein de chaque véhicule, avec une **réduction pour pluralité** de **10 %** du total des primes pour 2 à 20 véhicules assurés, **15 %** au-delà de 20.
- Seuls les véhicules immatriculés au nom d'une même personne physique ou morale forment une flotte.
- Le calcul se fait **séparément** pour les deux-roues à usage personnel (catégorie V) d'une part, et pour les quatre-roues et les catégories I, II, III, IX, X d'autre part. Les remorques ne comptent pas dans le nombre de véhicules, mais la réduction s'applique à leur prime.
- **Aucune réduction** pour les catégories V bis (motos-taxis), VI (garagistes), VII (auto-écoles), VIII (location) ; ces véhicules ne sont jamais totalisés avec les autres.
- Des véhicules couverts par des polices ou des compagnies différentes peuvent être regroupés, chaque police indiquant les autres (numéros de police, noms des sociétés).

**Dispositions finales** (art. 13 à 17) : le dispositif d'application du tarif affiché au siège doit être identique chez les intermédiaires agréés ; les sinistres antérieurs à la publication ne sont pas concernés par les majorations de l'article 8 ; les contraventions sont punies selon l'article R 370 du Code pénal ; l'arrêté prend effet à sa publication.

### 7.2 — Directives de souscription du risque automobile (SUNU, pages 7 à 13)

Document interne de SUNU (acte n° 10), rédigé pour l'exercice 2018. Lecture OCR, hors tableau des taux et hors options IPT/IAC (vérifiés visuellement).

**Principes** : le tarif en vigueur s'applique sans dérogation ; la RC pèse trop dans les souscriptions, SUNU veut élargir sa gamme (assistance sur le lieu du sinistre, remorquage) et sélectionner les véhicules ; **tout contrat automobile comporte au moins RC/RTI, Défense et Recours et IPT** ; les producteurs proposent plutôt l'**Individuelle accidents du conducteur** à tout demandeur, car l'obligation d'assurance ne couvre pas les dommages subis par le conducteur (art. 206).

**Pièces exigées** : carte grise, certificat de visite technique, permis de conduire, certificat de capacité pour les taxis. Sociétés : carte grise dans la mesure du possible, état du parc sous 15 jours. Particuliers : photographie du véhicule pour la RC ; présence du véhicule et photographie pour les garanties dommages.

**Garanties dommages** (Tierce, Tierce collision, Assistance à la réparation, Incendie, Vol, Bris de glace, Bris de glaces et blocs feux) : accordées **seulement si le véhicule a été vu** par le collaborateur, avec deux photographies (avant et arrière) au dossier.

**Vol** : l'extension braquage est **obligatoire** ; souscrire le Vol intègre automatiquement le Vol partiel, le Vol total et le Vol par braquage (c'est la règle ADDITIF du RUT 6.4). Un dispositif d'alarme ou de protection contre le braquage, certifié par un installateur agréé, donne **−20 % sur la prime Vol** (c'est la réduction de la base, 6.3).

**Tableau des taux de prime** (vérifié visuellement) :

| Garantie | Âge du véhicule | Valeur assurée | Taux | Prime minimum |
|---|---|---|---|---|
| C1 Tierce complète | au plus 3 ans | valeur neuve au jour de la souscription | 2,50 % | — |
| C2 Tierce collision | au plus 3 ans | valeur neuve au jour de la souscription | 1,75 % | — |
| D Incendie | — | valeur déclarée (minimum 1 000 000) | 0,25 % | 5 000 |
| E Vol (total + partiel + braquage) | jusqu'à 8 ans | valeur déclarée (minimum 1 000 000) | 2,25 % = 1,50 + 0,25 + 0,50 | — |
| E Vol (total + partiel + braquage) | plus de 8 ans | valeur déclarée | 2,00 % (Vol total 1,25 d'après la base) | — |
| F1 Bris de glaces | — | valeur déclarée ; indemnité limitée à 20 % de la valeur vénale | 0,50 % | 15 000 |
| F2 Bris de glaces et blocs feux | — | valeur déclarée | 1,50 % | 25 000 |
| I Avance sur recours | — | 1 000 000 | 2,50 % | 25 000 |
| J Assistance en réparation | — | valeur déclarée, maximum 7 000 000 | 1,50 % | 15 000 |
| Défense et recours | — | — | forfait 1 500 FCFA par véhicule | — |

**Écart avec la base** : la base ne contient de SUNU que le **Vol** (1,50 % et 1,25 % selon l'âge, partiel 0,25 %, braquage 0,50 %) et la **DR à 1 500 FCFA** — tous deux conformes à ce tableau. **Tierce complète, Tierce collision, Incendie, Bris de glaces (F1 et F2), Avance sur recours et Assistance en réparation de SUNU ne sont pas en base** alors que leurs taux sont ici (anomalie #31). Le tableau ne précise pas les catégories concernées. Les deux lignes SUNU « Vol véhicule » du RUT 4.x (1,5 % et 1,25 %) se distinguent par l'**âge du véhicule** (jusqu'à 8 ans, plus de 8 ans), coordonnée que le barème ne porte pas encore.

**Garantie « Participation à la réparation »** (Assistance en réparation) : réservée aux véhicules assurés avec au moins RC, Défense et recours, Personnes transportées, Vol et Incendie ; indemnité fonction de la valeur assurée, sur devis, après une franchise de 10 % avec un minimum de 100 000 FCFA ; somme assurée, de gré à gré, comprise entre 1 000 000 et 7 000 000 FCFA ; pas d'indemnité si le véhicule est déclaré épave. **Avance sur recours** : elle suppose une responsabilité du tiers établie par un procès-verbal de police ou de gendarmerie.

**Franchises SUNU** (page 13, lecture OCR non vérifiée visuellement) :

| Risque | Catégories | Franchise |
|---|---|---|
| C1 Tierce complète, C2 Tierce collision | 1 et 10B (collectivités publiques, enlèvement des ordures) | 5 % de l'indemnité, minimum 75 000 FCFA |
| idem | 2, 4A et 10A (ambulances, corbillards, fourgons funéraires) | 10 % de l'indemnité, minimum 75 000 FCFA |
| idem | 3, 4B, 4C, 6, 7 et 8 | 10 % de l'indemnité, minimum 150 000 FCFA |
| idem | 9 et 10C (tracteurs agricoles ou forestiers, hors transport de grumes) | 10 % de la valeur neuve actualisée |
| D Incendie | toutes | 10 % de l'indemnité, minimum 15 000 FCFA |
| E Vol | toutes | 10 % de l'indemnité ; minimum 50 000 (vol partiel), 100 000 (vol total, braquage, brigandage) |
| F Bris de glaces | toutes | 10 % de l'indemnité, minimum 15 000, maximum 75 000 FCFA |
| I Avance sur recours | toutes | 25 % de l'indemnité, reversée à l'assuré quand le recours aboutit |
| J Assistance à réparation | toutes | 10 % de l'indemnité, minimum 50 000 FCFA |

La base ne contient pas ces franchises : `franchise_application` ne couvre que LDASA, GMCSA et SAAR (6.5).

### 7.3 — Options IPT et IAC de SUNU (page 33)

**Individuelle personnes transportées** — taux **0,50 ‰** du capital pour le décès accidentel, **0,50 ‰** pour l'incapacité permanente partielle, **1,05 %** du capital pour les frais médicaux et pharmaceutiques (vérifié visuellement). Exemple de la page, prime pour 5 places :

| Formule | Décès | Invalidité | Frais médicaux (maximum) | Prime, 5 places | Base : décès / IPP / FM par place |
|---|---|---|---|---|---|
| 1 | 1 000 000 | 1 000 000 | 0 | 5 000 | 500 / 500 / — |
| 2 | 1 000 000 | 1 000 000 | 100 000 | 10 250 | 500 / 500 / 1 050 |
| 3 | 2 000 000 | 1 000 000 (imprimé) | 100 000 (imprimé) | 20 500 | 1 000 / 1 000 / 2 100 |
| 4 | 3 000 000 | 3 000 000 | 300 000 | 30 750 | 1 500 / 1 500 / 3 150 |

Les primes imprimées et les valeurs de la base **concordent** (par exemple 4 100 FCFA par place en formule 3 : 1 000 + 1 000 + 2 100). **Le document est incohérent avec lui-même en formule 3** : avec les capitaux imprimés (invalidité 1 000 000, frais médicaux 100 000), la prime serait de 12 750 FCFA pour 5 places, et non 20 500 ; elle correspond à une invalidité de 2 000 000 et des frais médicaux de 200 000, qui sont probablement les vrais capitaux (anomalie #33). La base suit la prime imprimée.

**Individuelle accidents du conducteur** (lecture OCR, 4 formules) : décès 1 000 000, 2 000 000, 3 000 000, 4 000 000 ; invalidité 1 000 000, 1 000 000, 1 500 000, 2 000 000 ; frais médicaux 100 000, 100 000, 150 000, 200 000 ; options 001 à 004. Ces capitaux, au taux de 2 ‰ pour le décès et l'invalidité et de 2,6 % pour les frais médicaux, redonnent exactement les valeurs SUNU de la base (2 000 à 8 000 FCFA, 2 000 à 4 000 FCFA, 2 600 à 5 200 FCFA).

### 7.4 — Accessoires SUNU (page 34) et comparaison avec la base

SUNU présente ses accessoires **fichier central (FC) compris** : 250 FCFA par contrat, et 250 FCFA par véhicule pour une flotte. La base ne contient pas le FC (il est géré à part, 7.5) : ses montants SUNU sont donc ceux du document **moins 250 FCFA**. Il est perçu autant de fois des frais accessoires qu'il y a d'émissions de polices ou d'avenants (lecture OCR).

| Ligne | Document (FC compris) | Document hors FC | Base (SUNU) | Écart |
|---|---|---|---|---|
| Mono-véhicule, courte période (forfait) | 2 750 | 2 500 | 3 000 | **+500** |
| Mono-véhicule, annuel, prime nette 0 à 200 000 | 3 250 | 3 000 | 3 000 | — |
| Mono-véhicule, annuel, 200 001 à 500 000 | 4 250 | 4 000 | 4 000 | — |
| Mono-véhicule, annuel, plus de 500 001 | 5 250 | 5 000 | 5 000 | — |
| Flotte | minimum 5 000, maximum 10 000, +250 par véhicule pour le FC | — | 5 000 et 10 000 (catégorie 99) | cohérent |
| Autres risques, prime nette 0 à 100 000 | 2 500 | — | absent | **ligne manquante** |
| Autres risques, 100 001 à 1 000 000 | 5 000 | — | 5 000 pour 0 à 1 000 000 (rattaché à l'Automobile) | **borne et branche à revoir** |
| Autres risques, plus de 1 000 000 | 10 000 | — | 10 000 | cohérent |

Écarts consignés en anomalie #32. Le rapprochement complet des accessoires par compagnie reste à faire.

**Décision du 03/10/2026 (7.6)** : le manuel de SUNU prévaut pour SUNU. La page 34 a été relue sur l'image : courte période 2 750 FCFA dont 250 de Fichier central ; annuel 3 250, 4 250 et 5 250 FCFA FC compris ; flotte de 5 000 à 10 000 FCFA plus 250 FCFA par véhicule ; autres risques 2 500, 5 000 et 10 000 FCFA. Le script ramène la courte période à 2 500 FCFA et ajoute les trois lignes « autres risques ».

### 7.5 — Décisions de Roger du 03/10/2026 : accessoires, Fichier central, mise à jour de la base

**Fichier central** : 1 000 FCFA pour tout véhicule autre que ceux de la catégorie 4 (Pool TPV). Aucune table ne le porte dans `tarification` : c'est le paramètre `site.production_frais_fixes`, dont la valeur unique a été fixée à 1 000 (livraison des accessoires, 25/09/2026). Demande à la session Production & Souscription : `demande_maj_fichier_central_03102026.md`.

**Pool TPV (catégories 4A, 4B, 4C)** : accessoires **2 500 FCFA** et Fichier central **500 FCFA**, soit 3 000 FCFA au total. C'est le montant de « Accessoires + Fichier ASAC » de la fiche Cat.4A du tarif AFRINS. *Roger a écrit « les accessoires sont fixés à 500 FCFA » avant de donner la répartition 2 500 + 500 ; c'est la répartition explicite qui est retenue ici, à confirmer.*

**Les 3 000 FCFA de la base — résolu en v5.3** : aucune ligne à 3 000 FCFA n'était de catégorie 4, et la source déposée le 03/10 (7.6) montre qu'ils sont une **erreur de la base** : la source dit 2 500 FCFA. L'hypothèse « 3 000 imputés aux accessoires, plus 1 000 de Fichier central, soit 4 000 » n'a donc plus lieu d'être : les accessoires sont de **2 500 FCFA**.

**AFRINS** : accessoires **2 500 FCFA**, et **3 150 FCFA pour les véhicules de catégorie 1, contrat annuel, prime nette supérieure à 100 000 FCFA** (règle précisée par Roger : elle ne vise que la catégorie 1). Cela lève l'ambiguïté de l'anomalie #11 : les lignes Cat.2 et 3 restées à 2 500 sont normales.

**Divergences du PDF AFRINS avec ces règles** : en Zone A, catégorie 1, contrat annuel, les primes nettes de 101 997, 127 264 et 148 363 FCFA restent à 2 500 au lieu de 3 150 : **écart du PDF**, la règle de Roger (3 150 FCFA, source officielle indiquée par lui) étant maintenue ; non vérifié auprès d'AFRINS. La catégorie 5A (motos) porte un Fichier central de **500 FCFA** sur ses 54 lignes, alors que la règle de Roger est 1 000 FCFA partout sauf le Pool : **non tranché explicitement**.

**Mise à jour de la base** (blocs A et B autorisés par Roger ; bloc C proposé) : script `MAJ_BASE_03102026.sql`, **réécrit en v5.3, syntaxe PostgreSQL vérifiée, non exécuté**. Bloc A : SAMIRIS inactive, noms de SAMIRIS et ZENITHE alignés sur leurs codes. Bloc B : AFRINS à 2 500 FCFA (B1) et 3 150 FCFA pour la catégorie 1 (B2) ; trois lignes Pool à 2 500 FCFA (B3) ; **30 lignes à 3 000 FCFA ramenées à 2 500** par identifiant (B4) ; SUNU courte période et « autres risques » (B5, B6) ; ZENITHE rétablie (B7). Bloc C (proposition, non demandée) : permis récent à 2 ans. Le script contrôle qu'il ne reste que 3 lignes à 3 000 FCFA (PROASSUR 107 et 110, SUNU 20) et contient huit essais de la fonction `fn_accessoires`. **Le Fichier central du Pool (500 FCFA) n'y figure pas** : il relève de `site.production_frais_fixes`.

### 7.6 — Source `Frais_et_accessoires.csv` : décisions du 03/10/2026

Roger a déposé `Frais_et_accessoires.csv` (115 lignes, 12 colonnes, ISO-8859-1) : la **table d'origine du 25/09** d'où a été tiré `bareme_accessoire`, avec sa colonne « Fichier Central ». Comparée à la base ([annexe F](RUT_annexe_F_comparaison_accessoires.md)) : 56 groupes (compagnie, risque, durée), 18 identiques, 38 différents. La source compte **38 lignes à 2 500 FCFA**, la base **35 lignes à 3 000 FCFA** et une seule à 2 500. **Roger : « voici les bonnes valeurs » (la source).** Règle de conduite : en cas de divergence entre sources, décision au cas par cas.

| # | Cas | Décision de Roger | Traduction dans `MAJ_BASE_03102026.sql` |
|---|---|---|---|
| 1 | Décalage de +500 FCFA (35 lignes de 15 compagnies) | Aligner sur 2 500 FCFA (aucune source n'appuie 3 000) | B4 : 30 lignes par identifiant ; B1 (AFRINS) et B5 (SUNU) pour les deux autres |
| 2 | Fichier central à 0 sur 14 lignes | **Erreur de saisie** : 1 000 FCFA partout ; 500 FCFA pour le Pool | Aucun changement dans `tarification` (paramètre `site.production_frais_fixes`) ; demande à Production & Souscription |
| 3 | Pool TPV : 3 lignes absentes de la base | Les ajouter : accessoires 2 500 + Fichier central 500 | B3 : lignes génériques 04A, 04B, 04C avec les libellés de la source |
| 4 | ZENITHE : ligne perdue au renommage | La rétablir | B7 |
| 5 | BELIFE : deux tranches fusionnées (0–50 000 à 2 500 et 50 000–500 000 à 5 000) | **Pas nécessaire** de les restaurer | Aucune ; la tranche fusionnée passe à 2 500 (B4) |
| 6 | SUNU : tableau, manuel et base diffèrent | **Le manuel de SUNU prévaut** | B5 (courte période 2 500), B6 (autres risques) ; tranches annuelles inchangées |
| 7 | PROASSUR : 4 lignes issues de sa note de service | **La note de service prévaut** : annuel mono-véhicule 3 000, flotte 5 000 ; courte durée mono-véhicule 2 500, flotte 3 000 | Rien à faire : la base porte déjà ces quatre valeurs ; lignes 107 à 110 exclues de l'alignement |
| 8 | CHANAS : deux lignes réduites à une (25/09) | Aucune action | — |
| 9 | Green Assistance et Voyage : actifs dans la source, désactivés en base | Maintenus désactivés | — |
| 10 | AFRINS | 2 500 FCFA ; **3 150 FCFA** pour la catégorie 1, prime nette supérieure à 100 000 FCFA (**source officielle** selon Roger) | B1, B2 |

**Manuel de SUNU, page 34** (relu sur l'image) et traitement dans la base. SUNU présente ses montants Fichier central compris (250 FCFA) ; la base les porte hors Fichier central :

| Ligne | Manuel (FC compris) | Hors FC | Base avant | Base après |
|---|---|---|---|---|
| Mono-véhicule, courte période (forfait) | 2 750 | 2 500 | 3 000 | 2 500 (B5) |
| Mono-véhicule, annuel, prime nette 0 à 200 000 | 3 250 | 3 000 | 3 000 | 3 000 |
| Mono-véhicule, annuel, 200 001 à 500 000 | 4 250 | 4 000 | 4 000 | 4 000 |
| Mono-véhicule, annuel, plus de 500 001 | 5 250 | 5 000 | 5 000 | 5 000 |
| Flotte | minimum 5 000, maximum 10 000, plus 250 par véhicule pour le FC | — | 5 000 (0 à 1 000 000) et 10 000 (au-delà), catégorie 99 | inchangé : approximation, anomalie #37 |
| Autres risques, prime nette 0 à 100 000 | 2 500 | non précisé | absent | ajouté (B6) |
| Autres risques, 100 001 à 1 000 000 | 5 000 | non précisé | absent | ajouté (B6) |
| Autres risques, plus de 1 000 000 | 10 000 | non précisé | absent | ajouté (B6) |

Le manuel ne dit pas si les montants des « autres risques » incluent le Fichier central : **à confirmer**. Il précise que les frais accessoires sont perçus autant de fois qu'il y a d'émissions de polices ou d'avenants.

**Restent ouverts** : le Fichier central de la catégorie 5A chez AFRINS (500 FCFA dans le PDF, 1 000 FCFA selon la règle) ; les trois lignes de la Zone A du PDF AFRINS à 2 500 FCFA au lieu de 3 150 ; la représentation du minimum et du maximum de la flotte SUNU, aujourd'hui approchée par deux tranches de prime.

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
| 02/10 | Catalogue hors automobile vidé puis reconstruit depuis `Offre_commerciale_autre_source.csv` (88 garanties, 526 sous-garanties) | Ancien contenu d'août partiel et sans tarif ; Crédit et Cautions laissé vide faute de couverture dans cette source |
| 03/10 | Hors automobile : cartographie sans calcul ; sources de prix (Individuelle accidents, MRH, Voyage) écartées ; Crédit et Cautions consigné comme information disponible ; codes de taxe en lacune ; listes volumineuses en annexes A et B | Décisions de Roger : le RUT enregistre l'état de la connaissance, il n'utilise pas des sources non validées |
| 03/10 | Passage en v4.0 | Nouveau périmètre (hors automobile) ajouté sur la base de la v3.1 |
| 03/10 | Architecture cible : une table de tarif unique en étoile avec tables de concepts ; coordonnées en colonnes explicites ; valeurs officielles stockées telles que lues, lois en contrôles ; calcul de la Prime TTC en étapes stockées | Principe posé par Roger (une seule table de tarif, concepts en annexes). Choix de conception C1 à C8 proposés par la session Tarification, à valider |
| 03/10 | Passage en v5.0 | Ajout de la conception et de l'inventaire du schéma sur la base de la v4.0 |
| 30/09 | Choisir la RC rend obligatoires le Recours des tiers après incendie et l'Extension CEMAC (liens ADDITIF) | Décision de Roger ; inscrite dans `garantie_lien` |
| 01/10 | Lien DR → RC en mode ASSIETTE repris après abandon au profit de `prime_element` | `prime_element` est resté inutilisé (table vide) |
| 01-02/10 | Nettoyages : suppression de `ACTIVA_ASSISTANCE` (nom de compagnie dans un code canonique) et d'une garantie `FRAIS_MEDICAUX` orpheline ; fusion de « Vol au garage mort » dans Vol véhicule ; purge des doublons `RC_AUTO__*` | Aucun nom de compagnie dans un code canonique ; une garantie orpheline n'a pas de tarif |
| 02/10 | `GREEN ASSISTANCE CONDUCTEUR` rattachée à l'IAC (produit hybride) ; Extension CEMAC incluse dans les bouquets RC seulement, pas IPT/IAC | Choix de rattachement des bouquets, sur la base de leur composition réelle |
| 03/10 | Passage en v5.1 : contenu des référentiels (6.1 à 6.10), registre des sources, annexes C, D, E ; corrections des sections 3.4, 3.7, 3.8 et du repli générique | Demande de Roger : le RUT doit répondre seul à toute question de tarification, sans requête |
| 03/10 | Lecture de `Tarif_Ministériel.pdf` : fichier fourni par SUNU contenant l'arrêté de 1994, les directives SUNU, le barème RC, l'IPT/IAC et les accessoires SUNU ; coefficients de durée reconnus réglementaires ; permis récent = 2 ans | Zones, usages, majorations, sinistralité, flotte et durée courte étaient absents du RUT ; l'arrêté fait foi sur la base |
| 03/10 | Accessoires : AFRINS 2 500 (3 150 pour la catégorie 1, annuel, prime nette > 100 000) ; Pool TPV : accessoires 2 500 + Fichier central 500 ; Fichier central 1 000 hors catégorie 4 | Décisions de Roger ; la mise à jour de la base est autorisée |
| 03/10 | Passage en v5.2 | Ajout du texte réglementaire et des directives SUNU sur la base de la v5.1 |
| 03/10 | Accessoires : la source `Frais_et_accessoires.csv` fait foi (2 500 FCFA) ; la base portait 35 lignes à 3 000 FCFA par erreur ; le manuel SUNU et la note de service PROASSUR prévalent pour leurs compagnies ; Fichier central 1 000 FCFA partout, 500 FCFA pour le Pool, les zéros de la source étant des erreurs de saisie ; tranches de BELIFE non restaurées | Décisions de Roger, cas par cas, après comparaison ligne à ligne ; l'alignement se fait par identifiants explicites, jamais par un remplacement global de 3 000 par 2 500, car des lignes à 3 000 sont justes |
| 03/10 | Passage en v5.3 | Ajout de la source des accessoires, de la section 7.6 et de l'annexe F sur la base de la v5.2 |

---

## Pilier 4 — Pilotage

### Dettes identifiées sur ce périmètre
- **Seules 103 des 300 `offre_commerciale` sont rattachées à une dénomination réelle.** Les 197 autres se composent de 68 offres « PLACEHOLDER » créées en Phase 4 et d'offres de bouquets IAC/IPT/RC non rattachées à `equivalence_garantie` (136 constatées le 02/10) ; **la répartition exacte n'a pas été vérifiée** par requête. Un écran de cotation basé dessus afficherait, pour les placeholders, un nom provisoire.
- **Dimension "genre de véhicule" manquante** (découverte 03/10/2026, via `Tarif_automobile_automatisé.csv`) — la surprime matière inflammable (et peut-être d'autres éléments) varie par genre (Benne/Camion/Camion+Remorque...) pour Cat.02/03 au moins, non capturée aujourd'hui. Cause des anomalies #2/#3. Vérifier si d'autres catégories sont concernées avant de modéliser.
- **Format des tableaux du Pilier 2.3** — actuellement une colonne "Autres critères" en texte libre (JSON). Devrait devenir des colonnes explicites propres à chaque catégorie (nombre de places, remorque, RC élèves, genre de véhicule...) plutôt qu'un bloc texte — aurait rendu l'anomalie "genre de véhicule" visible immédiatement au lieu de la masquer. Restructuration non faite dans ce v1.0, risque trop élevé en fin de session.
- Sous-catégories 04A/B/C, 05/05bis, 06, 07ARC/SRC, 09A/B, 10A/B/C : la logique de distinction entre elles n'est documentée nulle part de façon narrative — seulement implicite dans la structure du barème. À expliciter si une vraie règle écrite existe.
- Directives de souscription par compagnie : absentes de ce document, jamais fournies à cette session.
- Catégories 10B et 10C portent exactement les mêmes montants que 10A — à confirmer si c'est une vraie distinction réglementaire (trois catégories séparées existant pour une autre raison que le montant) ou une simplification de notre construction.
- **Deux sources de vérité, aucun contrôle automatique.** Le RUT et la base peuvent diverger sans que personne ne le voie, ce qui recréerait le problème que le RUT devait résoudre. À construire : un script qui compare chaque tableau du RUT à la base et signale les écarts (priorité haute).
- **Cause d'origine des doublons ALLIANZ/SUNU non recherchée** : 12 lignes supprimées, mais pas pourquoi elles existaient (script rejoué ? import sans clé d'unicité ?). Risque de récidive au prochain import.
- **Dimension « genre de véhicule » à auditer sur Dommages et Vol** (Benne/Camion/Camion+Remorque) : hypothèse non vérifiée, par analogie avec la matière inflammable.
- **Couverture des garanties facultatives** : 13 compagnies sur 16 n'ont aucun taux sur Dommages, Vol, Incendie (matrice du Pilier 2). Compléter d'abord les plus grosses compagnies du marché.
- **IPT AFRINS** absente de la base (#12). **Accessoires AFRINS** : périmètre de la règle des 3 150 FCFA à préciser (#11) ; à vérifier aussi si le palier correspondant existe dans `bareme_accessoire` pour AFRINS.
- **Sections 3.2 à 3.4 et 3.1bis reposent sur AFRINS seul** : appliquer la règle 10 avant de les généraliser ou de chercher une deuxième compagnie.
- **Affirmations marquées « à confirmer »** : nature fiscale du DTA, définition de la Carte rose, qui fixe le Fichier central, traitement des garanties facultatives dans l'assiette de TVA, généralité des coefficients de durée.
- **Taille du document** : si une version future ajoute un barème aussi dense que celui du DTA, sortir les grands tableaux dans des fichiers annexes liés et garder le RUT centré sur les formules, les principes et le registre d'anomalies.
- **Hors automobile — découpage du catalogue non audité** : 526 sous-garanties, trois fois l'ancien contenu ; les formules et options sont peut-être comptées comme des sous-garanties distinctes. À auditer comme l'a été le barème automobile avant tout usage.
- **Hors automobile — rapprocher les deux référentiels de garanties** (anomalie #13), puis rattacher les dénominations GMCSA à la table `equivalence_garantie`.
- **Hors automobile — réintégrer Crédit et Cautions en base** (par paramétrage, sur décision de Roger) à partir des 33 lignes consignées en 4.5.
- **Table des codes de taxe 1 à 4** à obtenir (anomalie #15) ; applicabilité de la TVA à chaque branche à confirmer.
- **Sources de prix écartées** (4.8) : à exploiter dans une version ultérieure, une fois validées ; commencer par vérifier la compagnie émettrice du MRH et du Voyage.
- **Annexes A et B** : à committer avec le RUT, dans le même dossier.
- **Valider les choix C1 à C8** (5.1) avant toute implémentation ; les points les plus structurants sont C1 (colonnes explicites), C2 (valeurs lues, lois en contrôles) et C3 (étapes en table).
- **Lire visuellement la note PROASSUR n° 0012/22** (conditions de souscription, 7 pages, scan) : le tarif SUNU / ministériel a été lu en v5.2 (Pilier 2, v5.2).
- **Lire les trois contenus non relus** (garanties facultatives n° 2, `Garanties_IAC_et_IPT.csv`, `OFFRE_COMMERCIALE.sql`) et **analyser `devis.js` / `index.html`** (logique de devis du site public).
- **Rapprocher les sources et la base** : `Tarif_automobile_automatisé.csv` (GMCSA), `_autres.csv` et `base_autres.csv` contre `tarif` et `bareme_tranche`, pour savoir ce qui a été chargé.
- **Exécuter `MAJ_BASE_03102026.sql`** (précédé d'un `pg_dump`) puis exécuter la recette contenue dans le script ; mettre ensuite le RUT en accord avec le résultat. Bloc C (permis à 2 ans) à valider ou à retirer.
- **Trancher** : Fichier central de la catégorie 5A chez AFRINS (500 FCFA dans le PDF, 1 000 FCFA selon la règle) ; les trois lignes de Zone A du PDF AFRINS à 2 500 FCFA ; si les « autres risques » SUNU incluent le Fichier central ; comment représenter le minimum et le maximum de la flotte SUNU (#37).
- **Fichier central** : demande à Production & Souscription (`demande_maj_fichier_central_03102026.md`) pour la valeur de 500 FCFA du Pool.
- **Trancher la valeur générique des accessoires** (#29) : 2 500, 3 000, ou 2 500 + Fichier central ; puis corriger la ligne AFRINS « [NON IDENTIFIEE] ».
- **Documenter la règle de cumul des majorations** (6.3) et l'interprétation du Vol partiel (différentiel) et du lien Extension CEMAC / Carte rose (6.4).
- **Charger les garanties facultatives et les franchises SUNU** (7.2, #31) et décider des catégories concernées.
- **Rapprochements en cours** : les trois CSV de tarifs contre la base, et les trois structures de dénomination (`offre`, `offre_commerciale`, `equivalence_garantie`), sur export de `tarif`, `bareme_tranche` et `offre_commerciale`.
- **Préciser la surprime de sinistralité** (trois seuils : cumulatifs ou alternatifs ?) et lire les fractions de l'article 7 (suspension).
- **Aucune API de Prime nette ou TTC n'existe** (#20) : c'est le chemin critique pour myspace ; la procédure cible `fn_calculer_prime_ttc` (5.6) la fournirait.
- **Purger `site.bareme_dta`** (#10) avant de charger l'élément DTA dans la table cible.
- **Reconstituer les cas de référence RC** de la session du 01/10 (5.7) : la liste que contenait une première rédaction de ce tableau s'est révélée non fiable (un des montants est absent du barème) et a été retirée.

### Chantiers hors périmètre de cette v5.0 (RUT v5.n, périmètre étendu)
Franchises (`franchise`, `franchise_application`, non branchées au calcul de la prime), majorations et réductions hors RC (dont la réduction Vol SUNU de −20 %), Produit transversal (Essentiel/Classique/Confort/Premium), bordereau comme entité datée, tarification hors automobile (aucun prix exploitable à ce stade), implémentation de l'architecture cible (5.7).

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
| 03/10/2026 | Session Tarification, décisions Roger | SAMIRIS déclarée inactive (`Actif = False`) ; règle des accessoires à 3 150 FCFA (annuel, prime nette > 100 000) consignée avec son périmètre à confirmer (anomalie #11) ; règle 12 « repli générique » ajoutée avec le tableau de ce qui existe réellement | Roger : à défaut d'information propre à une compagnie, l'information générique s'applique. Vérifié que la règle des accessoires est confirmée dans son bloc (Zone B Cat.1) mais contredite par 57 autres lignes du même document, d'où « périmètre à confirmer » plutôt que « résolu » |
| 03/10/2026 | Session Tarification | Passage en **v3.1** : la v3.0, déclarée livrée par Roger, a été modifiée ensuite sans changer d'étiquette (SAMIRIS inactive, règle 12 « repli générique » et tableau de couverture, règle des accessoires à 3 150 FCFA). Ces ajouts constituent la v3.1 ; la v3.0 telle que livrée correspond à l'état précédant ces modifications | Convention de Roger : les jalons de version sont des étapes figées. Une version livrée ne se modifie pas silencieusement. Erreur d'étiquetage signalée par Roger et corrigée |
| 03/10/2026 | Session Tarification, décisions Roger | **RUT v4.0** : cartographie des branches hors automobile (catalogue 88 garanties / 526 sous-garanties, dénominations `Garanties.csv`, Crédit et Cautions consigné, paramètres d'offre, taxes, sources de prix écartées), annexes A et B, anomalies #13 à #19 | Roger : intégrer les autres branches avec l'information disponible, sans utiliser les tarifs à lecture directe. Constats imprévus : les lignes hors automobile d'ALPHA/SAMIRIS sont une copie de GMCSA (225/225), et l'assiette « Nombre passagers » est une valeur par défaut |
| 03/10/2026 | Session Tarification, demande Roger | **RUT v5.0** : inventaire du schéma (40 objets), conception de la table de tarif unique et de ses concepts, mécanismes (résolution, étapes de la Prime TTC, contrôles, lisibilité), procédures existantes et cibles, chemin de migration ; anomalies #20 à #24. Relecture critique avant livraison : liste de 10 cas de test RC retirée (un montant absent du barème), provenance des règles de calcul et des fonctions précisée | Roger : une seule table de tarif contenant tout le tarif, concepts décrits dans des tables annexes. Constat imprévu : `fn_calculer_prime_nette_totale` n'a jamais été déployée, il n'existe aucune procédure de Prime nette ou TTC |
| 03/10/2026 | Session Tarification, demande Roger | **RUT v5.1** : export des référentiels, contenu réel des tables (compagnies, 15 actes, majorations, liens de garanties, franchises, 16 formules, 9 produits, règles de calcul vérifiées, accessoires, dénominations), registre de 23 sources, pièges de lecture, annexes C, D, E ; anomalies #25 à #29 ; corrections 3.4, 3.7, 3.8, repli générique, étape 6 de la Prime TTC | Roger : le RUT est la mémoire de la base et doit répondre seul à toute question. Constats imprévus : les formules de souscription existent en base (le RUT affirmait le contraire), la base ne reflète pas la décision SAMIRIS inactive, et les accessoires ont une valeur par défaut de 2 500 FCFA pour les 21 compagnies |
| 03/10/2026 | Session Tarification, demandes Roger | **RUT v5.2** : lecture par OCR de `Tarif_Ministériel.pdf` (arrêté de 1994 : zones, usages, majorations, durée, sinistralité, bonification, flotte ; directives, taux, franchises, IPT/IAC et accessoires SUNU), décisions de Roger sur les accessoires et le Fichier central, scripts `MAJ_BASE_03102026.sql` et `export_rapprochement.sql` ; anomalies #30 à #34 ; #11, #25, #29 mises à jour ; 3.1bis et 3.8 corrigées | Roger : lire le tarif ministériel d'abord, puis rapprocher les CSV et la base ; mise à jour de la base autorisée. Constats : le « tarif ministériel » est en réalité un fichier de SUNU, l'arrêté dit 2 ans de permis (la base 3), et les taux de durée courte sont réglementaires |
| 03/10/2026 | Session Tarification | Réconciliation de la v5.2 avant livraison : `MAJ_BASE_03102026.sql` rétabli après une suppression par erreur de ma part (j'avais pris ce script pour un doublon des miens ; il était mieux construit) ; autorisation de Roger limitée aux blocs A et B, le bloc C (permis à 2 ans) étant une proposition ; ZENITHE : c'est `nom`, et non `nom_commercial`, qui valait « SOCAR » ; export complété par `site.production_frais_fixes` | Contrôle croisé du RUT, des scripts et de la base avant livraison ; l'état annoncé du RUT doit correspondre aux fichiers réellement présents |
| 03/10/2026 | Session Tarification, décisions Roger | **RUT v5.3** : source `Frais_et_accessoires.csv` comparée à la base (annexe F) ; décisions cas par cas consignées (7.6) ; `MAJ_BASE_03102026.sql` réécrit (alignement de 30 lignes par identifiant, Pool, ZENITHE, SUNU selon son manuel, AFRINS 3 150), syntaxe vérifiée ; anomalies #11, #29, #32 résolues par décision, #35 à #37 ajoutées | Roger : « voici les bonnes valeurs » pour la source ; le manuel SUNU et la note PROASSUR prévalent ; Fichier central 1 000 FCFA partout (Pool 500). Le décalage de +500 FCFA était systématique et non un cas isolé |
