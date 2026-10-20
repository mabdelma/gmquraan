import crypto from "crypto";
import http2 from "node:http2";
import webpush from "web-push";
import { prisma } from "@app/db";

/**
 * Server push notifications. Sends to registered DeviceTokens via FCM HTTP v1
 * (Android/web) and APNs token-based auth (iOS). Best-effort: if credentials are
 * not configured it is a silent no-op, so it never breaks a request. Invalid /
 * unregistered tokens are deleted automatically.
 *
 * Env (set these to switch it on):
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT   (self-hosted Web Push — no Firebase)
 *   FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY    (Firebase service account — native Android only)
 *   APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY,         (Apple .p8 token auth — iOS, no Firebase)
 *   APNS_BUNDLE_ID (default com.example.app), APNS_PRODUCTION ("true")
 *   NTFY_TOKEN                                           (self-hosted ntfy publish token — native Android, Google-free)
 * Private keys may contain literal "\n" — they are normalised.
 *
 * Platform routing: web -> VAPID Web Push, ios -> APNs, unifiedpush -> ntfy, android -> FCM.
 */
export type PushPayload = { title: string; body: string; data?: Record<string, string> };
type SendResult = { sent: boolean; remove?: boolean };

const norm = (k?: string) => (k || "").replace(/\\n/g, "\n").trim();
const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64url");

const cache: { fcm?: string; fcmExp?: number; apns?: string; apnsExp?: number } = {};

// ── FCM (Android / web) ─────────────────────────────────────────────────────
async function fcmAccessToken(): Promise<string | null> {
  const email = process.env.FCM_CLIENT_EMAIL;
  const key = norm(process.env.FCM_PRIVATE_KEY);
  if (!email || !key) return null;
  if (cache.fcm && cache.fcmExp && cache.fcmExp > Date.now() + 60_000) return cache.fcm;
  try {
    const now = Math.floor(Date.now() / 1000);
    const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claim = b64url(
      JSON.stringify({
        iss: email,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      })
    );
    const sig = crypto.sign("RSA-SHA256", Buffer.from(`${header}.${claim}`), key).toString("base64url");
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${header}.${claim}.${sig}`,
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json();
    if (!data.access_token) return null;
    cache.fcm = data.access_token;
    cache.fcmExp = Date.now() + (data.expires_in || 3600) * 1000;
    return cache.fcm!;
  } catch {
    return null;
  }
}

async function sendFcm(token: string, p: PushPayload): Promise<SendResult> {
  const proj = process.env.FCM_PROJECT_ID;
  const at = await fcmAccessToken();
  if (!proj || !at) return { sent: false };
  try {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${proj}/messages:send`, {
      method: "POST",
      headers: { authorization: `Bearer ${at}`, "content-type": "application/json" },
      body: JSON.stringify({ message: { token, notification: { title: p.title, body: p.body }, ...(p.data ? { data: p.data } : {}) } }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 404 || res.status === 410) return { sent: false, remove: true }; // unregistered
    return { sent: res.ok };
  } catch {
    return { sent: false };
  }
}

// ── APNs (iOS) ──────────────────────────────────────────────────────────────
function apnsJwt(): string | null {
  const kid = process.env.APNS_KEY_ID;
  const team = process.env.APNS_TEAM_ID;
  const key = norm(process.env.APNS_PRIVATE_KEY);
  if (!kid || !team || !key) return null;
  if (cache.apns && cache.apnsExp && cache.apnsExp > Date.now()) return cache.apns;
  try {
    const now = Math.floor(Date.now() / 1000);
    const header = b64url(JSON.stringify({ alg: "ES256", kid }));
    const claim = b64url(JSON.stringify({ iss: team, iat: now }));
    // ieee-p1363 → raw r||s signature (JWT format), not DER.
    const sig = crypto.sign("SHA256", Buffer.from(`${header}.${claim}`), { key, dsaEncoding: "ieee-p1363" }).toString("base64url");
    cache.apns = `${header}.${claim}.${sig}`;
    cache.apnsExp = Date.now() + 50 * 60 * 1000; // APNs tokens valid ~60 min
    return cache.apns;
  } catch {
    return null;
  }
}

function sendApns(token: string, p: PushPayload): Promise<SendResult> {
  const jwt = apnsJwt();
  if (!jwt) return Promise.resolve({ sent: false });
  const host = process.env.APNS_PRODUCTION === "true" ? "https://api.push.apple.com" : "https://api.sandbox.push.apple.com";
  const topic = process.env.APNS_BUNDLE_ID || "com.example.app";
  return new Promise((resolve) => {
    let done = false;
    const finish = (r: SendResult) => { if (!done) { done = true; resolve(r); } };
    try {
      const client = http2.connect(host);
      client.on("error", () => finish({ sent: false }));
      const req = client.request({
        ":method": "POST",
        ":path": `/3/device/${token}`,
        "apns-topic": topic,
        "apns-push-type": "alert",
        authorization: `bearer ${jwt}`,
      });
      let status = 0;
      req.on("response", (h) => { status = Number(h[":status"]) || 0; });
      req.on("end", () => { try { client.close(); } catch { /* noop */ } finish({ sent: status === 200, remove: status === 410 }); });
      req.on("error", () => { try { client.close(); } catch { /* noop */ } finish({ sent: false }); });
      req.setTimeout(10_000, () => { try { client.close(); } catch { /* noop */ } finish({ sent: false }); });
      req.write(JSON.stringify({ aps: { alert: { title: p.title, body: p.body }, sound: "default" }, ...(p.data || {}) }));
      req.end();
    } catch {
      finish({ sent: false });
    }
  });
}

// ── Web Push (PWA / browser, self-hosted via VAPID — no Firebase) ────────────
let vapidReady: boolean | null = null;
function vapidConfigured(): boolean {
  if (vapidReady !== null) return vapidReady;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return (vapidReady = false);
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:info@example.com", pub, priv);
    return (vapidReady = true);
  } catch {
    return (vapidReady = false);
  }
}

