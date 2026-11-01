# ProjektSpiel 🎮 – Öffentliche 2D-Multiplayer-Spielwelt

Ein öffentliches, leichtgewichtiges 2D-Multiplayer-Browserspiel auf Basis von **HTML5 Canvas**, **JavaScript**, **Node.js** und **Socket.IO**.

---

## 🌟 Spielprinzip

- **Ein einziger öffentlicher Link**: Jeder Spieler öffnet dieselbe Adresse.
- **Keine Anmeldung**: Sofort losspielen ohne Registrierung oder Passwörter.
- **Keine privaten Räume**: Alle Spieler betreten automatisch eine zentrale, gemeinsame Spielwelt.
- **Automatische Spielfigur**: Jeder Spieler erhält beim Verbinden eine eigene Figur mit individueller Farbe und Kennung.
- **Echtzeit-Synchronisation**: Alle Bewegungen werden in Echtzeit über Socket.IO übertragen.
- **Automatisches Verlassen**: Schließt ein Spieler das Browserfenster, verschwindet seine Figur sofort bei allen Mitspielern.

---

## 🚀 Spiel starten

### 1. Server starten
```bash
node server_starten.js
```
*(oder `npm start`)*

### 2. Im Browser öffnen
Gehe auf: 👉 **[http://localhost:3000](http://localhost:3000)**

---

## 👥 Multiplayer lokal testen (2 Browserfenster)

1. Starte den Server (`node server_starten.js`).
2. Öffne **Fenster 1**: [http://localhost:3000](http://localhost:3000)
   - Deine Spielfigur hat das Schild **"Du"** und eine eigene Farbe.
   - Der Zähler zeigt **"1 Spieler online"**.
3. Öffne **Fenster 2** (z.B. ein zweites Tab, Inkognito-Fenster oder ein anderer Browser): [http://localhost:3000](http://localhost:3000)
   - Eine zweite Spielfigur mit anderer Farbe erscheint sofort in beiden Fenstern.
   - Der Zähler schaltet in beiden Fenstern auf **"2 Spieler online"**.
4. Bewege Spieler 1 mit `WASD` – in Fenster 2 siehst du die Figur flüssig in Echtzeit mitgehen!
5. Schließe Fenster 2 – in Fenster 1 verschwindet die Figur sofort und der Zähler sinkt wieder auf 1.

---

## 🕹️ Steuerung

| Taste | Aktion |
|---|---|
| **W** / **▲ (Pfeil Oben)** | Nach oben |
| **S** / **▼ (Pfeil Unten)** | Nach unten |
| **A** / **◄ (Pfeil Links)** | Nach links |
| **D** / **► (Pfeil Rechts)** | Nach rechts |

---

## 📁 Ordnerstruktur

```text
ProjektSpiel/
│
├── 1_Spiel/                           # Spielfeld, Layout und Spiellogik
│   ├── spiel.html                     # Webseite & Canvas
│   ├── design.css                     # Modernes Dark-Theme & Touch-Styles
│   ├── spiel.js                       # 2D-Rendering, Touch/PC-Steuerung & Client-Loop
│   ├── wellen_verwaltung.js           # Server: Wellen-, Level- und Rundensystem
│   └── zombie_verwaltung.js           # Server: Zombie-KI, Spawns & Treffer-Kollision
│
├── 2_Multiplayer/                     # Netzwerk & Spieler
│   ├── verbindung.js                  # Client: Socket.IO Event-Synchronisation
│   └── spieler_verwaltung.js          # Server: Verwaltung aller verbundenen Spieler
│
├── 3_Spieleinstellungen/              # Konfiguration
│   ├── einstellungen.js               # Client: Spieleinstellungen (Radien, Farben, Tempo)
│   └── server_einstellungen.js        # Server: Ports, Farben & Wellen-Parameter
│
├── 4_Anleitungen/                     # Dokumentation
│   └── README.md                      # Diese Anleitung
│
├── server_starten.js                  # Schlanker Haupteinstiegspunkt (verbindet alle Module)
├── manifest.json                      # PWA-Manifest für iOS/Android Vollbild
└── package.json                       # Node.js Projektkonfiguration
```

---

## 🌐 Vorbereitung für Online-Hosting

Das Projekt ist bereits für Cloud-Hoster (wie z.B. **Render**, **Railway**, **Fly.io** oder eigene vServer) vorbereitet:
- Verwendet Umgebungsvariable `process.env.PORT || 3000`.
- Socket.IO mit freigegebenen CORS-Einstellungen (`origin: "*"`).
- Kann mit einem einzigen Befehl (`npm start`) in jeder Cloud ausgeführt werden.
