# Feature inventory

> Hand-written, 11 August 2026. Every row cites where the capability lives.
> Generated companions: `DB_SCHEMA_BASELINE.md`, `API_BASELINE.md`.

## Platform

| Capability | Where | Models | Tests |
|---|---|---|---|
| Controlled documents, 8-state lifecycle, retention, legal hold, two-person disposal | `packages/gmos/src/lifecycle.ts`, `apps/workforce/src/app/documents`, `api/documents/*` | `ControlledDocument`, `DocumentEvent` | `rules.test.ts` |
| Repository folders: create, rename/move, delete, audit | `packages/gmos/src/folders.ts`, `api/repository/folders` | `RepositoryFolder`, `FolderEvent` | `folders.test.ts`, `folders-edit.test.ts` (42) |
| Content-addressed storage, dedup, digest-verified reads | `apps/workforce/src/lib/documents.ts`, `gmos/src/storage.ts` | — | `storage.test.ts` (19) |
| Required document packs per role, verification queue | `gmos/src/packs.ts`, `api/me/pack/[code]`, `api/hr/pack/[id]` | `EmployeeDocument` | `packs.test.ts` (22) |
| Access matrix: 17 zones × 15 roles × 5 clearances × relationship | `gmos/src/access.ts`, `permissions.ts` | — | `permissions.test.ts` (29) |
| Approvals with dual-authoriser support | `apps/workforce/src/app/approvals`, `api/approvals/[id]` | `ApprovalRequest`, `ApprovalDecision` | — |
| Autonomy matrix — what may run without a human | `gmos/src/autonomy.ts` | `AgentRun` | `agents.test.ts` (35) |
| TOTP second factor, recovery codes, enrolment QR | `gmos/src/totp.ts`, `lib/mfa.ts`, `api/mfa/*` | `TeamMember.totp*` | `totp.test.ts` (17) |
| Four sign-in paths converging on one post-auth step | `apps/workforce/src/lib/after-auth.ts` | `TeamSession`, `TeamLoginToken` | `imap-auth.test.ts` (7) |
| Console → portal SSO, 60s HMAC handoff | `apps/web/.../portal-handoff`, `apps/workforce/.../sso/[token]` | — | — |
| Org structure, reporting lines, entities | `gmos/src/org.ts`, `/org`, `/departments` | `Branch`, `Department`, `OrgPosition` | `org.test.ts` (27) |
| Multi-tenant domain rules (isolation not yet wired) | `gmos/src/tenancy.ts`, `packages/db/prisma/control.prisma` | `Tenant`, `TenantDomain`, `TenantBranding`, `TenantEvent`, `TenantMigration` | `tenancy.test.ts` (34) |
| Audit trails | six writers | `AuditLog`, `DocumentEvent`, `TaskEvent`, `FolderEvent`, `JmlEvent`, `DomainEvent` | — |
| Notifications, push, announcements | `lib/push.ts`, `api/announcements` | `Notification`, `DeviceToken`, `Announcement` | — |
| i18n, 11 locales incl. RTL | `lib/i18n.ts` all apps | `Translation` | — |
| Theming, light/dark, token system | `apps/*/src/app/globals.css` | — | `infra/audit/contrast-sweep.mjs` |

## HR

| Capability | Where | Models |
|---|---|---|
| Employee records, personal cards (read-only to staff) | `/me`, `api/me/card-request` | `EmployeeRecord`, `WorkforcePerson`, `CardChangeRequest` |
| Leave request, balance, working-day rules | `gmos/src/hr.ts`, `/leave`, `api/leave` | `LeaveRequest`, `LeaveBalance` |
| Joiner / mover / leaver; leaver revokes access in one transaction | `api/hr/jml` | `JmlEvent` |
| Compensation records and visibility policy | `gmos/src/compensation.ts`, `/hr/compensation` | `Compensation` |
| Training register | `api/hr/training` | `TrainingRecord` |
| Equipment issue and return | `/assets`, `api/hr/assets` | `Asset`, `AssetAssignment` |

## CRM and commercial

| Capability | Where | Models |
|---|---|---|
| Pipeline, stages as events | `gmos/src/crm.ts`, `/crm` | `Customer`, `Opportunity`, `OpportunityStageEvent`, `CrmActivity` |
| Leads, incl. from `core.` product page | `api/core/enquiry`, `/central/leads` | `Lead` |
| Marketplace: solutions, quotes, agreements, reviews | `apps/web/src/app` | `Solution`, `Quote`, `Agreement`, `Review` |
| Payments, payouts, coupons, partner/reseller sales | `api/billing/*` (Stripe) | `PaymentTransaction`, `Payout`, `Coupon`, `PartnerSale`, `ResellerSale` |

## AI

| Capability | Where | Models |
|---|---|---|
| Agent registry with per-agent scope and absolute prohibitions | `gmos/src/agents.ts` (557 lines) | `AgentRegistry`, `AgentRun` |
| Voice advisor with tool rendering | `apps/agent` | `AgentUsage` |
| Orchestrator tick | `services/orchestrator` | — |

## Product surface

| Capability | Where |
|---|---|
| Marketing site, marketplace, 11 locales | `apps/web` |
| Central admin console | `apps/web/src/app/central` (host-routed) |
| Partnership hub | `apps/web/src/app/hub` (`passive.` host) |
| **Unskinned Core product page** | `apps/web/src/app/core` (`core.` host) |
| Team portal (GM-OS) | `apps/workforce` |

## Not present

Finance/accounting (GL, AR, AP, COA, tax, multi-currency), procurement,
inventory, projects/construction/maintenance/job costing, delivery, fleet, farm,
consultancy, investment, attendance, payroll, recruitment, performance, and any
retrieval-based AI. See `FIT_GAP_MATRIX.md`.
