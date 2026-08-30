// Service worker — espace-partenaire
// Cache nommé "partenaire-*" : garde-fou explicite contre toute fuite entre
// rôles via la Cache Storage API (partagée par origine, pas par scope —
// voir document d'architecture, section 2).
const CACHE_NAME = 'partenaire-shell-v1';
const APP_SHELL = [
  '/espace-partenaire/',
  '/espace-partenaire/index.html',
  '/espace-partage/myspace-app.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((noms) =>
      Promise.all(noms
        .filter((nom) => nom.startsWith('partenaire-') && nom !== CACHE_NAME)
        .map((nom) => caches.delete(nom))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Règle non négociable : jamais de cache sur /api/* (données authentifiées).
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((reponseEnCache) =>
      reponseEnCache || fetch(event.request)
    )
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
