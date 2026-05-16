---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-05-13'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - docs/project-context.md
workflowType: 'architecture'
project_name: 'Starterskalender - Recruitment Module'
user_name: 'Kevin'
date: '2026-05-13'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
60 FRs organized into 9 capability areas:
1. Vacancy Management (FR1-9): Template-based vacancy creation, modular content blocks, dealbreaker/nice-to-have configuration, publish/unpublish lifecycle, configurable pipeline stages
2. Candidate Management (FR10-17): One-click apply without account, CV upload, auto-filtering on dealbreakers, weighted scoring on preferences
3. Pipeline & Selection (FR18-23): Kanban board with drag & drop, stage transitions triggering workflows, real-time multi-user updates
4. Evaluation & Scoring (FR24-28): Scorecard templates per vacancy, multi-reviewer aggregation, side-by-side comparison (Phase 2)
5. Access Control & Sharing (FR29-35): Field-level candidate data sharing, temporary/permanent scoped views, auto-expiring access after evaluation, audit logging of all access
6. Communication (FR36-41): Automated status emails per stage, configurable templates, internal comment threads, O365 mailbox sync (Phase 2)
7. Public Presence (FR42-48): SSR vacancy pages with SEO, site grouping per entity, embeddable widget + headless API (Phase 2)
8. Compliance & Audit (FR49-55): Configurable retention period, automated deletion workflow, GDPR rights (access, erasure, rectification), immutable audit log, DPO reporting
9. Integration & Flow (FR56-60): Auto-create Starter on hire, pre-onboarding bridge, existing notification/RBAC system integration

**Non-Functional Requirements:**
- Performance: <1s Kanban load, <100ms drag feedback, <1.5s public page LCP, <500ms form submission
- Security: Encryption at rest, TLS 1.3, no PII in logs, time-limited share tokens, spam protection on public forms
- Accessibility: WCAG 2.1 AA (high priority on public pages)
- Integration: Graph API retry logic, atomic Starter creation, SendGrid retry queue
- Reliability: 99% uptime business hours, zero data loss on applications, graceful degradation

**Scale & Complexity:**
- Primary domain: Full-stack web (SSR public + SPA interactive admin)
- Complexity level: Medium-High
- Estimated architectural components: 12-15
- User scale: Low (1 headhunter, handful of reviewers, dozens of candidates per vacancy)
- Data scale: Low-medium (hundreds of candidates, not thousands)

### Technical Constraints & Dependencies

**Existing Platform (must integrate with):**
- Next.js 16 App Router with React 19
- TypeScript 5 strict mode
- Prisma 5 ORM + PostgreSQL
- NextAuth 4 with Azure AD SSO
- RBAC v2: 5 roles + entity-scoped Membership model
- SSE event bus for real-time updates
- Microsoft Graph API client (MSAL)
- SendGrid for email delivery
- Radix UI + shadcn/ui + Tailwind CSS 3
- next-intl (NL/FR)
- Docker deployment on Easypanel

**Architectural Constraints:**
- Must extend existing Prisma schema without breaking changes
- Must reuse existing RBAC v2 permission infrastructure
- Must follow existing App Router patterns (route groups, server actions)
- Must deploy as single Docker container (existing pattern)
- No new framework dependencies unless justified

### Cross-Cutting Concerns Identified

1. **Field-level RBAC** — Every candidate data query must be filtered based on viewer's access level (headhunter: all, reviewer: shared fields only, ad-hoc: specific fields). This is the primary architectural challenge — not a standard role check but dynamic field-masking.

2. **Multi-entity scoping** — All vacancy and candidate queries must be entity-bound. Entity membership determines which vacancies/candidates a user can access at all, before field-level filtering applies.

3. **Audit logging** — Every candidate data operation (view, edit, share, delete) must produce an immutable audit record. Must survive data deletion (audit outlives candidate record).

4. **GDPR data lifecycle** — Candidate data has a finite lifecycle: active → retained → notified → soft-deleted → hard-deleted. Retention triggers must be configurable and automated.

5. **Real-time pipeline updates** — Pipeline state changes must broadcast via existing SSE bus. Multiple users viewing the same pipeline must see instant updates when candidates move stages.

6. **i18n** — Internal interfaces in NL/FR (existing pattern). Public vacancy pages language determined by entity/site group configuration.

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application — extending existing Next.js 16 codebase.

### Starter Options Considered

Not applicable — brownfield extension. The recruitment module is built within the existing Starterskalender project. All technology decisions are inherited from the existing codebase.

### Selected Approach: Brownfield Module Extension

**Rationale:** The existing codebase provides all foundational infrastructure. Building within it avoids duplication of auth, RBAC, Graph API, deployment config, and shared UI components. Approximately 60% of required infrastructure already exists.

**Architectural Decisions Inherited from Existing Codebase:**

**Language & Runtime:**
- TypeScript 5 (strict mode), Node.js 20, React 19

**Styling Solution:**
- Tailwind CSS 3 + Radix UI + shadcn/ui pattern

**Build Tooling:**
- Next.js standalone Docker output, Prisma generation

**Testing Framework:**
- To be established for recruitment module

**Code Organization:**
- App Router route groups (`(authenticated)/recruitment/`)
- Shared `components/`, `lib/` structure
- API routes under `app/api/recruitment/`

