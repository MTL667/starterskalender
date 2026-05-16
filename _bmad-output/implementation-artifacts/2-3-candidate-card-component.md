# Story 2.3: Candidate Card Component

Status: done

## Story

As a headhunter,
I want candidate cards to show key information at a glance,
so that I can assess candidate status without opening each profile.

## Acceptance Criteria

1. **Given** a candidate exists in the pipeline, **When** their card renders, **Then** it shows: full name (top-left), entity badge (top-right), days in stage with clock icon (metadata row), source label (metadata row). **And** bottom row shows: dealbreaker badge (pass/fail), score ring (if scored), review count
2. **Given** a candidate card is in default state, **When** I hover over it, **Then** the card elevates with shadow and action icons appear (share, comment, open)
3. **Given** a candidate was added less than 24 hours ago, **When** the card renders, **Then** it has a subtle blue left-border accent indicating "new"
4. **Given** a candidate has been in their current stage for 8-14 days, **When** the card renders, **Then** the days counter turns amber (SLA warning)
5. **Given** a candidate has been in their current stage for more than 14 days, **When** the card renders, **Then** the days counter turns red (SLA exceeded)
6. **Given** a candidate failed one or more dealbreakers, **When** the card renders, **Then** the card shows at 50% opacity with a red X badge
7. **Given** a screen reader user focuses a candidate card, **When** focus lands on the card, **Then** it announces: "{Name}, {Entity}, score {X.X}, {N} days in stage"

## Tasks / Subtasks

- [x] Task 1: Create DaysCounter sub-component (AC: 4, 5, 7)
  - [x] Create `components/recruitment/pipeline/days-counter.tsx`
  - [x] Props: `days: number`, optional `warningThreshold` (default 8), `exceededThreshold` (default 14)
  - [x] Render: Clock icon (h-3 w-3) + number + "d" suffix via `t('pipeline.daysShort')`
  - [x] Color logic: gray `text-muted-foreground` for ≤7d, amber `text-amber-600 dark:text-amber-500` for 8-14d, red `text-destructive` for >14d
  - [x] Add `aria-label` e.g. `"3 days in current stage"`
- [x] Task 2: Create ScoreRing sub-component (AC: 1, 7)
  - [x] Create `components/recruitment/pipeline/score-ring.tsx`
  - [x] Props: `score: number | null`, `size?: 'sm' | 'default' | 'lg'` (24/28/36px)
  - [x] Render: circular div with centered score text (1 decimal)
  - [x] Color states: green (`text-emerald-600 border-emerald-500`) for ≥4.0, amber (`text-amber-600 border-amber-500`) for 3.0-3.9, red (`text-destructive border-destructive`) for <3.0, gray dashed (`text-muted-foreground border-muted border-dashed`) for null
  - [x] Add `aria-label` e.g. `"Score: 4.2 out of 5"` or `"No score"`
- [x] Task 3: Enrich CandidateCard layout and visual states (AC: 1, 3, 6)
  - [x] Extend `PipelineCandidateItem` interface to add: `dealbreakersResult`, `niceToHaveScore`, `entityName` (passed from parent)
  - [x] New card layout: top row (name left, entity badge right), metadata row (DaysCounter + source), bottom row (dealbreaker badge + ScoreRing + review count placeholder)
  - [x] New candidate (<24h from `createdAt`): add `border-l-2 border-l-blue-400` accent
  - [x] Dealbreaker fail: wrap card in `opacity-50` + show red X badge next to dealbreaker text
  - [x] Dealbreaker pass: green checkmark badge
  - [x] Dealbreaker pending: no badge (default)
  - [x] Review count: show `0` with users icon for now — real data comes in Epic 5
  - [x] Screen reader: add `aria-label` with pattern `"{Name}, {Entity}, score {X.X}, {N} days in stage"` on the card root
  - [x] Make card focusable with `tabIndex={0}` and `role="article"`
