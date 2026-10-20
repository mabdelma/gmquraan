# Unskinned — Launch Readiness

_Last verified: 2026-07-05 · example.com (VPS 203.0.113.10)_

## Verdict: **GO** for web launch — **zero blockers**

Everything on the platform side is done and verified, including Stripe (webhook registered + enabled + live-key, verified via the Stripe API from the server). Native-mobile items (FCM/APNs, store submission) are **not** launch blockers — the PWA covers all users.

---

## ✅ Done & verified

| Area | State | Evidence |
|---|---|---|
| Public pages, auth gating, APIs, PWA, SEO, security headers | All green | `scripts/smoketest.sh` → **46/46 pass** |
| i18n — 11 locales, incl. Arabic RTL | Complete end-to-end (public, client, partner, super-admin) | Live re-check: es/de/ja `dir=ltr`, ar `dir=rtl` |
| Central admin login | Fixed + hardened (whitespace-trim on every password path) | Live test: correct pw → 200, stray-space pw → 200, wrong pw → 401 |
| Super-admin password | Rotated to `<redacted — rotate before first use>` | Verified against live endpoint |
| DNS (apex, central, passive, ai) | All → 203.0.113.10, all respond | `nslookup` + HTTPS checks |
| Stripe (billing) | LIVE key; webhook `api.example.com/v1/billing/webhooks/stripe` **registered + enabled** | Stripe API query from `app-billing`; endpoint returns 400 to unsigned (signature check live) |
| Web/PWA push (VAPID, self-hosted) | Working, no Firebase | VAPID key served, subscribe + admin test endpoints gated, `app-notifications` healthy |
| Legacy `unskinned-hub` | Decommissioned (containers + volumes removed) | Backup at `/var/backups/app/unskinned-hub-postgres-backup.tgz` |

---

## ⏳ On you — optional, none are launch blockers

### Native mobile (only if/when you ship store apps — not a web blocker)
- **iOS → APNs direct** (no Firebase): send `.p8` + Key ID + Team ID + Bundle ID.
- **Android → your choice:** FCM (Google, reliable) *or* self-hosted **ntfy + UnifiedPush** (Google-free, opt-in). Say the word and I'll wire either.
- App-store submission: your Apple/Google developer accounts.

---

## Push strategy (reference)

| Surface | Mechanism | Firebase? | Status |
|---|---|---|---|
| Desktop browsers | VAPID Web Push | No | ✅ live |
| Android (installed PWA) | VAPID Web Push | No | ✅ live |
| iOS 16.4+ (installed PWA) | VAPID (Safari→APNs) | No | ✅ live |
| iOS native app | APNs direct | No | ⏳ needs Apple key |
| Android native app | FCM *or* self-hosted ntfy | FCM only if chosen | 🔧 on request |

**The PWA covers every user with zero Google dependency.** Native push is optional.

---

## Decisions on record
- Catalog: `test-nexus`, `gm-svos`, `smc-kit` kept live as-is (owner confirmed).
- Mailboxes: **not** rotated — 12 are live human inboxes; `noreply@` (SMTP) already has a strong non-default password.
- Old hub DB backed up before deletion (`/var/backups/app/`), reversible if ever needed.

---

## Deploy reference
- Web: tar (excl. node_modules/.next/.git/.env) → `scp vps:/tmp/s.tgz` → extract `/var/www/app` → `setsid ./_deploy.sh` (builds + recreates `app-web`).
- Verify: `bash scripts/smoketest.sh` (46 checks).
- Super-admin console: https://central.example.com
