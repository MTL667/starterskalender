---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-06-04'
inputDocuments:
  - _bmad-output/planning-artifacts/prd-entra-mail-provisioning.md
  - _bmad-output/brainstorming/brainstorming-session-2026-06-04-0901.md
  - docs/project-context.md
workflowType: 'architecture'
project_name: 'Starterskalender - Entra ID Mail Provisioning'
user_name: 'Kevin'
date: '2026-06-04'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
48 FRs organized into 7 capability areas:
1. Tenant App Connection Management (FR1-FR11): Per-entity Entra ID app registration, certificate keypair generation/download, connection validation, consent status monitoring (pre-action + daily sweep), certificate expiry warnings, keypair regeneration
2. License Configuration (FR12-FR17): License type per job function (Business Basic/Standard), conditional visibility based on app registration, tenant-wide trickle-down policy with per-function override, temporary password complexity configuration, orphan notification on app removal
3. Mail Provisioning Execution (FR18-FR32): Generate Mail button with conditional visibility, real-time license check, trickle-down fallback with notification, M365 user creation + license assignment + mailbox wait, real-time status updates, success state (checkmark), temporary credentials display, conflict detection, mutex per starter
4. Provisioning Recovery (FR33-FR36): Retry from failure point, remove partially created user, state recovery after browser closure, timeout notification
5. License Intelligence (FR37-FR41): Cached license counts with periodic refresh, license demand calculation based on planned starters, auto-task for IT on shortage, Graph API status banner
6. Provisioning Lifecycle (FR42-FR45): Cleanup tasks on cancellation/entity change, entity migration settings inheritance, conditional button visibility on migration
7. Audit & Observability (FR46-FR48): Complete provisioning audit trail, Graph API response storage, detailed state tracking per starter

**Non-Functional Requirements:**
19 NFRs across 4 categories:
- Security (NFR1-7): Encrypted private key storage, secret-once pattern, certificate-based auth only, mandatory password reset, RBAC enforcement, entity-scoped credential isolation, 12-month audit retention
- Performance (NFR8-11): <1s button response, <2s status update delivery, <5min batch operations (50 tenants), <5s key generation
- Integration (NFR12-16): Rate limit handling, error type differentiation (auth vs transient), 30s API latency tolerance, Graph API v1.0 support, frontend-independent state machine
- Reliability (NFR17-19): Zero data loss on disconnection, defined recovery path for every failure, non-blocking daily checks

**Scale & Complexity:**

- Primary domain: Full-stack web (brownfield Next.js extension)
- Complexity level: Medium-High
- Estimated architectural components: 8 (Graph API service, certificate manager, provisioning engine, SSE endpoint, license intelligence service, cron extensions, DB schema extensions, UI components)

### Technical Constraints & Dependencies

**Brownfield Platform (existing infrastructure to leverage):**
- Next.js 16 (App Router, standalone Docker), TypeScript strict, React 19
- PostgreSQL via Prisma 5 ORM — schema extension via `db push`
- NextAuth 4 + Azure AD SSO — user identity already available in session
- RBAC model with HR_ADMIN, ENTITY_EDITOR roles + entity-scoped Membership
- @azure/msal-node + Microsoft Graph client already installed
- Existing audit logging (AuditLog model), task system (Task/TaskTemplate), cron pattern (/api/cron/)
- UI framework: shadcn/ui, Tailwind CSS, Radix primitives, Lucide icons
- Internationalization: next-intl (Dutch + French)

**External Dependencies:**
- Microsoft Graph API v1.0 (user creation, license assignment, license inventory, consent validation)
- Entra ID app registration (admin-managed, per tenant)
- Node.js crypto module for X.509 certificate generation

**Deployment Constraints:**
- Docker on Easypanel with PostgreSQL
- No migrations directory — uses Prisma `db push`
- Environment-based configuration via build args

### Cross-Cutting Concerns Identified

1. **Entity-scoped security** — Every operation (credential access, provisioning, configuration) must respect entity boundaries. Credentials for entity A must never be accessible from entity B context.
2. **Error handling taxonomy** — Graph API errors must be classified (auth failure vs transient vs rate limit) and each type must trigger different user communication and system behavior.
3. **Audit completeness** — Every provisioning action, Graph API call/response, and state transition must be logged for the 12-month retention requirement.
4. **State machine consistency** — The provisioning state machine is the source of truth across SSE connections, browser closures, retries, and concurrent access attempts.
5. **Credential lifecycle** — Certificate generation, storage, validation, expiry monitoring, and regeneration span multiple features and must be managed as a unified concern.
6. **Conditional UI** — Multiple UI elements (Generate Mail button, license config, trickle-down settings) are conditionally visible based on app registration status, creating a dependency chain that must be consistently enforced.

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application — brownfield extension of existing Next.js 16 codebase.

