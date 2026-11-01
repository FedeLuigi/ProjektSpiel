// Haupteinstiegspunkt: Startet den Node.js-Server und verbindet alle Module
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

// Module aus der bestehenden Projektstruktur einbinden
const { PORT, TICK_RATE_MS, WELLEN_KONFIG } = require('./3_Spieleinstellungen/server_einstellungen');
const raumVerwaltung = require('./2_Multiplayer/raum_verwaltung');
const wellenVerwaltung = require('./1_Spiel/wellen_verwaltung');
const zombieVerwaltung = require('./1_Spiel/zombie_verwaltung');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// Startseite direkt auf die SPIELBOX leiten und statische Dateien ausliefern
app.get('/', (req, res) => res.redirect('/0_Spielbox/spielbox.html'));
app.use(express.static(__dirname));

// ==========================================
// Socket.IO: Netzwerk-Ereignisse (Multiplayer-Lobby & Räume)
// ==========================================
io.on('connection', (socket) => {
  console.log(`[Netzwerk] Client verbunden: ID ${socket.id}`);

  // 1. Raum erstellen
  socket.on('raumErstellen', (daten) => {
    const raum = raumVerwaltung.raumErstellen(socket.id, daten?.spielerName);
    socket.join(raum.code);

    socket.emit('raumErstellt', {
      raumCode: raum.code,
      eigenerSpieler: raum.spieler[socket.id],
      lobby: raumVerwaltung.getLobbyPaket(raum)
    });

    io.to(raum.code).emit('lobbyAktualisiert', raumVerwaltung.getLobbyPaket(raum));
  });

  // 2. Raum beitreten
  socket.on('raumBeitreten', (daten) => {
    const ergebnis = raumVerwaltung.raumBeitreten(daten?.raumCode, socket.id, daten?.spielerName);

    if (ergebnis.fehler) {
      socket.emit('raumFehler', ergebnis.fehler);
      return;
    }

    const { raum, spieler } = ergebnis;
    socket.join(raum.code);

    socket.emit('raumBeigetreten', {
      raumCode: raum.code,
      eigenerSpieler: spieler,
      lobby: raumVerwaltung.getLobbyPaket(raum)
    });

    io.to(raum.code).emit('lobbyAktualisiert', raumVerwaltung.getLobbyPaket(raum));
  });

  // 3. Bereitschaft in der Lobby umschalten
  socket.on('bereitUmschalten', () => {
    const raum = raumVerwaltung.spielerBereitschaftUmschalten(socket.id);
    if (raum) {
      io.to(raum.code).emit('lobbyAktualisiert', raumVerwaltung.getLobbyPaket(raum));
    }
  });

  // 4. Spielrunde starten (nur durch Raumleiter und wenn alle bereit sind)
  socket.on('rundeStarten', () => {
    const ergebnis = raumVerwaltung.rundeStarten(socket.id);

    if (ergebnis.fehler) {
      socket.emit('raumFehler', ergebnis.fehler);
      return;
    }

    const raum = ergebnis.raum;

    // Start-Signal an alle Spieler des Raums senden
    io.to(raum.code).emit('spielGestartet', {
      raumCode: raum.code,
      spieler: raum.spieler,
      welle: wellenVerwaltung.getZustand(raum)
    });

    // Level 1 im Raum starten
    wellenVerwaltung.welleStarten(raum, 1, io);
  });

  // 5. Raum freiwillig verlassen (zurück zum Hauptmenü)
  socket.on('raumVerlassen', () => {
    const raum = raumVerwaltung.getRaumVonSocket(socket.id);
    if (raum) {
      socket.leave(raum.code);
      const res = raumVerwaltung.spielerEntfernen(socket.id);

      if (res && !res.raumGeloescht && res.raum) {
        if (res.neuerLeiter) {
          io.to(res.raum.code).emit('neuerRaumleiter', {
            leiterId: res.neuerLeiter.id,
            leiterName: res.neuerLeiter.name
          });
        }
        io.to(res.raum.code).emit('spielerVerlassen', socket.id);
        io.to(res.raum.code).emit('lobbyAktualisiert', raumVerwaltung.getLobbyPaket(res.raum));
      }
    }
  });

  // 5b. Spielernamen ändern & an alle im Raum synchronisieren
  socket.on('spielerNameAendern', (daten) => {
    const ergebnis = raumVerwaltung.spielerNameAendern(socket.id, daten?.neuerName);
    if (ergebnis) {
      io.to(ergebnis.raum.code).emit('spielerNameGeaendert', {
        id: socket.id,
        name: ergebnis.bereinigterName
      });
      io.to(ergebnis.raum.code).emit('lobbyAktualisiert', raumVerwaltung.getLobbyPaket(ergebnis.raum));
    }
  });

  // 6. Spielerbewegung synchronisieren (nur innerhalb des jeweiligen Raums)
  socket.on('spielerBewegung', (daten) => {
    const raum = raumVerwaltung.getRaumVonSocket(socket.id);
    if (raum && raum.spieler[socket.id]) {
      const s = raum.spieler[socket.id];
      s.x = daten.x;
      s.y = daten.y;
      s.winkel = daten.winkel !== undefined ? daten.winkel : 0;
      s.blickrichtung = daten.blickrichtung || 'rechts';

      socket.to(raum.code).emit('spielerBewegt', {
        id: s.id,
        x: s.x,
        y: s.y,
        winkel: s.winkel,
        blickrichtung: s.blickrichtung
      });
    }
  });

  // 7. Schuss abfeuern (nur innerhalb des jeweiligen Raums)
  socket.on('schussAbfeuern', (daten) => {
    const raum = raumVerwaltung.getRaumVonSocket(socket.id);
    if (raum) {
      socket.to(raum.code).emit('schussAbgefeuert', { ...daten, spielerId: socket.id });
    }
  });

  // 8. Zombie getroffen (Koop-Schaden innerhalb des Raums)
  socket.on('zombieTreffer', (treffer) => {
    const raum = raumVerwaltung.getRaumVonSocket(socket.id);
    if (raum && raum.status === 'spiel') {
      zombieVerwaltung.zombieTreffen(raum, treffer, socket.id, io, () => {
        wellenVerwaltung.zombieBesiegt(raum, io);
      });
    }
  });

  // 9. Verbindung getrennt (Disconnect)
  socket.on('disconnect', () => {
    console.log(`[Netzwerk] Client getrennt: ID ${socket.id}`);
    const res = raumVerwaltung.spielerEntfernen(socket.id);

    if (res && !res.raumGeloescht && res.raum) {
      if (res.neuerLeiter) {
        io.to(res.raum.code).emit('neuerRaumleiter', {
          leiterId: res.neuerLeiter.id,
          leiterName: res.neuerLeiter.name
        });
      }
      io.to(res.raum.code).emit('spielerVerlassen', socket.id);
      io.to(res.raum.code).emit('lobbyAktualisiert', raumVerwaltung.getLobbyPaket(res.raum));
    }
  });
});

