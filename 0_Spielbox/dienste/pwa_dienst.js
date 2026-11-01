/**
 * SPIELBOX - Plattformweiter PWA-Dienst
 * Registriert den zentralen Service Worker und verwaltet App-Installationen
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PwaDienst = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  let installPromptEvent = null;

  function istIosSafari() {
    const ua = window.navigator.userAgent.toLowerCase();
    const istIos = /iphone|ipad|ipod/.test(ua);
    const istWebkit = /webkit/.test(ua);
    const istSafari = /safari/.test(ua) && !/crios|fxios|opios/.test(ua);
    return istIos && istWebkit && istSafari;
  }

  function istBereitsInstalliert() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  return {
    /**
     * Initialisiert den Service Worker und das PWA-Installationsmanagement.
     * @param {Object} optionen { onInstallVerfuegbar, installModalId, androidBtnId }
     */
    initialisieren(optionen = {}) {
      // 1. Service Worker registrieren (im Root-Verzeichnis mit Scope '/')
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
          .then((reg) => {
            console.log('[PWA Dienst] Service Worker erfolgreich registriert:', reg.scope);
          })
          .catch((err) => {
            console.warn('[PWA Dienst] Service Worker Registrierung fehlgeschlagen:', err);
          });
      }

      // 2. Android / Chrome vorinstallierter Prompt abfangen
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        installPromptEvent = e;
        if (typeof optionen.onInstallVerfuegbar === 'function') {
          optionen.onInstallVerfuegbar(true);
        }
      });

      // 3. Wenn App erfolgreich installiert wurde
      window.addEventListener('appinstalled', () => {
        installPromptEvent = null;
        if (typeof optionen.onInstallVerfuegbar === 'function') {
          optionen.onInstallVerfuegbar(false);
        }
        console.log('[PWA Dienst] SPIELBOX erfolgreich als App installiert!');
      });

      // iOS Safari kann immer als Home-Bildschirm-App installiert werden, wenn nicht schon standalone
      if (istIosSafari() && !istBereitsInstalliert()) {
        if (typeof optionen.onInstallVerfuegbar === 'function') {
          optionen.onInstallVerfuegbar(true);
        }
      }
    },

    istInstalliert() {
      return istBereitsInstalliert();
    },

    istIos() {
      return istIosSafari();
    },

    /**
     * Löst die Android/Chrome App-Installation aus.
     */
    async installationAnfordern() {
      if (!installPromptEvent) {
        return false;
      }
      try {
        installPromptEvent.prompt();
        const { outcome } = await installPromptEvent.userChoice;
        installPromptEvent = null;
        return outcome === 'accepted';
      } catch (err) {
        console.warn('[PWA Dienst] Fehler beim Auslösen der Installation:', err);
        return false;
      }
    }
  };
});
