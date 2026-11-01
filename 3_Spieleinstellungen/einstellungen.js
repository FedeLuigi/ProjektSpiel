// Zentrale Spieleinstellungen und Konfiguration

const Spieleinstellungen = {
  // Einstellungen für die Spielfiguren
  spieler: {
    radius: 18,              // Top-Down Radius der Figur
    breite: 36,              // Für Kollisionsbox
    hoehe: 36,
    geschwindigkeit: 4.5,    // Pixel pro Frame
    maxHp: 100,              // Maximale Lebenspunkte
    standardFarbe: "#3b82f6",
    waffenFarbe: "#64748b",
    waffenLaenge: 24         // Abstand von Spielermitte bis Mündung
  },

  // Einstellungen für die Zombies
  zombie: {
    radius: 18,              // Körpergröße des Zombies
    geschwindigkeit: 2.2,    // Bewegungsgeschwindigkeit
    maxHp: 30,               // 3 Treffer à 10 Schaden zum Besiegen
    schaden: 10,             // Schaden pro Biss/Angriff
    angriffsAbstand: 28,     // Reichweite für Bisse
    angriffsRate: 1000,      // Millisekunden zwischen Angriffen
    farbe: "#4d7c0f",        // Verwestes Zombie-Grün
    augenFarbe: "#ef4444"    // Glühend rote Augen
  },

  // Einstellungen für die Waffe & Munition
  waffe: {
    schussRate: 160,          // Millisekunden zwischen Schüssen
    kugelGeschwindigkeit: 15, // Pixel pro Frame
    kugelRadius: 3.5,
    kugelFarbe: "#fde047",    // Leuchtendes Gelb (Tracer)
    schweifFarbe: "rgba(251, 191, 36, 0.4)",
    streuung: 0.04,           // Leichte Streuung in Radiant
    maxReichweite: 800        // Maximale Flugdistanz der Kugel
  },

  // Einstellungen für die virtuelle Touch-Steuerung (Smartphones)
  touch: {
    joystickRadius: 55,       // Äußerer Ring
    knaufRadius: 24,          // Innerer beweglicher Punkt
    maxAuslenkung: 45         // Maximaler Auslenkungsweg
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

  // Grafisches Design (Zombie-Survival Top-Down Atmosphäre)
  design: {
    hintergrundFarbe: "#0a0f1d", // Sehr dunkle Nacht
    gitterFarbe: "rgba(255, 255, 255, 0.03)",
    gitterGroesse: 50,
    taschenlampeLaenge: 190,    // Reichweite des Lichtkegels
    taschenlampeWinkel: 0.65    // Streuung des Lichts (~37 Grad)
  }
};
