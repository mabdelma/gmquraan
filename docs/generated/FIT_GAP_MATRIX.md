# Fit-gap matrix

> Hand-written classification, 11 August 2026, against
> `APP_Core_Developer_Exact_V2/requirements/`. Every EXISTING and EXTEND claim
> cites a file, model or endpoint that is in this repository today. Nothing is
> classified EXISTING on the strength of a name alone.

## Method

Each domain from `requirements/00_DOMAIN_CATALOG.md` is classified against
evidence found by searching the repository, not by assumption. Where a
specification group is partly met, the classification is the work still required
(EXTEND), and the "Existing evidence" column records what the extension builds on.

Classification meanings, per `CLAUDE.md`:

- **EXISTING** — implemented and working; no material change needed.
- **CONFIGURE** — capability present; needs configuration or seed data.
- **EXTEND** — substantial foundation present; needs new fields/rules/screens.
- **BUILD** — genuinely absent; must be built.
- **INTEGRATE** — requires an external system or another domain's contract.
- **DEPRECATE** — present but superseded; remove or replace.

## Summary

| Classification | Domains | Share |
|---|---|---|
| EXISTING | 2 | 9% |
| EXTEND | 7 | 33% |
| BUILD | 11 | 52% |
| INTEGRATE | 1 | 5% |
| DEPRECATE | 0 | — |

**The headline: the Platform/Core layer is largely present and in several places
exceeds the specification. The enterprise financial stack and all six sector
systems are genuinely absent.** This is a large BUILD, and saying otherwise
would be misreporting the repository.

---

## Platform / Core

| Req | Domain | Class | Existing evidence (repo) | Gap | Wave |
|---|---|---|---|---|---|
| ORG-01 | Organization & multi-company | **EXTEND** | `Branch`, `Department`, `OrgPosition`, `TeamMember`, `EmployeeRecord.entityId`; `packages/gmos/src/org.ts` (365 lines, reporting lines, entity list); `apps/workforce/src/app/org`, `/departments` | No `BusinessGroup`/`Company` first-class model — entity is a string code, not a row. No `base_currency`. Company scope is not yet enforced as an authorization axis. Tenant isolation designed (`docs/architecture/001-tenant-isolation.md`) but resolution/provisioning unbuilt | 1 |
| IAM-01 | Identity & access | **EXTEND** | `TeamMember`, `TeamSession`, `TeamLoginToken`, `AuthToken`, `User`; 15 roles in `config.ts` `GM_ROLES`; TOTP in `gmos/src/totp.ts`; `access.ts` zone×clearance×relationship; `permissions.ts` with absolute `cannot` | Spec's 15 role codes (`security/permissions_matrix.csv`) differ from `GM_ROLES` — needs mapping, not replacement. No `user_role_scope` (company/branch/department/project scope rows). Field-level salary restriction is role-based, not field-level | 1 |
| WF-01 | Workflow & approvals | **EXTEND** | `ApprovalRequest`, `ApprovalDecision` (dual-approver by design); `lifecycle.ts` doc+task state machines with enforced edges; `autonomy.ts` (208 lines) | No generic workflow *definition* engine — state machines are code, not configurable `code/version/trigger/stages/SLA/escalation/delegation` records per `workflows/WORKFLOW_RULES.md` | 1 |
| DOC-01 | Documents & knowledge | **EXISTING** | `ControlledDocument`, `DocumentEvent`, `RepositoryFolder`, `FolderEvent`, `EmployeeDocument`; content-addressed store `lib/documents.ts`; 8 lifecycle states with retention + legal hold + two-person disposal in `lifecycle.ts`; `folders.ts` 353 lines; `/repository`, `/documents` UI | Meets and exceeds DOC-01. Missing only object storage (currently local disk) and document *classification* taxonomy alignment | — |
| NOTIF-01 | Notifications | **EXTEND** | `Notification`, `DeviceToken`, `Announcement`; push via `lib/push.ts`; ntfy | No per-event subscription model, no digest, no escalation ties to workflow SLA | 1 |
| AUD-01 | Audit & activity | **EXTEND** | `AuditLog`, `DocumentEvent`, `TaskEvent`, `FolderEvent`, `JmlEvent`, `DomainEvent`, `OpportunityStageEvent`, `AgentRun` | Six parallel audit tables, no unified `audit.audit_event` with `before_json`/`after_json` as `data_dictionary.csv` requires. Correlation/request ID absent | 1 |
| CFG-01 | Configuration | **EXTEND** | `Setting`, `Translation`; `config.ts` transcribes controlled config as types | Config is compile-time constants, not runtime per-company configuration. Jurisdiction policy packs (payroll/tax) need a policy engine that does not exist | 1 |
| BI-01 | Analytics & command centre | **BUILD** | `PageView`, `/central/analytics`, `LiveRevenue` | No cross-company KPI model, no Executive Command Center (UX-001), no drill-down. Existing analytics is marketing traffic, not enterprise BI | 5 |

