# Story 5.4: Candidate Comparison View (Phase 2)

> Status: ready-for-dev
> Epic: 5 — Evaluation & Scoring
> Generated: 2026-05-16
> Depends on: Story 5.1 (scorecard criteria), Story 5.2 (`Evaluation` model + reviewer submit), Story 5.3 (aggregated evaluations on profile + pipeline score data + intended `GET /api/recruitment/candidates/[id]/evaluations`), Stories 2.2–2.5 (pipeline Kanban baseline)

## Story

As a headhunter,
I want to compare multiple candidates side-by-side on their scores and qualifications,
So that I can make final selection decisions with a clear visual overview.

## Acceptance Criteria

**AC1:** Given I am viewing a vacancy pipeline with scored candidates,
When I select 2–4 candidates for comparison (checkbox on each card),
Then a “Compare” button appears in the pipeline action/filter bar alongside existing controls.

**AC2:** Given I click “Compare”,
When the comparison view opens (full-width `Dialog`/sheet aligned with Radix patterns used elsewhere — Greenhouse-inspired side-by-side layout),
Then I see one column per selected candidate with header (name + remove control) and table-like rows for: each scorecard criterion showing **average** and **individual** reviewer scores (same breakdown contract as Story 5.3), **overall aggregate score**, **days in pipeline** (aligned with pipeline card semantics), **source**, and **key qualifications** (fields already surfaced on pipeline cards — e.g. dealbreaker outcome / nice-to-have score as documented in planning; extend only if vacancy profile exposes additional “key” snapshot fields consistently).

**AC3:** Given I am in the comparison view,
When I view criterion rows,
Then the cell with the **highest numeric score per criterion** (among compared candidates only) receives a subtle green background,
And **significant differences** (absolute gap strictly **> 1.0** on the 1–5 criterion scale versus the next-best or versus min/max pair per row — pick one deterministic rule document in implementation, default: flag when row max − row min > 1) are visually flagged (e.g. outline, icon, or badge — avoid color-only cues; pair with `aria-label`/text hint).

**AC4:** Given I want to remove a candidate from comparison,
When I activate the dismiss control (“X”) on their column header,
Then that candidate’s column is removed and the remaining columns reflow (minimum 2 columns remain enforced by disabling Compare launch if count < 2; if removal drops below 2, close comparison and return to pipeline with cleared selection per AC5 UX expectation).

**AC5:** Given I am done comparing,
When I close the comparison view (explicit close/Cancel/back),
Then I return to the pipeline Kanban context with **multi-select cleared** (no stale checkboxes checked, no orphaned compare state).

## Tasks / Subtasks

- [ ] Task 1: Selection state — pipeline multi-select (AC: 1, 5)
  - [ ] 1.1 Lift or co-locate comparison selection state in `pipeline-kanban.tsx` (`Set<candidateId>`, capped at **4**) — optionally persist only for session (no URL param unless product requests deep-link compare)
  - [ ] 1.2 Checkbox on `candidate-card.tsx` (visible whenever user can compare — scoped to vacancy pipeline with `canWrite`/headhunter path; gated by vacancy having evaluations / aggregated score signal from Story 5.3 contract)
  - [ ] 1.3 Checkbox must **stop propagation** for drag handlers so dnd-kit does not initiate drag accidentally; preserve keyboard accessibility (`aria-label` from i18n)
  - [ ] 1.4 Show selection count badge or inline hint near Compare when appropriate (optional polish)

- [ ] Task 2: Compare entry point — filter/action bar (AC: 1)
  - [ ] 2.1 Extend `pipeline-filter-bar.tsx` (or adjacent toolbar region in Kanban layout) with `Compare` primary/secondary button rendered only when selected count ∈ [2, 4]
  - [ ] 2.2 Disabled + tooltip states when vacancy has zero scorecards or no comparable candidates — align messaging with Story 5.1/5.3 i18n

- [ ] Task 3: Data loading for comparison payload (AC: 2)
  - [ ] 3.1 Prefer **reuse** documented read path after Story 5.3: parallel `GET /api/recruitment/candidates/[id]/evaluations` (or finalized route name — must enforce `recruitment:read` + entity scope identical to sibling candidate APIs)
  - [ ] 3.2 Hydrate criterion breakdown + individual reviewer tuples + overall aggregate consistently with Story 5.3 client types (share DRY types in `lib/recruitment/` or existing evaluation types module)
  - [ ] *Optional spike:* Batch `GET /api/recruitment/vacancies/[id]/evaluations?candidateIds=…` — only if sequential N fetches lag on slow networks (>4 capped anyway)
  - [ ] 3.3 Combine with **already-available** GET `/api/recruitment/vacancies/[id]/candidates` fields for pipeline static metadata (days, source, badges) — avoid duplicate network when possible by merging from in-memory Kanban candidates with lazy evaluation fetch gated on modal open

