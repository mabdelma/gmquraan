# Implementation status

> Requirement → code → test traceability. A row is only Done when every column
> the build contract requires is filled. Mocks, placeholders and TODOs do not
> count, per `CLAUDE.md`.

Updated 11 August 2026.

## Wave 0 — Baseline

| Item | Output | Status |
|---|---|---|
| Spec pack read | 48 files under `APP_Core_Developer_Exact_V2/` | Done |
| Mechanical baselines | `scripts/discovery.mjs` → DB / API / DEPENDENCY / TEST | Done |
| Architecture | `docs/generated/CURRENT_STATE_ARCHITECTURE.md` | Done |
| Feature inventory | `docs/generated/FEATURE_INVENTORY.md` | Done |
| Fit-gap, 21 domains classified | `docs/generated/FIT_GAP_MATRIX.md` | Done |
| Permission baseline | `docs/generated/PERMISSION_BASELINE.md` | Done |
| Waves | `docs/generated/IMPLEMENTATION_WAVES.md` | Done |
| Decisions | `docs/generated/DECISION_LOG.md` | Done |

## Wave 1 — in progress

| Slice | Req / Test ID | Schema | Domain | API | Authz | Audit | UI | Tests | Status |
|---|---|---|---|---|---|---|---|---|---|
| 1.3a Company scope axis in the domain layer | IAM-01, SEC-T001 | n/a (reuses `entityId`) | `packages/gmos/src/access.ts` — `Viewer.companyIds`, `withinCompanyScope`, gate at the top of `canRead` | — | ✅ enforced above role, clearance, ownership and access list | — | — | `packages/gmos/src/__tests__/company-scope.test.ts` — 10 cases | **Partial** — see below |
| 1.1 `Company`/`BusinessGroup` rows | ORG-01, UX (editable) | `Company`, `BusinessGroup`, `Branch.companyId` — additive, 0 destructive | `packages/gmos/src/company.ts` | `api/admin/companies` (create/update/delete/group) | ✅ `isGroupWide` server-side; page check is presentation only | ✅ `AuditLog` before→after on every mutation | `/admin/companies` editable, linked from `/admin` | `company.test.ts` — 31 cases | **Done** |
| 1.2 Company scope enforced, fail-closed | IAM-01, SEC-T001 | reuses `entityId` | `companyScopeFor` + fail-closed `withinCompanyScope` | `toViewer` (the only construction site) | ✅ in force | — | — | 15 cases; 1 pre-existing fixture corrected | **Done** |
| 1.4 Unified audit event | AUD-01 | `AuditEvent` — 0 destructive | `packages/gmos/src/audit.ts` redaction + diff + scope | `recordAudit` / `auditData` helpers | ✅ `canReadAudit`, filtered per row | ✅ is the audit | `/admin/audit`, filterable | `audit.test.ts` — 21 cases | **Done** |
| 1.5 Workflow definition engine | WF-01 | | | | | | | | Not started |
| 1.6 Adopt `prisma migrate` | D-002 → D-011 | squashed baseline, 76 tables, applied | — | — | — | — | — | — | **Done** — `migrate status`: up to date; `migrate diff`: no difference |
| 1.9 Finish multi-tenancy | ORG-01 | | | | | | | | Foundation only |

### Why 1.3a is Partial and not Done

The gate is implemented and tested, and it correctly refuses cross-company reads
for group-wide roles, owners, reporting lines and named access lists. It is
**not** yet in force, because a `Viewer` built without `companyIds` is treated as
unscoped and passes — which is every `Viewer` the applications construct today.

That transitional default is documented in `access.ts`, asserted by a test so it
cannot change silently, and closed by slice 1.2. Reporting this as Done would be
claiming an enforced boundary that is not enforced in production.

## Test position

| | Gate 0 start | Now |
|---|---|---|
| `@app/core` cases | 355 | 449 |
| Cross-company security tests | none | 15 |
| Company/org rules | none | 31 |
| Audit rules | none | 21 |
| Workflow rules | none | 30 |

## Wave 1 remaining

| Slice | Status |
|---|---|
| 1.5 Workflow definition engine (WF-01) | **Done** — engine (30 tests), persistence, service layer, 4 seeded chains, `/approvals` inbox and `/api/workflow/decide`. Runs end to end. |
| 1.9 Multi-tenancy: resolution, client cache, control plane | **Done bar DNS** — proven on the deployed system with Host headers |
| 1.6 Adopt migrations | Blocked on D-011 |

## Verified on the deployed system

Wave 1.1 was driven in a real browser against production, not asserted:

- four companies seeded from `ENTITIES`, all four listed on `/admin/companies`
- `ORG-ES` code and base currency render read-only (3 records scoped to it); `ORG-UAE` stays editable (0 records)
- a legal-name edit saved and persisted
- **the currency refusal holds with the UI guard removed** — the field's `readonly`
  was stripped in the browser and the form submitted with `USD`; the server
  refused and the database still reads `EUR`. The screen guard is a convenience;
  the control is server-side, which is the property that matters
- the test wrote an invented legal form onto a real entity and it was reverted,
  with the reversal recorded in `AuditLog`

## Still absent, from `tests/QUALITY_GATES.md`

