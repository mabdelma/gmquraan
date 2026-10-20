"use client";

import { useEffect, useState } from "react";
import type { PushLabels } from "@/lib/push-i18n";

const DEFAULT_LABELS: PushLabels = {
  enable: "🔔 Enable notifications",
  enabling: "Enabling…",
  enabled: "🔔 Notifications enabled on this device.",
  blocked: "Notifications are blocked in your browser settings.",
};

/**
 * Self-hosted Web Push opt-in (VAPID — no Firebase). Shows an "Enable notifications"
 * button when the browser supports push, a VAPID key is configured, and permission
 * hasn't been granted yet. On click it subscribes via the service worker and registers
 * the subscription as a `web` DeviceToken linked to the signed-in user.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushOptIn({ endpoint = "/api/v1/devices/register", t }: { endpoint?: string; t?: PushLabels }) {
  const L = t ?? DEFAULT_LABELS;
  const [state, setState] = useState<"hidden" | "ready" | "busy" | "done" | "blocked">("hidden");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    if (Notification.permission === "granted") return setState("done");
    if (Notification.permission === "denied") return setState("blocked");
    // Only show the opt-in when the server actually has a VAPID key.
    fetch("/api/push/vapid-public-key")
      .then((r) => r.json())
      .then((d) => setState(d?.key ? "ready" : "hidden"))
      .catch(() => setState("hidden"));
  }, []);

  async function enable() {
    setState("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState(perm === "denied" ? "blocked" : "ready");

      const { key } = await fetch("/api/push/vapid-public-key").then((r) => r.json());
      if (!key) return setState("hidden");

      const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;

      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
        }));

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: JSON.stringify(sub), platform: "web" }),
      });
      setState(res.ok ? "done" : "ready");
    } catch {
      setState("ready");
    }
  }

  if (state === "hidden") return null;

  if (state === "done") {
    return <p className="text-xs text-[color:var(--ink)]/55">{L.enabled}</p>;
  }
  if (state === "blocked") {
    return <p className="text-xs text-[color:var(--ink)]/55">{L.blocked}</p>;
  }

  return (
    <button
      onClick={enable}
      disabled={state === "busy"}
      className="text-xs border border-[color:var(--hairline)] rounded-lg px-3 py-1.5 hover:bg-[color:var(--overlay)] disabled:opacity-50"
    >
      {state === "busy" ? L.enabling : L.enable}
    </button>
  );
}