**Development Experience:**
- Hot reload via Next.js dev server, Prisma Studio for DB inspection
- Docker-compose for local PostgreSQL

**Key Inherited Systems:**
- Authentication: NextAuth 4 + Azure AD SSO (no changes needed)
- Authorization: RBAC v2 + entity-scoped Membership (extend with recruitment permissions)
- Email: SendGrid integration (reuse for status emails)
- Real-time: SSE event bus (extend for pipeline updates)
- i18n: next-intl NL/FR (add recruitment translation keys)
- Audit: Existing AuditLog model (extend for candidate access logging)

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
1. Field-level access model → CandidateShare with visibleFields[]
2. Pipeline state machine → Configurable stages table (VacancyStage)
3. Candidate portal auth → Token-based URL (no login required)
4. Document storage → SharePoint via Graph API (per entity/function/candidate)
5. Kanban library → dnd-kit

**Important Decisions (Shape Architecture):**
6. Public vacancy API → Separate unauthenticated route group under `/api/public/`
7. Pipeline events → Extend existing SSE bus with recruitment-specific event types
8. Vacancy builder → Modular JSON content blocks (no rich text editor dependency)
9. Email templates → Extend existing EmailTemplate model with recruitment-specific types

**Deferred Decisions (Post-MVP):**
- Embeddable widget isolation strategy (Shadow DOM vs iframe) — Wave 2
- Headless API versioning strategy — Wave 2
- Assessment integration protocol — Wave 3

### Data Architecture

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | PostgreSQL (existing) | Brownfield — no change |
| ORM | Prisma 5 (existing) | Brownfield — extend schema |
| Field-level access | `CandidateShare` model with `visibleFields: String[]` | App-layer filtering sufficient at current scale; simple to implement and audit |
| Pipeline stages | `VacancyStage` table (vacancyId + name + order + isTerminal + triggersEmail) | FR8 requires configurable stages per vacancy |
| Candidate data | Single `Candidate` model with all fields; filtering at application layer based on share permissions | Avoids over-normalization; field masking via utility function |
| Document storage | SharePoint via Graph API, folder structure: `/Recruitment/{Entity}/{Function}/{Candidate}/` | Leverages existing Graph API; documents accessible via Teams/SharePoint; organized per entity |
| Migrations | Prisma `db push` (existing pattern) | No migrations directory — matches current approach |

### Authentication & Security

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Internal auth | NextAuth 4 + Azure AD SSO (existing) | No change needed |
| Candidate portal | Token-based URL (UUID in path, no login) | Zero friction; no sensitive third-party data exposed; token is per-candidate |
| Share mechanism | Time-limited crypto-random token stored in CandidateShare record | Non-guessable, expirable, auditable |
| Public form protection | Rate limiting + honeypot fields | No CAPTCHA to maintain one-click apply UX |
| Spam prevention | Email verification on application (confirm email before entering pipeline) | Prevents fake applications without adding friction for real candidates |

### API & Communication Patterns

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Internal API | Next.js API routes under `/api/recruitment/` | Follows existing pattern |
| Public API | Separate unauthenticated routes under `/api/public/vacancies/` | Clear separation; no auth middleware on public endpoints |
| Real-time | Extend existing SSE event bus with `recruitment:pipeline:moved`, `recruitment:share:created` events | Reuse existing infrastructure |
| Email | Extend existing SendGrid + EmailTemplate pattern with recruitment-specific templates | Reuse existing email engine |
| Graph API (docs) | Upload/download via existing MSAL client; folder creation on vacancy/candidate creation | Existing auth flow; structured folder hierarchy |

### Frontend Architecture

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Kanban | dnd-kit | Modern, accessible (keyboard navigation), lightweight, actively maintained |
| Vacancy builder | JSON content blocks (array of typed objects) rendered via React components | No WYSIWYG dependency; clean data model; blocks reusable in templates |
| State management | React Server Components for data + client-side optimistic updates for Kanban | Follows existing pattern; optimistic drag & drop for instant feel |
| Public pages | Server-side rendered with Next.js App Router | SEO requirement; follows existing SSR patterns |

### Infrastructure & Deployment

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Hosting | Same Docker container on Easypanel (existing) | Single deployment; recruitment module is part of Airport |
| Database | Same PostgreSQL instance (existing) | No separate database needed at this scale |
| File storage | SharePoint (Microsoft 365) via Graph API | Documents live in Microsoft ecosystem; accessible via Teams |
| Caching (public pages) | Next.js built-in ISR or on-demand revalidation for vacancy pages | Fresh content on publish/unpublish; cached between changes |
| Monitoring | Existing setup (extend with recruitment-specific audit logging) | No new monitoring tools needed |

### Decision Impact Analysis

**Implementation Sequence:**
1. Prisma schema extension (VacancyStage, Candidate, CandidateShare, etc.)
2. RBAC permission extension (recruitment:*, vacancy:*, candidate:*)
3. Graph API folder creation utilities
4. Pipeline engine (stage transitions, event emission, email triggers)
5. Vacancy builder (content blocks, templates, dealbreakers)
6. Candidate intake (public form, CV upload to SharePoint)
7. Kanban UI (dnd-kit, optimistic updates, SSE subscription)
8. Share mechanism (CandidateShare CRUD, field-masked views)
9. Public vacancy pages (SSR, SEO, site grouping)

