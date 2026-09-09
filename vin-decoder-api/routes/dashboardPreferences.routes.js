// =====================================================================
// Mutuelle Pro Assurances — Préférences de disposition du Tableau de bord
// Routes : GET/POST /dashboard-preferences, POST .../activer, DELETE ...
// =====================================================================
// Personnalisation (04/09/2026) + vues multiples nommées (08/09/2026)
// + extension Client/Partenaire (09/09/2026).
// Prérequis, dans l'ordre :
//   1. migration_preferences_dashboard.sql (table + GRANT)
//   2. migration_vues_multiples_dashboard.sql (colonnes nom_vue/est_active)
// AVANT le montage de ce routeur.
//
// Fabrique générique -- une seule implémentation, montée une fois par
// rôle avec sa propre config.
//
// Authentification (09/09/2026) : Staff dispose d'un middleware dédié
// (requireStaffAuth). Client et Partenaire n'en ont PAS -- vérifié dans
// partenaireAuth.routes.js, où chaque route répète en ligne
// `if (!req.session || !req.session.id_partenaire) { ... 401 ... }`.
// Ce fichier exporte donc ses propres gardes pour ces deux rôles,
// répliquant exactement ce patron (même message d'erreur), plutôt que
// d'exiger un import qui n'existe pas. Le champ de session Client
// (id_utilisateur) est confirmé dans auth.routes.js ; le patron de garde
// inline est supposé identique à Partenaire par analogie -- à valider,
// risque faible si erroné (401 au pire, pas de faille).
// =====================================================================

const express = require('express');

function exigerSessionClient(req, res, next) {
    if (!req.session || !req.session.id_utilisateur) {
        return res.status(401).json({ succes: false, erreurs: ['authentification requise'] });
    }
    next();
}

function exigerSessionPartenaire(req, res, next) {
    if (!req.session || !req.session.id_partenaire) {
        return res.status(401).json({ succes: false, erreurs: ['authentification requise'] });
    }
    next();
}

// Widgets réellement personnalisables par rôle. Staff corrigé le
// 08/09/2026 (portefeuille/kanban-prospects retirés -- ce sont des
// modèles entiers, pas des widgets). Client/Partenaire n'ont qu'un
// dashboard, pas de système à onglets -- personnalisation inconditionnelle.
const WIDGETS_CONNUS = {
    staff: ['kpi-principaux', 'flux-hebdo', 'graphiques', 'a-venir'],
    client: ['kpi-principaux', 'graphiques', 'a-venir'],
    partenaire: ['kpi-principaux', 'graphiques', 'a-venir'],
};

function dispositionValide(disposition, typeCompte) {
    if (!Array.isArray(disposition)) return false;
    const connus = WIDGETS_CONNUS[typeCompte] || [];
    return disposition.every((entree) =>
        entree && typeof entree === 'object'
        && connus.includes(entree.id)
        && typeof entree.visible === 'boolean'
    );
}

function nomVueValide(nomVue) {
    return typeof nomVue === 'string' && nomVue.trim().length > 0 && nomVue.length <= 50;
}

