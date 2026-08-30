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

