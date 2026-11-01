// Hauptlogik des 2D-Multiplayer-Spiels

// 1. Initialisierung und Variablen
let canvas = null;
let ctx = null;
let positionsAnzeige = null;

// Tastaturstatus für flüssige Bewegungen (auch diagonal)
const aktiveTasten = {};

// Eigene Spielfigur (wird bei Serververbindung mit den Serverdaten synchronisiert)
const spieler = {
  id: "lokal",
  name: "Du",
  x: (Spieleinstellungen.weltBreite - Spieleinstellungen.spieler.breite) / 2,
  y: (Spieleinstellungen.weltHoehe - Spieleinstellungen.spieler.hoehe) / 2,
  breite: Spieleinstellungen.spieler.breite,
  hoehe: Spieleinstellungen.spieler.hoehe,
  geschwindigkeit: Spieleinstellungen.spieler.geschwindigkeit,
  farbe: Spieleinstellungen.spieler.standardFarbe,
  blickrichtung: "rechts" // "hoch", "runter", "links", "rechts"
};

// 2. Start sobald das DOM geladen ist
document.addEventListener("DOMContentLoaded", () => {
  spielStarten();
});

function spielStarten() {
  canvas = document.getElementById("spielFeld");
  ctx = canvas.getContext("2d");
  positionsAnzeige = document.getElementById("spieler-pos");

  canvas.width = Spieleinstellungen.weltBreite;
  canvas.height = Spieleinstellungen.weltHoehe;

  // Tastatureingaben aktivieren
  tastaturEreignisseRegistrieren();

  // Multiplayer-Verbindung aufbauen und Callback für Server-Startdaten registrieren
  multiplayerVerbindung = new MultiplayerVerbindung({
    onInitialisiert: (eigenerServerSpieler) => {
      // Übernehme die vom Server zugewiesene Farbe, Position und ID
      spieler.id = eigenerServerSpieler.id;
      spieler.x = eigenerServerSpieler.x;
      spieler.y = eigenerServerSpieler.y;
      spieler.farbe = eigenerServerSpieler.farbe;
      spieler.blickrichtung = eigenerServerSpieler.blickrichtung || "rechts";
      console.log(`[Spiel] Eingeloggt als ${spieler.name} (${spieler.farbe})`);
    }
  });

  // Spielschleife starten
  requestAnimationFrame(gameLoop);
}

// 3. Tastatureingaben verarbeiten (WASD und Pfeiltasten)
function tastaturEreignisseRegistrieren() {
  window.addEventListener("keydown", (e) => {
    aktiveTasten[e.key.toLowerCase()] = true;
    aktiveTasten[e.code] = true;

    // Kein Browser-Scrollen bei Pfeiltasten oder Leertaste
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
      e.preventDefault();
    }
  });

  window.addEventListener("keyup", (e) => {
    aktiveTasten[e.key.toLowerCase()] = false;
    aktiveTasten[e.code] = false;
  });
}

// 4. Spielfigur bewegen und Grenzen einhalten
function spielerAktualisieren() {
  let hatSichBewegt = false;

  // Nach oben: W oder Pfeil Oben
  if (aktiveTasten["w"] || aktiveTasten["arrowup"]) {
    spieler.y -= spieler.geschwindigkeit;
    spieler.blickrichtung = "hoch";
    hatSichBewegt = true;
  }

  // Nach unten: S oder Pfeil Unten
  if (aktiveTasten["s"] || aktiveTasten["arrowdown"]) {
    spieler.y += spieler.geschwindigkeit;
    spieler.blickrichtung = "runter";
    hatSichBewegt = true;
  }

  // Nach links: A oder Pfeil Links
  if (aktiveTasten["a"] || aktiveTasten["arrowleft"]) {
    spieler.x -= spieler.geschwindigkeit;
    spieler.blickrichtung = "links";
    hatSichBewegt = true;
  }

  // Nach rechts: D oder Pfeil Rechts
  if (aktiveTasten["d"] || aktiveTasten["arrowright"]) {
    spieler.x += spieler.geschwindigkeit;
    spieler.blickrichtung = "rechts";
    hatSichBewegt = true;
  }

  // Rand-Kollision (Figur darf das Spielfeld nicht verlassen)
  if (spieler.x < 0) {
    spieler.x = 0;
  }
  if (spieler.x + spieler.breite > canvas.width) {
    spieler.x = canvas.width - spieler.breite;
  }
  if (spieler.y < 0) {
    spieler.y = 0;
  }
  if (spieler.y + spieler.hoehe > canvas.height) {
    spieler.y = canvas.height - spieler.hoehe;
  }

  // Anzeige der aktuellen Koordinaten im UI
  if (positionsAnzeige) {
    positionsAnzeige.textContent = `X: ${Math.round(spieler.x)} | Y: ${Math.round(spieler.y)}`;
  }

  // Bewegung in Echtzeit an den Multiplayer-Server übertragen
  if (hatSichBewegt && multiplayerVerbindung) {
    multiplayerVerbindung.sendeBewegung(
      Math.round(spieler.x),
      Math.round(spieler.y),
      spieler.blickrichtung
    );
  }
}

