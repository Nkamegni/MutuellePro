// =====================================================================
// Mutuelle Pro Assurances — Helpdesk Volet 2
// Route : GET /api/mes-tickets — liste des tickets du compte connecté
//         (ébauche "Mon espace", §6.3 du cahier des charges)
// =====================================================================
//
// Intégration dans server.js (2 lignes, juste après le montage d'auth.routes) :
//
//   const mesTicketsRouter = require('./routes/mesTickets.routes')(pool);
//   app.use('/api', mesTicketsRouter);
// =====================================================================

const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { envoyerNotificationExterne } = require('../lib/notifications');
const { messageBloqueCorrectionApresLecture } = require('../lib/blocageCorrectionMessage');

module.exports = function (pool) {
    const router = express.Router();

    router.get('/mes-tickets', requireAuth, async (req, res) => {
        try {
            const resultat = await pool.query(
                `SELECT
                    t.id_ticket,
                    t.code_ticket,
                    tt.code_type_ticket,
                    tt.libelle_fr AS type_libelle_fr,
                    tt.libelle_en AS type_libelle_en,
                    st.code_statut_ticket,
                    st.libelle_fr AS statut_libelle_fr,
                    st.libelle_en AS statut_libelle_en,
                    t.contenu,
                    t.date_creation,
                    t.date_maj,
                    EXISTS(
                        SELECT 1 FROM site.messages_dossier m
                        WHERE m.id_ticket = t.id_ticket AND m.type_auteur IN ('staff', 'partenaire') AND m.visible_client = true AND m.lu_par_client = false
                    ) AS a_message_non_lu
                 FROM site.tickets t
                 JOIN site.type_ticket tt ON tt.id_type_ticket = t.id_type_ticket
                 JOIN site.statut_ticket st ON st.id_statut_ticket = t.id_statut_ticket
                 WHERE t.id_utilisateur = $1
                 ORDER BY t.date_creation DESC`,
                [req.session.id_utilisateur]
            );

            return res.status(200).json({
                succes: true,
                tickets: resultat.rows
            });
        } catch (err) {
            console.error('[GET /api/mes-tickets] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    // Lot E (15/09/2026) -- messagerie fil-par-dossier temps réel.
    // ticketAppartientAuClient réutilisée par les 3 routes ci-dessous,
    // jamais fait confiance à un id_ticket transmis sans vérification.
    async function ticketAppartientAuClient(pool, idTicket, idUtilisateur) {
        const r = await pool.query('SELECT code_ticket FROM site.tickets WHERE id_ticket = $1 AND id_utilisateur = $2', [idTicket, idUtilisateur]);
        return r.rowCount > 0 ? r.rows[0] : null;
    }

    router.get('/mes-tickets/:id/messages', requireAuth, async (req, res) => {
        const idTicket = parseInt(req.params.id, 10);
        if (!Number.isInteger(idTicket)) return res.status(400).json({ succes: false, erreurs: ['id invalide'] });
        const ticket = await ticketAppartientAuClient(pool, idTicket, req.session.id_utilisateur);
        if (!ticket) return res.status(404).json({ succes: false, erreurs: ['ticket introuvable'] });
        try {
            const resultat = await pool.query(
                `SELECT md.id_message, md.type_auteur, md.contenu, md.date_creation, md.visible_client, md.modifie, md.date_modification,
                        md.lu_par_client, md.lu_par_staff, md.lu_par_partenaire,
                        md.date_lecture_client, md.date_lecture_staff, md.date_lecture_partenaire,
                        COALESCE(u.email, s.email, p.email) AS email_auteur
                 FROM site.messages_dossier md
                 LEFT JOIN site.utilisateurs u ON md.type_auteur = 'client' AND u.id_utilisateur = md.id_auteur
                 LEFT JOIN site.staff s ON md.type_auteur = 'staff' AND s.id_staff = md.id_auteur
                 LEFT JOIN site.partenaires p ON md.type_auteur = 'partenaire' AND p.id_partenaire = md.id_auteur
                 WHERE md.id_ticket = $1 AND md.visible_client = true ORDER BY md.date_creation ASC`,
                [idTicket]
            );
            return res.status(200).json({ succes: true, messages: resultat.rows });
        } catch (err) {
            console.error('[GET /api/mes-tickets/:id/messages] Erreur :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.post('/mes-tickets/:id/messages', requireAuth, async (req, res) => {
        const idTicket = parseInt(req.params.id, 10);
        const { contenu } = req.body;
        if (!Number.isInteger(idTicket)) return res.status(400).json({ succes: false, erreurs: ['id invalide'] });
        if (!contenu || !contenu.trim()) return res.status(400).json({ succes: false, erreurs: ['contenu requis'] });
        const ticket = await ticketAppartientAuClient(pool, idTicket, req.session.id_utilisateur);
        if (!ticket) return res.status(404).json({ succes: false, erreurs: ['ticket introuvable'] });
        try {
            const resultat = await pool.query(
                `INSERT INTO site.messages_dossier (id_ticket, type_auteur, id_auteur, contenu)
                 VALUES ($1, 'client', $2, $3) RETURNING id_message, date_creation`,
                [idTicket, req.session.id_utilisateur, contenu.trim()]
            );
            const message = { id_message: resultat.rows[0].id_message, id_ticket: idTicket, type_auteur: 'client', contenu: contenu.trim(), date_creation: resultat.rows[0].date_creation };

            if (global.ioMessagerie) global.ioMessagerie.to(`ticket:${idTicket}`).emit('message:nouveau', message);

            // Notification au staff -- pas de destinataire individuel (un
            // ticket n'a pas forcément d'agent assigné), envoyée à l'adresse
            // de réception générale des tickets si configurée ; à défaut,
            // seule la mise à jour dans myspace.html signale le nouveau
            // message (badge, dashboard) -- pas un blocage pour ce lot.
            if (process.env.EMAIL_RECEPTION_TICKETS) {
                envoyerNotificationExterne(pool, {
                    destinataireEmail: process.env.EMAIL_RECEPTION_TICKETS,
                    destinataireNom: 'Équipe',
                    typeEvenement: 'nouveau_message_client',
                    contexte: { codeTicket: ticket.code_ticket, extrait: contenu.trim().slice(0, 100) },
                });
            }

            return res.status(201).json({ succes: true, message });
        } catch (err) {
            console.error('[POST /api/mes-tickets/:id/messages] Erreur :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.patch('/mes-tickets/:id/messages/:idMessage', requireAuth, async (req, res) => {
        const idTicket = parseInt(req.params.id, 10);
        const idMessage = parseInt(req.params.idMessage, 10);
        const { contenu } = req.body;
        if (!Number.isInteger(idTicket) || !Number.isInteger(idMessage)) {
            return res.status(400).json({ succes: false, erreurs: ['id invalide'] });
        }
        if (!contenu || !contenu.trim()) {
            return res.status(400).json({ succes: false, erreurs: ['contenu requis'] });
        }
        const ticket = await ticketAppartientAuClient(pool, idTicket, req.session.id_utilisateur);
        if (!ticket) return res.status(404).json({ succes: false, erreurs: ['ticket introuvable'] });
        try {
            const existant = await pool.query(
                `SELECT id_auteur, date_lecture_staff, date_lecture_partenaire FROM site.messages_dossier WHERE id_message = $1 AND id_ticket = $2 AND type_auteur = 'client'`,
                [idMessage, idTicket]
            );
            if (existant.rowCount === 0) {
                return res.status(404).json({ succes: false, erreurs: ['message introuvable'] });
            }
            if (existant.rows[0].id_auteur !== req.session.id_utilisateur) {
                return res.status(403).json({ succes: false, erreurs: ['seul l\'auteur peut corriger ce message'] });
            }
            if (messageBloqueCorrectionApresLecture({
                typeAuteur: 'client', visibleClient: true,
                dateLectureStaff: existant.rows[0].date_lecture_staff, dateLecturePartenaire: existant.rows[0].date_lecture_partenaire,
            })) {
                return res.status(409).json({ succes: false, erreurs: ['ce message a déjà été lu depuis plus de 30 secondes, il ne peut plus être corrigé'] });
            }
            const resultat = await pool.query(
                `UPDATE site.messages_dossier SET contenu = $1, modifie = true, date_modification = now()
                 WHERE id_message = $2 RETURNING date_modification`,
                [contenu.trim(), idMessage]
            );
            const message = { id_message: idMessage, id_ticket: idTicket, contenu: contenu.trim(), date_modification: resultat.rows[0].date_modification };
            // Message Client toujours visible_client=true implicitement --
            // pas de note interne possible côté Client, diffusion large
            // toujours correcte ici, contrairement à Staff/Partenaire.
            if (global.ioMessagerie) global.ioMessagerie.to(`ticket:${idTicket}`).emit('message:modifie', message);

            return res.status(200).json({ succes: true });
        } catch (err) {
            console.error('[PATCH /api/mes-tickets/:id/messages/:idMessage] Erreur :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.patch('/mes-tickets/:id/messages/lu', requireAuth, async (req, res) => {
        const idTicket = parseInt(req.params.id, 10);
        if (!Number.isInteger(idTicket)) return res.status(400).json({ succes: false, erreurs: ['id invalide'] });
        const ticket = await ticketAppartientAuClient(pool, idTicket, req.session.id_utilisateur);
        if (!ticket) return res.status(404).json({ succes: false, erreurs: ['ticket introuvable'] });
        try {
            await pool.query(`UPDATE site.messages_dossier SET lu_par_client = true, date_lecture_client = COALESCE(date_lecture_client, now()) WHERE id_ticket = $1 AND type_auteur IN ('staff', 'partenaire')`, [idTicket]);
            if (global.ioMessagerie) global.ioMessagerie.to(`ticket:${idTicket}`).emit('message:lu', { par: 'client' });
            return res.status(200).json({ succes: true });
        } catch (err) {
            console.error('[PATCH /api/mes-tickets/:id/messages/lu] Erreur :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.get('/mes-tickets/messages-non-lus', requireAuth, async (req, res) => {
        try {
            const resultat = await pool.query(
                `SELECT COUNT(*)::int AS total FROM site.messages_dossier m
                 JOIN site.tickets t ON t.id_ticket = m.id_ticket
                 WHERE t.id_utilisateur = $1 AND m.type_auteur IN ('staff', 'partenaire') AND m.visible_client = true AND m.lu_par_client = false`,
                [req.session.id_utilisateur]
            );
            return res.status(200).json({ succes: true, total: resultat.rows[0].total });
        } catch (err) {
            console.error('[GET /api/mes-tickets/messages-non-lus] Erreur :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    return router;
};

// =====================================================================
// Exemple d'appel côté frontend (à intégrer au §6.3, pas dans ce tour) :
//
// fetch('/api/mes-tickets', { credentials: 'include' })
//     .then(r => r.json())
//     .then(data => { /* data.tickets : tableau, code_statut_ticket pour
//                        colorer/filtrer, libelle_fr/libelle_en pour
//                        affichage bilingue cohérent avec data-i18n */ });
//
// Réponse 401 si non connecté — le frontend doit rediriger vers la
// connexion dans ce cas plutôt que d'afficher une erreur brute.
// =====================================================================
