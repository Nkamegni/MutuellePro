// =====================================================================
// Mutuelle Pro Assurances -- Blocage de correction après lecture
// (16/09/2026, exigence de Roger : éviter toute contestation possible
// sur un message déjà délivré et lu. Révisé le même jour, 2e demande :
// un délai de grâce de 30 secondes après la lecture reste toléré --
// non lu, non délivré, ou lu depuis moins de 30s : correction
// possible. Lu depuis plus de 30s par au moins un destinataire réel :
// définitivement bloqué.)
// =====================================================================

const DELAI_GRACE_MS = 30 * 1000;

// true si cette date de lecture existe ET date d'il y a plus de 30s.
function lectureExpiree(dateLecture) {
    if (!dateLecture) return false;
    return (Date.now() - new Date(dateLecture).getTime()) > DELAI_GRACE_MS;
}

// Détermine si un message est bloqué à la correction, selon les
// destinataires RÉELS de ce message précis (dépend de qui l'a écrit et
// de visible_client -- jamais l'auteur lui-même). Bloqué dès qu'AU
// MOINS UN destinataire concerné a dépassé le délai de grâce depuis sa
// propre lecture -- le plus protecteur des deux, cohérent avec
// l'intention de Roger (éviter qu'un destinataire ait déjà vu la
// version originale pendant qu'un autre verrait une version corrigée).
function messageBloqueCorrectionApresLecture({ typeAuteur, visibleClient, dateLectureClient, dateLectureStaff, dateLecturePartenaire }) {
    if (typeAuteur === 'client') {
        return lectureExpiree(dateLectureStaff) || lectureExpiree(dateLecturePartenaire);
    }
    if (typeAuteur === 'staff') {
        return visibleClient
            ? (lectureExpiree(dateLectureClient) || lectureExpiree(dateLecturePartenaire))
            : lectureExpiree(dateLecturePartenaire);
    }
    if (typeAuteur === 'partenaire') {
        return visibleClient
            ? (lectureExpiree(dateLectureClient) || lectureExpiree(dateLectureStaff))
            : lectureExpiree(dateLectureStaff);
    }
    return false;
}

module.exports = { messageBloqueCorrectionApresLecture, DELAI_GRACE_MS };
