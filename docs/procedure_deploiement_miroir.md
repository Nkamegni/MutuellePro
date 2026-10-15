# Procédure de déploiement et de miroir : à lire par toutes les sessions avant de livrer un fichier
**De :** session Git/GitHub · **Pour :** toutes les sessions (Production & Souscription, Espace collaboratif, myspace interface, Lot E, Tarification, Normalisation, Site public, Messagerie, Stocks) · **Via :** Roger · **Date :** 15/10/2026
**Source :** `deploy.ps1` v4 du 09/10/2026 (fichier de Roger, MD5 `dc3b5108f6e6d9daf54b350006c67ac6`)

## 1. Les lieux
| Lieu | Rôle |
|---|---|
| `C:\mutuellepro` (PC de Roger) | poste de travail |
| `C:\mutuellepro\deploy\` | **sas** : tout ce qu'il contient est déployé, avec son chemin relatif identique à celui du serveur |
| `/home/nkamegni/staging/` (VPS) | dépôt intermédiaire, rempli par `deploy.ps1` |
| `/root/mutuellepro-site/` (VPS) | **production** |
| `/root/mutuellepro-site/Sauvegardes/<horodatage>/` (VPS) | ancienne version de chaque fichier déployé |
| `C:\mutuellepro\Sauvegardes\<horodatage>\` (PC) | copie locale de cette sauvegarde |
| `C:\mutuellepro_miroir\` (PC) | **miroir** : même arborescence que la production, copie de référence, jamais déployée, sans `.env` |

## 2. Ce que fait `.\deploy.ps1`
1. Liste les fichiers de `.\deploy\`. Un fichier plus ancien que 6 h est signalé « ANCIEN » et écarté sauf confirmation.
2. Roger confirme. Chaque fichier est copié dans le staging, puis `sudo /usr/local/bin/mutuellepro-deploy.sh` sauvegarde l'ancienne version, installe la nouvelle et redémarre pm2 si `server.js` change. Il affiche `DEPLOY_OK` et `BACKUP_DIR=`.
3. La sauvegarde est rapatriée sur le PC.
4. **Le miroir est mis à jour** : chaque fichier déployé est déplacé du sas vers sa place dans le miroir, en écrasant l'ancienne copie.

**Dépôt et installation sont une seule opération.** `deploy.ps1` ne compare pas la production à la base du fichier livré : ce contrôle se fait donc avant de le lancer (§4).

## 3. Règles pour les sessions qui livrent un fichier
1. Livrer le fichier avec **son chemin relatif exact** (celui de `/root/mutuellepro-site/`).
2. Indiquer en tête du message : le **MD5 de la base** sur laquelle il est bâti, et le **MD5 du fichier livré**.
3. Un seul fichier cumulatif à la fois pour un même chemin. Pour `myspace.html`, la base actuelle est `be9f56b2a6f27a7258a567eb7ee54338` (2026.10.14-a).
4. Pour un fichier du miroir : **le miroir est une référence, pas une garantie.** Avant de repartir d'une copie du miroir, comparer son MD5 à celui de la production.
5. **Aucun dépôt en dehors de `deploy.ps1`** (copie manuelle, `scp` direct, autre PC). Si c'est inévitable, le dire à Roger et à Git le jour même ; le miroir ne se met à jour que par `deploy.ps1`, il dérive sinon.

## 4. Contrôles de Roger
**Avant de lancer `deploy.ps1`** : comparer le MD5 de la production à celui de la base annoncée.
```
sudo md5sum /root/mutuellepro-site/<chemin relatif>
```
S'ils diffèrent, ne pas déposer.

**Après** : `DEPLOY_OK`, puis le même `md5sum` doit donner le MD5 du fichier livré.

**Contrôle de dérive (lecture seule)** : compare tout le miroir à la production.
```
# PowerShell, sur le PC
Get-ChildItem C:\mutuellepro_miroir -Recurse -File | Where-Object { $_.FullName -notmatch '\\(node_modules|\.git)\\' } | ForEach-Object { "{0}  {1}" -f (Get-FileHash $_.FullName -Algorithm MD5).Hash.ToLower(), $_.FullName.Substring('C:\mutuellepro_miroir\'.Length).Replace('\','/') } | Set-Content -Encoding ascii .\miroir_md5.txt
scp .\miroir_md5.txt nkamegni@31.207.37.41:/home/nkamegni/
# VPS
sudo bash -c 'cd /root/mutuellepro-site && sed "s/\r$//" /home/nkamegni/miroir_md5.txt | md5sum -c --quiet -'
```
Aucune sortie : miroir identique à la production. Sinon, les fichiers `FAILED` ont été modifiés hors de `deploy.ps1`.

## 5. Capture dans Git
Git capture la production sur la branche `feat/...` de la session, **sur accord écrit de Roger nommant le MD5**, avec un script gardé que Roger exécute. Git ne rédige pas les fichiers des sessions.

## 6. Constat au 15/10/2026
Le contrôle de dérive du 15/10 (09:10) montre que `vin-decoder-api/routes/mouvements.routes.js` a été installé en production **sans passer par `mutuellepro-deploy.sh`** : miroir `0ddb93fd…` (version du 07/10), production `f6c59449…` (build 2026-10-13-a, écrite le 13/10 à 18:06), et aucune sauvegarde de ce fichier après celle du 07/10. Le miroir est donc périmé pour ce fichier : ne pas repartir de lui, repartir de la production ou de Git. Tous les autres fichiers du miroir contrôlés sont identiques à la production, dont `myspace.html` (`be9f56b2…`). Un second écart signalé sur `public/devis.js` est en cours de recontrôle.

## 7. Amélioration proposée (hors cette procédure)
Faire vérifier par `deploy.ps1` la base annoncée : pour chaque fichier du sas, comparer le MD5 de la production (relevé par `ssh`) à celui du miroir, et refuser le dépôt en cas d'écart. Roger a indiqué que c'était possible « quand vous voudrez » ; Git en fournit le texte sur demande.
