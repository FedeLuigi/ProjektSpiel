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

// Vollbild-Seitenansichten & Navigation
let ansichtHauptmenue = null;
let ansichtRaumErstellen = null;
let ansichtRaumBeitreten = null;
let ansichtLobby = null;
let spielHud = null;

let spielerNameInput = null;
let zufallsNameBtn = null;
let navRaumErstellenBtn = null;
let navRaumBeitretenBtn = null;

let erstellenZurueckBtn = null;
let erstellenAbbrechenBtn = null;
let erstellenSpielerNameVorschau = null;
let raumErstellenAusfuehrenBtn = null;

let beitretenZurueckBtn = null;
let beitretenAbbrechenBtn = null;
let beitretenCodeInput = null;
let beitretenFehlerBox = null;
let raumBeitretenAusfuehrenBtn = null;

let lobbyRaumCode = null;
let lobbyCodeKopierenBtn = null;
let lobbyLinkKopierenBtn = null;
let lobbySpielerZaehler = null;
let lobbyToast = null;
let lobbySpielerListe = null;
let lobbyVerlassenBtn = null;
let lobbyBereitBtn = null;
let lobbyStartenBtn = null;
let lobbyLeiterStatusText = null;
let spielVerlassenBtn = null;

// Einstellungsmenü & Pause-Zustand
let einstellungenGeoeffnet = false;
let einstellungenModal = null;
let einstellungenOeffnenBtn = null;
let einstellungenSchliessenBtn = null;
let einstellungenTabs = [];
let einstellungenTabInhalte = [];
let einstellungenRaumcodeWert = null;
let einstellungenRaumVerlassenBtn = null;
let raumVerlassenDialog = null;
let dialogAbbrechenBtn = null;
let dialogBestaetigenBtn = null;

let einstellungMusik = null;
let einstellungSound = null;
let einstellungLautstaerke = null;
let lautstaerkeWert = null;

let einstellungSpielerName = null;
let einstellungNameSpeichernBtn = null;
let einstellungNameFeedback = null;

let einstellungEmpfindlichkeit = null;
let empfindlichkeitWert = null;
let einstellungBlut = null;
let einstellungLicht = null;

// Benutzer-Einstellungen und lokale Speicherung
const SPEICHER_SCHLUESSEL_EINSTELLUNGEN = "zombie_einstellungen";
const standardEinstellungen = {
  musik: true,
  sound: true,
  lautstaerke: 80,
  empfindlichkeit: 100,
  blutEffekte: true,
  taschenlampe: true
};
let benutzerEinstellungen = { ...standardEinstellungen };

// Audio Gain-Nodes für Musik und Soundeffekte
let sfxGainNode = null;
let musikGainNode = null;
let musikQuelleNode = null;

let aktuellerZustand = "hauptmenue"; // "hauptmenue" | "raum-erstellen" | "raum-beitreten" | "lobby" | "spiel"
let toastTimer = null;

const ZOMBIE_NAMEN = [
  "Hunter", "Ghost", "Viper", "Hawk", "Shadow", "Reaper",
  "Doc", "Tank", "Wolf", "Blade", "Raven", "Striker",
  "Sarge", "Phoenix", "Ranger", "Bullet", "Zero", "Echo"
];

function zufallsNameGenerieren() {
  const name = ZOMBIE_NAMEN[Math.floor(Math.random() * ZOMBIE_NAMEN.length)];
  const nr = Math.floor(10 + Math.random() * 90);
  return `${name}_${nr}`;
}

// Automatische Querformat-Aktivierung (Landscape) ohne störende Drehhinweise
function querformatAktivieren() {
  try {
    if (screen.orientation && typeof screen.orientation.lock === "function") {
      screen.orientation.lock("landscape").catch(() => {});
    }
  } catch (e) {}
}

function toastZeigen(text, dauerMs = 2600) {
  if (!lobbyToast) return;
  lobbyToast.textContent = text;
  lobbyToast.classList.remove("versteckt");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    lobbyToast.classList.add("versteckt");
  }, dauerMs);
}

function beitretenFehlerZeigen(text) {
  if (!beitretenFehlerBox) return;
  beitretenFehlerBox.textContent = text;
  beitretenFehlerBox.classList.remove("versteckt");
}

function beitretenFehlerVerstecken() {
  if (beitretenFehlerBox) beitretenFehlerBox.classList.add("versteckt");
}

// Zentrale Seitenansichten-Umschaltung: Ersetzt die vorherige Ansicht vollständig
function ansichtWechseln(zustand) {
  aktuellerZustand = zustand;

  if (zustand !== "spiel") {
    einstellungenSchliessen();
  }

  if (ansichtHauptmenue) ansichtHauptmenue.classList.toggle("versteckt", zustand !== "hauptmenue");
  if (ansichtRaumErstellen) ansichtRaumErstellen.classList.toggle("versteckt", zustand !== "raum-erstellen");
  if (ansichtRaumBeitreten) ansichtRaumBeitreten.classList.toggle("versteckt", zustand !== "raum-beitreten");
  if (ansichtLobby) ansichtLobby.classList.toggle("versteckt", zustand !== "lobby");
  if (spielHud) spielHud.classList.toggle("versteckt", zustand !== "spiel");
  if (canvas) canvas.classList.toggle("versteckt", zustand !== "spiel");

  if (zustand === "raum-erstellen" && erstellenSpielerNameVorschau) {
    erstellenSpielerNameVorschau.textContent = spieler.name;
  }

  if (zustand === "raum-beitreten") {
    beitretenFehlerVerstecken();
    if (beitretenCodeInput) {
      setTimeout(() => beitretenCodeInput.focus(), 150);
    }
  }

  if (zustand === "spiel") {
    bildschirmGroesseAnpassen();
    spieler.x = canvas.width / 2;
    spieler.y = canvas.height / 2;
  }
}

