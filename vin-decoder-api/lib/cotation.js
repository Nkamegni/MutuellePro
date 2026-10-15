// =====================================================================
// Mutuelle Pro Assurances — Production & Souscription
// lib/cotation.js : service de cotation unique (devis du site public, devis
// en production, plus tard l'émission) -- PREMIÈRE VERSION, 15/10/2026
// =====================================================================
// Propriétaire : Production (myspace), branche feat/myspace-core.
// Reçoit la connexion à la base en paramètre (comme mouvements.routes.js).
// NOUVEAU FICHIER : mouvements.routes.js n'est PAS modifié ; l'émission
// ne l'appelle pas encore (étape ultérieure, en différences, avec essais
// de comparaison depuis le build 2026-10-13-a, MD5 f6c59449…).
//
// CE QUI EST CALCULÉ (v1) -- et rien d'autre :
//   * RC automobile : prime ANNUELLE lue dans
//     tarification.fn_calculer_prime_rc_automobile (compagnie 0), puis
//     fractionnée sur la période (annuité x pourcentage).
//   * Fractionnement : pool TPV (04A, 04B, 04C) = mois calendaires n/12,
//     mois entamé = mois entier, SANS plafond de 105 % (Roger, 13/10) ;
//     autres catégories = palier de site.bareme_fractionnement selon
//     la durée expiration - effet + 1 en jours (art. 3-2), barème lu à la
//     DATE D'EFFET (et non CURRENT_DATE, correction demandée le 13/10).
//   * DTA : montant du barème seulement (genre, catégorie, CV, date d'effet).
//     Jamais de recherche « déjà acquittée » ici : celle-ci reste dans
//     evaluerDta, réservée au personnel connecté (risque d'oracle).
//
// CE QUI N'EST PAS CALCULÉ (listé dans chaque réponse, jamais caché) :
//   Défense et Recours, IAC/IPT (minimum acceptable : RC + DR + IAC/IPT,
//   donc la cotation n'est PAS présentable comme complète), garanties
//   facultatives, malus (art. 5), bonification (art. 6), majorations
//   (art. 9, surprimes migration 062), accessoires, TVA, carte rose, TTC.
//
// Tarif absent : la fonction SQL renvoie NULL (jamais 0). Ici :
//   annuite = 0, tarif_absent = true, avertissements recopiés ; l'appelant
//   laisse le montant modifiable (décision de Roger, 13/10). Le site public
//   n'affiche jamais ce 0 comme un prix.
// =====================================================================

const VERSION_COTATION = '2026-10-15-a';

// Pool TPV : exclusivement ces catégories (Roger, 13/10/2026).
const CATEGORIES_POOL_TPV = ['04A', '04B', '04C'];
const GENRES = ['MOTO2', 'MOTO3', 'VEHICULE'];

class ErreurCotation extends Error {
    constructor(statut, message) { super(message); this.statut = statut; }
}

function estDateIso(v) {
    return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
}
function texte(v, max) {
    if (v === null || v === undefined) return null;
    const t = String(v).trim();
    return t ? t.slice(0, max) : null;
}
function entierOuNull(v) {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isInteger(n) ? n : NaN;
}
function booleenOuNull(v) {
    if (v === null || v === undefined || v === '') return null;
    if (v === true || v === 'true' || v === '1' || v === 1) return true;
    if (v === false || v === 'false' || v === '0' || v === 0) return false;
    return undefined;
}
function normaliserVin(v) {
    const t = texte(v, 40);
    return t ? t.toUpperCase().replace(/[^A-Z0-9]/g, '') || null : null;
}

