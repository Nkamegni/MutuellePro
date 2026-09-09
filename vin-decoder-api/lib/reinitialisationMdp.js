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
        'INSERT INTO site.tokens_reinitialisation_mdp (token, type_compte, id_compte) VALUES ($1, $2, $3)',
        [token, typeCompte, idCompte]
    );

    const lienType = typeCompte === 'partenaire' ? 'partenaire' : 'staff';
    const lien = `https://mutuelleproassurances.com/myspace.html?reinit_token=${token}&reinit_type=${lienType}`;

    await mailTransporter.sendMail({
        from: '"Mutuelle Pro Assurances" <no-reply@mutuelleproassurances.com>',
        to: email,
        subject: 'Mutuelle Pro Assurances — Réinitialisation de votre mot de passe',
        html: gabaritEmail('Réinitialisation de votre mot de passe', corpsReinitialisation({ nomComplet, typeCompte, lien })),
    });
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
            'SELECT id_compte, date_expiration FROM site.tokens_reinitialisation_mdp WHERE token = $1 AND type_compte = $2',
            [token, typeCompte]
        );
        if (resultat.rowCount === 0) {
            await client.query('ROLLBACK');
            return { succes: false, statut: 404, erreurs: ['ce lien est invalide ou a déjà été utilisé'] };
        }

        const { id_compte, date_expiration } = resultat.rows[0];
        if (new Date(date_expiration) < new Date()) {
            await client.query('DELETE FROM site.tokens_reinitialisation_mdp WHERE token = $1', [token]);
            await client.query('COMMIT');
            return { succes: false, statut: 410, erreurs: ['ce lien a expiré, merci de refaire une demande'] };
        }

        const hache = await argon2.hash(motDePasse, { type: argon2.argon2id });
        await client.query(`UPDATE ${tableCompte} SET mot_de_passe_hache = $1 WHERE ${colonneId} = $2`, [hache, id_compte]);

        await client.query('DELETE FROM site.tokens_reinitialisation_mdp WHERE token = $1', [token]);

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

module.exports = { envoyerLienReinitialisation, appliquerReinitialisation, motDePasseRobuste };
