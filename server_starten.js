// Server für das öffentliche 2D-Zombie-Koop-Spiel mit Wellen- und Levelsystem
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Socket.IO für Echtzeit-Kommunikation und Online-Hosting
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Farbpalette für Spieler
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

// Zentrale Datenstrukturen
const alleSpieler = {};
const alleZombies = {};
let naechsteZombieId = 1;
let letzterSpawnZeit = 0;

// ==========================================
// Wellen- und Levelsystem (Koop-Fortschritt)
// ==========================================
const spielZustand = {
  level: 1,
  status: "pause", // "pause", "welle_aktiv", "welle_geschafft"
  zombiesGesamt: 8,
  zombiesGespawnt: 0,
  zombiesUebrig: 8,
  pauseVerbleibend: 5,
  letzterPauseTick: Date.now()
};

function welleStatusSenden() {
  io.emit('welleStatus', {
    level: spielZustand.level,
    status: spielZustand.status,
    zombiesUebrig: spielZustand.zombiesUebrig,
    zombiesGesamt: spielZustand.zombiesGesamt,
    pauseVerbleibend: spielZustand.pauseVerbleibend
  });
}

function welleStarten(levelNummer) {
  spielZustand.level = levelNummer;
  spielZustand.status = "welle_aktiv";
  // Mehr Zombies pro Level (Level 1: 8, Level 2: 13, Level 3: 18 usw.)
  spielZustand.zombiesGesamt = 8 + (levelNummer - 1) * 5;
  spielZustand.zombiesGespawnt = 0;
  spielZustand.zombiesUebrig = spielZustand.zombiesGesamt;

  console.log(`[Welle] Level ${levelNummer} gestartet mit ${spielZustand.zombiesGesamt} Zombies!`);

  io.emit('welleGestartet', {
    level: spielZustand.level,
    zombiesGesamt: spielZustand.zombiesGesamt
  });

  welleStatusSenden();
}

function welleAbschliessen() {
  spielZustand.status = "welle_geschafft";
  spielZustand.pauseVerbleibend = 5;

  console.log(`[Welle] Level ${spielZustand.level} erfolgreich gemeistert!`);

  // Alle überlebenden Spieler belohnen (25 HP Heilung)
  for (const sId in alleSpieler) {
    const p = alleSpieler[sId];
    if (p.hp > 0) {
      p.hp = Math.min(100, p.hp + 25);
      io.emit('spielerSchaden', { spielerId: p.id, hp: p.hp, schaden: -25 });
    }
  }

  io.emit('welleAbgeschlossen', {
    geschafftesLevel: spielZustand.level,
    naechstesLevel: spielZustand.level + 1,
    pauseSekunden: 5
  });

  welleStatusSenden();
}

// Statische Dateien ausliefern
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.redirect('/1_Spiel/spiel.html');
});

// Zombie mit level-skalierenden Attributen spawnen
function zombieSpawnen() {
  const id = `zombie_${naechsteZombieId++}`;
  const kante = Math.floor(Math.random() * 4);
  let spawnX = 0;
  let spawnY = 0;

  const weltB = 1000;
  const weltH = 650;

  if (kante === 0) {
    spawnX = Math.random() * weltB;
    spawnY = -25;
  } else if (kante === 1) {
    spawnX = weltB + 25;
    spawnY = Math.random() * weltH;
  } else if (kante === 2) {
    spawnX = Math.random() * weltB;
    spawnY = weltH + 25;
  } else {
    spawnX = -25;
    spawnY = Math.random() * weltH;
  }

  // Höhere Level machen Zombies leicht schneller und robuster
  const levelBonusHp = (spielZustand.level - 1) * 5;
  const levelBonusSpeed = Math.min(1.0, (spielZustand.level - 1) * 0.12);

  alleZombies[id] = {
    id: id,
    x: spawnX,
    y: spawnY,
    radius: 18,
    geschwindigkeit: 2.0 + levelBonusSpeed + Math.random() * 0.3,
    hp: 30 + levelBonusHp,
    maxHp: 30 + levelBonusHp,
    winkel: 0,
    letzterAngriff: 0
  };

  spielZustand.zombiesGespawnt++;
}

