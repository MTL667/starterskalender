---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-06-17'
inputDocuments:
  - _bmad-output/planning-artifacts/prd-email-offboarding.md
  - _bmad-output/planning-artifacts/architecture-entra-mail-provisioning.md
  - docs/project-context.md
workflowType: 'architecture'
project_name: 'Starterskalender - Entra ID Email Offboarding'
user_name: 'Kevin'
date: '2026-06-17'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
43 FRs organized into 8 capability areas:
1. Offboarding Task Management (FR1-FR6): Auto-creation on exit date, button gating (Entra connection + Graph API health + RBAC), task lock, escalation
2. Pre-flight Checks (FR7-FR11): Graph API health, litigation hold detection, mailbox size validation, Teams ownership scan, departing-owner warning
3. OOO Template Configuration (FR12-FR15): Per function/entity templates, trilingual with variable substitution, preview, conditional visibility
4. Teams Ownership Transfer (FR16-FR20): Channel/group listing, member display, search-and-select new owner, sequential Graph API transfer, dedicated page
5. Offboarding Execution Flow (FR21-FR32): Fixed 11-step sequence, per-step Graph API operations, SSE progress, success checkmark
6. Error Handling & Recovery (FR33-FR37): Stop-at-first-error, retry from failed step, backend state persistence, reconnection recovery, manual rollback
7. Shared Mailbox Lifecycle (FR38-FR40): Maintain under original address, archive rename with date, 1-year deletion
8. Audit & Observability (FR41-FR43): Per-step audit logging, Graph API response storage, detailed state tracking

**Non-Functional Requirements:**
16 NFRs across 4 categories:
- Security (NFR1-4): RBAC enforcement with "mail_offboarding" permission, entity-scoped credential isolation, 12-month audit retention, task lock concurrency protection
- Performance (NFR5-8): <1s button response, <2s SSE delivery, <10s pre-flight checks, <5s Teams ownership page load
- Integration (NFR9-12): Graph API rate limit handling, error type differentiation (auth vs transient), 30s latency tolerance, Graph API v1.0
- Reliability (NFR13-16): Zero state loss on disconnection, defined recovery path at every failure point, independent lifecycle task execution, frontend-independent state machine

**Scale & Complexity:**

- Primary domain: Full-stack web (brownfield Next.js extension)
- Complexity level: Medium (extensive Graph API surface, but proven patterns reused)
- Estimated architectural components: 6 (offboarding engine, Teams transfer service, OOO template engine, pre-flight checker, offboarding API routes, Teams transfer UI)

### Technical Constraints & Dependencies

**Brownfield Platform (existing infrastructure to leverage):**
- All base infrastructure from provisioning feature is operational: GraphApiService, encryption module, SSE pattern, state machine pattern, error classification, EntraAppConnection model
- Existing Entra ID connections per entity — no new connection setup needed
- Existing RBAC model, audit logging, task system, cron pattern, dependency tasks
- UI framework: shadcn/ui, Tailwind CSS, Radix primitives

**External Dependencies:**
- Microsoft Graph API v1.0 (12 new endpoint operations for offboarding)
- Existing Entra ID app registrations (certificate-based auth already operational)

**Key Architectural Decision:**
- Separate `OffboardingEngine` alongside existing `ProvisioningEngine` (not a generic engine) — the flows have fundamentally different step counts, state transitions, and recovery semantics

### Cross-Cutting Concerns Identified

1. **Entity-scoped security** — Same pattern as provisioning: entityId required at every layer
2. **Error classification** — Reuse existing GraphApiError hierarchy (GraphAuthError, GraphTransientError, GraphRateLimitError)
3. **State machine consistency** — DB is source of truth, SSE is display layer (same pattern, new model)
4. **Audit completeness** — Every step logged with `entra.offboarding.*` action prefix
5. **Pre-flight gating** — New pattern: bundled pre-checks that determine button visibility and flow readiness
6. **Sequential Graph API execution** — 11 steps executed one-at-a-time with per-step state persistence (prevents rate limiting, enables precise retry)

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application — brownfield extension of existing Next.js 16 codebase.

### Starter Template Assessment

**Not Applicable — Brownfield Project**

