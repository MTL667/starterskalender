# Story 2.2: Pipeline Kanban Board

Status: done

## Story

As a headhunter,
I want to view all candidates for a vacancy on a Kanban board organized by pipeline stage,
so that I have a visual overview of where every candidate is in the process.

## Acceptance Criteria

1. **Given** I have `recruitment:read` permission and navigate to `/recruitment/vacatures/[id]`, **When** the page loads, **Then** I see a horizontal Kanban board with one column per configured pipeline stage, each column header shows the stage name and candidate count, columns ordered left-to-right matching stage order, board loads in under 1 second (NFR1)
2. **Given** the pipeline is loading, **When** data is being fetched, **Then** I see skeleton columns with placeholder cards (gray rectangles matching card dimensions)
3. **Given** a vacancy has no candidates yet, **When** I view the pipeline, **Then** I see empty columns with message "Nog geen kandidaten" in the first stage column, and a primary action button "Kandidaat toevoegen" is visible
4. **Given** a vacancy has candidates in multiple stages, **When** I view the pipeline, **Then** candidates are displayed as cards within their respective stage columns, columns with many candidates are vertically scrollable, the board is horizontally scrollable if stages exceed viewport width
5. **Given** I am viewing the pipeline, **When** I use the filter bar above the board, **Then** I can filter candidates by: source, days-in-stage range; filters apply instantly (<500ms per NFR7)
6. **Given** I am on the vacancy detail page, **When** the Kanban board replaces the previous simple table, **Then** the "Add candidate" button is still accessible from the board empty state and from the page header

## Tasks / Subtasks

- [x] Task 1: Create PipelineKanban component (AC: 1, 2, 4)
  - [x] Create `components/recruitment/pipeline/pipeline-kanban.tsx`
  - [x] Fetch candidates grouped by stage from existing GET endpoint
  - [x] Render horizontal board with CSS flexbox + overflow-x-auto
  - [x] Loading skeleton: gray columns with 3 card-shaped placeholders each
  - [x] Pass `vacancyId` and `stages` as props from server page
- [x] Task 2: Create StageColumn component (AC: 1, 3, 4)
  - [x] Create `components/recruitment/pipeline/stage-column.tsx`
  - [x] Column header: stage name (font-semibold text-sm) + candidate count badge
  - [x] Vertically scrollable card list (max-height with overflow-y-auto)
  - [x] Empty state per column (subtle text, no illustration per column)
  - [x] First-column empty state with "Kandidaat toevoegen" button when vacancy has zero candidates total
- [x] Task 3: Create basic CandidateCard component (AC: 4)
  - [x] Create `components/recruitment/pipeline/candidate-card.tsx`
  - [x] Display: full name, source badge, days in stage (calculated from updatedAt)
  - [x] Fixed-width card with `p-3` internal padding
  - [x] Minimal design — will be enriched in Story 2.3 with score ring, SLA colors, hover actions
