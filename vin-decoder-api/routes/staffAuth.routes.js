// =====================================================================
// Mutuelle Pro Assurances — Phase 2a
// Routes : POST /api/staff/connexion, POST /api/staff/deconnexion,
//          GET /api/staff/session
// =====================================================================
//
// Intégration dans server.js — voir bloc de montage de session staff
// séparé, fourni avec ce fichier (staffSession sur préfixe /api/staff).
//
//   const staffAuthRouter = require('./routes/staffAuth.routes')(pool);
//   app.use('/api/staff', staffAuthRouter);
// =====================================================================

const express = require('express');
const argon2 = require('argon2');
const requireStaffAuth = require('../middleware/requireStaffAuth');

// Même principe de limitation anti-brute-force qu'auth.routes.js (client),
// volontairement dupliqué plutôt que partagé entre les deux fichiers —
// évite un couplage entre l'auth client et l'auth staff, qui doivent
// pouvoir évoluer indépendamment (ex: politique de blocage plus stricte
// côté staff à l'avenir, sans toucher au code client).
const tentatives = new Map();
const FENETRE_MS = 15 * 60 * 1000;
const MAX_TENTATIVES = 5;

function estBloque(cle) {
    const maintenant = Date.now();
    const historique = (tentatives.get(cle) || []).filter(t => maintenant - t < FENETRE_MS);
    tentatives.set(cle, historique);
    return historique.length >= MAX_TENTATIVES;
}
function enregistrerEchec(cle) {
    const historique = tentatives.get(cle) || [];
    historique.push(Date.now());
    tentatives.set(cle, historique);
}
function reinitialiser(cle) {
    tentatives.delete(cle);
}

module.exports = function (pool) {
    const router = express.Router();

    router.post('/connexion', async (req, res) => {
        const { email, mot_de_passe } = req.body;

        if (!email || !mot_de_passe) {
            return res.status(400).json({ succes: false, erreurs: ['email et mot_de_passe requis'] });
        }

        const cle = `${req.ip}|${email}`;
        if (estBloque(cle)) {
            return res.status(429).json({ succes: false, erreurs: ['trop de tentatives, réessayez dans quelques minutes'] });
        }

        try {
            const resultat = await pool.query(
                `SELECT s.id_staff, s.email, s.mot_de_passe_hache, s.nom_complet, s.statut_compte,
                        r.id_role, r.code_role, r.libelle_fr AS role_libelle_fr, r.libelle_en AS role_libelle_en
                 FROM site.staff s
                 JOIN site.role_staff r ON r.id_role = s.id_role
                 WHERE s.email = $1`,
                [email]
            );

            // Message identique en cas d'email inconnu ou de mot de passe
            // incorrect — jamais révéler lequel des deux est en cause.
            if (resultat.rowCount === 0) {
                enregistrerEchec(cle);
                return res.status(401).json({ succes: false, erreurs: ['identifiants incorrects'] });
            }

            const staff = resultat.rows[0];

            if (staff.statut_compte !== 'actif') {
                return res.status(403).json({ succes: false, erreurs: ['compte suspendu, contactez un administrateur'] });
            }

            const motDePasseValide = await argon2.verify(staff.mot_de_passe_hache, mot_de_passe);
            if (!motDePasseValide) {
                enregistrerEchec(cle);
                return res.status(401).json({ succes: false, erreurs: ['identifiants incorrects'] });
            }

            reinitialiser(cle);

            req.session.regenerate((err) => {
                if (err) {
                    console.error('[POST /api/staff/connexion] Erreur régénération session :', err);
                    return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
                }

                req.session.id_staff = staff.id_staff;
                req.session.code_role = staff.code_role;
                req.session.email = staff.email;

                pool.query(
                    'UPDATE site.staff SET date_derniere_connexion = now() WHERE id_staff = $1',
                    [staff.id_staff]
                ).catch(err => console.error('[POST /api/staff/connexion] Erreur mise à jour date_derniere_connexion :', err));

                return res.status(200).json({
                    succes: true,
                    staff: {
                        id_staff: staff.id_staff,
                        email: staff.email,
                        nom_complet: staff.nom_complet,
                        code_role: staff.code_role,
                        role_libelle_fr: staff.role_libelle_fr,
                        role_libelle_en: staff.role_libelle_en
                    }
                });
            });
        } catch (err) {
            console.error('[POST /api/staff/connexion] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    router.post('/deconnexion', (req, res) => {
        if (!req.session) return res.status(200).json({ succes: true });
        req.session.destroy((err) => {
            if (err) {
                console.error('[POST /api/staff/deconnexion] Erreur :', err);
                return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
            }
            res.clearCookie('connect.sid.staff');
            return res.status(200).json({ succes: true });
        });
    });

    router.get('/session', (req, res) => {
        if (!req.session || !req.session.id_staff) {
            return res.status(401).json({ succes: false, connecte: false });
        }
        return res.status(200).json({
            succes: true,
            connecte: true,
            id_staff: req.session.id_staff,
            code_role: req.session.code_role
        });
    });

    // Sessions actives — même mécanique que côté Client (27/08/2026).
    router.get('/mes-sessions', requireStaffAuth, async (req, res) => {
        try {
            const resultat = await pool.query(
                `SELECT sid, expire FROM site.session_staff
                 WHERE sess::jsonb->>'id_staff' = $1
                 ORDER BY expire DESC`,
                [req.session.id_staff.toString()]
            );
            const sessions = resultat.rows.map((s) => ({
                sid: s.sid,
                expire: s.expire,
                est_courante: s.sid === req.sessionID,
            }));
            return res.status(200).json({ succes: true, sessions });
        } catch (err) {
            console.error('[GET /api/staff/mes-sessions] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.delete('/mes-sessions/:sid', requireStaffAuth, async (req, res) => {
        try {
            await pool.query(
                `DELETE FROM site.session_staff WHERE sid = $1 AND sess::jsonb->>'id_staff' = $2`,
                [req.params.sid, req.session.id_staff.toString()]
            );
            return res.status(200).json({ succes: true });
        } catch (err) {
            console.error('[DELETE /api/staff/mes-sessions/:sid] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    return router;
};
