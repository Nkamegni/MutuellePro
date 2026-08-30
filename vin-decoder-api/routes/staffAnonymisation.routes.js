// =====================================================================
// Mutuelle Pro Assurances — Phase 2c
// Route : POST /api/staff/clients/:id/anonymiser
//         Conformité loi n°2024/017 — droit à l'effacement. Anonymise
//         (n'efface pas physiquement) : email/téléphone remplacés par
//         des valeurs neutres, compte suspendu, mot de passe invalidé.
//         Les tickets restent en base (historique statistique), mais
//         leurs champs email_contact/telephone_contact sont eux aussi
//         anonymisés. Restreint au rôle Administrateur uniquement —
//         action la plus sensible du système, au-delà du Gestionnaire.
// =====================================================================
//
// Intégration dans server.js :
//
//   const staffAnonymisationRouter = require('./routes/staffAnonymisation.routes')(pool);
//   app.use('/api/staff', staffAnonymisationRouter);
// =====================================================================

const express = require('express');
const crypto = require('crypto');
const requireStaffAuth = require('../middleware/requireStaffAuth');
const requireStaffRole = require('../middleware/requireStaffRole');

module.exports = function (pool) {
    const router = express.Router();

    router.post('/clients/:id/anonymiser', requireStaffAuth, requireStaffRole(['administrateur']), async (req, res) => {
        const idUtilisateur = parseInt(req.params.id, 10);
        if (!Number.isInteger(idUtilisateur)) {
            return res.status(400).json({ succes: false, erreurs: ['id client invalide'] });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const existe = await client.query('SELECT id_utilisateur FROM site.utilisateurs WHERE id_utilisateur = $1', [idUtilisateur]);
            if (existe.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ succes: false, erreurs: ['client introuvable'] });
            }

            const emailAnonyme = `anonymise-${idUtilisateur}@supprime.local`;
            const telephoneAnonyme = `ANON-${idUtilisateur}`;
            // Hash aléatoire inutilisable — aucun mot de passe ne pourra
            // jamais correspondre, le compte devient définitivement
            // inaccessible en plus d'être suspendu.
            const hacheInutilisable = crypto.randomBytes(32).toString('hex');

            await client.query(
                `UPDATE site.utilisateurs
                 SET email = $1, telephone = $2, mot_de_passe_hache = $3,
                     statut_compte = 'suspendu', email_verifie = false, telephone_verifie = false
                 WHERE id_utilisateur = $4`,
                [emailAnonyme, telephoneAnonyme, hacheInutilisable, idUtilisateur]
            );

            // Anonymisation des tickets liés — l'historique (type, statut,
            // dates, contenu structuré) reste exploitable statistiquement,
            // seules les coordonnées de contact directes sont effacées.
            await client.query(
                `UPDATE site.tickets SET email_contact = $1, telephone_contact = $2 WHERE id_utilisateur = $3`,
                [emailAnonyme, telephoneAnonyme, idUtilisateur]
            );

            // Révocation de toute session active de ce compte.
            await client.query(`DELETE FROM site.session WHERE sess::jsonb->>'id_utilisateur' = $1::text`, [idUtilisateur.toString()]);

            // Journal d'audit — volontairement SANS les anciennes valeurs
            // (donnees_avant), pour ne pas réintroduire les données
            // personnelles qu'on vient d'effacer dans un autre journal.
            await client.query(
                `INSERT INTO site.journal_audit (id_staff, action, table_concernee, id_enregistrement, donnees_apres, adresse_ip)
                 VALUES ($1, 'client.anonymisation', 'utilisateurs', $2, $3::jsonb, $4)`,
                [req.session.id_staff, idUtilisateur, JSON.stringify({ email: emailAnonyme, telephone: telephoneAnonyme }), req.ip]
            );

            await client.query('COMMIT');

            return res.status(200).json({ succes: true });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('[POST /api/staff/clients/:id/anonymiser] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        } finally {
            client.release();
        }
    });

    return router;
};
