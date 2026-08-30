// =====================================================================
// Mutuelle Pro Assurances — Phase 2b
// Middleware : requireStaffRole — restreint une route à une liste de
//              rôles autorisés (matrice RBAC, §1.3 du CDCF)
// =====================================================================
//
// À utiliser APRÈS requireStaffAuth dans la chaîne de middlewares, car
// il suppose req.session.code_role déjà présent :
//
//   router.patch('/tickets/:id/statut', requireStaffAuth,
//       requireStaffRole(['gestionnaire', 'administrateur']),
//       async (req, res) => { ... });
// =====================================================================

module.exports = function requireStaffRole(rolesAutorises) {
    return function (req, res, next) {
        if (!req.session || !req.session.code_role || !rolesAutorises.includes(req.session.code_role)) {
            return res.status(403).json({ succes: false, erreurs: ['droits insuffisants pour cette action'] });
        }
        next();
    };
};
