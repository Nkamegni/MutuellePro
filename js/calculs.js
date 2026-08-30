    // Mémorise la branche réelle visée quand elle diffère du radio physique
    // coché (ex. "Multirisque Pro" utilise le radio "Autres" avec un libellé
    // personnalisé) — openDevisModal() s'en sert en priorité si présent.
    let heroFormIntendedBranch = null;

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

    // Carrosserie et Genre canonique actuellement résolus -- mémorisés pour
    // que handleCombinaisonChange() (déclenché par Double Commande / Matière
    // inflammable) puisse recalculer l'Usage sans tout redemander.
    let currentCarrosserie = null;
    let currentGenreCanonique = null;


    // Agence retenue pour l'envoi WhatsApp de la demande de cotation.
    // Par défaut : le siège. Mise à jour dès que la géolocalisation aboutit.
    let resolvedAgencyKey = 'yaounde_siege';
    let resolvedAgencyDistanceKm = null;

    // -----------------------------------------------------------------
    // RECHERCHE VIN APPROXIMATIVE — déclenchée quand le décodage exact
    // échoue. État partagé entre les fonctions ci-dessous.
    // -----------------------------------------------------------------
    let vinSearchResults = [];
    let vinSearchPage = 0;
    const VIN_SEARCH_PAGE_SIZE = 5;

    // Référence de dossier lisible, générée une seule fois par ouverture de
    // la modale, réutilisée par le mémo WhatsApp ET le mémo archivé (PDF)
    // pour qu'ils portent exactement la même référence.
    let currentQuoteRef = null;

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

    function handleUsageChange() {
        const select = document.getElementById('auto_usage');
        const categorieField = document.getElementById('auto_categorie');
        if (categorieField) categorieField.value = select ? select.value : '';
        updateGenreFinalPreview(); // ex: "Camion" -> "Camion Simple Commande" si Usage devient 07SRC
        saveFormDraft();
    }
    // -----------------------------------------------------------------
    // Distance réelle à vol d'oiseau (formule de Haversine, en km) —
    // remplace l'ancienne approximation Math.hypot() sur les degrés bruts,
    // qui ne donnait pas une distance exploitable en kilomètres.
    // Cette fonction est partagée par TOUTES les recherches d'agence la
    // plus proche (WhatsApp et sélecteur manuel), pour garantir un résultat
    // cohérent partout.
    // -----------------------------------------------------------------
    function distanceKmHaversine(lat1, lng1, lat2, lng2) {
        const toRad = (deg) => (deg * Math.PI) / 180;
        const R = 6371; // rayon moyen de la Terre, en km
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function findNearestAgency(userLat, userLng) {
        let closestKey = 'yaounde_siege';
        let minDistance = Infinity;
        for (let key in agencesData) {
            const ag = agencesData[key];
            const dist = distanceKmHaversine(userLat, userLng, ag.lat, ag.lng);
            if (dist < minDistance) {
                minDistance = dist;
                closestKey = key;
            }
        }
        return { key: closestKey, distanceKm: minDistance };
    }

    // Distance affichée à l'utilisateur : +10% de marge (l'à-vol-d'oiseau
    // sous-estime toujours la distance réelle par la route), arrondie au
    // 0,5 km supérieur pour que "moins de X km" reste toujours vrai.
    function formatDistanceWithMargin(distanceKm) {
        const withMargin = distanceKm * 1.1;
        const rounded = Math.ceil(withMargin * 2) / 2;
        return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
    }


    function resolveNearestAgencyForQuote() {
        if (!navigator.geolocation) return; // pas de support → on garde le siège par défaut
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { key, distanceKm } = findNearestAgency(position.coords.latitude, position.coords.longitude);
                resolvedAgencyKey = key;
                resolvedAgencyDistanceKm = distanceKm;
                userGeoPosition = { lat: position.coords.latitude, lng: position.coords.longitude };
                showNearestAgencyBadge(key, distanceKm);
                applyNearestAgencyToContactSection(key, distanceKm);
                const ag = agencesData[key];
                if (ag) updateMapRoute(ag.lat, ag.lng);
            },
            (err) => {
                console.warn('Géolocalisation refusée ou indisponible (repli sur le siège) :', err.message);
                resolvedAgencyKey = 'yaounde_siege';
                resolvedAgencyDistanceKm = null;
            },
            { timeout: 8000, enableHighAccuracy: false }
        );
    }

    function generateSinistreRef() {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
        return `SIN-${stamp}`;
    }

    function translateFuelType(vpicValue) {
        if (!vpicValue) return '';
        return FUEL_TYPE_FR[vpicValue] || ''; // valeur inconnue → laissée vide, jamais devinée
    }

    // -----------------------------------------------------------------
    // Suivi des pièces justificatives sélectionnées par l'utilisateur.
    // Les fichiers eux-mêmes ne sont PAS envoyés automatiquement à
    // l'agence (WhatsApp ne le permet pas via un simple lien wa.me) :
    // on se contente de lister leurs noms, pour rappel à l'utilisateur
    // et pour le mémo archivé.
    // -----------------------------------------------------------------
    // -----------------------------------------------------------------
    // Compression des images côté client (canvas natif, aucune dépendance).
    // Indispensable : une photo de pièce prise au téléphone peut peser
    // plusieurs Mo — inexploitable pour un envoi (WhatsApp, email, mémo
    // archivé). Redimensionne à 1600px max de côté et recompresse en JPEG
    // qualité 75%. Les PDF ne sont pas concernés (canvas ne s'applique pas
    // aux documents, seulement aux images) et restent inchangés.
    // -----------------------------------------------------------------
    function compressImageFile(file, maxDim = 1600, quality = 0.75) {
        if (!file.type.startsWith('image/')) {
            return Promise.resolve(file); // PDF ou autre : inchangé
        }
        return new Promise((resolve) => {
            const objectUrl = URL.createObjectURL(file);
            const img = new Image();

            img.onload = () => {
                let { width, height } = img;
                if (width > maxDim || height > maxDim) {
                    const scale = Math.min(maxDim / width, maxDim / height);
                    width = Math.round(width * scale);
                    height = Math.round(height * scale);
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                URL.revokeObjectURL(objectUrl);

                canvas.toBlob((blob) => {
                    if (!blob) { resolve(file); return; } // échec de compression → on garde l'original
                    const compressed = new File(
                        [blob],
                        file.name.replace(/\.\w+$/, '.jpg'),
                        { type: 'image/jpeg', lastModified: Date.now() }
                    );
                    // Ne garder la version compressée que si elle est vraiment plus légère
                    resolve(compressed.size < file.size ? compressed : file);
                }, 'image/jpeg', quality);
            };

            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                resolve(file); // format non supporté par le navigateur → fichier original conservé
            };

            img.src = objectUrl;
        });
    }

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

    function generateQuoteRef() {
        const insuranceSelect = document.getElementById('insurance_type');
        const branchCode = insuranceSelect && insuranceSelect.value ? insuranceSelect.value.toUpperCase() : 'DEVIS';
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
        return `${branchCode}-${stamp}`;
    }

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

    function memoT() {
        return MEMO_I18N[currentLang] || MEMO_I18N.fr;
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
