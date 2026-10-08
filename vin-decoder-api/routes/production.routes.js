// =====================================================================
// Mutuelle Pro Assurances — Production & Souscription, Lot P1
// Routes : socle Contrats + Renouvellements (24/09/2026)
// =====================================================================
//
// Personnel (gestionnaire / administrateur / superadmin, décision de
// Roger du 24/09 : "pure donnée de production", même niveau que
// Prospection & Suivi) :
//   GET   /api/staff/contrats                 liste complète + compagnies actives
//   POST  /api/staff/contrats                 création d'un contrat
//   PATCH /api/staff/contrats/:id             suivi du renouvellement / correction
//   POST  /api/staff/contrats/:id/renouveler  crée le contrat suivant (transaction)
//   GET   /api/staff/production/client?identifiant=
//         recherche EXACTE d'un compte client par matricule ou email,
//         pour rattacher un contrat -- jamais une liste des clients
//         (la décision d'ouvrir "Clients" au gestionnaire reste en
//         attente, on ne la préjuge pas ici)
//
// Client (visibilité "Client", précisée par Roger le 24/09) :
//   GET   /api/mes-contrats                   UNIQUEMENT les contrats rattachés
//                                             au compte connecté
//
// Compagnie : le nom est FIGÉ À L'ÉMISSION (colonne
// compagnie_nom_emission, recommandation du site public du 24/09) --
// les écrans affichent toujours le nom porté par le contrat, jamais le
// libellé courant du carrousel. Un renouvellement prend le nom en
// vigueur au moment où il est émis.
//
// Visibilité côté Personnel : tout rôle autorisé voit tout. Le filtrage
// plus fin (commercial = ses dossiers, chef d'agence = son agence…) est
// annoncé mais pas encore défini -- volontairement non anticipé.
//
// Intégration dans server.js (par la session Git/GitHub uniquement),
// APRÈS le montage des middlewares de session Client et Personnel :
//
//   const productionRouter = require('./routes/production.routes')(pool);
//   app.use('/api', productionRouter);
// =====================================================================

const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireStaffAuth = require('../middleware/requireStaffAuth');
const requireStaffRole = require('../middleware/requireStaffRole');

const ROLES_PRODUCTION = ['gestionnaire', 'administrateur', 'superadmin'];

// "Aujourd'hui" au sens de l'activité (Cameroun), jamais celui du
// serveur (hébergé en France, décalage d'une heure en été).
const AUJOURDHUI_SQL = `(now() AT TIME ZONE 'Africa/Douala')::date`;

const STATUTS_RENOUVELLEMENT_MANUELS = ['a_traiter', 'relance', 'accord_client', 'perdu'];
const STATUTS_CONTRAT_MANUELS = ['en_cours', 'suspendu', 'resilie'];

function estDateIso(valeur) {
    return typeof valeur === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valeur) && !Number.isNaN(Date.parse(valeur));
}

// Montant FCFA : entier >= 0, ou null (champ facultatif). Renvoie
// undefined si la valeur est invalide.
function montantOuNull(valeur) {
    if (valeur === null || valeur === undefined || valeur === '') return null;
    const n = Number(valeur);
    return Number.isInteger(n) && n >= 0 ? n : undefined;
}

function texteOuNull(valeur, longueurMax) {
    if (valeur === null || valeur === undefined) return null;
    const t = String(valeur).trim();
    if (!t) return null;
    return t.slice(0, longueurMax);
}

function repondreErreurBase(res, route, err) {
    if (err && err.code === '23505') {
        return res.status(409).json({ succes: false, erreurs: ['un contrat existe déjà pour cette compagnie, ce numéro de police et cette date d\'effet (ou ce contrat a déjà été renouvelé)'] });
    }
    if (err && err.code === '23503') {
        return res.status(400).json({ succes: false, erreurs: ['compagnie ou compte client introuvable'] });
    }
    if (err && err.code === '23514') {
        return res.status(400).json({ succes: false, erreurs: ['données incohérentes (dates, montants ou souscripteur)'] });
    }
    console.error(`[${route}] Erreur base de données :`, err);
    return res.status(500).json({ succes: false, erreurs: ['erreur serveur'] });
}

