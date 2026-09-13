// =====================================================================
// Mutuelle Pro Assurances — Phase 2a
// Routes : POST /api/staff/connexion, POST /api/staff/deconnexion,
//          GET /api/staff/session
// =====================================================================
//
// Intégration dans server.js — voir bloc de montage de session staff
// séparé, fourni avec ce fichier (staffSession sur préfixe /api/staff).
//
//   const staffAuthRouter = require('./routes/staffAuth.routes')(pool);
//   app.use('/api/staff', staffAuthRouter);
// =====================================================================

const express = require('express');
const argon2 = require('argon2');
const nodemailer = require('nodemailer');
const requireStaffAuth = require('../middleware/requireStaffAuth');
const { gabaritEmail, corpsConnexionReussie } = require('../lib/gabaritEmail');
const { analyserNavigateur, analyserSysteme } = require('../lib/analyseurUserAgent');
const { genererEtEnvoyerCode, verifierCode } = require('../lib/verificationConnexion');
const { masquerEmail, masquerTelephone } = require('../lib/masquage');
const { envoyerLienReinitialisation, appliquerReinitialisation } = require('../lib/reinitialisationMdp');

const mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
});

// Même principe de limitation anti-brute-force qu'auth.routes.js (client),
// volontairement dupliqué plutôt que partagé entre les deux fichiers —
// évite un couplage entre l'auth client et l'auth staff, qui doivent
// pouvoir évoluer indépendamment (ex: politique de blocage plus stricte
// côté staff à l'avenir, sans toucher au code client).
const tentatives = new Map();
const FENETRE_MS = 15 * 60 * 1000;
const MAX_TENTATIVES = 5;

function estBloque(cle) {
    const maintenant = Date.now();
    const historique = (tentatives.get(cle) || []).filter(t => maintenant - t < FENETRE_MS);
    tentatives.set(cle, historique);
    return historique.length >= MAX_TENTATIVES;
}
function enregistrerEchec(cle) {
    const historique = tentatives.get(cle) || [];
    historique.push(Date.now());
    tentatives.set(cle, historique);
}
function reinitialiser(cle) {
    tentatives.delete(cle);
}

