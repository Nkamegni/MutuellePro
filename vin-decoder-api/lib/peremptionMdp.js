// =====================================================================
// Mutuelle Pro Assurances -- Péremption des mots de passe
// (14/09/2026, migré vers le registre système le 18/09/2026)
// Un seul endroit pour la logique de calcul -- appelé depuis les 3
// routes de connexion (staffAuth, partenaireAuth, auth), jamais
// dupliqué. La source de la durée passe de site.parametres_securite
// (table dédiée, obsolète) à site.parametre_site (registre unique) --
// toute la logique de calcul elle-même reste inchangée.
// =====================================================================

// Retourne { doitChanger: bool, motif: 'expire'|'force'|null }
// -- 'force' prime sur 'expire' si les deux sont vrais, mais peu importe
// en pratique : l'appelant traite les deux cas de la même façon (écran
// de changement obligatoire), seul le message affiché diffère.
async function verifierPeremptionMotDePasse({ pool, tableCompte, colonneId, idCompte, role }) {
    const compte = await pool.query(
        `SELECT mot_de_passe_n_expire_jamais, doit_changer_mot_de_passe, date_dernier_changement_mdp
         FROM ${tableCompte} WHERE ${colonneId} = $1`,
        [idCompte]
    );
    if (compte.rowCount === 0) {
        return { doitChanger: false, motif: null };
    }
    const { mot_de_passe_n_expire_jamais, doit_changer_mot_de_passe, date_dernier_changement_mdp } = compte.rows[0];

    if (doit_changer_mot_de_passe) {
        return { doitChanger: true, motif: 'force' };
    }
    if (mot_de_passe_n_expire_jamais) {
        return { doitChanger: false, motif: null };
    }

    const parametres = await pool.query('SELECT valeurs FROM site.parametre_site WHERE id_parametre_site = 1');
    const regle = parametres.rows[0]?.valeurs?.securite?.peremption_mots_de_passe?.[role];

    // Défense en profondeur : clé absente ou mal typée -> pas de
    // péremption plutôt qu'un crash (registre encore vide, branche
    // renommée par erreur, etc.).
    if (!regle || regle.actif !== true || typeof regle.duree_jours !== 'number') {
        return { doitChanger: false, motif: null };
    }

    const dateExpiration = new Date(date_dernier_changement_mdp);
    dateExpiration.setDate(dateExpiration.getDate() + regle.duree_jours);

    if (dateExpiration < new Date()) {
        return { doitChanger: true, motif: 'expire' };
    }
    return { doitChanger: false, motif: null };
}

module.exports = { verifierPeremptionMotDePasse };
