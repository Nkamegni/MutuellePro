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
const { gabaritEmail, corpsActivation } = require('../lib/gabaritEmail');

const mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
});

async function envoyerEmailActivationStaff(pool, idStaff, emailValidation, nomComplet, token) {
    const lien = `https://mutuelleproassurances.com/activation-staff.html?token=${token}`;
    try {
        const infoEnvoi = await mailTransporter.sendMail({
            from: '"Mutuelle Pro Assurances" <no-reply@mutuelleproassurances.com>',
            to: emailValidation,
            subject: 'Mutuelle Pro Assurances — Activez votre compte Personnel',
            html: gabaritEmail('Activez votre compte Personnel', corpsActivation({ nomComplet, typeCompte: 'staff', lien })),
        });
        try {
            await pool.query(
                `INSERT INTO site.no_reply_messages_envoyes (message_id, destinataire, type_message, reference_compte)
                 VALUES ($1, $2, $3, $4)`,
                [infoEnvoi.messageId, emailValidation, 'activation_personnel', String(idStaff)]
            );
        } catch (err) {
            console.error('[envoyerEmailActivationStaff] Erreur journalisation no-reply (ignorée) :', err);
        }
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

    router.get('/personnel/verifier-email', requireStaffAuth, requireStaffRole(['administrateur', 'superadmin']), async (req, res) => {
        const email = (req.query.email || '').trim();
        if (!email) {
            return res.status(400).json({ succes: false, erreurs: ['email requis'] });
        }
        try {
            const resultat = await pool.query(
                'SELECT id_staff, nom, prenom, statut_compte FROM site.staff WHERE email = $1',
                [email]
            );
            return res.status(200).json({ succes: true, comptes: resultat.rows });
        } catch (err) {
            console.error('[GET /api/staff/personnel/verifier-email] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.get('/personnel', requireStaffAuth, requireStaffRole(['administrateur', 'superadmin']), async (req, res) => {
        try {
            const resultat = await pool.query(
                `SELECT s.id_staff, s.matricule, s.nom, s.prenom, s.email, s.email_validation, s.telephone, s.statut_compte,
                        s.mot_de_passe_defini, s.est_compte_racine, s.suppression_reservee_racine,
                        (s.imap_mot_de_passe_chiffre IS NOT NULL) AS boite_mail_configuree,
                        r.code_role, r.libelle_fr AS role_libelle_fr
                 FROM site.staff s
                 JOIN site.role_staff r ON r.id_role = s.id_role
                 ORDER BY s.est_compte_racine DESC, s.nom, s.prenom`
            );

            // Restriction par RÔLE (révisé le 31/08/2026, suite au retour
            // de Roger) : un compte "superadmin" n'est visible que par un
            // autre "superadmin" -- généralise ce qui était fait à la main
            // sur une seule adresse email, couvre aussi le compte racine
            // lui-même vis-à-vis des autres administrateurs.
            const estSuperAdmin = req.session.code_role === 'superadmin';
            const personnel = estSuperAdmin
                ? resultat.rows
                : resultat.rows.filter((p) => p.code_role !== 'superadmin');

            return res.status(200).json({ succes: true, personnel });
        } catch (err) {
            console.error('[GET /api/staff/personnel] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.post('/personnel', requireStaffAuth, requireStaffRole(['administrateur', 'superadmin']), async (req, res) => {
        const { email, email_validation, nom, prenom, telephone, id_role, creer_boite_mail } = req.body;
        if (!email || !nom || !id_role) {
            return res.status(400).json({ succes: false, erreurs: ['email, nom et id_role requis'] });
        }
        if (!email_validation) {
            return res.status(400).json({ succes: false, erreurs: ['une adresse de validation personnelle est requise — c\'est elle qui recevra le lien d\'activation'] });
        }
        // Confirmé par Roger le 03/09/2026 : téléphone obligatoire pour
        // Personnel, plus optionnel comme avant.
        if (!telephone) {
            return res.status(400).json({ succes: false, erreurs: ['téléphone requis'] });
        }
        // Confirmé par Roger le 03/09/2026 : "on n'accepte pas les emails
        // externes" -- l'adresse professionnelle Personnel doit être sur
        // le domaine de l'entreprise, contrairement à Partenaires.
        if (!email.toLowerCase().endsWith('@mutuelleproassurances.com')) {
            return res.status(400).json({ succes: false, erreurs: ['l\'email professionnel doit être sur le domaine @mutuelleproassurances.com — aucune adresse externe acceptée pour le Personnel'] });
        }

        const nomComplet = prenom ? `${prenom} ${nom}` : nom;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const hacheInutilisable = crypto.randomBytes(32).toString('hex');
            const dernierMatricule = await client.query('SELECT COUNT(*) AS total FROM site.staff');
            const matricule = `MPA-${String(parseInt(dernierMatricule.rows[0].total, 10) + 1).padStart(4, '0')}`;

            const insere = await client.query(
                `INSERT INTO site.staff (matricule, email, mot_de_passe_hache, id_role, nom, prenom, telephone, mot_de_passe_defini, email_validation)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8)
                 RETURNING id_staff, email, nom, prenom`,
                [matricule, email, hacheInutilisable, id_role, nom, prenom || null, telephone, email_validation]
            );
            const nouveauStaff = insere.rows[0];

            const token = crypto.randomBytes(32).toString('hex');
            await client.query('INSERT INTO site.activation_staff_tokens (token, id_staff) VALUES ($1, $2)', [token, nouveauStaff.id_staff]);

            await client.query('COMMIT');

            envoyerEmailActivationStaff(pool, nouveauStaff.id_staff, email_validation, nomComplet, token);

            // Création de boîte mail — APRÈS le commit, volontairement non
            // bloquante : un échec ici ne doit jamais annuler la création
            // du compte Personnel lui-même (28/08/2026, pont PHP ISPConfig).
            let boiteMail = null;
            if (creer_boite_mail) {
                try {
                    const motDePasseGenere = crypto.randomBytes(12).toString('base64').replace(/[+/=]/g, '').slice(0, 16);
                    const resultatBoite = await creerBoiteMail({ email, motDePasse: motDePasseGenere, nomAffiche: nomComplet });
                    // Correctif du 03/09/2026, suite au changement côté pont
                    // ISPConfig (deja_existant remonté en succès plutôt qu'en
                    // échec) : si la boîte existait déjà, motDePasseGenere n'a
                    // JAMAIS été appliqué dessus -- l'enregistrer serait faux.
                    if (resultatBoite.deja_existant) {
                        boiteMail = { succes: true, deja_existant: true, avertissement: 'Une boîte mail existait déjà pour cette adresse — le mot de passe réel est inconnu, rien n\'a été enregistré. Utilisez « Configurer ma boîte mail » avec le vrai mot de passe si besoin.' };
                    } else {
                        await pool.query('UPDATE site.staff SET imap_mot_de_passe_chiffre = $1 WHERE id_staff = $2', [chiffrer(motDePasseGenere), nouveauStaff.id_staff]);
                        boiteMail = { succes: true };
                    }
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

    router.patch('/personnel/:id', requireStaffAuth, requireStaffRole(['administrateur', 'superadmin']), async (req, res) => {
        const idStaff = parseInt(req.params.id, 10);
        const { nom, prenom, telephone, date_naissance, adresse, id_role, statut_compte, email_validation } = req.body;

        if (!Number.isInteger(idStaff)) {
            return res.status(400).json({ succes: false, erreurs: ['id invalide'] });
        }

        try {
            // Protection par rôle (révisé le 31/08/2026) : un compte
            // "superadmin" ne peut être modifié QUE par lui-même -- même un
            // autre superadmin ne peut pas le faire à sa place, et aucun
            // compte non-superadmin ne le peut, même en connaissant l'id.
            const cible = await pool.query(
                `SELECT r.code_role FROM site.staff s JOIN site.role_staff r ON r.id_role = s.id_role WHERE s.id_staff = $1`,
                [idStaff]
            );
            if (cible.rowCount > 0 && cible.rows[0].code_role === 'superadmin' && req.session.id_staff !== idStaff) {
                return res.status(403).json({ succes: false, erreurs: ['ce compte est réservé — seul son titulaire peut le modifier'] });
            }

            // nom_complet éliminé (03/09/2026) -- plus de resynchronisation
            // nécessaire, nom/prenom sont désormais la seule donnée.
            await pool.query(
                `UPDATE site.staff
                 SET nom = COALESCE($1, nom),
                     prenom = COALESCE($2, prenom),
                     telephone = COALESCE($3, telephone),
                     date_naissance = COALESCE($4, date_naissance),
                     adresse = COALESCE($5, adresse),
                     id_role = COALESCE($6, id_role),
                     statut_compte = COALESCE($7, statut_compte),
                     email_validation = COALESCE($8, email_validation)
                 WHERE id_staff = $9`,
                [nom || null, prenom || null, telephone || null, date_naissance || null, adresse || null, id_role || null, statut_compte || null, email_validation || null, idStaff]
            );
            return res.status(200).json({ succes: true });
        } catch (err) {
            console.error('[PATCH /api/staff/personnel/:id] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    // Provisionne une boîte mail pour un compte Personnel EXISTANT --
    // comble un trou : la création automatique n'existait qu'au moment
    // de créer le compte, jamais après coup (01/09/2026, demande de Roger).
    router.post('/personnel/:id/provisionner-boite-mail', requireStaffAuth, requireStaffRole(['administrateur', 'superadmin']), async (req, res) => {
        const idStaff = parseInt(req.params.id, 10);
        if (!Number.isInteger(idStaff)) {
            return res.status(400).json({ succes: false, erreurs: ['id invalide'] });
        }
        try {
            const compte = await pool.query('SELECT email, nom, prenom, imap_mot_de_passe_chiffre FROM site.staff WHERE id_staff = $1', [idStaff]);
            if (compte.rowCount === 0) {
                return res.status(404).json({ succes: false, erreurs: ['compte introuvable'] });
            }
            if (compte.rows[0].imap_mot_de_passe_chiffre) {
                return res.status(409).json({ succes: false, erreurs: ['une boîte mail est déjà configurée pour ce compte'] });
            }
            const { email, nom, prenom } = compte.rows[0];
            const nomAffiche = prenom ? `${prenom} ${nom}` : nom;
            const motDePasseGenere = crypto.randomBytes(12).toString('base64').replace(/[+/=]/g, '').slice(0, 16);
            const resultatBoite = await creerBoiteMail({ email, motDePasse: motDePasseGenere, nomAffiche });
            // Correctif du 03/09/2026 -- voir même commentaire dans le flux
            // de création un peu plus haut dans ce fichier.
            if (resultatBoite.deja_existant) {
                return res.status(200).json({
                    succes: true, deja_existant: true,
                    avertissement: 'Une boîte mail existait déjà pour cette adresse — le mot de passe réel est inconnu, rien n\'a été enregistré. Utilisez « Configurer ma boîte mail » avec le vrai mot de passe si besoin.',
                });
            }
            await pool.query('UPDATE site.staff SET imap_mot_de_passe_chiffre = $1 WHERE id_staff = $2', [chiffrer(motDePasseGenere), idStaff]);
            return res.status(200).json({ succes: true });
        } catch (err) {
            console.error('[POST /api/staff/personnel/:id/provisionner-boite-mail] Erreur :', err);
            return res.status(500).json({ succes: false, erreurs: [err.message || 'erreur serveur'] });
        }
    });

    router.delete('/personnel/:id', requireStaffAuth, requireStaffRole(['administrateur', 'superadmin']), async (req, res) => {
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

    // Addendum comptes sans boîte mail professionnelle (Lot B, 02/09/2026)
    // -- interroge les deux tables, réservé administrateur/superadmin :
    // l'endpoint entier est refusé aux autres rôles, pas seulement une clé
    // de la réponse (contrairement au patron taches_par_responsable).
    router.get('/comptes-sans-boite', requireStaffAuth, requireStaffRole(['administrateur', 'superadmin']), async (req, res) => {
        try {
            const resultat = await pool.query(`
                SELECT id_staff AS id, TRIM(COALESCE(prenom, '') || ' ' || nom) AS nom_complet, email, 'staff' AS type_compte FROM site.staff WHERE imap_mot_de_passe_chiffre IS NULL
                UNION ALL
                SELECT id_partenaire AS id, TRIM(COALESCE(prenom, '') || ' ' || nom) AS nom_complet, email, 'partenaire' AS type_compte FROM site.partenaires WHERE imap_mot_de_passe_chiffre IS NULL
                ORDER BY nom_complet
            `);
            return res.status(200).json({ succes: true, comptes: resultat.rows });
        } catch (err) {
            console.error('[GET /api/staff/comptes-sans-boite] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    return router;
};
