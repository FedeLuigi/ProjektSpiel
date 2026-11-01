# SPIELBOX 🎮 – Modulare 2D-Multiplayer-Spieleplattform

Die **SPIELBOX** ist eine moderne, webbasierte Spieleplattform für Multiplayer- und Arcade-Games auf Basis von **HTML5 Canvas**, **JavaScript**, **Node.js** und **Socket.IO**.

---

## 🌟 Das SPIELBOX-Prinzip

- **Zentraler Plattform-Hub (`0_Spielbox/`)**: Ein moderner Startbildschirm mit Spielekatalog, globalem Spielerprofil, plattformweiten Audioeinstellungen und PWA-Unterstützung.
- **Modulare Spiele (`1_Spiel/` etc.)**: Jedes Spiel ist ein in sich geschlossener Bereich. Das erste Spiel ist **Zombie Koop 2D** – weitere Spiele können mit einem einzigen Eintrag im Spielekatalog hinzugefügt werden.
- **Echtzeit-Multiplayer (`2_Multiplayer/`)**: Spielräume mit 5-stelligen Einladungscodes, direkten Einladungslinks und synchronisierten Lobbys.
- **PWA-App-Installation**: Lässt sich sowohl auf iPhones als auch auf Android-Smartphones als eigenständige App ohne störende Browserleisten auf dem Startbildschirm installieren.
- **Multi-Plattform-Steuerung**: Optimiert für Tastatur & Maus (PC) sowie virtuelle Touch-Joysticks (Smartphones / Tablets im Querformat).

---

## 🚀 Plattform starten

### 1. Server starten
```bash
npm start
```
*(oder `node server_starten.js`)*

### 2. Im Browser öffnen
Gehe auf: 👉 **[http://localhost:3000](http://localhost:3000)**

Du landest direkt auf dem Startbildschirm der **SPIELBOX** und kannst von dort aus jedes Spiel starten oder einem Raum beitreten!

---

## 🕹️ Spiele in der SPIELBOX

### 1. 🧟 Zombie Koop 2D (Verfügbar)
- **Modus**: Kooperatives 2D-Top-Down Survival (1 – 6 Spieler)
- **Features**: Wellen- & Levelsystem, Waffen, sichere Spawnpunkte mit 2s Respawn-Schutzschild, Taschenlampenlicht und Zombie-Horden.
- **Direktlink**: [http://localhost:3000/1_Spiel/spiel.html](http://localhost:3000/1_Spiel/spiel.html)

### 2. 🚀 Space Defender 2D (Demnächst)
- **Modus**: Kooperativer Weltraum-Shooter gegen Asteroiden und Flotten.

### 3. 🏓 Neon Pong Battle (Geplant)
- **Modus**: Schnelles 1vs1 Cyberpunk Duell im Retro-Stil.

---

## 📁 Projekt- und Ordnerstruktur

```text
ProjektSpiel/
│
├── 0_Spielbox/                        # Übergeordnete SPIELBOX-Plattform
│   ├── spielbox.html                  # Zentraler Startbildschirm & Hub
│   ├── spielbox.css                   # Plattformweites Design & UI-Komponenten
│   ├── spielbox.js                    # Plattform-Logik, Navigation & Spieleauswahl
│   ├── spiele_katalog.js              # Zentrale Spiele-Verwaltung & Metadaten
│   ├── dienste/                       # Wiederverwendbare gemeinsame Plattform-Dienste
│   │   ├── plattform_speicher.js      # Globales Profil & Audioeinstellungen
│   │   └── pwa_dienst.js              # Plattformweite PWA-Installation & Updates
│   └── grafiken/                      # Plattform-Icons & Favicons
│
├── 1_Spiel/                           # Spiel 1: Zombie Koop 2D
│   ├── spiel.html                     # Spiel-Startseite & In-Game UI
│   ├── design.css                     # Zombie-spezifische Stile & HUD
│   ├── spiel.js                       # Zombie-Gameplay, Rendering & Steuerung
│   ├── wellen_verwaltung.js           # Zombie-Wellen & Level-Logik
│   └── zombie_verwaltung.js           # Zombie-KI, Treffer, Spawnpunkte
│
├── 2_Multiplayer/                     # Netzwerk & Mehrspieler-Räume
│   ├── raum_verwaltung.js             # Raum-Erstellung, Codes, Beitritt & Lobby
│   ├── spieler_verwaltung.js          # Spielerverwaltung & Farbzuweisung
│   └── verbindung.js                  # Client Socket.IO Anbindung
│
├── 3_Spieleinstellungen/              # Konfiguration
│   ├── einstellungen.js               # Client-Spieleinstellungen (Radien, Waffen, Touch)
│   └── server_einstellungen.js        # Server-Parameter (Ports, Ticks, Welt)
│
├── 4_Anleitungen/                     # Dokumentation & Richtlinien
│   ├── Anleitung.md                   # Verbindliche Arbeitsanleitung
│   ├── ARBEITSANLEITUNG.md            # Referenz auf Arbeitsanleitung
│   └── SPIELBOX_ARCHITEKTUR.md        # Leitfaden zum Hinzufügen neuer Spiele
│
├── AGENTS.md                          # Richtlinien für KI-Agenten
├── README.md                          # Diese Hauptdokumentation
├── index.html                         # Haupteinstiegspunkt: Leitet auf SPIELBOX weiter
├── manifest.json                      # Zentrales PWA-Manifest der SPIELBOX
├── service-worker.js                  # Zentraler Plattform-Service-Worker
├── server_starten.js                  # Express & Socket.IO Server
└── package.json                       # Node.js Konfiguration
```

---

## 👥 Multiplayer lokal testen (2 Browserfenster)

1. Starte den Server (`npm start`).
2. Öffne **Fenster 1**: [http://localhost:3000](http://localhost:3000)
3. Klicke auf **„Zombie Koop 2D – Jetzt spielen“** und anschließend auf **„Spielraum erstellen“**.
4. Kopiere den angezeigten 5-stelligen Einladungscode (oder den Einladungslink).
5. Öffne **Fenster 2** (z.B. zweiter Tab oder Inkognito): [http://localhost:3000](http://localhost:3000)
6. Gib im Schnellbeitritt-Feld den Code ein und klicke auf **„Beitreten“**.
7. Beide Spieler sehen sich in der Lobby, markieren sich als **„Bereit“** und der Raumleiter startet die Runde!

---

## 🌐 Vorbereitung für Online-Hosting (Render / Cloud)

Die Anwendung ist ohne weitere Anpassungen für **Render**, **Railway** oder eigene Server einsatzbereit:
- Verwendet Umgebungsvariable `process.env.PORT || 3000`.
- Socket.IO mit freigegebenen CORS-Einstellungen (`origin: "*"`).
- Auslieferung der SPIELBOX als PWA für mobile Browser.
