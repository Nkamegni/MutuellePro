// =====================================================================
// Mutuelle Pro Assurances — Espace Partenaire (MVP, 21/08/2026)
// Routes :
//   POST /api/partenaire/connexion
//   POST /api/partenaire/deconnexion
//   GET  /api/partenaire/session
//   GET  /api/partenaire/mes-dossiers   — UNIQUEMENT les tickets assignés
// =====================================================================
//
// Session totalement distincte du client ET du staff (cookie
// "connect.sid.partenaire", voir bloc de montage server.js fourni
// séparément).
//
// Intégration dans server.js :
//
//   const partenaireAuthRouter = require('./routes/partenaireAuth.routes')(pool);
//   app.use('/api/partenaire', partenaireAuthRouter);
// =====================================================================

const express = require('express');
const argon2 = require('argon2');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { gabaritEmail, corpsConnexionReussie, corpsActivation } = require('../lib/gabaritEmail');
const { analyserNavigateur, analyserSysteme } = require('../lib/analyseurUserAgent');
const { genererEtEnvoyerCode, verifierCode } = require('../lib/verificationConnexion');
const { masquerEmail, masquerTelephone } = require('../lib/masquage');
const { envoyerLienReinitialisation, appliquerReinitialisation, genererTokenChangementForce } = require('../lib/reinitialisationMdp');
const { envoyerNotificationExterne } = require('../lib/notifications');
const { messageBloqueCorrectionApresLecture } = require('../lib/blocageCorrectionMessage');
const { verifierPeremptionMotDePasse } = require('../lib/peremptionMdp');
const { appliquerReinitialisationBoiteMail } = require('../lib/reinitialisationBoiteMail');

const mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
});

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
function reinitialiser(cle) { tentatives.delete(cle); }

