const { parserContacts } = require('../lib/partenaires');

module.exports = {
    separateur: ';',
    colonnes: [
        { cle: 'nom', libelle_modele: 'NOM', obligatoire: true, valider: (v) => v.trim().length > 0 },
        { cle: 'prenom', libelle_modele: 'PRENOM', obligatoire: false },
        { cle: 'email', libelle_modele: 'EMAIL', obligatoire: true, valider: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), messageErreur: () => 'email invalide' },
        { cle: 'email_notification', libelle_modele: 'EMAIL_NOTIFICATION', obligatoire: true, valider: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), messageErreur: () => 'email de notification invalide' },
        { cle: 'telephone', libelle_modele: 'TELEPHONE', obligatoire: false },
        { cle: 'codes_types', libelle_modele: 'CODES_TYPES', obligatoire: true, valider: (v) => v.trim().length > 0 },
        {
            cle: 'contacts', libelle_modele: 'CONTACTS', obligatoire: true,
            transformer: parserContacts,
            valider: (contacts) => Array.isArray(contacts) && contacts.length > 0 && contacts.some((c) => c.est_defaut),
            messageErreur: () => 'contacts invalides — au moins un contact requis, avec un contact par défaut (*) désigné',
        },
    ],
    revaliderEnBase: async (valeurs, client, contexte) => {
        const existant = await client.query('SELECT 1 FROM site.partenaires WHERE email = $1', [valeurs.email]);
        if (existant.rowCount > 0) return { ok: false, motif: 'un partenaire existe déjà avec cet email (créé entre-temps)' };
        try {
            contexte.resoudreCodesTypes(valeurs.codes_types, contexte.typeParCode);
        } catch (err) {
            return { ok: false, motif: err.message };
        }
        return { ok: true };
    },
    inserer: async (valeurs, client, contexte) => {
        const idsTypes = contexte.resoudreCodesTypes(valeurs.codes_types, contexte.typeParCode);
        const { partenaire, token } = await contexte.creerPartenaireEtActiver(client, {
            email: valeurs.email,
            email_notification: valeurs.email_notification,
            nom: valeurs.nom,
            prenom: valeurs.prenom || null,
            telephone: valeurs.telephone || null,
            id_types_partenaire: idsTypes,
            contacts: valeurs.contacts,
        });
        contexte.envoyerEmailActivationPartenaire(
            contexte.pool,
            partenaire.id_partenaire,
            partenaire.email_notification,
            [partenaire.prenom, partenaire.nom].filter(Boolean).join(' '),
            token
        );
        return { id_partenaire: partenaire.id_partenaire, nom: valeurs.nom };
    },
};