// ==========================================
// Zentraler Game Loop für alle aktiven Spielräume (25 Ticks pro Sekunde)
// ==========================================
setInterval(() => {
  const alleRaeume = raumVerwaltung.getAlleRaeume();
  const jetzt = Date.now();

  for (const code in alleRaeume) {
    const raum = alleRaeume[code];

    // Nur Räume aktualisieren, in denen gerade gespielt wird
    if (raum.status !== 'spiel') continue;

    // Pausen-Countdown zwischen Wellen aktualisieren
    const z = raum.welle;
    if (z.status === "pause" || z.status === "welle_geschafft") {
      wellenVerwaltung.pauseAktualisieren(raum, io);
      continue;
    }

    // Zombies spawnen, falls die Welle aktiv ist
    if (
      wellenVerwaltung.darfZombieSpawnen(raum) &&
      jetzt - raum.letzterSpawnZeit > WELLEN_KONFIG.spawnIntervallMs
    ) {
      zombieVerwaltung.zombieSpawnen(raum, z.level);
      wellenVerwaltung.zombieGespawntZaehlerErhoehen(raum);
      raum.letzterSpawnZeit = jetzt;
    }

    // Zombie-KI berechnen und Spieler im Raum angreifen
    zombieVerwaltung.zombiesAktualisieren(raum, io);

    // Zombie-Positionen nur an diesen Raum senden
    io.to(raum.code).emit('zombiesAktualisiert', zombieVerwaltung.getZombiesPaket(raum));
  }
}, TICK_RATE_MS);

// Server starten
server.listen(PORT, '0.0.0.0', () => {
  console.log('=============================================');
  console.log(`🎮 SPIELBOX - Plattform & Multiplayer Server`);
  console.log(`🌐 Server läuft auf Port: ${PORT}`);
  console.log(`🕹️ SPIELBOX Startseite: http://localhost:${PORT}/`);
  console.log(`🧟 Zombie Koop 2D: http://localhost:${PORT}/1_Spiel/spiel.html`);
  console.log(`👥 Raum-System & Lobby erfolgreich aktiviert.`);
  console.log('=============================================');
});