module.exports = function (pool) {
    const router = express.Router();

    // Même mécanique que côté Personnel — vérification sans consommation.
    router.get('/verifier-token-activation', async (req, res) => {
        const token = req.query.token;
        if (!token || typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
            return res.status(200).json({ valide: false, motif: 'invalide' });
        }
        try {
            const resultat = await pool.query(
                `SELECT t.date_expiration, TRIM(COALESCE(p.prenom, '') || ' ' || p.nom) AS nom_complet
                 FROM site.activation_partenaire_tokens t
                 JOIN site.partenaires p ON p.id_partenaire = t.id_partenaire
                 WHERE t.token = $1`,
                [token]
            );
            if (resultat.rowCount === 0) {
                return res.status(200).json({ valide: false, motif: 'invalide' });
            }
            const { date_expiration, nom_complet } = resultat.rows[0];
            if (new Date(date_expiration) < new Date()) {
                return res.status(200).json({ valide: false, motif: 'expire', nom_complet });
            }
            return res.status(200).json({ valide: true, nom_complet });
        } catch (err) {
            console.error('[GET /api/partenaire/verifier-token-activation] Erreur base de données :', err);
            return res.status(200).json({ valide: false, motif: 'invalide' });
        }
    });

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
                `SELECT p.id_partenaire, p.matricule, p.email, p.email_notification, p.telephone, p.mot_de_passe_hache, p.nom, p.prenom, p.statut_compte,
                        COALESCE(string_agg(tp.libelle_fr, ', ' ORDER BY tp.libelle_fr), '') AS types_libelles
                 FROM site.partenaires p
                 LEFT JOIN site.partenaire_types pty ON pty.id_partenaire = p.id_partenaire
                 LEFT JOIN site.type_partenaire tp ON tp.id_type_partenaire = pty.id_type_partenaire
                 WHERE p.email = $1
                 GROUP BY p.id_partenaire`,
                [email]
            );
            if (resultat.rowCount === 0) {
                enregistrerEchec(cle);
                return res.status(401).json({ succes: false, erreurs: ['identifiants incorrects'] });
            }
            const partenaire = resultat.rows[0];
            const nomComplet = partenaire.prenom ? `${partenaire.prenom} ${partenaire.nom}` : partenaire.nom;
            if (partenaire.statut_compte !== 'actif') {
                return res.status(403).json({ succes: false, erreurs: ['compte suspendu, contactez Mutuelle Pro Assurances'] });
            }
            const valide = await argon2.verify(partenaire.mot_de_passe_hache, mot_de_passe);
            if (!valide) {
                enregistrerEchec(cle);
                return res.status(401).json({ succes: false, erreurs: ['identifiants incorrects'] });
            }
            reinitialiser(cle);

            // 2FA (02/09/2026) : plus de session créée ici — voir
            // POST /partenaire/connexion/verifier-code plus bas.
            // Repli préventif (03/09/2026, même défaut trouvé côté staff
            // avec rnkamegni@ -- comptes anciens pouvant avoir ce champ vide).
            const adresseCode = partenaire.email_notification || partenaire.email;
            try {
                await genererEtEnvoyerCode({
                    pool, mailTransporter, typeCompte: 'partenaire', idCompte: partenaire.id_partenaire,
                    email: adresseCode, nomComplet, referenceCompte: partenaire.matricule, req,
                });
            } catch (err) {
                console.error('[POST /api/partenaire/connexion] Erreur génération/envoi du code :', err);
                return res.status(500).json({ succes: false, erreurs: ["erreur lors de l'envoi du code de connexion, veuillez réessayer"] });
            }

            return res.status(200).json({
                succes: true, code_requis: true, id_compte: partenaire.id_partenaire,
                email_masque: masquerEmail(adresseCode),
                telephone_masque: masquerTelephone(partenaire.telephone),
            });
        } catch (err) {
            console.error('[POST /api/partenaire/connexion] Erreur base de données :', err);
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
            const resultatVerif = await verifierCode({ pool, typeCompte: 'partenaire', idCompte: id_compte, code });
            if (!resultatVerif.valide) {
                const messages = {
                    aucun_code_actif: 'aucun code actif — recommencez la connexion',
                    trop_de_tentatives: 'trop de tentatives — recommencez la connexion',
                    expire: 'code expiré — recommencez la connexion',
                    code_incorrect: 'code incorrect',
                };
                return res.status(401).json({ succes: false, erreurs: [messages[resultatVerif.motif] || 'code invalide'] });
            }

            const resultatPartenaire = await pool.query(
                `SELECT p.id_partenaire, p.matricule, p.email, p.email_notification, p.nom, p.prenom,
                        COALESCE(string_agg(tp.libelle_fr, ', ' ORDER BY tp.libelle_fr), '') AS types_libelles
                 FROM site.partenaires p
                 LEFT JOIN site.partenaire_types pty ON pty.id_partenaire = p.id_partenaire
                 LEFT JOIN site.type_partenaire tp ON tp.id_type_partenaire = pty.id_type_partenaire
                 WHERE p.id_partenaire = $1
                 GROUP BY p.id_partenaire`,
                [id_compte]
            );
            if (resultatPartenaire.rowCount === 0) {
                return res.status(404).json({ succes: false, erreurs: ['compte introuvable'] });
            }
            const partenaire = resultatPartenaire.rows[0];
            const nomComplet = partenaire.prenom ? `${partenaire.prenom} ${partenaire.nom}` : partenaire.nom;

            let derniereConnexionPrecedente = null;
            try {
                const precedente = await pool.query(
                    `SELECT date_connexion, adresse_ip FROM site.historique_connexions
                     WHERE type_compte = 'partenaire' AND id_compte = $1
                     ORDER BY date_connexion DESC LIMIT 1`,
                    [id_compte]
                );
                if (precedente.rowCount > 0) derniereConnexionPrecedente = precedente.rows[0];
            } catch (err) {
                console.error('[POST /api/partenaire/connexion/verifier-code] Erreur lecture historique_connexions :', err);
            }

            // Péremption (14/09/2026) -- voir même commentaire dans staffAuth.routes.js.
            const peremption = await verifierPeremptionMotDePasse({ pool, tableCompte: 'site.partenaires', colonneId: 'id_partenaire', idCompte: id_compte, role: 'partenaire' });
            if (peremption.doitChanger) {
                const token = await genererTokenChangementForce({ pool, typeCompte: 'partenaire', idCompte: id_compte });
                return res.status(200).json({
                    succes: true, doit_changer_mdp: true, motif: peremption.motif, token,
                });
            }

            req.session.regenerate(async (err) => {
                if (err) {
                    console.error('[POST /api/partenaire/connexion/verifier-code] Erreur régénération session :', err);
                    return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
                }
                req.session.id_partenaire = partenaire.id_partenaire;

                pool.query('UPDATE site.partenaires SET date_derniere_connexion = now() WHERE id_partenaire = $1', [partenaire.id_partenaire])
                    .catch(err => console.error('[POST /api/partenaire/connexion/verifier-code] Erreur mise à jour date :', err));

                try {
                    const inseree = await pool.query(
                        `INSERT INTO site.historique_connexions (type_compte, id_compte, adresse_ip)
                         VALUES ('partenaire', $1, $2) RETURNING id_historique`,
                        [partenaire.id_partenaire, req.ip]
                    );
                    req.session.id_historique_connexion = inseree.rows[0].id_historique;
                } catch (err) {
                    console.error('[POST /api/partenaire/connexion/verifier-code] Erreur écriture historique_connexions :', err);
                }

                mailTransporter.sendMail({
                    from: '"Mutuelle Pro Assurances" <no-reply@mutuelleproassurances.com>',
                    to: partenaire.email_notification || partenaire.email,
                    subject: 'Connexion réussie à votre espace partenaire',
                    html: gabaritEmail('Connexion réussie à votre espace partenaire', corpsConnexionReussie({
                        nomComplet,
                        typeCompte: 'partenaire',
                        referenceCompte: partenaire.matricule,
                        date: new Date(),
                        ip: req.ip,
                        navigateur: analyserNavigateur(req.headers['user-agent']),
                        systeme: analyserSysteme(req.headers['user-agent']),
                    })),
                }).then((info) => {
                    pool.query(
                        `INSERT INTO site.no_reply_messages_envoyes (message_id, destinataire, type_message, reference_compte)
                         VALUES ($1, $2, $3, $4)`,
                        [info.messageId, partenaire.email_notification || partenaire.email, 'notification_connexion_partenaire', partenaire.matricule]
                    ).catch((err) => console.error('[POST /api/partenaire/connexion/verifier-code] Erreur journalisation no-reply (ignorée) :', err));
                }).catch(err => console.error('[POST /api/partenaire/connexion/verifier-code] Erreur envoi notification connexion :', err));

                return res.status(200).json({
                    succes: true,
                    partenaire: {
                        id_partenaire: partenaire.id_partenaire,
                        email: partenaire.email,
                        nom: partenaire.nom,
                        prenom: partenaire.prenom,
                        types_libelles: partenaire.types_libelles
                    },
                    derniere_connexion_precedente: derniereConnexionPrecedente,
                    adresse_ip_actuelle: req.ip
                });
            });
        } catch (err) {
            console.error('[POST /api/partenaire/connexion/verifier-code] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    router.post('/deconnexion', (req, res) => {
        if (!req.session) return res.status(200).json({ succes: true });
        req.session.destroy((err) => {
            if (err) return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
            res.clearCookie('connect.sid.partenaire');
            return res.status(200).json({ succes: true });
        });
    });

    router.get('/session', async (req, res) => {
        if (!req.session || !req.session.id_partenaire) {
            return res.status(401).json({ succes: false, connecte: false });
        }
        // Ajouté le 09/09/2026 (signalé par Roger -- rien n'identifiait la
        // personne connectée côté Partenaire, même pas un rôle comme pour
        // Personnel).
        let nom = null, prenom = null;
        try {
            const resultat = await pool.query('SELECT nom, prenom FROM site.partenaires WHERE id_partenaire = $1', [req.session.id_partenaire]);
            if (resultat.rowCount > 0) { nom = resultat.rows[0].nom; prenom = resultat.rows[0].prenom; }
        } catch (err) {
            console.error('[GET /api/partenaire/session] Erreur lecture nom/prénom (ignorée) :', err);
        }
        return res.status(200).json({ succes: true, connecte: true, id_partenaire: req.session.id_partenaire, nom, prenom });
    });

    // Sessions actives — même mécanique que côté Client/Personnel (27/08/2026).
    router.get('/mes-sessions', async (req, res) => {
        if (!req.session || !req.session.id_partenaire) {
            return res.status(401).json({ succes: false, erreurs: ['authentification requise'] });
        }
        try {
            const resultat = await pool.query(
                `SELECT sid, expire FROM site.session_partenaire
                 WHERE sess::jsonb->>'id_partenaire' = $1
                 ORDER BY expire DESC`,
                [req.session.id_partenaire.toString()]
            );
            const sessions = resultat.rows.map((s) => ({
                sid: s.sid,
                expire: s.expire,
                est_courante: s.sid === req.sessionID,
            }));
            return res.status(200).json({ succes: true, sessions });
        } catch (err) {
            console.error('[GET /api/partenaire/mes-sessions] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    // Journal de connexions (Lot B, 02/09/2026)
    router.get('/mes-connexions', async (req, res) => {
        if (!req.session || !req.session.id_partenaire) {
            return res.status(401).json({ succes: false, erreurs: ['authentification requise'] });
        }
        try {
            const resultat = await pool.query(
                `SELECT id_historique, date_connexion, adresse_ip FROM site.historique_connexions
                 WHERE type_compte = 'partenaire' AND id_compte = $1
                 ORDER BY date_connexion DESC LIMIT 20`,
                [req.session.id_partenaire]
            );
            const connexions = resultat.rows.map((c) => ({ ...c, est_courante: c.id_historique === req.session.id_historique_connexion }));
            return res.status(200).json({ succes: true, connexions });
        } catch (err) {
            console.error('[GET /api/partenaire/mes-connexions] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.delete('/mes-sessions/:sid', async (req, res) => {
        if (!req.session || !req.session.id_partenaire) {
            return res.status(401).json({ succes: false, erreurs: ['authentification requise'] });
        }
        try {
            await pool.query(
                `DELETE FROM site.session_partenaire WHERE sid = $1 AND sess::jsonb->>'id_partenaire' = $2`,
                [req.params.sid, req.session.id_partenaire.toString()]
            );
            return res.status(200).json({ succes: true });
        } catch (err) {
            console.error('[DELETE /api/partenaire/mes-sessions/:sid] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    // Mot de passe oublié (03/09/2026) — n'existait pas côté Partenaire.
    router.post('/mot-de-passe-oublie', async (req, res) => {
        const identifiant = (req.body.identifiant || '').trim();
        if (!identifiant) {
            return res.status(400).json({ succes: false, erreurs: ['identifiant requis'] });
        }
        try {
            const resultat = await pool.query(
                'SELECT id_partenaire, email, email_notification, nom, prenom FROM site.partenaires WHERE email = $1',
                [identifiant]
            );
            if (resultat.rowCount === 0) {
                return res.status(200).json({ succes: true, message: 'si un compte correspond, un email a été envoyé' });
            }
            const partenaire = resultat.rows[0];
            const adresseEnvoi = partenaire.email_notification || partenaire.email;
            const nomComplet = partenaire.prenom ? `${partenaire.prenom} ${partenaire.nom}` : partenaire.nom;
            try {
                await envoyerLienReinitialisation({
                    pool, mailTransporter, typeCompte: 'partenaire', idCompte: partenaire.id_partenaire,
                    email: adresseEnvoi, nomComplet,
                });
            } catch (err) {
                console.error('[POST /api/partenaire/mot-de-passe-oublie] Erreur envoi email :', err);
            }
            return res.status(200).json({ succes: true, message: 'si un compte correspond, un email a été envoyé' });
        } catch (err) {
            console.error('[POST /api/partenaire/mot-de-passe-oublie] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    router.post('/reinitialiser-mot-de-passe', async (req, res) => {
        const { token, mot_de_passe, mot_de_passe_confirmation } = req.body;
        try {
            const resultat = await appliquerReinitialisation({
                pool, typeCompte: 'partenaire', token, motDePasse: mot_de_passe, motDePasseConfirmation: mot_de_passe_confirmation,
                tableCompte: 'site.partenaires', colonneId: 'id_partenaire', tableSession: 'site.session_partenaire', colonneSessionId: 'id_partenaire',
            });
            if (!resultat.succes) {
                return res.status(resultat.statut).json({ succes: false, erreurs: resultat.erreurs });
            }
            return res.status(200).json({ succes: true });
        } catch (err) {
            console.error('[POST /api/partenaire/reinitialiser-mot-de-passe] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    // Option 2 (14/09/2026) -- voir même commentaire dans staffAuth.routes.js.
    router.post('/reinitialiser-boite-mail', async (req, res) => {
        const { token, mot_de_passe, mot_de_passe_confirmation } = req.body;
        try {
            const resultat = await appliquerReinitialisationBoiteMail({
                pool, typeCompte: 'partenaire', token, motDePasse: mot_de_passe, motDePasseConfirmation: mot_de_passe_confirmation,
                tableCompte: 'site.partenaires', colonneId: 'id_partenaire',
            });
            if (!resultat.succes) {
                return res.status(resultat.statut).json({ succes: false, erreurs: resultat.erreurs });
            }
            return res.status(200).json({ succes: true });
        } catch (err) {
            console.error('[POST /api/partenaire/reinitialiser-boite-mail] Erreur :', err);
            return res.status(500).json({ succes: false, erreurs: [err.message || 'erreur serveur, veuillez réessayer'] });
        }
    });

    // Règle de visibilité centrale : UNIQUEMENT les tickets où ce
    // partenaire est explicitement assigné — jamais une vue globale.
    router.get('/mes-dossiers', async (req, res) => {
        if (!req.session || !req.session.id_partenaire) {
            return res.status(401).json({ succes: false, erreurs: ['authentification requise'] });
        }
        try {
            const resultat = await pool.query(
                `SELECT t.id_ticket, t.code_ticket, tt.libelle_fr AS type_libelle_fr,
                        st.code_statut_ticket, st.libelle_fr AS statut_libelle_fr,
                        t.contenu, t.date_creation, t.date_maj,
                        EXISTS(
                            SELECT 1 FROM site.messages_dossier m
                            WHERE m.id_ticket = t.id_ticket AND m.type_auteur IN ('client', 'staff') AND m.visible_client = true AND m.lu_par_partenaire = false
                        ) AS a_message_non_lu
                 FROM site.tickets t
                 JOIN site.type_ticket tt ON tt.id_type_ticket = t.id_type_ticket
                 JOIN site.statut_ticket st ON st.id_statut_ticket = t.id_statut_ticket
                 WHERE t.id_partenaire_assigne = $1
                 ORDER BY t.date_maj DESC`,
                [req.session.id_partenaire]
            );
            return res.status(200).json({ succes: true, dossiers: resultat.rows });
        } catch (err) {
            console.error('[GET /api/partenaire/mes-dossiers] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    // Activation de compte — le partenaire clique le lien reçu par email
    // et définit son propre mot de passe pour la première fois.
    router.post('/activer-compte', async (req, res) => {
        const { token, mot_de_passe, mot_de_passe_confirmation } = req.body;

        if (!token || typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
            return res.status(400).json({ succes: false, erreurs: ['lien d\'activation invalide'] });
        }
        if (typeof mot_de_passe !== 'string' || mot_de_passe.length < 10 || !/[a-zA-Z]/.test(mot_de_passe) || !/[0-9]/.test(mot_de_passe) || !/[^a-zA-Z0-9]/.test(mot_de_passe)) {
            return res.status(400).json({ succes: false, erreurs: ['mot de passe doit contenir au moins 10 caractères, avec une lettre, un chiffre et un caractère spécial'] });
        }
        if (mot_de_passe !== mot_de_passe_confirmation) {
            return res.status(400).json({ succes: false, erreurs: ['la confirmation ne correspond pas'] });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const resultat = await client.query(
                'SELECT id_partenaire, date_expiration FROM site.activation_partenaire_tokens WHERE token = $1',
                [token]
            );
            if (resultat.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ succes: false, erreurs: ['ce lien est invalide ou a déjà été utilisé'] });
            }

            const { id_partenaire, date_expiration } = resultat.rows[0];
            if (new Date(date_expiration) < new Date()) {
                await client.query('DELETE FROM site.activation_partenaire_tokens WHERE token = $1', [token]);
                await client.query('COMMIT');
                return res.status(410).json({ succes: false, erreurs: ['ce lien a expiré, contactez Mutuelle Pro Assurances'] });
            }

            const hache = await argon2.hash(mot_de_passe, { type: argon2.argon2id });
            await client.query('UPDATE site.partenaires SET mot_de_passe_hache = $1, mot_de_passe_defini = true WHERE id_partenaire = $2', [hache, id_partenaire]);
            await client.query('DELETE FROM site.activation_partenaire_tokens WHERE token = $1', [token]);

            await client.query('COMMIT');
            return res.status(200).json({ succes: true });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('[POST /api/partenaire/activer-compte] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        } finally {
            client.release();
        }
    });

    // Renvoi du lien d'activation — cas d'un lien expiré (72h) ou perdu.
    // Réponse volontairement identique que le compte existe ou non, même
    // principe que /api/mot-de-passe-oublie côté client.
    router.post('/renvoyer-activation', async (req, res) => {
        const email = (req.body.email || '').trim();
        if (!email) {
            return res.status(400).json({ succes: false, erreurs: ['email requis'] });
        }

        try {
            const resultat = await pool.query(
                'SELECT id_partenaire, nom, prenom, email_notification FROM site.partenaires WHERE email = $1 AND mot_de_passe_defini = false',
                [email]
            );
            if (resultat.rowCount === 0) {
                // Compte inexistant OU déjà activé — même réponse neutre.
                return res.status(200).json({ succes: true });
            }

            const { id_partenaire, nom, prenom, email_notification } = resultat.rows[0];
            const nomComplet = prenom ? `${prenom} ${nom}` : nom;
            if (!email_notification) {
                // Compte créé avant l'ajout de l'adresse de notification —
                // cas limite, à régulariser par le staff.
                return res.status(200).json({ succes: true });
            }

            // Les anciens jetons de ce partenaire sont invalidés avant
            // d'en émettre un nouveau — un seul lien valide à la fois.
            await pool.query('DELETE FROM site.activation_partenaire_tokens WHERE id_partenaire = $1', [id_partenaire]);

            const token = crypto.randomBytes(32).toString('hex');
            await pool.query('INSERT INTO site.activation_partenaire_tokens (token, id_partenaire) VALUES ($1, $2)', [token, id_partenaire]);

            const lien = `https://mutuelleproassurances.com/activation-partenaire.html?token=${token}`;
            mailTransporter.sendMail({
                from: '"Mutuelle Pro Assurances" <no-reply@mutuelleproassurances.com>',
                to: email_notification,
                subject: 'Mutuelle Pro Assurances — Nouveau lien d\'activation',
                html: gabaritEmail('Activez votre compte partenaire', corpsActivation({ nomComplet, typeCompte: 'partenaire', lien })),
            }).then((info) => {
                pool.query(
                    `INSERT INTO site.no_reply_messages_envoyes (message_id, destinataire, type_message, reference_compte)
                     VALUES ($1, $2, $3, $4)`,
                    [info.messageId, email_notification, 'activation_partenaire', String(id_partenaire)]
                ).catch((err) => console.error('[POST /api/partenaire/renvoyer-activation] Erreur journalisation no-reply (ignorée) :', err));
            }).catch((err) => console.error('[POST /api/partenaire/renvoyer-activation] Erreur envoi email :', err));

            return res.status(200).json({ succes: true });
        } catch (err) {
            console.error('[POST /api/partenaire/renvoyer-activation] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    // Lot E, extension Partenaires (15/09/2026) -- second répondant
    // professionnel, symétrique au Staff. Visibilité fondée sur
    // t.id_partenaire_assigne, déjà la règle en place ailleurs dans ce
    // fichier -- jamais de table de liaison séparée.
    async function dossierAssigneAuPartenaire(pool, idTicket, idPartenaire) {
        const r = await pool.query('SELECT code_ticket, email_contact FROM site.tickets WHERE id_ticket = $1 AND id_partenaire_assigne = $2', [idTicket, idPartenaire]);
        return r.rowCount > 0 ? r.rows[0] : null;
    }

    router.get('/mes-dossiers/:id/messages', async (req, res) => {
        if (!req.session || !req.session.id_partenaire) return res.status(401).json({ succes: false, erreurs: ['authentification requise'] });
        const idTicket = parseInt(req.params.id, 10);
        if (!Number.isInteger(idTicket)) return res.status(400).json({ succes: false, erreurs: ['id invalide'] });
        const dossier = await dossierAssigneAuPartenaire(pool, idTicket, req.session.id_partenaire);
        if (!dossier) return res.status(404).json({ succes: false, erreurs: ['dossier introuvable'] });
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
            console.error('[GET /api/partenaire/mes-dossiers/:id/messages] Erreur :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.post('/mes-dossiers/:id/messages', async (req, res) => {
        if (!req.session || !req.session.id_partenaire) return res.status(401).json({ succes: false, erreurs: ['authentification requise'] });
        const idTicket = parseInt(req.params.id, 10);
        const { contenu, visible_client } = req.body;
        if (!Number.isInteger(idTicket)) return res.status(400).json({ succes: false, erreurs: ['id invalide'] });
        if (!contenu || !contenu.trim()) return res.status(400).json({ succes: false, erreurs: ['contenu requis'] });
        const dossier = await dossierAssigneAuPartenaire(pool, idTicket, req.session.id_partenaire);
        if (!dossier) return res.status(404).json({ succes: false, erreurs: ['dossier introuvable'] });
        try {
            const visibleClientFinal = visible_client !== false;
            const resultat = await pool.query(
                `INSERT INTO site.messages_dossier (id_ticket, type_auteur, id_auteur, contenu, visible_client)
                 VALUES ($1, 'partenaire', $2, $3, $4) RETURNING id_message, date_creation`,
                [idTicket, req.session.id_partenaire, contenu.trim(), visibleClientFinal]
            );
            const message = { id_message: resultat.rows[0].id_message, id_ticket: idTicket, type_auteur: 'partenaire', contenu: contenu.trim(), date_creation: resultat.rows[0].date_creation, visible_client: visibleClientFinal };

            // Correctif de sécurité (16/09/2026) -- même faille, même
            // principe que staffTickets.routes.js.
            if (global.ioMessagerie) {
                if (visibleClientFinal) {
                    global.ioMessagerie.to(`ticket:${idTicket}`).emit('message:nouveau', message);
                } else {
                    // Accès direct aux sockets locaux (Map io.sockets.sockets
                    // + Set de la room via l'adaptateur) plutôt que
                    // fetchSockets() -- ce dernier renvoie des objets proxy
                    // qui n'exposent pas garantiment .request, une ambiguïté
                    // à éviter pour un correctif de sécurité. Valable en
                    // configuration mono-processus (pas d'adaptateur Redis).
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
                    destinataireEmail: dossier.email_contact,
                    destinataireNom: '',
                    typeEvenement: 'reponse_staff', // même gabarit que la réponse Staff -- le client n'a pas besoin de distinguer l'origine interne
                    contexte: { codeTicket: dossier.code_ticket, extrait: contenu.trim().slice(0, 100) },
                });
            }

            return res.status(201).json({ succes: true, message });
        } catch (err) {
            console.error('[POST /api/partenaire/mes-dossiers/:id/messages] Erreur :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.patch('/mes-dossiers/:id/messages/:idMessage', async (req, res) => {
        if (!req.session || !req.session.id_partenaire) return res.status(401).json({ succes: false, erreurs: ['authentification requise'] });
        const idTicket = parseInt(req.params.id, 10);
        const idMessage = parseInt(req.params.idMessage, 10);
        const { contenu } = req.body;
        if (!Number.isInteger(idTicket) || !Number.isInteger(idMessage)) {
            return res.status(400).json({ succes: false, erreurs: ['id invalide'] });
        }
        if (!contenu || !contenu.trim()) {
            return res.status(400).json({ succes: false, erreurs: ['contenu requis'] });
        }
        const dossier = await dossierAssigneAuPartenaire(pool, idTicket, req.session.id_partenaire);
        if (!dossier) return res.status(404).json({ succes: false, erreurs: ['dossier introuvable'] });
        try {
            const existant = await pool.query(
                `SELECT id_auteur, visible_client, date_lecture_client, date_lecture_staff FROM site.messages_dossier WHERE id_message = $1 AND id_ticket = $2 AND type_auteur = 'partenaire'`,
                [idMessage, idTicket]
            );
            if (existant.rowCount === 0) {
                return res.status(404).json({ succes: false, erreurs: ['message introuvable'] });
            }
            if (existant.rows[0].id_auteur !== req.session.id_partenaire) {
                return res.status(403).json({ succes: false, erreurs: ['seul l\'auteur peut corriger ce message'] });
            }
            if (messageBloqueCorrectionApresLecture({
                typeAuteur: 'partenaire', visibleClient: existant.rows[0].visible_client,
                dateLectureClient: existant.rows[0].date_lecture_client, dateLectureStaff: existant.rows[0].date_lecture_staff,
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
            console.error('[PATCH /api/partenaire/mes-dossiers/:id/messages/:idMessage] Erreur :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.patch('/mes-dossiers/:id/messages/lu', async (req, res) => {
        if (!req.session || !req.session.id_partenaire) return res.status(401).json({ succes: false, erreurs: ['authentification requise'] });
        const idTicket = parseInt(req.params.id, 10);
        if (!Number.isInteger(idTicket)) return res.status(400).json({ succes: false, erreurs: ['id invalide'] });
        const dossier = await dossierAssigneAuPartenaire(pool, idTicket, req.session.id_partenaire);
        if (!dossier) return res.status(404).json({ succes: false, erreurs: ['dossier introuvable'] });
        try {
            await pool.query(`UPDATE site.messages_dossier SET lu_par_partenaire = true, date_lecture_partenaire = COALESCE(date_lecture_partenaire, now()) WHERE id_ticket = $1 AND type_auteur IN ('client', 'staff') AND visible_client = true`, [idTicket]);
            if (global.ioMessagerie) global.ioMessagerie.to(`ticket:${idTicket}`).emit('message:lu', { par: 'partenaire' });
            return res.status(200).json({ succes: true });
        } catch (err) {
            console.error('[PATCH /api/partenaire/mes-dossiers/:id/messages/lu] Erreur :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.get('/mes-dossiers/messages-non-lus', async (req, res) => {
        if (!req.session || !req.session.id_partenaire) return res.status(401).json({ succes: false, erreurs: ['authentification requise'] });
        try {
            const resultat = await pool.query(
                `SELECT COUNT(*)::int AS total FROM site.messages_dossier m
                 JOIN site.tickets t ON t.id_ticket = m.id_ticket
                 WHERE t.id_partenaire_assigne = $1 AND m.type_auteur IN ('client', 'staff') AND m.visible_client = true AND m.lu_par_partenaire = false`,
                [req.session.id_partenaire]
            );
            return res.status(200).json({ succes: true, total: resultat.rows[0].total });
        } catch (err) {
            console.error('[GET /api/partenaire/mes-dossiers/messages-non-lus] Erreur :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    return router;
};