// ---------------------------------------------------------------------
// Fractionnement (art. 3-2) -- barème lu à la date d'effet
// ---------------------------------------------------------------------
async function calculerFractionnement(db, codeCategorie, dateEffet, dateExpiration) {
    if (CATEGORIES_POOL_TPV.includes(codeCategorie)) {
        // n = plus petit entier tel que effet + n mois > expiration (expiration incluse).
        const r = await db.query(
            `SELECT COALESCE((SELECT min(n) FROM generate_series(1, 12) AS n
                               WHERE ($1::date + make_interval(months => n))::date > $2::date), 12) AS nb_mois`,
            [dateEffet, dateExpiration]);
        const nbMois = Number(r.rows[0].nb_mois);
        return { mode: 'MENSUEL_CALENDAIRE', pourcentage: nbMois / 12 * 100, nb_mois: nbMois, jours: null,
                 libelle: `${nbMois}/12 (pool TPV, mois calendaires, mois entamé = mois entier)` };
    }
    const r = await db.query(`SELECT ($2::date - $1::date)::int + 1 AS jours`, [dateEffet, dateExpiration]);
    const jours = Number(r.rows[0].jours);
    // Hors 1..366 jours : prime déjà annuelle, repli à 100 % (jamais un rejet).
    if (jours <= 0 || jours > 366) {
        return { mode: 'PALIERS_JOURS', pourcentage: 100, nb_mois: null, jours, libelle: null,
                 avertissement: 'durée hors barème de fractionnement : 100 % appliqué' };
    }
    const b = await db.query(
        `SELECT palier, pourcentage FROM site.bareme_fractionnement
         WHERE $1 BETWEEN jours_min AND jours_max AND $2::date BETWEEN date_debut AND date_fin
         LIMIT 1`, [jours, dateEffet]);
    if (!b.rows.length) {
        return { mode: 'PALIERS_JOURS', pourcentage: 100, nb_mois: null, jours, libelle: null,
                 avertissement: 'aucun palier de fractionnement à cette date : 100 % appliqué' };
    }
    return { mode: 'PALIERS_JOURS', pourcentage: Number(b.rows[0].pourcentage), nb_mois: null, jours,
             libelle: `palier ${b.rows[0].palier} (${jours} jours, ${b.rows[0].pourcentage} %)` };
}

// ---------------------------------------------------------------------
// RC annuelle : appel de la fonction de Tarification (signature DÉPLOYÉE,
// 16 paramètres, relevée par \df+ le 13/10/2026). Notation nommée : seuls les
// paramètres renseignés sont passés, les valeurs par défaut de la fonction
// (dont p_energie = 'ESSENCE') restent celles de Tarification.
// ---------------------------------------------------------------------
const PARAMETRES_RC = [
    ['p_categorie_code', 'categorieCode'], ['p_zone', 'zone'], ['p_force_fiscale', 'puissanceCv'],
    ['p_cylindree_label', 'cylindreeLabel'], ['p_nombre_places', 'nombrePlaces'],
    ['p_avec_remorque', 'avecRemorque'], ['p_matiere_inflammable', 'matiereInflammable'],
    ['p_avec_double_commande', 'avecDoubleCommande'], ['p_avec_rc_eleves', 'avecRcEleves'],
    ['p_tonnage_label', 'tonnageLabel'], ['p_nombre_cartes', 'nombreCartes'],
    ['p_rang_vehicule', 'rangVehicule'], ['p_type_vehicule_base', 'typeVehiculeBase'],
    ['p_vin', 'vin'], ['p_date_effet', 'dateEffet'], ['p_energie', 'energie'],
];

function construireAppelRc(e) {
    const noms = [], valeurs = [];
    for (const [param, cle] of PARAMETRES_RC) {
        if (e[cle] === null || e[cle] === undefined) continue;
        valeurs.push(e[cle]);
        noms.push(`${param} => $${valeurs.length}`);
    }
    return { sql: `SELECT * FROM tarification.fn_calculer_prime_rc_automobile(${noms.join(', ')})`, valeurs };
}

