// =====================================================================
// Mutuelle Pro Assurances — Construction du classeur Excel des KPI
// =====================================================================
// Réécrit le 09/09/2026 après découverte de staffKpis.routes.js réel
// (05/09/2026), qui expose déjà construireDonneesKpis(pool, req) --
// EXPLICITEMENT préparée pour cet usage (voir son en-tête : "Objectif
// unique : GET /api/staff/kpis/export réutilise EXACTEMENT cette même
// fonction, jamais une copie divergente des requêtes SQL"). Ma première
// version de ce fichier dupliquait des requêtes simplifiées sans le
// savoir -- corrigé ici. Structure des feuilles alignée sur les
// scénarios de test déjà écrits (B9, C11) :
//   - "Résumé" et "Tickets" : toujours présentes
//   - "Administration" (Tâches par responsable + Prospects par statut) :
//     admin/superadmin uniquement, absente sinon (pas juste vide)
// =====================================================================

const ExcelJS = require('exceljs');

const LIBELLES_PERIODE = { semaine: 'Semaine', mois: 'Mois', trimestre: 'Trimestre', annee: 'Année' };

function ajouterTableau(feuille, ligneDepart, titre, colonnes, lignes) {
    let ligne = ligneDepart;
    feuille.getCell(ligne, 1).value = titre;
    feuille.getCell(ligne, 1).font = { bold: true, size: 12 };
    ligne += 1;
    colonnes.forEach((col, i) => { feuille.getCell(ligne, i + 1).value = col.header; feuille.getCell(ligne, i + 1).font = { bold: true }; });
    ligne += 1;
    lignes.forEach((row) => {
        colonnes.forEach((col, i) => { feuille.getCell(ligne, i + 1).value = row[col.key]; });
        ligne += 1;
    });
    return ligne + 1; // ligne suivante disponible, avec une ligne d'espace
}

// pool + req : req doit exposer req.query.periode et req.session (mêmes
// objets qu'un vrai appel Express) -- voir staffKpisExport.routes.js et
// cron_export_kpis_periodique.js pour la construction d'un req minimal
// dans le contexte du cron (pas de vraie requête HTTP).
async function construireWorkbookKpis(pool, req) {
    const { construireDonneesKpis } = require('../routes/staffKpis.routes');
    const donnees = await construireDonneesKpis(pool, req);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mutuelle Pro Assurances';
    workbook.created = new Date();

    const feuilleResume = workbook.addWorksheet('Résumé');
    feuilleResume.getColumn(1).width = 36;
    feuilleResume.getColumn(2).width = 18;
    const lignesResume = [
        { indicateur: 'Période', valeur: donnees.periode_appliquee ? LIBELLES_PERIODE[donnees.periode_appliquee] : 'Toutes dates confondues' },
        { indicateur: 'Généré le', valeur: new Date().toLocaleString('fr-FR') },
        { indicateur: 'Tickets non assignés', valeur: donnees.tickets_non_assignes },
        { indicateur: 'Tâches en attente', valeur: donnees.taches_en_attente },
        { indicateur: 'Tâches en retard', valeur: donnees.taches_en_retard },
        { indicateur: 'Seuil de retard appliqué (jours)', valeur: donnees.seuil_retard_jours_applique },
        { indicateur: 'Temps de traitement moyen (jours)', valeur: donnees.temps_traitement_moyen_jours ?? '—' },
        { indicateur: 'Clients actifs', valeur: donnees.clients_actifs },
        { indicateur: 'Partenaires actifs', valeur: donnees.partenaires_actifs },
    ];
    // Évolutions vs snapshot -- uniquement si au moins un snapshot existe
    // (dégradation silencieuse identique au dashboard, cf. C10).
    if (donnees.date_dernier_snapshot) {
        lignesResume.push({ indicateur: `Évolution tickets non assignés (vs ${new Date(donnees.date_dernier_snapshot).toLocaleDateString('fr-FR')})`, valeur: donnees.evolution_tickets_non_assignes.variation_pct !== null ? `${donnees.evolution_tickets_non_assignes.variation_pct}%` : '—' });
        lignesResume.push({ indicateur: 'Évolution clients actifs', valeur: donnees.evolution_clients_actifs.variation_pct !== null ? `${donnees.evolution_clients_actifs.variation_pct}%` : '—' });
        lignesResume.push({ indicateur: 'Évolution partenaires actifs', valeur: donnees.evolution_partenaires_actifs.variation_pct !== null ? `${donnees.evolution_partenaires_actifs.variation_pct}%` : '—' });
    }
    ajouterTableau(feuilleResume, 1, 'Résumé', [{ header: 'Indicateur', key: 'indicateur' }, { header: 'Valeur', key: 'valeur' }], lignesResume);

    const feuilleTickets = workbook.addWorksheet('Tickets');
    feuilleTickets.getColumn(1).width = 28;
    feuilleTickets.getColumn(2).width = 12;
    let ligneSuivante = ajouterTableau(feuilleTickets, 1, 'Tickets par statut',
        [{ header: 'Statut', key: 'libelle_fr' }, { header: 'Total', key: 'total' }], donnees.tickets_par_statut);
    ajouterTableau(feuilleTickets, ligneSuivante, 'Tickets par type',
        [{ header: 'Type', key: 'libelle_fr' }, { header: 'Total', key: 'total' }], donnees.tickets_par_type);

    // Feuille Administration -- absente (pas juste vide) si les clés ne
    // sont pas présentes dans la réponse, exactement comme le reste du
    // dashboard (RBAC déjà appliqué en amont par construireDonneesKpis :
    // ces clés n'existent tout simplement pas pour un rôle non admin).
    if (donnees.taches_par_responsable) {
        const feuilleAdmin = workbook.addWorksheet('Administration');
        feuilleAdmin.getColumn(1).width = 26;
        feuilleAdmin.getColumn(2).width = 12;
        const ligneApres = ajouterTableau(feuilleAdmin, 1, 'Tâches par responsable',
            [{ header: 'Responsable', key: 'nom' }, { header: 'Total', key: 'total' }], donnees.taches_par_responsable);
        ajouterTableau(feuilleAdmin, ligneApres, 'Prospects par statut',
            [{ header: 'Statut', key: 'statut_opportunite' }, { header: 'Total', key: 'total' }], donnees.prospects_par_statut);
    }

    return workbook;
}

module.exports = { construireWorkbookKpis };
