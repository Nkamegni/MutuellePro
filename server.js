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
app.get('/api/vin/:vin', async (req, res) => {
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
app.post('/api/vin/verify', async (req, res) => {
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
// ENVOI SMS — API Orange Cameroun ("SMS Cameroon 2.0", livre vers tous les
// opérateurs depuis un compte Orange). Schéma confirmé via la vraie
// documentation officielle (developer.orange.com/apis/sms/getting-started),
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
app.post('/api/send-quote-email', upload.any(), async (req, res) => {
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
