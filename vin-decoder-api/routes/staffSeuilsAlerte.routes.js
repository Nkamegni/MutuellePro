// =====================================================================
// Mutuelle Pro Assurances — Seuils d'alerte configurables (Staff)
// Routes : GET /api/staff/seuils-alerte, POST /api/staff/seuils-alerte
// =====================================================================
// Catégorie 2 (infrastructure data dashboard), item priorisé n°1.
// Prérequis : table site.seuils_alerte_staff créée
// (voir migration_seuils_alerte_staff.sql) AVANT le montage de ce routeur.
// =====================================================================

const express = require('express');
const requireStaffAuth = require('../middleware/requireStaffAuth');

// Liste fermée -- un code_seuil hors de cette liste est rejeté à l'écriture.
// Ajouter ici toute nouvelle famille de seuil plutôt que d'accepter une
// clé arbitraire venue du client.
const SEUILS_CONNUS = ['tache_retard_jours'];

// Valeur appliquée en l'absence de ligne pour ce staff -- doit rester
// strictement identique au comportement câblé en dur avant l'existence
// de cette table (date_echeance < now(), soit 0 jour de marge), pour ne
// rien changer par défaut tant que le staff n'a pas explicitement
// personnalisé son seuil.
const VALEUR_DEFAUT = { tache_retard_jours: 0 };

module.exports = function (pool) {
    const router = express.Router();

    router.get('/seuils-alerte', requireStaffAuth, async (req, res) => {
        try {
            const resultat = await pool.query(
                `SELECT code_seuil, valeur FROM site.seuils_alerte_staff WHERE id_staff = $1`,
                [req.session.id_staff]
            );
            const seuils = { ...VALEUR_DEFAUT };
            resultat.rows.forEach((r) => { seuils[r.code_seuil] = r.valeur; });
            return res.status(200).json({ succes: true, seuils });
        } catch (err) {
            console.error('[GET /api/staff/seuils-alerte] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.post('/seuils-alerte', requireStaffAuth, async (req, res) => {
        const { code_seuil, valeur } = req.body;

        if (!SEUILS_CONNUS.includes(code_seuil)) {
            return res.status(400).json({ succes: false, erreurs: ['code_seuil inconnu'] });
        }
        if (!Number.isInteger(valeur)) {
            return res.status(400).json({ succes: false, erreurs: ['valeur doit être un entier'] });
        }

        try {
            await pool.query(
                `INSERT INTO site.seuils_alerte_staff (id_staff, code_seuil, valeur)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (id_staff, code_seuil) DO UPDATE SET valeur = $3, date_maj = now()`,
                [req.session.id_staff, code_seuil, valeur]
            );
            return res.status(200).json({ succes: true });
        } catch (err) {
            console.error('[POST /api/staff/seuils-alerte] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    return router;
};

// =====================================================================
// Montage attendu dans server.js, aux côtés des autres routeurs staff
// (même patron que staffKpis.routes.js) :
//
// app.use('/api/staff', require('./routes/staffSeuilsAlerte.routes')(pool));
// =====================================================================
