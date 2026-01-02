// Service Worker per RecceTrip
// Permette all'app di funzionare offline

const CACHE_NAME = 'RecceTrip-PROv0.26';  // ⬅️ CAMBIA VERSIONE per forzare aggiornamento
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './js/main.js',
  './js/components/TripADisplay.js',
  './js/components/TripBDisplay.js',
  './js/components/SpeedDisplay.js',
  './js/components/DebugPanel.js',
  './js/components/StatusPanel.js',      // ⬅️ AGGIUNTO
  './js/components/MapPanel.js',         // ⬅️ AGGIUNTO
  './js/services/GPSManager.js'
];

// Installazione - mette i file in cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache opened');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error('Cache error:', err))
  );
  self.skipWaiting();
});

// Attivazione - pulisce vecchie cache
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch - serve i file dalla cache (offline first)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se in cache, ritorna quello
        if (response) {
          return response;
        }
        
        // Altrimenti prova dalla rete
        return fetch(event.request).then(response => {
          // Se la risposta è valida, mettila in cache per la prossima volta
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        }).catch(() => {
          // Se fallisce tutto, ritorna l'index
          return caches.match('./index.html');
        });
      })
  );

});