This feature extends the existing Starterskalender application with the operational Entra ID Mail Provisioning infrastructure already in place. No project initialization or starter template is needed. The complete technology stack is established and the architectural patterns (GraphApiService, encryption, SSE, state machine) are proven in production.

### Established Technical Foundation

**Language & Runtime:** TypeScript 5 (strict mode), React 19, Node.js 20
**Framework:** Next.js 16 (App Router, standalone Docker output)
**Database:** PostgreSQL via Prisma 5 ORM (schema extension via `db push`)
**Authentication:** NextAuth 4 + Azure AD (Entra ID) SSO
**Authorization:** Role-based (5 roles) + entity-scoped Membership model
**UI:** shadcn/ui pattern + Radix UI primitives, Tailwind CSS 3, Lucide icons
**Validation:** Zod schemas at API boundaries
**i18n:** next-intl (Dutch + French)
**Azure Integration:** @azure/msal-node + Microsoft Graph client (operational)
**Deployment:** Docker on Easypanel, PostgreSQL

### Existing Patterns to Extend

- `lib/graph-api-service.ts` — extend with 12 new offboarding operations
- `lib/provisioning-engine.ts` — reference pattern for new `OffboardingEngine`
- `lib/encryption.ts` — reuse as-is (no changes needed)
- SSE endpoint pattern — replicate for offboarding status streaming
- Cron pattern under `/api/cron/` — add lifecycle management jobs
- Error classification hierarchy — reuse `GraphApiError` subtypes

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- OffboardingJob state machine storage (affects engine, recovery, audit)
- Offboarding engine step execution pattern (affects all 11 operations)
- Teams ownership transfer data persistence (affects retry semantics)
- Pre-flight check architecture (affects button visibility and UX)

**Important Decisions (Shape Architecture):**
- OOO template storage model (affects configuration UI)
- SSE endpoint for offboarding (reuse pattern, new instance)
- Shared mailbox lifecycle cron design (affects archive/delete timing)

**Deferred Decisions (Post-MVP):**
- Generic execution engine abstraction (potential refactor of provisioning + offboarding into shared pattern)
- Bulk offboarding queue architecture (Growth phase)

### Data Architecture

**Database:** PostgreSQL via Prisma 5 (existing) — extended with new models

**New Prisma Models:**

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `OffboardingJob` | Offboarding state machine per starter | starterId, state (enum), triggeredBy, startedAt, completedAt, currentStep, error, graphApiResponses (JSON), teamsOwnershipMapping (JSON), preFlightResults (JSON) |
| `OooTemplate` | OOO auto-reply template per function/entity | entityId, jobRoleId (nullable), templateNl, templateFr, templateEn, generalMailAddress |

**Offboarding State Enum:**
```prisma
enum OffboardingState {
  PENDING
  READY
  TEAMS_TRANSFER_PENDING
  EXECUTING_OOO
  EXECUTING_LOGIN_BLOCK
  EXECUTING_REVOKE_SESSIONS
  EXECUTING_CALENDAR
  EXECUTING_TEAMS_TRANSFER
  EXECUTING_GROUPS
  EXECUTING_FORWARDING
  EXECUTING_DELEGATES
  EXECUTING_SIZE_CHECK
  EXECUTING_CONVERSION
  EXECUTING_LICENSE_REMOVAL
  BLOCKED_AT_OOO
  BLOCKED_AT_LOGIN_BLOCK
  BLOCKED_AT_REVOKE_SESSIONS
  BLOCKED_AT_CALENDAR
  BLOCKED_AT_TEAMS_TRANSFER
  BLOCKED_AT_GROUPS
  BLOCKED_AT_FORWARDING
  BLOCKED_AT_DELEGATES
  BLOCKED_AT_SIZE_CHECK
  BLOCKED_AT_CONVERSION
  BLOCKED_AT_LICENSE_REMOVAL
  COMPLETED
  ROLLED_BACK
}
```

**Teams Ownership Mapping:** Stored as JSON in `OffboardingJob.teamsOwnershipMapping`:
```json
[
  { "groupId": "...", "groupName": "Finance Team", "newOwnerId": "...", "newOwnerName": "Maria" },
  { "groupId": "...", "groupName": "Project Alpha", "newOwnerId": "...", "newOwnerName": "Jan" }
]
```
Persisted before flow execution starts. On retry of step 5, mapping is re-read from DB — no re-selection needed.

