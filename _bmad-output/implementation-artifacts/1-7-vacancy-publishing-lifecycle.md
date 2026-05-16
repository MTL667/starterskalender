# Story 1.7: Vacancy Publishing & Lifecycle

Status: done

## Story

As a headhunter,
I want to publish, unpublish, and close vacancies,
So that I control when positions are visible to candidates and when they stop accepting applications.

## Acceptance Criteria

1. **Given** I have a draft vacancy with at least title, one content block, and pipeline stages configured
   **When** I click "Publish" (primary blue button)
   **Then** the vacancy status changes to "published"
   **And** a success toast "Vacancy published" appears
   **And** the vacancy becomes available for public pages (Epic 3)

2. **Given** I have a published vacancy
   **When** I click "Unpublish"
   **Then** the vacancy status changes to "draft"
   **And** it is no longer visible on public pages
   **And** existing candidates in the pipeline remain unaffected

3. **Given** I have a published vacancy
   **When** I click "Close vacancy"
   **Then** a confirmation dialog appears explaining that no new applications will be accepted
   **And** on confirmation, status changes to "closed"
   **And** the public page shows "This vacancy is no longer available"
   **And** candidates already in pipeline can still progress

4. **Given** I try to publish a vacancy without required fields
   **When** I click "Publish"
   **Then** validation errors indicate which fields are missing (inline, not blocking)

## Tasks / Subtasks