### Starter Template Assessment

**Not Applicable — Brownfield Project**

This feature extends the existing Starterskalender application. No project initialization or starter template is needed. The complete technology stack is already established and operational.

### Established Technical Foundation

**Language & Runtime:** TypeScript 5 (strict mode), React 19, Node.js 20
**Framework:** Next.js 16 (App Router, standalone Docker output)
**Database:** PostgreSQL via Prisma 5 ORM (schema extension via `db push`)
**Authentication:** NextAuth 4 + Azure AD (Entra ID) SSO
**Authorization:** Role-based (5 roles) + entity-scoped Membership model
**UI:** shadcn/ui pattern + Radix UI primitives, Tailwind CSS 3, Lucide icons
**Validation:** Zod schemas at API boundaries
**i18n:** next-intl (Dutch + French)
**Azure Integration:** @azure/msal-node + Microsoft Graph client (already installed)
**Deployment:** Docker on Easypanel, PostgreSQL

### Existing Patterns to Follow

- API routes under `/api/` with RESTful conventions (61 existing endpoints as reference)
- Cron jobs under `/api/cron/` with CRON_SECRET authentication
- Server-side auth helpers: `requireAuth()`, `requireAdmin()`, `requireEntityAccess()`
- RBAC helpers: `isHRAdmin()`, `hasEntityAccess()`, `filterStartersByRBAC()`
- Audit logging via `AuditLog` model with actor, action, target, metadata
- Task system via `Task` / `TaskTemplate` models with assignment and status tracking
- Component organization: domain-specific folders under `components/`
- Shared lib modules under `lib/` for cross-cutting concerns

**Note:** First implementation story should focus on Prisma schema extension and Graph API service module — not project initialization.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Private key encryption strategy (affects all credential operations)
- Provisioning state machine storage (affects provisioning engine, recovery, audit)
- Graph API service architecture (affects all Microsoft 365 interactions)
- SSE endpoint design (affects user experience during provisioning)

**Important Decisions (Shape Architecture):**
- Error classification taxonomy (affects error handling across all Graph API operations)
- Mutex implementation (affects concurrent access protection)
- Certificate generation approach (affects setup flow)
- Cron extension design (affects monitoring and intelligence features)

**Deferred Decisions (Post-MVP):**
- Additional license type support (Phase 2 — enum extension)
- Bulk provisioning queue architecture (Phase 2 — may need proper job queue)
- M365 lifecycle management patterns (Phase 3)

### Data Architecture

**Database:** PostgreSQL via Prisma 5 (existing) — extended with new models

**New Prisma Models:**

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `EntraAppConnection` | Per-entity Entra ID app registration | entityId (unique), clientId, tenantId, encryptedPrivateKey, certificateExpiry, consentStatus, lastConsentCheck |
| `ProvisioningJob` | Provisioning state machine state per starter | starterId, state (enum), triggeredBy, startedAt, completedAt, error, graphApiResponses (JSON), temporaryPassword (encrypted), assignedLicenseType |
| `LicenseCache` | Cached license availability per tenant | entityId, skuId, skuName, totalUnits, consumedUnits, lastSyncAt |
| `LicenseConfig` | License type setting per job function | jobRoleId (unique), requiredLicenseType (enum), trickleDownOverride (nullable boolean) |
| `TenantEntraConfig` | Tenant-wide Entra ID settings | tenantId (unique), trickleDownEnabled (boolean), passwordMinLength, passwordRequireUppercase, passwordRequireNumbers, passwordRequireSpecialChars |

**Private Key Encryption:**
- Algorithm: AES-256-GCM (application-level encryption)
- Encryption key: `ENTRA_ENCRYPTION_KEY` environment variable (32-byte key)
- Implementation: `lib/encryption.ts` module with `encrypt(plaintext)` and `decrypt(ciphertext)` functions
- IV generated per encryption operation, stored alongside ciphertext
- Rationale: Portable, no DB-specific dependencies, aligns with existing env-var secret management pattern

**License Type Enum:**
```prisma
enum LicenseType {
  BUSINESS_BASIC
  BUSINESS_STANDARD
}
```
Phase 2 additions (E3, E5, F1) require trivial enum extension via `db push`.

