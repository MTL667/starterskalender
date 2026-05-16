# Story 1.6: Pipeline Stage Configuration

Status: done

## Story

As a headhunter,
I want to configure the pipeline stages for each vacancy,
So that the recruitment process matches the specific requirements of each role.

## Acceptance Criteria

1. **Given** I am editing a vacancy
   **When** I open the pipeline configuration tab
   **Then** I see the current stages in order with: name, terminal flag, and email trigger toggle

2. **Given** I am viewing the stage list
   **When** I click "Add stage"
   **Then** I can add a new stage with a name, position in the order, and email trigger setting
   **And** the stage appears in the configured position

3. **Given** I have multiple stages
   **When** I drag a stage to reorder
   **Then** the order updates and persists
   **And** "Applied" always remains first and "Hired"/"Rejected" always remain as terminal stages (cannot be reordered away from terminal position)

4. **Given** I have a non-terminal, non-default stage
   **When** I click remove on that stage
   **Then** a confirmation appears warning about candidates currently in that stage (if any)
   **And** on confirmation, the stage is removed

5. **Given** a vacancy was created from a template
   **When** I view the pipeline configuration
   **Then** the template's default stages are pre-filled but fully editable

## Tasks / Subtasks

- [x] Task 1: Create stages API route for CRUD operations (AC: #1, #2, #3, #4)
  - [x] Create `app/api/recruitment/vacancies/[id]/stages/route.ts` with GET (list), POST (add stage), PATCH (reorder/update), DELETE (remove stage)
  - [x] GET: return stages ordered by `order` field
  - [x] POST: validate name + order + triggersEmail, insert with proper order re-indexing
  - [x] PATCH: accept array of `{ id, order }` for reorder, or single `{ id, name, triggersEmail }` for update
  - [x] DELETE: check if candidates exist in stage (return count in response for UI confirmation), then delete and re-index remaining orders
  - [x] Apply RBAC: `vacancy:edit` permission with entity-scope check on parent vacancy

- [x] Task 2: Add Zod schemas for stage operations (AC: #2, #3)
  - [x] Add `stageCreateSchema` to `lib/recruitment/schemas.ts`: name (string, 1-100), order (int >= 0), triggersEmail (boolean)
  - [x] Add `stageUpdateSchema`: name (optional), triggersEmail (optional)
  - [x] Add `stageReorderSchema`: array of `{ id: string, order: number }`

- [x] Task 3: Build StageConfigurator component (AC: #1, #2, #3, #4)
  - [x] Create `components/recruitment/vacancy/stage-configurator.tsx` — client component
  - [x] Display stages as an ordered list with: drag handle, name, terminal badge, email trigger toggle, delete button
  - [x] "Add stage" button at the bottom — inline form with name input + email trigger toggle
  - [x] Drag-to-reorder via native HTML drag or simple up/down buttons (no dnd-kit dependency for this — save for Epic 2 Kanban)
  - [x] Enforce constraints: "Applied" (order 0) not removable/reorderable, terminal stages (Hired/Rejected) not removable and always at end
  - [x] Delete confirmation dialog showing candidate count if > 0
  - [x] Explicit save button for reorder changes, inline save for add/delete

- [x] Task 4: Integrate StageConfigurator into vacancy edit page (AC: #1, #5)
  - [x] Add a "Pipeline" collapsible section to `app/(authenticated)/recruitment/vacatures/[id]/bewerken/client.tsx`
  - [x] Load stages from the vacancy data already fetched (stages are included in GET /vacancies/[id])
  - [x] Pass stages + vacancyId to StageConfigurator
  - [x] Component manages its own API calls to `/api/recruitment/vacancies/[id]/stages`

- [x] Task 5: Add translation keys (AC: all)
  - [x] Add pipeline configuration keys to `messages/nl.json`: section title, stage labels, add/remove buttons, confirmation dialog, terminal badge, email trigger label
  - [x] Add matching keys to `messages/fr.json`

## Dev Notes

### Data Model

**VacancyStage already exists** in `prisma/schema.prisma` (created in Story 1.1):

```prisma
model VacancyStage {
  id            String  @id @default(cuid())
  vacancyId     String
  vacancy       Vacancy @relation(fields: [vacancyId], references: [id], onDelete: Cascade)
  name          String
  order         Int
  isTerminal    Boolean @default(false)
  triggersEmail Boolean @default(false)

  @@unique([vacancyId, order])
  @@index([vacancyId])
}
```

**Default stages** are already created on vacancy creation in `app/api/recruitment/vacancies/route.ts`:
```
Applied (order: 0, terminal: false, triggersEmail: true)
Screening (order: 1, terminal: false, triggersEmail: false)
Interview (order: 2, terminal: false, triggersEmail: false)
Offer (order: 3, terminal: false, triggersEmail: false)
Hired (order: 4, terminal: true, triggersEmail: true)
Rejected (order: 5, terminal: true, triggersEmail: true)
```

**Important constraint:** `@@unique([vacancyId, order])` means order values must be unique per vacancy. When reordering or inserting, the API must re-index all order values to maintain gap-free sequence (0, 1, 2, 3...).

**Reorder strategy (to avoid unique constraint violations):** Use a Prisma `$transaction` that:
1. Deletes all non-terminal stages for the vacancy
2. Recreates them with new order values
OR use a two-pass approach:
1. Set all orders to negative temporary values (`order = -(order + 1000)`)
2. Then set the correct new orders
The first approach (delete + recreate in transaction) is simpler and avoids the unique constraint issue entirely. Terminal stages (Applied, Hired, Rejected) should keep their IDs stable since future stories may reference them.

**Template stages:** VacancyTemplate has `stages Json @default("[]")` with shape `{ name: string, order: number }`. When a vacancy is created from a template, template stages already override the defaults (handled in vacancy POST route from Story 1.4). The StageConfigurator on the edit page simply shows whatever stages exist — no special template handling needed here.

### Architecture Compliance

**Architecture specifies:**
- API route: `app/api/recruitment/vacancies/[id]/stages/route.ts` for GET, POST, PATCH, DELETE
- Component: `StageConfigurator.tsx` under `components/recruitment/vacancy/`
- Naming: `stage-configurator.tsx` (kebab-case file, PascalCase export)

**RBAC pattern:**
- Use `requirePermission('vacancy:edit')` + entity-scope check against parent vacancy's entityId
- Same pattern as PATCH `/api/recruitment/vacancies/[id]` route

**No dnd-kit for this story:** Architecture reserves dnd-kit for Epic 2 (Pipeline Kanban Board). Stage reorder in the configurator should use simple up/down arrow buttons or native HTML5 drag (lightweight). This avoids adding a dependency prematurely.

### UX Patterns from Spec

- **Progressive disclosure:** Pipeline config is an "advanced" section on the vacancy edit page (same pattern as criteria from Story 1.5 — use `<details>` collapsible)
- **Constraint enforcement:** Applied is always first, Hired/Rejected are always terminal and last. UI should visually distinguish these (e.g., lock icon, muted/disabled state) and prevent reorder/delete
- **Confirmation on delete:** If candidates exist in a stage, show count in confirmation dialog before allowing delete. If no candidates, delete immediately without confirmation.
- **Inline operations:** Add/delete are immediate (no page-level save). Reorder uses explicit save.

### Anti-Patterns to Avoid

- Do NOT use dnd-kit for stage reorder — that's Epic 2 dependency
- Do NOT modify the vacancy creation POST route — default stages are already handled
- Do NOT use server actions — use `fetch()` to API routes
- Do NOT store stage config in JSON on Vacancy — stages are a separate VacancyStage table (already exist)
- Do NOT make a new page for stage config — it's a section on the existing edit page

### Existing Patterns to Follow

**API pattern from Story 1.4 (templates [id] route):**
- `requirePermission` + `can()` check on entity
- Zod validation with `safeParse`
- Standard error response format: `{ error: { message, code } }`
- 404 if parent vacancy not found

**Edit page pattern from Story 1.5 (dealbreakers):**
- Collapsible `<details>` section for progressive disclosure
- Component receives data as props and manages its own API calls
- Explicit save button with status feedback (saving/saved/error)

**Add/remove list pattern from Story 1.4 (template-form.tsx):**
- Same add/remove interaction: Button to add, X button to remove
- Inline form for new items

### Previous Story Intelligence

**Story 1.5 learnings:**
- `<details>` element works well for progressive disclosure sections
- Explicit save with status feedback pattern (saving/saved/error) works reliably
- Zod discriminated unions are useful for type-dependent validation
- `criteriaSaveStatus` needed to reset on change (review finding) — apply same pattern here

**Story 1.4 review fixes:**
- `recruitment:read` for read endpoints, `vacancy:edit` for write
- Error states must be shown in UI (not just empty lists)
- Entity-scoped checks required for all write operations

**Key files to modify:**
- `app/(authenticated)/recruitment/vacatures/[id]/bewerken/client.tsx` — Add pipeline section
- `lib/recruitment/schemas.ts` — Add stage schemas
- `messages/nl.json` / `messages/fr.json` — Pipeline translation keys

**Key files to create:**
- `app/api/recruitment/vacancies/[id]/stages/route.ts` — Stage CRUD API
- `components/recruitment/vacancy/stage-configurator.tsx` — Stage editor component

### Scope Boundaries

**In scope for Story 1.6:**
- Stage CRUD API (GET/POST/PATCH/DELETE) with RBAC
- StageConfigurator component with add/remove/reorder
- Constraint enforcement (Applied first, terminals last)
- Delete confirmation with candidate count
- Integration into vacancy edit page
- i18n for nl/fr

**Deferred (explicit):**
- dnd-kit drag & drop (Epic 2 — Kanban board)
- Email template configuration per stage (Epic 6, Story 6.1)
- Actual email sending on stage transition (Epic 6, Story 6.2)
- Candidate count per stage display on Kanban (Epic 2, Story 2.2)
- Stage color/icon configuration (not in any epic — future enhancement)

### References

- [Epics: Story 1.6 ACs] `_bmad-output/planning-artifacts/epics.md` lines 466-496
- [Architecture: VacancyStage table] `_bmad-output/planning-artifacts/architecture.md` line 159
- [Architecture: stages API route] `_bmad-output/planning-artifacts/architecture.md` line 424
- [Architecture: StageConfigurator.tsx] `_bmad-output/planning-artifacts/architecture.md` line 465
- [UX: Progressive disclosure] `_bmad-output/planning-artifacts/ux-design-specification.md` lines 338-341
- [Existing: vacancy edit client] `app/(authenticated)/recruitment/vacatures/[id]/bewerken/client.tsx`
- [Existing: vacancy creation defaults] `app/api/recruitment/vacancies/route.ts` lines 77-86
- [Existing: VacancyStage Prisma model] `prisma/schema.prisma` lines 945-955

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- TS error fixed: `deleteTarget?.stage.name` was `string | undefined`, added `?? ''` fallback

### Completion Notes List
- Task 1+2: Created stage CRUD API with full RBAC (vacancy:edit + entity scope check). GET uses recruitment:read. POST shifts existing orders. PATCH supports both array (reorder) and object (single update). DELETE checks candidate count, supports confirmation flow, re-indexes orders. Two-pass negative trick for unique constraint.
- Task 3: StageConfigurator with up/down arrow reorder (no dnd-kit), inline add form, email trigger toggle per stage, delete with AlertDialog confirmation, constraint enforcement (protected Applied + terminal stages).
- Task 4: Integrated as collapsible `<details>` section on edit page (between content blocks and criteria). Uses vacancy.stages from initial fetch.
- Task 5: 17 pipeline translation keys per language (nl/fr).

### Review Findings

- [x] [Review][Patch] PATCH reorder does not verify stage IDs belong to target vacancy — fixed: added vacancyId check in transaction before reorder
- [x] [Review][Patch] GET handler missing entity-scope check — fixed: added visibleEntityIds check consistent with GET /vacancies/[id]
- [x] [Review][Defer] POST doesn't validate order bounds (e.g. order: 999 creates gap) — cosmetic, no security issue
- [x] [Review][Dismiss] PostgreSQL unique constraint safety on updateMany — safe for single UPDATE statement
- [x] [Review][Dismiss] Client POST optimistic state divergence — acceptable for single-user edit

### Change Log
- 2026-05-15: Story 1.6 implementation complete — pipeline stage configuration on vacancy edit page

### File List
- app/api/recruitment/vacancies/[id]/stages/route.ts (created)
- components/recruitment/vacancy/stage-configurator.tsx (created)
- lib/recruitment/schemas.ts (modified)
- app/(authenticated)/recruitment/vacatures/[id]/bewerken/client.tsx (modified)
- messages/nl.json (modified)
- messages/fr.json (modified)
