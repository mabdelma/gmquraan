# Unskinned — Microservices Architecture

A brand-neutral platform template built as a set of microservices behind a single gateway. The
reference domain shipped in this repository is a **digital-solutions marketplace**; the model is
deliberately generic enough to be remapped to another domain without restructuring the services.

## Service decomposition (bounded contexts)

| Service | Owns |
|---|---|
| **gateway** | Edge routing, TLS, path/host → service. JWT pre-check. |
| **auth** | Users, credentials, Google OAuth, JWT issuance, central-admin session, email verify/reset tokens. |
| **catalog** | Solutions (the marketplace), search (Postgres FTS), import/sync, demo/media refs. |
| **billing** | Plans, Stripe, Bizum, coupons, webhooks, transactions. |
| **engagement** | Saved solutions/searches, demo requests, leads/CRM pipeline. |
| **notifications** | Transactional email (Mailu/SMTP), saved-search alert cron, localized templates. |
| **agent** | Realtime AI Solutions Advisor, token-usage recording. |
| **web** | Presentation: marketing + client dashboard + partner portal + central admin (Next.js → gateway). |

## Domain remap

The domain model began life as a real-estate platform and was remapped wholesale. The mapping is
kept here because it explains the shape of the schema, and because it is the worked example to
follow when remapping the model again for your own domain.

| Original (real-estate) | This repository |
|---|---|
| Property | **Solution** (SaaS / launch kit / AI tool / productized service) |
| PropertyType | **SolutionCategory** (SAAS_PLATFORM, LAUNCH_KIT, AI_AUTOMATION, PRODUCTIZED_SERVICE, MARKETPLACE_SOLUTION, MARKET_ENABLEMENT) |
| ListingStatus (SALE/RENT) | **LicenseModel** (SUBSCRIPTION/ONE_TIME/REVENUE_SHARE) |
| Role BUYER/SELLER/… | **CLIENT/PARTNER/VENDOR/RESELLER** (+ ADMIN, SUPER_ADMIN) |
| ViewingRequest | **DemoRequest** (demo / consultation booking) |
| SavedProperty | **SavedSolution** |
| Agency / AgencyMember | **Partner / PartnerMember** (the vetted partner ecosystem) |
| Tour / Scene (360°) | **ProductDemo** (interactive product walkthrough) |
| Contract (SALE/LEASE/SERVICE) | **Agreement** (LICENSE/SUBSCRIPTION/SERVICE) |
| Review (PROPERTY/AGENT/AGENCY) | **Review** (SOLUTION/PARTNER/SERVICE) |
| AgentUsage + agent | **AI Solutions Advisor** + token metering |

## Cross-cutting
- **Contracts/shared:** `packages/shared` (`@app/shared`) — JWT verify/sign, DTO types, logger,
  HTTP helpers. Every service depends on it.
- **AuthN:** `auth` issues JWTs (HS256 over `AUTH_SECRET`); other services verify via
  `@app/shared/jwt`. The gateway does a cheap presence check; services do full verification.
- **Data:** start with a **shared Postgres**, one **schema per service** (`auth`, `catalog`, …).
  Split into per-service databases once boundaries are stable.
- **Sync comms:** internal HTTP over cluster DNS (`http://catalog.app.svc.cluster.local`).
- **Async comms (later):** an event bus (NATS/Redis Streams) for domain events —
  `demo.requested → notifications`, `payment.succeeded → billing/auth`, `coupon.redeemed → billing`.
- **Observability:** each service ships logs to stdout + Sentry; `/health` + `/ready` probes.

## Repo layout
```
apps/        # Next.js web + AI advisor
packages/
  shared/    # contracts, jwt, logger, http
services/
  auth/  catalog/  billing/  engagement/  notifications/  gateway/
infra/
  compose/   # local platform
  k8s/       # Kubernetes manifests
```

## Gateway routing (host/path → service)
```
example.com, app.*, central.*    → web (Next.js)
ai.example.com                    → agent
api.example.com/v1/auth/*         → auth
api.example.com/v1/catalog/*      → catalog
api.example.com/v1/billing/*      → billing
api.example.com/v1/engagement/*   → engagement
api.example.com/v1/notifications/*→ notifications  (internal-only in prod)
```
