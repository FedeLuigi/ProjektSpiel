/**
 * SPIELBOX - Plattformweiter Speicherdienst
 * Verwaltet globale Einstellungen, Spielerprofil und geteilte Präferenzen
 * Kompatibel mit Browser-Window und Node.js / CommonJS
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PlattformSpeicher = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STORAGE_KEYS = {
    SPIELER_NAME: 'spielbox_spieler_name',
    AUDIO: 'spielbox_audio_einstellungen',
    LETZTES_SPIEL: 'spielbox_letztes_spiel',
    INSTALLIERT: 'spielbox_pwa_installiert'
  };

  const STANDARDS = {
    spielerName: 'Spieler',
    audio: {
      musik: true,
      sound: true,
      lautstaerke: 80
    }
  };

  const NAMENS_PRAEFIXE = [
    'Schatten', 'Cyber', 'Laser', 'Neon', 'Sturm', 'Phantom', 'Ghost', 'Pixel',
    'Turbo', 'Hyper', 'Blitz', 'Titan', 'Apex', 'Viper', 'Nova', 'Raptor'
  ];

  const NAMENS_SUFFIXE = [
    'Jäger', 'Fuchs', 'Falke', 'Geist', 'Wolf', 'Runner', 'Held', 'Ranger',
    'Kämpfer', 'Drache', 'Striker', 'Pilot', 'Profi', 'Meister', 'Zocker'
  ];

  function speicherVerfuegbar() {
    try {
      const test = '__spielbox_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  const verfuegbar = speicherVerfuegbar();

  function datenLesen(schluessel, fallback) {
    if (!verfuegbar) return fallback;
    try {
      const wert = localStorage.getItem(schluessel);
      if (wert === null) return fallback;
      return JSON.parse(wert);
    } catch (e) {
      return fallback;
    }
  }

  function datenSchreiben(schluessel, wert) {
    if (!verfuegbar) return;
    try {
      localStorage.setItem(schluessel, JSON.stringify(wert));
    } catch (e) {
      console.warn('[PlattformSpeicher] Schreiben fehlgeschlagen:', e);
    }
  }

  return {
    /**
     * Gibt den globalen Spielernamen zurück.
     * Erzeugt beim ersten Aufruf einen ansprechenden Zufallsnamen.
     */
    getSpielerName() {
      let name = datenLesen(STORAGE_KEYS.SPIELER_NAME, null);
      if (!name || typeof name !== 'string' || name.trim() === '') {
        name = this.zufallsNameGenerieren();
        this.setSpielerName(name);
      }
      return name;
    },

    /**
     * Speichert den globalen Spielernamen.
     */
    setSpielerName(name) {
      if (!name || typeof name !== 'string') return;
      const bereinigt = name.trim().slice(0, 16);
      if (bereinigt.length > 0) {
        datenSchreiben(STORAGE_KEYS.SPIELER_NAME, bereinigt);
      }
    },

    /**
     * Generiert einen neuen, stylischen Zufallsnamen.
     */
    zufallsNameGenerieren() {
      const praefix = NAMENS_PRAEFIXE[Math.floor(Math.random() * NAMENS_PRAEFIXE.length)];
      const suffix = NAMENS_SUFFIXE[Math.floor(Math.random() * NAMENS_SUFFIXE.length)];
      const nummer = Math.floor(Math.random() * 90 + 10);
      return `${praefix}${suffix}${nummer}`;
    },

    /**
     * Gibt die plattformweiten Audioeinstellungen zurück.
     */
    getAudioEinstellungen() {
      const gespeicherte = datenLesen(STORAGE_KEYS.AUDIO, {});
      return {
        musik: gespeicherte.musik !== undefined ? !!gespeicherte.musik : STANDARDS.audio.musik,
        sound: gespeicherte.sound !== undefined ? !!gespeicherte.sound : STANDARDS.audio.sound,
        lautstaerke: typeof gespeicherte.lautstaerke === 'number' ? gespeicherte.lautstaerke : STANDARDS.audio.lautstaerke
      };
    },

    /**
     * Speichert Audio-Optionen.
     */
    setAudioEinstellungen(optionen) {
      const aktuelle = this.getAudioEinstellungen();
      const neue = { ...aktuelle, ...optionen };
      datenSchreiben(STORAGE_KEYS.AUDIO, neue);
    },

    /**
     * Speichert die ID des zuletzt gespielten Spiels.
     */
    setLetztesSpiel(spielId) {
      datenSchreiben(STORAGE_KEYS.LETZTES_SPIEL, spielId);
    },

    getLetztesSpiel() {
      return datenLesen(STORAGE_KEYS.LETZTES_SPIEL, 'zombie');
    }
  };
});
