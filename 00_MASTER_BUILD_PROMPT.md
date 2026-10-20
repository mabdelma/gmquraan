# MASTER PROMPT — Build / Extend Unskinned Core End-to-End

You are the principal software architect, staff engineer, enterprise application engineer,
security engineer, QA lead and DevOps engineer responsible for completing **Unskinned Core**.

The repository contains an existing Unskinned Core implementation plus an authoritative specification pack.

## Your objective
Inspect the existing product, preserve sound existing capabilities, and configure/extend/build the missing
capabilities so Unskinned Core satisfies the entire specification pack as a production-grade enterprise platform.

## Critical premise
Unskinned Core already exists. Do NOT start by scaffolding a replacement application.
Do NOT assume the requested features are absent.
Do NOT introduce Odoo or an Odoo dependency.

## Step 1 — Read
Read, at minimum:
- `/CLAUDE.md`
- `/README.md` if present
- all files under `/specs`
- `/architecture`
- `/execution`
- existing repository architecture/docs
- manifests/package files
- schema/migrations
- APIs
- tests
- CI/CD and deployment configuration

## Step 2 — Inspect the real codebase
Map the actual product before modifying it.
Search for every major domain, workflow, permission mechanism, audit mechanism, data model and integration.

## Step 3 — Produce discovery outputs
Create all mandatory Gate 0 files described in `execution/00_DISCOVERY_GATE.md`.
For every requirement classify it:
EXISTING / CONFIGURE / EXTEND / BUILD / INTEGRATE / DEPRECATE.

Cite concrete file paths, symbols, DB tables and endpoints as evidence.

## Step 4 — Establish engineering baseline
Run existing install/build/lint/typecheck/tests.
Record failures that predate your work.
Fix blockers required for safe implementation.
Do not hide or disable quality gates to make the build green.

## Step 5 — Plan the complete implementation
Produce a dependency-ordered implementation plan with:
- epics and stories
- requirement IDs
- dependencies
- migrations
- API/events
- UI
- permissions
- audit
- tests
- rollout concerns
- risks

Prefer vertical slices that reach a usable end-to-end outcome.

## Step 6 — Implement
Continue through the implementation plan rather than stopping after analysis.

For each slice:
1. update schema/migrations
2. implement domain/service logic
3. implement API/event contracts
4. implement server-side authorization
5. implement audit
6. implement UI/mobile workflow where applicable
7. implement integrations
8. add tests
9. run relevant quality gates
10. update docs and traceability
11. commit logically if Git is available and repository policy permits it

Never use a mock/stub as the final implementation of a required production capability.

## Step 7 — Security and correctness
Explicitly test:
- cross-company isolation
- branch/project scoped access
- privilege escalation
- financial mutation controls
- file/document access
- export/report authorization
- AI retrieval authorization
- integration retry/idempotency

## Step 8 — AI
Implement AI only through the governed AI boundary.
Permission filtering happens before retrieval/tool use.
AI recommendations must expose evidence where appropriate.
Governed actions require normal workflow approval.

## Step 9 — Acceptance
Maintain machine/human-readable traceability:
Requirement -> Code -> Migration -> API/UI -> Test -> Release.

Do not call a phase complete until its Definition of Done is satisfied.

## Step 10 — Final delivery
Produce:
- deployment-ready builds
- migration scripts
- seed/reference configuration
- OpenAPI/contracts as applicable
- automated tests
- security verification report
- data migration utilities/templates
- deployment/runbook
- admin guide
- user-role guide
- release notes
- final requirements traceability
- known limitations and deferred items

## Decision rule
If a specification leaves a material product/business rule unknown:
- implement it as configuration when safely possible;
- otherwise record it as an explicit decision item rather than inventing a legal/accounting rule.

## Operating mode
Work autonomously through the plan. Do not repeatedly ask for permission for ordinary reversible engineering work.
Stop and request a decision only for genuinely blocking choices involving credentials, external paid services,
irreversible production actions, missing legal/accounting policy, or contradictory business requirements.

Start now with Gate 0 repository discovery, then proceed into implementation.
