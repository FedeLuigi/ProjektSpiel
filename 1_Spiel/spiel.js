// Hauptlogik des 2D-Top-Down-Multiplayer-Spiels mit Zombies und Koop-Kampf

// 1. Initialisierung und Zustände
let canvas = null;
let ctx = null;
let positionsAnzeige = null;
let lebenFuellung = null;
let lebenText = null;
let zombieAnzeige = null;
let levelAnzeige = null;
let welleBanner = null;
let welleBannerTitel = null;
let welleBannerUntertitel = null;
let bannerTimeout = null;

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

// Listen für Entities, Projektile, Partikel und Blutflecken
const projektile = [];
let aktiveZombies = [];
const blutFlecken = []; // Bleibende Blutflecken auf dem Boden
const partikel = [];    // Kurzlebige Treffer-Partikel

// Visueller Treffereffekt (rotes Aufblitzen des Bildschirms)
let schadenBlitz = 0;

// Zeitstempel des letzten Schusses
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
  hp: 100,
  maxHp: 100,
  farbe: Spieleinstellungen.spieler.standardFarbe,
  winkel: 0,
  muendungsfeuer: 0
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
  lebenFuellung = document.getElementById("spieler-leben-fuellung");
  lebenText = document.getElementById("spieler-leben-text");
  zombieAnzeige = document.getElementById("zombie-anzahl");
  levelAnzeige = document.getElementById("level-anzeige");
  welleBanner = document.getElementById("welle-banner");
  welleBannerTitel = document.getElementById("welle-banner-titel");
  welleBannerUntertitel = document.getElementById("welle-banner-untertitel");

  // Vollbild initialisieren
  bildschirmGroesseAnpassen();
  window.addEventListener("resize", bildschirmGroesseAnpassen);
  window.addEventListener("orientationchange", () => {
    setTimeout(bildschirmGroesseAnpassen, 150);
  });

  // Spieler in Bildschirmmitte starten
  spieler.x = canvas.width / 2;
  spieler.y = canvas.height / 2;
  mausX = spieler.x + 100;
  mausY = spieler.y;

  // Eingabesteuerung aktivieren
  eingabeRegistrieren();

  // PWA & Smartphone App-Unterstützung aktivieren
  pwaInitialisieren();

  // Socket.IO Multiplayer starten inklusive Zombie-Events
  multiplayerVerbindung = new MultiplayerVerbindung({
    onInitialisiert: (serverSpieler) => {
      spieler.id = serverSpieler.id;
      spieler.farbe = serverSpieler.farbe;
      spieler.winkel = serverSpieler.winkel || 0;
      spieler.hp = serverSpieler.hp || 100;
      lebenAktualisieren(spieler.hp);

      if (canvas.width > 0 && canvas.height > 0) {
        spieler.x = Math.min(Math.max(spieler.radius, serverSpieler.x), canvas.width - spieler.radius);
        spieler.y = Math.min(Math.max(spieler.radius, serverSpieler.y), canvas.height - spieler.radius);
      }
      console.log(`[Top-Down Koop] Eingeloggt als ${spieler.name}`);
    },

    onSchussEmpfangen: (schussDaten) => {
      fremdenSchussErzeugen(schussDaten);
    },

    // Synchronisation der Zombies vom Server
    onZombiesAktualisiert: (zombieListe) => {
      aktiveZombies = zombieListe;
      if (zombieAnzeige) {
        zombieAnzeige.textContent = `🧟 ${aktiveZombies.length}`;
      }
    },

    // Zombie besiegt
    onZombieGestorben: (daten) => {
      blutErzeugen(daten.x, daten.y, true);
    },

    // Zombie getroffen
    onZombieVerletzt: (daten) => {
      blutErzeugen(daten.trefferX || daten.x, daten.trefferY || daten.y, false);
    },

    // Spieler nimmt Schaden
    onSpielerSchaden: (daten) => {
      if (daten.spielerId === spieler.id) {
        spieler.hp = daten.hp;
        lebenAktualisieren(spieler.hp);
        schadenBlitz = 4; // Rotes Aufblitzen
        soundEffektTreffer();
      }
    },

    // Spieler wiederbelebt
    onSpielerRespawn: (daten) => {
      if (daten.spielerId === spieler.id) {
        spieler.hp = daten.hp;
        spieler.x = daten.x;
        spieler.y = daten.y;
        lebenAktualisieren(spieler.hp);
      }
    },

    // 9. Wellen- & Levelsystem Events
    onWelleStatus: (daten) => {
      if (levelAnzeige) {
        levelAnzeige.textContent = `🏆 Level ${daten.level}`;
      }
      if (zombieAnzeige) {
        if (daten.status === "welle_aktiv") {
          zombieAnzeige.textContent = `🧟 ${daten.zombiesUebrig} übrig`;
        } else {
          zombieAnzeige.textContent = `⏳ Pause (${daten.pauseVerbleibend}s)`;
        }
      }
    },

    onWelleGestartet: (daten) => {
      if (levelAnzeige) {
        levelAnzeige.textContent = `🏆 Level ${daten.level}`;
      }
      bannerZeigen(`⚠️ LEVEL ${daten.level} STARTET!`, `${daten.zombiesGesamt} Zombies greifen an! Eliminiert alle!`);
      soundEffektWelleStart();
    },

    onWelleAbgeschlossen: (daten) => {
      bannerZeigen(`🏆 LEVEL ${daten.geschafftesLevel} GEMEISTERT!`, `+25 HP geheilt! Level ${daten.naechstesLevel} startet in ${daten.pauseSekunden}s...`, 4800);
      soundEffektLevelGeschafft();
    },

    onPauseCountdown: (daten) => {
      if (zombieAnzeige) {
        zombieAnzeige.textContent = `⏳ Pause (${daten.sekunden}s)`;
      }
      if (welleBanner && !welleBanner.classList.contains("versteckt")) {
        welleBannerUntertitel.textContent = `Level ${daten.naechstesLevel} startet in ${daten.sekunden} Sekunden...`;
      }
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

  spieler.x = Math.max(spieler.radius, Math.min(canvas.width - spieler.radius, spieler.x));
  spieler.y = Math.max(spieler.radius, Math.min(canvas.height - spieler.radius, spieler.y));
}

// 3. Audio-Synthese: Knackiger Schuss & Treffersound
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
    const bufferGroesse = audioKontext.sampleRate * 0.06;
    const buffer = audioKontext.createBuffer(1, bufferGroesse, audioKontext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferGroesse; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferGroesse * 0.3));
    }

    const rauschQuelle = audioKontext.createBufferSource();
    rauschQuelle.buffer = buffer;

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
  } catch (e) {}
}

