
    const BADGE_ACTIVE = "flex-1 text-center py-1.5 px-3 rounded-lg font-bold bg-brandRed text-white transition-all";
    const BADGE_INACTIVE = "flex-1 text-center py-1.5 px-3 rounded-lg font-bold bg-white/10 text-gray-300 transition-all";
    const BADGE_LOCKED = "flex-1 text-center py-1.5 px-3 rounded-lg font-bold bg-white/5 text-gray-500 transition-all cursor-not-allowed opacity-60";
    const BADGE_UNLOCKED_INACTIVE = "flex-1 text-center py-1.5 px-3 rounded-lg font-bold bg-white/10 text-gray-300 transition-all cursor-pointer hover:bg-white/20";

    // Compagnies partenaires — logos fournis par Roger le 13/08/2026.
    // Atlantique Assurances Cameroun a changé de nom pour AFG Assurances
    // Cameroun (mis à jour). Samiris Insurance Company et Alpha Assurances
    // SA retirées de la liste (décision du 13/08/2026).
    // Chargées depuis site.partenaires_assurance via /api/listes-reference
    // (décidé le 15/08/2026 : configuration pilotable par l'administrateur
    // du site -- ajout d'une compagnie, actif/inactif, poids d'apparition --
    // sans jamais avoir à modifier ce fichier). Remplie par loadListesReference().
    let COMPAGNIES_PARTENAIRES = [];

    // -----------------------------------------------------------------
    // ANIMATION ALÉATOIRE DES LOGOS PARTENAIRES — cahier des charges du
    // 13/08/2026 :
    //   1. Zone plein écran (100dvh), positionnée avant la bande défilante
    //   2. Logos à position ET durée aléatoires (apparition/disparition)
    //   3. Garantie : tous les logos passent au moins une fois par cycle
    //   4. Garantie : jamais deux fois de suite au même endroit
    //   5. Garantie : jamais d'écran totalement vide
    //   6. Rythme pensé pour rester léger en CPU (peu d'emplacements,
    //      transitions CSS -- accélérées matériellement -- plutôt que
    //      des recalculs JS répétés, minuteurs individuels plutôt qu'une
    //      boucle serrée)
    // -----------------------------------------------------------------
    // -----------------------------------------------------------------
    // MOTEUR DE TIRAGE — révisé le 15/08/2026 selon le nouveau cahier des
    // charges de Roger. Deux ensembles suivis en permanence :
    //   - partnerActuellementVisibles : compagnies AFFICHÉES là, tout de
    //     suite (garantie n°3 : jamais deux fois le même logo en même
    //     temps à l'écran, quel que soit l'emplacement)
    //   - partnerCycleVus : compagnies déjà passées depuis la dernière
    //     réinitialisation (garantie n°5 : un "cycle" = les 18 compagnies
    //     sont toutes passées au moins une fois ; dès que c'est le cas,
    //     réinitialisation automatique et un nouveau cycle démarre)
    // -----------------------------------------------------------------
    let partnerActuellementVisibles = new Set();
    let partnerCycleVus = new Set();

    // Déclaration globale -- retrouvée manquante le 15/08/2026 (effacée
    // par erreur lors d'une modification précédente), causant un plantage
    // JS si une fonction lisait currentLang avant le premier changement de
    // langue (ex: badge de proximité déclenché tôt par la géolocalisation).
    let currentLang = 'fr';

    // -----------------------------------------------------------------
    // FLÈCHES DE DÉFILEMENT ENTRE SECTIONS
    // Règle d'affichage :
    //   Page 1            : aucune flèche
    //   Page 2            : flèche BAS uniquement
    //   Page 3 à N-1      : flèches HAUT + BAS
    //   Dernière page (N) : flèche HAUT uniquement
    // Très discrètes (opacité faible), et se masquent après 3s d'inactivité
    // (réapparaissent au moindre mouvement/toucher/scroll).
    // -----------------------------------------------------------------
    const scrollPageOrder = ['accueil', 'comment-ca-marche', 'simulateur', 'assistant-ia', 'solutions', 'cabinet', 'contact'];
    let currentSectionIndex = 0;
    let arrowsDimmed = false;
    let arrowsInactivityTimer = null;

    const ARROW_OPACITY_VISIBLE = '0.35';
    const ARROW_OPACITY_HOVER_HINT = '0.35'; // le hover (CSS non nécessaire ici) reste géré par la couleur du texte

    // -----------------------------------------------------------------
    // PWA : enregistrement du service worker + invite d'installation.
    // Ajout pur — n'affecte aucune autre fonctionnalité du site. Le
    // bouton "Installer l'application" ne s'affiche que si le navigateur
    // propose réellement l'installation (Chrome/Edge/Android notamment ;
    // Safari iOS ne déclenche pas cet événement, le bouton y reste masqué).
    // -----------------------------------------------------------------
    let deferredInstallPrompt = null;

    // Mémorise la branche pour laquelle l'étape 3 a été débloquée (passage
    // effectif par l'étape 2). Si l'utilisateur change de branche, l'accès
    // direct à l'étape 3 doit se reverrouiller : les champs "Détails du
    // Risque" affichés ne correspondraient plus à la nouvelle branche tant
    // qu'on n'y est pas repassé.
    let step3UnlockedForBranch = null;

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

    function openProduitModal(cle) {
        const p = PRODUITS_5E[cle];
        if (!p) return;

        document.getElementById('produit-titre').textContent = p.titre;
        document.getElementById('produit-icone-titre').innerHTML = `<i class="fa-solid ${p.icone}"></i>`;
        const imgEl = document.getElementById('produit-image');
        if (imgEl) {
            imgEl.src = p.imageModal || p.image || '';
            imgEl.alt = p.titre;
            imgEl.style.aspectRatio = '600/657'; // ratio unique, identique aux 8 cartes
        }
        document.getElementById('produit-exemple').textContent = p.exemple;
        document.getElementById('produit-explication').textContent = p.explication;
        document.getElementById('produit-enjeu-intro').textContent = p.enjeuIntro;

        document.getElementById('produit-couverts').innerHTML = p.couverts
            .map((c) => `<li class="flex items-start gap-1.5"><i class="fa-solid fa-check text-emerald-500 mt-0.5 text-[10px]"></i><span>${c}</span></li>`).join('');
        document.getElementById('produit-non-couverts').innerHTML = p.nonCouverts
            .map((c) => `<li class="flex items-start gap-1.5"><i class="fa-solid fa-xmark text-red-400 mt-0.5 text-[10px]"></i><span>${c}</span></li>`).join('');

        document.getElementById('produit-questions').innerHTML = p.questions.map((qa) => `
            <div>
                <p class="text-xs font-bold text-gray-700">${qa.q}</p>
                <p class="text-xs text-gray-500">${qa.r}</p>
            </div>
        `).join('');

        document.getElementById('produit-formules').innerHTML = p.formules.map((f) => `
            <div class="bg-slate-50 border border-gray-200 rounded-xl p-3 text-center">
                <div class="text-xs font-extrabold text-navy mb-0.5">${f.nom}</div>
                <div class="text-[11px] font-bold text-brandPurple mb-1">${f.prix}</div>
                <div class="text-[10px] text-gray-500 leading-snug">${f.desc}</div>
            </div>
        `).join('');

        document.getElementById('produit-etape').textContent = p.etape;

        const ctaBtn = document.getElementById('produit-cta-btn');
        ctaBtn.onclick = () => {
            closeProduitModal();
            if (p.branchePersonnalisee) {
                selectDevisRisk(p.branche, p.branchePersonnalisee, p.brancheI18nKey);
            } else {
                selectDevisRisk(p.branche);
            }
            document.getElementById('devis')?.scrollIntoView({ behavior: 'smooth' });
            openDevisModal();
        };

        document.getElementById('produitModal').classList.remove('hidden');
    }

    function closeProduitModal() {
        document.getElementById('produitModal').classList.add('hidden');
    }


    function initPartnersBar() {
        // Taille réduite de moitié le 20/08/2026, à la demande de Roger :
        // double la densité de logos visibles simultanément dans la bande
        // défilante, sans toucher aux fichiers eux-mêmes (aucune perte de
        // qualité -- le navigateur réduit juste l'affichage d'une image
        // déjà là, aucune requête réseau supplémentaire, donc aucun
        // impact sur la vitesse de rendu).
        const carte = (c) => `
            <div class="flex items-center justify-center border border-transparent hover:border-brandPurple/40 hover:bg-white hover:shadow-sm rounded-lg px-1.5 h-10 shrink-0 transition-all" title="${c.nom}">
                <img src="${c.logo}" alt="${c.nom}" style="width:28px; height:28px;" class="object-contain">
            </div>
        `;
        const html = COMPAGNIES_PARTENAIRES.map(carte).join('');
        const listA = document.getElementById('partners-list-a');
        const listB = document.getElementById('partners-list-b');
        if (listA) listA.innerHTML = html;
        if (listB) listB.innerHTML = html; // copie identique, pour la boucle continue
    }

    function partnerNext() {
        // Bassin pondéré (poids_apparition, ex: GMC/Belife/Royal Onyx à 3x
        // depuis le 15/08/2026), en excluant tout ce qui est déjà visible
        // ailleurs à l'instant T.
        const construireBassin = (avecExclusion) => {
            const pool = [];
            COMPAGNIES_PARTENAIRES.forEach((c) => {
                if (avecExclusion && partnerActuellementVisibles.has(c.nom)) return;
                const poids = Math.max(1, c.poids || 1);
                for (let i = 0; i < poids; i++) pool.push(c);
            });
            return pool;
        };

        let pool = construireBassin(true);
        // Garde-fou : si jamais le bassin exclu était vide (cas limite --
        // plus d'emplacements actifs que de compagnies), on retombe sur
        // toutes les compagnies pour ne jamais bloquer l'animation.
        if (pool.length === 0) pool = construireBassin(false);

        const compagnie = pool[Math.floor(Math.random() * pool.length)];

        partnerActuellementVisibles.add(compagnie.nom);
        partnerCycleVus.add(compagnie.nom);

        // Cycle complet : réinitialise pour repartir sur un nouveau cycle
        // de 18 (garantie n°5).
        if (partnerCycleVus.size >= COMPAGNIES_PARTENAIRES.length) {
            partnerCycleVus = new Set();
        }

        return compagnie;
    }

    function partnerLibere(nom) {
        partnerActuellementVisibles.delete(nom);
    }

    function partnerRandom(min, max) {
        return min + Math.random() * (max - min);
    }

    // Positionnement en grille de cellules dédiées (correctif du
    // 13/08/2026) : chaque emplacement possède SA PROPRE région
    // rectangulaire, jamais partagée avec un autre -- deux logos ne
    // peuvent donc JAMAIS se chevaucher, par construction géométrique,
    // plutôt que par un calcul de collision a posteriori (plus fiable,
    // moins coûteux en CPU). Le tirage aléatoire ne joue qu'À L'INTÉRIEUR
    // de la cellule assignée, pour garder un effet organique.
    function partnerGridPour(n) {
        if (n <= 4) return { cols: 2, rows: 2 };
        if (n <= 6) return { cols: 3, rows: 2 };
        return { cols: 3, rows: 3 };
    }

    function partnerPositionSlot(el, container, cellIndex, cols, rows) {
        const w = container.clientWidth;
        const h = container.clientHeight;
        const cellW = w / cols;
        const cellH = h / rows;
        const col = cellIndex % cols;
        const row = Math.floor(cellIndex / cols);

        const taille = parseFloat(el.style.width) || 110;
        // Le logo reste TOUJOURS entièrement à l'intérieur de sa cellule --
        // son coin ne peut se déplacer que dans l'espace qui garantit ça.
        const maxDecalageX = Math.max(0, cellW - taille);
        const maxDecalageY = Math.max(0, cellH - taille);

        el.style.left = `${(col * cellW) + partnerRandom(0, maxDecalageX)}px`;
        el.style.top = `${(row * cellH) + partnerRandom(0, maxDecalageY)}px`;
    }

    function partnerScheduleSlot(el, cellIndex, cols, rows, rythme) {
        const delaiCache = partnerRandom(rythme.cacheMin, rythme.cacheMax);
        setTimeout(() => {
            const container = document.getElementById('partners-animation-zone');
            if (!container) return; // page quittée / section retirée

            const compagnie = partnerNext();
            el.dataset.dernierNom = compagnie.nom;
            partnerPositionSlot(el, container, cellIndex, cols, rows);
            el.innerHTML = `<img src="${compagnie.logo}" alt="" class="max-w-full max-h-full object-contain drop-shadow-md">`;
            el.classList.remove('opacity-0');
            el.classList.add('opacity-100');

            const dureeVisible = partnerRandom(rythme.visibleMin, rythme.visibleMax);
            setTimeout(() => {
                el.classList.remove('opacity-100');
                el.classList.add('opacity-0');
                // Libère le nom seulement APRÈS la transition de fondu
                // (700ms, cf. classe CSS) -- sinon un autre emplacement
                // pourrait piocher la même compagnie pendant qu'elle est
                // encore visuellement visible en train de disparaître.
                setTimeout(() => partnerLibere(compagnie.nom), 700);
                partnerScheduleSlot(el, cellIndex, cols, rows, rythme); // relance son propre cycle indépendamment
            }, dureeVisible);
        }, delaiCache);
    }

    // -----------------------------------------------------------------
    // AJUSTEMENT DE LA HAUTEUR DE LA SECTION PARTENAIRES — corrige le
    // 13/08/2026 : l'en-tête du site est "sticky" (toujours visible en
    // haut de l'écran), donc sa hauteur doit être SOUSTRAITE de la
    // hauteur "plein écran" de la section, sinon celle-ci déborde
    // exactement de la hauteur de l'en-tête sous la ligne de flottaison
    // (le bandeau du bas se retrouve alors hors de vue, comme observé).
    // Mesurée en JS (plutôt que codée en dur) pour rester juste même si
    // l'en-tête change un jour (texte plus long, logo redimensionné...).
    // -----------------------------------------------------------------
    function ajusterHauteurSectionPartenaires() {
        const section = document.getElementById('partenaires');
        const header = document.querySelector('header');
        if (!section || !header) return;

        // Plafonne la hauteur d'en-tête soustraite à 150px -- garde-fou :
        // si jamais la mesure réelle était anormalement grande (bug futur,
        // en-tête modifié plus tard...), la zone ne doit JAMAIS pouvoir
        // s'effondrer à une taille invisible. 150px est très généreux pour
        // un en-tête normal (~60-65px mesuré en pratique).
        const hauteurEntete = Math.min(header.offsetHeight || 0, 150);
        section.style.height = `calc(100vh - ${hauteurEntete}px)`;
        section.style.height = `calc(100dvh - ${hauteurEntete}px)`; // écrase la ligne au-dessus si dvh supporté
    }

    // Même principe que ci-dessus, appliqué à la section Assistance
    // (ajoutée le 20/08/2026) -- Roger jugeait l'ancienne version trop
    // grande ("presque une page de blanc à elle seule"). Fonction séparée
    // plutôt que généralisée à un id variable : chacune reste indépendante,
    // une panne sur l'une n'affecte jamais l'autre (même philosophie que
    // les blocs try/catch déjà séparés pour Partenaires).
    function ajusterHauteurSectionAssistance() {
        const section = document.getElementById('assistance');
        const header = document.querySelector('header');
        if (!section || !header) return;
        const hauteurEntete = Math.min(header.offsetHeight || 0, 150);
        section.style.height = `calc(100vh - ${hauteurEntete}px)`;
        section.style.height = `calc(100dvh - ${hauteurEntete}px)`;
    }

    function initPartnersAnimation() {
        const container = document.getElementById('partners-animation-zone');
        if (!container) return;

        // Réglages différenciés mobile/desktop (corrigé le 13/08/2026) --
        // avant cette correction, seuls le nombre et la taille des
        // emplacements changeaient, jamais le TEMPO -- d'où l'impression de
        // vide et de lenteur sur mobile (moins d'emplacements, même rythme
        // que le desktop). Mobile : plus d'emplacements ET cycle plus
        // rapide, pour combler l'écran plus étroit mais plus haut.
        //
        // Tailles doublées le 13/08/2026 (66/110px -> 132/220px), à la
        // demande de Roger. IMPORTANT : le nombre d'emplacements est réduit
        // en conséquence (6->4 mobile, 9->6 desktop) -- avec des logos deux
        // fois plus grands, garder le même nombre de cellules les aurait
        // rendues trop petites pour les contenir, risquant exactement le
        // chevauchement qu'on avait pris soin d'éliminer.
        // Emplacements mobile doublés le 20/08/2026 (4 -> 8), à la demande
        // de Roger -- avec le même garde-fou déjà appliqué le 13/08 :
        // deux fois plus d'emplacements exige des logos plus petits, sinon
        // les cellules de la grille deviennent trop petites pour les
        // contenir sans chevauchement. 132px -> 84px sur mobile (grille
        // 3x3 au lieu de 2x2, cf. partnerGridPour).
        const largeur = window.innerWidth;
        const estMobile = largeur < 640;
        const nbSlots = estMobile ? 8 : (largeur < 1024 ? 4 : 6);
        const { cols, rows } = partnerGridPour(nbSlots);
        const tailleLogo = estMobile ? 84 : 220;
        // Rythme accéléré le 15/08/2026 (points 1 et 2) : durée maximum
        // d'apparition réduite de moitié (visibleMax), et délais raccourcis
        // dans l'ensemble pour augmenter le nombre de cycles complets
        // (les 18 compagnies passées) par tranche de 60 secondes.
        const rythme = estMobile
            ? { cacheMin: 300, cacheMax: 900, visibleMin: 900, visibleMax: 1600 }
            : { cacheMin: 600, cacheMax: 2200, visibleMin: 1400, visibleMax: 2750 };

        const slots = [];
        for (let i = 0; i < nbSlots; i++) {
            const el = document.createElement('div');
            el.className = 'absolute opacity-0 transition-opacity duration-700 ease-in-out flex items-center justify-center pointer-events-none';
            el.style.width = `${tailleLogo}px`;
            el.style.height = `${tailleLogo}px`;
            container.appendChild(el);
            slots.push(el);
            partnerScheduleSlot(el, i, cols, rows, rythme);
        }

        // Garde-fou (garantie n°5 de la version précédente, toujours valable) :
        // vérifie périodiquement qu'au moins un logo est visible -- sinon en
        // force un immédiatement. Intervalle volontairement peu fréquent
        // (2,5s) pour rester léger en CPU.
        setInterval(() => {
            const visibles = slots.filter((s) => s.classList.contains('opacity-100'));
            if (visibles.length === 0 && slots.length > 0) {
                const idx = Math.floor(Math.random() * slots.length);
                const el = slots[idx];
                const compagnie = partnerNext();
                el.dataset.dernierNom = compagnie.nom;
                partnerPositionSlot(el, container, idx, cols, rows);
                el.innerHTML = `<img src="${compagnie.logo}" alt="" class="max-w-full max-h-full object-contain drop-shadow-md">`;
                el.classList.remove('opacity-0');
                el.classList.add('opacity-100');
            }
        }, 2500);
    }


    function setLanguage(lang) {
        currentLang = lang;
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (translations[lang] && translations[lang][key]) {
                // innerHTML (et non textContent) : permet de stocker un <br>
                // directement dans le dictionnaire pour les titres à deux
                // lignes (ex. "Gestion<br>Sinistres"), sans cas particulier
                // à gérer — le retour à la ligne survit désormais aux
                // changements de langue. Contenu entièrement maîtrisé
                // (dictionnaire interne, jamais de saisie utilisateur ici).
                element.innerHTML = translations[lang][key];
            }
        });
        if(lang === 'fr') {
            document.getElementById('btn-lang-fr').className = 'text-purple-300 font-extrabold';
            document.getElementById('btn-lang-en').className = 'text-gray-300 hover:text-white transition font-normal';
        } else {
            document.getElementById('btn-lang-en').className = 'text-purple-300 font-extrabold';
            document.getElementById('btn-lang-fr').className = 'text-gray-300 hover:text-white transition font-normal';
        }

        // Si l'affichette de proximité est ouverte au moment du changement de
        // langue, on la régénère immédiatement dans la nouvelle langue —
        // plutôt que d'attendre sa prochaine apparition.
        const openBadge = document.getElementById('agence-proximite-badge');
        if (openBadge && resolvedAgencyKey && resolvedAgencyDistanceKm != null) {
            showNearestAgencyBadge(resolvedAgencyKey, resolvedAgencyDistanceKm);
        }
    }

    function toggleMobileMenu() {
        document.getElementById('mobile-menu').classList.toggle('hidden');
    }

    function setActiveMenuLink(id) {
        document.querySelectorAll('.nav-link').forEach(link => {
            const href = link.getAttribute('href');
            if (href === '#' + id) {
                link.className = 'nav-link py-1 transition text-brandPurple border-b-2 border-brandPurple';
            } else {
                link.className = 'nav-link py-1 hover:text-brandPurple transition text-navy';
            }
        });
    }

    function updateScrollArrows() {
        const upBtn = document.getElementById('scroll-arrow-up');
        const downBtn = document.getElementById('scroll-arrow-down');
        if (!upBtn || !downBtn) return;

        const total = scrollPageOrder.length;
        const idx = currentSectionIndex;
        let showUp, showDown;

        if (idx === 0) {
            showUp = false; showDown = false;                 // Page 1 : rien
        } else if (idx === total - 1) {
            showUp = true; showDown = false;                  // Dernière page : haut seul
        } else if (idx === 1) {
            showUp = false; showDown = true;                  // Page 2 : bas seul
        } else {
            showUp = true; showDown = true;                   // Pages intermédiaires : les deux
        }

        upBtn.style.display = showUp ? 'block' : 'none';
        downBtn.style.display = showDown ? 'block' : 'none';

        applyArrowsOpacity();
    }

    function applyArrowsOpacity() {
        const opacity = arrowsDimmed ? '0' : ARROW_OPACITY_VISIBLE;
        const pointerEvents = arrowsDimmed ? 'none' : 'auto';
        ['scroll-arrow-up', 'scroll-arrow-down'].forEach((id) => {
            const btn = document.getElementById(id);
            if (btn && btn.style.display !== 'none') {
                btn.style.opacity = opacity;
                btn.style.pointerEvents = pointerEvents;
            }
        });
    }

    function resetArrowsInactivityTimer() {
        if (arrowsDimmed) {
            arrowsDimmed = false;
            applyArrowsOpacity();
        }
        clearTimeout(arrowsInactivityTimer);
        arrowsInactivityTimer = setTimeout(() => {
            arrowsDimmed = true;
            applyArrowsOpacity();
        }, 3000);
    }

    function scrollToAdjacentSection(direction) {
        const targetIndex = currentSectionIndex + direction;
        if (targetIndex < 0 || targetIndex >= scrollPageOrder.length) return;
        const targetEl = document.getElementById(scrollPageOrder[targetIndex]);
        if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
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
    // Met à jour la zone "Nos Agences" (sélecteur + carte + message de statut)
    // avec l'agence la plus proche détectée. Appelée automatiquement dès la
    // première résolution de géolocalisation (chargement du site), ET par
    // le bouton "Trouver l'agence la plus proche de moi" — même résultat
    // affiché immédiatement dans les deux cas, sans attendre un clic manuel.
    function applyNearestAgencyToContactSection(key, distanceKm) {
        const select = document.getElementById('select-agences');
        if (select) select.value = key;
        changerAgence(key);

        const status = document.getElementById('geo-status');
        if (status) {
            const isEn = currentLang === 'en';
            const text = isEn
                ? `Nearest branch already selected! (~${formatDistanceWithMargin(distanceKm)} km as the crow flies)`
                : `Agence la plus proche sélectionnée ! (~${formatDistanceWithMargin(distanceKm)} km à vol d'oiseau)`;
            renderGeoStatus('<i class="fa-solid fa-circle-check text-emerald-500"></i>', text);
        }
    }

    // -----------------------------------------------------------------
    // Affichette signalant l'agence la plus proche détectée — volontairement
    // IMPOSANTE et PERSISTANTE : un assureur ne se cache pas. Elle reste
    // affichée jusqu'à fermeture manuelle (pas de disparition automatique).
    // -----------------------------------------------------------------
    function showNearestAgencyBadge(key, distanceKm) {
        const agence = agencesData[key];
        if (!agence) return;
        const dist = formatDistanceWithMargin(distanceKm);
        const isEn = currentLang === 'en';

        let badge = document.getElementById('agence-proximite-badge');
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'agence-proximite-badge';
            badge.className =
                'fixed z-[70] bottom-3 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-6 sm:w-[520px] ' +
                'bg-gradient-to-r from-brandRed via-brandRed to-brandPurple text-white rounded-2xl shadow-2xl ' +
                'pl-2.5 pr-4 py-4 flex items-center gap-2.5 border-2 border-white/40 badge-cursor-bolt ' +
                'hover:brightness-110 active:scale-[0.98] transition-all duration-500 ease-out translate-y-8 opacity-0 scale-95';
            badge.setAttribute('role', 'button');
            badge.setAttribute('tabindex', '0');
            badge.setAttribute('aria-label', isEn ? "View the nearest branch on the map" : "Voir l'agence la plus proche sur la carte");

            // Toute l'affichette renvoie vers la carte (section Contact) pour
            // que l'utilisateur puisse vérifier visuellement la distance
            // annoncée — sauf clic sur le bouton de fermeture (voir plus bas).
            badge.addEventListener('click', () => {
                const contactSection = document.getElementById('contact');
                if (contactSection) contactSection.scrollIntoView({ behavior: 'smooth' });
            });
            badge.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    badge.click();
                }
            });

            document.body.appendChild(badge);
        }

        const badgeText = isEn
            ? {
                distance: `You're less than ${dist} km from our branch!`,
                awaits: "We're looking forward to it",
                cta: 'Come visit us or get in touch',
                mapHint: 'Tap to see it on the map',
              }
            : {
                distance: `Vous êtes à moins de ${dist} km de notre agence !`,
                awaits: 'Nous vous attendons',
                cta: 'Venez nous voir ou contactez-nous',
                mapHint: 'Toucher pour voir sur la carte',
              };

        badge.innerHTML = `
            <div class="shrink-0 bg-white rounded-xl p-1 flex items-center justify-center">
                <img src="Logo_MPRO.png" alt="MutuellePro" class="h-12 w-auto object-contain">
            </div>
            <div class="flex-1">
                <div class="text-base font-extrabold leading-tight">${badgeText.distance}</div>
                <div class="text-base font-extrabold leading-tight mt-1">${agence.nom.toUpperCase()}</div>
                <div class="text-[13px] leading-snug opacity-80 mt-1"><i class="fa-solid fa-arrow-right"></i> ${badgeText.awaits}</div>
                <div class="text-xs leading-snug opacity-70"><i class="fa-solid fa-comment"></i> ${badgeText.cta}</div>
                <div class="text-[10px] leading-snug opacity-60 mt-1.5 italic"><i class="fa-solid fa-map-location-dot"></i> ${badgeText.mapHint}</div>
            </div>
            <button onclick="event.stopPropagation(); document.getElementById('agence-proximite-badge').remove()"
                    class="text-white/80 hover:text-white text-xl shrink-0 self-start cursor-pointer" style="cursor:pointer;" aria-label="${isEn ? 'Close' : 'Fermer'}">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;

        requestAnimationFrame(() => {
            badge.classList.remove('translate-y-8', 'opacity-0', 'scale-95');
        });

        // Pas de disparition automatique : reste visible tant que l'utilisateur
        // ne la ferme pas lui-même via le bouton ✕.
    }

    function initMap() {
        const defaultAgence = agencesData["yaounde_siege"];
        map = L.map('map').setView([defaultAgence.lat, defaultAgence.lng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(map);
        const pulseIcon = L.divIcon({ className: '', html: '<div class="pulse-dot"></div>', iconSize: [16, 16] });
        marker = L.marker([defaultAgence.lat, defaultAgence.lng], { icon: pulseIcon }).addTo(map)
            .bindPopup(defaultAgence.nom)
            .openPopup();
    }

    // Trace (ou retrace) le trajet en pointillés entre la position détectée
    // de l'utilisateur et l'agence actuellement affichée sur la carte —
    // pur ajout visuel, n'affecte aucune autre fonctionnalité existante.
    function updateMapRoute(agenceLat, agenceLng) {
        if (!map || !userGeoPosition) return;

        const userIcon = L.divIcon({ className: '', html: '<div class="user-dot"></div>', iconSize: [14, 14] });
        if (userPositionMarker) {
            userPositionMarker.setLatLng([userGeoPosition.lat, userGeoPosition.lng]);
        } else {
            userPositionMarker = L.marker([userGeoPosition.lat, userGeoPosition.lng], { icon: userIcon })
                .addTo(map)
                .bindPopup('Votre position');
        }

        const routeCoords = [[userGeoPosition.lat, userGeoPosition.lng], [agenceLat, agenceLng]];
        if (routeLine) {
            routeLine.setLatLngs(routeCoords);
        } else {
            routeLine = L.polyline(routeCoords, { color: '#8B5CF6', weight: 2, dashArray: '6, 8', opacity: 0.8 }).addTo(map);
        }

        map.fitBounds(routeCoords, { padding: [40, 40], maxZoom: 14 });
    }

    // Affiche le statut de géolocalisation avec l'icône isolée sur la marge
    // gauche (colonne fixe) et le texte dans une colonne flexible à côté —
    // si le texte est assez long pour passer à la ligne, la suite s'aligne
    // proprement sous le texte, pas sous l'icône répétée.
    function renderGeoStatus(icon, text) {
        const status = document.getElementById('geo-status');
        if (!status) return;
        status.classList.remove('hidden');
        status.innerHTML = `<span class="shrink-0">${icon}</span><span>${text}</span>`;
    }

    function changerAgence(key) {
        const agence = agencesData[key];
        if (!agence) return;
        document.getElementById('agence-nom').textContent = agence.nom;
        document.getElementById('agence-adresse').textContent = agence.adr;
        document.getElementById('agence-adresse-detail').textContent = agence.adrDetail || '';
        const telLink = document.getElementById('agence-tel');
        telLink.textContent = agence.tel;
        telLink.setAttribute('href', 'tel:' + agence.tel.replace(/\s+/g, ''));

        if (map && marker) {
            marker.setLatLng([agence.lat, agence.lng]).bindPopup(agence.nom).openPopup();
            if (userGeoPosition) {
                updateMapRoute(agence.lat, agence.lng);
            } else {
                map.setView([agence.lat, agence.lng], 14);
            }
        }

        // Signale la distance de l'agence choisie manuellement — sauf si
        // c'est déjà l'agence la plus proche détectée : le kilométrage a
        // alors déjà été annoncé plus haut, pas besoin de le répéter.
        const status = document.getElementById('geo-status');
        if (status && userGeoPosition) {
            const isEn = currentLang === 'en';
            if (key === resolvedAgencyKey) {
                renderGeoStatus('<i class="fa-solid fa-circle-check text-emerald-500"></i>', isEn ? 'This is the nearest branch!' : "C'est l'agence la plus proche !");
            } else {
                const d = distanceKmHaversine(userGeoPosition.lat, userGeoPosition.lng, agence.lat, agence.lng);
                const text = isEn
                    ? `This branch is about ${formatDistanceWithMargin(d)} km away as the crow flies.`
                    : `Cette agence est à environ ${formatDistanceWithMargin(d)} km à vol d'oiseau.`;
                renderGeoStatus('<i class="fa-solid fa-location-dot text-brandPurple"></i>', text);
            }
        }
    }

    function trouverAgencePlusProche() {
        const status = document.getElementById('geo-status');
        status.classList.remove('hidden');
        status.textContent = "Recherche de votre position...";

        if (!navigator.geolocation) {
            status.textContent = "La géolocalisation n'est pas supportée par votre navigateur.";
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { key, distanceKm } = findNearestAgency(position.coords.latitude, position.coords.longitude);
                applyNearestAgencyToContactSection(key, distanceKm);
            },
            (err) => {
                console.warn('Géolocalisation refusée ou indisponible :', err.message);
                status.textContent = "Impossible d'accéder à votre position. Vérifiez que vous naviguez bien sur http://localhost (pas un fichier ouvert directement) et que la géolocalisation est autorisée.";
            },
            { timeout: 8000, enableHighAccuracy: false }
        );
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
    // DÉCLARATION DE SINISTRE -- fiche simplifiée (19/08/2026). Réutilise
    // le mécanisme de référence + envoi WhatsApp/email déjà éprouvé sur
    // le devis, mais en autonome (pas de dépendance à MEMO_I18N, pour ne
    // rien risquer de casser sur le flux devis existant). En attendant le
    // vrai système de comptes/tickets (Volet 2), cette référence reste le
    // seul moyen de suivi -- à conserver par le client.
    // -------------------------------------------------------------
    function openSinistreModal() {
        const modal = document.getElementById('sinistreModal');
        if (modal) modal.classList.remove('hidden');
        const dateInput = document.getElementById('sinistre-date');
        if (dateInput && !dateInput.value) {
            dateInput.max = new Date().toISOString().split('T')[0]; // jamais une date future
            dateInput.value = new Date().toISOString().split('T')[0];
        }
    }

    function closeSinistreModal() {
        const modal = document.getElementById('sinistreModal');
        if (modal) modal.classList.add('hidden');
    }

    // Libellés de statut affichés (bilingues, cohérents avec data-i18n)
    // en fonction du code_statut_ticket renvoyé par /api/mes-tickets.
    function espaceStatutLabel(codeStatut) {
        const t = translations[currentLang] || translations.fr;
        const map = { recu: t['espace.statutRecu'], en_cours: t['espace.statutEnCours'], resolu: t['espace.statutResolu'] };
        return map[codeStatut] || codeStatut;
    }
    function espaceStatutBadgeClass(codeStatut) {
        if (codeStatut === 'resolu') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (codeStatut === 'en_cours') return 'bg-amber-50 text-amber-700 border-amber-200';
        return 'bg-blue-50 text-blue-700 border-blue-200'; // recu
    }

    // Ouvre la modale et détermine immédiatement l'état de connexion en
    // interrogeant /api/mes-tickets : un 401 signifie "non connecté" (vue
    // anonyme), un succès signifie "connecté" (vue tickets). Évite un
    // endpoint dédié "qui suis-je" -- une seule requête sert les deux buts.
    async function openEspaceClientModal() {
        const modal = document.getElementById('espaceClientModal');
        if (modal) modal.classList.remove('hidden');
        await espaceRefreshState();
    }

    function closeEspaceClientModal() {
        const modal = document.getElementById('espaceClientModal');
        if (modal) modal.classList.add('hidden');
    }

    // -------------------------------------------------------------
    // Indicateur "connecté" dans la topbar (19/08/2026, sur demande de
    // Roger) -- utilise /api/session, volontairement distinct de
    // /api/mes-tickets pour ne pas charger la liste complète des tickets
    // sur CHAQUE page vue alors que la topbar a juste besoin de savoir
    // si on est connecté. Appelé au chargement de la page ET à chaque
    // fois que l'état de connexion change (connexion/inscription/
    // déconnexion), via espaceRefreshState().
    // -------------------------------------------------------------
    function refreshTopbarSessionIndicator() {
        const link = document.getElementById('topbar-espace-link');
        const icon = document.getElementById('topbar-espace-icon');
        const label = document.getElementById('topbar-espace-label');
        if (!link || !icon || !label) return;

        fetch('/api/session', { credentials: 'include' })
            .then((r) => (r.status === 200 ? r.json() : null))
            .then((data) => {
                const t = translations[currentLang] || translations.fr;
                if (data && data.succes && data.connecte) {
                    link.classList.remove('bg-brandPurple/40', 'hover:bg-brandPurple', 'border-purple-400/30');
                    link.classList.add('bg-emerald-500', 'hover:bg-emerald-400', 'border-emerald-300', 'shadow-[0_0_8px_rgba(16,185,129,0.6)]');
                    icon.className = 'fa-solid fa-circle-user text-[9px] lg:text-xs';
                    const identifiant = (data.compte && data.compte.email) || '';
                    const court = identifiant.length > 18 ? identifiant.slice(0, 15) + '…' : identifiant;
                    label.removeAttribute('data-i18n'); // évite qu'un changement de langue n'écrase l'email affiché
                    label.textContent = court || t['topbar.loggedInAs'];
                } else {
                    link.classList.add('bg-brandPurple/40', 'hover:bg-brandPurple', 'border-purple-400/30');
                    link.classList.remove('bg-emerald-500', 'hover:bg-emerald-400', 'border-emerald-300', 'shadow-[0_0_8px_rgba(16,185,129,0.6)]');
                    icon.className = 'fa-solid fa-user-lock text-[9px] lg:text-xs';
                    label.setAttribute('data-i18n', 'topbar.clientSpace');
                    label.textContent = t['topbar.clientSpace'];
                }
            })
            .catch((err) => console.error('Indicateur topbar — erreur de vérification de session :', err));
    }

    function espaceRenderTickets(tickets) {
        const t = translations[currentLang] || translations.fr;
        const container = document.getElementById('espace-tickets-list');
        if (!container) return;

        if (!tickets || tickets.length === 0) {
            container.innerHTML = `<p class="text-xs text-gray-400 text-center py-6">${t['espace.noTickets']}</p>`;
            return;
        }

        const labelKey = currentLang === 'en' ? 'type_libelle_en' : 'type_libelle_fr';
        container.innerHTML = tickets.map((ticket) => {
            const dateStr = new Date(ticket.date_creation).toLocaleDateString(
                currentLang === 'en' ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }
            );
            return `
                <div class="border border-gray-200 rounded-xl p-3">
                    <div class="flex justify-between items-start gap-2 mb-1">
                        <span class="text-xs font-extrabold text-navy">${ticket[labelKey]}</span>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${espaceStatutBadgeClass(ticket.code_statut_ticket)}">${espaceStatutLabel(ticket.code_statut_ticket)}</span>
                    </div>
                    <p class="text-[11px] text-gray-400">${ticket.code_ticket} — ${dateStr}</p>
                </div>
            `;
        }).join('');
    }

    function espaceSwitchTab(tab) {
        const tabLogin = document.getElementById('espace-tab-login');
        const tabRegister = document.getElementById('espace-tab-register');
        const formLogin = document.getElementById('espace-login-form');
        const formRegister = document.getElementById('espace-register-form');

        const activeClasses = ['bg-white', 'text-navy', 'shadow-sm'];
        const inactiveClasses = ['text-gray-500'];

        if (tab === 'register') {
            formLogin.classList.add('hidden');
            formRegister.classList.remove('hidden');
            tabRegister.classList.add(...activeClasses);
            tabRegister.classList.remove(...inactiveClasses);
            tabLogin.classList.remove(...activeClasses);
            tabLogin.classList.add(...inactiveClasses);
        } else {
            formRegister.classList.add('hidden');
            formLogin.classList.remove('hidden');
            tabLogin.classList.add(...activeClasses);
            tabLogin.classList.remove(...inactiveClasses);
            tabRegister.classList.remove(...activeClasses);
            tabRegister.classList.add(...inactiveClasses);
        }
    }

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

    function tryGoToStep3() {
        const insurance = document.getElementById('insurance_type').value;
        if (!insurance || step3UnlockedForBranch !== insurance) {
            return; // verrouillé : passage obligé par l'étape 2 au moins une fois pour cette branche
        }
        goToStep3();
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

    function showToast(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toast-container');
        if (!container) { console.warn('Toast (conteneur absent) :', message); return; }

        const style = TOAST_STYLES[type] || TOAST_STYLES.info;
        const toast = document.createElement('div');
        toast.className = `${style.bg} text-white text-xs rounded-xl shadow-lg px-4 py-3 flex items-start gap-2.5 opacity-0 translate-x-4 transition-all duration-300`;
        toast.innerHTML = `
            <i class="fa-solid ${style.icon} mt-0.5 shrink-0"></i>
            <span class="flex-1 leading-relaxed whitespace-pre-line">${message}</span>
            <button type="button" aria-label="Fermer la notification" class="shrink-0 opacity-70 hover:opacity-100">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
        container.appendChild(toast);

        // Anime l'entrée
        requestAnimationFrame(() => {
            toast.classList.remove('opacity-0', 'translate-x-4');
        });

        const dismiss = () => {
            toast.classList.add('opacity-0', 'translate-x-4');
            setTimeout(() => toast.remove(), 300);
        };
        toast.querySelector('button').addEventListener('click', dismiss);
        if (duration > 0) setTimeout(dismiss, duration);
    }

    // -----------------------------------------------------------------
    // BOÎTE DE DIALOGUE DE CONFIRMATION — remplace confirm(). Retourne
    // une Promise<boolean>, à utiliser avec await, ex:
    //   const ok = await showConfirmDialog('Voulez-vous continuer ?');
    // -----------------------------------------------------------------
    function showConfirmDialog(message) {
        return new Promise((resolve) => {
            const overlay = document.getElementById('confirm-dialog-overlay');
            const messageEl = document.getElementById('confirm-dialog-message');
            const btnOk = document.getElementById('confirm-dialog-ok');
            const btnCancel = document.getElementById('confirm-dialog-cancel');

            messageEl.textContent = message;
            overlay.classList.remove('hidden');

            const cleanup = (result) => {
                overlay.classList.add('hidden');
                btnOk.removeEventListener('click', onOk);
                btnCancel.removeEventListener('click', onCancel);
                resolve(result);
            };
            const onOk = () => cleanup(true);
            const onCancel = () => cleanup(false);

            btnOk.addEventListener('click', onOk);
            btnCancel.addEventListener('click', onCancel);
        });
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

    // Remplit le champ caché "memo_complet" à partir de la source unique.
    // Appelée systématiquement avant TOUT envoi d'email (archivage ET
    // soumission normale) — plus jamais d'email vide.
    function populateMemoCompletField(data) {
        const memoField = document.getElementById('memo_complet_field');
        if (memoField) memoField.value = buildMemoPlainText(data);
    }

    function fieldKey(el) {
        return el.id || el.name;
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
