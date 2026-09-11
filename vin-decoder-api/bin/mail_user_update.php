<?php
/**
 * mail_user_update.php — Pont CLI vers l'API SOAP ISPConfig (mail_user_update)
 *
 * Complète mail_user_add.php / mail_user_delete.php — même logique, même
 * contrat de sortie.
 *
 * INVOCATION :
 *   php mail_user_update.php '{"email":"...","champs":{"quota":500,"purge_trash_days":30}}'
 *
 * "champs" ne contient que les valeurs à changer — le script récupère
 * d'abord l'enregistrement complet existant (mail_user_get, autorisé pour
 * ce Remote User) et fusionne par-dessus, avant d'appeler mail_user_update.
 * Ça évite de retomber sur les erreurs ENUM/INT vides déjà rencontrées avec
 * mail_user_add si on envoyait un tableau partiel.
 *
 * SORTIE (toujours sur STDOUT, toujours du JSON, jamais d'exception affichée) :
 *   {"succes": true, "mailuser_id": 24, "champs_modifies": {...}}
 *   {"succes": false, "erreur": "message clair"}
 */

declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');

const CHEMIN_ENV = '/root/mutuellepro-site/vin-decoder-api/.env';

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
        if ($ligne === '' || str_starts_with($ligne, '#') || !str_contains($ligne, '=')) {
            continue;
        }
        [$cle, $val] = explode('=', $ligne, 2);
        $cle = trim($cle);
        $val = trim($val);
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

if ($argc < 2 || trim($argv[1]) === '') {
    erreur("Argument JSON manquant. Usage : php mail_user_update.php '{\"email\":\"...\",\"champs\":{...}}'");
}

$entree = json_decode($argv[1], true);
if (!is_array($entree)) {
    erreur('JSON invalide en entrée : ' . json_last_error_msg());
}
if (empty($entree['email'])) {
    erreur("Champ requis manquant ou vide : email");
}
if (empty($entree['champs']) || !is_array($entree['champs'])) {
    erreur("Champ requis manquant ou vide : champs (objet des valeurs à modifier)");
}
$email = $entree['email'];
$champsAModifier = $entree['champs'];

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

    // Retrouver mailuser_id à partir de l'email (mail_user_get_by_email non autorisé).
    try {
        $boites = $client->mail_user_get_all_by_client($session_id, $client_id);
    } catch (Throwable $e) {
        erreur('Échec mail_user_get_all_by_client : ' . $e->getMessage());
    }

    if (empty($boites)) {
        erreur("Aucune boîte mail trouvée (liste vide pour client_id={$client_id}).");
    }

    $mailuser_id = null;
    foreach ($boites as $boite) {
        $boite = (array) $boite;
        if (($boite['email'] ?? null) === $email) {
            $mailuser_id = $boite['mailuser_id'] ?? null;
            break;
        }
    }

    if (empty($mailuser_id)) {
        erreur("Aucune boîte mail trouvée pour l'email : {$email}");
    }

    // Récupérer l'enregistrement complet existant, pour fusionner plutôt
    // que d'envoyer un tableau partiel à mail_user_update (même prudence
    // que pour mail_user_add : ISPConfig rejette les ENUM/INT vides).
    try {
        $enregistrementActuel = $client->mail_user_get($session_id, $mailuser_id);
    } catch (Throwable $e) {
        erreur('Échec mail_user_get : ' . $e->getMessage());
    }

    if (empty($enregistrementActuel)) {
        erreur("mail_user_get n'a rien retourné pour mailuser_id={$mailuser_id}");
    }

    $enregistrementActuel = (array) $enregistrementActuel;

    // Fusion : les champs demandés écrasent les valeurs existantes, tout le
    // reste de l'enregistrement est renvoyé tel quel.
    $params = array_merge($enregistrementActuel, $champsAModifier);

    // Quelques clés techniques renvoyées par mail_user_get ne doivent pas
    // être renvoyées telles quelles dans l'update (identifiants système) —
    // on les retire par précaution si présentes.
    unset($params['mailuser_id']);

    try {
        $client->mail_user_update($session_id, $client_id, $mailuser_id, $params);
    } catch (Throwable $e) {
        erreur('Échec mail_user_update : ' . $e->getMessage());
    }

    repondre_et_quitter(true, [
        'mailuser_id' => (int) $mailuser_id,
        'champs_modifies' => $champsAModifier,
    ]);

} finally {
    if ($client !== null && $session_id !== null) {
        try {
            $client->logout($session_id);
        } catch (Throwable $e) {
        }
    }
}