function lobbyRendern(lobbyDaten) {
  if (!lobbyDaten) return;

  if (lobbyRaumCode) lobbyRaumCode.textContent = lobbyDaten.raumCode;
  if (lobbySpielerZaehler) lobbySpielerZaehler.textContent = `👥 ${lobbyDaten.spielerAnzahl} / 6 Überlebende`;

  if (lobbySpielerListe) {
    lobbySpielerListe.innerHTML = "";

    lobbyDaten.spieler.forEach(s => {
      const istIch = s.id === spieler.id;
      const karte = document.createElement("div");
      karte.className = "lobby-spieler-karte" + (istIch ? " ist-ich" : "");

      const info = document.createElement("div");
      info.className = "lobby-spieler-info";

      const punkt = document.createElement("div");
      punkt.className = "lobby-spieler-farbpunkt";
      punkt.style.backgroundColor = s.farbe;
      punkt.style.color = s.farbe;

      const nameSpan = document.createElement("span");
      nameSpan.className = "lobby-spieler-name";
      nameSpan.textContent = s.name;

      if (s.istLeiter) {
        const leiterBadge = document.createElement("span");
        leiterBadge.className = "lobby-badge-leiter";
        leiterBadge.textContent = "👑 Leiter";
        nameSpan.appendChild(leiterBadge);
      }

      if (istIch) {
        const ichBadge = document.createElement("span");
        ichBadge.className = "lobby-badge-ich";
        ichBadge.textContent = "Du";
        nameSpan.appendChild(ichBadge);
      }

      info.appendChild(punkt);
      info.appendChild(nameSpan);

      const statusSpan = document.createElement("span");
      statusSpan.className = "lobby-bereit-status " + (s.bereit ? "bereit" : "wartet");
      statusSpan.textContent = s.bereit ? "✅ BEREIT" : "⏳ WARTET";

      karte.appendChild(info);
      karte.appendChild(statusSpan);
      lobbySpielerListe.appendChild(karte);
    });
  }

  // Eigene Bereitschaft & Button anpassen
  const eigenerEintrag = lobbyDaten.spieler.find(s => s.id === spieler.id);
  const binBereit = eigenerEintrag ? eigenerEintrag.bereit : false;

  if (lobbyBereitBtn) {
    if (binBereit) {
      lobbyBereitBtn.textContent = "❌ Nicht mehr bereit";
      lobbyBereitBtn.classList.add("ist-bereit");
    } else {
      lobbyBereitBtn.textContent = "✅ Ich bin bereit";
      lobbyBereitBtn.classList.remove("ist-bereit");
    }
  }

  // Start-Button und Status-Text für Raumleiter / Mitspieler
  const binLeiter = spieler.id === lobbyDaten.leiterId;

  if (lobbyStartenBtn) {
    if (binLeiter) {
      lobbyStartenBtn.classList.remove("versteckt");
      lobbyStartenBtn.disabled = !lobbyDaten.alleBereit;
    } else {
      lobbyStartenBtn.classList.add("versteckt");
    }
  }

  if (lobbyLeiterStatusText) {
    if (binLeiter) {
      if (lobbyDaten.alleBereit) {
        lobbyLeiterStatusText.textContent = "Alle Spieler bereit! Du kannst starten.";
        lobbyLeiterStatusText.style.color = "#4ade80";
      } else {
        lobbyLeiterStatusText.textContent = "Warte auf Bereitschaft aller Spieler...";
        lobbyLeiterStatusText.style.color = "#94a3b8";
      }
    } else {
      if (lobbyDaten.alleBereit) {
        lobbyLeiterStatusText.textContent = "Alle bereit! Warte auf Raumleiter...";
        lobbyLeiterStatusText.style.color = "#4ade80";
      } else {
        lobbyLeiterStatusText.textContent = "Warte auf Bereitschaft aller Spieler...";
        lobbyLeiterStatusText.style.color = "#94a3b8";
      }
    }
  }
}

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

  // Vollbild-Seitenansichten
  ansichtHauptmenue = document.getElementById("ansicht-hauptmenue");
  ansichtRaumErstellen = document.getElementById("ansicht-raum-erstellen");
  ansichtRaumBeitreten = document.getElementById("ansicht-raum-beitreten");
  ansichtLobby = document.getElementById("ansicht-lobby");
  spielHud = document.getElementById("spiel-hud");

  // Hauptmenü Elemente
  spielerNameInput = document.getElementById("spieler-name-input");
  zufallsNameBtn = document.getElementById("zufalls-name-btn");
  navRaumErstellenBtn = document.getElementById("nav-raum-erstellen-btn");
  navRaumBeitretenBtn = document.getElementById("nav-raum-beitreten-btn");

  // Raum erstellen Ansicht
  erstellenZurueckBtn = document.getElementById("erstellen-zurueck-btn");
  erstellenAbbrechenBtn = document.getElementById("erstellen-abbrechen-btn");
  erstellenSpielerNameVorschau = document.getElementById("erstellen-spieler-name-vorschau");
  raumErstellenAusfuehrenBtn = document.getElementById("raum-erstellen-ausfuehren-btn");

  // Raum beitreten Ansicht
  beitretenZurueckBtn = document.getElementById("beitreten-zurueck-btn");
  beitretenAbbrechenBtn = document.getElementById("beitreten-abbrechen-btn");
  beitretenCodeInput = document.getElementById("beitreten-code-input");
  beitretenFehlerBox = document.getElementById("beitreten-fehler-box");
  raumBeitretenAusfuehrenBtn = document.getElementById("raum-beitreten-ausfuehren-btn");

  // Lobby Ansicht
  lobbyRaumCode = document.getElementById("lobby-raum-code");
  lobbyCodeKopierenBtn = document.getElementById("lobby-code-kopieren-btn");
  lobbyLinkKopierenBtn = document.getElementById("lobby-link-kopieren-btn");
  lobbySpielerZaehler = document.getElementById("lobby-spieler-zaehler");
  lobbyToast = document.getElementById("lobby-toast");
  lobbySpielerListe = document.getElementById("lobby-spieler-liste");
  lobbyVerlassenBtn = document.getElementById("lobby-verlassen-btn");
  lobbyBereitBtn = document.getElementById("lobby-bereit-btn");
  lobbyStartenBtn = document.getElementById("lobby-starten-btn");
  lobbyLeiterStatusText = document.getElementById("lobby-leiter-status-text");

  // In-Game Verlassen-Button
  spielVerlassenBtn = document.getElementById("spiel-verlassen-btn");

  // Einstellungsmenü & Modal-Elemente
  einstellungenOeffnenBtn = document.getElementById("einstellungen-oeffnen-btn");
  einstellungenModal = document.getElementById("einstellungen-modal");
  einstellungenSchliessenBtn = document.getElementById("einstellungen-schliessen-btn");
  einstellungenTabs = Array.from(document.querySelectorAll(".einstellungen-tabs .tab-btn"));
  einstellungenTabInhalte = Array.from(document.querySelectorAll(".tab-inhalt"));
  einstellungenRaumcodeWert = document.getElementById("einstellungen-raumcode-wert");
  einstellungenRaumVerlassenBtn = document.getElementById("einstellungen-raum-verlassen-btn");
  raumVerlassenDialog = document.getElementById("raum-verlassen-dialog");
  dialogAbbrechenBtn = document.getElementById("dialog-abbrechen-btn");
  dialogBestaetigenBtn = document.getElementById("dialog-bestaetigen-btn");

  einstellungMusik = document.getElementById("einstellung-musik");
  einstellungSound = document.getElementById("einstellung-sound");
  einstellungLautstaerke = document.getElementById("einstellung-lautstaerke");
  lautstaerkeWert = document.getElementById("lautstaerke-wert");

  einstellungSpielerName = document.getElementById("einstellung-spieler-name");
  einstellungNameSpeichernBtn = document.getElementById("einstellung-name-speichern-btn");
  einstellungNameFeedback = document.getElementById("einstellung-name-feedback");

  einstellungEmpfindlichkeit = document.getElementById("einstellung-empfindlichkeit");
  empfindlichkeitWert = document.getElementById("empfindlichkeit-wert");
  einstellungBlut = document.getElementById("einstellung-blut");
  einstellungLicht = document.getElementById("einstellung-licht");

  // Einstellungen laden, anwenden und Event-Listener verknüpfen
  einstellungenLaden();
  einstellungenAnwenden();
  einstellungenInitialisieren();

  // Vollbild initialisieren
  bildschirmGroesseAnpassen();
  window.addEventListener("resize", bildschirmGroesseAnpassen);
  window.addEventListener("orientationchange", () => {
    setTimeout(bildschirmGroesseAnpassen, 150);
  });

  // Automatisches Querformat aktivieren (Screen Orientation API)
  querformatAktivieren();
  window.addEventListener("click", querformatAktivieren);
  window.addEventListener("touchstart", querformatAktivieren, { passive: true });
  document.addEventListener("fullscreenchange", querformatAktivieren);

  // Spielername initialisieren (aus PlattformSpeicher, LocalStorage oder zufällig)
  let initialName = null;
  if (typeof PlattformSpeicher !== "undefined" && typeof PlattformSpeicher.getSpielerName === "function") {
    initialName = PlattformSpeicher.getSpielerName();
  }
  if (!initialName) {
    const gespeicherterName = localStorage.getItem("zombie_spieler_name");
    if (gespeicherterName && gespeicherterName.trim()) {
      initialName = gespeicherterName.trim();
    } else {
      initialName = zufallsNameGenerieren();
    }
  }
  spieler.name = initialName;

  if (spielerNameInput) {
    spielerNameInput.value = spieler.name;
    spielerNameInput.addEventListener("input", () => {
      spieler.name = spielerNameInput.value.trim() || "Überlebender";
      localStorage.setItem("zombie_spieler_name", spieler.name);
      if (typeof PlattformSpeicher !== "undefined" && typeof PlattformSpeicher.setSpielerName === "function") {
        PlattformSpeicher.setSpielerName(spieler.name);
      }
      if (erstellenSpielerNameVorschau) {
        erstellenSpielerNameVorschau.textContent = spieler.name;
      }
    });
  }

  // Würfel-Button für zufälligen Spielernamen
  if (zufallsNameBtn && spielerNameInput) {
    zufallsNameBtn.addEventListener("click", () => {
      audioInitialisieren();
      const neuerName = (typeof PlattformSpeicher !== "undefined" && typeof PlattformSpeicher.zufallsNameGenerieren === "function")
        ? PlattformSpeicher.zufallsNameGenerieren()
        : zufallsNameGenerieren();
      spielerNameInput.value = neuerName;
      spieler.name = neuerName;
      localStorage.setItem("zombie_spieler_name", neuerName);
      if (typeof PlattformSpeicher !== "undefined" && typeof PlattformSpeicher.setSpielerName === "function") {
        PlattformSpeicher.setSpielerName(neuerName);
      }
      if (erstellenSpielerNameVorschau) {
        erstellenSpielerNameVorschau.textContent = neuerName;
      }
    });
  }

  // Navigation: Hauptmenü -> Raum erstellen
  if (navRaumErstellenBtn) {
    navRaumErstellenBtn.addEventListener("click", () => {
      audioInitialisieren();
      ansichtWechseln("raum-erstellen");
    });
  }

  // Navigation: Hauptmenü -> Raum beitreten
  if (navRaumBeitretenBtn) {
    navRaumBeitretenBtn.addEventListener("click", () => {
      audioInitialisieren();
      ansichtWechseln("raum-beitreten");
    });
  }

  // Navigation: Zurück zum Hauptmenü
  const zurueckZumHauptmenue = () => {
    audioInitialisieren();
    beitretenFehlerVerstecken();
    ansichtWechseln("hauptmenue");
  };
  if (erstellenZurueckBtn) erstellenZurueckBtn.addEventListener("click", zurueckZumHauptmenue);
  if (erstellenAbbrechenBtn) erstellenAbbrechenBtn.addEventListener("click", zurueckZumHauptmenue);
  if (beitretenZurueckBtn) beitretenZurueckBtn.addEventListener("click", zurueckZumHauptmenue);
  if (beitretenAbbrechenBtn) beitretenAbbrechenBtn.addEventListener("click", zurueckZumHauptmenue);

  // Aktion: Raum erstellen ausführen
  if (raumErstellenAusfuehrenBtn) {
    raumErstellenAusfuehrenBtn.addEventListener("click", () => {
      audioInitialisieren();
      multiplayerVerbindung.raumErstellen(spieler.name);
    });
  }

  // Aktion: Raum beitreten ausführen
  if (raumBeitretenAusfuehrenBtn) {
    raumBeitretenAusfuehrenBtn.addEventListener("click", () => {
      audioInitialisieren();
      beitretenFehlerVerstecken();
      const code = beitretenCodeInput ? beitretenCodeInput.value.trim() : "";
      if (!code) {
        beitretenFehlerZeigen("Bitte gib einen 5-stelligen Raumcode ein!");
        return;
      }
      multiplayerVerbindung.raumBeitreten(code, spieler.name);
    });
  }

  // Raumcode-Eingabe: Enter-Taste & automatische Großschreibung
  if (beitretenCodeInput) {
    beitretenCodeInput.addEventListener("input", () => {
      beitretenFehlerVerstecken();
      beitretenCodeInput.value = beitretenCodeInput.value.toUpperCase();
    });
    beitretenCodeInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && raumBeitretenAusfuehrenBtn) {
        raumBeitretenAusfuehrenBtn.click();
      }
    });
  }

  // Lobby-Button: Raumcode kopieren
  if (lobbyCodeKopierenBtn) {
    lobbyCodeKopierenBtn.addEventListener("click", () => {
      audioInitialisieren();
      if (multiplayerVerbindung.aktuellerRaumCode) {
        navigator.clipboard.writeText(multiplayerVerbindung.aktuellerRaumCode).then(() => {
          toastZeigen("📋 Raumcode kopiert!");
        }).catch(() => {
          toastZeigen(`Code: ${multiplayerVerbindung.aktuellerRaumCode}`);
        });
      }
    });
  }

  // Lobby-Button: Einladungslink teilen / kopieren
  if (lobbyLinkKopierenBtn) {
    lobbyLinkKopierenBtn.addEventListener("click", () => {
      audioInitialisieren();
      if (!multiplayerVerbindung.aktuellerRaumCode) return;
      const link = `${window.location.origin}${window.location.pathname}?raum=${multiplayerVerbindung.aktuellerRaumCode}`;

      if (navigator.share) {
        navigator.share({
          title: "Zombie Koop 2D",
          text: `Tritt meinem Zombie-Koop Spielraum bei! Code: ${multiplayerVerbindung.aktuellerRaumCode}`,
          url: link
        }).catch(() => {});
      } else {
        navigator.clipboard.writeText(link).then(() => {
          toastZeigen("🔗 Einladungslink kopiert!");
        }).catch(() => {
          toastZeigen("Link kopieren nicht möglich");
        });
      }
    });
  }

  // Lobby-Button: Bereitschaft umschalten
  if (lobbyBereitBtn) {
    lobbyBereitBtn.addEventListener("click", () => {
      audioInitialisieren();
      multiplayerVerbindung.bereitUmschalten();
    });
  }

  // Lobby-Button: Runde starten (nur Raumleiter)
  if (lobbyStartenBtn) {
    lobbyStartenBtn.addEventListener("click", () => {
      audioInitialisieren();
      multiplayerVerbindung.rundeStarten();
    });
  }

  // Lobby-Button: Raum verlassen
  if (lobbyVerlassenBtn) {
    lobbyVerlassenBtn.addEventListener("click", () => {
      audioInitialisieren();
      multiplayerVerbindung.raumVerlassen();
      ansichtWechseln("hauptmenue");
    });
  }

  // In-Game Button: Spiel verlassen und zurück zum Hauptmenü
  if (spielVerlassenBtn) {
    spielVerlassenBtn.addEventListener("click", () => {
      audioInitialisieren();
      multiplayerVerbindung.raumVerlassen();
      ansichtWechseln("hauptmenue");
    });
  }

  // Eingabesteuerung aktivieren
  eingabeRegistrieren();

  // PWA & Smartphone App-Unterstützung aktivieren
  pwaInitialisieren();

  // Socket.IO Multiplayer starten inklusive Raum- und Zombie-Events
  multiplayerVerbindung = new MultiplayerVerbindung({
    onRaumErstellt: (daten) => {
      spieler.id = daten.eigenerSpieler.id;
      spieler.farbe = daten.eigenerSpieler.farbe;
      spieler.name = daten.eigenerSpieler.name;
      ansichtWechseln("lobby");
      lobbyRendern(daten.lobby);
      toastZeigen(`Raum ${daten.raumCode} erstellt!`);
    },

    onRaumBeigetreten: (daten) => {
      spieler.id = daten.eigenerSpieler.id;
      spieler.farbe = daten.eigenerSpieler.farbe;
      spieler.name = daten.eigenerSpieler.name;
      ansichtWechseln("lobby");
      lobbyRendern(daten.lobby);
      toastZeigen(`Raum ${daten.raumCode} beigetreten!`);
    },

    onLobbyAktualisiert: (lobby) => {
      lobbyRendern(lobby);
    },

    onRaumFehler: (nachricht) => {
      beitretenFehlerZeigen(nachricht);
      toastZeigen(nachricht);
    },

    onNeuerRaumleiter: (daten) => {
      toastZeigen(`👑 Neuer Raumleiter: ${daten.leiterName}`, 3500);
    },

    onSpielerNameGeaendert: (daten) => {
      console.log(`[Multiplayer] Spieler ${daten.id} heißt jetzt "${daten.name}"`);
      if (multiplayerVerbindung && multiplayerVerbindung.aktuelleLobby) {
        lobbyRendern(multiplayerVerbindung.aktuelleLobby);
      }
    },

    onSpielGestartet: (daten) => {
      ansichtWechseln("spiel");
      spieler.hp = 100;
      lebenAktualisieren(spieler.hp);
      projektile.length = 0;
      partikel.length = 0;
      blutFlecken.length = 0;
      aktiveZombies = [];

      bannerZeigen("LEVEL 1", "Überlebe die Zombie-Welle gemeinsam!", 3500);
      // Signalhorn wird sauber vom nachfolgenden Event onWelleGestartet abgespielt
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

    // Spieler wiederbelebt (mit sicherem Spawnpunkt & 2s Schutz)
    onSpielerRespawn: (daten) => {
      const schutzDauer = daten.schutzDauerMs || 2000;
      const schutzEnde = daten.schutzBis || (Date.now() + schutzDauer);

      if (daten.spielerId === spieler.id) {
        spieler.hp = daten.hp;
        spieler.x = daten.x;
        spieler.y = daten.y;
        spieler.schutzBis = schutzEnde;
        lebenAktualisieren(spieler.hp);
        soundEffektRespawn();
      } else if (multiplayerVerbindung && multiplayerVerbindung.andereSpieler[daten.spielerId]) {
        const s = multiplayerVerbindung.andereSpieler[daten.spielerId];
        s.hp = daten.hp;
        s.x = daten.x;
        s.y = daten.y;
        s.schutzBis = schutzEnde;
      }
    },

    // Wellen- & Levelsystem Events
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

  // Initiale Ansicht: Hauptmenü oder Direktbeitritt bei ?raum=CODE oder ?code=CODE
  const urlParameter = new URLSearchParams(window.location.search);
  const raumUrlCode = urlParameter.get("raum") || urlParameter.get("code");
  if (raumUrlCode) {
    if (beitretenCodeInput) beitretenCodeInput.value = raumUrlCode.trim().toUpperCase();
    ansichtWechseln("raum-beitreten");
  } else {
    ansichtWechseln("hauptmenue");
  }

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

// 3. Audio-Synthese: Knackiger Schuss, Treffersound & Ambient-Musik
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
  if (audioKontext) {
    audioSystemEinrichten();
  }
}

// Erstellt Gain-Nodes für Lautstärkeregelung und schaltet Musik/SFX
function audioSystemEinrichten() {
  if (!audioKontext) return;

  if (!sfxGainNode) {
    sfxGainNode = audioKontext.createGain();
    sfxGainNode.connect(audioKontext.destination);
  }

  if (!musikGainNode) {
    musikGainNode = audioKontext.createGain();
    musikGainNode.connect(audioKontext.destination);
  }

  lautstaerkeAktualisieren();
  hintergrundMusikAktualisieren();
}

function lautstaerkeAktualisieren() {
  if (!audioKontext) return;
  const masterFaktor = Math.max(0, Math.min(1, (benutzerEinstellungen.lautstaerke || 0) / 100));

  if (sfxGainNode) {
    const sfxPegel = benutzerEinstellungen.sound ? masterFaktor : 0;
    sfxGainNode.gain.setValueAtTime(sfxPegel, audioKontext.currentTime);
  }

  if (musikGainNode) {
    const musikPegel = benutzerEinstellungen.musik ? (masterFaktor * 0.16) : 0;
    musikGainNode.gain.setValueAtTime(musikPegel, audioKontext.currentTime);
  }
}

// Düsterer, stimmungsvoller Ambient-Soundtrack ohne störendes Dauersummen
let musikIntervallTimer = null;
let musikAkkordIndex = 0;
let aktiveMusikOszillatoren = [];

// Harmonische Akkorde für authentische Zombie-Survival-Atmosphäre (D-Moll / C-Dur / B / A-Moll)
const AMBIENT_AKKORDE = [
  [73.42, 110.00, 174.61], // D2, A2, F3
  [65.41, 98.00, 164.81],  // C2, G2, E3
  [58.27, 87.31, 146.83],  // Bb1, F2, D3
  [55.00, 82.41, 130.81]   // A1, E2, C3
];

function ambientAkkordAbspielen() {
  if (!audioKontext || !musikGainNode || !benutzerEinstellungen.musik) return;

  try {
    const jetzt = audioKontext.currentTime;
    const akkord = AMBIENT_AKKORDE[musikAkkordIndex];
    musikAkkordIndex = (musikAkkordIndex + 1) % AMBIENT_AKKORDE.length;

    // Alte Oszillatoren leeren
    aktiveMusikOszillatoren = [];

    akkord.forEach((freq, idx) => {
      const osc = audioKontext.createOscillator();
      const noteGain = audioKontext.createGain();
      const filter = audioKontext.createBiquadFilter();

      // Weiche Dreiecks- und Sinus-Wellen für unaufdringlichen, harmonischen Soundtrack
      osc.type = idx === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, jetzt);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(320, jetzt);

      // Sanftes Ein- und Ausblenden (Attack: 1.2s, Decay/Release: 2.6s)
      noteGain.gain.setValueAtTime(0.0001, jetzt);
      noteGain.gain.linearRampToValueAtTime(0.12, jetzt + 1.2);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, jetzt + 3.8);

      osc.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(musikGainNode);

      osc.start(jetzt);
      osc.stop(jetzt + 3.9);
      aktiveMusikOszillatoren.push({ osc, noteGain });
    });
  } catch (e) {}
}

