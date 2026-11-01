// Zombie-Verwaltung und KI auf dem Server
const { WELT } = require('../3_Spieleinstellungen/server_einstellungen');

// Zentrale Liste aller lebenden Zombies auf dem Server
const alleZombies = {};
let naechsteZombieId = 1;

// Erzeugt einen neuen Zombie an einer zufälligen Bildschirmkante
function zombieSpawnen(level) {
  const id = `zombie_${naechsteZombieId++}`;
  const kante = Math.floor(Math.random() * 4);
  let spawnX = 0;
  let spawnY = 0;

  const weltB = WELT.breite;
  const weltH = WELT.hoehe;

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

  // Level-Skalierung: Höhere Level machen Zombies zäher und schneller
  const levelBonusHp = (level - 1) * 5;
  const levelBonusSpeed = Math.min(1.0, (level - 1) * 0.12);

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

  return alleZombies[id];
}

// Führt die Zombie-KI aus: Verfolgt den nächstgelegenen Spieler und greift an
function zombiesAktualisieren(spielerListe, io, spielerVerwaltung) {
  const jetzt = Date.now();

  for (const zId in alleZombies) {
    const z = alleZombies[zId];
    let naechsterSpieler = null;
    let kleinsterAbstand = Infinity;

    // Nächstgelegenen lebenden Spieler suchen
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

      // Bewegen, wenn noch nicht in Beiß-Reichweite
      if (distanz > (z.radius + naechsterSpieler.radius - 4)) {
        z.x += (dx / distanz) * z.geschwindigkeit;
        z.y += (dy / distanz) * z.geschwindigkeit;
      } else {
        // Biss-Angriff (alle 1000ms)
        if (jetzt - z.letzterAngriff > 1000) {
          z.letzterAngriff = jetzt;
          naechsterSpieler.hp = Math.max(0, naechsterSpieler.hp - 10);

          io.emit('spielerSchaden', {
            spielerId: naechsterSpieler.id,
            hp: naechsterSpieler.hp,
            schaden: 10
          });

          // Respawn nach 3 Sekunden, falls Spieler stirbt
          if (naechsterSpieler.hp <= 0 && spielerVerwaltung) {
            setTimeout(() => {
              const respawnterSpieler = spielerVerwaltung.spielerWiederbeleben(naechsterSpieler.id, 400, 300);
              if (respawnterSpieler) {
                io.emit('spielerRespawn', {
                  spielerId: respawnterSpieler.id,
                  hp: respawnterSpieler.hp,
                  x: respawnterSpieler.x,
                  y: respawnterSpieler.y
                });
              }
            }, 3000);
          }
        }
      }
    }
  }
}

// Verarbeitet Projektiltreffer auf einen Zombie
function zombieTreffen(treffer, socketId, io, onZombieBesiegt) {
  const zombie = alleZombies[treffer.zombieId];
  if (!zombie) return;

  zombie.hp -= (treffer.schaden || 10);

  // Zombie besiegt!
  if (zombie.hp <= 0) {
    const toterZombie = { id: zombie.id, x: zombie.x, y: zombie.y };
    delete alleZombies[treffer.zombieId];

    io.emit('zombieGestorben', {
      zombieId: toterZombie.id,
      x: toterZombie.x,
      y: toterZombie.y,
      killerId: socketId
    });

    if (typeof onZombieBesiegt === 'function') {
      onZombieBesiegt();
    }
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

// Gibt ein kompaktes Array aller Zombies für den Netzwerk-Broadcast zurück
function getZombiesPaket() {
  return Object.values(alleZombies).map(z => ({
    id: z.id,
    x: Math.round(z.x),
    y: Math.round(z.y),
    winkel: Math.round(z.winkel * 100) / 100,
    hp: z.hp,
    maxHp: z.maxHp
  }));
}

function getZombieAnzahl() {
  return Object.keys(alleZombies).length;
}

function getAlleZombies() {
  return alleZombies;
}

module.exports = {
  zombieSpawnen,
  zombiesAktualisieren,
  zombieTreffen,
  getZombiesPaket,
  getZombieAnzahl,
  getAlleZombies
};
