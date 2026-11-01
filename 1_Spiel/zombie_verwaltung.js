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

// Berechnet einen sicheren Spawnpunkt mit maximalem Abstand zu allen Zombies
function findeSicherenSpawnpunkt(raum) {
  const weltB = (WELT && WELT.breite) || 1000;
  const weltH = (WELT && WELT.hoehe) || 650;
  const randAbstand = 70;

  const zombies = raum && raum.zombies ? Object.values(raum.zombies) : [];

  // Wenn keine Zombies im Raum sind: Spielfeldmitte mit leichter Streuung
  if (zombies.length === 0) {
    return {
      x: Math.round(weltB / 2 + (Math.random() - 0.5) * 60),
      y: Math.round(weltH / 2 + (Math.random() - 0.5) * 60)
    };
  }

  // Strategische Testpunkte auf der gesamten Spielfläche (Ecken, Kanten, Mitte, Quadranten)
  const kandidaten = [
    { x: randAbstand, y: randAbstand },
    { x: weltB - randAbstand, y: randAbstand },
    { x: randAbstand, y: weltH - randAbstand },
    { x: weltB - randAbstand, y: weltH - randAbstand },
    { x: Math.round(weltB / 2), y: randAbstand },
    { x: Math.round(weltB / 2), y: weltH - randAbstand },
    { x: randAbstand, y: Math.round(weltH / 2) },
    { x: weltB - randAbstand, y: Math.round(weltH / 2) },
    { x: Math.round(weltB / 2), y: Math.round(weltH / 2) },
    { x: Math.round(weltB * 0.25), y: Math.round(weltH * 0.25) },
    { x: Math.round(weltB * 0.75), y: Math.round(weltH * 0.25) },
    { x: Math.round(weltB * 0.25), y: Math.round(weltH * 0.75) },
    { x: Math.round(weltB * 0.75), y: Math.round(weltH * 0.75) }
  ];

  // Zusätzliche zufällig verteilte Kandidatenpunkte für optimale Abdeckung
  for (let i = 0; i < 18; i++) {
    kandidaten.push({
      x: Math.round(randAbstand + Math.random() * (weltB - 2 * randAbstand)),
      y: Math.round(randAbstand + Math.random() * (weltH - 2 * randAbstand))
    });
  }

  let besterPunkt = kandidaten[0];
  let groessterMindestAbstand = -1;

  for (const k of kandidaten) {
    let mindestAbstand = Infinity;

    for (const z of zombies) {
      const dist = Math.hypot(k.x - z.x, k.y - z.y);
      if (dist < mindestAbstand) {
        mindestAbstand = dist;
      }
    }

    if (mindestAbstand > groessterMindestAbstand) {
      groessterMindestAbstand = mindestAbstand;
      besterPunkt = k;
    }
  }

  console.log(`[Respawn] Sicherer Spawnpunkt ermittelt: (${besterPunkt.x}, ${besterPunkt.y}) mit ${Math.round(groessterMindestAbstand)}px Abstand zum nächsten Zombie`);
  return besterPunkt;
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

    // Nächstgelegenen lebenden Spieler im Raum suchen (bevorzugt verwundbare Spieler)
    for (const p of spielerListe) {
      if (p.hp > 0) {
        const istImmun = p.schutzBis && jetzt < p.schutzBis;
        const abstand = Math.hypot(p.x - z.x, p.y - z.y);
        // Immunen Spielern einen virtuellen Abstandsmalus geben, damit Zombies verwundbare Mitspieler attackieren
        const gewichteterAbstand = istImmun ? (abstand + 250) : abstand;
        if (gewichteterAbstand < kleinsterAbstand) {
          kleinsterAbstand = gewichteterAbstand;
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
        // Prüfen, ob der Spieler durch Respawn-Schutz immun ist oder tot ist
        const istImmun = (naechsterSpieler.schutzBis && jetzt < naechsterSpieler.schutzBis) || naechsterSpieler.hp <= 0;
        if (istImmun) {
          // Spieler ist unantastbar -> KEIN Schaden durch Zombie-Angriffe!
          continue;
        }

        // Biss-Angriff (alle 1000ms)
        if (jetzt - z.letzterAngriff > 1000) {
          z.letzterAngriff = jetzt;
          naechsterSpieler.hp = Math.max(0, naechsterSpieler.hp - 10);

          io.to(raum.code).emit('spielerSchaden', {
            spielerId: naechsterSpieler.id,
            hp: naechsterSpieler.hp,
            schaden: 10
          });

          // Respawn nach 3 Sekunden, falls Spieler stirbt (nur einmalig planen)
          if (naechsterSpieler.hp <= 0 && !naechsterSpieler.respawnAktiv) {
            naechsterSpieler.respawnAktiv = true;
            const spielerId = naechsterSpieler.id;
            setTimeout(() => {
              if (raum && raum.spieler && raum.spieler[spielerId]) {
                const s = raum.spieler[spielerId];
                s.hp = 100;
                s.respawnAktiv = false;

                // 1. Sicheren Spawnpunkt mit größtmöglichem Abstand zu allen Zombies wählen
                const sichererPunkt = findeSicherenSpawnpunkt(raum);
                s.x = sichererPunkt.x;
                s.y = sichererPunkt.y;

                // 2. Genau 2 Sekunden Schutz nach dem Respawn (serverseitig geprüft)
                const schutzDauerMs = 2000;
                s.schutzBis = Date.now() + schutzDauerMs;

                io.to(raum.code).emit('spielerRespawn', {
                  spielerId: s.id,
                  hp: s.hp,
                  x: s.x,
                  y: s.y,
                  schutzDauerMs: schutzDauerMs,
                  schutzBis: s.schutzBis
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
  findeSicherenSpawnpunkt,
  zombiesAktualisieren,
  zombieTreffen,
  getZombiesPaket,
  getZombieAnzahl
};