**Provisioning State Enum:**
```prisma
enum ProvisioningState {
  PENDING
  LICENSE_CHECKING
  USER_CREATING
  LICENSE_ASSIGNING
  MAILBOX_WAITING
  SUCCESS
  FAILED_AT_LICENSE_CHECK
  FAILED_AT_USER_CREATION
  FAILED_AT_LICENSE_ASSIGNMENT
  FAILED_AT_MAILBOX_WAIT
}
```

### Authentication & Security

**All decisions inherited from existing codebase:**
- Authentication: NextAuth 4 + Azure AD SSO (user identity from session)
- Authorization: RBAC with `requireEntityAccess()` for all provisioning endpoints
- Entity-scoped isolation: All queries filtered by entity membership

**New Security Decisions:**

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Graph API auth method | Certificate-based (ConfidentialClientApplication) | NFR3 requires no shared secrets; certificates are more secure than client secrets |
| Private key visibility | Secret-once pattern — encrypted value never returned after first successful validation | NFR2 compliance |
| Temporary password storage | Encrypted in ProvisioningJob, only returned once in SSE success event | Aligns with secret-once pattern |
| Credential isolation | All EntraAppConnection queries include `entityId` in WHERE clause; service methods require entityId parameter | NFR6 compliance |

### API & Communication Patterns

**Graph API Service Module:**

Single `GraphApiService` class at `lib/graph-api-service.ts`:

```
GraphApiService
├── getAuthenticatedClient(entityId) → ConfidentialClientApplication
├── createUser(entityId, userDetails) → GraphUser
├── assignLicense(entityId, userId, skuId) → void
├── getSubscribedSkus(entityId) → SubscribedSku[]
├── validateConsent(entityId) → ConsentStatus
└── removeUser(entityId, userId) → void
```

Per-tenant credential resolution: `getAuthenticatedClient()` loads the `EntraAppConnection` for the given entity, decrypts the private key, and creates a `ConfidentialClientApplication` with certificate credentials.

**Error Classification Hierarchy:**

```
GraphApiError (base)
├── GraphAuthError          → consent revoked, certificate invalid → disable connection, notify admin
├── GraphTransientError     → 503, timeout, network error → retry with backoff
├── GraphRateLimitError     → 429 → retry after Retry-After header (max 3 attempts)
└── GraphConflictError      → user already exists (409) → present accept/cancel to user
```

Each error type maps to a specific UI communication pattern and recovery behavior.

**SSE Endpoint:**

Route: `GET /api/provisioning/[starterId]/status`

Returns `ReadableStream` with `text/event-stream` content type. Events follow structured format:

```typescript
type ProvisioningEvent = {
  state: ProvisioningState
  message: string
  timestamp: string
  details?: {
    trickleDown?: { requested: LicenseType; assigned: LicenseType }
    credentials?: { email: string; temporaryPassword: string }
    error?: { type: string; message: string; retryable: boolean }
  }
}
```

Reconnection pattern: Client reconnects via SSE built-in retry. On reconnect, current state is fetched via `GET /api/provisioning/[starterId]` (REST endpoint). DB is source of truth, SSE is display layer only.