- [x] Task 4: Add hover state with action icons (AC: 2)
  - [x] On hover: increase shadow (`hover:shadow-md`), show action icons
  - [x] Action icons: Share (`Share2`), Comment (`MessageSquare`), Open (`ExternalLink`) from lucide-react
  - [x] Icons hidden by default, visible on hover via `group` / `group-hover:opacity-100`
  - [x] Position icons in top-right area (overlapping entity badge row or as a floating row)
  - [x] Each icon: ghost button, 44x44px hit area (`min-w-[44px] min-h-[44px]`), icon ~16px
  - [x] Icons are non-functional placeholders — wired in Epic 4 (share) and Epic 6 (comment)
- [x] Task 5: Update parent components to pass entity name + extended type + i18n (AC: 1)
  - [x] Update `pipeline-section.tsx` to accept and pass `entityName` prop
  - [x] Update `pipeline-kanban.tsx` to pass `entityName` through to `StageColumn`
  - [x] Update `stage-column.tsx` to pass `entityName` to each `CandidateCard`
  - [x] Update vacancy detail `page.tsx` to pass `entityName={vacancy.entity.name}` to `PipelineSection`
  - [x] Add i18n keys to `messages/nl.json` and `messages/fr.json` for: dealbreaker pass/fail labels, score labels, review count label, new candidate label, hover action tooltips

## Dev Notes

### Card Anatomy (from UX spec)

```
┌──────────────────────────┐
│ [Name]         [Entity]  │  ← top row: text-sm font-medium | text-xs Badge
│ ⏱ 3d · LinkedIn          │  ← metadata: DaysCounter + source Badge
│──────────────────────────│
│ [✓ DB] [●4.2] [👤0]      │  ← bottom row: dealbreaker + ScoreRing + reviews
└──────────────────────────┘
```

**Typography**: Name `text-sm font-medium`, all metadata `text-xs font-normal`.
**Padding**: `p-3` internal. **Gap**: `gap-2` between cards in column.

### Visual States Summary

| State | Condition | Visual |
|-------|-----------|--------|
| Default | Normal | White card, subtle border, shadow-sm |
| Hover | Mouse over | `shadow-md`, action icons appear |
| New | `createdAt` < 24h ago | Blue left border `border-l-2 border-l-blue-400` |
| SLA Warning | 8-14 days in stage | DaysCounter text amber |
| SLA Exceeded | >14 days in stage | DaysCounter text red |
| Dealbreaker Fail | `dealbreakersResult === 'FAIL'` | Card `opacity-50` + red X badge |

### DaysCounter Component

Standalone reusable component. Uses same `daysInStage()` calculation as current code (from `updatedAt` proxy). Color thresholds configurable via props but default to 8/14. Will be reused in candidate detail views later.

### ScoreRing Component

Standalone 28px circle. Renders `niceToHaveScore` (Float or null from Prisma). Scores are 0.0-5.0 scale. When null, show gray dashed outline with no number. Will be reused in candidate profile and comparison views (Epic 5).

Implementation approach: use a `div` with `rounded-full border-2` and centered text. NOT an SVG ring — keep it simple with border + text for now. The border color indicates the score range.

### Data Availability

The existing GET `/api/recruitment/vacancies/[id]/candidates` endpoint **already returns** `dealbreakersResult` and `niceToHaveScore` as part of the Candidate model fields. No API changes needed.

Fields already available in API response:
- `dealbreakersResult`: `'PASS' | 'FAIL' | 'PENDING'` (enum)
- `niceToHaveScore`: `number | null` (Float?)
- `source`: `'DIRECT' | 'REFERRAL' | 'LINKEDIN' | 'OTHER'`
- `createdAt`: ISO string
- `updatedAt`: ISO string
- `stage`: `{ id, name, order }`
- `createdBy`: `{ id, name }`