async function sendWeb(token: string, p: PushPayload): Promise<SendResult> {
  if (!vapidConfigured()) return { sent: false };
  let sub: webpush.PushSubscription;
  try {
    sub = JSON.parse(token);
  } catch {
    return { sent: false, remove: true }; // not a valid subscription — prune it
  }
  try {
    await webpush.sendNotification(sub, JSON.stringify({ title: p.title, body: p.body, data: p.data || {} }));
    return { sent: true };
  } catch (e) {
    const code = (e as { statusCode?: number })?.statusCode;
    if (code === 404 || code === 410) return { sent: false, remove: true }; // gone — prune
    return { sent: false };
  }
}

// ── ntfy / UnifiedPush (native Android, self-hosted, Google-free) ────────────
// The token IS the app's UnifiedPush endpoint URL (a public ntfy topic, e.g.
// https://ntfy.example.com/up<random>). We POST the payload to it;
// the ntfy distributor on the device forwards it to the app, which displays it.
async function sendNtfy(endpoint: string, p: PushPayload): Promise<SendResult> {
  if (!/^https:\/\/[^ ]+/i.test(endpoint)) return { sent: false, remove: true };
  const token = norm(process.env.NTFY_TOKEN);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ title: p.title, body: p.body, data: p.data || {} }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 404 || res.status === 413) return { sent: false, remove: res.status === 404 };
    return { sent: res.ok };
  } catch {
    return { sent: false };
  }
}

// ── Public API ──────────────────────────────────────────────────────────────
type Where = { userId?: { in: string[] } | string };

/** Send a push to the device tokens matching `where`. Best-effort; cleans up dead tokens. */
export async function sendPush(p: PushPayload, where: Where = {}): Promise<{ sent: number; total: number }> {
  let tokens: { id: string; token: string; platform: string }[] = [];
  try {
    tokens = await prisma.deviceToken.findMany({ where, select: { id: true, token: true, platform: true } });
  } catch {
    return { sent: 0, total: 0 };
  }
  if (tokens.length === 0) return { sent: 0, total: 0 };

  const dead: string[] = [];
  let sent = 0;
  await Promise.all(
    tokens.map(async (t) => {
      const r =
        t.platform === "ios" ? await sendApns(t.token, p)
        : t.platform === "web" ? await sendWeb(t.token, p)
        : t.platform === "unifiedpush" ? await sendNtfy(t.token, p)
        : await sendFcm(t.token, p);
      if (r.sent) sent++;
      if (r.remove) dead.push(t.id);
    })
  );
  if (dead.length) await prisma.deviceToken.deleteMany({ where: { id: { in: dead } } }).catch(() => {});
  return { sent, total: tokens.length };
}

/** Persist in-app notifications (bell inbox) for the given users — best-effort. */
async function persistInApp(userIds: string[], p: PushPayload): Promise<void> {
  if (userIds.length === 0) return;
  await prisma.notification
    .createMany({
      data: userIds.map((userId) => ({ userId, type: p.data?.type || "info", title: p.title, body: p.body, url: p.data?.url })),
    })
    .catch(() => {});
}

/** Notify every admin / super-admin: in-app bell + push. */
export async function notifyAdmins(p: PushPayload): Promise<void> {
  try {
    const admins = await prisma.user.findMany({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } }, select: { id: true } });
    if (admins.length) {
      await persistInApp(admins.map((a) => a.id), p);
      await sendPush(p, { userId: { in: admins.map((a) => a.id) } });
    }
  } catch {
    /* best-effort */
  }
}

/** Notify a specific user: in-app bell + push. */
export async function notifyUser(userId: string, p: PushPayload): Promise<void> {
  if (!userId) return;
  await persistInApp([userId], p);
  await sendPush(p, { userId }).catch(() => {});
}
