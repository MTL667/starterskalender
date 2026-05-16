# Story 1.4: Vacancy Templates

Status: done

## Story

As a headhunter,
I want to create a vacancy from a reusable template,
So that I can quickly set up new vacancies with pre-configured content, stages, and criteria.

## Acceptance Criteria

1. **Given** I have `recruitment:admin` permission
   **When** I navigate to `/recruitment/admin/templates`
   **Then** I see a list of existing vacancy templates with name, linked function, and usage count
   **And** I can create a new template with: name, default content blocks, default pipeline stages, default dealbreakers, and default nice-to-haves

2. **Given** templates exist for my entities
   **When** I create a new vacancy at `/recruitment/vacatures/nieuw`
   **Then** I first see a template selector showing available templates
   **And** selecting a template pre-fills content blocks, pipeline stages, and criteria configuration
   **And** I can still edit all pre-filled values before saving

3. **Given** I select "Blank vacancy" in the template selector
   **When** I proceed
   **Then** I get an empty vacancy form with default pipeline stages (Applied, Screening, Interview, Offer, Hired, Rejected)

## Tasks / Subtasks

- [x] Task 1: Add VacancyTemplate Prisma model + migration (AC: #1)
  - [x] Add `VacancyTemplate` model to `prisma/schema.prisma` with fields: id, name, entityId, functionId?, content (Json, default content blocks), stages (Json, default stage names), dealbreakers (Json), niceToHaves (Json), usageCount (Int), createdById, timestamps
  - [x] Add relation from Entity and User to VacancyTemplate
  - [x] Run `npx prisma generate` (and `db push` if applicable)
  - [x] Add `VacancyTemplate` type to `lib/recruitment/types.ts`

- [x] Task 2: Create template Zod schemas + API routes (AC: #1)
  - [x] Add `vacancyTemplateCreateSchema` and `vacancyTemplateUpdateSchema` to `lib/recruitment/schemas.ts`
  - [x] Create `app/api/recruitment/templates/route.ts` — GET (list for entity) + POST (create)
  - [x] Create `app/api/recruitment/templates/[id]/route.ts` — GET (single) + PATCH (update) + DELETE
  - [x] All routes enforce `recruitment:admin` permission via `requirePermission`
  - [x] Entity-scoped: list only returns templates for user's visible entities

- [x] Task 3: Build template admin page (AC: #1)
  - [x] Create `app/(authenticated)/recruitment/admin/templates/page.tsx` — server component with `recruitment:admin` guard
  - [x] Create `components/recruitment/template/template-list.tsx` — client component displaying templates table (name, function, entity, usage count)
  - [x] Add "New template" button linking to create page
  - [x] Create `app/(authenticated)/recruitment/admin/templates/nieuw/page.tsx` — template creation form
  - [x] Create `components/recruitment/template/template-form.tsx` — form with: name, entity selector, function selector, content block editor (reuse `ContentBlockEditor`), stages configuration (text list), dealbreakers/nice-to-haves configuration

- [x] Task 4: Build template selector for vacancy creation (AC: #2, #3)
  - [x] Create `components/recruitment/vacancy/template-selector.tsx` — client component showing template cards + "Blank vacancy" option
  - [x] Modify `app/(authenticated)/recruitment/vacatures/nieuw/page.tsx` — show template selector first, then proceed to VacancyForm with pre-filled data
  - [x] Template selection deep-clones content blocks (with new UUIDs) and pre-fills form fields
  - [x] "Blank vacancy" creates empty form with default stages: Applied, Screening, Interview, Offer, Hired, Rejected

- [x] Task 5: Increment template usage count on vacancy creation (AC: #2)
  - [x] When a vacancy is created from a template, increment the template's `usageCount` field
  - [x] Store `templateId` reference on the vacancy (optional field on Vacancy model) for tracking

- [x] Task 6: Add translation keys (AC: all)
  - [x] Add template admin keys to `messages/nl.json`: template list, form labels, template selector, blank vacancy label
  - [x] Add matching keys to `messages/fr.json`

## Dev Notes

### Data Model

**New Prisma model — VacancyTemplate:**

```prisma
model VacancyTemplate {
  id            String    @id @default(cuid())
  name          String
  entityId      String
  entity        Entity    @relation(fields: [entityId], references: [id], onDelete: Cascade)
  functionId    String?
  function      JobRole?  @relation(fields: [functionId], references: [id], onDelete: SetNull)
  content       Json      @default("[]")    // ContentBlock[] — same shape as Vacancy.content
  stages        Json      @default("[]")    // Array<{ name: string, order: number }>
  dealbreakers  Json      @default("[]")    // Array<{ text: string }>
  niceToHaves   Json      @default("[]")    // Array<{ text: string, weight: number }>
  usageCount    Int       @default(0)
  createdById   String
  createdBy     User      @relation("TemplateCreator", fields: [createdById], references: [id])
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([entityId])
}
```

**Optional: Add `templateId` to Vacancy model** to track which template was used:
```prisma
  templateId    String?
  template      VacancyTemplate? @relation(fields: [templateId], references: [id], onDelete: SetNull)
```

### Default Pipeline Stages

When "Blank vacancy" is selected, pre-fill with these default stages:
```json
[
  { "name": "Applied", "order": 0 },
  { "name": "Screening", "order": 1 },
  { "name": "Interview", "order": 2 },
  { "name": "Offer", "order": 3 },
  { "name": "Hired", "order": 4 },
  { "name": "Rejected", "order": 5 }
]
```

### Architecture Compliance

**Architecture decisions:**
- Admin template management at `app/(authenticated)/recruitment/admin/templates/page.tsx`
- Template API at `app/api/recruitment/templates/route.ts`
- `VacancyTemplateSelector.tsx` component per architecture spec
- `lib/recruitment/vacancy-templates.ts` for template loading utilities (per architecture)
- Template content uses the same `ContentBlock[]` JSON shape as `Vacancy.content`
- Blocks are **reusable in templates** — architecture confirms JSON blocks designed for template reuse

**Component placement:**
```
components/recruitment/
├── template/
│   ├── template-list.tsx           # Admin template list (NEW)
│   ├── template-form.tsx           # Admin template create/edit form (NEW)
│   └── template-selector.tsx       # Template picker for vacancy creation (NEW — note: architecture calls this VacancyTemplateSelector)
├── vacancy/
│   ├── content-block-editor.tsx    # Reused in template form
│   └── ...
```

### UX Patterns from Spec

- **Progressive disclosure:** Vacancy builder starts with essentials (title, entity, template). Advanced options revealed on demand.
- **One-step, not wizard:** Pick template → edit content. Not a 5-step wizard.
- **Template selector cards:** Show template name, linked function. "Blank vacancy" as an always-available option.
- **Pre-filled from template:** Content blocks, pipeline stages, criteria are copied from template into vacancy — user can edit all before saving.
- **Admin template management:** `/recruitment/admin/templates` — list with name, function, usage count. Create/edit forms.
- **Default stages** (when blank): Applied → Screening → Interview → Offer → Hired → Rejected

### Anti-Patterns to Avoid

- Do NOT create a multi-step wizard for vacancy creation — keep it as one-step template selection → form
- Do NOT use server actions — use `fetch()` to API routes
- Do NOT modify the existing `ContentBlockEditor` component — reuse it as-is in the template form
- Do NOT hard-code templates in the UI — they are database-driven entities
- Do NOT skip entity-scoped RBAC — templates are per-entity, enforced via `visibleEntityIds`

### Existing Patterns to Follow

**API routes:** Follow the pattern from `app/api/recruitment/vacancies/route.ts` and `[id]/route.ts`:
- `requirePermission('recruitment:admin')` for template CRUD
- Entity-scoped filtering via `visibleEntityIds`
- Zod validation at boundary
- Structured error responses `{ error: { message, code } }`
- Try/catch for auth errors

**Client forms:** Controlled React state + shadcn primitives. No React Hook Form. Entity and function selectors via `/api/entities` and `/api/job-roles`.

**Routing (Dutch):** Admin pages under `/recruitment/admin/templates/`, template create at `/recruitment/admin/templates/nieuw`

**Content blocks reuse:** The template form's content editor can render the same `ContentBlockEditor` component from Story 1.3 — blocks have the same shape, and the template simply stores them for later cloning into vacancies.

### Previous Story Intelligence

**Story 1.1:** RBAC foundation — `recruitment:admin` permission exists in `lib/authz-registry.ts`. Entity/function selectors available.

**Story 1.2:** Vacancy CRUD — form pattern (`VacancyForm`), API patterns, entity-scoped checks. Edit page has server permission guard.

**Story 1.3:** Content block builder — `ContentBlockEditor` component reusable in template forms. `ContentBlock` type and `contentBlockSchema` for validation. Autosave pattern (may not apply to templates — templates use explicit save).

**Key files to create:**
- `prisma/schema.prisma` — VacancyTemplate model
- `lib/recruitment/vacancy-templates.ts` — template utilities (default stages, clone helpers)
- `lib/recruitment/schemas.ts` — template schemas
- `app/api/recruitment/templates/route.ts` — template CRUD API
- `app/api/recruitment/templates/[id]/route.ts` — single template API
- `app/(authenticated)/recruitment/admin/templates/page.tsx` — admin list
- `app/(authenticated)/recruitment/admin/templates/nieuw/page.tsx` — create template
- `components/recruitment/template/template-list.tsx` — list component
- `components/recruitment/template/template-form.tsx` — form component
- `components/recruitment/vacancy/template-selector.tsx` — picker for vacancy creation

**Key files to modify:**
- `app/(authenticated)/recruitment/vacatures/nieuw/page.tsx` — add template selector before form
- `app/api/recruitment/vacancies/route.ts` — increment usageCount on template-based creation
- `messages/nl.json` / `messages/fr.json` — template translation keys

### Scope Boundaries

**In scope for Story 1.4:**
- VacancyTemplate CRUD (admin)
- Template selector on vacancy creation
- Pre-filling vacancy from template (content blocks only — stages and dealbreakers are placeholder JSON for now, actual pipeline stage creation is Story 1.6, dealbreakers are Story 1.5)
- Blank vacancy with default stage names
- Usage count tracking

**Deferred (explicit):**
- Actual VacancyStage creation from template stages — Story 1.6 implements pipeline stage configuration
- Dealbreaker/nice-to-have creation from template — Story 1.5 implements dealbreaker configuration
- Template editing/updating — can be added but is lower priority than create + select
- Template deletion cascade handling

### References

- [Architecture: VacancyTemplateSelector] `_bmad-output/planning-artifacts/architecture.md` lines 461-466
- [Architecture: Template API routes] `_bmad-output/planning-artifacts/architecture.md` lines 435-436
- [Architecture: vacancy-templates.ts] `_bmad-output/planning-artifacts/architecture.md` lines 483-493
- [Architecture: Admin template page] `_bmad-output/planning-artifacts/architecture.md` lines 256-262
- [UX: Template selector in journey] `_bmad-output/planning-artifacts/ux-design-specification.md` lines 877-887
- [UX: Progressive disclosure] `_bmad-output/planning-artifacts/ux-design-specification.md` lines 338-341
- [PRD: FR1 — vacancy from template] `_bmad-output/planning-artifacts/prd.md` line 396
- [PRD: FR9 — admin manage templates] `_bmad-output/planning-artifacts/prd.md` line 404
- [Existing: ContentBlockEditor] `components/recruitment/vacancy/content-block-editor.tsx`
- [Existing: ContentBlock type] `lib/recruitment/types.ts` lines 24-29
- [Existing: Vacancy form] `components/recruitment/vacancy/vacancy-form.tsx`

### Review Findings

- [x] [Review][Patch] **Template GET vereist `recruitment:admin` — breekt template selector voor gewone gebruikers** — [x] fixed: GET changed to `recruitment:read`
- [x] [Review][Patch] **PATCH template staat entityId-change toe zonder auth op target** — [x] fixed: added `can()` check for new `entityId` when changed
- [x] [Review][Patch] **templateId niet gevalideerd tegen vacancy's entityId** — [x] fixed: fetch template and verify `entityId` match before creating vacancy
- [x] [Review][Patch] **Pre-filled content blocks niet bewerkbaar voor opslaan** — [x] fixed: added ContentBlockEditor to VacancyForm create mode with editable state
- [x] [Review][Patch] **Stille failure op usageCount increment** — [x] fixed: `.catch(() => {})` replaced with `console.error` logging
- [x] [Review][Patch] **Template list linkt naar niet-bestaande detail pagina** — [x] fixed: removed link, showing plain text name
- [x] [Review][Patch] **API errors getoond als lege template lijst** — [x] fixed: added error state + `loadError` translation key to TemplateSelector and TemplateList
- [x] [Review][Defer] req.json() kan crashen op malformed JSON — pre-existing patroon in alle routes — deferred
- [x] [Review][Defer] Auth error detectie via error.message substring — pre-existing patroon — deferred
- [x] [Review][Defer] Geen paginatie op template GET — acceptabel voor MVP — deferred
- [x] [Review][Defer] Template stages missen invariants (duplicate order/name) — Story 1.6 scope — deferred
- [x] [Review][Defer] Type/validatie drift (media type in TS maar niet in Zod) — pre-existing uit Story 1.3 — deferred
- [x] [Review][Defer] Dubbele DEFAULT_STAGES hardcoded op 2 plekken — laag risico — deferred
- [x] [Review][Defer] functionId vs entityId cross-entity integriteit — pre-existing patroon — deferred

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- TypeScript compile check: one new error fixed (TemplateData type rename in template-selector.tsx). All remaining errors are pre-existing in test files.

### Completion Notes List
- Task 1: Added `VacancyTemplate` Prisma model with all fields + relations to Entity, User, JobRole. Added `templateId` to Vacancy model. Added types to `lib/recruitment/types.ts`.
- Task 2: Created Zod schemas (`vacancyTemplateCreateSchema`, `vacancyTemplateUpdateSchema`). Reordered schemas.ts to fix forward reference. Created API routes for templates (collection + single) with full RBAC.
- Task 3: Built admin template pages (list + create) with server-side `recruitment:admin` guard. Reuses `ContentBlockEditor` from Story 1.3.
- Task 4: Built `TemplateSelector` component with blank vacancy + template cards. Refactored `/vacatures/nieuw` into server page + `NewVacancyFlow` client component with two-step flow. Content blocks deep-cloned with new UUIDs.
- Task 5: Updated vacancy POST route to destructure `templateId`/`content`, store `templateId` on vacancy, and increment `usageCount` on template.
- Task 6: Added ~30 translation keys per language (nl/fr) for template admin, selector, and form.

### Change Log
- `prisma/schema.prisma` — Added `VacancyTemplate` model, `templateId` on Vacancy, relations on Entity/User/JobRole
- `lib/recruitment/types.ts` — Added `VacancyTemplateWithRelations`, `TemplateStage`, `DealbreakerItem`, `NiceToHaveItem`
- `lib/recruitment/schemas.ts` — Reordered; added template schemas; added `templateId`/`content` to `vacancyCreateSchema`
- `app/api/recruitment/templates/route.ts` — NEW: GET + POST for templates
- `app/api/recruitment/templates/[id]/route.ts` — NEW: GET + PATCH + DELETE for single template
- `app/(authenticated)/recruitment/admin/templates/page.tsx` — NEW: Admin template list page
- `app/(authenticated)/recruitment/admin/templates/nieuw/page.tsx` — NEW: Admin template create page
- `components/recruitment/template/template-list.tsx` — NEW: Client template list table
- `components/recruitment/template/template-form.tsx` — NEW: Client template form with ContentBlockEditor, stages, dealbreakers, nice-to-haves
- `components/recruitment/vacancy/template-selector.tsx` — NEW: Template picker for vacancy creation
- `app/(authenticated)/recruitment/vacatures/nieuw/page.tsx` — Refactored to use NewVacancyFlow client component
- `app/(authenticated)/recruitment/vacatures/nieuw/client.tsx` — NEW: Two-step flow (select template → form)
- `components/recruitment/vacancy/vacancy-form.tsx` — Added templateId/templateContent props, ContentBlock import
- `app/api/recruitment/vacancies/route.ts` — Destructure templateId/content, increment usageCount
- `messages/nl.json` — Added templates namespace with ~30 keys
- `messages/fr.json` — Added templates namespace with ~30 keys

### File List
- `prisma/schema.prisma`
- `lib/recruitment/types.ts`
- `lib/recruitment/schemas.ts`
- `app/api/recruitment/templates/route.ts`
- `app/api/recruitment/templates/[id]/route.ts`
- `app/(authenticated)/recruitment/admin/templates/page.tsx`
- `app/(authenticated)/recruitment/admin/templates/nieuw/page.tsx`
- `components/recruitment/template/template-list.tsx`
- `components/recruitment/template/template-form.tsx`
- `components/recruitment/vacancy/template-selector.tsx`
- `app/(authenticated)/recruitment/vacatures/nieuw/page.tsx`
- `app/(authenticated)/recruitment/vacatures/nieuw/client.tsx`
- `components/recruitment/vacancy/vacancy-form.tsx`
- `app/api/recruitment/vacancies/route.ts`
- `messages/nl.json`
- `messages/fr.json`
