// Vorbereitung der Multiplayer-Verbindung über Socket.IO

class MultiplayerVerbindung {
  constructor() {
    this.istVerbunden = false;
    this.socket = null;
    this.letztePosition = { x: 0, y: 0 };
    this.initialisieren();
  }

  // Stellt die Verbindung zum Socket.IO Server her
  initialisieren() {
    // Prüfen, ob die Socket.IO Client-Bibliothek geladen ist
    if (typeof io === "undefined") {
      console.warn("[Multiplayer] Socket.IO Bibliothek wurde nicht geladen.");
      this.statusAktualisieren(false, "Kein Socket.IO");
      return;
    }

    try {
      this.socket = io();

      this.socket.on("connect", () => {
        this.istVerbunden = true;
        console.log(`[Multiplayer] Verbunden mit Server (ID: ${this.socket.id})`);
        this.statusAktualisieren(true, "Verbunden");
      });

      this.socket.on("disconnect", () => {
        this.istVerbunden = false;
        console.log("[Multiplayer] Verbindung getrennt.");
        this.statusAktualisieren(false, "Getrennt");
      });

      // Vorbereitung für Mehrspieler: Position eines anderen Spielers empfangen
      this.socket.on("spielerBewegt", (daten) => {
        // Hier können später andere Spieler dargestellt werden
        // console.log("Anderer Spieler bewegt:", daten);
      });

    } catch (fehler) {
      console.error("[Multiplayer] Verbindungsfehler:", fehler);
      this.statusAktualisieren(false, "Fehler");
    }
  }

  // Sendet die eigene Position an den Server, wenn sie sich geändert hat
  sendePosition(x, y) {
    if (!this.istVerbunden || !this.socket) return;

    // Nur senden, wenn sich die Position tatsächlich geändert hat
    if (this.letztePosition.x !== x || this.letztePosition.y !== y) {
      this.letztePosition = { x, y };
      this.socket.emit("spielerBewegung", { x, y });
    }
  }

  // Aktualisiert die Statusanzeige auf der Webseite
  statusAktualisieren(verbunden, text) {
    const statusText = document.getElementById("multiplayer-status-text");
    const statusPunkt = document.getElementById("multiplayer-status-punkt");

    if (statusText) statusText.textContent = text;
    if (statusPunkt) {
      statusPunkt.className = "status-punkt " + (verbunden ? "online" : "offline");
    }
  }
}

// Globale Instanz für das Spiel
let multiplayerVerbindung = null;
