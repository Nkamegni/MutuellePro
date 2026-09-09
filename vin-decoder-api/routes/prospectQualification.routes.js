// =====================================================================
// Mutuelle Pro Assurances — Prospection, étape 2 "Qualification"
// Route : POST /api/staff/prospects/:id/qualifier
// =====================================================================
// Rôles : gestionnaire, administrateur (cahier des charges technique V2,
// §1 -- travail courant du pipeline, pas une décision de management,
// contrairement à l'Assignation).
//
// Comportement (précision explicite de Roger, 05/09/2026) : cette route
// calcule et PROPOSE un score + une synthèse -- elle ne fait JAMAIS
// progresser site.prospects.statut_opportunite. La validation reste un
// geste humain distinct, posé par le gestionnaire via la route déjà
// existante PATCH /prospects/:id/statut, une fois le score consulté.
// Aucune nouvelle route de validation n'a donc été créée.
//
// Recherche : strictement interne (site.prospects, site.tickets déjà
// lié, site.interactions_prospect, site.utilisateurs si déjà promu) --
// jamais de recherche web, conformément à la loi camerounaise n°2024/017
// (autorisation préalable requise pour tout transfert de données à
// l'étranger).
//
// /!\ POINT DE VIGILANCE NON TRANCHÉ -- voir le compte rendu transmis en
// même temps que ce fichier : l'appel à l'API Anthropic envoie les
// données du prospect à un service tiers hébergé à l'étranger, ce qui
// peut relever du même régime d'autorisation préalable que la recherche
// web écartée ci-dessus. Rendu désactivable via la variable
// d'environnement QUALIFICATION_IA_ACTIVE (défaut : désactivé) en
// attendant confirmation, plutôt que de bloquer tout le chantier sur ce
// point -- la recherche interne et l'historisation restent pleinement
// fonctionnelles même IA désactivée.
//
// Intégration dans server.js :
//
//   const prospectQualificationRouter = require('./routes/prospectQualification.routes')(pool);
//   app.use('/api/staff', prospectQualificationRouter);
//
// Variables d'environnement :
//   QUALIFICATION_IA_ACTIVE = 'true' | (absent/autre = désactivé)
//   ANTHROPIC_API_KEY       = clé API Anthropic
//   ANTHROPIC_MODEL         = optionnel, défaut 'claude-sonnet-5'
// =====================================================================

const express = require('express');
const requireStaffAuth = require('../middleware/requireStaffAuth');
const requireStaffRole = require('../middleware/requireStaffRole');

const IA_ACTIVE = process.env.QUALIFICATION_IA_ACTIVE === 'true';
const IA_MODELE = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

