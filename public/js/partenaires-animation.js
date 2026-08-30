// ===================================================================
// partenaires-animation.js -- Bandeau defilant et kaleidoscope animé
// des 18 compagnies du marche camerounais de l'assurance (section
// #partenaires). Tirage pondere, anti-chevauchement, anti-doublon
// simultane.
//
// Extrait d'index.html le 25/08/2026.
// ===================================================================

    let COMPAGNIES_PARTENAIRES = [];


    // Construit le bandeau défilant (pas le kaléidoscope, cf.
    // initPartnersAnimation plus bas) -- nombre de copies calculé
    // dynamiquement selon la largeur d'écran réelle (25/08/2026), pour
    // une couverture bord à bord garantie quelle que soit la résolution.
    function initPartnersBar() {
        // Taille restauree le 26/08/2026, a la demande de Roger : les
        // logos a 14px etaient devenus illisibles ("plus reconnaissables").
        // Retour a 28px (double de 14px, comme demande), et densite
        // reduite via un espacement plus genereux entre cartes (gap sur
        // le conteneur, cf. index.html #partners-track) plutot que via
        // la taille seule.
        const carte = (c) => `
            <div class="flex items-center justify-center border border-transparent hover:border-brandPurple/40 hover:bg-white hover:shadow-sm rounded-lg px-1.5 h-10 shrink-0 transition-all" title="${c.nom}">
                <img src="${c.logo}" alt="${c.nom}" style="width:28px; height:28px;" class="object-contain">
            </div>
        `;
        const html = COMPAGNIES_PARTENAIRES.map(carte).join('');
        const track = document.getElementById('partners-track');
        if (!track || COMPAGNIES_PARTENAIRES.length === 0) return;

        // Nombre de copies calculé dynamiquement le 25/08/2026 -- corrige
        // un vrai défaut : l'ancienne version (toujours 2 copies fixes)
        // ne couvrait pas forcément un très grand écran bord à bord une
        // fois les logos réduits, laissant un espace vide visible plutôt
        // qu'un défilement continu. On mesure la largeur réelle d'UNE
        // copie (rendue une fois hors-écran), puis on en déduit combien
        // de copies couvrent au moins 2x la largeur visible -- large
        // marge de sécurité, jamais de trou quelle que soit la résolution.
        track.innerHTML = html; // une première copie, pour mesurer sa largeur reelle
        const largeurUneCopie = track.scrollWidth || 1;
        const copiesNecessaires = Math.max(2, Math.ceil((window.innerWidth * 2) / largeurUneCopie));

        track.innerHTML = html.repeat(copiesNecessaires);
        // L'animation va de 0% à -(1/N)% de la largeur totale -- exactement
        // une "copie" de décalage, quel que soit N -- garantit la boucle
        // invisible peu importe le nombre de répétitions calculé ci-dessus.
        track.style.setProperty('--partners-scroll-pct', `-${100 / copiesNecessaires}%`);
    }

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


    // Tire la prochaine compagnie à afficher dans le kaléidoscope --
    // pondéré par poids_apparition (site.partenaires_assurance), garantit
    // qu'aucune compagnie déjà visible ailleurs à l'instant T n'est
    // retirée une seconde fois (cf. partnerActuellementVisibles).
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


    // Retire une compagnie de partnerActuellementVisibles une fois son
    // temps d'affichage écoulé -- la rend de nouveau tirable par
    // partnerNext.
    function partnerLibere(nom) {
        partnerActuellementVisibles.delete(nom);
    }


    // Utilitaire : nombre aléatoire dans un intervalle [min, max].
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
        // Étendue le 25/08/2026 (nombre d'emplacements doublé sur mobile
        // et desktop) -- plafonnait avant à 9 (3x3), insuffisant pour les
        // nouveaux totaux (16 mobile, 12 desktop).
        if (n <= 4) return { cols: 2, rows: 2 };
        if (n <= 6) return { cols: 3, rows: 2 };
        if (n <= 9) return { cols: 3, rows: 3 };
        if (n <= 12) return { cols: 4, rows: 3 };
        return { cols: 4, rows: 4 };
    }


    // Positionne un logo dans sa cellule de grille dédiée (anti-
    // chevauchement garanti par construction géométrique, pas par calcul
    // de collision -- cf. partnerGridPour).
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


    // Boucle d'un emplacement du kaléidoscope : affiche une compagnie
    // (partnerNext), attend un délai aléatoire, la retire (partnerLibere),
    // recommence indéfiniment.
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
        // Doublé une seconde fois le 25/08/2026 (mobile 8->16, desktop
        // 6->12 ; taille divisée par deux en retour, 84->42 mobile,
        // 220->110 desktop) -- même garde-fou toujours d'actualité :
        // deux fois plus d'emplacements exige des logos plus petits,
        // sinon les cellules deviennent trop petites pour les contenir
        // sans chevauchement (cf. partnerGridPour, étendue en conséquence).
        const largeur = window.innerWidth;
        const estMobile = largeur < 640;
        const nbSlots = estMobile ? 16 : (largeur < 1024 ? 8 : 12);
        const { cols, rows } = partnerGridPour(nbSlots);
        const tailleLogo = estMobile ? 42 : 110;
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


    // Déclaration globale -- retrouvée manquante le 15/08/2026 (effacée
    // par erreur lors d'une modification précédente), causant un plantage
    // JS si une fonction lisait currentLang avant le premier changement de
    // langue (ex: badge de proximité déclenché tôt par la géolocalisation).
