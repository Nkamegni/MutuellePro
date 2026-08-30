// =====================================================================
// Mutuelle Pro Assurances — Envoi du code de suivi de ticket
// =====================================================================
// POINT D'INTÉGRATION UNIQUE pour le futur canal SMS ou WhatsApp
// Business API (fournisseur non encore choisi — Alpha Access SARL
// titulaire du numéro, décision du 27/08/2026, démarche en cours).
//
// Tant qu'aucun fournisseur n'est configuré, cette fonction NE FAIT
// AUCUN ENVOI réel — elle le déclare honnêtement plutôt que de
// prétendre réussir. Le jour où un fournisseur est choisi, SEULE
// cette fonction doit changer ; rien côté routes ni côté frontend.
// =====================================================================

async function envoyerCodeSuivi(telephone, code) {
    console.warn(`[envoyerCodeSuivi] Canal non configure -- code ${code} genere pour ${telephone} mais NON envoye.`);
    return { envoye: false, raison: 'canal_non_configure' };
}

module.exports = { envoyerCodeSuivi };
