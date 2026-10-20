# Unskinned

A brand-neutral monorepo template: a multi-tenant Next.js platform with Fastify
microservices, a shared Postgres schema via Prisma, a realtime AI advisor, and a
Caddy + Docker deployment. Built with
[npm workspaces](https://docs.npmjs.com/cli/v11/using-npm/workspaces).

**There is no brand in this repository.** Every company name, logo, photograph,
address, phone number, registration number and domain is a neutral placeholder.
Rebranding is an edit to two content files and a set of image assets — see
[§9](#9-rebranding) — not a hunt through the codebase.

---

## 1. Architecture at a glance

One typed monorepo containing three **Next.js apps**, a set of **Fastify
microservices** behind them, a shared **PostgreSQL** database via Prisma, and a
**Caddy + Docker** deployment that serves several hosts from one codebase via
**host-based multi-tenancy**.

```
Browser ──TLS──▶ Caddy (host-based routing)
                   ├─ example.com            → app-web       (marketing + marketplace + dashboards)
                   ├─ central.example.com    → app-web       (/central admin console)
                   ├─ passive.example.com    → app-web       (/hub partnership hub)
                   ├─ workforce.example.com  → app-workforce (HR / org / finance)
                   └─ ai.example.com         → app-agent     (realtime AI advisor)

app-web (Next.js BFF) ──Prisma──▶ Postgres
        └──signed service JWT──▶ Fastify services (auth · catalog · billing · engagement · notifications · orchestrator)
```

## 2. Repository structure

```
.
├─ packages/
│  ├─ shared/  → @app/shared   # JWT (HS256), logger, HTTP helpers, cross-service DTOs
│  ├─ db/      → @app/db       # Prisma schema + client + migrations (shared by apps + services)
│  └─ core/    → @app/core     # domain core: org, tenancy, permissions, ledger, CRM, HR, workflow
├─ services/                   # Fastify microservices (one process each, /health + /ready)
│  ├─ auth/          # credentials, OAuth, JWT issuance, email-verify/reset tokens
│  ├─ catalog/       # listing / search
│  ├─ billing/       # payments, checkout, webhooks, coupons
│  ├─ engagement/    # saved items, demo requests, leads/CRM, alert cron
│  ├─ notifications/ # transactional email over SMTP, localized templates
│  └─ orchestrator/  # internal job coordination (not publicly routed)
├─ apps/
│  ├─ web/           # Next.js 15 App Router — public site, marketplace, dashboards, /central (UI + BFF)
│  ├─ workforce/     # Next.js — HR, org chart, approvals, assets, finance
│  └─ agent/         # Next.js — realtime AI voice advisor
├─ mobile/           # Capacitor wrapper (iOS/Android) loading the hosted PWA
├─ integrations/     # drop-in reseller client (TS + PHP) for sibling products
├─ infra/            # compose/, gateway/ (Caddy), monitor/, k8s/
└─ scripts/ , docs/ , ARCHITECTURE.md , DEPLOY.md
```

## 3. Tech stack

- **Language/build:** TypeScript everywhere, npm workspaces, shared `tsconfig.base.json`.
- **Web/UI:** Next.js 15 App Router, React Server Components (`force-dynamic`), Tailwind;
  the AI app uses Bootstrap 5 (dark).
- **Services:** Fastify, JWT (HS256) verified via `@app/shared`.
- **Data:** PostgreSQL + Prisma (`@app/db`).
- **AI:** OpenAI Realtime (voice, WebRTC) + Chat Completions (text advisor + translation).
- **Infra:** Docker Compose, Caddy (shared reverse proxy, host-based routing), VPS or k8s.

## 4. The web app (`apps/web`) — UI + BFF

Plays two roles: it renders the UI **and** is the backend-for-frontend.

- **Rendering:** mostly React Server Components that query Prisma directly and stream HTML;
  `"use client"` only for interactive bits (forms, AI widget, language switcher, dashboard shell).
- **Host-based multi-tenancy (`middleware.ts`):** one codebase serves several surfaces —
  `central.` → `/central`, `passive.` → `/hub`, apex → the public site. The middleware also does
  first-visit **locale detection** and forwards `x-pathname` so the layout hides marketing chrome
  on app routes.
- **Route handlers (`/api/*`):** the BFF — advisor, contact, leads, central admin CRUD, the public
  reseller API (`/api/v1/reseller/*`), `devices/register`, `version`, inbound email, monitor alert.
- **Two session systems:** a client session (`app_session` JWT cookie, `getSessionUser()`) and an
  isolated **central-admin** session (host-only `app_admin` cookie on the `central.` subdomain,
  `getCentralAdmin()`).

## 5. Data model (Prisma / Postgres)

One Postgres, one schema. Key models: `User` (CLIENT/PARTNER/RESELLER/ADMIN/SUPER_ADMIN),
`Solution` (catalog item — category, license, price in cents, `partnerSharePercent`), `Review`,
`Lead`, `Agreement`, `Conversation`/`Message`, `PaymentTransaction`, `Coupon`, `Payout`,
`Partner` + `PartnerSale`, `ProductKey` + `ResellerSale`, `Setting` (key-value config),
`Translation` (LLM-translation cache), `DeviceToken` (mobile push), `PageView`, `AuditLog`,
`AgentUsage`, `AuthToken`.

## 6. Key subsystems

- **i18n:** static UI via typed `Record<Locale, …>` dictionaries (adding a locale is
  compile-time enforced) + **dynamic content** translated on-demand and **cached in the
  `Translation` table** (`lib/translate.ts`). One apex-scoped `app_locale` cookie shares the
  choice across all subdomains; RTL via `<html dir>`.
- **AI (three chains):** (1) **voice agent** — WebRTC to OpenAI Realtime, ephemeral token minted
  server-side, instructions built from the live catalog, function-calls rendered as visual tool
  cards; (2) **text advisor** (`/api/advisor`) — RAG (retrieve → ground) + multi-turn history +
  reply-in-language; (3) **translation** — cached batch translator.
- **Cross-product reseller:** the platform issues `ProductKey`s; sibling products call
  `/api/v1/reseller/{validate,sales,codes}` to apply codes and report sales (idempotent).
  Reusable client in `integrations/`.
- **Mobile (PWA + Capacitor):** installable PWA (manifest, network-first service worker, offline
  page, icons) wrapped by Capacitor (`mobile/`) loading the hosted site via `server.url`, with
  native push (`public/native-bridge.js` → `/api/v1/devices/register`). **Auto-update**:
  `/api/version` (Next build id) polled by the client → reloads on every deploy.
- **Ops:** cron health monitor with email alerts, first-party `PageView` analytics, `AuditLog`.

## 7. Local development

```bash
npm install                               # installs all workspaces (packages, services, apps)
cp .env.example .env                      # then set AUTH_SECRET, DATABASE_URL, OPENAI_API_KEY, etc.

npm run dev:infra                         # Postgres (docker compose)
npm --workspace @app/db run migrate       # apply migrations
npm --workspace @app/db run seed          # demo catalog + content
npm --workspace @app/db run generate      # generate the Prisma client

npm run dev:web                           # the web app    → http://localhost:3000
npm run dev:agent                         # the AI advisor → http://localhost:3001
npm run services:dev                      # the Fastify microservices (docker compose)
```

The web app reads the DB directly for its own pages/actions and calls the microservices over the
internal network via the `*_URL_INTERNAL` env vars (e.g. email through `notifications`). Marketing
pages render without any service running. Without `OPENAI_API_KEY`, the AI features fall back to
grounded responses and translations pass through in English.

## 8. Deployment

Docker Compose (project `app`, `infra/compose/docker-compose.prod.yml`) on two networks: `edge`
(public, shared with neighbouring products + Caddy) and `app_internal` (private). A shared
**Caddy** terminates TLS and routes by host — see `infra/gateway/` for the vhost templates
(`platform.caddy` for the primary stack, `tenant.caddy` for a second tenant on the same box).
Deploy = tar the repo → scp to the VPS → `docker compose build && up -d --force-recreate`
→ `prisma migrate deploy`. See [DEPLOY.md](DEPLOY.md).

## 9. Rebranding

Everything brand-bearing is deliberately confined to a short list:

| What | Where |
|---|---|
| Company name, contacts, registration, offices, leadership | `apps/web/src/lib/content.ts` |
| Headline copy, values, practice areas, page metadata | `apps/web/src/lib/brand-content.ts` |
| Portfolio imagery and captions | `apps/web/src/lib/gallery.ts` + `apps/web/public/img/` |
| Print roster for business cards | `scripts/card-roster.json` |
| Logos, favicons, app icons, splash screens | `apps/*/public/`, `mobile/resources/` |
| Public hostnames and TLS | `infra/gateway/*.caddy` |
| Container names, volumes, networks | `infra/compose/*.yml` (prefix `app-` / `app_`) |
| Package scope | `@app/*` in each workspace `package.json` |

Identifiers a real deployment must be able to prove — legal entity name, commercial register
number, tax number, licence number — are `null` in `content.ts`. The pages render an explicit
"not on file" state for a `null` rather than inventing a plausible-looking value, so an unfilled
field stays visible instead of silently shipping as fact. Fill each one in only once you hold
the documentary evidence.
