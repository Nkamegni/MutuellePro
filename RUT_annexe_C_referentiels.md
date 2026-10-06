# RUT — Annexe C : contenu des référentiels de la base (03/10/2026)

**Rattachée au RUT v5.1.** Photographie, issue de l'export du 03/10/2026, des tables de référence du schéma `tarification`. Les identifiants sont décodés en codes lisibles. Les valeurs sont celles de la base : elles peuvent différer des décisions prises hors base (voir RUT, anomalie #25).

## Branches (9)

| id | Code | Libellé |
|---|---|---|
| 0 | AUCUNE | Aucune / Non applicable |
| 1 | AUTOMOBILE | Automobile |
| 2 | SANTE | Maladie et assurances des personnes |
| 3 | INCENDIE | Incendie & autres dommages |
| 4 | AVIATION | Aviation |
| 5 | RC_GENERALE | Responsabilité Civile Générale |
| 6 | TRANSPORT | Transport, Corps et Facultés |
| 7 | RISQUES_TECHNIQUES | Risques techniques |
| 8 | CREDIT_CAUTIONS | Crédit et Cautions |

## Catégories (11) et sous-catégories (18)

| Sous-catégorie | Libellé | Catégorie | Branche |
|---|---|---|---|
| AUCUNE | Aucune / Non applicable | AUCUNE | Aucune / Non applicable |
| 01 | Véhicule de tourisme (profession ou promenade) | 01 | Automobile |
| 02 | Transport de marchandises appartenant à l'assuré | 02 | Automobile |
| 03 | Transport de marchandises appartenant à des tiers | 03 | Automobile |
| 06 | Garage | 06 | Automobile |
| 07ARC | Auto-école (avec RC élèves) | 07 | Automobile |
| 07SRC | Auto-école (sans RC élèves) | 07 | Automobile |
| 08 | Location avec ou sans chauffeur | 08 | Automobile |
| 04A | Taxi, bus urbain à titre payant | 04 | Automobile |
| 04B | Bus, autocar interurbain à titre payant | 04 | Automobile |
| 04C | Transport scolaire (élèves/personnel, à titre gratuit) | 04 | Automobile |
| 05 | Motocyclette | 05 | Automobile |
| 05bis | Moto/tricycle, transport de passagers à titre payant | 05 | Automobile |
| 10A | Ambulance, corbillard, fourgon funéraire | 10 | Automobile |
| 10B | Voirie, véhicule de collectivité locale | 10 | Automobile |
| 10C | Tracteur agricole ou forestier hors route | 10 | Automobile |
| 09A | Engins portuaires et de manutention | 09 | Automobile |
| 09B | Autres engins, notamment de grands travaux | 09 | Automobile |

## Catégories tarifaires par branche (21)

| Branche | Code catégorie | Libellé | Groupe | Code tarif réel |
|---|---|---|---|---|
| AUTOMOBILE | 01 | Véhicule de tourisme (profession ou promenade) | — | — |
| AUTOMOBILE | 02 | Transport de marchandises appartenant à l'assuré | — | — |
| AUTOMOBILE | 03 | Transport de marchandises appartenant à des tiers | — | — |
| AUTOMOBILE | 04A | Taxi, bus urbain à titre payant | 04 | — |
| AUTOMOBILE | 04B | Bus, autocar interurbain à titre payant | 04 | — |
| AUTOMOBILE | 04C | Transport scolaire (élèves/personnel, à titre gratuit) | 04 | — |
| AUTOMOBILE | 05 | Motocyclette | 05 | — |
| AUTOMOBILE | 05-TRI | Tricycle | — | 05 |
| AUTOMOBILE | 05bis | Moto/tricycle, transport de passagers à titre payant | 05 | — |
| AUTOMOBILE | 06 | Garage | — | — |
| AUTOMOBILE | 07ARC | Auto-école (avec RC élèves) | — | — |
| AUTOMOBILE | 07SRC | Auto-école (sans RC élèves) | — | — |
| AUTOMOBILE | 08 | Location avec ou sans chauffeur | — | — |
| AUTOMOBILE | 09A | Engins portuaires et de manutention | — | — |
| AUTOMOBILE | 09B | Autres engins, notamment de grands travaux | — | — |
| AUTOMOBILE | 10A | Ambulance, corbillard, fourgon funéraire | 10 | — |
| AUTOMOBILE | 10B | Voirie, véhicule de collectivité locale | 10 | — |
| AUTOMOBILE | 10C | Tracteur agricole ou forestier hors route | 10 | — |
| AUTOMOBILE | 99 | Flotte Automobile | — | — |
| AUTOMOBILE | ALL | Toutes catégories (ALL=ANY) | — | — |
| AUTOMOBILE | NONE | Non applicable | — | — |

## Genres de véhicule (16)

| Code | Libellé | Branche |
|---|---|---|
| AUCUN | Aucun / Non applicable | Aucune / Non applicable |
| AMBULANCE | Ambulance | Automobile |
| ENGIN_SPECIAL | Engin spécial | Automobile |
| MOTOCYCLETTE | Motocyclette | Automobile |
| REMORQUE | Remorque | Automobile |
| SCOOTER | Scooter | Automobile |
| SEMI_REMORQUE | Semi-remorque | Automobile |
| TRACTEUR_AGRICOLE_FORESTIER | Tracteur agricole ou forestier | Automobile |
| TRICYCLE | Tricycle | Automobile |
| TRIPORTEUR | Triporteur | Automobile |
| VEHICULE_COLLECTIVITE_LOCALE | Véhicule de collectivité locale | Automobile |
| VEHICULE_REMORQUAGE | Véhicule de remorquage | Automobile |
| VEHICULE_TOURISME | Véhicule de tourisme | Automobile |
| VEHICULE_TRANSPORT_EN_COMMUN | Véhicule de transport en commun | Automobile |
| VEHICULE_FUNERAIRE | Véhicule funéraire | Automobile |
| VEHICULE_UTILITAIRE | Véhicule utilitaire | Automobile |

## Compagnies (21)

| id | Code | Nom | Nom commercial | Actif site | Statut agrément | N° agrément | Date agrément | Révocation | Accessoires par défaut |
|---|---|---|---|---|---|---|---|---|---|
| 0 | AUCUNE | Aucune (Mutuelle Pro Assurances) | — | True | ACTIF | — | — | — | 2 500 |
| 1 | GMCSA | GMCSA | Garantie Mutuelle des Cadres | True | ACTIF | — | — | — | 2 500 |
| 2 | NSIA | NSIA | NSIA Cameroun | True | ACTIF | — | — | — | 2 500 |
| 3 | AREA | AREA | AREA Assurances SA | True | ACTIF | — | — | — | 2 500 |
| 4 | PROASSUR | PROASSUR | Société Pro Assur | True | ACTIF | — | — | — | 2 500 |
| 5 | CHANAS | CHANAS | Chanas Assurances SA | True | ACTIF | — | — | — | 2 500 |
| 6 | BELIFE | BENEFICIAL | Belife General Insurance | True | ACTIF | — | — | — | 2 500 |
| 7 | CPA | CPA | CPA - Assurances | True | ACTIF | — | — | — | 2 500 |
| 8 | ROYAL ONYX | ROYAL ONYX | Royal Onyx | True | ACTIF | — | — | — | 2 500 |
| 9 | AFG | ATLANTIQUE | AFG Assurances Cameroun | True | ACTIF | — | — | — | 2 500 |
| 10 | ACTIVA | ACTIVA | Activa Assurances SA | True | ACTIF | — | — | — | 2 500 |
| 11 | ALLIANZ | ALLIANZ | Allianz Assurances | True | ACTIF | — | — | — | 2 500 |
| 12 | AGC | AGC | Assurances Générales du Cameroun | True | ACTIF | — | — | — | 2 500 |
| 13 | ZENITHE | SOCAR | — | True | ACTIF | — | — | — | 2 500 |
| 14 | SAAR | SAAR | Société Africaine d'Assurance et de Réassurance SA | True | ACTIF | — | — | — | 2 500 |
| 15 | SUNU | SUNU | SUNU Assurances IARD Cameroun | True | ACTIF | — | — | — | 2 500 |
| 16 | SANLAM | SANLAM | Sanlam Cameroun | True | ACTIF | — | — | — | 2 500 |
| 17 | LDASA | LDASA | LD Assurances SA | True | ACTIF | — | — | — | 2 500 |
| 18 | AXA | AXA | AXA Assurances Cameroun | True | ACTIF | — | — | — | 2 500 |
| 19 | AFRINS | AFRINS | Afri Insurance | True | ACTIF | — | — | — | 2 500 |
| 21 | SAMIRIS | ALPHA | Alpha Assurances | True | ACTIF | — | — | — | 2 500 |

## Actes réglementaires (15)

| id | Référence | Type | Autorité | Signé le | Publié le | Abroge l'acte | Document source | Territoire | Devise |
|---|---|---|---|---|---|---|---|---|---|
| 1 | N°00380/MINEF/DCE/A | ARRETE | MINISTERE_FINANCES | 1994-11-16 | 1994-11-16 | — | — | CM | XAF |
| 6 | Note de service N°0012/22 | BAREME_INTERNE | PROASSUR SA (WAFA Assurance) | — | — | — | NOTE_DE_SERVICE_N_0012_PORTANT_TARIF_ET_CONDITIONS_DE_SOUSCRIPTION_AUTOMOBILE_PROASSUR_WAFA_ASSURANCE.pdf | CM | XAF |
| 7 | Tarif Automobile Garantie facultative POOL (usages 04A/04B/04C) | CONVENTION | Pool TPV (GIE) | — | — | — | Tarif_Automobile_Garantie_facultative_POOL.pdf | CM | XAF |
| 9 | Extension territoriale CEMAC (Carte Rose) | CONVENTION | CIMA / Zone CEMAC | — | — | — | Confirmé par Roger le 30/09/2026, recoupé avec le document AFRI Insurance | CM | XAF |
| 10 | Tarif Automobile SUNU (barème interne, hors RC) | BAREME_INTERNE | SUNU | — | — | — | Tarif_Ministériel.pdf — document fourni par SUNU, RC ministérielle + garanties facultatives propres mêlées dans le même fichier | CM | XAF |
| 12 | Tarif Automobile SUNU - Vol (barème interne) | BAREME_INTERNE | SUNU | — | — | — | Tarif_Ministériel.pdf (page 23) + confirmé par Tarif_automobile_base_autres.csv (Réf Garantie 26/33/-347456936, Date Création 2005) | CM | XAF |
| 13 | Tarif Automobile Royal Onyx (barème interne) | BAREME_INTERNE | ROYAL ONYX INSURANCE | — | — | — | Tarif_automobile_base_autres.csv | CM | XAF |
| 14 | Tarif Automobile Royal Onyx par catégorie (barème interne) | BAREME_INTERNE | ROYAL ONYX INSURANCE | — | — | — | Tarif_automobile_automatisé_autres.csv — remplace la version résumée du 30/09 | CM | XAF |
| 15 | Franchises Automobile (standard et facultatives) | BAREME_INTERNE | Multi-compagnies (LDASA, GMCSA, SAAR) | — | — | — | Franchises.csv | CM | XAF |
| 18 | Individuelle Personnes Transportées / Accidents Conducteur (barèmes internes multi-compagnies) | BAREME_INTERNE | Multi-compagnies (17 compagnies + niveau générique) | — | — | — | Tarif_automobile_base_autres.csv | CM | XAF |
| 19 | Brigandage et Vol des accessoires (barèmes internes multi-compagnies) | BAREME_INTERNE | Multi-compagnies (LDASA, SAAR, CPA + niveau générique) | — | — | — | Tarif_automobile_base_autres.csv | CM | XAF |
| 22 | IAC/IPT décomposé par sous-garantie (Décès/IPP/Frais médicaux) | BAREME_INTERNE | Multi-compagnies (17 compagnies + niveau générique) | — | — | — | Garanties_IAC_et_IPT.csv | CM | XAF |
| 23 | Défense Recours — taux générique 5% RC/RTI | BAREME_INTERNE | Référentiel canonique (toutes compagnies par défaut) | — | — | — | Garanties_canoniques.csv | CM | XAF |
| 24 | Défense Recours — 14 compagnies (forfait ou %RC, sans distinction de catégorie) | BAREME_INTERNE | Multi-compagnies (14 compagnies) | — | — | — | Tarif_automobile_base_autres.csv | CM | XAF |
| 25 | Défense Recours — 5 compagnies complémentaires | BAREME_INTERNE | Multi-compagnies (AFRINS, ALLIANZ, ALPHA, AXA, SOCAR) | — | — | — | Compléments_DR.csv | CM | XAF |