// 5. Spielwelt und alle Spieler zeichnen
function zeichnen() {
  // Hintergrund leeren
  ctx.fillStyle = Spieleinstellungen.design.hintergrundFarbe;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Orientierungsraster zeichnen
  gitterZeichnen();

  // 1. Alle anderen Mitspieler zeichnen
  if (multiplayerVerbindung) {
    const andere = multiplayerVerbindung.getAndereSpieler();
    for (const mitspieler of andere) {
      figurZeichnen(mitspieler, false);
    }
  }

  // 2. Eigene Spielfigur hervorheben und zeichnen
  figurZeichnen(spieler, true);
}

// Zeichnet das Orientierungsraster
function gitterZeichnen() {
  const gitterGroesse = Spieleinstellungen.design.gitterGroesse;
  ctx.strokeStyle = Spieleinstellungen.design.gitterFarbe;
  ctx.lineWidth = 1;

  ctx.beginPath();
  for (let x = gitterGroesse; x < canvas.width; x += gitterGroesse) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
  }
  for (let y = gitterGroesse; y < canvas.height; y += gitterGroesse) {
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
  }
  ctx.stroke();
}

// Zeichnet eine beliebige Spielfigur (eigene oder fremde)
function figurZeichnen(f, istEigenerSpieler) {
  const x = f.x;
  const y = f.y;
  const w = f.breite || Spieleinstellungen.spieler.breite;
  const h = f.hoehe || Spieleinstellungen.spieler.hoehe;
  const radius = 8;

  ctx.save();

  // Körper zeichnen
  ctx.fillStyle = f.farbe || "#3b82f6";

  if (istEigenerSpieler) {
    // Eigene Figur leuchtet dezent zur besseren Erkennbarkeit
    ctx.shadowColor = f.farbe;
    ctx.shadowBlur = 12;
  }

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();

  // Kontur
  ctx.strokeStyle = istEigenerSpieler ? "#ffffff" : "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = istEigenerSpieler ? 2.5 : 1.5;
  ctx.stroke();

  ctx.restore();

  // Augen der Spielfigur zeichnen (zur Visualisierung der Blickrichtung)
  augenZeichnen(x, y, w, h, f.blickrichtung || "rechts");

  // Name / Kennzeichnung über dem Kopf zeichnen
  labelZeichnen(x, y, w, istEigenerSpieler ? "Du" : (f.name || "Spieler"), istEigenerSpieler);
}

// Zeichnet Augen zur Erkennung der Richtung
function augenZeichnen(x, y, w, h, blickrichtung) {
  ctx.fillStyle = Spieleinstellungen.spieler.augenFarbe;
  const augenRadius = 3;

  let auge1X = x + w * 0.3;
  let auge2X = x + w * 0.7;
  let augeY = y + h * 0.35;

  if (blickrichtung === "links") {
    auge1X = x + w * 0.2;
    auge2X = x + w * 0.5;
  } else if (blickrichtung === "rechts") {
    auge1X = x + w * 0.5;
    auge2X = x + w * 0.8;
  } else if (blickrichtung === "hoch") {
    augeY = y + h * 0.22;
  } else if (blickrichtung === "runter") {
    augeY = y + h * 0.52;
  }

  ctx.beginPath();
  ctx.arc(auge1X, augeY, augenRadius, 0, Math.PI * 2);
  ctx.arc(auge2X, augeY, augenRadius, 0, Math.PI * 2);
  ctx.fill();
}

// Zeichnet eine kleine Beschriftung über der Spielfigur
function labelZeichnen(x, y, w, text, istEigenerSpieler) {
  ctx.save();
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";

  const labelX = x + w / 2;
  const labelY = y - 6;

  // Text-Schatten für gute Lesbarkeit
  ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
  ctx.shadowBlur = 4;

  ctx.fillStyle = istEigenerSpieler ? "#60a5fa" : "#e2e8f0";
  ctx.fillText(text, labelX, labelY);
  ctx.restore();
}

// 6. Haupt-Spielschleife (Game Loop)
function gameLoop() {
  spielerAktualisieren();
  zeichnen();
  requestAnimationFrame(gameLoop);
}
