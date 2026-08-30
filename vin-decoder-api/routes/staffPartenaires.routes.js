// =====================================================================
// Mutuelle Pro Assurances — Espace Partenaire
// Mis à jour le 21/08/2026 : contacts multiples (défaut obligatoire),
// activation par email (remplace le mot de passe temporaire affiché),
// import CSV v2 (codes de type A01-G04, contacts entre accolades)
// =====================================================================

const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const requireStaffAuth = require('../middleware/requireStaffAuth');
const requireStaffRole = require('../middleware/requireStaffRole');
const { chiffrer } = require('../lib/chiffrement');
const { creerBoiteMail } = require('../lib/ispconfig');

const ROLES_ECRITURE = ['gestionnaire', 'administrateur'];

const mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
});

async function envoyerEmailActivationPartenaire(emailNotification, nomComplet, token) {
    const lien = `https://mutuelleproassurances.com/activation-partenaire.html?token=${token}`;
    try {
        await mailTransporter.sendMail({
            from: '"Mutuelle Pro Assurances" <admin@mutuelleproassurances.com>',
            to: emailNotification,
            subject: 'Mutuelle Pro Assurances — Activez votre compte partenaire',
            html: `
                <p>Bonjour,</p>
                <p>Un compte partenaire a été créé pour <strong>${nomComplet}</strong> sur l'espace Mutuelle Pro Assurances.</p>
                <p>Pour l'activer et définir votre mot de passe, cliquez sur le lien ci-dessous (valable 72 heures) :</p>
                <p><a href="${lien}">${lien}</a></p>
            `,
        });
    } catch (err) {
        console.error('[envoyerEmailActivationPartenaire] Erreur envoi email :', err);
    }
}

// Crée un partenaire avec un mot de passe inutilisable (jamais transmis),
// puis génère un jeton d'activation et envoie l'email — À l'adresse de
// NOTIFICATION externe (email_notification), jamais à la boîte interne
// que le partenaire n'a pas encore configurée (problème de l'œuf et la
// poule, résolu le 21/08/2026). Réutilisé par la création unitaire ET
// l'import en masse.
async function creerPartenaireEtActiver(client, { email, email_notification, nom_complet, telephone, id_types_partenaire, contacts }) {
    const hacheInutilisable = crypto.randomBytes(32).toString('hex');
    const dernierMatricule = await client.query('SELECT COUNT(*) AS total FROM site.partenaires');
    const matricule = `PART-${String(parseInt(dernierMatricule.rows[0].total, 10) + 1).padStart(4, '0')}`;

    const inserePartenaire = await client.query(
        `INSERT INTO site.partenaires (matricule, email, email_notification, mot_de_passe_hache, nom_complet, telephone)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id_partenaire, email, email_notification, nom_complet`,
        [matricule, email, email_notification, hacheInutilisable, nom_complet, telephone || null]
    );
    const partenaire = inserePartenaire.rows[0];

    for (const idType of id_types_partenaire) {
        await client.query('INSERT INTO site.partenaire_types (id_partenaire, id_type_partenaire) VALUES ($1, $2)', [partenaire.id_partenaire, idType]);
    }

    for (const contact of contacts) {
        await client.query(
            'INSERT INTO site.partenaire_contacts (id_partenaire, nom, prenom, fonction, telephone, est_defaut) VALUES ($1, $2, $3, $4, $5, $6)',
            [partenaire.id_partenaire, contact.nom, contact.prenom || null, contact.fonction || null, contact.telephone || null, !!contact.est_defaut]
        );
    }

    const token = crypto.randomBytes(32).toString('hex');
    await client.query('INSERT INTO site.activation_partenaire_tokens (token, id_partenaire) VALUES ($1, $2)', [token, partenaire.id_partenaire]);

    return { partenaire, token };
}