## Garanties canoniques (109)

| Code | Libellé | Branche | Type | Statut | Du | Au |
|---|---|---|---|---|---|---|
| AUCUNE | Aucune / Non applicable | Aucune / Non applicable | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| AUTO_AREA_ASSURANCE_CONDUCTEUR | AREA Assurance Conducteur | Automobile | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| AUTO_AREA_EXPRESS_AUTO | AREA Express Auto | Automobile | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| AUTO_ASSISTANCE_A_LA_REPARATION | Assistance à la réparation | Automobile | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| AUTO_AVANCE_RECOURS | Avance Recours | Automobile | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| AUTO_BRIS_DE_GLACES | Bris de glaces | Automobile | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| AUTO_BRIS_DE_GLACES_BLOCS_FEUX | Bris de glaces blocs feux | Automobile | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| AUTO_DEFENSE_RECOURS | Défense Recours | Automobile | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| AUTO_DOMMAGES_PAR_ACCIDENT | Dommages par accident | Automobile | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| AUTO_HONORAIRES_D_EXPERTS | Honoraires d'experts | Automobile | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| AUTO_IMMOBILISATION | Immobilisation | Automobile | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| AUTO_INCENDIE | Incendie | Automobile | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR | Individuelle Accidents Conducteur | Automobile | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | Individuelle Personnes Transportées | Automobile | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| AUTO_INSOLVABILITE_DU_RESPONSABLE | Insolvabilité du Responsable | Automobile | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| AUTO_PRIVATION_DE_JOUISSANCE | Privation de jouissance | Automobile | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| AUTO_SECURITE_DU_CONDUCTEUR | Sécurité du conducteur | Automobile | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| AUTO_SECURITE_ROUTIERE | Sécurité routière | Automobile | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| AUTO_TIERCE_PERTE_TOTALE | Tierce Perte Totale | Automobile | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| AUTO_VOL | Vol | Automobile | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| RC_AUTO | Responsabilité civile et Recours des tiers incendie | Automobile | OBLIGATOIRE | ACTIF | 2000-01-01 | 2099-12-31 |
| SANTE_ANALYSE_BIOLOGIQUES | ANALYSE BIOLOGIQUES | Maladie et assurances des personnes | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| SANTE_ASSISTANCE | ASSISTANCE | Maladie et assurances des personnes | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| SANTE_ASSISTANCE_EVACUATION_SANITAIRE | ASSISTANCE EVACUATION SANITAIRE | Maladie et assurances des personnes | OBLIGATOIRE | ACTIF | 2000-01-01 | 2099-12-31 |
| SANTE_ASSURANCE_VOYAGE | ASSURANCE VOYAGE | Maladie et assurances des personnes | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| SANTE_AUXILIAIRES_MEDICAUX | AUXILIAIRES MEDICAUX | Maladie et assurances des personnes | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| SANTE_CHIRURGIE | CHIRURGIE | Maladie et assurances des personnes | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| SANTE_COMPLEMENTAIRE_ACCIDENT_DE_TRAVAIL | COMPLEMENTAIRE ACCIDENT DE TRAVAIL | Maladie et assurances des personnes | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| SANTE_CONSULTATION | CONSULTATION | Maladie et assurances des personnes | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| SANTE_EXTENSION | EXTENSION | Maladie et assurances des personnes | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| SANTE_FRAIS_FUNERAIRES | FRAIS FUNERAIRES | Maladie et assurances des personnes | OBLIGATOIRE | ACTIF | 2000-01-01 | 2099-12-31 |
| SANTE_GARANTIE_SANTE | Garantie santé | Maladie et assurances des personnes | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| SANTE_HOSPITALISATION | HOSPITALISATION | Maladie et assurances des personnes | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| SANTE_INDIVIDUELLE_ACCIDENT | INDIVIDUELLE ACCIDENT | Maladie et assurances des personnes | OBLIGATOIRE | ACTIF | 2000-01-01 | 2099-12-31 |
| SANTE_INDIVIDUELLE_ACCIDENT_GROUPE | INDIVIDUELLE ACCIDENT GROUPE | Maladie et assurances des personnes | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| SANTE_INDIVIDUELLE_CONDUCTEUR | INDIVIDUELLE CONDUCTEUR | Maladie et assurances des personnes | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| SANTE_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE PERSONNES TRANSPORTEES | Maladie et assurances des personnes | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| SANTE_INDIVIDUELLE_VOYAGE | INDIVIDUELLE VOYAGE | Maladie et assurances des personnes | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| SANTE_MALADIES_FAMILLE | MALADIES FAMILLE | Maladie et assurances des personnes | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| SANTE_MALADIE_GROUPE | MALADIE GROUPE | Maladie et assurances des personnes | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| SANTE_MATERNITE | MATERNITE | Maladie et assurances des personnes | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| SANTE_MULTIRISQUES_SANTE | MULTIRISQUES SANTE | Maladie et assurances des personnes | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| SANTE_OPTIQUE | OPTIQUE | Maladie et assurances des personnes | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| SANTE_PETITE_CHIRURGIE | PETITE CHIRURGIE | Maladie et assurances des personnes | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| SANTE_PHARMACIE | PHARMACIE | Maladie et assurances des personnes | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| SANTE_RADIO | RADIO | Maladie et assurances des personnes | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| SANTE_REEDUCATION | REEDUCATION | Maladie et assurances des personnes | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| SANTE_SOINS_DENTAIRES | SOINS DENTAIRES | Maladie et assurances des personnes | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| SANTE_VISITES | VISITES | Maladie et assurances des personnes | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| INCENDIE_BRIS_DE_GLACES | BRIS DE GLACES | Incendie & autres dommages | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| INCENDIE_BRIS_DE_MACHINES | BRIS DE MACHINES | Incendie & autres dommages | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| INCENDIE_BRIS_DE_MACHINES_POSTES_FIXES | BRIS DE MACHINES POSTES FIXES | Incendie & autres dommages | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| INCENDIE_BRIS_DE_MACHINES_POSTES_MOBILES | BRIS DE MACHINES POSTES MOBILES | Incendie & autres dommages | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| INCENDIE_COULAGE | COULAGE | Incendie & autres dommages | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| INCENDIE_DEGATS_DES_EAUX | DEGATS DES EAUX | Incendie & autres dommages | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| INCENDIE_GLOBALE_BANQUE | GLOBALE BANQUE | Incendie & autres dommages | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| INCENDIE_INCENDIE | INCENDIE | Incendie & autres dommages | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| INCENDIE_INCENDIE_RISQUES_COMMERCIAUX | INCENDIE RISQUES COMMERCIAUX | Incendie & autres dommages | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| INCENDIE_INCENDIE_RISQUES_INDUSTRIELS | INCENDIE RISQUES INDUSTRIELS | Incendie & autres dommages | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| INCENDIE_INCENDIE_RISQUES_SIMPLES | INCENDIE RISQUES SIMPLES | Incendie & autres dommages | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| INCENDIE_MARCHANDISES_EN_CHAMBRES_FROIDES_ARRET_FRIGORIFIQUE | MARCHANDISES EN CHAMBRES FROIDES  (ARRET FRIGORIFIQUE) | Incendie & autres dommages | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| INCENDIE_PERTE_DE_MOYENS_DE_PAIEMENT | PERTE DE MOYENS DE PAIEMENT | Incendie & autres dommages | OBLIGATOIRE | ACTIF | 2000-01-01 | 2099-12-31 |
| INCENDIE_PERTE_EXPLOITATION_APRES_BRIS_DE_MACHINES | PERTE EXPLOITATION APRÈS BRIS DE MACHINES | Incendie & autres dommages | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| INCENDIE_PERTE_EXPLOITATION_APRES_INCENDIE | PERTE EXPLOITATION APRES INCENDIE | Incendie & autres dommages | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| INCENDIE_RC_APRES_LIVRAISON | RC APRES LIVRAISON | Incendie & autres dommages | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| INCENDIE_RC_APRES_TRAVAUX | RC APRES TRAVAUX | Incendie & autres dommages | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| INCENDIE_RC_EXPLOITATION | RC EXPLOITATION | Incendie & autres dommages | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| INCENDIE_RC_PRODUITS | RC PRODUITS | Incendie & autres dommages | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| INCENDIE_RC_PROPRIETAIRE_D_IMMEUBLE | RC PROPRIETAIRE D'IMMEUBLE | Incendie & autres dommages | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| INCENDIE_RISQUES_EXCEPTIONNELS | RISQUES EXCEPTIONNELS | Incendie & autres dommages | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| INCENDIE_TOUS_RISQUES_BIJOUTIER | TOUS RISQUES BIJOUTIER | Incendie & autres dommages | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| INCENDIE_TOUS_RISQUES_CHANTIERS | TOUS RISQUES CHANTIERS | Incendie & autres dommages | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| INCENDIE_TOUS_RISQUES_INFORMATIQUES | TOUS RISQUES INFORMATIQUES | Incendie & autres dommages | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| INCENDIE_TOUS_RISQUES_MONTAGE | TOUS RISQUES MONTAGE | Incendie & autres dommages | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| INCENDIE_TOUS_RISQUES_SAUF | TOUS RISQUES SAUF | Incendie & autres dommages | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| INCENDIE_VOL | VOL | Incendie & autres dommages | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| INCENDIE_VOLS_AVEC_EFFRACTION | VOLS AVEC EFFRACTION | Incendie & autres dommages | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| INCENDIE_VOL_TRANSPORT_DE_FONDS | VOL TRANSPORT DE FONDS | Incendie & autres dommages | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| AVIATION_CORPS_AERIEN | CORPS AERIEN | Aviation | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| AVIATION_INDIVIDUELLE_AVIATION | INDIVIDUELLE AVIATION | Aviation | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| AVIATION_INDIVIDUELLE_AVIATION_PASSAGERS | INDIVIDUELLE AVIATION PASSAGERS | Aviation | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| AVIATION_RC_AERIEN_TRANSPORT_ET_OU_AFFRETEUR | RC AERIEN (TRANSPORT ET/OU AFFRETEUR) | Aviation | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| AVIATION_RC_EXPLOITATION_AVIATION | RC EXPLOITATION AVIATION | Aviation | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| AVIATION_RESPONSABILITE_CIVILE_AVIATION | RESPONSABILITE CIVILE AVIATION | Aviation | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| RC_GENERALE_INDIVIDUELLE_ACCIDENT | INDIVIDUELLE ACCIDENT | Responsabilité Civile Générale | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| RC_GENERALE_RC_APRES_LIVRAISON | RC APRES LIVRAISON | Responsabilité Civile Générale | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| RC_GENERALE_RC_APRES_TRAVAUX | RC APRES TRAVAUX | Responsabilité Civile Générale | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| RC_GENERALE_RC_AUTRES_PROFESSIONS | RC AUTRES PROFESSIONS | Responsabilité Civile Générale | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| RC_GENERALE_RC_CHEF_DE_FAMILLE | RC CHEF DE FAMILLE | Responsabilité Civile Générale | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| RC_GENERALE_RC_COLLECTIVITES | RC COLLECTIVITES | Responsabilité Civile Générale | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| RC_GENERALE_RC_DIVERSES | RC DIVERSES | Responsabilité Civile Générale | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| RC_GENERALE_RC_EXPLOITATION | RC EXPLOITATION | Responsabilité Civile Générale | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| RC_GENERALE_RC_PRODUITS | RC PRODUITS | Responsabilité Civile Générale | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| RC_GENERALE_RC_PROFESSIONNELLE | RC PROFESSIONNELLE | Responsabilité Civile Générale | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| RC_GENERALE_RESPONSABILITE_CIVILE | RESPONSABILITE CIVILE | Responsabilité Civile Générale | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| TRANSPORT_CORPS_FLUVIAUX_LAGUNAIRES | CORPS FLUVIAUX/LAGUNAIRES | Transport, Corps et Facultés | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| TRANSPORT_CORPS_MARITIMES | CORPS MARITIMES | Transport, Corps et Facultés | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| TRANSPORT_CORPS_PLAISANCE | CORPS PLAISANCE | Transport, Corps et Facultés | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| TRANSPORT_FACULTES_AERIENNES | FACULTÉS AERIENNES | Transport, Corps et Facultés | OBLIGATOIRE | ACTIF | 2000-01-01 | 2099-12-31 |
| TRANSPORT_FACULTES_FLUVIALES | FACULTÉS FLUVIALES | Transport, Corps et Facultés | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| TRANSPORT_FACULTES_MARITIMES | FACULTÉS MARITIMES | Transport, Corps et Facultés | OBLIGATOIRE | ACTIF | 2000-01-01 | 2099-12-31 |
| TRANSPORT_FACULTES_TERRESTRES | FACULTÉS TERRESTRES | Transport, Corps et Facultés | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| TRANSPORT_RC_AFFRETEUR | RC AFFRETEUR | Transport, Corps et Facultés | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| TRANSPORT_RC_CONSTRUCTEUR_DE_NAVIRE | RC CONSTRUCTEUR DE NAVIRE | Transport, Corps et Facultés | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| TRANSPORT_RC_FACULTES_TERRESTRES | RC FACULTÉS TERRESTRES | Transport, Corps et Facultés | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| TRANSPORT_RC_MARITIMES_TRANSPORTS_ET_OU_AFFRETEUR | RC MARITIMES (TRANSPORTS ET/OU AFFRETEUR) | Transport, Corps et Facultés | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| TRANSPORT_RC_NAVIGATION_DE_PLAISANCE | RC NAVIGATION DE PLAISANCE | Transport, Corps et Facultés | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| RISQUES_TECHNIQUES_OFFSHORE | OFFSHORE | Risques techniques | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |
| RISQUES_TECHNIQUES_RC_RISQUES_PETROLIERS_ARMATEUR | RC RISQUES PETROLIERS (ARMATEUR) | Risques techniques | OPTIONNELLE | ACTIF | 2000-01-01 | 2099-12-31 |

