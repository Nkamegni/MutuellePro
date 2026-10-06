# RUT — Annexe F : comparaison des accessoires, source `Frais_et_accessoires.csv` contre la base (03/10/2026)

**Rattachée au RUT v5.3.** Source : fichier déposé par Roger le 03/10/2026 (115 lignes), table d'origine du 25/09. Base : export du 03/10/2026 de `bareme_accessoire` (110 lignes). Noms de compagnie ramenés aux codes actuels (`<AUCUN>`→AUCUNE, ATLANTIQUE→AFG, BENEFICIAL→BELIFE).

56 groupes (compagnie, risque, durée) : 18 identiques, 38 différents. La source compte 38 lignes à 2 500 FCFA, la base 35 lignes à 3 000 FCFA et 1 seule à 2 500. **Décisions de Roger (03/10/2026)** : les valeurs de la source sont les bonnes ; le manuel de SUNU et la note de service de PROASSUR prévalent pour leurs compagnies ; le Fichier central est de 1 000 FCFA partout (500 FCFA pour le Pool), les zéros de la source sont des erreurs de saisie ; les tranches de BELIFE ne sont pas à restaurer. Détail dans le RUT, section 7.6. Les colonnes « Source » et « Base » ci-dessous sont **factuelles** : elles n'indiquent pas la décision.

Le Fichier central de la source figure entre parenthèses après chaque montant d'accessoires.

