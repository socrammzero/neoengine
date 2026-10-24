const CACHE_NAME = 'neoengine-pwa-v3.2';
const CORE_ASSETS = [
  './index.html',
  './portal-totp.html',
  './manifest.json',
  './favicon.svg',
  './assets/img/logo-neoengine.svg',
  './assets/img/icon-192.png',
  './assets/img/icon-512.png',
  './assets/css/app.css',
  './assets/js/security-gate.js',
  './assets/js/storage.js',
  './assets/js/core-shell.js',
  './assets/js/code-runner.js',
  './assets/js/exercise-engine.js',
  './assets/js/exam-engine.js',
  './data/curriculum.json',
  './data/search-index.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.allSettled(CORE_ASSETS.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Estrategia Network-First con respaldo en Caché para reflejar cambios al instante y funcionar offline
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
