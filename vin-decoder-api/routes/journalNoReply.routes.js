// =====================================================================
// Mutuelle Pro Assurances -- Journal des envois no-reply@
// Redige le 11/09/2026 -- demande de la session "Creation d'un
// serveur de messagerie" : consultation en lecture seule, pour la
// visibilite du staff. Le filtre Sieve conditionnel qu'ils construisent
// interroge directement site.no_reply_messages_envoyes, jamais cette
// route -- purement une fenetre de consultation, aucune logique
// metier ici.
// =====================================================================

const express = require('express');
const requireStaffAuth = require('../middleware/requireStaffAuth');
const requireStaffRole = require('../middleware/requireStaffRole');

module.exports = function (pool) {
    const router = express.Router();

    router.get('/journal-no-reply', requireStaffAuth, requireStaffRole(['administrateur', 'superadmin']), async (req, res) => {
        try {
            const resultat = await pool.query(
                `SELECT id, message_id, destinataire, type_message, reference_compte, date_envoi
                 FROM site.no_reply_messages_envoyes
                 ORDER BY date_envoi DESC
                 LIMIT 500`
            );
            return res.status(200).json({ succes: true, envois: resultat.rows });
        } catch (err) {
            console.error('[GET /api/staff/journal-no-reply] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    return router;
};
