# Unskinned — Dashboard UX Test Report

| | |
|---|---|
| **Scope** | All authenticated dashboards: Client (`/dashboard`), Partner (`/partner/*`), Reseller (`/partner/reseller`), Central Admin (`/central/*`) |
| **Build** | commit `135b162` (`main`) |
| **Date** | 2026-07-01 |
| **Method** | Heuristic UX evaluation (Nielsen) + WCAG 2.1 AA accessibility review + responsive/interaction inspection of the live shell & components |
| **Environment** | `https://example.com` (gating verified live; dashboard internals audited white-box) |

---

## 1. Executive summary

**Verdict: ✅ Strong, consistent dashboard UX with a focused set of accessibility/feedback gaps.**

All three dashboards share a single, well-engineered `DashboardShell` — a genuinely
responsive, collapsible sidebar with desktop icon-collapse and a mobile off-canvas
drawer. Navigation, theming, i18n, RTL, logout, and the language switcher are
consistent everywhere. Data tables are responsive, lists have empty states, and there
are route-level error/404 boundaries.

The gaps are **accessibility and loading-feedback**, not structure: low-contrast
secondary text, no visible keyboard-focus styles, no loading skeletons on slow dynamic
routes, and a few collapsed-sidebar/drawer a11y details. **8 findings (0 critical, 4
medium, 4 low).** None block use; the medium items should be addressed for WCAG AA and
perceived performance.

| Heuristic | Rating |
|---|---|
| Consistency & standards | ★★★★★ one shell, identical patterns across all dashboards |
| Navigation & wayfinding | ★★★★☆ active states, back links, collapsible nav; minor a11y naming |
| Responsiveness (mobile→desktop) | ★★★★★ off-canvas drawer, icon-collapse, `overflow-x-auto` tables |
| Visibility of system status | ★★★☆☆ **no loading states**; slow routes feel frozen |
| Accessibility (WCAG 2.1 AA) | ★★★☆☆ contrast + focus + names need work |
| Internationalisation | ★★★★★ 11 locales + RTL throughout the shell |
| Error prevention/recovery | ★★★★☆ error & 404 boundaries; error copy not localized |

---

## 2. What was evaluated

- **Client dashboard** (`/dashboard`) — welcome, role badge, saved solutions, demo
  requests, saved searches, change-password, push opt-in.
- **Partner portal** (`/partner`, `/partner/solutions/new`, `/partner/leads`,
  `/partner/earnings`, `/partner/reseller`, `/partner/api`).
- **Reseller dashboard** (`/partner/reseller`) — code, share link, redemptions,
  commission.
- **Central admin** (`/central` + revenue, payouts, users, mail, resellers, solutions,
  leads, analytics, audit) — the console shell, stat cards, data tables, managers.

All three are wrapped by the **same** `DashboardShell` (client/partner/central layouts),
which is the backbone of the consistency rating.

---

## 3. Strengths (verified)

- **One consistent shell** across every dashboard — same sidebar, header, footer,
  logout, and language switcher. Low cognitive load when moving between roles.
- **Genuinely responsive collapsible sidebar:** desktop chevron toggles full↔icon-only
  and the content reflows; mobile (<lg) uses an off-canvas drawer with a hamburger,
  backdrop, and tap-to-close. Pure React state + Tailwind — no heavy deps.
- **Active-route highlighting** (amber) with exact-match for home and prefix-match for
  sections.
- **Responsive data tables:** every table (page-level *and* the `UserManager`,
  `ProductKeyManager`, `MailManager` components) is wrapped in `overflow-x-auto` — no
  horizontal-scroll trap on mobile.
- **Empty states** on list views (leads, payouts, saved, demos).
- **Mobile-correct viewport:** `width=device-width`, `viewport-fit=cover` (safe-area /
  notch aware), theme color, Apple web-app meta.
- **Marketing chrome hidden** on app routes (`/central`, `/dashboard`, `/partner`,
  `/onboarding`) — dashboards aren't cluttered with the public nav/footer.
- **i18n + RTL everywhere:** nav labels localized in 11 locales; `dir="rtl"` for Arabic
  applies to the whole shell.
- **Back/return links** present across partner & central subpages ("← Dashboard").
- **Route-level boundaries:** `app/error.tsx` (with a *Try again* reset) and
  `app/not-found.tsx`.
- **Safe external links** (`target=_blank` + `rel="noopener noreferrer"`).

---

## 4. Findings & recommendations

