// Service Worker minimo per PWA
const CACHE_NAME = 'finance-app-v1';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './config.js',
  // Icone PWA
  './icons/icon-48.png',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-144.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './icons/icon-add.png'
];

// Installa il service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Attiva il service worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Intercetta le richieste
self.addEventListener('fetch', event => {
  // Strategia: Network First, Cache Fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Se la richiesta ha successo, aggiorna la cache
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // Se offline, usa la cache
        // Se la richiesta è per una pagina HTML, mostra fallback
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
        return caches.match(event.request);
      })
  );
});
