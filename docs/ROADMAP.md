# Unskinned Investment Group — build roadmap

Where the web app stands, what is left, and the order to do it in.

Written 2026-08-14. It describes the state of the deployment on that date and
is meant to be edited as phases close — if something here contradicts the code,
the code is right and this file is stale.

---

## Where it stands today

Live on the VPS at **http://203.0.113.10:3600**, plain HTTP, no certificate.
Not yet on `https://tenant.example` — see Phase 0, which is the only thing
blocking that.

| | |
|---|---|
| Repo | `github.com/mabdelma/example` (private), branch `main` only |
| Old repo | kept as git remote `app` — nothing was deleted |
| VPS | `203.0.113.10` (Hostinger), ssh alias `vps` |
| App root | `/var/www/app` |
| Compose | `infra/compose/docker-compose.tenant.yml`, project `-p tenant` |
| Containers | `app-web`, `app-agent`, `app-workforce`, `app-orchestrator`, `app-auth`, `app-catalog`, `app-billing`, `app-engagement`, `app-notifications`, `app-postgres` |
| Host port | `3600` → `app-web:3000` |
| Databases | `tenant` (84 tables), `tenant_control` (5 tables) |
| Edge | shared Caddy `vps-prod-caddy-1`, vhost staged for apex + www |
| Mail | mailcow on the same box; `tenant.example` is its fifth domain |

**`/var/www/app` is untouched.** The two stacks share the machine, the Caddy
and the mailcow, and nothing else.

### Done

- Repo split from Unskinned, full history (the clone was shallow and
  had to be unshallowed before the first push would resolve).
- Second Docker stack, own Postgres, network and volumes, no port collisions.
- Brand identity: palette, typography, logo and icon set, licence and company
  details — all from the documents in `Unskinned/`.
- Homepage rebuilt as an investment group: hero, values, sectors, portfolio,
  chairman, about, careers.
- Arabic-first with working RTL; English shares the same components.
- `/projects`, `/media`, `/careers` routes exist with designed empty states.
- mailcow: domain, `info@` mailbox, `noreply@` alias, DKIM key, SAN entry.

### Not done — the honest list

As of the 2026-08-14 deploy, most of this roadmap is closed. What actually
remains is short:

- **Phase 0** — DNS. The domain still resolves to the parking IP
  `203.0.113.20`; it cannot be fixed from the codebase.
- **Phase 1** — photography. Needs real assets dropped into `public/img/`.
- **Phase 4** — sector detail pages and portfolio detail pages.
- **Phase 5** — the visual QA items that need eyes and a browser.
- **Phase 6** — the `Unskinned/` directory decision.

---

## Phase 0 — Go live · **blocking, not a code change**

Nothing else on this list matters to a visitor until this is done, and it
cannot be done from the codebase: it needs a signed-in session on the Tasjeel
control panel.

The domain resolves to `203.0.113.20`, a Tasjeel parking host. Change it in
**Manage DNS**, not the nameservers page — `ns5/ns6.tasjeel.ae` are already
correct and must not be touched.

