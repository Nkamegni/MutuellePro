// ===================================================================
// ui-commun.js -- Utilitaires d'interface partages : menu mobile,
// navigation section par section (fleches, defilement), notifications
// (toasts), boite de confirmation, installation PWA, consentement
// cookies, diaporama du Hero, Tom Select, compression d'image,
// prefixe telephonique.
//
// CHARGE APRES dictionnaire-langues.js -- utilise `currentLang` et
// `translations`. CHARGE AVANT tous les fichiers metier (devis.js,
// sinistre.js, agences.js, etc.), qui appellent showToast(),
// initTomSelect(), etc.
//
// Extrait d'index.html le 25/08/2026.
// ===================================================================

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


    // Ouvre/ferme le menu mobile (hamburger).
    function toggleMobileMenu() {
        document.getElementById('mobile-menu').classList.toggle('hidden');
    }


    // Met en surbrillance le lien de navigation correspondant à la
    // section actuellement visible (déclenché par l'IntersectionObserver
    // de main.js).
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

    const scrollPageOrder = ['page1-hero', 'page2-devis', 'comment-ca-marche', 'simulateur', 'assistant-ia', 'solutions', 'cabinet', 'contact'];

    let currentSectionIndex = 0;

    let arrowsDimmed = false;

    let arrowsInactivityTimer = null;


    const ARROW_OPACITY_VISIBLE = '0.35';

    const ARROW_OPACITY_HOVER_HINT = '0.35'; // le hover (CSS non nécessaire ici) reste géré par la couleur du texte


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


    // Ajuste l'opacité des flèches de navigation section-par-section
    // (visible/estompée selon l'inactivité récente -- cf.
    // resetArrowsInactivityTimer).
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


    // Relance le minuteur d'estompage des flèches de navigation à chaque
    // interaction utilisateur.
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


    // Navigation clavier/molette section par section (cf.
    // scrollPageOrder) -- utilisée par les flèches et les raccourcis
    // clavier haut/bas.
    function scrollToAdjacentSection(direction) {
        const targetIndex = currentSectionIndex + direction;
        if (targetIndex < 0 || targetIndex >= scrollPageOrder.length) return;
        const targetEl = document.getElementById(scrollPageOrder[targetIndex]);
        if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
    }

    // Mémorise la branche réelle visée quand elle diffère du radio physique
    // coché (ex. "Multirisque Pro" utilise le radio "Autres" avec un libellé
    // personnalisé) — openDevisModal() s'en sert en priorité si présent.

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

    const tomSelectInstances = {};


    // Initialise un champ Tom Select (bibliothèque externe, cf. balise
    // <script> jsdelivr.net dans le <head>) -- utilisée par devis.js et
    // sinistre.js pour tous les menus déroulants avec recherche. Hauteur
    // fixée en CSS (.ts-control, cf. <style> du <head>) -- ne jamais
    // remettre min-height:unset, cf. incident du 20/08/2026.
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


    // Déclenche l'invite d'installation PWA (beforeinstallprompt, capturé
    // dans deferredInstallPrompt).
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


    // Enregistre le choix du visiteur (accepté/refusé) dans
    // localStorage (COOKIE_CONSENT_KEY) et charge Google Analytics si
    // accepté.
    function handleCookieChoice(accepted) {
        localStorage.setItem(COOKIE_CONSENT_KEY, accepted ? 'accepted' : 'refused');
        document.getElementById('cookie-banner')?.classList.add('hidden');
        if (accepted) loadGoogleAnalytics();
    }


    // Affiche la bannière de consentement cookies si aucun choix n'a
    // encore été enregistré.
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


    // Fait tourner les 6 images de fond de la Page 1 (#page1-hero, cf.
    // index.html) en fondu enchaîné. Position de départ aléatoire depuis
    // le 25/08/2026 -- voir commentaire interne à la fonction.
    function setupHeroSlideshow() {
        const slides = document.querySelectorAll('#page1-hero .hero-slide');
        if (slides.length < 2) return; // rien à faire tourner

        const SLIDE_DURATION_MS = 5500; // ~5.5s par image, 6 images -> cycle de 33s

        // Position de depart aleatoire -- ajoute le 25/08/2026, a la
        // demande de Roger : sans ca, le site affichait toujours la meme
        // premiere image (hero-famille.jpg, opacity-100 fixe dans le
        // HTML) a chaque chargement/actualisation. On tire un index au
        // hasard, on bascule manuellement l'opacite pour que CE soit la
        // slide visible des le depart (au lieu de celle codee en dur dans
        // le HTML), puis le cycle normal reprend a partir de la.
        let currentIndex = Math.floor(Math.random() * slides.length);
        if (currentIndex !== 0) {
            slides[0].classList.remove('opacity-100');
            slides[0].classList.add('opacity-0');
            slides[currentIndex].classList.remove('opacity-0');
            slides[currentIndex].classList.add('opacity-100');
        }

        setInterval(() => {
            slides[currentIndex].classList.remove('opacity-100');
            slides[currentIndex].classList.add('opacity-0');
            currentIndex = (currentIndex + 1) % slides.length;
            slides[currentIndex].classList.remove('opacity-0');
            slides[currentIndex].classList.add('opacity-100');
        }, SLIDE_DURATION_MS);
    }


    const TOAST_STYLES = {
        info:    { icon: 'fa-circle-info',        bg: 'bg-navy',      },
        success: { icon: 'fa-circle-check',       bg: 'bg-emerald-600' },
        warning: { icon: 'fa-triangle-exclamation', bg: 'bg-amber-500' },
        error:   { icon: 'fa-circle-exclamation', bg: 'bg-red-600'    },
    };


    // Notification flottante générique (succès/erreur/avertissement/info)
    // -- utilisée PAR TOUS LES AUTRES FICHIERS (devis.js, sinistre.js,
    // agences.js...). Doit impérativement être chargée avant eux (cf.
    // ordre des balises <script> dans index.html).
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


    // Traduit un type de carburant issu du décodage VIN (souvent en
    // anglais brut, ex: "GASOLINE") vers son libellé français (cf.
    // FUEL_TYPE_FR) -- utilisée par devis.js lors de l'affichage des
    // résultats VIN.
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

    // Limites RÉELLES depuis la migration vers Nodemailer (serveur SMTP LWS) :
    // - MAX_FILE_SIZE_MB : plafond dur par fichier, doit correspondre exactement
    //   à la limite "multer" configurée côté serveur (voir server.js) — sinon
    //   un fichier accepté ici serait rejeté silencieusement à l'envoi.
    // - TOTAL_SIZE_WARNING_MB : simple avertissement (pas un blocage), les
    //   serveurs SMTP plafonnant souvent la taille totale d'un message autour
    //   de 20-25 Mo, tous fichiers confondus.
