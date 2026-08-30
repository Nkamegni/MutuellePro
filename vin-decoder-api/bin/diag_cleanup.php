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

$resultats = ['diagnostics' => []];

$client = new SoapClient(null, ['location' => $url, 'uri' => $url, 'trace' => 1, 'exceptions' => true]);
$session_id = $client->login($login, $pass);

// Diagnostic : que retourne mail_user_get_all_by_client pour différents id ?
foreach ([0, 1, 2, 3, 4, 5] as $candidat) {
    try {
        $boites = $client->mail_user_get_all_by_client($session_id, $candidat);
        $liste = [];
        if (!empty($boites)) {
            foreach ($boites as $b) {
                $b = (array) $b;
                $liste[] = ($b['mailuser_id'] ?? '?') . ':' . ($b['email'] ?? '?');
            }
        }
        $resultats['diagnostics']["client_id_{$candidat}"] = $liste;
    } catch (Throwable $e) {
        $resultats['diagnostics']["client_id_{$candidat}"] = 'ERREUR: ' . $e->getMessage();
    }
}

// Suppression directe par id connu (23), indépendante de la recherche
try {
    $client->mail_user_delete($session_id, 23);
    $resultats['suppression_id_23'] = 'succes';
} catch (Throwable $e) {
    $resultats['suppression_id_23'] = 'ERREUR: ' . $e->getMessage();
}

$client->logout($session_id);

echo json_encode($resultats, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
