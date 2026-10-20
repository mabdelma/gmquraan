# Implementation waves

> Dependency-ordered plan, 11 August 2026. Derived from `FIT_GAP_MATRIX.md`.
> Wave order follows `APP_Core_Developer_Exact_V2/prompts/00_V2_MASTER_PROMPT.md`
> §19 with one documented deviation, recorded at the end.

Each slice is vertical: schema → domain → API/event → authorization → audit →
UI → tests → docs. A slice is not Done until `docs/generated/IMPLEMENTATION_STATUS.md`
records every one of those, per `CLAUDE.md`'s build contract.

## Wave 0 — Baseline *(complete)*

| Item | Output |
|---|---|
| Verify spec pack | 48 files read |
| Generate mechanical baselines | `scripts/discovery.mjs` → DB/API/DEPENDENCY/TEST |
| Architecture narrative | `CURRENT_STATE_ARCHITECTURE.md` |
| Classification | `FIT_GAP_MATRIX.md` |
| Security position | `PERMISSION_BASELINE.md` |
| This plan | `IMPLEMENTATION_WAVES.md` |

## Wave 1 — Platform foundations

Everything downstream inherits the scope axis, so it goes first. Nothing in
Wave 2+ is safe to build until company scope is enforced *server-side*.

| # | Slice | Req | Depends on | Notes |
|---|---|---|---|---|
| 1.1 | **`Company` / `BusinessGroup` as first-class rows** + `base_currency` | ORG-01 | — | Today entity is a string code. Backfill from the existing entity constants; keep the code as a natural key |
| 1.2 | **Authorization context carries company/branch/department/project** | IAM-01 | 1.1 | Extend `Viewer`; add `user_role_scope`. This is the change every later wave depends on |
| 1.3 | **Enforce company scope in `access.ts`** + cross-company test suite | IAM-01, SEC-T001 | 1.2 | Highest-value security work in the plan |
| 1.4 | **Unify audit** into one `audit_event` with before/after JSON + correlation ID | AUD-01 | — | Six parallel audit tables today; keep writers, add one reader |
| 1.5 | **Workflow definition engine** — code/version/trigger/stages/SLA/escalation as data | WF-01 | 1.2 | Existing state machines stay; they become the first registered definitions |
| 1.6 | **Migration history** — adopt `prisma migrate`, baseline the current schema | — | — | Decision item D-002 |
| 1.7 | **Runtime configuration + policy packs** | CFG-01 | 1.1 | Prerequisite for anything jurisdictional |
| 1.8 | **Retire the orphan trees** `web/`, `agent/`, `mobile/` | — | — | Stale duplicates; hazard while they remain |
| 1.9 | **Finish multi-tenancy**: resolution, client cache, provisioning | ORG-01 | 1.1 | Foundation already laid in `tenancy.ts` + `control.prisma` |

## Wave 2 — Enterprise domains

| # | Slice | Req | Depends on |
|---|---|---|---|
| 2.1 | Money representation decision, then chart of accounts + journals + GL | FIN-01 | 1.1, D-001 |
| 2.2 | AR / AP / bank / payments / allocation | FIN-01 | 2.1 |
| 2.3 | Period locks, controlled reversal, immutable posted history | FIN-01 | 2.1 |
| 2.4 | Procurement: vendor, PR, RFQ, PO + `PurchaseOrderApproved` | PROC-01 | 1.5 |
| 2.5 | Inventory: item, warehouse, stock movement, valuation | INV-01 | 2.4 |
| 2.6 | HR attendance, shifts, overtime + `AttendanceExceptionDetected` | HR-015..018 | 1.5 |
| 2.7 | HR salary structure, payroll run, validation, exception centre, **lock** | HR-021..027, 043..047 | 2.6, 2.1, D-003 |
| 2.8 | Recruitment: requisition → applicant → interview → offer → onboarding | HR-007..012 | 1.5 |
| 2.9 | Performance, KPI (weights total 100%), PIP | HR-028..031 | 1.5 |
| 2.10 | Sales contracts with value + variation history | SAL-01 | 2.1 |

## Wave 3 — Project / construction / maintenance / job costing

The largest single domain (PROJ-001..071) and the one the specification calls out
for end-to-end traceability.

| # | Slice | Req |
|---|---|---|
| 3.1 | Project master linked to customer/contract/company/branch | PROJ-001/002 |
| 3.2 | Cost codes + BOQ with immutable approved versions | PROJ-005/006 |
| 3.3 | Budget, and the committed/actual/forecast cost ledger | PROJ-009..012 |
| 3.4 | Cost attribution: labour (timesheet), material (stock movement), equipment, subcontractor — **idempotent**, one cost entry per source transaction | PROJ-013..020 |
| 3.5 | EAC/ETC, margin, cash position, health | PROJ-058/059 |
| 3.6 | Sites, daily reports (mobile-first), inspections, defects, snags | PROJ-029..033 |
| 3.7 | Handover, warranty, maintenance contracts and jobs | PROJ-034..040 |
| 3.8 | Change orders → contract revision | PROJ-021..024 |
| 3.9 | Billing, collection, profitability | PROJ-041..050 |

## Wave 4 — Sector systems

Delivery, Fleet & Logistics, Investment, Farm, Consultancy. Each is a full
BUILD; each reuses the Wave 1 platform and the Wave 3 costing ledger.

## Wave 5 — Unskinned Core AI and BI

| # | Slice | Req |
|---|---|---|
| 5.1 | Permission-aware retrieval: scope resolved **before** retrieval | AI-01 |
| 5.2 | Prompt/tool version records with allowlists and output schemas | AI-01 |
| 5.3 | Document intelligence over the existing controlled register | AI-01 |
| 5.4 | Forecasting, anomaly, risk — decision support only | AI-01 |
| 5.5 | Executive Command Center + HR Control Tower + Construction Control Tower | BI-01, UX-001 |
| 5.6 | Prompt-injection evaluation suite (AI-T001) | AI-01 |

## Wave 6 — Release

Migration utilities, UAT evidence, performance, security verification report,
backup/restore drill, cutover runbook.

## Deviation from the recommended order

§19 puts multi-tenancy nowhere explicit and places IAM in Wave 1. I have put
**1.9 finish multi-tenancy** in Wave 1 rather than later, because the isolation
model is already chosen and half-built; leaving it half-built while Wave 2 adds
finance and payroll tables would mean retrofitting the tenant boundary across a
much larger schema later. Recorded as decision D-004.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Company scope retrofitted across 70 existing models | High | Wave 1.3 first, with tests, before any new domain |
| `db push` cannot express data migrations | High | Wave 1.6 adopts migrations before finance data exists |
| Payroll/tax jurisdiction rules | High | Configurable policy packs only; never invented — D-003 |
| Duplicate canonical masters | Medium | Customer/Employee/Document already exist and are named in the fit-gap |
| Scale of the remaining build | High | It is 11 BUILD domains. Sequencing is honest, but the total is measured in engineer-months, not days |