## Sous-garanties automobile (44)

| Code | Libellé | Statut |
|---|---|---|
| AUTO_AREA_ASSURANCE_CONDUCTEUR__AREA_ASSURANCE_CONDUCTEUR | AREA Assurance Conducteur | ACTIF |
| AUTO_AREA_EXPRESS_AUTO__AREA_EXPRESS_AUTO | AREA Express Auto | ACTIF |
| AUTO_ASSISTANCE_A_LA_REPARATION__ASSISTANCE_ACCIDENT | Assistance Accident | ACTIF |
| AUTO_ASSISTANCE_A_LA_REPARATION__ASSISTANCE_A_LA_REPARATION | Assistance à la réparation | ACTIF |
| AUTO_ASSISTANCE_A_LA_REPARATION__REMORQUAGE | Remorquage | ACTIF |
| AUTO_AVANCE_RECOURS__AVANCE_RECOURS | Avance Recours | ACTIF |
| AUTO_BRIS_DE_GLACES_BLOCS_FEUX__BRIS_BLOCS_FEUX | Bris blocs feux | ACTIF |
| AUTO_BRIS_DE_GLACES_BLOCS_FEUX__BRIS_DE_GLACES | Bris de glaces | ACTIF |
| AUTO_BRIS_DE_GLACES__BRIS_DE_GLACES | Bris de glaces | ACTIF |
| AUTO_DEFENSE_RECOURS__DEFENSE_RECOURS | Défense Recours | ACTIF |
| AUTO_DEFENSE_RECOURS__HONORAIRES_EXPERTS | Honoraires d'experts (mandaté par l'assuré, litige) | ACTIF |
| AUTO_DOMMAGES_PAR_ACCIDENT__DOMMAGES_PAR_ACCIDENT | Dommages par accident | ACTIF |
| AUTO_DOMMAGES_PAR_ACCIDENT__IMMOBILISATION | Immobilisation | ACTIF |
| AUTO_DOMMAGES_PAR_ACCIDENT__TIERCE_PERTE_TOTALE | Tierce Perte Totale | ACTIF |
| AUTO_DOMMAGES_PAR_ACCIDENT__VEHICULE_REMPLACEMENT | Véhicule de remplacement | ACTIF |
| AUTO_HONORAIRES_D_EXPERTS__HONORAIRES_D_EXPERTS | Honoraires d'experts | ACTIF |
| AUTO_IMMOBILISATION__IMMOBILISATION | Immobilisation | ACTIF |
| AUTO_INCENDIE__BRIGANDAGE_INCENDIE | Brigandage incendie | ACTIF |
| AUTO_INCENDIE__INCENDIE | Incendie | ACTIF |
| AUTO_INCENDIE__INCENDIE_PERTE_TOTALE | Incendie Perte totale | ACTIF |
| AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR__DECES | Décès | ACTIF |
| AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR__FRAIS_MEDICAUX | Frais Médicaux | ACTIF |
| AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR__INCAPACITE_PERMANENTE | Incapacité permanente | ACTIF |
| AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES__DECES | Décès | ACTIF |
| AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES__FRAIS_MEDICAUX | Frais Médicaux | ACTIF |
| AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES__INCAPACITE_PERMANENTE | Incapacité permanente | ACTIF |
| AUTO_INSOLVABILITE_DU_RESPONSABLE__INSOLVABILITE_DU_RESPONSABLE | Insolvabilité du Responsable | ACTIF |
| AUTO_PRIVATION_DE_JOUISSANCE__PRIVATION_DE_JOUISSANCE | Privation de jouissance | ACTIF |
| AUTO_RC__EXTENSION_CEMAC | Extension territoriale en zone CEMAC (Carte Rose) | ACTIF |
| AUTO_RC__EXTENSION_HORS_CEMAC | Extension Hors zone CEMAC | ACTIF |
| AUTO_RC__RECOURS_TIERS_INCENDIE | Recours de tiers Incendie | ACTIF |
| AUTO_RC__RESPONSABILITE_CIVILE_STRICTE | Responsabilité civile (stricte) | ACTIF |
| AUTO_SECURITE_DU_CONDUCTEUR__SECURITE_DU_CONDUCTEUR | Sécurité du conducteur | ACTIF |
| AUTO_SECURITE_ROUTIERE__DECES | Décès | ACTIF |
| AUTO_SECURITE_ROUTIERE__INCAPACITE_PERMANENTE | Incapacité permanente | ACTIF |
| AUTO_SECURITE_ROUTIERE__SECURITE_ROUTIERE | Sécurité routière | ACTIF |
| AUTO_TIERCE_COLLISION__DOMMAGES_PAR_COLLISION | Dommages par collision | ACTIF |
| AUTO_TIERCE_COLLISION__TIERCE_COLLISION | Tierce collision | ACTIF |
| AUTO_TIERCE_PERTE_TOTALE__TIERCE_PERTE_TOTALE | Tierce Perte Totale | ACTIF |
| AUTO_VOL__BRIGANDAGE_VOL | Brigandage vol | ACTIF |
| AUTO_VOL__VOL_BRAQUAGE | Vol Braquage | ACTIF |
| AUTO_VOL__VOL_DES_ACCESSOIRES | Vol des accessoires | ACTIF |
| AUTO_VOL__VOL_PARTIEL | Vol Partiel | ACTIF |
| AUTO_VOL__VOL_VEHICULE | Vol véhicule | ACTIF |

## Franchises (9) et applications par compagnie (36)

| Code | Libellé | Garantie | Type | Taux % |
|---|---|---|---|---|
| FR_OBL_AUTO_TIERCE_COLLISION__TIERCE_COLLISION_10 | Franchise 10% (obligatoire) | TIERCE_COLLISION / TIERCE_COLLISION | OBLIGATOIRE | 10 |
| FR_OBL_AUTO_TIERCE_COLLISION__TIERCE_COLLISION_05 | Franchise 5% | TIERCE_COLLISION / TIERCE_COLLISION | OBLIGATOIRE | 5 |
| FR_OBL_AUTO_TIERCE_COLLISION__TIERCE_COLLISION_01 | 1% Valeur neuve actualisée | TIERCE_COLLISION / TIERCE_COLLISION | OBLIGATOIRE | 1 |
| FR_FAC_AUTO_DOMMAGES_PAR_ACCIDENT__DOMMAGES_PAR_ACCIDENT_30 | Franchise 30% (facultative) | DOMMAGES_PAR_ACCIDENT / DOMMAGES_PAR_ACCIDENT | FACULTATIVE | 30 |
| FR_FAC_AUTO_DOMMAGES_PAR_ACCIDENT__DOMMAGES_PAR_ACCIDENT_20 | Franchise 20% (facultative) | DOMMAGES_PAR_ACCIDENT / DOMMAGES_PAR_ACCIDENT | FACULTATIVE | 20 |
| FR_FAC_AUTO_DOMMAGES_PAR_ACCIDENT__DOMMAGES_PAR_ACCIDENT_10 | Franchise 10% (facultative) | DOMMAGES_PAR_ACCIDENT / DOMMAGES_PAR_ACCIDENT | FACULTATIVE | 10 |
| FR_OBL_AUTO_DOMMAGES_PAR_ACCIDENT__DOMMAGES_PAR_ACCIDENT_10 | Franchise 10% (obligatoire) | DOMMAGES_PAR_ACCIDENT / DOMMAGES_PAR_ACCIDENT | OBLIGATOIRE | 10 |
| FR_OBL_AUTO_DOMMAGES_PAR_ACCIDENT__DOMMAGES_PAR_ACCIDENT_05 | Franchise 5% | DOMMAGES_PAR_ACCIDENT / DOMMAGES_PAR_ACCIDENT | OBLIGATOIRE | 5 |
| FR_OBL_AUTO_DOMMAGES_PAR_ACCIDENT__DOMMAGES_PAR_ACCIDENT_01 | 1% Valeur neuve actualisée | DOMMAGES_PAR_ACCIDENT / DOMMAGES_PAR_ACCIDENT | OBLIGATOIRE | 1 |

