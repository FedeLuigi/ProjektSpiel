// Hauptlogik des 2D-Multiplayer-Spiels mit dynamischem Vollbild

// 1. Initialisierung und Variablen
let canvas = null;
let ctx = null;
let positionsAnzeige = null;

// Tastaturstatus für flüssige Bewegungen
const aktiveTasten = {};

// Eigene Spielfigur
const spieler = {
  id: "lokal",
  name: "Du",
  x: 100,
  y: 100,
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

  // Canvas sofort auf die volle Bildschirmgröße anpassen
  bildschirmGroesseAnpassen();

  // Bei Größenänderung oder Drehung des Smartphones das Spielfeld anpassen
  window.addEventListener("resize", bildschirmGroesseAnpassen);
  window.addEventListener("orientationchange", () => {
    setTimeout(bildschirmGroesseAnpassen, 150);
  });

  // Startposition genau in der Mitte des Bildschirms
  spieler.x = (canvas.width - spieler.breite) / 2;
  spieler.y = (canvas.height - spieler.hoehe) / 2;

  // Tastatureingaben auf dem PC aktivieren
  tastaturEreignisseRegistrieren();

  // Multiplayer-Verbindung aufbauen
  multiplayerVerbindung = new MultiplayerVerbindung({
    onInitialisiert: (eigenerServerSpieler) => {
      spieler.id = eigenerServerSpieler.id;
      spieler.farbe = eigenerServerSpieler.farbe;
      spieler.blickrichtung = eigenerServerSpieler.blickrichtung || "rechts";

      // Position übernehmen, aber an die aktuelle Bildschirmgröße anpassen
      if (canvas.width > 0 && canvas.height > 0) {
        spieler.x = Math.min(eigenerServerSpieler.x, canvas.width - spieler.breite);
        spieler.y = Math.min(eigenerServerSpieler.y, canvas.height - spieler.hoehe);
      }
      console.log(`[Spiel] Eingeloggt als ${spieler.name} (${spieler.farbe})`);
    }
  });

  // Spielschleife starten
  requestAnimationFrame(gameLoop);
}

// Passt das Canvas pixelgenau an den gesamten Bildschirm an
function bildschirmGroesseAnpassen() {
  if (!canvas) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Sicherstellen, dass die Figur nach dem Verkleinern nicht außerhalb des Spielfelds liegt
  if (spieler.x + spieler.breite > canvas.width) {
    spieler.x = Math.max(0, canvas.width - spieler.breite);
  }
  if (spieler.y + spieler.hoehe > canvas.height) {
    spieler.y = Math.max(0, canvas.height - spieler.hoehe);
  }
}

// 3. Tastatureingaben verarbeiten (WASD und Pfeiltasten auf dem PC)
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

  // Bildschirmgrenzen beachten (Figur darf das Spielfeld nicht verlassen)
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

  // Koordinaten-Anzeige im HUD aktualisieren
  if (positionsAnzeige) {
    positionsAnzeige.textContent = `X: ${Math.round(spieler.x)} | Y: ${Math.round(spieler.y)}`;
  }

  // Bewegung an den Server senden
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
  // Hintergrund füllen
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

  // 2. Eigene Spielfigur zeichnen
  figurZeichnen(spieler, true);
}

// Zeichnet das Orientierungsraster über den gesamten Bildschirm
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

// Zeichnet eine beliebige Spielfigur
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

  // Augen zeichnen (Blickrichtung)
  augenZeichnen(x, y, w, h, f.blickrichtung || "rechts");

  // Name über dem Kopf zeichnen
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

// Zeichnet ein kleines Namensschild über der Spielfigur
function labelZeichnen(x, y, w, text, istEigenerSpieler) {
  ctx.save();
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";

  const labelX = x + w / 2;
  const labelY = y - 6;

  ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
  ctx.shadowBlur = 4;

  ctx.fillStyle = istEigenerSpieler ? "#60a5fa" : "#e2e8f0";
  ctx.fillText(text, labelX, labelY);
  ctx.restore();
}

// 6. Haupt-Spielschleife
function gameLoop() {
  spielerAktualisieren();
  zeichnen();
  requestAnimationFrame(gameLoop);
}
