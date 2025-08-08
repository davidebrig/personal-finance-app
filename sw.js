// Service Worker per PWA (network-first con fallback)
const CACHE_NAME = 'finance-app-v2';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './config.js',
  './manifest.json',
  // Icone PWA esistenti
  './icons/icon-48.png',
  './icons/icon-72.png',
  './icons/icon-144.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Installa il service worker
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(urlsToCache);
      // Attiva subito il nuovo SW
      self.skipWaiting();
    })()
  );
});

// Attiva il service worker
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      // Abilita navigation preload se supportato
      if ('navigationPreload' in self.registration) {
        try { await self.registration.navigationPreload.enable(); } catch {}
      }
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(name => (name !== CACHE_NAME ? caches.delete(name) : Promise.resolve()))
      );
      // Prendi controllo immediato delle pagine
      await self.clients.claim();
    })()
  );
});

// Intercetta le richieste
self.addEventListener('fetch', event => {
  const { request } = event;

  // Fallback di navigazione per SPA
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const preload = await event.preloadResponse;
          if (preload) return preload;
          const networkResponse = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
          return networkResponse;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match('./index.html')) || Response.error();
        }
      })()
    );
    return;
  }

  // Altre richieste: network-first con fallback cache
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        if (response && response.status === 200 && request.method === 'GET' && response.type !== 'opaque') {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        const cached = await caches.match(request);
        return cached || Response.error();
      }
    })()
  );
});