function soundEffektTreffer() {
  if (!audioKontext) return;
  try {
    const jetzt = audioKontext.currentTime;
    const osc = audioKontext.createOscillator();
    const gain = audioKontext.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, jetzt);
    osc.frequency.exponentialRampToValueAtTime(40, jetzt + 0.1);

    gain.gain.setValueAtTime(0.3, jetzt);
    gain.gain.exponentialRampToValueAtTime(0.01, jetzt + 0.1);

    osc.connect(gain);
    gain.connect(audioKontext.destination);
    osc.start(jetzt);
    osc.stop(jetzt + 0.1);
  } catch (e) {}
}

// Sieges-Melodie bei gemeistertem Level
function soundEffektLevelGeschafft() {
  if (!audioKontext) return;
  try {
    const jetzt = audioKontext.currentTime;
    const toene = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Sieg-Fanfare)
    toene.forEach((f, idx) => {
      const osc = audioKontext.createOscillator();
      const gain = audioKontext.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, jetzt + idx * 0.12);
      gain.gain.setValueAtTime(0.2, jetzt + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, jetzt + idx * 0.12 + 0.35);
      osc.connect(gain);
      gain.connect(audioKontext.destination);
      osc.start(jetzt + idx * 0.12);
      osc.stop(jetzt + idx * 0.12 + 0.35);
    });
  } catch (e) {}
}

