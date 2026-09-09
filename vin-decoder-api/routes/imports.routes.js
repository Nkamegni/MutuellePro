const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const requireStaffAuth = require('../middleware/requireStaffAuth');
const requireStaffRole = require('../middleware/requireStaffRole');
const {
    parserCsv, detecterEtValiderEntetes, compterLignes,
    validerLignes, qualifierFichier, importerReellement,
} = require('../lib/importGenerique');
const {
    creerPartenaireEtActiver, resoudreCodesTypes,
    envoyerEmailActivationPartenaire, chargerTypeParCode,
} = require('../lib/partenaires');

const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 10 * 1024 * 1024 } });

const sessionsImport = new Map();
const DUREE_VIE_MS = 30 * 60 * 1000;

setInterval(() => {
    const maintenant = Date.now();
    for (const [id, session] of sessionsImport) {
        if (maintenant - session.cree_le > DUREE_VIE_MS) {
            fs.unlink(session.cheminFichier, () => {});
            sessionsImport.delete(id);
        }
    }
}, 5 * 60 * 1000);

module.exports = function (pool, modeles) {
    const router = express.Router();

    router.post('/imports/:type/preparer', requireStaffAuth, requireStaffRole(['administrateur', 'superadmin']), upload.single('fichier'), async (req, res) => {
        const modele = modeles[req.params.type];
        if (!modele) return res.status(404).json({ succes: false, erreurs: ['type d\'import inconnu'] });
        if (!req.file) return res.status(400).json({ succes: false, erreurs: ['fichier requis'] });

        if (req.file.size === 0) {
            fs.unlink(req.file.path, () => {});
            return res.status(200).json({ succes: true, cas: '7.1', erreurs: ['fichier vide'] });
        }

        let lignesBrutes;
        try {
            const contenu = fs.readFileSync(req.file.path, 'utf-8');
            lignesBrutes = parserCsv(contenu, modele.separateur || ';');
        } catch (err) {
            fs.unlink(req.file.path, () => {});
            return res.status(200).json({ succes: true, cas: '7.1', erreurs: ['fichier illisible'] });
        }

        const sansEnTetesConfirme = req.body.sans_entetes === 'true';
        const resultatEntetes = detecterEtValiderEntetes(lignesBrutes, modele, sansEnTetesConfirme);

        if (resultatEntetes.confirmationRequise) {
            fs.unlink(req.file.path, () => {});
            return res.status(200).json({ succes: true, confirmationRequise: 'sans_entetes' });
        }
        if (!resultatEntetes.ok) {
            fs.unlink(req.file.path, () => {});
            return res.status(200).json({ succes: true, cas: '7.2', erreurs: resultatEntetes.erreurs });
        }

        const totalLignes = compterLignes(lignesBrutes, resultatEntetes.sansEnTetes);
        const idSessionImport = crypto.randomBytes(16).toString('hex');
        sessionsImport.set(idSessionImport, {
            type: req.params.type,
            cheminFichier: req.file.path,
            lignesBrutes,
            mapping: resultatEntetes.mapping,
            sansEnTetes: resultatEntetes.sansEnTetes,
            totalLignes,
            cree_le: Date.now(),
        });

        return res.status(200).json({ succes: true, id_session_import: idSessionImport, total_lignes: totalLignes });
    });

    router.get('/imports/:idSessionImport/valider', requireStaffAuth, requireStaffRole(['administrateur', 'superadmin']), async (req, res) => {
        const session = sessionsImport.get(req.params.idSessionImport);
        if (!session) return res.status(404).end();

        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });

        const modele = modeles[session.type];
        const lignesDonnees = session.sansEnTetes ? session.lignesBrutes : session.lignesBrutes.slice(1);

        const { motifs, lignes } = await validerLignes(lignesDonnees, session, modele, (fait, total) => {
            res.write(`event: progression\ndata: ${JSON.stringify({ fait, total })}\n\n`);
        });

        session.lignesValidees = lignes;
        session.motifs = motifs;
        session.cas = qualifierFichier({ accessible: true, entetesOk: true, motifs });

        res.write(`event: termine\ndata: ${JSON.stringify({ cas: session.cas, motifs, total: lignes.length })}\n\n`);
        res.end();
    });

    router.get('/imports/:idSessionImport/confirmer', requireStaffAuth, requireStaffRole(['administrateur', 'superadmin']), async (req, res) => {
        const session = sessionsImport.get(req.params.idSessionImport);
        if (!session || !session.lignesValidees) return res.status(404).end();

        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });

        const modele = modeles[session.type];
        const client = await pool.connect();
        const lignesAImporter = session.lignesValidees.filter((l) => l.valide);

        // Traçabilité (05/09/2026, signalé par Roger) -- chaque import
        // génère sa propre tâche, ouverte au lancement de l'import RÉEL
        // (pas à la simple vérification du fichier), fermée à la fin.
        // origine_type = 'import' -- distingue ces tâches des tâches
        // manuelles ou issues d'un email, sans rien changer au schéma.
        const libelleType = session.type === 'prospects' ? 'Prospects' : 'Partenaires';
        let idTacheImport = null;
        try {
            const insertionTache = await client.query(
                `INSERT INTO site.taches (titre, id_nature_ticket, origine_type, id_staff_createur, id_staff_responsable, statut)
                 SELECT $1, id_nature_ticket, 'import', $2, $2, 'en_cours'
                 FROM site.nature_ticket WHERE code_nature = 'task'
                 RETURNING id_tache`,
                [`Import ${libelleType} (${lignesAImporter.length} ligne(s))`, req.session.id_staff]
            );
            idTacheImport = insertionTache.rows[0]?.id_tache || null;
        } catch (err) {
            console.error('[GET /api/staff/imports/:id/confirmer] Erreur création tâche de traçabilité :', err);
            // Ne bloque jamais l'import lui-même -- la traçabilité est un
            // complément, pas une condition préalable à l'import réel.
        }

        try {
            let contexte = { id_staff: req.session.id_staff };
            if (session.type === 'partenaires') {
                const typeParCode = await chargerTypeParCode(pool);
                contexte = { ...contexte, creerPartenaireEtActiver, resoudreCodesTypes, envoyerEmailActivationPartenaire, typeParCode };
            }
            const resultats = await importerReellement(
                lignesAImporter, modele, client, contexte,
                (fait, total) => res.write(`event: progression\ndata: ${JSON.stringify({ fait, total })}\n\n`)
            );
            res.write(`event: termine\ndata: ${JSON.stringify(resultats)}\n\n`);
        } finally {
            if (idTacheImport) {
                try {
                    await client.query(`UPDATE site.taches SET statut = 'fait', date_cloture = now() WHERE id_tache = $1`, [idTacheImport]);
                } catch (err) {
                    console.error('[GET /api/staff/imports/:id/confirmer] Erreur clôture tâche de traçabilité :', err);
                }
            }
            client.release();
            fs.unlink(session.cheminFichier, () => {});
            sessionsImport.delete(req.params.idSessionImport);
        }
        res.end();
    });

    router.delete('/imports/:idSessionImport', requireStaffAuth, requireStaffRole(['administrateur', 'superadmin']), (req, res) => {
        const session = sessionsImport.get(req.params.idSessionImport);
        if (session) {
            fs.unlink(session.cheminFichier, () => {});
            sessionsImport.delete(req.params.idSessionImport);
        }
        return res.status(200).json({ succes: true });
    });

    return router;
};