| Type | Name | Value | Note |
|---|---|---|---|
| A | `tenant.example.` | `203.0.113.10` | **edit**, replaces the parking IP |
| A | `www` | `203.0.113.10` | **edit** |
| A | `mail` | `203.0.113.10` | add — mail host |
| MX | `tenant.example.` | pref `10` → `mail.tenant.example.` | **replaces** the existing `MX 0 tenant.example` |
| TXT | `tenant.example.` | `v=spf1 mx a:mail.tenant.example -all` | SPF |
| TXT | `dkim._domainkey` | the value mailcow generated | already created, selector `dkim` |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:info@tenant.example` | start at `none` |
| A | `central` `ai` `api` `workforce` | `203.0.113.10` | optional subdomains |

Two things that catch people:

- **The MX and the apex move together.** The current `MX 0 tenant.example`
  follows the apex A record, so repointing the apex without fixing the MX
  hands every message to a mailcow that will reject it.
- Put a trailing dot on `Exchange` and `Cname` values or the panel appends the
  domain twice.

Afterwards, the website comes up **on its own** — Caddy retries issuance every
minute for up to 30 days. Mail does not: mailcow's acme runs once a day, so
force it with

```sh
cd /var/www/mailcow && docker compose restart acme-mailcow
```

Then check the certificate is Let's Encrypt **production**. During the failed
attempts Caddy fell back to the staging CA, and a staging certificate is not
trusted by browsers.

---

## Phase 1 — Assets · unblocks the visual gap

The largest remaining difference between the live site and the brand reference
is photography. Everything visual is currently generated navy/gold line art in
`public/img/` — original, on-palette, 200KB for all eight files, and honest
about being illustration rather than a stock photo pretending to be the
company's own.

| Want | Drop in | Currently |
|---|---|---|
| Dubai skyline behind the hero | `public/img/hero-skyline.webp` | generated geometry |
| Six sector cards | `public/img/sector-{consumer,consulting,technology,realestate,logistics,agriculture}.webp` | generated line art |
| Chairman portrait | `public/img/chairman.webp` | supplied photo, cut from its studio background |
| Horizontal logo lockup | *(no slot yet)* | header pairs the roundel with live text |

Keep the same filenames and nothing else changes — the paths live in `SECTORS`
in `src/lib/brand-content.ts`. Target ~1920px wide for the hero, ~900×650 for
sector cards, WebP or AVIF.

The logo lockup is the one that needs a new slot: the reference header shows
the mark beside "Unskinned INVESTMENT GROUP" and مجموعة مام للاستثمار. Only the
circular roundel was supplied, so `BrandLogo` renders that plus real text.
Given the lockup file, `src/components/BrandLogo.tsx` is the only change.

### A note on the portrait

The cutout took two attempts. The studio backdrop is RGB 253 and the white
kandura is 246 — seven levels apart — so a 228 threshold flood-filled straight
into the robe and ate the shoulders. It is done at 249, seeded only from the
clean upper border. If the portrait is ever replaced, expect to retune that.
The face is never touched.

---

## Phase 2 — Copy · done 2026-08-14

Rewritten so no marketing page still describes Unskinned. The
`key` values on the service cards were left alone (they map 1:1 to the
`SolutionCategory` enum), but their titles and descriptions are new Unskinned copy.
`/about` no longer names the previous company's founder, `/blog` got a real
description, `/central/email-templates` got neutral transactional copy, and
`/privacy` + `/terms` now name the correct entity and jurisdiction.

| Page | What was fixed |
|---|---|
| `/about` | Rewritten for the group |
| `/services` | Cards' titles/descriptions rewritten; keys untouched |
| `/licence` | Untouched — activity list is legal, see below |
| `/blog` | Description replaced |
| `/central/email-templates` | Neutral transactional copy |
| `/privacy`, `/terms` | Correct entity + PDPL/EU jurisdiction |

`/licence` was deliberately left: `src/lib/licence-activities.ts` describes
activities from the licence document itself. If the text must change, it
changes on the licence, not in the frontend — no terminal edit can make a
regulator's copy say something else, and copying Unskinned' old list onto
Unskinned's licence would be the same fiction we just removed. A lawyer should
review `/privacy` and `/terms` before production.

## Phase 3 — Data models · done 2026-08-14

Three sections are built against real models and render designed empty states
because there is genuinely nothing to show. The database is empty: `Post` 0,
`Project` 0, `Vacancy` 0. Nothing is seeded — the brief forbids inventing
projects or roles, so an empty table renders an honest empty state until
someone publishes real content from the central console. On 2026-08-14 the
`Project` and `Vacancy` tables were pushed to production (CREATE-only diff,
no `DROP`).

### `/media` — wired to `Post`

Reads the existing `Post` model, so it needs no schema work. Publish a post
and it appears. Cover images, dates and excerpts are already handled.

### `/projects` — `Project` model + admin CRUD

`Project` lives in `packages/db/prisma/schema.prisma` (slug, title, summary,
body, sector, status PLANNED/ONGOING/COMPLETED, coverImage, published).
`/projects` renders a grid of published projects with the empty state when
none exist; `/projects/[slug]` renders the detail page. Admin authors content
at `/central/projects` (`ProjectManager` + `/api/central/projects`).

### `/careers` — `Vacancy` model + admin CRUD

`Vacancy` lives in `packages/db/prisma/schema.prisma` (slug, title, summary,
body, department, location, workMode ON_SITE/REMOTE/HYBRID,
type FULL_TIME/PART_TIME/CONTRACT/INTERNSHIP, published). `/careers` lists
published openings with the empty state when none exist; `/careers/[slug]`
renders the detail page with an apply-by-email block. Admin authors openings
at `/central/vacancies` (`VacancyManager` + `/api/central/vacancies`).

### Deployment

Both models are additive. The schema step is manual and nothing runs it for
you — see the schema-change box in `docs/DEPLOYING.md` before deploying the
routes that read the tables.

---

## Phase 4 — Remaining brief items

- **Contact form** — done. Navy/gold and RTL, posts to the existing API.
- **Map** — done. Static, with a deliberate privacy/CSP choice over an
  embedded third-party iframe. The registered office is Office 2103+2104,
  Khalid Abdul Rahim Ahmed Al Attar Building, Al Markaz Al Tijari 1.
- **Sector detail pages** — still open. Cards link to `/services#{slug}`. Real
  per-sector pages would want their own route and content.
- **Portfolio detail** — still open. The five companies are typographic cards.
  Logos and per-company pages need the companies to supply assets.

---

## Phase 5 — QA

Partly done in the 2026-08-14 pass: SEO titles/descriptions on the new routes,
`sitemap.ts` limited to the Unskinned surface (includes `/media`, `/projects`,
`/careers`), and a navy/gold Open Graph image. The items below still need a
browser and eyes — the one part of the project that cannot be done from a
terminal.

