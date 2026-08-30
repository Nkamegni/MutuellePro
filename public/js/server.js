require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

// -----------------------------------------------------------------------
// LIMITATION DE DÉBIT — protection basique contre les abus sur les
// endpoints publics (envoi d'email, décodage VIN). Volontairement sans
// dépendance externe (pas de npm install nécessaire) : un compteur en
// mémoire par IP, à fenêtre glissante simple. Suffisant pour un trafic
// de taille actuelle ; à remplacer par une solution plus robuste
// (Redis, etc.) si le site grossit significativement.
// -----------------------------------------------------------------------
function createRateLimiter(maxRequests, windowMs) {
  const hits = new Map(); // ip -> [timestamps]

  // Purge périodique pour éviter une fuite mémoire lente sur un
  // processus qui tourne des semaines sans redémarrer.
  setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of hits.entries()) {
      const recent = timestamps.filter((t) => now - t < windowMs);
      if (recent.length === 0) hits.delete(ip);
      else hits.set(ip, recent);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    const now = Date.now();
    const timestamps = (hits.get(ip) || []).filter((t) => now - t < windowMs);

    if (timestamps.length >= maxRequests) {
      return res.status(429).json({ error: 'Trop de requêtes. Veuillez réessayer dans quelques minutes.' });
    }

    timestamps.push(now);
    hits.set(ip, timestamps);
    next();
  };
}

// 10 envois d'email max par IP / 10 minutes — largement suffisant pour un
// vrai visiteur (même en cas d'erreur/nouvel essai), bloque un script.
const emailRateLimiter = createRateLimiter(10, 10 * 60 * 1000);
// 30 décodages VIN max par IP / 5 minutes — plus permissif, un agent
// peut légitimement tester plusieurs véhicules d'affilée.
const vinRateLimiter = createRateLimiter(30, 5 * 60 * 1000);

// Sert le site (index.html, etc.) directement via ce serveur Node, pour que
// la page tourne en http://localhost plutôt qu'en file://. C'est nécessaire
// pour la géolocalisation (API Geolocation), bloquée par les navigateurs sur
// les pages ouvertes en file://. "localhost" est reconnu comme un contexte
// sécurisé même sans HTTPS.
// __dirname = C:\MutuellePro\vin-decoder-api → on remonte d'un cran pour
// servir C:\MutuellePro (là où se trouve index.html).
app.use(express.static(path.join(__dirname, '..')));

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

const PORT = process.env.PORT || 3000;

// -----------------------------------------------------------------------
// Validation de format AVANT d'interroger la base (évite un aller-retour
// inutile pour une saisie manifestement incorrecte : longueur, caractères
// interdits I / O / Q qui n'existent jamais dans un VIN).
// -----------------------------------------------------------------------
function checkVinFormat(vin) {
  if (!vin || typeof vin !== 'string') {
    return 'VIN manquant.';
  }
  const cleaned = vin.trim().toUpperCase();
  if (cleaned.length !== 17) {
    return `Le VIN doit contenir exactement 17 caractères (reçu : ${cleaned.length}).`;
  }
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(cleaned)) {
    return 'Le VIN contient des caractères invalides (les lettres I, O, Q ne sont jamais utilisées).';
  }
  return null;
}

// -----------------------------------------------------------------------
// Codes d'erreur retournés par vpic.spvindecode / decode_vin_flat
// Référence : structure de la table vpic.ErrorCode
// -----------------------------------------------------------------------
const ERROR_MESSAGES = {
  '1': "Le chiffre de contrôle (9e position) est incorrect — vérifiez la saisie du VIN.",
  '6': 'VIN trop court.',
  '7': "Constructeur (WMI) non reconnu dans la base — VIN probablement invalide ou hors périmètre.",
  '8': "Aucune donnée détaillée disponible pour ce véhicule.",
  '5': "Le VIN contient des incohérences à certaines positions.",
  '14': "Informations incomplètes fournies par le constructeur pour ce VIN.",
  '400': 'Caractère(s) invalide(s) détecté(s) dans le VIN.',
};

