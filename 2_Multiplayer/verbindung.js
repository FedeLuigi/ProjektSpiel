// Multiplayer-Verwaltung über Socket.IO für eine gemeinsame Spielwelt

class MultiplayerVerbindung {
  constructor(callbacks = {}) {
    this.istVerbunden = false;
    this.socket = null;
    this.eigenerSpieler = null;
    this.andereSpieler = {}; // Map: id -> Spielerobjekt
    this.letzteGesendeteDaten = { x: null, y: null, blickrichtung: null };

    // Callback-Funktion, um das Hauptspiel über den Start zu benachrichtigen
    this.onInitialisiert = callbacks.onInitialisiert || null;

    this.initialisieren();
  }

  // Stellt die Verbindung zum Server her und registriert alle Netzwerk-Events
  initialisieren() {
    if (typeof io === "undefined") {
      console.warn("[Multiplayer] Socket.IO Client nicht verfügbar (Offline-Modus).");
      this.statusAktualisieren(false, "Offline");
      return;
    }

    try {
      this.socket = io();

      // Bei erfolgreicher Serververbindung
      this.socket.on("connect", () => {
        this.istVerbunden = true;
        console.log(`[Multiplayer] Verbunden mit Server (Socket-ID: ${this.socket.id})`);
        this.statusAktualisieren(true, "Online");
      });

      // Verbindung verloren
      this.socket.on("disconnect", () => {
        this.istVerbunden = false;
        console.log("[Multiplayer] Verbindung verloren.");
        this.statusAktualisieren(false, "Getrennt");
      });

      // 1. Initialisierung: Eigene Figur und bestehende Mitspieler erhalten
      this.socket.on("spielInitialisieren", (daten) => {
        this.eigenerSpieler = daten.eigenerSpieler;
        this.andereSpieler = daten.andereSpieler || {};

        console.log("[Multiplayer] Spiel initialisiert. Bereits online:", Object.keys(this.andereSpieler).length);

        if (typeof this.onInitialisiert === "function") {
          this.onInitialisiert(this.eigenerSpieler);
        }
      });

      // 2. Ein neuer Mitspieler ist der gemeinsamen Welt beigetreten
      this.socket.on("neuerSpieler", (spieler) => {
        console.log(`[Multiplayer] Neuer Spieler beigetreten: ${spieler.name}`);
        this.andereSpieler[spieler.id] = spieler;
      });

      // 3. Ein Mitspieler hat sich bewegt
      this.socket.on("spielerBewegt", (daten) => {
        if (this.andereSpieler[daten.id]) {
          this.andereSpieler[daten.id].x = daten.x;
          this.andereSpieler[daten.id].y = daten.y;
          this.andereSpieler[daten.id].blickrichtung = daten.blickrichtung;
        }
      });

      // 4. Ein Mitspieler hat das Spiel verlassen
      this.socket.on("spielerVerlassen", (id) => {
        if (this.andereSpieler[id]) {
          console.log(`[Multiplayer] Spieler entfernt: ${this.andereSpieler[id].name || id}`);
          delete this.andereSpieler[id];
        }
      });

      // 5. Spieler-Zähler im UI aktualisieren
      this.socket.on("spielerAnzahlAktualisiert", (anzahl) => {
        this.spielerAnzahlAktualisieren(anzahl);
      });

    } catch (fehler) {
      console.error("[Multiplayer] Verbindungsfehler:", fehler);
      this.statusAktualisieren(false, "Fehler");
    }
  }

  // Sendet die eigene Position und Blickrichtung an den Server
  sendeBewegung(x, y, blickrichtung) {
    if (!this.istVerbunden || !this.socket) return;

    // Nur senden, wenn sich Koordinaten oder Blickrichtung geändert haben
    if (
      this.letzteGesendeteDaten.x !== x ||
      this.letzteGesendeteDaten.y !== y ||
      this.letzteGesendeteDaten.blickrichtung !== blickrichtung
    ) {
      this.letzteGesendeteDaten = { x, y, blickrichtung };
      this.socket.emit("spielerBewegung", { x, y, blickrichtung });
    }
  }

  // Gibt alle anderen verbundenen Spieler als Array zurück
  getAndereSpieler() {
    return Object.values(this.andereSpieler);
  }

  // Aktualisiert die Verbindungsanzeige im UI
  statusAktualisieren(verbunden, text) {
    const statusText = document.getElementById("multiplayer-status-text");
    const statusPunkt = document.getElementById("multiplayer-status-punkt");

    if (statusText) statusText.textContent = text;
    if (statusPunkt) {
      statusPunkt.className = "status-punkt " + (verbunden ? "online" : "offline");
    }
  }

  // Aktualisiert den Spieler-Zähler im UI
  spielerAnzahlAktualisieren(anzahl) {
    const anzahlElement = document.getElementById("spieler-anzahl");
    if (anzahlElement) {
      anzahlElement.textContent = `${anzahl} ${anzahl === 1 ? "Spieler" : "Spieler"} online`;
    }
  }
}

// Globale Instanz
let multiplayerVerbindung = null;