module.exports = function (pool, config) {
    // config: { middleware, typeCompte, champSessionId }
    const router = express.Router();

    router.get('/dashboard-preferences', config.middleware, async (req, res) => {
        try {
            const resultat = await pool.query(
                `SELECT nom_vue, disposition, est_active FROM site.preferences_dashboard
                 WHERE type_compte = $1 AND id_compte = $2 ORDER BY nom_vue`,
                [config.typeCompte, req.session[config.champSessionId]]
            );
            const vues = resultat.rows;
            const vueActive = vues.find((v) => v.est_active) || vues[0] || null;
            return res.status(200).json({
                succes: true,
                disposition: vueActive ? vueActive.disposition : [],
                vue_active: vueActive ? vueActive.nom_vue : 'Défaut',
                vues: vues.map((v) => v.nom_vue),
            });
        } catch (err) {
            console.error('[GET /dashboard-preferences] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.post('/dashboard-preferences', config.middleware, async (req, res) => {
        const { disposition, nom_vue } = req.body;
        if (!dispositionValide(disposition, config.typeCompte)) {
            return res.status(400).json({ succes: false, erreurs: ['disposition invalide -- widget inconnu ou format incorrect'] });
        }
        if (nom_vue !== undefined && !nomVueValide(nom_vue)) {
            return res.status(400).json({ succes: false, erreurs: ['nom_vue invalide'] });
        }
        const idCompte = req.session[config.champSessionId];
        try {
            let nomVueCible = nom_vue;
            if (!nomVueCible) {
                const actuelle = await pool.query(
                    `SELECT nom_vue FROM site.preferences_dashboard WHERE type_compte = $1 AND id_compte = $2 AND est_active = true`,
                    [config.typeCompte, idCompte]
                );
                nomVueCible = actuelle.rows[0] ? actuelle.rows[0].nom_vue : 'Défaut';
            }
            await pool.query(
                `INSERT INTO site.preferences_dashboard (type_compte, id_compte, nom_vue, disposition, est_active)
                 VALUES ($1::varchar, $2::int, $3, $4::jsonb, NOT EXISTS (
                     SELECT 1 FROM site.preferences_dashboard WHERE type_compte = $1::varchar AND id_compte = $2::int
                 ))
                 ON CONFLICT (type_compte, id_compte, nom_vue) DO UPDATE SET disposition = $4::jsonb, date_maj = now()`,
                [config.typeCompte, idCompte, nomVueCible, JSON.stringify(disposition)]
            );
            return res.status(200).json({ succes: true, nom_vue: nomVueCible });
        } catch (err) {
            console.error('[POST /dashboard-preferences] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.post('/dashboard-preferences/activer', config.middleware, async (req, res) => {
        const { nom_vue } = req.body;
        if (!nomVueValide(nom_vue)) {
            return res.status(400).json({ succes: false, erreurs: ['nom_vue requis'] });
        }
        const idCompte = req.session[config.champSessionId];
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(
                `UPDATE site.preferences_dashboard SET est_active = false WHERE type_compte = $1 AND id_compte = $2`,
                [config.typeCompte, idCompte]
            );
            const resultat = await client.query(
                `UPDATE site.preferences_dashboard SET est_active = true
                 WHERE type_compte = $1 AND id_compte = $2 AND nom_vue = $3 RETURNING nom_vue`,
                [config.typeCompte, idCompte, nom_vue]
            );
            if (resultat.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ succes: false, erreurs: ['vue introuvable'] });
            }
            await client.query('COMMIT');
            return res.status(200).json({ succes: true });
        } catch (err) {
            await client.query('ROLLBACK').catch(() => {});
            console.error('[POST /dashboard-preferences/activer] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        } finally {
            client.release();
        }
    });

    router.delete('/dashboard-preferences', config.middleware, async (req, res) => {
        const nomVue = req.query.nom_vue;
        if (!nomVueValide(nomVue)) {
            return res.status(400).json({ succes: false, erreurs: ['nom_vue requis'] });
        }
        const idCompte = req.session[config.champSessionId];
        try {
            const compte = await pool.query(
                `SELECT COUNT(*)::int AS total FROM site.preferences_dashboard WHERE type_compte = $1 AND id_compte = $2`,
                [config.typeCompte, idCompte]
            );
            if (compte.rows[0].total <= 1) {
                return res.status(400).json({ succes: false, erreurs: ['impossible de supprimer la dernière vue restante'] });
            }
            const resultat = await pool.query(
                `DELETE FROM site.preferences_dashboard WHERE type_compte = $1 AND id_compte = $2 AND nom_vue = $3 RETURNING est_active`,
                [config.typeCompte, idCompte, nomVue]
            );
            if (resultat.rowCount === 0) {
                return res.status(404).json({ succes: false, erreurs: ['vue introuvable'] });
            }
            if (resultat.rows[0].est_active) {
                await pool.query(
                    `UPDATE site.preferences_dashboard SET est_active = true
                     WHERE type_compte = $1::varchar AND id_compte = $2::int AND nom_vue = (
                         SELECT nom_vue FROM site.preferences_dashboard WHERE type_compte = $1::varchar AND id_compte = $2::int ORDER BY nom_vue LIMIT 1
                     )`,
                    [config.typeCompte, idCompte]
                );
            }
            return res.status(200).json({ succes: true });
        } catch (err) {
            console.error('[DELETE /dashboard-preferences] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    return router;
};

module.exports.exigerSessionClient = exigerSessionClient;
module.exports.exigerSessionPartenaire = exigerSessionPartenaire;

// =====================================================================
// Montage attendu dans server.js -- Staff inchangé, Client/Partenaire
// nouveaux, tous les trois via la même fabrique :
//
// const dashboardPreferencesFactory = require('./routes/dashboardPreferences.routes');
// const requireStaffAuth = require('./middleware/requireStaffAuth');
//
// app.use('/api/staff', dashboardPreferencesFactory(pool, {
//     middleware: requireStaffAuth, typeCompte: 'staff', champSessionId: 'id_staff',
// }));
// app.use('/api', dashboardPreferencesFactory(pool, {
//     middleware: dashboardPreferencesFactory.exigerSessionClient, typeCompte: 'client', champSessionId: 'id_utilisateur',
// }));
// app.use('/api/partenaire', dashboardPreferencesFactory(pool, {
//     middleware: dashboardPreferencesFactory.exigerSessionPartenaire, typeCompte: 'partenaire', champSessionId: 'id_partenaire',
// }));
// =====================================================================