module.exports = function (pool) {
    const router = express.Router();

    router.post('/connexion', async (req, res) => {
        const { email, mot_de_passe } = req.body;

        if (!email || !mot_de_passe) {
            return res.status(400).json({ succes: false, erreurs: ['email et mot_de_passe requis'] });
        }

        const cle = `${req.ip}|${email}`;
        if (estBloque(cle)) {
            return res.status(429).json({ succes: false, erreurs: ['trop de tentatives, réessayez dans quelques minutes'] });
        }

        try {
            const resultat = await pool.query(
                `SELECT s.id_staff, s.matricule, s.email, s.email_validation, s.telephone, s.mot_de_passe_hache, s.nom, s.prenom, s.statut_compte,
                        r.id_role, r.code_role, r.libelle_fr AS role_libelle_fr, r.libelle_en AS role_libelle_en
                 FROM site.staff s
                 JOIN site.role_staff r ON r.id_role = s.id_role
                 WHERE s.email = $1`,
                [email]
            );

            // Message identique en cas d'email inconnu ou de mot de passe
            // incorrect — jamais révéler lequel des deux est en cause.
            if (resultat.rowCount === 0) {
                enregistrerEchec(cle);
                return res.status(401).json({ succes: false, erreurs: ['identifiants incorrects'] });
            }

            const staff = resultat.rows[0];
            const nomComplet = staff.prenom ? `${staff.prenom} ${staff.nom}` : staff.nom;

            if (staff.statut_compte !== 'actif') {
                return res.status(403).json({ succes: false, erreurs: ['compte suspendu, contactez un administrateur'] });
            }

            const motDePasseValide = await argon2.verify(staff.mot_de_passe_hache, mot_de_passe);
            if (!motDePasseValide) {
                enregistrerEchec(cle);
                return res.status(401).json({ succes: false, erreurs: ['identifiants incorrects'] });
            }

            reinitialiser(cle);

            // 2FA (02/09/2026) : plus de session créée ici, code envoyé
            // d'abord — voir POST /staff/connexion/verifier-code plus bas.
            // Repli (03/09/2026, trouvé via rnkamegni@) : certains comptes
            // anciens (créés avant que email_validation soit obligatoire)
            // ont ce champ vide -- sans repli, le code partait vers une
            // adresse vide et l'envoi plantait (500), verrouillant le compte.
            const adresseCode = staff.email_validation || staff.email;
            try {
                await genererEtEnvoyerCode({
                    pool, mailTransporter, typeCompte: 'staff', idCompte: staff.id_staff,
                    email: adresseCode, nomComplet, referenceCompte: staff.matricule, req,
                });
            } catch (err) {
                console.error('[POST /api/staff/connexion] Erreur génération/envoi du code :', err);
                return res.status(500).json({ succes: false, erreurs: ["erreur lors de l'envoi du code de connexion, veuillez réessayer"] });
            }

            return res.status(200).json({
                succes: true, code_requis: true, id_compte: staff.id_staff,
                email_masque: masquerEmail(adresseCode),
                telephone_masque: masquerTelephone(staff.telephone),
            });
        } catch (err) {
            console.error('[POST /api/staff/connexion] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    // 2FA (02/09/2026) — étape 2 : vérifie le code, crée la session.
    router.post('/connexion/verifier-code', async (req, res) => {
        const { id_compte, code } = req.body;
        if (!Number.isInteger(id_compte) || !code) {
            return res.status(400).json({ succes: false, erreurs: ['id_compte et code requis'] });
        }

        try {
            const resultatVerif = await verifierCode({ pool, typeCompte: 'staff', idCompte: id_compte, code });
            if (!resultatVerif.valide) {
                const messages = {
                    aucun_code_actif: 'aucun code actif — recommencez la connexion',
                    trop_de_tentatives: 'trop de tentatives — recommencez la connexion',
                    expire: 'code expiré — recommencez la connexion',
                    code_incorrect: 'code incorrect',
                };
                return res.status(401).json({ succes: false, erreurs: [messages[resultatVerif.motif] || 'code invalide'] });
            }

            const resultatStaff = await pool.query(
                `SELECT s.id_staff, s.matricule, s.email, s.email_validation, s.nom, s.prenom, r.code_role, r.libelle_fr AS role_libelle_fr, r.libelle_en AS role_libelle_en
                 FROM site.staff s JOIN site.role_staff r ON r.id_role = s.id_role
                 WHERE s.id_staff = $1`,
                [id_compte]
            );
            if (resultatStaff.rowCount === 0) {
                return res.status(404).json({ succes: false, erreurs: ['compte introuvable'] });
            }
            const staff = resultatStaff.rows[0];
            const nomComplet = staff.prenom ? `${staff.prenom} ${staff.nom}` : staff.nom;

            let derniereConnexionPrecedente = null;
            try {
                const precedente = await pool.query(
                    `SELECT date_connexion, adresse_ip FROM site.historique_connexions
                     WHERE type_compte = 'staff' AND id_compte = $1
                     ORDER BY date_connexion DESC LIMIT 1`,
                    [id_compte]
                );
                if (precedente.rowCount > 0) derniereConnexionPrecedente = precedente.rows[0];
            } catch (err) {
                console.error('[POST /api/staff/connexion/verifier-code] Erreur lecture historique_connexions :', err);
            }

            req.session.regenerate(async (err) => {
                if (err) {
                    console.error('[POST /api/staff/connexion/verifier-code] Erreur régénération session :', err);
                    return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
                }

                req.session.id_staff = staff.id_staff;
                req.session.code_role = staff.code_role;
                req.session.email = staff.email;

                pool.query(
                    'UPDATE site.staff SET date_derniere_connexion = now() WHERE id_staff = $1',
                    [staff.id_staff]
                ).catch(err => console.error('[POST /api/staff/connexion/verifier-code] Erreur mise à jour date_derniere_connexion :', err));

                try {
                    const inseree = await pool.query(
                        `INSERT INTO site.historique_connexions (type_compte, id_compte, adresse_ip)
                         VALUES ('staff', $1, $2) RETURNING id_historique`,
                        [staff.id_staff, req.ip]
                    );
                    req.session.id_historique_connexion = inseree.rows[0].id_historique;
                } catch (err) {
                    console.error('[POST /api/staff/connexion/verifier-code] Erreur écriture historique_connexions :', err);
                }

                // "Connexion réussie" — ajoutée ici (02/09/2026), n'existait
                // pas encore côté Personnel contrairement à Client/Partenaire.
                // Même repli que pour le code 2FA (03/09/2026).
                mailTransporter.sendMail({
                    from: '"Mutuelle Pro Assurances" <no-reply@mutuelleproassurances.com>',
                    to: staff.email_validation || staff.email,
                    subject: 'Connexion réussie à votre espace personnel',
                    html: gabaritEmail('Connexion réussie à votre espace personnel', corpsConnexionReussie({
                        nomComplet,
                        typeCompte: 'staff',
                        referenceCompte: staff.matricule,
                        date: new Date(),
                        ip: req.ip,
                        navigateur: analyserNavigateur(req.headers['user-agent']),
                        systeme: analyserSysteme(req.headers['user-agent']),
                    })),
                }).then((info) => {
                    pool.query(
                        `INSERT INTO site.no_reply_messages_envoyes (message_id, destinataire, type_message, reference_compte)
                         VALUES ($1, $2, $3, $4)`,
                        [info.messageId, staff.email_validation || staff.email, 'notification_connexion_staff', staff.matricule]
                    ).catch((err) => console.error('[POST /api/staff/connexion/verifier-code] Erreur journalisation no-reply (ignorée) :', err));
                }).catch(err => console.error('[POST /api/staff/connexion/verifier-code] Erreur envoi notification connexion :', err));

                return res.status(200).json({
                    succes: true,
                    staff: {
                        id_staff: staff.id_staff,
                        email: staff.email,
                        nom: staff.nom,
                        prenom: staff.prenom,
                        code_role: staff.code_role,
                        role_libelle_fr: staff.role_libelle_fr,
                        role_libelle_en: staff.role_libelle_en
                    },
                    derniere_connexion_precedente: derniereConnexionPrecedente,
                    adresse_ip_actuelle: req.ip
                });
            });
        } catch (err) {
            console.error('[POST /api/staff/connexion/verifier-code] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    router.post('/deconnexion', (req, res) => {
        if (!req.session) return res.status(200).json({ succes: true });
        req.session.destroy((err) => {
            if (err) {
                console.error('[POST /api/staff/deconnexion] Erreur :', err);
                return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
            }
            res.clearCookie('connect.sid.staff');
            return res.status(200).json({ succes: true });
        });
    });

    router.get('/session', async (req, res) => {
        if (!req.session || !req.session.id_staff) {
            return res.status(401).json({ succes: false, connecte: false });
        }
        // Ajouté le 09/09/2026 (signalé par Roger -- seul le rôle était
        // affiché après connexion, jamais le nom de la personne). Une
        // requête de plus, mais uniquement à la vérification de session,
        // pas à chaque action -- coût négligeable.
        let nom = null, prenom = null;
        try {
            const resultat = await pool.query('SELECT nom, prenom FROM site.staff WHERE id_staff = $1', [req.session.id_staff]);
            if (resultat.rowCount > 0) { nom = resultat.rows[0].nom; prenom = resultat.rows[0].prenom; }
        } catch (err) {
            console.error('[GET /api/staff/session] Erreur lecture nom/prénom (ignorée) :', err);
        }
        return res.status(200).json({
            succes: true,
            connecte: true,
            id_staff: req.session.id_staff,
            code_role: req.session.code_role,
            nom,
            prenom
        });
    });

    // Sessions actives — même mécanique que côté Client (27/08/2026).
    router.get('/mes-sessions', requireStaffAuth, async (req, res) => {
        try {
            const resultat = await pool.query(
                `SELECT sid, expire FROM site.session_staff
                 WHERE sess::jsonb->>'id_staff' = $1
                 ORDER BY expire DESC`,
                [req.session.id_staff.toString()]
            );
            const sessions = resultat.rows.map((s) => ({
                sid: s.sid,
                expire: s.expire,
                est_courante: s.sid === req.sessionID,
            }));
            return res.status(200).json({ succes: true, sessions });
        } catch (err) {
            console.error('[GET /api/staff/mes-sessions] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    // Journal de connexions (Lot B, 02/09/2026)
    router.get('/mes-connexions', requireStaffAuth, async (req, res) => {
        try {
            const resultat = await pool.query(
                `SELECT id_historique, date_connexion, adresse_ip FROM site.historique_connexions
                 WHERE type_compte = 'staff' AND id_compte = $1
                 ORDER BY date_connexion DESC LIMIT 20`,
                [req.session.id_staff]
            );
            const connexions = resultat.rows.map((c) => ({ ...c, est_courante: c.id_historique === req.session.id_historique_connexion }));
            return res.status(200).json({ succes: true, connexions });
        } catch (err) {
            console.error('[GET /api/staff/mes-connexions] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.delete('/mes-sessions/:sid', requireStaffAuth, async (req, res) => {
        try {
            await pool.query(
                `DELETE FROM site.session_staff WHERE sid = $1 AND sess::jsonb->>'id_staff' = $2`,
                [req.params.sid, req.session.id_staff.toString()]
            );
            return res.status(200).json({ succes: true });
        } catch (err) {
            console.error('[DELETE /api/staff/mes-sessions/:sid] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    // Mot de passe oublié (03/09/2026) — n'existait pas côté Personnel.
    router.post('/mot-de-passe-oublie', async (req, res) => {
        const identifiant = (req.body.identifiant || '').trim();
        if (!identifiant) {
            return res.status(400).json({ succes: false, erreurs: ['identifiant requis'] });
        }
        try {
            const resultat = await pool.query(
                'SELECT id_staff, email, email_validation, nom, prenom FROM site.staff WHERE email = $1',
                [identifiant]
            );
            // Réponse identique que le compte existe ou non -- anti-énumération.
            if (resultat.rowCount === 0) {
                return res.status(200).json({ succes: true, message: 'si un compte correspond, un email a été envoyé' });
            }
            const staff = resultat.rows[0];
            const adresseEnvoi = staff.email_validation || staff.email;
            const nomComplet = staff.prenom ? `${staff.prenom} ${staff.nom}` : staff.nom;
            try {
                await envoyerLienReinitialisation({
                    pool, mailTransporter, typeCompte: 'staff', idCompte: staff.id_staff,
                    email: adresseEnvoi, nomComplet,
                });
            } catch (err) {
                console.error('[POST /api/staff/mot-de-passe-oublie] Erreur envoi email :', err);
                // Non révélé au client -- même réponse uniforme malgré l'échec.
            }
            return res.status(200).json({ succes: true, message: 'si un compte correspond, un email a été envoyé' });
        } catch (err) {
            console.error('[POST /api/staff/mot-de-passe-oublie] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    router.post('/reinitialiser-mot-de-passe', async (req, res) => {
        const { token, mot_de_passe, mot_de_passe_confirmation } = req.body;
        try {
            const resultat = await appliquerReinitialisation({
                pool, typeCompte: 'staff', token, motDePasse: mot_de_passe, motDePasseConfirmation: mot_de_passe_confirmation,
                tableCompte: 'site.staff', colonneId: 'id_staff', tableSession: 'site.session_staff', colonneSessionId: 'id_staff',
            });
            if (!resultat.succes) {
                return res.status(resultat.statut).json({ succes: false, erreurs: resultat.erreurs });
            }
            return res.status(200).json({ succes: true });
        } catch (err) {
            console.error('[POST /api/staff/reinitialiser-mot-de-passe] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    return router;
};
