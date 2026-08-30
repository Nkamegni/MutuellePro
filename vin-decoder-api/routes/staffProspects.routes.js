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
            const nomComplet = [t.prenom, t.nom].filter(Boolean).join(' ') || null;

            const resultat = await pool.query(
                `INSERT INTO site.prospects (id_ticket_origine, id_utilisateur, nom_complet, email, telephone, branche_interet, id_staff_assigne)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING id_prospect, statut_opportunite, date_creation`,
                [id_ticket, t.id_utilisateur, nomComplet, t.email_contact, t.telephone_contact, branche_interet || null, req.session.id_staff]
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
                `SELECT p.id_prospect, p.nom_complet, p.email, p.telephone, p.branche_interet,
                        p.statut_opportunite, p.id_staff_assigne, s.nom_complet AS staff_assigne_nom,
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
                `SELECT i.id_interaction, i.type_interaction, i.contenu, i.date_interaction, s.nom_complet AS staff_nom
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

    return router;
};