- [x] Task 1: Create publish API route (AC: #1, #2, #3, #4)
  - [x] Create `app/api/recruitment/vacancies/[id]/publish/route.ts` with POST handler
  - [x] Accept body: `{ action: 'publish' | 'unpublish' | 'close' }`
  - [x] Validate state transitions: draft→published, published→draft (unpublish), published→closed
  - [x] Publish validation: require title, at least 1 content block, at least 1 pipeline stage
  - [x] Return validation errors with field-level detail when publish fails
  - [x] Apply RBAC: `vacancy:publish` permission with entity-scope check

- [x] Task 2: Add Zod schemas for publish action (AC: #1, #4)
  - [x] Add `vacancyPublishActionSchema` to `lib/recruitment/schemas.ts`: action enum (publish, unpublish, close)
  - [x] Add `VacancyPublishValidationError` type to `lib/recruitment/types.ts`

- [x] Task 3: Build VacancyStatusActions component (AC: #1, #2, #3, #4)
  - [x] Create `components/recruitment/vacancy/vacancy-status-actions.tsx` — client component
  - [x] Show primary "Publish" button when draft (blue filled, UX spec)
  - [x] Show "Unpublish" + "Close" buttons when published
  - [x] Show "Re-open as draft" button when closed (→ transition back to draft)
  - [x] Publish: call API, show success toast on success, show inline validation errors on failure
  - [x] Close: show AlertDialog confirmation before API call
  - [x] Display current status badge

- [x] Task 4: Integrate VacancyStatusActions into vacancy edit page (AC: #1, #2, #3)
  - [x] Add status actions component at the top of `app/(authenticated)/recruitment/vacatures/[id]/bewerken/client.tsx`
  - [x] Pass current vacancy status and vacancyId
  - [x] Update local vacancy state on successful status change

- [x] Task 5: Add translation keys (AC: all)
  - [x] Add publishing keys to `messages/nl.json`: button labels, toast messages, validation errors, confirmation dialog
  - [x] Add matching keys to `messages/fr.json`

## Dev Notes

### Data Model

**VacancyStatus enum already exists** in Prisma: `DRAFT | PUBLISHED | CLOSED | ARCHIVED`

**State machine:**
```
DRAFT → PUBLISHED (publish: requires validation)
PUBLISHED → DRAFT (unpublish: no validation needed)
PUBLISHED → CLOSED (close: with confirmation)
CLOSED → DRAFT (re-open: no validation needed)
```

Invalid transitions (return 400):
- DRAFT → CLOSED (must publish first)
- CLOSED → PUBLISHED (must go through draft first)
- Any → ARCHIVED (handled separately, future story)

### Architecture Compliance

**Architecture specifies:**
- API route: `app/api/recruitment/vacancies/[id]/publish/route.ts` — POST only
- SSE events: `recruitment:vacancy:published` and `recruitment:vacancy:closed` (defer actual SSE emission to Epic 2 — just prepare the transition points)
- RBAC: `vacancy:publish` permission (already registered in `lib/authz-registry.ts`)

**Publish validation rules (AC #4):**
- `title`: must be non-empty string
- `content`: must have at least 1 content block (array length >= 1)
- `stages`: must have at least 1 pipeline stage

Return all failing checks in one response (not one-at-a-time) so the user can fix them all at once.

### UX Patterns from Spec

- **Primary action:** "Publish" is a blue filled button (most important action on page per UX spec)
- **Toast on success:** "Vacancy published — live on entity page" (rocket icon, blue) or "Draft saved" (save icon, gray)
- **Confirmation on close:** AlertDialog explaining that no new applications will be accepted. Same pattern as stage delete confirmation from Story 1.6.
- **Inline validation:** When publish fails, show which fields are missing as a list below the button (not as a blocking modal)
- **Loading state:** "Publishing..." spinner text on button during API call
- **Status badge:** Show current status (DRAFT/PUBLISHED/CLOSED) as a colored badge next to the title

### Anti-Patterns to Avoid

- Do NOT use the PATCH vacancy route for status changes — use dedicated publish route
- Do NOT emit SSE events yet — that's Epic 2 infrastructure
- Do NOT implement actual public page visibility — that's Epic 3
- Do NOT implement ARCHIVED status transitions — future story
- Do NOT block the entire form on publish validation failure — show errors inline

### Existing Patterns to Follow

**API pattern from Story 1.6 (stages route):**
- `requirePermission('vacancy:publish')` + `can()` check on entity
- Entity-scope check via `visibleEntityIds` or `can(user, perm, { entityId })`

**AlertDialog pattern from Story 1.6 (stage delete confirmation):**
- Same component structure: AlertDialog with Title, Description, Cancel, Action buttons

**Edit page integration from Stories 1.5/1.6:**
- Component receives vacancyId + status as props
- Manages its own API calls
- Updates parent state on success via callback

**Toast pattern (existing):**
- Check if project uses a toast library (sonner, react-hot-toast, or shadcn Toast)
- If shadcn Toast exists, use `useToast()` hook

### Previous Story Intelligence

**Story 1.6 learnings:**
- Entity-scope checks critical for all API routes (review finding)
- Stage ownership verification before mutations (review finding)
- `getVacancyWithAuth` helper pattern works well — reuse for publish route

**Story 1.5 learnings:**
- Explicit save/action buttons with status feedback (saving/saved/error)
- Reset status on subsequent user action

**Key files to modify:**
- `app/(authenticated)/recruitment/vacatures/[id]/bewerken/client.tsx` — Add status actions
- `lib/recruitment/schemas.ts` — Add publish schema
- `lib/recruitment/types.ts` — Add validation error type
- `messages/nl.json` / `messages/fr.json` — Publishing translation keys

**Key files to create:**
- `app/api/recruitment/vacancies/[id]/publish/route.ts` — Publish/unpublish/close API
- `components/recruitment/vacancy/vacancy-status-actions.tsx` — Status action buttons

### Scope Boundaries

**In scope for Story 1.7:**
- Publish/unpublish/close API with validation
- State machine enforcement (valid transitions only)
- VacancyStatusActions component with buttons per state
- Inline validation errors when publish fails
- Confirmation dialog for close action
- Toast notifications on success
- Status badge display
- i18n for nl/fr

**Deferred (explicit):**
- SSE event emission (Epic 2 infrastructure)
- Public page visibility logic (Epic 3, Story 3.1)
- ARCHIVED status and auto-archive (future story)
- Bulk publish/close (not in any epic)
- Publish scheduling (not in any epic)

### References

- [Epics: Story 1.7 ACs] `_bmad-output/planning-artifacts/epics.md` lines 499-531
- [Architecture: publish route] `_bmad-output/planning-artifacts/architecture.md` line 423
- [Architecture: SSE events] `_bmad-output/planning-artifacts/architecture.md` lines 333-334
- [UX: Primary action button] `_bmad-output/planning-artifacts/ux-design-specification.md` line 1325
- [UX: Toast patterns] `_bmad-output/planning-artifacts/ux-design-specification.md` lines 1354-1357
- [UX: Publish loading] `_bmad-output/planning-artifacts/ux-design-specification.md` line 1378
- [Existing: vacancy:publish permission] `lib/authz-registry.ts` line 79
- [Existing: VacancyStatus enum] `prisma/schema.prisma` lines 886-891

### Review Findings

- [x] [Review][Patch] Non-2xx API errors fail silently — fixed: added generic error display for non-validation failures
- [x] [Review][Patch] Network/catch errors disguised as "missing title" — fixed: separate errorMessage state with dedicated i18n key
- [x] [Review][Patch] request.json() can throw on malformed body — fixed: wrapped in try/catch returning 400 INVALID_JSON
- [x] [Review][Patch] TOCTOU: prisma.update missing deletedAt:null — fixed: added deletedAt:null to update WHERE clause
- [x] [Review][Patch] setTimeout without cleanup — fixed: useRef + useEffect cleanup for success timer
- [x] [Review][Defer] Reusing `unpublish` action for CLOSED→DRAFT conflates semantics with PUBLISHED→DRAFT — deferred, design choice for future analytics
- [x] [Review][Defer] Brittle error.message string matching in catch block — deferred, pre-existing pattern across all API routes

## Dev Agent Record

### Agent Model Used
Opus 4.6

### Debug Log References
- No compilation errors on TS check
- No linter errors on modified files

### Completion Notes List
- No toast library found; used inline success message with 4s auto-dismiss instead
- State machine includes CLOSED→DRAFT (reopen) transition per AC
- Used `422 PUBLISH_VALIDATION` code to distinguish from general 400 validation errors
- Publish validation returns all errors at once (not one-at-a-time)
- No SSE emission per scope boundary (deferred to Epic 2)

### Change Log
- Created publish API route with state machine, RBAC, and publish validation
- Added Zod schema `vacancyPublishActionSchema` and `VacancyPublishValidationError` type
- Built `VacancyStatusActions` component with context-sensitive buttons, badge, validation errors, and close confirmation
- Integrated into vacancy edit page at top of form
- Added 17 translation keys for nl and fr

### File List
- `app/api/recruitment/vacancies/[id]/publish/route.ts` (created)
- `components/recruitment/vacancy/vacancy-status-actions.tsx` (created)
- `lib/recruitment/schemas.ts` (modified)
- `lib/recruitment/types.ts` (modified)
- `app/(authenticated)/recruitment/vacatures/[id]/bewerken/client.tsx` (modified)
- `messages/nl.json` (modified)
- `messages/fr.json` (modified)
