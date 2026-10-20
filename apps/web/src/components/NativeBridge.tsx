"use client";

import { useEffect } from "react";

/** Loads /native-bridge.js only when running inside the Capacitor native shell
 *  (so push registration + native chrome fire in the mobile app; no-op on web). */
export function NativeBridge() {
  useEffect(() => {
    const w = window as unknown as { Capacitor?: unknown };
    const inNative = !!w.Capacitor || /Capacitor/i.test(navigator.userAgent);
    if (!inNative || document.querySelector("script[data-native-bridge]")) return;
    const s = document.createElement("script");
    s.src = "/native-bridge.js";
    s.defer = true;
    s.setAttribute("data-native-bridge", "1");
    document.head.appendChild(s);
  }, []);
  return null;
}