async function annuiteRc(db, e) {
    const { sql, valeurs } = construireAppelRc(e);
    const r = await db.query(sql, valeurs);
    const ligne = r.rows[0] || null;
    const avertissements = ligne && Array.isArray(ligne.avertissements) ? ligne.avertissements : [];
    const brut = ligne ? (ligne.prime_totale ?? ligne.prime_base) : null;
    if (brut === null || brut === undefined) {
        return { annuite: 0, tarif_absent: true, avertissements,
                 source: ligne ? { id_tarif: ligne.id_tarif ?? null } : null };
    }
    return {
        annuite: Math.round(Number(brut)), tarif_absent: false, avertissements,
        prime_base: ligne.prime_base === null ? null : Math.round(Number(ligne.prime_base)),
        surprime_matiere_inflammable: ligne.surprime_matiere_inflam === null ? 0 : Math.round(Number(ligne.surprime_matiere_inflam)),
        source: { id_tarif: ligne.id_tarif ?? null, id_bareme_base: ligne.id_bareme_base ?? null,
                  id_bareme_surprime: ligne.id_bareme_surprime ?? null, source_page: ligne.source_page ?? null,
                  force_fiscale_utilisee: ligne.force_fiscale_utilisee ?? null, cylindree_utilisee: ligne.cylindree_utilisee ?? null },
    };
}

// ---------------------------------------------------------------------
// DTA par barème seulement (aucune recherche de véhicule)
// ---------------------------------------------------------------------
async function dtaParBareme(db, { genreVehicule, categorieCode, puissanceCv, dateEffet }) {
    if (!GENRES.includes(genreVehicule)) return { statut: 'non_calculee', motif: 'genre du véhicule non renseigné' };
    if (genreVehicule === 'VEHICULE' && !(Number.isInteger(puissanceCv) && puissanceCv > 0)) {
        return { statut: 'non_calculee', motif: 'puissance fiscale non renseignée' };
    }
    const r = await db.query(
        `SELECT code_categorie, libelle, montant, cv_min, cv_max FROM site.bareme_dta
         WHERE genre_vehicule = $1 AND (code_categorie = $2 OR code_categorie IS NULL)
           AND $4::date BETWEEN date_debut AND date_fin
           AND (cv_min IS NULL OR $3::int >= cv_min) AND (cv_max IS NULL OR $3::int <= cv_max)
         ORDER BY (code_categorie IS NOT NULL) DESC, date_debut DESC LIMIT 1`,
        [genreVehicule, categorieCode, genreVehicule === 'VEHICULE' ? puissanceCv : 0, dateEffet]);
    if (!r.rows.length) return { statut: 'bareme_absent', motif: 'aucune ligne du barème DTA pour ce véhicule à cette date' };
    const l = r.rows[0];
    return { statut: 'du', montant: Number(l.montant), categorie: l.code_categorie, libelle: l.libelle,
             tranche: { cv_min: l.cv_min, cv_max: l.cv_max } };
}

// ---------------------------------------------------------------------
// Ce que la cotation sait et ne sait pas calculer -- toujours renvoyé
// ---------------------------------------------------------------------
function detailCalcule(rc) {
    const nonCalcule = (code, libelle, motif) => ({ code, libelle, calcule: false, motif });
    return {
        garanties: [
            { code: 'RC', libelle: 'Responsabilité civile (annuité fractionnée sur la période)', calcule: !rc.tarif_absent,
              motif: rc.tarif_absent ? 'tarif absent : montant à saisir' : null },
            nonCalcule('DEFENSE_RECOURS', 'Défense et Recours', 'pas encore calculée (Tarification)'),
            nonCalcule('IAC_IPT', 'Individuelle accidents / personnes transportées', 'pas encore calculée (source du tarif à fixer)'),
            nonCalcule('FACULTATIVES', 'Garanties facultatives', 'pas encore calculées'),
        ],
        modificateurs: [
            nonCalcule('MALUS_ART5', 'Malus (art. 5)', 'non calculé'),
            nonCalcule('BONIFICATION_ART6', 'Bonification pour non-déclaration de sinistre (art. 6)', 'non calculée'),
            nonCalcule('MAJORATIONS_ART9', 'Majorations de l\'article 9 et surprimes (migration 062)', 'non lues par la fonction de calcul'),
        ],
        autres_postes: [
            nonCalcule('ACCESSOIRES', 'Accessoires', 'hors v1'),
            nonCalcule('TVA', 'TVA', 'hors v1'),
            nonCalcule('CARTE_ROSE', 'Carte rose', 'hors v1'),
        ],
    };
}