// Socket.IO Verbindung
io.on('connection', (socket) => {
  console.log(`[Multiplayer] Spieler beigetreten: ID ${socket.id}`);

  const farbe = SPIELER_FARBEN[Math.floor(Math.random() * SPIELER_FARBEN.length)];

  const neuerSpieler = {
    id: socket.id,
    name: `Spieler #${socket.id.substring(0, 4)}`,
    x: 400 + Math.round((Math.random() - 0.5) * 80),
    y: 300 + Math.round((Math.random() - 0.5) * 80),
    radius: 18,
    farbe: farbe,
    winkel: 0,
    hp: 100,
    maxHp: 100
  };

  // 1. Initialisierung an neuen Spieler
  socket.emit('spielInitialisieren', {
    eigenerSpieler: neuerSpieler,
    andereSpieler: alleSpieler,
    zombies: Object.values(alleZombies),
    welle: {
      level: spielZustand.level,
      status: spielZustand.status,
      zombiesUebrig: spielZustand.zombiesUebrig,
      zombiesGesamt: spielZustand.zombiesGesamt,
      pauseVerbleibend: spielZustand.pauseVerbleibend
    }
  });

  alleSpieler[socket.id] = neuerSpieler;
  socket.broadcast.emit('neuerSpieler', neuerSpieler);
  io.emit('spielerAnzahlAktualisiert', Object.keys(alleSpieler).length);

  // Wenn der erste Spieler beitritt und wir pausieren, starten wir Welle 1
  if (Object.keys(alleSpieler).length === 1 && spielZustand.status === "pause" && spielZustand.pauseVerbleibend <= 0) {
    welleStarten(1);
  }

  // 2. Bewegung & Zielwinkel
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

  // 3. Schuss
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

  // 4. Zombie getroffen (Koop-Schaden)
  socket.on('zombieTreffer', (treffer) => {
    const zombie = alleZombies[treffer.zombieId];
    if (zombie) {
      zombie.hp -= (treffer.schaden || 10);

      if (zombie.hp <= 0) {
        delete alleZombies[treffer.zombieId];
        spielZustand.zombiesUebrig = Math.max(0, spielZustand.zombiesUebrig - 1);

        io.emit('zombieGestorben', {
          zombieId: zombie.id,
          x: zombie.x,
          y: zombie.y,
          killerId: socket.id
        });

        welleStatusSenden();

        // Prüfen, ob alle Zombies der Welle besiegt wurden
        if (spielZustand.zombiesUebrig === 0 && spielZustand.zombiesGespawnt >= spielZustand.zombiesGesamt) {
          welleAbschliessen();
        }
      } else {
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

  // 5. Spieler getrennt
  socket.on('disconnect', () => {
    console.log(`[Multiplayer] Spieler verlassen: ID ${socket.id}`);
    delete alleSpieler[socket.id];
    io.emit('spielerVerlassen', socket.id);
    io.emit('spielerAnzahlAktualisiert', Object.keys(alleSpieler).length);
  });
});

// Zentraler Server-Loop (Tick-Rate 25/s)
setInterval(() => {
  const spielerListe = Object.values(alleSpieler);
  const jetzt = Date.now();

  // Pausen-Countdown herunterzählen (jede Sekunde)
  if (spielZustand.status === "pause" || spielZustand.status === "welle_geschafft") {
    if (jetzt - spielZustand.letzterPauseTick >= 1000) {
      spielZustand.letzterPauseTick = jetzt;
      spielZustand.pauseVerbleibend--;

      io.emit('pauseCountdown', {
        sekunden: Math.max(0, spielZustand.pauseVerbleibend),
        naechstesLevel: spielZustand.status === "welle_geschafft" ? spielZustand.level + 1 : spielZustand.level
      });

      if (spielZustand.pauseVerbleibend <= 0 && spielerListe.length > 0) {
        const naechstesLevel = spielZustand.status === "welle_geschafft" ? spielZustand.level + 1 : spielZustand.level;
        welleStarten(naechstesLevel);
      }
    }
    return;
  }

  // Welle aktiv: Zombies spawnen bis zum Gesamt-Limit der Welle
  const maxGleichzeitig = Math.min(14, 4 + spielZustand.level * 2);
  if (
    spielZustand.status === "welle_aktiv" &&
    Object.keys(alleZombies).length < maxGleichzeitig &&
    spielZustand.zombiesGespawnt < spielZustand.zombiesGesamt &&
    jetzt - letzterSpawnZeit > 1400
  ) {
    zombieSpawnen();
    letzterSpawnZeit = jetzt;
  }

  // Zombie-KI: Spieler verfolgen und angreifen
  for (const zId in alleZombies) {
    const z = alleZombies[zId];
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
      const dx = naechsterSpieler.x - z.x;
      const dy = naechsterSpieler.y - z.y;
      const distanz = Math.hypot(dx, dy);

      z.winkel = Math.atan2(dy, dx);

      if (distanz > (z.radius + naechsterSpieler.radius - 4)) {
        z.x += (dx / distanz) * z.geschwindigkeit;
        z.y += (dy / distanz) * z.geschwindigkeit;
      } else {
        if (jetzt - z.letzterAngriff > 1000) {
          z.letzterAngriff = jetzt;
          naechsterSpieler.hp = Math.max(0, naechsterSpieler.hp - 10);

          io.emit('spielerSchaden', {
            spielerId: naechsterSpieler.id,
            hp: naechsterSpieler.hp,
            schaden: 10
          });

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

  // Zombie-Positionen senden
  const zombiePaket = Object.values(alleZombies).map(z => ({
    id: z.id,
    x: Math.round(z.x),
    y: Math.round(z.y),
    winkel: Math.round(z.winkel * 100) / 100,
    hp: z.hp,
    maxHp: z.maxHp
  }));

  io.emit('zombiesAktualisiert', zombiePaket);
}, 40);

server.listen(PORT, '0.0.0.0', () => {
  console.log('=============================================');
  console.log(`🧟 Zombie Koop - Spielserver aktiv!`);
  console.log(`🌐 Server läuft auf Port: ${PORT}`);
  console.log(`🏆 Wellen- & Levelsystem aktiv.`);
  console.log('=============================================');
});
