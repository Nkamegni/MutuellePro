// =====================================================================
// Mutuelle Pro Assurances -- Creation/suppression de boites mail ISPConfig
// Redige le 27/08/2026, reecrit le 28/08/2026
// =====================================================================
// L'echange SOAP direct depuis Node echouait systematiquement
// ("Cannot use object of type stdClass as array" cote ISPConfig, quelle
// que soit la structure XML essayee -- tres probablement une
// convention d'encodage propre a l'extension SOAP native de PHP que le
// code interne d'ISPConfig attend precisement). Delegue depuis le
// 28/08/2026 a deux scripts PHP CLI, construits et valides par une
// session dediee (voir compte_rendu_pont_php_ispconfig_28082026.md),
// qui utilisent le vrai SoapClient de PHP -- le seul chemin dont on ait
// la preuve qu'il fonctionne face a ce serveur.
//
// Ce module n'est plus qu'un mince appel de processus (child_process),
// PAS un client SOAP -- toute la logique ISPConfig vit desormais dans
// les scripts PHP, pas ici.
// =====================================================================

const { execFile } = require('child_process');
const util = require('util');
const execFileAsync = util.promisify(execFile);

const CHEMIN_AJOUT = '/root/mutuellepro-site/vin-decoder-api/bin/mail_user_add.php';
const CHEMIN_SUPPRESSION = '/root/mutuellepro-site/vin-decoder-api/bin/mail_user_delete.php';

async function creerBoiteMail({ email, motDePasse, nomAffiche, quota }) {
    if (!email || !motDePasse) {
        throw new Error('email et motDePasse sont requis');
    }
    const params = JSON.stringify({
        email,
        password: motDePasse,
        name: nomAffiche || email.split('@')[0],
        ...(quota !== undefined ? { quota } : {}),
    });

    let stdout;
    try {
        ({ stdout } = await execFileAsync('php', [CHEMIN_AJOUT, params], { timeout: 20000 }));
    } catch (err) {
        // err.message seul ne contient que le texte générique de child_process
        // ("Command failed: ...") -- la vraie raison (PHP ou ISPConfig) est
        // dans stdout/stderr, ignorés jusqu'ici (bug trouvé le 01/09/2026).
        const details = (err.stderr || err.stdout || '').toString().trim();
        throw new Error(`Échec d'exécution du script de création${details ? ' : ' + details : ' : ' + err.message}`);
    }

    let resultat;
    try {
        resultat = JSON.parse(stdout);
    } catch (err) {
        throw new Error(`Réponse du script de création illisible : ${stdout}`);
    }
    if (!resultat.succes) {
        throw new Error(resultat.erreur || 'Échec de création, raison inconnue');
    }
    return resultat; // { succes: true, id_mail_user: N }
}

async function supprimerBoiteMail({ email }) {
    if (!email) {
        throw new Error('email est requis');
    }
    const params = JSON.stringify({ email });

    let stdout;
    try {
        ({ stdout } = await execFileAsync('php', [CHEMIN_SUPPRESSION, params], { timeout: 20000 }));
    } catch (err) {
        const details = (err.stderr || err.stdout || '').toString().trim();
        throw new Error(`Échec d'exécution du script de suppression${details ? ' : ' + details : ' : ' + err.message}`);
    }

    let resultat;
    try {
        resultat = JSON.parse(stdout);
    } catch (err) {
        throw new Error(`Réponse du script de suppression illisible : ${stdout}`);
    }
    if (!resultat.succes) {
        throw new Error(resultat.erreur || 'Échec de suppression, raison inconnue');
    }
    return resultat; // { succes: true, mailuser_id_supprime: N }
}

module.exports = { creerBoiteMail, supprimerBoiteMail };