function hintergrundMusikAktualisieren() {
  if (!audioKontext || !musikGainNode) return;

  if (benutzerEinstellungen.musik) {
    if (!musikIntervallTimer) {
      ambientAkkordAbspielen();
      musikIntervallTimer = setInterval(() => {
        ambientAkkordAbspielen();
      }, 4000);
    }
  } else {
    // Musik vollständig stoppen
    if (musikIntervallTimer) {
      clearInterval(musikIntervallTimer);
      musikIntervallTimer = null;
    }
    aktiveMusikOszillatoren.forEach(item => {
      try {
        item.noteGain.gain.setValueAtTime(0, audioKontext.currentTime);
        item.osc.stop();
      } catch (e) {}
    });
    aktiveMusikOszillatoren = [];
  }
  lautstaerkeAktualisieren();
}

function soundEffektSchuss(lautstaerkeFaktor = 1.0) {
  if (!audioKontext || !benutzerEinstellungen.sound) return;
  try {
    audioSystemEinrichten();
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
    const pegel = 0.25 * Math.max(0.1, Math.min(1.0, lautstaerkeFaktor));
    gainNode.gain.setValueAtTime(pegel, jetzt);
    gainNode.gain.exponentialRampToValueAtTime(0.01, jetzt + 0.06);

    rauschQuelle.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(sfxGainNode || audioKontext.destination);
    rauschQuelle.start(jetzt);
  } catch (e) {}
}

