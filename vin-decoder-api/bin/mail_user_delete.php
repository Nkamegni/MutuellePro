<?php
/**
 * mail_user_delete.php — Pont CLI vers l'API SOAP ISPConfig (mail_user_delete)
 *
 * Complément à mail_user_add.php — même logique, même contrat de sortie.
 *
 * INVOCATION :
 *   php mail_user_delete.php '{"email":"..."}'
 *
 * SORTIE (toujours sur STDOUT, toujours du JSON, jamais d'exception affichée) :
 *   {"succes": true}
 *   {"succes": false, "erreur": "message clair"}
 *
 * Identifiants lus depuis /root/mutuellepro-site/vin-decoder-api/.env
 * (mêmes clés que mail_user_add.php — dont ISPCONFIG_CLIENT_ID=0, valeur
 * confirmée fonctionnelle le 28/08/2026 : aucun client formel n'existe
 * dans dbispconfig.client sur ce serveur).
 *
 * mail_user_delete attend l'identifiant numérique ISPConfig de la boîte
 * (mailuser_id), pas son email. Ce script fait donc d'abord un
 * mail_user_get_by_email pour retrouver cet identifiant, avant de
 * supprimer — évite d'exiger que l'appelant connaisse un id interne
 * ISPConfig qu'il n'a par ailleurs aucune raison de connaître.
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

// --- 1. Lecture de l'entrée -------------------------------------------------
if ($argc < 2 || trim($argv[1]) === '') {
    erreur("Argument JSON manquant. Usage : php mail_user_delete.php '{\"email\":\"...\"}'");
}

$entree = json_decode($argv[1], true);
if (!is_array($entree)) {
    erreur('JSON invalide en entrée : ' . json_last_error_msg());
}
if (empty($entree['email'])) {
    erreur("Champ requis manquant ou vide : email");
}
$email = $entree['email'];

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

// --- 3. Échange SOAP : login / recherche par email / delete / logout --------
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

    // Récupération de l'id interne à partir de l'email.
    // Note : mail_user_get_by_email N'EST PAS dans les remote_functions
    // autorisées pour ce Remote User (voir annexe) — on utilise donc
    // mail_user_get_all_by_client, qui y figure explicitement, puis on
    // filtre la liste retournée par email en PHP.
    //
    // Confirmé par diagnostic le 28/08/2026 : mail_user_get_all_by_client
    // avec client_id=0 (valeur du .env, ISPCONFIG_CLIENT_ID) retourne bien
    // la liste complète des boîtes existantes sur ce serveur mono-client.
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

    try {
        $resultat = $client->mail_user_delete($session_id, $mailuser_id);
    } catch (Throwable $e) {
        erreur('Échec mail_user_delete : ' . $e->getMessage());
    }

    repondre_et_quitter(true, ['mailuser_id_supprime' => (int) $mailuser_id]);

} finally {
    if ($client !== null && $session_id !== null) {
        try {
            $client->logout($session_id);
        } catch (Throwable $e) {
            // Réponse principale déjà émise avant ce bloc dans tous les cas.
        }
    }
}