**Pre-flight Check Caching:** Short-lived (5-minute) cache in `OffboardingJob.preFlightResults` (JSON). Refreshed on page load and before flow start. Fields: `litigationHold`, `mailboxSizeMb`, `teamsOwnerships[]`, `checkedAt`.

### Authentication & Security

**All decisions inherited from provisioning architecture:**
- RBAC: New permission `mail_offboarding` (separate from provisioning permission)
- Entity-scoped isolation: All queries include entityId via `requireEntityAccess()`
- Credential reuse: Existing `EntraAppConnection` certificates used for Graph API calls
- Audit: All actions logged with `entra.offboarding.*` prefix

### API & Communication Patterns

**Graph API Service Extension:**

New methods added to existing `GraphApiService` class:

```
GraphApiService (extended)
├── setOutOfOffice(entityId, userId, template) → void
├── disableUser(entityId, userId) → void
├── revokeSignInSessions(entityId, userId) → void
├── getUserCalendarEvents(entityId, userId) → CalendarEvent[]
├── cancelCalendarEvent(entityId, eventId) → void
├── getUserOwnedGroups(entityId, userId) → OwnedGroup[]
├── transferGroupOwnership(entityId, groupId, fromUserId, toUserId) → void
├── removeGroupMember(entityId, groupId, userId) → void
├── getUserMailRules(entityId, userId) → MailRule[]
├── deleteMailRule(entityId, ruleId) → void
├── getMailboxStatistics(entityId, userId) → MailboxStats
├── convertToSharedMailbox(entityId, userId) → void
├── removeLicense(entityId, userId, skuId) → void
├── checkLitigationHold(entityId, userId) → boolean
└── renameMailbox(entityId, userId, newUpn) → void
```

**SSE Endpoint:**

Route: `GET /api/offboarding/[starterId]/status`

Same pattern as provisioning SSE. Events:
```typescript
type OffboardingEvent = {
  state: OffboardingState
  step: number // 1-11
  totalSteps: 11
  message: string
  timestamp: string
  details?: {
    error?: { type: string; message: string; retryable: boolean }
    completedSteps?: string[]
  }
}
```

