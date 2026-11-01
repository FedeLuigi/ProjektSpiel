// Spieleinstellungen und Konfiguration

const Spieleinstellungen = {
  // Spielfeld-Dimensionen in Pixeln
  weltBreite: 800,
  weltHoehe: 500,

  // Einstellungen für die Spielfigur
  spieler: {
    breite: 40,
    hoehe: 40,
    geschwindigkeit: 5, // Pixel pro Frame
    farbe: "#4e9af1",   // Modernes Blau
    augenFarbe: "#ffffff"
  },

  // Einstellungen für die Darstellung
  design: {
    hintergrundFarbe: "#1e293b", // Dunkles Schieferblau
    gitterFarbe: "rgba(255, 255, 255, 0.05)",
    gitterGroesse: 40,
    rahmenFarbe: "#3b82f6"
  }
};
