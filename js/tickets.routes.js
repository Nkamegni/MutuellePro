// =====================================================================
// Mutuelle Pro Assurances — Helpdesk Volet 2
// Route : POST /api/tickets — création d'un ticket sans compte préalable
// =====================================================================
//
// Intégration dans server.js (2 lignes à ajouter, aucune dépendance nouvelle) :
//
//   const ticketsRouter = require('./routes/tickets.routes')(pool);
//   app.use('/api', ticketsRouter);
//
// ⚠️ Remplacez `pool` par le nom réel de votre instance pg.Pool déjà
// configurée dans server.js (celle utilisée pour /api/send-quote-email
// ou les requêtes vers le schéma tarification).
// =====================================================================

const express = require('express');

// Types acceptés — doivent correspondre à site.type_ticket.code_type_ticket
const TYPES_AUTORISES = ['info', 'devis', 'sinistre'];

// Validation minimale, sans dépendance externe
function validerPayload(body) {
    const erreurs = [];

    if (!TYPES_AUTORISES.includes(body.type)) {
        erreurs.push(`type doit être l'un de : ${TYPES_AUTORISES.join(', ')}`);
    }
    if (!body.email || typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
        erreurs.push('email invalide ou manquant');
    }
    if (!body.telephone || typeof body.telephone !== 'string' || body.telephone.trim().length < 8) {
        erreurs.push('telephone invalide ou manquant');
    }
    if (!body.contenu || typeof body.contenu !== 'object' || Array.isArray(body.contenu)) {
        erreurs.push('contenu doit être un objet JSON');
    }

    return erreurs;
}

module.exports = function (pool) {
    const router = express.Router();

    router.post('/tickets', async (req, res) => {
        const erreurs = validerPayload(req.body);
        if (erreurs.length > 0) {
            return res.status(400).json({ succes: false, erreurs });
        }

        const { type, email, telephone, contenu } = req.body;

        // Requête atomique en un seul INSERT : on réserve l'id_ticket via
        // nextval() AVANT l'insertion, ce qui permet de calculer code_ticket
        // dans la même instruction. On évite ainsi un INSERT+UPDATE dans une
        // même clause WITH : PostgreSQL fait partager le même instantané à
        // toutes les sous-instructions d'une CTE modificatrice, si bien
        // qu'un UPDATE qui suit un INSERT dans la même clause WITH ne voit
        // PAS la ligne que cet INSERT vient d'écrire (comportement documenté,
        // pas un bug) — d'où l'échec silencieux observé en test.
        const requete = `
            WITH nextid AS (
                SELECT nextval('site.tickets_id_ticket_seq') AS id_ticket
            )
            INSERT INTO site.tickets (id_ticket, id_type_ticket, code_ticket, contenu, email_contact, telephone_contact)
            SELECT
                nextid.id_ticket,
                tt.id_type_ticket,
                'TCK-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextid.id_ticket::text, 4, '0'),
                $2::jsonb, $3, $4
            FROM nextid, site.type_ticket tt
            WHERE tt.code_type_ticket = $1
            RETURNING id_ticket, code_ticket, date_creation;
        `;

        try {
            const resultat = await pool.query(requete, [type, JSON.stringify(contenu), email, telephone]);

            if (resultat.rowCount === 0) {
                // Le type fourni ne correspond à aucune ligne de site.type_ticket
                // (ne devrait pas arriver vu validerPayload, filet de sécurité)
                return res.status(400).json({ succes: false, erreurs: ['type de ticket inconnu en base'] });
            }

            const ticket = resultat.rows[0];
            return res.status(201).json({
                succes: true,
                id_ticket: ticket.id_ticket,
                code_ticket: ticket.code_ticket,
                date_creation: ticket.date_creation
            });
        } catch (err) {
            console.error('[POST /api/tickets] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    return router;
};

// =====================================================================
// Exemple d'appel côté frontend (à intégrer au §6.3, pas dans ce tour) :
//
// fetch('/api/tickets', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({
//         type: 'devis',
//         email: 'client@exemple.com',
//         telephone: '+237690000000',
//         contenu: { branche: 'Automobile', genre: '...', message: '...' }
//     })
// });
// =====================================================================
