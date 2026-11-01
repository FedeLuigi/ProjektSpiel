// Zombie-Verwaltung und KI auf dem Server (pro Raum isoliert)
const { WELT } = require('../3_Spieleinstellungen/server_einstellungen');

// Erzeugt einen neuen Zombie an einer zufälligen Bildschirmkante im angegebenen Raum
function zombieSpawnen(raum, level) {
  if (!raum || !raum.zombies) return null;

  const id = `zombie_${raum.naechsteZombieId++}`;
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

  const neuerZombie = {
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

  raum.zombies[id] = neuerZombie;
  return neuerZombie;
}

// Führt die Zombie-KI aus: Verfolgt den nächstgelegenen Spieler im Raum und greift an
function zombiesAktualisieren(raum, io) {
  if (!raum || !raum.zombies || !raum.spieler) return;

  const jetzt = Date.now();
  const spielerListe = Object.values(raum.spieler);

  for (const zId in raum.zombies) {
    const z = raum.zombies[zId];
    let naechsterSpieler = null;
    let kleinsterAbstand = Infinity;

    // Nächstgelegenen lebenden Spieler im Raum suchen
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
      if (distanz > (z.radius + (naechsterSpieler.radius || 18) - 4)) {
        z.x += (dx / distanz) * z.geschwindigkeit;
        z.y += (dy / distanz) * z.geschwindigkeit;
      } else {
        // Biss-Angriff (alle 1000ms)
        if (jetzt - z.letzterAngriff > 1000) {
          z.letzterAngriff = jetzt;
          naechsterSpieler.hp = Math.max(0, naechsterSpieler.hp - 10);

          io.to(raum.code).emit('spielerSchaden', {
            spielerId: naechsterSpieler.id,
            hp: naechsterSpieler.hp,
            schaden: 10
          });

          // Respawn nach 3 Sekunden, falls Spieler stirbt
          if (naechsterSpieler.hp <= 0) {
            const spielerId = naechsterSpieler.id;
            setTimeout(() => {
              if (raum && raum.spieler && raum.spieler[spielerId]) {
                const s = raum.spieler[spielerId];
                s.hp = 100;
                s.x = 400 + Math.round((Math.random() - 0.5) * 80);
                s.y = 300 + Math.round((Math.random() - 0.5) * 80);

                io.to(raum.code).emit('spielerRespawn', {
                  spielerId: s.id,
                  hp: s.hp,
                  x: s.x,
                  y: s.y
                });
              }
            }, 3000);
          }
        }
      }
    }
  }
}

// Verarbeitet Projektiltreffer auf einen Zombie im angegebenen Raum
function zombieTreffen(raum, treffer, socketId, io, onZombieBesiegt) {
  if (!raum || !raum.zombies) return;

  const zombie = raum.zombies[treffer.zombieId];
  if (!zombie) return;

  zombie.hp -= (treffer.schaden || 10);

  // Zombie besiegt!
  if (zombie.hp <= 0) {
    const toterZombie = { id: zombie.id, x: zombie.x, y: zombie.y };
    delete raum.zombies[treffer.zombieId];

    io.to(raum.code).emit('zombieGestorben', {
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
    io.to(raum.code).emit('zombieVerletzt', {
      zombieId: zombie.id,
      hp: zombie.hp,
      maxHp: zombie.maxHp,
      trefferX: treffer.trefferX || zombie.x,
      trefferY: treffer.trefferY || zombie.y
    });
  }
}

// Gibt ein kompaktes Array aller Zombies im Raum für den Netzwerk-Broadcast zurück
function getZombiesPaket(raum) {
  if (!raum || !raum.zombies) return [];
  return Object.values(raum.zombies).map(z => ({
    id: z.id,
    x: Math.round(z.x),
    y: Math.round(z.y),
    winkel: Math.round(z.winkel * 100) / 100,
    hp: z.hp,
    maxHp: z.maxHp
  }));
}

function getZombieAnzahl(raum) {
  if (!raum || !raum.zombies) return 0;
  return Object.keys(raum.zombies).length;
}

module.exports = {
  zombieSpawnen,
  zombiesAktualisieren,
  zombieTreffen,
  getZombiesPaket,
  getZombieAnzahl
};
