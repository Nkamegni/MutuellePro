// =====================================================================
// Mutuelle Pro Assurances -- Réinitialisation de boîte mail (Option 2)
// Rédigé le 14/09/2026 -- motif jumeau de lib/reinitialisationMdp.js,
// mais agit sur imap_mot_de_passe_chiffre (boîte mail ISPConfig) et non
// mot_de_passe_hache (connexion myspace.html) -- deux identifiants
// distincts, jamais mélangés. Complète l'Option 3 (déjà livrée,
// l'administrateur fixe lui-même le mot de passe) : ici, c'est le
// titulaire du compte qui le fait, via un lien envoyé par email.
// =====================================================================

const crypto = require('crypto');
const { gabaritEmail } = require('./gabaritEmail');
const { creerBoiteMail, modifierMotDePasseBoiteMail } = require('./ispconfig');
const { chiffrer } = require('./chiffrement');

function motDePasseRobuste(mdp) {
    if (typeof mdp !== 'string' || mdp.length < 10) return false;
    if (!/[a-zA-Z]/.test(mdp)) return false;
    if (!/[0-9]/.test(mdp)) return false;
    if (!/[^a-zA-Z0-9]/.test(mdp)) return false;
    return true;
}

// Génère le jeton, l'enregistre, envoie l'email -- même discipline que
// envoyerLienReinitialisation : ne révèle jamais si le compte existe à
// l'appelant, réponse uniforme laissée à la route.
async function envoyerLienReinitialisationBoiteMail({ pool, mailTransporter, typeCompte, idCompte, email, nomComplet }) {
    const token = crypto.randomBytes(32).toString('hex');
    await pool.query(
        `INSERT INTO site.jeton (token, code_nature_jeton, type_compte, id_compte) VALUES ($1, 'REINITIALISATION_BOITE_MAIL', $2, $3)`,
        [token, typeCompte, idCompte]
    );

    const lienType = typeCompte === 'partenaire' ? 'partenaire' : 'staff';
    const lien = `https://mutuelleproassurances.com/myspace.html?reinit_boite_token=${token}&reinit_boite_type=${lienType}`;

    const infoEnvoi = await mailTransporter.sendMail({
        from: '"Mutuelle Pro Assurances" <no-reply@mutuelleproassurances.com>',
        to: email,
        subject: 'Mutuelle Pro Assurances — Réinitialisation de votre boîte mail professionnelle',
        html: gabaritEmail('Réinitialisation de votre boîte mail', `
            <p>Bonjour ${nomComplet},</p>
            <p>Un administrateur (ou vous-même) a demandé la réinitialisation du mot de passe de votre <strong>boîte mail professionnelle</strong> — distincte de votre mot de passe de connexion à myspace.html, qui reste inchangé.</p>
            <p>Ce lien est valable 1 heure : <a href="${lien}">${lien}</a></p>
            <p>Si vous n'êtes pas à l'origine de cette demande, ignorez ce message — votre boîte mail actuelle reste inchangée.</p>
        `),
    });

    try {
        await pool.query(
            `INSERT INTO site.no_reply_message_envoye (message_id_rfc, destinataire, type_message, reference_compte)
             VALUES ($1, $2, $3, $4)`,
            [infoEnvoi.messageId, email, `reinitialisation_boite_mail_${typeCompte}`, String(idCompte)]
        );
    } catch (err) {
        console.error('[envoyerLienReinitialisationBoiteMail] Erreur journalisation no-reply (ignorée) :', err);
    }
}

// Vérifie le jeton et applique le nouveau mot de passe -- sur la boîte
// mail ISPConfig (via le pont PHP, même repli création-si-absente que
// l'Option 3), PAS sur mot_de_passe_hache. Aucune session myspace.html
// n'est révoquée ici : la connexion à myspace.html n'est pas concernée.
async function appliquerReinitialisationBoiteMail({ pool, typeCompte, token, motDePasse, motDePasseConfirmation, tableCompte, colonneId }) {
    if (!token || typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
        return { succes: false, statut: 400, erreurs: ['lien de réinitialisation invalide'] };
    }
    if (!motDePasseRobuste(motDePasse)) {
        return { succes: false, statut: 400, erreurs: ['mot de passe doit contenir au moins 10 caractères, avec une lettre, un chiffre et un caractère spécial'] };
    }
    if (motDePasse !== motDePasseConfirmation) {
        return { succes: false, statut: 400, erreurs: ['la confirmation du mot de passe ne correspond pas'] };
    }

    const resultat = await pool.query(
        `SELECT id_compte, date_expiration FROM site.jeton WHERE token = $1 AND type_compte = $2 AND code_nature_jeton = 'REINITIALISATION_BOITE_MAIL'`,
        [token, typeCompte]
    );
    if (resultat.rowCount === 0) {
        return { succes: false, statut: 404, erreurs: ['ce lien est invalide ou a déjà été utilisé'] };
    }

    const { id_compte, date_expiration } = resultat.rows[0];
    if (new Date(date_expiration) < new Date()) {
        await pool.query('DELETE FROM site.jeton WHERE token = $1', [token]);
        return { succes: false, statut: 410, erreurs: ['ce lien a expiré, merci de refaire une demande'] };
    }

    const compte = await pool.query(`SELECT email, nom, prenom FROM ${tableCompte} WHERE ${colonneId} = $1`, [id_compte]);
    if (compte.rowCount === 0) {
        await pool.query('DELETE FROM site.jeton WHERE token = $1', [token]);
        return { succes: false, statut: 404, erreurs: ['compte introuvable'] };
    }
    const { email, nom, prenom } = compte.rows[0];
    const nomAffiche = prenom ? `${prenom} ${nom}` : nom;

    try {
        await modifierMotDePasseBoiteMail({ email, motDePasse });
    } catch (err) {
        if (/Aucune boîte mail trouvée/i.test(err.message || '')) {
            await creerBoiteMail({ email, motDePasse, nomAffiche });
        } else {
            throw err;
        }
    }

    await pool.query(`UPDATE ${tableCompte} SET imap_mot_de_passe_chiffre = $1 WHERE ${colonneId} = $2`, [chiffrer(motDePasse), id_compte]);
    await pool.query('DELETE FROM site.jeton WHERE token = $1', [token]);

    return { succes: true };
}

module.exports = { envoyerLienReinitialisationBoiteMail, appliquerReinitialisationBoiteMail, motDePasseRobuste };
