// =====================================================================
// Mutuelle Pro Assurances — Helpdesk Volet 2
// Routes : POST /api/connexion, POST /api/deconnexion
// =====================================================================
//
// Nouvelles dépendances npm requises sur le VPS AVANT déploiement :
//
//   npm install express-session connect-pg-simple
//
// Prérequis : table site.session créée (voir 002_helpdesk_volet2_session.sql)
// et middleware de session déjà configuré dans server.js (voir bloc à
// insérer séparément, fourni avec ce fichier) AVANT le montage de ce
// routeur, sinon req.session sera undefined.
// =====================================================================

const express = require('express');
const argon2 = require('argon2');

// ---------------------------------------------------------------------
// Limitation anti-brute-force — auto-contenue dans ce fichier plutôt que
// de dépendre de createRateLimiter() déjà présent ailleurs dans server.js,
// pour ne pas coupler ce routeur à l'implémentation interne d'un autre
// fichier. Même principe : compteur en mémoire par clé (ici IP + email/
// téléphone tenté), fenêtre glissante.
//
// Limite : 5 tentatives / 15 minutes par couple (IP, identifiant tenté).
// Le blocage porte sur le COUPLE, pas sur l'IP seule ni l'identifiant
// seul : ça évite qu'un attaquant bloque le compte d'un client légitime
// en multipliant les échecs depuis une autre IP (déni de service ciblé),
// tout en limitant le brute-force classique depuis une même IP.
// ---------------------------------------------------------------------
const tentatives = new Map(); // clé: "ip|identifiant" -> [timestamps]
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
        const { identifiant, mot_de_passe } = req.body; // identifiant = email OU téléphone

        if (!identifiant || !mot_de_passe) {
            return res.status(400).json({ succes: false, erreurs: ['identifiant et mot_de_passe requis'] });
        }

        const cle = `${req.ip}|${identifiant}`;
        if (estBloque(cle)) {
            return res.status(429).json({
                succes: false,
                erreurs: ['trop de tentatives, réessayez dans quelques minutes']
            });
        }

        try {
            const resultat = await pool.query(
                `SELECT id_utilisateur, email, telephone, mot_de_passe_hache, statut_compte
                 FROM site.utilisateurs
                 WHERE email = $1 OR telephone = $1`,
                [identifiant]
            );

            // Message volontairement identique en cas d'identifiant inconnu
            // OU de mot de passe incorrect — ne jamais révéler lequel des
            // deux est en cause (évite l'énumération de comptes existants).
            if (resultat.rowCount === 0) {
                enregistrerEchec(cle);
                return res.status(401).json({ succes: false, erreurs: ['identifiant ou mot de passe incorrect'] });
            }

            const compte = resultat.rows[0];

            if (compte.statut_compte !== 'actif') {
                return res.status(403).json({ succes: false, erreurs: ['compte suspendu, contactez-nous'] });
            }

            const motDePasseValide = await argon2.verify(compte.mot_de_passe_hache, mot_de_passe);
            if (!motDePasseValide) {
                enregistrerEchec(cle);
                return res.status(401).json({ succes: false, erreurs: ['identifiant ou mot de passe incorrect'] });
            }

            reinitialiser(cle);

            // Régénération de l'id de session à chaque connexion — empêche
            // la fixation de session (un attaquant qui aurait fixé un id de
            // session avant l'authentification ne peut pas en hériter).
            req.session.regenerate((err) => {
                if (err) {
                    console.error('[POST /api/connexion] Erreur régénération session :', err);
                    return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
                }

                req.session.id_utilisateur = compte.id_utilisateur;

                pool.query(
                    'UPDATE site.utilisateurs SET date_derniere_connexion = now() WHERE id_utilisateur = $1',
                    [compte.id_utilisateur]
                ).catch(err => console.error('[POST /api/connexion] Erreur mise à jour date_derniere_connexion :', err));

                return res.status(200).json({
                    succes: true,
                    compte: {
                        id_utilisateur: compte.id_utilisateur,
                        email: compte.email,
                        telephone: compte.telephone
                    }
                });
            });
        } catch (err) {
            console.error('[POST /api/connexion] Erreur base de données :', err);
            return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
        }
    });

    router.post('/deconnexion', (req, res) => {
        if (!req.session) {
            return res.status(200).json({ succes: true });
        }

        req.session.destroy((err) => {
            if (err) {
                console.error('[POST /api/deconnexion] Erreur destruction session :', err);
                return res.status(500).json({ succes: false, erreurs: ['erreur serveur, veuillez réessayer'] });
            }
            res.clearCookie('connect.sid');
            return res.status(200).json({ succes: true });
        });
    });

    return router;
};

// =====================================================================
// Exemples d'appel côté frontend (à intégrer au §6.3, pas dans ce tour) :
//
// fetch('/api/connexion', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     credentials: 'include',           // indispensable pour envoyer/recevoir le cookie de session
//     body: JSON.stringify({ identifiant: 'client@exemple.com', mot_de_passe: '...' })
// });
//
// fetch('/api/deconnexion', { method: 'POST', credentials: 'include' });
// =====================================================================
