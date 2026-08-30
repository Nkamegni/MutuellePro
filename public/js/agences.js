// ===================================================================
// agences.js -- Carte des agences (Leaflet), geolocalisation,
// detection de l'agence la plus proche, routage de contact.
//
// CHARGE APRES ui-commun.js (utilise showToast). Expose `agencesData`,
// utilise par devis.js pour la resolution d'agence lors de l'envoi
// d'un devis.
//
// Extrait d'index.html le 25/08/2026.
// ===================================================================

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

    // Agence retenue pour l'envoi WhatsApp de la demande de cotation.
    // Par défaut : le siège. Mise à jour dès que la géolocalisation aboutit.

    let resolvedAgencyKey = 'yaounde_siege';

    let resolvedAgencyDistanceKm = null;

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


    // Calcule, parmi les 10 agences de agencesData, celle la plus proche
    // d'une position donnée (Haversine, cf. distanceKmHaversine ci-dessus).
    // Repli sur le siège de Yaoundé si aucune coordonnée n'est disponible.
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


    // Point d'entrée utilisé par devis.js et sinistre.js au moment de
    // l'envoi : tente la géolocalisation, résout l'agence la plus proche,
    // et repli systématique sur le siège en cas de refus/échec -- ne
    // bloque jamais l'envoi d'un devis ou d'un sinistre.
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
                <div class="text-[13px] leading-snug opacity-80 mt-1"><i class="fa-solid fa-arrow-right text-base"></i> ${badgeText.awaits}</div>
                <div class="text-xs leading-snug opacity-70"><i class="fa-solid fa-comment text-sm"></i> ${badgeText.cta}</div>
                <div class="text-xs leading-snug opacity-60 mt-1.5 italic"><i class="fa-solid fa-map-location-dot text-sm"></i> ${badgeText.mapHint}</div>
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


    // Initialise la carte Leaflet (bibliothèque externe, cf. balise
    // <script> unpkg.com dans le <head>) de la section #contact, place les
    // 10 marqueurs d'agence et le marqueur de position utilisateur si
    // disponible.
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


    // Change l'agence affichée dans la section #contact (sélecteur
    // manuel côté visiteur) -- distinct de la résolution automatique par
    // géolocalisation (resolveNearestAgencyForQuote).
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


    // Variante d'affichage de findNearestAgency, dédiée à la mise à jour
    // visuelle de la section #contact (pas au flux d'envoi de devis/
    // sinistre, qui passe par resolveNearestAgencyForQuote).
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
            `Sujet : ${sujetLabel}`, '',
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

