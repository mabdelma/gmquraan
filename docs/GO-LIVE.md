# Unskinned — Go-Live & Activation Runbook

Single source of truth for the steps that need **your** accounts/credentials to switch
on. Everything in the codebase is built and deployed; the items below are external
wiring. Secrets are **never** committed — set them in `/var/www/app/.env` on the VPS
(which is excluded from the deploy tarball) and recreate the affected container.

> **Host:** VPS `203.0.113.10` (ssh alias `vps`) · **App root:** `/var/www/app`
> Web container `app-web` · shared Caddy at `/var/www/gateway/infrastructure/caddy/Caddyfile`.

---

## 1. DNS (Hostinger)

| Record | Type | Value | Purpose | Status |
|---|---|---|---|---|
| `example.com` | A | `203.0.113.10` | apex site | ✅ live |
| `www` | A/CNAME | apex | marketing | ✅ live |
| `central` | A | `203.0.113.10` | admin console | ✅ live |
| `passive` | A | `203.0.113.10` | Partnership Hub (`/hub`) | ⛔ **add this** |

After adding `passive`, Caddy already has the vhost — it will issue the cert
automatically on first hit. Verify: `curl -I https://passive.example.com`.

---

## 2. Stripe (live)

- Live secret key is shared across products and already in `.env` as `STRIPE_SECRET_KEY`.
- **Webhook:** Stripe Dashboard → Developers → Webhooks → endpoint
  `https://example.com/api/billing/webhooks/stripe` (events:
  `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`). `STRIPE_WEBHOOK_SECRET` is already set on the
  VPS; if you rotate the endpoint, update it and recreate `app-web`.
  The endpoint returns `400` to unsigned probes (correct) and `200` to valid events.
- **Verify:** Stripe → Send test event → confirm `200` and a `PaymentTransaction` row.
- Tiers are **client-only** (STARTER/GROWTH/ENTERPRISE). Checkout API returns `403`
  for non-client roles by design.

---

## 3. Push notifications (send path is built — `lib/push.ts`)

Three channels, routed by device platform. Invalid tokens auto-prune. Each is a
**silent no-op** until configured, so it never breaks a request. Test from a
central-admin session: `POST /api/central/push/test` → `{ sent, total }`.

### Web Push / PWA — ✅ LIVE, self-hosted (no Firebase)
Uses the open **VAPID** standard via `web-push`. The VPS generated its own keypair
into `.env` (`VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`); the public key is served at
`/api/push/vapid-public-key`. Users enable it with the **"🔔 Enable notifications"**
button on `/dashboard`. **To receive lead/ops pushes, an admin must click that button
while signed in to `/dashboard` as their own user** (links a `web` DeviceToken to their
admin account). Nothing else required — this covers desktop + installed-PWA on Android.

> FCM and APNs below are **optional** and only matter for *native* store apps.

### FCM (Android / web)
Firebase Console → Project settings → **Service accounts** → *Generate new private key*.
From the JSON:
```
FCM_PROJECT_ID=<project_id>
FCM_CLIENT_EMAIL=<client_email>
FCM_PRIVATE_KEY=<private_key with literal \n kept>
```

### APNs (iOS)
Apple Developer → Certificates, IDs & Profiles → **Keys** → new key with *Apple Push
Notifications service (APNs)* enabled. Download the `.p8` once.
```
APNS_KEY_ID=<10-char key id>
APNS_TEAM_ID=<10-char team id>
APNS_PRIVATE_KEY=<contents of AuthKey_XXXX.p8>
APNS_BUNDLE_ID=com.example.app
APNS_PRODUCTION=true   # store builds; false for the sandbox
```

**Triggers already wired:** new contact / partner application / inbound lead reply →
admins; demo request & solution published → owning partner; payout sent → reseller.

---

## 4. Mobile app (Capacitor wrapper in `mobile/`)

PWA is already installable + auto-updates. For the native stores:
1. On a Mac: `cd mobile && npm i && npx cap add ios && npx cap add android`.
2. Push: add the Firebase `google-services.json` (Android) and
   `GoogleService-Info.plist` (iOS) + APNs key in the Apple Developer portal.
3. `npx cap sync`, open in Xcode / Android Studio, set signing, archive, submit.
   App id is `com.example.app`; `server.url` points at the hosted site so
   the shell stays auto-updated with every web deploy.

---

## 5. Phase-2 reseller integrations (other repos)

Bundles staged at `Desktop/reseller-integration/` (`partner-five.patch`, `vps.patch`,
`vidmox/`, `partner-one/`). These belong to **separate repositories** and need your
GitHub access to land:
```
cd <product-repo> && git checkout -b feat/app-reseller
git apply /path/to/<product>.patch   # or copy the vidmox/ + partner-one/ files
# review, run that repo's tests/CI, then open a PR
```
They add the Unskinned cross-product reseller hooks (validate code → 10% buyer discount,
report sale → 15% commission) against `/api/v1/reseller/*` on this platform.

---

## 6. Deploy procedure (how changes ship)

```
tar (exclude node_modules/.next/.git/.env) → scp vps:/tmp/s.tgz
→ extract /var/www/app (keep .env) → compose build app-web
→ [only if schema.prisma changed] prisma db push  ← see below, NOT automatic
→ compose up -d --force-recreate app-web
```
**The schema step is manual.** Nothing applies it for you: the Dockerfile runs
`prisma generate` (client only) then `npm run start`, and there is no entrypoint
script. An earlier version of this document claimed `prisma migrate deploy` ran
in the container entrypoint — it does not, and never did.

Before pushing a schema change, print the exact SQL it would run and check it is
additive:

```
docker run --rm --network app_default -v /tmp/new-schema.prisma:/s.prisma   node:22-alpine npx --yes prisma@6 migrate diff   --from-url "$DATABASE_URL" --to-schema-datamodel /s.prisma --script
```
If that prints any `DROP`, stop — `db push` reconciles the database *to* the
schema file, so a model missing from `schema.prisma` is a dropped table. Then:

```
bash /var/www/app/backup.sh          # always, before a schema change
docker run --rm --network app_default -e DATABASE_URL=... --entrypoint sh   app-app-web -c "cd /repo && npx prisma db push   --schema packages/db/prisma/schema.prisma --skip-generate"
```
The PWA `/api/version` build id + `PWARegister` poll auto-reload every client after a
deploy. No client action needed.

---

## 7. Security / rotation (recommended)

- Rotate the central super-admin password (currently the bootstrap value) and the
  mailbox password from their bootstrap values.
- Confirm `.env` is `600` and never in git (the deploy tar excludes it).
- Optional mail hardening: DMARC `p=reject`, DANE/TLSA, BIMI.

---

## 8. Housekeeping — old hub containers (needs your OK)

The legacy `unskinned-hub` containers (`unskinned-hub-app-1`, `-postgres-1`,
`-redis-1`) serve nothing now — Caddy `passive` → `app-web`. To reclaim the RAM/CPU:
```
docker compose -p unskinned-hub stop          # reversible
# or, in /var/www/unskinned-hub:
docker compose down                            # removes containers + network, keeps the data volume
```
Left for you to run since it removes a database workload.

---

## 9. Final verification checklist

- [ ] `passive` DNS added → `https://passive.example.com` 200
- [ ] Stripe test webhook → 200 + `PaymentTransaction` row
- [ ] `POST /api/central/push/test` → `sent` > 0 from a registered device
- [ ] Mobile build installs + receives a test push
- [ ] Reseller PRs opened on the product repos
- [ ] Admin + mailbox passwords rotated