let letzterTrefferSoundZeit = 0;

function soundEffektTreffer() {
  if (!audioKontext || !benutzerEinstellungen.sound) return;
  const jetztZeit = Date.now();
  if (jetztZeit - letzterTrefferSoundZeit < 120) return; // Entprellung gegen schnelles Doppel-Abspielen
  letzterTrefferSoundZeit = jetztZeit;

  try {
    audioSystemEinrichten();
    const jetzt = audioKontext.currentTime;
    const osc = audioKontext.createOscillator();
    const gain = audioKontext.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, jetzt);
    osc.frequency.exponentialRampToValueAtTime(40, jetzt + 0.1);

    gain.gain.setValueAtTime(0.25, jetzt);
    gain.gain.exponentialRampToValueAtTime(0.01, jetzt + 0.1);

    osc.connect(gain);
    gain.connect(sfxGainNode || audioKontext.destination);
    osc.start(jetzt);
    osc.stop(jetzt + 0.1);
  } catch (e) {}
}

// Aufmunternder, klarer Ton beim Respawn mit aktivem Schutzschild
function soundEffektRespawn() {
  if (!audioKontext || !benutzerEinstellungen.sound) return;
  try {
    audioSystemEinrichten();
    const jetzt = audioKontext.currentTime;
    const toene = [392.00, 523.25]; // G4, C5 (Hoffnungsvolles Signal)
    toene.forEach((freq, idx) => {
      const osc = audioKontext.createOscillator();
      const gain = audioKontext.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, jetzt + idx * 0.14);

      gain.gain.setValueAtTime(0.18, jetzt + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.01, jetzt + idx * 0.14 + 0.35);

      osc.connect(gain);
      gain.connect(sfxGainNode || audioKontext.destination);
      osc.start(jetzt + idx * 0.14);
      osc.stop(jetzt + idx * 0.14 + 0.35);
    });
  } catch (e) {}
}

