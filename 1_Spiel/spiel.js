// Hauptlogik des 2D-Top-Down-Multiplayer-Spiels mit Zwei-Zonen-Steuerung (Touch & PC)

// 1. Initialisierung und Zustände
let canvas = null;
let ctx = null;
let positionsAnzeige = null;

// Erkennung für Touch-Geräte
let istTouchGeraet = false;

// Maus-Position auf dem PC (zum Zielen)
let mausX = 0;
let mausY = 0;

// Tastaturstatus auf dem PC (WASD / Pfeile)
const aktiveTasten = {};

// Eigene Top-Down Spielfigur
const spieler = {
  id: "lokal",
  name: "Du",
  x: 200,
  y: 200,
  radius: Spieleinstellungen.spieler.radius,
  breite: Spieleinstellungen.spieler.breite,
  hoehe: Spieleinstellungen.spieler.hoehe,
  geschwindigkeit: Spieleinstellungen.spieler.geschwindigkeit,
  farbe: Spieleinstellungen.spieler.standardFarbe,
  winkel: 0 // 360-Grad-Blick- und Zielwinkel in Radiant
};

// Virtuelle Touch-Joysticks für Smartphones
const bewegungsJoystick = {
  aktiv: false,
  touchId: null,
  startX: 0,
  startY: 0,
  aktuellX: 0,
  aktuellY: 0,
  vektorX: 0,
  vektorY: 0
};

const zielJoystick = {
  aktiv: false,
  touchId: null,
  startX: 0,
  startY: 0,
  aktuellX: 0,
  aktuellY: 0
};

// 2. Start sobald die Seite geladen ist
document.addEventListener("DOMContentLoaded", () => {
  spielStarten();
});

function spielStarten() {
  canvas = document.getElementById("spielFeld");
  ctx = canvas.getContext("2d");
  positionsAnzeige = document.getElementById("spieler-pos");

  // Vollbild initialisieren
  bildschirmGroesseAnpassen();
  window.addEventListener("resize", bildschirmGroesseAnpassen);
  window.addEventListener("orientationchange", () => {
    setTimeout(bildschirmGroesseAnpassen, 150);
  });

  // Spieler in Bildschirmmitte starten lassen
  spieler.x = canvas.width / 2;
  spieler.y = canvas.height / 2;
  mausX = spieler.x + 100;
  mausY = spieler.y;

  // Steuerung initialisieren (PC & Touch)
  eingabeRegistrieren();

  // Socket.IO Multiplayer starten
  multiplayerVerbindung = new MultiplayerVerbindung({
    onInitialisiert: (serverSpieler) => {
      spieler.id = serverSpieler.id;
      spieler.farbe = serverSpieler.farbe;
      spieler.winkel = serverSpieler.winkel || 0;
      if (canvas.width > 0 && canvas.height > 0) {
        spieler.x = Math.min(Math.max(spieler.radius, serverSpieler.x), canvas.width - spieler.radius);
        spieler.y = Math.min(Math.max(spieler.radius, serverSpieler.y), canvas.height - spieler.radius);
      }
      console.log(`[Top-Down] Eingeloggt als ${spieler.name}`);
    }
  });

  // Game Loop starten
  requestAnimationFrame(gameLoop);
}

// Passt das Canvas dynamisch an die Fenstergröße an
function bildschirmGroesseAnpassen() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Begrenzungen einhalten
  spieler.x = Math.max(spieler.radius, Math.min(canvas.width - spieler.radius, spieler.x));
  spieler.y = Math.max(spieler.radius, Math.min(canvas.height - spieler.radius, spieler.y));
}

// 3. Eingabe-Registrierung: PC (Maus & Tastatur) und Smartphone (Touch)
function eingabeRegistrieren() {
  // A. PC: Tastatur (WASD / Pfeiltasten)
  window.addEventListener("keydown", (e) => {
    aktiveTasten[e.key.toLowerCase()] = true;
    aktiveTasten[e.code] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
      e.preventDefault();
    }
  });

  window.addEventListener("keyup", (e) => {
    aktiveTasten[e.key.toLowerCase()] = false;
    aktiveTasten[e.code] = false;
  });

  // B. PC: Mausbewegung zum 360-Grad-Zielen
  window.addEventListener("mousemove", (e) => {
    mausX = e.clientX;
    mausY = e.clientY;

    // Nur zielen per Maus, wenn kein Touch-Joystick aktiv ist
    if (!zielJoystick.aktiv) {
      spieler.winkel = Math.atan2(mausY - spieler.y, mausX - spieler.x);
    }
  });

  // C. Smartphone: Touch-Ereignisse (Zwei-Zonen-System)
  canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
  canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
  canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
  canvas.addEventListener("touchcancel", handleTouchEnd, { passive: false });
}