**New API Routes:**

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/entra-connection` | POST | Register new Entra ID app connection |
| `/api/admin/entra-connection/[entityId]` | GET, PUT, DELETE | Manage app connection |
| `/api/admin/entra-connection/[entityId]/certificate` | GET | Download .cer file |
| `/api/admin/entra-connection/[entityId]/regenerate` | POST | Regenerate certificate keypair |
| `/api/admin/entra-connection/[entityId]/validate` | POST | Validate connection against Graph API |
| `/api/admin/license-config/[jobRoleId]` | GET, PUT | License type per job function |
| `/api/admin/tenant-entra-config/[tenantId]` | GET, PUT | Tenant-wide Entra settings |
| `/api/provisioning/[starterId]` | GET | Get current provisioning state |
| `/api/provisioning/[starterId]/start` | POST | Trigger provisioning |
| `/api/provisioning/[starterId]/retry` | POST | Retry from failure point |
| `/api/provisioning/[starterId]/remove` | POST | Remove partially created user |
| `/api/provisioning/[starterId]/status` | GET | SSE stream for live status |
| `/api/cron/entra-consent-sweep` | GET | Daily consent validation sweep |
| `/api/cron/entra-license-sync` | GET | Daily license cache sync |

### Frontend Architecture

**All decisions inherited from existing codebase:**
- Component framework: React 19 with shadcn/ui patterns
- Styling: Tailwind CSS 3
- State management: React state + server components (existing pattern)
- Routing: Next.js App Router

**New Frontend Decisions:**

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Provisioning UI state | `useProvisioningStatus` custom hook with SSE subscription | Encapsulates SSE connection lifecycle, auto-reconnect, and state mapping |
| Generate Mail button | Conditional render based on `entityHasAppConnection` server prop | Follows existing pattern of server-side authorization checks |
| Status display | Inline status within starter record (spinner → checkmark/error) | Matches PRD user journey — no modal or separate page |
| License config UI | Extension of existing functions admin page | Conditional fields visible only when entity has app connection |

### Infrastructure & Deployment

**All decisions inherited from existing codebase:**
- Hosting: Docker on Easypanel
- Database: PostgreSQL (managed)
- CI/CD: Existing pipeline

**New Infrastructure Decisions:**

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Certificate generation | Node.js `crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })` + self-signed X.509 | Native Node.js, no external dependencies |
| Certificate expiry | 2 years default (configurable) | Balances security with operational overhead |
| Keypair rotation | Parallel rotation — new pair generated, admin uploads new .cer, validates, old key removed | Zero-downtime rotation |
| Provisioning job execution | In-process async (no external queue) | Single-starter-at-a-time requirement; queue is overkill for MVP |
| Mutex | Database-level: unique constraint on (starterId, active status) in ProvisioningJob | Simple, reliable, no extra infrastructure |
| Cron: consent sweep | `/api/cron/entra-consent-sweep` — iterates all active connections, validates via Graph API, updates status, notifies on revocation | Extends existing cron pattern |
| Cron: license sync | `/api/cron/entra-license-sync` — fetches subscribedSkus per tenant, updates LicenseCache, calculates demand vs supply, creates Task on shortage | Extends existing cron pattern |
| New env variable | `ENTRA_ENCRYPTION_KEY` — 32-byte AES-256 encryption key for private key storage | Single new secret required |

### Decision Impact Analysis

**Implementation Sequence:**
1. Prisma schema extension (new models, enums) — foundation for everything
2. Encryption module (`lib/encryption.ts`) — required before storing any credentials
3. Graph API service module (`lib/graph-api-service.ts`) — required before any Microsoft 365 interaction
4. Entra app connection CRUD (API routes + admin UI) — enables tenant setup
5. Certificate generation and download — completes setup flow
6. License configuration UI — enables per-function license settings
7. Provisioning engine with state machine — core provisioning flow
8. SSE endpoint + frontend hook — real-time status display
9. Cron extensions (consent sweep, license sync) — monitoring and intelligence
10. Lifecycle features (cleanup tasks, entity migration) — completes the feature

**Cross-Component Dependencies:**
- Graph API service depends on: EntraAppConnection model + encryption module
- Provisioning engine depends on: Graph API service + ProvisioningJob model + SSE endpoint
- License intelligence depends on: Graph API service + LicenseCache model + cron endpoints
- All UI features depend on: corresponding API routes + RBAC authorization
- Cron extensions depend on: Graph API service + existing cron auth pattern

## Implementation Patterns & Consistency Rules

### Critical Conflict Points Identified

12 areas where AI agents could make different choices for this feature, all resolved below.

### Naming Patterns

**Database Naming (Prisma — follows existing conventions):**
- Models: PascalCase singular (`EntraAppConnection`, `ProvisioningJob`, `LicenseCache`)
- Fields: camelCase (`clientId`, `encryptedPrivateKey`, `lastConsentCheck`)
- Enums: SCREAMING_SNAKE_CASE values (`BUSINESS_BASIC`, `LICENSE_CHECKING`)
- Relations: camelCase matching model name (`entity`, `starter`, `jobRole`)

**API Naming (follows existing /api/ conventions):**
- Routes: kebab-case (`/api/admin/entra-connection`, `/api/provisioning/[starterId]/status`)
- Route parameters: camelCase in brackets (`[starterId]`, `[entityId]`, `[jobRoleId]`)
- Query parameters: camelCase (`?includeExpired=true`)
- Cron routes: kebab-case under `/api/cron/` (`entra-consent-sweep`, `entra-license-sync`)

**Code Naming (follows existing lib/ and components/ conventions):**
- Lib modules: kebab-case (`lib/graph-api-service.ts`, `lib/encryption.ts`, `lib/certificate.ts`)
- Components: PascalCase (`GenerateMailButton.tsx`, `ProvisioningStatus.tsx`, `EntraConnectionForm.tsx`)
- Custom hooks: camelCase with `use` prefix (`useProvisioningStatus.ts`)
- Types/interfaces: PascalCase (`ProvisioningEvent`, `GraphApiError`, `EntraConnectionConfig`)
- Constants: SCREAMING_SNAKE_CASE (`PROVISIONING_TIMEOUT_MS`, `MAX_RETRY_ATTEMPTS`)

### Structure Patterns

**New Files Organization:**

```
lib/
├── graph-api-service.ts       # Graph API service class
├── encryption.ts              # AES-256-GCM encrypt/decrypt
├── certificate.ts             # X.509 certificate generation
├── provisioning-engine.ts     # State machine orchestrator
└── license-intelligence.ts    # Trickle-down logic, demand calculation

