// =====================================================================
// Mutuelle Pro Assurances — Phase 2c
// Route : POST /api/staff/changer-mot-de-passe
// =====================================================================
//
// Intégration dans server.js :
//
//   const staffChangerMdpRouter = require('./routes/staffChangerMotDePasse.routes')(pool);
//   app.use('/api/staff', staffChangerMdpRouter);
// =====================================================================

const express = require('express');
const argon2 = require('argon2');
const requireStaffAuth = require('../middleware/requireStaffAuth');

function motDePasseRobuste(mdp) {
    if (typeof mdp !== 'string' || mdp.length < 10) return false;
    if (!/[a-zA-Z]/.test(mdp)) return false;
    if (!/[0-9]/.test(mdp)) return false;
    if (!/[^a-zA-Z0-9]/.test(mdp)) return false;
    return true;
}

module.exports = function (pool) {
    const router = express.Router();

    router.post('/changer-mot-de-passe', requireStaffAuth, async (req, res) => {
        const { mot_de_passe_actuel, nouveau_mot_de_passe, nouveau_mot_de_passe_confirmation } = req.body;

        if (!mot_de_passe_actuel || !nouveau_mot_de_passe) {
            return res.status(400).json({ succes: false, erreurs: ['mot_de_passe_actuel et nouveau_mot_de_passe requis'] });
        }
        if (!motDePasseRobuste(nouveau_mot_de_passe)) {
            return res.status(400).json({ succes: false, erreurs: ['le nouveau mot de passe doit contenir au moins 10 caractères, avec une lettre, un chiffre et un caractère spécial'] });
        }
        if (nouveau_mot_de_passe !== nouveau_mot_de_passe_confirmation) {
            return res.status(400).json({ succes: false, erreurs: ['la confirmation ne correspond pas'] });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const resultat = await client.query('SELECT mot_de_passe_hache FROM site.staff WHERE id_staff = $1', [req.session.id_staff]);
            if (resultat.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ succes: false, erreurs: ['compte introuvable'] });
            }

            const valide = await argon2.verify(resultat.rows[0].mot_de_passe_hache, mot_de_passe_actuel);
            if (!valide) {
                await client.query('ROLLBACK');
                return res.status(401).json({ succes: false, erreurs: ['mot de passe actuel incorrect'] });
            }

            const nouveauHache = await argon2.hash(nouveau_mot_de_passe, { type: argon2.argon2id });
            // Déclare l'acteur de cette requête pour la sentinelle base de
            // données (site.fn_proteger_mot_de_passe_racine, migration 021)
            // — sans cette ligne, toute tentative de modifier le mot de
            // passe du compte racine échoue, même le titulaire lui-même.
            await client.query("SELECT set_config('app.id_staff_acteur', $1, true)", [req.session.id_staff.toString()]);
            await client.query('UPDATE site.staff SET mot_de_passe_hache = $1 WHERE id_staff = $2', [nouveauHache, req.session.id_staff]);

            await client.query(
                `INSERT INTO site.journal_audit (id_staff, action, table_concernee, id_enregistrement, adresse_ip)
                 VALUES ($1, 'staff.changement_mot_de_passe', 'staff', $1, $2)`,
                [req.session.id_staff, req.ip]
            );

            // Révocation de TOUTES les sessions de ce compte staff, y
            // compris potentiellement la session courante — on la
            // recrée juste après via regenerate() pour ne pas déconnecter
            // l'utilisateur qui vient de faire le changement lui-même.
            await client.query(
                `DELETE FROM site.session_staff WHERE sess::jsonb->>'id_staff' = $1::text`,
                [req.session.id_staff.toString()]
            );

            await client.query('COMMIT');

            // IMPORTANT : capturer id_staff AVANT regenerate(), qui vide
            // entièrement req.session — l'utiliser après serait undefined.
            const idStaffCourant = req.session.id_staff;
            const codeRoleCourant = req.session.code_role;

            req.session.regenerate((err) => {
                if (err) {
                    console.error('[POST /api/staff/changer-mot-de-passe] Erreur régénération session :', err);
                    return res.status(200).json({ succes: true, avertissement: 'mot de passe changé, reconnexion nécessaire' });
                }
                req.session.id_staff = idStaffCourant;
                req.session.code_role = codeRoleCourant;
                return res.status(200).json({ succes: true });
            });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('[POST /api/staff/changer-mot-de-passe] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        } finally {
            client.release();
        }
    });

    return router;
};
