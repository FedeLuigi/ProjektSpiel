// Zentrale Server-Einstellungen und Konstanten für das Multiplayer-Spiel

module.exports = {
  // Port für lokales Spielen oder Cloud-Hosting (Render etc.)
  PORT: process.env.PORT || 3000,

  // Farbpalette für automatisch zugewiesene Spielerfarben
  SPIELER_FARBEN: [
    "#3b82f6", // Blau
    "#10b981", // Grün
    "#f59e0b", // Gelb / Bernstein
    "#ef4444", // Rot
    "#8b5cf6", // Lila
    "#ec4899", // Pink
    "#06b6d4", // Cyan
    "#f97316"  // Orange
  ],

  // Spielfeld-Ausmaße für Spawn-Berechnungen
  WELT: {
    breite: 1000,
    hoehe: 650,
    spielerGroesse: 36
  },

  // Server-Tickrate (25 Ticks pro Sekunde = alle 40ms)
  TICK_RATE_MS: 40,

  // Wellen-Parameter
  WELLEN_KONFIG: {
    basisZombies: 8,
    zombiesProLevel: 5,
    pauseSekunden: 5,
    heilungNachWelle: 25,
    spawnIntervallMs: 1400
  }
};