// Régénère un jeton d'activation pour un partenaire existant en attente
// (renvoi de lien) — invalide l'ancien jeton avant d'en créer un nouveau.
async function renvoyerActivation(pool, idPartenaire) {
    const infos = await pool.query('SELECT email_notification, nom_complet, mot_de_passe_defini FROM site.partenaires WHERE id_partenaire = $1', [idPartenaire]);
    if (infos.rowCount === 0) return { succes: false, erreur: 'partenaire introuvable' };
    if (infos.rows[0].mot_de_passe_defini) return { succes: false, erreur: 'ce compte est déjà activé' };
    if (!infos.rows[0].email_notification) return { succes: false, erreur: 'aucune adresse de notification enregistrée pour ce partenaire' };

    await pool.query('DELETE FROM site.activation_partenaire_tokens WHERE id_partenaire = $1', [idPartenaire]);
    const token = crypto.randomBytes(32).toString('hex');
    await pool.query('INSERT INTO site.activation_partenaire_tokens (token, id_partenaire) VALUES ($1, $2)', [token, idPartenaire]);
    await envoyerEmailActivationPartenaire(infos.rows[0].email_notification, infos.rows[0].nom_complet, token);
    return { succes: true };
}

module.exports = function (pool) {
    const router = express.Router();

    router.get('/types-partenaires', requireStaffAuth, async (req, res) => {
        try {
            const resultat = await pool.query(
                `SELECT tp.id_type_partenaire, tp.code, tp.libelle_fr, cp.libelle_fr AS categorie_libelle_fr, cp.code_lettre
                 FROM site.type_partenaire tp
                 JOIN site.categorie_partenaire cp ON cp.id_categorie = tp.id_categorie
                 ORDER BY cp.code_lettre, tp.code`
            );
            return res.status(200).json({ succes: true, types: resultat.rows });
        } catch (err) {
            console.error('[GET /api/staff/types-partenaires] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.post('/partenaires', requireStaffAuth, requireStaffRole(['administrateur']), async (req, res) => {
        const { email, email_notification, nom_complet, telephone, id_types_partenaire, contacts, creer_boite_mail } = req.body;

        if (!email || !nom_complet || !Array.isArray(id_types_partenaire) || id_types_partenaire.length === 0) {
            return res.status(400).json({ succes: false, erreurs: ['email, nom_complet et id_types_partenaire (tableau non vide) requis'] });
        }
        if (!email_notification) {
            return res.status(400).json({ succes: false, erreurs: ['une adresse de notification externe est requise — c\'est elle qui recevra le lien d\'activation'] });
        }
        if (!Array.isArray(contacts) || contacts.length === 0) {
            return res.status(400).json({ succes: false, erreurs: ['au moins un contact requis'] });
        }
        if (!contacts.some((c) => c.est_defaut)) {
            return res.status(400).json({ succes: false, erreurs: ['un contact par défaut doit être désigné'] });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { partenaire, token } = await creerPartenaireEtActiver(client, { email, email_notification, nom_complet, telephone, id_types_partenaire, contacts });
            await client.query('COMMIT');

            envoyerEmailActivationPartenaire(email_notification, nom_complet, token);

            // Création de boîte mail — APRÈS le commit, volontairement non
            // bloquante, même patron que côté Personnel (28/08/2026).
            let boiteMail = null;
            if (creer_boite_mail) {
                try {
                    const motDePasseGenere = crypto.randomBytes(12).toString('base64').replace(/[+/=]/g, '').slice(0, 16);
                    await creerBoiteMail({ email, motDePasse: motDePasseGenere, nomAffiche: nom_complet });
                    await pool.query('UPDATE site.partenaires SET imap_mot_de_passe_chiffre = $1 WHERE id_partenaire = $2', [chiffrer(motDePasseGenere), partenaire.id_partenaire]);
                    boiteMail = { succes: true };
                } catch (err) {
                    console.error('[POST /api/staff/partenaires] Échec création boîte mail (non bloquant) :', err);
                    boiteMail = { succes: false, erreur: err.message };
                }
            }

            return res.status(201).json({ succes: true, partenaire, boite_mail: boiteMail });
        } catch (err) {
            await client.query('ROLLBACK');
            if (err.code === '23505') {
                return res.status(409).json({ succes: false, erreurs: ['un partenaire existe déjà avec cet email'] });
            }
            console.error('[POST /api/staff/partenaires] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        } finally {
            client.release();
        }
    });

    // Vérification en direct — appelée quand l'admin saisit un email dans
    // le formulaire de création, AVANT soumission. Retourne tous les
    // comptes existants sur cette adresse (plusieurs suspendus possibles,
    // au plus un actif — voir contrainte d'unicité partielle).
    router.get('/partenaires/verifier-email', requireStaffAuth, async (req, res) => {
        const email = (req.query.email || '').trim();
        if (!email) {
            return res.status(400).json({ succes: false, erreurs: ['email requis'] });
        }
        try {
            const resultat = await pool.query(
                'SELECT id_partenaire, nom_complet, statut_compte, mot_de_passe_defini FROM site.partenaires WHERE email = $1 ORDER BY id_partenaire DESC',
                [email]
            );
            return res.status(200).json({ succes: true, comptes: resultat.rows });
        } catch (err) {
            console.error('[GET /api/staff/partenaires/verifier-email] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.get('/partenaires', requireStaffAuth, async (req, res) => {
        try {
            const resultat = await pool.query(
                `SELECT p.id_partenaire, p.matricule, p.nom_complet, p.email, p.email_notification, p.telephone, p.statut_compte, p.mot_de_passe_defini,
                        COALESCE(array_agg(DISTINCT pt.id_type_partenaire) FILTER (WHERE pt.id_type_partenaire IS NOT NULL), '{}') AS id_types_partenaire,
                        COALESCE(string_agg(DISTINCT tp.code || ' ' || tp.libelle_fr, ', ' ORDER BY tp.code || ' ' || tp.libelle_fr), '') AS types_libelles,
                        COALESCE(
                            json_agg(DISTINCT jsonb_build_object('id_contact', pc.id_contact, 'nom', pc.nom, 'prenom', pc.prenom, 'fonction', pc.fonction, 'telephone', pc.telephone, 'est_defaut', pc.est_defaut))
                            FILTER (WHERE pc.id_contact IS NOT NULL), '[]'
                        ) AS contacts
                 FROM site.partenaires p
                 LEFT JOIN site.partenaire_types pt ON pt.id_partenaire = p.id_partenaire
                 LEFT JOIN site.type_partenaire tp ON tp.id_type_partenaire = pt.id_type_partenaire
                 LEFT JOIN site.partenaire_contacts pc ON pc.id_partenaire = p.id_partenaire
                 GROUP BY p.id_partenaire
                 ORDER BY p.nom_complet`
            );
            return res.status(200).json({ succes: true, partenaires: resultat.rows });
        } catch (err) {
            console.error('[GET /api/staff/partenaires] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.patch('/partenaires/:id', requireStaffAuth, requireStaffRole(['administrateur']), async (req, res) => {
        const idPartenaire = parseInt(req.params.id, 10);
        const { nom_complet, telephone, email_notification, id_types_partenaire, contacts, statut_compte } = req.body;

        if (!Number.isInteger(idPartenaire)) {
            return res.status(400).json({ succes: false, erreurs: ['id de partenaire invalide'] });
        }
        if (statut_compte && !['actif', 'suspendu'].includes(statut_compte)) {
            return res.status(400).json({ succes: false, erreurs: ['statut_compte invalide'] });
        }
        if (Array.isArray(contacts) && contacts.length > 0 && !contacts.some((c) => c.est_defaut)) {
            return res.status(400).json({ succes: false, erreurs: ['un contact par défaut doit être désigné'] });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const existe = await client.query('SELECT id_partenaire FROM site.partenaires WHERE id_partenaire = $1', [idPartenaire]);
            if (existe.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ succes: false, erreurs: ['partenaire introuvable'] });
            }

            await client.query(
                `UPDATE site.partenaires
                 SET nom_complet = COALESCE($1, nom_complet),
                     telephone = COALESCE($2, telephone),
                     email_notification = COALESCE($3, email_notification),
                     statut_compte = COALESCE($4, statut_compte)
                 WHERE id_partenaire = $5`,
                [nom_complet || null, telephone || null, email_notification || null, statut_compte || null, idPartenaire]
            );

            if (Array.isArray(id_types_partenaire) && id_types_partenaire.length > 0) {
                await client.query('DELETE FROM site.partenaire_types WHERE id_partenaire = $1', [idPartenaire]);
                for (const idType of id_types_partenaire) {
                    await client.query('INSERT INTO site.partenaire_types (id_partenaire, id_type_partenaire) VALUES ($1, $2)', [idPartenaire, idType]);
                }
            }

            if (Array.isArray(contacts) && contacts.length > 0) {
                await client.query('DELETE FROM site.partenaire_contacts WHERE id_partenaire = $1', [idPartenaire]);
                for (const contact of contacts) {
                    await client.query(
                        'INSERT INTO site.partenaire_contacts (id_partenaire, nom, prenom, fonction, telephone, est_defaut) VALUES ($1, $2, $3, $4, $5, $6)',
                        [idPartenaire, contact.nom, contact.prenom || null, contact.fonction || null, contact.telephone || null, !!contact.est_defaut]
                    );
                }
            }

            if (statut_compte === 'suspendu') {
                await client.query(`DELETE FROM site.session_partenaire WHERE sess::jsonb->>'id_partenaire' = $1::text`, [idPartenaire.toString()]);
            }

            await client.query(
                `INSERT INTO site.journal_audit (id_staff, action, table_concernee, id_enregistrement, adresse_ip)
                 VALUES ($1, 'partenaire.modification', 'partenaires', $2, $3)`,
                [req.session.id_staff, idPartenaire, req.ip]
            );

            await client.query('COMMIT');
            return res.status(200).json({ succes: true });
        } catch (err) {
            await client.query('ROLLBACK');
            if (err.code === '23505') {
                return res.status(409).json({ succes: false, erreurs: ['un autre compte actif utilise déjà cette adresse email — désactivez-le d\'abord avant de réactiver celui-ci'] });
            }
            console.error('[PATCH /api/staff/partenaires/:id] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        } finally {
            client.release();
        }
    });

    router.delete('/partenaires/:id', requireStaffAuth, requireStaffRole(['administrateur']), async (req, res) => {
        const idPartenaire = parseInt(req.params.id, 10);
        if (!Number.isInteger(idPartenaire)) {
            return res.status(400).json({ succes: false, erreurs: ['id de partenaire invalide'] });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const existe = await client.query('SELECT id_partenaire FROM site.partenaires WHERE id_partenaire = $1', [idPartenaire]);
            if (existe.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ succes: false, erreurs: ['partenaire introuvable'] });
            }

            await client.query('UPDATE site.tickets SET id_partenaire_assigne = NULL WHERE id_partenaire_assigne = $1', [idPartenaire]);
            await client.query(`DELETE FROM site.session_partenaire WHERE sess::jsonb->>'id_partenaire' = $1::text`, [idPartenaire.toString()]);
            await client.query('DELETE FROM site.partenaires WHERE id_partenaire = $1', [idPartenaire]);

            await client.query(
                `INSERT INTO site.journal_audit (id_staff, action, table_concernee, id_enregistrement, adresse_ip)
                 VALUES ($1, 'partenaire.suppression', 'partenaires', $2, $3)`,
                [req.session.id_staff, idPartenaire, req.ip]
            );

            await client.query('COMMIT');
            return res.status(200).json({ succes: true });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('[DELETE /api/staff/partenaires/:id] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        } finally {
            client.release();
        }
    });

    // Configuration du mot de passe de la boîte mail — Administrateur
    // uniquement. Le mot de passe est celui déjà créé manuellement dans
    // ISPConfig pour la boîte du partenaire (même adresse que son email
    // de connexion). Jamais stocké en clair — voir lib/chiffrement.js.
    router.patch('/partenaires/:id/boite-mail', requireStaffAuth, requireStaffRole(['administrateur']), async (req, res) => {
        const idPartenaire = parseInt(req.params.id, 10);
        const { mot_de_passe } = req.body;

        if (!Number.isInteger(idPartenaire)) {
            return res.status(400).json({ succes: false, erreurs: ['id de partenaire invalide'] });
        }
        if (!mot_de_passe || typeof mot_de_passe !== 'string') {
            return res.status(400).json({ succes: false, erreurs: ['mot_de_passe requis'] });
        }

        try {
            const chiffre = chiffrer(mot_de_passe);
            const resultat = await pool.query(
                'UPDATE site.partenaires SET imap_mot_de_passe_chiffre = $1 WHERE id_partenaire = $2 RETURNING id_partenaire',
                [chiffre, idPartenaire]
            );
            if (resultat.rowCount === 0) {
                return res.status(404).json({ succes: false, erreurs: ['partenaire introuvable'] });
            }

            await pool.query(
                `INSERT INTO site.journal_audit (id_staff, action, table_concernee, id_enregistrement, adresse_ip)
                 VALUES ($1, 'partenaire.configuration_boite_mail', 'partenaires', $2, $3)`,
                [req.session.id_staff, idPartenaire, req.ip]
            );

            return res.status(200).json({ succes: true });
        } catch (err) {
            console.error('[PATCH /api/staff/partenaires/:id/boite-mail] Erreur :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    router.patch('/tickets/:id/assignation-partenaire', requireStaffAuth, requireStaffRole(ROLES_ECRITURE), async (req, res) => {
        const idTicket = parseInt(req.params.id, 10);
        const idPartenaire = req.body.id_partenaire === null ? null : parseInt(req.body.id_partenaire, 10);
        if (!Number.isInteger(idTicket)) {
            return res.status(400).json({ succes: false, erreurs: ['id de ticket invalide'] });
        }
        try {
            const resultat = await pool.query(
                'UPDATE site.tickets SET id_partenaire_assigne = $2 WHERE id_ticket = $1 RETURNING id_ticket, code_ticket, id_partenaire_assigne',
                [idTicket, idPartenaire]
            );
            if (resultat.rowCount === 0) {
                return res.status(404).json({ succes: false, erreurs: ['ticket introuvable'] });
            }
            await pool.query(
                `INSERT INTO site.journal_audit (id_staff, action, table_concernee, id_enregistrement, donnees_apres, adresse_ip)
                 VALUES ($1, 'ticket.assignation_partenaire', 'tickets', $2, $3::jsonb, $4)`,
                [req.session.id_staff, idTicket, JSON.stringify({ id_partenaire_assigne: idPartenaire }), req.ip]
            );
            return res.status(200).json({ succes: true, ticket: resultat.rows[0] });
        } catch (err) {
            console.error('[PATCH /api/staff/tickets/:id/assignation-partenaire] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
        }
    });

    // -------------------------------------------------------------
    // Import CSV v2 — format documenté dans le rapport de session :
    //
    //   nom_complet,email,telephone,codes_types,contacts
    //
    // codes_types : codes (ex: A01) séparés par virgule et/ou plage avec
    // tiret (ex: "E03-E04,E08,E09").
    // contacts : un ou plusieurs blocs {nom;prenom;fonction;telephone},
    // séparés par point-virgule ENTRE blocs, le contact par défaut porte
    // un "*" juste après son accolade fermante. Exemple :
    //   {Nkamegni Noupeu;Roger;CEO;+237697717334}*;{Assistant;Jean;Support;+237698888888}
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
            } else if (car === ',' && !dansGuillemets) {
                champs.push(champActuel.trim());
                champActuel = '';
            } else {
                champActuel += car;
            }
        }
        champs.push(champActuel.trim());
        return champs;
    }

    // "E03-E04,E08,E09" -> ['E03','E04','E08','E09']
    function developperCodesTypes(specification) {
        const codes = new Set();
        const morceaux = specification.split(',').map((m) => m.trim()).filter(Boolean);
        for (const morceau of morceaux) {
            if (morceau.includes('-')) {
                const [debut, fin] = morceau.split('-').map((c) => c.trim().toUpperCase());
                const lettre = debut.charAt(0);
                const numDebut = parseInt(debut.slice(1), 10);
                const numFin = parseInt(fin.slice(1), 10);
                if (fin.charAt(0) !== lettre || isNaN(numDebut) || isNaN(numFin) || numFin < numDebut) {
                    throw new Error(`plage invalide « ${morceau} »`);
                }
                for (let n = numDebut; n <= numFin; n++) {
                    codes.add(lettre + String(n).padStart(2, '0'));
                }
            } else {
                codes.add(morceau.toUpperCase());
            }
        }
        return Array.from(codes);
    }

    // "{Nom;Prenom;Fonction;Tel}*;{Nom2;Prenom2;Fonction2;Tel2}" -> [{...,est_defaut:true}, {...}]
    function parserContacts(specification) {
        const contacts = [];
        const regex = /\{([^}]*)\}(\*)?/g;
        let correspondance;
        while ((correspondance = regex.exec(specification)) !== null) {
            const [nom, prenom, fonction, telephone] = correspondance[1].split(';').map((c) => c.trim());
            contacts.push({ nom, prenom, fonction, telephone, est_defaut: !!correspondance[2] });
        }
        return contacts;
    }

    router.post('/partenaires/import', requireStaffAuth, requireStaffRole(['administrateur']), async (req, res) => {
        const { contenu_csv } = req.body;
        if (!contenu_csv || typeof contenu_csv !== 'string') {
            return res.status(400).json({ succes: false, erreurs: ['contenu_csv requis'] });
        }

        const lignes = contenu_csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lignes.length < 2) {
            return res.status(400).json({ succes: false, erreurs: ['fichier vide ou sans données'] });
        }

        const enteteAttendue = ['nom_complet', 'email', 'email_notification', 'telephone', 'codes_types', 'contacts'];
        const entete = parserLigneCsv(lignes[0]).map((c) => c.toLowerCase());
        if (JSON.stringify(entete) !== JSON.stringify(enteteAttendue)) {
            return res.status(400).json({ succes: false, erreurs: [`en-tête invalide — attendu : ${enteteAttendue.join(',')}`] });
        }

        const typesRef = await pool.query('SELECT id_type_partenaire, code FROM site.type_partenaire');
        const typeParCode = new Map(typesRef.rows.map((t) => [t.code, t.id_type_partenaire]));

        const resultats = { crees: [], erreurs: [] };

        for (let i = 1; i < lignes.length; i++) {
            const numeroLigne = i + 1;
            const champs = parserLigneCsv(lignes[i]);
            const [nom_complet, email, email_notification, telephone, codesTypesStr, contactsStr] = champs;

            if (!nom_complet || !email || !email_notification || !codesTypesStr || !contactsStr) {
                resultats.erreurs.push(`Ligne ${numeroLigne} : nom_complet, email, email_notification, codes_types et contacts sont obligatoires`);
                continue;
            }

            let codesTypes, contacts;
            try {
                codesTypes = developperCodesTypes(codesTypesStr);
                contacts = parserContacts(contactsStr);
            } catch (err) {
                resultats.erreurs.push(`Ligne ${numeroLigne} : ${err.message}`);
                continue;
            }

            if (contacts.length === 0 || !contacts.some((c) => c.est_defaut)) {
                resultats.erreurs.push(`Ligne ${numeroLigne} : un contact par défaut doit être désigné (voir le « * »)`);
                continue;
            }

            const idsTypes = [];
            let codeInconnu = null;
            for (const code of codesTypes) {
                const id = typeParCode.get(code);
                if (!id) { codeInconnu = code; break; }
                idsTypes.push(id);
            }
            if (codeInconnu) {
                resultats.erreurs.push(`Ligne ${numeroLigne} : code de type inconnu « ${codeInconnu} »`);
                continue;
            }

            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                const { partenaire, token } = await creerPartenaireEtActiver(client, {
                    email, email_notification, nom_complet, telephone, id_types_partenaire: idsTypes, contacts
                });
                await client.query('COMMIT');

                envoyerEmailActivationPartenaire(email_notification, nom_complet, token);
                resultats.crees.push({ email, nom_complet });
            } catch (err) {
                await client.query('ROLLBACK');
                if (err.code === '23505') {
                    resultats.erreurs.push(`Ligne ${numeroLigne} : un partenaire existe déjà avec l'email ${email}`);
                } else {
                    console.error(`[POST /api/staff/partenaires/import] Erreur ligne ${numeroLigne} :`, err);
                    resultats.erreurs.push(`Ligne ${numeroLigne} : erreur serveur`);
                }
            } finally {
                client.release();
            }
        }

        if (resultats.crees.length > 0) {
            await pool.query(
                `INSERT INTO site.journal_audit (id_staff, action, table_concernee, donnees_apres, adresse_ip)
                 VALUES ($1, 'partenaire.import_csv', 'partenaires', $2::jsonb, $3)`,
                [req.session.id_staff, JSON.stringify({ nombre_crees: resultats.crees.length }), req.ip]
            );
        }

        return res.status(200).json({ succes: true, ...resultats });
    });

    // Renvoi du lien d'activation, à l'initiative du staff — utilisé par
    // l'action groupée "Renvoyer le lien d'activation" sur les comptes
    // "En attente d'activation".
    router.post('/partenaires/:id/renvoyer-activation', requireStaffAuth, requireStaffRole(['administrateur']), async (req, res) => {
        const idPartenaire = parseInt(req.params.id, 10);
        if (!Number.isInteger(idPartenaire)) {
            return res.status(400).json({ succes: false, erreurs: ['id de partenaire invalide'] });
        }
        const resultat = await renvoyerActivation(pool, idPartenaire);
        if (!resultat.succes) {
            return res.status(400).json({ succes: false, erreurs: [resultat.erreur] });
        }
        return res.status(200).json({ succes: true });
    });

    return router;
};