| Compagnie | Risque | Durée | Source : palier → accessoires (Fichier central) | Base : palier → accessoires | Statut |
|---|---|---|---|---|---|
| ACTIVA | Automobile | [AUCUNE SEGMENTATION] | [PAS DE PALIER] → 2 500 (1 000) | [PAS DE PALIER] → 3 000 | différent |
| ACTIVA | Maladie et assurances des personnes | [AUCUNE SEGMENTATION] | [PAS DE PALIER] → 2 500 (1 000) | [PAS DE PALIER] → 3 000 | différent |
| AFG | Automobile | [AUCUNE SEGMENTATION] | de 0 à 100 000 → 2 500 (1 000)<br>de 100 000 à 200 000 → 2 500 (1 000)<br>de 100 000 à 5 000 000 → 50 000 (1 000)<br>de 200 000 à 500 000 → 5 000 (1 000)<br>de 500 001 à 1 000 000 → 25 000 (1 000)<br>de 5 000 001 à 12 500 000 → 100 000 (1 000)<br>de 12 500 001 à 25 000 000 → 100 000 (1 000)<br>de 25 000 001 et au-delà → 100 000 (1 000) | de 0 à 100 000 → 3 000<br>de 100 001 à 200 000 → 3 000<br>de 100 001 à 5 000 000 → 50 000<br>de 200 001 à 500 000 → 5 000<br>de 500 001 à 1 000 000 → 25 000<br>de 5 000 001 à 12 500 000 → 100 000<br>de 12 500 001 à 25 000 000 → 100 000<br>de 25 000 001 au-delà → 100 000 | différent |
| AFG | Responsabilité Civile Générale | [AUCUNE SEGMENTATION] | de 0 à 100 000 → 2 500 (1 000)<br>de 100 000 à 200 000 → 3 500 (1 000)<br>de 100 000 à 5 000 000 → 20 000 (1 000)<br>de 200 000 à 500 000 → 5 000 (1 000)<br>de 500 001 à 1 000 000 → 10 000 (1 000)<br>de 5 000 001 à 12 500 000 → 0 (1 000)<br>de 12 500 001 à 25 000 000 → 0 (1 000)<br>de 25 000 001 et au-delà → 0 (1 000) | de 0 à 100 000 → 3 000<br>de 100 001 à 200 000 → 3 500<br>de 100 001 à 5 000 000 → 20 000<br>de 200 001 à 500 000 → 5 000<br>de 500 001 à 1 000 000 → 10 000<br>de 5 000 001 à 12 500 000 → 0<br>de 12 500 001 à 25 000 000 → 0<br>de 25 000 001 au-delà → 0 | différent |
| AFG | Risques techniques | [AUCUNE SEGMENTATION] | de 0 à 100 000 → 5 000 (1 000)<br>de 100 000 à 200 000 → 10 000 (1 000)<br>de 100 000 à 5 000 000 → 50 000 (1 000)<br>de 200 000 à 500 000 → 20 000 (1 000)<br>de 500 001 à 1 000 000 → 25 000 (1 000)<br>de 5 000 001 à 12 500 000 → 100 000 (1 000)<br>de 12 500 001 à 25 000 000 → 100 000 (1 000)<br>de 25 000 001 et au-delà → 100 000 (1 000) | de 0 à 100 000 → 5 000<br>de 100 001 à 200 000 → 10 000<br>de 100 001 à 5 000 000 → 50 000<br>de 200 001 à 500 000 → 20 000<br>de 500 001 à 1 000 000 → 25 000<br>de 5 000 001 à 12 500 000 → 100 000<br>de 12 500 001 à 25 000 000 → 100 000<br>de 25 000 001 au-delà → 100 000 | identique |
| AFG | Transport, Corps et Facultés | [AUCUNE SEGMENTATION] | de 5 000 001 à 12 500 000 → 100 000 (1 000)<br>de 12 500 001 à 25 000 000 → 100 000 (1 000)<br>de 25 000 001 et au-delà → 100 000 (1 000) | de 5 000 001 à 12 500 000 → 100 000<br>de 12 500 001 à 25 000 000 → 100 000<br>de 25 000 001 au-delà → 100 000 | identique |
| AFRINS | [NON IDENTIFIEE] | [AUCUNE SEGMENTATION] | [PAS DE PALIER] → 2 500 (1 000) | [PAS DE PALIER] → 3 000 | différent |
| AGC | Automobile | [AUCUNE SEGMENTATION] | de 100 000 à 200 000 → 5 000 (1 000)<br>de 5 000 001 à 12 500 000 → 100 000 (1 000)<br>de 12 500 001 à 25 000 000 → 100 000 (1 000)<br>de 25 000 001 et au-delà → 100 000 (1 000) | de 100 001 à 200 000 → 5 000<br>de 5 000 001 à 12 500 000 → 100 000<br>de 12 500 001 à 25 000 000 → 100 000<br>de 25 000 001 au-delà → 100 000 | identique |
| ALLIANZ | Automobile | [AUCUNE SEGMENTATION] | Montants négatifs → 5 000 (1 000)<br>de 0 à 500 000 → 5 000 (1 000)<br>de 500 001 à 1 000 000 → 10 000 (1 000)<br>de 1 000 001 au-delà → 20 000 (1 000) | Montants négatifs → 5 000<br>de 0 à 500 000 → 5 000<br>de 500 001 à 1 000 000 → 10 000<br>de 1 000 001 au-delà → 20 000 | identique |
| ALLIANZ | Véhicule motorisé à deux ou trois roues pour le transport de | [AUCUNE SEGMENTATION] | [PAS DE PALIER] → 2 500 (1 000) | [PAS DE PALIER] → 3 000 | différent |
| ALLIANZ | Véhicule motorisé à deux ou trois roues. | [AUCUNE SEGMENTATION] | [PAS DE PALIER] → 2 500 (1 000) | [PAS DE PALIER] → 3 000 | différent |
| AREA | Automobile | [AUCUNE SEGMENTATION] | [PAS DE PALIER] → 2 500 (1 000) | [PAS DE PALIER] → 3 000 | différent |
| AREA | Crédit et Cautions | [AUCUNE SEGMENTATION] | [PAS DE PALIER] → 7 000 (1 000) | [PAS DE PALIER] → 7 000 | identique |
| AREA | Incendie & autres dommages | [AUCUNE SEGMENTATION] | [PAS DE PALIER] → 15 000 (1 000) | [PAS DE PALIER] → 15 000 | identique |
| AREA | Maladie et assurances des personnes | [AUCUNE SEGMENTATION] | [PAS DE PALIER] → 2 500 (1 000) | [PAS DE PALIER] → 3 000 | différent |
| AREA | Responsabilité Civile Générale | [AUCUNE SEGMENTATION] | [PAS DE PALIER] → 40 000 (1 000) | [PAS DE PALIER] → 40 000 | identique |
| AREA | Risques techniques | [AUCUNE SEGMENTATION] | [PAS DE PALIER] → 25 000 (1 000) | [PAS DE PALIER] → 25 000 | identique |
| AREA | Transport, Corps et Facultés | [AUCUNE SEGMENTATION] | [PAS DE PALIER] → 2 500 (1 000) | [PAS DE PALIER] → 3 000 | différent |
| AREA | [NON IDENTIFIEE] | [AUCUNE SEGMENTATION] | de 500 001 à 1 000 000 → 10 000 (1 000) | de 500 001 à 1 000 000 → 10 000 | identique |
| AUCUNE | Autocar de transport des élèves et du personnel à titre grat | [AUCUNE SEGMENTATION] | [PAS DE PALIER] → 2 500 (500) | — | absent de la base |
| AUCUNE | Automobile | [AUCUNE SEGMENTATION] | [PAS DE PALIER] → 2 500 (1 000) | [PAS DE PALIER] → 3 000 | différent |
| AUCUNE | Bus, autocar ou véhicule aménagé pour le transport public in | [AUCUNE SEGMENTATION] | [PAS DE PALIER] → 2 500 (500) | — | absent de la base |
| AUCUNE | Green Assistance Conducteur | [AUCUNE SEGMENTATION] | [PAS DE PALIER] → 1 000 (0) | [PAS DE PALIER] → 1 000 | identique |
| AUCUNE | Taxi et autobus autocar ou véhicule aménagé pour transport u | [AUCUNE SEGMENTATION] | [PAS DE PALIER] → 2 500 (500) | — | absent de la base |
| BELIFE | [NON IDENTIFIEE] | [AUCUNE SEGMENTATION] | de 0 à 50 000 → 2 500 (1 000)<br>de 50 000 à 500 000 → 5 000 (1 000)<br>de 500 001 à 1 000 000 → 10 000 (1 000)<br>de 1 000 000 au-delà → 25 000 (1 000) | de 0 à 500 000 → 3 000<br>de 500 001 à 1 000 000 → 10 000<br>de 1 000 000 au-delà → 25 000 | différent |
| CHANAS | [NON IDENTIFIEE] | [AUCUNE SEGMENTATION] | [PAS DE PALIER] → 2 500 (1 000)<br>[PAS DE PALIER] → 2 500 (1 000)<br>de 250 000 à 799 999 → 10 000 (1 000)<br>de 800 000 à 1 499 999 → 20 000 (1 000)<br>de 1 500 000 à 5 000 000 → 50 000 (1 000) | [PAS DE PALIER] → 3 000<br>de 250 000 à 799 999 → 10 000<br>de 800 000 à 1 499 999 → 20 000<br>de 1 500 000 à 5 000 000 → 50 000 | différent |
| CPA | Automobile | [AUCUNE SEGMENTATION] | Montants négatifs → 2 500 (0) | Montants négatifs → 3 000 | différent |
| CPA | [NON IDENTIFIEE] | [AUCUNE SEGMENTATION] | [PAS DE PALIER] → 2 500 (1 000)<br>de 0 à 50 000 → 2 500 (1 000)<br>de 50 000 à 250 000 → 5 000 (1 000)<br>de 5 000 000 au-delà → 0 (1 000) | [PAS DE PALIER] → 3 000<br>de 0 à 49 999 → 3 000<br>de 50 000 à 249 999 → 5 000<br>de 5 000 000 au-delà → 0 | différent |
| GMCSA | Assurance Voyage OK | [AUCUNE SEGMENTATION] | [PAS DE PALIER] → 0 (0) | [PAS DE PALIER] → 0 | identique |
| GMCSA | Automobile | [AUCUNE SEGMENTATION] | Montants négatifs → 0 (0)<br>de 0 à 100 000 → 2 500 (1 000)<br>de 100 000 à 5 000 000 → 2 500 (1 000)<br>de 5 000 001 à 12 500 000 → 10 000 (1 000)<br>de 12 500 001 à 25 000 000 → 25 000 (1 000)<br>de 25 000 001 et au-delà → 50 000 (1 000) | Montants négatifs → 0<br>de 0 à 100 000 → 3 000<br>de 100 001 à 5 000 000 → 3 000<br>de 5 000 001 à 12 500 000 → 10 000<br>de 12 500 001 à 25 000 000 → 25 000<br>de 25 000 001 au-delà → 50 000 | différent |
| GMCSA | Aviation | [AUCUNE SEGMENTATION] | [PAS DE PALIER] → 5 000 (0) | [PAS DE PALIER] → 5 000 | identique |
| GMCSA | Crédit et Cautions | [AUCUNE SEGMENTATION] | [PAS DE PALIER] → 5 000 (0) | [PAS DE PALIER] → 5 000 | identique |
| GMCSA | Incendie & autres dommages | [AUCUNE SEGMENTATION] | de 0 à 500 000 → 5 000 (0)<br>de 500 000 à 1 000 000 → 10 000 (0)<br>de 1 000 000 à 9 999 999 → 15 000 (0)<br>de 10 000 000 au-delà → 50 000 (0) | de 0 à 500 000 → 5 000<br>de 500 000 à 1 000 000 → 10 000<br>de 1 000 000 à 9 999 999 → 15 000<br>de 10 000 000 au-delà → 50 000 | identique |
| GMCSA | Maladie et assurances des personnes | [AUCUNE SEGMENTATION] | [PAS DE PALIER] → 2 500 (0) | [PAS DE PALIER] → 3 000 | différent |
| GMCSA | Responsabilité Civile Générale | [AUCUNE SEGMENTATION] | [PAS DE PALIER] → 5 000 (0) | [PAS DE PALIER] → 5 000 | identique |
| GMCSA | Risques techniques | [AUCUNE SEGMENTATION] | [PAS DE PALIER] → 5 000 (0) | [PAS DE PALIER] → 5 000 | identique |
| GMCSA | Transport, Corps et Facultés | [AUCUNE SEGMENTATION] | [PAS DE PALIER] → 5 000 (0) | [PAS DE PALIER] → 5 000 | identique |
| LDASA | Automobile | [AUCUNE SEGMENTATION] | de 0 à 100 000 → 5 000 (1 000)<br>de 100 000 à 200 000 → 10 000 (1 000)<br>de 100 000 à 5 000 000 → 50 000 (1 000)<br>de 200 000 à 500 000 → 20 000 (1 000)<br>de 500 001 à 1 000 000 → 25 000 (1 000) | de 0 à 100 000 → 5 000<br>de 100 001 à 200 000 → 10 000<br>de 100 001 à 5 000 000 → 50 000<br>de 200 001 à 500 000 → 20 000<br>de 500 001 à 1 000 000 → 25 000 | identique |
| NSIA | Automobile | [AUCUNE SEGMENTATION] | Montants négatifs → 2 500 (1 000)<br>de 0 à 500 000 → 2 500 (1 000)<br>de 500 000 à 1 000 000 → 5 000 (1 000)<br>de 1 000 000 au-delà → 10 000 (1 000) | Montants négatifs → 3 000<br>de 0 à 500 000 → 3 000<br>de 500 000 à 1 000 000 → 5 000<br>de 1 000 000 au-delà → 10 000 | différent |
| PROASSUR | Automobile | 01 an | — | [PAS DE PALIER] → 3 000 | absent de la source |
| PROASSUR | Automobile | Courte durée | — | [PAS DE PALIER] → 2 500 | absent de la source |
| PROASSUR | Flotte Automobile | 01 an | — | [PAS DE PALIER] → 5 000 | absent de la source |
| PROASSUR | Flotte Automobile | Courte durée | — | [PAS DE PALIER] → 3 000 | absent de la source |
| PROASSUR | [NON IDENTIFIEE] | [AUCUNE SEGMENTATION] | [PAS DE PALIER] → 2 500 (1 000) | [PAS DE PALIER] → 3 000 | différent |
| ROYAL ONYX | Automobile | [AUCUNE SEGMENTATION] | Montants négatifs → 2 500 (1 000)<br>Montants positifs → 2 500 (1 000) | Montants négatifs → 3 000<br>Montants positifs → 3 000 | différent |
| ROYAL ONYX | Automobile | de 1 à 60 jours | [PAS DE PALIER] → 2 500 (1 000) | [PAS DE PALIER] → 3 000 | différent |
| ROYAL ONYX | Automobile | de 120 à 180 jours | [PAS DE PALIER] → 2 500 (1 000) | [PAS DE PALIER] → 3 000 | différent |
| ROYAL ONYX | Automobile | de 6 mois à 1 an | de 0 à 100 000 → 2 500 (1 000)<br>de 200 000 à 500 000 → 4 000 (1 000)<br>de 500 001 à 1 000 000 → 5 000 (1 000)<br>de 1 000 000 au-delà → 5 000 (1 000) | de 0 à 100 000 → 3 000<br>de 200 001 à 500 000 → 4 000<br>de 500 001 à 1 000 000 → 5 000<br>de 1 000 000 au-delà → 5 000 | différent |
| ROYAL ONYX | Automobile | de 60 à 120 jours | [PAS DE PALIER] → 2 500 (1 000) | [PAS DE PALIER] → 3 000 | différent |
| SAAR | [NON IDENTIFIEE] | [AUCUNE SEGMENTATION] | [PAS DE PALIER] → 2 500 (1 000) | [PAS DE PALIER] → 3 000 | différent |
| SANLAM | [NON IDENTIFIEE] | [AUCUNE SEGMENTATION] | [PAS DE PALIER] → 2 500 (1 000) | [PAS DE PALIER] → 3 000 | différent |
| SUNU | Automobile | De 0 à 6 mois | — | [PAS DE PALIER] → 3 000 | absent de la source |
| SUNU | Automobile | [AUCUNE SEGMENTATION] | Montants négatifs → 2 500 (1 000)<br>de 0 à 50 000 → 2 500 (1 000)<br>de 50 000 à 250 000 → 5 000 (1 000)<br>de 250 000 à 799 999 → 15 000 (1 000)<br>de 800 000 à 1 499 999 → 25 000 (1 000)<br>de 1 500 000 à 5 000 000 → 40 000 (1 000)<br>de 5 000 000 à 9 999 999 → 75 000 (1 000)<br>de 10 000 000 à 50 000 000 → 200 000 (1 000)<br>de 50 000 000 et au-delà → 500 000 (1 000) | — | absent de la base |
| SUNU | Automobile | de 6 mois à 1 an | — | de 0 à 200 000 → 3 000<br>de 200 001 à 500 000 → 4 000<br>de 500 000 au-delà → 5 000 | absent de la source |
| SUNU | Flotte Automobile | [AUCUNE SEGMENTATION] | — | DE 0 à 1 000 000 → 5 000<br>de 1 000 000 au-delà → 10 000 | absent de la source |
| ZENITHE | [NON IDENTIFIEE] | [AUCUNE SEGMENTATION] | [PAS DE PALIER] → 2 500 (1 000) | — | absent de la base |
