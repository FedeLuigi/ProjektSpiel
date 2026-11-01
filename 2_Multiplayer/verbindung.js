// Multiplayer-Verwaltung über Socket.IO für Spielräume und Lobbys

class MultiplayerVerbindung {
  constructor(callbacks = {}) {
    this.istVerbunden = false;
    this.socket = null;
    this.eigenerSpieler = null;
    this.andereSpieler = {}; // Map: id -> Spielerobjekt
    this.aktuellerRaumCode = null;
    this.aktuelleLobby = null;
    this.letzteGesendeteDaten = { x: null, y: null, winkel: null, blickrichtung: null };

    // Callback-Funktionen für Lobby & Räume
    this.onRaumErstellt = callbacks.onRaumErstellt || null;
    this.onRaumBeigetreten = callbacks.onRaumBeigetreten || null;
    this.onLobbyAktualisiert = callbacks.onLobbyAktualisiert || null;
    this.onSpielGestartet = callbacks.onSpielGestartet || null;
    this.onRaumFehler = callbacks.onRaumFehler || null;
    this.onNeuerRaumleiter = callbacks.onNeuerRaumleiter || null;
    this.onSpielerNameGeaendert = callbacks.onSpielerNameGeaendert || null;

    // Callback-Funktionen für das Spielgeschehen
    this.onInitialisiert = callbacks.onInitialisiert || null;
    this.onSpielerBewegt = callbacks.onSpielerBewegt || null;
    this.onSpielerVerlassen = callbacks.onSpielerVerlassen || null;
    this.onSchussEmpfangen = callbacks.onSchussEmpfangen || null;
    this.onZombiesAktualisiert = callbacks.onZombiesAktualisiert || null;
    this.onZombieGestorben = callbacks.onZombieGestorben || null;
    this.onZombieVerletzt = callbacks.onZombieVerletzt || null;
    this.onSpielerSchaden = callbacks.onSpielerSchaden || null;
    this.onSpielerRespawn = callbacks.onSpielerRespawn || null;
    this.onWelleStatus = callbacks.onWelleStatus || null;
    this.onWelleGestartet = callbacks.onWelleGestartet || null;
    this.onWelleAbgeschlossen = callbacks.onWelleAbgeschlossen || null;
    this.onPauseCountdown = callbacks.onPauseCountdown || null;

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

      // ==========================================
      // Lobby- & Raum-Ereignisse
      // ==========================================

      // Raum erfolgreich erstellt
      this.socket.on("raumErstellt", (daten) => {
        this.aktuellerRaumCode = daten.raumCode;
        this.eigenerSpieler = daten.eigenerSpieler;
        this.aktuelleLobby = daten.lobby;
        console.log(`[Lobby] Raum erstellt: ${daten.raumCode}`);
        if (typeof this.onRaumErstellt === "function") {
          this.onRaumErstellt(daten);
        }
      });

      // Raum erfolgreich beigetreten
      this.socket.on("raumBeigetreten", (daten) => {
        this.aktuellerRaumCode = daten.raumCode;
        this.eigenerSpieler = daten.eigenerSpieler;
        this.aktuelleLobby = daten.lobby;
        console.log(`[Lobby] Raum beigetreten: ${daten.raumCode}`);
        if (typeof this.onRaumBeigetreten === "function") {
          this.onRaumBeigetreten(daten);
        }
      });

      // Lobby-Daten aktualisiert (Spielerliste, Bereitschaft, Leiter)
      this.socket.on("lobbyAktualisiert", (lobby) => {
        this.aktuelleLobby = lobby;
        console.log(`[Lobby] Aktualisiert (${lobby.spielerAnzahl} Spieler)`);
        if (typeof this.onLobbyAktualisiert === "function") {
          this.onLobbyAktualisiert(lobby);
        }
      });

      // Fehlermeldung bei Raumaktionen (z.B. falscher Code, nicht alle bereit)
      this.socket.on("raumFehler", (nachricht) => {
        console.warn(`[Lobby Fehler] ${nachricht}`);
        if (typeof this.onRaumFehler === "function") {
          this.onRaumFehler(nachricht);
        }
      });

      // Leiter hat gewechselt
      this.socket.on("neuerRaumleiter", (daten) => {
        console.log(`[Lobby] Neuer Raumleiter: ${daten.leiterName}`);
        if (typeof this.onNeuerRaumleiter === "function") {
          this.onNeuerRaumleiter(daten);
        }
      });

      // ==========================================
      // Spielstart & In-Game-Ereignisse
      // ==========================================

      // Startsignal vom Server
      this.socket.on("spielGestartet", (daten) => {
        console.log(`[Multiplayer] Runde im Raum ${daten.raumCode} gestartet!`);
        this.andereSpieler = {};
        for (const sId in daten.spieler) {
          if (sId !== this.socket.id) {
            this.andereSpieler[sId] = daten.spieler[sId];
          } else {
            this.eigenerSpieler = daten.spieler[sId];
          }
        }
        if (typeof this.onSpielGestartet === "function") {
          this.onSpielGestartet(daten);
        }
      });

      // Spielerbewegung empfangen
      this.socket.on("spielerBewegt", (daten) => {
        if (this.andereSpieler[daten.id]) {
          this.andereSpieler[daten.id].x = daten.x;
          this.andereSpieler[daten.id].y = daten.y;
          this.andereSpieler[daten.id].winkel = daten.winkel !== undefined ? daten.winkel : 0;
          this.andereSpieler[daten.id].blickrichtung = daten.blickrichtung;
        }
        if (typeof this.onSpielerBewegt === "function") {
          this.onSpielerBewegt(daten);
        }
      });

      // Spieler hat den Raum verlassen
      this.socket.on("spielerVerlassen", (id) => {
        if (this.andereSpieler[id]) {
          console.log(`[Multiplayer] Spieler entfernt: ${this.andereSpieler[id].name || id}`);
          delete this.andereSpieler[id];
        }
        if (typeof this.onSpielerVerlassen === "function") {
          this.onSpielerVerlassen(id);
        }
      });

      // Namensänderung eines Spielers synchronisieren
      this.socket.on("spielerNameGeaendert", (daten) => {
        if (this.andereSpieler[daten.id]) {
          this.andereSpieler[daten.id].name = daten.name;
        }
        if (this.eigenerSpieler && this.eigenerSpieler.id === daten.id) {
          this.eigenerSpieler.name = daten.name;
        }
        if (typeof this.onSpielerNameGeaendert === "function") {
          this.onSpielerNameGeaendert(daten);
        }
      });

      // Schuss eines anderen Spielers empfangen
      this.socket.on("schussAbgefeuert", (schussDaten) => {
        if (typeof this.onSchussEmpfangen === "function") {
          this.onSchussEmpfangen(schussDaten);
        }
      });

      // Zombie-Synchronisation (Koop-Kampf)
      this.socket.on("zombiesAktualisiert", (zombiePaket) => {
        if (typeof this.onZombiesAktualisiert === "function") {
          this.onZombiesAktualisiert(zombiePaket);
        }
      });

      this.socket.on("zombieVerletzt", (daten) => {
        if (typeof this.onZombieVerletzt === "function") {
          this.onZombieVerletzt(daten);
        }
      });

      this.socket.on("zombieGestorben", (daten) => {
        if (typeof this.onZombieGestorben === "function") {
          this.onZombieGestorben(daten);
        }
      });

      // Spieler-Schaden & Respawn
      this.socket.on("spielerSchaden", (daten) => {
        if (typeof this.onSpielerSchaden === "function") {
          this.onSpielerSchaden(daten);
        }
      });

      this.socket.on("spielerRespawn", (daten) => {
        if (typeof this.onSpielerRespawn === "function") {
          this.onSpielerRespawn(daten);
        }
      });

      // Wellen- & Levelsystem
      this.socket.on("welleStatus", (daten) => {
        if (typeof this.onWelleStatus === "function") {
          this.onWelleStatus(daten);
        }
      });

      this.socket.on("welleGestartet", (daten) => {
        if (typeof this.onWelleGestartet === "function") {
          this.onWelleGestartet(daten);
        }
      });

      this.socket.on("welleAbgeschlossen", (daten) => {
        if (typeof this.onWelleAbgeschlossen === "function") {
          this.onWelleAbgeschlossen(daten);
        }
      });

      this.socket.on("pauseCountdown", (daten) => {
        if (typeof this.onPauseCountdown === "function") {
          this.onPauseCountdown(daten);
        }
      });

    } catch (fehler) {
      console.error("[Multiplayer] Verbindungsfehler:", fehler);
      this.statusAktualisieren(false, "Fehler");
    }
  }

  // ==========================================
  // Methoden zum Senden an den Server
  // ==========================================

  raumErstellen(spielerName) {
    if (!this.istVerbunden || !this.socket) return;
    this.socket.emit("raumErstellen", { spielerName });
  }

  raumBeitreten(raumCode, spielerName) {
    if (!this.istVerbunden || !this.socket) return;
    this.socket.emit("raumBeitreten", { raumCode, spielerName });
  }

  bereitUmschalten() {
    if (!this.istVerbunden || !this.socket) return;
    this.socket.emit("bereitUmschalten");
  }

  rundeStarten() {
    if (!this.istVerbunden || !this.socket) return;
    this.socket.emit("rundeStarten");
  }

  raumVerlassen() {
    if (!this.istVerbunden || !this.socket) return;
    this.socket.emit("raumVerlassen");
    this.aktuellerRaumCode = null;
    this.aktuelleLobby = null;
    this.andereSpieler = {};
  }

  sendeNameAenderung(neuerName) {
    if (!this.istVerbunden || !this.socket) return;
    this.socket.emit("spielerNameAendern", { neuerName });
  }

  sendeBewegung(x, y, winkel, blickrichtung = "rechts") {
    if (!this.istVerbunden || !this.socket) return;

    const winkelGerundet = Math.round(winkel * 100) / 100;
    if (
      this.letzteGesendeteDaten.x !== x ||
      this.letzteGesendeteDaten.y !== y ||
      this.letzteGesendeteDaten.winkel !== winkelGerundet
    ) {
      this.letzteGesendeteDaten = { x, y, winkel: winkelGerundet, blickrichtung };
      this.socket.emit("spielerBewegung", { x, y, winkel: winkelGerundet, blickrichtung });
    }
  }

  sendeSchuss(schussDaten) {
    if (!this.istVerbunden || !this.socket) return;
    this.socket.emit("schussAbfeuern", schussDaten);
  }

  sendeZombieTreffer(zombieId, schaden, trefferX, trefferY) {
    if (!this.istVerbunden || !this.socket) return;
    this.socket.emit("zombieTreffer", { zombieId, schaden, trefferX, trefferY });
  }

  getAndereSpieler() {
    return Object.values(this.andereSpieler);
  }

  statusAktualisieren(verbunden, text) {
    const statusText = document.getElementById("multiplayer-status-text");
    const statusPunkt = document.getElementById("multiplayer-status-punkt");

    if (statusText) statusText.textContent = text;
    if (statusPunkt) {
      statusPunkt.className = "status-punkt " + (verbunden ? "online" : "offline");
    }
  }
}

// Globale Instanz
let multiplayerVerbindung = null;
