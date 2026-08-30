// =====================================================================
// Mutuelle Pro Assurances — Administration du Personnel (Staff)
// Routes (toutes réservées à l'Administrateur) :
//   GET    /api/staff/roles
//   GET    /api/staff/personnel
//   POST   /api/staff/personnel               — création + activation par lien
//   PATCH  /api/staff/personnel/:id
//   DELETE /api/staff/personnel/:id            — protégé (racine/admin)
// =====================================================================

const express = require('express');
const argon2 = require('argon2');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const requireStaffAuth = require('../middleware/requireStaffAuth');
const { creerBoiteMail } = require('../lib/ispconfig');
const { chiffrer } = require('../lib/chiffrement');
const requireStaffRole = require('../middleware/requireStaffRole');

const mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
});

async function envoyerEmailActivationStaff(emailValidation, nomComplet, token) {
    const lien = `https://mutuelleproassurances.com/activation-staff.html?token=${token}`;
    try {
        await mailTransporter.sendMail({
            from: '"Mutuelle Pro Assurances" <admin@mutuelleproassurances.com>',
            to: emailValidation,
            subject: 'Mutuelle Pro Assurances — Activez votre compte Personnel',
            html: `
                <p>Bonjour,</p>
                <p>Un compte Personnel a été créé pour <strong>${nomComplet}</strong> sur l'espace Mutuelle Pro Assurances.</p>
                <p>Pour l'activer et définir votre mot de passe, cliquez sur le lien ci-dessous (valable 72 heures) :</p>
                <p><a href="${lien}">${lien}</a></p>
            `,
        });
    } catch (err) {
        console.error('[envoyerEmailActivationStaff] Erreur envoi email :', err);
    }
}

