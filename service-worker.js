// SPIELBOX - Zentraler Service Worker
// Ermöglicht Offline-Start, App-Installation und Caching aller Plattform- und Spiel-Ressourcen
// WICHTIG: Socket.IO und Multiplayer-Verbindungen werden NIEMALS abgefangen oder gecacht!

const CACHE_NAME = 'spielbox-plattform-v2';

const STATISCHE_DATEIEN = [
  '/',
  '/index.html',
  '/manifest.json',
  '/0_Spielbox/spielbox.html',
  '/0_Spielbox/spielbox.css',
  '/0_Spielbox/spielbox.js',
  '/0_Spielbox/spiele_katalog.js',
  '/0_Spielbox/dienste/querformat_dienst.js',
  '/0_Spielbox/dienste/plattform_speicher.js',
  '/0_Spielbox/dienste/pwa_dienst.js',
  '/0_Spielbox/grafiken/icon-192.png',
  '/0_Spielbox/grafiken/icon-512.png',
  '/0_Spielbox/grafiken/apple-touch-icon.png',
  '/0_Spielbox/grafiken/favicon.png',
  '/0_Spielbox/grafiken/favicon.svg',
  '/1_Spiel/spiel.html',
  '/1_Spiel/design.css',
  '/1_Spiel/spiel.js',
  '/3_Spieleinstellungen/einstellungen.js',
  '/2_Multiplayer/verbindung.js'
];

// 1. Installation: Plattform-Ressourcen im Cache vorhalten
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] SPIELBOX Plattform-Ressourcen im Cache speichern');
      return cache.addAll(STATISCHE_DATEIEN).catch((err) => {
        console.warn('[Service Worker] Manche Ressourcen konnten nicht gecacht werden:', err);
      });
    })
  );
});

// 2. Aktivierung: Veraltete Caches bereinigen
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Alten Cache entfernen:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch-Handler: Network-First mit Cache-Fallback (Socket.IO wird ignoriert)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Echtzeit-Multiplayer-Events NIEMALS cachen
  if (url.pathname.startsWith('/socket.io/')) {
    return;
  }

  // Nur GET-Requests cachen
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/0_Spielbox/spielbox.html');
          }
        });
      })
  );
});