**Cross-Component Dependencies:**
- CandidateShare depends on Candidate + RBAC extension
- Pipeline events depend on VacancyStage + SSE bus extension
- Kanban UI depends on Pipeline engine + dnd-kit
- Document upload depends on Graph API folder structure
- Status emails depend on Pipeline engine + EmailTemplate extension

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Database Naming (Prisma):**
- Models: PascalCase singular (`Vacancy`, `Candidate`, `CandidateShare`, `VacancyStage`)
- Fields: camelCase (`firstName`, `createdAt`, `vacancyId`)
- Relations: camelCase matching model name (`vacancy`, `candidates`, `stages`)
- Enums: PascalCase with UPPER_SNAKE values (`CandidateStatus.APPLIED`, `CandidateStatus.HIRED`)

**API Naming:**
- Endpoints: kebab-case, plural nouns (`/api/recruitment/vacancies`, `/api/recruitment/candidates`)
- Public endpoints: `/api/public/vacancies/[id]` (separate route group, no auth)
- Parameters: `[id]` for dynamic segments (Next.js convention)
- Query params: camelCase (`?entityId=x&stageId=y`)

**Code Naming:**
- Components: PascalCase files and exports (`PipelineKanban.tsx`, `CandidateCard.tsx`)
- Lib/utils: kebab-case files (`candidate-field-mask.ts`, `pipeline-events.ts`)
- Functions: camelCase (`getCandidatesByVacancy`, `maskCandidateFields`)
- Types: PascalCase with descriptive suffixes (`CandidateWithStage`, `VacancyCreateInput`)
- Constants: UPPER_SNAKE for config (`PIPELINE_EVENTS`, `RECRUITMENT_PERMISSIONS`)

### Structure Patterns

**Route Organization:**
```
app/(authenticated)/recruitment/
├── page.tsx                    # Recruitment dashboard/overview
├── vacatures/
│   ├── page.tsx               # Vacancy list
│   ├── [id]/
│   │   ├── page.tsx           # Vacancy detail + pipeline Kanban
│   │   └── edit/page.tsx      # Vacancy editor
│   └── nieuw/page.tsx         # Create vacancy
├── kandidaten/
│   └── [id]/page.tsx          # Candidate detail (headhunter view)
└── admin/
    ├── templates/page.tsx     # Vacancy template management
    └── instellingen/page.tsx  # Recruitment settings (retention, etc.)

app/api/recruitment/
├── vacancies/
│   ├── route.ts               # GET list, POST create
│   └── [id]/
│       ├── route.ts           # GET, PATCH, DELETE
│       ├── stages/route.ts    # Stage management
│       └── candidates/route.ts # Candidates for this vacancy
├── candidates/
│   ├── [id]/
│   │   ├── route.ts           # GET, PATCH
│   │   ├── share/route.ts     # Share management
│   │   ├── evaluate/route.ts  # Scorecard submission
│   │   └── move/route.ts      # Stage transition
│   └── route.ts
└── templates/route.ts

app/api/public/
├── vacancies/
│   ├── route.ts               # Public vacancy list (filtered by site group)
│   └── [id]/
│       ├── route.ts           # Public vacancy detail
│       └── apply/route.ts     # Application submission
└── candidate/
    └── [token]/route.ts       # Candidate portal (token-based)

components/recruitment/
├── pipeline/                  # Kanban, stage columns, candidate cards
├── vacancy/                   # Builder, template selector, dealbreaker config
├── candidate/                 # Profile, share dialog, evaluation form
└── public/                    # Public vacancy page components
```

**Component Organization:**
- Feature-based grouping under `components/recruitment/`
- Shared UI primitives stay in `components/ui/` (existing shadcn pattern)
- Each feature folder may contain sub-components used only by that feature

### Format Patterns

**API Response Format:**
```typescript
// Success
{ data: T }

// Error
{ error: { message: string; code: string } }

// List with pagination
{ data: T[]; total: number }
```

**Date/Time:**
- Database: `DateTime` (Prisma native, stored as UTC)
- API responses: ISO 8601 strings
- UI display: Formatted via `date-locale.ts` helpers (existing pattern)

**Zod Validation:**
- Every API route validates input with Zod schema at boundary
- Schemas co-located with route files or in shared `lib/recruitment/schemas.ts`
- Reuse Prisma-generated types where possible

### Communication Patterns

**SSE Event Naming:**
```
recruitment:pipeline:candidate-moved
recruitment:pipeline:candidate-added
recruitment:share:created
recruitment:share:evaluated
recruitment:vacancy:published
recruitment:vacancy:closed
```

**Event Payload Structure:**
```typescript
{
  type: "recruitment:pipeline:candidate-moved",
  payload: {
    vacancyId: string,
    candidateId: string,
    fromStageId: string,
    toStageId: string,
    movedBy: string,
    timestamp: string
  }
}
```

### Process Patterns

**Error Handling:**
- API routes: try/catch with typed error responses
- Client: toast notifications for user-facing errors (existing shadcn/ui toast pattern)
- Validation errors: return 400 with field-specific Zod error messages
- Auth errors: return 401/403, redirect to login on client

