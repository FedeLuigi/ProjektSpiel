// Hauptlogik des 2D-Top-Down-Multiplayer-Spiels mit Schießen & Projektilen

// 1. Initialisierung und Zustände
let canvas = null;
let ctx = null;
let positionsAnzeige = null;

// Sound-System (Web Audio API - ohne externe Dateien)
let audioKontext = null;

// Erkennung für Touch-Geräte
let istTouchGeraet = false;

// Maus-Zustand auf dem PC
let mausX = 0;
let mausY = 0;
let mausGedrueckt = false;

// Tastaturstatus auf dem PC
const aktiveTasten = {};

// Liste aller fliegenden Projektile (eigene und fremde)
const projektile = [];

// Zeitstempel des letzten abgegebenen Schusses (für Schussrate)
let letzterSchussZeit = 0;

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
  winkel: 0,
  muendungsfeuer: 0 // Frames, die das Mündungsfeuer sichtbar ist
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

  // Socket.IO Multiplayer starten inkl. Empfang fremder Schüsse
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
    },
    // Wenn ein Mitspieler schießt
    onSchussEmpfangen: (schussDaten) => {
      fremdenSchussErzeugen(schussDaten);
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

// 3. Audio-Synthese: Knackiger Schusssound ohne externe Sounddateien
function audioInitialisieren() {
  if (!audioKontext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      audioKontext = new AudioCtx();
    }
  }
  if (audioKontext && audioKontext.state === "suspended") {
    audioKontext.resume();
  }
}

function soundEffektSchuss() {
  if (!audioKontext) return;

  try {
    const jetzt = audioKontext.currentTime;

    // 1. Kurzer weißer Rausch-Burst (Knall)
    const bufferGroesse = audioKontext.sampleRate * 0.06; // 60ms
    const buffer = audioKontext.createBuffer(1, bufferGroesse, audioKontext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferGroesse; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferGroesse * 0.3));
    }

    const rauschQuelle = audioKontext.createBufferSource();
    rauschQuelle.buffer = buffer;

    // Filter für dumpferen Gewehrklang
    const filter = audioKontext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1400, jetzt);
    filter.frequency.exponentialRampToValueAtTime(300, jetzt + 0.06);

    const gainNode = audioKontext.createGain();
    gainNode.gain.setValueAtTime(0.25, jetzt);
    gainNode.gain.exponentialRampToValueAtTime(0.01, jetzt + 0.06);

    rauschQuelle.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioKontext.destination);

    rauschQuelle.start(jetzt);
  } catch (e) {
    // Audio nicht verfügbar oder geblockt
  }
}

// 4. Eingabe-Registrierung: PC (Maus & Tastatur) und Smartphone (Touch)
function eingabeRegistrieren() {
  // A. PC: Tastatur (WASD / Pfeile / Leertaste zum Schießen)
  window.addEventListener("keydown", (e) => {
    audioInitialisieren();
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

  // B. PC: Mausbewegung (Zielen) und Klick (Schießen)
  window.addEventListener("mousemove", (e) => {
    mausX = e.clientX;
    mausY = e.clientY;
    if (!zielJoystick.aktiv) {
      spieler.winkel = Math.atan2(mausY - spieler.y, mausX - spieler.x);
    }
  });

  window.addEventListener("mousedown", (e) => {
    audioInitialisieren();
    // Nur bei Linksklick schießen
    if (e.button === 0) {
      mausGedrueckt = true;
      versucheSchussAbzugeben();
    }
  });

  window.addEventListener("mouseup", (e) => {
    if (e.button === 0) {
      mausGedrueckt = false;
    }
  });

  // C. Smartphone: Touch-Ereignisse (Zwei-Zonen-System)
  canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
  canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
  canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
  canvas.addEventListener("touchcancel", handleTouchEnd, { passive: false });
}

// Touch-Start: Links = Bewegen, Rechts = Zielen & Dauerfeuer
function handleTouchStart(e) {
  e.preventDefault();
  audioInitialisieren();
  istTouchGeraet = true;
  const breiteHalb = window.innerWidth / 2;

  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];

    // Linke Hälfte: Bewegung
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
    // Rechte Hälfte: Zielen & sofortiger erster Schuss
    else if (touch.clientX >= breiteHalb && !zielJoystick.aktiv) {
      zielJoystick.aktiv = true;
      zielJoystick.touchId = touch.identifier;
      zielJoystick.startX = touch.clientX;
      zielJoystick.startY = touch.clientY;
      zielJoystick.aktuellX = touch.clientX;
      zielJoystick.aktuellY = touch.clientY;
      versucheSchussAbzugeben();
    }
  }
}