- event idempotency tests — no event bus yet
- e2e / UI tests — Playwright is used ad hoc in `infra/audit/`, not as a suite
- API contract tests against `api/openapi/app-core.openapi.json`
- migration validation — no migrations to validate yet (D-002)


## Operational finding — two-person disposal has no slack

`record_disposal` needs two distinct authorisers at A3 or above. Against the
real directory that is satisfiable and only just: three people hold A3+, one of
whom is usually the person raising the request.

| Person | Level |
|---|---|
| Amira Ibrahim Mokhtar | A3 |
| Neveen Ahmed Attia | A3 |
| Mohamed Khedr Abdelmaged | A4 |

If either A3 is unavailable, a disposal cannot complete — and neither has ever
signed in. This is a staffing observation, not a defect: the control is doing
what it was asked to. Widening the target or granting a third person A3 is a
decision for the owner.


## Wave 1.9 — verified on the deployed system

Tenant resolution reads nothing but the `Host` header, so it was exercised with
one. That tests the entire path except the name lookup, which is the only part
DNS contributes.

| Case | Result |
|---|---|
| `acme.` with an ACTIVE tenant | `resolvesTo: tenant`, schema-bound client created |
| `acme.` SUSPENDED | `resolvesTo: tenant`, `readOnly: true` — readable, not dark |
| `acme.` CLOSED | falls back to host, not served |
| `acme.` with no such tenant | falls back to host |
| `workforce.`, `central.`, `core.` | host portal, unchanged |
| `evil.attacker.test`, `a.b.…` | host portal |
| tenant row edited to `schemaName = public` | **connection refused**: *"public is not a schema name this system generated"* |

The last row is the one that matters. Even with the control plane itself
compromised, a schema name the system did not generate cannot reach a connection
string.

Verification tenant and schema removed afterwards; `migrate diff` reports
*No difference detected*.

**Outstanding: the wildcard DNS record.** Re-checked against both authoritative
nameservers and three public resolvers — absent. Everything above works the
moment `anything.example.com` resolves.


## Wave 2.1 — Finance foundations (FIN-01)

| | |
|---|---|
| Domain | `money.ts` (exact bigint arithmetic at scale 4), `ledger.ts` (chart of accounts, balanced postings, period locks, reversal) |
| Tests | 44 — including `0.1 + 0.2`, a 1,000-item sum, allocation remainders, and a reversal netting its original to zero |
| Migration | `20260812030000_general_ledger` — applied with `migrate deploy` |
| Schema | 4 × `numeric(18,4)` verified in production, **0 float columns** |
| Money rule | D-001 honoured end to end: no JavaScript number touches an amount |

### Deliberately not done

**No chart of accounts is seeded.** Which accounts a company needs is an
accounting decision. The structure is here and accounts can be created; the
content is the owner's, the same way payroll rules are.

### Verified on the deployed system

Driven through the real screen, not asserted:

| Attempt | Result |
|---|---|
| entry one cent out | *"debits exceed credits by 0.01 EUR"* |
| amount with 5 decimal places | *"has more than 4 decimal places"* |
| debit and credit on one line | *"put an amount on one side, not both"* |
| balanced entry | posted |
| reversal | posted, both entries linked |

The first message was wrong on the first run — it printed the raw bigint, so one
cent out read as *"differ by 100"*, which sends somebody hunting a hundred-euro
error. Fixed and re-verified. Verification accounts and postings were removed
afterwards; the ledger is empty.

### Still to build in FIN-01

AR, AP, bank and cash, reconciliation, tax configuration packs, accruals and
prepayments, fixed assets, multi-currency revaluation, budgets, consolidation
and the financial statements. The ledger they all post to now exists and
enforces its invariants.


## Wave 2.2 — Receivables and payables (FIN-01)

One module and one table for both. A customer invoice and a supplier bill are
the same shape pointed in opposite directions; `side` decides which. Splitting
them means two implementations of part-payment and only one stays correct.

| | |
|---|---|
| Domain | `receivables.ts` — issue, totals, tax per line, allocation, aging, void, posting |
| Tests | 28 (535 total) |
| Migration | `20260812040000_receivables_payables` — 3 tables, 6 × `DECIMAL(18,4)`, 0 floats |
| Chart | starter chart seeded for all 4 companies — **100 accounts**, editable |

### Refusals, not conventions

- a negative price belongs on a credit note, not an invoice
- over-allocation is refused, not absorbed
- the same `paymentRef` cannot be allocated twice — enforced in the domain **and**
  as a unique constraint, so a redelivered webhook cannot double-count even if
  the service check is bypassed
- an invoice with a payment against it cannot be voided
- tax is computed per line and summed, never on the summed total

### Decisions taken rather than blocked on

**The starter chart.** Small, editable, marked in the file and on screen as a
starting point rather than accounting advice; nothing in the domain refers to
the codes. A long invented chart would be harder to correct than an empty one.

**Tax rates are still not invented.** Supplied per line, never decided in code.
D-003 covers tax as much as payroll.

### Not yet built

Service layer, routes and screens for AR/AP — the domain, schema and migration
are live but nothing calls them yet, so this is **Partial**, not Done.