// Touch-Start: Unterscheidet linke Hälfte (Bewegung) und rechte Hälfte (Zielen)
function handleTouchStart(e) {
  e.preventDefault();
  istTouchGeraet = true;
  const breiteHalb = window.innerWidth / 2;

  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];

    // Linke Bildschirmhälfte: Bewegungs-Joystick aktivieren
    if (touch.clientX < breiteHalb && !bewegungsJoystick.aktiv) {
      bewegungsJoystick.aktiv = true;
      bewegungsJoystick.touchId = touch.identifier;
      bewegungsJoystick.startX = touch.clientX;
      bewegungsJoystick.startY = touch.clientY;
      bewegungsJoystick.aktuellX = touch.clientX;
      bewegungsJoystick.aktuellY = touch.clientY;
      bewegungsJoystick.vektorX = 0;
      bewegungsJoystick.vektorY = 0;
    }
    // Rechte Bildschirmhälfte: Zielen aktivieren
    else if (touch.clientX >= breiteHalb && !zielJoystick.aktiv) {
      zielJoystick.aktiv = true;
      zielJoystick.touchId = touch.identifier;
      zielJoystick.startX = touch.clientX;
      zielJoystick.startY = touch.clientY;
      zielJoystick.aktuellX = touch.clientX;
      zielJoystick.aktuellY = touch.clientY;
    }
  }
}

// Touch-Bewegung: Aktualisiert Auslenkung des Joysticks und Zielwinkel
function handleTouchMove(e) {
  e.preventDefault();
  const maxWeg = Spieleinstellungen.touch.maxAuslenkung;

  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];

    // Linker Joystick (Bewegung)
    if (bewegungsJoystick.aktiv && touch.identifier === bewegungsJoystick.touchId) {
      const dx = touch.clientX - bewegungsJoystick.startX;
      const dy = touch.clientY - bewegungsJoystick.startY;
      const dist = Math.hypot(dx, dy);

      if (dist > maxWeg) {
        bewegungsJoystick.aktuellX = bewegungsJoystick.startX + (dx / dist) * maxWeg;
        bewegungsJoystick.aktuellY = bewegungsJoystick.startY + (dy / dist) * maxWeg;
        bewegungsJoystick.vektorX = dx / dist;
        bewegungsJoystick.vektorY = dy / dist;
      } else {
        bewegungsJoystick.aktuellX = touch.clientX;
        bewegungsJoystick.aktuellY = touch.clientY;
        bewegungsJoystick.vektorX = maxWeg > 0 ? dx / maxWeg : 0;
        bewegungsJoystick.vektorY = maxWeg > 0 ? dy / maxWeg : 0;
      }
    }

    // Rechter Joystick (Zielen in 360 Grad)
    if (zielJoystick.aktiv && touch.identifier === zielJoystick.touchId) {
      zielJoystick.aktuellX = touch.clientX;
      zielJoystick.aktuellY = touch.clientY;

      const zdx = touch.clientX - zielJoystick.startX;
      const zdy = touch.clientY - zielJoystick.startY;

      // Winkel erst aktualisieren, wenn leicht gewischt wird (> 8 Pixel)
      if (Math.hypot(zdx, zdy) > 8) {
        spieler.winkel = Math.atan2(zdy, zdx);
      }
    }
  }
}

// Touch-Ende: Joysticks loslassen
function handleTouchEnd(e) {
  e.preventDefault();
  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];

    if (bewegungsJoystick.aktiv && touch.identifier === bewegungsJoystick.touchId) {
      bewegungsJoystick.aktiv = false;
      bewegungsJoystick.touchId = null;
      bewegungsJoystick.vektorX = 0;
      bewegungsJoystick.vektorY = 0;
    }

    if (zielJoystick.aktiv && touch.identifier === zielJoystick.touchId) {
      zielJoystick.aktiv = false;
      zielJoystick.touchId = null;
    }
  }
}