| Compagnie | Catégorie | Franchise | Montant min | Montant max | Réduction de prime % | Actif | Du | Au |
|---|---|---|---|---|---|---|---|---|
| GMCSA | 01 | Franchise 10% (facultative) | 50 000 | 200 000 | — | True | 2000-01-01 | 2099-12-31 |
| GMCSA | 01 | Franchise 20% (facultative) | 50 000 | 200 000 | — | True | 2000-01-01 | 2099-12-31 |
| GMCSA | 01 | Franchise 30% (facultative) | 50 000 | 200 000 | — | True | 2000-01-01 | 2099-12-31 |
| LDASA | 01 | Franchise 5% | 75 000 | — | — | True | 2000-01-01 | 2099-12-31 |
| LDASA | 01 | Franchise 5% | 75 000 | — | — | True | 2000-01-01 | 2099-12-31 |
| LDASA | 02 | Franchise 10% (obligatoire) | 75 000 | — | — | True | 2000-01-01 | 2099-12-31 |
| LDASA | 02 | Franchise 10% (obligatoire) | 75 000 | — | — | True | 2000-01-01 | 2099-12-31 |
| LDASA | 03 | Franchise 10% (obligatoire) | 150 000 | — | — | True | 2000-01-01 | 2099-12-31 |
| LDASA | 03 | Franchise 10% (obligatoire) | 150 000 | — | — | True | 2000-01-01 | 2099-12-31 |
| LDASA | 04A | Franchise 10% (obligatoire) | 75 000 | — | — | True | 2000-01-01 | 2099-12-31 |
| LDASA | 04A | Franchise 10% (obligatoire) | 75 000 | — | — | True | 2000-01-01 | 2099-12-31 |
| LDASA | 04B | Franchise 10% (obligatoire) | 150 000 | — | — | True | 2000-01-01 | 2099-12-31 |
| LDASA | 04B | Franchise 10% (obligatoire) | 150 000 | — | — | True | 2000-01-01 | 2099-12-31 |
| LDASA | 04C | Franchise 10% (obligatoire) | 150 000 | — | — | True | 2000-01-01 | 2099-12-31 |
| LDASA | 04C | Franchise 10% (obligatoire) | 150 000 | — | — | True | 2000-01-01 | 2099-12-31 |
| LDASA | 06 | Franchise 10% (obligatoire) | 150 000 | — | — | True | 2000-01-01 | 2099-12-31 |
| LDASA | 06 | Franchise 10% (obligatoire) | 150 000 | — | — | True | 2000-01-01 | 2099-12-31 |
| LDASA | 07ARC | Franchise 10% (obligatoire) | 150 000 | — | — | True | 2000-01-01 | 2099-12-31 |
| LDASA | 07ARC | Franchise 10% (obligatoire) | 150 000 | — | — | True | 2000-01-01 | 2099-12-31 |
| LDASA | 07SRC | Franchise 10% (obligatoire) | 150 000 | — | — | True | 2000-01-01 | 2099-12-31 |
| LDASA | 07SRC | Franchise 10% (obligatoire) | 150 000 | — | — | True | 2000-01-01 | 2099-12-31 |
| LDASA | 08 | Franchise 10% (obligatoire) | 150 000 | — | — | True | 2000-01-01 | 2099-12-31 |
| LDASA | 08 | Franchise 10% (obligatoire) | 150 000 | — | — | True | 2000-01-01 | 2099-12-31 |
| LDASA | 09A | 1% Valeur neuve actualisée | — | — | — | True | 2000-01-01 | 2099-12-31 |
| LDASA | 09A | 1% Valeur neuve actualisée | — | — | — | True | 2000-01-01 | 2099-12-31 |
| LDASA | 10A | Franchise 5% | 75 000 | — | — | True | 2000-01-01 | 2099-12-31 |
| LDASA | 10A | Franchise 10% (obligatoire) | 75 000 | — | — | True | 2000-01-01 | 2099-12-31 |
| LDASA | 10A | Franchise 5% | 75 000 | — | — | True | 2000-01-01 | 2099-12-31 |
| LDASA | 10A | Franchise 10% (obligatoire) | 75 000 | — | — | True | 2000-01-01 | 2099-12-31 |
| LDASA | 10B | Franchise 5% | 75 000 | — | — | True | 2000-01-01 | 2099-12-31 |
| LDASA | 10B | Franchise 5% | 75 000 | — | — | True | 2000-01-01 | 2099-12-31 |
| LDASA | 10C | 1% Valeur neuve actualisée | — | — | — | True | 2000-01-01 | 2099-12-31 |
| LDASA | 10C | 1% Valeur neuve actualisée | — | — | — | True | 2000-01-01 | 2099-12-31 |
| SAAR | 01 | Franchise 10% (facultative) | 50 000 | 200 000 | — | True | 2000-01-01 | 2099-12-31 |
| SAAR | 01 | Franchise 20% (facultative) | 50 000 | 200 000 | — | True | 2000-01-01 | 2099-12-31 |
| SAAR | 01 | Franchise 30% (facultative) | 50 000 | 200 000 | — | True | 2000-01-01 | 2099-12-31 |

## Produits (9) et liens produit / sous-catégorie (34)

| Code | Libellé | Segment | Branche | Sous-catégories liées |
|---|---|---|---|---|
| AUCUN | Aucun / Non applicable | — | Aucune / Non applicable | — |
| AUTO_MONO_VEHICULE | Assurance Automobile mono véhicule | PARTICULIERS | Automobile | 01, 02, 03, 04A, 04B, 04C, 05, 05bis, 06, 07ARC, 07SRC, 08, 09A, 09B, 10A, 10B, 10C |
| SANTE_MATERNITE | Santé & Maternité | PARTICULIERS | Maladie et assurances des personnes | — |
| MULTIRISQUE_HABITATION | Multirisque Habitation | PARTICULIERS | Incendie & autres dommages | — |
| VOYAGE_ASSISTANCE | Voyage & Assistance | PARTICULIERS | Transport, Corps et Facultés | — |
| FLOTTES_AUTOMOBILE | Flottes Automobile | ENTREPRISES | Automobile | 01, 02, 03, 04A, 04B, 04C, 05, 05bis, 06, 07ARC, 07SRC, 08, 09A, 09B, 10A, 10B, 10C |
| SANTE_COLLECTIVE_SALARIES | Santé Collective Salariés | ENTREPRISES | Maladie et assurances des personnes | — |
| RC_PRO_MULTIRISQUE | RC Pro & Multirisque | ENTREPRISES | Aucune / Non applicable | — |
| TRANSPORT_MARCHANDISES | Transport de Marchandises | ENTREPRISES | Transport, Corps et Facultés | — |

## Offres historiques (`offre` 146 lignes)