// Sieges-Melodie bei gemeistertem Level
function soundEffektLevelGeschafft() {
  if (!audioKontext || !benutzerEinstellungen.sound) return;
  try {
    audioSystemEinrichten();
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
      gain.connect(sfxGainNode || audioKontext.destination);
      osc.start(jetzt + idx * 0.12);
      osc.stop(jetzt + idx * 0.12 + 0.35);
    });
  } catch (e) {}
}

let letzteWelleStartSoundZeit = 0;

// Bedrohliches Signalhorn beim Start einer neuen Welle (mit Entprellung)
function soundEffektWelleStart() {
  if (!audioKontext || !benutzerEinstellungen.sound) return;
  const jetztZeit = Date.now();
  if (jetztZeit - letzteWelleStartSoundZeit < 1000) return; // Verhindert versehentliches doppeltes Abspielen
  letzteWelleStartSoundZeit = jetztZeit;

  try {
    audioSystemEinrichten();
    const jetzt = audioKontext.currentTime;
    const osc = audioKontext.createOscillator();
    const gain = audioKontext.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(140, jetzt);
    osc.frequency.linearRampToValueAtTime(95, jetzt + 0.4);
    gain.gain.setValueAtTime(0.20, jetzt);
    gain.gain.exponentialRampToValueAtTime(0.01, jetzt + 0.45);
    osc.connect(gain);
    gain.connect(sfxGainNode || audioKontext.destination);
    osc.start(jetzt);
    osc.stop(jetzt + 0.45);
  } catch (e) {}
}