// Bedrohliches Signalhorn beim Start einer neuen Welle
function soundEffektWelleStart() {
  if (!audioKontext) return;
  try {
    const jetzt = audioKontext.currentTime;
    const osc = audioKontext.createOscillator();
    const gain = audioKontext.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(140, jetzt);
    osc.frequency.linearRampToValueAtTime(95, jetzt + 0.4);
    gain.gain.setValueAtTime(0.22, jetzt);
    gain.gain.exponentialRampToValueAtTime(0.01, jetzt + 0.45);
    osc.connect(gain);
    gain.connect(audioKontext.destination);
    osc.start(jetzt);
    osc.stop(jetzt + 0.45);
  } catch (e) {}
}

// Zeigt das große Level-Banner auf dem Bildschirm
function bannerZeigen(titel, untertitel, dauerMs = 3500) {
  if (!welleBanner || !welleBannerTitel || !welleBannerUntertitel) return;
  welleBannerTitel.textContent = titel;
  welleBannerUntertitel.textContent = untertitel;
  welleBanner.classList.remove("versteckt");

  if (bannerTimeout) clearTimeout(bannerTimeout);
  bannerTimeout = setTimeout(() => {
    welleBanner.classList.add("versteckt");
  }, dauerMs);
}

// ========================================================
// PWA & Smartphone App-Unterstützung (Service Worker & Install-Prompt)
// ========================================================
let deferredPrompt = null;

function pwaInitialisieren() {
  const installBtn = document.getElementById("app-install-btn");
  const installModal = document.getElementById("install-modal");
  const modalSchliessen = document.getElementById("install-modal-schliessen");
  const anleitungIos = document.getElementById("install-anleitung-ios");
  const anleitungAndroid = document.getElementById("install-anleitung-android");
  const androidInstallTriggerBtn = document.getElementById("android-install-trigger-btn");

  // Prüfen, ob die App bereits als installierte App (Standalone) ausgeführt wird
  const istStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        window.navigator.standalone === true;

  // Prüfen, ob es sich um ein iOS-Gerät handelt
  const istIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent.toLowerCase());

  // 1. Service Worker registrieren (ermöglicht Offline-App-Shell und extrem schnelles Laden)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/1_Spiel/service-worker.js')
        .then((reg) => {
          console.log('[PWA] Service Worker erfolgreich registriert:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker Registrierung fehlgeschlagen:', err);
        });
    });
  }

  // 2. Android / Chrome vorab abgefangenes Installations-Event
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!istStandalone && installBtn) {
      installBtn.classList.remove('versteckt');
    }
  });

  // 3. Auf iOS im normalen Safari-Browser den Installationshinweis anbieten
  if (istIos && !istStandalone && installBtn) {
    installBtn.classList.remove('versteckt');
  }

  // 4. Klick auf den HUD-Installationsbutton
  if (installBtn && installModal) {
    installBtn.addEventListener('click', () => {
      audioInitialisieren();
      installModal.classList.remove('versteckt');

      if (deferredPrompt) {
        // Android / Chrome: Direkter Installationsbutton verfügbar
        if (anleitungIos) anleitungIos.classList.add('versteckt');
        if (anleitungAndroid) anleitungAndroid.classList.remove('versteckt');
      } else {
        // iOS Safari oder Standard-Anleitung
        if (anleitungIos) anleitungIos.classList.remove('versteckt');
        if (anleitungAndroid) anleitungAndroid.classList.add('versteckt');
      }
    });
  }

  // 5. Android-Installationsdialog auslösen
  if (androidInstallTriggerBtn) {
    androidInstallTriggerBtn.addEventListener('click', async () => {
      audioInitialisieren();
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        console.log(`[PWA] Installationsentscheidung: ${choice.outcome}`);
        deferredPrompt = null;
        if (installModal) installModal.classList.add('versteckt');
        if (choice.outcome === 'accepted' && installBtn) {
          installBtn.classList.add('versteckt');
        }
      }
    });
  }

  // 6. Modal schließen (per X-Button oder Klick auf den Hintergrund)
  if (modalSchliessen && installModal) {
    modalSchliessen.addEventListener('click', () => {
      installModal.classList.add('versteckt');
    });
  }

  if (installModal) {
    installModal.addEventListener('click', (e) => {
      if (e.target === installModal) {
        installModal.classList.add('versteckt');
      }
    });
  }
}