- [ ] Task 4: Comparison view UI component (AC: 2–4)
  - [ ] 4.1 New `components/recruitment/pipeline/candidate-comparison-dialog.tsx` (or `comparison-sheet.tsx`) using Radix `Dialog` fullscreen / large breakpoint pattern consistent with `CandidateDetailDialog`
  - [ ] 4.2 Implement sticky row labels (first column) + horizontal scroll when >3 columns narrow viewports (`overflow-x-auto`, `sticky left-0` for labels)
  - [ ] 4.3 Header row per candidate with `ScoreRing` (aggregate) repetition optional — overall row duplicated per AC clarity
  - [ ] 4.4 Implement column remove (“X”) with focus management (focus moves logically after removal — Radix § focus trap friendly)
  - [ ] 4.5 Tie-break UX for equal highest scores — **no highlight** or highlight all tying cells consistently (document choice; ties should not arbitrarily pick green for one candidate only)

- [ ] Task 5: Visual diff logic — highlight + gap flagging (AC: 3)
  - [ ] 5.1 Pure client calculations from loaded numeric aggregates per criterion (`number` to 2 decimals tolerance)
  - [ ] 5.2 Green background token: `bg-emerald-500/15` / `dark:bg-emerald-500/20` (subtle vs pipeline ScoreRing emerald family)
  - [ ] 5.3 “> 1 gap” detector: Implement **row max − row min > 1** triggers flag adornment on all cells in that criterion row excluding N/A buckets (null scores render “—” without highlight contention)
  - [ ] 5.4 Document edge case: Single candidate row — trivially meets highlight but diff flagging meaningless — suppress diff flag when comparing count < 2

- [ ] Task 6: Close + reset UX (AC: 5)
  - [ ] 6.1 `onOpenChange(false)` clears selection Sets and aborts pending fetches (React `AbortController` if sequential)
  - [ ] 6.2 Closing via Escape / overlay matches Radix baseline — same reset path as explicit button

- [ ] Task 7: Accessibility & i18n (AC: 1–5)
  - [ ] 7.1 Grid semantics: `<table>` with `<th scope="col">` per candidate preferred over div-only faux table for screen readers; row headers `scope="row"`
  - [ ] 7.2 Announce dynamic compare additions via polite `aria-live` region sparingly — avoid chatter on every checkbox toggle unless product dictates
  - [ ] 7.3 Populate i18n keys (see § i18n) in `messages/nl.json` + `messages/fr.json`

- [ ] Task 8: Tests / QA checklist
  - [ ] 8.1 Interaction: Select 3 → Compare opens → dismiss column → thresholds update highlights
  - [ ] 8.2 Visual regression spot-check screenshot optional (Playwright) for green highlight + flagged gap row
  - [ ] 8.3 Verify RBAC: user lacking entity scope receives 403 from evaluations fetch → dialog shows recruiter-safe inline error mirroring Kanban candidate detail error UX

## Dev Notes

### Architecture Decisions

- **Pure client aggregation for diff/highlight**: After evaluation payloads fetched per candidate (Story 5.3 contract), all comparison arithmetic stays on the browser — deterministic, unit-test-friendly.
- **No new RBAC primitives**: Mirrors headhunter read surface; comparison is visualization only.
- **Batch endpoint deferred**: Parallel `GET …/candidates/[id]/evaluations` sufficient for MVP (max four candidates). Elevate batch read only if profiler shows bottleneck.
- **Qualifications scope MVP**: Prefer reusing Dealbreaker badge text / nice-to-have snapshot already on `PipelineCandidateItem` vs introducing new unstructured “qualifications blob” absent schema support.

### File Structure

| Area | Files / locations |
|------|-------------------|
| Selection + wiring | `components/recruitment/pipeline/pipeline-kanban.tsx`, `components/recruitment/pipeline/pipeline-filter-bar.tsx` |
| Card checkbox | `components/recruitment/pipeline/candidate-card.tsx` |
| Comparison UI | `components/recruitment/pipeline/candidate-comparison-dialog.tsx` (new — name flexible per repo naming review) |
| Types / helpers | `lib/recruitment/` — shared evaluation DTO typings with Story 5.3 (`types.ts`, optional `evaluation-format.ts`) |
| API reuse | Intended `GET` handler colocated next to Story 5.3 under `app/api/recruitment/candidates/[id]/evaluations/route.ts` (create only if absent when this story executes) |

### RBAC Impact

- **Audience:** Authenticated recruiter/headhunters viewing a vacancy pipeline they already see under standard recruitment permissions — **candidate comparison introduces no elevated capability** (read-only aggregation of existing evaluations + existing candidate fields).
- **Required gates:** Calls must pass the same **`recruitment:read` + vacancy/candidate entity scope** checks established for `GET /api/recruitment/vacancies/[id]/candidates`, `GET …/candidates/[id]`, or the Story 5.3 evaluations listing route — whichever applies to hydrated field.
- **No reviewer path:** Scoped share tokens must **never** expose multi-candidate comparative views.
- **No special permission key:** Omit bespoke flag such as `recruitment:compare`; avoid inventing granular compare permission — aligns with Epic 5 evaluation read surface.

