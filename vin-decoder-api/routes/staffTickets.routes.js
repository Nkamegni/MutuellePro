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
                    t.date_maj
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

    return router;
};