app/api/
├── admin/
│   ├── entra-connection/      # App connection CRUD
│   ├── license-config/        # License type per job function
│   └── tenant-entra-config/   # Tenant-wide settings
├── provisioning/
│   └── [starterId]/           # Provisioning operations
│       ├── route.ts           # GET current state
│       ├── start/route.ts     # POST trigger provisioning
│       ├── retry/route.ts     # POST retry from failure
│       ├── remove/route.ts    # POST remove partial user
│       └── status/route.ts    # GET SSE stream
└── cron/
    ├── entra-consent-sweep/route.ts
    └── entra-license-sync/route.ts

components/
└── entra/                     # All Entra ID feature components
    ├── GenerateMailButton.tsx
    ├── ProvisioningStatus.tsx
    ├── EntraConnectionForm.tsx
    ├── LicenseConfigPanel.tsx
    ├── LicenseDashboard.tsx
    └── CertificateDownload.tsx
```

### Format Patterns

**API Response Format (follows existing project pattern):**

Success: Direct JSON response (no wrapper)
```json
{ "id": "...", "state": "SUCCESS", "assignedLicenseType": "BUSINESS_BASIC" }
```

Error: Consistent error object
```json
{ "error": "CONSENT_REVOKED", "message": "Entra ID consent has been revoked for this entity.", "retryable": false }
```

**SSE Event Format:**
```
data: {"state":"LICENSE_CHECKING","message":"Checking license availability...","timestamp":"2026-06-04T14:00:00Z"}
```
One JSON object per `data:` line. No event type field — all events are provisioning state updates.

**Date Format:** ISO 8601 strings in all JSON responses (`2026-06-04T14:00:00Z`)

### Communication Patterns

**SSE Event Naming:**
- No separate event types — single stream of `ProvisioningEvent` objects
- State field drives all frontend behavior
- `details` field carries context-specific data (trickle-down info, credentials, error details)

**Audit Log Entries (extend existing AuditLog pattern):**
- Action format: `entra.{verb}` (e.g., `entra.connection.created`, `entra.provisioning.started`, `entra.provisioning.failed`)
- Metadata: JSON object with relevant context (entityId, starterId, state, error)
- Graph API responses stored in ProvisioningJob.graphApiResponses, not in AuditLog metadata

**Task Creation (extend existing Task system):**
- Task type: descriptive string (`license_shortage_alert`, `mailbox_cleanup`, `entity_migration_cleanup`)
- Assignment: IT person for the entity (via existing TaskAssignment mechanism)

### Process Patterns

**Error Handling:**
1. Graph API errors caught in `GraphApiService` → classified into typed hierarchy
2. `ProvisioningEngine` catches `GraphApiError` subtypes → writes failure state to DB → pushes error event via SSE
3. API routes catch all errors → return consistent error JSON → log to AuditLog
4. Frontend maps error types to i18n message keys (never display raw API errors)

**Loading/Status States:**
- Frontend shows exactly 3 visual states: spinner (in progress), checkmark (success), error (failed with action buttons)
- Backend state machine has 10 states — frontend maps these to the 3 visual states
- State mapping: `PENDING|*_CHECKING|*_CREATING|*_ASSIGNING|*_WAITING` → spinner, `SUCCESS` → checkmark, `FAILED_AT_*` → error

**Retry Logic:**
- Provisioning retry: resume from `ProvisioningJob.state` (not restart)
- Graph API transient retry: max 3 attempts with exponential backoff (1s, 2s, 4s)
- Rate limit retry: respect `Retry-After` header, max 3 attempts
- All retries logged to ProvisioningJob.graphApiResponses

**Encryption Pattern:**
- All encrypt/decrypt operations go through `lib/encryption.ts`
- Never import `crypto` directly in other modules for encryption purposes
- Encrypted values stored as `{iv}:{ciphertext}` string format in DB
- Decrypted values never logged, never included in API responses (except temporary password in SSE success event, once)

### Enforcement Guidelines

**All AI Agents MUST:**
1. Use `GraphApiService` for all Microsoft Graph interactions — never call Graph API directly
2. Use `lib/encryption.ts` for all encrypt/decrypt operations — never use `crypto` directly
3. Include `entityId` in every query touching Entra data — no cross-entity data leakage
4. Write provisioning state to DB before pushing SSE event — DB is always source of truth
5. Use existing `requireEntityAccess()` for all provisioning endpoints
6. Use i18n keys for all user-facing strings — no hardcoded Dutch/French text
7. Follow existing error response format for API routes
8. Log all provisioning actions to AuditLog with `entra.*` action prefix

## Project Structure & Boundaries

### New Files Added to Existing Project

This feature adds the following files to the existing Starterskalender codebase. Only new files are shown — existing files that need modification are noted in the Requirements Mapping section.

```
prisma/
└── schema.prisma                          # MODIFY: Add 5 new models + 2 enums

