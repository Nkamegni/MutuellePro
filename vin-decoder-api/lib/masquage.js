// =====================================================================
// Mutuelle Pro Assurances -- Masquage d'adresses pour indices utilisateur
// Redige le 02/09/2026, demande de Roger : donner un indice sur ou le
// code 2FA a ete envoye, sans exposer l'adresse/le numero en entier.
// =====================================================================

// "sylvie123@gmail.com" -> "sy*******@g*****.***"
// Garde 2 caracteres du nom local, 1 caractere du domaine, masque le
// reste (TLD inclus) -- fidele au gabarit demande par Roger.
function masquerEmail(email) {
    if (!email || !email.includes('@')) return null;
    const [local, domaineComplet] = email.split('@');
    const pointIndex = domaineComplet.lastIndexOf('.');
    const domaine = pointIndex === -1 ? domaineComplet : domaineComplet.slice(0, pointIndex);
    const tld = pointIndex === -1 ? '' : domaineComplet.slice(pointIndex + 1);

    const localVisible = local.slice(0, Math.min(2, local.length));
    const localMasque = 'x'.repeat(Math.max(local.length - localVisible.length, 1));

    const domaineVisible = domaine.slice(0, Math.min(1, domaine.length));
    const domaineMasque = 'x'.repeat(Math.max(domaine.length - domaineVisible.length, 1));

    const tldMasque = tld ? 'x'.repeat(tld.length) : 'xx';

    return `${localVisible}${localMasque}@${domaineVisible}${domaineMasque}.${tldMasque}`;
}

// "697717334" -> "697xxxxx4" -- garde les 3 premiers et le dernier
// chiffre, masque le reste. Fonctionne quel que soit le format de
// saisie (avec ou sans indicatif, espaces...).
function masquerTelephone(telephone) {
    if (!telephone) return null;
    const nettoye = telephone.replace(/\s+/g, '');
    if (nettoye.length < 5) return null; // trop court pour masquer utilement
    const debut = nettoye.slice(0, 3);
    const fin = nettoye.slice(-1);
    const milieu = 'x'.repeat(Math.max(nettoye.length - 4, 1));
    return `${debut}${milieu}${fin}`;
}

module.exports = { masquerEmail, masquerTelephone };