function buildErrorMessage(errorCode) {
  if (!errorCode) return null;
  const codes = errorCode.split(',').map((c) => c.trim()).filter(Boolean);
  return codes
    .map((c) => ERROR_MESSAGES[c] || `Code d'erreur ${c}.`)
    .join(' ');
}

// -----------------------------------------------------------------------
// AJOUT DU 02/08/2026 — Fusion catalogue Cameroun.
//
// decode_vin_flat() retourne desormais un champ `source` :
//   'vpic'           -> vPIC seul a repondu (comportement d'origine)
//   'catalogue'      -> vPIC a echoue/est incomplet, notre catalogue
//                       (parc reel camerounais) a fourni la donnee
//   'vpic+catalogue' -> vPIC partiel, complete par le catalogue
//
// data.is_valid garde VOLONTAIREMENT son sens d'origine (base sur le
// seul error_code de vPIC) -- on ne le redefinit pas, pour ne rien
// casser ailleurs dans le code qui pourrait s'y fier. A la place, on
// definit ICI ce qui compte comme "donnee utilisable" pour l'API :
// vPIC valide OU catalogue avec au moins une marque connue.
// -----------------------------------------------------------------------
function hasUsableData(data) {
  return data.is_valid === true || (data.source && data.source !== 'vpic' && !!data.make);
}

// -----------------------------------------------------------------------
// GET /api/vin/:vin
// Décode un VIN et renvoie toutes les caractéristiques disponibles.
// Paramètre optionnel : ?year=2003 (améliore la précision du décodage
// pour les WMI réutilisés sur plusieurs cycles de 30 ans)
// -----------------------------------------------------------------------

