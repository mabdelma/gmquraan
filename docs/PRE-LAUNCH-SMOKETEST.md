# Unskinned — Pre-Launch Smoke Test

Run this right before go-live. **Part A** is automated (a script hits production and
checks every public surface). **Part B** is the short manual checklist for the flows
that need a real browser + login. Target: green on A, all boxes ticked on B.

---

## Part A — automated (run the script)

```bash
bash scripts/smoketest.sh
```

It verifies, against `https://example.com`:
- all public pages return `200` with a real render (no error page)
- protected routes correctly redirect to login (`307`), never leak
- APIs are gated (`401`/`403`) or validate input (`400`)
- the Stripe webhook rejects unsigned calls (`400`)
- the alert cron is locked down (`401`)
- PWA + SEO assets serve (`manifest`, `sw.js`, icons, `robots`, `sitemap`)
- security headers present; `X-Powered-By` absent
- all 11 locales render (Arabic `dir="rtl"`)
- host routing: `central.` → console, `passive.` → Hub
- the AI advisor answers a live question

**Pass criteria:** every line prints `OK`. Any `FAIL` is a launch blocker — fix or
accept before going live.

---

## Part B — manual (needs a browser + real accounts)

Do these once in a desktop browser and once on a phone.

### B1 — Auth & onboarding
- [ ] Sign up a fresh account → receive the verification email → verify → land on onboarding
- [ ] Pick a role in onboarding → reach `/dashboard`
- [ ] Log out → log back in
- [ ] "Forgot password" → receive reset email → reset → log in with the new password

### B2 — Client journey
- [ ] Browse `/marketplace`, open a solution detail page
- [ ] Save a solution → it appears on the dashboard
- [ ] Request a demo → it appears under "Demo requests"
- [ ] **Checkout (GROWTH plan)** → complete a **real** card on Stripe → return to success →
      confirm a `PaymentTransaction` row in `/central/revenue` and plan shows on the dashboard

### B3 — Partner / reseller
- [ ] Partner portal loads; create a solution draft
- [ ] Reseller page shows code + share link; copy buttons work
- [ ] (Admin) publish the partner's solution → partner gets the push (if subscribed)

### B4 — Central admin
- [ ] Log in to `central.example.com`
- [ ] Overview stats load; revenue, leads, users, payouts pages render
- [ ] Enable notifications (🔔) → run `POST /api/central/push/test` → receive it
- [ ] Export a CSV (leads/transactions)

### B5 — Cross-cutting
- [ ] Switch language (incl. Arabic → layout flips RTL) on a few pages
- [ ] Install the PWA (Add to Home Screen) → opens standalone → offline shows the offline page
- [ ] AI advisor answers in the selected language
- [ ] Mobile: collapsible sidebar opens/closes; Esc closes the drawer; tables scroll, don't overflow

### B6 — Go/no-go gates (from the launch plan)
- [ ] Legal sign-off on the Spain governing-law + registered-entity change
- [ ] Stripe dashboard webhook points at `…/api/billing/webhooks/stripe`; live event → `200`
- [ ] Bootstrap admin + mailbox passwords rotated
- [ ] Decide on GM-SVOS / SMC-Kit (real listings, draft shells, or omit)

---

*Not covered here (post-launch): native push (FCM/APNs), load testing, screen-reader
walkthrough, enforcing CSP (currently report-only).*