const SELECT_CONTRAT_STAFF = `
    SELECT c.id_contrat, c.numero_police, c.id_partenaire_assurance,
           c.compagnie_nom_emission AS compagnie,
           c.code_branche, c.libelle_produit,
           c.id_utilisateur, u.matricule,
           COALESCE(NULLIF(btrim(concat_ws(' ', u.prenom, u.nom)), ''), c.souscripteur_nom) AS souscripteur,
           COALESCE(c.souscripteur_telephone, u.telephone) AS telephone,
           -- Dates renvoyées en texte AAAA-MM-JJ : un DATE converti en
           -- objet Date par pg porterait le fuseau du serveur (France) et
           -- s'afficherait la veille au Cameroun selon la saison
           c.date_effet::text AS date_effet, c.date_echeance::text AS date_echeance,
           (c.date_echeance - ${AUJOURDHUI_SQL}) AS jours_restants,
           c.prime_nette, c.prime_ttc,
           c.statut_contrat, c.statut_renouvellement, c.date_derniere_relance,
           c.id_staff_createur,
           c.id_contrat_precedent, c.observations_internes,
           c.date_creation, c.date_modification
    FROM site.contrats c
    LEFT JOIN site.utilisateurs u ON u.id_utilisateur = c.id_utilisateur
`;

