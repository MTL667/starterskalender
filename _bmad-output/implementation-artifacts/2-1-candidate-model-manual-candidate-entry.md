# Story 2.1: Candidate Model & Manual Candidate Entry

Status: done

## Story

As a headhunter,
I want to manually add a candidate to a vacancy pipeline,
so that I can track candidates who come through direct channels (referrals, LinkedIn, walk-ins) without requiring them to apply online.

## Acceptance Criteria

1. **Given** `candidate:write` permission, **When** this story deploys, **Then** Prisma schema includes `Candidate` model with: id, vacancyId, stageId, firstName, lastName, email, phone, source, notes, dealbreakersResult (enum: PASS/FAIL/PENDING), niceToHaveScore (Float?), createdAt, updatedAt, deletedAt
2. **Given** `candidate:write` permission, **When** this story deploys, **Then** Prisma schema includes `CandidateApplication` model with: id, candidateId, cvDriveId, cvItemId, cvFileName, motivation, appliedAt
3. **Given** I am on a vacancy detail page, **When** I click "Add candidate", **Then** a dialog opens with: first name*, last name*, email*, phone, source (dropdown: Direct, Referral, LinkedIn, Other), notes textarea
4. **Given** I fill in required fields and submit, **When** the API processes, **Then** the candidate is created in the first pipeline stage (order=0), candidate card appears in first column, success toast "Candidate added" shown
5. **Given** a candidate with the same email already exists for this vacancy, **When** I try to add, **Then** inline error: "This candidate already exists for this vacancy"
6. **Given** I cancel the dialog, **When** the dialog closes, **Then** no data is persisted
7. **Given** I have `recruitment:read` permission, **When** I call GET `/api/recruitment/vacancies/[id]/candidates`, **Then** I receive all candidates for this vacancy with stage info, sorted by createdAt desc

## Tasks / Subtasks

- [x] Task 1: Extend Prisma schema (AC: 1, 2)
  - [x] Add `CandidateSource` enum (DIRECT, REFERRAL, LINKEDIN, OTHER)
  - [x] Add `DealbreakersResult` enum (PASS, FAIL, PENDING)
  - [x] Add `Candidate` model with all fields, relations to Vacancy, VacancyStage, User
  - [x] Add `CandidateApplication` model with relation to Candidate
  - [x] Add `candidates` relation to Vacancy and VacancyStage models
  - [x] Add indexes: `[vacancyId, stageId]`, `[vacancyId, email]` (unique), `[deletedAt]`
  - [x] Run `npx prisma db push`
- [x] Task 2: Create candidate schemas and types (AC: 1, 2, 3)
  - [x] Add `Candidate` and `CandidateApplication` TypeScript interfaces in `lib/recruitment/types.ts`
  - [x] Add `candidateCreateSchema` Zod schema in `lib/recruitment/schemas.ts`
  - [x] Add `CandidateWithStage` type for API responses
- [x] Task 3: Create candidates API routes (AC: 3, 4, 5, 7)
  - [x] Create `app/api/recruitment/vacancies/[id]/candidates/route.ts`
  - [x] GET handler: list candidates for vacancy with RBAC (`recruitment:read`) + entity scope
  - [x] POST handler: create candidate with RBAC (`candidate:write`) + entity scope + vacancy ownership
  - [x] POST: validate email uniqueness per vacancy (AC: 5)
  - [x] POST: auto-assign first stage (order=0) of the vacancy
  - [x] POST: return `{ data: Candidate }` on success
  - [x] Apply standard error patterns: 400/403/404/409/422
- [x] Task 4: Create AddCandidateDialog component (AC: 3, 4, 5, 6)
  - [x] Create `components/recruitment/candidate/add-candidate-dialog.tsx`
  - [x] Form fields: firstName*, lastName*, email*, phone, source (Select), notes (Textarea)
  - [x] Client-side validation on blur (required fields, email format)
  - [x] Submit → POST `/api/recruitment/vacancies/[id]/candidates`
  - [x] Handle 409 (duplicate) → inline error below email field
  - [x] On success: close dialog, call onSuccess callback, show toast
  - [x] Escape / cancel closes without side effects
