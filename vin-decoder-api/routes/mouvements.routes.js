// =====================================================================
// Mutuelle Pro Assurances — Production & Souscription, Lot P1bis
// Routes : mouvements (émissions) -- 24/09/2026
// =====================================================================
//
// NOUVEAU FICHIER. production.routes.js (P1) n'est pas modifié : ses
// routes de lecture restent utilisées par l'écran (Échéancier, Mes
// contrats, Suivi) ; ses routes d'écriture (POST /staff/contrats,
// POST /staff/contrats/:id/renouveler) ne sont plus appelées par l'écran
// -- toute émission passe désormais par POST /staff/mouvements. Leur
// retrait éventuel est à décider avec myspace.html.
//
// Personnel (gestionnaire / administrateur / superadmin) :
//   GET   /api/staff/production/referentiels   natures, points de vente, branches,
//                                               catégories CIMA auto, compagnies,
//                                               frais fixes, TVA, barème DTA, motifs
//   GET   /api/staff/production/police?numero= période en cours d'une police existante
//                                               (avenant/renouvellement) -- 404 si absente
//   GET   /api/staff/production/dta?…           proposition de DTA (même règle que l'émission)
//   GET   /api/staff/production/accessoires?…   proposition d'accessoires (barème de la compagnie,
//                                               sinon son montant par défaut) -- 25/09/2026
//   GET   /api/staff/mouvements                 registre des émissions
//   POST  /api/staff/mouvements                 émission (NAF, REN ou avenant)
//   PATCH /api/staff/mouvements/:id/paiement    statut de paiement (seul champ modifiable)
//
// Règles métier (sources : note DGI réforme DTA ; Nature_opérations.csv ;
// décisions de Roger du 24/09/2026) :
//   * Un mouvement est un document figé : il ne se modifie pas, on émet
//     un nouveau mouvement. Seul le statut de paiement évolue.
//   * Tous les montants dérivés sont calculés ICI, jamais repris du
//     navigateur : fichier central, TVA, carte rose, DTA, prime TTC.
//   * DTA : branche Automobile + nature délivrant une attestation ; dû une
//     fois par véhicule (VIN ou immatriculation) et par année civile de la
//     date d'effet ; sinon "déjà acquitté" avec référence ; exemption sur
//     motif + justificatif.
//   * Numéro de police (NAF uniquement) : Pxx YYYY BR NNNN.
//
// Intégration dans server.js (même règle que P1) :
//   const mouvementsRouter = require('./routes/mouvements.routes')(pool);
//   app.use('/api', mouvementsRouter);
// =====================================================================

const express = require('express');
// 30/09/2026 -- marqueur de version, pour repérer immédiatement un
// dépôt désynchronisé (myspace.html plus récent que cette route, ou
// l'inverse) au lieu de le découvrir via des 404 ou des champs absents
// -- déjà arrivé plusieurs fois. Exposé dans /staff/production/referentiels
// et comparé côté écran à VERSION_ECRAN (voir myspace.html).
const VERSION_ROUTE = '2026-09-30-a';
// 06/10/2026 -- identifie le DÉPLOIEMENT (VERSION_ROUTE, elle, ne change que
// lorsque l'écran et la route doivent évoluer ensemble). Journalisé au
// chargement : `sudo pm2 logs vin-decoder-api --lines 5 --nostream` dit
// immédiatement quelle version tourne, sans deviner depuis la console.
const BUILD_ROUTE = '2026-10-06-c';
console.log(`[mouvements.routes] build ${BUILD_ROUTE} chargé`);
const requireStaffAuth = require('../middleware/requireStaffAuth');
const requireStaffRole = require('../middleware/requireStaffRole');

const ROLES_PRODUCTION = ['gestionnaire', 'administrateur', 'superadmin'];
const AUJOURDHUI_SQL = `(now() AT TIME ZONE 'Africa/Douala')::date`;
const BRANCHE_AUTOMOBILE = 'AUTOMOBILE';
const STATUTS_PAIEMENT = ['non_paye', 'partiel', 'paye'];
const GENRES = ['MOTO2', 'MOTO3', 'VEHICULE'];
// Catégories CIMA « transport public » (Tarif Ministériel, Art. 6) :
// fractionnement mensuel linéaire, distinct du barème par paliers des
// autres catégories -- voir calculerFractionnement.
const CATEGORIES_FRACTIONNEMENT_MENSUEL = ['04A', '04B', '04C'];

// ---------------------------------------------------------------------
// Utilitaires de validation
// ---------------------------------------------------------------------
function estDateIso(v) {
    return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
}
function texteOuNull(v, max) {
    if (v === null || v === undefined) return null;
    const t = String(v).trim();
    return t ? t.slice(0, max) : null;
}
// Montant entier FCFA (signé autorisé si signe=true : ristournes). null/'' => 0.
function montant(v, signe) {
    if (v === null || v === undefined || v === '') return 0;
    const n = Number(v);
    if (!Number.isInteger(n)) return undefined;
    if (!signe && n < 0) return undefined;
    return n;
}
function normaliserVin(v) {
    const t = texteOuNull(v, 40);
    return t ? t.toUpperCase().replace(/[^A-Z0-9]/g, '') || null : null;
}
function normaliserImmat(v) {
    const t = texteOuNull(v, 40);
    return t ? t.toUpperCase().replace(/[^A-Z0-9]/g, '') || null : null;
}
function anneeDe(dateIso) { return Number(dateIso.slice(0, 4)); }

// 28/09/2026 (Roger) : la Date Échéance d'un contrat automobile est son
// anniversaire -- fixée UNE FOIS, à l'émission (NAF) ou au renouvellement
// (REN), sur la date d'effet +1 an, jamais modifiable ensuite (sauf par
// un report de dates, RED, qui décale tout le contrat). Distincte de
// l'Expiration (site.mouvements.date_echeance), la fin de la période
// couverte par CE mouvement précis -- plus courte si un barème de
// fractionnement s'applique (Art. 6 du Tarif Ministériel, catégorie 04).
function dateEcheanceAnniversaire(dateEffetIso) {
    const [a, m, j] = dateEffetIso.split('-').map(Number);
    return `${a + 1}-${String(m).padStart(2, '0')}-${String(j).padStart(2, '0')}`;
}

