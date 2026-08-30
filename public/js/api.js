
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

    async function loadAgencesData() {
        try {
            const response = await fetch('/api/agences');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const rows = await response.json();
            if (!Array.isArray(rows) || rows.length === 0) throw new Error('Réponse vide ou invalide');

            const loaded = {};
            rows.forEach((row) => {
                loaded[row.cle] = {
                    lat: parseFloat(row.latitude),
                    lng: parseFloat(row.longitude),
                    nom: row.nom,
                    adr: row.adresse || '',
                    adrDetail: row.adresse_detail || '',
                    tel: row.telephone || '',
                    email: row.email || '',
                    type: row.type || 'agence',
                };
            });
            agencesData = loaded;
            console.log(`✅ ${rows.length} agences chargées depuis PostgreSQL.`);
        } catch (err) {
            console.warn('⚠️ Impossible de charger /api/agences, repli sur le siège uniquement :', err);
        }
    }

    async function espaceRefreshState() {
        const vueAnonyme = document.getElementById('espace-vue-anonyme');
        const vueConnecte = document.getElementById('espace-vue-connecte');
        refreshTopbarSessionIndicator();
        try {
            const resp = await fetch('/api/mes-tickets', { credentials: 'include' });
            if (resp.status === 401) {
                vueAnonyme.classList.remove('hidden');
                vueConnecte.classList.add('hidden');
                return;
            }
            const data = await resp.json();
            if (!data.succes) throw new Error('mes-tickets: réponse en échec');
            vueAnonyme.classList.add('hidden');
            vueConnecte.classList.remove('hidden');
            espaceRenderTickets(data.tickets);
        } catch (err) {
            console.error('Espace Client — erreur de vérification de session :', err);
            // En cas de doute (erreur réseau), on retombe sur la vue anonyme
            // plutôt que de laisser un état intermédiaire incohérent.
            vueAnonyme.classList.remove('hidden');
            vueConnecte.classList.add('hidden');
        }
    }

    async function espaceLogout() {
        try {
            await fetch('/api/deconnexion', { method: 'POST', credentials: 'include' });
        } catch (err) {
            console.error('Espace Client — erreur de déconnexion :', err);
        }
        const t = translations[currentLang] || translations.fr;
        showToast(t['espace.logoutSuccess'], 'success');
        await espaceRefreshState();
    }

    async function submitSinistre() {
        const t = SINISTRE_I18N[currentLang] || SINISTRE_I18N.fr;

        const branche = document.getElementById('sinistre-branche');
        const brancheLabel = branche.options[branche.selectedIndex].text;
        const police = document.getElementById('sinistre-police').value.trim();
        const date = document.getElementById('sinistre-date').value;
        const description = document.getElementById('sinistre-description').value.trim();
        const nom = document.getElementById('sinistre-nom').value.trim();
        const prefix = document.getElementById('sinistre-phone-prefix').value;
        const phone = document.getElementById('sinistre-phone').value.trim();
        const email = document.getElementById('sinistre-email').value.trim();

        if (!date || !description || !nom || !phone || !email) {
            showToast(t.champsManquants, 'warning');
            return;
        }

        const ref = generateSinistreRef();
        const telephone = `${prefix}${phone}`;
        const now = new Date();
        const dateStr = now.toLocaleDateString(t.locale, { day: '2-digit', month: 'long', year: 'numeric' });

        // --- Message WhatsApp ---
        const lignesWa = [
            t.waTitle, '',
            `${t.waRef} ${ref}`,
            `${t.waBranche} ${brancheLabel}`,
        ];
        if (police) lignesWa.push(`${t.waPolice} ${police}`);
        lignesWa.push(
            `${t.waDate} ${date}`, '',
            t.waDesc, description, '',
            t.waClient,
            nom,
            `${t.waPhone} ${telephone}`,
            `📧 ${email}`,
            `🗂️ Situation du compte : ${situationCompteLigne(email)}`, '',
            t.waFooter
        );
        const messageWa = lignesWa.join('\n');

        // Même numéro WhatsApp central que le reste du site (section
        // Assistance) -- pas de champ "whatsapp" par agence dans
        // agencesData (seul "tel" existe), donc pas de routage par agence
        // ici, volontairement simple comme le reste de cette fiche.
        window.open(`https://wa.me/237697717334?text=${encodeURIComponent(messageWa)}`, '_blank');

        // Ticket backend (Helpdesk Volet 2, site.tickets) — en parallèle,
        // jamais bloquant (voir commentaire de creerTicketBackend).
        creerTicketBackend('sinistre', email, telephone, {
            branche: brancheLabel,
            police: police || undefined,
            date_sinistre: date,
            description,
            ref_memo: ref,
        });

        // --- E-mail (memo HTML, meme endpoint que le devis -- generique) ---
        const memoHtml = [
            `<strong>${t.emailIntro}</strong><br><br>`,
            `${t.waRef} <strong>${ref}</strong><br>`,
            `${t.waBranche} ${brancheLabel}<br>`,
            police ? `${t.waPolice} ${police}<br>` : '',
            `${t.waDate} ${date}<br><br>`,
            `${t.waDesc}<br>${description.replace(/\n/g, '<br>')}<br><br>`,
            `${t.waClient}<br>${nom}<br>${t.waPhone} ${telephone}<br>Email : ${email}<br>Situation du compte : ${situationCompteLigne(email)}`,
        ].join('');

        try {
            const formData = new FormData();
            formData.append('memo_complet', memoHtml);
            formData.append('subject', `${t.emailSubject} ${ref} — ${brancheLabel}`);
            const resp = await fetch('/api/send-quote-email', { method: 'POST', body: formData });
            const data = await resp.json();
            if (!data.success) throw new Error(data.error || 'Echec envoi email');
            showToast(t.successMsg(ref), 'success');
        } catch (err) {
            console.error('Erreur envoi email sinistre:', err);
            showToast(t.errorMsg + ref, 'warning');
        }

        closeSinistreModal();
        document.getElementById('sinistre-form').reset();
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
