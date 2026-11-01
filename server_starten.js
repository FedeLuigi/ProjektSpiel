// Server für das öffentliche 2D-Zombie-Koop-Spiel mit Express und Socket.IO
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Socket.IO für Echtzeit-Kommunikation und Online-Hosting konfigurieren
const io = new Server(server, {
  cors: {
    origin: "*",
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

// Zentrale Listen für Spieler und Zombies (im Server-Speicher)
const alleSpieler = {};
const alleZombies = {};
let naechsteZombieId = 1;

// Maximale Zombies für Schritt 4
const MAX_ZOMBIES = 10;
let letzterSpawnZeit = 0;

// Statische Dateien ausliefern
app.use(express.static(__dirname));

// Öffentlicher Einstiegspunkt
app.get('/', (req, res) => {
  res.redirect('/1_Spiel/spiel.html');
});

// Neuer Zombie am Bildschirmrand erzeugen
function zombieSpawnen() {
  const id = `zombie_${naechsteZombieId++}`;

  // Zufällige Kante wählen (0: Oben, 1: Rechts, 2: Unten, 3: Links)
  const kante = Math.floor(Math.random() * 4);
  let spawnX = 0;
  let spawnY = 0;

  // Basis-Spielfeldgröße für Spawns
  const weltB = 1000;
  const weltH = 650;

  if (kante === 0) {
    spawnX = Math.random() * weltB;
    spawnY = -20;
  } else if (kante === 1) {
    spawnX = weltB + 20;
    spawnY = Math.random() * weltH;
  } else if (kante === 2) {
    spawnX = Math.random() * weltB;
    spawnY = weltH + 20;
  } else {
    spawnX = -20;
    spawnY = Math.random() * weltH;
  }

  alleZombies[id] = {
    id: id,
    x: spawnX,
    y: spawnY,
    radius: 18,
    geschwindigkeit: 2.0 + Math.random() * 0.4, // Leicht variierende Geschwindigkeit
    hp: 30,
    maxHp: 30,
    winkel: 0,
    letzterAngriff: 0
  };

  // console.log(`[Zombie] Neuer Zombie gespawnt: ${id} bei (${Math.round(spawnX)}, ${Math.round(spawnY)})`);
}

// Socket.IO Verbindung: Verwaltet Spieler, Schüsse und Koop-Kampf
io.on('connection', (socket) => {
  console.log(`[Multiplayer] Spieler beigetreten: ID ${socket.id}`);

  const farbe = SPIELER_FARBEN[Math.floor(Math.random() * SPIELER_FARBEN.length)];

  // Neues Spieler-Objekt erzeugen
  const neuerSpieler = {
    id: socket.id,
    name: `Spieler #${socket.id.substring(0, 4)}`,
    x: 400 + Math.round((Math.random() - 0.5) * 80),
    y: 300 + Math.round((Math.random() - 0.5) * 80),
    radius: 18,
    farbe: farbe,
    winkel: 0,
    hp: 100,
    maxHp: 100,
    letzterSchaden: 0
  };

  // 1. Dem neuen Spieler seine Daten, Mitspieler und alle aktuellen Zombies senden
  socket.emit('spielInitialisieren', {
    eigenerSpieler: neuerSpieler,
    andereSpieler: alleSpieler,
    zombies: Object.values(alleZombies)
  });

  // 2. Spieler im Speicher registrieren
  alleSpieler[socket.id] = neuerSpieler;

  // 3. Anderen Spielern den Neuzugang melden
  socket.broadcast.emit('neuerSpieler', neuerSpieler);
  io.emit('spielerAnzahlAktualisiert', Object.keys(alleSpieler).length);

  // 4. Bewegung & Zielwinkel empfangen
  socket.on('spielerBewegung', (daten) => {
    if (alleSpieler[socket.id]) {
      alleSpieler[socket.id].x = daten.x;
      alleSpieler[socket.id].y = daten.y;
      alleSpieler[socket.id].winkel = daten.winkel !== undefined ? daten.winkel : 0;

      socket.broadcast.emit('spielerBewegt', {
        id: socket.id,
        x: daten.x,
        y: daten.y,
        winkel: daten.winkel !== undefined ? daten.winkel : 0
      });
    }
  });

  // 5. Schuss eines Spielers empfangen und synchronisieren
  socket.on('schussAbfeuern', (schussDaten) => {
    socket.broadcast.emit('schussAbgefeuert', {
      spielerId: socket.id,
      x: schussDaten.x,
      y: schussDaten.y,
      vx: schussDaten.vx,
      vy: schussDaten.vy,
      winkel: schussDaten.winkel
    });
  });

  // 6. Treffer auf einen Zombie verarbeiten (Koop-Schaden)
  socket.on('zombieTreffer', (treffer) => {
    const zombie = alleZombies[treffer.zombieId];
    if (zombie) {
      zombie.hp -= (treffer.schaden || 10);

      // Zombie besiegt!
      if (zombie.hp <= 0) {
        io.emit('zombieGestorben', {
          zombieId: zombie.id,
          x: zombie.x,
          y: zombie.y,
          killerId: socket.id
        });
        delete alleZombies[treffer.zombieId];
      } else {
        // Zombie verletzt
        io.emit('zombieVerletzt', {
          zombieId: zombie.id,
          hp: zombie.hp,
          maxHp: zombie.maxHp,
          trefferX: treffer.trefferX || zombie.x,
          trefferY: treffer.trefferY || zombie.y
        });
      }
    }
  });

  // 7. Spieler verlässt das Spiel
  socket.on('disconnect', () => {
    console.log(`[Multiplayer] Spieler verlassen: ID ${socket.id}`);
    delete alleSpieler[socket.id];
    io.emit('spielerVerlassen', socket.id);
    io.emit('spielerAnzahlAktualisiert', Object.keys(alleSpieler).length);
  });
});

// Zentraler Server-Loop (Tick-Rate 25/s für Zombies und KI)
setInterval(() => {
  const spielerListe = Object.values(alleSpieler);
  if (spielerListe.length === 0) return;

  const jetzt = Date.now();

  // Zombies periodisch spawnen (alle 2.5 Sekunden bis zum Limit)
  if (Object.keys(alleZombies).length < MAX_ZOMBIES && jetzt - letzterSpawnZeit > 2500) {
    zombieSpawnen();
    letzterSpawnZeit = jetzt;
  }

  // Zombie-KI: Jeder Zombie verfolgt den nächstgelegenen Spieler
  for (const zId in alleZombies) {
    const z = alleZombies[zId];

    // Nächstgelegenen Spieler suchen
    let naechsterSpieler = null;
    let kleinsterAbstand = Infinity;

    for (const p of spielerListe) {
      if (p.hp > 0) {
        const abstand = Math.hypot(p.x - z.x, p.y - z.y);
        if (abstand < kleinsterAbstand) {
          kleinsterAbstand = abstand;
          naechsterSpieler = p;
        }
      }
    }

    if (naechsterSpieler) {
      // Bewegung auf den Spieler zu
      const dx = naechsterSpieler.x - z.x;
      const dy = naechsterSpieler.y - z.y;
      const distanz = Math.hypot(dx, dy);

      z.winkel = Math.atan2(dy, dx);

      // Bewegen, wenn nicht direkt am Spieler
      if (distanz > (z.radius + naechsterSpieler.radius - 4)) {
        z.x += (dx / distanz) * z.geschwindigkeit;
        z.y += (dy / distanz) * z.geschwindigkeit;
      } else {
        // Zombie greift Spieler an (Biss-Schaden alle 1 Sekunde)
        if (jetzt - z.letzterAngriff > 1000) {
          z.letzterAngriff = jetzt;
          naechsterSpieler.hp = Math.max(0, naechsterSpieler.hp - 10);

          io.emit('spielerSchaden', {
            spielerId: naechsterSpieler.id,
            hp: naechsterSpieler.hp,
            schaden: 10
          });

          // Wenn Spieler stirbt, Respawn nach 3 Sekunden
          if (naechsterSpieler.hp <= 0) {
            setTimeout(() => {
              if (alleSpieler[naechsterSpieler.id]) {
                alleSpieler[naechsterSpieler.id].hp = 100;
                alleSpieler[naechsterSpieler.id].x = 400;
                alleSpieler[naechsterSpieler.id].y = 300;
                io.emit('spielerRespawn', {
                  spielerId: naechsterSpieler.id,
                  hp: 100,
                  x: 400,
                  y: 300
                });
              }
            }, 3000);
          }
        }
      }
    }
  }

  // Zombie-Positionen in einem kompakten Paket an alle Spieler senden
  const zombiePaket = Object.values(alleZombies).map(z => ({
    id: z.id,
    x: Math.round(z.x),
    y: Math.round(z.y),
    winkel: Math.round(z.winkel * 100) / 100,
    hp: z.hp,
    maxHp: z.maxHp
  }));

  io.emit('zombiesAktualisiert', zombiePaket);
}, 40); // 25 Ticks pro Sekunde

// Server starten
server.listen(PORT, '0.0.0.0', () => {
  console.log('=============================================');
  console.log(`🧟 Zombie Koop - Spielserver aktiv!`);
  console.log(`🌐 Server läuft auf Port: ${PORT}`);
  console.log(`👥 Alle Spieler kämpfen gemeinsam gegen Zombies.`);
  console.log('=============================================');
});
