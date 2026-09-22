// =====================================================================
// Mutuelle Pro Assurances — Notifications externes (Lot E, 15/09/2026)
// La coordination avec la session Messagerie n'a jamais abouti à du code
// (confirmé absent le 15/09) -- construit ici en autonome, réutilise le
// patron nodemailer déjà en place partout ailleurs dans ce projet, et la
// table de journalisation déjà existante (site.no_reply_messages_envoyes).
// =====================================================================

const nodemailer = require('nodemailer');

const mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
});

const SUJETS = {
    nouveau_message_client: (c) => `Mutuelle Pro Assurances — Nouveau message sur votre demande ${c.codeTicket}`,
    reponse_staff: (c) => `Mutuelle Pro Assurances — Réponse à votre demande ${c.codeTicket}`,
};

// Envoie systématiquement, que le destinataire soit connecté en socket ou
// non (détection de présence fiable trop complexe à garantir -- un email
// manquant sur un dossier coûte plus cher qu'une notification redondante,
// décision déjà actée dans la conception d'origine).
async function envoyerNotificationExterne(pool, { destinataireEmail, destinataireNom, typeEvenement, contexte }) {
    if (!destinataireEmail) return;
    const sujet = SUJETS[typeEvenement] ? SUJETS[typeEvenement](contexte) : 'Mutuelle Pro Assurances — Notification';
    try {
        const infoEnvoi = await mailTransporter.sendMail({
            from: '"Mutuelle Pro Assurances" <no-reply@mutuelleproassurances.com>',
            to: destinataireEmail,
            subject: sujet,
            html: `
                <p>Bonjour ${destinataireNom || ''},</p>
                <p>${contexte.extrait ? `Nouveau message : « ${contexte.extrait} »` : 'Un nouveau message vous attend.'}</p>
                <p>Consultez votre demande <strong>${contexte.codeTicket}</strong> depuis votre espace.</p>
            `,
        });
        try {
            await pool.query(
                `INSERT INTO site.no_reply_messages_envoyes (message_id, destinataire, type_message, reference_compte)
                 VALUES ($1, $2, $3, $4)`,
                [infoEnvoi.messageId, destinataireEmail, typeEvenement, contexte.codeTicket]
            );
        } catch (err) {
            console.error('[envoyerNotificationExterne] Erreur journalisation no-reply (ignorée) :', err);
        }
    } catch (err) {
        console.error('[envoyerNotificationExterne] Erreur envoi email :', err);
        // Non bloquant -- jamais faire échouer l'action métier pour ça,
        // même principe que notifierClientChangementStatut déjà en place.
    }
}

module.exports = { envoyerNotificationExterne };
