# Story 1.2: Vacancy CRUD with Basic Fields

Status: done

## Story

As a headhunter,
I want to create, view, edit, and delete vacancies with basic information,
So that I can start managing open positions for my entities.

## Acceptance Criteria

1. **Given** I have `vacancy:create` permission for my entity
   **When** I navigate to `/recruitment/vacatures/nieuw`
   **Then** I see a form with fields: title (required), entity (select filtered to my entities), job function (select from JobRole), employment type, location, and description (plain text)
   **And** all form inputs are validated with Zod schemas at the API boundary
   **And** on successful submission I am redirected to the vacancy detail page
   **And** the vacancy appears in the list at `/recruitment/vacatures`

2. **Given** I am on the vacancy list page
   **When** I view the list
   **Then** I see all vacancies for my entities with title, entity badge, status, and created date
   **And** I can filter by entity and status (draft, published, closed)

3. **Given** I have `vacancy:edit` permission
   **When** I navigate to a vacancy's edit page
   **Then** I can update all basic fields and save
   **And** validation errors are shown inline per field

4. **Given** I have `vacancy:delete` permission
   **When** I click delete on a draft vacancy
   **Then** a destructive confirmation dialog appears (red outlined button, not primary)
   **And** on confirmation the vacancy is soft-deleted

## Tasks / Subtasks

