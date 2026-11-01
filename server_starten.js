// Haupteinstiegspunkt: Startet den Node.js-Server und verbindet alle Plattform-Module
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

// Plattform-Konfiguration & Multiplayer-Dienste
const { PORT, TICK_RATE_MS } = require('./3_Spieleinstellungen/server_einstellungen');
const raumVerwaltung = require('./2_Multiplayer/raum_verwaltung');
const spielManager = require('./2_Multiplayer/spiel_manager');

// Registrierte Spiele laden (vollständig entkoppelt von der Plattform)
spielManager.spielRegistrieren(require('./1_Spiel/zombie_server'));

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// Startseite direkt auf die SPIELBOX leiten und statische Dateien ausliefern
app.get('/', (req, res) => res.redirect('/0_Spielbox/spielbox.html'));
app.use(express.static(__dirname));

// ==========================================
// Socket.IO: Plattformweite Netzwerk-Ereignisse (Lobby & Räume)
// ==========================================
io.on('connection', (socket) => {
  console.log(`[Netzwerk] Client verbunden: ID ${socket.id}`);

  // 1. Raum erstellen
  socket.on('raumErstellen', (daten) => {
    const raum = raumVerwaltung.raumErstellen(socket.id, daten?.spielerName, daten?.spielId);
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

  // 4. Spielrunde starten (Raumleiter startet die Runde für das jeweilige Spiel)
  socket.on('rundeStarten', () => {
    const ergebnis = raumVerwaltung.rundeStarten(socket.id, io);

    if (ergebnis.fehler) {
      socket.emit('raumFehler', ergebnis.fehler);
      return;
    }
  });

  // 5. Raum freiwillig verlassen (zurück zum Hauptmenü)
  socket.on('raumVerlassen', () => {
    const raum = raumVerwaltung.getRaumVonSocket(socket.id);
    if (raum) {
      socket.leave(raum.code);
      const res = raumVerwaltung.spielerEntfernen(socket.id, io);

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

  // 6. Allgemeine Spielerbewegung synchronisieren (innerhalb des jeweiligen Raums)
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

  // 7. Spielspezifische Socket-Events registrieren (z.B. Waffen & Treffer für Zombie Koop)
  spielManager.registriereSocketEvents(socket, io, raumVerwaltung);

  // 8. Verbindung getrennt (Disconnect)
  socket.on('disconnect', () => {
    console.log(`[Netzwerk] Client getrennt: ID ${socket.id}`);
    const res = raumVerwaltung.spielerEntfernen(socket.id, io);

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
// Zentraler Game Loop für alle aktiven Spielräume (z.B. 25 Ticks pro Sekunde)
// Delegiert den Game-Tick an das jeweils aktive Spiel im Raum
// ==========================================
setInterval(() => {
  const alleRaeume = raumVerwaltung.getAlleRaeume();
  const jetzt = Date.now();

  for (const code in alleRaeume) {
    const raum = alleRaeume[code];

    // Nur Räume aktualisieren, in denen gerade gespielt wird
    if (raum.status !== 'spiel') continue;

    // Spielspezifischen Tick ausführen (z.B. Zombies, Wellen, Projektile)
    spielManager.onTick(raum, jetzt, io);
  }
}, TICK_RATE_MS);

// Server starten
server.listen(PORT, '0.0.0.0', () => {
  console.log('=============================================');
  console.log(`🎮 SPIELBOX - Plattform & Multiplayer Server`);
  console.log(`🌐 Server läuft auf Port: ${PORT}`);
  console.log(`🕹️ SPIELBOX Startseite: http://localhost:${PORT}/`);
  console.log(`👥 Raum-System & Lobby erfolgreich aktiviert.`);
  console.log(`🎯 Registrierte Spiele: ${Object.keys(spielManager.getAlleSpiele()).join(', ')}`);
  console.log('=============================================');
});
