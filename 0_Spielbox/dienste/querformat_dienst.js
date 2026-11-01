/**
 * SPIELBOX - Zentraler Querformat-Dienst (Landscape Orientation Service)
 * Sorgt dafür, dass die SPIELBOX und alle gestarteten Spiele automatisch
 * im Querformat geöffnet, ausgerichtet und ausgeführt werden.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.QuerformatDienst = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  let overlayEl = null;

  /**
   * Prüft, ob das aktuelle Gerät ein Mobilgerät (Smartphone/Tablet) im Hochformat ist.
   * Auf Desktop-PCs (große Bildschirme ohne Touch) gibt diese Funktion immer false zurück.
   */
  function istMobilesHochformat() {
    const istMobil = (window.innerWidth <= 1024 || window.innerHeight <= 1024) &&
                     ('ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0));

    if (!istMobil) return false;

    if (window.matchMedia && window.matchMedia('(orientation: portrait)').matches) {
      return true;
    }
    return window.innerHeight > window.innerWidth;
  }

  /**
   * Versucht über die standardisierte Screen Orientation API sowie
   * herstellerspezifische Präfixe das Querformat zu erzwingen.
   */
  async function sperreQuerformat() {
    try {
      if (screen.orientation && typeof screen.orientation.lock === 'function') {
        await screen.orientation.lock('landscape').catch(() => {});
        return true;
      }
      if (screen.lockOrientation) {
        screen.lockOrientation('landscape');
        return true;
      }
      if (screen.mozLockOrientation) {
        screen.mozLockOrientation('landscape');
        return true;
      }
      if (screen.msLockOrientation) {
        screen.msLockOrientation('landscape');
        return true;
      }
    } catch (e) {
      // Ignorieren falls nicht unterstützt
    }
    return false;
  }

  /**
   * Fordert den Vollbildmodus an. Dies ist auf Android Chrome die Voraussetzung,
   * damit screen.orientation.lock('landscape') ohne Einschränkung ausgeführt werden darf.
   */
  async function vollbildAnfordern() {
    const el = document.documentElement;
    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (el.requestFullscreen) {
          await el.requestFullscreen().catch(() => {});
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen().catch(() => {});
        }
      }
    } catch (e) {}
  }

  /**
   * Zentraler Aufruf zum Aktivieren des Querformats.
   * @param {boolean} durchBenutzerGeste - Gibt an, ob der Aufruf aus einer Interaktion (Klick/Touch) stammt.
   */
  async function querformatAktivieren(durchBenutzerGeste = false) {
    // 1. Direkter Versuch über Screen Orientation Lock
    await sperreQuerformat();

    // 2. Falls eine Benutzergeste vorliegt und wir uns im mobilen Hochformat befinden:
    // Vollbild anfordern und danach Orientation Lock anwenden
    if (durchBenutzerGeste && istMobilesHochformat()) {
      await vollbildAnfordern();
      await sperreQuerformat();
    }

    overlayAktualisieren();
  }

  /**
   * Erzeugt das animierte Dreh-Overlay, falls auf Smartphones im Hochformat geöffnet.
   */
  function overlayErstellen() {
    if (document.getElementById('querformat-dreh-overlay')) {
      overlayEl = document.getElementById('querformat-dreh-overlay');
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'querformat-dreh-overlay';
    overlay.className = 'querformat-dreh-overlay versteckt';
    overlay.setAttribute('aria-live', 'polite');
    overlay.innerHTML = `
      <div class="querformat-dreh-inhalt">
        <div class="dreh-icon-kasten">
          <span class="dreh-smartphone-icon">📱</span>
          <span class="dreh-pfeil-icon">🔄</span>
        </div>
        <h2 class="dreh-titel">Bitte Smartphone drehen</h2>
        <p class="dreh-text">
          Die <strong>SPIELBOX</strong> ist für das <strong>Querformat</strong> optimiert.<br>
          Drehe dein Gerät bitte waagerecht für das beste Spielerlebnis.
        </p>
        <button id="querformat-dreh-action-btn" class="dreh-action-btn">
          ✨ Jetzt im Querformat starten
        </button>
      </div>
    `;

    document.body.appendChild(overlay);
    overlayEl = overlay;

    const actionBtn = document.getElementById('querformat-dreh-action-btn');
    if (actionBtn) {
      actionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        querformatAktivieren(true);
      });
    }

    overlay.addEventListener('click', () => {
      querformatAktivieren(true);
    });
  }

  /**
   * Schaltet die Sichtbarkeit des Overlays anhand der aktuellen Ausrichtung um.
   */
  function overlayAktualisieren() {
    if (!overlayEl) overlayEl = document.getElementById('querformat-dreh-overlay');
    if (!overlayEl) return;

    if (istMobilesHochformat()) {
      overlayEl.classList.remove('versteckt');
    } else {
      overlayEl.classList.add('versteckt');
    }
  }

  /**
   * Initialisiert alle Orientierungs-Listener und startet sofort beim Aufruf der Seite.
   */
  function initialisieren() {
    // 1. Sofortiger Querformat-Versuch direkt beim Aufruf
    querformatAktivieren(false);

    // 2. Dreh-Overlay im DOM bereitstellen
    if (document.body) {
      overlayErstellen();
      overlayAktualisieren();
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        overlayErstellen();
        overlayAktualisieren();
      });
    }

    // 3. Bei erster und jeder Benutzerinteraktion Querformat sichern
    const interaktionsHandler = () => {
      querformatAktivieren(true);
    };

    window.addEventListener('touchstart', interaktionsHandler, { passive: true });
    window.addEventListener('click', interaktionsHandler);

    // 4. Bei Bildschirmgrößen- oder Orientierungsänderung
    window.addEventListener('resize', overlayAktualisieren);
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        querformatAktivieren(false);
        overlayAktualisieren();
      }, 150);
    });

    if (screen.orientation && screen.orientation.addEventListener) {
      screen.orientation.addEventListener('change', () => {
        setTimeout(overlayAktualisieren, 100);
      });
    }

    // 5. Bei Rückkehr zur App (Tab-Wechsel / Aufwachen)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        querformatAktivieren(false);
        overlayAktualisieren();
      }
    });

    document.addEventListener('fullscreenchange', () => {
      querformatAktivieren(false);
      overlayAktualisieren();
    });
  }

  // Automatischer Start bei Skriptladung
  if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initialisieren);
    } else {
      initialisieren();
    }
  }

  return {
    querformatAktivieren,
    overlayAktualisieren,
    istMobilesHochformat,
    sperreQuerformat
  };
});