**Not yet available** (future stories):
- Review count → Epic 5 (Scorecard Evaluation). Show `0` for now.
- Entity name → not in candidate response, must be passed as prop from vacancy context (all candidates on a board share the same entity).

### Hover Action Icons

The three icons (Share, Comment, Open) are **non-functional placeholders** in this story:
- **Share**: Wired in Epic 4 (Collaboration & Scoped Sharing)
- **Comment**: Wired in Epic 6 (Internal Comment Threads)
- **Open**: Could navigate to candidate detail (not yet built)

Implementation: render as icon buttons with `onClick` doing nothing (or `console.log` for dev). Add `title` attribute for tooltip. Style as `opacity-0 group-hover:opacity-100 transition-opacity`.

### Accessibility Requirements

- Card root: `role="article"`, `tabIndex={0}`, `aria-label` with full announcement
- ScoreRing: `aria-label="Score: {X.X} out of 5"` or `"No score"`
- DaysCounter: `aria-label="{N} days in current stage"`
- Dealbreaker badge: icon + text label (not color alone)
- Action icons: `aria-label` on each button
- Focus ring: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
- `prefers-reduced-motion`: disable hover transitions (use `motion-safe:` prefix)

### Anti-Patterns to Avoid

- Do NOT install @dnd-kit — drag & drop is Story 2.4
- Do NOT implement candidate detail navigation — no detail view exists yet
- Do NOT implement actual share/comment functionality — those are Epics 4 and 6
- Do NOT create new API routes — existing GET endpoint returns all needed data
- Do NOT implement SSE or real-time updates — Story 2.5
- Do NOT use SVG for ScoreRing — simple CSS circle is sufficient
- Do NOT add score range filter to FilterBar — that's a future enhancement
- Do NOT modify the Prisma schema — all fields already exist

### File Structure

| File | Action | Purpose |
|------|--------|---------|
| `components/recruitment/pipeline/days-counter.tsx` | New | Reusable days-in-stage indicator |
| `components/recruitment/pipeline/score-ring.tsx` | New | Reusable score circle indicator |
| `components/recruitment/pipeline/candidate-card.tsx` | Modify | Enrich with full layout, states, accessibility |
| `components/recruitment/pipeline/stage-column.tsx` | Modify | Pass entityName to cards |
| `components/recruitment/pipeline/pipeline-kanban.tsx` | Modify | Pass entityName through |
| `components/recruitment/pipeline/pipeline-section.tsx` | Modify | Accept and pass entityName prop |
| `app/(authenticated)/recruitment/vacatures/[id]/page.tsx` | Modify | Pass entityName to PipelineSection |
| `messages/nl.json` | Modify | Add ~10 card-related i18n keys |
| `messages/fr.json` | Modify | Add ~10 card-related i18n keys |

### RBAC Rules

No new permissions needed. The card renders data already fetched with existing `recruitment:read` permission. Entity scoping enforced by the GET candidates endpoint.

### Previous Story Intelligence (from Stories 2.1 and 2.2)

Key patterns to maintain:
- `'use client'` for all pipeline components
- `useTranslations('recruitment')` with dotted keys
- `Badge` from `@/components/ui/badge` for entity, source, dealbreaker labels
- `lucide-react` for icons (Clock, Share2, MessageSquare, ExternalLink, Check, X, Users)
- `text-xs font-normal` for metadata, `text-sm font-medium` for names
- i18n keys in both `messages/nl.json` and `messages/fr.json` simultaneously
- The `daysInStage()` utility is duplicated in both `candidate-card.tsx` and `pipeline-kanban.tsx` — extract to a shared location or keep in `days-counter.tsx`

Review findings from 2.1 and 2.2 to maintain:
- `res.json()` wrapped in try/catch for non-JSON errors
- `fetchError` state for graceful error display
- `useRef` for timers + cleanup on unmount
- `pipeline.noFilterResults` message when filters hide all candidates

### Existing Code to Reuse/Extend