**New API Routes:**

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/offboarding/[starterId]` | GET | Current offboarding state |
| `/api/offboarding/[starterId]/preflight` | GET | Pre-flight check results (cached 5min) |
| `/api/offboarding/[starterId]/teams-ownership` | GET | Teams/groups owned by user |
| `/api/offboarding/[starterId]/teams-ownership` | POST | Save ownership mapping |
| `/api/offboarding/[starterId]/start` | POST | Trigger offboarding execution |
| `/api/offboarding/[starterId]/retry` | POST | Retry from failed step |
| `/api/offboarding/[starterId]/rollback` | POST | Manual rollback |
| `/api/offboarding/[starterId]/status` | GET | SSE stream |
| `/api/admin/ooo-templates/[entityId]` | GET | List OOO templates for entity |
| `/api/admin/ooo-templates/[entityId]/[jobRoleId]` | GET, PUT | Manage OOO template |
| `/api/admin/ooo-templates/[entityId]/preview` | POST | Render template preview |
| `/api/cron/offboarding-lifecycle` | GET | Archive rename + 1-year deletion |
| `/api/cron/offboarding-escalation` | GET | Escalate unhandled tasks |

### Frontend Architecture

**All decisions inherited from existing codebase. New decisions:**

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Teams ownership transfer | Dedicated page at `/admin/offboarding/[starterId]/teams` | Complex interaction requires full-page layout (not modal) |
| Offboarding status display | `useOffboardingStatus` hook with SSE subscription | Same pattern as `useProvisioningStatus`, new instance |
| Handle Mailbox button | Conditional render based on pre-flight checks server prop | Same pattern as Generate Mail button |
| OOO template editor | Extension of functions admin page | Conditional fields visible only when entity has app connection |

### Infrastructure & Deployment

**No new infrastructure decisions.** All existing patterns apply:
- In-process async execution (no external queue)
- Mutex: database-level task lock on OffboardingJob (unique active job per starter)
- Cron: two new routes following existing `/api/cron/` pattern with CRON_SECRET
- No new environment variables (reuses existing `ENTRA_ENCRYPTION_KEY`)

### Decision Impact Analysis

**Implementation Sequence:**
1. Prisma schema extension (OffboardingJob + OooTemplate models + enum)
2. GraphApiService extension (15 new methods)
3. Pre-flight check service (`lib/offboarding-preflight.ts`)
4. OOO template CRUD (API routes + admin UI)
5. Teams ownership transfer (API routes + dedicated page)
6. Offboarding engine with state machine (`lib/offboarding-engine.ts`)
7. SSE endpoint + `useOffboardingStatus` hook
8. Handle Mailbox button + execution flow UI
9. Cron extensions (lifecycle management, escalation)
10. Rollback capability

**Cross-Component Dependencies:**
- Offboarding engine depends on: GraphApiService + OffboardingJob model + OooTemplate + teamsOwnershipMapping
- Pre-flight checks depend on: GraphApiService + existing EntraAppConnection
- Teams ownership page depends on: GraphApiService.getUserOwnedGroups() + search endpoint
- All UI features depend on: corresponding API routes + RBAC with "mail_offboarding" permission
- Cron extensions depend on: OffboardingJob model + existing dependency task pattern

## Implementation Patterns & Consistency Rules

### Critical Conflict Points Identified

8 offboarding-specific areas where AI agents could make different choices, all resolved below. General naming/format patterns inherited from provisioning architecture.

### Naming Patterns

**Database Naming:**
- Models: PascalCase singular (`OffboardingJob`, `OooTemplate`)
- Fields: camelCase (`teamsOwnershipMapping`, `preFlightResults`, `generalMailAddress`)
- Enums: SCREAMING_SNAKE_CASE values (`EXECUTING_OOO`, `BLOCKED_AT_TEAMS_TRANSFER`)
- Relations: camelCase matching model name (`starter`, `entity`, `jobRole`)

**API Naming:**
- Routes: kebab-case (`/api/offboarding/[starterId]/teams-ownership`, `/api/admin/ooo-templates`)
- Route parameters: camelCase in brackets (`[starterId]`, `[entityId]`, `[jobRoleId]`)
- Cron routes: kebab-case under `/api/cron/` (`offboarding-lifecycle`, `offboarding-escalation`)

**Code Naming:**
- Lib modules: kebab-case (`lib/offboarding-engine.ts`, `lib/offboarding-preflight.ts`, `lib/ooo-template.ts`)
- Components: PascalCase (`HandleMailboxButton.tsx`, `OffboardingStatus.tsx`, `TeamsOwnershipTransfer.tsx`)
- Hooks: camelCase with `use` prefix (`useOffboardingStatus.ts`)
- Types: PascalCase (`OffboardingEvent`, `TeamsOwnershipMapping`, `PreFlightResult`)
- Constants: SCREAMING_SNAKE_CASE (`OFFBOARDING_STEP_COUNT`, `PREFLIGHT_CACHE_TTL_MS`)

### Structure Patterns

**New Files Organization:**

```
lib/
├── offboarding-engine.ts
├── offboarding-preflight.ts
└── ooo-template.ts

app/api/offboarding/[starterId]/
├── route.ts                    # GET current state
├── preflight/route.ts          # GET pre-flight results (cached)
├── teams-ownership/route.ts    # GET owned groups, POST save mapping
├── start/route.ts              # POST trigger execution
├── retry/route.ts              # POST retry from failed step
├── rollback/route.ts           # POST manual rollback
└── status/route.ts             # GET SSE stream

app/api/admin/ooo-templates/[entityId]/
├── route.ts                    # GET list templates
├── [jobRoleId]/route.ts        # GET/PUT template
└── preview/route.ts            # POST render preview

app/api/cron/
├── offboarding-lifecycle/route.ts
└── offboarding-escalation/route.ts

app/(authenticated)/admin/offboarding/[starterId]/teams/page.tsx

components/offboarding/
├── HandleMailboxButton.tsx
├── OffboardingStatus.tsx
├── PreFlightPanel.tsx
├── TeamsOwnershipTransfer.tsx
├── TeamsOwnershipRow.tsx
├── OooTemplateEditor.tsx
└── OooTemplatePreview.tsx