### 🟠 UX-1 (Medium) — No loading states on slow dynamic routes
Every dashboard route is `force-dynamic` and several take 2–5 s to first byte (e.g.
`/central` ~4.6 s). There are **no `loading.tsx`** skeletons, so navigation shows a
blank/frozen view during the wait — poor *visibility of system status*.
**Fix:** add `loading.tsx` skeletons for the dashboard segments (`/central`, `/partner`,
`/dashboard`) and/or stream with `<Suspense>` around the heavy data sections.

### 🟠 UX-2 (Medium, WCAG 1.4.3) — Low-contrast secondary text
Secondary text uses `text-white/40` (102×) and `text-white/30` (8×) on the near-black
background — roughly **3.0–3.8:1**, below the **4.5:1** AA minimum for normal text.
(`text-white/50` ≈ 4.6:1 is borderline-OK.)
**Fix:** raise muted text to `text-white/60`–`/70` (or define a `--muted` token tuned to
≥4.5:1). Affects stat-card sublabels, table meta, hints across all dashboards.

### 🟠 UX-3 (Medium, WCAG 2.4.7) — No visible keyboard-focus indicator
No `focus-visible`/`focus:ring` styles in `globals.css` or the shell; keyboard users get
weak/inconsistent focus cues, especially on gradient buttons and sidebar links.
**Fix:** add a global `:focus-visible` ring (e.g. `outline` or `ring-2 ring-amber-400`)
and ensure it isn't suppressed on custom buttons/links.

### 🟠 UX-4 (Medium, WCAG 4.1.2) — Collapsed sidebar links lack accessible names
When the sidebar is collapsed (icon-only), nav links render just the emoji; the visible
label is removed and only a `title` tooltip remains. A `title` is not a reliable
accessible name, so screen-reader users hear only the emoji.
**Fix:** add `aria-label={item.label}` to each nav `Link`/`a` so the name survives
collapse.

### 🟡 UX-5 (Low, WCAG 2.1.2 / 2.4.3) — Mobile drawer: no focus trap or Esc-to-close
The off-canvas drawer closes on backdrop tap and link click, but doesn't trap focus
while open or close on `Escape`, and focus isn't moved into/returned from the drawer.
**Fix:** move focus to the drawer on open, trap Tab within it, close on `Escape`, and
restore focus to the hamburger on close.

### 🟡 UX-6 (Low, WCAG 1.3.1/3.3.2) — Forms lean on placeholders over `<label>`
Several forms convey field purpose mainly via `placeholder`, which disappears on input
and is unreliable for assistive tech (e.g. some `NewSolutionForm` fields).
**Fix:** pair every input with a persistent `<label htmlFor>` (visually hidden where the
design needs it).

### 🟡 UX-7 (Low) — Error boundary not localized / no home link
`app/error.tsx` is English-only ("Something went wrong") and offers only *Try again* —
no link back to the dashboard/home for an unrecoverable error.
**Fix:** localize the copy and add a secondary "Back to dashboard" link.

### 🟡 UX-8 (Low, WCAG 2.4.1) — No skip-to-content link
There's no "skip to main content" affordance to bypass the sidebar for keyboard users.
**Fix:** add a visually-hidden skip link that focuses `<main>`.

> **Housekeeping (not a UX defect):** `components/CentralNav.tsx` is dead code — it was
> superseded by `DashboardShell` and is no longer imported. Safe to delete.

---

## 5. Per-dashboard notes

- **Client `/dashboard`** — clear role badge + tailored action panel; saved/demos/searches
  with empty states; push opt-in + change-password inline. Minor redundancy: the page's
  "Browse" button duplicates the sidebar "🛒 Marketplace" item (harmless).
- **Partner `/partner/*`** — rich nav (new solution, leads, earnings, reseller, API,
  marketplace, messages, agreements); tables responsive; back links present.
- **Reseller `/partner/reseller`** — code/share-link/metrics layout is clear; copy-to-
  clipboard actions; commission disclaimer shown.
- **Central `/central/*`** — strong overview stat grid; revenue charts; manager tables
  (users/keys/mail) all responsive. Most affected by UX-1 (slowest routes) and UX-2/-3.

---

## 6. Sign-off

The dashboards are **well-structured, consistent, responsive, and fully internationalised
— fit for production**. The work needed is **accessibility + loading feedback**, not
re-architecture: addressing **UX-1 (loading states)**, **UX-2 (contrast)**, **UX-3 (focus)**,
and **UX-4 (collapsed names)** brings the dashboards to a clean WCAG 2.1 AA bar and
noticeably improves perceived performance.

*Out of scope (requires interactive/manual QA): real-device touch testing, screen-reader
walkthrough (NVDA/VoiceOver), and authenticated end-to-end task flows (create solution,
record payout, moderate review).*
