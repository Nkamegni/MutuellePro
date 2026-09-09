// =====================================================================
// Mutuelle Pro Assurances -- Gabarit HTML partage pour les emails
// Redige le 02/09/2026, d'apres les directives de Roger (logo, bloc
// bleu, coordonnees, pied de page). Un seul endroit a faire evoluer
// si le format doit changer un jour -- pas un email par email.
//
// BILINGUISME (02/09/2026) : decision actee par Roger -- le module de
// langue existe deja ailleurs dans le projet (dictionnaire-langues.js
// cote site public, traduire() prevu cote PWA/espace-partage), langue
// actuelle = francais. Ce fichier reste volontairement en dur en
// francais pour l'instant -- une session dediee traitera la traduction
// de ces gabarits le moment venu, pas a construire maintenant.
// =====================================================================

const URL_LOGO = 'https://mutuelleproassurances.com/Logo_MPRO.png';

// titre : texte du bloc bleu (ex. "Connexion réussie à votre espace client")
// corpsHtml : contenu propre à chaque email, déjà en HTML
function gabaritEmail(titre, corpsHtml) {
    return `
    <div style="max-width:560px; margin:0 auto; font-family:Arial, sans-serif; color:#334155;">
        <div style="text-align:center; padding:24px 0 16px;">
            <img src="${URL_LOGO}" alt="Mutuelle Pro Assurances" style="height:48px;">
        </div>

        <div style="background:#1454C4; color:white; text-align:center; padding:14px 20px; border-radius:8px 8px 0 0; font-size:16px; font-weight:700;">
            ${titre}
        </div>

        <div style="background:#f8fafc; padding:8px 20px; font-size:11px; color:#64748b; text-align:center;">
            MUTUELLE PRO ASSURANCES — Rue des Manguiers — B.P. 3769 Yaoundé
        </div>

        <div style="background:white; padding:24px 20px; border:1px solid #e2e8f0; border-top:none; font-size:14px; line-height:1.6;">
            ${corpsHtml}
        </div>

        <div style="text-align:center; padding:20px 10px; font-size:10px; color:#94a3b8; line-height:1.6;">
            <p style="margin:0 0 8px;">Ce message a été envoyé automatiquement par Mutuelle Pro Assurances</p>
            <p style="margin:0 0 8px;">Courtier en Assurances agréé par le MINFI — Cameroun<br>
            Entreprise régie par le Code CIMA — Agréé par arrêté n° 032/MINFI/SG/DGTCFM/DA/SDACC/C du 21/03/11</p>
        </div>
    </div>`;
}

module.exports = { gabaritEmail };

// Corps de l'email "Connexion réussie" -- nom, référence de compte
// (matricule Partenaire, id_utilisateur Client -- pas d'équivalent
// "MPRO-XXXXXXX" existant pour les Clients, signalé à Roger),
// date/IP/navigateur/système capturées depuis le Lot B et l'analyseur
// User-Agent (02/09/2026).
function corpsConnexionReussie({ nomComplet, typeCompte, referenceCompte, date, ip, navigateur, systeme }) {
    const dateStr = new Date(date).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'medium' });
    const libelleType = typeCompte === 'partenaire' ? 'partenaire' : 'client';
    return `
        <p>Bonjour ${nomComplet},<br>Compte ${libelleType} : <strong>${referenceCompte}</strong></p>
        <p>Nous vous informons qu'une connexion à votre espace ${libelleType} a été effectuée avec succès :</p>
        <table style="width:100%; font-size:13px; margin:14px 0;">
            <tr><td style="padding:4px 0; color:#64748b;">Date de connexion</td><td style="padding:4px 0; font-weight:700;">${dateStr}</td></tr>
            <tr><td style="padding:4px 0; color:#64748b;">Adresse IP</td><td style="padding:4px 0; font-weight:700;">${ip || 'non disponible'}</td></tr>
            <tr><td style="padding:4px 0; color:#64748b;">Navigateur</td><td style="padding:4px 0; font-weight:700;">${navigateur || 'Inconnu'}</td></tr>
            <tr><td style="padding:4px 0; color:#64748b;">Système</td><td style="padding:4px 0; font-weight:700;">${systeme || 'Inconnu'}</td></tr>
        </table>
        <p>Si vous êtes à l'origine de cette connexion, aucune action n'est nécessaire.</p>
        <p><strong>Si vous n'en êtes pas à l'origine</strong>, changez votre mot de passe dès que possible depuis votre espace (Sécurité), et contactez-nous si besoin.</p>
        <p style="margin-top:20px;">Cordialement,<br>L'équipe Mutuelle Pro Assurances</p>
    `;
}

