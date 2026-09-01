<?php
/**
 * mail_user_add.php — Pont CLI vers l'API SOAP ISPConfig (mail_user_add)
 *
 * Objectif : créer une boîte mail ISPConfig depuis Node.js (via child_process),
 * en passant par un vrai client SOAP PHP natif (seul format qui fonctionne
 * de manière fiable avec l'API distante ISPConfig).
 *
 * INVOCATION :
 *   php mail_user_add.php '{"email":"...","password":"...","name":"..."}'
 *   (JSON en argument unique — voir section "Lecture de l'entrée" ci-dessous
 *   pour activer STDIN à la place si préféré)
 *
 * SORTIE (toujours sur STDOUT, toujours du JSON, jamais d'exception affichée) :
 *   {"succes": true, "id_mail_user": 42}
 *   {"succes": false, "erreur": "message clair"}
 *
 * Identifiants lus depuis /root/mutuellepro-site/vin-decoder-api/.env
 * (mêmes clés que le reste de l'application : ISPCONFIG_REMOTE_URL,
 * ISPCONFIG_REMOTE_LOGIN, ISPCONFIG_REMOTE_PASSWORD, ISPCONFIG_CLIENT_ID)
 */

declare(strict_types=1);

// Ne jamais laisser fuiter une erreur PHP native (warning, notice...) dans
// STDOUT — seule notre sortie JSON contrôlée doit apparaître.
error_reporting(E_ALL);
ini_set('display_errors', '0');

const CHEMIN_ENV = '/root/mutuellepro-site/vin-decoder-api/.env';

/** Retourne toujours une réponse JSON structurée puis termine le script. */
function repondre_et_quitter(bool $succes, array $donnees = []): never
{
    $sortie = array_merge(['succes' => $succes], $donnees);
    echo json_encode($sortie, JSON_UNESCAPED_SLASHES) . PHP_EOL;
    exit($succes ? 0 : 1);
}

function erreur(string $message): never
{
    repondre_et_quitter(false, ['erreur' => $message]);
}

/** Parseur .env minimal : KEY=VALUE par ligne, ignore commentaires et lignes vides. */
function charger_env(string $chemin): array
{
    if (!is_readable($chemin)) {
        erreur("Fichier .env introuvable ou illisible : {$chemin}");
    }
    $lignes = file($chemin, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lignes === false) {
        erreur("Impossible de lire le fichier .env : {$chemin}");
    }
    $valeurs = [];
    foreach ($lignes as $ligne) {
        $ligne = trim($ligne);
        if ($ligne === '' || str_starts_with($ligne, '#')) {
            continue;
        }
        if (!str_contains($ligne, '=')) {
            continue;
        }
        [$cle, $val] = explode('=', $ligne, 2);
        $cle = trim($cle);
        $val = trim($val);
        // Retire des guillemets englobants éventuels (ex: KEY="valeur")
        if (strlen($val) >= 2) {
            $premier = $val[0];
            $dernier = $val[strlen($val) - 1];
            if (($premier === '"' && $dernier === '"') || ($premier === "'" && $dernier === "'")) {
                $val = substr($val, 1, -1);
            }
        }
        $valeurs[$cle] = $val;
    }
    return $valeurs;
}

// --- 1. Lecture de l'entrée -------------------------------------------------
// Par défaut : JSON en argument unique (argv[1]).
// Pour basculer en lecture STDIN à la place, commentez le bloc "argument"
// et décommentez le bloc "stdin" ci-dessous.

// -- argument --
if ($argc < 2 || trim($argv[1]) === '') {
    erreur("Argument JSON manquant. Usage : php mail_user_add.php '{\"email\":...}'");
}
$json_brut = $argv[1];

// -- stdin (alternative) --
// $json_brut = stream_get_contents(STDIN);
// if ($json_brut === false || trim($json_brut) === '') {
//     erreur("Aucune donnée JSON reçue sur STDIN.");
// }

$entree = json_decode($json_brut, true);
if (!is_array($entree)) {
    erreur('JSON invalide en entrée : ' . json_last_error_msg());
}

foreach (['email', 'password', 'name'] as $champ_requis) {
    if (empty($entree[$champ_requis])) {
        erreur("Champ requis manquant ou vide : {$champ_requis}");
    }
}

// --- 2. Chargement des identifiants -----------------------------------------
$env = charger_env(CHEMIN_ENV);

foreach (['ISPCONFIG_REMOTE_URL', 'ISPCONFIG_REMOTE_LOGIN', 'ISPCONFIG_REMOTE_PASSWORD', 'ISPCONFIG_CLIENT_ID'] as $cle_requise) {
    if (!isset($env[$cle_requise]) || $env[$cle_requise] === '') {
        erreur("Variable manquante dans .env : {$cle_requise}");
    }
}

