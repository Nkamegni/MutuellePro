// =====================================================================
// Mutuelle Pro Assurances -- Logique 2FA partagee entre les 3 roles
// Redige le 02/09/2026 -- un seul endroit a faire evoluer plutot que
// de tripler cette logique dans les 3 fichiers de connexion.
// =====================================================================

const crypto = require('crypto');
const { gabaritEmail, corpsCodeConnexion } = require('./gabaritEmail');
const { analyserNavigateur, analyserSysteme } = require('./analyseurUserAgent');

const DUREE_VALIDITE_MS = 10 * 60 * 1000; // 10 minutes, fidele au gabarit de Roger
const MAX_TENTATIVES = 5;

// Marqueur invisible sur l'objet (09/09/2026, demande explicite de Roger)
// -- des tentatives de connexion successives envoient plusieurs codes
// avec le MEME objet ; la plupart des messageries (Gmail, Outlook) les
// regroupent alors en un seul fil, obligeant à dérouler pour trouver le
// dernier code reçu. Deux caractères Unicode à largeur zéro (invisibles
// à l'affichage, jamais rendus) encodent l'horodatage en binaire --
// chaque objet devient une chaîne techniquement unique à la milliseconde
// près, sans jamais rien changer à ce que voit le destinataire.
function marqueurInvisible() {
    const ZWSP = '\u200B'; // largeur zero -- bit 0
    const ZWNJ = '\u200C'; // largeur zero -- bit 1
    return Date.now().toString(2).split('').map((bit) => (bit === '1' ? ZWNJ : ZWSP)).join('');
}

// Genere un code, l'enregistre, l'envoie par email. Ne cree PAS de
// session -- c'est verifierCode() qui le fera, une fois le code valide.
async function genererEtEnvoyerCode({ pool, mailTransporter, typeCompte, idCompte, email, nomComplet, referenceCompte, req }) {
    const code = crypto.randomInt(100000, 999999).toString();
    const dateExpiration = new Date(Date.now() + DUREE_VALIDITE_MS);

    await pool.query(
        `INSERT INTO site.codes_verification_connexion (type_compte, id_compte, code, date_expiration)
         VALUES ($1, $2, $3, $4)`,
        [typeCompte, idCompte, code, dateExpiration]
    );

    // Envoi de l'email -- ICI volontairement attendu (pas non-bloquant
    // comme "Connexion réussie") : sans ce code, l'utilisateur ne peut
    // pas continuer, donc un échec d'envoi doit être visible tout de
    // suite, pas silencieux.
    const infoEnvoi = await mailTransporter.sendMail({
        from: '"Mutuelle Pro Assurances" <no-reply@mutuelleproassurances.com>',
        to: email,
        subject: 'Votre code de connexion Mutuelle Pro Assurances' + marqueurInvisible(),
        html: gabaritEmail('Votre code de connexion', corpsCodeConnexion({
            nomComplet, typeCompte, referenceCompte, code,
            date: new Date(), ip: req.ip,
            navigateur: analyserNavigateur(req.headers['user-agent']),
            systeme: analyserSysteme(req.headers['user-agent']),
        })),
    });

    // Journal des envois no-reply@ (11/09/2026, demandé par la session
    // "Création d'un serveur de messagerie") -- alimente leur filtre
    // Sieve conditionnel côté serveur : no-reply@ ne doit répondre
    // automatiquement que si le message reçu est une vraie réponse à
    // un envoi réel. Volontairement non-bloquant (try/catch propre,
    // jamais throw) -- un échec de journalisation ne doit jamais
    // empêcher l'utilisateur de recevoir son code, seul l'envoi
    // lui-même (ci-dessus) est critique.
    try {
        await pool.query(
            `INSERT INTO site.no_reply_messages_envoyes (message_id, destinataire, type_message, reference_compte)
             VALUES ($1, $2, $3, $4)`,
            [infoEnvoi.messageId, email, 'code_connexion', referenceCompte || null]
        );
    } catch (err) {
        console.error('[genererEtEnvoyerCode] Erreur journalisation no_reply_messages_envoyes (ignorée) :', err);
    }
}

// Verifie un code -- ne cree jamais de session elle-meme, se contente
// de dire si le code est valide. La creation de session reste dans
// chaque route de connexion (regenerate() ne peut pas etre partage
// proprement a cause de la fermeture sur req/res propre a chaque route).
async function verifierCode({ pool, typeCompte, idCompte, code }) {
    const resultat = await pool.query(
        `SELECT id_code, date_expiration, tentatives, utilise FROM site.codes_verification_connexion
         WHERE type_compte = $1 AND id_compte = $2 AND utilise = false
         ORDER BY date_creation DESC LIMIT 1`,
        [typeCompte, idCompte]
    );

    if (resultat.rowCount === 0) {
        return { valide: false, motif: 'aucun_code_actif' };
    }
    const ligne = resultat.rows[0];

    if (ligne.tentatives >= MAX_TENTATIVES) {
        return { valide: false, motif: 'trop_de_tentatives' };
    }
    if (new Date(ligne.date_expiration) < new Date()) {
        return { valide: false, motif: 'expire' };
    }

    const correspondance = await pool.query(
        `SELECT id_code FROM site.codes_verification_connexion WHERE id_code = $1 AND code = $2`,
        [ligne.id_code, code]
    );

    if (correspondance.rowCount === 0) {
        await pool.query(
            `UPDATE site.codes_verification_connexion SET tentatives = tentatives + 1 WHERE id_code = $1`,
            [ligne.id_code]
        );
        return { valide: false, motif: 'code_incorrect' };
    }

    await pool.query(`UPDATE site.codes_verification_connexion SET utilise = true WHERE id_code = $1`, [ligne.id_code]);
    return { valide: true };
}

module.exports = { genererEtEnvoyerCode, verifierCode };
