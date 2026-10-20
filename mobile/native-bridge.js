/*
 * native-bridge.js — Unskinned native shell bridge
 * -------------------------------------------------------------
 * Framework-agnostic, no bundler, no imports. Safe to drop on any page.
 *
 * Because the Capacitor app loads the HOSTED website via `server.url`
 * (https://example.com), the native plugins are exposed to that
 * remote page through the injected global `window.Capacitor`. This script uses
 * `Capacitor.Plugins.*` directly (the runtime global API) so it needs no build
 * step and no npm imports.
 *
 * When this runs inside Capacitor it will:
 *   1. Hide the splash screen once the page is ready.
 *   2. Set the status-bar style to dark (light text on the navy app chrome).
 *   3. Request push-notification permission, register for push.
 *   4. POST the device token to /api/v1/devices/register as { token, platform }.
 *
 * In a normal desktop/mobile browser everything below is a guarded no-op.
 *
 * HOW THIS GETS INJECTED (see README "Native capabilities & push"):
 *   The cleanest delivery is to serve this file from the hosted web app's
 *   public/ folder (so it is reachable at https://example.com/
 *   native-bridge.js) and have apps/web conditionally load it ONLY inside the
 *   native shell, e.g.:
 *
 *     if (window.Capacitor || /Capacitor/i.test(navigator.userAgent)) {
 *       const s = document.createElement('script');
 *       s.src = '/native-bridge.js';
 *       s.defer = true;
 *       document.head.appendChild(s);
 *     }
 *
 *   (Do NOT modify apps/web from this folder; that snippet is documented for the
 *   web team to add later. A copy of this file lives here as the source of
 *   truth — copy it into apps/web/public/ when wiring it up.)
 */
(function () {
  'use strict';

  var TOKEN_ENDPOINT = 'https://example.com/api/v1/devices/register';

  // --- Hard guard: only run inside a Capacitor native shell. -----------------
  var cap = typeof window !== 'undefined' ? window.Capacitor : undefined;
  var isNative = !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
  if (!isNative) {
    return; // Normal browser — no-op.
  }

  var Plugins = (cap && cap.Plugins) || {};
  var platform = typeof cap.getPlatform === 'function' ? cap.getPlatform() : 'unknown';

  function safe(fn) {
    try {
      var r = fn();
      if (r && typeof r.catch === 'function') {
        r.catch(function (e) { console.warn('[native-bridge] async error', e); });
      }
    } catch (e) {
      console.warn('[native-bridge] error', e);
    }
  }

  // --- 1. Hide splash screen once the page is up. ----------------------------
  function hideSplash() {
    if (Plugins.SplashScreen && Plugins.SplashScreen.hide) {
      safe(function () { return Plugins.SplashScreen.hide(); });
    }
  }

  // --- 2. Status bar: dark style (light content) over the navy chrome. -------
  function setStatusBar() {
    if (Plugins.StatusBar) {
      // Style.Dark => light text/icons (suited to the #080f1e background).
      safe(function () { return Plugins.StatusBar.setStyle({ style: 'DARK' }); });
      if (platform === 'android' && Plugins.StatusBar.setBackgroundColor) {
        safe(function () { return Plugins.StatusBar.setBackgroundColor({ color: '#080f1e' }); });
      }
    }
  }

  // --- 4. Send the device token to the backend. ------------------------------
  function postToken(token) {
    if (!token) return;
    safe(function () {
      return fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: token, platform: platform }),
      }).then(function (res) {
        if (!res.ok) {
          console.warn('[native-bridge] token register failed', res.status);
        }
      });
    });
  }

  // --- 3. Request permission + register for push. ----------------------------
  function setupPush() {
    var Push = Plugins.PushNotifications;
    if (!Push) return;

    // Wire listeners before registering so we never miss the token event.
    safe(function () {
      return Push.addListener('registration', function (tokenData) {
        postToken(tokenData && tokenData.value);
      });
    });
    safe(function () {
      return Push.addListener('registrationError', function (err) {
        console.warn('[native-bridge] push registration error', err);
      });
    });
    safe(function () {
      return Push.addListener('pushNotificationReceived', function (n) {
        console.log('[native-bridge] push received (foreground)', n);
      });
    });
    safe(function () {
      return Push.addListener('pushNotificationActionPerformed', function (a) {
        console.log('[native-bridge] push action', a);
      });
    });

    // Ask for permission, then register if granted.
    safe(function () {
      return Push.checkPermissions().then(function (perm) {
        if (perm && perm.receive === 'granted') {
          return Push.register();
        }
        return Push.requestPermissions().then(function (req) {
          if (req && req.receive === 'granted') {
            return Push.register();
          }
          console.log('[native-bridge] push permission not granted');
        });
      });
    });
  }

  function init() {
    hideSplash();
    setStatusBar();
    setupPush();
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  }
})();
