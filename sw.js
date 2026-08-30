// Service worker minimal — permet l'installation du site comme application
// (PWA) et une mise en cache basique des ressources principales.
// Ajout pur : n'interfère avec aucune fonctionnalité existante du site.

const CACHE_NAME = 'mutuellepro-cache-v1';
const CORE_ASSETS = [
    './index.html',
    './Logo_MPRO.png',
    './logo-192.png',
    './logo-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Stratégie "réseau d'abord, cache en secours" : garantit que le site reste
// toujours à jour quand la connexion est disponible (important ici, vu que
// l'API de décodage VIN et la géolocalisation ont besoin du réseau), tout en
// offrant un repli basique hors-ligne pour la page d'accueil.
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