// Touch-Bewegung: Auslenkung & 360-Grad-Zielen
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

      if (Math.hypot(zdx, zdy) > 8) {
        spieler.winkel = Math.atan2(zdy, zdx);
      }
    }
  }
}

// Touch-Ende
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

// 5. Schuss-Mechanik (Feuern, Ballistik & Mündungsfeuer)
function versucheSchussAbzugeben() {
  const jetzt = Date.now();
  if (jetzt - letzterSchussZeit < Spieleinstellungen.waffe.schussRate) {
    return;
  }
  letzterSchussZeit = jetzt;

  // Waffenmündung berechnen
  const waffenLaenge = Spieleinstellungen.spieler.waffenLaenge;
  const muendungX = spieler.x + Math.cos(spieler.winkel) * waffenLaenge;
  const muendungY = spieler.y + Math.sin(spieler.winkel) * waffenLaenge;

  // Leichte Streuung für realistisches Schussverhalten
  const streuung = (Math.random() - 0.5) * Spieleinstellungen.waffe.streuung;
  const schussWinkel = spieler.winkel + streuung;

  const geschwindigkeit = Spieleinstellungen.waffe.kugelGeschwindigkeit;
  const vx = Math.cos(schussWinkel) * geschwindigkeit;
  const vy = Math.sin(schussWinkel) * geschwindigkeit;

  // Mündungsfeuer an der eigenen Figur aktivieren
  spieler.muendungsfeuer = 3;

  // Eigenes Projektil zur lokalen Liste hinzufügen
  projektile.push({
    x: muendungX,
    y: muendungY,
    letzteX: muendungX,
    letzteY: muendungY,
    vx: vx,
    vy: vy,
    spielerId: spieler.id,
    verbleibendeReichweite: Spieleinstellungen.waffe.maxReichweite
  });

  // Sound abspielen
  soundEffektSchuss();

  // Schuss über Socket.IO an alle Mitspieler senden
  if (multiplayerVerbindung) {
    multiplayerVerbindung.sendeSchuss({
      x: Math.round(muendungX),
      y: Math.round(muendungY),
      vx: Math.round(vx * 100) / 100,
      vy: Math.round(vy * 100) / 100,
      winkel: Math.round(schussWinkel * 100) / 100
    });
  }
}

// Erzeugt ein Projektil, das von einem Mitspieler über den Server empfangen wurde
function fremdenSchussErzeugen(schuss) {
  projektile.push({
    x: schuss.x,
    y: schuss.y,
    letzteX: schuss.x,
    letzteY: schuss.y,
    vx: schuss.vx,
    vy: schuss.vy,
    spielerId: schuss.spielerId,
    verbleibendeReichweite: Spieleinstellungen.waffe.maxReichweite
  });

  // Mündungsfeuer beim entsprechenden Mitspieler aktivieren
  if (multiplayerVerbindung && multiplayerVerbindung.andereSpieler[schuss.spielerId]) {
    multiplayerVerbindung.andereSpieler[schuss.spielerId].muendungsfeuer = 3;
  }

  // Leiserer Sound für fremde Schüsse
  soundEffektSchuss();
}

