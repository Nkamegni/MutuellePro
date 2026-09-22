// =====================================================================
// Mutuelle Pro Assurances — Phase 2a + 2b
// Routes :
//   GET   /api/staff/tickets              — liste filtrable (lecture, tout staff)
//   GET   /api/staff/agents               — liste du staff actif (pour assignation)
//   PATCH /api/staff/tickets/:id/statut       — changement de statut (Gestionnaire/Admin)
//   PATCH /api/staff/tickets/:id/assignation  — assignation à un agent (Gestionnaire/Admin)
// =====================================================================
//
// Intégration dans server.js :
//
//   const staffTicketsRouter = require('./routes/staffTickets.routes')(pool);
//   app.use('/api/staff', staffTicketsRouter);
// =====================================================================

const express = require('express');
const nodemailer = require('nodemailer');
const requireStaffAuth = require('../middleware/requireStaffAuth');
const requireStaffRole = require('../middleware/requireStaffRole');
const { envoyerNotificationExterne } = require('../lib/notifications');
const { messageBloqueCorrectionApresLecture } = require('../lib/blocageCorrectionMessage');

const ROLES_ECRITURE = ['gestionnaire', 'administrateur', 'superadmin'];
const STATUTS_VALIDES = ['recu', 'en_cours', 'resolu'];

const STATUT_LIBELLE_FR = { recu: 'Reçu', en_cours: 'En cours de traitement', resolu: 'Résolu' };

// Transporteur SMTP dédié — même pattern que inscription.routes.js et
// verification.routes.js (chaque routeur est un module indépendant sans
// accès aux constantes locales de server.js).
const mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
});

async function notifierClientChangementStatut(pool, emailClient, codeTicket, nouveauStatut) {
    if (!emailClient) return;
    try {
        const infoEnvoi = await mailTransporter.sendMail({
            from: '"Mutuelle Pro Assurances" <no-reply@mutuelleproassurances.com>',
            to: emailClient,
            subject: `Mutuelle Pro Assurances — Mise à jour de votre demande ${codeTicket}`,
            html: `
                <p>Bonjour,</p>
                <p>Le statut de votre demande <strong>${codeTicket}</strong> a été mis à jour :</p>
                <p style="font-size:16px;"><strong>${STATUT_LIBELLE_FR[nouveauStatut] || nouveauStatut}</strong></p>
                <p>Vous pouvez suivre l'avancement de vos demandes depuis votre Espace Client sur notre site.</p>
            `,
        });
        try {
            await pool.query(
                `INSERT INTO site.no_reply_messages_envoyes (message_id, destinataire, type_message, reference_compte)
                 VALUES ($1, $2, $3, $4)`,
                [infoEnvoi.messageId, emailClient, 'mise_a_jour_ticket', codeTicket]
            );
        } catch (err) {
            console.error('[notifierClientChangementStatut] Erreur journalisation no-reply (ignorée) :', err);
        }
    } catch (err) {
        // Une notification échouée ne doit jamais faire échouer le
        // changement de statut lui-même — l'action métier prime.
        console.error('[notifierClientChangementStatut] Erreur envoi email :', err);
    }
}

