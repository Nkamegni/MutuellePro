// =====================================================================
// Mutuelle Pro Assurances — Export programmé des KPI (cron)
// Fichier autonome, PAS un routeur Express -- invoqué périodiquement
// par crontab, comme cron_snapshot_kpis_quotidien.js.
// =====================================================================
// Catégorie 2 (infrastructure data dashboard), dernier point de la
// demande initiale du 04/09/2026. Écrit à la demande explicite de Roger
// le 09/09/2026.
//
// CORRECTIF APPLIQUÉ (session myspace.html, 09/09/2026) : le chemin du
// .env était chargé sans précision (`require('dotenv').config()`),
// exactement la même faille que celle trouvée et corrigée sur
// cron_snapshot_kpis_quotidien.js (`client password must be a string`
// en conditions réelles, faute de trouver le .env depuis le répertoire
// d'exécution du cron). Corrigé ici par avance, avec le même chemin
// absolu déjà éprouvé -- pas la peine d'attendre une 3ᵉ découverte du
// même bug en production.
//
// Points de la liste "à valider" d'origine, tranchés par la session
// myspace.html à partir de server.js déjà consulté cette session :
//   - Variables PostgreSQL : CONFIRMÉ -- server.js utilise bien
//     PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD via `new Pool({...})`
//     explicite ; `new Pool()` sans argument (comme ici) lit ces mêmes
//     noms standard automatiquement -- aucune adaptation nécessaire.
//   - Variables SMTP : CONFIRMÉ -- server.js utilise bien
//     SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASSWORD pour son propre
//     mailTransporter -- identiques à celles utilisées ici.
//   - dotenv : CONFIRMÉ déjà présent -- server.js lui-même en dépend
//     (`require('dotenv').config()` en tout début de fichier), donc
//     nécessairement déjà installé.
//
// À VALIDER AVANT DÉPLOIEMENT (ce qui reste réellement ouvert) :
//   1. Fréquence : exemple ci-dessous en fin de fichier = chaque lundi
//      7h00. À ajuster selon la préférence réelle (le besoin d'origine
//      ne précisait qu'"périodique").
//   2. Destinataires : ce script cible tout le personnel
//      administrateur/superadmin (même périmètre que l'addendum
//      "comptes sans boîte mail" et la feuille "Tâches par
//      responsable"). Si un périmètre différent est souhaité (ex. une
//   3. Destinataires : ce script cible tout le personnel
//      administrateur/superadmin (même périmètre que l'addendum
//      "comptes sans boîte mail" et la feuille "Tâches par
//      responsable"). Si un périmètre différent est souhaité (ex. une
//      liste blanche distincte), le remplacer par une requête ou une
//      variable d'environnement dédiée plutôt que ce choix par défaut.
//   4. Emplacement du fichier -- écrit pour être placé À LA RACINE du
//      projet (au même niveau que les dossiers routes/ et lib/), comme
//      cron_snapshot_kpis_quotidien.js. Les chemins relatifs
//      ('./lib/...') supposent cet emplacement -- les ajuster si le
//      script est placé ailleurs.
// =====================================================================

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const { construireWorkbookKpis } = require('./lib/construireWorkbookKpis');
// gabaritEmail CONFIRMÉ exporté par lib/gabaritEmail.js (vérifié
// directement dans le fichier -- plusieurs module.exports successifs,
// seul le dernier compte en JS, et il inclut bien gabaritEmail).
const { gabaritEmail } = require('./lib/gabaritEmail'); // réutilise le gabarit HTML déjà en place (auth.routes.js) -- à confirmer que le nom exporté correspond

const pool = new Pool();

const mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
});

async function executerExportPeriodique() {
    console.log(`[${new Date().toISOString()}] Export périodique des KPI -- démarrage`);
    try {
        const destinataires = await pool.query(
            `SELECT email, TRIM(COALESCE(prenom, '') || ' ' || nom) AS nom FROM site.staff
             WHERE code_role IN ('administrateur', 'superadmin') AND statut_compte = 'actif'`
        );
        if (destinataires.rows.length === 0) {
            console.log('Aucun destinataire administrateur/superadmin actif -- export non envoyé.');
            return;
        }

        // Export "toutes dates confondues" par défaut pour la version
        // programmée -- une synthèse périodique gagne à montrer l'état
        // global, pas une fenêtre glissante déjà couverte par le dashboard.
        //
        // req simulé plutôt qu'une vraie requête HTTP (ce script n'en a
        // pas) : construireDonneesKpis lit req.query.periode et
        // req.session directement, même signature que la route HTTP.
        // id_staff: null -> aucune ligne dans seuils_alerte_staff pour
        // cet id -> seuil par défaut (0j), cohérent avec une synthèse
        // globale non liée à un staff précis. code_role: 'administrateur'
        // -> la feuille Administration (tâches par responsable, prospects
        // par statut) est incluse, adaptée à un envoi aux admins/superadmins.
        const reqSimule = { query: { periode: null }, session: { id_staff: null, code_role: 'administrateur' } };
        const workbook = await construireWorkbookKpis(pool, reqSimule);
        const buffer = await workbook.xlsx.writeBuffer();
        const dateFichier = new Date().toISOString().slice(0, 10);

        for (const destinataire of destinataires.rows) {
            try {
                await mailTransporter.sendMail({
                    from: '"Mutuelle Pro Assurances" <no-reply@mutuelleproassurances.com>',
                    to: destinataire.email,
                    subject: `Export périodique des KPI -- ${dateFichier}`,
                    html: gabaritEmail('Export périodique des KPI', `<p>Bonjour ${destinataire.nom},</p><p>Veuillez trouver ci-joint l'export périodique des indicateurs clés du tableau de bord.</p>`),
                    attachments: [{ filename: `kpis_mutuellepro_${dateFichier}.xlsx`, content: buffer }],
                });
                console.log(`Envoyé à ${destinataire.email}`);
            } catch (err) {
                // Un échec d'envoi individuel n'interrompt pas les suivants --
                // même principe que les notifications de connexion existantes
                // (auth.routes.js), une adresse en erreur ne doit pas priver
                // les autres destinataires du rapport.
                console.error(`Échec d'envoi à ${destinataire.email} :`, err);
            }
        }
        console.log(`[${new Date().toISOString()}] Export périodique des KPI -- terminé (${destinataires.rows.length} destinataire(s))`);
    } catch (err) {
        console.error('[cron_export_kpis_periodique] Erreur :', err);
    } finally {
        await pool.end();
    }
}

executerExportPeriodique();

// =====================================================================
// Entrée crontab suggérée (chaque lundi 7h00, à ajuster) :
//
// 0 7 * * 1 /usr/bin/node /chemin/absolu/vers/cron_export_kpis_periodique.js >> /var/log/mutuellepro/export_kpis.log 2>&1
//
// Reprendre le même utilisateur système et le même chemin de log que
// cron_snapshot_kpis_quotidien.js pour rester cohérent.
// =====================================================================