// 6. Spielfigur & Projektile aktualisieren
function spielerAktualisieren() {
  let moveX = 0;
  let moveY = 0;

  // A. Bewegung über PC-Tastatur
  if (aktiveTasten["w"] || aktiveTasten["arrowup"]) moveY -= 1;
  if (aktiveTasten["s"] || aktiveTasten["arrowdown"]) moveY += 1;
  if (aktiveTasten["a"] || aktiveTasten["arrowleft"]) moveX -= 1;
  if (aktiveTasten["d"] || aktiveTasten["arrowright"]) moveX += 1;

  // Diagonale Geschwindigkeit normieren
  const tastenLaenge = Math.hypot(moveX, moveY);
  if (tastenLaenge > 0) {
    moveX = (moveX / tastenLaenge) * spieler.geschwindigkeit;
    moveY = (moveY / tastenLaenge) * spieler.geschwindigkeit;
  }

  // B. Bewegung über Touch-Joystick
  if (bewegungsJoystick.aktiv) {
    moveX = bewegungsJoystick.vektorX * spieler.geschwindigkeit;
    moveY = bewegungsJoystick.vektorY * spieler.geschwindigkeit;
  }

  // Position aktualisieren
  spieler.x += moveX;
  spieler.y += moveY;

  // Bildschirmgrenzen beachten
  const r = spieler.radius;
  if (spieler.x < r) spieler.x = r;
  if (spieler.x > canvas.width - r) spieler.x = canvas.width - r;
  if (spieler.y < r) spieler.y = r;
  if (spieler.y > canvas.height - r) spieler.y = canvas.height - r;

  // C. Dauerfeuer auslösen (PC: Maus gedrückt oder Leertaste | Smartphone: Rechter Touch aktiv)
  if (mausGedrueckt || aktiveTasten["space"] || zielJoystick.aktiv) {
    versucheSchussAbzugeben();
  }

  // Koordinatenanzeige im HUD
  if (positionsAnzeige) {
    positionsAnzeige.textContent = `X: ${Math.round(spieler.x)} | Y: ${Math.round(spieler.y)}`;
  }

  // Bewegung und Blickwinkel an Server senden
  if (multiplayerVerbindung) {
    multiplayerVerbindung.sendeBewegung(
      Math.round(spieler.x),
      Math.round(spieler.y),
      spieler.winkel
    );
  }
}

// Bewegt alle Kugeln und entfernt sie bei Wandtreffer oder Reichweitenende
function projektileAktualisieren() {
  for (let i = projektile.length - 1; i >= 0; i--) {
    const p = projektile[i];

    p.letzteX = p.x;
    p.letzteY = p.y;
    p.x += p.vx;
    p.y += p.vy;

    const distanz = Math.hypot(p.vx, p.vy);
    p.verbleibendeReichweite -= distanz;

    // Kugel löschen bei Wandkontakt oder Reichweitenende
    const ausserhalb =
      p.x < 0 || p.x > canvas.width ||
      p.y < 0 || p.y > canvas.height ||
      p.verbleibendeReichweite <= 0;

    if (ausserhalb) {
      projektile.splice(i, 1);
    }
  }
}