## Enterprise systems

| Req | Domain | Class | Existing evidence (repo) | Gap | Wave |
|---|---|---|---|---|---|
| FIN-01 | Finance & accounting | **BUILD** | `PaymentTransaction`, `Payout`, `Coupon`, `PartnerSale`, `ResellerSale`, Stripe wiring in `apps/web/src/app/api/billing` | This is marketplace payment collection, **not accounting**. No chart of accounts, journal, GL, AR, AP, bank/cash, reconciliation, tax packs, fixed assets, multi-currency, cost centres, period locks, consolidation. Money is `Int` cents; no `Decimal` | 2 |
| HR-01 | HR & workforce intelligence | **EXTEND** | `EmployeeRecord`, `EmployeeDocument`, `LeaveRequest`, `LeaveBalance`, `Compensation`, `TrainingRecord`, `Asset`, `AssetAssignment`, `JmlEvent`, `WorkforcePerson`; `gmos/src/hr.ts`, `packs.ts`, `compensation.ts`; `/hr`, `/leave`, `/assets`, `/me` | **Present:** HR-001/002/003/004/006/013/014/019/020/032/048 (partial). **Absent:** HR-007..012 recruitment, HR-015..018 attendance/shifts/overtime, HR-021..027 payroll/salary structure/commission/bonus **entirely**, HR-028..031 performance/KPI/PIP, HR-033..042 skills/planning/productivity/grievance/disciplinary, HR-043..047 payroll validation/lock/settlement, HR-050..059 analytics/AI | 2 |
| CRM-01 | CRM | **EXTEND** | `Customer`, `CustomerContact`, `Contact`, `Opportunity`, `OpportunityStageEvent`, `CrmActivity`, `Lead`; `gmos/src/crm.ts` (358 lines); `/crm` UI | Solid pipeline. Missing customer credit terms, segmentation, and the CRM↔Finance/Projects contracts | 2 |
| SAL-01 | Sales & contracts | **EXTEND** | `Agreement`, `AgreementDocument`, `Quote`, `Solution`, `PartnerSale` | No `sales.contract` with value/variation history; no link contract→project; no milestone billing terms | 2 |
| PROC-01 | Procurement | **BUILD** | *(none)* | No PR/RFQ/PO/vendor. `crm.vendor` in the reference DDL has no counterpart here | 2 |
| INV-01 | Inventory & warehousing | **BUILD** | *(none)* | No item, warehouse, stock movement, valuation | 2 |

## Sector systems

| Req | Domain | Class | Existing evidence (repo) | Gap | Wave |
|---|---|---|---|---|---|
| PROJ-01 | Project / construction / maintenance / job costing | **BUILD** | `Task`, `TaskEvent`, `lifecycle.ts` task states — generic work tracking only | Everything: project master, BOQ + versioning, cost codes, budget, committed/actual/forecast, EAC/ETC, labour/material/equipment/subcontractor costing, sites, daily reports, inspections, defects, snags, handover, warranty, maintenance, billing, cash, risk. PROJ-001..071 | 3 |
| DEL-01 | Delivery | **BUILD** | *(none)* | Entire domain | 4 |
| FLT-01 | Fleet & logistics | **BUILD** | *(none)* | Entire domain | 4 |
| INVEST-01 | Investment | **BUILD** | *(none)* | Entire domain | 4 |
| FARM-01 | Farm | **BUILD** | *(none)* | Entire domain | 4 |
| CONS-01 | Consultancy | **BUILD** | *(none)* | Entire domain | 4 |

