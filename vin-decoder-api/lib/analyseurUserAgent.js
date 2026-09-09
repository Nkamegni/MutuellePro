// =====================================================================
// Mutuelle Pro Assurances -- Analyseur User-Agent minimal
// Redige le 02/09/2026 -- pas de dependance npm ajoutee, juste les cas
// courants (les six navigateurs/systemes qui couvrent l'immense
// majorite du trafic reel). Pas exhaustif par construction : un
// navigateur/systeme non reconnu retombe sur "Inconnu", jamais une
// fausse valeur inventee.
// =====================================================================

function analyserNavigateur(userAgent) {
    if (!userAgent) return 'Inconnu';
    const ua = userAgent;

    // Ordre important : Edge et Opera contiennent aussi "Chrome" dans
    // leur UA, donc testes AVANT Chrome pour ne pas les confondre.
    if (/Edg\//.test(ua)) return 'Edge';
    if (/OPR\/|Opera/.test(ua)) return 'Opera';
    if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return 'Chrome';
    if (/Firefox\//.test(ua)) return 'Firefox';
    if (/Safari\//.test(ua) && /Version\//.test(ua)) return 'Safari';
    return 'Inconnu';
}

function analyserSysteme(userAgent) {
    if (!userAgent) return 'Inconnu';
    const ua = userAgent;

    if (/Windows NT/.test(ua)) return 'Windows';
    if (/Mac OS X/.test(ua) && !/iPhone|iPad/.test(ua)) return 'macOS';
    if (/Android/.test(ua)) return 'Android';
    if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
    if (/Linux/.test(ua) && !/Android/.test(ua)) return 'Linux';
    return 'Inconnu';
}

module.exports = { analyserNavigateur, analyserSysteme };