// Décale une date ISO d'un nombre de jours (signé) -- utilisé par RED
// (report de dates, Roger 28/09) pour décaler effet/expiration/échéance
// du même nombre de jours exactement.
function decalerDateIso(dateIso, jours) {
    const d = new Date(`${dateIso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + jours);
    return d.toISOString().slice(0, 10);
}

class ErreurMetier extends Error {
    constructor(statut, message) { super(message); this.statut = statut; }
}

function repondreErreur(res, route, err) {
    if (err instanceof ErreurMetier) return res.status(err.statut).json({ succes: false, erreurs: [err.message] });
    if (err && err.code === '23505') {
        if (String(err.constraint || '').includes('dta')) {
            return res.status(409).json({ succes: false, erreurs: ['un DTA vient d\'être enregistré pour ce véhicule sur cet exercice — relancez la vérification du DTA'] });
        }
        return res.status(409).json({ succes: false, erreurs: ['ce mouvement existe déjà (police, compagnie et date d\'effet identiques, ou contrat déjà renouvelé)'] });
    }
    if (err && err.code === '23503') {
        // 26/09/2026 -- le message générique ci-dessous ne révèle jamais la
        // contrainte réelle ; on la journalise d'abord, pour tout diagnostic futur.
        console.error(`[${route}] Violation de clé étrangère :`, { contrainte: err.constraint, table: err.table, colonne: err.column, detail: err.detail });
        return res.status(400).json({ succes: false, erreurs: ['référence introuvable (point de vente, compagnie, branche, catégorie ou client)'] });
    }
    if (err && err.code === '23514') return res.status(400).json({ succes: false, erreurs: ['données incohérentes (dates, montants, véhicule ou DTA)'] });
    console.error(`[${route}] Erreur base de données :`, err);
    // 06/10/2026 -- table, colonne ou droit manquant : presque toujours une
    // migration pas encore appliquée, ou un déploiement route/base décalé.
    // Le dire à l'écran évite la panne muette « erreur serveur » (reprochée
    // par Roger le 30/09) ; le détail exact reste dans le journal serveur.
    if (err && ['42P01', '42703', '42501'].includes(err.code)) {
        const cause = err.code === '42P01' ? 'une table est absente' : err.code === '42703' ? 'une colonne est absente' : 'un droit d\'accès manque';
        return res.status(500).json({ succes: false, erreurs: [`Base de données non conforme à cette version : ${cause} (code ${err.code}). Une migration est probablement à appliquer — détail dans le journal du serveur.`] });
    }
    return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
}

// ---------------------------------------------------------------------
// Paramètres datés
// ---------------------------------------------------------------------
async function fraisFixe(db, code, dateIso) {
    const r = await db.query(
        `SELECT montant FROM site.production_frais_fixes
         WHERE code = $1 AND $2::date BETWEEN date_debut AND date_fin
         ORDER BY date_debut DESC LIMIT 1`, [code, dateIso]);
    if (!r.rows.length) throw new ErreurMetier(500, `paramètre ${code} absent pour cette date`);
    return Number(r.rows[0].montant);
}

async function tauxTva(db, codeBranche, dateIso) {
    const r = await db.query(
        `SELECT taux FROM site.production_taux_tva
         WHERE perimetre IN ($1, '*') AND $2::date BETWEEN date_debut AND date_fin
         ORDER BY (perimetre = '*'), date_debut DESC LIMIT 1`, [codeBranche, dateIso]);
    if (!r.rows.length) throw new ErreurMetier(500, 'taux de TVA absent pour cette date');
    return Number(r.rows[0].taux);
}

async function categorieDta(db, genre, codeCategorie, cv, dateIso) {
    // 29/09/2026 -- barème refondu (DTA_utf8.csv) : la catégorie CIMA
    // précise l'emporte quand elle existe pour la période (depuis 2023),
    // sinon repli sur la ligne générique (code_categorie NULL, barème
    // antérieur à 2023, non distingué par catégorie).
    const r = await db.query(
        `SELECT code_categorie, libelle, montant FROM site.bareme_dta
         WHERE genre_vehicule = $1 AND (code_categorie = $2 OR code_categorie IS NULL)
           AND $4::date BETWEEN date_debut AND date_fin
           AND (cv_min IS NULL OR $3::int >= cv_min) AND (cv_max IS NULL OR $3::int <= cv_max)
         ORDER BY (code_categorie IS NOT NULL) DESC, date_debut DESC LIMIT 1`,
        [genre, codeCategorie, genre === 'VEHICULE' ? cv : 0, dateIso]);
    return r.rows[0] || null;
}

// ---------------------------------------------------------------------
// DTA -- une seule règle, utilisée par la proposition ET par l'émission
// ---------------------------------------------------------------------
// Renvoie { statut, montant, exercice, categorie, libelleCategorie,
//           reference, avertissement }
async function evaluerDta(db, { codeBranche, nature, vin, immatriculation, genre, cv, codeCategorie, dateEffet, exemption }) {
    if (codeBranche !== BRANCHE_AUTOMOBILE || !nature.delivre_attestation) {
        return { statut: 'non_applicable', montant: 0, exercice: null };
    }
    if (!vin && !immatriculation) throw new ErreurMetier(400, 'DTA : le VIN ou l\'immatriculation du véhicule est obligatoire');
    const exercice = anneeDe(dateEffet);

    // Exercice déjà couvert pour ce véhicule (acquitté ou exempté) ?
    const deja = await db.query(
        `SELECT m.id_mouvement, m.dta_statut, m.date_effet::text AS date_effet, c.numero_police, m.code_nature
         FROM site.mouvements m JOIN site.contrats c ON c.id_contrat = m.id_contrat
         WHERE m.dta_exercice = $1 AND m.dta_statut IN ('du', 'exempte')
           AND (($2::text IS NOT NULL AND m.vin = $2) OR ($3::text IS NOT NULL AND m.immatriculation = $3))
         ORDER BY m.date_effet LIMIT 1`, [exercice, vin, immatriculation]);

    // Hypothèse 2 de la note DGI : exercice précédent roulé sans DTA
    // (information seulement -- pénalités hors périmètre)
    const precedent = await db.query(
        `SELECT
            EXISTS (SELECT 1 FROM site.mouvements m
                    WHERE (($2::text IS NOT NULL AND m.vin = $2) OR ($3::text IS NOT NULL AND m.immatriculation = $3))
                      AND m.date_effet <= make_date($1, 12, 31) AND m.date_echeance > make_date($1, 1, 1)) AS couvert_assurance,
            EXISTS (SELECT 1 FROM site.mouvements m
                    WHERE (($2::text IS NOT NULL AND m.vin = $2) OR ($3::text IS NOT NULL AND m.immatriculation = $3))
                      AND m.dta_exercice = $1 AND m.dta_statut IN ('du', 'exempte')) AS dta_regle`,
        [exercice - 1, vin, immatriculation]);
    const p = precedent.rows[0];
    const avertissement = p.couvert_assurance && !p.dta_regle
        ? `Exercice ${exercice - 1} : véhicule assuré sans DTA enregistré chez nous — rappel possible (note DGI, hypothèse 2), à vérifier sur l'attestation présentée`
        : null;

    if (deja.rows.length) {
        const ref = deja.rows[0];
        return {
            statut: 'deja_acquitte', montant: 0, exercice, avertissement,
            reference: { id_mouvement: ref.id_mouvement, numero_police: ref.numero_police, date_effet: ref.date_effet, statut: ref.dta_statut },
        };
    }
    if (exemption && exemption.motif) {
        if (!exemption.justificatif) throw new ErreurMetier(400, 'DTA : exemption sans référence de justificatif');
        const m = await db.query(`SELECT 1 FROM site.dta_motifs_exemption WHERE code = $1`, [exemption.motif]);
        if (!m.rows.length) throw new ErreurMetier(400, 'DTA : motif d\'exemption inconnu');
        return { statut: 'exempte', montant: 0, exercice, avertissement };
    }
    if (!GENRES.includes(genre)) throw new ErreurMetier(400, 'DTA : genre du véhicule requis (moto 2 roues, moto 3 roues ou véhicule)');
    if (genre === 'VEHICULE' && !(Number.isInteger(cv) && cv > 0)) throw new ErreurMetier(400, 'DTA : puissance fiscale (CV) requise');
    const cat = await categorieDta(db, genre, codeCategorie, cv, dateEffet);
    if (!cat) throw new ErreurMetier(400, 'DTA : puissance hors barème (le barème DGI commence à 02 CV) — vérifiez la puissance fiscale');
    return { statut: 'du', montant: Number(cat.montant), exercice, categorie: cat.code_categorie, libelleCategorie: cat.libelle, avertissement };
}

// Dernier risque connu d'un contrat (pour un avenant saisi sans risque)
// ---------------------------------------------------------------------
// Fractionnement -- Tarif Ministériel, Article 6 (26/09/2026)
// ---------------------------------------------------------------------
// Renvoie { pourcentage (0-100), libelle, nbMois } pour une catégorie et
// une période données. codeCategorie peut être null (branche non
// automobile, ou catégorie non renseignée) : traité comme le cas
// général (barème par paliers), jamais comme la catégorie 04.
async function calculerFractionnement(db, codeCategorie, dateEffet, dateEcheance) {
    if (CATEGORIES_FRACTIONNEMENT_MENSUEL.includes(codeCategorie)) {
        // Mois calendaires pleins : tout mois entamé -- même d'une seconde -- compte
        // pour un mois entier (Roger, 06/10 ; 26/09 : 1er au 28 février = un mois).
        // 06/10/2026 : l'expiration est le DERNIER jour couvert (inclus). Le mois
        // n+1 commence donc le jour « effet + n mois » : n = plus petit entier tel
        // que effet + n mois > expiration. (Ancien calcul par age(), écrit pour une
        // fin exclusive : il rendait 3 pour 10/05 -> 10/08, qui est 3 mois et 1 jour.)
        // Si le jour n'existe pas dans le mois d'arrivée (effet un 29/30/31), c'est le
        // comportement de PostgreSQL qui tranche (fin de mois) -- cas limite à confirmer.
        const r = await db.query(
            `SELECT COALESCE((SELECT min(n) FROM generate_series(1, 12) AS n
                               WHERE ($1::date + make_interval(months => n))::date > $2::date), 12) AS nb_mois`,
            [dateEffet, dateEcheance]);
        const nbMois = r.rows[0].nb_mois;
        return { pourcentage: nbMois / 12 * 100, libelle: `${nbMois}/12 (catégorie ${codeCategorie}, mensuel)`, nbMois };
    }
    // 30/09/2026 (Roger) : Durée = Entier(DEXP) - Entier(DEFF) + 1 -- un
    // contrat du 01/01 au 01/03 dure 60 jours, pas 59 (compte les DEUX
    // bornes). Sans ce +1, les cas pile sur une frontière de palier
    // (60/120/180/240/365 jours) tombaient dans le palier du dessous --
    // sous-facturation silencieuse sur ces cas précis.
    const r = await db.query(`SELECT ($2::date - $1::date)::int + 1 AS jours`, [dateEffet, dateEcheance]);
    const jours = r.rows[0].jours;
    // Hors barème (plus d'un an, ou dates incohérentes) : prime déjà
    // annuelle, pas de fractionnement -- repli à 100 %, jamais un rejet.
    // 366 (pas 365) : une année pleine SANS fractionnement, où l'Expiration
    // vaut l'anniversaire du contrat (convention "exclusive"), calcule
    // Entier(anniversaire)-Entier(effet)+1 = 366 avec ce même +1 -- un an
    // pile, pas une erreur de saisie.
    if (jours <= 0 || jours > 366) return { pourcentage: 100, libelle: null, nbMois: null };
    const b = await db.query(
        `SELECT palier, pourcentage FROM site.bareme_fractionnement
         WHERE $1 BETWEEN jours_min AND jours_max AND CURRENT_DATE BETWEEN date_debut AND date_fin
         LIMIT 1`, [jours]);
    if (!b.rows.length) return { pourcentage: 100, libelle: null, nbMois: null };
    return { pourcentage: Number(b.rows[0].pourcentage), libelle: `${b.rows[0].palier} jours (${b.rows[0].pourcentage} %)`, nbMois: null };
}

async function dernierRisque(db, idContrat) {
    const r = await db.query(
        `SELECT vin, immatriculation, genre_vehicule, puissance_cv, cylindree_cm3, marque, modele, code_categorie_cima, caracterisation_risque, energie
         FROM site.mouvements
         WHERE id_contrat = $1 AND (vin IS NOT NULL OR immatriculation IS NOT NULL OR caracterisation_risque IS NOT NULL)
         ORDER BY date_effet DESC, id_mouvement DESC LIMIT 1`, [idContrat]);
    return r.rows[0] || null;
}

// 30/09/2026 (Roger, point 4) : rien n'empêchait jusqu'ici d'assurer deux
// fois le même risque (même VIN/immatriculation) sur des périodes qui se
// chevauchent, même partiellement -- vérifié à l'émission d'une affaire
// nouvelle ou d'un renouvellement (les deux mouvements qui "réclament" un
// véhicule pour toute une année). Compare contre le risque le plus
// récent de CHAQUE AUTRE police active (numero_police différent -- une
// police qui se renouvelle elle-même n'est jamais en conflit avec son
// propre historique). Bornes '[)' (06/10/2026, vocabulaire de Roger) : la
// date d'ÉCHÉANCE est le premier jour de renouvellement, donc NON couverte --
// une police qui commence le jour de l'échéance d'une autre ne la chevauche
// pas ('[]' la signalait à tort). Ne couvre pas encore le cas d'un changement de
// véhicule en cours de contrat par avenant (MOD) -- signalé, pas généralisé.
async function verifierChevauchementRisque(db, cleVehicule, numeroPoliceActuelle, dateEffet, dateEcheanceAnniversaire) {
    if (!cleVehicule) return null;
    const r = await db.query(
        `SELECT c.numero_police, c.date_effet::text AS effet, c.date_echeance::text AS echeance
         FROM site.contrats c
         JOIN LATERAL (
             SELECT COALESCE(vin, immatriculation) AS cle FROM site.mouvements m2
             WHERE m2.id_contrat = c.id_contrat AND (m2.vin IS NOT NULL OR m2.immatriculation IS NOT NULL)
             ORDER BY m2.date_effet DESC, m2.id_mouvement DESC LIMIT 1
         ) risque ON true
         WHERE c.statut_contrat NOT IN ('resilie', 'annule')
           AND c.numero_police <> $2
           AND risque.cle = $1
           AND daterange(c.date_effet, c.date_echeance, '[)') && daterange($3::date, $4::date, '[)')
         LIMIT 1`,
        [cleVehicule, numeroPoliceActuelle, dateEffet, dateEcheanceAnniversaire]);
    return r.rows[0] || null;
}

// Période en cours d'une police (la plus récente)
async function periodePolice(db, numero, verrouiller) {
    const r = await db.query(
        `SELECT c.*, c.date_effet::text AS date_effet_txt, c.date_echeance::text AS date_echeance_txt
         FROM site.contrats c WHERE upper(c.numero_police) = upper($1)
         ORDER BY c.date_effet DESC, c.id_contrat DESC LIMIT 1 ${verrouiller ? 'FOR UPDATE' : ''}`, [numero]);
    return r.rows[0] || null;
}

const SELECT_MOUVEMENTS = `
    SELECT m.id_mouvement, m.code_nature, n.libelle AS nature, n.mouvement_initial,
           m.date_emission::text AS date_emission, m.date_effet::text AS date_effet, m.date_echeance::text AS date_echeance,
           c.id_contrat, c.numero_police, c.compagnie_nom_emission AS compagnie,
           c.code_branche, b.libelle AS branche,
           m.cle_agence, a.nom AS point_de_vente, 'P' || lpad(a.ordre_affichage::text, 2, '0') AS code_point_de_vente,
           c.id_utilisateur, u.matricule,
           COALESCE(NULLIF(btrim(concat_ws(' ', u.prenom, u.nom)), ''), c.souscripteur_nom) AS souscripteur,
           m.vin, m.immatriculation, m.genre_vehicule, m.puissance_cv, m.cylindree_cm3, m.marque, m.modele,
           m.code_categorie_cima, m.caracterisation_risque, m.energie, m.prime_annuelle_reference,
           m.prime_nette, m.accessoires, m.fichier_central, m.taux_tva, m.tva, m.carte_rose, m.dta,
           m.autres_montant, m.autres_nature, m.prime_ttc,
           (m.prime_nette + m.accessoires + m.fichier_central) AS chiffre_affaires,
           m.dta_statut, m.dta_exercice, m.dta_code_categorie, m.dta_code_motif_exemption, m.dta_justificatif,
           cref.numero_police AS dta_police_reference, mref.date_effet::text AS dta_date_reference,
           m.statut_paiement, m.date_statut_paiement, m.observations, m.date_creation
    FROM site.mouvements m
    JOIN site.contrats c ON c.id_contrat = m.id_contrat
    JOIN site.production_natures_mouvement n ON n.code = m.code_nature
    JOIN site.agences a ON a.cle = m.cle_agence
    LEFT JOIN tarification.branche b ON b.code_branche = c.code_branche
    LEFT JOIN site.utilisateurs u ON u.id_utilisateur = c.id_utilisateur
    LEFT JOIN site.mouvements mref ON mref.id_mouvement = m.dta_id_mouvement_reference
    LEFT JOIN site.contrats cref ON cref.id_contrat = mref.id_contrat
`;

module.exports = function (pool) {
    const router = express.Router();
    const garde = [requireStaffAuth, requireStaffRole(ROLES_PRODUCTION)];

    // ------------------------------------------------------------------
    router.get('/staff/production/referentiels', ...garde, async (req, res) => {
        try {
            const nomsReferentiels = ['natures', 'points_de_vente', 'branches', 'categories_automobile', 'compagnies', 'frais_fixes', 'taux_tva', 'bareme_dta', 'motifs_exemption_dta', 'energies_vehicule', 'bareme_fractionnement'];
            const resultats = await Promise.allSettled([
                pool.query(`SELECT code, libelle, libelle_alternatif, rang, mouvement_initial, delivre_attestation, delivre_carte_rose, statut_contrat_resultant
                            FROM site.production_natures_mouvement WHERE actif AND proposee_en_saisie ORDER BY mouvement_initial DESC, rang, code`),
                pool.query(`SELECT cle, nom, ordre_affichage, 'P' || lpad(ordre_affichage::text, 2, '0') AS code_point_de_vente
                            FROM site.agences WHERE actif AND ordre_affichage >= 1 ORDER BY ordre_affichage`),
                pool.query(`SELECT b.code_branche, b.libelle, n.code_numerotation
                            FROM site.production_branches_numerotation n JOIN tarification.branche b USING (code_branche)
                            ORDER BY b.id_branche`),
                pool.query(`SELECT categorie_code, categorie_libelle, description FROM tarification.branche_categorie
                            WHERE branche_code = $1 ORDER BY categorie_code`, [BRANCHE_AUTOMOBILE]),
                pool.query(`SELECT id, nom FROM site.partenaires_assurance WHERE actif ORDER BY ordre_affichage NULLS LAST, nom`),
                pool.query(`SELECT code, libelle, montant FROM site.production_frais_fixes WHERE ${AUJOURDHUI_SQL} BETWEEN date_debut AND date_fin`),
                pool.query(`SELECT perimetre, taux FROM site.production_taux_tva WHERE ${AUJOURDHUI_SQL} BETWEEN date_debut AND date_fin`),
                pool.query(`SELECT code_categorie, libelle, genre_vehicule, cv_min, cv_max, montant FROM site.bareme_dta
                            WHERE ${AUJOURDHUI_SQL} BETWEEN date_debut AND date_fin ORDER BY montant`),
                pool.query(`SELECT code, libelle FROM site.dta_motifs_exemption ORDER BY ordre`),
                pool.query(`SELECT code_energie_vehicule AS code, libelle FROM referentiel.energie_vehicule WHERE actif ORDER BY ordre`),
                pool.query(`SELECT palier, jours_min, jours_max, pourcentage FROM site.bareme_fractionnement
                            WHERE ${AUJOURDHUI_SQL} BETWEEN date_debut AND date_fin ORDER BY jours_min`),
            ]);
            // Une table défaillante ne doit plus faire tomber le formulaire en
            // silence : on les nomme TOUTES (pas seulement la première), au lieu
            // du « erreur serveur » générique.
            const echecs = resultats.map((x, i) => ({ nom: nomsReferentiels[i], x })).filter((e) => e.x.status === 'rejected');
            if (echecs.length) {
                echecs.forEach((e) => console.error(`[GET /api/staff/production/referentiels] référentiel « ${e.nom} » en échec :`, e.x.reason && e.x.reason.message));
                const liste = echecs.map((e) => `${e.nom} (${(e.x.reason && e.x.reason.code) || 'erreur'})`).join(', ');
                return res.status(500).json({ succes: false, erreurs: [`Référentiel(s) indisponible(s) : ${liste}. Une migration est probablement à appliquer — détail dans le journal du serveur.`] });
            }
            const [natures, agences, branches, categories, compagnies, frais, tva, bareme, motifs, energies, fractionnement] = resultats.map((x) => x.value);
            return res.json({
                succes: true,
                version_route: VERSION_ROUTE,
                build_route: BUILD_ROUTE,
                natures: natures.rows, points_de_vente: agences.rows, branches: branches.rows,
                categories_automobile: categories.rows, compagnies: compagnies.rows,
                frais_fixes: frais.rows, taux_tva: tva.rows, bareme_dta: bareme.rows, motifs_exemption_dta: motifs.rows,
                energies_vehicule: energies.rows, bareme_fractionnement: fractionnement.rows,
                statuts_paiement: STATUTS_PAIEMENT,
            });
        } catch (err) { return repondreErreur(res, 'GET /api/staff/production/referentiels', err); }
    });

    // ------------------------------------------------------------------
    // Recherche OBLIGATOIRE d'une police existante pour un avenant ou un
    // renouvellement : échec = 404, jamais de création silencieuse.
    router.get('/staff/production/police', ...garde, async (req, res) => {
        const numero = texteOuNull(req.query.numero, 50);
        if (!numero) return res.status(400).json({ succes: false, erreurs: ['numéro de police requis'] });
        try {
            const c = await periodePolice(pool, numero, false);
            if (!c) return res.status(404).json({ succes: false, erreurs: [`police ${numero} introuvable — un avenant ne peut porter que sur une police existante`] });
            const u = c.id_utilisateur ? (await pool.query(`SELECT nom, prenom, matricule FROM site.utilisateurs WHERE id_utilisateur = $1`, [c.id_utilisateur])).rows[0] : null;
            const risque = await dernierRisque(pool, c.id_contrat);
            // Date Échéance (anniversaire, fixe) vs Expiration réellement
            // couverte à ce jour (dernier mouvement) -- deux notions
            // distinctes depuis le 28/09/2026 (Roger).
            const derniereExpiration = (await pool.query(
                `SELECT date_echeance::text AS d FROM site.mouvements WHERE id_contrat = $1 ORDER BY date_effet DESC, id_mouvement DESC LIMIT 1`,
                [c.id_contrat])).rows[0]?.d || c.date_effet_txt;
            return res.json({
                succes: true,
                contrat: {
                    id_contrat: c.id_contrat, numero_police: c.numero_police, compagnie: c.compagnie_nom_emission,
                    id_partenaire_assurance: c.id_partenaire_assurance,
                    code_branche: c.code_branche, libelle_produit: c.libelle_produit, cle_agence: c.cle_agence,
                    souscripteur: u ? `${u.prenom ? u.prenom + ' ' : ''}${u.nom}` : c.souscripteur_nom, matricule: u ? u.matricule : null,
                    date_effet: c.date_effet_txt, date_echeance: c.date_echeance_txt, derniere_expiration: derniereExpiration,
                    statut_contrat: c.statut_contrat,
                },
                risque,
            });
        } catch (err) { return repondreErreur(res, 'GET /api/staff/production/police', err); }
    });

    // ------------------------------------------------------------------
    router.get('/staff/production/dta', ...garde, async (req, res) => {
        const q = req.query;
        try {
            if (!estDateIso(q.date_effet)) throw new ErreurMetier(400, 'date d\'effet requise');
            const nature = (await pool.query(`SELECT * FROM site.production_natures_mouvement WHERE code = $1`, [q.code_nature])).rows[0];
            if (!nature) throw new ErreurMetier(400, 'nature de mouvement inconnue');
            const resultat = await evaluerDta(pool, {
                codeBranche: q.code_branche, nature,
                vin: normaliserVin(q.vin), immatriculation: normaliserImmat(q.immatriculation),
                genre: q.genre_vehicule, cv: q.puissance_cv ? Number(q.puissance_cv) : null,
                codeCategorie: texteOuNull(q.code_categorie, 20), dateEffet: q.date_effet,
                exemption: q.motif_exemption ? { motif: q.motif_exemption, justificatif: texteOuNull(q.justificatif, 200) || 'à fournir' } : null,
            });
            return res.json({ succes: true, dta: resultat });
        } catch (err) { return repondreErreur(res, 'GET /api/staff/production/dta', err); }
    });

    // ------------------------------------------------------------------
    // Prévisualisation du fractionnement (Tarif Ministériel, Art. 6 --
    // 26/09/2026) : palier applicable et prime annuelle équivalente pour
    // la prime nette et la période en cours de saisie. Simple aperçu ;
    // le calcul qui compte est celui, serveur, de l'émission elle-même.
    router.get('/staff/production/fractionnement', ...garde, async (req, res) => {
        const q = req.query;
        try {
            if (!estDateIso(q.date_effet) || !estDateIso(q.date_echeance)) throw new ErreurMetier(400, 'dates requises');
            const primeNette = q.prime_nette === undefined || q.prime_nette === '' ? 0 : Number(q.prime_nette);
            if (!Number.isInteger(primeNette)) throw new ErreurMetier(400, 'prime nette : nombre entier');
            const frac = await calculerFractionnement(pool, q.code_categorie || null, q.date_effet, q.date_echeance);
            const primeAnnuelle = primeNette > 0 ? Math.round(primeNette / (frac.pourcentage / 100)) : null;
            return res.json({ succes: true, fractionnement: { ...frac, prime_annuelle_reference: primeAnnuelle } });
        } catch (err) { return repondreErreur(res, 'GET /api/staff/production/fractionnement', err); }
    });

    // ------------------------------------------------------------------
    // Proposition d'accessoires (25/09/2026) : tarification.fn_frais_accessoires
    // choisit la ligne la plus précise du barème de la compagnie (risque,
    // puis palier de prime nette, puis durée), sinon le montant par
    // défaut de la compagnie. Simple PROPOSITION : le montant saisi reste
    // celui du gestionnaire. Tolérante : tant que le barème n'existe pas
    // encore en base, elle répond sans proposition (jamais d'erreur).
    router.get('/staff/production/accessoires', ...garde, async (req, res) => {
        const q = req.query;
        const idCompagnie = parseInt(q.id_partenaire_assurance, 10);
        const prime = q.prime_nette === undefined || q.prime_nette === '' ? 0 : Number(q.prime_nette);
        if (!Number.isInteger(idCompagnie) || !q.code_branche || !Number.isInteger(prime)
            || !estDateIso(q.date_effet) || !estDateIso(q.date_echeance)) {
            return res.json({ succes: true, proposition: null });
        }
        try {
            const r = await pool.query(
                `SELECT montant, origine, detail FROM tarification.fn_frais_accessoires($1, $2, $3, $4, $5::date, $6::date, ${AUJOURDHUI_SQL})`,
                [idCompagnie, q.code_branche, q.code_categorie || null, prime, q.date_effet, q.date_echeance]);
            const p = r.rows[0];
            return res.json({ succes: true, proposition: p ? { montant: Number(p.montant), origine: p.origine, detail: p.detail } : null });
        } catch (err) {
            // 42883 : fonction absente ; 42P01 : table absente ; 3F000 : schéma absent
            // 06/10/2026 -- tolérance conservée (la saisie manuelle reste possible),
            // mais plus silencieuse : l'erreur est journalisée et signalée dans la
            // réponse (`indisponible`). Un renommage de table côté tarification
            // (branches_categories -> branche_categorie, 02/10) faisait disparaître
            // la proposition sans laisser la moindre trace.
            if (['42883', '42P01', '3F000', '42501'].includes(err.code)) {
                console.error(`[GET /api/staff/production/accessoires] proposition indisponible (${err.code}) :`, err.message);
                return res.json({ succes: true, proposition: null, indisponible: err.code });
            }
            return repondreErreur(res, 'GET /api/staff/production/accessoires', err);
        }
    });

    // ------------------------------------------------------------------
    router.get('/staff/mouvements', ...garde, async (req, res) => {
        try {
            const r = await pool.query(`${SELECT_MOUVEMENTS} ORDER BY m.date_emission DESC, m.id_mouvement DESC`);
            return res.json({ succes: true, mouvements: r.rows });
        } catch (err) { return repondreErreur(res, 'GET /api/staff/mouvements', err); }
    });

    // ------------------------------------------------------------------
    router.post('/staff/mouvements', ...garde, async (req, res) => {
        const b = req.body || {};
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // --- Nature et point de vente
            const nature = (await client.query(
                `SELECT * FROM site.production_natures_mouvement WHERE code = $1 AND actif AND proposee_en_saisie`, [b.code_nature])).rows[0];
            if (!nature) throw new ErreurMetier(400, 'nature de mouvement inconnue ou non proposée en saisie');
            const agence = (await client.query(
                `SELECT cle, ordre_affichage FROM site.agences WHERE cle = $1 AND actif`, [b.cle_agence])).rows[0];
            if (!agence) throw new ErreurMetier(400, 'point de vente (gestionnaire) inconnu ou inactif');
            if (!(agence.ordre_affichage >= 1)) throw new ErreurMetier(400, 'ce point de vente n\'a pas de rang (ordre_affichage) : numérotation impossible');
            if (!estDateIso(b.date_effet)) throw new ErreurMetier(400, 'date d\'effet invalide');

            const aujourdhui = (await client.query(`SELECT ${AUJOURDHUI_SQL}::text AS j`)).rows[0].j;
            const primeNette = montant(b.prime_nette, true);
            const accessoires = montant(b.accessoires, true);
            const autresMontant = montant(b.autres_montant, true);
            if ([primeNette, accessoires, autresMontant].includes(undefined)) throw new ErreurMetier(400, 'montants : nombres entiers en FCFA');
            const autresNature = texteOuNull(b.autres_nature, 150);
            if (autresMontant !== 0 && !autresNature) throw new ErreurMetier(400, 'précisez la nature du montant « Autres »');
            if (!STATUTS_PAIEMENT.includes(b.statut_paiement || 'non_paye')) throw new ErreurMetier(400, 'statut de paiement inconnu');

            let contrat;          // contrat porteur du mouvement
            let dateEcheance;     // échéance du mouvement
            let numeroPolice;

            if (nature.code === 'NAF') {
                // --- Affaire nouvelle : nouveau contrat, numéro automatique
                const idCompagnie = parseInt(b.id_partenaire_assurance, 10);
                const compagnie = (await client.query(`SELECT nom FROM site.partenaires_assurance WHERE id = $1 AND actif`, [idCompagnie])).rows[0];
                if (!compagnie) throw new ErreurMetier(400, 'compagnie introuvable ou inactive');
                const branche = (await client.query(
                    `SELECT code_branche, code_numerotation FROM site.production_branches_numerotation WHERE code_branche = $1`, [b.code_branche])).rows[0];
                if (!branche) throw new ErreurMetier(400, 'branche inconnue');
                const idUtilisateur = b.id_utilisateur ? parseInt(b.id_utilisateur, 10) : null;
                // 26/09/2026 (remarque de Roger) : Utilisateur (le compte
                // plateforme) et Souscripteur (le titulaire légal du contrat)
                // sont deux rôles distincts qui coexistent -- même quand un
                // compte est rattaché, le contrat porte son propre nom de
                // souscripteur, reconstitué depuis le compte (jamais depuis
                // une valeur envoyée par le navigateur, pour rester la
                // source d'autorité).
                let souscripteurNom = texteOuNull(b.souscripteur_nom, 200);
                if (idUtilisateur) {
                    const titulaire = (await client.query(
                        `SELECT nom, prenom FROM site.utilisateurs WHERE id_utilisateur = $1`, [idUtilisateur])).rows[0];
                    if (!titulaire) throw new ErreurMetier(400, 'compte client introuvable');
                    souscripteurNom = `${titulaire.prenom} ${titulaire.nom}`.trim().slice(0, 200);
                }
                if (!idUtilisateur && !souscripteurNom) throw new ErreurMetier(400, 'rattachez un compte client ou saisissez le nom du souscripteur');
                // 28/09/2026 (Roger) : la Date Échéance (anniversaire) est
                // TOUJOURS effet + 1 an, jamais saisie -- distincte de
                // l'Expiration du mouvement (b.date_echeance), qui peut être
                // plus courte si un barème de fractionnement s'applique.
                const echeanceAnniversaire = dateEcheanceAnniversaire(b.date_effet);
                if (!estDateIso(b.date_echeance) || b.date_echeance <= b.date_effet) throw new ErreurMetier(400, 'l\'expiration doit être postérieure à la date d\'effet');
                if (b.date_echeance > echeanceAnniversaire) throw new ErreurMetier(400, `l'expiration ne peut dépasser la Date Échéance du contrat (${echeanceAnniversaire})`);
                dateEcheance = b.date_echeance;

                const annee = anneeDe(aujourdhui);
                const compteur = await client.query(
                    // Compteur PAR CODE BR (partagé par RC_GENERALE et RISQUES_TECHNIQUES, 13)
                    `INSERT INTO site.compteurs_polices (code_numerotation, annee, dernier_numero) VALUES ($1, $2, 1)
                     ON CONFLICT (code_numerotation, annee) DO UPDATE SET dernier_numero = site.compteurs_polices.dernier_numero + 1
                     RETURNING dernier_numero`, [branche.code_numerotation, annee]);
                // 28/09/2026 (Roger) : sériel forcé sur 5 chiffres dans
                // toute la codification -- corrige le format d'origine
                // (4 chiffres), qui avait aussi entraîné une mauvaise
                // lecture des raccourcis de police à 11/13 chiffres.
                numeroPolice = `P${String(agence.ordre_affichage).padStart(2, '0')} ${annee} ${branche.code_numerotation} ${String(compteur.rows[0].dernier_numero).padStart(5, '0')}`;

                contrat = (await client.query(
                    `INSERT INTO site.contrats
                        (numero_police, id_partenaire_assurance, compagnie_nom_emission, code_branche, libelle_produit,
                         id_utilisateur, souscripteur_nom, souscripteur_telephone, date_effet, date_echeance,
                         cle_agence, id_staff_createur)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
                    [numeroPolice, idCompagnie, compagnie.nom, branche.code_branche, texteOuNull(b.libelle_produit, 150),
                     idUtilisateur, souscripteurNom, texteOuNull(b.souscripteur_telephone, 20), b.date_effet, echeanceAnniversaire,
                     agence.cle, req.session.id_staff || null])).rows[0];
            } else {
                // --- Renouvellement ou avenant : police EXISTANTE obligatoire
                const numero = texteOuNull(b.numero_police, 50);
                if (!numero) throw new ErreurMetier(400, 'numéro de police requis');
                const periode = await periodePolice(client, numero, true);
                if (!periode) throw new ErreurMetier(404, `police ${numero} introuvable — un avenant ne peut porter que sur une police existante`);
                numeroPolice = periode.numero_police;

                if (nature.code === 'REN') {
                    if (!['en_cours', 'suspendu'].includes(periode.statut_contrat)) throw new ErreurMetier(409, 'seule une police en cours ou suspendue peut être renouvelée');
                    const echeanceAnniversaireRen = dateEcheanceAnniversaire(b.date_effet);
                    if (!estDateIso(b.date_echeance) || b.date_echeance <= b.date_effet) throw new ErreurMetier(400, 'l\'expiration doit être postérieure à la date d\'effet');
                    if (b.date_echeance > echeanceAnniversaireRen) throw new ErreurMetier(400, `l'expiration ne peut dépasser la Date Échéance du contrat (${echeanceAnniversaireRen})`);
                    dateEcheance = b.date_echeance;
                    // Nom de compagnie figé à CETTE émission (règle P1)
                    const nomCie = (await client.query(`SELECT nom FROM site.partenaires_assurance WHERE id = $1`, [periode.id_partenaire_assurance])).rows[0].nom;
                    contrat = (await client.query(
                        `INSERT INTO site.contrats
                            (numero_police, id_partenaire_assurance, compagnie_nom_emission, code_branche, libelle_produit,
                             id_utilisateur, souscripteur_nom, souscripteur_telephone, date_effet, date_echeance,
                             cle_agence, id_contrat_precedent, id_staff_createur)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
                        [periode.numero_police, periode.id_partenaire_assurance, nomCie, periode.code_branche, periode.libelle_produit,
                         periode.id_utilisateur, periode.souscripteur_nom, periode.souscripteur_telephone, b.date_effet, echeanceAnniversaireRen,
                         periode.cle_agence || agence.cle, periode.id_contrat, req.session.id_staff || null])).rows[0];
                    await client.query(
                        `UPDATE site.contrats SET statut_contrat = 'renouvele', statut_renouvellement = 'renouvele', date_modification = now()
                         WHERE id_contrat = $1`, [periode.id_contrat]);
                } else {
                    // Avenant sur la période en cours
                    contrat = periode;
                    const statut = periode.statut_contrat;
                    if (nature.code === 'RVI') {
                        if (statut !== 'suspendu') throw new ErreurMetier(409, 'une remise en vigueur ne s\'applique qu\'à une police suspendue');
                    } else if (!['en_cours', 'suspendu'].includes(statut)) {
                        throw new ErreurMetier(409, `police ${numero} ${statut === 'renouvele' ? 'déjà renouvelée' : 'résiliée ou annulée'} : aucun avenant possible`);
                    }
                    if (nature.code === 'SUS' && statut !== 'en_cours') throw new ErreurMetier(409, 'la police est déjà suspendue');
                    // 28/09/2026 (Roger) : periode.date_echeance_txt est
                    // maintenant la Date Échéance (anniversaire), fixe --
                    // la couverture RÉELLEMENT en vigueur est bornée par
                    // l'Expiration du DERNIER mouvement, qui peut être plus
                    // courte (fractionnement). C'est CETTE borne qui compte
                    // pour situer un avenant dans la période courante.
                    const derniereExpiration = (await client.query(
                        `SELECT date_echeance::text AS d FROM site.mouvements WHERE id_contrat = $1 ORDER BY date_effet DESC, id_mouvement DESC LIMIT 1`,
                        [periode.id_contrat])).rows[0]?.d || periode.date_effet_txt;

                    if (nature.code === 'RED') {
                        // Report de dates (Roger, 28/09) : décale la date
                        // d'effet, l'Expiration ET la Date Échéance du même
                        // nombre de jours exactement -- le seul avenant qui
                        // touche l'anniversaire du contrat. Sans effet sur
                        // la prime nette. Redéfinit la période elle-même :
                        // ne passe donc PAS par le contrôle de borne
                        // générique ci-dessous (fait pour situer un avenant
                        // DANS la période existante, pas pour la déplacer).
                        if (!estDateIso(b.date_effet)) throw new ErreurMetier(400, 'nouvelle date d\'effet requise pour le report de dates');
                        const decalageJours = Math.round((new Date(b.date_effet) - new Date(periode.date_effet_txt)) / 86400000);
                        if (decalageJours === 0) throw new ErreurMetier(400, 'report de dates : la nouvelle date d\'effet doit différer de l\'actuelle');
                        const nouvelleEcheance = decalerDateIso(periode.date_echeance_txt, decalageJours);
                        dateEcheance = decalerDateIso(derniereExpiration, decalageJours);
                        await client.query(`UPDATE site.contrats SET date_effet = $2, date_echeance = $3, date_modification = now() WHERE id_contrat = $1`,
                            [periode.id_contrat, b.date_effet, nouvelleEcheance]);
                    } else {
                        if (b.date_effet < periode.date_effet_txt || b.date_effet >= derniereExpiration) {
                            throw new ErreurMetier(400, `la date d'effet de l'avenant doit être comprise dans la période actuellement couverte (${periode.date_effet_txt} → ${derniereExpiration})`);
                        }
                        dateEcheance = derniereExpiration;
                    }
                    if (nature.code === 'PRG') {
                        // Prorogation : avance l'Expiration, sans jamais
                        // dépasser la Date Échéance (l'anniversaire, fixe) --
                        // celle-ci n'est PLUS modifiée par une prorogation
                        // (avant le 28/09, PRG l'étendait à tort). La règle
                        // des 105% du Tarif Ministériel pour le barème
                        // Courte période reste à construire (barème de
                        // tarification pas encore modélisé).
                        if (!estDateIso(b.date_echeance) || b.date_echeance <= derniereExpiration) {
                            throw new ErreurMetier(400, 'prorogation : la nouvelle expiration doit être postérieure à l\'expiration actuelle');
                        }
                        if (b.date_echeance > periode.date_echeance_txt) {
                            throw new ErreurMetier(400, `prorogation : l'expiration ne peut dépasser la Date Échéance du contrat (${periode.date_echeance_txt})`);
                        }
                        dateEcheance = b.date_echeance;
                    }
                    if (nature.statut_contrat_resultant) {
                        await client.query(`UPDATE site.contrats SET statut_contrat = $2, date_modification = now() WHERE id_contrat = $1`,
                            [periode.id_contrat, nature.statut_contrat_resultant]);
                    }
                }
            }

            // --- Risque : saisi, sinon hérité du dernier mouvement de la police
            const estAuto = contrat.code_branche === BRANCHE_AUTOMOBILE;
            const herite = (!b.vin && !b.immatriculation && !b.caracterisation_risque)
                ? await dernierRisque(client, contrat.id_contrat_precedent && nature.code === 'REN' ? contrat.id_contrat_precedent : contrat.id_contrat)
                : null;
            const src = herite || {};
            const vin = normaliserVin(b.vin) || src.vin || null;
            const immatriculation = normaliserImmat(b.immatriculation) || src.immatriculation || null;
            // 30/09/2026 (Roger, point 4) : NAF/REN "réclament" un véhicule
            // pour toute l'année du contrat -- vérifié ici, une fois les
            // deux connus. contrat.date_effet/date_echeance sont déjà les
            // bonnes bornes (la ligne vient d'être insérée pour NAF/REN,
            // avec la Date Échéance = anniversaire, calculée plus haut).
            if (['NAF', 'REN'].includes(nature.code)) {
                const cleVehicule = vin || immatriculation;
                const conflit = await verifierChevauchementRisque(client, cleVehicule, numeroPolice, contrat.date_effet, contrat.date_echeance);
                if (conflit) {
                    throw new ErreurMetier(409, `ce véhicule est déjà couvert par la police ${conflit.numero_police} du ${conflit.effet} au ${conflit.echeance} -- périodes qui se chevauchent`);
                }
            }
            const genre = b.genre_vehicule || src.genre_vehicule || null;
            const cv = b.puissance_cv !== undefined && b.puissance_cv !== null && b.puissance_cv !== '' ? Number(b.puissance_cv) : (src.puissance_cv || null);
            if (cv !== null && !(Number.isInteger(cv) && cv > 0)) throw new ErreurMetier(400, 'puissance fiscale : entier positif (CV)');
            // Cylindrée (cm³) -- genres MOTO2/MOTO3 (topo 27/09/2026) ;
            // champ distinct de puissance_cv, jamais l'un pour l'autre.
            const cylindree = b.cylindree_cm3 !== undefined && b.cylindree_cm3 !== null && b.cylindree_cm3 !== '' ? Number(b.cylindree_cm3) : (src.cylindree_cm3 || null);
            if (cylindree !== null && !(Number.isInteger(cylindree) && cylindree > 0)) throw new ErreurMetier(400, 'cylindrée : entier positif (cm³)');
            if (vin && vin.length > 17) throw new ErreurMetier(400, 'VIN : 17 caractères au plus');
            if (genre && !GENRES.includes(genre)) throw new ErreurMetier(400, 'genre de véhicule inconnu');
            const codeCategorieCima = estAuto ? (b.code_categorie_cima || src.code_categorie_cima || null) : null;
            // 26/09/2026 -- liste PROPOSÉE par l'addendum 3, en table datée
            // (referentiel.energie_vehicule) : à confirmer par Roger.
            const energie = estAuto ? (texteOuNull(b.energie, 20) || src.energie || null) : null;
            if (energie) {
                const e = await client.query(`SELECT 1 FROM referentiel.energie_vehicule WHERE code_energie_vehicule = $1 AND actif`, [energie]);
                if (!e.rows.length) throw new ErreurMetier(400, 'énergie du véhicule inconnue');
            }

            // --- Montants dérivés (jamais repris du navigateur)
            const fichierCentral = await fraisFixe(client, 'FICHIER_CENTRAL', aujourdhui);
            const taux = await tauxTva(client, contrat.code_branche, aujourdhui);
            // TVA sur (Prime nette + Accessoires + Fichier central) -- Roger, 25/09 ;
            // ni la carte rose ni le DTA n'entrent dans la base
            const tva = Math.round((primeNette + accessoires + fichierCentral) * taux / 100);
            const carteRose = estAuto && nature.delivre_carte_rose ? await fraisFixe(client, 'CARTE_ROSE', aujourdhui) : 0;
            const dta = await evaluerDta(client, {
                codeBranche: contrat.code_branche, nature, vin, immatriculation, genre, cv, codeCategorie: codeCategorieCima, dateEffet: b.date_effet,
                exemption: b.dta_motif_exemption ? { motif: b.dta_motif_exemption, justificatif: texteOuNull(b.dta_justificatif, 200) } : null,
            });
            const primeTtc = primeNette + accessoires + fichierCentral + tva + carteRose + dta.montant + autresMontant;

            // Extraction de l'annuité (addendum3 §3.3, 26/09/2026) : prime
            // annuelle équivalente, déduite de la prime nette par le palier
            // de fractionnement (Art. 6). Seulement pour un mouvement
            // initial (NAF/REN) automobile à prime positive -- la prime
            // nette d'un avenant n'est pas une prime de garantie complète.
            let primeAnnuelleReference = null;
            if (nature.mouvement_initial && estAuto && primeNette > 0) {
                const frac = await calculerFractionnement(client, codeCategorieCima, b.date_effet, dateEcheance);
                primeAnnuelleReference = Math.round(primeNette / (frac.pourcentage / 100));
            }

            const mvt = (await client.query(
                `INSERT INTO site.mouvements
                    (id_contrat, code_nature, cle_agence, date_emission, date_effet, date_echeance,
                     vin, immatriculation, genre_vehicule, puissance_cv, marque, modele, code_categorie_cima, caracterisation_risque,
                     prime_nette, accessoires, fichier_central, taux_tva, tva, carte_rose, dta, autres_montant, autres_nature, prime_ttc,
                     dta_statut, dta_exercice, dta_code_categorie, dta_id_mouvement_reference, dta_code_motif_exemption, dta_justificatif,
                     statut_paiement, date_statut_paiement, observations, id_staff_createur, energie, prime_annuelle_reference, cylindree_cm3)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,
                         $25,$26,$27,$28,$29,$30,$31, CASE WHEN $34 THEN now() END, $32,$33,$35,$36,$37)
                 RETURNING id_mouvement`,
                [contrat.id_contrat, nature.code, agence.cle, aujourdhui, b.date_effet, dateEcheance,
                 vin, immatriculation, genre, cv,
                 texteOuNull(b.marque, 80) || src.marque || null, texteOuNull(b.modele, 120) || src.modele || null,
                 codeCategorieCima,
                 texteOuNull(b.caracterisation_risque, 2000) || src.caracterisation_risque || null,
                 primeNette, accessoires, fichierCentral, taux, tva, carteRose, dta.montant, autresMontant, autresNature, primeTtc,
                 dta.statut, dta.exercice, dta.categorie || null, dta.reference ? dta.reference.id_mouvement : null,
                 dta.statut === 'exempte' ? b.dta_motif_exemption : null, dta.statut === 'exempte' ? texteOuNull(b.dta_justificatif, 200) : null,
                 b.statut_paiement || 'non_paye', texteOuNull(b.observations, 5000), req.session.id_staff || null,
                 (b.statut_paiement || 'non_paye') !== 'non_paye', energie, primeAnnuelleReference, cylindree])).rows[0];

            // Primes de la période (lues par l'Échéancier et Mes contrats, P1) :
            // celles du mouvement initial de la période
            if (nature.mouvement_initial) {
                await client.query(`UPDATE site.contrats SET prime_nette = $2, prime_ttc = $3 WHERE id_contrat = $1`,
                    [contrat.id_contrat, primeNette, primeTtc]);
            }

            await client.query('COMMIT');
            return res.status(201).json({
                succes: true, id_mouvement: mvt.id_mouvement, id_contrat: contrat.id_contrat, numero_police: numeroPolice,
                prime_ttc: primeTtc, dta, avertissement_dta: dta.avertissement || null, prime_annuelle_reference: primeAnnuelleReference,
            });
        } catch (err) {
            await client.query('ROLLBACK').catch(() => {});
            return repondreErreur(res, 'POST /api/staff/mouvements', err);
        } finally {
            client.release();
        }
    });

    // ------------------------------------------------------------------
    router.patch('/staff/mouvements/:id/paiement', ...garde, async (req, res) => {
        const id = parseInt(req.params.id, 10);
        const statut = (req.body || {}).statut_paiement;
        if (!Number.isInteger(id)) return res.status(400).json({ succes: false, erreurs: ['identifiant invalide'] });
        if (!STATUTS_PAIEMENT.includes(statut)) return res.status(400).json({ succes: false, erreurs: ['statut de paiement inconnu'] });
        try {
            const r = await pool.query(
                `UPDATE site.mouvements SET statut_paiement = $2, date_statut_paiement = now()
                 WHERE id_mouvement = $1 RETURNING id_mouvement`, [id, statut]);
            if (!r.rows.length) return res.status(404).json({ succes: false, erreurs: ['mouvement introuvable'] });
            return res.json({ succes: true });
        } catch (err) { return repondreErreur(res, 'PATCH /api/staff/mouvements/:id/paiement', err); }
    });

    return router;
};