// ========================================================
// Einstellungsmenü: Steuerung, UI & Speicherung
// ========================================================
function einstellungenLaden() {
  try {
    const gespeichert = localStorage.getItem(SPEICHER_SCHLUESSEL_EINSTELLUNGEN);
    if (gespeichert) {
      const parsed = JSON.parse(gespeichert);
      benutzerEinstellungen = { ...standardEinstellungen, ...parsed };
    }
  } catch (e) {
    console.warn("[Einstellungen] Konnte gespeicherte Einstellungen nicht laden:", e);
  }
}

function einstellungenSpeichern() {
  try {
    localStorage.setItem(SPEICHER_SCHLUESSEL_EINSTELLUNGEN, JSON.stringify(benutzerEinstellungen));
  } catch (e) {
    console.warn("[Einstellungen] Konnte Einstellungen nicht speichern:", e);
  }
}

function einstellungenAnwenden() {
  if (einstellungMusik) einstellungMusik.checked = benutzerEinstellungen.musik;
  if (einstellungSound) einstellungSound.checked = benutzerEinstellungen.sound;
  if (einstellungLautstaerke) einstellungLautstaerke.value = benutzerEinstellungen.lautstaerke;
  if (lautstaerkeWert) lautstaerkeWert.textContent = `${benutzerEinstellungen.lautstaerke} %`;

  if (einstellungEmpfindlichkeit) einstellungEmpfindlichkeit.value = benutzerEinstellungen.empfindlichkeit;
  if (empfindlichkeitWert) empfindlichkeitWert.textContent = `${benutzerEinstellungen.empfindlichkeit} %`;
  if (einstellungBlut) einstellungBlut.checked = benutzerEinstellungen.blutEffekte;
  if (einstellungLicht) einstellungLicht.checked = benutzerEinstellungen.taschenlampe;

  lautstaerkeAktualisieren();
  hintergrundMusikAktualisieren();
}

function einstellungenOeffnen() {
  audioInitialisieren();
  einstellungenGeoeffnet = true;

  // Tastatureingaben und Joysticks sofort neutralisieren (Sichere Pause des lokalen Spielers)
  for (const k in aktiveTasten) {
    aktiveTasten[k] = false;
  }
  bewegungsJoystick.aktiv = false;
  bewegungsJoystick.vektorX = 0;
  bewegungsJoystick.vektorY = 0;
  zielJoystick.aktiv = false;
  mausGedrueckt = false;

  // Stillstand im Multiplayer melden
  if (multiplayerVerbindung) {
    multiplayerVerbindung.sendeBewegung(Math.round(spieler.x), Math.round(spieler.y), spieler.winkel);
  }

  // Raumdaten und Spielernamen aktualisieren
  if (einstellungenRaumcodeWert) {
    einstellungenRaumcodeWert.textContent = multiplayerVerbindung ? (multiplayerVerbindung.aktuellerRaumCode || "-----") : "Lokal";
  }
  if (einstellungSpielerName) {
    einstellungSpielerName.value = spieler.name;
  }
  if (einstellungNameFeedback) {
    einstellungNameFeedback.classList.add("versteckt");
  }

  if (einstellungenModal) {
    einstellungenModal.classList.remove("versteckt");
  }
}

function einstellungenSchliessen() {
  einstellungenGeoeffnet = false;
  if (einstellungenModal) {
    einstellungenModal.classList.add("versteckt");
  }
  if (raumVerlassenDialog) {
    raumVerlassenDialog.classList.add("versteckt");
  }
}

function spielerNameInEinstellungenAendern() {
  if (!einstellungSpielerName) return;
  const neuerName = einstellungSpielerName.value.trim();
  if (!neuerName) {
    if (einstellungNameFeedback) {
      einstellungNameFeedback.textContent = "⚠ Name darf nicht leer sein!";
      einstellungNameFeedback.style.color = "#f87171";
      einstellungNameFeedback.classList.remove("versteckt");
    }
    return;
  }

  spieler.name = neuerName;
  localStorage.setItem("zombie_spieler_name", neuerName);
  if (typeof PlattformSpeicher !== "undefined" && typeof PlattformSpeicher.setSpielerName === "function") {
    PlattformSpeicher.setSpielerName(neuerName);
  }

  if (spielerNameInput) spielerNameInput.value = neuerName;
  if (erstellenSpielerNameVorschau) erstellenSpielerNameVorschau.textContent = neuerName;

  if (multiplayerVerbindung) {
    multiplayerVerbindung.sendeNameAenderung(neuerName);
  }

  if (einstellungNameFeedback) {
    einstellungNameFeedback.textContent = "✓ Name erfolgreich aktualisiert!";
    einstellungNameFeedback.style.color = "#4ade80";
    einstellungNameFeedback.classList.remove("versteckt");
    setTimeout(() => {
      if (einstellungNameFeedback) einstellungNameFeedback.classList.add("versteckt");
    }, 2800);
  }
}

