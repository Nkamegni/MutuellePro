// =====================================================================
// Mutuelle Pro Assurances — Messagerie intégrée
// Chiffrement/déchiffrement des mots de passe de boîtes IMAP par
// partenaire (AES-256-GCM). Clé lue depuis MAILBOX_ENCRYPTION_KEY (.env),
// 32 octets hexadécimaux (générée via `openssl rand -hex 32`).
// =====================================================================

const crypto = require('crypto');

const ALGORITHME = 'aes-256-gcm';

function obtenirCle() {
    const cleHex = process.env.MAILBOX_ENCRYPTION_KEY;
    if (!cleHex || cleHex.length !== 64) {
        throw new Error('MAILBOX_ENCRYPTION_KEY manquante ou invalide (attendu : 64 caractères hexadécimaux)');
    }
    return Buffer.from(cleHex, 'hex');
}

// Retourne une chaîne unique : iv:authTag:donneesChiffrees (tout en hex).
function chiffrer(texteClair) {
    const cle = obtenirCle();
    const iv = crypto.randomBytes(12);
    const chiffreur = crypto.createCipheriv(ALGORITHME, cle, iv);
    const chiffre = Buffer.concat([chiffreur.update(texteClair, 'utf8'), chiffreur.final()]);
    const authTag = chiffreur.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${chiffre.toString('hex')}`;
}

function dechiffrer(texteChiffre) {
    const cle = obtenirCle();
    const [ivHex, authTagHex, donneesHex] = texteChiffre.split(':');
    if (!ivHex || !authTagHex || !donneesHex) {
        throw new Error('Format de donnée chiffrée invalide');
    }
    const dechiffreur = crypto.createDecipheriv(ALGORITHME, cle, Buffer.from(ivHex, 'hex'));
    dechiffreur.setAuthTag(Buffer.from(authTagHex, 'hex'));
    const clair = Buffer.concat([dechiffreur.update(Buffer.from(donneesHex, 'hex')), dechiffreur.final()]);
    return clair.toString('utf8');
}

module.exports = { chiffrer, dechiffrer };
