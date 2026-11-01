// Wellen- und Levelsystem-Logik auf dem Server (Koop-Fortschritt)
const { WELLEN_KONFIG } = require('../3_Spieleinstellungen/server_einstellungen');

// Zentraler Spielzustand für Wellen und Runden
const spielZustand = {
  level: 1,
  status: "pause", // "pause", "welle_aktiv", "welle_geschafft"
  zombiesGesamt: WELLEN_KONFIG.basisZombies,
  zombiesGespawnt: 0,
  zombiesUebrig: WELLEN_KONFIG.basisZombies,
  pauseVerbleibend: WELLEN_KONFIG.pauseSekunden,
  letzterPauseTick: Date.now()
};

// Sendet den aktuellen Status der Welle an alle Clients
function welleStatusSenden(io) {
  io.emit('welleStatus', {
    level: spielZustand.level,
    status: spielZustand.status,
    zombiesUebrig: spielZustand.zombiesUebrig,
    zombiesGesamt: spielZustand.zombiesGesamt,
    pauseVerbleibend: spielZustand.pauseVerbleibend
  });
}

// Startet eine neue Welle für das angegebene Level
function welleStarten(levelNummer, io) {
  spielZustand.level = levelNummer;
  spielZustand.status = "welle_aktiv";
  spielZustand.zombiesGesamt = WELLEN_KONFIG.basisZombies + (levelNummer - 1) * WELLEN_KONFIG.zombiesProLevel;
  spielZustand.zombiesGespawnt = 0;
  spielZustand.zombiesUebrig = spielZustand.zombiesGesamt;

  console.log(`[Welle] Level ${levelNummer} gestartet mit ${spielZustand.zombiesGesamt} Zombies!`);

  io.emit('welleGestartet', {
    level: spielZustand.level,
    zombiesGesamt: spielZustand.zombiesGesamt
  });

  welleStatusSenden(io);
}

// Schließt eine Welle erfolgreich ab, heilt Spieler und startet die Pause
function welleAbschliessen(io, spielerVerwaltung) {
  spielZustand.status = "welle_geschafft";
  spielZustand.pauseVerbleibend = WELLEN_KONFIG.pauseSekunden;

  console.log(`[Welle] Level ${spielZustand.level} erfolgreich gemeistert!`);

  // Überlebende Spieler mit Heilung belohnen
  if (spielerVerwaltung) {
    spielerVerwaltung.alleLebendenSpielerHeilen(WELLEN_KONFIG.heilungNachWelle, io);
  }

  io.emit('welleAbgeschlossen', {
    geschafftesLevel: spielZustand.level,
    naechstesLevel: spielZustand.level + 1,
    pauseSekunden: WELLEN_KONFIG.pauseSekunden
  });

  welleStatusSenden(io);
}

// Registriert einen besiegten Zombie und prüft, ob die Welle geschafft ist
function zombieBesiegt(io, spielerVerwaltung) {
  spielZustand.zombiesUebrig = Math.max(0, spielZustand.zombiesUebrig - 1);
  welleStatusSenden(io);

  // Wenn alle Zombies besiegt und gespawnt sind
  if (spielZustand.zombiesUebrig === 0 && spielZustand.zombiesGespawnt >= spielZustand.zombiesGesamt) {
    welleAbschliessen(io, spielerVerwaltung);
  }
}

// Aktualisiert den Pausen-Countdown sekündlich
function pauseAktualisieren(io, spielerAnzahl) {
  const jetzt = Date.now();
  if (jetzt - spielZustand.letzterPauseTick >= 1000) {
    spielZustand.letzterPauseTick = jetzt;
    spielZustand.pauseVerbleibend--;

    const naechstesLevel = spielZustand.status === "welle_geschafft" ? spielZustand.level + 1 : spielZustand.level;

    io.emit('pauseCountdown', {
      sekunden: Math.max(0, spielZustand.pauseVerbleibend),
      naechstesLevel: naechstesLevel
    });

    // Wenn Pause abgelaufen ist und Spieler im Spiel sind
    if (spielZustand.pauseVerbleibend <= 0 && spielerAnzahl > 0) {
      welleStarten(naechstesLevel, io);
    }
  }
}

// Prüft, ob im aktuellen Zustand noch weitere Zombies gespawnt werden dürfen
function darfZombieSpawnen(aktiveZombieAnzahl) {
  const maxGleichzeitig = Math.min(14, 4 + spielZustand.level * 2);
  return (
    spielZustand.status === "welle_aktiv" &&
    aktiveZombieAnzahl < maxGleichzeitig &&
    spielZustand.zombiesGespawnt < spielZustand.zombiesGesamt
  );
}

function zombieGespawntZaehlerErhoehen() {
  spielZustand.zombiesGespawnt++;
}

function getZustand() {
  return {
    level: spielZustand.level,
    status: spielZustand.status,
    zombiesUebrig: spielZustand.zombiesUebrig,
    zombiesGesamt: spielZustand.zombiesGesamt,
    pauseVerbleibend: spielZustand.pauseVerbleibend
  };
}

module.exports = {
  welleStarten,
  welleAbschliessen,
  zombieBesiegt,
  pauseAktualisieren,
  darfZombieSpawnen,
  zombieGespawntZaehlerErhoehen,
  welleStatusSenden,
  getZustand
};
