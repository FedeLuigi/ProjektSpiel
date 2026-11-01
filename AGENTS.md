# AGENTS.md – Leitfaden für KI-Agenten & Entwicklungsassistenten 🤖

Dieses Dokument enthält verbindliche Arbeitsregeln, Kontext und Systemrichtlinien für alle autonomen Agenten, die an diesem Repository arbeiten.

---

## 1. Projekt-Überblick

Dieses Repository ist die **SPIELBOX** – eine modulare 2D-Multiplayer-Spieleplattform auf Basis von HTML5 Canvas, WebAudio, Express.js und Socket.IO.

- **Plattform**: Verwaltet den Startbildschirm, den Spielekatalog, die PWA-Unterstützung und globale Einstellungen (`0_Spielbox/`).
- **Spiel 1 (Zombie Koop 2D)**: Ein echtzeitfähiges Koop-Survivalsystem mit Wellen, Zombies, Waffen, sicheren Spawnpunkten und 2s Respawn-Schutz (`1_Spiel/`).
- **Multiplayer-Backend**: Zentrales raumbasiertes Socket.IO System mit 5-stelligen Einladungscodes und Lobbys (`2_Multiplayer/`).
- **Konfiguration**: Client- und Server-Konfigurationen (`3_Spieleinstellungen/`).
- **Dokumentation**: Anleitungen und Architekturrichtlinien (`4_Anleitungen/`).

---

## 2. Verbindliche Entwicklungsregeln

1. **Ordnerstruktur beibehalten**:
   - Globale Plattform-Features gehören in `0_Spielbox/`.
   - Zombie-Gameplay gehört in `1_Spiel/`.
   - Mehrspieler-Netzwerkcode gehört in `2_Multiplayer/`.
   - Spieleinstellungen gehören in `3_Spieleinstellungen/`.
   - Dokumentationen gehören in `4_Anleitungen/` oder ins Root-Verzeichnis.
   - Neue Spiele erhalten ihren eigenen Ordner (z.B. `5_SpaceDefender/`).

2. **Keine Monolithe**:
   - Halte `server_starten.js` schlank.
   - Teile komplexe Spiellogik in modulare Dateien auf.

3. **Multiplayer & Latenz schützen**:
   - `service-worker.js` darf **NIEMALS** `/socket.io/` Routen cachen oder abfangen.
   - Alle Raum-Ereignisse müssen sauber an den jeweiligen Raum isoliert bleiben (`io.to(raum.code)`).

4. **UI- & Eingabe-Trennung**:
   - Mausklicks auf Menüs, Modals, Buttons oder das Zahnradsymbol dürfen **niemals** Schüsse im Spiel auslösen.
   - Alle interaktiven UI-Elemente müssen `pointer-events: auto !important;` besitzen.

5. **Dokumentation und Tests**:
   - Teste Änderungen immer mit automatisierten Skripten (`node -c`, Modultests).
   - Aktualisiere `README.md` und relevante Dokumente bei Architektur- oder Feature-Änderungen.
