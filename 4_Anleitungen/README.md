# ProjektSpiel 🎮

Ein einfaches, erweiterbares 2D-Browser-Spiel mit Socket.IO-Vorbereitung für Mehrspieler.

---

## 🚀 Spiel starten

### 1. Abhängigkeiten installieren (einmalig)
Falls noch nicht geschehen, im Terminal im Projektordner ausführen:
```bash
npm install
```

### 2. Server starten
Starte den Server mit:
```bash
node server_starten.js
```
*(Alternativ geht auch `npm start`)*

### 3. Im Browser öffnen
Öffne deinen Webbrowser und rufe folgende Adresse auf:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🕹️ Steuerung

| Taste | Aktion |
|---|---|
| **W** oder **Pfeiltaste Oben (▲)** | Nach oben bewegen |
| **S** oder **Pfeiltaste Unten (▼)** | Nach unten bewegen |
| **A** oder **Pfeiltaste Links (◄)** | Nach links bewegen |
| **D** oder **Pfeiltaste Rechts (►)** | Nach rechts bewegen |

---

## 📁 Projektstruktur

```text
ProjektSpiel/
│
├── 1_Spiel/                     # Spielfeld, Layout und Spiellogik
│   ├── spiel.html               # Webseite und Spiel-Canvas
│   ├── design.css               # Schönes modernes Dark-Design
│   └── spiel.js                 # 2D-Spielwelt, Bewegung & Kollision
│
├── 2_Multiplayer/               # Mehrspieler-Modul
│   └── verbindung.js            # Socket.IO Client-Verbindung
│
├── 3_Spieleinstellungen/        # Konfiguration
│   └── einstellungen.js         # Spielweltgröße, Farben, Tempo
│
├── 4_Anleitungen/               # Anleitungen & Dokumentation
│   └── README.md                # Diese Anleitung
│
├── server_starten.js            # Node.js Server mit Express & Socket.IO
└── package.json                 # Node.js Projektkonfiguration
```

---

## ✨ Bereits integrierte Funktionen
- **2D-Spielwelt**: Flüssiges HTML5 Canvas mit dezentem Raster.
- **Spielfigur**: Startet exakt zentriert in der Mitte des Spielfelds.
- **Steuerung**: Vollständige Unterstützung von WASD und Pfeiltasten inkl. diagonaler Bewegung.
- **Kollisionserkennung**: Die Figur kann die Ränder des Spielfelds nicht verlassen.
- **Socket.IO Vorbereitung**: Verbindung zum Server wird automatisch hergestellt, Verbindungsstatus wird angezeigt und Positionswechsel werden an den Server übermittelt.