function einstellungenInitialisieren() {
  // Zahnrad-Button zum Öffnen des Menüs: Unabhängig von Spielsteuerung anklickbar
  if (einstellungenOeffnenBtn) {
    const oeffnenAktion = (e) => {
      e.stopPropagation();
      e.preventDefault();
      mausGedrueckt = false;
      einstellungenOeffnen();
    };

    einstellungenOeffnenBtn.addEventListener("click", oeffnenAktion);
    einstellungenOeffnenBtn.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      mausGedrueckt = false;
    });
    einstellungenOeffnenBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      mausGedrueckt = false;
    });
    einstellungenOeffnenBtn.addEventListener("touchstart", (e) => {
      e.stopPropagation();
      oeffnenAktion(e);
    }, { passive: false });
  }

  // Schließen-Button (X)
  if (einstellungenSchliessenBtn) {
    einstellungenSchliessenBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      mausGedrueckt = false;
      audioInitialisieren();
      einstellungenSchliessen();
    });
    einstellungenSchliessenBtn.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      mausGedrueckt = false;
    });
  }

  // Schließen bei Klick auf den Hintergrund
  if (einstellungenModal) {
    einstellungenModal.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      mausGedrueckt = false;
    });
    einstellungenModal.addEventListener("click", (e) => {
      if (e.target === einstellungenModal) {
        audioInitialisieren();
        einstellungenSchliessen();
      }
    });
  }

  // Tab-Navigation
  einstellungenTabs.forEach(tabBtn => {
    tabBtn.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      mausGedrueckt = false;
    });
    tabBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      mausGedrueckt = false;
      audioInitialisieren();
      const zielTabId = tabBtn.getAttribute("data-tab");
      einstellungenTabs.forEach(b => b.classList.toggle("aktiv", b === tabBtn));
      einstellungenTabInhalte.forEach(inhalt => {
        const istAktiv = inhalt.id === zielTabId;
        inhalt.classList.toggle("versteckt", !istAktiv);
        inhalt.classList.toggle("aktiv", istAktiv);
      });
    });
  });

  // Tab 1: Spielraum verlassen mit Bestätigung
  if (einstellungenRaumVerlassenBtn && raumVerlassenDialog) {
    einstellungenRaumVerlassenBtn.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      mausGedrueckt = false;
    });
    einstellungenRaumVerlassenBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      mausGedrueckt = false;
      audioInitialisieren();
      raumVerlassenDialog.classList.remove("versteckt");
    });
  }

  if (dialogAbbrechenBtn && raumVerlassenDialog) {
    dialogAbbrechenBtn.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      mausGedrueckt = false;
    });
    dialogAbbrechenBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      mausGedrueckt = false;
      audioInitialisieren();
      raumVerlassenDialog.classList.add("versteckt");
    });
  }

  if (dialogBestaetigenBtn) {
    dialogBestaetigenBtn.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      mausGedrueckt = false;
    });
    dialogBestaetigenBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      mausGedrueckt = false;
      audioInitialisieren();
      einstellungenSchliessen();
      if (multiplayerVerbindung) {
        multiplayerVerbindung.raumVerlassen();
      }
      ansichtWechseln("hauptmenue");
    });
  }

  // Tab 2: Audio Toggles & Lautstärkeregler
  if (einstellungMusik) {
    einstellungMusik.addEventListener("change", () => {
      audioInitialisieren();
      benutzerEinstellungen.musik = einstellungMusik.checked;
      einstellungenSpeichern();
      hintergrundMusikAktualisieren();
    });
  }

  if (einstellungSound) {
    einstellungSound.addEventListener("change", () => {
      audioInitialisieren();
      benutzerEinstellungen.sound = einstellungSound.checked;
      einstellungenSpeichern();
      lautstaerkeAktualisieren();
    });
  }

  if (einstellungLautstaerke) {
    einstellungLautstaerke.addEventListener("input", () => {
      const wert = parseInt(einstellungLautstaerke.value, 10);
      benutzerEinstellungen.lautstaerke = wert;
      if (lautstaerkeWert) lautstaerkeWert.textContent = `${wert} %`;
      einstellungenSpeichern();
      lautstaerkeAktualisieren();
    });
  }

  // Tab 3: Spielername ändern
  if (einstellungNameSpeichernBtn) {
    einstellungNameSpeichernBtn.addEventListener("click", () => {
      audioInitialisieren();
      spielerNameInEinstellungenAendern();
    });
  }
  if (einstellungSpielerName) {
    einstellungSpielerName.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        audioInitialisieren();
        spielerNameInEinstellungenAendern();
      }
    });
  }

  // Tab 5: Steuerungs- und Grafikoptionen
  if (einstellungEmpfindlichkeit) {
    einstellungEmpfindlichkeit.addEventListener("input", () => {
      const wert = parseInt(einstellungEmpfindlichkeit.value, 10);
      benutzerEinstellungen.empfindlichkeit = wert;
      if (empfindlichkeitWert) empfindlichkeitWert.textContent = `${wert} %`;
      einstellungenSpeichern();
    });
  }

  if (einstellungBlut) {
    einstellungBlut.addEventListener("change", () => {
      audioInitialisieren();
      benutzerEinstellungen.blutEffekte = einstellungBlut.checked;
      einstellungenSpeichern();
    });
  }

  if (einstellungLicht) {
    einstellungLicht.addEventListener("change", () => {
      audioInitialisieren();
      benutzerEinstellungen.taschenlampe = einstellungLicht.checked;
      einstellungenSpeichern();
    });
  }
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
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) {
      return;
    }
    // Escape-Taste: Einstellungsmenü umschalten
    if (e.key === "Escape" && aktuellerZustand === "spiel") {
      if (einstellungenGeoeffnet) {
        einstellungenSchliessen();
      } else {
        einstellungenOeffnen();
      }
      return;
    }
    if (aktuellerZustand !== "spiel" || einstellungenGeoeffnet) {
      return;
    }
    aktiveTasten[e.key.toLowerCase()] = true;
    aktiveTasten[e.code] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
      e.preventDefault();
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) {
      return;
    }
    if (einstellungenGeoeffnet) return;
    aktiveTasten[e.key.toLowerCase()] = false;
    aktiveTasten[e.code] = false;
  });

  // Hilfsfunktion: Erkennt jegliche Interaktions-Elemente (Zahnrad, Menüs, Knöpfe, Formulare)
  function istInteraktivesUiElement(element) {
    if (!element) return false;
    return !!(
      element.closest("#einstellungen-oeffnen-btn") ||
      element.closest(".zahnrad-btn") ||
      element.closest("#einstellungen-modal") ||
      element.closest(".einstellungen-modal") ||
      element.closest("#raum-verlassen-dialog") ||
      element.closest(".dialog-overlay") ||
      element.closest("#install-modal") ||
      element.closest(".modal-schliessen-btn") ||
      element.closest(".hud-gruppe") ||
      element.closest("#spiel-hud button") ||
      element.closest("button") ||
      element.closest("input") ||
      element.closest("textarea") ||
      element.closest("label") ||
      element.closest("a")
    );
  }

  // B. PC: Maus (Zielen & Schießen)
  window.addEventListener("mousemove", (e) => {
    if (aktuellerZustand !== "spiel" || einstellungenGeoeffnet) return;

    // Wenn der Mauszeiger über dem Zahnrad oder UI-Elementen steht: nicht zielen
    if (istInteraktivesUiElement(e.target)) {
      return;
    }

    mausX = e.clientX;
    mausY = e.clientY;
    if (!zielJoystick.aktiv) {
      spieler.winkel = Math.atan2(mausY - spieler.y, mausX - spieler.x);
    }
  });

  window.addEventListener("mousedown", (e) => {
    // 1. Wenn ein Menü geöffnet ist: Mausklicks dürfen NIEMALS schießen!
    if (einstellungenGeoeffnet) {
      mausGedrueckt = false;
      return;
    }

    // 2. Klicks auf das Zahnrad, Einstellungen, Modals oder Buttons dürfen NIEMALS schießen!
    if (istInteraktivesUiElement(e.target) || (canvas && e.target !== canvas)) {
      mausGedrueckt = false;
      return;
    }

    audioInitialisieren();
    if (aktuellerZustand !== "spiel") return;

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

  // Wenn der Fokus das Fenster verlässt: Dauerfeuer und Tasten sofort stoppen
  window.addEventListener("blur", () => {
    mausGedrueckt = false;
    for (const k in aktiveTasten) aktiveTasten[k] = false;
  });

  // C. Smartphone: Touch
  canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
  canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
  canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
  canvas.addEventListener("touchcancel", handleTouchEnd, { passive: false });
}

function handleTouchStart(e) {
  if (aktuellerZustand !== "spiel" || einstellungenGeoeffnet) return;

  // Touch auf Zahnrad oder Menüs niemals als Joystick / Schuss interpretieren
  if (e.target && (e.target.closest("#einstellungen-oeffnen-btn") || e.target.closest(".zahnrad-btn") || e.target.closest("#einstellungen-modal") || e.target.closest(".hud-gruppe"))) {
    return;
  }
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
  if (einstellungenGeoeffnet) return;
  e.preventDefault();
  const empfindlichkeitsFaktor = (benutzerEinstellungen.empfindlichkeit || 100) / 100;
  const maxWeg = Math.max(15, Spieleinstellungen.touch.maxAuslenkung / empfindlichkeitsFaktor);

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
  if (einstellungenGeoeffnet) return;
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
  if (spieler.hp <= 0 || einstellungenGeoeffnet || aktuellerZustand !== "spiel") return; // Tote Spieler oder Menüs verhindern Schießen

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
  soundEffektSchuss(0.4);
}

// 6. Blutspritzer und Treffer-Partikel
function blutErzeugen(x, y, istTod) {
  if (!benutzerEinstellungen.blutEffekte) return;

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
  if (spieler.hp <= 0 || einstellungenGeoeffnet) return; // Tote Spieler oder im Einstellungsmenü pausieren

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
  if (!benutzerEinstellungen.blutEffekte) return;
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

  const jetzt = Date.now();
  const istGeschuetzt = f.schutzBis && jetzt < f.schutzBis;

  ctx.save();
  ctx.translate(x, y);

  // Dezentes Blinken des Spielers während der 2-Sekunden-Immunität
  if (istGeschuetzt) {
    const blinkPhase = Math.floor(jetzt / 110) % 2 === 0;
    if (blinkPhase) {
      ctx.globalAlpha = 0.5;
    }
  }

  if (benutzerEinstellungen.taschenlampe) {
    taschenlampeZeichnen(winkel);
  }
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

  // Optischer 2-Sekunden-Schutzschild mit Pulsieren und Schild-Symbol
  if (istGeschuetzt) {
    ctx.save();
    const verbleibendMs = f.schutzBis - jetzt;
    const pulsTempo = verbleibendMs < 600 ? 55 : 110;
    const puls = 0.45 + 0.45 * Math.sin(jetzt / pulsTempo);

    // 1. Äußerer leuchtender Schutzschild-Ring
    ctx.beginPath();
    ctx.arc(x, y, r + 9, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(56, 189, 248, ${puls})`;
    ctx.lineWidth = 3;
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 14;
    ctx.stroke();

    // 2. Dezente innere Schutz-Aura
    ctx.fillStyle = `rgba(56, 189, 248, ${puls * 0.16})`;
    ctx.fill();

    // 3. Schutz-Badge über dem Namensschild
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "#38bdf8";
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 6;
    ctx.fillText("🛡️ SCHUTZ", x, y - r - 22);
    ctx.restore();
  }
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
  ctx.fillText("Respawn an sicherer Position in Kürze (inkl. 2s Schutz)...", canvas.width / 2, canvas.height / 2 + 20);
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
  if (aktuellerZustand === "spiel") {
    spielerAktualisieren();
    projektileAktualisieren();
    partikelAktualisieren();
    zeichnen();
  } else {
    // Stimmungsvoller dunkler Hintergrund während Menü oder Lobby
    if (ctx && canvas) {
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }
  requestAnimationFrame(gameLoop);
}
