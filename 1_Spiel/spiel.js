// Hauptlogik des 2D-Spiels

// 1. Initialisierung und Variablen
let canvas = null;
let ctx = null;
let positionsAnzeige = null;

// Status der gedrückten Tasten (für flüssige diagonale Bewegung)
const aktiveTasten = {};

// Spielfigur-Objekt
const spieler = {
  x: 0,
  y: 0,
  breite: Spieleinstellungen.spieler.breite,
  hoehe: Spieleinstellungen.spieler.hoehe,
  geschwindigkeit: Spieleinstellungen.spieler.geschwindigkeit,
  farbe: Spieleinstellungen.spieler.farbe,
  blickrichtung: "rechts" // "hoch", "runter", "links", "rechts"
};

// 2. Start der Anwendung, sobald das DOM geladen ist
document.addEventListener("DOMContentLoaded", () => {
  spielStarten();
});

function spielStarten() {
  // Canvas-Element abrufen und konfigurieren
  canvas = document.getElementById("spielFeld");
  ctx = canvas.getContext("2d");
  positionsAnzeige = document.getElementById("spieler-pos");

  canvas.width = Spieleinstellungen.weltBreite;
  canvas.height = Spieleinstellungen.weltHoehe;

  // Spielfigur genau in der Mitte der Spielwelt platzieren
  spieler.x = (canvas.width - spieler.breite) / 2;
  spieler.y = (canvas.height - spieler.hoehe) / 2;

  // Tastatur-Events registrieren (WASD und Pfeiltasten)
  tastaturEreignisseRegistrieren();

  // Multiplayer-Verbindung initialisieren (Vorbereitung für Mehrspieler)
  multiplayerVerbindung = new MultiplayerVerbindung();

  // Den Game Loop starten
  requestAnimationFrame(gameLoop);
}

// 3. Tastatureingaben verarbeiten
function tastaturEreignisseRegistrieren() {
  window.addEventListener("keydown", (e) => {
    // Taste als aktiv markieren
    aktiveTasten[e.key.toLowerCase()] = true;
    aktiveTasten[e.code] = true;

    // Verhindert das Scrollen der Seite bei den Pfeiltasten
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
      e.preventDefault();
    }
  });

  window.addEventListener("keyup", (e) => {
    // Taste als inaktiv markieren
    aktiveTasten[e.key.toLowerCase()] = false;
    aktiveTasten[e.code] = false;
  });
}

// 4. Spielfigur bewegen und Rand-Kollision prüfen
function spielerAktualisieren() {
  let hatSichBewegt = false;

  // Bewegung nach oben: W oder Pfeiltaste Oben
  if (aktiveTasten["w"] || aktiveTasten["arrowup"]) {
    spieler.y -= spieler.geschwindigkeit;
    spieler.blickrichtung = "hoch";
    hatSichBewegt = true;
  }

  // Bewegung nach unten: S oder Pfeiltaste Unten
  if (aktiveTasten["s"] || aktiveTasten["arrowdown"]) {
    spieler.y += spieler.geschwindigkeit;
    spieler.blickrichtung = "runter";
    hatSichBewegt = true;
  }

  // Bewegung nach links: A oder Pfeiltaste Links
  if (aktiveTasten["a"] || aktiveTasten["arrowleft"]) {
    spieler.x -= spieler.geschwindigkeit;
    spieler.blickrichtung = "links";
    hatSichBewegt = true;
  }

  // Bewegung nach rechts: D oder Pfeiltaste Rechts
  if (aktiveTasten["d"] || aktiveTasten["arrowright"]) {
    spieler.x += spieler.geschwindigkeit;
    spieler.blickrichtung = "rechts";
    hatSichBewegt = true;
  }

  // Randbegrenzung (Kollisionsprüfung mit der Spielfeldgrenze)
  // 1. Linker Rand
  if (spieler.x < 0) {
    spieler.x = 0;
  }
  // 2. Rechter Rand
  if (spieler.x + spieler.breite > canvas.width) {
    spieler.x = canvas.width - spieler.breite;
  }
  // 3. Oberer Rand
  if (spieler.y < 0) {
    spieler.y = 0;
  }
  // 4. Unterer Rand
  if (spieler.y + spieler.hoehe > canvas.height) {
    spieler.y = canvas.height - spieler.hoehe;
  }

  // Positionsanzeige im UI aktualisieren
  if (positionsAnzeige) {
    positionsAnzeige.textContent = `X: ${Math.round(spieler.x)} | Y: ${Math.round(spieler.y)}`;
  }

  // Bei Bewegung die Position an den Multiplayer-Server übermitteln
  if (hatSichBewegt && multiplayerVerbindung) {
    multiplayerVerbindung.sendePosition(Math.round(spieler.x), Math.round(spieler.y));
  }
}

// 5. Zeichnen der Spielwelt
function zeichnen() {
  // Hintergrund löschen
  ctx.fillStyle = Spieleinstellungen.design.hintergrundFarbe;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Einfaches Gitter für Orientierung zeichnen
  gitterZeichnen();

  // Spielfigur zeichnen
  spielerZeichnen();
}

// Zeichnet ein dezentes Orientierungsgitter
function gitterZeichnen() {
  const gitterGroesse = Spieleinstellungen.design.gitterGroesse;
  ctx.strokeStyle = Spieleinstellungen.design.gitterFarbe;
  ctx.lineWidth = 1;

  ctx.beginPath();
  // Vertikale Linien
  for (let x = gitterGroesse; x < canvas.width; x += gitterGroesse) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
  }
  // Horizontale Linien
  for (let y = gitterGroesse; y < canvas.height; y += gitterGroesse) {
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
  }
  ctx.stroke();
}

// Zeichnet die Spielfigur mit abgerundeten Ecken und Augen
function spielerZeichnen() {
  const radius = 8;
  const x = spieler.x;
  const y = spieler.y;
  const w = spieler.breite;
  const h = spieler.hoehe;

  // Körper der Spielfigur (abgerundetes Rechteck)
  ctx.save();
  ctx.fillStyle = spieler.farbe;
  ctx.shadowColor = "rgba(78, 154, 241, 0.5)";
  ctx.shadowBlur = 10;

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();

  // Kontur
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Augen der Spielfigur zeichnen (zur Visualisierung der Blickrichtung)
  augenZeichnen(x, y, w, h);
}

// Kleine Augen zur Erkennung der Richtung
function augenZeichnen(x, y, w, h) {
  ctx.fillStyle = Spieleinstellungen.spieler.augenFarbe;
  const augenRadius = 3;

  let auge1X = x + w * 0.3;
  let auge2X = x + w * 0.7;
  let augeY = y + h * 0.35;

  if (spieler.blickrichtung === "links") {
    auge1X = x + w * 0.2;
    auge2X = x + w * 0.5;
  } else if (spieler.blickrichtung === "rechts") {
    auge1X = x + w * 0.5;
    auge2X = x + w * 0.8;
  } else if (spieler.blickrichtung === "hoch") {
    augeY = y + h * 0.25;
  } else if (spieler.blickrichtung === "runter") {
    augeY = y + h * 0.5;
  }

  ctx.beginPath();
  ctx.arc(auge1X, augeY, augenRadius, 0, Math.PI * 2);
  ctx.arc(auge2X, augeY, augenRadius, 0, Math.PI * 2);
  ctx.fill();
}

// 6. Die Haupt-Spielschleife (Game Loop)
function gameLoop() {
  spielerAktualisieren();
  zeichnen();
  requestAnimationFrame(gameLoop);
}