- [x] Task 5: Integrate into vacancy detail page + i18n (AC: 3, 4, 7)
  - [x] Add "Add candidate" button to vacancy detail page (secondary button)
  - [x] Wire AddCandidateDialog to vacancy detail
  - [x] Add candidate list section below vacancy info (simple list for now, Kanban in Story 2.2)
  - [x] Add translation keys to `messages/nl.json` and `messages/fr.json`

## Dev Notes

### Database Model Design

```prisma
enum CandidateSource {
  DIRECT
  REFERRAL
  LINKEDIN
  OTHER
}

enum DealbreakersResult {
  PASS
  FAIL
  PENDING
}

model Candidate {
  id                String            @id @default(cuid())
  vacancyId         String
  vacancy           Vacancy           @relation(fields: [vacancyId], references: [id], onDelete: Cascade)
  stageId           String
  stage             VacancyStage      @relation(fields: [stageId], references: [id])
  firstName         String
  lastName          String
  email             String
  phone             String?
  source            CandidateSource   @default(DIRECT)
  notes             String?
  dealbreakersResult DealbreakersResult @default(PENDING)
  niceToHaveScore   Float?
  createdById       String
  createdBy         User              @relation("CandidateCreator", fields: [createdById], references: [id])
  deletedAt         DateTime?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  application       CandidateApplication?

  @@unique([vacancyId, email])
  @@index([vacancyId, stageId])
  @@index([deletedAt])
}

model CandidateApplication {
  id          String    @id @default(cuid())
  candidateId String    @unique
  candidate   Candidate @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  cvDriveId   String?
  cvItemId    String?
  cvFileName  String?
  motivation  String?
  appliedAt   DateTime  @default(now())
}
```

**Important**: Also add `candidates Candidate[]` relation to `Vacancy` model and `candidates Candidate[]` to `VacancyStage` model. Add `User` relation `"CandidateCreator"`.

### API Route Pattern

Follow established pattern from Epic 1:
- `requirePermission('candidate:write')` for POST, `requirePermission('recruitment:read')` for GET
- Entity scope: vacancy must belong to an entity the user has access to (`visibleEntityIds`)
- Vacancy must exist and not be soft-deleted (`deletedAt: null`)
- Response format: `{ data: T }` success / `{ error: { message, code } }` error
- Wrap `request.json()` in try/catch for `INVALID_JSON` (400)
- Use Zod validation at boundary

### Duplicate Detection

Use `@@unique([vacancyId, email])` constraint. On Prisma unique violation (`P2002`), return:
```json
{ "error": { "message": "Candidate with this email already exists for this vacancy", "code": "DUPLICATE_CANDIDATE" } }
```
HTTP status: 409 Conflict.

### Component Pattern

- Dialog using Radix `AlertDialog` or `Dialog` (from shadcn/ui) — 6 fields → use Dialog
- Single-column form, validate on blur
- Source dropdown: `Select` with 4 options using i18n keys
- Toast on success via existing toast infrastructure or inline success message pattern from Story 1.7
- Client component (`'use client'`)

### File Structure

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Extend with Candidate + CandidateApplication models |
| `lib/recruitment/types.ts` | Add Candidate, CandidateApplication interfaces |
| `lib/recruitment/schemas.ts` | Add candidateCreateSchema |
| `app/api/recruitment/vacancies/[id]/candidates/route.ts` | GET + POST handlers |
| `components/recruitment/candidate/add-candidate-dialog.tsx` | Dialog component |
| `app/(authenticated)/recruitment/vacatures/[id]/page.tsx` | Integrate button + candidate list |
| `messages/nl.json` | Add ~15 candidate keys |
| `messages/fr.json` | Add ~15 candidate keys |

### RBAC Rules

- `candidate:write` — required to create candidates (already registered in `lib/authz-registry.ts`)
- `recruitment:read` — required to list candidates for a vacancy
- Entity scope: user must have access to the vacancy's entity via `visibleEntityIds`

### Anti-Patterns to Avoid