## AI

| Req | Domain | Class | Existing evidence (repo) | Gap | Wave |
|---|---|---|---|---|---|
| AI-01 | Unskinned Core AI | **EXTEND** | `AgentRegistry`, `AgentRun`, `AgentUsage`; `gmos/src/agents.ts` (557 lines, per-agent scope + absolute prohibitions); `autonomy.ts` gate reasons; `apps/agent` voice advisor with tool rendering; `services/orchestrator` | **Governance is strong and largely satisfies `ai/AI_PROMPT_GOVERNANCE.md`** — agents already cannot hold prohibited capabilities, and gated actions record a reason. Absent: retrieval of any kind, so no permission-aware RAG, no document intelligence, no forecasting/anomaly/risk. No prompt/tool versioning records | 5 |
| — | External integrations | **INTEGRATE** | Mailcow, Stripe, OpenAI, ntfy, web push | Telematics (FLT), payment providers beyond Stripe, biometric attendance (HR-015) are all provider selections, not code decisions | 4–6 |

---

## Requirement-level detail: HR-01

Because HR is the largest EXTEND and the specification enumerates 61 groups, the
per-group classification is recorded rather than summarised.

| Group | Class | Evidence / gap |
|---|---|---|
| HR-001 Employee master | EXTEND | `EmployeeRecord`, `TeamMember`. No `employee_no` unique-per-company, no effective-dated employer |
| HR-002 Org structure | EXISTING | `org.ts`, `Department`, `OrgPosition`, `/org` |
| HR-003 Job positions | EXISTING | `OrgPosition` |
| HR-004 Contracts | EXTEND | `Compensation` holds pay; no `employment_contract` with effective dating |
| HR-005 Probation | BUILD | — |
| HR-006 Employee documents | EXISTING | `EmployeeDocument`, `packs.ts` required packs, verification queue |
| HR-007..012 Recruitment→onboarding | BUILD | No requisition, applicant, interview, offer |
| HR-013/014 Assets | EXISTING | `Asset`, `AssetAssignment`, `/assets` issue/return |
| HR-015..018 Attendance, shifts, overtime | BUILD | No attendance record at all |
| HR-019/020 Leave + balance | EXISTING | `LeaveRequest`, `LeaveBalance`, `hr.ts` working-day rules, `/leave` |
| HR-021..027 Payroll, salary structure, commission, bonus | BUILD | Entirely absent. **Jurisdiction rules must be configurable — see decision log** |
| HR-028..031 Performance, KPI, PIP | BUILD | — |
| HR-032 Training | EXTEND | `TrainingRecord` exists; no skills matrix or expiry |
| HR-033..042 Planning, productivity, grievance, disciplinary | BUILD | — |
| HR-043..047 Payroll validation, lock, settlement | BUILD | — |
| HR-048/049 Exit, access revocation | EXISTING | `JmlEvent` LEAVER closes sessions, burns tokens, suspends account in one transaction |
| HR-050..059 Analytics, AI, alerts | BUILD | — |
| HR-060 HR security | EXTEND | `compensation.ts` restricts pay visibility; no confidential-case role |
| HR-061 UAT | BUILD | — |

## What must not be repeated

Three canonical entities already exist and must **not** be duplicated when the
enterprise domains are built, per `CLAUDE.md` §9 domain ownership:

- **Customer** — `Customer` + `CustomerContact` (CRM owns it).
- **Employee** — `EmployeeRecord` + `TeamMember` (HR owns it).
- **Document** — `ControlledDocument` (Documents owns it).

Procurement's vendor, Inventory's item and Finance's accounts are new and have no
existing counterpart to reconcile with.
