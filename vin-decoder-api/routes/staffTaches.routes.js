// =====================================================================
// Mutuelle Pro Assurances -- Taches (module Messagerie, Phase 1)
// Redige le 01/09/2026, d'apres la specification de la session Messagerie
// =====================================================================
// Routes :
//   POST  /api/staff/taches
//   GET   /api/staff/taches
//   PATCH /api/staff/taches/:id/statut
//
// Isolation : chaque tache reste scopee au staff connecte (createur ou
// responsable) -- pas de vue croisee entre comptes ici (l'agregation par
// responsable, reservee Administrateur/SuperAdmin, vit dans staffKpis).
// =====================================================================

const express = require('express');
const requireStaffAuth = require('../middleware/requireStaffAuth');
const { obtenirMetadonneesPourTache } = require('../lib/imap');
const { dechiffrer } = require('../lib/chiffrement');

module.exports = function (pool) {
    const router = express.Router();

    router.post('/taches', requireStaffAuth, async (req, res) => {
        const { titre, origine_type, uid_imap, dossier_imap, date_echeance, id_staff_responsable } = req.body;
        if (!titre || !titre.trim()) {
            return res.status(400).json({ succes: false, erreurs: ['le titre est requis'] });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            let idEmailCache = null;

            if (origine_type === 'email') {
                if (!Number.isInteger(uid_imap)) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ succes: false, erreurs: ['uid_imap requis pour une tâche née d\'un email'] });
                }
                const dossier = dossier_imap || 'INBOX';

                // Identifiants IMAP du staff connecté -- même patron que
                // messagerie.routes.js, jamais de boîte d'un tiers.
                const compte = await client.query(
                    'SELECT email, imap_mot_de_passe_chiffre FROM site.staff WHERE id_staff = $1',
                    [req.session.id_staff]
                );
                if (compte.rowCount === 0 || !compte.rows[0].imap_mot_de_passe_chiffre) {
                    await client.query('ROLLBACK');
                    return res.status(409).json({ succes: false, erreurs: ['votre boîte mail n\'est pas encore configurée'] });
                }
                const { email, imap_mot_de_passe_chiffre } = compte.rows[0];
                const motDePasse = dechiffrer(imap_mot_de_passe_chiffre);

                const meta = await obtenirMetadonneesPourTache(email, motDePasse, uid_imap, dossier);
                if (!meta) {
                    await client.query('ROLLBACK');
                    return res.status(404).json({ succes: false, erreurs: ['message introuvable dans la boîte'] });
                }

                // Dédoublonnage par message_id_rfc en priorité (identifiant
                // stable), repli sur (staff + dossier + uid) sinon --
                // exactement la logique demandée par la session Messagerie.
                let cacheExistant = null;
                if (meta.messageId) {
                    cacheExistant = await client.query(
                        'SELECT id_email_cache FROM site.emails_cache WHERE message_id_rfc = $1 AND id_staff = $2',
                        [meta.messageId, req.session.id_staff]
                    );
                }
                if (!cacheExistant || cacheExistant.rowCount === 0) {
                    cacheExistant = await client.query(
                        'SELECT id_email_cache FROM site.emails_cache WHERE id_staff = $1 AND dossier_imap = $2 AND uid_imap = $3',
                        [req.session.id_staff, dossier, uid_imap]
                    );
                }

                if (cacheExistant.rowCount > 0) {
                    idEmailCache = cacheExistant.rows[0].id_email_cache;
                } else {
                    const insertionCache = await client.query(
                        `INSERT INTO site.emails_cache (id_staff, dossier_imap, uid_imap, uidvalidity, message_id_rfc, derniere_synchro)
                         VALUES ($1, $2, $3, $4, $5, now()) RETURNING id_email_cache`,
                        [req.session.id_staff, dossier, uid_imap, meta.uidvalidity, meta.messageId]
                    );
                    idEmailCache = insertionCache.rows[0].id_email_cache;
                }
            }

            const insertionTache = await client.query(
                `INSERT INTO site.taches (titre, id_nature_ticket, origine_type, id_email_cache, id_staff_createur, id_staff_responsable, date_echeance)
                 SELECT $1, id_nature_ticket, $2, $3, $4, $5, $6
                 FROM site.nature_ticket WHERE code_nature = 'task'
                 RETURNING id_tache`,
                [titre.trim(), origine_type || 'manuel', idEmailCache, req.session.id_staff, id_staff_responsable || null, date_echeance || null]
            );

            await client.query('COMMIT');
            return res.status(201).json({ succes: true, tache: { id_tache: insertionTache.rows[0].id_tache } });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('[POST /api/staff/taches] Erreur :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        } finally {
            client.release();
        }
    });

    router.get('/taches', requireStaffAuth, async (req, res) => {
        const { statut } = req.query;
        try {
            const conditions = [];
            const valeurs = [];
            if (statut) {
                valeurs.push(statut);
                conditions.push(`t.statut = $${valeurs.length}`);
            }
            const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

            const resultat = await pool.query(
                `SELECT t.id_tache, t.titre, t.origine_type, t.statut, t.date_echeance,
                        t.email_source_disponible, TRIM(COALESCE(s.prenom, '') || ' ' || s.nom) AS responsable_nom
                 FROM site.taches t
                 LEFT JOIN site.staff s ON s.id_staff = t.id_staff_responsable
                 ${whereClause}
                 ORDER BY t.date_echeance ASC NULLS LAST, t.date_creation DESC`,
                valeurs
            );
            return res.status(200).json({ succes: true, taches: resultat.rows });
        } catch (err) {
            console.error('[GET /api/staff/taches] Erreur :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.patch('/taches/:id/statut', requireStaffAuth, async (req, res) => {
        const idTache = parseInt(req.params.id, 10);
        const { statut } = req.body;
        const statutsValides = ['a_faire', 'en_cours', 'fait', 'annule'];
        if (!Number.isInteger(idTache) || !statutsValides.includes(statut)) {
            return res.status(400).json({ succes: false, erreurs: ['id ou statut invalide'] });
        }
        try {
            const dateCloture = (statut === 'fait' || statut === 'annule') ? 'now()' : 'NULL';
            await pool.query(
                `UPDATE site.taches SET statut = $1, date_cloture = ${dateCloture} WHERE id_tache = $2`,
                [statut, idTache]
            );
            return res.status(200).json({ succes: true });
        } catch (err) {
            console.error('[PATCH /api/staff/taches/:id/statut] Erreur :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    return router;
};