lib/
├── encryption.ts                          # NEW: AES-256-GCM encrypt/decrypt
├── certificate.ts                         # NEW: X.509 certificate generation
├── graph-api-service.ts                   # NEW: Microsoft Graph API service class
├── provisioning-engine.ts                 # NEW: State machine orchestrator
└── license-intelligence.ts                # NEW: Trickle-down logic, demand calc

app/
├── (authenticated)/admin/
│   ├── entiteiten/                        # MODIFY: Add Entra connection section
│   └── functies/                          # MODIFY: Add license config fields
├── api/
│   ├── admin/
│   │   ├── entra-connection/
│   │   │   ├── route.ts                   # NEW: POST create connection
│   │   │   └── [entityId]/
│   │   │       ├── route.ts               # NEW: GET/PUT/DELETE connection
│   │   │       ├── certificate/route.ts   # NEW: GET download .cer
│   │   │       ├── regenerate/route.ts    # NEW: POST regenerate keypair
│   │   │       └── validate/route.ts      # NEW: POST validate connection
│   │   ├── license-config/
│   │   │   └── [jobRoleId]/route.ts       # NEW: GET/PUT license config
│   │   └── tenant-entra-config/
│   │       └── [tenantId]/route.ts        # NEW: GET/PUT tenant settings
│   ├── provisioning/
│   │   └── [starterId]/
│   │       ├── route.ts                   # NEW: GET current state
│   │       ├── start/route.ts             # NEW: POST trigger provisioning
│   │       ├── retry/route.ts             # NEW: POST retry from failure
│   │       ├── remove/route.ts            # NEW: POST remove partial user
│   │       └── status/route.ts            # NEW: GET SSE stream
│   └── cron/
│       ├── entra-consent-sweep/route.ts   # NEW: Daily consent sweep
│       └── entra-license-sync/route.ts    # NEW: Daily license sync

components/
└── entra/
    ├── GenerateMailButton.tsx              # NEW: Conditional provisioning trigger
    ├── ProvisioningStatus.tsx              # NEW: SSE-driven status display
    ├── EntraConnectionForm.tsx             # NEW: App registration setup form
    ├── EntraConnectionStatus.tsx           # NEW: Connection health indicator
    ├── LicenseConfigPanel.tsx              # NEW: Per-function license settings
    ├── LicenseDashboard.tsx               # NEW: License availability display
    ├── CertificateDownload.tsx            # NEW: .cer file download button
    ├── TrickleDownConfig.tsx              # NEW: Trickle-down policy settings
    └── PasswordConfig.tsx                 # NEW: Temp password rules config

