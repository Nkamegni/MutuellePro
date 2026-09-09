// =====================================================================
// Mutuelle Pro Assurances — Export à la demande (Excel)
// Route : GET /api/staff/kpis/export
// =====================================================================
// Catégorie 2 (infrastructure data dashboard), 3ᵉ et dernier point.
// Ouvert depuis le compte-rendu de clôture du 05/09/2026 ("seuils et
// snapshots sont faits, l'export ne l'est pas") -- staffKpis.routes.js
// avait déjà été préparé à cette fin (construireDonneesKpis exposée).
//
// Dépendance npm requise sur le VPS AVANT déploiement :
//   npm install exceljs
//
// Auto-cohérent avec /api/staff/kpis : même construireDonneesKpis, donc
// même seuil personnalisé, mêmes évolutions snapshot, même RBAC
// Administration -- jamais une divergence entre ce que l'écran affiche
// et ce que le fichier exporté contient.
// =====================================================================

const express = require('express');
const requireStaffAuth = require('../middleware/requireStaffAuth');
const { construireWorkbookKpis } = require('../lib/construireWorkbookKpis');

module.exports = function (pool) {
    const router = express.Router();

    router.get('/kpis/export', requireStaffAuth, async (req, res) => {
        try {
            const workbook = await construireWorkbookKpis(pool, req);

            const dateFichier = new Date().toISOString().slice(0, 10);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="kpis_mutuellepro_${dateFichier}.xlsx"`);
            await workbook.xlsx.write(res);
            res.end();
        } catch (err) {
            console.error('[GET /api/staff/kpis/export] Erreur :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    return router;
};

// =====================================================================
// Montage attendu dans server.js (aux côtés de staffKpis.routes.js) :
//
// app.use('/api/staff', require('./routes/staffKpisExport.routes')(pool));
// =====================================================================