| Code | Compagnie | Dénomination | Actif |
|---|---|---|---|
| ACTIVA_AUTO_AVANCE_RECOURS | ACTIVA | Avance Recours | True |
| ACTIVA_AUTO_BRIS_DE_GLACES_BLOCS_FEUX | ACTIVA | Bris de glaces | True |
| ACTIVA_AUTO_DEFENSE_RECOURS | ACTIVA | Défense Recours | True |
| ACTIVA_AUTO_DOMMAGES_PAR_ACCIDENT | ACTIVA | Dommages par accident | True |
| ACTIVA_AUTO_INCENDIE | ACTIVA | Incendie | True |
| ACTIVA_AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR | ACTIVA | Assurance Conducteur | True |
| ACTIVA_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | ACTIVA | Individuelle Personnes Transportées | True |
| ACTIVA_AUTO_TIERCE_COLLISION | ACTIVA | Dommages Tierce collision | True |
| ACTIVA_AUTO_VOL | ACTIVA | Vol | True |
| ACTIVA_RC_AUTO | ACTIVA | Responsabilité civile et Recours des tiers incendie | True |
| AGC_AUTO_AVANCE_RECOURS | AGC | Avance Recours | True |
| AGC_AUTO_BRIS_DE_GLACES_BLOCS_FEUX | AGC | Bris de glaces | True |
| AGC_AUTO_DEFENSE_RECOURS | AGC | Défense Recours | True |
| AGC_AUTO_DOMMAGES_PAR_ACCIDENT | AGC | Dommages par accident (Tous risques) | True |
| AGC_AUTO_INCENDIE | AGC | Incendie | True |
| AGC_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | AGC | Individuelle Personnes Transportées | True |
| AGC_AUTO_SECURITE_DU_CONDUCTEUR | AGC | Sécurité du conducteur | True |
| AGC_AUTO_TIERCE_COLLISION | AGC | Tierce collision | True |
| AGC_AUTO_VOL | AGC | Vol véhicule | True |
| AGC_RC_AUTO | AGC | Responsabilité civile et Recours des tiers incendie | True |
| ALLIANZ_AUTO_BRIS_DE_GLACES_BLOCS_FEUX | ALLIANZ | Bris de glaces | True |
| ALLIANZ_AUTO_DEFENSE_RECOURS | ALLIANZ | Défense Recours | True |
| ALLIANZ_AUTO_INCENDIE | ALLIANZ | Incendie | True |
| ALLIANZ_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | ALLIANZ | Individuelle Personnes Transportées | True |
| ALLIANZ_AUTO_VOL | ALLIANZ | Vol | True |
| ALLIANZ_RC_AUTO | ALLIANZ | Responsabilité civile et Recours des tiers incendie | True |
| AREA_AUTO_AREA_ASSURANCE_CONDUCTEUR | AREA | AREA Assurance Conducteur | True |
| AREA_AUTO_AREA_EXPRESS_AUTO | AREA | AREA Express Auto | True |
| AREA_AUTO_AVANCE_RECOURS | AREA | Avance Recours | True |
| AREA_AUTO_BRIS_DE_GLACES_BLOCS_FEUX | AREA | Bris de glaces | True |
| AREA_AUTO_DEFENSE_RECOURS | AREA | Défense Recours | True |
| AREA_AUTO_DOMMAGES_PAR_ACCIDENT | AREA | Dommages par accident (Tous risques) | True |
| AREA_AUTO_INCENDIE | AREA | Incendie Perte Totale | True |
| AREA_AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR | AREA | Individuelle Accident Conducteur | True |
| AREA_AUTO_TIERCE_COLLISION | AREA | Tierce collision | True |
| AREA_AUTO_TIERCE_PERTE_TOTALE | AREA | Tierce Perte Totale | True |
| AREA_AUTO_VOL | AREA | Vol véhicule | True |
| AREA_RC_AUTO | AREA | Responsabilité civile et Recours des tiers incendie | True |
| ATLANTIQUE_AUTO_AVANCE_RECOURS | AFG | Avance Recours | True |
| ATLANTIQUE_AUTO_BRIS_DE_GLACES_BLOCS_FEUX | AFG | Bris de glaces | True |
| ATLANTIQUE_AUTO_DEFENSE_RECOURS | AFG | Défense Recours | True |
| ATLANTIQUE_AUTO_DOMMAGES_PAR_ACCIDENT | AFG | Dommages par accident | True |
| ATLANTIQUE_AUTO_HONORAIRES_D_EXPERTS | AFG | Honoraires Experts | True |
| ATLANTIQUE_AUTO_INCENDIE | AFG | Incendie | True |
| ATLANTIQUE_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | AFG | Individuelle Personnes Transportées | True |
| ATLANTIQUE_AUTO_TIERCE_COLLISION | AFG | Dommages par collision | True |
| ATLANTIQUE_AUTO_VOL | AFG | Vol | True |
| ATLANTIQUE_RC_AUTO | AFG | Responsabilité civile et Recours des tiers incendie | True |
| AUCUNE | AUCUNE | Aucune / Non applicable | True |
| BENEFICIAL_AUTO_ASSISTANCE_A_LA_REPARATION | BELIFE | Assistance à la réparation | True |
| BENEFICIAL_AUTO_BRIS_DE_GLACES_BLOCS_FEUX | BELIFE | Bris de glaces | True |
| BENEFICIAL_AUTO_DEFENSE_RECOURS | BELIFE | Défense Recours | True |
| BENEFICIAL_AUTO_DOMMAGES_PAR_ACCIDENT | BELIFE | Dommages par accident (Tous risques) | True |
| BENEFICIAL_AUTO_INCENDIE | BELIFE | Incendie | True |
| BENEFICIAL_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | BELIFE | Individuelle Personnes Transportées | True |
| BENEFICIAL_AUTO_TIERCE_COLLISION | BELIFE | Tierce collision | True |
| BENEFICIAL_RC_AUTO | BELIFE | Responsabilité civile et Recours des tiers incendie | True |
| CHANAS_AUTO_ASSISTANCE_A_LA_REPARATION | CHANAS | Assistance réparation | True |
| CHANAS_AUTO_BRIS_DE_GLACES_BLOCS_FEUX | CHANAS | Bris de glaces | True |
| CHANAS_AUTO_DEFENSE_RECOURS | CHANAS | Défense Recours | True |
| CHANAS_AUTO_DOMMAGES_PAR_ACCIDENT | CHANAS | Dommages par accident | True |
| CHANAS_AUTO_HONORAIRES_D_EXPERTS | CHANAS | Honoraires Experts | True |
| CHANAS_AUTO_IMMOBILISATION | CHANAS | Immobilisation | True |
| CHANAS_AUTO_INCENDIE | CHANAS | Incendie | True |
| CHANAS_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | CHANAS | Individuelle Personnes Transportées | True |
| CHANAS_AUTO_TIERCE_COLLISION | CHANAS | Dommages par collision | True |
| CHANAS_AUTO_VOL | CHANAS | Vol véhicule | True |
| CHANAS_RC_AUTO | CHANAS | Responsabilité civile et Recours des tiers incendie | True |
| CPA_AUTO_ASSISTANCE_A_LA_REPARATION | CPA | Assistance à la réparation | True |
| CPA_AUTO_BRIS_DE_GLACES_BLOCS_FEUX | CPA | Bris de glaces | True |
| CPA_AUTO_DEFENSE_RECOURS | CPA | Défense Recours | True |
| CPA_AUTO_DOMMAGES_PAR_ACCIDENT | CPA | Dommages par accident | True |
| CPA_AUTO_INCENDIE | CPA | Incendie | True |
| CPA_AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR | CPA | Individuelle Accidents Conducteur | True |
| CPA_AUTO_SECURITE_ROUTIERE | CPA | Sécurité routière | True |
| CPA_AUTO_TIERCE_COLLISION | CPA | Tierce Collision | True |
| CPA_AUTO_VOL | CPA | Vol des accessoires | True |
| CPA_RC_AUTO | CPA | Responsabilité civile et Recours des tiers incendie | True |
| GMCSA_AUTO_AVANCE_RECOURS | GMCSA | Avance Recours | True |
| GMCSA_AUTO_BRIS_DE_GLACES_BLOCS_FEUX | GMCSA | Bris de glaces | True |
| GMCSA_AUTO_DEFENSE_RECOURS | GMCSA | Défense Recours | True |
| GMCSA_AUTO_DOMMAGES_PAR_ACCIDENT | GMCSA | Dommages (Tous risques) | True |
| GMCSA_AUTO_INCENDIE | GMCSA | Incendie | True |
| GMCSA_AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR | GMCSA | Individuelle Accidents Conducteur | True |
| GMCSA_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | GMCSA | Individuelle Personnes Transportées | True |
| GMCSA_AUTO_TIERCE_COLLISION | GMCSA | Tierce collision | True |
| GMCSA_AUTO_VOL | GMCSA | Vol | True |
| GMCSA_RC_AUTO | GMCSA | Responsabilité civile et Recours des tiers incendie | True |
| GMCSA_RC_AUTO__EXTENSION_CEMAC | GMCSA | Extension territoriale en zone CEMAC (Carte Rose) | True |
| NSIA_AUTO_AVANCE_RECOURS | NSIA | Avance Recours | True |
| NSIA_AUTO_BRIS_DE_GLACES_BLOCS_FEUX | NSIA | Bris de glaces | True |
| NSIA_AUTO_DEFENSE_RECOURS | NSIA | Défense Recours | True |
| NSIA_AUTO_DOMMAGES_PAR_ACCIDENT | NSIA | Dommages par accident (Tous risques) | True |
| NSIA_AUTO_INCENDIE | NSIA | Incendie | True |
| NSIA_AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR | NSIA | Individuelle Accident Conducteur | True |
| NSIA_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | NSIA | Individuelle Personnes Transportées | True |
| NSIA_AUTO_TIERCE_COLLISION | NSIA | Tierce collision | True |
| NSIA_AUTO_VOL | NSIA | Vol véhicule | True |
| NSIA_RC_AUTO | NSIA | Responsabilité civile et Recours des tiers incendie | True |
| PROASSUR_AUTO_AVANCE_RECOURS | PROASSUR | Avance Recours | True |
| PROASSUR_AUTO_BRIS_DE_GLACES_BLOCS_FEUX | PROASSUR | Bris de glaces | True |
| PROASSUR_AUTO_DEFENSE_RECOURS | PROASSUR | Défense Recours | True |
| PROASSUR_AUTO_INCENDIE | PROASSUR | Incendie | True |
| PROASSUR_AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR | PROASSUR | Individuelle Accidents Conducteur | True |
| PROASSUR_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | PROASSUR | Individuelle Personnes Transportées | True |
| PROASSUR_AUTO_TIERCE_COLLISION | PROASSUR | Dommages par collision | True |
| PROASSUR_AUTO_VOL | PROASSUR | Vol véhicule | True |
| PROASSUR_RC_AUTO | PROASSUR | Responsabilité civile et Recours des tiers incendie | True |
| ROYAL ONYX_AUTO_AVANCE_RECOURS | ROYAL ONYX | Avance Recours | True |
| ROYAL ONYX_AUTO_BRIS_DE_GLACES_BLOCS_FEUX | ROYAL ONYX | Bris de glaces | True |
| ROYAL ONYX_AUTO_DEFENSE_RECOURS | ROYAL ONYX | Défense Recours | True |
| ROYAL ONYX_AUTO_DOMMAGES_PAR_ACCIDENT | ROYAL ONYX | Dommages par accident | True |
| ROYAL ONYX_AUTO_INCENDIE | ROYAL ONYX | Incendie | True |
| ROYAL ONYX_AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR | ROYAL ONYX | Individuelle Accidents Conducteur | True |
| ROYAL ONYX_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | ROYAL ONYX | Individuelle Personnes Transportées | True |
| ROYAL ONYX_AUTO_INSOLVABILITE_DU_RESPONSABLE | ROYAL ONYX | Insolvabilité du Responsable | True |
| ROYAL ONYX_AUTO_PRIVATION_DE_JOUISSANCE | ROYAL ONYX | Privation de jouissance | True |
| ROYAL ONYX_AUTO_TIERCE_COLLISION | ROYAL ONYX | Tierce Collision | True |
| ROYAL ONYX_AUTO_VOL | ROYAL ONYX | Vol | True |
| ROYAL ONYX_RC_AUTO | ROYAL ONYX | Responsabilité civile et Recours des tiers incendie | True |
| SAAR_AUTO_ASSISTANCE_A_LA_REPARATION | SAAR | Assistance à la réparation | True |
| SAAR_AUTO_BRIS_DE_GLACES_BLOCS_FEUX | SAAR | Bris de glaces | True |
| SAAR_AUTO_DEFENSE_RECOURS | SAAR | Défense Recours | True |
| SAAR_AUTO_DOMMAGES_PAR_ACCIDENT | SAAR | Dommages par accident (Tous risques) | True |
| SAAR_AUTO_INCENDIE | SAAR | Incendie | True |
| SAAR_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | SAAR | Individuelle Personnes Transportées | True |
| SAAR_AUTO_SECURITE_DU_CONDUCTEUR | SAAR | Sécurité du conducteur | True |
| SAAR_AUTO_SECURITE_ROUTIERE | SAAR | Sécurité routière | True |
| SAAR_AUTO_TIERCE_COLLISION | SAAR | Tierce collision | True |
| SAAR_AUTO_VOL | SAAR | Vol véhicule | True |
| SAAR_RC_AUTO | SAAR | Responsabilité civile et Recours des tiers incendie | True |
| SOCAR_AUTO_BRIS_DE_GLACES_BLOCS_FEUX | ZENITHE | Bris de glaces blocs feux | True |
| SOCAR_AUTO_DOMMAGES_PAR_ACCIDENT | ZENITHE | Dommages par accident | True |
| SOCAR_AUTO_INCENDIE | ZENITHE | Incendie | True |
| SOCAR_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | ZENITHE | Accidents passagers | True |
| SOCAR_AUTO_TIERCE_COLLISION | ZENITHE | Tierce Collision | True |
| SOCAR_AUTO_VOL | ZENITHE | Vol | True |
| SUNU_AUTO_AVANCE_RECOURS | SUNU | Avance Recours | True |
| SUNU_AUTO_BRIS_DE_GLACES_BLOCS_FEUX | SUNU | Bris de glaces | True |
| SUNU_AUTO_DEFENSE_RECOURS | SUNU | Défense Recours | True |
| SUNU_AUTO_DOMMAGES_PAR_ACCIDENT | SUNU | Dommages par accident (Tous risques) | True |
| SUNU_AUTO_INCENDIE | SUNU | Incendie | True |
| SUNU_AUTO_INSOLVABILITE_DU_RESPONSABLE | SUNU | Insolvabilité du Responsable | True |
| SUNU_AUTO_PRIVATION_DE_JOUISSANCE | SUNU | Privation de jouissance | True |
| SUNU_AUTO_TIERCE_COLLISION | SUNU | Tierce collision | True |
| SUNU_AUTO_VOL | SUNU | Vol véhicule | True |

