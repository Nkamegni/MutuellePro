// =====================================================================
// Mutuelle Pro Assurances — Phase 2a
// Middleware : requireStaffAuth — protège les routes réservées au staff
// =====================================================================
//
// Distinct de middleware/requireAuth.js (clients) : vérifie
// req.session.id_staff, jamais req.session.id_utilisateur. Grâce au
// montage de staffSession sur le préfixe /api/staff (voir server.js),
// req.session est ici garanti être la session STAFF, pas la session
// client, même si les deux cookies sont présents dans la requête.
// =====================================================================

module.exports = function requireStaffAuth(req, res, next) {
    if (!req.session || !req.session.id_staff) {
        return res.status(401).json({ succes: false, erreurs: ['authentification staff requise'] });
    }
    next();
};
