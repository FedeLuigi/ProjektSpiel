// Raum-Verwaltung auf dem Server (Multiplayer-Lobby & Raum-Isolierung)
const { SPIELER_FARBEN } = require('../3_Spieleinstellungen/server_einstellungen');
const wellenVerwaltung = require('../1_Spiel/wellen_verwaltung');
const zombieVerwaltung = require('../1_Spiel/zombie_verwaltung');

// Zeichen für leicht lesbare Raumcodes (ohne leicht verwechselbare Zeichen wie 0/O, 1/I)
const CODE_ZEICHEN = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

// Zentrale Datenstrukturen
const raeume = {};           // raumCode -> Raum-Objekt
const socketZuRaum = {};     // socketId -> raumCode

// Erzeugt einen zufälligen, eindeutigen 5-stelligen Raumcode
function raumCodeGenerieren() {
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 5; i++) {
      code += CODE_ZEICHEN[Math.floor(Math.random() * CODE_ZEICHEN.length)];
    }
  } while (raeume[code]);
  return code;
}

// Erstellt einen neuen Raum mit dem Ersteller als Raumleiter
function raumErstellen(socketId, spielerName) {
  // Falls der Spieler bereits in einem Raum ist, dort zuerst austragen
  spielerEntfernen(socketId);

  const code = raumCodeGenerieren();
  const bereinigterName = (spielerName && spielerName.trim()) ? spielerName.trim().substring(0, 16) : `Überlebender #${socketId.substring(0, 4)}`;

  const farbe = SPIELER_FARBEN[0]; // Erste Farbe für den Leiter

  const ersteller = {
    id: socketId,
    name: bereinigterName,
    farbe: farbe,
    istLeiter: true,
    bereit: false,
    hp: 100,
    maxHp: 100,
    x: 400,
    y: 300,
    winkel: 0,
    blickrichtung: 'rechts'
  };

  const neuerRaum = {
    code: code,
    leiterId: socketId,
    status: 'lobby', // 'lobby' | 'spiel'
    spieler: {
      [socketId]: ersteller
    },
    zombies: {},
    naechsteZombieId: 1,
    welle: wellenVerwaltung.neuenWellenZustand(),
    letzterSpawnZeit: 0,
    erstelltAm: Date.now()
  };

  raeume[code] = neuerRaum;
  socketZuRaum[socketId] = code;

  console.log(`[Raum] Neuer Raum erstellt: ${code} von ${bereinigterName} (${socketId})`);
  return neuerRaum;
}

// Lässt einen Spieler einem bestehenden Raum beitreten
function raumBeitreten(raumCode, socketId, spielerName) {
  if (!raumCode) {
    return { fehler: 'Bitte gib einen gültigen Raumcode ein.' };
  }

  const normalisierterCode = raumCode.trim().toUpperCase();
  const raum = raeume[normalisierterCode];

  if (!raum) {
    return { fehler: `Kein Raum mit dem Code „${normalisierterCode}“ gefunden.` };
  }

  if (raum.status === 'spiel') {
    return { fehler: 'In diesem Raum läuft bereits eine aktive Runde!' };
  }

  const spielerAnzahl = Object.keys(raum.spieler).length;
  if (spielerAnzahl >= 6) {
    return { fehler: 'Dieser Raum ist bereits voll (maximal 6 Spieler)!' };
  }

  // Falls der Spieler bereits in einem anderen Raum ist, dort austragen
  if (socketZuRaum[socketId] && socketZuRaum[socketId] !== normalisierterCode) {
    spielerEntfernen(socketId);
  }

  const bereinigterName = (spielerName && spielerName.trim()) ? spielerName.trim().substring(0, 16) : `Überlebender #${socketId.substring(0, 4)}`;

  // Nicht vergebene Farbe wählen
  const vergebeneFarben = Object.values(raum.spieler).map(s => s.farbe);
  const verfuegbareFarbe = SPIELER_FARBEN.find(f => !vergebeneFarben.includes(f)) || SPIELER_FARBEN[spielerAnzahl % SPIELER_FARBEN.length];

  // Leichte Versatzposition beim Start
  const startX = 400 + Math.round((Math.random() - 0.5) * 100);
  const startY = 300 + Math.round((Math.random() - 0.5) * 100);

  const neuerSpieler = {
    id: socketId,
    name: bereinigterName,
    farbe: verfuegbareFarbe,
    istLeiter: false,
    bereit: false,
    hp: 100,
    maxHp: 100,
    x: startX,
    y: startY,
    winkel: 0,
    blickrichtung: 'rechts'
  };

  raum.spieler[socketId] = neuerSpieler;
  socketZuRaum[socketId] = normalisierterCode;

  console.log(`[Raum] Spieler ${bereinigterName} (${socketId}) ist Raum ${normalisierterCode} beigetreten`);
  return { raum, spieler: neuerSpieler };
}