// 7. Zeichnen der Spielwelt
function zeichnen() {
  // Hintergrund löschen
  ctx.fillStyle = Spieleinstellungen.design.hintergrundFarbe;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Orientierungsraster zeichnen
  gitterZeichnen();

  // 1. Alle fliegenden Projektile zeichnen
  projektileZeichnen();

  // 2. Alle anderen Mitspieler zeichnen
  if (multiplayerVerbindung) {
    const andere = multiplayerVerbindung.getAndereSpieler();
    for (const mitspieler of andere) {
      topDownFigurZeichnen(mitspieler, false);
    }
  }

  // 3. Eigene Spielfigur zeichnen
  topDownFigurZeichnen(spieler, true);

  // 4. Touch-Joysticks auf Smartphones zeichnen
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

// Zeichnet alle fliegenden Kugeln mit Leuchtschweif
function projektileZeichnen() {
  ctx.save();
  for (const p of projektile) {
    // Leuchtender Schweif
    ctx.strokeStyle = Spieleinstellungen.waffe.schweifFarbe;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(p.letzteX, p.letzteY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();

    // Helle Kugelspitze
    ctx.fillStyle = Spieleinstellungen.waffe.kugelFarbe;
    ctx.shadowColor = Spieleinstellungen.waffe.kugelFarbe;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Spieleinstellungen.waffe.kugelRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Zeichnet eine Top-Down-Spielfigur mit Waffe, Mündungsfeuer und Taschenlampe
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

  // 2. Mündungsfeuer (kurzer heller Lichtblitz beim Schuss)
  if (f.muendungsfeuer && f.muendungsfeuer > 0) {
    ctx.save();
    ctx.fillStyle = "#fbbf24";
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(r + 14, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(r + 14, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    f.muendungsfeuer--;
  }

  // 3. Waffe (Gewehr / Pistole ragt nach vorne)
  ctx.fillStyle = Spieleinstellungen.spieler.waffenFarbe;
  ctx.fillRect(r * 0.4, -3, 20, 6); // Waffenlauf
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(r * 0.3, -4, 10, 8); // Verschluss

  // 4. Hände
  ctx.fillStyle = farbe;
  ctx.beginPath();
  ctx.arc(r * 0.7, -7, 5, 0, Math.PI * 2);
  ctx.arc(r * 0.7, 7, 5, 0, Math.PI * 2);
  ctx.fill();

  // 5. Körper (Torso)
  if (istEigenerSpieler) {
    ctx.shadowColor = farbe;
    ctx.shadowBlur = 10;
  }
  ctx.fillStyle = farbe;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = istEigenerSpieler ? "#ffffff" : "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = istEigenerSpieler ? 2 : 1;
  ctx.stroke();

  // Kopf (Helm)
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();

  // 6. Namensschild
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

// Zeichnet den Taschenlampen-Lichtkegel
function taschenlampeZeichnen(winkel) {
  const laenge = Spieleinstellungen.design.taschenlampeLaenge;
  const halberWinkel = Spieleinstellungen.design.taschenlampeWinkel / 2;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, laenge, winkel - halberWinkel, winkel + halberWinkel);
  ctx.closePath();

  const gradient = ctx.createRadialGradient(0, 0, 10, 0, 0, laenge);
  gradient.addColorStop(0, "rgba(254, 240, 138, 0.28)");
  gradient.addColorStop(0.6, "rgba(254, 240, 138, 0.08)");
  gradient.addColorStop(1, "rgba(254, 240, 138, 0)");

  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();
}

// 8. Zeichnet die virtuellen Touch-Joysticks auf dem Smartphone
function touchSteuerungZeichnen() {
  const cfg = Spieleinstellungen.touch;

  // Linker Joystick (Bewegung)
  if (bewegungsJoystick.aktiv) {
    ctx.save();
    ctx.strokeStyle = "rgba(59, 130, 246, 0.5)";
    ctx.lineWidth = 3;
    ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
    ctx.beginPath();
    ctx.arc(bewegungsJoystick.startX, bewegungsJoystick.startY, cfg.joystickRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#3b82f6";
    ctx.beginPath();
    ctx.arc(bewegungsJoystick.aktuellX, bewegungsJoystick.aktuellY, cfg.knaufRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Rechter Joystick (Zielen & Schießen)
  if (zielJoystick.aktiv) {
    ctx.save();
    ctx.strokeStyle = "rgba(239, 68, 68, 0.6)";
    ctx.lineWidth = 3;
    ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
    ctx.beginPath();
    ctx.arc(zielJoystick.startX, zielJoystick.startY, cfg.joystickRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Fadenkreuz
    ctx.strokeStyle = "rgba(239, 68, 68, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(zielJoystick.startX - 15, zielJoystick.startY);
    ctx.lineTo(zielJoystick.startX + 15, zielJoystick.startY);
    ctx.moveTo(zielJoystick.startX, zielJoystick.startY - 15);
    ctx.lineTo(zielJoystick.startX, zielJoystick.startY + 15);
    ctx.stroke();

    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(zielJoystick.aktuellX, zielJoystick.aktuellY, cfg.knaufRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Orientierungshinweise für Touch-Gamer
  if (istTouchGeraet && !bewegungsJoystick.aktiv && !zielJoystick.aktiv) {
    ctx.save();
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.textAlign = "center";
    ctx.fillText("🕹️ Links: Laufen", 100, canvas.height - 40);
    ctx.fillText("💥 Rechts: Zielen & Schießen", canvas.width - 120, canvas.height - 40);
    ctx.restore();
  }
}

// 9. Haupt-Spielschleife
function gameLoop() {
  spielerAktualisieren();
  projektileAktualisieren();
  zeichnen();
  requestAnimationFrame(gameLoop);
}
