# ===================================================================
# deploy.ps1 v4 -- Deploiement generique de mutuelleproassurances.com
#
# PRINCIPE (inchange) : deploie TOUT ce qui se trouve dans .\deploy\
# (structure identique a celle du serveur, sous-dossiers compris).
#
# NOUVEAUTES v4 (09/10/2026) -- C:\mutuellepro_miroir est le MIROIR de la
# production : meme arborescence, memes fichiers actifs que le site en
# ligne, NON operationnel (reference seulement, jamais deploye, sans .env).
# C:\mutuellepro reste le poste de travail ; .\deploy\ n'est qu'un sas.
#   1. GARDE D'AGE : tout fichier de .\deploy\ plus ancien que
#      $MaxAgeHeures est signale "ANCIEN" et n'est deploye que si vous le
#      confirmez individuellement (par defaut : NON, il est ecarte).
#   2. SAUVEGARDE de l'ancienne version (cote VPS, rapatriee dans
#      .\Sauvegardes\<horodatage>\) -- inchange.
#   3. MISE A JOUR DU MIROIR apres succes : chaque fichier deploye est
#      DEPLACE de .\deploy\ vers sa place dans le miroir (meme chemin
#      relatif), en ECRASANT l'ancienne copie. .\deploy\ est vide ensuite.
#      Si l'ancienne version n'a pas ete mise en lieu sur, RIEN n'est deplace.
#   Le miroir peut deriver si quelqu'un modifie la production sans passer
#   par ce script : voir verifier_miroir.ps1 (comparaison par empreintes).
#
# Usage :  .\deploy.ps1
# ===================================================================

$ErrorActionPreference = "Stop"

$VpsUser    = "nkamegni"
$VpsHost    = "31.207.37.41"
$StagingDir = "/home/nkamegni/staging"
$LocalDeployDir = "$PSScriptRoot\deploy"
$LocalBackupDir = "$PSScriptRoot\Sauvegardes"
$MaxAgeHeures   = 6   # au-dela, un fichier de .\deploy\ est considere ANCIEN

function Fail($msg) {
    Write-Host "ERREUR : $msg" -ForegroundColor Red
    exit 1
}

Write-Host "=== Deploiement mutuelleproassurances.com (generique, v4) ===" -ForegroundColor Cyan

if (-not (Test-Path $LocalDeployDir)) {
    Fail "Le dossier $LocalDeployDir n'existe pas. Creez-le et placez-y les fichiers a deployer."
}

# 1. Lister tous les fichiers presents dans .\deploy\ (recursif),
#    avec leur chemin RELATIF (celui qu'on enverra au script serveur)
$allFiles = Get-ChildItem -Path $LocalDeployDir -Recurse -File
if ($allFiles.Count -eq 0) {
    Fail "Le dossier $LocalDeployDir est vide. Rien a deployer."
}

