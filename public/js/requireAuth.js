// =====================================================================
// Mutuelle Pro Assurances — Helpdesk Volet 2
// Middleware : requireAuth — protège les routes réservées aux comptes
// =====================================================================
//
// Utilisation dans n'importe quelle route protégée :
//
//   const requireAuth = require('../middleware/requireAuth');
//   router.get('/quelque-route', requireAuth, async (req, res) => { ... });
//
// Après passage de ce middleware, req.session.id_utilisateur est garanti
// présent et valide dans le handler de route.
// =====================================================================

module.exports = function requireAuth(req, res, next) {
    if (!req.session || !req.session.id_utilisateur) {
        return res.status(401).json({ succes: false, erreurs: ['authentification requise'] });
    }
    next();
};