**Loading States:**
- Server Components: Suspense boundaries with skeleton loaders
- Client interactions (drag & drop): optimistic updates, rollback on error
- Form submissions: disabled button + spinner during API call

**Field Masking Pattern:**
```typescript
function maskCandidateForViewer(candidate: Candidate, share: CandidateShare): Partial<Candidate> {
  const masked: Partial<Candidate> = { id: candidate.id };
  for (const field of share.visibleFields) {
    masked[field] = candidate[field];
  }
  return masked;
}
```

**Audit Logging Pattern:**
```typescript
await auditLog({
  action: "candidate:viewed",
  actorId: session.user.id,
  targetId: candidate.id,
  metadata: { fields: share.visibleFields, mechanism: "share-link" }
});
```

### Enforcement Guidelines

**All AI Agents MUST:**
- Follow existing codebase naming conventions (inspect `lib/`, `components/`, `app/api/` for precedent)
- Use Zod validation at every API boundary before processing
- Log audit events for all candidate data access operations
- Apply field masking via shared utility — never inline field filtering
- Use existing `requireAuth()`, `requireAdmin()`, `requireEntityAccess()` helpers for route protection
- Emit SSE events for all pipeline state changes
- Follow Dutch route naming for authenticated pages (`vacatures`, `kandidaten`) matching existing pattern (`kalender`, `starters`, `taken`)

## Project Structure & Boundaries

### Complete Recruitment Module Directory Structure

```
app/(authenticated)/recruitment/
├── page.tsx                           # Module entry: vacancy overview
├── vacatures/
│   ├── page.tsx                       # Vacancy list with filters
│   ├── nieuw/page.tsx                 # Create vacancy (template selector + builder)
│   └── [id]/
│       ├── page.tsx                   # Vacancy detail: pipeline Kanban view
│       ├── edit/page.tsx              # Edit vacancy content + settings
│       └── kandidaten/[candidateId]/
│           └── page.tsx               # Candidate detail (headhunter full view)
├── delen/[token]/
│   └── page.tsx                       # Shared candidate view (scoped, token-based internal)
└── admin/
    ├── templates/page.tsx             # Vacancy template CRUD
    └── instellingen/page.tsx          # Recruitment settings (retention, defaults)

app/api/recruitment/
├── vacancies/
│   ├── route.ts                       # GET (list), POST (create)
│   └── [id]/
│       ├── route.ts                   # GET, PATCH, DELETE
│       ├── publish/route.ts           # POST (publish/unpublish)
│       ├── stages/route.ts            # GET, POST, PATCH, DELETE (stage config)
│       └── candidates/route.ts        # GET (candidates for vacancy)
├── candidates/
│   ├── route.ts                       # GET (search/filter across vacancies)
│   └── [id]/
│       ├── route.ts                   # GET, PATCH
│       ├── move/route.ts              # POST (change pipeline stage)
│       ├── share/route.ts             # GET, POST, DELETE (manage shares)
│       ├── evaluate/route.ts          # POST (submit scorecard)
│       ├── comments/route.ts          # GET, POST (internal thread)
│       └── documents/route.ts         # GET, POST (SharePoint files)
├── templates/
│   └── route.ts                       # GET, POST, PATCH, DELETE
└── dashboard/
    └── route.ts                       # GET (pipeline metrics, Wave 3)

app/api/public/
├── vacancies/
│   ├── route.ts                       # GET (public list, filtered by site group)
│   └── [id]/
│       ├── route.ts                   # GET (public vacancy detail)
│       └── apply/route.ts             # POST (submit application)
└── candidate/
    └── [token]/
        └── route.ts                   # GET (candidate portal status)

app/jobs/
└── [entityGroup]/
    ├── page.tsx                        # Public vacancy listing (SSR, SEO)
    └── [vacancyId]/page.tsx            # Public vacancy detail (SSR, SEO)

components/recruitment/
├── pipeline/
│   ├── PipelineKanban.tsx             # Main Kanban board (dnd-kit)
│   ├── StageColumn.tsx                # Individual stage column
│   ├── CandidateCard.tsx              # Card in Kanban
│   └── CandidateMoveDialog.tsx        # Confirm stage move + email trigger
├── vacancy/
│   ├── VacancyBuilder.tsx             # Content block editor
│   ├── VacancyTemplateSelector.tsx    # Template picker
│   ├── DealbreakersConfig.tsx         # Dealbreaker/nice-to-have editor
│   ├── StageConfigurator.tsx          # Pipeline stage setup
│   └── ContentBlock.tsx               # Renderable content block
├── candidate/
│   ├── CandidateProfile.tsx           # Full profile view (headhunter)
│   ├── CandidateScoped.tsx            # Masked profile view (reviewer)
│   ├── ShareDialog.tsx                # Share button + field selector
│   ├── ScorecardForm.tsx              # Evaluation form
│   ├── CommentThread.tsx              # Internal comment list + input
│   └── CandidateStatusBadge.tsx       # Pipeline stage indicator
├── public/
│   ├── VacancyCard.tsx                # Public vacancy list item
│   ├── VacancyDetail.tsx              # Public vacancy full view
│   ├── ApplicationForm.tsx            # One-click apply form
│   └── CandidatePortal.tsx            # Token-based status view
└── shared/
    ├── EntityFilter.tsx               # Entity selector (reuses existing)
    └── RecruitmentStats.tsx           # Summary widgets

lib/recruitment/
├── schemas.ts                         # Zod schemas for all recruitment APIs
├── permissions.ts                     # Recruitment-specific RBAC permissions
├── field-mask.ts                      # maskCandidateForViewer utility
├── pipeline-engine.ts                 # Stage transition logic + event emission
├── pipeline-events.ts                 # SSE event type definitions
├── sharepoint-documents.ts            # Graph API folder/file operations
├── candidate-scoring.ts               # Dealbreaker filter + nice-to-have scoring
├── status-emails.ts                   # Email template triggering for pipeline
├── vacancy-templates.ts               # Template loading + content block types
└── types.ts                           # Recruitment-specific TypeScript types

prisma/schema.prisma                   # Extended with recruitment models
```

