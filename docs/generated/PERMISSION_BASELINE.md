# Permission baseline

> Hand-written, 11 August 2026, against `APP_Core_Developer_Exact_V2/security/`.

## What exists

Authorization is **not** a role check. It is a matrix evaluated per record in
`packages/gmos/src/access.ts` and `permissions.ts`:

```
canRead(viewer, record) =
      zoneGrant(viewer.role, zoneOf(record))     // 17 zones × 15 roles
  AND clearance(viewer) >= record.confidentiality // 5 levels
  AND ( record is unrestricted
        OR viewer is named on it
        OR viewer owns / is assigned / requested it
        OR the subject reports to viewer )
```

### Roles — `packages/gmos/src/config.ts`

`BOARD, CEO, COO, DOC_CONTROLLER, CFO, CTO, ENTITY_GM, FUNCTIONAL_DIRECTOR,
MANAGER, PROJECT_MANAGER, EMPLOYEE, CONTRACTOR, EXTERNAL, AI_OPS, INFRA_ADMIN`

### Capabilities — `permissions.ts`

Per-role `allow` lists plus an absolute `cannot` list. The `cannot` wins over any
grant, which is what stops an agent identity being granted `approve`. Tested.

### Second factor — `gmos/src/totp.ts`, `apps/workforce/src/lib/mfa.ts`

RFC 6238, dependency-free, constant-time compare. Required for approvers,
group-wide roles and holders of elevated capabilities. A password-only session is
recorded `PENDING_MFA` and authenticates nothing but the right to finish signing in.

### Confidentiality — `config.ts`

`PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED, PRIVILEGED`. Restricted and above
additionally require a named owner and custodian.

### Compensation — `gmos/src/compensation.ts`

Pay is visible to the subject, to `CEO`/`CFO`, and to the finance department.
Deliberately excludes line managers as a class. **Unconfirmed policy — see decision log.**

## Gap against `security/SCOPING_RULES.md`

| Spec requirement | Status | Evidence / gap |
|---|---|---|
| Authorization context resolves user, roles, company_ids, branch_ids, department_ids, project_ids | **PARTIAL** | `Viewer` carries `id, role, approvalLevel, clearance, entityId, departmentId, reportIds`. No `company_ids[]`, no `branch_ids[]`, no `project_ids[]` |
| Company scope mandatory on tenant-sensitive records | **GAP** | `entityId` exists on records but is not enforced as an authorization axis — `access.ts` does not filter on it |
| Branch scope narrows company scope | **GAP** | `Branch` model exists; no scoping rows |
| Project/site scope narrows operational roles | **GAP** | No project domain yet |
| Confidential HR cases need explicit role | **GAP** | No `HR_CONFIDENTIAL` equivalent; no grievance/disciplinary records to protect yet |
| Salary/payroll field- or endpoint-level restriction | **PARTIAL** | Endpoint-level via `canSeeCompensation`; not field-level |
| Search/export/report/AI retrieval apply the same scope | **PARTIAL** | `searchDocuments` and `visibleDocuments` filter per row through the same rules — good. Exports and reports not audited for this |
| Object identifiers never bypass scope (BOLA/IDOR) | **PARTIAL** | `readableDocument(viewer, id)` re-checks after fetch — correct pattern. Not verified across all 148 endpoints |

## Role mapping — spec → repository

The specification's `permissions_matrix.csv` uses 15 role codes that do not match
`GM_ROLES`. They must be **mapped, not replaced**, since `GM_ROLES` is referenced
throughout the domain layer and the database.

| Spec role | Nearest existing | Action |
|---|---|---|
| GROUP_EXEC | `BOARD` | map |
| COMPANY_EXEC | `ENTITY_GM` | map |
| HR_ADMIN | `MANAGER` + PEO department | needs a real role |
| HR_CONFIDENTIAL | — | **BUILD** |
| PAYROLL_PREPARER | — | **BUILD** |
| PAYROLL_APPROVER | — | **BUILD** |
| MANAGER | `MANAGER` | exact |
| EMPLOYEE | `EMPLOYEE` | exact |
| PROJECT_MANAGER | `PROJECT_MANAGER` | exact |
| SITE_MANAGER | — | **BUILD** |
| PROCUREMENT | — | **BUILD** |
| WAREHOUSE | — | **BUILD** |
| FINANCE | `CFO` + FIN department | needs a real role |
| AUDITOR | — | **BUILD** |
| AI_SERVICE | `AI_OPS` | map — already has the right prohibitions |

## The critical security tests, and their current status

From `tests/test_catalog.csv`:

| ID | Scenario | Status |
|---|---|---|
| SEC-T001 | Company A user requests Company B employee by ID | **no test exists** |
| SEC-T002 | Manager opens confidential grievance without the role | **not applicable yet** (no such records) |
| SEC-T003 | AI asks for unauthorized company project | **not applicable yet** (no retrieval) |

`scripts/discovery.mjs` confirms no cross-company security test exists anywhere in
the repository. That is the single highest-priority test gap and is Wave 1 work,
because every later domain inherits the axis it protects.
