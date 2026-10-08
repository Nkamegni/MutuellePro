// =====================================================================
// Mutuelle Pro Assurances -- Mot de passe oublie, logique partagee
// Personnel + Partenaire (03/09/2026). Meme principe que
// verificationConnexion.js -- un seul endroit, pas deux implementations.
// =====================================================================

const crypto = require('crypto');
const argon2 = require('argon2');
const { gabaritEmail, corpsReinitialisation } = require('./gabaritEmail');

function motDePasseRobuste(mdp) {
    if (typeof mdp !== 'string' || mdp.length < 10) return false;
    if (!/[a-zA-Z]/.test(mdp)) return false;
    if (!/[0-9]/.test(mdp)) return false;
    if (!/[^a-zA-Z0-9]/.test(mdp)) return false;
    return true;
}

// Genere le jeton, l'enregistre, envoie l'email. Ne revele jamais si le
// compte existe ou non a l'appelant -- meme reponse dans les deux cas,
// c'est a la route elle-meme de renvoyer un message uniforme.
async function envoyerLienReinitialisation({ pool, mailTransporter, typeCompte, idCompte, email, nomComplet }) {
    const token = crypto.randomBytes(32).toString('hex');
    await pool.query(
        `INSERT INTO site.jeton (token, code_nature_jeton, type_compte, id_compte) VALUES ($1, 'REINITIALISATION_MDP', $2, $3)`,
        [token, typeCompte, idCompte]
    );

    const lienType = typeCompte === 'partenaire' ? 'partenaire' : 'staff';
    const lien = `https://mutuelleproassurances.com/myspace.html?reinit_token=${token}&reinit_type=${lienType}`;

    const infoEnvoi = await mailTransporter.sendMail({
        from: '"Mutuelle Pro Assurances" <no-reply@mutuelleproassurances.com>',
        to: email,
        subject: 'Mutuelle Pro Assurances — Réinitialisation de votre mot de passe',
        html: gabaritEmail('Réinitialisation de votre mot de passe', corpsReinitialisation({ nomComplet, typeCompte, lien })),
    });

    // Journal no-reply (11/09/2026, demandé par la session Messagerie) --
    // non-bloquant, un échec ne doit jamais empêcher l'utilisateur de
    // recevoir son lien de réinitialisation.
    try {
        await pool.query(
            `INSERT INTO site.no_reply_message_envoye (message_id_rfc, destinataire, type_message, reference_compte)
             VALUES ($1, $2, $3, $4)`,
            [infoEnvoi.messageId, email, `reinitialisation_mdp_${typeCompte}`, String(idCompte)]
        );
    } catch (err) {
        console.error('[envoyerLienReinitialisation] Erreur journalisation no-reply (ignorée) :', err);
    }
}

// Verifie le jeton et applique le nouveau mot de passe. tableCompte et
// colonneId different selon le role -- fournis par l'appelant plutot que
// devines ici (site.staff/id_staff vs site.partenaires/id_partenaire).
async function appliquerReinitialisation({ pool, typeCompte, token, motDePasse, motDePasseConfirmation, tableCompte, colonneId, tableSession, colonneSessionId }) {
    if (!token || typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
        return { succes: false, statut: 400, erreurs: ['lien de réinitialisation invalide'] };
    }
    if (!motDePasseRobuste(motDePasse)) {
        return { succes: false, statut: 400, erreurs: ['mot de passe doit contenir au moins 10 caractères, avec une lettre, un chiffre et un caractère spécial'] };
    }
    if (motDePasse !== motDePasseConfirmation) {
        return { succes: false, statut: 400, erreurs: ['la confirmation du mot de passe ne correspond pas'] };
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const resultat = await client.query(
            `SELECT id_compte, date_expiration FROM site.jeton WHERE token = $1 AND type_compte = $2 AND code_nature_jeton = 'REINITIALISATION_MDP'`,
            [token, typeCompte]
        );
        if (resultat.rowCount === 0) {
            await client.query('ROLLBACK');
            return { succes: false, statut: 404, erreurs: ['ce lien est invalide ou a déjà été utilisé'] };
        }

        const { id_compte, date_expiration } = resultat.rows[0];
        if (new Date(date_expiration) < new Date()) {
            await client.query('DELETE FROM site.jeton WHERE token = $1', [token]);
            await client.query('COMMIT');
            return { succes: false, statut: 410, erreurs: ['ce lien a expiré, merci de refaire une demande'] };
        }

        const hache = await argon2.hash(motDePasse, { type: argon2.argon2id });
        // Péremption (14/09/2026) -- tout changement de mot de passe remet
        // le compteur à zéro et lève l'obligation de changement forcé,
        // quelle que soit la raison du changement (lien reçu par email,
        // ou changement forcé après péremption -- ce même chemin de code
        // sert les deux, voir routes/staffAuth.routes.js).
        await client.query(
            `UPDATE ${tableCompte} SET mot_de_passe_hache = $1, date_dernier_changement_mdp = now(), doit_changer_mot_de_passe = false WHERE ${colonneId} = $2`,
            [hache, id_compte]
        );

        await client.query('DELETE FROM site.jeton WHERE token = $1', [token]);

        // Révocation de toutes les sessions actives -- chaque rôle a sa
        // propre table de session (trouvé le 03/09/2026 : site.session
        // pour Client, site.session_staff, site.session_partenaire --
        // jamais une table generique unique).
        await client.query(
            `DELETE FROM ${tableSession} WHERE sess::jsonb->>'${colonneSessionId}' = $1::text`,
            [String(id_compte)]
        );

        await client.query('COMMIT');
        return { succes: true };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

// Péremption (14/09/2026) -- génère un jeton SANS envoyer d'email :
// l'utilisateur vient de prouver son identité (mot de passe + code 2FA),
// pas besoin de repasser par la boîte mail. Réutilise la même table et
// le même appliquerReinitialisation() que le flux "mot de passe oublié".
async function genererTokenChangementForce({ pool, typeCompte, idCompte }) {
    const token = crypto.randomBytes(32).toString('hex');
    await pool.query(
        `INSERT INTO site.jeton (token, code_nature_jeton, type_compte, id_compte) VALUES ($1, 'REINITIALISATION_MDP', $2, $3)`,
        [token, typeCompte, idCompte]
    );
    return token;
}

module.exports = { envoyerLienReinitialisation, appliquerReinitialisation, motDePasseRobuste, genererTokenChangementForce };