module.exports = { gabaritEmail, corpsConnexionReussie };

// Corps de l'email du code de vérification 2FA -- fidèle au gabarit
// d'origine transmis par Roger (02/09/2026) : code en très gros
// caractères, expiration à 10 minutes, avertissement de ne jamais le
// partager, puis les détails de la tentative de connexion.
function corpsCodeConnexion({ nomComplet, typeCompte, referenceCompte, code, date, ip, navigateur, systeme }) {
    const dateStr = new Date(date).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'medium' });
    const libelleType = typeCompte === 'partenaire' ? 'partenaire' : typeCompte === 'staff' ? 'personnel' : 'client';
    return `
        <p>Bonjour ${nomComplet},<br>Compte ${libelleType} : <strong>${referenceCompte}</strong></p>
        <p>Utilisez le code ci-dessous pour finaliser votre connexion :</p>
        <p style="text-align:center; font-size:32px; font-weight:800; letter-spacing:8px; color:#1454C4; margin:20px 0;">${code}</p>
        <p>Ce code expirera dans <strong>10 minutes</strong>.</p>
        <p style="color:#dc2626; font-weight:700;">⚠️ Ne partagez jamais ce code avec qui que ce soit.</p>
        <p style="margin-top:20px;">Vous recevez cet email car une tentative de connexion a été effectuée sur votre compte.</p>
        <table style="width:100%; font-size:13px; margin:14px 0;">
            <tr><td style="padding:4px 0; color:#64748b;">Date de connexion</td><td style="padding:4px 0; font-weight:700;">${dateStr}</td></tr>
            <tr><td style="padding:4px 0; color:#64748b;">Adresse IP</td><td style="padding:4px 0; font-weight:700;">${ip || 'non disponible'}</td></tr>
            <tr><td style="padding:4px 0; color:#64748b;">Navigateur</td><td style="padding:4px 0; font-weight:700;">${navigateur || 'Inconnu'}</td></tr>
            <tr><td style="padding:4px 0; color:#64748b;">Système utilisé</td><td style="padding:4px 0; font-weight:700;">${systeme || 'Inconnu'}</td></tr>
        </table>
    `;
}

module.exports = { gabaritEmail, corpsConnexionReussie, corpsCodeConnexion };

// Corps de l'email d'activation de compte -- Personnel et Partenaire
// partagent exactement le même gabarit (03/09/2026, demande de Roger :
// généraliser le beau gabarit à tous les emails système, à commencer
// par le lien d'activation).
function corpsActivation({ nomComplet, typeCompte, lien }) {
    const libelleType = typeCompte === 'partenaire' ? 'partenaire' : 'Personnel';
    return `
        <p>Bonjour,</p>
        <p>Un compte ${libelleType} a été créé pour <strong>${nomComplet}</strong> sur l'espace Mutuelle Pro Assurances.</p>
        <p>Pour l'activer et définir votre mot de passe, cliquez sur le bouton ci-dessous (valable 72 heures) :</p>
        <p style="text-align:center; margin:24px 0;">
            <a href="${lien}" style="background:#1454C4; color:white; text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:700; display:inline-block;">Activer mon compte</a>
        </p>
        <p style="font-size:11px; color:#94a3b8;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>${lien}</p>
    `;
}

module.exports = { gabaritEmail, corpsConnexionReussie, corpsCodeConnexion, corpsActivation };

// Corps de l'email de réinitialisation de mot de passe -- Personnel et
// Partenaire (03/09/2026), même gabarit que le reste.
function corpsReinitialisation({ nomComplet, typeCompte, lien }) {
    const libelleType = typeCompte === 'partenaire' ? 'partenaire' : 'personnel';
    return `
        <p>Bonjour ${nomComplet},</p>
        <p>Vous avez demandé la réinitialisation du mot de passe de votre compte ${libelleType}.</p>
        <p style="text-align:center; margin:24px 0;">
            <a href="${lien}" style="background:#1454C4; color:white; text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:700; display:inline-block;">Réinitialiser mon mot de passe</a>
        </p>
        <p>Ce lien est valable <strong>1 heure</strong>.</p>
        <p>Si vous n'êtes pas à l'origine de cette demande, ignorez ce message — votre mot de passe actuel reste inchangé.</p>
        <p style="font-size:11px; color:#94a3b8;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>${lien}</p>
    `;
}

module.exports = { gabaritEmail, corpsConnexionReussie, corpsCodeConnexion, corpsActivation, corpsReinitialisation };