module.exports = function (pool) {
    const router = express.Router();

    // Rassemble tout ce qui est déjà connu du prospect, sans jamais
    // sortir de site.* -- recherche strictement interne (voir en-tête).
    async function rassemblerContexteProspect(idProspect) {
        const prospectRes = await pool.query('SELECT * FROM site.prospects WHERE id_prospect = $1', [idProspect]);
        if (prospectRes.rowCount === 0) return null;
        const prospect = prospectRes.rows[0];

        const [ticketRes, interactionsRes, utilisateurRes] = await Promise.all([
            prospect.id_ticket_origine
                ? pool.query('SELECT * FROM site.tickets WHERE id_ticket = $1', [prospect.id_ticket_origine])
                : Promise.resolve({ rows: [] }),
            pool.query(
                `SELECT type_interaction, contenu, date_interaction FROM site.interactions_prospect
                 WHERE id_prospect = $1 ORDER BY date_interaction ASC`,
                [idProspect]
            ),
            // Cas limite (rare) : un prospect déjà relié à un compte
            // client alors qu'on relance une qualification -- on ne
            // remonte que des champs déjà considérés non sensibles
            // ailleurs dans le code (mêmes colonnes que dans
            // prospectPromotion.routes.js), jamais mot_de_passe_hache.
            prospect.id_utilisateur
                ? pool.query('SELECT nom, prenom, email, telephone FROM site.utilisateurs WHERE id_utilisateur = $1', [prospect.id_utilisateur])
                : Promise.resolve({ rows: [] }),
        ]);

        return {
            prospect,
            ticket: ticketRes.rows[0] || null,
            interactions: interactionsRes.rows,
            compte_client_existant: utilisateurRes.rows[0] || null,
        };
    }

    // Anonymisation avant envoi à l'IA (05/09/2026, Voie 1 -- décision de
    // Roger suite à la question de conformité loi n°2024/017 sur le
    // transfert de données personnelles à un tiers étranger). L'IA n'a
    // besoin d'AUCUN identifiant direct pour juger besoin/budget/autorité
    // -- seulement le contenu métier (branche, description, historique).
    // Liste BLANCHE plutôt que liste noire : on choisit explicitement ce
    // qui part, jamais ce qu'on retire -- plus sûr si le schéma évolue.
    //
    // Limite assumée, à ne pas se cacher : le texte libre (description de
    // ticket, notes d'interaction) peut accidentellement mentionner un nom
    // -- cette fonction retire les CHAMPS d'identité connus, pas un nom
    // qui se serait glissé dans une phrase. Réduction réelle du risque,
    // pas une garantie à 100%.
    function anonymiserContexte(contexte) {
        const ticketAnonyme = contexte.ticket ? {
            type: contexte.ticket.type,
            statut: contexte.ticket.statut,
            date_creation: contexte.ticket.date_creation,
            // contenu (JSONB) peut inclure un "nom" selon le formulaire
            // d'origine (ex. sinistre.js) -- retiré explicitement, le
            // reste (branche, description, police, date) est conservé.
            contenu: contexte.ticket.contenu
                ? Object.fromEntries(Object.entries(contexte.ticket.contenu).filter(([cle]) => !['nom', 'prenom', 'email', 'telephone'].includes(cle)))
                : null,
        } : null;

        return {
            branche_interet: contexte.prospect.branche_interet,
            statut_opportunite: contexte.prospect.statut_opportunite,
            date_creation: contexte.prospect.date_creation,
            ticket: ticketAnonyme,
            interactions: contexte.interactions,
            a_deja_un_compte_client: !!contexte.compte_client_existant,
        };
    }

    function construirePrompt(contexte) {
        return `Tu es un assistant d'aide à la qualification commerciale pour un courtier d'assurance camerounais (Mutuelle Pro Assurances).
Voici ce que l'on sait d'un prospect, à partir des seules données déjà en base interne -- volontairement dépersonnalisé (aucun nom, email ou téléphone), tu n'en as pas besoin pour cette analyse. Réponds UNIQUEMENT avec un objet JSON, sans aucun texte autour ni balise Markdown, au format exact :
{"score": <entier 0-100>, "besoin_identifie": <true|false>, "budget_probable": <true|false>, "autorite_decisionnelle": <true|false>, "synthese": "<3 à 5 phrases en français>"}

Le score reflète la priorité à accorder à ce prospect, pas une décision définitive -- il sera revu par un commercial avant toute action.

Données du prospect (anonymisées) :
${JSON.stringify(anonymiserContexte(contexte), null, 2)}`;
    }

    router.post('/prospects/:id/qualifier', requireStaffAuth, requireStaffRole(['gestionnaire', 'administrateur']), async (req, res) => {
        const idProspect = parseInt(req.params.id, 10);
        if (!Number.isInteger(idProspect)) {
            return res.status(400).json({ succes: false, erreurs: ['id de prospect invalide'] });
        }

        try {
            const contexte = await rassemblerContexteProspect(idProspect);
            if (!contexte) {
                return res.status(404).json({ succes: false, erreurs: ['prospect introuvable'] });
            }

            let resultatIa = null;
            let erreurIa = null;

            if (IA_ACTIVE) {
                try {
                    const reponse = await fetch('https://api.anthropic.com/v1/messages', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-api-key': process.env.ANTHROPIC_API_KEY,
                            'anthropic-version': '2023-06-01',
                        },
                        body: JSON.stringify({
                            model: IA_MODELE,
                            max_tokens: 500,
                            messages: [{ role: 'user', content: construirePrompt(contexte) }],
                        }),
                    });
                    const donneesIa = await reponse.json();
                    const texte = (donneesIa.content || []).map((bloc) => bloc.text || '').join('').trim();
                    const nettoye = texte.replace(/```json|```/g, '').trim();
                    resultatIa = JSON.parse(nettoye);
                } catch (err) {
                    console.error('[POST /api/staff/prospects/:id/qualifier] Erreur appel IA :', err);
                    erreurIa = 'échec de la synthèse automatique -- qualification manuelle nécessaire';
                }
            } else {
                erreurIa = 'synthèse automatique désactivée (QUALIFICATION_IA_ACTIVE) -- en attente de confirmation de conformité loi n°2024/017';
            }

            // Même IA désactivée ou en échec, on trace le passage par
            // l'étape Qualification -- le contexte interne rassemblé
            // reste consultable, seule la synthèse manque.
            const contenuInteraction = {
                score: resultatIa?.score ?? null,
                besoin_identifie: resultatIa?.besoin_identifie ?? null,
                budget_probable: resultatIa?.budget_probable ?? null,
                autorite_decisionnelle: resultatIa?.autorite_decisionnelle ?? null,
                synthese_ia: resultatIa?.synthese ?? null,
                erreur_ia: erreurIa,
            };

            const insere = await pool.query(
                `INSERT INTO site.interactions_prospect (id_prospect, id_staff, type_interaction, contenu)
                 VALUES ($1, $2, 'qualification', $3::jsonb)
                 RETURNING id_interaction, date_interaction`,
                [idProspect, req.session.id_staff, JSON.stringify(contenuInteraction)]
            );
            await pool.query('UPDATE site.prospects SET date_maj = now() WHERE id_prospect = $1', [idProspect]);

            // statut_opportunite volontairement non touché ici -- voir
            // en-tête. La progression vers 'qualifie' reste un geste
            // distinct du gestionnaire via PATCH /prospects/:id/statut.
            return res.status(201).json({
                succes: true,
                interaction: { ...insere.rows[0], type_interaction: 'qualification', contenu: contenuInteraction },
            });
        } catch (err) {
            console.error('[POST /api/staff/prospects/:id/qualifier] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    return router;
};