## Détail des offres historiques (`detail_offre` 234 lignes)

| Offre | Sous-garantie | Dénomination | Actif |
|---|---|---|---|
| ACTIVA_AUTO_AVANCE_RECOURS | AVANCE_RECOURS / AVANCE_RECOURS | Remboursement Anticipé | True |
| ACTIVA_AUTO_BRIS_DE_GLACES_BLOCS_FEUX | BRIS_DE_GLACES_BLOCS_FEUX / BRIS_DE_GLACES | Bris de glaces | True |
| ACTIVA_AUTO_DEFENSE_RECOURS | DEFENSE_RECOURS / DEFENSE_RECOURS | Défense Recours | True |
| ACTIVA_AUTO_DOMMAGES_PAR_ACCIDENT | DOMMAGES_PAR_ACCIDENT / DOMMAGES_PAR_ACCIDENT | Dommages | True |
| ACTIVA_AUTO_INCENDIE | INCENDIE / INCENDIE | Incendie | True |
| ACTIVA_AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR | INDIVIDUELLE_ACCIDENTS_CONDUCTEUR / DECES | Décès Accidentel | True |
| ACTIVA_AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR | INDIVIDUELLE_ACCIDENTS_CONDUCTEUR / FRAIS_MEDICAUX | Frais medicaux et pharmaceutiques | True |
| ACTIVA_AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR | INDIVIDUELLE_ACCIDENTS_CONDUCTEUR / INCAPACITE_PERMANENTE | Inval. part/totale suite accident | True |
| ACTIVA_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / DECES | Décès | True |
| ACTIVA_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / FRAIS_MEDICAUX | Frais Médicaux | True |
| ACTIVA_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / INCAPACITE_PERMANENTE | Incapacité Permanente | True |
| ACTIVA_AUTO_TIERCE_COLLISION | TIERCE_COLLISION / DOMMAGES_PAR_COLLISION | Collision | True |
| ACTIVA_AUTO_VOL | VOL / VOL_BRAQUAGE | Vol Braquage | True |
| ACTIVA_AUTO_VOL | VOL / VOL_DES_ACCESSOIRES | Vol Accessoires Hors Standard | True |
| ACTIVA_AUTO_VOL | VOL / VOL_PARTIEL | Vol Partiel | True |
| ACTIVA_AUTO_VOL | VOL / VOL_VEHICULE | Vol véhicule | True |
| ACTIVA_RC_AUTO | RC / RESPONSABILITE_CIVILE_STRICTE | Responsabilité civile | True |
| ACTIVA_RC_AUTO | RC / RECOURS_TIERS_INCENDIE | Recours de Tiers Incendie | True |
| AGC_AUTO_AVANCE_RECOURS | AVANCE_RECOURS / AVANCE_RECOURS | Avance Recours | True |
| AGC_AUTO_BRIS_DE_GLACES_BLOCS_FEUX | BRIS_DE_GLACES_BLOCS_FEUX / BRIS_DE_GLACES | Bris de glaces | True |
| AGC_AUTO_DEFENSE_RECOURS | DEFENSE_RECOURS / DEFENSE_RECOURS | Défense Recours | True |
| AGC_AUTO_DOMMAGES_PAR_ACCIDENT | DOMMAGES_PAR_ACCIDENT / DOMMAGES_PAR_ACCIDENT | Dommages par accident | True |
| AGC_AUTO_INCENDIE | INCENDIE / INCENDIE | Incendie | True |
| AGC_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / DECES | Décès | True |
| AGC_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / FRAIS_MEDICAUX | Frais Médicaux | True |
| AGC_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / INCAPACITE_PERMANENTE | Incapacité Permanente | True |
| AGC_AUTO_SECURITE_DU_CONDUCTEUR | SECURITE_DU_CONDUCTEUR / SECURITE_DU_CONDUCTEUR | Sécurité du conducteur | True |
| AGC_AUTO_TIERCE_COLLISION | TIERCE_COLLISION / DOMMAGES_PAR_COLLISION | Dommages par collision | True |
| AGC_AUTO_VOL | VOL / VOL_BRAQUAGE | Vol Braquage | True |
| AGC_AUTO_VOL | VOL / VOL_PARTIEL | Vol Partiel | True |
| AGC_AUTO_VOL | VOL / VOL_VEHICULE | Vol véhicule | True |
| AGC_RC_AUTO | RC / RESPONSABILITE_CIVILE_STRICTE | Responsabilité civile | True |
| AGC_RC_AUTO | RC / RECOURS_TIERS_INCENDIE | Recours de Tiers Incendie | True |
| ALLIANZ_AUTO_BRIS_DE_GLACES_BLOCS_FEUX | BRIS_DE_GLACES_BLOCS_FEUX / BRIS_DE_GLACES | Bris de glaces | True |
| ALLIANZ_AUTO_DEFENSE_RECOURS | DEFENSE_RECOURS / DEFENSE_RECOURS | Défense Recours | True |
| ALLIANZ_AUTO_INCENDIE | INCENDIE / INCENDIE | Incendie | True |
| ALLIANZ_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / DECES | Décès | True |
| ALLIANZ_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / FRAIS_MEDICAUX | Frais de traitement réellement exposés | True |
| ALLIANZ_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / INCAPACITE_PERMANENTE | Infirmité permanente | True |
| ALLIANZ_AUTO_VOL | VOL / VOL_BRAQUAGE | Vol Braquage | True |
| ALLIANZ_AUTO_VOL | VOL / VOL_DES_ACCESSOIRES | Vol des accessoires | True |
| ALLIANZ_AUTO_VOL | VOL / VOL_VEHICULE | Vol | True |
| ALLIANZ_RC_AUTO | RC / RESPONSABILITE_CIVILE_STRICTE | Responsabilité civile | True |
| ALLIANZ_RC_AUTO | RC / RECOURS_TIERS_INCENDIE | Recours de Tiers Incendie | True |
| AREA_AUTO_AREA_ASSURANCE_CONDUCTEUR | AREA_ASSURANCE_CONDUCTEUR / AREA_ASSURANCE_CONDUCTEUR | AREA Assurance Conducteur | True |
| AREA_AUTO_AREA_EXPRESS_AUTO | AREA_EXPRESS / AREA_EXPRESS_AUTO | AREA Express Auto | True |
| AREA_AUTO_AVANCE_RECOURS | AVANCE_RECOURS / AVANCE_RECOURS | Avance Recours | True |
| AREA_AUTO_BRIS_DE_GLACES_BLOCS_FEUX | BRIS_DE_GLACES_BLOCS_FEUX / BRIS_DE_GLACES | Bris de glaces | True |
| AREA_AUTO_DEFENSE_RECOURS | DEFENSE_RECOURS / DEFENSE_RECOURS | Défense Recours | True |
| AREA_AUTO_DOMMAGES_PAR_ACCIDENT | DOMMAGES_PAR_ACCIDENT / DOMMAGES_PAR_ACCIDENT | Dommages par accident | True |
| AREA_AUTO_INCENDIE | INCENDIE / INCENDIE | Incendie | True |
| AREA_AUTO_INCENDIE | INCENDIE / INCENDIE_PERTE_TOTALE | Incendie Perte totale | True |
| AREA_AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR | INDIVIDUELLE_ACCIDENTS_CONDUCTEUR / DECES | Décès Accidentel | True |
| AREA_AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR | INDIVIDUELLE_ACCIDENTS_CONDUCTEUR / FRAIS_MEDICAUX | Frais medicaux et pharmaceutiques | True |
| AREA_AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR | INDIVIDUELLE_ACCIDENTS_CONDUCTEUR / INCAPACITE_PERMANENTE | Inval. part/totale suite accident | True |
| AREA_AUTO_TIERCE_COLLISION | TIERCE_COLLISION / DOMMAGES_PAR_COLLISION | Dommages par collision | True |
| AREA_AUTO_TIERCE_PERTE_TOTALE | TIERCE_PERTE_TOTALE / TIERCE_PERTE_TOTALE | Tierce Perte Totale | True |
| AREA_AUTO_VOL | VOL / VOL_VEHICULE | Vol au garage mort | True |
| AREA_AUTO_VOL | VOL / VOL_BRAQUAGE | Vol Braquage | True |
| AREA_AUTO_VOL | VOL / VOL_PARTIEL | Vol Partiel | True |
| AREA_AUTO_VOL | VOL / VOL_VEHICULE | Vol véhicule | True |
| AREA_RC_AUTO | RC / RESPONSABILITE_CIVILE_STRICTE | Responsabilité civile | True |
| AREA_RC_AUTO | RC / RECOURS_TIERS_INCENDIE | Recours de Tiers Incendie | True |
| ATLANTIQUE_AUTO_AVANCE_RECOURS | AVANCE_RECOURS / AVANCE_RECOURS | Avance Recours | True |
| ATLANTIQUE_AUTO_BRIS_DE_GLACES_BLOCS_FEUX | BRIS_DE_GLACES_BLOCS_FEUX / BRIS_DE_GLACES | Bris de glaces | True |
| ATLANTIQUE_AUTO_DEFENSE_RECOURS | DEFENSE_RECOURS / DEFENSE_RECOURS | Défense Recours | True |
| ATLANTIQUE_AUTO_DOMMAGES_PAR_ACCIDENT | DOMMAGES_PAR_ACCIDENT / DOMMAGES_PAR_ACCIDENT | Dommages par accident | True |
| ATLANTIQUE_AUTO_HONORAIRES_D_EXPERTS | HONORAIRES_D_EXPERTS / HONORAIRES_D_EXPERTS | Honoraires d'experts | True |
| ATLANTIQUE_AUTO_INCENDIE | INCENDIE / INCENDIE | Incendie | True |
| ATLANTIQUE_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / DECES | Décès | True |
| ATLANTIQUE_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / FRAIS_MEDICAUX | Frais Médicaux | True |
| ATLANTIQUE_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / INCAPACITE_PERMANENTE | Incapacité Permanente | True |
| ATLANTIQUE_AUTO_TIERCE_COLLISION | TIERCE_COLLISION / DOMMAGES_PAR_COLLISION | Tierce collision | True |
| ATLANTIQUE_AUTO_VOL | VOL / VOL_BRAQUAGE | Vol Braquage | True |
| ATLANTIQUE_AUTO_VOL | VOL / VOL_DES_ACCESSOIRES | Vol des accessoires | True |
| ATLANTIQUE_AUTO_VOL | VOL / VOL_PARTIEL | Vol Partiel | True |
| ATLANTIQUE_AUTO_VOL | VOL / VOL_VEHICULE | Vol véhicule | True |
| ATLANTIQUE_RC_AUTO | RC / RESPONSABILITE_CIVILE_STRICTE | Responsabilité civile | True |
| ATLANTIQUE_RC_AUTO | RC / RECOURS_TIERS_INCENDIE | Recours de Tiers Incendie | True |
| AUCUNE | — | Aucune / Non applicable | True |
| BENEFICIAL_AUTO_ASSISTANCE_A_LA_REPARATION | ASSISTANCE_A_LA_REPARATION / ASSISTANCE_A_LA_REPARATION | Assistance à la réparation | True |
| BENEFICIAL_AUTO_BRIS_DE_GLACES_BLOCS_FEUX | BRIS_DE_GLACES_BLOCS_FEUX / BRIS_DE_GLACES | Bris de glaces | True |
| BENEFICIAL_AUTO_DEFENSE_RECOURS | DEFENSE_RECOURS / DEFENSE_RECOURS | Défense Recours | True |
| BENEFICIAL_AUTO_DOMMAGES_PAR_ACCIDENT | DOMMAGES_PAR_ACCIDENT / DOMMAGES_PAR_ACCIDENT | Dommages par accident | True |
| BENEFICIAL_AUTO_INCENDIE | INCENDIE / INCENDIE | Incendie | True |
| BENEFICIAL_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / DECES | Décès | True |
| BENEFICIAL_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / INCAPACITE_PERMANENTE | Infirmité permanente | True |
| BENEFICIAL_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / FRAIS_MEDICAUX | Frais de traitement | True |
| BENEFICIAL_AUTO_TIERCE_COLLISION | TIERCE_COLLISION / DOMMAGES_PAR_COLLISION | Tierce collision | True |
| BENEFICIAL_RC_AUTO | RC / RESPONSABILITE_CIVILE_STRICTE | Responsabilité civile | True |
| BENEFICIAL_RC_AUTO | RC / RECOURS_TIERS_INCENDIE | Recours de Tiers Incendie | True |
| CHANAS_AUTO_ASSISTANCE_A_LA_REPARATION | INDIVIDUELLE_PERSONNES_TRANSPORTEES / FRAIS_MEDICAUX | Frais Médicaux | True |
| CHANAS_AUTO_ASSISTANCE_A_LA_REPARATION | ASSISTANCE_A_LA_REPARATION / ASSISTANCE_ACCIDENT | Assistance Accident | True |
| CHANAS_AUTO_ASSISTANCE_A_LA_REPARATION | ASSISTANCE_A_LA_REPARATION / ASSISTANCE_A_LA_REPARATION | None | True |
| CHANAS_AUTO_ASSISTANCE_A_LA_REPARATION | ASSISTANCE_A_LA_REPARATION / REMORQUAGE | Remorquage | True |
| CHANAS_AUTO_BRIS_DE_GLACES_BLOCS_FEUX | BRIS_DE_GLACES_BLOCS_FEUX / BRIS_DE_GLACES | Bris de glaces | True |
| CHANAS_AUTO_DEFENSE_RECOURS | DEFENSE_RECOURS / DEFENSE_RECOURS | Défense Recours | True |
| CHANAS_AUTO_DOMMAGES_PAR_ACCIDENT | DOMMAGES_PAR_ACCIDENT / DOMMAGES_PAR_ACCIDENT | Dommages par accident | True |
| CHANAS_AUTO_HONORAIRES_D_EXPERTS | HONORAIRES_D_EXPERTS / HONORAIRES_D_EXPERTS | Honoraires d'expert | True |
| CHANAS_AUTO_IMMOBILISATION | IMMOBILISATION / IMMOBILISATION | Immobilisation | True |
| CHANAS_AUTO_INCENDIE | INCENDIE / INCENDIE | Incendie | True |
| CHANAS_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / INCAPACITE_PERMANENTE | Incapacité Permanente | True |
| CHANAS_AUTO_TIERCE_COLLISION | TIERCE_COLLISION / DOMMAGES_PAR_COLLISION | Dommages par collision | True |
| CHANAS_AUTO_VOL | VOL / VOL_BRAQUAGE | Vol Braquage | True |
| CHANAS_AUTO_VOL | VOL / VOL_DES_ACCESSOIRES | Vol des accessoires | True |
| CHANAS_AUTO_VOL | VOL / VOL_PARTIEL | Vol Partiel | True |
| CHANAS_AUTO_VOL | VOL / VOL_VEHICULE | Vol véhicule | True |
| CHANAS_RC_AUTO | RC / RESPONSABILITE_CIVILE_STRICTE | Responsabilité civile | True |
| CHANAS_RC_AUTO | RC / RECOURS_TIERS_INCENDIE | Recours de Tiers Incendie | True |
| CPA_AUTO_ASSISTANCE_A_LA_REPARATION | ASSISTANCE_A_LA_REPARATION / ASSISTANCE_A_LA_REPARATION | Assistance à la réparation | True |
| CPA_AUTO_BRIS_DE_GLACES_BLOCS_FEUX | BRIS_DE_GLACES_BLOCS_FEUX / BRIS_DE_GLACES | Bris de glaces | True |
| CPA_AUTO_DEFENSE_RECOURS | DEFENSE_RECOURS / DEFENSE_RECOURS | Défense Recours | True |
| CPA_AUTO_DOMMAGES_PAR_ACCIDENT | DOMMAGES_PAR_ACCIDENT / DOMMAGES_PAR_ACCIDENT | Dommages par accident | True |
| CPA_AUTO_INCENDIE | INCENDIE / INCENDIE | Incendie | True |
| CPA_AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR | INDIVIDUELLE_ACCIDENTS_CONDUCTEUR / DECES | Décès Accidentel | True |
| CPA_AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR | INDIVIDUELLE_ACCIDENTS_CONDUCTEUR / FRAIS_MEDICAUX | Frais Médicaux | True |
| CPA_AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR | INDIVIDUELLE_ACCIDENTS_CONDUCTEUR / INCAPACITE_PERMANENTE | Incapacité Permanente | True |
| CPA_AUTO_SECURITE_ROUTIERE | SECURITE_ROUTIERE / DECES | Décès | True |
| CPA_AUTO_SECURITE_ROUTIERE | SECURITE_ROUTIERE / INCAPACITE_PERMANENTE | Invalidité | True |
| CPA_AUTO_TIERCE_COLLISION | TIERCE_COLLISION / DOMMAGES_PAR_COLLISION | Dommages par collision | True |
| CPA_AUTO_VOL | VOL / VOL_VEHICULE | Vol véhicule | True |
| CPA_AUTO_VOL | VOL / VOL_BRAQUAGE | Braquage | True |
| CPA_AUTO_VOL | VOL / BRIGANDAGE_VOL | Brigandage | True |
| CPA_AUTO_VOL | VOL / VOL_DES_ACCESSOIRES | Vol des accessoires | True |
| CPA_AUTO_VOL | VOL / VOL_PARTIEL | Vol Partiel | True |
| CPA_RC_AUTO | RC / RESPONSABILITE_CIVILE_STRICTE | Responsabilité civile | True |
| CPA_RC_AUTO | RC / RECOURS_TIERS_INCENDIE | Recours de Tiers Incendie | True |
| GMCSA_AUTO_AVANCE_RECOURS | AVANCE_RECOURS / AVANCE_RECOURS | Remboursement Anticipé | True |
| GMCSA_AUTO_BRIS_DE_GLACES_BLOCS_FEUX | BRIS_DE_GLACES_BLOCS_FEUX / BRIS_DE_GLACES | Bris de glaces | True |
| GMCSA_AUTO_DEFENSE_RECOURS | DEFENSE_RECOURS / DEFENSE_RECOURS | Défense Recours | True |
| GMCSA_AUTO_DOMMAGES_PAR_ACCIDENT | DOMMAGES_PAR_ACCIDENT / DOMMAGES_PAR_ACCIDENT | Dommages | True |
| GMCSA_AUTO_INCENDIE | INCENDIE / INCENDIE | Incendie | True |
| GMCSA_AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR | INDIVIDUELLE_ACCIDENTS_CONDUCTEUR / DECES | Décès Accidentel | True |
| GMCSA_AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR | INDIVIDUELLE_ACCIDENTS_CONDUCTEUR / FRAIS_MEDICAUX | Frais médicaux et pharmaceutiques | True |
| GMCSA_AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR | INDIVIDUELLE_ACCIDENTS_CONDUCTEUR / INCAPACITE_PERMANENTE | Invalidité partielle/totale suite accident | True |
| GMCSA_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / DECES | Décès | True |
| GMCSA_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / FRAIS_MEDICAUX | Frais Médicaux | True |
| GMCSA_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / INCAPACITE_PERMANENTE | Incapacité Permanente | True |
| GMCSA_AUTO_TIERCE_COLLISION | TIERCE_COLLISION / DOMMAGES_PAR_COLLISION | Collision | True |
| GMCSA_AUTO_VOL | VOL / VOL_BRAQUAGE | Vol Braquage | True |
| GMCSA_AUTO_VOL | VOL / VOL_DES_ACCESSOIRES | Vol Accessoires Hors Standard | True |
| GMCSA_AUTO_VOL | VOL / VOL_PARTIEL | Vol Partiel | True |
| GMCSA_AUTO_VOL | VOL / VOL_VEHICULE | Vol véhicule | True |
| GMCSA_RC_AUTO | RC / RESPONSABILITE_CIVILE_STRICTE | Responsabilité civile | True |
| GMCSA_RC_AUTO | RC / RECOURS_TIERS_INCENDIE | Recours de Tiers Incendie | True |
| GMCSA_RC_AUTO__EXTENSION_CEMAC | RC / EXTENSION_CEMAC | Extension territoriale en zone CEMAC (Carte Rose) | True |
| NSIA_AUTO_AVANCE_RECOURS | AVANCE_RECOURS / AVANCE_RECOURS | Avance Recours | True |
| NSIA_AUTO_BRIS_DE_GLACES_BLOCS_FEUX | BRIS_DE_GLACES_BLOCS_FEUX / BRIS_DE_GLACES | Bris de glaces | True |
| NSIA_AUTO_DEFENSE_RECOURS | DEFENSE_RECOURS / DEFENSE_RECOURS | Défense Recours | True |
| NSIA_AUTO_DOMMAGES_PAR_ACCIDENT | DOMMAGES_PAR_ACCIDENT / DOMMAGES_PAR_ACCIDENT | Dommages par accident | True |
| NSIA_AUTO_INCENDIE | INCENDIE / INCENDIE | Incendie | True |
| NSIA_AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR | INDIVIDUELLE_ACCIDENTS_CONDUCTEUR / DECES | Décès Accidentel | True |
| NSIA_AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR | INDIVIDUELLE_ACCIDENTS_CONDUCTEUR / FRAIS_MEDICAUX | Frais medicaux et pharmaceutiques | True |
| NSIA_AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR | INDIVIDUELLE_ACCIDENTS_CONDUCTEUR / INCAPACITE_PERMANENTE | Inval. part/totale suite accident | True |
| NSIA_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / DECES | Décès | True |
| NSIA_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / FRAIS_MEDICAUX | Frais Médicaux | True |
| NSIA_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / INCAPACITE_PERMANENTE | Incapacité Permanente | True |
| NSIA_AUTO_TIERCE_COLLISION | TIERCE_COLLISION / DOMMAGES_PAR_COLLISION | Dommages par collision | True |
| NSIA_AUTO_VOL | VOL / VOL_VEHICULE | Vol véhicule | True |
| NSIA_AUTO_VOL | VOL / VOL_BRAQUAGE | Vol Braquage | True |
| NSIA_AUTO_VOL | VOL / VOL_DES_ACCESSOIRES | Vol des accessoires | True |
| NSIA_RC_AUTO | RC / RECOURS_TIERS_INCENDIE | Recours de tiers incendie | True |
| NSIA_RC_AUTO | RC / RESPONSABILITE_CIVILE_STRICTE | Responsabilité civile | True |
| PROASSUR_AUTO_AVANCE_RECOURS | AVANCE_RECOURS / AVANCE_RECOURS | Remboursement Anticipé | True |
| PROASSUR_AUTO_BRIS_DE_GLACES_BLOCS_FEUX | BRIS_DE_GLACES_BLOCS_FEUX / BRIS_DE_GLACES | Bris de glaces | True |
| PROASSUR_AUTO_DEFENSE_RECOURS | DEFENSE_RECOURS / DEFENSE_RECOURS | Défense Recours | True |
| PROASSUR_AUTO_INCENDIE | INCENDIE / INCENDIE | Incendie | True |
| PROASSUR_AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR | INDIVIDUELLE_ACCIDENTS_CONDUCTEUR / DECES | Décès Accidentel | True |
| PROASSUR_AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR | INDIVIDUELLE_ACCIDENTS_CONDUCTEUR / FRAIS_MEDICAUX | Frais medicaux et pharmaceutiques | True |
| PROASSUR_AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR | INDIVIDUELLE_ACCIDENTS_CONDUCTEUR / INCAPACITE_PERMANENTE | Inval. part/totale suite accident | True |
| PROASSUR_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / DECES | Décès | True |
| PROASSUR_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / FRAIS_MEDICAUX | Frais Médicaux | True |
| PROASSUR_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / INCAPACITE_PERMANENTE | Incapacité Permanente | True |
| PROASSUR_AUTO_TIERCE_COLLISION | TIERCE_COLLISION / DOMMAGES_PAR_COLLISION | Collision | True |
| PROASSUR_AUTO_VOL | VOL / VOL_DES_ACCESSOIRES | Vol Accessoires Hors Standard | True |
| PROASSUR_AUTO_VOL | VOL / VOL_PARTIEL | Vol Partiel | True |
| PROASSUR_AUTO_VOL | VOL / VOL_VEHICULE | Vol véhicule | True |
| PROASSUR_RC_AUTO | RC / RESPONSABILITE_CIVILE_STRICTE | Responsabilité civile | True |
| PROASSUR_RC_AUTO | RC / RECOURS_TIERS_INCENDIE | Recours de Tiers Incendie | True |
| ROYAL ONYX_AUTO_AVANCE_RECOURS | AVANCE_RECOURS / AVANCE_RECOURS | Avance Recours | True |
| ROYAL ONYX_AUTO_BRIS_DE_GLACES_BLOCS_FEUX | BRIS_DE_GLACES_BLOCS_FEUX / BRIS_DE_GLACES | Bris de glaces | True |
| ROYAL ONYX_AUTO_DEFENSE_RECOURS | DEFENSE_RECOURS / DEFENSE_RECOURS | Défense Recours | True |
| ROYAL ONYX_AUTO_DOMMAGES_PAR_ACCIDENT | DOMMAGES_PAR_ACCIDENT / DOMMAGES_PAR_ACCIDENT | Dommages par accident | True |
| ROYAL ONYX_AUTO_INCENDIE | INCENDIE / INCENDIE | Incendie | True |
| ROYAL ONYX_AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR | INDIVIDUELLE_ACCIDENTS_CONDUCTEUR / DECES | Décès Accidentel | True |
| ROYAL ONYX_AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR | INDIVIDUELLE_ACCIDENTS_CONDUCTEUR / FRAIS_MEDICAUX | Frais medicaux et pharmaceutiques | True |
| ROYAL ONYX_AUTO_INDIVIDUELLE_ACCIDENTS_CONDUCTEUR | INDIVIDUELLE_ACCIDENTS_CONDUCTEUR / INCAPACITE_PERMANENTE | Inval. part/totale suite accident | True |
| ROYAL ONYX_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / DECES | Décès | True |
| ROYAL ONYX_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / FRAIS_MEDICAUX | Frais Médicaux | True |
| ROYAL ONYX_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / INCAPACITE_PERMANENTE | Incapacité Permanente | True |
| ROYAL ONYX_AUTO_INSOLVABILITE_DU_RESPONSABLE | INSOLVABILITE_DU_RESPONSABLE / INSOLVABILITE_DU_RESPONSABLE | Insolvabilité du Responsable | True |
| ROYAL ONYX_AUTO_PRIVATION_DE_JOUISSANCE | PRIVATION_DE_JOUISSANCE / PRIVATION_DE_JOUISSANCE | Privation de jouissance | True |
| ROYAL ONYX_AUTO_TIERCE_COLLISION | TIERCE_COLLISION / DOMMAGES_PAR_COLLISION | Tierce collision | True |
| ROYAL ONYX_AUTO_VOL | VOL / VOL_DES_ACCESSOIRES | Vol Appareils électroniques | True |
| ROYAL ONYX_AUTO_VOL | VOL / VOL_BRAQUAGE | Vol Braquage | True |
| ROYAL ONYX_AUTO_VOL | VOL / VOL_PARTIEL | Vol Partiel | True |
| ROYAL ONYX_AUTO_VOL | VOL / VOL_VEHICULE | Vol véhicule | True |
| ROYAL ONYX_RC_AUTO | RC / RESPONSABILITE_CIVILE_STRICTE | Responsabilité civile | True |
| ROYAL ONYX_RC_AUTO | RC / RECOURS_TIERS_INCENDIE | Recours de Tiers Incendie | True |
| SAAR_AUTO_ASSISTANCE_A_LA_REPARATION | ASSISTANCE_A_LA_REPARATION / ASSISTANCE_A_LA_REPARATION | Assistance à la réparation | True |
| SAAR_AUTO_BRIS_DE_GLACES_BLOCS_FEUX | BRIS_DE_GLACES_BLOCS_FEUX / BRIS_DE_GLACES | Bris de glaces | True |
| SAAR_AUTO_DEFENSE_RECOURS | DEFENSE_RECOURS / DEFENSE_RECOURS | Défense Recours | True |
| SAAR_AUTO_DOMMAGES_PAR_ACCIDENT | DOMMAGES_PAR_ACCIDENT / DOMMAGES_PAR_ACCIDENT | Dommages par accident | True |
| SAAR_AUTO_INCENDIE | INCENDIE / INCENDIE | Incendie | True |
| SAAR_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / DECES | Décès | True |
| SAAR_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / FRAIS_MEDICAUX | Frais Médicaux | True |
| SAAR_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / INCAPACITE_PERMANENTE | Incapacité Permanente | True |
| SAAR_AUTO_SECURITE_DU_CONDUCTEUR | SECURITE_DU_CONDUCTEUR / SECURITE_DU_CONDUCTEUR | Sécurité du conducteur | True |
| SAAR_AUTO_SECURITE_ROUTIERE | SECURITE_ROUTIERE / SECURITE_ROUTIERE | Sécurité routière | True |
| SAAR_AUTO_TIERCE_COLLISION | TIERCE_COLLISION / DOMMAGES_PAR_COLLISION | Dommages par collision | True |
| SAAR_AUTO_VOL | VOL / VOL_BRAQUAGE | Vol Braquage | True |
| SAAR_AUTO_VOL | VOL / VOL_DES_ACCESSOIRES | Vol des accessoires | True |
| SAAR_AUTO_VOL | VOL / VOL_VEHICULE | Vol véhicule | True |
| SAAR_RC_AUTO | RC / RESPONSABILITE_CIVILE_STRICTE | Responsabilité Civile | True |
| SAAR_RC_AUTO | RC / RECOURS_TIERS_INCENDIE | Recours de Tiers Incendie | True |
| SOCAR_AUTO_BRIS_DE_GLACES_BLOCS_FEUX | BRIS_DE_GLACES_BLOCS_FEUX / BRIS_DE_GLACES | Bris de glaces blocs feux | True |
| SOCAR_AUTO_DOMMAGES_PAR_ACCIDENT | DOMMAGES_PAR_ACCIDENT / DOMMAGES_PAR_ACCIDENT | Dommages par accident | True |
| SOCAR_AUTO_INCENDIE | INCENDIE / INCENDIE_PERTE_TOTALE | Incendie Perte totale | True |
| SOCAR_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / DECES | Décès | True |
| SOCAR_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / FRAIS_MEDICAUX | Frais de traitement | True |
| SOCAR_AUTO_INDIVIDUELLE_PERSONNES_TRANSPORTEES | INDIVIDUELLE_PERSONNES_TRANSPORTEES / INCAPACITE_PERMANENTE | Infirmité permanente | True |
| SOCAR_AUTO_TIERCE_COLLISION | TIERCE_COLLISION / DOMMAGES_PAR_COLLISION | Tierce collision | True |
| SOCAR_AUTO_VOL | VOL / VOL_PARTIEL | Vol Partiel | True |
| SUNU_AUTO_AVANCE_RECOURS | AVANCE_RECOURS / AVANCE_RECOURS | Avance Recours | True |
| SUNU_AUTO_BRIS_DE_GLACES_BLOCS_FEUX | BRIS_DE_GLACES_BLOCS_FEUX / BRIS_DE_GLACES | Bris de glaces | True |
| SUNU_AUTO_DEFENSE_RECOURS | DEFENSE_RECOURS / DEFENSE_RECOURS | Défense Recours | True |
| SUNU_AUTO_DOMMAGES_PAR_ACCIDENT | DOMMAGES_PAR_ACCIDENT / DOMMAGES_PAR_ACCIDENT | Dommages par accident | True |
| SUNU_AUTO_INCENDIE | INCENDIE / INCENDIE | Incendie | True |
| SUNU_AUTO_INSOLVABILITE_DU_RESPONSABLE | INSOLVABILITE_DU_RESPONSABLE / INSOLVABILITE_DU_RESPONSABLE | Insolvabilité du Responsable | True |
| SUNU_AUTO_PRIVATION_DE_JOUISSANCE | PRIVATION_DE_JOUISSANCE / PRIVATION_DE_JOUISSANCE | Privation de jouissance | True |
| SUNU_AUTO_TIERCE_COLLISION | TIERCE_COLLISION / DOMMAGES_PAR_COLLISION | Dommages par collision | True |
| SUNU_AUTO_VOL | VOL / VOL_BRAQUAGE | Vol Braquage | True |
| SUNU_AUTO_VOL | VOL / VOL_DES_ACCESSOIRES | Vol des accessoires | True |
| SUNU_AUTO_VOL | VOL / VOL_VEHICULE | Vol véhicule | True |
