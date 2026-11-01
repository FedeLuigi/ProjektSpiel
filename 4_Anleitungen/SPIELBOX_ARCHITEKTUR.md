# SPIELBOX – Plattform-Architektur & Entwickler-Leitfaden 🎮

Dieses Dokument beschreibt das Architektur-Konzept der **SPIELBOX** und erklärt, wie neue Spiele modular hinzugefügt werden können, ohne bestehenden Code zu gefährden.

---

## 1. Das SPIELBOX-Prinzip

Die **SPIELBOX** ist eine übergeordnete Spieleplattform im Web. Sie dient als zentraler Einstiegspunkt für mehrere voneinander unabhängige Spiele.

- **Übergeordnete Plattform**: Verwaltet den Spielekatalog, die PWA-Installation, globale Einstellungen (Spielername, Master-Lautstärke) und die Navigation.
- **Modulare Spiele**: Jedes Spiel (wie `1_Spiel` – Zombie Koop 2D) ist in sich geschlossen und verwaltet seine eigene Spielmechanik, Grafik, Soundeffekte und Gameplay-Logik.
- **Gemeinsame Dienste**: Globale Funktionen (wie Profilverwaltung, PWA-Service-Worker, UI-Stile) liegen im Bereich `0_Spielbox` und stehen allen Spielen zur Verfügung.

---

## 2. Ordnerstruktur

```text
ProjektSpiel/
│
├── 0_Spielbox/                        # Übergeordnete SPIELBOX-Plattform
│   ├── spielbox.html                  # Zentraler Startbildschirm & Hub
│   ├── spielbox.css                   # Plattformweites Design & UI-Komponenten
│   ├── spielbox.js                    # Plattform-Logik & Interaktionen
│   ├── spiele_katalog.js              # Zentrale Spiele-Verwaltung & Metadaten
│   ├── dienste/                       # Wiederverwendbare gemeinsame Plattform-Dienste
│   │   ├── plattform_speicher.js      # Globales Profil & Audioeinstellungen
│   │   └── pwa_dienst.js              # Plattformweite PWA-Installation & Updates
│   └── grafiken/                      # Plattform-Icons & Favicons
│       ├── icon-192.png
│       ├── icon-512.png
│       ├── apple-touch-icon.png
│       └── favicon.png
│
├── 1_Spiel/                           # Spiel 1: Zombie Koop 2D
│   ├── spiel.html                     # Spiel-Startseite & In-Game UI
│   ├── design.css                     # Zombie-spezifische Stile & HUD
│   ├── spiel.js                       # Zombie-Gameplay, Rendering & Steuerung
│   ├── wellen_verwaltung.js           # Zombie-Wellen & Level-Logik
│   ├── zombie_verwaltung.js           # Zombie-KI, Treffer, Spawnpunkte
│   └── service-worker.js              # Lokaler Service-Worker Fallback
│
├── 2_Multiplayer/                     # Netzwerk & Mehrspieler-Räume
│   ├── raum_verwaltung.js             # Raum-Erstellung, Codes, Beitritt & Lobby
│   ├── spieler_verwaltung.js          # Spielerverwaltung & Farbzuweisung
│   └── verbindung.js                  # Client Socket.IO Anbindung
│
├── 3_Spieleinstellungen/              # Konfiguration
│   ├── einstellungen.js               # Client-Spieleinstellungen
│   └── server_einstellungen.js        # Server-Parameter (Ports, Ticks, Welt)
│
├── 4_Anleitungen/                     # Dokumentation & Richtlinien
│   ├── Anleitung.md                   # Verbindliche Arbeitsanleitung
│   ├── ARBEITSANLEITUNG.md            # Referenz auf Arbeitsanleitung
│   └── SPIELBOX_ARCHITEKTUR.md        # Dieses Dokument
│
├── index.html                         # Weiterleitung auf die SPIELBOX
├── manifest.json                      # Zentrales PWA-Manifest der SPIELBOX
├── service-worker.js                  # Zentraler Plattform-Service-Worker
├── server_starten.js                  # Express & Socket.IO Server
└── package.json                       # Node.js Konfiguration
```

---

## 3. Wie füge ich ein neues Spiel hinzu?

Dank des SPIELBOX-Katalogs kann ein neues Spiel in **drei einfachen Schritten** integriert werden:

### Schritt 1: Eigenen Spielordner anlegen
Erstelle einen neuen Ordner für das Spiel (z.B. `5_SpaceDefender/`):
- `5_SpaceDefender/spiel.html`
- `5_SpaceDefender/spiel.js`
- `5_SpaceDefender/design.css`

### Schritt 2: Eintrag in `0_Spielbox/spiele_katalog.js` registrieren
Öffne `0_Spielbox/spiele_katalog.js` und füge dein Spiel zum Array `SPIELE` hinzu:

```javascript
{
  id: 'space_defender',
  titel: 'Space Defender 2D',
  untertitel: 'Galaktischer Koop-Shooter',
  kategorie: 'Arcade / Sci-Fi',
  spielerAnzahl: '1 – 4 Spieler',
  beschreibung: 'Verteidige gemeinsam eine Raumstation gegen Asteroiden und anfliegende Geschwader.',
  icon: '🚀',
  akzentFarbe: '#3b82f6',
  badge: '🔥 Neu',
  badges: ['🔥 Neu', '🌌 Sci-Fi', '👥 Koop'],
  status: 'verfuegbar',
  startUrl: '/5_SpaceDefender/spiel.html',
  ordner: '5_SpaceDefender',
  steuerung: {
    pc: 'WASD = Bewegen • Leertaste = Schießen',
    smartphone: 'Virtueller Joystick & Feuer-Button'
  }
}
```

### Schritt 3: Rückweg zur SPIELBOX einbinden
Füge in der Kopfzeile deines neuen Spiels einen Rückkehr-Button zur SPIELBOX ein:
```html
<a href="/0_Spielbox/spielbox.html" class="zurueck-nav-btn plattform-zurueck-btn">
  <span>🎮 Zur SPIELBOX</span>
</a>
```

Fertig! Das Spiel erscheint automatisch im SPIELBOX-Startbildschirm und kann sofort gestartet werden.

---

## 4. Wiederverwendbare Plattform-Dienste

### `PlattformSpeicher` (`0_Spielbox/dienste/plattform_speicher.js`)
- `PlattformSpeicher.getSpielerName()`: Liefert den plattformweit gewählten Rufnamen des Spielers.
- `PlattformSpeicher.setSpielerName(name)`: Aktualisiert den Namen für alle Spiele.
- `PlattformSpeicher.zufallsNameGenerieren()`: Erzeugt stylische, zufällige Spielernamen.
- `PlattformSpeicher.getAudioEinstellungen()`: Liest Master-Lautstärke, Sound- und Musik-Präferenzen aus.

### `PwaDienst` (`0_Spielbox/dienste/pwa_dienst.js`)
- Initialisiert den plattformweiten Service-Worker.
- Verwaltet die Standalone-App-Installation auf iOS (Safari Home-Screen) und Android (Install Prompt).
