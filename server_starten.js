// Server für das öffentliche 2D-Multiplayer-Spiel mit Express und Socket.IO
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Socket.IO für Echtzeit-Kommunikation und Online-Hosting konfigurieren
const io = new Server(server, {
  cors: {
    origin: "*", // Erlaubt weltweiten Zugriff im Web
    methods: ["GET", "POST"]
  }
});

// Port für lokales Spielen oder Cloud-Hosting (Render, Heroku, Railway etc.)
const PORT = process.env.PORT || 3000;

// Farbpalette für automatische Spieler-Zuweisung
const SPIELER_FARBEN = [
  "#3b82f6", // Blau
  "#10b981", // Grün
  "#f59e0b", // Gelb / Bernstein
  "#ef4444", // Rot
  "#8b5cf6", // Lila
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316"  // Orange
];

// Gemeinsame Spielwelt-Konstanten
const WELT_BREITE = 800;
const WELT_HOEHE = 500;
const SPIELER_GROESSE = 40;

// Zentrale Liste aller aktuell verbundenen Spieler (im Server-Speicher)
const alleSpieler = {};

// Statische Dateien ausliefern
app.use(express.static(__dirname));

// Öffentlicher Einstiegspunkt: Leitet sofort in die gemeinsame Spielwelt weiter
app.get('/', (req, res) => {
  res.redirect('/1_Spiel/spiel.html');
});

// Socket.IO Verbindung: Synchronisiert alle Spieler in einer Welt
io.on('connection', (socket) => {
  console.log(`[Multiplayer] Spieler beigetreten: ID ${socket.id}`);

  // Zufällige Farbe aus der Palette zuweisen
  const farbe = SPIELER_FARBEN[Math.floor(Math.random() * SPIELER_FARBEN.length)];

  // Startposition im Zentrum mit leichter Streuung, damit Figuren nicht komplett überdecken
  const streuungX = Math.round((Math.random() - 0.5) * 60);
  const streuungY = Math.round((Math.random() - 0.5) * 60);
  const startX = Math.round((WELT_BREITE - SPIELER_GROESSE) / 2 + streuungX);
  const startY = Math.round((WELT_HOEHE - SPIELER_GROESSE) / 2 + streuungY);

  // Neues Spieler-Objekt erzeugen
  const neuerSpieler = {
    id: socket.id,
    name: `Spieler #${socket.id.substring(0, 4)}`,
    x: startX,
    y: startY,
    breite: SPIELER_GROESSE,
    hoehe: SPIELER_GROESSE,
    farbe: farbe,
    blickrichtung: "rechts"
  };

  // 1. Dem neu beigetretenen Spieler seine Figur und die bereits existierenden Spieler senden
  socket.emit('spielInitialisieren', {
    eigenerSpieler: neuerSpieler,
    andereSpieler: alleSpieler
  });

  // 2. Den neuen Spieler in der gemeinsamen Spielwelt abspeichern
  alleSpieler[socket.id] = neuerSpieler;

  // 3. Allen anderen Spielern mitteilen, dass ein neuer Mitspieler da ist
  socket.broadcast.emit('neuerSpieler', neuerSpieler);

  // 4. Spieleranzahl an alle Clients übertragen
  io.emit('spielerAnzahlAktualisiert', Object.keys(alleSpieler).length);

  // 5. Bewegung eines Spielers empfangen und in Echtzeit an alle anderen weiterleiten
  socket.on('spielerBewegung', (daten) => {
    if (alleSpieler[socket.id]) {
      alleSpieler[socket.id].x = daten.x;
      alleSpieler[socket.id].y = daten.y;
      alleSpieler[socket.id].blickrichtung = daten.blickrichtung || "rechts";

      // An alle anderen verbundenen Spieler weiterleiten
      socket.broadcast.emit('spielerBewegt', {
        id: socket.id,
        x: daten.x,
        y: daten.y,
        blickrichtung: daten.blickrichtung || "rechts"
      });
    }
  });

  // 6. Wenn ein Spieler das Browserfenster schließt / das Spiel verlässt
  socket.on('disconnect', () => {
    console.log(`[Multiplayer] Spieler verlassen: ID ${socket.id}`);
    delete alleSpieler[socket.id];

    // Allen verbliebenen Spielern mitteilen, dass die Figur entfernt werden soll
    io.emit('spielerVerlassen', socket.id);

    // Aktualisierte Spieleranzahl senden
    io.emit('spielerAnzahlAktualisiert', Object.keys(alleSpieler).length);
  });
});

// Server auf gewähltem Port starten
server.listen(PORT, () => {
  console.log('=============================================');
  console.log(`🎮 ProjektSpiel - Öffentliche 2D-Welt aktiv!`);
  console.log(`🌐 Öffne im Browser: http://localhost:${PORT}`);
  console.log(`👥 Alle Spieler landen in derselben Welt.`);
  console.log('=============================================');
});
