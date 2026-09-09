// =====================================================================
// Mutuelle Pro Assurances — Messagerie intégrée
// Fonctions IMAP partagées entre la boîte Personnel (admin@, identifiants
// fixes .env) et les boîtes Partenaires (identifiants par compte, mot de
// passe déchiffré à la volée — voir lib/chiffrement.js).
// =====================================================================

const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

const IMAP_HOST = process.env.IMAP_HOST || 'vps122827.serveur-vps.net';
const IMAP_PORT = Number(process.env.IMAP_PORT) || 993;

function creerClient(user, pass) {
    return new ImapFlow({
        host: IMAP_HOST,
        port: IMAP_PORT,
        secure: true,
        auth: { user, pass },
        logger: false,
    });
}

// Distingue un échec d'AUTHENTIFICATION (mot de passe erroné — imapflow
// positionne err.authenticationFailed = true) d'une panne de connexion
// (serveur injoignable — err.code du type ECONNREFUSED/ETIMEDOUT/ENOTFOUND).
// Cette distinction est cruciale (demande de Roger, 21/08/2026) : ne
// JAMAIS proposer à l'utilisateur de changer son mot de passe si le
// vrai problème est que le serveur mail est en panne.
function estEchecAuthentification(err) {
    if (err && err.authenticationFailed === true) return true;
    const message = (err && err.message || '').toUpperCase();
    return message.includes('AUTHENTICATIONFAILED') || message.includes('INVALID CREDENTIALS');
}

function estPanneServeur(err) {
    const codesReseau = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH', 'ECONNRESET'];
    return err && codesReseau.includes(err.code);
}

// Teste des identifiants sans rien lire — connexion + déconnexion
// immédiate. Utilisé avant d'enregistrer un nouveau mot de passe de
// boîte mail, pour ne jamais stocker une valeur qui ne fonctionne pas.
async function testerConnexion(user, pass) {
    const client = creerClient(user, pass);
    try {
        await client.connect();
        await client.logout();
        return { ok: true };
    } catch (err) {
        if (estEchecAuthentification(err)) {
            return { ok: false, echecAuthentification: true, panneServeur: false };
        }
        if (estPanneServeur(err)) {
            return { ok: false, echecAuthentification: false, panneServeur: true };
        }
        return { ok: false, echecAuthentification: false, panneServeur: false };
    }
}

// Liste les N derniers emails de INBOX (les plus récents en premier).
async function listerEmails(user, pass, limite = 30) {
    const client = creerClient(user, pass);
    const messages = [];
    await client.connect();
    try {
        const lock = await client.getMailboxLock('INBOX');
        try {
            const status = await client.status('INBOX', { messages: true });
            const total = status.messages;
            if (total === 0) return [];
            const debut = Math.max(1, total - limite + 1);
            for await (const msg of client.fetch(`${debut}:${total}`, { envelope: true, flags: true, uid: true })) {
                messages.push({
                    uid: msg.uid,
                    sujet: (msg.envelope && msg.envelope.subject) || '(sans objet)',
                    de: msg.envelope && msg.envelope.from && msg.envelope.from[0]
                        ? `${msg.envelope.from[0].name || ''} <${msg.envelope.from[0].address}>`.trim()
                        : 'Expéditeur inconnu',
                    date: msg.envelope ? msg.envelope.date : null,
                    lu: msg.flags ? msg.flags.has('\\Seen') : false,
                });
            }
        } finally {
            lock.release();
        }
    } finally {
        await client.logout();
    }
    return messages.reverse();
}

// Lit un email complet (texte + HTML si disponible) par son UID.
async function lireEmail(user, pass, uid) {
    const client = creerClient(user, pass);
    let resultat = null;
    await client.connect();
    try {
        const lock = await client.getMailboxLock('INBOX');
        try {
            const message = await client.fetchOne(uid, { envelope: true, source: true, uid: true }, { uid: true });
            if (!message) return null;
            const parsed = await simpleParser(message.source);
            resultat = {
                uid: message.uid,
                sujet: (message.envelope && message.envelope.subject) || '(sans objet)',
                de: message.envelope && message.envelope.from && message.envelope.from[0]
                    ? `${message.envelope.from[0].name || ''} <${message.envelope.from[0].address}>`.trim()
                    : 'Expéditeur inconnu',
                date: message.envelope ? message.envelope.date : null,
                texte: parsed.text || '',
                html: parsed.html || null,
            };
            await client.messageFlagsAdd({ uid: String(uid) }, ['\\Seen'], { uid: true });
        } finally {
            lock.release();
        }
    } finally {
        await client.logout();
    }
    return resultat;
}

// Récupère UIDVALIDITY (dossier) et Message-ID (message) sans marquer le
// message comme lu ni en modifier l'état -- utilisé uniquement par la
// création de tâche (site.emails_cache), pas par l'affichage.
async function obtenirMetadonneesPourTache(user, pass, uid, dossier = 'INBOX') {
    const client = creerClient(user, pass);
    let resultat = null;
    await client.connect();
    try {
        const lock = await client.getMailboxLock(dossier);
        try {
            const uidvalidity = client.mailbox && client.mailbox.uidValidity
                ? Number(client.mailbox.uidValidity)
                : null;
            const message = await client.fetchOne(uid, { envelope: true, source: true, uid: true }, { uid: true });
            if (!message) return null;
            const parsed = await simpleParser(message.source);
            resultat = { uidvalidity, messageId: parsed.messageId || null };
        } finally {
            lock.release();
        }
    } finally {
        await client.logout();
    }
    return resultat;
}

module.exports = { listerEmails, lireEmail, testerConnexion, estEchecAuthentification, estPanneServeur, obtenirMetadonneesPourTache };