- Do NOT create a separate `/api/recruitment/candidates` route yet — candidates are always accessed in vacancy context for this story
- Do NOT implement Kanban board — that's Story 2.2
- Do NOT implement drag & drop — that's Story 2.4
- Do NOT implement SSE events yet — that's Story 2.5
- Do NOT implement scoring logic — that's Story 3.5
- Do NOT add CV upload to manual add form — manual candidates don't have CVs at entry time
- Do NOT over-engineer the candidate list — a simple table/list is fine for now; Kanban replaces it in 2.2

### Project Structure Notes

- New directory: `components/recruitment/candidate/` (first file in this directory)
- API route nests under existing vacancy route: `vacancies/[id]/candidates/`
- Types and schemas extend existing files (not new files)
- Follow Dutch route naming convention (pages are under `vacatures/`)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Candidate Model, API Patterns, RBAC]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Form Patterns, Toast Patterns]
- [Source: _bmad-output/implementation-artifacts/1-8-sharepoint-photo-library-integration.md#Dev Patterns]
- [Source: lib/authz-registry.ts#Recruitment Permissions]

### Previous Story Intelligence (from Epic 1)

Key patterns to maintain:
- `requirePermission()` + `visibleEntityIds()` + `can()` for all RBAC checks
- `deletedAt: null` in all Prisma `where` clauses for active records
- Wrap `request.json()` in try/catch → 400 INVALID_JSON
- Zod validation with `.safeParse()`, return `fieldErrors` in error details
- Entity scope validation: vacancy.entityId must be in user's visible entities
- i18n keys in both `messages/nl.json` and `messages/fr.json` simultaneously
- Client components pass IDs (vacancyId, entityId) as props from server page

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- Prisma db push succeeded without data loss
- No linter errors across all new/modified files

### Completion Notes List
- Task 1: Extended Prisma schema with `CandidateSource` enum, `DealbreakersResult` enum, `Candidate` model (with all fields, unique constraint on [vacancyId, email], indexes), and `CandidateApplication` model. Added `candidates` relations to Vacancy, VacancyStage, and User models.
- Task 2: Added `CandidateWithStage` type to `lib/recruitment/types.ts`, re-exported Prisma types. Added `candidateCreateSchema` Zod schema and `CandidateCreateInput` type to `lib/recruitment/schemas.ts`.
- Task 3: Created `app/api/recruitment/vacancies/[id]/candidates/route.ts` with GET (list with RBAC + entity scope) and POST (create with RBAC, entity scope, Zod validation, auto-assign first stage, duplicate detection via P2002, standard error patterns).
- Task 4: Created `components/recruitment/candidate/add-candidate-dialog.tsx` with form fields, blur validation, submit handling, 409 duplicate inline error, success callback, and cancel/escape cleanup.
- Task 5: Created `components/recruitment/candidate/candidate-list-section.tsx` as a client component with fetch, loading state, empty state, table display, and dialog integration. Integrated into vacancy detail page with `canWrite` prop. Added 30 i18n keys to both nl.json and fr.json.

### File List
- prisma/schema.prisma (modified)
- lib/recruitment/types.ts (modified)
- lib/recruitment/schemas.ts (modified)
- app/api/recruitment/vacancies/[id]/candidates/route.ts (new)
- components/recruitment/candidate/add-candidate-dialog.tsx (new)
- components/recruitment/candidate/candidate-list-section.tsx (new)
- app/(authenticated)/recruitment/vacatures/[id]/page.tsx (modified)
- messages/nl.json (modified)
- messages/fr.json (modified)

### Review Findings

- [x] [Review][Patch] setTimeout without cleanup in CandidateListSection — fixed: added useRef + useEffect cleanup
- [x] [Review][Patch] res.json() on non-JSON error response may crash client — fixed: wrapped in try/catch with fallback
- [x] [Review][Patch] Silent fetch failure shows misleading empty state — fixed: added fetchError state with error message
- [x] [Review][Patch] P2002 meta.target check is fragile — fixed: check both array and string variants
- [x] [Review][Defer] Dialog close mid-request may trigger state update after unmount — deferred, low risk

### Change Log
- 2026-05-15: Story 2.1 implemented — Candidate model, API routes, AddCandidateDialog, candidate list section, i18n
