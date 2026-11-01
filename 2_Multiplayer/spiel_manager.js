/**
 * SPIELBOX - Zentraler Spiel-Manager & Registrierungsschnittstelle
 * 
 * Ermöglicht es beliebigen Spielen (z.B. Zombie Koop 2D, Space Defender, Neon Pong),
 * ihre spezifische Server- und Multiplayerlogik unabhängig vom Kernserver zu registrieren.
 * 
 * Der Plattform-Server und die Raumverwaltung bleiben dadurch vollständig spiel-agnostisch.
 */

const registrierteSpiele = {};

/**
 * Registriert ein Spiel-Servermodul bei der Plattform.
 * @param {Object} spiel - Das Spielmodul
 * @param {string} spiel.id - Eindeutige Kennung (z.B. 'zombie', 'space_defender')
 * @param {string} [spiel.name] - Lesbarer Name
 * @param {Function} [spiel.initialisiereRaum] - Initialisiert spielspezifischen Raumzustand
 * @param {Function} [spiel.onRundeStarten] - Wird beim Rundenstart aufgerufen
 * @param {Function} [spiel.registriereSocketEvents] - Registriert spielspezifische Socket-Events
 * @param {Function} [spiel.onTick] - Game-Loop Tick für aktive Räume
 * @param {Function} [spiel.onSpielerVerlassen] - Aufräumen beim Verlassen eines Spielers
 */
function spielRegistrieren(spiel) {
  if (!spiel || !spiel.id) {
    throw new Error('Ein Spiel muss ein Objekt mit einer eindeutigen "id" sein.');
  }
  registrierteSpiele[spiel.id] = spiel;
  console.log(`[SpielManager] Spiel erfolgreich registriert: ${spiel.name || spiel.id} (ID: ${spiel.id})`);
}

/**
 * Gibt ein registriertes Spiel anhand seiner ID zurück.
 * @param {string} spielId 
 * @returns {Object|null}
 */
function getSpiel(spielId) {
  return registrierteSpiele[spielId] || null;
}

/**
 * Gibt alle registrierten Spiele zurück.
 * @returns {Object}
 */
function getAlleSpiele() {
  return registrierteSpiele;
}

/**
 * Ermittelt die Standard-Spiel-ID (Standard: 'zombie').
 * @returns {string}
 */
function getStandardSpielId() {
  const ids = Object.keys(registrierteSpiele);
  if (ids.includes('zombie')) return 'zombie';
  return ids[0] || 'zombie';
}

/**
 * Initialisiert den spielspezifischen Zustand für einen Raum.
 * @param {Object} raum 
 * @param {string} [spielId]
 */
function initialisiereRaum(raum, spielId) {
  if (!raum) return;
  const id = spielId || raum.spielId || getStandardSpielId();
  raum.spielId = id;

  const spiel = getSpiel(id);
  if (spiel && typeof spiel.initialisiereRaum === 'function') {
    spiel.initialisiereRaum(raum);
  }
}

/**
 * Wird aufgerufen, wenn die Spielrunde in einem Raum gestartet wird.
 * @param {Object} raum 
 * @param {Object} io 
 */
function onRundeStarten(raum, io) {
  if (!raum) return;
  const spiel = getSpiel(raum.spielId);
  if (spiel && typeof spiel.onRundeStarten === 'function') {
    spiel.onRundeStarten(raum, io);
  }
}

/**
 * Registriert spielspezifische Socket.IO-Events für einen verbundenen Client.
 * @param {Object} socket 
 * @param {Object} io 
 * @param {Object} raumVerwaltung 
 */
function registriereSocketEvents(socket, io, raumVerwaltung) {
  for (const spielId in registrierteSpiele) {
    const spiel = registrierteSpiele[spielId];
    if (typeof spiel.registriereSocketEvents === 'function') {
      spiel.registriereSocketEvents(socket, io, raumVerwaltung);
    }
  }
}

/**
 * Führt den Game-Loop-Tick für einen aktiven Spielraum aus.
 * @param {Object} raum 
 * @param {number} jetzt 
 * @param {Object} io 
 */
function onTick(raum, jetzt, io) {
  if (!raum) return;
  const spiel = getSpiel(raum.spielId);
  if (spiel && typeof spiel.onTick === 'function') {
    spiel.onTick(raum, jetzt, io);
  }
}

/**
 * Informiert das Spiel, wenn ein Spieler den Raum verlässt oder die Verbindung trennt.
 * @param {Object} raum 
 * @param {string} socketId 
 * @param {Object} [io] 
 */
function onSpielerVerlassen(raum, socketId, io) {
  if (!raum) return;
  const spiel = getSpiel(raum.spielId);
  if (spiel && typeof spiel.onSpielerVerlassen === 'function') {
    spiel.onSpielerVerlassen(raum, socketId, io);
  }
}

// Standard-Spiele (Zombie Koop) bei Bedarf automatisch registrieren
try {
  const zombieServer = require('../1_Spiel/zombie_server');
  if (zombieServer && zombieServer.id) {
    spielRegistrieren(zombieServer);
  }
} catch (e) {
  // Wird registriert sobald zombie_server geladen wird
}

module.exports = {
  spielRegistrieren,
  getSpiel,
  getAlleSpiele,
  getStandardSpielId,
  initialisiereRaum,
  onRundeStarten,
  registriereSocketEvents,
  onTick,
  onSpielerVerlassen
};
