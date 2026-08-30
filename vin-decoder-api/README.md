# API de décodage et validation de VIN

API basée sur la base **vPICList_lite** (NHTSA) restaurée dans PostgreSQL,
utilisant les fonctions natives `vpic.spvindecode` + une fonction de pivot
`vpic.decode_vin_flat` (à créer au préalable dans PostgreSQL — voir plus bas).

## 1. Prérequis côté base de données

Cette fonction doit exister dans votre base PostgreSQL (schéma `vpic`) avant
de démarrer l'API :

```sql
CREATE OR REPLACE FUNCTION vpic.decode_vin_flat(p_vin varchar, p_year integer DEFAULT NULL)
RETURNS TABLE (
    vin varchar, error_code varchar, error_text varchar, is_valid boolean,
    make varchar, model varchar, model_year varchar, trim_level varchar,
    vehicle_type varchar, manufacturer varchar, body_class varchar, doors varchar,
    engine_cylinders varchar, engine_displacement_l varchar, engine_hp_from varchar,
    fuel_type varchar, engine_model varchar, transmission_style varchar,
    transmission_speeds varchar, gvwr_from varchar, gvwr_to varchar,
    plant_city varchar, plant_state varchar, plant_country varchar
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p_vin::varchar,
        MAX(CASE WHEN d.variable = 'Error Code' THEN d.value END)::varchar,
        MAX(CASE WHEN d.variable = 'Error Text' THEN d.value END)::varchar,
        (MAX(CASE WHEN d.variable = 'Error Code' THEN d.value END) = '0'),
        MAX(CASE WHEN d.variable = 'Make' THEN d.value END)::varchar,
        MAX(CASE WHEN d.variable = 'Model' THEN d.value END)::varchar,
        MAX(CASE WHEN d.variable = 'Model Year' THEN d.value END)::varchar,
        MAX(CASE WHEN d.variable = 'Trim' THEN d.value END)::varchar,
        MAX(CASE WHEN d.variable = 'Vehicle Type' THEN d.value END)::varchar,
        MAX(CASE WHEN d.variable = 'Manufacturer Name' THEN d.value END)::varchar,
        MAX(CASE WHEN d.variable = 'Body Class' THEN d.value END)::varchar,
        MAX(CASE WHEN d.variable = 'Doors' THEN d.value END)::varchar,
        MAX(CASE WHEN d.variable = 'Engine Number of Cylinders' THEN d.value END)::varchar,
        MAX(CASE WHEN d.variable = 'Displacement (L)' THEN d.value END)::varchar,
        MAX(CASE WHEN d.variable = 'Engine Brake (hp) From' THEN d.value END)::varchar,
        MAX(CASE WHEN d.variable = 'Fuel Type - Primary' THEN d.value END)::varchar,
        MAX(CASE WHEN d.variable = 'Engine Model' THEN d.value END)::varchar,
        MAX(CASE WHEN d.variable = 'Transmission Style' THEN d.value END)::varchar,
        MAX(CASE WHEN d.variable = 'Transmission Speeds' THEN d.value END)::varchar,
        MAX(CASE WHEN d.variable = 'Gross Vehicle Weight Rating From' THEN d.value END)::varchar,
        MAX(CASE WHEN d.variable = 'Gross Vehicle Weight Rating To' THEN d.value END)::varchar,
        MAX(CASE WHEN d.variable = 'Plant City' THEN d.value END)::varchar,
        MAX(CASE WHEN d.variable = 'Plant State' THEN d.value END)::varchar,
        MAX(CASE WHEN d.variable = 'Plant Country' THEN d.value END)::varchar
    FROM vpic.spvindecode(p_vin, false, p_year) d;
END;
$$ LANGUAGE plpgsql;
```

## 2. Installation

```bash
cd vin-decoder-api
npm install
cp .env.example .env
```

Éditez `.env` et renseignez votre mot de passe PostgreSQL (`PGPASSWORD`) et,
si besoin, le nom exact de votre base (`PGDATABASE`).

## 3. Démarrage

```bash
npm start
```

Le serveur démarre sur `http://localhost:3000` (modifiable via `PORT` dans `.env`).

Vérification rapide :
```bash
curl http://localhost:3000/api/health
```

## 4. Endpoints disponibles

### GET /api/vin/:vin
Décode un VIN et renvoie toutes ses caractéristiques.

```bash
curl http://localhost:3000/api/vin/1HGCM82633A004352
```

Paramètre optionnel `?year=2003` pour affiner le décodage.

**Réponse (VIN valide) :**
```json
{
  "valid": true,
  "make": "HONDA",
  "model": "Accord",
  "model_year": "2003",
  "body_class": "Coupe",
  "engine": { "cylinders": "6", "fuel_type": "Gasoline", "..." : "..." },
  "weight_class": { "gvwr_from": "...", "gvwr_to": "...", "note": "Plage réglementaire US, pas un poids exact en kg." },
  "plant": { "city": "MARYSVILLE", "country": "UNITED STATES (USA)" }
}
```

**Réponse (VIN invalide) — HTTP 422 :**
```json
{
  "valid": false,
  "error_code": "1",
  "message": "Le chiffre de contrôle (9e position) est incorrect — vérifiez la saisie du VIN."
}
```

### POST /api/vin/verify
Valide un VIN **et** vérifie sa cohérence avec une marque/modèle déclarés
par le client (utile en formulaire de souscription).

```bash
curl -X POST http://localhost:3000/api/vin/verify \
  -H "Content-Type: application/json" \
  -d '{"vin":"1HGCM82633A004352","declaredMake":"Honda","declaredModel":"Accord"}'
```

**Réponse :**
```json
{
  "valid": true,
  "coherent": true,
  "checks": { "make_matches": true, "model_matches": true },
  "decoded": { "make": "HONDA", "model": "Accord", "model_year": "2003" }
}
```

Si `declaredMake` ne correspond pas à la marque décodée, `coherent` passe à
`false` et `checks.make_matches` à `false` — à afficher comme alerte à
l'agent ou au client avant validation du dossier.

## 5. Limites connues de la base vPIC

- **Pas de poids exact** : seules des tranches réglementaires GVWR (US) sont
  disponibles, pas un poids en kg précis. Utile pour classer léger/lourd,
  insuffisant pour un poids exact de camion/utilitaire.
- Base centrée sur le marché **US** : les VIN de véhicules distribués
  uniquement en Afrique/Europe peuvent être partiellement ou mal décodés
  (WMI non reconnu → code d'erreur 7 ou 8).
- Le code d'erreur `0` seul est traité comme "valide" (validation stricte,
  adaptée à un contexte assurance). Les VIN partiellement décodés
  (ex. code 14 seul) sont actuellement rejetés — ajustable dans
  `ERROR_MESSAGES` / logique `is_valid` selon vos besoins métier.