// Schaltet die Bereitschaft eines Spielers in der Lobby um
function spielerBereitschaftUmschalten(socketId) {
  const raum = getRaumVonSocket(socketId);
  if (!raum || !raum.spieler[socketId]) return null;

  raum.spieler[socketId].bereit = !raum.spieler[socketId].bereit;
  console.log(`[Lobby] Bereitschaft geändert für ${raum.spieler[socketId].name}: ${raum.spieler[socketId].bereit}`);
  return raum;
}

// Prüft, ob alle Spieler im Raum bereit sind
function sindAlleSpielerBereit(raum) {
  if (!raum) return false;
  const liste = Object.values(raum.spieler);
  if (liste.length === 0) return false;
  return liste.every(s => s.bereit);
}

// Startet die Runde, wenn der Anforderer der Leiter ist und alle bereit sind
function rundeStarten(socketId) {
  const raum = getRaumVonSocket(socketId);
  if (!raum) {
    return { fehler: 'Raum nicht gefunden.' };
  }

  if (raum.leiterId !== socketId) {
    return { fehler: 'Nur der Raumleiter kann die Runde starten!' };
  }

  if (!sindAlleSpielerBereit(raum)) {
    return { fehler: 'Es sind noch nicht alle Spieler bereit!' };
  }

  raum.status = 'spiel';
  raum.zombies = {};
  raum.naechsteZombieId = 1;
  raum.welle = wellenVerwaltung.neuenWellenZustand();
  raum.letzterSpawnZeit = 0;

  console.log(`[Raum ${raum.code}] Runde erfolgreich gestartet!`);
  return { raum };
}

// Entfernt einen Spieler aus seinem Raum und kümmert sich um Leiter-Übergabe & Aufräumen
function spielerEntfernen(socketId) {
  const raumCode = socketZuRaum[socketId];
  if (!raumCode) return null;

  delete socketZuRaum[socketId];
  const raum = raeume[raumCode];
  if (!raum) return null;

  const entfernterSpieler = raum.spieler[socketId];
  delete raum.spieler[socketId];

  const verbleibendeSpieler = Object.values(raum.spieler);

  // Wenn der Raum leer ist -> vollständig löschen
  if (verbleibendeSpieler.length === 0) {
    delete raeume[raumCode];
    console.log(`[Raum] Raum ${raumCode} ist leer und wurde gelöscht.`);
    return { raumGeloescht: true, raumCode };
  }

  // Falls der Raumleiter gegangen ist -> Nächsten Spieler zum Leiter ernennen
  let neuerLeiter = null;
  if (raum.leiterId === socketId) {
    neuerLeiter = verbleibendeSpieler[0];
    neuerLeiter.istLeiter = true;
    raum.leiterId = neuerLeiter.id;
    console.log(`[Raum ${raumCode}] Neuer Raumleiter ist: ${neuerLeiter.name} (${neuerLeiter.id})`);
  }

  return {
    raumGeloescht: false,
    raum,
    entfernterSpieler,
    neuerLeiter
  };
}

// Gibt den Raum eines Sockets zurück
function getRaumVonSocket(socketId) {
  const code = socketZuRaum[socketId];
  return code ? raeume[code] : null;
}

// Gibt einen Raum anhand seines Codes zurück
function getRaum(code) {
  if (!code) return null;
  return raeume[code.trim().toUpperCase()] || null;
}

// Erstellt ein sicheres Datenpaket der Lobby für alle Clients
function getLobbyPaket(raum) {
  if (!raum) return null;
  const spielerListe = Object.values(raum.spieler).map(s => ({
    id: s.id,
    name: s.name,
    farbe: s.farbe,
    istLeiter: s.istLeiter,
    bereit: s.bereit
  }));

  return {
    raumCode: raum.code,
    leiterId: raum.leiterId,
    status: raum.status,
    spielerAnzahl: spielerListe.length,
    spieler: spielerListe,
    alleBereit: sindAlleSpielerBereit(raum)
  };
}

// Gibt alle aktuell aktiven Räume zurück (für den Game Loop)
function getAlleRaeume() {
  return raeume;
}

module.exports = {
  raumErstellen,
  raumBeitreten,
  spielerBereitschaftUmschalten,
  sindAlleSpielerBereit,
  rundeStarten,
  spielerEntfernen,
  getRaumVonSocket,
  getRaum,
  getLobbyPaket,
  getAlleRaeume
};
