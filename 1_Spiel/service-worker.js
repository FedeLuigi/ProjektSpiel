// Service Worker für Zombie Koop PWA
// Ermöglicht Offline-Start der Benutzeroberfläche und schnelles Laden
// WICHTIG: Socket.IO und Multiplayer-Verbindungen werden NIEMALS gecacht!

const CACHE_NAME = 'zombie-koop-v4';

// Statische Dateien für den App-Cache
const STATISCHE_DATEIEN = [
  '/',
  '/1_Spiel/spiel.html',
  '/1_Spiel/design.css',
  '/1_Spiel/spiel.js',
  '/0_Spielbox/dienste/querformat_dienst.js',
  '/0_Spielbox/dienste/plattform_speicher.js',
  '/3_Spieleinstellungen/einstellungen.js',
  '/2_Multiplayer/verbindung.js',
  '/1_Spiel/icon-192.png',
  '/1_Spiel/icon-512.png',
  '/1_Spiel/apple-touch-icon.png',
  '/1_Spiel/favicon.png',
  '/manifest.json'
];

// 1. Installation: App-Dateien im Cache speichern
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Statische Dateien werden im Cache gespeichert');
      return cache.addAll(STATISCHE_DATEIEN);
    })
  );
});

// 2. Aktivierung: Alte Caches aufräumen
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

// 3. Netzwerk-Anfragen abfangen (Network-First-Strategie für aktuelle Spielstände)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // WICHTIG: Socket.IO und Echtzeit-Multiplayer-Verbindungen NIEMALS abfangen!
  if (url.pathname.startsWith('/socket.io/')) {
    return;
  }

  // Nur GET-Anfragen cachen
  if (event.request.method !== 'GET') {
    return;
  }

  // Network-First: Versuche das Netzwerk, greife bei Verbindungsabbruch auf den Cache zurück
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Erfolgreiche Antwort im Cache aktualisieren
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Netzwerk nicht verfügbar -> aus dem Cache laden
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Falls HTML nicht gefunden wird, Startseite zurückgeben
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/1_Spiel/spiel.html');
          }
        });
      })
  );
});
