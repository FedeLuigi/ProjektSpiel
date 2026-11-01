// Server für das ProjektSpiel mit Express und Socket.IO
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// Statische Dateien aus dem gesamten Projektordner bereitstellen
app.use(express.static(__dirname));

// Beim Aufruf der Hauptseite direkt zum Spiel weiterleiten
app.get('/', (req, res) => {
  res.redirect('/1_Spiel/spiel.html');
});

// Socket.IO Verbindung für den Mehrspieler-Modus vorbereiten
io.on('connection', (socket) => {
  console.log(`[Multiplayer] Ein Spieler hat sich verbunden (ID: ${socket.id})`);

  // Vorbereitung: Wenn ein Spieler seine Position sendet
  socket.on('spielerBewegung', (daten) => {
    // Sendet die Positionsdaten an alle anderen verbundenen Spieler weiter
    socket.broadcast.emit('spielerBewegt', {
      id: socket.id,
      x: daten.x,
      y: daten.y
    });
  });

  // Wenn ein Spieler das Spiel verlässt
  socket.on('disconnect', () => {
    console.log(`[Multiplayer] Spieler getrennt (ID: ${socket.id})`);
    io.emit('spielerVerlassen', socket.id);
  });
});

// Server starten
server.listen(PORT, () => {
  console.log('=============================================');
  console.log(`🎮 ProjektSpiel-Server erfolgreich gestartet!`);
  console.log(`🌐 Öffne im Browser: http://localhost:${PORT}`);
  console.log('=============================================');
});
