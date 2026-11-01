// Spieler-Verwaltung auf dem Server (Multiplayer)
const { SPIELER_FARBEN, WELT } = require('../3_Spieleinstellungen/server_einstellungen');

// Zentrale Liste aller aktuell verbundenen Spieler
const alleSpieler = {};

// Erzeugt einen neuen Spieler mit zufälliger Farbe und Startposition
function spielerErstellen(socketId) {
  const farbe = SPIELER_FARBEN[Math.floor(Math.random() * SPIELER_FARBEN.length)];

  const startX = 400 + Math.round((Math.random() - 0.5) * 80);
  const startY = 300 + Math.round((Math.random() - 0.5) * 80);

  const neuerSpieler = {
    id: socketId,
    name: `Spieler #${socketId.substring(0, 4)}`,
    x: startX,
    y: startY,
    radius: 18,
    farbe: farbe,
    winkel: 0,
    hp: 100,
    maxHp: 100
  };

  alleSpieler[socketId] = neuerSpieler;
  return neuerSpieler;
}

// Entfernt einen Spieler, wenn er die Verbindung trennt
function spielerEntfernen(socketId) {
  delete alleSpieler[socketId];
}

// Aktualisiert Position und Zielwinkel eines Spielers
function spielerBewegen(socketId, daten) {
  if (alleSpieler[socketId]) {
    alleSpieler[socketId].x = daten.x;
    alleSpieler[socketId].y = daten.y;
    alleSpieler[socketId].winkel = daten.winkel !== undefined ? daten.winkel : 0;
    return alleSpieler[socketId];
  }
  return null;
}

// Gibt alle Spieler als Objekt zurück (für Initialisierung)
function getAlleSpieler() {
  return alleSpieler;
}

// Gibt alle Spieler als Array zurück (für Iterationen)
function getSpielerListe() {
  return Object.values(alleSpieler);
}

// Gibt die Anzahl aktuell verbundener Spieler zurück
function getSpielerAnzahl() {
  return Object.keys(alleSpieler).length;
}

// Heilt alle lebenden Spieler (z.B. nach einer gemeisterten Welle)
function alleLebendenSpielerHeilen(betrag, io) {
  for (const id in alleSpieler) {
    const p = alleSpieler[id];
    if (p.hp > 0) {
      p.hp = Math.min(100, p.hp + betrag);
      io.emit('spielerSchaden', { spielerId: p.id, hp: p.hp, schaden: -betrag });
    }
  }
}

// Belebt einen gefallenen Spieler wieder
function spielerWiederbeleben(socketId, x = 400, y = 300) {
  if (alleSpieler[socketId]) {
    alleSpieler[socketId].hp = 100;
    alleSpieler[socketId].x = x;
    alleSpieler[socketId].y = y;
    return alleSpieler[socketId];
  }
  return null;
}

module.exports = {
  spielerErstellen,
  spielerEntfernen,
  spielerBewegen,
  getAlleSpieler,
  getSpielerListe,
  getSpielerAnzahl,
  alleLebendenSpielerHeilen,
  spielerWiederbeleben
};
