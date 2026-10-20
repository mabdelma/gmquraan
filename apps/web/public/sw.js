/* Unskinned — service worker (installable PWA, offline shell, web push). */
const CACHE = "app-v4";
const PRECACHE = ["/offline.html", "/logo.svg", "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch cross-origin (Stripe, OpenAI, etc.)

  // Page navigations: network-first so dynamic, server-rendered content stays fresh;
  // fall back to the offline page when the network is unavailable.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
    return;
  }

  // Static assets: cache-first, then network (and cache the result).
  const isStatic = url.pathname.startsWith("/_next/static") || /\.(?:png|svg|jpg|jpeg|webp|gif|ico|woff2?|css|js)$/.test(url.pathname);
  if (isStatic) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }).catch(() => cached);
      })
    );
  }
});

// Web Push (VAPID) — show the notification the server sent.
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Unskinned", body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "Unskinned";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: payload.data || {},
    })
  );
});

// Focus an existing tab (or open one) when a notification is clicked.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate(target);
          return c.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