### Architectural Boundaries

**API Boundaries:**

| Boundary | Auth | Access |
|----------|------|--------|
| `/api/recruitment/*` | NextAuth session required | Entity-scoped via RBAC |
| `/api/public/vacancies/*` | No auth | Rate-limited, read-only + apply |
| `/api/public/candidate/[token]/*` | Token in URL | Per-candidate, read-only |
| `/app/jobs/*` | No auth | Public SSR pages |

**Data Access Boundaries:**

| Layer | Responsibility |
|-------|---------------|
| API route | Auth check, Zod validation, response formatting |
| `lib/recruitment/*.ts` | Business logic, permission checks, audit logging |
| Prisma client | Database queries only (no business logic) |
| `lib/recruitment/field-mask.ts` | Field filtering before data leaves server |

**Component Boundaries:**

| Component Group | Data Source | State Pattern |
|-----------------|-------------|---------------|
| Pipeline (Kanban) | Server Component fetch + SSE subscription | Optimistic client updates |
| Vacancy builder | Server action for save, local state for editing | Form state (React) |
| Public pages | Server Component (SSR, cached) | No client state |
| Candidate portal | Server Component (token-validated) | No client state |

### Requirements to Structure Mapping

| FR Category | Primary Location | Supporting Locations |
|-------------|-----------------|---------------------|
| Vacancy Management (FR1-9) | `components/recruitment/vacancy/`, `app/api/recruitment/vacancies/` | `lib/recruitment/vacancy-templates.ts` |
| Candidate Management (FR10-17) | `components/recruitment/candidate/`, `app/api/recruitment/candidates/` | `lib/recruitment/candidate-scoring.ts` |
| Pipeline & Selection (FR18-23) | `components/recruitment/pipeline/`, `lib/recruitment/pipeline-engine.ts` | `lib/recruitment/pipeline-events.ts` |
| Evaluation & Scoring (FR24-28) | `components/recruitment/candidate/ScorecardForm.tsx` | `app/api/recruitment/candidates/[id]/evaluate/` |
| Access Control (FR29-35) | `lib/recruitment/field-mask.ts`, `lib/recruitment/permissions.ts` | `components/recruitment/candidate/ShareDialog.tsx` |
| Communication (FR36-41) | `lib/recruitment/status-emails.ts` | `app/api/recruitment/candidates/[id]/comments/` |
| Public Presence (FR42-48) | `app/jobs/`, `components/recruitment/public/` | `app/api/public/vacancies/` |
| Compliance & Audit (FR49-55) | Existing `lib/audit.ts` (extended) | `lib/recruitment/field-mask.ts` |
| Integration & Flow (FR56-60) | `lib/recruitment/pipeline-engine.ts` | Existing `lib/task-automation.ts` |

### Integration Points

**Internal (within Airport):**
- Pipeline engine → SSE event bus (existing)
- Hired transition → Starter creation (existing Starter API)
- Recruitment permissions → RBAC v2 (existing `lib/rbac.ts`)
- Status emails → SendGrid (existing `lib/email.ts`)
- Audit logging → AuditLog model (existing `lib/audit.ts`)
- Notifications → Notification model (existing)

**External:**
- SharePoint (Graph API) → `lib/recruitment/sharepoint-documents.ts`
- Public websites → `/api/public/vacancies/` (REST) + future widget
- Candidate email → SendGrid outbound
- Candidate portal → `/api/public/candidate/[token]/`

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices work together without conflicts. Next.js 16 + React 19 + Prisma 5 + PostgreSQL + dnd-kit + Graph API + SSE — existing stack or proven compatible. No version conflicts. dnd-kit supports React 19. SharePoint via existing MSAL client.

**Pattern Consistency:**
Naming conventions (PascalCase models, camelCase fields, kebab-case lib files) consistent with existing codebase. API response format uniform. SSE event naming follows logical `recruitment:*` namespace. Route organization matches existing patterns (`kalender`, `starters` → `vacatures`, `kandidaten`).

**Structure Alignment:**
Directory structure supports all decisions. Public/authenticated/API layers clearly separated. Component groupings match FR categories. `lib/recruitment/` centralizes business logic correctly.

### Requirements Coverage ✅

