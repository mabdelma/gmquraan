/*
 * native-bridge.js — Unskinned native (Capacitor) shell bridge.
 * Served by the web app and loaded only inside the native shell (see NativeBridge.tsx).
 * In a normal browser everything below is a guarded no-op.
 *
 * Inside Capacitor it:
 *   1. Hides the splash screen once the page is ready.
 *   2. Sets a dark status bar over the navy app chrome.
 *   3. Requests push permission, registers, POSTs the token to /api/v1/devices/register.
 *   4. Deep-links on notification tap (payload data.url / data.path).
 *   5. Maps the Android hardware back button to web-history back (exits at root).
 *
 * The mobile/ copy of this file is kept identical as the documented source of truth.
 */
(function () {
  "use strict";

  var TOKEN_ENDPOINT = "/api/v1/devices/register";

  var cap = typeof window !== "undefined" ? window.Capacitor : undefined;
  var isNative = !!(cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform());
  if (!isNative) return; // Normal browser — no-op.

  var Plugins = (cap && cap.Plugins) || {};
  var platform = typeof cap.getPlatform === "function" ? cap.getPlatform() : "unknown";

  function safe(fn) {
    try {
      var r = fn();
      if (r && typeof r.catch === "function") r.catch(function (e) { console.warn("[native-bridge]", e); });
    } catch (e) {
      console.warn("[native-bridge]", e);
    }
  }

  // --- 1. Hide splash once the page is up. -----------------------------------
  function hideSplash() {
    if (Plugins.SplashScreen && Plugins.SplashScreen.hide) safe(function () { return Plugins.SplashScreen.hide(); });
  }

  // --- 2. Dark status bar over the navy chrome. ------------------------------
  function setStatusBar() {
    if (Plugins.StatusBar) {
      safe(function () { return Plugins.StatusBar.setStyle({ style: "DARK" }); });
      if (platform === "android" && Plugins.StatusBar.setBackgroundColor) {
        safe(function () { return Plugins.StatusBar.setBackgroundColor({ color: "#080f1e" }); });
      }
    }
  }

  // --- 3b. Send the device token to the backend. -----------------------------
  function postToken(token) {
    if (!token) return;
    safe(function () {
      return fetch(TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token: token, platform: platform }),
      }).then(function (res) {
        if (!res.ok) console.warn("[native-bridge] token register failed", res.status);
      });
    });
  }

  // --- 4. Navigate to a notification's target when the user taps it. ---------
  function openFromNotification(action) {
    var data = action && action.notification && action.notification.data;
    var target = data && (data.url || data.path || data.link);
    if (!target) return;
    safe(function () {
      // Same-origin only: absolute same-origin URLs or app-relative paths.
      if (/^https?:\/\//i.test(target)) {
        if (target.indexOf(window.location.origin) === 0) window.location.assign(target);
      } else if (target.charAt(0) === "/") {
        window.location.assign(window.location.origin + target);
      }
    });
  }

  // --- 3. Request permission + register for push. ----------------------------
  function setupPush() {
    var Push = Plugins.PushNotifications;
    if (!Push) return;
    safe(function () { return Push.addListener("registration", function (t) { postToken(t && t.value); }); });
    safe(function () { return Push.addListener("registrationError", function (e) { console.warn("[native-bridge] push error", e); }); });
    safe(function () { return Push.addListener("pushNotificationReceived", function (n) { console.log("[native-bridge] push received", n); }); });
    safe(function () { return Push.addListener("pushNotificationActionPerformed", openFromNotification); });
    safe(function () {
      return Push.checkPermissions().then(function (perm) {
        if (perm && perm.receive === "granted") return Push.register();
        return Push.requestPermissions().then(function (req) {
          if (req && req.receive === "granted") return Push.register();
          console.log("[native-bridge] push permission not granted");
        });
      });
    });
  }

  // --- 5. Android hardware back button -> web history back (exit at root). ---
  function setupBackButton() {
    if (platform !== "android" || !Plugins.App || !Plugins.App.addListener) return;
    safe(function () {
      return Plugins.App.addListener("backButton", function (e) {
        if (e && e.canGoBack) {
          window.history.back();
        } else if (Plugins.App.exitApp) {
          safe(function () { return Plugins.App.exitApp(); });
        }
      });
    });
  }

  function init() {
    hideSplash();
    setStatusBar();
    setupPush();
    setupBackButton();
  }

  if (document.readyState === "complete" || document.readyState === "interactive") init();
  else document.addEventListener("DOMContentLoaded", init, { once: true });
})();