module.exports = function (pool) {
    const router = express.Router();

    router.get('/tickets', requireStaffAuth, async (req, res) => {
        const { statut, type } = req.query;
        const conditions = [];
        const valeurs = [];

        if (statut) {
            valeurs.push(statut);
            conditions.push(`st.code_statut_ticket = $${valeurs.length}`);
        }
        if (type) {
            valeurs.push(type);
            conditions.push(`tt.code_type_ticket = $${valeurs.length}`);
        }
        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

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
                    t.email_contact,
                    t.telephone_contact,
                    t.id_utilisateur,
                    u.email AS compte_email,
                    t.id_staff_assigne,
                    TRIM(COALESCE(sa.prenom, '') || ' ' || sa.nom) AS staff_assigne_nom,
                    t.date_creation,
                    t.date_maj,
                    EXISTS(
                        SELECT 1 FROM site.messages_dossier m
                        WHERE m.id_ticket = t.id_ticket AND m.type_auteur IN ('client', 'partenaire') AND m.lu_par_staff = false
                    ) AS a_message_non_lu
                 FROM site.tickets t
                 JOIN site.type_ticket tt ON tt.id_type_ticket = t.id_type_ticket
                 JOIN site.statut_ticket st ON st.id_statut_ticket = t.id_statut_ticket
                 LEFT JOIN site.utilisateurs u ON u.id_utilisateur = t.id_utilisateur
                 LEFT JOIN site.staff sa ON sa.id_staff = t.id_staff_assigne
                 ${whereClause}
                 ORDER BY t.date_creation DESC
                 LIMIT 200`,
                valeurs
            );

            return res.status(200).json({ succes: true, tickets: resultat.rows });
        } catch (err) {
            console.error('[GET /api/staff/tickets] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    // Liste du staff actif — utilisée pour peupler le sélecteur
    // d'assignation. Accessible à tout staff connecté (simple lecture de
    // noms), même si seule l'écriture de l'assignation elle-même est
    // restreinte aux rôles Gestionnaire/Administrateur.
    router.get('/agents', requireStaffAuth, async (req, res) => {
        try {
            const resultat = await pool.query(
                `SELECT s.id_staff, s.nom, s.prenom, r.code_role
                 FROM site.staff s
                 JOIN site.role_staff r ON r.id_role = s.id_role
                 WHERE s.statut_compte = 'actif'
                 ORDER BY s.nom, s.prenom`
            );
            return res.status(200).json({ succes: true, agents: resultat.rows });
        } catch (err) {
            console.error('[GET /api/staff/agents] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    router.patch('/tickets/:id/statut', requireStaffAuth, requireStaffRole(ROLES_ECRITURE), async (req, res) => {
        const idTicket = parseInt(req.params.id, 10);
        const { code_statut_ticket } = req.body;

        if (!Number.isInteger(idTicket)) {
            return res.status(400).json({ succes: false, erreurs: ['id de ticket invalide'] });
        }
        if (!STATUTS_VALIDES.includes(code_statut_ticket)) {
            return res.status(400).json({ succes: false, erreurs: [`code_statut_ticket doit être l'un de : ${STATUTS_VALIDES.join(', ')}`] });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const avant = await client.query(
                `SELECT st.code_statut_ticket, t.email_contact, t.code_ticket
                 FROM site.tickets t JOIN site.statut_ticket st ON st.id_statut_ticket = t.id_statut_ticket
                 WHERE t.id_ticket = $1`,
                [idTicket]
            );
            if (avant.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ succes: false, erreurs: ['ticket introuvable'] });
            }
            const statutAvant = avant.rows[0].code_statut_ticket;
            const emailClient = avant.rows[0].email_contact;
            const codeTicket = avant.rows[0].code_ticket;

            const resultat = await client.query(
                `UPDATE site.tickets t
                 SET id_statut_ticket = st.id_statut_ticket
                 FROM site.statut_ticket st
                 WHERE t.id_ticket = $1 AND st.code_statut_ticket = $2
                 RETURNING t.id_ticket, t.code_ticket`,
                [idTicket, code_statut_ticket]
            );

            await client.query(
                `INSERT INTO site.journal_audit (id_staff, action, table_concernee, id_enregistrement, donnees_avant, donnees_apres, adresse_ip)
                 VALUES ($1, 'ticket.changement_statut', 'tickets', $2, $3::jsonb, $4::jsonb, $5)`,
                [req.session.id_staff, idTicket, JSON.stringify({ code_statut_ticket: statutAvant }), JSON.stringify({ code_statut_ticket }), req.ip]
            );

            await client.query('COMMIT');

            if (statutAvant !== code_statut_ticket) {
                notifierClientChangementStatut(pool, emailClient, codeTicket, code_statut_ticket);
            }

            return res.status(200).json({ succes: true, ticket: resultat.rows[0] });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('[PATCH /api/staff/tickets/:id/statut] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        } finally {
            client.release();
        }
    });

    router.patch('/tickets/:id/assignation', requireStaffAuth, requireStaffRole(ROLES_ECRITURE), async (req, res) => {
        const idTicket = parseInt(req.params.id, 10);
        // id_staff peut être null explicitement, pour désassigner un ticket.
        const idStaffAssigne = req.body.id_staff === null ? null : parseInt(req.body.id_staff, 10);

        if (!Number.isInteger(idTicket)) {
            return res.status(400).json({ succes: false, erreurs: ['id de ticket invalide'] });
        }
        if (idStaffAssigne !== null && !Number.isInteger(idStaffAssigne)) {
            return res.status(400).json({ succes: false, erreurs: ['id_staff invalide'] });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const avant = await client.query('SELECT id_staff_assigne FROM site.tickets WHERE id_ticket = $1', [idTicket]);
            if (avant.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ succes: false, erreurs: ['ticket introuvable'] });
            }
            const assignationAvant = avant.rows[0].id_staff_assigne;

            const resultat = await client.query(
                `UPDATE site.tickets SET id_staff_assigne = $2 WHERE id_ticket = $1 RETURNING id_ticket, code_ticket, id_staff_assigne`,
                [idTicket, idStaffAssigne]
            );

            await client.query(
                `INSERT INTO site.journal_audit (id_staff, action, table_concernee, id_enregistrement, donnees_avant, donnees_apres, adresse_ip)
                 VALUES ($1, 'ticket.assignation', 'tickets', $2, $3::jsonb, $4::jsonb, $5)`,
                [req.session.id_staff, idTicket, JSON.stringify({ id_staff_assigne: assignationAvant }), JSON.stringify({ id_staff_assigne: idStaffAssigne }), req.ip]
            );

            await client.query('COMMIT');

            return res.status(200).json({ succes: true, ticket: resultat.rows[0] });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('[PATCH /api/staff/tickets/:id/assignation] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        } finally {
            client.release();
        }
    });

    // Lot E (15/09/2026) -- pendant staff de la messagerie fil-par-dossier.
    // Écriture ouverte à tout staff authentifié (cohérent avec la lecture
    // déjà ouverte, GET /tickets sans filtre par assignation) -- décision
    // à confirmer avec Roger si un resserrement à ROLES_ECRITURE est voulu.
    router.get('/tickets/:id/messages', requireStaffAuth, async (req, res) => {
        const idTicket = parseInt(req.params.id, 10);
        if (!Number.isInteger(idTicket)) return res.status(400).json({ succes: false, erreurs: ['id invalide'] });
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
                 WHERE md.id_ticket = $1 ORDER BY md.date_creation ASC`,
                [idTicket]
            );
            return res.status(200).json({ succes: true, messages: resultat.rows });
        } catch (err) {
            console.error('[GET /api/staff/tickets/:id/messages] Erreur :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.post('/tickets/:id/messages', requireStaffAuth, async (req, res) => {
        const idTicket = parseInt(req.params.id, 10);
        const { contenu, visible_client } = req.body;
        if (!Number.isInteger(idTicket)) return res.status(400).json({ succes: false, erreurs: ['id invalide'] });
        if (!contenu || !contenu.trim()) return res.status(400).json({ succes: false, erreurs: ['contenu requis'] });
        try {
            const ticket = await pool.query('SELECT code_ticket, email_contact FROM site.tickets WHERE id_ticket = $1', [idTicket]);
            if (ticket.rowCount === 0) return res.status(404).json({ succes: false, erreurs: ['ticket introuvable'] });

            const visibleClientFinal = visible_client !== false; // par défaut true (réponse au client)
            const resultat = await pool.query(
                `INSERT INTO site.messages_dossier (id_ticket, type_auteur, id_auteur, contenu, visible_client)
                 VALUES ($1, 'staff', $2, $3, $4) RETURNING id_message, date_creation`,
                [idTicket, req.session.id_staff, contenu.trim(), visibleClientFinal]
            );
            const message = { id_message: resultat.rows[0].id_message, id_ticket: idTicket, type_auteur: 'staff', contenu: contenu.trim(), date_creation: resultat.rows[0].date_creation, visible_client: visibleClientFinal };

            // Correctif de sécurité (16/09/2026, signalé par la session Git —
            // faille active en production) : une note interne ne doit
            // JAMAIS atteindre un socket Client, même si celui-ci a
            // légitimement rejoint la room du ticket (autorisation déjà
            // vérifiée par ailleurs pour le contenu visible). L'écriture en
            // base respectait déjà visible_client -- seule l'émission
            // socket, jusqu'ici inconditionnelle, fuitait le contenu texte
            // intégral vers tout Client propriétaire du ticket.
            if (global.ioMessagerie) {
                if (visibleClientFinal) {
                    global.ioMessagerie.to(`ticket:${idTicket}`).emit('message:nouveau', message);
                } else {
                    // Accès direct aux sockets locaux plutôt que
                    // fetchSockets() -- voir commentaire complet dans
                    // partenaireAuth.routes.js, même correctif.
                    const room = global.ioMessagerie.sockets.adapter.rooms.get(`ticket:${idTicket}`) || new Set();
                    for (const socketId of room) {
                        const s = global.ioMessagerie.sockets.sockets.get(socketId);
                        const sess = s && s.request && s.request.session;
                        if (sess && (sess.id_staff || sess.id_partenaire)) s.emit('message:nouveau', message);
                    }
                }
            }

            if (visibleClientFinal) {
                envoyerNotificationExterne(pool, {
                    destinataireEmail: ticket.rows[0].email_contact,
                    destinataireNom: '',
                    typeEvenement: 'reponse_staff',
                    contexte: { codeTicket: ticket.rows[0].code_ticket, extrait: contenu.trim().slice(0, 100) },
                });
            }

            return res.status(201).json({ succes: true, message });
        } catch (err) {
            console.error('[POST /api/staff/tickets/:id/messages] Erreur :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    // Correction de message (16/09/2026) -- l'auteur seul peut corriger
    // son propre message, jamais un autre. Émission socket ciblée comme
    // pour l'envoi (visible_client conditionne la diffusion, même
    // logique que le correctif de sécurité du 16/09).
    router.patch('/tickets/:id/messages/:idMessage', requireStaffAuth, async (req, res) => {
        const idTicket = parseInt(req.params.id, 10);
        const idMessage = parseInt(req.params.idMessage, 10);
        const { contenu } = req.body;
        if (!Number.isInteger(idTicket) || !Number.isInteger(idMessage)) {
            return res.status(400).json({ succes: false, erreurs: ['id invalide'] });
        }
        if (!contenu || !contenu.trim()) {
            return res.status(400).json({ succes: false, erreurs: ['contenu requis'] });
        }
        try {
            const existant = await pool.query(
                `SELECT id_auteur, visible_client, date_lecture_client, date_lecture_staff, date_lecture_partenaire
                 FROM site.messages_dossier WHERE id_message = $1 AND id_ticket = $2 AND type_auteur = 'staff'`,
                [idMessage, idTicket]
            );
            if (existant.rowCount === 0) {
                return res.status(404).json({ succes: false, erreurs: ['message introuvable'] });
            }
            if (existant.rows[0].id_auteur !== req.session.id_staff) {
                return res.status(403).json({ succes: false, erreurs: ['seul l\'auteur peut corriger ce message'] });
            }
            if (messageBloqueCorrectionApresLecture({
                typeAuteur: 'staff', visibleClient: existant.rows[0].visible_client,
                dateLectureClient: existant.rows[0].date_lecture_client, dateLectureStaff: existant.rows[0].date_lecture_staff, dateLecturePartenaire: existant.rows[0].date_lecture_partenaire,
            })) {
                return res.status(409).json({ succes: false, erreurs: ['ce message a déjà été lu depuis plus de 30 secondes, il ne peut plus être corrigé'] });
            }
            const resultat = await pool.query(
                `UPDATE site.messages_dossier SET contenu = $1, modifie = true, date_modification = now()
                 WHERE id_message = $2 RETURNING date_modification`,
                [contenu.trim(), idMessage]
            );
            const message = { id_message: idMessage, id_ticket: idTicket, contenu: contenu.trim(), date_modification: resultat.rows[0].date_modification };

            if (global.ioMessagerie) {
                if (existant.rows[0].visible_client) {
                    global.ioMessagerie.to(`ticket:${idTicket}`).emit('message:modifie', message);
                } else {
                    const room = global.ioMessagerie.sockets.adapter.rooms.get(`ticket:${idTicket}`) || new Set();
                    for (const socketId of room) {
                        const s = global.ioMessagerie.sockets.sockets.get(socketId);
                        const sess = s && s.request && s.request.session;
                        if (sess && (sess.id_staff || sess.id_partenaire)) s.emit('message:modifie', message);
                    }
                }
            }

            return res.status(200).json({ succes: true });
        } catch (err) {
            console.error('[PATCH /api/staff/tickets/:id/messages/:idMessage] Erreur :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.patch('/tickets/:id/messages/lu', requireStaffAuth, async (req, res) => {
        const idTicket = parseInt(req.params.id, 10);
        if (!Number.isInteger(idTicket)) return res.status(400).json({ succes: false, erreurs: ['id invalide'] });
        try {
            await pool.query(`UPDATE site.messages_dossier SET lu_par_staff = true, date_lecture_staff = COALESCE(date_lecture_staff, now()) WHERE id_ticket = $1 AND type_auteur IN ('client', 'partenaire')`, [idTicket]);
            if (global.ioMessagerie) global.ioMessagerie.to(`ticket:${idTicket}`).emit('message:lu', { par: 'staff' });
            return res.status(200).json({ succes: true });
        } catch (err) {
            console.error('[PATCH /api/staff/tickets/:id/messages/lu] Erreur :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    // Non filtré par assignation (comptage total, pas par agent) --
    // cohérent avec GET /tickets déjà ouvert à tout staff sans distinction.
    router.get('/messages-clients-non-lus', requireStaffAuth, async (req, res) => {
        try {
            const resultat = await pool.query(
                `SELECT COUNT(*)::int AS total FROM site.messages_dossier
                 WHERE type_auteur IN ('client', 'partenaire') AND lu_par_staff = false`
            );
            return res.status(200).json({ succes: true, total: resultat.rows[0].total });
        } catch (err) {
            console.error('[GET /api/staff/messages-clients-non-lus] Erreur :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    return router;
};