module.exports = function (pool) {
    const router = express.Router();

    // ------------------------------------------------------------------
    // Personnel
    // ------------------------------------------------------------------

    router.get('/staff/contrats', requireStaffAuth, requireStaffRole(ROLES_PRODUCTION), async (req, res) => {
        try {
            const contrats = await pool.query(`${SELECT_CONTRAT_STAFF} ORDER BY c.date_echeance ASC, c.id_contrat ASC`);
            const compagnies = await pool.query(
                `SELECT id, nom FROM site.partenaires_assurance WHERE actif = true ORDER BY ordre_affichage NULLS LAST, nom`
            );
            return res.status(200).json({ succes: true, contrats: contrats.rows, compagnies: compagnies.rows });
        } catch (err) {
            return repondreErreurBase(res, 'GET /api/staff/contrats', err);
        }
    });

    router.get('/staff/production/client', requireStaffAuth, requireStaffRole(ROLES_PRODUCTION), async (req, res) => {
        const identifiant = texteOuNull(req.query.identifiant, 200);
        if (!identifiant) return res.status(400).json({ succes: false, erreurs: ['identifiant requis (matricule ou email)'] });
        try {
            const r = await pool.query(
                `SELECT id_utilisateur, nom, prenom, matricule
                 FROM site.utilisateurs
                 WHERE upper(matricule) = upper($1) OR email = $1::citext
                 LIMIT 1`,
                [identifiant]
            );
            if (!r.rows.length) return res.status(404).json({ succes: false, erreurs: ['aucun compte client pour cet identifiant'] });
            return res.status(200).json({ succes: true, client: r.rows[0] });
        } catch (err) {
            return repondreErreurBase(res, 'GET /api/staff/production/client', err);
        }
    });

    router.post('/staff/contrats', requireStaffAuth, requireStaffRole(ROLES_PRODUCTION), async (req, res) => {
        const b = req.body || {};
        const erreurs = [];
        const numeroPolice = texteOuNull(b.numero_police, 50);
        const idCompagnie = parseInt(b.id_partenaire_assurance, 10);
        const codeBranche = texteOuNull(b.code_branche, 30);
        const idUtilisateur = b.id_utilisateur === null || b.id_utilisateur === undefined || b.id_utilisateur === '' ? null : parseInt(b.id_utilisateur, 10);
        const souscripteurNom = texteOuNull(b.souscripteur_nom, 200);
        const primeNette = montantOuNull(b.prime_nette);
        const primeTtc = montantOuNull(b.prime_ttc);

        if (!numeroPolice) erreurs.push('numéro de police obligatoire');
        if (!Number.isInteger(idCompagnie)) erreurs.push('compagnie obligatoire');
        if (!codeBranche) erreurs.push('branche obligatoire');
        if (idUtilisateur !== null && !Number.isInteger(idUtilisateur)) erreurs.push('compte client invalide');
        if (idUtilisateur === null && !souscripteurNom) erreurs.push('rattachez un compte client ou saisissez le nom du souscripteur');
        if (!estDateIso(b.date_effet)) erreurs.push('date d\'effet invalide');
        if (!estDateIso(b.date_echeance)) erreurs.push('date d\'échéance invalide');
        if (estDateIso(b.date_effet) && estDateIso(b.date_echeance) && b.date_echeance <= b.date_effet) erreurs.push('l\'échéance doit être postérieure à la date d\'effet');
        if (primeNette === undefined || primeTtc === undefined) erreurs.push('montants : nombres entiers positifs en FCFA');
        if (erreurs.length) return res.status(400).json({ succes: false, erreurs });

        try {
            // Nom figé à l'émission ; une affaire nouvelle ne peut être
            // émise que chez une compagnie active (celles proposées à l'écran)
            const compagnie = await pool.query(
                `SELECT nom FROM site.partenaires_assurance WHERE id = $1 AND actif = true`, [idCompagnie]
            );
            if (!compagnie.rows.length) return res.status(400).json({ succes: false, erreurs: ['compagnie introuvable ou inactive'] });

            const r = await pool.query(
                `INSERT INTO site.contrats
                    (numero_police, id_partenaire_assurance, compagnie_nom_emission, code_branche, libelle_produit,
                     id_utilisateur, souscripteur_nom, souscripteur_telephone,
                     date_effet, date_echeance, prime_nette, prime_ttc,
                     observations_internes, id_staff_createur)
                 VALUES ($1,$2,$14,upper($3),$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
                 RETURNING id_contrat`,
                [numeroPolice, idCompagnie, codeBranche, texteOuNull(b.libelle_produit, 150),
                 idUtilisateur, idUtilisateur === null ? souscripteurNom : null, texteOuNull(b.souscripteur_telephone, 20),
                 b.date_effet, b.date_echeance, primeNette, primeTtc,
                 texteOuNull(b.observations_internes, 5000), req.session.id_staff || null,
                 compagnie.rows[0].nom]
            );
            return res.status(201).json({ succes: true, id_contrat: r.rows[0].id_contrat });
        } catch (err) {
            return repondreErreurBase(res, 'POST /api/staff/contrats', err);
        }
    });

    // Champs modifiables un par un -- liste blanche stricte. Les statuts
    // "renouvele" ne se posent JAMAIS ici : uniquement via /renouveler,
    // pour que la chaîne des contrats reste toujours cohérente.
    router.patch('/staff/contrats/:id', requireStaffAuth, requireStaffRole(ROLES_PRODUCTION), async (req, res) => {
        const idContrat = parseInt(req.params.id, 10);
        if (!Number.isInteger(idContrat)) return res.status(400).json({ succes: false, erreurs: ['identifiant invalide'] });
        const b = req.body || {};
        const affectations = [];
        const valeurs = [];
        const erreurs = [];
        const ajouter = (colonne, valeur) => { valeurs.push(valeur); affectations.push(`${colonne} = $${valeurs.length}`); };

        if (b.statut_renouvellement !== undefined) {
            if (!STATUTS_RENOUVELLEMENT_MANUELS.includes(b.statut_renouvellement)) erreurs.push('statut de renouvellement non autorisé');
            else {
                ajouter('statut_renouvellement', b.statut_renouvellement);
                if (b.statut_renouvellement === 'relance') affectations.push('date_derniere_relance = now()');
            }
        }
        if (b.statut_contrat !== undefined) {
            if (!STATUTS_CONTRAT_MANUELS.includes(b.statut_contrat)) erreurs.push('statut de contrat non autorisé');
            else ajouter('statut_contrat', b.statut_contrat);
        }
        if (b.observations_internes !== undefined) ajouter('observations_internes', texteOuNull(b.observations_internes, 5000));
        if (b.libelle_produit !== undefined) ajouter('libelle_produit', texteOuNull(b.libelle_produit, 150));
        if (b.souscripteur_telephone !== undefined) ajouter('souscripteur_telephone', texteOuNull(b.souscripteur_telephone, 20));
        ['prime_nette', 'prime_ttc'].forEach((champ) => {
            if (b[champ] === undefined) return;
            const m = montantOuNull(b[champ]);
            if (m === undefined) erreurs.push('montants : nombres entiers positifs en FCFA');
            else ajouter(champ, m);
        });
        if (erreurs.length) return res.status(400).json({ succes: false, erreurs });
        if (!affectations.length) return res.status(400).json({ succes: false, erreurs: ['aucune modification transmise'] });

        affectations.push('date_modification = now()');
        valeurs.push(idContrat);
        try {
            const r = await pool.query(
                `UPDATE site.contrats SET ${affectations.join(', ')}
                 WHERE id_contrat = $${valeurs.length} AND statut_contrat <> 'renouvele'
                 RETURNING id_contrat`,
                valeurs
            );
            if (!r.rows.length) return res.status(404).json({ succes: false, erreurs: ['contrat introuvable ou déjà renouvelé (il n\'est plus modifiable)'] });
            return res.status(200).json({ succes: true });
        } catch (err) {
            return repondreErreurBase(res, 'PATCH /api/staff/contrats/:id', err);
        }
    });

    // Renouvellement : le nouveau contrat démarre à l'échéance de
    // l'ancien ; l'ancien passe à "renouvele". Les deux écritures sont
    // indissociables -- transaction + verrou de ligne + index unique
    // (contrats_un_seul_successeur) contre toute double exécution.
    router.post('/staff/contrats/:id/renouveler', requireStaffAuth, requireStaffRole(ROLES_PRODUCTION), async (req, res) => {
        const idContrat = parseInt(req.params.id, 10);
        if (!Number.isInteger(idContrat)) return res.status(400).json({ succes: false, erreurs: ['identifiant invalide'] });
        const b = req.body || {};
        if (!estDateIso(b.date_echeance)) return res.status(400).json({ succes: false, erreurs: ['nouvelle date d\'échéance invalide'] });
        const primeNette = montantOuNull(b.prime_nette);
        const primeTtc = montantOuNull(b.prime_ttc);
        if (primeNette === undefined || primeTtc === undefined) return res.status(400).json({ succes: false, erreurs: ['montants : nombres entiers positifs en FCFA'] });

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const r = await client.query(
                `SELECT * FROM site.contrats WHERE id_contrat = $1 FOR UPDATE`, [idContrat]
            );
            const ancien = r.rows[0];
            if (!ancien) { await client.query('ROLLBACK'); return res.status(404).json({ succes: false, erreurs: ['contrat introuvable'] }); }
            if (!['en_cours', 'suspendu'].includes(ancien.statut_contrat)) {
                await client.query('ROLLBACK');
                return res.status(409).json({ succes: false, erreurs: ['seul un contrat en cours ou suspendu peut être renouvelé'] });
            }

            const nouveau = await client.query(
                `INSERT INTO site.contrats
                    (numero_police, id_partenaire_assurance, compagnie_nom_emission, code_branche, libelle_produit,
                     id_utilisateur, souscripteur_nom, souscripteur_telephone,
                     date_effet, date_echeance, prime_nette, prime_ttc,
                     id_contrat_precedent, id_staff_createur)
                 VALUES ($1,$2,(SELECT nom FROM site.partenaires_assurance WHERE id = $2),
                         $3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
                 RETURNING id_contrat`,
                [texteOuNull(b.numero_police, 50) || ancien.numero_police, ancien.id_partenaire_assurance,
                 ancien.code_branche, ancien.libelle_produit,
                 ancien.id_utilisateur, ancien.souscripteur_nom, ancien.souscripteur_telephone,
                 ancien.date_echeance, b.date_echeance,
                 primeNette !== null ? primeNette : ancien.prime_nette,
                 primeTtc !== null ? primeTtc : ancien.prime_ttc,
                 ancien.id_contrat, req.session.id_staff || null]
            );
            await client.query(
                `UPDATE site.contrats
                 SET statut_contrat = 'renouvele', statut_renouvellement = 'renouvele', date_modification = now()
                 WHERE id_contrat = $1`,
                [ancien.id_contrat]
            );
            await client.query('COMMIT');
            return res.status(201).json({ succes: true, id_contrat: nouveau.rows[0].id_contrat });
        } catch (err) {
            await client.query('ROLLBACK').catch(() => {});
            return repondreErreurBase(res, 'POST /api/staff/contrats/:id/renouveler', err);
        } finally {
            client.release();
        }
    });

    // ------------------------------------------------------------------
    // Client -- ses seuls contrats, jamais d'observation interne ni de
    // donnée de suivi commercial
    // ------------------------------------------------------------------

    router.get('/mes-contrats', requireAuth, async (req, res) => {
        try {
            const r = await pool.query(
                `SELECT c.id_contrat, c.numero_police, c.compagnie_nom_emission AS compagnie,
                        c.code_branche, c.libelle_produit,
                        c.date_effet::text AS date_effet, c.date_echeance::text AS date_echeance,
                        (c.date_echeance - ${AUJOURDHUI_SQL}) AS jours_restants,
                        c.prime_ttc, c.statut_contrat
                 FROM site.contrats c
                 WHERE c.id_utilisateur = $1
                 ORDER BY c.date_echeance DESC`,
                [req.session.id_utilisateur]
            );
            return res.status(200).json({ succes: true, contrats: r.rows });
        } catch (err) {
            return repondreErreurBase(res, 'GET /api/mes-contrats', err);
        }
    });

    return router;
};
