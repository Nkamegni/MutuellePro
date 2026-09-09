function normaliserLibelle(libelle) {
    return (libelle || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function parserCsv(contenu, separateur = ';') {
    const lignes = contenu.split(/\r?\n/).filter((l) => l.trim().length > 0);
    return lignes.map((ligne) => {
        const champs = [];
        let champActuel = '';
        let dansGuillemets = false;
        for (let i = 0; i < ligne.length; i++) {
            const car = ligne[i];
            if (car === '"') {
                if (dansGuillemets && ligne[i + 1] === '"') { champActuel += '"'; i++; }
                else dansGuillemets = !dansGuillemets;
            } else if (car === separateur && !dansGuillemets) {
                champs.push(champActuel.trim());
                champActuel = '';
            } else {
                champActuel += car;
            }
        }
        champs.push(champActuel.trim());
        return champs;
    });
}

function detecterEtValiderEntetes(lignesBrutes, modele, sansEnTetesConfirme) {
    if (lignesBrutes.length === 0) {
        return { ok: false, erreurs: ['fichier sans aucune ligne'] };
    }
    const premiereLigne = lignesBrutes[0];
    const libellesNormalises = premiereLigne.map(normaliserLibelle);
    const colonnesNormalisees = modele.colonnes.map((c) => normaliserLibelle(c.libelle_modele));
    const auMoinsUnReconnu = libellesNormalises.some((l) => colonnesNormalisees.includes(l));

    if (!auMoinsUnReconnu && !sansEnTetesConfirme) {
        return { confirmationRequise: true };
    }
    if (sansEnTetesConfirme) {
        if (premiereLigne.length !== modele.colonnes.length) {
            return { ok: false, erreurs: [`nombre de colonnes incohérent — attendu ${modele.colonnes.length}, trouvé ${premiereLigne.length}`] };
        }
        const mapping = {};
        modele.colonnes.forEach((col, index) => { mapping[col.cle] = index; });
        return { ok: true, sansEnTetes: true, mapping };
    }

    const mapping = {};
    const colonnesManquantes = [];
    modele.colonnes.forEach((col) => {
        const normaliseModele = normaliserLibelle(col.libelle_modele);
        const indexTrouve = libellesNormalises.findIndex((l) => l === normaliseModele);
        if (indexTrouve === -1) {
            if (col.obligatoire) colonnesManquantes.push(col.libelle_modele);
        } else {
            mapping[col.cle] = indexTrouve;
        }
    });
    if (colonnesManquantes.length > 0) {
        return { ok: false, erreurs: [`colonne(s) obligatoire(s) introuvable(s) : ${colonnesManquantes.join(', ')}`] };
    }
    return { ok: true, sansEnTetes: false, mapping };
}

function compterLignes(lignesBrutes, sansEnTetes) {
    return sansEnTetes ? lignesBrutes.length : lignesBrutes.length - 1;
}

async function validerLignes(lignesDonnees, session, modele, onProgression) {
    const motifs = {};
    const lignes = [];

    lignesDonnees.forEach((champs, index) => {
        const numeroLigne = index + (session.sansEnTetes ? 1 : 2);
        const valeurs = {};
        const erreursLigne = [];

        modele.colonnes.forEach((col) => {
            const idxFichier = session.mapping[col.cle];
            let valeur = idxFichier !== undefined ? (champs[idxFichier] || '').trim() : '';
            if (col.transformer) valeur = col.transformer(valeur);
            valeurs[col.cle] = valeur;

            const estVide = valeur === '' || valeur === null || valeur === undefined
                || (Array.isArray(valeur) && valeur.length === 0);

            if (col.obligatoire && estVide) {
                erreursLigne.push(`${col.libelle_modele} (obligatoire) absente ou vide`);
            } else if (!estVide && col.valider && !col.valider(valeur)) {
                erreursLigne.push(col.messageErreur ? col.messageErreur(valeur) : `${col.libelle_modele} invalide`);
            }
        });

        if (modele.validerLigne) {
            const erreurTransversale = modele.validerLigne(valeurs);
            if (erreurTransversale) erreursLigne.push(erreurTransversale);
        }

        erreursLigne.forEach((motif) => {
            if (!motifs[motif]) motifs[motif] = [];
            motifs[motif].push(numeroLigne);
        });

        lignes.push({ numeroLigne, valeurs, valide: erreursLigne.length === 0 });
        if (onProgression) onProgression(index + 1, lignesDonnees.length);
    });

    return { motifs, lignes };
}

function qualifierFichier({ accessible, entetesOk, motifs }) {
    if (!accessible) return '7.1';
    if (!entetesOk) return '7.2';
    if (Object.keys(motifs).length > 0) return '7.3';
    return '7.4';
}

async function importerReellement(lignesValides, modele, client, contextePersonnalise, onProgression) {
    const resultats = { crees: [], erreurs: [] };
    for (let i = 0; i < lignesValides.length; i++) {
        const ligne = lignesValides[i];
        const revalidation = modele.revaliderEnBase
            ? await modele.revaliderEnBase(ligne.valeurs, client, contextePersonnalise)
            : { ok: true };
        if (!revalidation.ok) {
            resultats.erreurs.push(`Ligne ${ligne.numeroLigne} : ${revalidation.motif}`);
        } else {
            try {
                const insere = await modele.inserer(ligne.valeurs, client, contextePersonnalise);
                resultats.crees.push(insere);
            } catch (err) {
                resultats.erreurs.push(`Ligne ${ligne.numeroLigne} : erreur serveur (${err.message})`);
            }
        }
        if (onProgression) onProgression(i + 1, lignesValides.length);
    }
    return resultats;
}

module.exports = {
    normaliserLibelle, parserCsv, detecterEtValiderEntetes,
    compterLignes, validerLignes, qualifierFichier, importerReellement,
};
