module.exports = {
    separateur: ';',
    colonnes: [
        { cle: 'nom', libelle_modele: 'NOM', obligatoire: true, valider: (v) => v.trim().length > 0 },
        { cle: 'prenom', libelle_modele: 'PRENOM', obligatoire: false },
        { cle: 'email', libelle_modele: 'EMAIL', obligatoire: false, valider: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), messageErreur: () => 'email invalide' },
        { cle: 'telephone', libelle_modele: 'TELEPHONE', obligatoire: false },
        { cle: 'branche_interet', libelle_modele: 'BRANCHE_INTERET', obligatoire: false },
    ],
    validerLigne: (valeurs) => {
        if (!valeurs.email && !valeurs.telephone) {
            return 'au moins un moyen de contact (email ou téléphone) requis';
        }
        return null;
    },
    inserer: async (valeurs, client, contexte) => {
        const resultat = await client.query(
            `INSERT INTO site.prospects (nom, prenom, email, telephone, branche_interet, id_staff_assigne)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_prospect`,
            [valeurs.nom, valeurs.prenom || null, valeurs.email || null, valeurs.telephone || null, valeurs.branche_interet || null, contexte.id_staff]
        );
        return { id_prospect: resultat.rows[0].id_prospect, nom: valeurs.nom };
    },
};
