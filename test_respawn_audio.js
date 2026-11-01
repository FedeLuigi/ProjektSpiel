const assert = require("assert");
const { WELT } = require("./3_Spieleinstellungen/server_einstellungen");
const {
  findeSicherenSpawnpunkt,
  zombiesAktualisieren
} = require("./1_Spiel/zombie_verwaltung");

console.log("=== TEST: Sicherer Spawnpunkt & 2s Schutz nach Respawn ===");

// 1. TEST: Sicherer Spawnpunkt
console.log("\n1. Teste 'findeSicherenSpawnpunkt'...");

// Szenario A: Zombies versammeln sich im Zentrum um (400, 300)
const raumZentrumZombies = {
  code: "TEST1",
  zombies: {
    z1: { id: "z1", x: 400, y: 300, radius: 18, hp: 30, geschwindigkeit: 2, letzterAngriff: 0 },
    z2: { id: "z2", x: 410, y: 310, radius: 18, hp: 30, geschwindigkeit: 2, letzterAngriff: 0 },
    z3: { id: "z3", x: 390, y: 290, radius: 18, hp: 30, geschwindigkeit: 2, letzterAngriff: 0 },
    z4: { id: "z4", x: 420, y: 280, radius: 18, hp: 30, geschwindigkeit: 2, letzterAngriff: 0 }
  },
  spieler: {}
};

const spawnPunktA = findeSicherenSpawnpunkt(raumZentrumZombies);
console.log(`- Spawnpunkt bei Zombies im Zentrum: (${spawnPunktA.x}, ${spawnPunktA.y})`);

// Berechne Abstand zu den Zombies
let minAbstandA = Infinity;
for (const z of Object.values(raumZentrumZombies.zombies)) {
  const d = Math.hypot(spawnPunktA.x - z.x, spawnPunktA.y - z.y);
  if (d < minAbstandA) minAbstandA = d;
}
console.log(`- Gemessener Mindestabstand zu Zombies: ${Math.round(minAbstandA)}px`);
assert(minAbstandA >= 250, "Spawnpunkt muss mindestens 250px Abstand zur Zombiegruppe im Zentrum haben!");

// Szenario B: Zombies in der linken oberen Ecke (100, 100)
const raumObenLinksZombies = {
  code: "TEST2",
  zombies: {
    z1: { id: "z1", x: 100, y: 100, radius: 18, hp: 30, geschwindigkeit: 2, letzterAngriff: 0 },
    z2: { id: "z2", x: 120, y: 110, radius: 18, hp: 30, geschwindigkeit: 2, letzterAngriff: 0 },
    z3: { id: "z3", x: 90, y: 130, radius: 18, hp: 30, geschwindigkeit: 2, letzterAngriff: 0 }
  },
  spieler: {}
};

const spawnPunktB = findeSicherenSpawnpunkt(raumObenLinksZombies);
console.log(`- Spawnpunkt bei Zombies oben links: (${spawnPunktB.x}, ${spawnPunktB.y})`);
let minAbstandB = Infinity;
for (const z of Object.values(raumObenLinksZombies.zombies)) {
  const d = Math.hypot(spawnPunktB.x - z.x, spawnPunktB.y - z.y);
  if (d < minAbstandB) minAbstandB = d;
}
console.log(`- Gemessener Mindestabstand zu Zombies: ${Math.round(minAbstandB)}px`);
assert(minAbstandB >= 350, "Spawnpunkt muss weit weg von der oberen linken Ecke sein!");
assert(spawnPunktB.x > 300 || spawnPunktB.y > 300, "Spawnpunkt darf nicht in der linken oberen Ecke liegen!");

console.log("✓ Sicherer Spawnpunkt wählt zuverlässig sichere Positionen mit maximalem Abstand!");

// 2. TEST: 2 Sekunden Schutz nach dem Respawn (serverseitig geprüft)
console.log("\n2. Teste serverseitige 2s-Immunität...");

const mockIo = {
  to: () => ({
    emit: (event, daten) => {
      // Mock-Event
    }
  })
};

const raumImmunaet = {
  code: "IMMUN",
  spieler: {
    spielerA: {
      id: "spielerA",
      x: 200,
      y: 200,
      radius: 18,
      hp: 100,
      schutzBis: Date.now() + 2000 // 2 Sekunden Schutz aktiv!
    }
  },
  zombies: {
    z1: {
      id: "z1",
      x: 200,
      y: 200, // Direkt am Spieler (in Angriffsreichweite)
      radius: 18,
      hp: 30,
      geschwindigkeit: 2,
      letzterAngriff: 0
    }
  }
};

// Zombie greift an, während Spieler Schutz hat
zombiesAktualisieren(raumImmunaet, mockIo);
assert.strictEqual(
  raumImmunaet.spieler.spielerA.hp,
  100,
  "Spieler mit aktivem Schutz darf KEINEN Schaden erhalten!"
);
console.log("✓ Spieler nimmt während der Schutzzeit keinen Schaden (HP bleibt 100)!");

// Schutz abgelaufen (Simuliere Zeitablauf von 2.1 Sekunden)
raumImmunaet.spieler.spielerA.schutzBis = Date.now() - 100; // Schutz abgelaufen!
zombiesAktualisieren(raumImmunaet, mockIo);

assert(
  raumImmunaet.spieler.spielerA.hp < 100,
  "Nach Ablauf des 2s-Schutzes muss der Spieler wieder regulär Schaden nehmen können!"
);
console.log(`✓ Nach Ablauf des Schutzes nimmt der Spieler wieder Schaden (HP = ${raumImmunaet.spieler.spielerA.hp})!`);

// 3. TEST: Unabhängiger Schutz im Multiplayer
console.log("\n3. Teste unabhängigen Schutz pro Spieler im Multiplayer...");

const raumMultiplayer = {
  code: "MULTI",
  spieler: {
    geschuetzterSpieler: {
      id: "geschuetzterSpieler",
      x: 100,
      y: 100,
      radius: 18,
      hp: 100,
      schutzBis: Date.now() + 2000 // IMMUN
    },
    verwundbarerSpieler: {
      id: "verwundbarerSpieler",
      x: 800,
      y: 500,
      radius: 18,
      hp: 100,
      schutzBis: null // NICHT IMMUN
    }
  },
  zombies: {
    z1: {
      id: "z1",
      x: 100,
      y: 100, // Am geschützten Spieler
      radius: 18,
      hp: 30,
      geschwindigkeit: 2,
      letzterAngriff: 0
    },
    z2: {
      id: "z2",
      x: 800,
      y: 500, // Am verwundbaren Spieler
      radius: 18,
      hp: 30,
      geschwindigkeit: 2,
      letzterAngriff: 0
    }
  }
};

zombiesAktualisieren(raumMultiplayer, mockIo);

assert.strictEqual(
  raumMultiplayer.spieler.geschuetzterSpieler.hp,
  100,
  "Geschützter Spieler darf keine HP verlieren!"
);
assert.strictEqual(
  raumMultiplayer.spieler.verwundbarerSpieler.hp,
  90,
  "Verwundbarer Spieler muss normal 10 Schaden nehmen!"
);

console.log("✓ Jeder Spieler hat seinen eigenen, unabhängigen Schutzstatus im Multiplayer!");
console.log("\n=== ALLE RESPAWN- & SCHUTZTESTS BESTANDEN! ===");