- `components/recruitment/pipeline/candidate-card.tsx` — current minimal card to EXTEND (not replace)
- `components/ui/badge.tsx` — for entity badge, source badge, dealbreaker badge
- `components/ui/button.tsx` — for hover action icon buttons
- `lucide-react` — already installed, use for all icons

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture, Component Boundaries, CandidateCard.tsx]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#CandidateCard, ScoreRing, DaysCounter, Hover Actions, Accessibility]
- [Source: _bmad-output/implementation-artifacts/2-2-pipeline-kanban-board.md#Dev Notes, Review Findings]
- [Source: _bmad-output/implementation-artifacts/2-1-candidate-model-manual-candidate-entry.md#Dev Notes, Review Findings]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- No linter errors across all new/modified files
- No API changes needed — existing GET endpoint already returns dealbreakersResult and niceToHaveScore
- Extracted shared `daysInStage()` function from pipeline-kanban.tsx to candidate-card.tsx export

### Completion Notes List
- Task 1: Created `days-counter.tsx` — reusable DaysCounter with 3 SLA color states (gray ≤7d, amber 8-14d, red >14d), configurable thresholds, aria-label
- Task 2: Created `score-ring.tsx` — reusable ScoreRing with 4 color states (green ≥4.0, amber 3.0-3.9, red <3.0, gray dashed null), 3 sizes (sm/default/lg), aria-label
- Task 3: Enriched `candidate-card.tsx` — extended PipelineCandidateItem with dealbreakersResult/niceToHaveScore, new 3-row layout (name+entity / days+source / dealbreaker+score+reviews), blue left border for new (<24h), 50% opacity for dealbreaker fail, role="article" + tabIndex + aria-label
- Task 4: Added hover actions to card — 3 ghost icon buttons (Share2, MessageSquare, ExternalLink) visible on hover via group/group-hover, 44x44px touch targets, motion-safe transitions, non-functional placeholders
- Task 5: Threaded entityName prop through PipelineSection → PipelineKanban → StageColumn → CandidateCard. Updated vacancy detail page to pass entity.name. Added 8 i18n keys (NL/FR) under card namespace.

### File List
- components/recruitment/pipeline/days-counter.tsx (new)
- components/recruitment/pipeline/score-ring.tsx (new)
- components/recruitment/pipeline/candidate-card.tsx (modified)
- components/recruitment/pipeline/stage-column.tsx (modified)
- components/recruitment/pipeline/pipeline-kanban.tsx (modified)
- components/recruitment/pipeline/pipeline-section.tsx (modified)
- app/(authenticated)/recruitment/vacatures/[id]/page.tsx (modified)
- messages/nl.json (modified)
- messages/fr.json (modified)

### Review Findings
- [x] [Review][Patch] scoreLabel check inconsistent with ScoreRing — can crash on undefined [candidate-card.tsx:47-50] — fixed: added `hasScore` guard checking both null and undefined, used non-null assertion after guard
- [x] [Review][Patch] aria-label produces "score Geen score" for unscored candidates [candidate-card.tsx:52] — fixed: conditional `scoreAriaSegment` omits "score" prefix when no score, uses `t('card.noScore')` directly

Dismissed (12): SSR Date.now() mismatch (integer days), invalid dates (Prisma guarantees), duplicate SR cues (inner not focusable), dynamic translation key (Prisma enum), NaN/Infinity scores (Prisma Float), PENDING no badge (by design), hover unreachable touch (placeholders), non-functional buttons (intentional), threshold props (internal only), updatedAt proxy (by design), review count 0 (Epic 5), ScoreRing when unscored (UX spec dashed), dealbreaker span not Badge (same result), shadow-only hover (achieves intent).

### Change Log
- 2026-05-15: Story 2.3 implemented — Enriched CandidateCard with DaysCounter, ScoreRing, dealbreaker states, hover actions, accessibility, entity badge
- 2026-05-15: Code review — 2 patch, 0 defer, 12 dismissed