- [x] Task 4: Create FilterBar component (AC: 5)
  - [x] Create `components/recruitment/pipeline/pipeline-filter-bar.tsx`
  - [x] Source filter: multi-select dropdown with CandidateSource enum values
  - [x] Days-in-stage filter: min/max number inputs
  - [x] Client-side filtering (data already loaded from API)
  - [x] Filters persist in state (NOT URL params yet — that's future optimization)
- [x] Task 5: Replace table view with Kanban on vacancy detail page + i18n (AC: 1, 6)
  - [x] Modify `app/(authenticated)/recruitment/vacatures/[id]/page.tsx` to render PipelineKanban instead of CandidateListSection
  - [x] Pass stages from server-loaded vacancy data
  - [x] Keep "Add candidate" button in page header (not only in empty state)
  - [x] Add translation keys to `messages/nl.json` and `messages/fr.json`

## Dev Notes

### Component Architecture

```
components/recruitment/pipeline/
├── pipeline-kanban.tsx        # Main board — fetches data, manages filter state, renders columns
├── stage-column.tsx           # Single column — header + scrollable card list
├── candidate-card.tsx         # Minimal card — name, source, days counter
└── pipeline-filter-bar.tsx    # Filter bar above board — source + days-in-stage
```

**Key decision**: Do NOT use dnd-kit yet. Story 2.4 will wrap the board with `DndContext` and add drag sensors. For now, the board is read-only with pure CSS layout.

### Layout Pattern (from UX spec)

```
┌─ Filter Bar ──────────────────────────────────────────────────────────┐
│ [Source: All ▼]  [Days in stage: __ - __]                             │
└───────────────────────────────────────────────────────────────────────┘
┌─ Board (overflow-x-auto) ────────────────────────────────────────────┐
│ ┌─ Column ──┐ ┌─ Column ──┐ ┌─ Column ──┐ ┌─ Column ──┐            │
│ │ Applied 3 │ │ Screen  1 │ │ Interview │ │ Offer   0 │            │
│ ├───────────┤ ├───────────┤ ├───────────┤ ├───────────┤            │
│ │ [Card]    │ │ [Card]    │ │           │ │           │            │
│ │ [Card]    │ │           │ │           │ │           │            │
│ │ [Card]    │ │           │ │  (empty)  │ │  (empty)  │            │
│ │ (scroll)  │ │           │ │           │ │           │            │
│ └───────────┘ └───────────┘ └───────────┘ └───────────┘            │
└───────────────────────────────────────────────────────────────────────┘
```

**Spacing**: `gap-3` between columns, `gap-2` between cards (from UX spec).
**Column width**: Fixed `w-72` (288px) — all columns same width.
**Column height**: `max-h-[calc(100vh-280px)]` with `overflow-y-auto` for card list.
**Card padding**: `p-3` internal.

### Typography (from UX spec)

| Element | Class | Weight |
|---------|-------|--------|
| Column header | `text-sm` | `font-semibold` |
| Card name | `text-sm` | `font-medium` |
| Card metadata | `text-xs` | `font-normal` |

### Data Flow

1. Server page fetches vacancy + stages (already done in page.tsx)
2. `PipelineKanban` (client component) fetches candidates via existing GET `/api/recruitment/vacancies/[id]/candidates`
3. Client groups candidates by `stageId` into columns
4. FilterBar operates on the already-fetched dataset (client-side filtering for <500ms response)

**Important**: The existing GET endpoint already returns `stage: { id, name, order }` with each candidate. No new API route needed.

### Days-in-Stage Calculation

Since there's no stage transition log yet (Story 2.4 will add move tracking), approximate:
- Use `candidate.updatedAt` as proxy for "entered current stage" timestamp
- For candidates never moved: `updatedAt ≈ createdAt`, so this is correct
- Calculate: `Math.floor((Date.now() - new Date(candidate.updatedAt).getTime()) / 86400000)`

### Responsive Behavior (from UX spec)

| Breakpoint | Behavior |
|-----------|----------|
| < `md` | Not available (internal-only page) |
| `md`–`lg` | 3 columns visible, horizontal scroll for rest |
| `lg`–`xl` | 4 columns visible |
| ≥ `xl` | All columns visible (up to ~5, then scroll) |

### Loading Skeleton (from UX spec)

"Pipeline: gray columns with 3 card-shaped placeholders each"
- Render N columns (match stages count) with `animate-pulse`
- Each column: header placeholder + 3 `h-20 bg-muted rounded` card shapes

### Empty States (from UX spec)

- **Board empty (zero total candidates)**: Show all columns, first column gets centered message "Nog geen kandidaten" + "Kandidaat toevoegen" button
- **Individual empty column**: Just show the column header, no message per-column (avoids noise)

### File Structure

| File | Purpose |
|------|---------|
| `components/recruitment/pipeline/pipeline-kanban.tsx` | Main board component (client) |
| `components/recruitment/pipeline/stage-column.tsx` | Single column component |
| `components/recruitment/pipeline/candidate-card.tsx` | Minimal candidate card |
| `components/recruitment/pipeline/pipeline-filter-bar.tsx` | Filter bar above board |
| `app/(authenticated)/recruitment/vacatures/[id]/page.tsx` | Modified: replace table with Kanban |
| `messages/nl.json` | Add ~12 pipeline keys |
| `messages/fr.json` | Add ~12 pipeline keys |

### RBAC Rules

- No new permissions needed — uses existing `recruitment:read` for viewing and `candidate:write` for the "Add candidate" button
- Entity scope already enforced by the GET candidates endpoint

### Anti-Patterns to Avoid

- Do NOT install or use `@dnd-kit/*` — drag & drop is Story 2.4
- Do NOT implement SSE subscriptions or real-time updates — that's Story 2.5
- Do NOT implement keyboard navigation (arrow keys, Space to grab) — that's Story 2.6
- Do NOT implement rich CandidateCard states (hover actions, score ring, SLA colors, dealbreaker opacity) — that's Story 2.3
- Do NOT implement CandidateMoveDialog or stage transition confirmation — that's Story 2.4
- Do NOT persist filters in URL params — keep it simple with React state for now
- Do NOT create a new API route — reuse existing GET `/api/recruitment/vacancies/[id]/candidates`
- Do NOT implement forward-only movement rules — that's Story 2.4 drag logic

### Previous Story Intelligence (from Story 2.1)

Key patterns to maintain:
- Client components fetch from API with `useCallback` + `useEffect`
- Loading state with skeleton placeholders (`animate-pulse`)
- Error state with fallback message (fetchError pattern from 2.1 review fix)
- `useRef` for timeouts, `useEffect` cleanup on unmount
- Wrap `res.json()` in try/catch for non-JSON error responses
- Pass `vacancyId` and `canWrite` as props from server page
- i18n keys in both `messages/nl.json` and `messages/fr.json` simultaneously
- `useTranslations('recruitment')` with dotted keys like `pipeline.columnHeader`

### Existing code to reuse/extend

- `components/recruitment/candidate/candidate-list-section.tsx` — fetch pattern, loading/error states (REPLACE, don't extend)
- `components/recruitment/candidate/add-candidate-dialog.tsx` — keep as-is, wire to Kanban's "Add candidate" button
- `app/api/recruitment/vacancies/[id]/candidates/route.ts` — GET endpoint, no changes needed
- `components/ui/badge.tsx`, `components/ui/button.tsx`, `components/ui/select.tsx` — shadcn primitives

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture, Component Boundaries, Directory Structure]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#PipelineKanban, Layout Patterns, Empty States, Loading States, Responsive Strategy]
- [Source: _bmad-output/implementation-artifacts/2-1-candidate-model-manual-candidate-entry.md#Dev Notes, Review Findings]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- No linter errors across all new/modified files
- Reused existing GET candidates endpoint without modification

### Completion Notes List
- Task 1: Created `pipeline-kanban.tsx` — fetches candidates, groups by stageId, renders skeleton/error/board states, manages filter state with useMemo for <500ms filtering
- Task 2: Created `stage-column.tsx` — fixed-width columns (w-72), vertically scrollable, empty state in first column with "Add candidate" button when zero total candidates
- Task 3: Created `candidate-card.tsx` — minimal card with name, source badge, days-in-stage counter (calculated from updatedAt)
- Task 4: Created `pipeline-filter-bar.tsx` — source Select (ALL/DIRECT/REFERRAL/LINKEDIN/OTHER) + days min/max number inputs
- Task 5: Created `pipeline-section.tsx` wrapper managing dialog + refresh key pattern. Replaced CandidateListSection with PipelineSection in vacancy detail page. Added 6 new i18n keys (NL/FR). Updated bewerken/client.tsx to use `pipeline.configTitle`.

### File List
- components/recruitment/pipeline/pipeline-kanban.tsx (new)
- components/recruitment/pipeline/stage-column.tsx (new)
- components/recruitment/pipeline/candidate-card.tsx (new)
- components/recruitment/pipeline/pipeline-filter-bar.tsx (new)
- components/recruitment/pipeline/pipeline-section.tsx (new)
- app/(authenticated)/recruitment/vacatures/[id]/page.tsx (modified)
- app/(authenticated)/recruitment/vacatures/[id]/bewerken/client.tsx (modified)
- messages/nl.json (modified)
- messages/fr.json (modified)

### Review Findings
- [x] [Review][Patch] No "no results" state when filters hide all candidates [pipeline-kanban.tsx + stage-column.tsx] — fixed: added `filtersHideAll` check with `pipeline.noFilterResults` i18n message
- [x] [Review][Defer] Candidates with unknown stage.id silently dropped from board [pipeline-kanban.tsx:74-84] — deferred, architectural edge case with stale SSR data

Dismissed (10): No AbortController (mitigated by key pattern), filter callbacks without functional updates (impossible in same render cycle), invalid updatedAt (Prisma guarantees valid dates), parseInt on non-numeric filter input (type=number prevents this), malformed candidate missing stage (Prisma include guarantees), nullish source (Prisma enum), column headers show filtered counts (logical with active filters), <1s NFR not enforced in code (limited data size), Add button hidden for read-only (correct RBAC), updatedAt as proxy for days-in-stage (by design in story spec).

### Change Log
- 2026-05-15: Story 2.2 implemented — Pipeline Kanban board with columns, cards, filters, skeleton loading, empty states
- 2026-05-15: Code review — 1 patch, 1 defer, 10 dismissed