- **Responsive at 320 / 375 / 768 / 1200 / 1440.** Built to spec — logical
  properties throughout, grids that reflow rather than rows that scroll — but
  never seen rendered. Check the hero overlap, the values panel, the sector
  grid at `xl:grid-cols-6`, and the mobile off-canvas menu.
- **RTL sweep** beyond the homepage: forms, breadcrumbs, `/central`.
- **Contrast audit.** `infra/audit/contrast-sweep.mjs` exists — run it. The
  tokens were measured by hand (gold is 2.43:1 on white, which is why
  `--accent-text` is a deepened `#8F6412` at 5.25:1), but only the tokens.
- **Keyboard and focus states** across the new components.
- **Lighthouse** for the hero image weight and CLS.

---

## Phase 6 — Operations

- **Deploy key — done 2026-08-14.** `~/.ssh/example_deploy` (host alias
  `github-example`) is installed on the repo with write access and verified:
  `ssh -T github-example` authenticates as `mabdelma/example`, and
  `git pull origin main` works in `/var/www/app`. Deploys now use pull,
  not SSH push.

  ```sh
  # on the VPS
  cd /var/www/app && git pull origin main
  docker compose -f infra/compose/docker-compose.tenant.yml --env-file .env -p tenant up -d --build app-web
  ```

- **Port 3600 — deliberately left open (decision 2026-08-14).** Docker's
  iptables rules bypass ufw, so the app is reachable on plain HTTP with no
  certificate. The decision is to **keep both** paths: the domain once DNS
  lands **and** the `http://203.0.113.10:3600` debug door, so the mapping stays
  `"3600:3000"`. That is an accepted trade-off (unauthenticated plain HTTP on a
  public port); revisit it if the site ever serves sensitive data.
- **Secrets.** `AUTH_SECRET` and `POSTGRES_PASSWORD` are generated and set.
  Still empty in `/var/www/app/.env`, and silently no-ops until filled:
  Stripe, OpenAI, Google sign-in, SMTP, VAPID web push, `IMAP_HOST`.
- **Backups.** `backup.sh` runs nightly, and the deploy sequence takes one
  before a schema change. Take one **after** as well — see the note in
  `DEPLOY.md` about the restore test that came back missing a table created
  thirteen minutes after the backup. The 2026-08-14 `Project`/`Vacancy` push
  was backed up on both sides (before `2026-08-14-0417`, after
  `2026-08-14-0421`).
- **`.env.bak.1781959791`** — deleted 2026-08-14; `.gitignore` now covers
  `*.bak` and `Unskinned/`. The `Unskinned/` directory (scanned trade licence, personal
  photograph) is still untracked; decide whether it belongs in the repo.

---

## Open decisions

| Question | Current state |
|---|---|
| Contact details | Site shows `info@tenant.example` and the licence line `+1 555 555 0111`. The brand mockup shows `+1 555 555 0112` and `info@tenant.example`, which look like placeholders. WhatsApp is set to `+1 555 555 0110`. |
| Displayed name | **Resolved 2026-08-14:** the site displays `M A M INVESTMENT` everywhere — tab, nav, footer, PWA, Open Graph — dropping the licence's `L.L.C` suffix. The legal form is still stated on `/licence` via `LICENSE_DUBAI.legalForm` ("Limited Liability Company — Single Owner (LLC-SO)"). |
| Licence email | `LICENSE_DUBAI.email` deliberately keeps `consultancy@tenant-invoice.example` — the address printed on the document. `COMPANY.email` is what the site publishes. |

---

## How to deploy

```sh
# from a workstation — push to GitHub once
git push origin main

# on the VPS — pull and rebuild
cd /var/www/app
git pull origin main
docker compose -f infra/compose/docker-compose.tenant.yml --env-file .env -p tenant up -d --build app-web
```

The container build runs `next build`, which type-checks. It does **not** run
lint (there is no ESLint config in the tree) or the test suite — a green deploy
is not a green test run.

Docker only swaps the container on a successful build, so a failed build leaves
the previous version serving. That happened twice during the rebrand and caused
no downtime either time.

### Verifying

Check the **served HTML**, not the source:

```sh
curl -s http://203.0.113.10:3600/ | grep -c "Unskinned"
curl -s -H "Accept-Language: ar" http://203.0.113.10:3600/ | grep -oE '<html[^>]*>'
```

This matters more than it sounds. Three separate defects during the rebrand — a
type error, the nav wordmark, and a footer tagline — were all invisible to
grepping the files that were changed, and all three showed up immediately in
the served page. The footer one was never a brand string in the source at all:
it rendered `m.hero.eyebrow`.

Locally, `npx tsc --noEmit` is clean and `npx vitest run` passes all 108
tests across 11 suites (2026-08-14). If the workspace-package errors ever
return, filter by error kind, never by filename — filtering by filename is what
hid the type error.