// GET /api/vin/recherche?marque=...&modele=...&energie=...&puissance=...&charge_utile=...&nombre_places=...
// Recherche FLOUE multi-critères (sans VIN), tolérante aux fautes de
// frappe (similarité trigrammes PostgreSQL, seuil 0.3 par défaut).
// Au moins marque OU modele requis. Score = similarité marque + modèle,
// avec bonus si énergie/puissance/places/charge_utile correspondent
// aussi (ne filtrent jamais, aident juste au classement).
//
// IMPORTANT (corrigé le 06/08/2026, deux fois) :
// 1. Quand marque ET modèle sont TOUS LES DEUX fournis, le filtre exige
//    que les DEUX dépassent le seuil de similarité (ET, pas OU) — un
//    OU laissait passer des milliers de résultats sans lien réel.
// 2. Ne bloque PLUS jamais sèchement au-delà de 30 correspondances —
//    retourne toujours les 30 meilleures (déjà triées par score), avec
//    le nombre total réel trouvé pour information. Un modèle très
//    répandu (ex: Toyota Corolla) a légitimement des centaines de
//    profils dans le catalogue ; refuser de répondre serait pire que
//    de laisser l'utilisateur choisir dans une liste paginée.
// 3. EXCEPTION : si le meilleur résultat dépasse 95% de confiance
//    (score obtenu / score maximum possible selon les critères donnés),
//    la réponse est volontairement réduite aux 3 meilleurs seulement —
//    inutile de proposer 30 choix quand la correspondance est quasi
//    certaine.
app.get('/api/vin/recherche', vinRateLimiter, async (req, res) => {
  const { marque, modele, energie, puissance, charge_utile, nombre_places } = req.query;
  const seuilSimilarite = req.query.seuil ? parseFloat(req.query.seuil) : SEUIL_SIMILARITE_DEFAUT;
  const limite = req.query.limite ? Math.min(parseInt(req.query.limite, 10), SEUIL_MAX_RESULTATS) : SEUIL_MAX_RESULTATS;
  const SEUIL_QUASI_CERTAIN = 95; // % de confiance à partir duquel on réduit à 3 résultats
  const NB_RESULTATS_SI_QUASI_CERTAIN = 3;

  if (!marque && !modele) {
    return res.status(400).json({ error: 'Au moins "marque" ou "modele" est nécessaire pour cette recherche.' });
  }

  const marqueNorm = marque ? marque.trim().toUpperCase() : null;
  const modeleNorm = modele ? modele.trim().toUpperCase() : null;
  const energieNorm = energie ? energie.trim().toUpperCase() : null;

  try {
    // Score maximum théorique selon les critères réellement fournis
    // (sert à convertir le score brut en % de confiance comparable,
    // quel que soit le nombre de critères donnés par l'utilisateur).
    const scoreMax =
      (marqueNorm ? 1 : 0) + (modeleNorm ? 1 : 0) +
      (energieNorm ? 0.5 : 0) + (puissance ? 0.3 : 0) +
      (nombre_places ? 0.3 : 0) + (charge_utile ? 0.2 : 0);

    // Requête (comptage TOTAL, informatif seulement — ne bloque plus rien)
    const filtreParts0 = [];
    const countParams = [];
    if (marqueNorm) { countParams.push(marqueNorm, seuilSimilarite); filtreParts0.push(`catalogue.similarity(marque, $${countParams.length - 1}) > $${countParams.length}`); }
    if (modeleNorm) { countParams.push(modeleNorm, seuilSimilarite); filtreParts0.push(`catalogue.similarity(modele, $${countParams.length - 1}) > $${countParams.length}`); }
    const filtreCountSql = filtreParts0.join(' AND ');

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM catalogue.vehicules_catalogue WHERE ${filtreCountSql}`,
      countParams
    );
    const nbCorrespondancesTotal = parseInt(countResult.rows[0].count, 10);

    if (nbCorrespondancesTotal === 0) {
      return res.json({ trouve: false, resultats: [], message: 'Aucune correspondance, même approximative.' });
    }

    // Requête FINALE (score + filtre + tri + limite) — numérotation
    // autonome, reconstruite ici, à nouveau à partir de $1.
    const scoreParts = [];
    const finalParams = [];
    if (marqueNorm) { finalParams.push(marqueNorm); scoreParts.push(`COALESCE(catalogue.similarity(marque, $${finalParams.length}), 0)`); }
    if (modeleNorm) { finalParams.push(modeleNorm); scoreParts.push(`COALESCE(catalogue.similarity(modele, $${finalParams.length}), 0)`); }
    if (energieNorm) { finalParams.push(energieNorm); scoreParts.push(`(CASE WHEN energie = $${finalParams.length} THEN 0.5 ELSE 0 END)`); }
    if (puissance) { finalParams.push(String(puissance).trim()); scoreParts.push(`(CASE WHEN puissance = $${finalParams.length} THEN 0.3 ELSE 0 END)`); }
    if (nombre_places) { finalParams.push(nombre_places); scoreParts.push(`(CASE WHEN nombre_places = $${finalParams.length} THEN 0.3 ELSE 0 END)`); }
    if (charge_utile) { finalParams.push(charge_utile); scoreParts.push(`(CASE WHEN charge_utile = $${finalParams.length} THEN 0.2 ELSE 0 END)`); }
    const scoreTotalSql = scoreParts.join(' + ');

    const filtreParts = [];
    if (marqueNorm) {
      finalParams.push(marqueNorm, seuilSimilarite);
      filtreParts.push(`catalogue.similarity(marque, $${finalParams.length - 1}) > $${finalParams.length}`);
    }
    if (modeleNorm) {
      finalParams.push(modeleNorm, seuilSimilarite);
      filtreParts.push(`catalogue.similarity(modele, $${finalParams.length - 1}) > $${finalParams.length}`);
    }
    const filtreFinalSql = filtreParts.join(' AND ');

    finalParams.push(limite);
    const limiteIndex = finalParams.length;

    const colonnesSql = COLONNES_PROFIL.join(', ');
    const requete = `SELECT ${colonnesSql}, (${scoreTotalSql}) AS score FROM catalogue.vehicules_catalogue WHERE ${filtreFinalSql} ORDER BY score DESC LIMIT $${limiteIndex}`;

    const lignesResult = await pool.query(requete, finalParams);

    // Ajoute le % de confiance à chaque résultat, et applique la règle
    // "quasi certain -> réduire à 3" si le meilleur score le justifie.
    let resultats = lignesResult.rows.map((r) => ({
      ...r,
      confiance_pct: scoreMax > 0 ? Math.round((1000 * r.score) / scoreMax) / 10 : 0,
    }));

    let reduitPourQuasiCertitude = false;
    if (resultats.length > 0 && resultats[0].confiance_pct >= SEUIL_QUASI_CERTAIN) {
      resultats = resultats.slice(0, NB_RESULTATS_SI_QUASI_CERTAIN);
      reduitPourQuasiCertitude = true;
    }

    res.json({
      trouve: true,
      nb_resultats: resultats.length,
      nb_correspondances_total: nbCorrespondancesTotal,
      quasi_certain: reduitPourQuasiCertitude,
      resultats,
    });
  } catch (err) {
    console.error('Erreur /api/vin/recherche:', err);
    res.status(500).json({ error: 'Erreur serveur lors de la recherche par référence.' });
  }
});

app.get('/api/vin/:vin', vinRateLimiter, async (req, res) => {
  const vin = req.params.vin.trim().toUpperCase();
  const year = req.query.year ? parseInt(req.query.year, 10) : null;

  const formatError = checkVinFormat(vin);
  if (formatError) {
    return res.status(400).json({ valid: false, error: formatError });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM vpic.decode_vin_flat($1, $2)',
      [vin, year]
    );
    const data = result.rows[0];

    if (!hasUsableData(data)) {
      return res.status(422).json({
        valid: false,
        error_code: data.error_code,
        message: buildErrorMessage(data.error_code) || data.error_text,
        partial_data: {
          make: data.make || null,
          model: data.model || null,
          model_year: data.model_year || null,
        },
      });
    }

    return res.json({
      valid: true,
      source: data.source || 'vpic', // 'vpic' | 'catalogue' | 'vpic+catalogue'
      vin: data.vin,
      make: data.make,
      model: data.model,
      model_year: data.model_year,
      trim: data.trim_level,
      vehicle_type: data.vehicle_type,
      manufacturer: data.manufacturer,
      body_class: data.body_class,
      doors: data.doors,
      engine: {
        cylinders: data.engine_cylinders,
        displacement_l: data.engine_displacement_l,
        horsepower_from: data.engine_hp_from,
        fuel_type: data.fuel_type,
        model: data.engine_model,
      },
      transmission: {
        style: data.transmission_style,
        speeds: data.transmission_speeds,
      },
      weight_class: {
        gvwr_from: data.gvwr_from,
        gvwr_to: data.gvwr_to,
        note: 'Plage réglementaire US (GVWR) — pas un poids exact en kg.',
      },
      plant: {
        city: data.plant_city,
        state: data.plant_state,
        country: data.plant_country,
      },
      // Donnees issues du catalogue Cameroun (presentes uniquement si
      // source = 'catalogue' ou 'vpic+catalogue'). Volontairement
      // separees de engine.horsepower_from : catalogue_puissance_fiscale_cv
      // est en CHEVAUX FISCAUX (unite administrative camerounaise), PAS
      // en horsepower -- ne jamais les additionner/comparer directement.
      catalogue: data.source && data.source !== 'vpic' ? {
        marque: data.catalogue_marque,
        modele: data.catalogue_modele,
        energie: data.catalogue_energie,
        puissance_fiscale_cv: data.catalogue_puissance_fiscale_cv,
        nombre_places: data.catalogue_nombre_places,
        charge_utile_kg: data.catalogue_charge_utile_kg,
        nb_profils_connus: data.catalogue_nb_profils,
        note: data.catalogue_nb_profils > 1
          ? `${data.catalogue_nb_profils} profils distincts connus pour ce VIN (ex: changement de motorisation) — celui affiche est le plus recent.`
          : null,
      } : null,
    });
  } catch (err) {
    console.error('Erreur decode_vin_flat:', err);
    return res.status(500).json({ error: 'Erreur serveur lors du décodage du VIN.' });
  }
});

// -----------------------------------------------------------------------
// POST /api/vin/verify
// Body attendu : { "vin": "...", "declaredMake": "...", "declaredModel": "...", "year": 2020 }
// Vérifie que le VIN est valide ET cohérent avec ce que le client a déclaré.
// -----------------------------------------------------------------------
app.post('/api/vin/verify', vinRateLimiter, async (req, res) => {
  const { vin: rawVin, declaredMake, declaredModel, year } = req.body;
  const vin = (rawVin || '').trim().toUpperCase();

  const formatError = checkVinFormat(vin);
  if (formatError) {
    return res.status(400).json({ valid: false, error: formatError });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM vpic.decode_vin_flat($1, $2)',
      [vin, year || null]
    );
    const data = result.rows[0];

    if (!hasUsableData(data)) {
      return res.status(422).json({
        valid: false,
        error_code: data.error_code,
        message: buildErrorMessage(data.error_code) || data.error_text,
      });
    }

    const normalize = (s) => (s || '').trim().toUpperCase();
    const makeMatches = declaredMake
      ? normalize(data.make) === normalize(declaredMake)
      : null;
    const modelMatches = declaredModel
      ? normalize(data.model) === normalize(declaredModel)
      : null;

    const coherent =
      (makeMatches === null || makeMatches === true) &&
      (modelMatches === null || modelMatches === true);

    return res.json({
      valid: true,
      source: data.source || 'vpic',
      coherent,
      checks: {
        make_matches: makeMatches,
        model_matches: modelMatches,
      },
      decoded: {
        make: data.make,
        model: data.model,
        model_year: data.model_year,
        trim: data.trim_level,
        body_class: data.body_class,
        vehicle_type: data.vehicle_type,
      },
    });
  } catch (err) {
    console.error('Erreur vérification VIN:', err);
    return res.status(500).json({ error: 'Erreur serveur lors de la vérification du VIN.' });
  }
});

// -----------------------------------------------------------------------
// RECHERCHE VIN APPROXIMATIVE — 3 endpoints, portés depuis
// systeme_catalogue_vehicules.py (session locale, documentation du
// 05/08/2026). Utilisent catalogue.vehicules_catalogue (schéma déjà en
// place depuis la fusion VIN). Constantes reprises À L'IDENTIQUE du
// script source, pour un comportement fidèle :
const NIVEAUX_CASCADE = [17, 14, 11, 10, 8, 5, 3];
const SEUIL_MAX_RESULTATS = 30;
const SEUIL_SIMILARITE_DEFAUT = 0.3;
const COLONNES_PROFIL = ['id', 'vin', 'marque', 'modele', 'genre', 'energie', 'puissance', 'charge_utile', 'nombre_places', 'taille_vin'];

// Contrairement à /api/vin/:vin (lookup précis, format VIN strictement
// validé), ces 3 endpoints acceptent un VIN mal formé (I/O/Q compris) —
// c'est justement pour ça qu'ils existent : aider quand la donnée
// source est imprécise ou erronée, pas seulement quand elle est parfaite.

// GET /api/vin/cascade/:vinPartiel — cascade de préfixes (17→14→11→10→8→5→3),
// retourne le niveau le plus précis restant ≤ 30 résultats.
app.get('/api/vin/cascade/:vinPartiel', vinRateLimiter, async (req, res) => {
  const vinPartiel = req.params.vinPartiel.trim().toUpperCase();
  if (!vinPartiel) return res.status(400).json({ error: 'VIN (même partiel) requis.' });

  try {
    let dernierValide = null;

    for (const n of NIVEAUX_CASCADE) {
      if (vinPartiel.length < n) continue;
      const prefixe = vinPartiel.slice(0, n);

      const countResult = await pool.query(
        'SELECT COUNT(*) FROM catalogue.vehicules_catalogue WHERE vin LIKE $1',
        [`${prefixe}%`]
      );
      const nb = parseInt(countResult.rows[0].count, 10);

      if (nb === 0) continue;
      if (nb > SEUIL_MAX_RESULTATS) break;

      const colonnesSql = COLONNES_PROFIL.join(', ');
      const lignesResult = await pool.query(
        `SELECT ${colonnesSql} FROM catalogue.vehicules_catalogue WHERE vin LIKE $1`,
        [`${prefixe}%`]
      );
      dernierValide = { n, prefixe, nb, lignes: lignesResult.rows };
    }

    if (!dernierValide) {
      return res.json({ trouve: false, vin_interroge: vinPartiel, niveau_trouve: null, nb_references: 0 });
    }

    // Agrégation par majorité (marque/modèle/énergie/puissance/places les
    // plus fréquents parmi les résultats du niveau retenu), avec % de confiance.
    const agrege = {};
    ['marque', 'modele', 'energie', 'puissance', 'nombre_places'].forEach((champ) => {
      const valeurs = dernierValide.lignes.map((l) => l[champ]).filter((v) => v !== null && v !== undefined);
      if (valeurs.length === 0) {
        agrege[champ] = null;
        agrege[`${champ}_confiance`] = 0;
        return;
      }
      const comptes = {};
      valeurs.forEach((v) => { comptes[v] = (comptes[v] || 0) + 1; });
      const [meilleureValeur, compte] = Object.entries(comptes).sort((a, b) => b[1] - a[1])[0];
      agrege[champ] = meilleureValeur;
      agrege[`${champ}_confiance`] = Math.round((1000 * compte) / valeurs.length) / 10;
    });

    res.json({
      trouve: true,
      vin_interroge: vinPartiel,
      niveau_trouve: dernierValide.n,
      prefixe: dernierValide.prefixe,
      nb_references: dernierValide.nb,
      resultats: dernierValide.lignes,
      agrege,
    });
  } catch (err) {
    console.error('Erreur /api/vin/cascade:', err);
    res.status(500).json({ error: 'Erreur serveur lors de la recherche en cascade.' });
  }
});

// GET /api/vin/profils/:vin — tous les profils connus pour un VIN EXACT
// (un même VIN peut légitimement porter plusieurs profils : changement
// de motorisation, occasion importée, etc.)
app.get('/api/vin/profils/:vin', vinRateLimiter, async (req, res) => {
  const vin = req.params.vin.trim().toUpperCase();
  if (!vin) return res.status(400).json({ error: 'VIN requis.' });

  try {
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM catalogue.vehicules_catalogue WHERE vin = $1',
      [vin]
    );
    const nb = parseInt(countResult.rows[0].count, 10);

    if (nb === 0) {
      return res.json({ trouve: false, resultats: [] });
    }
    if (nb > SEUIL_MAX_RESULTATS) {
      return res.json({
        trouve: false, resultats: [], nb_profils: nb,
        message: `${nb} profils distincts pour ce VIN (> ${SEUIL_MAX_RESULTATS}) : cas exceptionnel, vérification manuelle recommandée.`,
      });
    }

    const colonnesSql = COLONNES_PROFIL.join(', ');
    const lignesResult = await pool.query(
      `SELECT ${colonnesSql} FROM catalogue.vehicules_catalogue WHERE vin = $1`,
      [vin]
    );

    res.json({ trouve: true, nb_profils: nb, resultats: lignesResult.rows });
  } catch (err) {
    console.error('Erreur /api/vin/profils:', err);
    res.status(500).json({ error: 'Erreur serveur lors de la recherche de profils.' });
  }
});

// après un premier essai basé sur un schéma générique qui s'est avéré
// incorrect sur un point précis : le "senderAddress" n'est PAS un numéro
// personnel ni le "sender name" affiché dans l'espace développeur (ex.
// "SMS 197809") — c'est un numéro générique FIXE par pays, imposé par
// Orange, ici +2370000 pour le Cameroun.
//
// Variables .env nécessaires :
//   ORANGE_CLIENT_ID=...
//   ORANGE_CLIENT_SECRET=...
// (ORANGE_SENDER_NUMBER n'est plus utilisé pour l'envoi standard — voir
// ORANGE_COUNTRY_SENDER_NUMBER ci-dessous, fixé par Orange, pas par nous)
// -----------------------------------------------------------------------
const ORANGE_COUNTRY_SENDER_NUMBER = '+2370000'; // Cameroun — imposé par Orange, ne pas modifier

let orangeTokenCache = { token: null, expiresAt: 0 };

async function getOrangeAccessToken() {
  // Réutilise le jeton tant qu'il reste valide (évite une authentification
  // à chaque SMS — les jetons Orange durent typiquement 1h).
  if (orangeTokenCache.token && Date.now() < orangeTokenCache.expiresAt) {
    return orangeTokenCache.token;
  }

  const credentials = Buffer.from(
    `${process.env.ORANGE_CLIENT_ID}:${process.env.ORANGE_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch('https://api.orange.com/oauth/v3/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Échec d'authentification Orange (${response.status}) : ${errText}`);
  }

  const data = await response.json();
  orangeTokenCache = {
    token: data.access_token,
    // Marge de sécurité de 60s avant l'expiration réelle du jeton.
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return orangeTokenCache.token;
}

// Envoie un SMS à un numéro camerounais. `toNumber` attendu au format
// international (+237XXXXXXXXX) — le convertit si besoin.
async function sendOrangeSMS(toNumber, message) {
  const sender = ORANGE_COUNTRY_SENDER_NUMBER;
  const formattedTo = toNumber.startsWith('+') ? toNumber : `+237${toNumber.replace(/\D/g, '').slice(-9)}`;
  const accessToken = await getOrangeAccessToken();
  const encodedSender = encodeURIComponent(`tel:${sender}`);

  const response = await fetch(`https://api.orange.com/smsmessaging/v1/outbound/${encodedSender}/requests`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      outboundSMSMessageRequest: {
        address: `tel:${formattedTo}`, // chaîne simple, pas un tableau — conforme à la doc officielle
        senderAddress: `tel:${sender}`,
        outboundSMSTextMessage: { message },
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Échec d'envoi SMS Orange (${response.status}) : ${errText}`);
  }

  return response.json();
}

// -----------------------------------------------------------------------
// ENVOI EMAIL — via le serveur SMTP LWS (mail.mutuelleproassurances.com),
// remplace EmailJS et sa limite de 50 Ko qui empêchait l'envoi des pièces
// justificatives. Les pièces jointes sont désormais gérées ici, côté
// serveur, sans plafond aussi restrictif.
//
// Règle anti-doublon convenue : "devis@" reçoit TOUJOURS l'email complet.
// L'agence, elle, n'en reçoit une copie QUE si WhatsApp a échoué côté
// visiteur (paramètre "agencyEmail" fourni uniquement dans ce cas par le
// site) — sinon elle a déjà reçu l'information complète via WhatsApp, pas
// la peine de la lui envoyer une seconde fois par email.
// -----------------------------------------------------------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 Mo par fichier, largement au-dessus des 50 Ko d'EmailJS
});

const mailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465, // true pour le port 465 (SSL direct), false pour 587 (STARTTLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Endpoint interne : POST /api/send-quote-email (multipart/form-data)
// Champs attendus : memo_complet (texte), agencyEmail (optionnel — voir
// règle anti-doublon ci-dessus), plus les fichiers de pièces jointes sous
// n'importe quel nom de champ (doc_cni_recto, doc_permis_recto, etc.).
app.post('/api/send-quote-email', emailRateLimiter, upload.any(), async (req, res) => {
  const { memo_complet, cc, subject, recipient } = req.body;

  if (!memo_complet) {
    return res.status(400).json({ error: 'Le champ "memo_complet" est requis.' });
  }

  // "recipient" (To) et "cc" (Cc, adresses séparées par des virgules) sont
  // fournis par le frontend selon le routage voulu (formulaire de contact
  // avec table de routage par sujet, ou copie à l'agence pour un devis) —
  // repli sur devis@ si rien n'est précisé pour "recipient".
  const to = recipient || process.env.DEVIS_RECIPIENT || 'devis@mutuelleproassurances.com';
  const ccList = cc ? cc.split(',').map((e) => e.trim()).filter(Boolean) : [];

  const attachments = (req.files || []).map((f) => ({
    filename: f.originalname,
    content: f.buffer,
    contentType: f.mimetype,
  }));

  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: subject || 'Nouvelle demande de cotation — Mutuelle Pro Assurances',
      html: memo_complet, // le mémo utilise déjà des <br> pour les retours à la ligne
      attachments,
    };
    if (ccList.length > 0) mailOptions.cc = ccList.join(', ');

    const info = await mailTransporter.sendMail(mailOptions);
    console.log(`📧 Email envoyé (À: ${to}${ccList.length ? ' | Cc: ' + ccList.join(', ') : ''}) — pièces : ${attachments.length}`);
    res.json({ success: true, messageId: info.messageId, to, cc: ccList, attachmentsCount: attachments.length });
  } catch (err) {
    console.error('Erreur envoi email:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint interne : POST /api/send-sms { to: "+237...", message: "..." }
// Jamais appelé directement depuis le navigateur en production réelle avec
// de vraies clés API exposées — c'est justement le rôle de ce serveur que
// de garder Client ID/Secret côté backend, invisibles du visiteur.
app.post('/api/send-sms', async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ error: 'Paramètres "to" et "message" requis.' });
  }
  try {
    const result = await sendOrangeSMS(to, message);
    res.json({ success: true, result });
  } catch (err) {
    console.error('Erreur envoi SMS:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -----------------------------------------------------------------------
// GET /api/agences
// Renvoie la liste des agences et pôles d'attraction actifs, depuis
// PostgreSQL (schéma site) — remplace l'ancien objet agencesData codé en
// dur dans index.html. Triés par ordre_affichage pour un ordre stable.
// -----------------------------------------------------------------------
app.get('/api/agences', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cle, type, nom, adresse, adresse_detail, telephone, email, latitude, longitude
       FROM site.agences
       WHERE actif = true
       ORDER BY ordre_affichage, nom`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur /api/agences:', err);
    res.status(500).json({ error: 'Erreur serveur lors du chargement des agences.' });
  }
});

// -----------------------------------------------------------------------
// GET /api/listes-reference
// Renvoie les 3 listes déroulantes du formulaire de devis pilotées par
// la base — constructeurs, unités de puissance, catégories d'usage CIMA
// (branche Automobile). Regroupées en un seul endpoint : les trois sont
// toujours nécessaires ensemble au chargement du formulaire, inutile de
// faire 3 aller-retours séparés.
// -----------------------------------------------------------------------
app.get('/api/listes-reference', async (req, res) => {
  try {
    const [constructeurs, unites, usages, carrosseries, genresEtats, genresUsages, combinaisons, partenaires] = await Promise.all([
      pool.query('SELECT nom FROM site.constructeurs WHERE actif = true ORDER BY ordre_affichage, nom'),
      pool.query('SELECT code, libelle FROM site.unites_puissance ORDER BY ordre_affichage'),
      pool.query('SELECT code, designation, groupe FROM site.usages_categories ORDER BY groupe, ordre_affichage'),
      pool.query('SELECT nom, genre_canonique FROM site.carrosseries WHERE actif = true ORDER BY ordre_affichage'),
      pool.query('SELECT alias, etat_nom, etat_options FROM site.genres_etats WHERE actif = true ORDER BY alias, ordre_affichage'),
      pool.query('SELECT genre_canonique, usage_libelle, code_categorie FROM site.genres_usages WHERE actif = true ORDER BY genre_canonique, ordre_affichage'),
      pool.query('SELECT carrosserie, double_commande, matiere_inflammable, codes_categorie FROM site.carrosserie_usage_combinaisons WHERE actif = true ORDER BY carrosserie, ordre_affichage'),
      pool.query('SELECT nom, logo_path, poids_apparition FROM site.partenaires_assurance WHERE actif = true AND poids_apparition > 0 ORDER BY ordre_affichage'),
    ]);
    res.json({
      constructeurs: constructeurs.rows.map((r) => r.nom),
      unites_puissance: unites.rows,
      usages_categories: usages.rows,
      carrosseries: carrosseries.rows,
      genres_etats: genresEtats.rows,
      genres_usages: genresUsages.rows,
      carrosserie_combinaisons: combinaisons.rows,
      partenaires_assurance: partenaires.rows,
    });
  } catch (err) {
    console.error('Erreur /api/listes-reference:', err);
    res.status(500).json({ error: 'Erreur serveur lors du chargement des listes de référence.' });
  }
});

// Vérification rapide que le serveur et la connexion DB fonctionnent
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

app.listen(PORT, () => {
  console.log(`API VIN décodeur démarrée sur http://localhost:${PORT}`);
});
