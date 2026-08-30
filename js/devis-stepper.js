    // -----------------------------------------------------------------
    // SIMULATEUR RAPIDE — ajout pur, aucune restructuration.
    // Volontairement honnête : aucune estimation de prix inventée, juste
    // une orientation immédiate qui débouche sur le vrai formulaire de
    // devis, avec la branche déjà présélectionnée pour gagner du temps.
    // Le texte de résultat est recalculé dans la langue active au moment
    // du clic (et non figé au chargement), pour rester bilingue.
    // -----------------------------------------------------------------

    function simSelectBranch(value) {
        simBranch = value;
        document.getElementById('sim-step-1').classList.add('hidden');
        document.getElementById('sim-step-2').classList.remove('hidden');
    }

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


    function tryGoToStep3() {
        const insurance = document.getElementById('insurance_type').value;
        if (!insurance || step3UnlockedForBranch !== insurance) {
            return; // verrouillé : passage obligé par l'étape 2 au moins une fois pour cette branche
        }
        goToStep3();
    }

    function goToStep1() {
        document.getElementById('wizardStep1').classList.remove('hidden');
        document.getElementById('wizardStep2').classList.add('hidden');
        document.getElementById('wizardStep3').classList.add('hidden');
        document.getElementById('stepTitle').textContent = "Étape 1 : Identification";
        document.getElementById('badgeStep1').className = BADGE_ACTIVE;
        document.getElementById('badgeStep2').className = BADGE_INACTIVE;
        refreshStep3BadgeState();
    }

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

    function handleUsageChange() {
        const select = document.getElementById('auto_usage');
        const categorieField = document.getElementById('auto_categorie');
        if (categorieField) categorieField.value = select ? select.value : '';
        updateGenreFinalPreview(); // ex: "Camion" -> "Camion Simple Commande" si Usage devient 07SRC
        saveFormDraft();
    }

    function generateQuoteRef() {
        const insuranceSelect = document.getElementById('insurance_type');
        const branchCode = insuranceSelect && insuranceSelect.value ? insuranceSelect.value.toUpperCase() : 'DEVIS';
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
        return `${branchCode}-${stamp}`;
    }

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
        const email = get('modal_user_email') || '-';
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
            ref: currentQuoteRef, agence, nom, email, telephone, notes, docs, now,
            dateStr, timeStr, dateStrSlash, insuranceLabel, insuranceValue, vin,
            memoTitle, introLine, detailsData,
        };
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

    // Mémorise la branche réelle visée quand elle diffère du radio physique
    // coché (ex. "Multirisque Pro" utilise le radio "Autres" avec un libellé
    // personnalisé) — openDevisModal() s'en sert en priorité si présent.
    let heroFormIntendedBranch = null;

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

    function switchTab(tab) {
        const partBtn = document.getElementById('tab-particuliers-btn');
        const entBtn = document.getElementById('tab-entreprises-btn');
        const partContent = document.getElementById('tab-particuliers');
        const entContent = document.getElementById('tab-entreprises');
        const inviteBtnPart = document.getElementById('invite-btn-particuliers');
        const inviteBtnEnt = document.getElementById('invite-btn-entreprises');

        // Le bouton du bandeau qui reçoit la mise en avant est celui de
        // l'onglet PAS encore consulté -- l'action naturelle à proposer.
        const MIS_EN_AVANT = "inline-flex items-center gap-2 font-bold text-xs px-5 py-2.5 rounded-xl transition bg-navy hover:bg-purple-900 text-white shadow-md";
        const SECONDAIRE = "inline-flex items-center gap-2 font-bold text-xs px-5 py-2.5 rounded-xl transition bg-gray-100 hover:bg-gray-200 text-navy";

        if (tab === 'particuliers') {
            partBtn.className = "px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 bg-white text-navy shadow-md";
            entBtn.className = "px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 text-gray-600 hover:text-navy";
            partContent.classList.remove('hidden');
            entContent.classList.add('hidden');
            if (inviteBtnPart) inviteBtnPart.className = SECONDAIRE;
            if (inviteBtnEnt) inviteBtnEnt.className = MIS_EN_AVANT;
        } else {
            entBtn.className = "px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 bg-white text-navy shadow-md";
            partBtn.className = "px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 text-gray-600 hover:text-navy";
            entContent.classList.remove('hidden');
            partContent.classList.add('hidden');
            if (inviteBtnEnt) inviteBtnEnt.className = SECONDAIRE;
            if (inviteBtnPart) inviteBtnPart.className = MIS_EN_AVANT;
        }
    }

    function handlePhonePrefixChange(selectElem, targetCitySelectId) {
        const citySelect = document.getElementById(targetCitySelectId);
        if (!citySelect) return;
        if (selectElem.value !== '+237') {
            citySelect.value = 'Autre';
        } else if (citySelect.value === 'Autre') {
            citySelect.value = 'Yaoundé';
        }
    }

    // CARTE LEAFLET ET GEOLOCALISATION
    let map, marker;
    let userGeoPosition = null;   // {lat, lng} dès que la géolocalisation aboutit
    let userPositionMarker = null;
    let routeLine = null;
    // Repli minimal, utilisé UNIQUEMENT si /api/agences est indisponible
    // (DB inaccessible, etc.) -- pour que le site continue de fonctionner
    // au moins avec le siège, plutôt que de planter complètement.
    let agencesData = {
        "yaounde_siege": { lat: 3.866667, lng: 11.516667, nom: "Direction Générale & Agence Centrale", adr: "B.P. 7136 Yaoundé, Cameroun", adrDetail: "Rue Manguier, entre la Pharmacie et la Station-Service", tel: "+237 6 97 71 73 34", email: "mpro-manguier@mutuelleproassurances.com" }
    };

    // Charge les agences (et futurs pôles d'attraction) depuis PostgreSQL,
    // via l'API -- remplace l'ancien objet codé en dur. Transforme le
    // tableau JSON reçu en objet indexé par "cle", pour rester compatible
    // avec tout le code existant qui fait agencesData["yaounde_siege"].
    // Charge les 3 listes de référence du formulaire (constructeurs,
    // unités de puissance, catégories d'usage CIMA) depuis PostgreSQL,
    // et remplit les éléments correspondants. Même principe que
    // loadAgencesData() : un repli minimal si l'API est indisponible,
    // pour que le formulaire reste utilisable même sans base accessible.
    // Données du système Genre → État → Usage, conservées globalement pour
    // être filtrées dynamiquement au fil des sélections de l'utilisateur.
    let carrosseriesData = [];
    let genresEtatsData = [];
    let genresUsagesData = [];
    let carrosserieCombinaisonsData = [];

    // Registre des instances Tom Select actives (par id d'élément). Un
    // <select> déjà "habillé" par Tom Select ne peut plus être repeuplé
    // via innerHTML directement — il faut détruire puis recréer
    // l'instance à chaque changement d'options (ex: Usage qui se filtre
    // selon le Genre choisi).
    const tomSelectInstances = {};

    function initTomSelect(elementId, options = {}) {
        const el = document.getElementById(elementId);
        if (!el) return null;
        if (tomSelectInstances[elementId]) {
            tomSelectInstances[elementId].destroy();
        }
        tomSelectInstances[elementId] = new TomSelect(`#${elementId}`, {
            placeholder: '-- Choisissez --',
            allowEmptyOption: true,
            ...options,
        });
        return tomSelectInstances[elementId];
    }

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

    // Carrosserie et Genre canonique actuellement résolus -- mémorisés pour
    // que handleCombinaisonChange() (déclenché par Double Commande / Matière
    // inflammable) puisse recalculer l'Usage sans tout redemander.
    let currentCarrosserie = null;
    let currentGenreCanonique = null;


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

    // FONCTIONNALITES MODALE DEVIS & STEPPER
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

    function closeDevisModal() {
        const modal = document.getElementById('devisModal');
        if (modal) modal.classList.add('hidden');
    }


    // -------------------------------------------------------------
    // ESPACE CLIENT -- Helpdesk Volet 2 (19/08/2026). Session gérée par
    // cookie httpOnly côté serveur (voir auth.routes.js) : ce JS ne lit ni
    // ne stocke jamais le cookie directement, `credentials: 'include'`
    // suffit à le faire voyager automatiquement à chaque requête.
    // -------------------------------------------------------------


    //NNR BLOC3.1



    const SINISTRE_I18N = {
        fr: {
            locale: 'fr-FR',
            champsManquants: 'Merci de renseigner tous les champs obligatoires.',
            waTitle: '🚨✨ *DÉCLARATION DE SINISTRE* — MutuellePro ✨🚨',
            waRef: '🆔 Réf. :', waBranche: '📁 Branche :', waPolice: '📋 N° de police :',
            waDate: '📅 Date du sinistre :', waDesc: '📝 Description :',
            waClient: '👤 *DÉCLARANT*', waPhone: '📞',
            waFooter: '✅ Merci d\'accuser réception dès que possible. Cette référence permet le suivi de votre dossier.',
            emailSubject: 'Déclaration de sinistre',
            emailIntro: 'Nouvelle déclaration de sinistre reçue via le site.',
            successMsg: (ref) => `Déclaration envoyée — référence ${ref}. Conservez ce numéro, il permettra le suivi de votre dossier.`,
            errorMsg: 'La déclaration WhatsApp a bien été préparée, mais l\'envoi de l\'e-mail a échoué. Votre référence reste valable : ',
        },
        en: {
            locale: 'en-US',
            champsManquants: 'Please fill in all required fields.',
            waTitle: '🚨✨ *CLAIM DECLARATION* — MutuellePro ✨🚨',
            waRef: '🆔 Ref.:', waBranche: '📁 Branch:', waPolice: '📋 Policy No.:',
            waDate: '📅 Date of incident:', waDesc: '📝 Description:',
            waClient: '👤 *DECLARANT*', waPhone: '📞',
            waFooter: '✅ Please confirm receipt as soon as possible. This reference allows tracking of your case.',
            emailSubject: 'Claim Declaration',
            emailIntro: 'New claim declaration received via the website.',
            successMsg: (ref) => `Declaration sent — reference ${ref}. Keep this number, it will allow tracking of your case.`,
            errorMsg: 'The WhatsApp declaration was prepared successfully, but sending the email failed. Your reference remains valid: ',
        },
    };


    // Mémorise la branche pour laquelle l'étape 3 a été débloquée (passage
    // effectif par l'étape 2). Si l'utilisateur change de branche, l'accès
    // direct à l'étape 3 doit se reverrouiller : les champs "Détails du
    // Risque" affichés ne correspondraient plus à la nouvelle branche tant
    // qu'on n'y est pas repassé.
    let step3UnlockedForBranch = null;

    const BADGE_ACTIVE = "flex-1 text-center py-1.5 px-3 rounded-lg font-bold bg-brandRed text-white transition-all";
    const BADGE_INACTIVE = "flex-1 text-center py-1.5 px-3 rounded-lg font-bold bg-white/10 text-gray-300 transition-all";
    const BADGE_LOCKED = "flex-1 text-center py-1.5 px-3 rounded-lg font-bold bg-white/5 text-gray-500 transition-all cursor-not-allowed opacity-60";
    const BADGE_UNLOCKED_INACTIVE = "flex-1 text-center py-1.5 px-3 rounded-lg font-bold bg-white/10 text-gray-300 transition-all cursor-pointer hover:bg-white/20";

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
    let deferredInstallPrompt = null;

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').catch((err) => {
                console.warn('Service worker non enregistré :', err);
            });
        });
    }

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredInstallPrompt = event;
        const btn = document.getElementById('pwa-install-btn');
        if (btn) btn.style.display = 'flex';
    });

    function installPWA() {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.finally(() => {
            deferredInstallPrompt = null;
            const btn = document.getElementById('pwa-install-btn');
            if (btn) btn.style.display = 'none';
        });
    }

    // -----------------------------------------------------------------
    // ESCORTE DE LA BULLE WHATSAPP — sur la section "Assistant IA", la
    // bulle flottante quitte sa place habituelle pour rejoindre le coin
    // supérieur droit du bouton "En attendant, nous vous répondons !",
    // et l'accompagne tant qu'il reste visible à l'écran. Dès qu'il sort
    // de la page (ou si la place manque pour afficher la bulle en
    // entier), elle reprend sa position par défaut.
    // -----------------------------------------------------------------
    // -----------------------------------------------------------------
    // DIAPORAMA DU HERO — fondu enchaîné automatique entre les 6 images
    // de fond. Une seule image visible à la fois (opacity-100), les
    // autres à 0 — la transition CSS (2s) fait le fondu.
    // -----------------------------------------------------------------
    // -----------------------------------------------------------------
    // BANDEAU COOKIES — Google Analytics n'est chargé qu'après un
    // consentement explicite, jamais par défaut. Le choix (accepté ou
    // refusé) est mémorisé dans localStorage, pour ne plus jamais
    // redemander à un visiteur qui a déjà répondu.
    // -----------------------------------------------------------------
    const COOKIE_CONSENT_KEY = 'mpro_cookie_consent'; // 'accepted' | 'refused'

    function loadGoogleAnalytics() {
        if (document.getElementById('ga-script')) return; // déjà chargé, jamais deux fois
        const script = document.createElement('script');
        script.id = 'ga-script';
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=G-J2V65EGLTT';
        document.head.appendChild(script);

        window.dataLayer = window.dataLayer || [];
        function gtag(){ window.dataLayer.push(arguments); }
        gtag('js', new Date());
        gtag('config', 'G-J2V65EGLTT');
    }

    function handleCookieChoice(accepted) {
        localStorage.setItem(COOKIE_CONSENT_KEY, accepted ? 'accepted' : 'refused');
        document.getElementById('cookie-banner')?.classList.add('hidden');
        if (accepted) loadGoogleAnalytics();
    }

    function initCookieConsent() {
        const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
        if (stored === 'accepted') {
            loadGoogleAnalytics();
        } else if (stored === 'refused') {
            // Rien à faire — choix déjà connu et respecté, bandeau reste caché.
        } else {
            // Jamais répondu : on affiche le bandeau.
            document.getElementById('cookie-banner')?.classList.remove('hidden');
        }
    }

    function setupHeroSlideshow() {
        const slides = document.querySelectorAll('#accueil .hero-slide');
        if (slides.length < 2) return; // rien à faire tourner

        const SLIDE_DURATION_MS = 5500; // ~5.5s par image, 6 images -> cycle de 33s
        let currentIndex = 0;

        setInterval(() => {
            slides[currentIndex].classList.remove('opacity-100');
            slides[currentIndex].classList.add('opacity-0');
            currentIndex = (currentIndex + 1) % slides.length;
            slides[currentIndex].classList.remove('opacity-0');
            slides[currentIndex].classList.add('opacity-100');
        }, SLIDE_DURATION_MS);
    }

    function setupWhatsAppEscort() {
        const bubble = document.getElementById('whatsapp-bubble');
        const cta = document.getElementById('assistant-whatsapp-cta');
        if (!bubble || !cta) return;

        const BUBBLE_SIZE = 56; // correspond à w-14/h-14 (3.5rem = 56px)
        const OVERLAP = BUBBLE_SIZE / 3; // seul le dernier tiers chevauche le bouton
        const CLEARANCE = BUBBLE_SIZE - OVERLAP; // 2/3 restants, à dégager au-dessus
        const BREATHING_ROOM = 8;
        let docked = false;

        function updateEscortPosition() {
            const rect = cta.getBoundingClientRect();
            const inView = rect.top < window.innerHeight && rect.bottom > 0;
            const enoughRoomAbove = rect.top - CLEARANCE >= 0;

            if (inView && enoughRoomAbove) {
                if (!docked) {
                    docked = true;
                    // Courbe très élastique : dépasse nettement sa position
                    // finale puis "rebondit" en arrière avant de se poser —
                    // simule une vraie plongée, pas un simple glissement.
                    bubble.style.transition = 'top 0.6s cubic-bezier(0.68, -0.6, 0.32, 1.6), left 0.6s cubic-bezier(0.68, -0.6, 0.32, 1.6)';
                    cta.style.transition = 'margin-top 0.5s ease';
                    // Ne libère que la portion NON chevauchante de la bulle
                    // (2/3 de sa hauteur) — le dernier tiers repose volontairement
                    // sur le bouton, pour l'effet de badge posé sur l'angle.
                    cta.style.marginTop = `${CLEARANCE + BREATHING_ROOM}px`;
                }
                // Position finale : seul le tiers inférieur/gauche de la bulle
                // chevauche le coin supérieur droit du bouton — les 2/3
                // restants débordent vers l'extérieur (haut/droite).
                bubble.style.bottom = 'auto';
                bubble.style.right = 'auto';
                bubble.style.top = `${rect.top - CLEARANCE}px`;
                bubble.style.left = `${rect.right - OVERLAP}px`;
            } else if (docked) {
                docked = false;
                bubble.style.top = '';
                bubble.style.left = '';
                bubble.style.bottom = '';
                bubble.style.right = '';
                cta.style.marginTop = '';
            }
        }

        window.addEventListener('scroll', updateEscortPosition, { passive: true });
        window.addEventListener('resize', updateEscortPosition);
        updateEscortPosition();
    }

    // -----------------------------------------------------------------
    // SIMULATEUR RAPIDE — ajout pur, aucune restructuration.
    // Volontairement honnête : aucune estimation de prix inventée, juste
    // une orientation immédiate qui débouche sur le vrai formulaire de
    // devis, avec la branche déjà présélectionnée pour gagner du temps.
    // Le texte de résultat est recalculé dans la langue active au moment
    // du clic (et non figé au chargement), pour rester bilingue.
    // -----------------------------------------------------------------
    let simBranch = null;

    const SIM_BRANCH_ICON = { Auto: 'fa-car', Sante: 'fa-heart-pulse', Habitation: 'fa-house', Voyage: 'fa-plane-departure', Rc: 'fa-shield-halved', MultirisquePro: 'fa-warehouse' };
    const SIM_BRANCH_I18N_KEY = { Auto: 'sim.branchAuto', Sante: 'sim.branchHealth', Habitation: 'sim.branchHome', Voyage: 'sim.branchTravel', Rc: 'sim.branchRc', MultirisquePro: 'sim.branchProMulti' };

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

    function simReset() {
        document.getElementById('sim-step-3').classList.add('hidden');
        document.getElementById('sim-step-2').classList.add('hidden');
        document.getElementById('sim-step-1').classList.remove('hidden');
        simBranch = null;
    }

    // -----------------------------------------------------------------
    // RECHERCHE VIN APPROXIMATIVE — déclenchée quand le décodage exact
    // échoue. État partagé entre les fonctions ci-dessous.
    // -----------------------------------------------------------------
    let vinSearchResults = [];
    let vinSearchPage = 0;
    const VIN_SEARCH_PAGE_SIZE = 5;
    function vinSearchChangePage(delta) {
        vinSearchPage += delta;
        vinSearchRenderPage();
    }

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

    function vinSearchRejectAll() {
        document.getElementById('vin-search-panel')?.classList.add('hidden');
        vinSearchResults = [];
    }

    // -----------------------------------------------------------------
    // NOTIFICATIONS TOAST — remplace alert(). Empilables, se referment
    // seules après quelques secondes ou au clic.
    // -----------------------------------------------------------------
    const TOAST_STYLES = {
        info:    { icon: 'fa-circle-info',        bg: 'bg-navy',      },
        success: { icon: 'fa-circle-check',       bg: 'bg-emerald-600' },
        warning: { icon: 'fa-triangle-exclamation', bg: 'bg-amber-500' },
        error:   { icon: 'fa-circle-exclamation', bg: 'bg-red-600'    },
    };

    // -----------------------------------------------------------------
    // Traduction des types de carburant (vPIC, anglais US) → français local
    // "Gasoline" (anglais US) = Essence — jamais du Diesel/Gasoil.
    // "Diesel" est ici explicité "Diesel (Gasoil)" car chez nous les deux
    // termes sont souvent utilisés de façon interchangeable.
    // -----------------------------------------------------------------
    const FUEL_TYPE_FR = {
        'Gasoline': 'Essence',
        'Diesel': 'Diesel (Gasoil)',
        'Flexible Fuel Vehicle (FFV)': 'Flex-fuel (Essence/Éthanol)',
        'Electric': 'Électrique',
        'Compressed Natural Gas (CNG)': 'GNC (Gaz Naturel Comprimé)',
        'Liquefied Petroleum Gas (propane or LPG)': 'GPL (Gaz de Pétrole Liquéfié)',
        'Hybrid': 'Hybride (Essence-Électrique)',
        'Ethanol (E85)': 'Éthanol (E85)',
        'Hydrogen': 'Hydrogène',
        'Not Applicable': '',
    };

    function translateFuelType(vpicValue) {
        if (!vpicValue) return '';
        return FUEL_TYPE_FR[vpicValue] || ''; // valeur inconnue → laissée vide, jamais devinée
    }


    // Limites RÉELLES depuis la migration vers Nodemailer (serveur SMTP LWS) :
    // - MAX_FILE_SIZE_MB : plafond dur par fichier, doit correspondre exactement
    //   à la limite "multer" configurée côté serveur (voir server.js) — sinon
    //   un fichier accepté ici serait rejeté silencieusement à l'envoi.
    // - TOTAL_SIZE_WARNING_MB : simple avertissement (pas un blocage), les
    //   serveurs SMTP plafonnant souvent la taille totale d'un message autour
    //   de 20-25 Mo, tous fichiers confondus.
    const MAX_FILE_SIZE_MB = 15;
    const TOTAL_SIZE_WARNING_MB = 20;

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
    function explainEmailError(err) {
        if (err && err.status === 413) {
            return `Une pièce jointe dépasse la limite de ${MAX_FILE_SIZE_MB} Mo autorisée par notre serveur. Votre demande a néanmoins été transmise par WhatsApp — pensez à y joindre vos pièces manuellement.`;
        }
        if (err && err.status === 400) {
            return "Échec de l'envoi de l'email : configuration du service de messagerie incorrecte. Merci de nous contacter directement.";
        }
        if (err && err.status === 0) {
            return "Échec de l'envoi de l'email : impossible de joindre le service (vérifiez votre connexion internet). Veuillez réessayer.";
        }
        return "Échec de l'envoi de l'email (le mémo WhatsApp a néanmoins été préparé). Veuillez réessayer ou nous contacter directement.";
    }

    // -----------------------------------------------------------------
    // Envoi réel du devis par email — via NOTRE serveur (Nodemailer/SMTP
    // LWS), plus EmailJS. FormData(form) capture automatiquement tous les
    // champs nommés du formulaire, fichiers inclus (même principe que
    // emailjs.sendForm, mais vers notre propre backend, sans plafond de
    // 50 Ko ni dépendance à un service tiers).
    // -----------------------------------------------------------------
    // Construit le contenu HTML du message de contact (Nom/Email/Téléphone/
    // Ville/Sujet/Message), placé dans le champ caché "memo_complet" juste
    // avant l'envoi — même mécanisme que le formulaire de devis, pour
    // réutiliser tel quel l'endpoint /api/send-quote-email (Nodemailer).
    function buildContactMemoText(form) {
        const get = (name) => {
            const el = form.elements[name];
            return el ? (el.value || '').trim() : '';
        };
        const prefixSelect = form.querySelector('.devis-prefix-select');
        const prefix = prefixSelect ? prefixSelect.value : '';

        // Le libellé lisible du sujet (pas juste le numéro), pour un mémo
        // clair côté destinataire.
        const sujetSelect = form.elements['sujet_categorie'];
        const sujetLabel = sujetSelect && sujetSelect.selectedIndex > 0
            ? sujetSelect.options[sujetSelect.selectedIndex].textContent
            : '(non précisé)';

        const lines = [
            'NOUVEAU MESSAGE — Formulaire de contact du site', '',
            `Nom : ${get('user_name')}`,
            `Email : ${get('user_email')}`,
            `Téléphone : ${prefix} ${get('user_phone')}`,
            `Ville : ${get('user_city')}`,
            `Objet : ${get('subject')}`,
            `Sujet : ${sujetLabel}`,
            `Situation du compte : ${situationCompteLigne(get('user_email'))}`, '',
            '--- MESSAGE ---',
            get('message'),
        ];
        return lines.join('<br>');
    }

    // -----------------------------------------------------------------
    // TABLE DE ROUTAGE — formulaire de contact, par sujet précis. Chaque
    // entrée : destinataire principal (to) + copie(s) (cc). Construite
    // avec Roger le 04/08/2026, sur la base des boîtes email réellement
    // créées (contact@, devis@, direction@, production@, sinistres@,
    // comptablite@).
    // -----------------------------------------------------------------
    const CONTACT_ROUTING = {
        '1':  { to: 'devis@mutuelleproassurances.com',       cc: ['direction@mutuelleproassurances.com'] },
        '2':  { to: 'production@mutuelleproassurances.com',  cc: ['direction@mutuelleproassurances.com'] },
        '3':  { to: 'contact@mutuelleproassurances.com',     cc: ['direction@mutuelleproassurances.com', 'production@mutuelleproassurances.com'] },
        '4':  { to: 'sinistres@mutuelleproassurances.com',   cc: ['direction@mutuelleproassurances.com', 'production@mutuelleproassurances.com'] },
        '5':  { to: 'sinistres@mutuelleproassurances.com',   cc: ['direction@mutuelleproassurances.com'] },
        '6':  { to: 'sinistres@mutuelleproassurances.com',   cc: ['direction@mutuelleproassurances.com'] },
        '7':  { to: 'production@mutuelleproassurances.com',  cc: ['direction@mutuelleproassurances.com'] },
        '8':  { to: 'production@mutuelleproassurances.com',  cc: ['direction@mutuelleproassurances.com'] },
        '9':  { to: 'production@mutuelleproassurances.com',  cc: ['direction@mutuelleproassurances.com'] },
        '10': { to: 'production@mutuelleproassurances.com',  cc: ['direction@mutuelleproassurances.com'] },
        '11': { to: 'production@mutuelleproassurances.com',  cc: ['direction@mutuelleproassurances.com'] },
        '12': { to: 'production@mutuelleproassurances.com',  cc: ['comptablite@mutuelleproassurances.com'] },
        '13': { to: 'production@mutuelleproassurances.com',  cc: ['comptablite@mutuelleproassurances.com'] },
        '14': { to: 'direction@mutuelleproassurances.com',   cc: ['contact@mutuelleproassurances.com'] },
        '15': { to: 'direction@mutuelleproassurances.com',   cc: ['contact@mutuelleproassurances.com'] },
        '16': { to: 'direction@mutuelleproassurances.com',   cc: ['contact@mutuelleproassurances.com'] },
        '17': { to: 'direction@mutuelleproassurances.com',   cc: ['contact@mutuelleproassurances.com'] },
        '18': { to: 'direction@mutuelleproassurances.com',   cc: ['contact@mutuelleproassurances.com'] },
        '19': { to: 'direction@mutuelleproassurances.com',   cc: ['contact@mutuelleproassurances.com'] },
        '20': { to: 'direction@mutuelleproassurances.com',   cc: ['contact@mutuelleproassurances.com'] },
        '21': { to: 'direction@mutuelleproassurances.com',   cc: ['contact@mutuelleproassurances.com'] },
        '22': { to: 'direction@mutuelleproassurances.com',   cc: ['contact@mutuelleproassurances.com'] },
    };
    const CONTACT_ROUTING_FALLBACK = { to: 'contact@mutuelleproassurances.com', cc: [] };

    // -----------------------------------------------------------------
    // Création du ticket backend (site.tickets, Helpdesk Volet 2) — en
    // PARALLÈLE du flux WhatsApp/email existant, jamais à sa place. Un
    // échec ici ne doit JAMAIS bloquer ni retarder l'envoi WhatsApp/email,
    // qui reste le canal principal déjà éprouvé : on avale l'erreur en
    // silence (log console uniquement), le ticket "Mon espace" est un
    // bénéfice additionnel, pas une dépendance critique du parcours.
    // -----------------------------------------------------------------
    async function creerTicketBackend(type, email, telephone, contenu) {
        try {
            const resp = await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, email, telephone, contenu }),
            });
            const data = await resp.json();
            if (!data.succes) {
                console.warn('Ticket backend non créé :', data.erreurs);
                return null;
            }
            return data;
        } catch (err) {
            console.warn('Ticket backend non créé (erreur réseau) :', err);
            return null;
        }
    }

    // -----------------------------------------------------------------
    // Pré-vérification de l'existence d'un compte pour un email/téléphone
    // donné — alimente la ligne "Situation du compte" du mémo/WhatsApp/
    // email. Volontairement déclenchée AVANT la soumission (au blur du
    // champ email), car au moment du clic sur "Envoyer", l'ouverture de
    // WhatsApp doit rester synchrone (sinon le navigateur bloque le
    // popup) — impossible d'attendre une réponse réseau à ce moment-là.
    // Résultat mis en cache ; si jamais non résolu au moment de l'envoi
    // (cas limite, ex. soumission très rapide), on retombe sur un texte
    // neutre plutôt que de bloquer quoi que ce soit.
    // -----------------------------------------------------------------
    const compteExistantCache = {};
    function preCheckCompteExistant(identifiant) {
        if (!identifiant || compteExistantCache[identifiant] !== undefined) return;
        compteExistantCache[identifiant] = null; // marque "en cours" pour éviter les doublons
        fetch(`/api/verifier-compte?identifiant=${encodeURIComponent(identifiant)}`)
            .then((r) => r.json())
            .then((data) => {
                compteExistantCache[identifiant] = data.succes ? data.existe : null;
            })
            .catch(() => {
                compteExistantCache[identifiant] = null;
            });
    }

    // Ligne "Situation du compte" combinée (existence du compte + statut
    // initial du ticket, toujours "Reçu" à ce stade puisque le ticket
    // vient d'être créé — voir site.statut_ticket, id=1 par défaut).
    function situationCompteLigne(identifiant) {
        const t = translations[currentLang] || translations.fr;
        const existe = compteExistantCache[identifiant];
        const compteLabel = existe === true ? t['espace.statutClientInscrit']
            : existe === false ? t['espace.statutNouveauContact']
            : t['espace.statutAVerifier'];
        return `${compteLabel} — ${t['espace.statutRecu']}`;
    }

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
    function memoT() {
        return MEMO_I18N[currentLang] || MEMO_I18N.fr;
    }

    function greetingByTime() {
        const h = new Date().getHours();
        const t = memoT();
        return h < 18 ? t.greetingMorning : t.greetingEvening;
    }

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
        const email = get('modal_user_email') || '-';
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
            `📧 ${email}`,
            `🗂️ Situation du compte : ${situationCompteLigne(email)}`,
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
            `Email : ${data.email}`,
            `${t.tel} ${data.telephone}`,
            `${t.branche} ${data.insuranceLabel}`,
            `Situation du compte : ${situationCompteLigne(data.email)}`,
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

    function fieldKey(el) {
        return el.id || el.name;
    }

    // LISTENERS DOM ATTACHMENTS
    document.addEventListener('DOMContentLoaded', async () => {
        // Chargement des agences DEPUIS POSTGRESQL, en tout premier -- tout le
        // reste de l'initialisation (carte, résolution de la plus proche,
        // etc.) dépend de cette donnée étant disponible.
        await loadAgencesData();
        try {
            loadListesReference();
        } catch (e) {
            console.error('Erreur lors du chargement des listes de référence (ignorée) :', e);
        }
        try {
            initTomSelect('sujet_categorie', { placeholder: '-- Choisissez un sujet --', create: false });
        } catch (e) {
            console.error('Erreur lors de l\'initialisation de Tom Select sur Sujet (ignorée) :', e);
        }
        // initPartnersBar() et initPartnersAnimation() ne sont plus appelées
        // ici (15/08/2026) : elles dépendent désormais des données réelles
        // chargées depuis la base (site.partenaires_assurance), et sont donc
        // déclenchées depuis loadListesReference() une fois ces données
        // effectivement disponibles — les appeler ici, avant, les aurait
        // fait tourner sur un tableau vide.
        try {
            ajusterHauteurSectionPartenaires();
            // Réajuste sur redimensionnement/rotation d'écran (anti-rebond
            // 200ms -- évite de recalculer à chaque pixel pendant un
            // redimensionnement en cours, reste léger en CPU).
            let partnersResizeTimer = null;
            window.addEventListener('resize', () => {
                clearTimeout(partnersResizeTimer);
                partnersResizeTimer = setTimeout(ajusterHauteurSectionPartenaires, 200);
            });
        } catch (e) {
            console.error('Erreur lors de l\'ajustement de hauteur de la section partenaires (ignorée) :', e);
        }

        // Bloc SÉPARÉ du précédent (20/08/2026) : une panne éventuelle sur
        // Partenaires ne doit jamais empêcher Assistance de s'ajuster, et
        // inversement -- même principe déjà appliqué ailleurs sur ce site.
        try {
            ajusterHauteurSectionAssistance();
            let assistanceResizeTimer = null;
            window.addEventListener('resize', () => {
                clearTimeout(assistanceResizeTimer);
                assistanceResizeTimer = setTimeout(ajusterHauteurSectionAssistance, 200);
            });
        } catch (e) {
            console.error('Erreur lors de l\'ajustement de hauteur de la section assistance (ignorée) :', e);
        }

        // initMap() dépend de la librairie Leaflet chargée depuis un CDN externe.
        // Si le CDN est inaccessible (pas d'internet, bloqué...), on ne doit pas
        // laisser une erreur ici interrompre tout le reste de l'initialisation
        // (restauration du formulaire, gestion des soumissions, etc.).
        try {
            initMap();
        } catch (err) {
            console.warn('Carte indisponible (Leaflet non chargé) :', err);
        }

        // Résolution de l'agence la plus proche demandée dès l'ouverture du
        // site (autorisation demandée immédiatement), pour que le résultat
        // soit déjà disponible bien avant qu'un devis ne soit soumis — évite
        // la course de vitesse entre géolocalisation et soumission.
        resolveNearestAgencyForQuote();

        // Si l'utilisateur clique directement sur une case du mini-formulaire
        // (plutôt que via un bouton "Multirisque Pro" etc.), on oublie la
        // branche mémorisée détournée — sinon elle resterait périmée.
        // .checked = true (programmatique, via selectDevisRisk) ne déclenche
        // pas cet événement 'change', seul un vrai clic utilisateur le fait.
        document.querySelectorAll('input[name="risque"]').forEach((radio) => {
            radio.addEventListener('change', () => { heroFormIntendedBranch = null; });
        });

        // Restauration du brouillon sauvegardé + sauvegarde continue à chaque saisie
        // Encapsulé : une erreur ici ne doit plus JAMAIS pouvoir interrompre
        // silencieusement le reste de l'initialisation de la page (c'est
        // exactement ce qui s'est produit avec le bug des champs fichier).
        try {
            restoreFormDraft();
        } catch (e) {
            console.error('Erreur lors de la restauration du brouillon (ignorée, le reste de la page continue) :', e);
        }
        try {
            setupWhatsAppEscort();
        } catch (e) {
            console.error('Erreur lors de l\'initialisation de l\'escorte WhatsApp (ignorée) :', e);
        }
        try {
            setupHeroSlideshow();
        } catch (e) {
            console.error('Erreur lors de l\'initialisation du diaporama du hero (ignorée) :', e);
        }
        try {
            initCookieConsent();
        } catch (e) {
            console.error('Erreur lors de l\'initialisation du consentement cookies (ignorée) :', e);
        }
        initDocClearButtons();
        const devisFormForDraft = document.getElementById('devisFormNormalized');
        if (devisFormForDraft) {
            devisFormForDraft.addEventListener('input', saveFormDraft);
            devisFormForDraft.addEventListener('change', saveFormDraft);
        }

        // Date de naissance : ouvrir le calendrier près d'un âge adulte
        // plausible (J-15 ans) plutôt qu'à la date du jour — évite à
        // l'utilisateur de faire défiler des dizaines d'années en arrière.
        // N'écrase jamais une valeur déjà restaurée depuis le brouillon.
        const dobField = document.getElementById('modal_user_dob');
        if (dobField) {
            const today = new Date();
            dobField.max = today.toISOString().split('T')[0];
            if (!dobField.value) {
                const fifteenYearsAgo = new Date(today.getFullYear() - 15, today.getMonth(), today.getDate());
                dobField.value = fifteenYearsAgo.toISOString().split('T')[0];
            }
        }

        const insuranceSelect = document.getElementById('insurance_type');
        if (insuranceSelect) {
            insuranceSelect.addEventListener('change', function() {
                document.querySelectorAll('.risk-section').forEach(sec => sec.classList.add('hidden'));
                const target = document.getElementById(`fields-${this.value.toLowerCase()}`);
                if (target) target.classList.remove('hidden');

                const docAutoSection = document.getElementById('doc-auto-section');
                if (docAutoSection) {
                    docAutoSection.classList.toggle('hidden', this.value !== 'Auto');
                }

                // Changement de branche = les infos "Détails du Risque" ne sont
                // plus à jour tant qu'on n'y est pas repassé : on reverrouille
                // l'accès direct à l'étape 3.
                if (step3UnlockedForBranch !== this.value) {
                    step3UnlockedForBranch = null;
                    refreshStep3BadgeState();
                    // Si on était sur l'étape 3 au moment du changement (cas
                    // limite), on ramène vers l'étape 2 pour re-confirmer les
                    // détails de la nouvelle branche.
                    const step3El = document.getElementById('wizardStep3');
                    if (step3El && !step3El.classList.contains('hidden')) {
                        goToStep2();
                    }
                }
            });
        }

        // Suivi des pièces justificatives sélectionnées, avec compression
        // automatique des images (ne persistent PAS en rechargement de
        // page : les fichiers ne peuvent pas être stockés en localStorage —
        // l'utilisateur devra les resélectionner si la page est rechargée
        // avant soumission).
        document.querySelectorAll('.doc-upload').forEach((input) => {
            input.addEventListener('change', handleDocUploadChange);
        });

        const sections = document.querySelectorAll('section[id]');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setActiveMenuLink(entry.target.id);
                    const idx = scrollPageOrder.indexOf(entry.target.id);
                    if (idx !== -1) {
                        currentSectionIndex = idx;
                        updateScrollArrows();
                    }
                }
            });
        }, { threshold: 0.4 });
        sections.forEach(section => observer.observe(section));

        // Flèches de défilement : réagissent au mouvement/toucher/scroll
        ['mousemove', 'touchstart', 'scroll'].forEach((evt) => {
            window.addEventListener(evt, resetArrowsInactivityTimer, { passive: true });
        });
        resetArrowsInactivityTimer(); // état initial : flèches visibles quelques secondes

        // Micro-animation : apparition en fondu des cartes au défilement
        // (réutilisable pour d'autres sections à l'avenir en ajoutant
        // simplement la classe "fade-in-section" + les classes de transition).
        const fadeInObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    // Retire les deux valeurs possibles (translate-y-4 ET
                    // translate-y-6 sont toutes deux utilisées selon les
                    // sections) -- retirer une classe absente ne fait rien,
                    // donc aucun risque à toujours tenter les deux.
                    entry.target.classList.remove('opacity-0', 'translate-y-4', 'translate-y-6');
                    entry.target.classList.add('opacity-100', 'translate-y-0');
                    fadeInObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });
        document.querySelectorAll('.fade-in-section').forEach((el) => fadeInObserver.observe(el));

        const contactForm = document.getElementById('contact-form');
        if (contactForm) {
            contactForm.addEventListener('submit', function(event) {
                event.preventDefault();
                const submitBtn = document.getElementById('submit-btn');
                const originalBtnContent = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Envoi en cours...';
                submitBtn.disabled = true;

                const memoField = document.getElementById('contact_memo_complet');
                if (memoField) memoField.value = buildContactMemoText(this);

                // Ticket backend (Helpdesk Volet 2, site.tickets, type
                // "info") — en parallèle, jamais bloquant.
                const contactEmail = this.elements['user_email'] ? this.elements['user_email'].value.trim() : '';
                const contactPrefixEl = this.querySelector('.devis-prefix-select');
                const contactPhone = this.elements['user_phone'] ? this.elements['user_phone'].value.trim() : '';
                const contactTelephone = `${contactPrefixEl ? contactPrefixEl.value : ''}${contactPhone}`;
                const contactSujetSelect = this.elements['sujet_categorie'];
                const contactSujetLabel = contactSujetSelect && contactSujetSelect.selectedIndex > 0
                    ? contactSujetSelect.options[contactSujetSelect.selectedIndex].textContent
                    : undefined;
                creerTicketBackend('info', contactEmail, contactTelephone, {
                    sujet: contactSujetLabel,
                    objet: this.elements['subject'] ? this.elements['subject'].value.trim() : undefined,
                    message: this.elements['message'] ? this.elements['message'].value.trim() : undefined,
                });

                // Routage par sujet — voir CONTACT_ROUTING plus haut. Repli sur
                // contact@ si, par un cas limite, aucun sujet n'était sélectionné
                // (le champ est "required", donc ça ne devrait jamais arriver).
                const sujetValue = this.elements['sujet_categorie'] ? this.elements['sujet_categorie'].value : '';
                const routing = CONTACT_ROUTING[sujetValue] || CONTACT_ROUTING_FALLBACK;

                sendQuoteEmail(this, routing.cc, routing.to)
                    .then(() => {
                        showToast('Votre message a bien été transmis ! Un conseiller vous recontactera sous 24h.', 'success');
                        contactForm.reset();
                    }, (error) => {
                        showToast(explainEmailError(error), 'error');
                        console.error('Erreur envoi email (Nodemailer) :', error);
                    })
                    .finally(() => {
                        submitBtn.innerHTML = originalBtnContent;
                        submitBtn.disabled = false;
                    });
            });
        }

        const devisFormNormalized = document.getElementById('devisFormNormalized');
        if (devisFormNormalized) {
            devisFormNormalized.addEventListener('submit', async function(event) {
                event.preventDefault();
                const submitBtn = document.getElementById('normalizedSubmitBtn');
                const originalBtnContent = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Envoi en cours...';
                submitBtn.disabled = true;

                // Déclenché en tout premier, de façon synchrone, pour rester dans le
                // geste utilisateur (clic) — sinon certains navigateurs bloquent
                // l'ouverture de l'onglet WhatsApp si elle intervient après un délai
                // asynchrone (ex. après la réponse du serveur emailjs).
                const { agenceNom, ref, docs, whatsappBlocked } = sendQuoteToWhatsApp();

                // Remplit le champ email AVANT l'envoi — corrige le bug de
                // l'email vide : auparavant, ce champ n'était rempli que
                // lors d'un clic sur "Archiver", jamais sur une soumission
                // directe. Utilise la même source unique que l'archivage,
                // donc les deux contenus sont désormais toujours identiques.
                const memoData = buildMemoData();
                populateMemoCompletField(memoData);

                // Ticket backend (Helpdesk Volet 2, site.tickets) — voir
                // commentaire de creerTicketBackend : en parallèle, jamais
                // bloquant. Le champ email du formulaire alimente à la fois
                // l'email Nodemailer existant et ce nouveau ticket.
                const userEmail = document.getElementById('modal_user_email')
                    ? document.getElementById('modal_user_email').value.trim()
                    : '';
                creerTicketBackend('devis', userEmail, memoData.telephone, {
                    branche: memoData.insuranceLabel,
                    vin: memoData.vin || undefined,
                    details: memoData.detailsData,
                    notes: memoData.notes || undefined,
                    ref_memo: memoData.ref,
                });

                if (!(await warnIfAttachmentsTooLarge())) {
                    submitBtn.innerHTML = originalBtnContent;
                    submitBtn.disabled = false;
                    return;
                }

                // Copie à l'agence UNIQUEMENT si WhatsApp a échoué (règle
                // anti-doublon déjà câblée côté serveur) — utilise désormais
                // la vraie adresse de l'agence actuellement sélectionnée,
                // les 11 boîtes créées le 04/08/2026.
                const selectedAgencyKey = document.getElementById('select-agences')
                    ? document.getElementById('select-agences').value
                    : null;
                const selectedAgency = selectedAgencyKey ? agencesData[selectedAgencyKey] : null;
                const agencyEmailForCC = whatsappBlocked && selectedAgency ? selectedAgency.email : null;

                sendQuoteEmail(this, agencyEmailForCC)
                    .then(() => {
                        const docsReminder = docs.length
                            ? `\n\nN'oubliez pas de joindre manuellement dans WhatsApp : ${docs.map(d => d.label).join(', ')} (WhatsApp ne permet pas leur envoi automatique).`
                            : '';
                        const whatsappNote = whatsappBlocked
                            ? `\n\nLe navigateur a bloqué l'ouverture de WhatsApp. Votre demande a bien été transmise par email — pour l'envoyer aussi sur WhatsApp, réessayez ou autorisez les pop-ups pour ce site.`
                            : `— mémo envoyé sur WhatsApp à l'agence : ${agenceNom} !`;
                        showToast(`Votre demande de cotation (Réf. ${ref}) a été transmise avec succès ${whatsappNote} Un conseiller prend en charge votre dossier.${docsReminder}\n\nVos informations restent enregistrées si vous souhaitez les corriger ou soumettre une nouvelle demande.`, 'success', 8000);
                        closeDevisModal();
                        // Le formulaire n'est volontairement PAS réinitialisé : les
                        // utilisateurs indécis doivent pouvoir corriger et resoumettre.
                    }, (error) => {
                        showToast(explainEmailError(error), 'error');
                        console.error('Erreur envoi email (Nodemailer) :', error);
                    })
                    .finally(() => {
                        submitBtn.innerHTML = originalBtnContent;
                        submitBtn.disabled = false;
                    });
            });
        }
    });