module.exports = function (pool) {
    const router = express.Router();

    router.get('/roles', requireStaffAuth, async (req, res) => {
        try {
            const resultat = await pool.query('SELECT id_role, code_role, libelle_fr FROM site.role_staff ORDER BY id_role');
            return res.status(200).json({ succes: true, roles: resultat.rows });
        } catch (err) {
            console.error('[GET /api/staff/roles] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.get('/personnel/verifier-email', requireStaffAuth, requireStaffRole(['administrateur']), async (req, res) => {
        const email = (req.query.email || '').trim();
        if (!email) {
            return res.status(400).json({ succes: false, erreurs: ['email requis'] });
        }
        try {
            const resultat = await pool.query(
                'SELECT id_staff, nom_complet, statut_compte FROM site.staff WHERE email = $1',
                [email]
            );
            return res.status(200).json({ succes: true, comptes: resultat.rows });
        } catch (err) {
            console.error('[GET /api/staff/personnel/verifier-email] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.get('/personnel', requireStaffAuth, requireStaffRole(['administrateur']), async (req, res) => {
        try {
            const resultat = await pool.query(
                `SELECT s.id_staff, s.matricule, s.nom_complet, s.email, s.telephone, s.statut_compte,
                        s.mot_de_passe_defini, s.est_compte_racine, s.suppression_reservee_racine,
                        r.code_role, r.libelle_fr AS role_libelle_fr
                 FROM site.staff s
                 JOIN site.role_staff r ON r.id_role = s.id_role
                 ORDER BY s.est_compte_racine DESC, s.nom_complet`
            );
            return res.status(200).json({ succes: true, personnel: resultat.rows });
        } catch (err) {
            console.error('[GET /api/staff/personnel] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.post('/personnel', requireStaffAuth, requireStaffRole(['administrateur']), async (req, res) => {
        const { email, email_validation, nom_complet, telephone, id_role, creer_boite_mail } = req.body;
        if (!email || !nom_complet || !id_role) {
            return res.status(400).json({ succes: false, erreurs: ['email, nom_complet et id_role requis'] });
        }
        if (!email_validation) {
            return res.status(400).json({ succes: false, erreurs: ['une adresse de validation personnelle est requise — c\'est elle qui recevra le lien d\'activation'] });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const hacheInutilisable = crypto.randomBytes(32).toString('hex');
            const dernierMatricule = await client.query('SELECT COUNT(*) AS total FROM site.staff');
            const matricule = `MPA-${String(parseInt(dernierMatricule.rows[0].total, 10) + 1).padStart(4, '0')}`;

            const insere = await client.query(
                `INSERT INTO site.staff (matricule, email, mot_de_passe_hache, id_role, nom_complet, telephone, mot_de_passe_defini, email_validation)
                 VALUES ($1, $2, $3, $4, $5, $6, false, $7)
                 RETURNING id_staff, email, nom_complet`,
                [matricule, email, hacheInutilisable, id_role, nom_complet, telephone || null, email_validation]
            );
            const nouveauStaff = insere.rows[0];

            const token = crypto.randomBytes(32).toString('hex');
            await client.query('INSERT INTO site.activation_staff_tokens (token, id_staff) VALUES ($1, $2)', [token, nouveauStaff.id_staff]);

            await client.query('COMMIT');

            envoyerEmailActivationStaff(email_validation, nom_complet, token);

            // Création de boîte mail — APRÈS le commit, volontairement non
            // bloquante : un échec ici ne doit jamais annuler la création
            // du compte Personnel lui-même (28/08/2026, pont PHP ISPConfig).
            let boiteMail = null;
            if (creer_boite_mail) {
                try {
                    const motDePasseGenere = crypto.randomBytes(12).toString('base64').replace(/[+/=]/g, '').slice(0, 16);
                    await creerBoiteMail({ email, motDePasse: motDePasseGenere, nomAffiche: nom_complet });
                    await pool.query('UPDATE site.staff SET imap_mot_de_passe_chiffre = $1 WHERE id_staff = $2', [chiffrer(motDePasseGenere), nouveauStaff.id_staff]);
                    boiteMail = { succes: true };
                } catch (err) {
                    console.error('[POST /api/staff/personnel] Échec création boîte mail (non bloquant) :', err);
                    boiteMail = { succes: false, erreur: err.message };
                }
            }

            return res.status(201).json({ succes: true, staff: nouveauStaff, boite_mail: boiteMail });
        } catch (err) {
            await client.query('ROLLBACK');
            if (err.code === '23505') {
                return res.status(409).json({ succes: false, erreurs: ['un compte staff existe déjà avec cet email'] });
            }
            console.error('[POST /api/staff/personnel] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        } finally {
            client.release();
        }
    });

    router.patch('/personnel/:id', requireStaffAuth, requireStaffRole(['administrateur']), async (req, res) => {
        const idStaff = parseInt(req.params.id, 10);
        const { nom_complet, telephone, date_naissance, adresse, id_role, statut_compte } = req.body;

        if (!Number.isInteger(idStaff)) {
            return res.status(400).json({ succes: false, erreurs: ['id invalide'] });
        }

        try {
            await pool.query(
                `UPDATE site.staff
                 SET nom_complet = COALESCE($1, nom_complet),
                     telephone = COALESCE($2, telephone),
                     date_naissance = COALESCE($3, date_naissance),
                     adresse = COALESCE($4, adresse),
                     id_role = COALESCE($5, id_role),
                     statut_compte = COALESCE($6, statut_compte)
                 WHERE id_staff = $7`,
                [nom_complet || null, telephone || null, date_naissance || null, adresse || null, id_role || null, statut_compte || null, idStaff]
            );
            return res.status(200).json({ succes: true });
        } catch (err) {
            console.error('[PATCH /api/staff/personnel/:id] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.delete('/personnel/:id', requireStaffAuth, requireStaffRole(['administrateur']), async (req, res) => {
        const idStaff = parseInt(req.params.id, 10);
        if (!Number.isInteger(idStaff)) {
            return res.status(400).json({ succes: false, erreurs: ['id invalide'] });
        }

        try {
            const cible = await pool.query('SELECT est_compte_racine, suppression_reservee_racine FROM site.staff WHERE id_staff = $1', [idStaff]);
            if (cible.rowCount === 0) {
                return res.status(404).json({ succes: false, erreurs: ['compte introuvable'] });
            }
            if (cible.rows[0].est_compte_racine) {
                return res.status(403).json({ succes: false, erreurs: ['ce compte est le compte racine — sa suppression est interdite'] });
            }
            if (cible.rows[0].suppression_reservee_racine) {
                const demandeur = await pool.query('SELECT est_compte_racine FROM site.staff WHERE id_staff = $1', [req.session.id_staff]);
                if (!demandeur.rows[0] || !demandeur.rows[0].est_compte_racine) {
                    return res.status(403).json({ succes: false, erreurs: ['seul le compte racine peut supprimer ce compte'] });
                }
            }

            await pool.query('DELETE FROM site.staff WHERE id_staff = $1', [idStaff]);
            return res.status(200).json({ succes: true });
        } catch (err) {
            // Filet de sécurité : si jamais un cas limite passait les
            // vérifications ci-dessus, le trigger base de données bloque
            // quand même la suppression du compte racine.
            console.error('[DELETE /api/staff/personnel/:id] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur — ou suppression bloquée par une protection de sécurité'] });
        }
    });

    return router;
};
