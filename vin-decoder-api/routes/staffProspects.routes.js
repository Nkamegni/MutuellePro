// =====================================================================
// Mutuelle Pro Assurances — Phase 3a : CRM & Prospection (§2.1 du CDCF)
// Routes :
//   POST  /api/staff/prospects                    — créer depuis un ticket
//   GET   /api/staff/prospects                     — liste (filtrable par statut)
//   PATCH /api/staff/prospects/:id/statut           — changement d'étape d'opportunité
//   GET   /api/staff/prospects/:id/interactions      — historique
//   POST  /api/staff/prospects/:id/interactions      — ajouter une interaction
// =====================================================================
//
// Périmètre volontairement minimal ce soir (INT-CRM-01/02/03 du CDCF) :
// pas de relances programmées (INT-CRM-04) ni de recherche avancée
// (INT-CRM-05) — à ajouter dans une session dédiée avec de vraies
// données d'usage pour calibrer l'UX plutôt que de deviner.
//
// Intégration dans server.js :
//
//   const staffProspectsRouter = require('./routes/staffProspects.routes')(pool);
//   app.use('/api/staff', staffProspectsRouter);
// =====================================================================

const express = require('express');
const requireStaffAuth = require('../middleware/requireStaffAuth');
const requireStaffRole = require('../middleware/requireStaffRole');

const STATUTS_OPPORTUNITE = ['nouveau', 'qualifie', 'propose', 'gagne', 'perdu'];

