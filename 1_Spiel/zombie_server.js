/**
 * SPIEL 1: Zombie Koop 2D – Modulare Serverlogik
 * 
 * Implementiert die Spiel-Schnittstelle für die SPIELBOX-Plattform.
 * Verwaltet Wellen, Zombies, Schüsse, Treffer, KI und Spawnpunkte isoliert pro Raum.
 */

const { WELLEN_KONFIG } = require('../3_Spieleinstellungen/server_einstellungen');
const wellenVerwaltung = require('./wellen_verwaltung');
const zombieVerwaltung = require('./zombie_verwaltung');

module.exports = {
  id: 'zombie',
  name: 'Zombie Koop 2D',

  /**
   * Initialisiert den Raumzustand für das Zombie-Spiel.
   * @param {Object} raum 
   */
  initialisiereRaum(raum) {
    if (!raum) return;
    raum.zombies = {};
    raum.naechsteZombieId = 1;
    raum.welle = wellenVerwaltung.neuenWellenZustand();
    raum.letzterSpawnZeit = 0;
  },

  /**
   * Wird aufgerufen, wenn der Raumleiter die Spielrunde startet.
   * Sendet das Startsignal und startet Level 1.
   * @param {Object} raum 
   * @param {Object} [io] 
   */
  onRundeStarten(raum, io) {
    if (!raum) return;

    this.initialisiereRaum(raum);

    if (io) {
      // Start-Signal an alle Mitspieler im Raum senden
      io.to(raum.code).emit('spielGestartet', {
        raumCode: raum.code,
        spieler: raum.spieler,
        welle: wellenVerwaltung.getZustand(raum)
      });

      // Level 1 der Zombie-Wellen starten
      wellenVerwaltung.welleStarten(raum, 1, io);
    }
  },

  /**
   * Registriert Zombie-spezifische Socket.IO-Events für einen verbundenen Client.
   * @param {Object} socket 
   * @param {Object} io 
   * @param {Object} raumVerwaltung 
   */
  registriereSocketEvents(socket, io, raumVerwaltung) {
    // 1. Schuss abfeuern (nur innerhalb des jeweiligen Raums übertragen)
    socket.on('schussAbfeuern', (daten) => {
      const raum = raumVerwaltung.getRaumVonSocket(socket.id);
      if (raum && raum.spielId === 'zombie') {
        socket.to(raum.code).emit('schussAbgefeuert', { ...daten, spielerId: socket.id });
      }
    });

    // 2. Zombie getroffen (Koop-Schaden innerhalb des Raums verrechnen)
    socket.on('zombieTreffer', (treffer) => {
      const raum = raumVerwaltung.getRaumVonSocket(socket.id);
      if (raum && raum.spielId === 'zombie' && raum.status === 'spiel') {
        zombieVerwaltung.zombieTreffen(raum, treffer, socket.id, io, () => {
          wellenVerwaltung.zombieBesiegt(raum, io);
        });
      }
    });
  },

  /**
   * Server Game-Loop Tick (z.B. alle 40ms / 25 Ticks pro Sekunde) für aktive Zombie-Räume.
   * Berechnet Wellenpause, Zombie-Spawns, Zombie-KI, Angriffe und sichere Respawns.
   * @param {Object} raum 
   * @param {number} jetzt 
   * @param {Object} io 
   */
  onTick(raum, jetzt, io) {
    if (!raum || !raum.welle) return;

    const z = raum.welle;

    // Pausen-Countdown zwischen zwei Wellen aktualisieren
    if (z.status === "pause" || z.status === "welle_geschafft") {
      wellenVerwaltung.pauseAktualisieren(raum, io);
      return;
    }

    // Zombies erzeugen, wenn die Welle aktiv ist und das Spawn-Intervall erreicht wurde
    if (
      wellenVerwaltung.darfZombieSpawnen(raum) &&
      jetzt - raum.letzterSpawnZeit > WELLEN_KONFIG.spawnIntervallMs
    ) {
      zombieVerwaltung.zombieSpawnen(raum, z.level);
      wellenVerwaltung.zombieGespawntZaehlerErhoehen(raum);
      raum.letzterSpawnZeit = jetzt;
    }

    // Zombie-KI berechnen, Wegfindung & Angriffe auf Spieler ausführen
    zombieVerwaltung.zombiesAktualisieren(raum, io);

    // Zombie-Positionen synchronisiert nur an diesen Raum senden
    io.to(raum.code).emit('zombiesAktualisiert', zombieVerwaltung.getZombiesPaket(raum));
  },

  /**
   * Aufräumarbeiten, wenn ein Spieler den Raum verlässt.
   * @param {Object} raum 
   * @param {string} socketId 
   * @param {Object} [io] 
   */
  onSpielerVerlassen(raum, socketId, io) {
    // Falls nötig, zombies neu anvisieren lassen
  }
};
