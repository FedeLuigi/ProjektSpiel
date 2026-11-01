// Wellen- und Levelsystem-Logik auf dem Server (Koop-Fortschritt pro Raum)
const { WELLEN_KONFIG } = require('../3_Spieleinstellungen/server_einstellungen');

// Erzeugt einen frischen Wellen-Zustand für einen neuen Spielraum
function neuenWellenZustand() {
  return {
    level: 1,
    status: "pause", // "pause", "welle_aktiv", "welle_geschafft"
    zombiesGesamt: WELLEN_KONFIG.basisZombies,
    zombiesGespawnt: 0,
    zombiesUebrig: WELLEN_KONFIG.basisZombies,
    pauseVerbleibend: WELLEN_KONFIG.pauseSekunden,
    letzterPauseTick: Date.now()
  };
}

// Sendet den aktuellen Status der Welle an alle Spieler im Raum
function welleStatusSenden(raum, io) {
  if (!raum || !raum.welle) return;
  io.to(raum.code).emit('welleStatus', {
    level: raum.welle.level,
    status: raum.welle.status,
    zombiesUebrig: raum.welle.zombiesUebrig,
    zombiesGesamt: raum.welle.zombiesGesamt,
    pauseVerbleibend: raum.welle.pauseVerbleibend
  });
}

// Startet eine neue Welle für das angegebene Level im Raum
function welleStarten(raum, levelNummer, io) {
  if (!raum || !raum.welle) return;
  const z = raum.welle;
  z.level = levelNummer;
  z.status = "welle_aktiv";
  z.zombiesGesamt = WELLEN_KONFIG.basisZombies + (levelNummer - 1) * WELLEN_KONFIG.zombiesProLevel;
  z.zombiesGespawnt = 0;
  z.zombiesUebrig = z.zombiesGesamt;

  console.log(`[Welle - Raum ${raum.code}] Level ${levelNummer} gestartet mit ${z.zombiesGesamt} Zombies!`);

  io.to(raum.code).emit('welleGestartet', {
    level: z.level,
    zombiesGesamt: z.zombiesGesamt
  });

  welleStatusSenden(raum, io);
}

// Schließt eine Welle erfolgreich ab, heilt Spieler im Raum und startet die Pause
function welleAbschliessen(raum, io) {
  if (!raum || !raum.welle) return;
  const z = raum.welle;
  z.status = "welle_geschafft";
  z.pauseVerbleibend = WELLEN_KONFIG.pauseSekunden;

  console.log(`[Welle - Raum ${raum.code}] Level ${z.level} erfolgreich gemeistert!`);

  // Alle lebenden Spieler im Raum heilen
  const heilung = WELLEN_KONFIG.heilungNachWelle;
  for (const sId in raum.spieler) {
    const s = raum.spieler[sId];
    if (s.hp > 0) {
      s.hp = Math.min(s.maxHp || 100, s.hp + heilung);
      io.to(raum.code).emit('spielerSchaden', { spielerId: s.id, hp: s.hp, schaden: -heilung });
    }
  }

  io.to(raum.code).emit('welleAbgeschlossen', {
    geschafftesLevel: z.level,
    naechstesLevel: z.level + 1,
    pauseSekunden: WELLEN_KONFIG.pauseSekunden
  });

  welleStatusSenden(raum, io);
}

// Registriert einen besiegten Zombie und prüft, ob die Welle im Raum geschafft ist
function zombieBesiegt(raum, io) {
  if (!raum || !raum.welle) return;
  const z = raum.welle;
  z.zombiesUebrig = Math.max(0, z.zombiesUebrig - 1);
  welleStatusSenden(raum, io);

  // Wenn alle Zombies besiegt und alle für diese Welle gespawnt wurden
  if (z.zombiesUebrig === 0 && z.zombiesGespawnt >= z.zombiesGesamt) {
    welleAbschliessen(raum, io);
  }
}

// Aktualisiert den Pausen-Countdown sekündlich für den Raum
function pauseAktualisieren(raum, io) {
  if (!raum || !raum.welle) return;
  const z = raum.welle;
  const spielerAnzahl = Object.keys(raum.spieler).length;
  const jetzt = Date.now();

  if (jetzt - z.letzterPauseTick >= 1000) {
    z.letzterPauseTick = jetzt;
    z.pauseVerbleibend--;

    const naechstesLevel = z.status === "welle_geschafft" ? z.level + 1 : z.level;

    io.to(raum.code).emit('pauseCountdown', {
      sekunden: Math.max(0, z.pauseVerbleibend),
      naechstesLevel: naechstesLevel
    });

    // Wenn Pause abgelaufen ist und Spieler im Raum sind -> nächste Welle starten
    if (z.pauseVerbleibend <= 0 && spielerAnzahl > 0) {
      welleStarten(raum, naechstesLevel, io);
    }
  }
}

// Prüft, ob im aktuellen Raumzustand noch weitere Zombies gespawnt werden dürfen
function darfZombieSpawnen(raum) {
  if (!raum || !raum.welle || !raum.zombies) return false;
  const z = raum.welle;
  const aktiveZombies = Object.keys(raum.zombies).length;
  const maxGleichzeitig = Math.min(14, 4 + z.level * 2);

  return (
    z.status === "welle_aktiv" &&
    aktiveZombies < maxGleichzeitig &&
    z.zombiesGespawnt < z.zombiesGesamt
  );
}

function zombieGespawntZaehlerErhoehen(raum) {
  if (raum && raum.welle) {
    raum.welle.zombiesGespawnt++;
  }
}

function getZustand(raum) {
  if (!raum || !raum.welle) return neuenWellenZustand();
  return {
    level: raum.welle.level,
    status: raum.welle.status,
    zombiesUebrig: raum.welle.zombiesUebrig,
    zombiesGesamt: raum.welle.zombiesGesamt,
    pauseVerbleibend: raum.welle.pauseVerbleibend
  };
}

module.exports = {
  neuenWellenZustand,
  welleStarten,
  welleAbschliessen,
  zombieBesiegt,
  pauseAktualisieren,
  darfZombieSpawnen,
  zombieGespawntZaehlerErhoehen,
  welleStatusSenden,
  getZustand
};
