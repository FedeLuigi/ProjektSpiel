/**
 * SPIELBOX - Plattform-Logik & Spielekatalog-Renderer
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // DOM-Elemente
  const kopfSpielerNameEl = document.getElementById('kopf-spieler-name');
  const kopfZufallsNameBtn = document.getElementById('kopf-zufalls-name-btn');
  const spieleRasterEl = document.getElementById('spiele-raster');
  const katalogZaehlerEl = document.getElementById('katalog-zaehler');

  const schnellCodeInput = document.getElementById('schnell-code-input');
  const schnellBeitrittBtn = document.getElementById('schnell-beitritt-btn');

  // Plattform-Einstellungen Modal
  const plattformEinstellungenBtn = document.getElementById('plattform-einstellungen-btn');
  const plattformEinstellungenModal = document.getElementById('plattform-einstellungen-modal');
  const einstellungenSchliessenBtn = document.getElementById('einstellungen-schliessen-btn');
  const modalSpeichernBtn = document.getElementById('modal-speichern-btn');
  const modalSpielerNameInput = document.getElementById('modal-spieler-name-input');
  const modalZufallsNameBtn = document.getElementById('modal-zufalls-name-btn');
  const modalMusikSchalter = document.getElementById('modal-musik-schalter');
  const modalSoundSchalter = document.getElementById('modal-sound-schalter');
  const modalLautstaerkeRegler = document.getElementById('modal-lautstaerke-regler');
  const modalLautstaerkeWert = document.getElementById('modal-lautstaerke-wert');

  // PWA Install Modal
  const plattformInstallBtn = document.getElementById('plattform-install-btn');
  const plattformInstallModal = document.getElementById('plattform-install-modal');
  const installModalSchliessenBtn = document.getElementById('install-modal-schliessen-btn');
  const installModalFertigBtn = document.getElementById('install-modal-fertig-btn');
  const installAnleitungIos = document.getElementById('install-anleitung-ios');
  const installAnleitungAndroid = document.getElementById('install-anleitung-android');
  const androidInstallActionBtn = document.getElementById('android-install-action-btn');

  // Automatische Querformat-Aktivierung (Landscape) über zentralen QuerformatDienst
  function querformatAktivieren() {
    if (typeof QuerformatDienst !== 'undefined' && typeof QuerformatDienst.querformatAktivieren === 'function') {
      QuerformatDienst.querformatAktivieren(true);
    } else {
      try {
        if (screen.orientation && typeof screen.orientation.lock === 'function') {
          screen.orientation.lock('landscape').catch(() => {});
        }
      } catch (e) {}
    }
  }

  querformatAktivieren();
  window.addEventListener('click', querformatAktivieren);
  window.addEventListener('touchstart', querformatAktivieren, { passive: true });

  // 1. Profil & Name initialisieren
  function nameAktualisieren() {
    const aktuellerName = PlattformSpeicher.getSpielerName();
    if (kopfSpielerNameEl) kopfSpielerNameEl.textContent = aktuellerName;
    if (modalSpielerNameInput) modalSpielerNameInput.value = aktuellerName;
  }

  nameAktualisieren();

  if (kopfZufallsNameBtn) {
    kopfZufallsNameBtn.addEventListener('click', () => {
      const neuerName = PlattformSpeicher.zufallsNameGenerieren();
      PlattformSpeicher.setSpielerName(neuerName);
      nameAktualisieren();
    });
  }

  // 2. Spielekatalog rendern
  function spieleRendern() {
    if (!spieleRasterEl || typeof SpieleKatalog === 'undefined') return;

    const spiele = SpieleKatalog.getAlleSpiele();
    const verfuegbarAnzahl = SpieleKatalog.getVerfuegbareSpiele().length;

    if (katalogZaehlerEl) {
      katalogZaehlerEl.textContent = `${verfuegbarAnzahl} ${verfuegbarAnzahl === 1 ? 'Spiel bereit' : 'Spiele bereit'}`;
    }

    spieleRasterEl.innerHTML = '';

    spiele.forEach((spiel) => {
      const karte = document.createElement('article');
      karte.className = `spiel-karte ${spiel.status}`;

      const bannerKlasse = spiel.id === 'zombie' ? 'zombie-banner' : (spiel.id === 'space_defender' ? 'space-banner' : 'pong-banner');
      const statusBadgeKlasse = spiel.status === 'verfuegbar' ? '' : (spiel.status === 'demnaechst' ? 'demnaechst' : 'geplant');

      karte.innerHTML = `
        <div class="karte-banner ${bannerKlasse}">
          <span class="banner-icon">${spiel.icon}</span>
          <span class="karte-status-badge ${statusBadgeKlasse}">${spiel.badge}</span>
        </div>
        <div class="karte-inhalt">
          <div class="karte-titel-zeile">
            <h3 class="karte-titel">${spiel.titel}</h3>
            <span class="karte-untertitel">${spiel.untertitel} • ${spiel.spielerAnzahl}</span>
          </div>
          <p class="karte-beschreibung">${spiel.beschreibung}</p>
          <div class="karte-badges">
            ${spiel.badges.map(b => `<span class="tag-badge">${b}</span>`).join('')}
          </div>
          <div class="karte-fusszeile">
            ${spiel.status === 'verfuegbar' ? `
              <a href="${spiel.startUrl}" class="spiel-start-btn" data-spiel-id="${spiel.id}">
                <span>🎮 Jetzt spielen</span>
                <span>➔</span>
              </a>
            ` : `
              <button class="spiel-start-btn deaktiviert" disabled>
                <span>${spiel.status === 'demnaechst' ? '🚀 In Entwicklung' : '💡 Bald verfügbar'}</span>
              </button>
            `}
          </div>
        </div>
      `;

      spieleRasterEl.appendChild(karte);
    });

    // Klick auf Spiel-Start: Spielername merken
    spieleRasterEl.querySelectorAll('.spiel-start-btn[data-spiel-id]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = btn.getAttribute('data-spiel-id');
        PlattformSpeicher.setLetztesSpiel(id);
      });
    });
  }

  spieleRendern();

  // 3. Schnell-Beitritt zu Zombie Koop per Raumcode
  function schnellBeitreten() {
    if (!schnellCodeInput) return;
    const code = schnellCodeInput.value.trim().toUpperCase();
    if (code.length === 5) {
      PlattformSpeicher.setLetztesSpiel('zombie');
      window.location.href = `/1_Spiel/spiel.html?code=${encodeURIComponent(code)}`;
    } else {
      schnellCodeInput.focus();
      schnellCodeInput.style.borderColor = 'var(--akzent-rot)';
      setTimeout(() => {
        schnellCodeInput.style.borderColor = '';
      }, 1500);
    }
  }

  if (schnellBeitrittBtn) {
    schnellBeitrittBtn.addEventListener('click', schnellBeitreten);
  }
  if (schnellCodeInput) {
    schnellCodeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') schnellBeitreten();
    });
  }

  // 4. Plattform-Einstellungen Modal
  function einstellungenModalOeffnen() {
    if (!plattformEinstellungenModal) return;
    const audio = PlattformSpeicher.getAudioEinstellungen();
    if (modalMusikSchalter) modalMusikSchalter.checked = audio.musik;
    if (modalSoundSchalter) modalSoundSchalter.checked = audio.sound;
    if (modalLautstaerkeRegler) modalLautstaerkeRegler.value = audio.lautstaerke;
    if (modalLautstaerkeWert) modalLautstaerkeWert.textContent = `${audio.lautstaerke} %`;
    if (modalSpielerNameInput) modalSpielerNameInput.value = PlattformSpeicher.getSpielerName();

    plattformEinstellungenModal.classList.remove('versteckt');
  }

  function einstellungenModalSchliessen() {
    if (!plattformEinstellungenModal) return;
    // Werte speichern
    if (modalSpielerNameInput) {
      PlattformSpeicher.setSpielerName(modalSpielerNameInput.value);
      nameAktualisieren();
    }
    if (modalLautstaerkeRegler && modalMusikSchalter && modalSoundSchalter) {
      PlattformSpeicher.setAudioEinstellungen({
        musik: modalMusikSchalter.checked,
        sound: modalSoundSchalter.checked,
        lautstaerke: parseInt(modalLautstaerkeRegler.value, 10) || 80
      });
    }
    plattformEinstellungenModal.classList.add('versteckt');
  }

  if (plattformEinstellungenBtn) {
    plattformEinstellungenBtn.addEventListener('click', einstellungenModalOeffnen);
  }
  if (einstellungenSchliessenBtn) {
    einstellungenSchliessenBtn.addEventListener('click', einstellungenModalSchliessen);
  }
  if (modalSpeichernBtn) {
    modalSpeichernBtn.addEventListener('click', einstellungenModalSchliessen);
  }
  if (modalZufallsNameBtn) {
    modalZufallsNameBtn.addEventListener('click', () => {
      const neuerName = PlattformSpeicher.zufallsNameGenerieren();
      if (modalSpielerNameInput) modalSpielerNameInput.value = neuerName;
      PlattformSpeicher.setSpielerName(neuerName);
      nameAktualisieren();
    });
  }
  if (modalLautstaerkeRegler) {
    modalLautstaerkeRegler.addEventListener('input', () => {
      if (modalLautstaerkeWert) {
        modalLautstaerkeWert.textContent = `${modalLautstaerkeRegler.value} %`;
      }
    });
  }

  // Klick auf den Hintergrund des Modals
  if (plattformEinstellungenModal) {
    plattformEinstellungenModal.addEventListener('click', (e) => {
      if (e.target === plattformEinstellungenModal) einstellungenModalSchliessen();
    });
  }

  // 5. PWA Installation Initialisierung
  if (typeof PwaDienst !== 'undefined') {
    PwaDienst.initialisieren({
      onInstallVerfuegbar: (verfuegbar) => {
        if (plattformInstallBtn) {
          plattformInstallBtn.style.display = verfuegbar ? 'inline-flex' : 'none';
        }
      }
    });

    if (plattformInstallBtn) {
      plattformInstallBtn.addEventListener('click', () => {
        if (PwaDienst.istIos()) {
          if (installAnleitungIos) installAnleitungIos.style.display = 'block';
          if (installAnleitungAndroid) installAnleitungAndroid.style.display = 'none';
        } else {
          if (installAnleitungIos) installAnleitungIos.style.display = 'none';
          if (installAnleitungAndroid) installAnleitungAndroid.style.display = 'block';
        }
        if (plattformInstallModal) plattformInstallModal.classList.remove('versteckt');
      });
    }

    if (androidInstallActionBtn) {
      androidInstallActionBtn.addEventListener('click', async () => {
        const erfolgt = await PwaDienst.installationAnfordern();
        if (erfolgt && plattformInstallModal) {
          plattformInstallModal.classList.add('versteckt');
        }
      });
    }

    const schliessenInstallModal = () => {
      if (plattformInstallModal) plattformInstallModal.classList.add('versteckt');
    };

    if (installModalSchliessenBtn) installModalSchliessenBtn.addEventListener('click', schliessenInstallModal);
    if (installModalFertigBtn) installModalFertigBtn.addEventListener('click', schliessenInstallModal);
    if (plattformInstallModal) {
      plattformInstallModal.addEventListener('click', (e) => {
        if (e.target === plattformInstallModal) schliessenInstallModal();
      });
    }
  }
});
