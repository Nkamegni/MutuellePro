// ===================================================================
// devis.js -- Le plus gros module : formulaire de devis complet
// (cascade Carrosserie -> Genre -> Etat -> Usage -> Categorie pour
// l'Auto), decodage VIN, simulateur, gestion des pieces jointes,
// generation du memo (WhatsApp + e-mail), brouillon auto-sauvegarde.
//
// CHARGE APRES dictionnaire-langues.js, ui-commun.js et agences.js
// (utilise agencesData, showToast, initTomSelect, translations).
//
// Extrait d'index.html le 25/08/2026.
// ===================================================================

    let heroFormIntendedBranch = null;


    // Change la branche sélectionnée dans le mini-formulaire du Hero
    // (Page 2) -- bascule l'affichage des 4 pastilles (Auto/Santé/
    // Habitation/Autres) et mémorise le choix dans heroFormIntendedBranch.
    function selectDevisRisk(value, customLabel = null, realBranchValue = null) {
        // Réinitialise les libellés personnalisés avant d'en appliquer un
        // nouveau, pour ne jamais laisser un ancien texte détourné en place.
        document.getElementById('label-risk-habitation').textContent = "Habitation";
        const autresLabel = document.getElementById('label-risk-autres');
        if (autresLabel) autresLabel.textContent = "Autres";

        if (value === 'Habitation' && customLabel) {
            document.getElementById('label-risk-habitation').textContent = customLabel;
        } else if (value === 'Autres' && customLabel && autresLabel) {
            autresLabel.textContent = customLabel;
        }

        heroFormIntendedBranch = realBranchValue;

        if(value === 'Auto') document.getElementById('radio-auto').checked = true;
        else if(value === 'Sante') document.getElementById('radio-sante').checked = true;
        else if(value === 'Habitation') document.getElementById('radio-habitation').checked = true;
        else if(value === 'Autres') document.getElementById('radio-autres').checked = true;
    }


    let carrosseriesData = [];

    let genresEtatsData = [];

    let genresUsagesData = [];

    let carrosserieCombinaisonsData = [];

    // Registre des instances Tom Select actives (par id d'élément). Un
    // <select> déjà "habillé" par Tom Select ne peut plus être repeuplé
    // via innerHTML directement — il faut détruire puis recréer
    // l'instance à chaque changement d'options (ex: Usage qui se filtre
    // selon le Genre choisi).

    async function loadListesReference() {
        const datalistConstructeurs = document.getElementById('constructeurs-datalist');
        const selectUnite = document.getElementById('auto_power_unit');
        const selectGenreAlias = document.getElementById('auto_genre_alias');

        try {
            const response = await fetch('/api/listes-reference');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            if (datalistConstructeurs && Array.isArray(data.constructeurs)) {
                datalistConstructeurs.innerHTML = data.constructeurs
                    .map((nom) => `<option value="${nom}">`).join('');
            }

            if (selectUnite && Array.isArray(data.unites_puissance)) {
                selectUnite.innerHTML = data.unites_puissance
                    .map((u) => `<option value="${u.code}">${u.code}</option>`).join('');
            }

            // Système Genre → État → Usage. "Genre" reste le terme affiché à
            // l'utilisateur ; en interne, le point d'entrée réel est la
            // Carrosserie (ce que l'agent observe sur le véhicule), qui
            // détermine le Genre canonique — voir échange du 09/08/2026.
            if (Array.isArray(data.carrosseries)) {
                carrosseriesData = data.carrosseries;
                if (selectGenreAlias) {
                    selectGenreAlias.innerHTML = '<option value="">-- Choisissez --</option>' +
                        carrosseriesData.map((c) => `<option value="${c.nom}">${c.nom}</option>`).join('') +
                        '<option value="__AUTRE__">Autre / Non listé</option>';
                    // create: false -- verrouille strictement la sélection à la liste
                    // proposée (empêche toute saisie libre qui contournerait le
                    // choix "Autre"). L'utilisateur peut chercher/filtrer, mais
                    // jamais valider une valeur qui n'est pas dans la liste.
                    initTomSelect('auto_genre_alias', { placeholder: 'Rechercher un genre...', create: false });
                }
            }
            if (Array.isArray(data.genres_etats)) {
                genresEtatsData = data.genres_etats;
            }
            if (Array.isArray(data.genres_usages)) {
                genresUsagesData = data.genres_usages;
            }
            if (Array.isArray(data.carrosserie_combinaisons)) {
                carrosserieCombinaisonsData = data.carrosserie_combinaisons;
            }

            // Compagnies partenaires — pilotables par l'administrateur du
            // site (actif, poids d'apparition) depuis le 15/08/2026, plus
            // besoin de modifier ce fichier pour ajuster la liste.
            if (Array.isArray(data.partenaires_assurance)) {
                COMPAGNIES_PARTENAIRES = data.partenaires_assurance.map((p) => ({
                    nom: p.nom, logo: p.logo_path, poids: p.poids_apparition,
                }));
                try { initPartnersBar(); } catch (e) { console.error('Erreur bande partenaires (ignorée) :', e); }
                try { initPartnersAnimation(); } catch (e) { console.error('Erreur animation partenaires (ignorée) :', e); }

                // Réajuste le nombre de copies du bandeau si l'écran change
                // (rotation mobile, redimensionnement de fenêtre) -- ajouté
                // le 25/08/2026, même principe anti-rebond que le reste du
                // site (200ms).
                let partnersBarResizeTimer = null;
                window.addEventListener('resize', () => {
                    clearTimeout(partnersBarResizeTimer);
                    partnersBarResizeTimer = setTimeout(() => {
                        try { initPartnersBar(); } catch (e) { console.error('Erreur réajustement bande partenaires (ignorée) :', e); }
                    }, 200);
                });
            }

            if (selectUnite) {
                initTomSelect('auto_power_unit', { placeholder: 'Unité', create: false });
            }

            console.log('✅ Listes de référence chargées depuis PostgreSQL.');
        } catch (err) {
            console.warn('⚠️ Impossible de charger /api/listes-reference, repli minimal :', err);
            // Repli minimal : au moins l'unité CV par défaut, pour que le
            // formulaire reste fonctionnel même sans base accessible.
            if (selectUnite) selectUnite.innerHTML = '<option value="CV">CV</option>';
        }
    }

    // Étape 1 → 2 : dès qu'un alias de Genre est choisi, résout le Genre
    // canonique, affiche l'État si cet alias en a un, puis filtre
    // immédiatement les options d'Usage (l'État ne les influence jamais).
    // Reconstruit le libellé final du Genre à partir de l'alias et de
    // l'État choisi (ex: "Pick-up" + "Avec" -> "Pick-up double cabine").
    // Règle générique : "Avec" ajoute le nom de l'État en minuscule,
    // "Sans" l'ajoute précédé de "sans", toute autre valeur (ex: Tonnage,
    // "Léger (< 3,5 t)") s'ajoute telle quelle.
    // Reconstruit le libellé final du Genre à partir de l'alias et de LA
    // LISTE des états actuellement choisis (ex: "Camion" + Double Cabine
    // "Avec" + Double Commande "Avec" -> "Camion double cabine, avec
    // double commande"). Chaque état suit la même règle : "Avec" ajoute
    // le nom en minuscule, "Sans" l'ajoute précédé de "sans", toute autre
    // valeur (ex: Tonnage) s'ajoute telle quelle.
    // Convention confirmée le 10/08/2026 :
    // - Un état "Sans" (valeur par défaut, non-existence) reste SILENCIEUX
    //   dans le libellé -- "Camion" seul veut déjà dire "sans double cabine,
    //   sans remorque". Seul un état "Avec" (existence, hors défaut) est
    //   mentionné, explicitement préfixé "avec".
    // - EXCEPTION Double Commande : toujours mentionné explicitement, dans
    //   les deux cas -- "Simple Commande" (Sans) ou "Double Commande" (Avec)
    //   -- car la distinction elle-même est structurante pour l'auto-école,
    //   jamais un simple détail secondaire comme les autres états.
    // Correction du 10/08/2026 : Double/Simple Commande ne se mentionne QUE
    // lorsque la Catégorie effectivement résolue est 07ARC ou 07SRC --
    // "Camion Simple Commande" n'existe nulle part ailleurs. Dans tous les
    // autres cas (02, 03, 06, 08...), c'est juste "Camion", peu importe la
    // valeur de Double Commande.

    function computeGenreFinal(alias, doubleCommandeValeur, categorieResolue, etatsChoisis) {
        const morceaux = [];
        const estCategorie07 = categorieResolue === '07ARC' || categorieResolue === '07SRC';

        if (doubleCommandeValeur && estCategorie07) {
            morceaux.push(doubleCommandeValeur === 'Avec' ? 'Double Commande' : 'Simple Commande');
        }

        (etatsChoisis || []).forEach(({ nom, valeur }) => {
            if (valeur === 'Avec') morceaux.push(`avec ${nom.toLowerCase()}`);
            // "Sans" -- silencieux, jamais mentionné (valeur par défaut).
        });

        return morceaux.length > 0 ? `${alias} ${morceaux.join(', ')}` : alias;
    }

    // Met à jour le champ caché (valeur transmise) et l'aperçu visible en
    // lisant Double Commande + la Catégorie déjà résolue (si applicable) +
    // tous les blocs État actuellement affichés (0, 1 ou plusieurs).

    function updateGenreFinalPreview() {
        const aliasSelect = document.getElementById('auto_genre_alias');
        const alias = aliasSelect ? aliasSelect.value : '';

        const dcWrapper = document.getElementById('auto_double_commande_wrapper');
        const dcVisible = dcWrapper && !dcWrapper.classList.contains('hidden');
        const dcValeur = dcVisible ? document.getElementById('auto_double_commande')?.value : null;

        const categorieResolue = document.getElementById('auto_categorie')?.value || null;

        const etatsChoisis = [];
        document.querySelectorAll('#auto_genre_etats_container [data-etat-select]').forEach((sel) => {
            if (sel.value) etatsChoisis.push({ nom: sel.dataset.etatNom, valeur: sel.value });
        });

        const final = alias ? computeGenreFinal(alias, dcValeur, categorieResolue, etatsChoisis) : '';

        const hiddenField = document.getElementById('auto_genre_final');
        if (hiddenField) hiddenField.value = final;

        const preview = document.getElementById('auto_genre_final_preview');
        const previewText = document.getElementById('auto_genre_final_text');
        if (preview && previewText) {
            if (final && final !== alias) {
                previewText.textContent = final;
                preview.classList.remove('hidden');
            } else {
                preview.classList.add('hidden');
            }
        }
    }


    // Déclenchée au choix d'une Carrosserie -- reconstruit le Genre final
    // (computeGenreFinal) et met à jour toute la suite de la cascade
    // (États, Usages, Catégorie).
    function handleGenreAliasChange() {
        const select = document.getElementById('auto_genre_alias');
        const alias = select ? select.value : '';
        const etatsContainer = document.getElementById('auto_genre_etats_container');
        const autreWrapper = document.getElementById('auto_genre_autre_wrapper');
        const autreInput = document.getElementById('auto_genre_autre');

        // Détruit toutes les instances Tom Select d'État précédentes avant
        // de reconstruire (nombre de blocs variable selon l'alias).
        Object.keys(tomSelectInstances)
            .filter((id) => id.startsWith('auto_genre_etat_'))
            .forEach((id) => { tomSelectInstances[id].destroy(); delete tomSelectInstances[id]; });
        if (etatsContainer) etatsContainer.innerHTML = '';

        // Réinitialise systématiquement Double Commande / Matière
        // inflammable — seront ré-affichés plus bas si applicables au
        // nouveau choix. Évite un état résiduel de la sélection précédente.
        currentCarrosserie = null;
        currentGenreCanonique = null;
        document.getElementById('auto_double_commande_wrapper')?.classList.add('hidden');
        document.getElementById('auto_matiere_inflammable_wrapper')?.classList.add('hidden');
        document.getElementById('auto_combinaison_exclue')?.classList.add('hidden');
        tomSelectInstances['auto_double_commande']?.destroy();
        delete tomSelectInstances['auto_double_commande'];
        tomSelectInstances['auto_matiere_inflammable']?.destroy();
        delete tomSelectInstances['auto_matiere_inflammable'];

        // Cas "Autre / Non listé" -- champ libre, pas de résolution
        // automatique d'Usage/Catégorie (genre inconnu du référentiel).
        if (alias === '__AUTRE__') {
            autreWrapper?.classList.remove('hidden');
            autreInput?.focus();
            updateUsageOptions(null);
            handleGenreAutreChange();
            return;
        }
        autreWrapper?.classList.add('hidden');
        if (autreInput) autreInput.value = '';

        const infoAlias = carrosseriesData.find((c) => c.nom === alias);

        if (!infoAlias) {
            updateUsageOptions(null);
            updateGenreFinalPreview();
            return;
        }

        // Génère un bloc indépendant par état applicable à cet alias
        // (0, 1 ou plusieurs — ex: Camion peut cumuler Double Cabine ET
        // Double Commande, deux dimensions jamais fusionnées).
        const etatsPourAlias = genresEtatsData.filter((e) => e.alias === alias);
        etatsPourAlias.forEach((etat, index) => {
            const blockId = `auto_genre_etat_${index}`;
            const block = document.createElement('div');
            block.innerHTML = `
                <label class="block text-[10px] font-semibold text-gray-500 mb-1">${etat.etat_nom}</label>
                <select id="${blockId}" data-etat-select data-etat-nom="${etat.etat_nom}" data-skip-memo="1" class="w-full px-3 py-2 text-xs border rounded-lg bg-white"></select>
            `;
            etatsContainer.appendChild(block);
            const selectEl = block.querySelector('select');
            selectEl.innerHTML = etat.etat_options.map((o) => `<option value="${o}">${o}</option>`).join('');
            // "Sans" par défaut pour les états binaires Avec/Sans (convention
            // du 10/08/2026 : la non-existence est la valeur par défaut).
            // Tonnage n'a pas de "non-existence" possible (le véhicule est
            // forcément l'un ou l'autre) -- reste donc à choisir explicitement.
            if (etat.etat_options.includes('Sans')) {
                selectEl.value = 'Sans';
            }
            selectEl.addEventListener('change', handleGenreEtatChange);
            initTomSelect(blockId, { placeholder: etat.etat_nom, create: false });
        });

        updateCombinaisonsEtUsage(alias, infoAlias.genre_canonique);
        updateGenreFinalPreview();
    }

    // Carrosserie et Genre canonique actuellement résolus -- mémorisés pour
    // que handleCombinaisonChange() (déclenché par Double Commande / Matière
    // inflammable) puisse recalculer l'Usage sans tout redemander.

    let currentCarrosserie = null;

    let currentGenreCanonique = null;

    // Double Commande et Matière inflammable (dérivée de la quantité) sont
    // les 2 SEULS états qui déterminent l'Usage. Règle confirmée le
    // 10/08/2026 : dès que Double Commande = Avec (véhicule d'auto-école),
    // Double Cabine, Tonnage, Remorque attachée ET Matière inflammable
    // deviennent tous inutiles — masqués, quelle que soit la carrosserie.

    function updateCombinaisonsEtUsage(carrosserie, genreCanonique) {
        currentCarrosserie = carrosserie;
        currentGenreCanonique = genreCanonique;

        const dcWrapper = document.getElementById('auto_double_commande_wrapper');
        const dcSelect = document.getElementById('auto_double_commande');
        const miWrapper = document.getElementById('auto_matiere_inflammable_wrapper');

        tomSelectInstances['auto_double_commande']?.destroy();
        delete tomSelectInstances['auto_double_commande'];

        const lignesPourCarrosserie = carrosserieCombinaisonsData.filter((c) => c.carrosserie === carrosserie);
        const besoinDC = lignesPourCarrosserie.some((l) => l.double_commande !== null);
        const besoinMI = lignesPourCarrosserie.some((l) => l.matiere_inflammable !== null);

        if (besoinDC) {
            // Libellés explicites dans les options elles-mêmes (pas juste
            // "Avec"/"Sans") -- exception confirmée le 10/08/2026 : Double
            // Commande se nomme toujours explicitement, jamais silencieux
            // même à sa valeur par défaut.
            dcSelect.innerHTML = '<option value="Sans">Simple Commande</option><option value="Avec">Double Commande</option>';
            dcSelect.value = 'Sans'; // valeur par défaut (non-existence)
            dcWrapper?.classList.remove('hidden');
            initTomSelect('auto_double_commande', { placeholder: 'Simple ou double commande ?', create: false });
        } else {
            dcWrapper?.classList.add('hidden');
        }

        // Mémorise si Matière inflammable est pertinente pour cette
        // carrosserie (indépendamment de l'état actuel de Double Commande) --
        // utilisé par applyMaskingDoubleCommande() ci-dessous.
        miWrapper.dataset.applicable = besoinMI ? '1' : '0';

        applyMaskingDoubleCommande();
        resolveUsageFromCombinaison();
    }

    // Cas 1 (confirmé 10/08/2026) : Double Commande = Avec masque Double
    // Cabine, Tonnage, Remorque attachée (états descriptifs génériques) ET
    // Matière inflammable -- inutiles pour un véhicule d'auto-école.

    function applyMaskingDoubleCommande() {
        const dcSelect = document.getElementById('auto_double_commande');
        const dcVisible = !document.getElementById('auto_double_commande_wrapper')?.classList.contains('hidden');
        const estAvec = dcVisible && dcSelect && dcSelect.value === 'Avec';

        const etatsContainer = document.getElementById('auto_genre_etats_container');
        if (etatsContainer) {
            etatsContainer.classList.toggle('hidden', estAvec);
            if (estAvec) {
                // Réinitialise les états masqués -- sinon une ancienne valeur
                // (ex: Double Cabine = "Avec") resterait invisible mais
                // active, polluant le libellé Genre reconstruit. Passe par
                // l'API Tom Select (pas juste .value) pour rester synchronisé
                // visuellement avec le widget affiché.
                etatsContainer.querySelectorAll('[data-etat-select]').forEach((sel) => {
                    tomSelectInstances[sel.id]?.setValue('', true) ?? (sel.value = '');
                });
                updateGenreFinalPreview();
            } else {
                // Ré-affichés : reviennent à "Sans" par défaut (convention du
                // 10/08/2026), pas vides -- sauf Tonnage, sans défaut possible.
                etatsContainer.querySelectorAll('[data-etat-select]').forEach((sel) => {
                    const aOptionSans = Array.from(sel.options).some((o) => o.value === 'Sans');
                    if (!sel.value && aOptionSans) {
                        tomSelectInstances[sel.id]?.setValue('Sans', true) ?? (sel.value = 'Sans');
                    }
                });
            }
        }

        const miWrapper = document.getElementById('auto_matiere_inflammable_wrapper');
        if (miWrapper) {
            const applicable = miWrapper.dataset.applicable === '1';
            miWrapper.classList.toggle('hidden', estAvec || !applicable);
            if (estAvec) {
                // Remet la quantité à 0 -- un véhicule d'auto-école n'a pas
                // vocation à transporter de matière inflammable.
                const qte = document.getElementById('auto_matiere_inflammable_quantite');
                if (qte) qte.value = '';
            }
        }
    }

    // Recalcule la liste d'Usage (ou le message d'exclusion) à chaque
    // changement de Double Commande / Quantité de matière inflammable.

    function resolveUsageFromCombinaison() {
        const exclueMsg = document.getElementById('auto_combinaison_exclue');
        exclueMsg?.classList.add('hidden');

        if (!currentCarrosserie) {
            updateUsageOptions(null);
            return;
        }

        applyMaskingDoubleCommande();

        const dcWrapper = document.getElementById('auto_double_commande_wrapper');
        const miWrapper = document.getElementById('auto_matiere_inflammable_wrapper');
        const dcVisible = dcWrapper && !dcWrapper.classList.contains('hidden');
        const miVisible = miWrapper && !miWrapper.classList.contains('hidden');
        // Double Commande a toujours une valeur (par défaut "Sans") dès que
        // le champ existe -- ne bloque donc plus jamais la résolution,
        // contrairement à avant. Idem pour Matière inflammable (dérivée de
        // la quantité, jamais vide).
        const dcValeur = dcVisible ? document.getElementById('auto_double_commande').value : null;

        // Matière inflammable dérivée de la quantité saisie -- vide ou 0 =
        // "Non", toute valeur positive = "Oui" (règle confirmée 10/08/2026).
        let miValeur = null;
        if (miVisible) {
            const quantite = parseFloat(document.getElementById('auto_matiere_inflammable_quantite')?.value);
            miValeur = (!isNaN(quantite) && quantite > 0) ? 'Oui' : 'Non';
        }

        const ligne = carrosserieCombinaisonsData.find((c) =>
            c.carrosserie === currentCarrosserie &&
            (c.double_commande || null) === (dcValeur || null) &&
            (c.matiere_inflammable || null) === (miValeur || null)
        );

        if (!ligne || ligne.codes_categorie === null) {
            exclueMsg?.classList.remove('hidden');
            updateUsageOptions(null);
            return;
        }

        updateUsageOptions(currentGenreCanonique, ligne.codes_categorie);
    }

    // Déclenché par les champs Double Commande / Matière inflammable.

    function handleCombinaisonChange() {
        resolveUsageFromCombinaison();
        saveFormDraft();
    }

    // Saisie libre pour "Autre / Non listé" -- alimente directement le
    // champ final (pas de reconstruction, pas de résolution de catégorie).

    function handleGenreAutreChange() {
        const autreInput = document.getElementById('auto_genre_autre');
        const hiddenField = document.getElementById('auto_genre_final');
        if (hiddenField) hiddenField.value = autreInput ? autreInput.value.trim() : '';
        saveFormDraft();
    }

    // Les États sont purement descriptifs — vérifié exhaustivement dans la
    // source pour Double Cabine/Tonnage : ils n'influencent jamais l'Usage
    // ni la Catégorie. Cette fonction reconstruit donc juste le libellé
    // affiché (en tenant compte de TOUS les états actifs), et sauvegarde.

    function handleGenreEtatChange() {
        updateGenreFinalPreview();
        saveFormDraft();
    }

    // Étape 2 → 3 : filtre les Usages possibles pour le Genre canonique
    // résolu, restreints en plus à `codesFiltre` quand fourni (résolu par
    // Double Commande / Matière inflammable — voir resolveUsageFromCombinaison).
    // Si un seul Usage existe et qu'il s'agit du cas "(aucune précision
    // nécessaire)", saute l'affichage du menu et résout directement la
    // Catégorie — comme spécifié.

    function updateUsageOptions(genreCanonique, codesFiltre = null) {
        const wrapper = document.getElementById('auto_usage_wrapper');
        const select = document.getElementById('auto_usage');
        const categorieField = document.getElementById('auto_categorie');

        if (!genreCanonique) {
            wrapper?.classList.add('hidden');
            tomSelectInstances['auto_usage']?.destroy();
            delete tomSelectInstances['auto_usage'];
            if (categorieField) categorieField.value = '';
            return;
        }

        let usagesPourCeGenre = genresUsagesData.filter((u) => u.genre_canonique === genreCanonique);
        if (Array.isArray(codesFiltre)) {
            usagesPourCeGenre = usagesPourCeGenre.filter((u) => codesFiltre.includes(u.code_categorie));
        }

        if (usagesPourCeGenre.length === 1 && usagesPourCeGenre[0].usage_libelle.startsWith('(aucune précision')) {
            // Un seul cas possible, rien à choisir — on résout directement.
            wrapper?.classList.add('hidden');
            tomSelectInstances['auto_usage']?.destroy();
            delete tomSelectInstances['auto_usage'];
            if (categorieField) categorieField.value = usagesPourCeGenre[0].code_categorie;
        } else {
            select.innerHTML = '<option value="">-- Choisissez --</option>' +
                usagesPourCeGenre.map((u) => `<option value="${u.code_categorie}">${u.usage_libelle}</option>`).join('');
            wrapper?.classList.remove('hidden');
            initTomSelect('auto_usage', { placeholder: 'Rechercher un usage...', create: false });
            if (categorieField) categorieField.value = ''; // en attente du choix de l'utilisateur
        }
        saveFormDraft();
    }


    // Dernier maillon de la cascade Carrosserie -> Genre -> État -> Usage
    // -> Catégorie : l'Usage choisi ici détermine la Catégorie CIMA finale
    // (voir resolveUsageFromCombinaison).
    function handleUsageChange() {
        const select = document.getElementById('auto_usage');
        const categorieField = document.getElementById('auto_categorie');
        if (categorieField) categorieField.value = select ? select.value : '';
        updateGenreFinalPreview(); // ex: "Camion" -> "Camion Simple Commande" si Usage devient 07SRC
        saveFormDraft();
    }


    // Ouvre la grande modale de devis (#devisModal), pré-remplit la
    // branche depuis heroFormIntendedBranch si définie.
    function openDevisModal() {
        // Lancée le plus tôt possible pour qu'elle ait le temps d'aboutir
        // avant que l'utilisateur ne soumette sa demande.
        resolveNearestAgencyForQuote();

        const heroPhone = document.getElementById('devis-phone') ? document.getElementById('devis-phone').value : '';
        if (heroPhone) {
            document.getElementById('modal_user_phone').value = heroPhone;
        }

        const selectedRadio = document.querySelector('input[name="risque"]:checked');
        const insuranceSelect = document.getElementById('insurance_type');

        // Priorité à la branche réellement visée (ex. Multirisque Pro via le
        // radio "Autres") — sinon, on retombe sur la valeur littérale du
        // radio physique coché, comme avant.
        const targetValue = heroFormIntendedBranch || (selectedRadio ? selectedRadio.value : null);

        if (targetValue && insuranceSelect) {
            const val = targetValue.toLowerCase();
            for (let option of insuranceSelect.options) {
                if (option.value.toLowerCase() === val) {
                    option.selected = true;
                    insuranceSelect.dispatchEvent(new Event('change'));
                    break;
                }
            }
        }

        const heroCity = document.getElementById('devis-city-select') ? document.getElementById('devis-city-select').value : '';
        if (heroCity && document.getElementById('modal_message')) {
            document.getElementById('modal_message').value = `Ville de résidence : ${heroCity}`;
        }

        goToStep1();
        const modal = document.getElementById('devisModal');
        if (modal) modal.classList.remove('hidden');
    }


    // Ferme #devisModal sans envoyer -- ne réinitialise pas le formulaire
    // (cf. saveFormDraft/restoreFormDraft, qui persistent la saisie).
    function closeDevisModal() {
        const modal = document.getElementById('devisModal');
        if (modal) modal.classList.add('hidden');
    }

    // -------------------------------------------------------------
    // DÉCLARATION DE SINISTRE -- fiche simplifiée (19/08/2026). Réutilise
    // le mécanisme de référence + envoi WhatsApp/email déjà éprouvé sur
    // le devis, mais en autonome (pas de dépendance à MEMO_I18N, pour ne
    // rien risquer de casser sur le flux devis existant). En attendant le
    // vrai système de comptes/tickets (Volet 2), cette référence reste le
    // seul moyen de suivi -- à conserver par le client.
    // -------------------------------------------------------------

    let step3UnlockedForBranch = null;


    const BADGE_ACTIVE = "flex-1 text-center py-1.5 px-3 rounded-lg font-bold bg-brandRed text-white transition-all";

    const BADGE_INACTIVE = "flex-1 text-center py-1.5 px-3 rounded-lg font-bold bg-white/10 text-gray-300 transition-all";

    const BADGE_LOCKED = "flex-1 text-center py-1.5 px-3 rounded-lg font-bold bg-white/5 text-gray-500 transition-all cursor-not-allowed opacity-60";

    const BADGE_UNLOCKED_INACTIVE = "flex-1 text-center py-1.5 px-3 rounded-lg font-bold bg-white/10 text-gray-300 transition-all cursor-pointer hover:bg-white/20";


    // Met à jour l'apparence du badge "Étape 3" (verrouillé/déverrouillé/
    // actif -- cf. BADGE_* ci-dessus) selon si la branche Auto a déjà
    // débloqué cette étape (step3UnlockedForBranch).
    function refreshStep3BadgeState() {
        const badge3 = document.getElementById('badgeStep3');
        if (!badge3) return;
        const insurance = document.getElementById('insurance_type').value;
        const unlocked = insurance && step3UnlockedForBranch === insurance;
        if (unlocked) {
            badge3.textContent = '3. Pièces & Envoi';
            if (badge3.className !== BADGE_ACTIVE) badge3.className = BADGE_UNLOCKED_INACTIVE;
        } else {
            badge3.innerHTML = '3. Pièces & Envoi <i class="fa-solid fa-lock text-[11px]"></i>';
            badge3.className = BADGE_LOCKED;
        }
    }

    // -----------------------------------------------------------------
    // PWA : enregistrement du service worker + invite d'installation.
    // Ajout pur — n'affecte aucune autre fonctionnalité du site. Le
    // bouton "Installer l'application" ne s'affiche que si le navigateur
    // propose réellement l'installation (Chrome/Edge/Android notamment ;
    // Safari iOS ne déclenche pas cet événement, le bouton y reste masqué).
    // -----------------------------------------------------------------

    let simBranch = null;


    const SIM_BRANCH_ICON = { Auto: 'fa-car', Sante: 'fa-heart-pulse', Habitation: 'fa-house', Voyage: 'fa-plane-departure', Rc: 'fa-shield-halved', MultirisquePro: 'fa-warehouse' };

    const SIM_BRANCH_I18N_KEY = { Auto: 'sim.branchAuto', Sante: 'sim.branchHealth', Habitation: 'sim.branchHome', Voyage: 'sim.branchTravel', Rc: 'sim.branchRc', MultirisquePro: 'sim.branchProMulti' };


    // Simulateur de prime (section #simulateur) -- étape 1 : choix de la
    // branche. Purement indicatif, aucun lien avec le vrai moteur de
    // tarification (session "tarification", schéma dédié).
    function simSelectBranch(value) {
        simBranch = value;
        document.getElementById('sim-step-1').classList.add('hidden');
        document.getElementById('sim-step-2').classList.remove('hidden');
    }


    // Simulateur -- étape 2 : choix du profil, calcule une fourchette de
    // prix indicative côté client (aucun appel serveur).
    function simSelectProfile(profile) {
        document.getElementById('sim-step-2').classList.add('hidden');
        document.getElementById('sim-step-3').classList.remove('hidden');

        const t = translations[currentLang] || translations.fr;
        const brancheTexte = t[SIM_BRANCH_I18N_KEY[simBranch]] || '';
        const iconeClasse = SIM_BRANCH_ICON[simBranch] || 'fa-shield-halved';

        const resultText = currentLang === 'en'
            ? `Perfect! For ${profile === 'particulier' ? 'an individual' : 'a business'} looking to insure: ${brancheTexte}, we recommend a personalized assessment with one of our advisors — it's quick, and there's no obligation.`
            : `Parfait ! Pour ${profile === 'particulier' ? 'un particulier' : 'un professionnel'} souhaitant assurer : ${brancheTexte}, nous vous recommandons une évaluation personnalisée avec l'un de nos conseillers — c'est rapide, et ça engage à rien.`;

        document.getElementById('sim-result-text').innerHTML = `<i class="fa-solid ${iconeClasse} text-brandPurple mr-1"></i> ${resultText}`;
    }


    // Simulateur -- bouton final : transmet la branche choisie au vrai
    // formulaire de devis (selectDevisRisk) et ouvre la modale.
    function simGoToDevis() {
        openDevisModal();
        // Léger délai pour laisser la modale s'ouvrir avant de présélectionner la branche
        setTimeout(() => {
            const select = document.getElementById('insurance_type');
            if (select && simBranch) {
                select.value = simBranch;
                select.dispatchEvent(new Event('change'));
            }
        }, 150);
    }


    // Réinitialise le simulateur à son état de départ (étape 1).
    function simReset() {
        document.getElementById('sim-step-3').classList.add('hidden');
        document.getElementById('sim-step-2').classList.add('hidden');
        document.getElementById('sim-step-1').classList.remove('hidden');
        simBranch = null;
    }


    // Tente de passer à l'étape 3 du devis (documents justificatifs) --
    // échoue silencieusement si step3UnlockedForBranch ne correspond pas
    // encore à la branche en cours.
    function tryGoToStep3() {
        const insurance = document.getElementById('insurance_type').value;
        if (!insurance || step3UnlockedForBranch !== insurance) {
            return; // verrouillé : passage obligé par l'étape 2 au moins une fois pour cette branche
        }
        goToStep3();
    }


    // Navigation manuelle du devis, étape 1 (choix du risque).
    function goToStep1() {
        document.getElementById('wizardStep1').classList.remove('hidden');
        document.getElementById('wizardStep2').classList.add('hidden');
        document.getElementById('wizardStep3').classList.add('hidden');
        document.getElementById('stepTitle').textContent = "Étape 1 : Identification";
        document.getElementById('badgeStep1').className = BADGE_ACTIVE;
        document.getElementById('badgeStep2').className = BADGE_INACTIVE;
        refreshStep3BadgeState();
    }


    // Navigation manuelle du devis, étape 2 (détails du risque -- la
    // cascade Carrosserie/Genre/État/Usage pour l'Auto).
    function goToStep2() {
        const name = document.getElementById('modal_user_name').value.trim();
        const phone = document.getElementById('modal_user_phone').value.trim();
        const insurance = document.getElementById('insurance_type').value;

        if (!name || !phone || !insurance) {
            showToast('Veuillez remplir tous les champs obligatoires (*) de l\'étape 1.', 'warning');
            return;
        }

        document.getElementById('wizardStep1').classList.add('hidden');
        document.getElementById('wizardStep2').classList.remove('hidden');
        document.getElementById('wizardStep3').classList.add('hidden');
        document.getElementById('stepTitle').textContent = "Étape 2 : Détails du Risque";
        document.getElementById('badgeStep1').className = BADGE_INACTIVE;
        document.getElementById('badgeStep2').className = BADGE_ACTIVE;
        refreshStep3BadgeState();

        document.querySelectorAll('.risk-section').forEach(sec => sec.classList.add('hidden'));
        const targetSection = document.getElementById(`fields-${insurance.toLowerCase()}`);
        if (targetSection) targetSection.classList.remove('hidden');
    }


    // Navigation manuelle du devis, étape 3 (documents justificatifs) --
    // n'est accessible que si refreshStep3BadgeState a débloqué le badge.
    function goToStep3() {
        const insurance = document.getElementById('insurance_type').value;
        if (!insurance) {
            showToast('Veuillez sélectionner une branche d\'assurance à l\'étape 1.', 'warning');
            return;
        }

        // Débloque (et confirme) l'accès à l'étape 3 pour cette branche.
        step3UnlockedForBranch = insurance;

        document.getElementById('wizardStep1').classList.add('hidden');
        document.getElementById('wizardStep2').classList.add('hidden');
        document.getElementById('wizardStep3').classList.remove('hidden');
        document.getElementById('stepTitle').textContent = "Étape 3 : Pièces & Envoi";
        document.getElementById('badgeStep1').className = BADGE_INACTIVE;
        document.getElementById('badgeStep2').className = BADGE_INACTIVE;
        refreshStep3BadgeState();
        document.getElementById('badgeStep3').className = BADGE_ACTIVE;
        document.getElementById('badgeStep3').textContent = '3. Pièces & Envoi';
    }

    // -----------------------------------------------------------------
    // RECHERCHE VIN APPROXIMATIVE — déclenchée quand le décodage exact
    // échoue. État partagé entre les fonctions ci-dessous.
    // -----------------------------------------------------------------

    let vinSearchResults = [];

    let vinSearchPage = 0;

    const VIN_SEARCH_PAGE_SIZE = 5;


    // Décodage VIN (async, appelle l'API vpic côté serveur) -- résultat
    // multiple possible (plusieurs véhicules correspondants), affiché via
    // vinSearchRenderPage pour que le client choisisse le bon.
    async function vinSearchCascade(vinPartiel) {
        try {
            const response = await fetch(`/api/vin/cascade/${encodeURIComponent(vinPartiel)}`);
            const data = await response.json();

            if (!data.trouve || !data.resultats || data.resultats.length === 0) {
                showToast('Aucun véhicule approchant trouvé dans notre catalogue, même en recherche élargie.\n\nVous pouvez continuer en renseignant les caractéristiques manuellement.', 'warning');
                return;
            }

            vinSearchResults = data.resultats;
            vinSearchPage = 0;

            const agrege = data.agrege || {};
            const summary = document.getElementById('vin-search-summary');
            if (summary) {
                const suggestion = [agrege.marque, agrege.modele].filter(Boolean).join(' ');
                summary.textContent = `${data.nb_references} véhicule(s) trouvé(s) (préfixe "${data.prefixe}", ${data.niveau_trouve} 1ers caractères)` +
                    (suggestion ? ` — Le plus probable : ${suggestion} (${agrege.marque_confiance || 0}% sur la marque)` : '') +
                    ' — choisissez ci-dessous, ou indiquez qu\'aucun ne correspond :';
            }

            vinSearchRenderPage();
            document.getElementById('vin-search-panel')?.classList.remove('hidden');
        } catch (err) {
            console.error('Erreur recherche cascade VIN:', err);
            showToast('Erreur lors de la recherche dans le catalogue. Réessayez, ou renseignez les caractéristiques manuellement.', 'error');
        }
    }


    // Affiche une page de résultats de vinSearchCascade (pagination, cf.
    // VIN_SEARCH_PAGE_SIZE).
    function vinSearchRenderPage() {
        const container = document.getElementById('vin-search-results');
        if (!container) return;

        const start = vinSearchPage * VIN_SEARCH_PAGE_SIZE;
        const pageItems = vinSearchResults.slice(start, start + VIN_SEARCH_PAGE_SIZE);

        container.innerHTML = pageItems.map((item, i) => {
            const idx = start + i;
            const hasConfiance = item.confiance_pct !== undefined && item.confiance_pct !== null;
            const estMeilleur = hasConfiance && item.confiance_pct >= 95;
            const badge = hasConfiance
                ? `<span class="ml-1 text-[10px] font-bold ${estMeilleur ? 'text-emerald-600' : 'text-gray-400'}">${item.confiance_pct}%</span>`
                : '';
            const styleCarte = estMeilleur
                ? 'border-emerald-400 bg-emerald-50 hover:border-emerald-500'
                : 'border-gray-300 bg-white hover:border-purple-500 hover:bg-purple-50';
            return `<button type="button" onclick="vinSearchSelect(${idx})" class="w-full flex items-center justify-between gap-2 text-left text-xs border-2 ${styleCarte} rounded-lg px-3 py-2.5 transition shadow-sm">
                <span>
                    <strong>${item.marque || '?'} ${item.modele || ''}</strong>${badge}<br>
                    <span class="text-gray-500 text-[10px]">${item.energie || '-'} · ${item.puissance || '-'} · VIN: ${item.vin}</span>
                </span>
                <span class="text-navy text-base shrink-0">›</span>
            </button>`;
        }).join('');

        const totalPages = Math.max(1, Math.ceil(vinSearchResults.length / VIN_SEARCH_PAGE_SIZE));
        const indicator = document.getElementById('vin-search-page-indicator');
        if (indicator) indicator.textContent = `Page ${vinSearchPage + 1} / ${totalPages}`;

        const prevBtn = document.getElementById('vin-search-prev');
        const nextBtn = document.getElementById('vin-search-next');
        if (prevBtn) prevBtn.disabled = vinSearchPage === 0;
        if (nextBtn) nextBtn.disabled = (start + VIN_SEARCH_PAGE_SIZE) >= vinSearchResults.length;
    }


    // Pagination des résultats de recherche VIN (page suivante/précédente).
    function vinSearchChangePage(delta) {
        vinSearchPage += delta;
        vinSearchRenderPage();
    }


    // Le client choisit un véhicule parmi les résultats VIN -- préremplit
    // Marque/Modèle/Genre dans la cascade du devis.
    function vinSearchSelect(idx) {
        const item = vinSearchResults[idx];
        if (!item) return;

        const vinField = document.getElementById('auto_vin');
        if (vinField && item.vin) vinField.value = item.vin;

        const marqueField = document.getElementById('auto_marque');
        if (marqueField && item.marque) marqueField.value = item.marque;

        const modeleField = document.getElementById('auto_modele');
        if (modeleField && item.modele) modeleField.value = item.modele;

        const energyField = document.getElementById('auto_energy');
        if (energyField && item.energie) {
            const optionExists = Array.from(energyField.options).some((o) => o.value === item.energie);
            energyField.value = optionExists ? item.energie : 'Autre / Non précisé';
        }

        if (item.puissance) {
            const match = String(item.puissance).match(/[\d.]+/);
            const powerValueField = document.getElementById('auto_power_value');
            const powerUnitField = document.getElementById('auto_power_unit');
            if (match && powerValueField) {
                powerValueField.value = match[0];
                if (powerUnitField) powerUnitField.value = 'CV';
            }
        }

        document.getElementById('vin-search-panel')?.classList.add('hidden');
        saveFormDraft();
    }


    // Aucun véhicule proposé ne correspond -- repli sur la saisie manuelle
    // complète de la cascade.
    function vinSearchRejectAll() {
        document.getElementById('vin-search-panel')?.classList.add('hidden');
        vinSearchResults = [];
    }

    // -----------------------------------------------------------------
    // NOTIFICATIONS TOAST — remplace alert(). Empilables, se referment
    // seules après quelques secondes ou au clic.
    // -----------------------------------------------------------------

    async function lookupVIN(evt) {
        const vinInput = document.getElementById('auto_vin');
        const vin = vinInput ? vinInput.value.trim().toUpperCase() : '';
        const btn = evt ? evt.target : event.target;

        if (!vin) {
            showToast(currentLang === 'en' ? 'Please enter a VIN / Chassis Number' : 'Veuillez renseigner un numéro de châssis', 'warning');
            return;
        }

        const originalLabel = btn.textContent;
        btn.disabled = true;
        btn.textContent = '...';

        try {
            const response = await fetch(`/api/vin/${vin}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            const data = await response.json();

            if (!data.valid) {
                // Le champ Notes n'est PAS modifié automatiquement ici. Si des
                // informations partielles existent, c'est à l'utilisateur de
                // décider s'il les prend (via confirmation explicite) ou non.
                const partial = data.partial_data;
                const hasPartial = partial && (partial.make || partial.model || partial.model_year);

                if (hasPartial) {
                    const summary = [partial.make, partial.model, partial.model_year].filter(Boolean).join(' / ');
                    const takeIt = await showConfirmDialog(
                        `VIN non validé : ${data.message || data.error || 'erreur inconnue'}\n\n` +
                        `Informations partielles trouvées (non fiables, à vérifier) : ${summary}\n\n` +
                        `Voulez-vous les ajouter aux Notes malgré tout, pour vérification manuelle ?`
                    );
                    if (takeIt) {
                        const notesField = document.getElementById('modal_message');
                        if (notesField) {
                            const vinBlock = `[VIN] VIN: ${vin}; Marque: ${partial.make || '-'}; Modèle: ${partial.model || '-'}; Année: ${partial.model_year || '-'}; Statut: PARTIEL / NON VALIDÉ — à vérifier manuellement [/VIN]`;
                            const blockRegexNew = /\[VIN\][\s\S]*?\[\/VIN\]\n?/g;
                            const blockRegexOld = /\[DONNÉES VIN[\s\S]*?\[FIN DONNÉES VIN\]\n?/g;
                            const freeText = notesField.value
                                .replace(blockRegexNew, '')
                                .replace(blockRegexOld, '')
                                .trim();
                            notesField.value = freeText ? `${vinBlock}\n\n${freeText}` : vinBlock;
                            saveFormDraft();
                        }
                    }
                } else {
                    // Ce message de format invalide (I/O/Q, mauvaise longueur...) est
                    // volontairement conservé pour pousser à la vigilance — mais on
                    // propose maintenant une porte de sortie : chercher quand même
                    // dans notre catalogue camerounais, plutôt que de bloquer sec.
                    const chercherQuandMeme = await showConfirmDialog(
                        'VIN invalide ou non reconnu : ' + (data.message || data.error || 'erreur inconnue') +
                        '\n\n(Base centrée sur le marché nord-américain — les véhicules d\'origine européenne/chinoise sont parfois mal reconnus. Vérifiez bien votre saisie.)' +
                        '\n\nVoulez-vous que nous recherchions quand même des véhicules approchants dans notre catalogue local ?'
                    );
                    if (chercherQuandMeme) {
                        await vinSearchCascade(vin);
                    }
                }
                return;
            }

            // Remplissage automatique des champs disponibles
            const marqueField = document.getElementById('auto_marque');
            if (marqueField && data.make) marqueField.value = data.make;

            const modeleField = document.getElementById('auto_modele');
            if (modeleField && data.model) modeleField.value = data.model;

            const fuelFr = translateFuelType(data.engine && data.engine.fuel_type) ||
                (data.catalogue && data.catalogue.energie) || ''; // repli catalogue : déjà en français, aucune traduction nécessaire
            const energyField = document.getElementById('auto_energy');
            if (energyField && fuelFr) {
                const optionExists = Array.from(energyField.options).some((o) => o.value === fuelFr);
                energyField.value = optionExists ? fuelFr : 'Autre / Non précisé';
            }

            const valueField = document.getElementById('auto_value') || document.querySelector('[name="auto_value"]');
            if (valueField) {
                valueField.placeholder = `${data.make} ${data.model} ${data.model_year}${data.trim ? ' - ' + data.trim : ''}`;
            }

            // Puissance (CV fiscaux) — priorité à la vraie valeur du catalogue
            // Cameroun (exacte, pas une estimation) ; à défaut, on retombe sur
            // l'ancienne estimation à partir de la puissance HP (vPIC, base US).
            // Toujours en CV (fiscaux) dans les deux cas — l'unité est donc
            // fixée explicitement, seule la valeur numérique change.
            const powerValueField = document.getElementById('auto_power_value');
            const powerUnitField = document.getElementById('auto_power_unit');
            if (powerValueField && data.catalogue && data.catalogue.puissance_fiscale_cv) {
                // La valeur peut arriver sous forme "11 CV" (texte) — on extrait
                // juste le nombre pour le champ numérique.
                const numericMatch = String(data.catalogue.puissance_fiscale_cv).match(/[\d.]+/);
                if (numericMatch) {
                    powerValueField.value = numericMatch[0];
                    if (powerUnitField) powerUnitField.value = 'CV';
                }
            } else if (powerValueField && data.engine && data.engine.horsepower_from) {
                const estimatedCV = hpToFiscalCV(data.engine.horsepower_from, data.make, data.model, data.model_year);
                if (estimatedCV) {
                    powerValueField.value = estimatedCV;
                    if (powerUnitField) powerUnitField.value = 'CV';
                }
            }

            // Ajout des informations extraites dans "Notes / Précisions complémentaires"
            // sans écraser le texte libre déjà saisi, et sans créer de doublon si l'on
            // clique plusieurs fois ou si l'on change de VIN.
            // Format : [VIN] champ: valeur; champ: valeur; ... [/VIN] — une seule ligne,
            // séparateurs ";", pour rester robuste en cas de réutilisation (CRM, email).
            const notesField = document.getElementById('modal_message');
            if (notesField) {
                const gvwrNote = data.weight_class
                    ? `${data.weight_class.gvwr_from || '?'} à ${data.weight_class.gvwr_to || '?'} (plage réglementaire US, pas un poids exact)`
                    : 'non disponible';
                const dispL = data.engine && data.engine.displacement_l ? parseFloat(data.engine.displacement_l).toFixed(1) + 'L' : '-';
                const transText = data.transmission ? `${data.transmission.style || '-'} ${data.transmission.speeds ? '- ' + data.transmission.speeds + ' vitesses' : ''}`.trim() : '-';
                const plantText = data.plant ? [data.plant.city, data.plant.state, data.plant.country].filter(Boolean).join(', ') : '-';

                const vinBlock = `[VIN] VIN: ${data.vin}; Marque: ${data.make || '-'}; Modèle: ${data.model || '-'}; Année: ${data.model_year || '-'}${data.trim ? '; Version: ' + data.trim : ''}; Type: ${data.vehicle_type || '-'}; Carrosserie: ${data.body_class || '-'}; Portes: ${data.doors || '?'}; Moteur: ${data.engine && data.engine.cylinders ? data.engine.cylinders + ' cyl.' : '-'} ${dispL}; Carburant: ${fuelFr || '-'}; Transmission: ${transText}; Poids (GVWR): ${gvwrNote}; Usine: ${plantText} [/VIN]`;

                // On retire tout bloc VIN précédent (ancien ou nouveau format) avant
                // d'insérer le nouveau, pour ne jamais créer de doublon.
                const blockRegexNew = /\[VIN\][\s\S]*?\[\/VIN\]\n?/g;
                const blockRegexOld = /\[DONNÉES VIN[\s\S]*?\[FIN DONNÉES VIN\]\n?/g;
                const freeText = notesField.value
                    .replace(blockRegexNew, '')
                    .replace(blockRegexOld, '')
                    .trim();

                notesField.value = freeText
                    ? `${vinBlock}\n\n${freeText}`
                    : vinBlock;

                saveFormDraft(); // on met à jour la sauvegarde immédiatement
            }

            // Message de confirmation robuste : n'affiche jamais "null" pour un
            // champ manquant (fréquent quand la donnée vient du catalogue
            // Cameroun, qui ne renseigne pas body_class/doors) — on omet
            // simplement la partie concernée plutôt que de l'afficher vide.
            const summaryParts = [];
            if (data.body_class) summaryParts.push(data.body_class);
            if (data.doors) summaryParts.push(`${data.doors} portes`);
            if (fuelFr) summaryParts.push(fuelFr);
            const summaryText = summaryParts.length ? ` — ${summaryParts.join(', ')}` : '';

            // Transparence sur l'origine des données, utile depuis la fusion
            // du catalogue Cameroun (rassure l'agent sur la fiabilité).
            const sourceNote = data.source === 'catalogue' ? ' [source : catalogue Cameroun]'
                : data.source === 'vpic+catalogue' ? ' [vPIC + catalogue Cameroun]'
                : '';

            showToast(`VIN décodé : ${data.make} ${data.model} (${data.model_year})${summaryText}${sourceNote}`, 'success');
        } catch (err) {
            console.error(err);
            showToast("Impossible de contacter le service de décodage VIN. Vérifiez que l'API est bien démarrée (PM2).", 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = originalLabel;
        }
    }

    // -----------------------------------------------------------------
    // Traduction des types de carburant (vPIC, anglais US) → français local
    // "Gasoline" (anglais US) = Essence — jamais du Diesel/Gasoil.
    // "Diesel" est ici explicité "Diesel (Gasoil)" car chez nous les deux
    // termes sont souvent utilisés de façon interchangeable.
    // -----------------------------------------------------------------

    const MAX_FILE_SIZE_MB = 15;

    const TOTAL_SIZE_WARNING_MB = 20;


    // Somme la taille de toutes les pièces jointes actuellement
    // sélectionnées (cf. TOTAL_SIZE_WARNING_MB pour le seuil d'alerte).
    function getTotalDocsSizeMB() {
        let totalBytes = 0;
        document.querySelectorAll('.doc-upload').forEach((input) => {
            if (input.files && input.files.length > 0) totalBytes += input.files[0].size;
        });
        return totalBytes / 1024 / 1024;
    }

    // Vérification proactive avant tout envoi d'email : prévient l'échec
    // plutôt que de laisser l'utilisateur découvrir un message d'erreur
    // technique après coup. Laisse le choix de continuer quand même (le
    // reste du message part, seules les pièces jointes échoueront) ou
    // d'annuler pour retirer/réduire des pièces d'abord.

    async function warnIfAttachmentsTooLarge() {
        const totalMB = getTotalDocsSizeMB();
        if (totalMB <= TOTAL_SIZE_WARNING_MB) return true;
        return await showConfirmDialog(
            `Vos pièces jointes pèsent environ ${totalMB.toFixed(1)} Mo au total, au-dessus du seuil recommandé de ${TOTAL_SIZE_WARNING_MB} Mo — certains serveurs de messagerie peuvent refuser un message aussi volumineux.\n\n` +
            `Le mémo WhatsApp n'est pas concerné par cette limite.\n\n` +
            `Continuer quand même ?`
        );
    }

    // Traduit les erreurs techniques d'envoi email en messages compréhensibles,
    // avec la vraie cause quand elle est connue (ex. taille des pièces).

    async function sendQuoteEmail(form, cc, recipientOverride) {
        const formData = new FormData(form);
        const ccString = Array.isArray(cc) ? cc.filter(Boolean).join(',') : cc;
        if (ccString) formData.append('cc', ccString);
        if (recipientOverride) formData.append('recipient', recipientOverride);

        const response = await fetch('/api/send-quote-email', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const err = new Error('Échec de l\'envoi de l\'email.');
            err.status = response.status;
            try {
                const body = await response.json();
                if (body && body.error) err.message = body.error;
            } catch (e) { /* réponse non-JSON, on garde le message par défaut */ }
            throw err;
        }
        return response.json();
    }


    // Écouteur sur chaque champ d'upload de document -- valide la taille
    // (compressImageFile si besoin, cf. ui-commun.js), met à jour
    // updateDocSummary.
    async function handleDocUploadChange(evt) {
        const input = evt.target;
        if (!input.files || input.files.length === 0) return;

        // Sélection groupée recto+verso : si ce champ est un "recto" relié à
        // un champ "verso" (data-pair-verso) et que l'utilisateur a
        // sélectionné exactement 2 fichiers d'un coup, le 1er reste ici, le
        // 2nd est transféré automatiquement vers le champ verso associé.
        if (input.files.length === 2 && input.dataset.pairVerso) {
            const versoInput = document.querySelector(`[data-doc-key="${input.dataset.pairVerso}"]`);
            if (versoInput) {
                const secondFile = input.files[1];
                const dtRecto = new DataTransfer();
                dtRecto.items.add(input.files[0]);
                input.files = dtRecto.files;

                const dtVerso = new DataTransfer();
                dtVerso.items.add(secondFile);
                versoInput.files = dtVerso.files;
                // Déclenche le traitement (compression, affichage) du verso
                // exactement comme s'il avait été choisi séparément.
                versoInput.dispatchEvent(new Event('change'));
            }
        } else if (input.files.length > 2) {
            showToast(`"${input.dataset.docLabel}" : vous avez sélectionné ${input.files.length} fichiers, mais seuls 2 maximum sont acceptés ici (recto + verso). Seul le premier sera conservé.`, 'warning');
            const dt = new DataTransfer();
            dt.items.add(input.files[0]);
            input.files = dt.files;
        }

        const original = input.files[0];
        const summary = document.getElementById('doc-summary');
        if (summary) {
            summary.classList.remove('hidden');
            summary.textContent = `⏳ Compression de "${input.dataset.docLabel}" en cours...`;
        }

        const compressed = await compressImageFile(original);
        // input → bouton déclencheur → fileRow (dans cet ordre exact,
        // voir initDocClearButtons) — on saute donc un cran de plus
        // qu'avant pour atteindre la ligne 2.
        const fileRow = input.nextElementSibling ? input.nextElementSibling.nextElementSibling : null;

        // Rejet si, même après compression, le fichier dépasse la limite
        // réelle du serveur (15 Mo, voir MAX_FILE_SIZE_MB) — évite un échec
        // silencieux au moment de l'envoi, bien plus tard dans le parcours.
        if (compressed.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            showToast(`"${input.dataset.docLabel}" est trop volumineux (${(compressed.size / 1024 / 1024).toFixed(1)} Mo, même après compression) — la limite est de ${MAX_FILE_SIZE_MB} Mo par pièce. Choisissez un fichier plus léger, ou une photo plutôt qu'un scan haute résolution.`, 'error');
            input.value = '';
            if (fileRow) fileRow.classList.add('hidden');
            updateDocSummary();
            return;
        }

        if (compressed !== original) {
            // Remplace le fichier sélectionné par la version compressée
            // (un <input type="file"> ne peut être réassigné directement :
            // on passe par un DataTransfer, seule méthode standard).
            const dt = new DataTransfer();
            dt.items.add(compressed);
            input.files = dt.files;

            const beforeKB = (original.size / 1024).toFixed(0);
            const afterKB = (compressed.size / 1024).toFixed(0);
            console.log(`📎 ${input.dataset.docLabel} compressé : ${beforeKB} Ko → ${afterKB} Ko`);
        }

        // Révèle la ligne 2 (croix + nom du fichier) — jamais affiché deux
        // fois : c'est la SEULE zone où le nom apparaît, plus rien à côté
        // du bouton lui-même (dont le texte natif est rendu invisible).
        if (fileRow) {
            const filenameSpan = fileRow.querySelector('.doc-filename');
            if (filenameSpan) filenameSpan.textContent = input.files[0].name;
            fileRow.classList.remove('hidden');
        }

        updateDocSummary();
    }

    // Restructure chaque champ de pièce jointe en 2 lignes, conformément à
    // la maquette validée :
    //   Ligne 1 : uniquement le bouton "Choisir un fichier", aligné à droite
    //             (le nom natif du navigateur est rendu invisible ici pour
    //             ne JAMAIS l'afficher en double avec la ligne 2)
    //   Ligne 2 : n'apparaît qu'une fois un fichier choisi — grosse croix
    //             de suppression (colonne gauche, bien visible, PAS discrète)
    //             + nom du fichier (colonne droite)

    function initDocClearButtons() {
        document.querySelectorAll('.doc-upload').forEach((input) => {
            if (input.dataset.restructured) return; // déjà fait
            input.dataset.restructured = '1';

            // Masque COMPLÈTEMENT l'input natif (sr-only : invisible mais
            // toujours fonctionnel et accessible) plutôt que de tenter de
            // rendre son texte transparent — cette dernière méthode ne
            // fonctionne pas de façon fiable sur tous les sélecteurs de
            // fichiers mobiles, d'où le nom de fichier qui apparaissait
            // encore en double. Un bouton 100% personnalisé déclenche
            // l'input via JS : plus aucun rendu natif ne peut interférer.
            input.classList.add('sr-only');

            const triggerBtn = document.createElement('button');
            triggerBtn.type = 'button';
            triggerBtn.className = 'doc-trigger-btn block ml-auto bg-brandPurple hover:bg-purple-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition';
            triggerBtn.textContent = 'Choisir un fichier';
            triggerBtn.addEventListener('click', () => input.click());

            const fileRow = document.createElement('div');
            fileRow.className = 'doc-file-row hidden grid grid-cols-[auto_1fr] gap-2 items-center mt-1.5';

            const clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.className = 'text-red-600 hover:text-red-800 text-2xl leading-none shrink-0 transition';
            clearBtn.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
            clearBtn.setAttribute('aria-label', 'Retirer ce fichier');
            clearBtn.title = 'Retirer ce fichier';

            const filenameSpan = document.createElement('span');
            filenameSpan.className = 'doc-filename text-[10px] text-emerald-700 font-semibold truncate text-left';

            clearBtn.addEventListener('click', () => {
                input.value = '';
                fileRow.classList.add('hidden');
                filenameSpan.textContent = '';
                updateDocSummary();
            });

            fileRow.appendChild(clearBtn);
            fileRow.appendChild(filenameSpan);
            input.insertAdjacentElement('afterend', triggerBtn);
            triggerBtn.insertAdjacentElement('afterend', fileRow);
        });
    }


    // Retourne la liste des documents effectivement sélectionnés (nom +
    // fichier), utilisée à la fois pour l'affichage et pour la
    // construction du mémo WhatsApp/e-mail.
    function getSelectedDocuments() {
        const docs = [];
        document.querySelectorAll('.doc-upload').forEach((input) => {
            if (input.files && input.files.length > 0) {
                docs.push({
                    label: input.dataset.docLabel || input.dataset.docKey,
                    fileName: input.files[0].name,
                });
            }
        });
        return docs;
    }


    // Rafraîchit le résumé visuel ("3 documents sélectionnés", etc.)
    // au-dessus du formulaire.
    function updateDocSummary() {
        const summary = document.getElementById('doc-summary');
        if (!summary) return;
        const docs = getSelectedDocuments();
        if (docs.length === 0) {
            summary.classList.add('hidden');
            summary.textContent = '';
            return;
        }
        const totalMB = getTotalDocsSizeMB();
        const overLimit = totalMB > TOTAL_SIZE_WARNING_MB;
        summary.classList.remove('hidden');
        summary.className = `text-[10px] font-semibold ${overLimit ? 'text-amber-600' : 'text-emerald-700'}`;
        const sizeNote = overLimit
            ? ` — ~${totalMB.toFixed(1)} Mo (au-dessus du seuil recommandé de ${TOTAL_SIZE_WARNING_MB} Mo)`
            : ` — ~${(totalMB * 1024).toFixed(0)} Ko`;
        summary.textContent = `${docs.length} pièce(s) prête(s) : ${docs.map(d => d.label).join(', ')}${sizeNote}`;
    }

    // Référence de dossier lisible, générée une seule fois par ouverture de
    // la modale, réutilisée par le mémo WhatsApp ET le mémo archivé (PDF)
    // pour qu'ils portent exactement la même référence.

    let currentQuoteRef = null;


    // Référence de devis générée côté client (préfixe + horodatage) --
    // contrairement à sinistre.js, le devis n'est pas encore raccordé au
    // système de tickets (POST /api/tickets, session myspace.html) --
    // volontairement, le sinistre sert de pilote avant le devis.
    function generateQuoteRef() {
        const insuranceSelect = document.getElementById('insurance_type');
        const branchCode = insuranceSelect && insuranceSelect.value ? insuranceSelect.value.toUpperCase() : 'DEVIS';
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
        return `${branchCode}-${stamp}`;
    }

    // -----------------------------------------------------------------
    // Envoi de la demande de cotation par WhatsApp à l'agence la plus proche
    // (déterminée via resolveNearestAgencyForQuote), avec repli automatique
    // sur le siège si la géolocalisation échoue ou est refusée.
    //
    // Présenté comme un mémo — clair, structuré, mais volontairement FUN
    // (émoticônes) plutôt qu'austère : c'est le premier tour d'une
    // conversation, pas un export de données. Le destinataire est nommé
    // explicitement (le numéro WhatsApp d'une agence peut être réaffecté),
    // et deux questions concrètes sont posées pour amorcer un vrai échange
    // plutôt qu'un message qui reste sans réponse.
    // -----------------------------------------------------------------
    // -----------------------------------------------------------------
    // TEXTES FIXES DU MÉMO (WhatsApp + email) — bilingue, ajouté le
    // 13/08/2026. Séparé du dictionnaire `translations` général (qui
    // gère l'affichage du site) car ce contenu est généré dynamiquement
    // dans des chaînes JS, pas posé directement dans le HTML.
    // Principe rappelé par Roger : le mémo suit la langue choisie par le
    // VISITEUR sur le site (currentLang) — le rédacteur doit comprendre
    // ce qu'il envoie, le destinataire est libre de répondre dans la
    // langue de son interlocuteur.
    // -----------------------------------------------------------------

    const MEMO_I18N = {
        fr: {
            locale: 'fr-FR',
            greetingMorning: 'Bonjour', greetingEvening: 'Bonsoir',
            defaultInsurance: 'assurance', defaultInsuranceCap: 'Assurance', defaultName: 'un client',
            waTitle: '📄✨ *MÉMO DE COTATION* — MutuellePro ✨📄',
            waRef: '🆔 Réf. :', waFor: '📍 Pour :',
            waIntro: (greeting, branche) => `${greeting} 👋 Voici ma demande de devis *${branche}* — tout est ci-dessous pour éviter les allers-retours 😊`,
            waClient: '👤 *CLIENT*',
            waDetails: '🔎 *DÉTAILS DU RISQUE*', waNotes: '📝 *NOTES*',
            waDocsTitle: '📎 *PIÈCES À JOINDRE DANS CETTE CONVERSATION*',
            waDocsHint: '_(à joindre juste après ce message, WhatsApp ne permet pas l\'envoi automatique)_',
            waAskQuality: '❓ Pouvez-vous me confirmer si les pièces jointes sont de bonne qualité et exploitables ?',
            waAskAck: '✅ Merci d\'accuser réception de ce message dès que possible 🙏',
            waArchived: (ref) => `📌 Ce mémo (Réf. ${ref}) est archivé de mon côté — je reste disponible pour la suite !`,
            memoTitlePrefix: 'MÉMO - DEMANDE COTATION -',
            introWithVin: (branche, vin) => `Bien vouloir recevoir ma demande de devis ${branche} pour mon véhicule immatriculé ${vin}.`,
            introSansVin: (branche) => `Bien vouloir recevoir ma demande de devis ${branche}.`,
            from: 'De :', to: 'À : MutuellePro Assurance –', date: 'Date :', ref: 'Référence :',
            objet: 'Objet : Demande de cotation', risque: 'Risque :',
            greeting: 'Bonjour,', detailsBelow: 'Pour les détails, tout est ci-dessous.',
            clientSection: '--- CLIENT ---', nom: 'Nom :', tel: 'Téléphone :', branche: 'Branche :',
            detailsSection: '--- DÉTAILS DU RISQUE ---', notesSection: '--- NOTES ---',
            docsSection: '--- PIÈCES JUSTIFICATIVES ---', noDocs: 'Aucune pièce sélectionnée.',
            autoGenerated: (ref) => `Document généré automatiquement par mutuellepro.cm — Réf. ${ref}`,
            archiveClient: 'Client', archiveDetails: 'Détails du risque', archiveNotes: 'Notes',
            archiveDocs: 'Pièces justificatives', archiveNoDocs: 'Aucune pièce jointe sélectionnée au moment de l\'archivage.',
            archiveFooter: 'Document généré automatiquement par mutuellepro.cm — à conserver comme trace de votre demande.',
            archiveFooter2: 'Ce mémo ne remplace pas une confirmation officielle de l\'agence.',
            archivePrint: '🖨️ Imprimer / Enregistrer en PDF',
            tableFrom: 'De', tableTo: 'À', tableDate: 'Date', tableRef: 'Référence', tableObjet: 'Objet', tableRisque: 'Risque',
            tableObjetValue: 'Demande de cotation',
        },
        en: {
            locale: 'en-US',
            greetingMorning: 'Good morning', greetingEvening: 'Good evening',
            defaultInsurance: 'insurance', defaultInsuranceCap: 'Insurance', defaultName: 'a client',
            waTitle: '📄✨ *QUOTE REQUEST MEMO* — MutuellePro ✨📄',
            waRef: '🆔 Ref.:', waFor: '📍 For:',
            waIntro: (greeting, branche) => `${greeting} 👋 Here is my *${branche}* quote request — everything is below to avoid back-and-forth 😊`,
            waClient: '👤 *CLIENT*',
            waDetails: '🔎 *RISK DETAILS*', waNotes: '📝 *NOTES*',
            waDocsTitle: '📎 *DOCUMENTS TO ATTACH IN THIS CONVERSATION*',
            waDocsHint: '_(to attach right after this message — WhatsApp does not support automatic sending)_',
            waAskQuality: '❓ Could you confirm the attached documents are clear and usable?',
            waAskAck: '✅ Please confirm receipt of this message as soon as possible 🙏',
            waArchived: (ref) => `📌 This memo (Ref. ${ref}) is archived on my end — I remain available for next steps!`,
            memoTitlePrefix: 'MEMO - QUOTE REQUEST -',
            introWithVin: (branche, vin) => `Please find my ${branche} quote request for my vehicle registered ${vin}.`,
            introSansVin: (branche) => `Please find my ${branche} quote request.`,
            from: 'From:', to: 'To: MutuellePro Assurance –', date: 'Date:', ref: 'Reference:',
            objet: 'Subject: Quote Request', risque: 'Risk:',
            greeting: 'Hello,', detailsBelow: 'Details are below.',
            clientSection: '--- CLIENT ---', nom: 'Name:', tel: 'Phone:', branche: 'Branch:',
            detailsSection: '--- RISK DETAILS ---', notesSection: '--- NOTES ---',
            docsSection: '--- SUPPORTING DOCUMENTS ---', noDocs: 'No documents selected.',
            autoGenerated: (ref) => `Document automatically generated by mutuellepro.cm — Ref. ${ref}`,
            archiveClient: 'Client', archiveDetails: 'Risk Details', archiveNotes: 'Notes',
            archiveDocs: 'Supporting Documents', archiveNoDocs: 'No documents were selected at the time of archiving.',
            archiveFooter: 'Document automatically generated by mutuellepro.cm — keep this as a record of your request.',
            archiveFooter2: 'This memo does not replace an official confirmation from the agency.',
            archivePrint: '🖨️ Print / Save as PDF',
            tableFrom: 'From', tableTo: 'To', tableDate: 'Date', tableRef: 'Reference', tableObjet: 'Subject', tableRisque: 'Risk',
            tableObjetValue: 'Quote Request',
        },
    };

    // Raccourci vers MEMO_I18N[currentLang] (déclaré dans
    // dictionnaire-langues.js) -- centralise le repli sur 'fr' si la
    // langue active n'a pas de traduction dédiée au mémo.
    function memoT() {
        return MEMO_I18N[currentLang] || MEMO_I18N.fr;
    }


    // "Bonjour"/"Bonsoir" selon l'heure locale, utilisé en tête du
    // message WhatsApp du devis.
    function greetingByTime() {
        const h = new Date().getHours();
        const t = memoT();
        return h < 18 ? t.greetingMorning : t.greetingEvening;
    }


    // Construit le texte complet du message WhatsApp de devis (bilingue,
    // cf. MEMO_I18N) -- distinct de sinistre.js, qui a son propre
    // générateur (SINISTRE_I18N) pour ne jamais risquer de casser l'un en
    // modifiant l'autre.
    function buildWhatsAppMessage(agence, ref) {
        const t = memoT();
        const get = (id) => {
            const el = document.getElementById(id);
            return el ? el.value.trim() : '';
        };

        const insuranceSelect = document.getElementById('insurance_type');
        const insuranceLabel = insuranceSelect && insuranceSelect.selectedIndex >= 0
            ? insuranceSelect.options[insuranceSelect.selectedIndex].text.replace(/^\d+\.\s*/, '')
            : t.defaultInsurance;

        const nom = get('modal_user_name') || t.defaultName;
        const telephone = `${get('modal_phone_prefix')}${get('modal_user_phone')}`;

        const now = new Date();
        const dateStr = now.toLocaleDateString(t.locale, { day: '2-digit', month: 'long', year: 'numeric' });
        const timeStr = now.toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' });

        const SEP = '┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈';

        const details = [];
        const activeSection = document.querySelector('.risk-section:not(.hidden)');
        if (activeSection) {
            activeSection.querySelectorAll('input, select, textarea').forEach((field) => {
                if (field.dataset.skipMemo) return; // ex: alias/état bruts — remplacés par le libellé Genre reconstruit
                if (field.type === 'hidden' && !field.dataset.showInMemo) return; // ex: auto_categorie — code technique, pas destiné à l'affichage
                if (!field.value || !field.value.trim()) return;
                const label = field.dataset.label
                    || field.closest('div')?.querySelector('label')?.textContent?.trim()
                    || (field.name || field.id);
                const labelText = label;
                details.push(`• ${labelText} : ${field.value.trim()}`);
            });
        }

        const notes = get('modal_message');
        const docs = getSelectedDocuments();

        const lines = [
            t.waTitle,
            SEP,
            `${t.waRef} ${ref}`,
            `🕐 ${dateStr} à ${timeStr}`,
            `${t.waFor} *${agence.nom}*, ${agence.adr}`,
            SEP,
            '',
            t.waIntro(greetingByTime(), insuranceLabel),
            '',
            t.waClient,
            `${nom}`,
            `📞 ${telephone}`,
        ];

        if (details.length) {
            lines.push('', t.waDetails, ...details);
        }

        if (notes) {
            lines.push('', t.waNotes, notes);
        }

        if (docs.length) {
            lines.push(
                '',
                t.waDocsTitle,
                ...docs.map((d) => `🗂️ ${d.label} — ${d.fileName}`),
                t.waDocsHint
            );
        }

        lines.push(
            '',
            SEP,
            t.waAskQuality,
            t.waAskAck,
            '',
            t.waArchived(ref)
        );

        return lines.join('\n');
    }


    // Ouvre le lien wa.me pré-rempli (buildWhatsAppMessage) vers l'agence
    // résolue par resolveNearestAgencyForQuote.
    function sendQuoteToWhatsApp() {
        if (!currentQuoteRef) currentQuoteRef = generateQuoteRef();
        const agence = agencesData[resolvedAgencyKey] || agencesData['yaounde_siege'];
        const phoneDigits = agence.tel.replace(/\D/g, ''); // format wa.me : chiffres uniquement, indicatif inclus
        const message = buildWhatsAppMessage(agence, currentQuoteRef);
        const url = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
        const opened = window.open(url, '_blank');
        // Si le navigateur bloque le popup, window.open renvoie null — on le
        // signale explicitement plutôt que de laisser l'utilisateur croire,
        // à tort, que le message WhatsApp est parti (l'email, lui, reste
        // indépendant et part quand même).
        return { agenceNom: agence.nom, ref: currentQuoteRef, docs: getSelectedDocuments(), whatsappBlocked: !opened };
    }

    // -----------------------------------------------------------------
    // Construction du contenu du mémo — SOURCE UNIQUE, utilisée à la fois
    // par l'archivage (PDF) et par la soumission du formulaire (email).
    // Garantit que les deux chemins produisent toujours un contenu
    // strictement identique, et que le champ email n'est jamais vide,
    // même si l'utilisateur n'a jamais cliqué sur "Archiver".
    // -----------------------------------------------------------------

    function buildMemoData() {
        const t = memoT();
        if (!currentQuoteRef) currentQuoteRef = generateQuoteRef();
        const agence = agencesData[resolvedAgencyKey] || agencesData['yaounde_siege'];
        const get = (id) => {
            const el = document.getElementById(id);
            return el ? el.value.trim() : '';
        };

        const insuranceSelect = document.getElementById('insurance_type');
        const insuranceLabel = insuranceSelect && insuranceSelect.selectedIndex >= 0
            ? insuranceSelect.options[insuranceSelect.selectedIndex].text.replace(/^\d+\.\s*/, '')
            : t.defaultInsuranceCap;
        const insuranceValue = insuranceSelect ? insuranceSelect.value : '';

        const nom = get('modal_user_name') || '-';
        const telephone = `${get('modal_phone_prefix')}${get('modal_user_phone')}`;
        const notes = get('modal_message');
        const docs = getSelectedDocuments();
        const now = new Date();
        const dateStr = now.toLocaleDateString(t.locale, { day: '2-digit', month: 'long', year: 'numeric' });
        const timeStr = now.toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' });
        const dateStrSlash = now.toLocaleDateString(t.locale);

        const vin = get('auto_vin');
        const titleSuffix = insuranceValue === 'Auto' && vin ? ` - ${vin}` : '';
        const memoTitle = `${t.memoTitlePrefix} ${insuranceLabel.toUpperCase()}${titleSuffix}`;
        const introLine = insuranceValue === 'Auto' && vin
            ? t.introWithVin(insuranceLabel, vin)
            : t.introSansVin(insuranceLabel);

        const detailsData = [];
        const activeSection = document.querySelector('.risk-section:not(.hidden)');
        if (activeSection) {
            activeSection.querySelectorAll('input, select, textarea').forEach((field) => {
                if (field.dataset.skipMemo) return; // ex: alias/état bruts — remplacés par le libellé Genre reconstruit
                if (field.type === 'hidden' && !field.dataset.showInMemo) return; // ex: auto_categorie — code technique, pas destiné à l'affichage
                // Un champ marqué "à fusionner avec un autre" (ex: l'unité de
                // puissance) ne génère jamais sa propre ligne — sa valeur est
                // rattachée au champ principal ci-dessous.
                if (field.dataset.combineWith) return;
                if (!field.value || !field.value.trim()) return;

                let value = field.value.trim();
                if (field.dataset.combineSuffix) {
                    const suffixField = document.getElementById(field.dataset.combineSuffix);
                    if (suffixField && suffixField.value.trim()) value += ` ${suffixField.value.trim()}`;
                }

                // Priorité à un data-label explicite (fiable, indépendant de la
                // structure HTML) ; à défaut, on retombe sur le <label> du div
                // englobant le plus proche, comme avant.
                const label = field.dataset.label
                    || field.closest('div')?.querySelector('label')?.textContent?.trim()
                    || field.name || field.id;
                detailsData.push({ label, value });
            });
        }

        return {
            ref: currentQuoteRef, agence, nom, telephone, notes, docs, now,
            dateStr, timeStr, dateStrSlash, insuranceLabel, insuranceValue, vin,
            memoTitle, introLine, detailsData,
        };
    }


    // Version texte brut du mémo (utilisée pour l'e-mail, contrairement à
    // buildWhatsAppMessage qui cible spécifiquement le format WhatsApp).
    function buildMemoPlainText(data) {
        const t = memoT();
        const lines = [
            data.memoTitle, '',
            `${t.from} ${data.nom}`,
            `${t.to} ${data.agence.nom}`,
            `${t.date} ${data.dateStrSlash}`,
            `${t.ref} ${data.ref}`,
            t.objet,
            `${t.risque} « ${data.insuranceLabel} »`, '',
            t.greeting,
            data.introLine,
            t.detailsBelow, '',
            t.clientSection,
            `${t.nom} ${data.nom}`,
            `${t.tel} ${data.telephone}`,
            `${t.branche} ${data.insuranceLabel}`,
        ];
        if (data.detailsData.length) {
            lines.push('', t.detailsSection, ...data.detailsData.map((d) => `${d.label} : ${d.value}`));
        }
        if (data.notes) {
            lines.push('', t.notesSection, data.notes);
        }
        lines.push(
            '', t.docsSection,
            data.docs.length ? data.docs.map((d) => `📎 ${d.label} — ${d.fileName}`).join('<br>') : t.noDocs,
            '', t.autoGenerated(data.ref)
        );
        return lines.join('<br>');
    }

    // Remplit le champ caché "memo_complet" à partir de la source unique.
    // Appelée systématiquement avant TOUT envoi d'email (archivage ET
    // soumission normale) — plus jamais d'email vide.

    function populateMemoCompletField(data) {
        const memoField = document.getElementById('memo_complet_field');
        if (memoField) memoField.value = buildMemoPlainText(data);
    }

    // -----------------------------------------------------------------
    // Archivage du mémo : génère une version imprimable (donc "Enregistrer
    // en PDF" via la boîte d'impression du navigateur, sans dépendance
    // externe). C'est la brique de dématérialisation : chaque demande
    // devient un document réel que le client peut conserver, indépendant
    // des bribes de messages échangées sur WhatsApp.
    // -----------------------------------------------------------------

    async function archiverMemo() {
        const data = buildMemoData();
        const t = memoT();
        const { ref: currentQuoteRefLocal, agence, nom, telephone, notes, docs, dateStrSlash, insuranceLabel, memoTitle, introLine, detailsData } = data;

        const details = detailsData.map((d) => `<tr><td>${d.label}</td><td>${d.value}</td></tr>`);

        const docsHtml = docs.length
            ? `<ul>${docs.map(d => `<li>📎 ${d.label} — <em>${d.fileName}</em></li>`).join('')}</ul>`
            : `<p><em>${t.archiveNoDocs}</em></p>`;

        const html = `<!DOCTYPE html>
<html lang="${currentLang}">
<head>
<meta charset="UTF-8">
<title>${memoTitle}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
<style>
    body { font-family: 'Roboto', 'Segoe UI', Arial, sans-serif; color: #1a1a2e; max-width: 700px; margin: 30px auto; padding: 0 20px; font-size: 13.5px; line-height: 1.5; }
    h1 { font-size: 17px; letter-spacing: 0.5px; border-bottom: 3px solid #5B21B6; padding-bottom: 8px; text-transform: uppercase; }
    .header-table { border-collapse: collapse; margin: 12px 0 16px; font-size: 12.5px; }
    .header-table td { padding: 2px 0; vertical-align: top; }
    .header-table td:first-child { font-weight: bold; width: 105px; color: #333; }
    .header-table td:nth-child(2) { width: 14px; }
    .intro { font-size: 13px; line-height: 1.5; margin-bottom: 14px; }
    .ref { color: #5B21B6; font-weight: bold; }
    table.data { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 12.5px; }
    table.data td { padding: 4px 8px; border-bottom: 1px solid #eee; }
    table.data td:first-child { font-weight: bold; width: 40%; color: #333; }
    h2 { font-size: 13.5px; color: #5B21B6; margin: 14px 0 5px; }
    ul { font-size: 12.5px; margin: 5px 0; line-height: 1.5; }
    .footer { margin-top: 16px; font-size: 10px; color: #888; border-top: 1px solid #eee; padding-top: 8px; }
    /* @page pilote réellement les marges d'impression (contrairement à la
       marge du <body>, qui ne contrôle que le contenu, pas la page physique).
       Gauche/droite à 2,5 cm comme d'habitude ; marges haut/bas resserrées
       pour garantir une seule page même avec un dossier bien rempli. */
    @page {
        size: A4;
        margin: 12mm 25mm 15mm 25mm;
    }
    @media print {
        body { margin: 0; max-width: none; padding: 0; }
        .no-print { display: none !important; }
    }
</style>
</head>
<body>
    <h1>${memoTitle}</h1>

    <table class="header-table">
        <tr><td>${t.tableFrom}</td><td>:</td><td>${nom}</td></tr>
        <tr><td>${t.tableTo}</td><td>:</td><td>MutuellePro Assurance – ${agence.nom}</td></tr>
        <tr><td>${t.tableDate}</td><td>:</td><td>${dateStrSlash}</td></tr>
        <tr><td>${t.tableRef}</td><td>:</td><td class="ref">${currentQuoteRef}</td></tr>
        <tr><td>${t.tableObjet}</td><td>:</td><td>${t.tableObjetValue}</td></tr>
        <tr><td>${t.tableRisque}</td><td>:</td><td>« ${insuranceLabel} »</td></tr>
    </table>

    <div class="intro">
        ${t.greeting}<br><br>
        ${introLine}<br>
        ${t.detailsBelow}
    </div>

    <h2>👤 ${t.archiveClient}</h2>
    <table class="data">
        <tr><td>${t.nom}</td><td>${nom}</td></tr>
        <tr><td>${t.tel}</td><td>${telephone}</td></tr>
        <tr><td>${t.branche}</td><td>${insuranceLabel}</td></tr>
    </table>

    ${details.length ? `<h2>🔎 ${t.archiveDetails}</h2><table class="data">${details.join('')}</table>` : ''}

    ${notes ? `<h2>📝 ${t.archiveNotes}</h2><p>${notes.replace(/\n/g, '<br>')}</p>` : ''}

    <h2>📎 ${t.archiveDocs}</h2>
    ${docsHtml}

    <div class="footer">
        ${t.archiveFooter}<br>
        ${t.archiveFooter2}
    </div>

    <div class="no-print" style="margin-top:24px; text-align:center;">
        <button onclick="window.print()" style="background:#5B21B6; color:#fff; border:none; padding:10px 20px; border-radius:8px; font-weight:bold; font-size:13px; cursor:pointer;">
            ${t.archivePrint}
        </button>
    </div>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        const printWindow = window.open(blobUrl, '_blank');

        if (!printWindow) {
            showToast("Le navigateur a bloqué l'ouverture de la fenêtre d'archivage. Autorisez les pop-ups pour ce site puis réessayez.", 'warning');
            URL.revokeObjectURL(blobUrl);
            return;
        }

        // Déclenchement automatique de l'impression une fois la page chargée
        // (plus fiable que document.write, notamment sur mobile). Si
        // l'impression automatique ne se déclenche pas sur votre appareil,
        // le bouton visible dans la page reste disponible en secours.
        printWindow.addEventListener('load', () => {
            try { printWindow.print(); } catch (e) { console.warn('Impression automatique indisponible :', e); }
        });

        // Libère la mémoire du blob après un délai large (le temps que
        // l'utilisateur imprime ou enregistre en PDF).
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);

        // -------------------------------------------------------------
        // Envoi automatique du mémo complet par email, pièces jointes
        // incluses, à chaque clic sur "Archiver". Le contenu complet est
        // placé dans le champ caché "memo_complet" via la fonction
        // partagée (source unique, voir buildMemoData/buildMemoPlainText
        // plus haut), pour garantir qu'il est identique à la version PDF.
        // Envoyé via NOTRE serveur (Nodemailer), plus EmailJS — plus de
        // plafond de 50 Ko, les pièces jointes partent réellement.
        // -------------------------------------------------------------
        populateMemoCompletField(data);
        const devisForm = document.getElementById('devisFormNormalized');

        if (devisForm && await warnIfAttachmentsTooLarge()) {
            sendQuoteEmail(devisForm, null)
                .then(() => console.log('📧 Mémo envoyé par email (Réf. ' + currentQuoteRef + ')'))
                .catch((err) => {
                    console.error('Échec envoi email du mémo archivé :', err);
                    showToast(explainEmailError(err), 'error');
                });
        }
    }

    // -----------------------------------------------------------------
    // Conversion HP (vPIC, puissance US "SAE net") → CV fiscaux (Cameroun/CEMAC)
    //
    // Faute de barème officiel publié pour la fiscalité automobile CEMAC,
    // on utilise la formule française simplifiée qui ne nécessite pas la
    // donnée CO2 (celle appliquée par défaut aux véhicules électriques,
    // utilisée ici comme meilleure approximation disponible) :
    //   PF = 1,8 × (kW/100)² + 3,87 × (kW/100) + 1,34
    // Le résultat est marqué "(estim.)" dans le formulaire et reste
    // éditable manuellement par l'agent. La table ci-dessous permet
    // d'enregistrer des corrections constatées sur le terrain, pour
    // affiner la correspondance marque par marque au fil du temps.
    // -----------------------------------------------------------------

    const CV_CALIBRATION_OVERRIDES = {
        // 'HONDA|Accord|2003': 11,  // exemple : à renseigner si écart constaté avec le barème réel
    };


    // Convertit une puissance en chevaux DIN/HP vers la puissance fiscale
    // (CV) utilisée par le barème CIMA -- cf. CV_CALIBRATION_OVERRIDES
    // pour les cas particuliers non couverts par la formule générale.
    function hpToFiscalCV(hpValue, make, model, year) {
        const hp = parseFloat(hpValue);
        if (isNaN(hp) || hp <= 0) return null;

        const overrideKey = `${(make || '').toUpperCase()}|${model || ''}|${year || ''}`;
        if (CV_CALIBRATION_OVERRIDES[overrideKey]) {
            return CV_CALIBRATION_OVERRIDES[overrideKey];
        }

        const kW = hp * 0.7457; // 1 hp (SAE) ≈ 0,7457 kW
        const pf = 1.8 * Math.pow(kW / 100, 2) + 3.87 * (kW / 100) + 1.34;
        return Math.round(pf);
    }

    // -----------------------------------------------------------------
    // RÉMANENCE DU FORMULAIRE (localStorage)
    // Les utilisateurs sont souvent indécis, y compris après plusieurs
    // soumissions : le contenu du formulaire est donc sauvegardé en
    // continu et restauré automatiquement, sans être effacé après envoi.
    // -----------------------------------------------------------------

    const DRAFT_STORAGE_KEY = 'mutuellepro_devis_draft';


    // Construit la clé de stockage local (localStorage) d'un champ de
    // formulaire, pour la sauvegarde automatique de brouillon.
    function fieldKey(el) {
        return el.id || el.name;
    }


    // Sauvegarde automatique du formulaire de devis dans localStorage --
    // le client ne perd pas sa saisie s'il ferme l'onglet par erreur.
    function saveFormDraft() {
        const form = document.getElementById('devisFormNormalized');
        if (!form) return;
        const draft = {};
        Array.from(form.elements).forEach((el) => {
            const key = fieldKey(el);
            if (!key || el.type === 'submit' || el.type === 'button' || el.type === 'file') return;
            draft[key] = el.value;
        });
        try {
            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
        } catch (e) {
            console.warn('Sauvegarde du brouillon impossible :', e);
        }
    }


    // Restaure un brouillon sauvegardé par saveFormDraft, au chargement de
    // la page.
    function restoreFormDraft() {
        const form = document.getElementById('devisFormNormalized');
        if (!form) return;
        let draft;
        try {
            draft = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || '{}');
        } catch (e) {
            return;
        }
        Array.from(form.elements).forEach((el) => {
            const key = fieldKey(el);
            if (!key || !(key in draft) || el.type === 'submit' || el.type === 'button') return;
            if (el.hasAttribute('readonly')) return; // ex : préfixe téléphone fixe
            // Un <input type="file"> ne peut JAMAIS être rempli par script, pour
            // des raisons de sécurité (seule la chaîne vide est autorisée) — un
            // navigateur lève une erreur bloquante si on l'ignore. Cette seule
            // ligne manquante interrompait silencieusement TOUTE l'initialisation
            // qui suit ce point au chargement de la page (animations, boutons de
            // pièces jointes, etc.) — d'où plusieurs bugs en apparence sans lien.
            if (el.type === 'file') return;
            el.value = draft[key];
        });

        // Réaffiche la bonne section de risque si une branche était déjà sélectionnée
        const insuranceSelect = document.getElementById('insurance_type');
        if (insuranceSelect && insuranceSelect.value) {
            insuranceSelect.dispatchEvent(new Event('change'));
        }
    }

    // LISTENERS DOM ATTACHMENTS