hooks/
└── useOffboardingStatus.ts
```

### Format Patterns

**API Response Format (same as provisioning):**

Success: Direct JSON response
```json
{ "id": "...", "state": "EXECUTING_TEAMS_TRANSFER", "step": 5, "totalSteps": 11 }
```

Error: Consistent error object
```json
{ "error": "LITIGATION_HOLD_DETECTED", "message": "Mailbox has active litigation hold.", "retryable": false }
```

**SSE Event Format:**
```
data: {"state":"EXECUTING_CALENDAR","step":4,"totalSteps":11,"message":"...","timestamp":"..."}
```

**Pre-flight Response Format:**
```json
{ "litigationHold": false, "mailboxSizeMb": 2300, "teamsOwnerships": [...], "checkedAt": "...", "allClear": true }
```

### Communication Patterns

**Audit Log Entries:**
- Action format: `entra.offboarding.{verb}` (e.g., `started`, `step_completed`, `blocked`, `rolled_back`)
- Metadata: `{ entityId, starterId, state, step, error }`
- Graph API responses stored in `OffboardingJob.graphApiResponses`, not in AuditLog

**Task Creation:**
- Task type: `offboarding_handle_mailbox` (auto-created on exit date entry)
- Escalation type: `offboarding_escalation` (created by cron near deadline)
- Assignment: User with `mail_offboarding` permission for the entity

### Process Patterns

**Offboarding Engine Step Execution:**
```
for each step in [OOO, LOGIN_BLOCK, ..., LICENSE_REMOVAL]:
  1. Write EXECUTING_{step} state to DB
  2. Push SSE event with step number
  3. Call GraphApiService method
  4. If success: continue to next step
  5. If error: Write BLOCKED_AT_{step} to DB, push error event, STOP
```

**Pre-flight Check Pattern:**
```
1. Check cache age (preFlightResults.checkedAt)
2. If stale (>5 min): refresh all checks in parallel via GraphApiService
3. Return bundled result with allClear boolean
4. Button visibility = allClear && entraConnected && graphApiHealthy && hasPermission
```

**Teams Ownership Transfer Pattern:**
```
1. Page loads: getUserOwnedGroups() → display list
2. Admin selects new owner per group (search-and-select)
3. Admin clicks "Confirm" → POST mapping to DB
4. Flow step 5 reads mapping from DB → executes sequentially
5. On retry: re-read same mapping → resume from last incomplete transfer
```

**OOO Template Rendering:**
```
1. Load OooTemplate for starter's jobRole + entity (fallback: entity default)
2. Replace variables: {voornaam}, {achternaam}, {algemeen_mailadres}
3. Set via Graph API: internalReply (NL) + externalReply (NL+FR+EN combined)
```

**Retry Pattern:**
```
1. Read state → extract step from BLOCKED_AT_{step}
2. Resume from that step (prior steps already succeeded)
3. Teams transfer: re-read mapping → resume from last incomplete transfer
```

### Enforcement Guidelines

**All AI Agents MUST:**
1. Use `GraphApiService` for all Graph interactions — never call Graph API directly
2. Include `entityId` in every offboarding query — no cross-entity data leakage
3. Write state to DB before pushing SSE event — DB is source of truth
4. Use `requireEntityAccess()` + check `mail_offboarding` permission on all endpoints
5. Use i18n keys for all user-facing strings — no hardcoded Dutch/French text
6. Follow existing error response format for API routes
7. Log all actions to AuditLog with `entra.offboarding.*` prefix
8. Execute Graph API calls sequentially within the offboarding flow (never parallel)

## Project Structure & Boundaries

### Complete New Directory Structure

```
prisma/
├── schema.prisma                              # + OffboardingJob, OooTemplate, OffboardingState enum
└── migrations/
    └── YYYYMMDD_add_offboarding/migration.sql

lib/
├── offboarding-engine.ts                      # State machine orchestrator (11 steps)
├── offboarding-preflight.ts                   # Pre-flight check bundler + cache logic
├── ooo-template.ts                            # Template loading, variable replacement, rendering
└── graph-api-service.ts                       # + 15 new methods (existing file extended)

