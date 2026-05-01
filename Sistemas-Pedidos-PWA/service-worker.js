const CACHE_NAME = 'pedidos-v3';

const RECURSOS_ESTATICOS = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/db.js',
  './js/firebase.js',
  './manifest.json',
  './img/icon-192x192.png',
  './img/icon-512x512.png'
];

// INSTALACIÓN: precarga recursos estáticos
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(RECURSOS_ESTATICOS))
      .catch(err => console.error('Error en caché:', err))
  );
});

// ACTIVACIÓN: elimina cachés antiguas
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// FETCH: Network first para Firebase, Cache first para estáticos
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = e.request.url;

  // Firebase y APIs externas: solo red, sin cachear
  if (url.includes('firestore.googleapis.com') ||
      url.includes('firebase') ||
      url.includes('googleapis.com') ||
      url.includes('gstatic.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Recursos estáticos: Stale-While-Revalidate
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res =>
        caches.open(CACHE_NAME).then(cache => {
          cache.put(e.request, res.clone());
          return res;
        })
      ).catch(() => caches.match('./index.html'));
      return cached || network;
    })
  );
});