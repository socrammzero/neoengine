const CACHE_NAME = 'neoengine-pwa-v2';
const CORE_ASSETS = [
  './index.html',
  './portal-totp.html',
  './manifest.json',
  './assets/img/logo-neoengine.svg',
  './assets/css/app.css',
  './assets/js/security-gate.js',
  './assets/js/storage.js',
  './assets/js/core-shell.js',
  './assets/js/code-runner.js',
  './assets/js/exercise-engine.js',
  './assets/js/exam-engine.js',
  './data/curriculum.json',
  './data/search-index.json',
  './cursos/anio-3/semestre-1/programacion-concurrente/index.html',
  './cursos/anio-3/semestre-1/programacion-concurrente/teoria/tema-01.html',
  './cursos/anio-3/semestre-1/programacion-concurrente/teoria/tema-02.html',
  './cursos/anio-3/semestre-1/programacion-concurrente/teoria/tema-03.html',
  './cursos/anio-3/semestre-1/programacion-concurrente/teoria/tema-04.html',
  './cursos/anio-3/semestre-1/programacion-concurrente/teoria/tema-05.html',
  './cursos/anio-3/semestre-1/programacion-concurrente/teoria/tema-06.html',
  './cursos/anio-3/semestre-1/programacion-concurrente/teoria/tema-07.html',
  './cursos/anio-3/semestre-1/programacion-concurrente/ejercicios/practica-tema-01.html',
  './cursos/anio-3/semestre-1/programacion-concurrente/ejercicios/practica-tema-02.html',
  './cursos/anio-3/semestre-1/programacion-concurrente/ejercicios/practica-tema-03.html',
  './cursos/anio-3/semestre-1/programacion-concurrente/ejercicios/practica-tema-04.html',
  './cursos/anio-3/semestre-1/programacion-concurrente/ejercicios/practica-tema-05.html',
  './cursos/anio-3/semestre-1/programacion-concurrente/ejercicios/practica-tema-06.html',
  './cursos/anio-3/semestre-1/programacion-concurrente/ejercicios/practica-tema-07.html',
  './cursos/anio-3/semestre-1/programacion-concurrente/evaluacion/examen-test.html',
  './cursos/anio-3/semestre-1/programacion-concurrente/evaluacion/banco-preguntas.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