app/api/
├── offboarding/
│   └── [starterId]/
│       ├── route.ts                           # GET current offboarding state
│       ├── preflight/route.ts                 # GET pre-flight checks (cached 5min)
│       ├── teams-ownership/route.ts           # GET owned groups, POST save mapping
│       ├── start/route.ts                     # POST trigger offboarding execution
│       ├── retry/route.ts                     # POST retry from blocked step
│       ├── rollback/route.ts                  # POST manual rollback
│       └── status/route.ts                    # GET SSE stream
├── admin/
│   └── ooo-templates/
│       └── [entityId]/
│           ├── route.ts                       # GET list templates for entity
│           ├── [jobRoleId]/route.ts           # GET/PUT specific template
│           └── preview/route.ts               # POST render template preview
└── cron/
    ├── offboarding-lifecycle/route.ts         # Archive rename (1 day) + delete (1 year)
    └── offboarding-escalation/route.ts        # Escalate unhandled tasks

app/(authenticated)/
└── admin/
    └── offboarding/
        └── [starterId]/
            └── teams/page.tsx                 # Full-page Teams ownership transfer

components/offboarding/
├── HandleMailboxButton.tsx                    # Conditional render based on pre-flight
├── OffboardingStatus.tsx                      # Real-time status with SSE
├── PreFlightPanel.tsx                         # Pre-flight check results display
├── TeamsOwnershipTransfer.tsx                 # Teams/groups list + owner selection
├── TeamsOwnershipRow.tsx                      # Single group row with owner picker
├── OooTemplateEditor.tsx                      # Admin: edit OOO template per function
└── OooTemplatePreview.tsx                     # Admin: preview rendered template

