# Story 1.5: Dealbreakers & Nice-to-Have Configuration

Status: done

## Story

As a headhunter,
I want to define hard requirements and weighted preferences per vacancy,
So that candidates are automatically filtered and scored when they apply.

## Acceptance Criteria

1. **Given** I am editing a vacancy
   **When** I open the criteria configuration tab
   **Then** I see two sections: "Dealbreakers" (hard requirements) and "Nice-to-haves" (weighted preferences)

2. **Given** I am in the Dealbreakers section
   **When** I add a dealbreaker
   **Then** I can specify: criterion name, type (boolean yes/no, minimum value, selection from options), and the required value
   **And** each dealbreaker has a clear label explaining what disqualifies a candidate

3. **Given** I am in the Nice-to-haves section
   **When** I add a preference
   **Then** I can specify: criterion name, type (scale 1-5, boolean, selection), and a weight (1-10)
   **And** the total weight distribution is shown as a percentage breakdown

4. **Given** I have configured criteria
   **When** I save the vacancy
   **Then** dealbreakers and nice-to-haves are stored as structured JSON per vacancy
   **And** they are available for the candidate scoring engine (Epic 3)

## Tasks / Subtasks

- [x] Task 1: Extend Vacancy Prisma model with dealbreakers + niceToHaves JSON fields (AC: #4)
  - [x] Add `dealbreakers Json @default("[]")` and `niceToHaves Json @default("[]")` to Vacancy model in `prisma/schema.prisma`
  - [x] Run `npx prisma generate`
  - [x] Update `VacancyWithRelations` type in `lib/recruitment/types.ts`

- [x] Task 2: Create dealbreaker and nice-to-have Zod schemas + extend vacancy update schema (AC: #2, #3, #4)
  - [x] Add `vacancyDealbreakerSchema` to `lib/recruitment/schemas.ts` with fields: name, type (enum: boolean, minimum, selection), requiredValue (union: boolean, number, string[]), label
  - [x] Add `vacancyNiceToHaveSchema` with fields: name, type (enum: scale, boolean, selection), weight (1-10)
  - [x] Extend `vacancyUpdateSchema` to accept `dealbreakers` and `niceToHaves` arrays
  - [x] Add TypeScript interfaces to `lib/recruitment/types.ts`: `VacancyDealbreaker`, `VacancyNiceToHave`

- [x] Task 3: Build DealbreakersConfig component (AC: #1, #2, #3)
  - [x] Create `components/recruitment/vacancy/dealbreakers-config.tsx` — client component with two sections
  - [x] Dealbreaker section: list of items, each with name input, type selector (boolean/minimum/selection), dynamic value input based on type, label textarea
  - [x] Nice-to-have section: list of items, each with name input, type selector (scale/boolean/selection), weight slider or number (1-10)
  - [x] Weight percentage breakdown display: show each nice-to-have as % of total weight
  - [x] Add/remove items with + and X buttons (same pattern as template-form.tsx stages)

- [x] Task 4: Integrate DealbreakersConfig into vacancy edit page (AC: #1, #4)
  - [x] Add a "Criteria" tab/section to `app/(authenticated)/recruitment/vacatures/[id]/bewerken/client.tsx`
  - [x] Load existing dealbreakers and niceToHaves from vacancy on page load
  - [x] Save via existing PATCH `/api/recruitment/vacancies/[id]` endpoint (already accepts partial updates)
  - [x] Use explicit save button (not autosave — different from content blocks)

- [x] Task 5: Add translation keys (AC: all)
  - [x] Add criteria config keys to `messages/nl.json`: section titles, field labels, type options, weight breakdown, add/remove buttons
  - [x] Add matching keys to `messages/fr.json`

## Dev Notes

### Data Model

**Extend existing Vacancy model** — add two JSON fields alongside existing `content`:

```prisma
model Vacancy {
  // ... existing fields ...
  content       Json?         @default("[]")  // Already exists (Story 1.3)
  dealbreakers  Json          @default("[]")  // NEW: VacancyDealbreaker[]
  niceToHaves   Json          @default("[]")  // NEW: VacancyNiceToHave[]
  // ... rest of existing fields ...
}
```

**Why JSON, not child tables:** Architecture specifies JSON content blocks pattern. Dealbreakers/nice-to-haves are vacancy-scoped configuration (not entities with their own lifecycle). VacancyTemplate already uses this pattern. Candidate scoring engine (Epic 3, Story 3.5) reads these from the vacancy JSON.

**TypeScript shapes:**

```typescript
interface VacancyDealbreaker {
  id: string              // cuid for stable references
  name: string            // "Driver's license", "Dutch-speaking"
  type: 'boolean' | 'minimum' | 'selection'
  requiredValue: boolean | number | string[]  // depends on type
  label: string           // "Candidate must have a valid driver's license B"
}

interface VacancyNiceToHave {
  id: string
  name: string            // "React experience", "Team leadership"
  type: 'scale' | 'boolean' | 'selection'
  weight: number          // 1-10
}
```

**Note:** VacancyTemplate (Story 1.4) already has `dealbreakers Json` and `niceToHaves Json` but with simpler shapes (`{ text: string }` and `{ text: string, weight: number }`). Those template shapes are placeholder stubs — the vacancy-level shapes are the full implementation. Template pre-fill for criteria is deferred until templates are updated to match (low priority).

### Architecture Compliance

**Architecture decisions:**
- Component: `DealbreakersConfig.tsx` under `components/recruitment/vacancy/` per architecture spec
- No new API routes needed — PATCH `/api/recruitment/vacancies/[id]` already handles partial updates
- Zod validation at API boundary in `lib/recruitment/schemas.ts`
- Progressive disclosure: criteria config is an "advanced" section on the vacancy edit page

**Component placement:**
```
components/recruitment/vacancy/
├── dealbreakers-config.tsx         # NEW: Dealbreaker/nice-to-have editor
├── content-block-editor.tsx        # Existing (Story 1.3)
├── vacancy-form.tsx                # Existing (Story 1.2, modified 1.4)
└── ...
```

### UX Patterns from Spec

- **Progressive disclosure:** Criteria config is an "Advanced" collapsible section on vacancy edit — not visible by default on creation. Essentials (title, entity, content) first.
- **UX spec note:** "Vacancy builder: dealbreaker config only appears when requirements block is added" — implement as always-visible section on edit page (creation pre-fill via templates is already handled).
- **Form density:** Single-column layout per UX spec. Related fields grouped under section headers.
- **Two distinct sections:** "Dealbreakers" (red/danger semantic) and "Nice-to-haves" (neutral/info semantic)
- **Weight breakdown:** Show each nice-to-have's weight as a percentage of total: `weight / sum(all weights) * 100`
- **Type-dependent inputs:**
  - Boolean: simple toggle (yes/no required value)
  - Minimum: number input for minimum value threshold
  - Selection: multi-tag input for allowed option values
  - Scale: range 1-5 display (for nice-to-have type; no input needed — just indicates scoring method)
- **Explicit save:** Unlike content blocks (autosave), criteria use a save button. This aligns with the fact that criteria directly affect candidate filtering — intentional save prevents accidental changes.

### Anti-Patterns to Avoid

- Do NOT create separate API routes for dealbreakers/nice-to-haves — use existing PATCH vacancy endpoint
- Do NOT use server actions — use `fetch()` to API routes
- Do NOT create separate Prisma models (child tables) for dealbreakers — use JSON on Vacancy
- Do NOT implement candidate scoring/filtering logic — that's Epic 3, Story 3.5
- Do NOT modify ContentBlockEditor — dealbreakers config is a separate component
- Do NOT add criteria UI to the vacancy creation form — only on the edit page (progressive disclosure)

### Existing Patterns to Follow

**API:** PATCH `app/api/recruitment/vacancies/[id]/route.ts` already validates via `vacancyUpdateSchema` and passes data to Prisma. Adding `dealbreakers` and `niceToHaves` to the schema is sufficient.

**Client forms:** Controlled React state + shadcn primitives (`Input`, `Select`, `Button`, `Label`). No React Hook Form. Same add/remove pattern as `template-form.tsx` stages/dealbreakers lists.

**Edit page pattern:** `app/(authenticated)/recruitment/vacatures/[id]/bewerken/client.tsx` already manages multiple state sections (form data + content blocks). Add criteria as another section with its own state.

**Zod discriminated unions:** For type-dependent `requiredValue`, use `z.discriminatedUnion` on the `type` field to ensure the value shape matches the type.

### Previous Story Intelligence

**Story 1.4:** VacancyTemplate already has `dealbreakers Json` and `niceToHaves Json` fields with simpler shapes. The template form (`template-form.tsx`) has add/remove list patterns for stages, dealbreakers, and nice-to-haves — reuse the same UI pattern (Input + X button + Add button).

**Story 1.3:** Content blocks use autosave on edit page. Criteria should NOT use autosave — use explicit save button to prevent accidental filter changes.

**Story 1.2 review:** Identified that PATCH route missing server-side permission guard → already fixed. Edit page pattern with server component wrapper + client component is established.

**Story 1.4 review fixes:**
- `recruitment:read` is the correct permission for read endpoints (not `recruitment:admin`)
- Entity-scoped RBAC checks must verify both source and target entity on updates
- Error states must be shown in UI (not just empty lists)

**Key files to modify:**
- `prisma/schema.prisma` — Add dealbreakers + niceToHaves to Vacancy
- `lib/recruitment/types.ts` — Add VacancyDealbreaker, VacancyNiceToHave interfaces
- `lib/recruitment/schemas.ts` — Add dealbreaker/niceToHave schemas, extend vacancyUpdateSchema
- `app/(authenticated)/recruitment/vacatures/[id]/bewerken/client.tsx` — Integrate DealbreakersConfig
- `messages/nl.json` / `messages/fr.json` — Criteria translation keys

**Key files to create:**
- `components/recruitment/vacancy/dealbreakers-config.tsx` — Main criteria editor component

### Scope Boundaries

**In scope for Story 1.5:**
- Vacancy-level dealbreaker and nice-to-have JSON fields
- Zod schemas for typed criteria with discriminated union for type-dependent values
- DealbreakersConfig component with two sections and type-dependent inputs
- Weight percentage breakdown display
- Integration into vacancy edit page
- i18n for nl/fr

**Deferred (explicit):**
- Candidate scoring/filtering engine — Epic 3, Story 3.5
- Dealbreaker pass/fail badges on candidate cards — Epic 2, Story 2.3
- ScoreRing display from nice-to-have scores — Epic 2, Story 2.3
- Template criteria pre-fill (upgrading VacancyTemplate shapes to match) — follow-up
- Criteria configuration on vacancy creation page — edit-only for now (progressive disclosure)
- Scorecard criteria (reviewer evaluation) — Epic 5, Story 5.1 (completely separate feature)

### References

- [Epics: Story 1.5 ACs] `_bmad-output/planning-artifacts/epics.md` lines 437-462
- [Architecture: DealbreakersConfig.tsx] `_bmad-output/planning-artifacts/architecture.md` lines 455-466
- [Architecture: candidate-scoring.ts] `_bmad-output/planning-artifacts/architecture.md` lines 483-493
- [UX: Progressive disclosure] `_bmad-output/planning-artifacts/ux-design-specification.md` lines 338-341
- [UX: Conditional fields] `_bmad-output/planning-artifacts/ux-design-specification.md` lines 1394-1398
- [UX: Vacancy settings sheet] `_bmad-output/planning-artifacts/ux-design-specification.md` lines 1483-1485
- [PRD: FR3] Dealbreaker auto-filter
- [PRD: FR4] Weighted nice-to-haves
- [Existing: vacancy edit client] `app/(authenticated)/recruitment/vacatures/[id]/bewerken/client.tsx`
- [Existing: template form pattern] `components/recruitment/template/template-form.tsx`
- [Existing: vacancy update schema] `lib/recruitment/schemas.ts`

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- All pre-existing TS errors in test files only (inspector-number, authz, cron-email-helpers)
- No new errors introduced by Story 1.5 changes

### Completion Notes List
- Task 1: Added `dealbreakers Json @default("[]")` and `niceToHaves Json @default("[]")` to Vacancy model. Generated Prisma client. Added `VacancyDealbreaker` and `VacancyNiceToHave` interfaces to types.ts.
- Task 2: Created discriminated union Zod schema for dealbreakers (boolean/minimum/selection with type-dependent requiredValue). Created nice-to-have schema. Extended `vacancyUpdateSchema` with both arrays (max 20 items).
- Task 3: Built `DealbreakersConfig` client component with two semantic sections (ShieldAlert icon for dealbreakers, Star for nice-to-haves). Type-dependent inputs: boolean toggle, number input for minimum, tag-based multi-select for selection. Weight percentage breakdown per nice-to-have.
- Task 4: Integrated into vacancy edit page as collapsible `<details>` element (progressive disclosure). Loads existing criteria from API. Explicit save button with status feedback (saving/saved/error).
- Task 5: Added 28 translation keys per language (nl.json, fr.json) under `recruitment.criteria` namespace.

### Review Findings

- [x] [Review][Patch] Selection dealbreaker default `[]` rejected by Zod `.min(1)` on save — fixed: removed `.min(1)` from selection requiredValue schema
- [x] [Review][Patch] `criteriaSaveStatus` not reset to idle when user modifies criteria after save — fixed: reset to idle on change callbacks
- [x] [Review][Patch] Selection value input constrained by parent `w-40 shrink-0` — fixed: full-width layout for selection type
- [x] [Review][Defer] No client-side validation before criteria save (empty names get 400) — pre-existing UX pattern, defer to form validation epic
- [x] [Review][Dismiss] Rounding of weight percentages — cosmetic, not actionable
- [x] [Review][Dismiss] `<details>` vs tab — intentional per Dev Notes (progressive disclosure)
- [x] [Review][Dismiss] Nice-to-have `selection` type no options input — spec only requires weight

### Change Log
- 2026-05-15: Story 1.5 implementation complete — dealbreakers/nice-to-haves config on vacancy edit page

### File List
- prisma/schema.prisma (modified)
- lib/recruitment/types.ts (modified)
- lib/recruitment/schemas.ts (modified)
- components/recruitment/vacancy/dealbreakers-config.tsx (created)
- app/(authenticated)/recruitment/vacatures/[id]/bewerken/client.tsx (modified)
- messages/nl.json (modified)
- messages/fr.json (modified)