hooks/
└── useProvisioningStatus.ts               # NEW: SSE subscription hook
```

**Total: 5 lib modules, 14 API routes, 9 components, 1 hook = 29 new files**

### Architectural Boundaries

**API Boundaries:**

| Boundary | Auth Required | Role Required | Entity-Scoped |
|----------|--------------|---------------|---------------|
| `/api/admin/entra-connection/*` | Yes | HR_ADMIN | Yes (entityId) |
| `/api/admin/license-config/*` | Yes | HR_ADMIN | Yes (via jobRole→entity) |
| `/api/admin/tenant-entra-config/*` | Yes | HR_ADMIN | Yes (tenantId) |
| `/api/provisioning/*` | Yes | HR_ADMIN or ENTITY_EDITOR | Yes (via starter→entity) |
| `/api/cron/entra-*` | CRON_SECRET | N/A | Iterates all |

**Service Boundaries:**

```
┌─────────────────────────────────────────────┐
│                 API Routes                   │
│  (auth + validation + response formatting)   │
├──────────────┬──────────────┬───────────────┤
│ entra-       │ provisioning │ cron          │
│ connection   │              │               │
├──────────────┴──────┬───────┴───────────────┤
│                     │                        │
│  ProvisioningEngine │  LicenseIntelligence   │
│  (state machine)    │  (trickle-down, demand)│
├─────────────────────┴────────────────────────┤
│              GraphApiService                  │
│  (all Microsoft Graph API interactions)       │
├──────────────────────────────────────────────┤
│     Encryption Module    │   Certificate Mgr  │
├──────────────────────────┴───────────────────┤
│              Prisma / PostgreSQL              │
└──────────────────────────────────────────────┘
```

Rules:
- API routes never call Graph API directly → always through `GraphApiService`
- `ProvisioningEngine` orchestrates the state machine → calls `GraphApiService` for each step
- `LicenseIntelligence` handles trickle-down logic and demand calculation → calls `GraphApiService` for license data
- `Encryption` module is the only module that touches `crypto` for encryption
- All services receive `entityId` as parameter → enforce entity isolation at every layer

**Data Boundaries:**

| Data Domain | Model(s) | Owned By | Accessed By |
|-------------|----------|----------|-------------|
| App Connections | EntraAppConnection | entra-connection routes | GraphApiService, cron sweeps |
| Provisioning State | ProvisioningJob | provisioning routes | ProvisioningEngine, SSE endpoint |
| License Cache | LicenseCache | cron license-sync | LicenseDashboard, ProvisioningEngine |
| License Config | LicenseConfig, TenantEntraConfig | admin config routes | ProvisioningEngine, functions UI |
| Existing Models | Entity, JobRole, Starter, Task, AuditLog | existing routes | Extended by this feature |

### Requirements to Structure Mapping

**FR Category → File Mapping:**

| Capability Area | FRs | Primary Files |
|----------------|-----|---------------|
| Tenant App Connection | FR1-FR11 | `lib/graph-api-service.ts`, `lib/certificate.ts`, `lib/encryption.ts`, `api/admin/entra-connection/*`, `components/entra/EntraConnection*.tsx` |
| License Configuration | FR12-FR17 | `api/admin/license-config/*`, `api/admin/tenant-entra-config/*`, `components/entra/LicenseConfigPanel.tsx`, `components/entra/TrickleDownConfig.tsx` |
| Mail Provisioning | FR18-FR32 | `lib/provisioning-engine.ts`, `api/provisioning/*`, `components/entra/GenerateMailButton.tsx`, `components/entra/ProvisioningStatus.tsx`, `hooks/useProvisioningStatus.ts` |
| Provisioning Recovery | FR33-FR36 | `lib/provisioning-engine.ts`, `api/provisioning/[starterId]/retry/*`, `api/provisioning/[starterId]/remove/*` |
| License Intelligence | FR37-FR41 | `lib/license-intelligence.ts`, `api/cron/entra-license-sync/*`, `components/entra/LicenseDashboard.tsx` |
| Provisioning Lifecycle | FR42-FR45 | `lib/provisioning-engine.ts` (event hooks into existing task system) |
| Audit & Observability | FR46-FR48 | `lib/provisioning-engine.ts` (extends existing `lib/audit.ts`) |

**Existing Files Modified:**

| File | Modification |
|------|-------------|
| `prisma/schema.prisma` | Add 5 models + 2 enums |
| Entity admin page | Add Entra connection management section |
| Functions admin page | Add conditional license type dropdown per function |
| Starter detail page | Add GenerateMailButton component (conditional on app connection) |
| `.env` / `.env.example` | Add `ENTRA_ENCRYPTION_KEY` |

### Integration Points

**External Integration: Microsoft Graph API v1.0**
- Single integration point: `lib/graph-api-service.ts`
- Endpoints used: `POST /users`, `POST /users/{id}/assignLicense`, `GET /subscribedSkus`, `DELETE /users/{id}`
- Auth: Certificate-based via `@azure/msal-node` `ConfidentialClientApplication`
- Error handling: Typed error hierarchy with retry logic

**Internal Integration: Existing Systems**
- Task system: `ProvisioningEngine` creates tasks via existing Task model for license shortage and cleanup
- Audit system: All provisioning actions logged via existing `lib/audit.ts` with `entra.*` prefix
- Cron system: Two new cron routes follow existing `/api/cron/` pattern with `CRON_SECRET` auth
- RBAC: All routes use existing `requireEntityAccess()` and role checks
- Entity model: `EntraAppConnection` has foreign key to existing `Entity` model

**Data Flow: Provisioning Sequence**
```
User clicks Generate Mail
  → POST /api/provisioning/[starterId]/start
    → requireEntityAccess() check
    → ProvisioningEngine.start(starterId)
      → Check mutex (ProvisioningJob active?)
      → GraphApiService.getSubscribedSkus() → license check
      → LicenseIntelligence.resolveLicense() → trickle-down logic
      → GraphApiService.createUser() → M365 user creation
      → GraphApiService.assignLicense() → license assignment
      → Poll for mailbox provisioning
      → Each step: write state to DB → push SSE event
    → On success: encrypt temp password, store in ProvisioningJob
    → On failure: write failure state, push error event
```

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices are compatible: Next.js 16 App Router supports SSE via API routes (ReadableStream), Prisma 5 supports the new models and enums, @azure/msal-node supports certificate-based ConfidentialClientApplication, Node.js crypto supports RSA keypair and X.509 generation. No version conflicts detected.

**Pattern Consistency:**
- Naming conventions (PascalCase models, kebab-case routes, camelCase fields) are consistent with existing codebase
- Error handling hierarchy (GraphApiError subtypes) maps cleanly to the 3 frontend visual states
- SSE event format aligns with ProvisioningState enum — no translation layer needed
- Audit log pattern (`entra.*` prefix) extends existing AuditLog convention

**Structure Alignment:**
- New files follow existing directory conventions (lib/, components/, app/api/)
- Service boundary layers (API → Engine → GraphApiService → Prisma) are cleanly separated
- Entity-scoped security is enforced at every layer via entityId parameter passing

### Requirements Coverage Validation ✅

**Functional Requirements:** 48/48 covered — all 7 capability areas have explicit architectural support with mapped files and service responsibilities.

**Non-Functional Requirements:** 19/19 covered — security (NFR1-7), performance (NFR8-11), integration (NFR12-16), and reliability (NFR17-19) all addressed by specific architectural decisions.

### Implementation Readiness Validation ✅

**Decision Completeness:** All critical decisions documented with specific technology choices, no ambiguity remaining for AI agents.

**Structure Completeness:** 29 new files defined with exact paths, 5 existing files identified for modification.

**Pattern Completeness:** 8 enforcement guidelines ensure AI agent consistency.

### Gap Analysis Results

**Critical Gaps:** None

**Important Gaps (non-blocking):**
1. Zod validation schemas for new API routes — agents should create following existing patterns
2. i18n translation keys — agents should add to existing files using `entra.*` namespace
3. Graph API permission scopes — use: `User.ReadWrite.All`, `Directory.ReadWrite.All`, `Organization.Read.All` (application permissions)

**Nice-to-Have Gaps:**
1. Test strategy for Graph API mocking, SSE testing, encryption testing
2. Structured logging beyond audit trail for production observability

### Architecture Completeness Checklist

- [x] Project context analyzed (brownfield, medium-high complexity)
- [x] Technical constraints identified (existing stack, 6 cross-cutting concerns)
- [x] Critical decisions documented (data, security, API, frontend, infrastructure)
- [x] Integration patterns defined (Graph API, SSE, cron, task system)
- [x] Naming conventions established (DB, API, code)
- [x] Structure patterns defined (29 new files, service boundaries)
- [x] Communication patterns specified (SSE events, audit logs, tasks)
- [x] Process patterns documented (error handling, retry, encryption)
- [x] Complete directory structure defined
- [x] Requirements to structure mapping complete (all 7 FR categories)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High — all 48 FRs and 19 NFRs have explicit architectural support.

**Key Strengths:**
- Clean service boundary layers prevent coupling
- Entity-scoped security enforced at every layer
- DB-backed state machine ensures zero data loss
- Typed error hierarchy provides consistent error handling
- 100% brownfield pattern reuse (RBAC, audit, tasks, cron, UI)

**Implementation Sequence:**
1. Prisma schema extension (5 new models + 2 enums)
2. `lib/encryption.ts` (AES-256-GCM module)
3. `lib/certificate.ts` (X.509 keypair generation)
4. `lib/graph-api-service.ts` (Graph API service class)
5. Entra app connection CRUD (API routes + admin UI)
6. License configuration UI
7. `lib/provisioning-engine.ts` (state machine)
8. SSE endpoint + `useProvisioningStatus` hook
9. Cron extensions (consent sweep, license sync)
10. Lifecycle features (cleanup tasks, entity migration)