**Functional Requirements:**
All 60 FRs covered with clear architectural support:
- FR1-9 (Vacancy Management): 9/9 — templates, content blocks, dealbreakers, stages
- FR10-17 (Candidate Management): 8/8 — one-click apply, CV to SharePoint, auto-scoring
- FR18-23 (Pipeline & Selection): 6/6 — Kanban + dnd-kit, SSE real-time, pipeline-engine
- FR24-28 (Evaluation & Scoring): 5/5 — ScorecardForm, evaluate route, FR28 Phase 2
- FR29-35 (Access Control & Sharing): 7/7 — CandidateShare + field-mask.ts + audit
- FR36-41 (Communication): 6/6 — status emails, comment threads, FR40-41 Phase 2
- FR42-48 (Public Presence): 7/7 — SSR pages, site grouping, FR46-48 Phase 2
- FR49-55 (Compliance & Audit): 7/7 — retention settings, audit immutability, DPO reporting
- FR56-60 (Integration & Flow): 5/5 — pipeline→starter bridge, RBAC v2, notifications

**Non-Functional Requirements:**
- Performance: dnd-kit (100ms drag feedback), SSR (LCP <1.5s), optimistic updates ✅
- Security: field-mask default-deny, TLS 1.3, no PII logging, rate limiting ✅
- Accessibility: dnd-kit keyboard support, Radix UI accessible primitives, WCAG 2.1 AA ✅
- Integration resilience: Graph API retry, SendGrid queue, SSE reconnect ✅
- Reliability: graceful degradation, cached public pages, zero data loss ✅

### Implementation Readiness ✅

**Decision Completeness:**
- All 5 critical decisions documented with specific choices, versions, and rationale
- Implementation patterns include code examples (field masking, audit logging, SSE events)
- Enforcement guidelines clear for AI agents

**Structure Completeness:**
- 40+ files/directories explicitly defined with responsibilities
- Every API route specifies HTTP methods
- Component responsibilities clear

**Pattern Completeness:**
- Naming, structure, format, communication, and process patterns all documented
- Error handling, loading states, and Zod validation patterns described
- Field masking and audit logging patterns with code examples

### Gap Analysis

**Critical Gaps:** None — no blockers for implementation.

**Important Gaps (non-blocking, recommended):**
1. Email verification flow for application spam prevention — no explicit route in structure. Recommend adding `verify/route.ts` under `/api/public/vacancies/[id]/` when implementing candidate intake.
2. GDPR automated retention job mechanism — retention automation (FR50-51) requires a scheduled job. No cron/job runner pattern documented. Impact: low — Phase 3, solvable via Easypanel cron or API route with timer.
3. Testing framework — noted as "to be established." Important for implementation phase, not architecture-blocking.

**Nice-to-Have Gaps:**
- React Error Boundary strategy for recruitment module not explicit
- Candidate data export endpoint (FR52) not surfaced as dedicated route — implementable via `candidates/[id]/route.ts` GET with export parameter

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**✅ Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High — brownfield project on existing, proven stack with clearly defined boundaries and 100% FR coverage.

**Key Strengths:**
- Complete FR coverage (60/60) with clear mapping to structure
- Field-level access control architecturally anchored as core pattern
- Brownfield strategy maximizes reuse (~60% existing infrastructure)
- Clear separation public/authenticated/API with specific auth patterns per boundary
- SharePoint integration fits within existing Graph API ecosystem

**Areas for Future Enhancement:**
- Testing strategy to be defined at first implementation story
- Email verification flow to be formalized during candidate intake implementation
- GDPR job runner pattern to be documented for Phase 3
- Dashboard API to be specified when Wave 3 starts

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions
- Apply field masking via shared `lib/recruitment/field-mask.ts` — never inline field filtering
- Emit SSE events for all pipeline state changes
- Log audit events for all candidate data access operations

**First Implementation Priority:**
1. Extend Prisma schema with recruitment models (Vacancy, VacancyStage, Candidate, CandidateShare, Evaluation)
2. Add recruitment permissions to RBAC v2
3. Build pipeline engine (stage transitions, event emission)
4. Implement vacancy CRUD + template system
5. Build Kanban UI with dnd-kit

---

## RBAC Permission Matrix — Recruitment Module

_Added during Epic 3/4 retrospective (2026-05-16). Every new story MUST reference this matrix to verify that reused endpoints grant access to the story's target role._

### Permission Definitions

| Permission | Description | Typical Roles |
|------------|-------------|---------------|
| `recruitment:read` | View vacancies, candidates, pipeline | Recruiter, Hiring Manager |
| `recruitment:admin` | Manage recruitment configuration (site groups, share templates) | Recruitment Admin |
| `vacancy:create` | Create new vacancies | Recruiter |
| `vacancy:edit` | Edit vacancy content, stages, settings | Recruiter |
| `vacancy:delete` | Delete vacancies | Recruiter, Recruitment Admin |
| `vacancy:publish` | Publish/unpublish/close vacancies | Recruiter |
| `candidate:write` | Add candidates, move between stages | Recruiter |
| `candidate:read` | View candidate audit trail | Recruiter, Hiring Manager |
| `candidate:share` | Share candidates with reviewers | Recruiter, Hiring Manager |
| `candidate:evaluate` | Submit scorecard evaluations (Epic 5) | Reviewer (via share-token) |
| `admin:users:manage` | Full user/role administration (HR Admin) | HR Admin |

### Recruitment API Endpoints

