// Zentrale Spieleinstellungen und Konfiguration

const Spieleinstellungen = {
  // Spielfeld-Dimensionen in Pixeln (zentrale gemeinsame Welt)
  weltBreite: 800,
  weltHoehe: 500,

  // Einstellungen für die Spielfiguren
  spieler: {
    breite: 40,
    hoehe: 40,
    geschwindigkeit: 5, // Pixel pro Frame
    standardFarbe: "#3b82f6",
    augenFarbe: "#ffffff"
  },

  // Farbpalette für automatisch zugewiesene Spielerfarben
  farbenPalette: [
    "#3b82f6", // Blau
    "#10b981", // Grün
    "#f59e0b", // Bernstein / Gelb
    "#ef4444", // Rot
    "#8b5cf6", // Lila
    "#ec4899", // Pink
    "#06b6d4", // Cyan
    "#f97316"  // Orange
  ],

  // Grafisches Design
  design: {
    hintergrundFarbe: "#1e293b", // Dunkles Schieferblau
    gitterFarbe: "rgba(255, 255, 255, 0.05)",
    gitterGroesse: 40,
    rahmenFarbe: "#3b82f6"
  }
};
