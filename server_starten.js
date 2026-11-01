// Haupteinstiegspunkt: Startet den Node.js-Server und verbindet alle Module
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

// Module aus der bestehenden Projektstruktur einbinden
const { PORT, TICK_RATE_MS, WELLEN_KONFIG } = require('./3_Spieleinstellungen/server_einstellungen');
const spielerVerwaltung = require('./2_Multiplayer/spieler_verwaltung');
const wellenVerwaltung = require('./1_Spiel/wellen_verwaltung');
const zombieVerwaltung = require('./1_Spiel/zombie_verwaltung');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

let letzterSpawnZeit = 0;

// Statische Dateien ausliefern und Startseite weiterleiten
app.use(express.static(__dirname));
app.get('/', (req, res) => res.redirect('/1_Spiel/spiel.html'));

// ==========================================
// Socket.IO: Netzwerk-Ereignisse (Multiplayer)
// ==========================================
io.on('connection', (socket) => {
  console.log(`[Multiplayer] Spieler beigetreten: ID ${socket.id}`);

  // 1. Neuen Spieler registrieren
  const neuerSpieler = spielerVerwaltung.spielerErstellen(socket.id);

  // 2. Initialisierungsdaten an den Spieler senden
  socket.emit('spielInitialisieren', {
    eigenerSpieler: neuerSpieler,
    andereSpieler: spielerVerwaltung.getAlleSpieler(),
    zombies: Object.values(zombieVerwaltung.getAlleZombies()),
    welle: wellenVerwaltung.getZustand()
  });

  socket.broadcast.emit('neuerSpieler', neuerSpieler);
  io.emit('spielerAnzahlAktualisiert', spielerVerwaltung.getSpielerAnzahl());

  // Wenn der erste Spieler beitritt, Level 1 starten
  if (spielerVerwaltung.getSpielerAnzahl() === 1 && wellenVerwaltung.getZustand().status === "pause" && wellenVerwaltung.getZustand().pauseVerbleibend <= 0) {
    wellenVerwaltung.welleStarten(1, io);
  }

  // 3. Bewegung und Zielwinkel empfangen
  socket.on('spielerBewegung', (daten) => {
    const s = spielerVerwaltung.spielerBewegen(socket.id, daten);
    if (s) {
      socket.broadcast.emit('spielerBewegt', { id: s.id, x: s.x, y: s.y, winkel: s.winkel });
    }
  });

  // 4. Schuss synchronisieren
  socket.on('schussAbfeuern', (daten) => {
    socket.broadcast.emit('schussAbgefeuert', { ...daten, spielerId: socket.id });
  });

  // 5. Zombie getroffen (Koop-Schaden)
  socket.on('zombieTreffer', (treffer) => {
    zombieVerwaltung.zombieTreffen(treffer, socket.id, io, () => {
      // Callback wenn Zombie besiegt wurde
      wellenVerwaltung.zombieBesiegt(io, spielerVerwaltung);
    });
  });

  // 6. Spieler verlässt das Spiel
  socket.on('disconnect', () => {
    console.log(`[Multiplayer] Spieler getrennt: ID ${socket.id}`);
    spielerVerwaltung.spielerEntfernen(socket.id);
    io.emit('spielerVerlassen', socket.id);
    io.emit('spielerAnzahlAktualisiert', spielerVerwaltung.getSpielerAnzahl());
  });
});

// ==========================================
// Zentraler Game Loop (25 Ticks pro Sekunde)
// ==========================================
setInterval(() => {
  const spielerListe = spielerVerwaltung.getSpielerListe();
  const jetzt = Date.now();

  // Pausen-Countdown zwischen Wellen aktualisieren
  const zustand = wellenVerwaltung.getZustand();
  if (zustand.status === "pause" || zustand.status === "welle_geschafft") {
    wellenVerwaltung.pauseAktualisieren(io, spielerVerwaltung.getSpielerAnzahl());
    return;
  }

  // Zombies spawnen, falls die Welle aktiv ist
  if (
    wellenVerwaltung.darfZombieSpawnen(zombieVerwaltung.getZombieAnzahl()) &&
    jetzt - letzterSpawnZeit > WELLEN_KONFIG.spawnIntervallMs
  ) {
    zombieVerwaltung.zombieSpawnen(zustand.level);
    wellenVerwaltung.zombieGespawntZaehlerErhoehen();
    letzterSpawnZeit = jetzt;
  }

  // Zombie-KI berechnen und Spieler angreifen
  zombieVerwaltung.zombiesAktualisieren(spielerListe, io, spielerVerwaltung);

  // Zombie-Positionen an alle Clients senden
  io.emit('zombiesAktualisiert', zombieVerwaltung.getZombiesPaket());
}, TICK_RATE_MS);

// Server starten
server.listen(PORT, '0.0.0.0', () => {
  console.log('=============================================');
  console.log(`🧟 Zombie Koop - Spielserver gestartet!`);
  console.log(`🌐 Server läuft auf Port: ${PORT}`);
  console.log(`👥 Alle Module erfolgreich modular geladen.`);
  console.log('=============================================');
});