hooks/
└── useOffboardingStatus.ts                    # SSE subscription hook
```

### Architectural Boundaries

**API Boundaries:**

| Boundary | Scope | Auth |
|----------|-------|------|
| `/api/offboarding/[starterId]/*` | Per-starter offboarding actions | `mail_offboarding` + entity access |
| `/api/admin/ooo-templates/[entityId]/*` | OOO template management | `mail_offboarding` + entity access |
| `/api/cron/offboarding-*` | System lifecycle jobs | CRON_SECRET header |

**Service Boundaries:**

| Service | Responsibility | Depends On |
|---------|---------------|------------|
| `offboarding-engine.ts` | Execute 11-step state machine | GraphApiService, Prisma |
| `offboarding-preflight.ts` | Check readiness, cache results | GraphApiService, Prisma |
| `ooo-template.ts` | Load + render OOO template | Prisma (OooTemplate, Starter) |
| `graph-api-service.ts` | All Graph API communication | EntraAppConnection credentials |

**Data Boundaries:**
- `OffboardingJob` owns all offboarding state, results, and mapping data
- `OooTemplate` is entity-scoped, optionally role-specific — read-only during flow
- GraphApiService is stateless — caller manages persistence
- No direct Prisma queries in API routes — always through lib service functions

### Requirements to Structure Mapping

| Requirement Area | Files |
|-----------------|-------|
| Offboarding trigger & scheduling | Existing task system + `cron/offboarding-escalation` |
| Pre-flight checks | `lib/offboarding-preflight.ts`, `api/.../preflight`, `PreFlightPanel.tsx` |
| OOO configuration | `lib/ooo-template.ts`, `api/admin/ooo-templates/**`, `OooTemplateEditor.tsx` |
| Login block + session revocation | `offboarding-engine.ts` steps 2–3, `graph-api-service.ts` |
| Calendar cancellation | `offboarding-engine.ts` step 4, `graph-api-service.ts` |
| Teams ownership transfer | `api/.../teams-ownership`, `teams/page.tsx`, `TeamsOwnershipTransfer.tsx` |
| Group removal + forwarding + delegates | `offboarding-engine.ts` steps 6–8, `graph-api-service.ts` |
| Mailbox conversion | `offboarding-engine.ts` steps 9–11, `graph-api-service.ts` |
| Lifecycle management | `cron/offboarding-lifecycle`, `graph-api-service.ts` |

### Integration Points

**Internal Communication:**
- Offboarding engine → SSE via Response stream (same pattern as provisioning)
- Pre-flight panel → API route → GraphApiService (parallel checks)
- OOO template editor → Preview API → `ooo-template.ts` render function

**External Integrations:**
- Microsoft Graph API (15 operations via single authenticated GraphApiService)
- No new external services — all through existing EntraAppConnection

**Data Flow:**
```
HR sets exit date → Task created → Admin opens starter →
  Pre-flight checks (Graph API) → Cached in OffboardingJob →
  [If Teams owner] Admin maps new owners → Saved to OffboardingJob →
  Admin clicks "Handle Mailbox" → Engine starts →
    Step loop: DB write → SSE push → Graph API call → repeat →
  Completed → Cron (next day): rename mailbox →
  Cron (1 year): delete shared mailbox
```

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:** Alle technologiekeuzes (Next.js 16, Prisma 5, PostgreSQL, Graph API v1.0) zijn bestaand en bewezen. Offboarding engine hergebruikt identieke patronen als provisioning — geen conflicten.

**Pattern Consistency:** Naming, SSE, RBAC, en audit patronen identiek aan provisioning. Alleen nieuwe instanties (permission, event prefix, route paths).

**Structure Alignment:** Nieuwe bestanden volgen bestaande directory-structuur exact. Geen afwijkingen van projectstandaarden.

### Requirements Coverage ✅

| PRD Categorie | FRs | Status |
|---------------|-----|--------|
| Offboarding Task Management | FR1–FR6 | ✅ Cron + task system + RBAC + DB lock |
| Pre-flight Checks | FR7–FR11 | ✅ offboarding-preflight.ts + PreFlightPanel |
| OOO Configuration | FR12–FR15 | ✅ ooo-template.ts + API + editor |
| Teams Ownership Transfer | FR16–FR20 | ✅ Dedicated page + components + API |
| Execution Flow | FR21–FR32 | ✅ Engine + SSE + HandleMailboxButton |
| Error Handling & Recovery | FR33–FR37 | ✅ BLOCKED_AT states + retry/rollback |
| Shared Mailbox Lifecycle | FR38–FR40 | ✅ Cron lifecycle + rename + delete |
| Audit & Observability | FR41–FR43 | ✅ AuditLog + graphApiResponses JSON |

| NFR Categorie | NFRs | Status |
|---------------|------|--------|
| Security | NFR1–4 | ✅ RBAC + entity isolation + retention + lock |
| Performance | NFR5–8 | ✅ Async execution + SSE + caching |
| Integration | NFR9–12 | ✅ Sequential + error classification + Graph v1.0 |
| Reliability | NFR13–16 | ✅ Backend state machine + retry + cron |

### Gap Analysis

**No critical gaps.** Minor items (non-blocking):
- FR11 (warn on owner exit date): achievable via starter table lookup — no architecture change
- FR39 timing: dependency task with `scheduledFor: exitDate + 1 day` — existing pattern
- Bulk offboarding: deferred post-MVP

### Architecture Completeness Checklist

- [x] Project context analyzed (brownfield, Entra ID)
- [x] Scale and complexity assessed (per-starter, sequential)
- [x] Data models defined (OffboardingJob, OooTemplate, 27 states)
- [x] API routes specified (14 endpoints)
- [x] Graph API methods listed (15 operations)
- [x] Frontend components defined (7 + 1 hook)
- [x] SSE pattern specified
- [x] Naming conventions established
- [x] Process patterns documented
- [x] Enforcement guidelines listed (8 rules)
- [x] Complete file structure defined
- [x] Boundaries defined (API, service, data)
- [x] Requirements-to-structure mapping complete
- [x] All 43 FRs architecturally covered
- [x] All 16 NFRs architecturally covered

### Architecture Readiness Assessment

**Status:** READY FOR IMPLEMENTATION
**Confidence:** High — proven provisioning patterns reduce risk

**Implementation Priority:**
1. Prisma schema (OffboardingJob + OooTemplate + enum)
2. GraphApiService extension (15 methods)
3. Pre-flight check service
4. OOO template CRUD (API + admin UI)
5. Teams ownership transfer (API + page)
6. Offboarding engine + SSE
7. Handle Mailbox button + execution UI
8. Cron extensions (lifecycle, escalation)
9. Rollback capability
