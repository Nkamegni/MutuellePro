# Blocages Apache (zz-bloquer-*.conf) - releve du 15/10/2026

Contexte : Apache sert de proxy vers Node (port 3000) et Node sert tout le dossier du site (express.static).
Les blocages de fichiers sensibles se font donc dans Apache, via 4 fichiers de `/etc/apache2/conf-available/`,
actives par lien dans `conf-enabled/`.

| Fichier | MD5 | Role |
|---|---|---|
| zz-bloquer-code-serveur.conf | 44c20bcdd890b1777e2778ddb933c04e | bloque `^/vin-decoder-api(/|$)` |
| zz-bloquer-fichiers-sensibles.conf | 9dc5d3dc2818fb24150c5234574e9bf6 | bloque .git, node_modules, Sauvegardes et extensions sql/md/sh/py/tgz/tar/zip/dump/env, bak/avant/backup, ~ |
| zz-bloquer-sms-serverjs.conf | a0feab5b23b8948dedf352eb3919928f | bloque `/api/send-sms` (provisoire : route non authentifiee) et `/server.js` |
| zz-bloquer-extensions-complement.conf | 2046afdd2cdf51cfac1e2648d83727ee | bloque vhost, conf, ini, log, gz, rar, 7z, old, orig, csv, yml, yaml, key, pem, crt, ps1, xls, xlsx, docx, swp, rej, diff, patch (sauf /webmail/ et /.well-known/) |

Reapplication sur un serveur neuf (en root) :

    cp docs/infra/apache/zz-bloquer-*.conf /etc/apache2/conf-available/
    a2enconf zz-bloquer-code-serveur zz-bloquer-fichiers-sensibles zz-bloquer-sms-serverjs zz-bloquer-extensions-complement
    apache2ctl configtest && systemctl reload apache2

Controle : `curl -sI https://<domaine>/Sauvegardes/` doit repondre 403.
Ces fichiers sont une copie : la source de verite reste `/etc/apache2/`. Toute modification doit etre recapturee ici.
