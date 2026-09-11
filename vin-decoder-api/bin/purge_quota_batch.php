<?php
declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors', '0');

const CHEMIN_ENV = '/root/mutuellepro-site/vin-decoder-api/.env';

function charger_env(string $chemin): array
{
    $lignes = file($chemin, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $valeurs = [];
    foreach ($lignes as $ligne) {
        $ligne = trim($ligne);
        if ($ligne === '' || str_starts_with($ligne, '#') || !str_contains($ligne, '=')) continue;
        [$cle, $val] = explode('=', $ligne, 2);
        $cle = trim($cle); $val = trim($val);
        if (strlen($val) >= 2) {
            $p = $val[0]; $d = $val[strlen($val)-1];
            if (($p === '"' && $d === '"') || ($p === "'" && $d === "'")) $val = substr($val, 1, -1);
        }
        $valeurs[$cle] = $val;
    }
    return $valeurs;
}

$env = charger_env(CHEMIN_ENV);
$url = rtrim($env['ISPCONFIG_REMOTE_URL'], '/') . '/';
$login = $env['ISPCONFIG_REMOTE_LOGIN'];
$pass = $env['ISPCONFIG_REMOTE_PASSWORD'];
$client_id = (int) $env['ISPCONFIG_CLIENT_ID'];

$resultats = [];

$client = new SoapClient(null, ['location' => $url, 'uri' => $url, 'trace' => 1, 'exceptions' => true]);
$session_id = $client->login($login, $pass);

$boites = $client->mail_user_get_all_by_client($session_id, $client_id);

foreach ($boites as $b) {
    $b = (array) $b;
    $mailuser_id = $b['mailuser_id'];
    $email = $b['email'];

    try {
        $enregistrement = (array) $client->mail_user_get($session_id, $mailuser_id);

        $champs = [
            'purge_trash_days' => 30,
            'purge_junk_days'  => 30,
        ];

        // Correctif ciblé : admin@ avait un quota résiduel de 5 Mo (5242880
        // octets), largement insuffisant — aligné sur 0 (illimité) comme le
        // reste des boîtes.
        if ($email === 'admin@mutuelleproassurances.com') {
            $champs['quota'] = 0;
        }

        $params = array_merge($enregistrement, $champs);
        unset($params['mailuser_id']);

        $client->mail_user_update($session_id, $client_id, $mailuser_id, $params);
        $resultats[$email] = 'succes';
    } catch (Throwable $e) {
        $resultats[$email] = 'ERREUR: ' . $e->getMessage();
    }
}

$client->logout($session_id);

echo json_encode($resultats, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