| Endpoint | Method | Permission | Entity Scope | Target Roles |
|----------|--------|------------|:------------:|--------------|
| **Public (no auth)** | | | | |
| `/api/public/vacancies` | GET | None (rate-limited) | - | Anonymous |
| `/api/public/vacancies/[id]` | GET | None | - | Anonymous |
| `/api/public/vacancies/[id]/photo` | GET | None | - | Anonymous |
| `/api/public/vacancies/[id]/apply` | POST | None (honeypot + rate limit) | - | Applicants |
| `/api/public/vacancies/[id]/apply/verify` | GET | None (token-based) | - | Applicants |
| `/api/public/widget/[slug]` | GET | None | - | Embed consumers |
| **Vacancy Management** | | | | |
| `/api/recruitment/vacancies` | GET | `recruitment:read` | Yes | Recruiter, Hiring Manager |
| `/api/recruitment/vacancies` | POST | `vacancy:create` | Yes | Recruiter |
| `/api/recruitment/vacancies/[id]` | GET | `recruitment:read` | Yes | Recruiter, Hiring Manager |
| `/api/recruitment/vacancies/[id]` | PATCH | `vacancy:edit` | Yes | Recruiter |
| `/api/recruitment/vacancies/[id]` | DELETE | `vacancy:delete` | Yes | Recruiter, Admin |
| `/api/recruitment/vacancies/[id]/stages` | GET | `recruitment:read` | Yes | Recruiter, Hiring Manager |
| `/api/recruitment/vacancies/[id]/stages` | POST/PATCH/DELETE | `vacancy:edit` | Yes | Recruiter |
| `/api/recruitment/vacancies/[id]/publish` | POST | `vacancy:publish` | Yes | Recruiter |
| `/api/recruitment/vacancies/[id]/qr` | GET | `recruitment:read` | No | Recruiter |
| `/api/recruitment/vacancies/[id]/photo` | GET | `recruitment:read` | Yes | Recruiter |
| **Candidate Management** | | | | |
| `/api/recruitment/vacancies/[id]/candidates` | GET | `recruitment:read` | Yes | Recruiter, Hiring Manager |
| `/api/recruitment/vacancies/[id]/candidates` | POST | `candidate:write` | Yes | Recruiter |
| `/api/recruitment/candidates/[id]` | GET | `recruitment:read` | Yes | Recruiter, Hiring Manager |
| `/api/recruitment/candidates/[id]/documents` | GET | `recruitment:read` | Yes | Recruiter |
| `/api/recruitment/candidates/[id]/move` | POST | `candidate:write` | Yes | Recruiter |
| `/api/recruitment/candidates/[id]/audit` | GET | `candidate:read` | Yes | Recruiter, Admin |
| **Sharing & Scoped Access** | | | | |
| `/api/recruitment/candidates/[id]/share` | GET | `candidate:share` | Yes | Recruiter, Hiring Manager |
| `/api/recruitment/candidates/[id]/share` | POST | `candidate:share` | Yes | Recruiter, Hiring Manager |
| `/api/recruitment/candidates/[id]/share/[shareId]` | DELETE | `candidate:share` | Yes | Recruiter, Hiring Manager |
| `/api/recruitment/shared/[token]` | GET | Session + token owner match | No | **Reviewer** (via share link) |
| `/api/recruitment/users` | GET | `candidate:share` | No | Recruiter, Hiring Manager |
| **Evaluation (Epic 5 — planned)** | | | | |
| `/api/recruitment/shared/[token]/evaluate` | POST | Session + token owner match | No | **Reviewer** (via share link) |
| `/api/recruitment/candidates/[id]/evaluations` | GET | `recruitment:read` | Yes | Recruiter, Hiring Manager |
| `/api/recruitment/vacancies/[id]/evaluations` | GET | `recruitment:read` | Yes | Recruiter |
| **Admin Configuration** | | | | |
| `/api/recruitment/admin/site-groups` | GET/POST | `recruitment:admin` | No | Recruitment Admin |
| `/api/recruitment/admin/site-groups/[id]` | PATCH/DELETE | `recruitment:admin` | No | Recruitment Admin |
| `/api/recruitment/admin/share-templates` | GET/POST | `recruitment:admin` | No | Recruitment Admin |
| `/api/recruitment/admin/share-templates/[id]` | PATCH/DELETE | `recruitment:admin` | No | Recruitment Admin |
| `/api/recruitment/admin/scorecard-templates` | GET/POST | `recruitment:admin` | No | Recruitment Admin (Epic 5) |
| `/api/recruitment/templates` | GET | `recruitment:read` | Yes | Recruiter |
| `/api/recruitment/templates` | POST | `recruitment:admin` | Yes | Recruitment Admin |
| `/api/recruitment/templates/[id]` | GET | `recruitment:read` | Yes | Recruiter |
| `/api/recruitment/templates/[id]` | PATCH/DELETE | `recruitment:admin` | Yes | Recruitment Admin |

### Cross-Role Interaction Map