- [x] Task 1: Extend Prisma schema with `description` field (AC: #1, #3)
  - [x] Add `description String?` field to `Vacancy` model in `prisma/schema.prisma`
  - [x] Add `deletedAt DateTime?` field to `Vacancy` model for soft-delete support
  - [x] Add `@@index([deletedAt])` to Vacancy model
  - [x] Run `npx prisma generate` to regenerate client
  - [x] Update `vacancyCreateSchema` in `lib/recruitment/schemas.ts` to include `description`
  - [x] Update `vacancyUpdateSchema` accordingly
  - [x] Update `VacancyWithRelations` type in `lib/recruitment/types.ts` (no change needed if using Prisma types)

- [x] Task 2: Create vacancy detail API route `app/api/recruitment/vacancies/[id]/route.ts` (AC: #1, #3, #4)
  - [x] GET handler: fetch single vacancy by id with entity-scoped permission check via `visibleEntityIds()`
  - [x] PATCH handler: update vacancy fields, validate with `vacancyUpdateSchema`, entity-scoped `can(user, 'vacancy:edit', { entityId })`
  - [x] DELETE handler: soft-delete (set `deletedAt = new Date()`), only drafts, permission `vacancy:delete` with entity scope
  - [x] Add `deletedAt: null` filter to collection GET in `app/api/recruitment/vacancies/route.ts`

- [x] Task 3: Create vacancy form page `/recruitment/vacatures/nieuw/page.tsx` (AC: #1)
  - [x] Client component (`'use client'`) with controlled form state
  - [x] Fields: title (Input, required), entity (Select, filtered to user's entities), function (Select from JobRole), type (Select: fulltime/parttime/interim), location (Input), description (Textarea)
  - [x] Entity select: fetch user's accessible entities from existing API
  - [x] Function select: fetch JobRoles (existing model)
  - [x] Submit via `fetch('/api/recruitment/vacancies', { method: 'POST' })` — match existing pattern (no server actions)
  - [x] On success: `router.push('/recruitment/vacatures/[id]')` to detail page
  - [x] On validation error: show inline errors per field
  - [x] Add translation keys to `messages/nl.json` and `messages/fr.json`

- [x] Task 4: Create vacancy detail page `/recruitment/vacatures/[id]/page.tsx` (AC: #1, #3, #4)
  - [x] Server component with permission guard (`recruitment:read` + entity scope)
  - [x] Fetch vacancy via API or direct Prisma query
  - [x] Display all fields: title, entity badge, status badge, function, type, location, description, created date
  - [x] "Edit" button (if `vacancy:edit` permission) → link to edit page
  - [x] "Delete" button (if `vacancy:delete` permission, only for DRAFT status) → destructive confirmation dialog
  - [x] Delete confirmation: use shadcn `AlertDialog` with red outlined destructive button (not primary)

- [x] Task 5: Create vacancy edit page `/recruitment/vacatures/[id]/bewerken/page.tsx` (AC: #3)
  - [x] Client component, same form as create but pre-filled with existing data
  - [x] Fetch vacancy data on mount
  - [x] Submit via `fetch('/api/recruitment/vacancies/[id]', { method: 'PATCH' })`
  - [x] On success: redirect to detail page
  - [x] Inline validation errors per field

- [x] Task 6: Upgrade vacancy list page `/recruitment/vacatures/page.tsx` (AC: #2)
  - [x] Convert to client component to support filtering and data fetching
  - [x] Fetch vacancies from `GET /api/recruitment/vacancies`
  - [x] Render table with columns: title, entity (Badge), status (colored Badge), created date (formatted)
  - [x] Entity filter: Select dropdown with user's accessible entities
  - [x] Status filter: Select with options Draft/Published/Closed
  - [x] Empty state: keep existing "Nog geen vacatures" message with create CTA
  - [x] Loading state: skeleton rows

- [x] Task 7: Add translation keys (AC: all)
  - [x] Extend `messages/nl.json` recruitment namespace with form labels, validation messages, action buttons, filter labels
  - [x] Extend `messages/fr.json` with French equivalents

## Dev Notes

### Schema Changes

The `Vacancy` model needs two new fields for this story:

```prisma
description String?
deletedAt   DateTime?
```

Add `@@index([deletedAt])` for efficient soft-delete filtering. All collection queries (list, etc.) must filter `deletedAt: null`.

Update `vacancyCreateSchema`:
```typescript
export const vacancyCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  entityId: z.string().cuid(),
  functionId: z.string().cuid().optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  type: z.string().max(50).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
})
```

### Architecture Compliance

**Route structure** per architecture.md:
```
app/(authenticated)/recruitment/vacatures/
├── page.tsx            # List (upgrading existing placeholder)
├── nieuw/page.tsx      # Create form (NEW)
└── [id]/
    ├── page.tsx        # Detail view (NEW)
    └── bewerken/page.tsx  # Edit form (NEW) — Dutch name, not "edit"
```

**API structure** per architecture.md:
```
app/api/recruitment/vacancies/
├── route.ts            # GET list, POST create (EXISTS — update GET filter)
└── [id]/route.ts       # GET single, PATCH update, DELETE soft-delete (NEW)
```

### Existing Patterns to Follow

**API routes:** Use `requirePermission()` for basic auth, `can(user, perm, { entityId })` for entity-scoped checks, `visibleEntityIds()` for list queries. Response format: `{ data: T }` success, `{ error: { message, code } }` errors. Reference: `app/api/recruitment/vacancies/route.ts` (Story 1.1 with review fixes).

**Client forms:** Controlled React state + shadcn `Input`/`Label`/`Textarea`/`Select` — NO React Hook Form (not in project). Submit via `fetch()` to API routes. Error handling via `alert()` or inline state. Reference: `app/(authenticated)/admin/materials/page.tsx`.

**Server pages:** `getCurrentUser()` + `toAuthorizedUser()` + `can()` for permission guards. Reference: existing `recruitment/page.tsx` and `recruitment/vacatures/page.tsx`.

**Delete confirmation:** Use shadcn `AlertDialog` (not browser `confirm()`). Destructive button: red outlined (`variant="destructive"` with `outline`), not primary red fill. Reference UX spec: "red outlined button, not primary".

**Translations:** next-intl with `useTranslations('recruitment')` client-side, `getTranslations('recruitment')` server-side. Add keys to both `messages/nl.json` and `messages/fr.json`.

### Entity & Function Selectors

To populate the entity select, the user's accessible entities are derivable from:
- `visibleEntityIds(user, 'vacancy:create')` on the API side
- For the client form, fetch entities from an existing endpoint or create a simple one

For job functions (JobRole), there's an existing model. Check for an existing API endpoint (e.g. `/api/admin/functions` or similar). If none exists, create a minimal `GET /api/recruitment/job-roles` that returns JobRoles.

### Soft-Delete Pattern

AC #4 specifies soft-delete for draft vacancies. Implementation:
- Add `deletedAt DateTime?` to Vacancy model
- DELETE handler: `prisma.vacancy.update({ where: { id }, data: { deletedAt: new Date() } })`
- Only allow deletion of DRAFT status vacancies (return 400 if not draft)
- All list/detail queries must include `deletedAt: null` in where clause

### UX Patterns from Spec

- **Form layout:** Single-column, progressive disclosure (basic fields always visible)
- **Entity selector:** Pre-fill with user's primary entity if only one
- **Validation:** Inline on blur (client-side), Zod at API boundary (server-side)
- **Required fields:** Asterisk in label, not in placeholder
- **Status badges:** Draft (gray), Published (green), Closed (red/orange)
- **Loading:** Skeleton rows for list, skeleton form for detail
- **List view:** Table on desktop, card list on mobile (use responsive Tailwind)

### Anti-Patterns to Avoid

- Do NOT use `react-hook-form` or `@hookform/resolvers` — not in this project
- Do NOT use server actions (`"use server"`) — this project uses API routes for mutations
- Do NOT use `sonner` or `react-hot-toast` — not installed; use `alert()` or shadcn `AlertDialog` for now
- Do NOT hard-delete vacancies — always soft-delete via `deletedAt`
- Do NOT forget entity-scope checks on PATCH/DELETE — use `can(user, perm, { entityId })` after loading the vacancy

### Previous Story Intelligence (Story 1.1)

**Files created that this story builds on:**
- `app/(authenticated)/recruitment/page.tsx` — overview page (no changes needed)
- `app/(authenticated)/recruitment/vacatures/page.tsx` — upgrade from placeholder to real list
- `app/api/recruitment/vacancies/route.ts` — add `deletedAt: null` filter to GET
- `lib/recruitment/schemas.ts` — extend with `description` field
- `lib/recruitment/types.ts` — types auto-update from Prisma
- `lib/recruitment/permissions.ts` — permissions already defined, just use them

**Review findings applied in 1.1:**
- GET route now uses `visibleEntityIds()` returning `'ALL'` for admin roles — continue this pattern
- POST route checks entity-scoped permission with `can()` after Zod validation — apply same pattern to PATCH/DELETE

**Deferred from 1.1 review:** VacancyStage `@@unique([vacancyId, order])` complicates reordering — not relevant to this story.

### Project Structure Notes

- Dutch route names: `nieuw` (create), `bewerken` (edit) — per architecture spec
- Components for vacancy UI should go in `components/recruitment/vacancy/` per architecture naming
- Shared UI stays in `components/ui/` (shadcn)

### References

- [Architecture: Route Organization] `_bmad-output/planning-artifacts/architecture.md` lines 248-294
- [Architecture: API Response Format] `_bmad-output/planning-artifacts/architecture.md` lines 303-313
- [Architecture: Naming Patterns] `_bmad-output/planning-artifacts/architecture.md` lines 225-244
- [UX: Form Patterns] `_bmad-output/planning-artifacts/ux-design-specification.md` — single-column forms, validation on blur
- [UX: Vacancy List] `_bmad-output/planning-artifacts/ux-design-specification.md` — table desktop, card mobile
- [PRD: FR1-9] Vacancy Management functional requirements
- [PRD: MVP] "Vacancy CRUD + template builder" — Must-Have Phase 1
- [Existing Pattern: Materials CRUD] `app/(authenticated)/admin/materials/page.tsx` — form in dialog pattern
- [Existing Pattern: Starters API] `app/api/starters/[id]/route.ts` — GET/PATCH/DELETE with Zod
- [Story 1.1 route] `app/api/recruitment/vacancies/route.ts` — visibleEntityIds + can() patterns

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Prisma validate + generate: passed
- TypeScript compilation: 0 errors in recruitment files (pre-existing test file errors only)
- Linter: 0 errors in all new/modified files

### Completion Notes List

- Extended Vacancy model with `description String?` and `deletedAt DateTime?` fields + index
- Created full CRUD API at `/api/recruitment/vacancies/[id]` with GET/PATCH/DELETE, entity-scoped RBAC
- Added `deletedAt: null` filter to collection GET endpoint
- Built reusable `VacancyForm` component shared between create and edit pages
- Built `VacancyDeleteButton` with AlertDialog (red outlined destructive button per UX spec)
- Created create page at `/recruitment/vacatures/nieuw` with server-side permission guard
- Created detail page at `/recruitment/vacatures/[id]` with full field display and action buttons
- Created edit page at `/recruitment/vacatures/[id]/bewerken` with pre-filled form
- Upgraded list page with entity/status filters, responsive table (desktop) + card list (mobile)
- Added ~40 translation keys to both nl.json and fr.json
- Installed `@radix-ui/react-alert-dialog` and created shadcn AlertDialog component
- Soft-delete: only DRAFT vacancies can be deleted, sets `deletedAt` timestamp

### Review Findings

- [x] [Review][Patch] PATCH allows status changes via vacancyUpdateSchema — fixed: stripped `status` from vacancyUpdateSchema; status changes require dedicated endpoint with vacancy:publish [lib/recruitment/schemas.ts]
- [x] [Review][Patch] Edit page missing permission guard — fixed: split into server page.tsx (vacancy:edit guard) + client.tsx (form); unauthorized users redirected [app/(authenticated)/recruitment/vacatures/[id]/bewerken/]
- [x] [Review][Patch] Collection route GET/POST missing try/catch — fixed: added try/catch with structured error responses matching [id] route pattern [app/api/recruitment/vacancies/route.ts]
- [x] [Review][Defer] List page "New Vacancy" button not permission-guarded — client component, would need session/permission API; API guards create; low risk — deferred

### Change Log

- 2026-05-15: Story 1.2 implemented — full vacancy CRUD with basic fields

### File List

**New files:**
- `app/api/recruitment/vacancies/[id]/route.ts`
- `app/(authenticated)/recruitment/vacatures/nieuw/page.tsx`
- `app/(authenticated)/recruitment/vacatures/[id]/page.tsx`
- `app/(authenticated)/recruitment/vacatures/[id]/bewerken/page.tsx`
- `components/recruitment/vacancy/vacancy-form.tsx`
- `components/recruitment/vacancy/vacancy-delete-button.tsx`
- `components/ui/alert-dialog.tsx`

**Modified files:**
- `prisma/schema.prisma` — added `description`, `deletedAt`, `@@index([deletedAt])` to Vacancy
- `lib/recruitment/schemas.ts` — added `description` to vacancyCreateSchema
- `app/api/recruitment/vacancies/route.ts` — added `deletedAt: null` filter to GET
- `app/(authenticated)/recruitment/vacatures/page.tsx` — upgraded to client component with filters
- `messages/nl.json` — extended recruitment namespace (~40 keys)
- `messages/fr.json` — extended recruitment namespace (~40 keys)
- `package.json` — added `@radix-ui/react-alert-dialog`