// 4. Eingabe-Registrierung
function eingabeRegistrieren() {
  // A. PC: Tastatur
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

  // B. PC: Maus (Zielen & Schießen)
  window.addEventListener("mousemove", (e) => {
    mausX = e.clientX;
    mausY = e.clientY;
    if (!zielJoystick.aktiv) {
      spieler.winkel = Math.atan2(mausY - spieler.y, mausX - spieler.x);
    }
  });

  window.addEventListener("mousedown", (e) => {
    audioInitialisieren();
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

  // C. Smartphone: Touch
  canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
  canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
  canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
  canvas.addEventListener("touchcancel", handleTouchEnd, { passive: false });
}

function handleTouchStart(e) {
  e.preventDefault();
  audioInitialisieren();
  istTouchGeraet = true;
  const breiteHalb = window.innerWidth / 2;

  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];

    if (touch.clientX < breiteHalb && !bewegungsJoystick.aktiv) {
      bewegungsJoystick.aktiv = true;
      bewegungsJoystick.touchId = touch.identifier;
      bewegungsJoystick.startX = touch.clientX;
      bewegungsJoystick.startY = touch.clientY;
      bewegungsJoystick.aktuellX = touch.clientX;
      bewegungsJoystick.aktuellY = touch.clientY;
      bewegungsJoystick.vektorX = 0;
      bewegungsJoystick.vektorY = 0;
    } else if (touch.clientX >= breiteHalb && !zielJoystick.aktiv) {
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

function handleTouchMove(e) {
  e.preventDefault();
  const maxWeg = Spieleinstellungen.touch.maxAuslenkung;

  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];

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

// 5. Schuss-Mechanik
function versucheSchussAbzugeben() {
  if (spieler.hp <= 0) return; // Tote Spieler können nicht schießen

  const jetzt = Date.now();
  if (jetzt - letzterSchussZeit < Spieleinstellungen.waffe.schussRate) {
    return;
  }
  letzterSchussZeit = jetzt;

  const waffenLaenge = Spieleinstellungen.spieler.waffenLaenge;
  const muendungX = spieler.x + Math.cos(spieler.winkel) * waffenLaenge;
  const muendungY = spieler.y + Math.sin(spieler.winkel) * waffenLaenge;

  const streuung = (Math.random() - 0.5) * Spieleinstellungen.waffe.streuung;
  const schussWinkel = spieler.winkel + streuung;

  const geschwindigkeit = Spieleinstellungen.waffe.kugelGeschwindigkeit;
  const vx = Math.cos(schussWinkel) * geschwindigkeit;
  const vy = Math.sin(schussWinkel) * geschwindigkeit;

  spieler.muendungsfeuer = 3;

  projektile.push({
    x: muendungX,
    y: muendungY,
    letzteX: muendungX,
    letzteY: muendungY,
    vx: vx,
    vy: vy,
    spielerId: spieler.id,
    istEigenerSchuss: true,
    verbleibendeReichweite: Spieleinstellungen.waffe.maxReichweite
  });

  soundEffektSchuss();

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

function fremdenSchussErzeugen(schuss) {
  projektile.push({
    x: schuss.x,
    y: schuss.y,
    letzteX: schuss.x,
    letzteY: schuss.y,
    vx: schuss.vx,
    vy: schuss.vy,
    spielerId: schuss.spielerId,
    istEigenerSchuss: false,
    verbleibendeReichweite: Spieleinstellungen.waffe.maxReichweite
  });

  if (multiplayerVerbindung && multiplayerVerbindung.andereSpieler[schuss.spielerId]) {
    multiplayerVerbindung.andereSpieler[schuss.spielerId].muendungsfeuer = 3;
  }
  soundEffektSchuss();
}

// 6. Blutspritzer und Treffer-Partikel
function blutErzeugen(x, y, istTod) {
  // 1. Kurzlebige Partikel für die Flug-Animation
  const partikelAnzahl = istTod ? 16 : 6;
  for (let i = 0; i < partikelAnzahl; i++) {
    const winkel = Math.random() * Math.PI * 2;
    const tempo = 1.5 + Math.random() * 4;
    partikel.push({
      x: x,
      y: y,
      vx: Math.cos(winkel) * tempo,
      vy: Math.sin(winkel) * tempo,
      radius: 2 + Math.random() * 2.5,
      farbe: Math.random() > 0.4 ? "#dc2626" : "#991b1b",
      leben: 1.0,
      decay: 0.04 + Math.random() * 0.03
    });
  }

  // 2. Bleibende Blutflecken auf dem Boden (maximal 50 für flüssige Performance)
  if (blutFlecken.length > 50) {
    blutFlecken.shift();
  }
  blutFlecken.push({
    x: x + (Math.random() - 0.5) * 8,
    y: y + (Math.random() - 0.5) * 8,
    radius: istTod ? (14 + Math.random() * 8) : (6 + Math.random() * 5),
    rotation: Math.random() * Math.PI * 2,
    alpha: 0.65
  });
}

// 7. Spielfigur, Projektile & Partikel aktualisieren
function spielerAktualisieren() {
  if (spieler.hp <= 0) return; // Tote Spieler pausieren bis Respawn

  let moveX = 0;
  let moveY = 0;

  if (aktiveTasten["w"] || aktiveTasten["arrowup"]) moveY -= 1;
  if (aktiveTasten["s"] || aktiveTasten["arrowdown"]) moveY += 1;
  if (aktiveTasten["a"] || aktiveTasten["arrowleft"]) moveX -= 1;
  if (aktiveTasten["d"] || aktiveTasten["arrowright"]) moveX += 1;

  const tastenLaenge = Math.hypot(moveX, moveY);
  if (tastenLaenge > 0) {
    moveX = (moveX / tastenLaenge) * spieler.geschwindigkeit;
    moveY = (moveY / tastenLaenge) * spieler.geschwindigkeit;
  }

  if (bewegungsJoystick.aktiv) {
    moveX = bewegungsJoystick.vektorX * spieler.geschwindigkeit;
    moveY = bewegungsJoystick.vektorY * spieler.geschwindigkeit;
  }

  spieler.x += moveX;
  spieler.y += moveY;

  const r = spieler.radius;
  if (spieler.x < r) spieler.x = r;
  if (spieler.x > canvas.width - r) spieler.x = canvas.width - r;
  if (spieler.y < r) spieler.y = r;
  if (spieler.y > canvas.height - r) spieler.y = canvas.height - r;

  // Dauerfeuer prüfen
  if (mausGedrueckt || aktiveTasten["space"] || zielJoystick.aktiv) {
    versucheSchussAbzugeben();
  }

  if (positionsAnzeige) {
    positionsAnzeige.textContent = `X: ${Math.round(spieler.x)} | Y: ${Math.round(spieler.y)}`;
  }

  if (multiplayerVerbindung) {
    multiplayerVerbindung.sendeBewegung(
      Math.round(spieler.x),
      Math.round(spieler.y),
      spieler.winkel
    );
  }
}

// Kugeln bewegen und Treffer auf Zombies berechnen
function projektileAktualisieren() {
  for (let i = projektile.length - 1; i >= 0; i--) {
    const p = projektile[i];

    p.letzteX = p.x;
    p.letzteY = p.y;
    p.x += p.vx;
    p.y += p.vy;

    const distanz = Math.hypot(p.vx, p.vy);
    p.verbleibendeReichweite -= distanz;

    // Kollisionsprüfung Kugel mit Zombies
    let kugelEntfernt = false;

    for (let z = 0; z < aktiveZombies.length; z++) {
      const zombie = aktiveZombies[z];
      const zDist = Math.hypot(p.x - zombie.x, p.y - zombie.y);

      // Treffer!
      if (zDist < (zombie.radius || Spieleinstellungen.zombie.radius) + 4) {
        kugelEntfernt = true;
        blutErzeugen(p.x, p.y, false);

        // Treffer an Server melden (wenn es unsere Kugel ist)
        if (p.istEigenerSchuss && multiplayerVerbindung) {
          multiplayerVerbindung.sendeZombieTreffer(zombie.id, 10, p.x, p.y);
        }
        break;
      }
    }

    // Löschen bei Treffer oder Verlassen des Bildschirms
    const ausserhalb =
      kugelEntfernt ||
      p.x < 0 || p.x > canvas.width ||
      p.y < 0 || p.y > canvas.height ||
      p.verbleibendeReichweite <= 0;

    if (ausserhalb) {
      projektile.splice(i, 1);
    }
  }
}

// Partikel bewegen und verblassen
function partikelAktualisieren() {
  for (let i = partikel.length - 1; i >= 0; i--) {
    const p = partikel[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.92;
    p.vy *= 0.92;
    p.leben -= p.decay;
    if (p.leben <= 0) {
      partikel.splice(i, 1);
    }
  }
}

// Lebensbalken im HUD anpassen
function lebenAktualisieren(hp) {
  if (lebenFuellung && lebenText) {
    const prozent = Math.max(0, Math.min(100, hp));
    lebenFuellung.style.width = prozent + "%";
    lebenText.textContent = `${prozent}`;

    if (prozent > 50) {
      lebenFuellung.style.backgroundColor = "#22c55e"; // Grün
    } else if (prozent > 25) {
      lebenFuellung.style.backgroundColor = "#f59e0b"; // Gelb
    } else {
      lebenFuellung.style.backgroundColor = "#ef4444"; // Rot
    }
  }
}

// 8. Zeichnen der Spielwelt
function zeichnen() {
  // Hintergrund
  ctx.fillStyle = Spieleinstellungen.design.hintergrundFarbe;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Raster
  gitterZeichnen();

  // 1. Blutflecken auf dem Boden zeichnen
  blutZeichnen();

  // 2. Kurzlebige Blut-Partikel zeichnen
  partikelZeichnen();

  // 3. Projektile zeichnen
  projektileZeichnen();

  // 4. Zombies zeichnen (Top-Down)
  zombiesZeichnen();

  // 5. Mitspieler zeichnen
  if (multiplayerVerbindung) {
    const andere = multiplayerVerbindung.getAndereSpieler();
    for (const mitspieler of andere) {
      topDownFigurZeichnen(mitspieler, false);
    }
  }

  // 6. Eigene Spielfigur zeichnen (wenn lebendig)
  if (spieler.hp > 0) {
    topDownFigurZeichnen(spieler, true);
  } else {
    // Todesanzeige / Respawn-Hinweis
    totenBildschirmZeichnen();
  }

  // 7. Touch-Steuerung
  touchSteuerungZeichnen();

  // 8. Rotes Aufblitzen bei erlittenem Schaden
  if (schadenBlitz > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(239, 68, 68, ${schadenBlitz * 0.08})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    schadenBlitz--;
  }
}

// Orientierungsraster
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

// Blutflecken auf dem Boden
function blutZeichnen() {
  ctx.save();
  for (const b of blutFlecken) {
    ctx.fillStyle = `rgba(153, 27, 27, ${b.alpha})`;
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, b.radius, b.radius * 0.75, b.rotation, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Flug-Partikel
function partikelZeichnen() {
  ctx.save();
  for (const p of partikel) {
    ctx.fillStyle = p.farbe;
    ctx.globalAlpha = p.leben;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Projektile
function projektileZeichnen() {
  ctx.save();
  for (const p of projektile) {
    ctx.strokeStyle = Spieleinstellungen.waffe.schweifFarbe;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(p.letzteX, p.letzteY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();

    ctx.fillStyle = Spieleinstellungen.waffe.kugelFarbe;
    ctx.shadowColor = Spieleinstellungen.waffe.kugelFarbe;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Spieleinstellungen.waffe.kugelRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Zombies zeichnen (Top-Down mit ausgestreckten Armen und glühenden Augen)
function zombiesZeichnen() {
  for (const z of aktiveZombies) {
    ctx.save();
    ctx.translate(z.x, z.y);
    ctx.rotate(z.winkel || 0);

    const r = z.radius || Spieleinstellungen.zombie.radius;

    // 1. Ausgestreckte Arme greifen nach vorne
    ctx.fillStyle = Spieleinstellungen.zombie.farbe;
    ctx.beginPath();
    ctx.arc(r * 0.9, -8, 4.5, 0, Math.PI * 2); // Linker Arm
    ctx.arc(r * 0.9, 8, 4.5, 0, Math.PI * 2);  // Rechter Arm
    ctx.fill();

    // 2. Verwesender Körper (Torso)
    ctx.fillStyle = Spieleinstellungen.zombie.farbe;
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#365314";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 3. Kopf
    ctx.fillStyle = "#3f6212";
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // 4. Glühende rote Augen
    ctx.fillStyle = Spieleinstellungen.zombie.augenFarbe;
    ctx.shadowColor = Spieleinstellungen.zombie.augenFarbe;
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(r * 0.35, -4, 2.5, 0, Math.PI * 2);
    ctx.arc(r * 0.35, 4, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 5. Kleiner Lebensbalken über dem Zombie (nur wenn angeschlagen)
    if (z.hp < (z.maxHp || 30)) {
      const balkenBreite = 28;
      const balkenHoehe = 4;
      const prozent = Math.max(0, z.hp / (z.maxHp || 30));

      ctx.save();
      // Hintergrund (rot)
      ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
      ctx.fillRect(z.x - balkenBreite / 2, z.y - r - 10, balkenBreite, balkenHoehe);
      // Füllung (grün)
      ctx.fillStyle = "#84cc16";
      ctx.fillRect(z.x - balkenBreite / 2, z.y - r - 10, balkenBreite * prozent, balkenHoehe);
      ctx.restore();
    }
  }
}

// Spielfigur zeichnen
function topDownFigurZeichnen(f, istEigenerSpieler) {
  const x = f.x;
  const y = f.y;
  const r = f.radius || Spieleinstellungen.spieler.radius;
  const winkel = f.winkel || 0;
  const farbe = f.farbe || Spieleinstellungen.spieler.standardFarbe;

  ctx.save();
  ctx.translate(x, y);

  taschenlampeZeichnen(winkel);
  ctx.rotate(winkel);

  // Mündungsfeuer
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

  // Waffe
  ctx.fillStyle = Spieleinstellungen.spieler.waffenFarbe;
  ctx.fillRect(r * 0.4, -3, 20, 6);
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(r * 0.3, -4, 10, 8);

  // Hände
  ctx.fillStyle = farbe;
  ctx.beginPath();
  ctx.arc(r * 0.7, -7, 5, 0, Math.PI * 2);
  ctx.arc(r * 0.7, 7, 5, 0, Math.PI * 2);
  ctx.fill();

  // Körper
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

  // Kopf
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();

  // Namensschild
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

// Todesanzeige & Respawn
function totenBildschirmZeichnen() {
  ctx.save();
  ctx.fillStyle = "rgba(239, 68, 68, 0.35)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = "bold 24px sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
  ctx.shadowBlur = 8;
  ctx.fillText("💀 Du wurdest von den Zombies erwischt!", canvas.width / 2, canvas.height / 2 - 10);

  ctx.font = "14px sans-serif";
  ctx.fillStyle = "#e2e8f0";
  ctx.fillText("Respawn in Kürze...", canvas.width / 2, canvas.height / 2 + 20);
  ctx.restore();
}

// Touch-Joysticks
function touchSteuerungZeichnen() {
  const cfg = Spieleinstellungen.touch;

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

  if (zielJoystick.aktiv) {
    ctx.save();
    ctx.strokeStyle = "rgba(239, 68, 68, 0.6)";
    ctx.lineWidth = 3;
    ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
    ctx.beginPath();
    ctx.arc(zielJoystick.startX, zielJoystick.startY, cfg.joystickRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

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
  partikelAktualisieren();
  zeichnen();
  requestAnimationFrame(gameLoop);
}