```
                    ┌──────────────────┐
                    │  Recruitment      │
                    │  Admin            │
                    │  recruitment:admin│
                    └────────┬─────────┘
                             │ configures
                    ┌────────▼─────────┐
                    │  Share Templates  │
                    │  Site Groups      │
                    │  Scorecard Tmpl   │
                    └────────┬─────────┘
                             │ uses
           ┌─────────────────┼─────────────────┐
           │                 │                 │
  ┌────────▼─────────┐     │     ┌───────────▼──────────┐
  │  Recruiter        │     │     │  Hiring Manager       │
  │  recruitment:read │     │     │  recruitment:read     │
  │  candidate:write  │     │     │  candidate:share      │
  │  candidate:share  │     │     └───────────────────────┘
  │  vacancy:*        │     │
  └────────┬─────────┘     │
           │ shares         │
  ┌────────▼─────────┐     │
  │  Reviewer         │     │
  │  Session + token  │     │
  │  Read: masked     │     │
  │  Write: evaluate  │◄───┘
  └──────────────────┘
```

### RBAC Verification Checklist (for stories)

When a story reuses an existing endpoint, verify:

1. **Does the target role have the required permission?** Check this matrix.
2. **Does the endpoint enforce entity scope?** If yes, does the target role have entity membership?
3. **Is the endpoint behind `admin:users:manage`?** If so, it is NOT accessible to recruitment roles — create a dedicated endpoint.
4. **Share-token context:** Reviewers access data via `/api/recruitment/shared/[token]` — they do NOT have `recruitment:read` or `candidate:share`. Any data the reviewer needs must be served through the share-token endpoint.

---

## Scoped View Write Architecture (Epic 5 Preparation)

_Added during Epic 3/4 retrospective (2026-05-16). Defines how reviewers submit evaluations through the share-token scoped view._

### Problem Statement

Epics 1–4 established the scoped view as a **read-only** experience. Epic 5 (Story 5.2) introduces the first **write operation** from share-token context: submitting a scorecard evaluation. This requires a new permission boundary.

### Design Decision: Token-Scoped Write Endpoint

**Decision:** Create a dedicated evaluation endpoint under the share-token route that validates write access through the same token + user match mechanism used for reads.

**Route:** `POST /api/recruitment/shared/[token]/evaluate`

**Access control (layered):**

1. **Authentication:** `requireAuth()` — user must be logged in
2. **Token lookup:** Find `CandidateShare` by token
3. **User match:** `share.sharedWithUserId === session.user.id`
4. **Share validity:** Not revoked (`revokedAt IS NULL`), not expired
5. **Evaluation eligibility:** `evaluationSubmittedAt IS NULL` (prevent double submission)
6. **Vacancy has scorecard:** Verify vacancy has configured evaluation criteria

**What the endpoint does NOT check:**
- `recruitment:read` — reviewer does not have this permission
- `candidate:write` — reviewer does not have this permission
- Entity scope — reviewer may not have entity membership; access is derived purely from the share token

### Data Flow

```
Reviewer (authenticated, has share token)
    │
    ▼
POST /api/recruitment/shared/[token]/evaluate
    │
    ├─ Validate: auth + token + user match + not expired/revoked
    ├─ Validate: evaluationSubmittedAt IS NULL
    ├─ Validate: request body matches vacancy scorecard criteria
    │
    ├─ Create Evaluation record (candidateId, shareId, scores, comments)
    ├─ Set share.evaluationSubmittedAt = now()
    ├─ Create AuditLog: CANDIDATE_EVALUATED
    ├─ Emit SSE: recruitment:evaluation:submitted
    │
    └─ Return 201 { data: { message: 'Evaluation submitted' } }
```

### Evaluation Data Model (Epic 5)

```prisma
model Evaluation {
  id            String          @id @default(cuid())
  candidateId   String
  candidate     Candidate       @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  shareId       String
  share         CandidateShare  @relation(fields: [shareId], references: [id])
  vacancyId     String
  vacancy       Vacancy         @relation(fields: [vacancyId], references: [id])
  evaluatorId   String
  evaluator     User            @relation(fields: [evaluatorId], references: [id])
  scores        Json            // EvaluationScore[] — per criterion
  comment       String?
  createdAt     DateTime        @default(now())

  @@unique([shareId])           // One evaluation per share
  @@index([candidateId])
  @@index([vacancyId])
}
```

### Reading Evaluations (Recruiter Side)

Recruiters view evaluation results through standard recruitment endpoints:

- `GET /api/recruitment/candidates/[id]/evaluations` — requires `recruitment:read` + entity scope
- `GET /api/recruitment/vacancies/[id]/evaluations` — requires `recruitment:read` + entity scope

These endpoints aggregate all evaluations for a candidate/vacancy. They do NOT use share tokens — recruiters access via their own RBAC permissions.

### Security Boundaries Summary

| Action | Who | Access Mechanism | Permission |
|--------|-----|------------------|------------|
| Configure scorecard template | Admin | Direct RBAC | `recruitment:admin` |
| View scorecard in scoped view | Reviewer | Share token + user match | None (token-derived) |
| Submit evaluation | Reviewer | Share token + user match | None (token-derived) |
| Read evaluation results | Recruiter | Direct RBAC | `recruitment:read` + entity scope |
| Read aggregated scores | Recruiter | Direct RBAC | `recruitment:read` + entity scope |

### Post-Evaluation Flow

After evaluation submission:
1. `evaluationSubmittedAt` is set on `CandidateShare`
2. 24-hour grace period starts (reviewer can still view, not re-submit)
3. After 24 hours, scoped view access expires automatically (Epic 4 logic)
4. Recruiter sees evaluation in candidate profile and comparison views
