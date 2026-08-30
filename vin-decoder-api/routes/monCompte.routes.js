// =====================================================================
// Mutuelle Pro Assurances — Menu "Gestion de mon compte" (client)
// Routes :
//   PATCH /api/mon-compte/mot-de-passe   — changement de mot de passe (connecté)
//   GET   /api/mon-compte/export         — export RGPD (toutes mes données)
//   POST  /api/mon-compte/fermer         — fermeture/suspension du compte
// =====================================================================
//
// Intégration dans server.js :
//
//   const monCompteRouter = require('./routes/monCompte.routes')(pool);
//   app.use('/api/mon-compte', monCompteRouter);
//
// Toutes les routes ci-dessous sont protégées par requireAuth (client),
// jamais par requireStaffAuth — ce fichier ne concerne que les comptes
// site.utilisateurs, pas site.staff.
// =====================================================================

const express = require('express');
const argon2 = require('argon2');
const requireAuth = require('../middleware/requireAuth');

function motDePasseRobuste(mdp) {
    if (typeof mdp !== 'string' || mdp.length < 10) return false;
    if (!/[a-zA-Z]/.test(mdp)) return false;
    if (!/[0-9]/.test(mdp)) return false;
    if (!/[^a-zA-Z0-9]/.test(mdp)) return false;
    return true;
}

module.exports = function (pool) {
    const router = express.Router();

    router.get('/profil', requireAuth, async (req, res) => {
        try {
            const resultat = await pool.query(
                `SELECT email, telephone, nom, prenom, date_naissance, adresse
                 FROM site.utilisateurs WHERE id_utilisateur = $1`,
                [req.session.id_utilisateur]
            );
            if (resultat.rowCount === 0) {
                return res.status(404).json({ succes: false, erreurs: ['compte introuvable'] });
            }
            return res.status(200).json({ succes: true, profil: resultat.rows[0] });
        } catch (err) {
            console.error('[GET /api/mon-compte/profil] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    router.patch('/profil', requireAuth, async (req, res) => {
        const { nom, prenom, date_naissance, adresse } = req.body;
        try {
            await pool.query(
                `UPDATE site.utilisateurs SET nom = $1, prenom = $2, date_naissance = $3, adresse = $4 WHERE id_utilisateur = $5`,
                [nom || null, prenom || null, date_naissance || null, adresse || null, req.session.id_utilisateur]
            );
            return res.status(200).json({ succes: true });
        } catch (err) {
            console.error('[PATCH /api/mon-compte/profil] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    router.patch('/mot-de-passe', requireAuth, async (req, res) => {
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

            const resultat = await client.query('SELECT mot_de_passe_hache FROM site.utilisateurs WHERE id_utilisateur = $1', [req.session.id_utilisateur]);
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
            await client.query('UPDATE site.utilisateurs SET mot_de_passe_hache = $1 WHERE id_utilisateur = $2', [nouveauHache, req.session.id_utilisateur]);

            // Révocation de toutes les autres sessions de ce compte client.
            await client.query(
                `DELETE FROM site.session WHERE sess::jsonb->>'id_utilisateur' = $1::text AND sid != $2`,
                [req.session.id_utilisateur.toString(), req.sessionID]
            );

            await client.query('COMMIT');
            return res.status(200).json({ succes: true });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('[PATCH /api/mon-compte/mot-de-passe] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        } finally {
            client.release();
        }
    });

    // Export RGPD — toutes les données détenues sur le compte connecté,
    // en JSON téléchargeable. Conformité loi n°2024/017, droit d'accès.
    router.get('/export', requireAuth, async (req, res) => {
        try {
            const compte = await pool.query(
                `SELECT id_utilisateur, email, telephone, nom, prenom, date_naissance, adresse,
                        email_verifie, telephone_verifie, statut_compte, date_creation, date_derniere_connexion
                 FROM site.utilisateurs WHERE id_utilisateur = $1`,
                [req.session.id_utilisateur]
            );
            const tickets = await pool.query(
                `SELECT code_ticket, contenu, email_contact, telephone_contact, date_creation, date_maj
                 FROM site.tickets WHERE id_utilisateur = $1 ORDER BY date_creation DESC`,
                [req.session.id_utilisateur]
            );

            res.setHeader('Content-Disposition', 'attachment; filename="mes-donnees-mutuelleproassurances.json"');
            return res.status(200).json({
                succes: true,
                export_genere_le: new Date().toISOString(),
                compte: compte.rows[0],
                tickets: tickets.rows
            });
        } catch (err) {
            console.error('[GET /api/mon-compte/export] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    // Fermeture/suspension du compte, à l'initiative du client lui-même
    // — DISTINCT de l'anonymisation staff : ici on suspend seulement
    // (réversible par le staff sur demande), on n'efface aucune donnée.
    router.post('/fermer', requireAuth, async (req, res) => {
        const { mot_de_passe } = req.body;
        if (!mot_de_passe) {
            return res.status(400).json({ succes: false, erreurs: ['mot_de_passe requis pour confirmer la fermeture'] });
        }

        try {
            const resultat = await pool.query('SELECT mot_de_passe_hache FROM site.utilisateurs WHERE id_utilisateur = $1', [req.session.id_utilisateur]);
            if (resultat.rowCount === 0) {
                return res.status(404).json({ succes: false, erreurs: ['compte introuvable'] });
            }
            const valide = await argon2.verify(resultat.rows[0].mot_de_passe_hache, mot_de_passe);
            if (!valide) {
                return res.status(401).json({ succes: false, erreurs: ['mot de passe incorrect'] });
            }

            await pool.query("UPDATE site.utilisateurs SET statut_compte = 'suspendu' WHERE id_utilisateur = $1", [req.session.id_utilisateur]);

            req.session.destroy(() => {});

            return res.status(200).json({ succes: true });
        } catch (err) {
            console.error('[POST /api/mon-compte/fermer] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    // Sessions actives — liste et révocation individuelle (27/08/2026).
    // Limite honnête : connect-pg-simple ne stocke ni IP ni user-agent
    // par défaut, donc pas de détail "Chrome sur Windows" possible sans
    // capture supplémentaire — seule la date d'expiration et l'identité
    // "session actuelle" sont affichables aujourd'hui.
    router.get('/sessions', requireAuth, async (req, res) => {
        try {
            const resultat = await pool.query(
                `SELECT sid, expire FROM site.session
                 WHERE sess::jsonb->>'id_utilisateur' = $1
                 ORDER BY expire DESC`,
                [req.session.id_utilisateur.toString()]
            );
            const sessions = resultat.rows.map((s) => ({
                sid: s.sid,
                expire: s.expire,
                est_courante: s.sid === req.sessionID,
            }));
            return res.status(200).json({ succes: true, sessions });
        } catch (err) {
            console.error('[GET /api/mon-compte/sessions] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.delete('/sessions/:sid', requireAuth, async (req, res) => {
        try {
            await pool.query(
                `DELETE FROM site.session WHERE sid = $1 AND sess::jsonb->>'id_utilisateur' = $2`,
                [req.params.sid, req.session.id_utilisateur.toString()]
            );
            return res.status(200).json({ succes: true });
        } catch (err) {
            console.error('[DELETE /api/mon-compte/sessions/:sid] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    return router;
};