module.exports = function (pool) {
    const router = express.Router();

    router.post('/prospects', requireStaffAuth, async (req, res) => {
        const { id_ticket, branche_interet } = req.body;
        if (!Number.isInteger(id_ticket)) {
            return res.status(400).json({ succes: false, erreurs: ['id_ticket requis'] });
        }

        try {
            const ticket = await pool.query(
                `SELECT t.id_utilisateur, t.email_contact, t.telephone_contact, u.nom, u.prenom
                 FROM site.tickets t LEFT JOIN site.utilisateurs u ON u.id_utilisateur = t.id_utilisateur
                 WHERE t.id_ticket = $1`,
                [id_ticket]
            );
            if (ticket.rowCount === 0) {
                return res.status(404).json({ succes: false, erreurs: ['ticket introuvable'] });
            }
            const t = ticket.rows[0];
            // Repli (03/09/2026) : prospects.nom est désormais obligatoire,
            // mais un ticket peut ne pas avoir de compte Client lié (t.nom
            // viendrait alors d'une jointure vide). Faute de mieux, on
            // utilise l'email ou le téléphone comme nom provisoire, plutôt
            // que de faire échouer la création — à réévaluer avec Roger si
            // ce cas se présente réellement en pratique.
            const nomRepli = t.nom || t.email_contact || t.telephone_contact || 'Prospect sans nom';

            const resultat = await pool.query(
                `INSERT INTO site.prospects (id_ticket_origine, id_utilisateur, nom, prenom, email, telephone, branche_interet, id_staff_assigne)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING id_prospect, statut_opportunite, date_creation`,
                [id_ticket, t.id_utilisateur, nomRepli, t.prenom || null, t.email_contact, t.telephone_contact, branche_interet || null, req.session.id_staff]
            );

            return res.status(201).json({ succes: true, prospect: resultat.rows[0] });
        } catch (err) {
            console.error('[POST /api/staff/prospects] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    router.get('/prospects', requireStaffAuth, async (req, res) => {
        const { statut } = req.query;
        const conditions = [];
        const valeurs = [];
        if (statut) {
            valeurs.push(statut);
            conditions.push(`p.statut_opportunite = $${valeurs.length}`);
        }
        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        try {
            const resultat = await pool.query(
                `SELECT p.id_prospect, p.nom, p.prenom, p.email, p.telephone, p.branche_interet,
                        p.statut_opportunite, p.id_staff_assigne, TRIM(COALESCE(s.prenom, '') || ' ' || s.nom) AS staff_assigne_nom,
                        p.date_creation, p.date_maj
                 FROM site.prospects p
                 LEFT JOIN site.staff s ON s.id_staff = p.id_staff_assigne
                 ${whereClause}
                 ORDER BY p.date_maj DESC
                 LIMIT 200`,
                valeurs
            );
            return res.status(200).json({ succes: true, prospects: resultat.rows });
        } catch (err) {
            console.error('[GET /api/staff/prospects] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    router.patch('/prospects/:id/statut', requireStaffAuth, async (req, res) => {
        const idProspect = parseInt(req.params.id, 10);
        const { statut_opportunite } = req.body;
        if (!Number.isInteger(idProspect)) {
            return res.status(400).json({ succes: false, erreurs: ['id de prospect invalide'] });
        }
        if (!STATUTS_OPPORTUNITE.includes(statut_opportunite)) {
            return res.status(400).json({ succes: false, erreurs: [`statut_opportunite doit être l'un de : ${STATUTS_OPPORTUNITE.join(', ')}`] });
        }
        try {
            const resultat = await pool.query(
                'UPDATE site.prospects SET statut_opportunite = $1 WHERE id_prospect = $2 RETURNING id_prospect, statut_opportunite',
                [statut_opportunite, idProspect]
            );
            if (resultat.rowCount === 0) {
                return res.status(404).json({ succes: false, erreurs: ['prospect introuvable'] });
            }
            return res.status(200).json({ succes: true, prospect: resultat.rows[0] });
        } catch (err) {
            console.error('[PATCH /api/staff/prospects/:id/statut] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    router.get('/prospects/:id/interactions', requireStaffAuth, async (req, res) => {
        const idProspect = parseInt(req.params.id, 10);
        try {
            const resultat = await pool.query(
                `SELECT i.id_interaction, i.type_interaction, i.contenu, i.date_interaction, TRIM(COALESCE(s.prenom, '') || ' ' || s.nom) AS staff_nom
                 FROM site.interactions_prospect i
                 LEFT JOIN site.staff s ON s.id_staff = i.id_staff
                 WHERE i.id_prospect = $1
                 ORDER BY i.date_interaction DESC`,
                [idProspect]
            );
            return res.status(200).json({ succes: true, interactions: resultat.rows });
        } catch (err) {
            console.error('[GET /api/staff/prospects/:id/interactions] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    router.post('/prospects/:id/interactions', requireStaffAuth, async (req, res) => {
        const idProspect = parseInt(req.params.id, 10);
        const { type_interaction, contenu } = req.body;
        if (!type_interaction || !contenu) {
            return res.status(400).json({ succes: false, erreurs: ['type_interaction et contenu requis'] });
        }
        try {
            const resultat = await pool.query(
                `INSERT INTO site.interactions_prospect (id_prospect, id_staff, type_interaction, contenu)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id_interaction, date_interaction`,
                [idProspect, req.session.id_staff, type_interaction, contenu]
            );
            await pool.query('UPDATE site.prospects SET date_maj = now() WHERE id_prospect = $1', [idProspect]);
            return res.status(201).json({ succes: true, interaction: resultat.rows[0] });
        } catch (err) {
            console.error('[POST /api/staff/prospects/:id/interactions] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    // Suppression, contrairement aux autres routes de ce fichier,
    // restreinte administrateur/superadmin -- une suppression est
    // irréversible, pas comparable à un changement de statut ou l'ajout
    // d'une interaction (02/09/2026, harmonisation Prospects/Clients).
    router.delete('/prospects/:id', requireStaffAuth, requireStaffRole(['administrateur', 'superadmin']), async (req, res) => {
        const idProspect = parseInt(req.params.id, 10);
        if (!Number.isInteger(idProspect)) {
            return res.status(400).json({ succes: false, erreurs: ['id invalide'] });
        }
        try {
            await pool.query('DELETE FROM site.prospects WHERE id_prospect = $1', [idProspect]);
            return res.status(200).json({ succes: true });
        } catch (err) {
            console.error('[DELETE /api/staff/prospects/:id] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    // -------------------------------------------------------------
    // Import CSV Prospects (02/09/2026) -- volontairement plus simple
    // que l'import Partenaires : pas de compte à créer, pas d'email
    // d'activation, pas de types/contacts. Un prospect n'est qu'une
    // trace d'intérêt, pas un accès à quoi que ce soit.
    // -------------------------------------------------------------
    function parserLigneCsv(ligne) {
        const champs = [];
        let champActuel = '';
        let dansGuillemets = false;
        for (let i = 0; i < ligne.length; i++) {
            const car = ligne[i];
            if (car === '"') {
                if (dansGuillemets && ligne[i + 1] === '"') { champActuel += '"'; i++; }
                else dansGuillemets = !dansGuillemets;
            } else if (car === ';' && !dansGuillemets) {
                champs.push(champActuel.trim());
                champActuel = '';
            } else {
                champActuel += car;
            }
        }
        champs.push(champActuel.trim());
        return champs;
    }

    router.post('/prospects/import', requireStaffAuth, requireStaffRole(['administrateur', 'superadmin']), async (req, res) => {
        const { contenu_csv } = req.body;
        if (!contenu_csv || typeof contenu_csv !== 'string') {
            return res.status(400).json({ succes: false, erreurs: ['contenu_csv requis'] });
        }

        const lignes = contenu_csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lignes.length < 2) {
            return res.status(400).json({ succes: false, erreurs: ['fichier vide ou sans données'] });
        }

        const enteteAttendue = ['nom', 'prenom', 'email', 'telephone', 'branche_interet'];
        const entete = parserLigneCsv(lignes[0]).map((c) => c.toLowerCase());
        if (JSON.stringify(entete) !== JSON.stringify(enteteAttendue)) {
            return res.status(400).json({ succes: false, erreurs: [`en-tête invalide — attendu : ${enteteAttendue.join(';')}`] });
        }

        const resultats = { crees: [], erreurs: [] };

        for (let i = 1; i < lignes.length; i++) {
            const numeroLigne = i + 1;
            const champs = parserLigneCsv(lignes[i]);
            const [nom, prenom, email, telephone, branche_interet] = champs;

            if (!nom || (!email && !telephone)) {
                resultats.erreurs.push(`Ligne ${numeroLigne} : nom requis, et au moins un moyen de contact (email ou téléphone)`);
                continue;
            }
            try {
                const resultat = await pool.query(
                    `INSERT INTO site.prospects (nom, prenom, email, telephone, branche_interet, id_staff_assigne)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     RETURNING id_prospect`,
                    [nom, prenom || null, email || null, telephone || null, branche_interet || null, req.session.id_staff]
                );
                resultats.crees.push({ id_prospect: resultat.rows[0].id_prospect, nom: prenom ? `${prenom} ${nom}` : nom });
            } catch (err) {
                console.error(`[POST /api/staff/prospects/import] Erreur ligne ${numeroLigne} :`, err);
                resultats.erreurs.push(`Ligne ${numeroLigne} : erreur serveur`);
            }
        }

        if (resultats.crees.length > 0) {
            await pool.query(
                `INSERT INTO site.journal_audit (id_staff, action, table_concernee, donnees_apres, adresse_ip)
                 VALUES ($1, 'prospect.import_csv', 'prospects', $2::jsonb, $3)`,
                [req.session.id_staff, JSON.stringify({ nombre_crees: resultats.crees.length }), req.ip]
            );
        }

        return res.status(200).json({ succes: true, ...resultats });
    });

    return router;
};