// 4. Spielfigur-Zustand aktualisieren (Bewegung & Kollision)
function spielerAktualisieren() {
  let moveX = 0;
  let moveY = 0;

  // A. Bewegung über PC-Tastatur
  if (aktiveTasten["w"] || aktiveTasten["arrowup"]) moveY -= 1;
  if (aktiveTasten["s"] || aktiveTasten["arrowdown"]) moveY += 1;
  if (aktiveTasten["a"] || aktiveTasten["arrowleft"]) moveX -= 1;
  if (aktiveTasten["d"] || aktiveTasten["arrowright"]) moveX += 1;

  // Diagonale Geschwindigkeit normieren (keine Überhöhung bei W+D)
  const tastenLaenge = Math.hypot(moveX, moveY);
  if (tastenLaenge > 0) {
    moveX = (moveX / tastenLaenge) * spieler.geschwindigkeit;
    moveY = (moveY / tastenLaenge) * spieler.geschwindigkeit;
  }

  // B. Bewegung über virtuellen Joystick (Touch) überschreibt oder ergänzt
  if (bewegungsJoystick.aktiv) {
    moveX = bewegungsJoystick.vektorX * spieler.geschwindigkeit;
    moveY = bewegungsJoystick.vektorY * spieler.geschwindigkeit;
  }

  // C. Position aktualisieren
  spieler.x += moveX;
  spieler.y += moveY;

  // D. Bildschirmgrenzen einhalten (Kollision mit Spielfeldrand)
  const r = spieler.radius;
  if (spieler.x < r) spieler.x = r;
  if (spieler.x > canvas.width - r) spieler.x = canvas.width - r;
  if (spieler.y < r) spieler.y = r;
  if (spieler.y > canvas.height - r) spieler.y = canvas.height - r;

  // Koordinatenanzeige im HUD
  if (positionsAnzeige) {
    positionsAnzeige.textContent = `X: ${Math.round(spieler.x)} | Y: ${Math.round(spieler.y)}`;
  }

  // E. Position und Winkel an Server übertragen
  const hatSichBewegt = Math.abs(moveX) > 0.01 || Math.abs(moveY) > 0.01 || zielJoystick.aktiv;
  if (multiplayerVerbindung) {
    multiplayerVerbindung.sendeBewegung(
      Math.round(spieler.x),
      Math.round(spieler.y),
      spieler.winkel
    );
  }
}

// 5. Zeichnen der 2D Top-Down Spielwelt
function zeichnen() {
  // Hintergrund löschen (sehr dunkle Zombie-Nacht)
  ctx.fillStyle = Spieleinstellungen.design.hintergrundFarbe;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Orientierungsraster zeichnen
  gitterZeichnen();

  // 1. Alle anderen Mitspieler zeichnen
  if (multiplayerVerbindung) {
    const andere = multiplayerVerbindung.getAndereSpieler();
    for (const mitspieler of andere) {
      topDownFigurZeichnen(mitspieler, false);
    }
  }

  // 2. Eigene Spielfigur zeichnen
  topDownFigurZeichnen(spieler, true);

  // 3. Virtuelle Joysticks & Touch-Hilfen auf dem Bildschirm zeichnen
  touchSteuerungZeichnen();
}

// Orientierungsraster zeichnen
function gitterZeichnen() {
  const gitter = Spieleinstellungen.design.gitterGroesse;
  ctx.strokeStyle = Spieleinstellungen.design.gitterFarbe;
  ctx.lineWidth = 1;

  ctx.beginPath();
  for (let x = 0; x < canvas.width; x += gitter) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
  }
  for (let y = 0; y < canvas.height; y += gitter) {
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
  }
  ctx.stroke();
}

