// =====================================================================
// Demande initiale d'un ticket (08/10/2026) : le contenu saisi dans le
// formulaire (site.tickets.contenu) est présenté comme premier message
// de la discussion. Message de lecture seule (type_auteur « demande »),
// jamais enregistré dans site.message_dossier. Une erreur ici ne bloque
// jamais l'affichage des messages.
// =====================================================================
const LIBELLES = {
    sujet: 'Sujet', objet: 'Objet', message: 'Message', description: 'Description',
    branche: 'Branche', police: 'Police', date_sinistre: 'Date du sinistre',
    vin: 'VIN', notes: 'Notes', details: 'Détails', ref_memo: 'Référence',
};

module.exports = async function messageDemandeInitiale(pool, idTicket) {
    try {
        const r = await pool.query(
            `SELECT t.contenu, t.date_creation, t.email_contact, tt.libelle_fr
               FROM site.tickets t JOIN site.type_ticket tt ON tt.id_type_ticket = t.id_type_ticket
              WHERE t.id_ticket = $1`, [idTicket]);
        if (r.rowCount === 0) return [];
        const { contenu, date_creation, email_contact, libelle_fr } = r.rows[0];
        const lignes = [`📋 ${libelle_fr} — demande initiale`];
        for (const [cle, valeur] of Object.entries(contenu || {})) {
            if (valeur === null || valeur === undefined || valeur === '') continue;
            const texte = typeof valeur === 'object'
                ? Object.entries(valeur).filter(([, v]) => v !== null && v !== '').map(([k, v]) => `${k} : ${v}`).join(' ; ')
                : String(valeur);
            if (texte) lignes.push(`${LIBELLES[cle] || cle} : ${texte}`);
        }
        return [{
            id_message_dossier: 0, type_auteur: 'demande', contenu: lignes.join('\n'),
            date_creation, visible_client: true, modifie: false, email_auteur: email_contact,
            demande_initiale: true,
        }];
    } catch (err) {
        console.error('[demandeInitiale] Erreur (ignorée) :', err);
        return [];
    }
};