// ---------------------------------------------------------------------
// Cotation automobile : point d'entrée unique
// ---------------------------------------------------------------------
function validerEntree(brut) {
    const e = {
        categorieCode: texte(brut.categorieCode, 20), zone: texte(brut.zone, 1),
        puissanceCv: entierOuNull(brut.puissanceCv), cylindreeLabel: texte(brut.cylindreeLabel, 40),
        nombrePlaces: entierOuNull(brut.nombrePlaces), avecRemorque: booleenOuNull(brut.avecRemorque),
        matiereInflammable: booleenOuNull(brut.matiereInflammable),
        avecDoubleCommande: booleenOuNull(brut.avecDoubleCommande), avecRcEleves: booleenOuNull(brut.avecRcEleves),
        tonnageLabel: texte(brut.tonnageLabel, 40), nombreCartes: entierOuNull(brut.nombreCartes),
        rangVehicule: texte(brut.rangVehicule, 20), typeVehiculeBase: texte(brut.typeVehiculeBase, 40),
        vin: normaliserVin(brut.vin), energie: texte(brut.energie, 40), genreVehicule: texte(brut.genreVehicule, 10),
        dateEffet: brut.dateEffet, dateExpiration: brut.dateExpiration,
    };
    if (!e.categorieCode) throw new ErreurCotation(400, 'catégorie CIMA requise');
    if (e.categorieCode === '99') throw new ErreurCotation(400, 'la catégorie 99 (flotte) ne se cote pas ici : une flotte contient plusieurs catégories');
    if (!estDateIso(e.dateEffet) || !estDateIso(e.dateExpiration)) throw new ErreurCotation(400, 'dates d\'effet et d\'expiration requises (AAAA-MM-JJ)');
    if (e.dateExpiration < e.dateEffet) throw new ErreurCotation(400, 'l\'expiration précède l\'effet');
    for (const cle of ['puissanceCv', 'nombrePlaces', 'nombreCartes']) {
        if (Number.isNaN(e[cle])) throw new ErreurCotation(400, `${cle} : nombre entier attendu`);
    }
    for (const cle of ['avecRemorque', 'matiereInflammable', 'avecDoubleCommande', 'avecRcEleves']) {
        if (e[cle] === undefined) throw new ErreurCotation(400, `${cle} : vrai ou faux attendu`);
    }
    if (e.genreVehicule && !GENRES.includes(e.genreVehicule)) throw new ErreurCotation(400, 'genre du véhicule inconnu');
    return e;
}

async function cotationAutomobile(db, brut) {
    const e = validerEntree(brut || {});
    const fractionnement = await calculerFractionnement(db, e.categorieCode, e.dateEffet, e.dateExpiration);
    const rc = await annuiteRc(db, e);
    const primeRcPeriode = Math.round(rc.annuite * fractionnement.pourcentage / 100);
    const dta = await dtaParBareme(db, e);
    const detail = detailCalcule(rc);
    const avertissements = [...rc.avertissements];
    if (fractionnement.avertissement) avertissements.push(fractionnement.avertissement);
    if (rc.tarif_absent) avertissements.push('tarif RC absent : annuité 0, à saisir');
    return {
        version_cotation: VERSION_COTATION,
        complete: false,   // tant que Défense-Recours et IAC/IPT ne sont pas calculées
        presentable_comme_prix: false,
        periode: { effet: e.dateEffet, expiration: e.dateExpiration },
        rc: {
            annuite: rc.annuite, tarif_absent: rc.tarif_absent, fractionnement,
            prime_nette_periode: primeRcPeriode, detail_tarif: rc.source,
            prime_base: rc.prime_base ?? null, surprime_matiere_inflammable: rc.surprime_matiere_inflammable ?? null,
        },
        dta,
        total_calcule: { prime_nette_rc_periode: primeRcPeriode,
                         libelle: 'RC seule : ni Défense-Recours, ni IAC/IPT, ni accessoires, ni taxes' },
        calcule: detail,
        avertissements,
    };
}

module.exports = {
    VERSION_COTATION, CATEGORIES_POOL_TPV, ErreurCotation,
    cotationAutomobile, calculerFractionnement, annuiteRc, dtaParBareme, construireAppelRc, validerEntree,
};