### Anti-Patterns to Avoid

1. **Do not** block Compare behind `candidate:write` — comparison is analytic read UX.
2. **Do not** fetch evaluations for unchecked candidates prematurely — hydrate on modal open unless optimistic prefetch justified.
3. **Do not** couple comparison layout to fragile absolute-position columns without horizontal scroll regression testing at 1024 px width — headhunters predominantly desktop yet must not clip.
4. **Do not** reset drag-and-drop state incorrectly when toggling checkbox — isolate local card stopPropagation semantics.
5. **Do not** highlight “best” when scores are **`null`/unevaluated** across row — degrade gracefully with muted cells.
6. **Do not** rely on fragile string parsing of evaluator names for identity — reuse structured reviewer attribution from Evaluation model.

### Previous Story Intelligence (Story 5.3)

- **Aggregated evaluations UI** trains the datum contract: criterion averages, expandable `Evaluation` reviewer rows, textual recommendations — Comparison view **compresses that pattern** horizontally across candidates instead of vertically in one profile.
- **SSE `recruitment:share:evaluated`**: Already signals fresh evaluations — Comparison dialog should optionally **refetch opened candidate set on event** while modal open (parity with Story 5.3 live-update expectation) OR document explicit “manual refresh close/reopen MVP” deferral decision in PR if noisy.
- **ScoreRing thresholds** (≥4 green, 3 amber, <3 red, null dashed) reused for overall aggregate row visual consistency vs pipeline cards (`components/recruitment/pipeline/score-ring.tsx`).
- **Prerequisite sequencing:** Confirm Story 5.3 ships evaluation GET + aggregate fields first; Comparison story must not regress pipeline load cost (extra calls only inside Compare UX).

### i18n Keys (`messages/nl.json`, `messages/fr.json`)

| Key | Purpose |
|-----|---------|
| `recruitment.comparison.checkboxLabel` | SR label for selecting candidate for comparison |
| `recruitment.comparison.checkboxSelected` | State announcement optional |
| `recruitment.compare` | Toolbar button verb |
| `recruitment.comparison.title` | Dialog title (“Compare candidates”) |
| `recruitment.comparison.close` | Close control |
| `recruitment.comparison.removeColumn` | Column header dismiss `aria-label` |
| `recruitment.comparison.criterionAverage` | Sub-label for aggregated average vs individuals |
| `recruitment.comparison.overallScore` | Row label overall |
| `recruitment.comparison.daysInPipeline` | Row label days |
| `recruitment.comparison.source` | Row label source enum display |
| `recruitment.comparison.keyQualifications` | Row grouping label |
| `recruitment.comparison.significantDifference` | Explainer for flagged row / cell affordance |
| `recruitment.comparison.loadError` | Failed evaluation fetch toast/inline |

### Performance

- Max **four** simultaneous evaluation GETs acceptable on modal open (~light JSON each); prefer `Promise.all` with shared loading skeleton row shimmer.
- Avoid re-render storms: memo derived highlight map keyed by `{candidateId,criterionId}`.
- Virtualization **not needed** initially (few rows × few columns dominant complexity is network not DOM).

### UX Specifications

- **Greenhouse-inspired** matrix: Candidate columns × metric rows — first column pinned labels stays visible horizontally.
- **Max four columns** readability rule enforced in UX + technical cap.
- Highest score highlight **subtle** — must not overwhelm ScoreRing emerald semantics.
- **>1 pt gap flag** conspicuous but WCAG-compliant (icon + explanatory tooltip on hover/focus).
- Closing restores mental model: unchecked pipeline — user should never wonder “why is Compare ghosted” because stale IDs linger.

### References

- Epic AC source: `_bmad-output/planning-artifacts/epics.md` (Story 5.4 block)
- Side-by-side & scorecard UX adoption: `_bmad-output/planning-artifacts/ux-design-specification.md` (“Adopt…” scorecard bullets; `CandidateComparison` Wave 2 list)
- Recruitment read posture: `_bmad-output/planning-artifacts/architecture.md` (aggregated recruiter read RBAC notes)
- Evaluations SSE + reviewer flow: `_bmad-output/implementation-artifacts/5-2-scorecard-evaluation-form.md`
- Pipeline building blocks: `components/recruitment/pipeline/pipeline-kanban.tsx`, `components/recruitment/pipeline/candidate-card.tsx`, `components/recruitment/pipeline/score-ring.tsx`
- Sprint ordering hint: `_bmad-output/implementation-artifacts/sprint-status.yaml` (ensure 5.3 precedes execution)
