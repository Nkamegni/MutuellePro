// =====================================================================
// Mutuelle Pro Assurances — lib/partenaires.js
// Extrait fidèlement de staffPartenaires.routes.js le 05/09/2026, pour
// être partagé entre la route existante ET le nouveau moteur d'import
// générique (routes/imports.routes.js) -- AUCUNE logique réécrite,
// copié tel quel depuis le fichier source de vérité.
// =====================================================================

const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { gabaritEmail, corpsActivation } = require('./gabaritEmail');

const mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
});

async function envoyerEmailActivationPartenaire(pool, idPartenaire, emailNotification, nomComplet, token) {
    const lien = `https://mutuelleproassurances.com/activation-partenaire.html?token=${token}`;
    try {
        const infoEnvoi = await mailTransporter.sendMail({
            from: '"Mutuelle Pro Assurances" <no-reply@mutuelleproassurances.com>',
            to: emailNotification,
            subject: 'Mutuelle Pro Assurances — Activez votre compte partenaire',
            html: gabaritEmail('Activez votre compte partenaire', corpsActivation({ nomComplet, typeCompte: 'partenaire', lien })),
        });
        try {
            await pool.query(
                `INSERT INTO site.no_reply_messages_envoyes (message_id, destinataire, type_message, reference_compte)
                 VALUES ($1, $2, $3, $4)`,
                [infoEnvoi.messageId, emailNotification, 'activation_compte_partenaire', String(idPartenaire)]
            );
        } catch (err) {
            console.error('[envoyerEmailActivationPartenaire] Erreur journalisation no-reply (ignorée) :', err);
        }
    } catch (err) {
        console.error('[envoyerEmailActivationPartenaire] Erreur envoi email :', err);
    }
}

// Crée un partenaire avec un mot de passe inutilisable (jamais transmis),
// puis un jeton d'activation -- le compte n'est utilisable qu'après que
// le partenaire ait défini son propre mot de passe via ce jeton.
// N'envoie PAS l'email lui-même -- c'est à l'appelant de le faire avec le
// token retourné (permet au moteur d'import générique de le faire APRÈS
// écriture réussie en base, jamais avant).
async function creerPartenaireEtActiver(client, { email, email_notification, nom, prenom, telephone, id_types_partenaire, contacts }) {
    const hacheInutilisable = crypto.randomBytes(32).toString('hex');
    const dernierMatricule = await client.query('SELECT COUNT(*) AS total FROM site.partenaires');
    const matricule = `PART-${String(parseInt(dernierMatricule.rows[0].total, 10) + 1).padStart(4, '0')}`;

    const inserePartenaire = await client.query(
        `INSERT INTO site.partenaires (matricule, email, email_notification, mot_de_passe_hache, nom, prenom, telephone)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id_partenaire, email, email_notification, nom, prenom`,
        [matricule, email, email_notification, hacheInutilisable, nom, prenom || null, telephone]
    );
    const partenaire = inserePartenaire.rows[0];

    for (const idType of id_types_partenaire) {
        await client.query('INSERT INTO site.partenaire_types (id_partenaire, id_type_partenaire) VALUES ($1, $2)', [partenaire.id_partenaire, idType]);
    }

    for (const contact of contacts) {
        await client.query(
            'INSERT INTO site.partenaire_contacts (id_partenaire, nom, prenom, fonction, telephone, est_defaut) VALUES ($1, $2, $3, $4, $5, $6)',
            [partenaire.id_partenaire, contact.nom, contact.prenom || null, contact.fonction || null, contact.telephone || null, !!contact.est_defaut]
        );
    }

    const token = crypto.randomBytes(32).toString('hex');
    await client.query('INSERT INTO site.activation_partenaire_tokens (token, id_partenaire) VALUES ($1, $2)', [token, partenaire.id_partenaire]);

    return { partenaire, token };
}

// "E03-E04,E08,E09" -> ['E03','E04','E08','E09']
// Lance une Error (jamais un objet d'erreur silencieux) si une plage est
// mal formée -- à capturer par l'appelant pour produire un motif de rejet.
function developperCodesTypes(specification) {
    const codes = new Set();
    const morceaux = specification.split(',').map((m) => m.trim()).filter(Boolean);
    for (const morceau of morceaux) {
        if (morceau.includes('-')) {
            const [debut, fin] = morceau.split('-').map((c) => c.trim().toUpperCase());
            const lettre = debut.charAt(0);
            const numDebut = parseInt(debut.slice(1), 10);
            const numFin = parseInt(fin.slice(1), 10);
            if (fin.charAt(0) !== lettre || isNaN(numDebut) || isNaN(numFin) || numFin < numDebut) {
                throw new Error(`plage invalide « ${morceau} »`);
            }
            for (let n = numDebut; n <= numFin; n++) {
                codes.add(lettre + String(n).padStart(2, '0'));
            }
        } else {
            codes.add(morceau.toUpperCase());
        }
    }
    return Array.from(codes);
}

// "{Nom;Prenom;Fonction;Tel}*;{Nom2;Prenom2;Fonction2;Tel2}" -> [{...,est_defaut:true}, {...}]
// Le "*" juste après l'accolade fermante marque le contact par défaut.
function parserContacts(specification) {
    const contacts = [];
    const regex = /\{([^}]*)\}(\*)?/g;
    let correspondance;
    while ((correspondance = regex.exec(specification)) !== null) {
        const [nom, prenom, fonction, telephone] = correspondance[1].split(';').map((c) => c.trim());
        contacts.push({ nom, prenom, fonction, telephone, est_defaut: !!correspondance[2] });
    }
    return contacts;
}

// Construit la table de correspondance code -> id_type_partenaire depuis
// la base (site.type_partenaire) -- à appeler UNE SEULE FOIS avant de
// traiter un lot de lignes (import), jamais ligne par ligne (coûteux).
async function chargerTypeParCode(pool) {
    const typesRef = await pool.query('SELECT id_type_partenaire, code FROM site.type_partenaire');
    return new Map(typesRef.rows.map((t) => [t.code, t.id_type_partenaire]));
}

// Résout une spécification de codes ("E03-E04,E08") en tableau d'ids
// réels -- lance une Error nommant le premier code inconnu rencontré, à
// capturer par l'appelant pour produire un motif de rejet précis. Combine
// developperCodesTypes() + la table de correspondance en une seule étape,
// pratique pour le moteur d'import générique.
function resoudreCodesTypes(specification, typeParCode) {
    const codes = developperCodesTypes(specification);
    const ids = [];
    for (const code of codes) {
        const id = typeParCode.get(code);
        if (!id) throw new Error(`code de type inconnu « ${code} »`);
        ids.push(id);
    }
    return ids;
}

module.exports = {
    envoyerEmailActivationPartenaire,
    creerPartenaireEtActiver,
    developperCodesTypes,
    parserContacts,
    chargerTypeParCode,
    resoudreCodesTypes,
};