$limiteAge = (Get-Date).AddHours(-$MaxAgeHeures)
$candidats = $allFiles | ForEach-Object {
    [pscustomobject]@{
        Rel       = $_.FullName.Substring($LocalDeployDir.Length + 1).Replace('\', '/')
        Full      = $_.FullName
        Modifie   = $_.LastWriteTime
        Taille    = $_.Length
        Ancien    = ($_.LastWriteTime -lt $limiteAge)
    }
}

Write-Host "Fichiers trouves dans .\deploy\ :" -ForegroundColor Cyan
foreach ($c in $candidats) {
    $etat = if ($c.Ancien) { "  <-- ANCIEN (plus de $MaxAgeHeures h)" } else { "" }
    $ligne = "  - {0}   [{1:dd/MM/yyyy HH:mm}, {2} octets]{3}" -f $c.Rel, $c.Modifie, $c.Taille, $etat
    if ($c.Ancien) { Write-Host $ligne -ForegroundColor Yellow } else { Write-Host $ligne }
}

# Garde d'age : un fichier ANCIEN est ecarte sauf confirmation explicite.
$retenus = @()
foreach ($c in $candidats) {
    if ($c.Ancien) {
        $rep = Read-Host "ANCIEN : $($c.Rel) date du $($c.Modifie.ToString('dd/MM/yyyy HH:mm')). Le deployer quand meme ? (o/N)"
        if ($rep -eq "o" -or $rep -eq "O") { $retenus += $c }
        else { Write-Host "  ecarte : $($c.Rel) (reste dans .\deploy\ -- supprimez-le s'il est obsolete)" -ForegroundColor Yellow }
    } else {
        $retenus += $c
    }
}
if ($retenus.Count -eq 0) {
    Write-Host "Aucun fichier a deployer apres controle d'age." -ForegroundColor Yellow
    exit 0
}
$relativePaths = $retenus | ForEach-Object { $_.Rel }

Write-Host ""
Write-Host "A deployer :" -ForegroundColor Cyan
$relativePaths | ForEach-Object { Write-Host "  - $_" }
Write-Host ""
$confirm = Read-Host "Continuer et deployer sur mutuelleproassurances.com ? (O/N)"
if ($confirm -ne "O" -and $confirm -ne "o") {
    Write-Host "Deploiement annule par l'utilisateur." -ForegroundColor Yellow
    exit 0
}

# 2. Deposer chaque fichier INDIVIDUELLEMENT dans le staging distant
#    (structure preservee). On evite volontairement tout caractere
#    generique (*) passe a scp -- son comportement sur Windows OpenSSH
#    s'est avere peu fiable (blocage constate). Une copie explicite par
#    fichier est plus verbeuse mais garantie de fonctionner.
Write-Host ""
Write-Host "Depot dans le staging distant (fichier par fichier) ..."

# Cree d'abord tous les sous-dossiers necessaires en UN SEUL appel SSH
$subDirs = $relativePaths | ForEach-Object { Split-Path $_ -Parent } | Where-Object { $_ -ne "" } | Select-Object -Unique
if ($subDirs.Count -gt 0) {
    $mkdirCmds = ($subDirs | ForEach-Object { "mkdir -p '${StagingDir}/$($_.Replace('\','/'))'" }) -join ' && '
    ssh "${VpsUser}@${VpsHost}" $mkdirCmds | Out-Null
}

foreach ($relPath in $relativePaths) {
    $localFile = Join-Path $LocalDeployDir ($relPath -replace '/', '\')
    $remoteDest = "${StagingDir}/$relPath"
    Write-Host "  -> $relPath"
    scp -q "$localFile" "${VpsUser}@${VpsHost}:${remoteDest}"
    if ($LASTEXITCODE -ne 0) {
        Fail "Echec du depot de : $relPath"
    }
}
Write-Host "OK : fichiers deposes."

# 3. Declencher le script de deploiement cote serveur, avec la liste
#    exacte des fichiers a deployer en arguments.
Write-Host ""
Write-Host "Sauvegarde de la version actuelle + deploiement ..."
$fileArgs = ($relativePaths | ForEach-Object { "'$_'" }) -join ' '
$deployOutput = ssh "${VpsUser}@${VpsHost}" "sudo /usr/local/bin/mutuellepro-deploy.sh $fileArgs"
$deployOutputText = $deployOutput -join "`n"
Write-Host $deployOutputText

if ($deployOutputText -notmatch "DEPLOY_OK") {
    Fail "Le script de deploiement cote serveur n'a pas confirme le succes. Verifiez le message ci-dessus. (Les fichiers restent dans .\deploy\.)"
}
if ($deployOutputText -match "PM2_RESTART_OK") {
    Write-Host "OK : vin-decoder-api redemarre (server.js modifie)." -ForegroundColor Cyan
}

# 4. Rapatriement de la sauvegarde vers le laptop
$backupLine = $deployOutput | Select-String "BACKUP_DIR="
$remoteBackupFolder = if ($backupLine) { ($backupLine -split "=", 2)[1].Trim() } else { $null }
$sauvegardeOk = $false      # vrai seulement si l'ancienne version est en lieu sur ici
$backupName = $null

if ($remoteBackupFolder) {
    $backupName = Split-Path $remoteBackupFolder -Leaf
    # Liste les fichiers de la sauvegarde (chemins relatifs a last_backup/) --
    # sert a la fois a verifier s'il y a quelque chose, ET a savoir quoi
    # rapatrier individuellement juste apres (jamais de caractere generique
    # passe a scp -- comportement peu fiable constate sur Windows OpenSSH).
    $backupFilesRaw = ssh "${VpsUser}@${VpsHost}" "cd ${StagingDir}/last_backup 2>/dev/null && find . -type f | sed 's|^\./||'"
    $backupFiles = $backupFilesRaw -split "`n" | Where-Object { $_.Trim() -ne "" }

    if ($backupFiles.Count -eq 0) {
        Write-Host "Aucune sauvegarde a rapatrier (fichier(s) deploye(s) pour la premiere fois, rien a preserver)." -ForegroundColor DarkGray
        $sauvegardeOk = $true
    } else {
        $localBackupFolder = "$LocalBackupDir\$backupName"
        New-Item -ItemType Directory -Path $localBackupFolder -Force | Out-Null
        Write-Host "Rapatriement de la sauvegarde vers $localBackupFolder ..."

        $rapatriementOk = $true
        foreach ($relFile in $backupFiles) {
            $localSubPath = Join-Path $localBackupFolder ($relFile -replace '/', '\')
            $localSubDir = Split-Path $localSubPath -Parent
            if (-not (Test-Path $localSubDir)) {
                New-Item -ItemType Directory -Path $localSubDir -Force | Out-Null
            }
            Write-Host "  -> $relFile"
            scp -q "${VpsUser}@${VpsHost}:${StagingDir}/last_backup/$relFile" "$localSubPath"
            if ($LASTEXITCODE -ne 0) { $rapatriementOk = $false }
        }

        if ($rapatriementOk) {
            Write-Host "OK : sauvegarde locale confirmee."
            $sauvegardeOk = $true
        } else {
            Write-Host "ATTENTION : le rapatriement local a partiellement echoue, mais la sauvegarde distante existe bien sur le VPS ($remoteBackupFolder)." -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "ATTENTION : nom du dossier de sauvegarde non detecte, rapatriement local ignore." -ForegroundColor Yellow
}

# 5. MISE A JOUR DU MIROIR (v4) : deplacer les fichiers deployes de
#    .\deploy\ vers leur place dans le miroir local (ecrase l'ancienne
#    copie) -- seulement si le deploiement est confirme ET l'ancienne
#    version est en lieu sur. Sinon, on ne touche a rien.
$MiroirDir = "C:\mutuellepro_miroir"   # copie de reference de la production (non operationnelle, jamais deployee)
Write-Host ""
if ($sauvegardeOk -and $backupName) {
    try {
        foreach ($c in $retenus) {
            $dest = Join-Path $MiroirDir ($c.Rel -replace '/', '\')
            $destDir = Split-Path $dest -Parent
            if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
            Move-Item -LiteralPath $c.Full -Destination $dest -Force
        }
        # Supprime les sous-dossiers devenus vides dans .\deploy\ (jamais .\deploy\ lui-meme)
        Get-ChildItem -Path $LocalDeployDir -Recurse -Directory |
            Sort-Object { $_.FullName.Length } -Descending |
            Where-Object { -not (Get-ChildItem -LiteralPath $_.FullName -Force) } |
            ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force }
        Write-Host "OK : miroir local mis a jour ($($retenus.Count) fichier(s)) ; .\deploy\ vide." -ForegroundColor Cyan
    } catch {
        Write-Host "ATTENTION : mise a jour du miroir incomplete ($($_.Exception.Message)). Verifiez .\deploy\ et le miroir avant le prochain deploiement." -ForegroundColor Yellow
    }
} else {
    Write-Host "ATTENTION : miroir et .\deploy\ NON modifies (sauvegarde locale non confirmee). Verifiez avant le prochain deploiement." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "SUCCES : deploiement termine !" -ForegroundColor Green
Write-Host ""
Write-Host "Verifiez maintenant : https://mutuelleproassurances.com" -ForegroundColor Cyan
