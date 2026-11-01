/**
 * SPIELBOX - Zentraler Spielekatalog & Registrierung
 * Verwaltet alle verfügbaren und geplanten Spiele der Plattform.
 * Zukünftige Spiele können hier mit einem einzigen Eintrag registriert werden.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SpieleKatalog = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SPIELE = [
    {
      id: 'zombie',
      titel: 'Zombie Koop 2D',
      untertitel: 'Multiplayer Survival',
      kategorie: 'Koop Action / Survival',
      spielerAnzahl: '1 – 6 Spieler',
      beschreibung: 'Kämpfe im Team gegen endlose Zombie-Wellen! Eröffne eigene Räume, teile Einladungscodes und verteidige dich gemeinsam mit deinen Freunden.',
      icon: '🧟',
      coverBild: '/1_Spiel/icon-512.png',
      akzentFarbe: '#10b981',
      badge: '🔥 Live',
      badges: ['🔥 Live', '👥 Multiplayer', '📱 Mobile & PC', '⚡ Echtzeit'],
      status: 'verfuegbar',
      startUrl: '/1_Spiel/spiel.html',
      ordner: '1_Spiel',
      steuerung: {
        pc: 'WASD / Pfeiltasten = Bewegen • Maus = Zielen • Linksklick = Schießen',
        smartphone: 'Virtuelle Joysticks (Links = Laufen • Rechts = Zielen & Feuern)'
      },
      features: [
        'Echtzeit-Multiplayer mit Raumcodes & Direktlinks',
        'Gemeinsame Zombie-Horden, Wellen & Level-Skalierung',
        '2 Sekunden Respawn-Schutzschild mit sicheren Spawnpunkten',
        'Vollständige PWA-App-Unterstützung (iOS & Android)'
      ]
    },
    {
      id: 'space_defender',
      titel: 'Space Defender 2D',
      untertitel: 'Galaktischer Koop-Shooter',
      kategorie: 'Arcade / Sci-Fi',
      spielerAnzahl: '1 – 4 Spieler',
      beschreibung: 'Verteidige gemeinsam eine Raumstation gegen Asteroiden und anfliegende Geschwader. Rüste Schilde und Laser auf.',
      icon: '🚀',
      akzentFarbe: '#3b82f6',
      badge: '✨ In Entwicklung',
      badges: ['✨ In Entwicklung', '🌌 Sci-Fi', '👥 Koop'],
      status: 'demnaechst',
      startUrl: '#',
      ordner: '5_SpaceDefender',
      steuerung: {
        pc: 'WASD = Manövrieren • Leertaste = Laserfeuer',
        smartphone: 'Touch-Lenkrad & Waffenauslöser'
      },
      features: [
        'Prozedurale Asteroiden-Felder',
        'Kooperative Schutzschilde',
        'Mächtige Boss-Raumschiffe'
      ]
    },
    {
      id: 'neon_pong',
      titel: 'Neon Pong Battle',
      untertitel: 'Cyberpunk 1vs1 Duell',
      kategorie: 'Retro / Arcade',
      spielerAnzahl: '2 Spieler',
      beschreibung: 'Der ultimative Retro-Klassiker im modernen Neon-Look! Schnelle Ballwechsel, Power-ups und Highspeed-Action im Browser.',
      icon: '🏓',
      akzentFarbe: '#ec4899',
      badge: '💡 Geplant',
      badges: ['💡 Geplant', '⚡ 1vs1 Duell', '🕹️ Retro'],
      status: 'geplant',
      startUrl: '#',
      ordner: '6_NeonPong',
      steuerung: {
        pc: 'W/S oder Pfeiltasten zum Bewegen des Schlägers',
        smartphone: 'Vertikaler Touch-Slider'
      },
      features: [
        'Multi-Ball & Schuss-Power-ups',
        '60 FPS Physik & Ballbeschleunigung',
        'Lokales oder Online-Duell'
      ]
    }
  ];

  return {
    /**
     * Liefert alle registrierten Spiele.
     */
    getAlleSpiele() {
      return SPIELE;
    },

    /**
     * Liefert nur spielbare / verfügbare Spiele.
     */
    getVerfuegbareSpiele() {
      return SPIELE.filter(s => s.status === 'verfuegbar');
    },

    /**
     * Findet ein Spiel anhand seiner ID.
     */
    getSpielNachId(id) {
      return SPIELE.find(s => s.id === id) || null;
    },

    /**
     * Gibt die Anzahl der verfügbaren Spiele zurück.
     */
    getAnzahlSpiele() {
      return SPIELE.length;
    }
  };
});