$url          = rtrim($env['ISPCONFIG_REMOTE_URL'], '/') . '/';
$login        = $env['ISPCONFIG_REMOTE_LOGIN'];
$mot_de_passe = $env['ISPCONFIG_REMOTE_PASSWORD'];
$client_id    = (int) $env['ISPCONFIG_CLIENT_ID'];

// --- 3. Construction des paramètres mail_user_add ---------------------------
// server_id = 1 : hypothèse retenue dans l'annexe pour une installation
// mono-serveur (jamais mise en défaut par une erreur différente).
$email = $entree['email'];

// Correctif du 01/09/2026 : l'API distante SOAP ne calcule PAS le chemin
// maildir à notre place (contrairement à l'interface web, qui le fait côté
// JavaScript avant l'envoi du formulaire). Un maildir vide se propage en
// cascade côté serveur (chown sur '', échec de compilation sieve, et le
// Maildir physique n'est jamais créé, malgré un succès apparent en base).
$parties_email = explode('@', $email, 2);
if (count($parties_email) !== 2 || $parties_email[0] === '' || $parties_email[1] === '') {
    erreur("Adresse email invalide pour construction du maildir : {$email}");
}
[$partie_locale, $domaine] = $parties_email;

// Convention confirmée sur ce serveur (vérifiée sur admin@mutuelleproassurances.com) :
// /var/vmail/<domaine>/<partie-locale>, sans slash final, sans suffixe /Maildir
// (Dovecot ajoute Maildir/ lui-même via sa config mail_location).
$maildir = "/var/vmail/{$domaine}/{$partie_locale}";

$params = [
    'server_id' => 1,
    'email'     => $email,
    'login'     => $email,           // ISPConfig utilise généralement l'email complet comme login
    'password'  => $entree['password'],
    'name'      => $entree['name'],
    'maildir'   => $maildir,
    'quota'            => $entree['quota'] ?? 0,   // 0 = illimité, ajustable si besoin
    'access'           => 'y',       // corrigé le 01/09/2026 : la colonne réelle est 'access', pas 'active'
    'postfix'          => 'y',   // indispensable : sans ça, la boîte ne reçoit pas les mails
    'move_junk'        => 'n',   // ENUM requis par ISPConfig, chaîne vide rejetée
    'purge_trash_days' => 0,     // entier requis, 0 = désactivé
    'purge_junk_days'  => 0,     // entier requis, 0 = désactivé
    'backup_interval'  => 'none', // ENUM ISPConfig (none/daily/weekly/monthly), chaîne vide rejetée
];

// --- 4. Échange SOAP : login / mail_user_add / logout (try/finally strict) --
$session_id = null;
$client = null;

try {
    try {
        $client = new SoapClient(null, [
            'location' => $url,
            'uri'      => $url,
            'trace'    => 1,
            'exceptions' => true,
        ]);
    } catch (Throwable $e) {
        erreur('Échec de création du client SOAP : ' . $e->getMessage());
    }

    try {
        $session_id = $client->login($login, $mot_de_passe);
    } catch (Throwable $e) {
        erreur('Échec du login ISPConfig : ' . $e->getMessage());
    }

    if (empty($session_id)) {
        erreur('Login ISPConfig : session_id vide retourné sans exception.');
    }

    try {
        $id_mail_user = $client->mail_user_add($session_id, $client_id, $params);
    } catch (Throwable $e) {
        erreur('Échec mail_user_add : ' . $e->getMessage());
    }

    if (empty($id_mail_user) || !is_numeric($id_mail_user)) {
        erreur('mail_user_add a retourné une valeur inattendue : ' . var_export($id_mail_user, true));
    }

    repondre_et_quitter(true, ['id_mail_user' => (int) $id_mail_user]);

} finally {
    // logout systématique, même en cas d'erreur — mais on ne doit jamais
    // laisser une erreur de logout écraser une réponse déjà émise, ni
    // planter le script si $client ou $session_id ne sont pas disponibles.
    if ($client !== null && $session_id !== null) {
        try {
            $client->logout($session_id);
        } catch (Throwable $e) {
            // Le logout a échoué mais la réponse principale a déjà été
            // envoyée via repondre_et_quitter() (qui appelle exit()).
            // Si on arrive ici après une erreur AVANT repondre_et_quitter,
            // le script se sera déjà terminé via erreur(). Ce bloc ne peut
            // donc s'exécuter qu'après un succès déjà répondu — rien à faire.
        }
    }
}