// Zeichnet eine Top-Down-Spielfigur mit Taschenlampe, Körper und Waffe
function topDownFigurZeichnen(f, istEigenerSpieler) {
  const x = f.x;
  const y = f.y;
  const r = f.radius || Spieleinstellungen.spieler.radius;
  const winkel = f.winkel || 0;
  const farbe = f.farbe || Spieleinstellungen.spieler.standardFarbe;

  ctx.save();
  ctx.translate(x, y);

  // 1. Taschenlampen-Lichtkegel nach vorne
  taschenlampeZeichnen(winkel);

  // In Zielrichtung drehen
  ctx.rotate(winkel);

  // 2. Waffe (Gewehr / Pistole ragt nach vorne)
  ctx.fillStyle = Spieleinstellungen.spieler.waffenFarbe;
  ctx.fillRect(r * 0.4, -3, 20, 6); // Waffenlauf
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(r * 0.3, -4, 10, 8); // Waffenverschluss

  // 3. Hände / Arme (halten die Waffe)
  ctx.fillStyle = farbe;
  ctx.beginPath();
  ctx.arc(r * 0.7, -7, 5, 0, Math.PI * 2); // Linke Hand
  ctx.arc(r * 0.7, 7, 5, 0, Math.PI * 2);  // Rechte Hand
  ctx.fill();

  // 4. Körper (Kopf und Schultern aus Vogelperspektive)
  // Eigener Spieler leuchtet dezent
  if (istEigenerSpieler) {
    ctx.shadowColor = farbe;
    ctx.shadowBlur = 10;
  }

  // Schultern / Torso (Ellipse)
  ctx.fillStyle = farbe;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();

  // Kontur
  ctx.strokeStyle = istEigenerSpieler ? "#ffffff" : "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = istEigenerSpieler ? 2 : 1;
  ctx.stroke();

  // Kopf (Helm / Mütze in der Mitte)
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();

  // 5. Namensschild über dem Kopf zeichnen
  ctx.save();
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = istEigenerSpieler ? "#60a5fa" : "#e2e8f0";
  ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
  ctx.shadowBlur = 4;
  ctx.fillText(istEigenerSpieler ? "Du" : (f.name || "Spieler"), x, y - r - 8);
  ctx.restore();
}

// Zeichnet den atmosphärischen Taschenlampen-Lichtkegel
function taschenlampeZeichnen(winkel) {
  const laenge = Spieleinstellungen.design.taschenlampeLaenge;
  const halberWinkel = Spieleinstellungen.design.taschenlampeWinkel / 2;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, laenge, winkel - halberWinkel, winkel + halberWinkel);
  ctx.closePath();

  // Weicher radialer Farbverlauf von Licht zu Schatten
  const gradient = ctx.createRadialGradient(0, 0, 10, 0, 0, laenge);
  gradient.addColorStop(0, "rgba(254, 240, 138, 0.28)");  // Warmes Lampenlicht
  gradient.addColorStop(0.6, "rgba(254, 240, 138, 0.08)");
  gradient.addColorStop(1, "rgba(254, 240, 138, 0)");

  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();
}

// 6. Zeichnet die Touch-Joysticks auf dem Smartphone
function touchSteuerungZeichnen() {
  const cfg = Spieleinstellungen.touch;

  // A. Linker Joystick (Bewegung), wenn aktiv
  if (bewegungsJoystick.aktiv) {
    ctx.save();
    // Äußerer Ring
    ctx.strokeStyle = "rgba(59, 130, 246, 0.5)";
    ctx.lineWidth = 3;
    ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
    ctx.beginPath();
    ctx.arc(bewegungsJoystick.startX, bewegungsJoystick.startY, cfg.joystickRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Innerer beweglicher Knauf
    ctx.fillStyle = "#3b82f6";
    ctx.beginPath();
    ctx.arc(bewegungsJoystick.aktuellX, bewegungsJoystick.aktuellY, cfg.knaufRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // B. Rechter Joystick (Zielen), wenn aktiv
  if (zielJoystick.aktiv) {
    ctx.save();
    // Äußerer Zielkreis
    ctx.strokeStyle = "rgba(239, 68, 68, 0.5)";
    ctx.lineWidth = 3;
    ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
    ctx.beginPath();
    ctx.arc(zielJoystick.startX, zielJoystick.startY, cfg.joystickRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Fadenkreuz im Zielkreis
    ctx.strokeStyle = "rgba(239, 68, 68, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(zielJoystick.startX - 15, zielJoystick.startY);
    ctx.lineTo(zielJoystick.startX + 15, zielJoystick.startY);
    ctx.moveTo(zielJoystick.startX, zielJoystick.startY - 15);
    ctx.lineTo(zielJoystick.startX, zielJoystick.startY + 15);
    ctx.stroke();

    // Innerer Zielknauf
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(zielJoystick.aktuellX, zielJoystick.aktuellY, cfg.knaufRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // C. Dezente Orientierungs-Hinweise für Touch-Benutzer im Leerlauf
  if (istTouchGeraet && !bewegungsJoystick.aktiv && !zielJoystick.aktiv) {
    ctx.save();
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.textAlign = "center";
    ctx.fillText("🕹️ Links: Bewegen", 100, canvas.height - 40);
    ctx.fillText("🎯 Rechts: Zielen", canvas.width - 100, canvas.height - 40);
    ctx.restore();
  }
}

// 7. Haupt-Spielschleife
function gameLoop() {
  spielerAktualisieren();
  zeichnen();
  requestAnimationFrame(gameLoop);
}
