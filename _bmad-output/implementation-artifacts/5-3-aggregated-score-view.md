# Story 5.3: Aggregated Score View

> Status: ready-for-dev  
> Epic: 5 — Evaluation & Scoring  
> Generated: 2026-05-16  
> Depends on: Story 5.1 (scorecard criteria + Evaluation model), Story 5.2 (evaluation submission + `recruitment:share:evaluated` SSE emission)

## Story

As a headhunter,
I want to see aggregated scores across all reviewers for each candidate,
So that I can make informed decisions based on combined assessments.

## Acceptance Criteria

**AC1:** Given a candidate has received one or more evaluations, When I view their profile (overview tab), Then I see an "Evaluations" section showing: overall average score (`ScoreRing`), number of reviews completed, and a per-criterion breakdown.

**AC2:** Given multiple reviewers have scored a candidate, When I view the per-criterion breakdown, Then each criterion shows: criterion name, average score across reviewers, individual reviewer scores (expandable), and reviewer names.

**AC3:** Given a candidate has a score, When their card renders in the pipeline, Then `ScoreRing` displays the aggregate evaluation score with color coding (green ≥4.0, amber 3.0–3.9, red <3.0, gray dashed border if no score).

**AC4:** Given I want to see reviewer recommendations, When I expand the evaluations section (or nested reviewer breakdown), Then I see each reviewer's text recommendation alongside their scores.

**AC5:** Given a new evaluation is submitted while another user completes a review, When I am viewing that candidate's profile with the dialog open, Then the aggregate score and breakdown update in real time via SSE (without full page reload), and `ScoreRing` values re-render accordingly.

## RBAC Impact

**Team agreement:** All **read** paths for evaluation aggregates, per-reviewer scores, and recommendations use standard **`recruitment:read` + entity scope** on recruitment API routes. **Do not** add or reuse share-token endpoints (`/api/recruitment/shared/[token]/*`) for headhunter views of evaluation results — those routes exist for reviewer submit/read in scoped context only.

### Permissions

| Permission | Where enforced | Purpose in this story |
|------------|------------------|----------------------|
| `recruitment:read` | `GET /api/recruitment/candidates/[id]/evaluations`, `GET /api/recruitment/vacancies/[id]/evaluations`, extended candidate/pipeline payloads as needed | Load evaluations for aggregation UI; hiring managers/recruiters only via RBAC. |
| Entity scope | Same routes + existing `GET` candidate/vacancy handlers | Candidate and vacancy must belong to an entity the caller can read. |

### Target roles

- **Recruiter / headhunter** and **Hiring Manager** (per matrix): view aggregated evaluations on candidate profile and pipeline indicators where `recruitment:read` applies.
- **Reviewer:** continues to submit via **`POST /api/recruitment/shared/[token]/evaluate`** (Story 5.2); must **not** be granted recruitment read APIs solely to see aggregates.

### Endpoint contract (verify / implement)

| Endpoint | Method | Required permission | Entity scope | Purpose |
|----------|--------|---------------------|--------------|---------|
| `/api/recruitment/candidates/[id]/evaluations` | GET | `recruitment:read` | Yes | List evaluations for candidate with evaluator display names, scores JSON, recommendation text; server computes aggregates OR returns rows for client aggregation (prefer server-side aggregates + criterion breakdown for consistency). |
| `/api/recruitment/vacancies/[id]/evaluations` | GET | `recruitment:read` | Yes | Optional bulk read for vacancy-level reporting; reuse patterns if comparing candidates later — not strictly required for AC if candidate endpoint suffices. |
| `/api/recruitment/candidates/[id]` | GET | `recruitment:read` | Yes | May embed summary fields (`evaluationAverage`, `evaluationCount`) to avoid N+1 on pipeline — or ensure pipeline list includes those fields from a single query. |

### Security checklist

- Do not expose evaluation payloads through share-token GET without field masking policy; **recruiter UI** uses RBAC routes only.
- Sanitize or omit internal IDs in SSE payloads if needed; follow existing pipeline SSE minimal-payload pattern.
- Ensure `Evaluation` rows are only returned when the requesting user’s entity scope includes the candidate’s vacancy entity.

## Tasks / Subtasks

- [ ] Task 1: API — candidate evaluations aggregate (AC: 1, 2, 4)
  - [ ] 1.1 Add `app/api/recruitment/candidates/[id]/evaluations/route.ts` — `GET`, `requireAuth` + `recruitment:read` + entity scope on candidate’s vacancy.
  - [ ] 1.2 Query `Evaluation` joined with `User` (evaluator) and `Vacancy` (for `scorecardCriteria` labels / ordering); validate `scores` JSON against `EvaluationScore[]` shape.
  - [ ] 1.3 Return `{ data: { evaluations: [...], aggregate: { overallAverage, reviewCount, criteria: [...] } } }` (exact names per project JSON conventions) where `criteria` includes: `criterionId`, `name` (from vacancy config at read time or denormalized), `average`, `reviews: [{ evaluatorName, score, recommendation }]`.
  - [ ] 1.4 Map missing or legacy criterion ids gracefully (show raw id or “Unknown criterion” + log) — do not fail entire response.

- [ ] Task 2: API / data — pipeline summary fields (AC: 3)
  - [ ] 2.1 Extend pipeline candidate serialization (`GET /api/recruitment/vacancies/[id]/candidates` or equivalent) to include `evaluationAggregateScore: number | null` and optionally `evaluationReviewCount` derived from evaluations for that candidate.
  - [ ] 2.2 Define **overall aggregate** consistently with detail view (e.g. mean of all numeric criterion scores across all reviews, or mean of per-review averages — **pick one rule, document in response type**; recommend mean of all submitted criterion scores weighted equally unless PRD says otherwise).

- [ ] Task 3: UI — candidate detail Evaluations section (AC: 1, 2, 4, 5)
  - [ ] 3.1 In `components/recruitment/pipeline/candidate-detail-dialog.tsx` (overview tab), add an **Evaluations** section: heading, `ScoreRing` for overall average (supplement with `text-lg font-bold` numeric if UX requires), review count badge/text.
  - [ ] 3.2 Per-criterion rows: name, small `ScoreRing` or inline average, `Collapsible` / `Accordion` for “Reviewer breakdown” listing names, scores, and recommendation excerpt.
  - [ ] 3.3 Subscribe with `useSSE` (narrow filter: recruitment events for current `entityId` + `candidateId` match) to `recruitment:share:evaluated` — on match, **refetch** `GET .../evaluations` or patch local React Query cache; ensure loading skeleton does not flicker unnecessarily.
  - [ ] 3.4 If tabbed layout is preferred over a single Overview, adding an **Evaluations** tab is acceptable; AC explicitly references overview tab — **default:** place block in Overview for discoverability.

- [ ] Task 4: UI — pipeline card ScoreRing (AC: 3)
  - [ ] 4.1 Update `PipelineCandidateItem` / `candidate-card.tsx` to pass **`evaluationAggregateScore`** into `ScoreRing` (replacing sole reliance on `niceToHaveScore` **or** show both with clear labels — product call: minimally evaluation aggregate must drive ring per AC).
  - [ ] 4.2 Update card `aria-label` segments to distinguish nice-to-have vs evaluation when both visible.
  - [ ] 4.3 Extend `pipeline-kanban.tsx` SSE handler for `recruitment:share:evaluated`: when `vacancyId` matches, update candidate’s aggregate fields in local state OR trigger targeted refetch consistent with Story 2.5 patterns.

- [ ] Task 5: SSE consistency (AC: 5)
  - [ ] 5.1 Confirm `SSEEventType` includes `recruitment:share:evaluated` (per `architecture.md` Communication Patterns).
  - [ ] 5.2 Ensure `SSEProvider` registers listener for this type if not already present.
  - [ ] 5.3 Align `POST .../shared/[token]/evaluate` emitter with **`recruitment:share:evaluated`** (architecture scoped-view section mentions `recruitment:evaluation:submitted` — **standardize on** `recruitment:share:evaluated` per global naming table).
  - [ ] 5.4 Payload MUST include `entityId`, `vacancyId`, `candidateId` for routing and subscriber filters (mirror pipeline event payload style).

- [ ] Task 6: i18n & a11y (AC: all)
  - [ ] 6.1 Add keys under `messages/nl.json` and `messages/fr.json` for evaluations section title, review count, criterion labels, expand/collapse, empty state (“No evaluations yet”), recommendation label.
  - [ ] 6.2 Ensure expanded reviewer rows are keyboard-accessible and screen-reader friendly (headings or list semantics).

## Dev Notes

### RBAC impact

Full matrix and endpoint checklist live in **[RBAC Impact](#rbac-impact)** (after Acceptance Criteria). Implementation rule: recruiter and hiring-manager UIs fetch evaluation aggregates **only** through RBAC-scoped recruitment APIs (`recruitment:read` + entity scope). Share-token endpoints remain for **reviewer** submit/session flows — **never** reuse them as a shortcut for headhunter read access to evaluations.

### Architecture decisions

- **Read path:** Recruiter-facing aggregation is **only** through `GET /api/recruitment/candidates/[id]/evaluations` (and optional vacancy listing) with `recruitment:read` + entity scope — matches architecture “Reading Evaluations (Recruiter Side)”.
- **Aggregation location:** Prefer **server-side** aggregation to keep one source of truth for pipeline cards and detail view and to avoid leaking raw JSON interpretation differences across clients.
- **Criterion labels:** Resolve names from current `Vacancy.scorecardCriteria` by `criterionId`; historical evaluations may reference renamed criteria — display stored score with best-effort name resolution.
- **Overall average:** Document chosen rule in shared type (e.g. `lib/recruitment/types.ts`) so pipeline card and profile never diverge.
- **SSE:** Reuse entity-scoped bus + `SSEProvider`; do not create a parallel channel for evaluations.

### File structure

```
app/api/recruitment/candidates/[id]/evaluations/route.ts   # NEW — GET aggregate
app/api/recruitment/vacancies/[id]/candidates/route.ts     # MODIFY — include evaluation aggregates on list items (or parallel efficient query)
app/api/recruitment/shared/[token]/evaluate/route.ts      # MODIFY — emit recruitment:share:evaluated (+ payload alignment)

lib/events.ts                                             # MODIFY if event type missing
lib/recruitment/evaluation-summary.ts                     # NEW (optional) — pure functions: overall average + per-criterion rollups from Evaluation rows
lib/recruitment/types.ts                                  # MODIFY — aggregate DTO types

components/recruitment/pipeline/candidate-detail-dialog.tsx
components/recruitment/pipeline/candidate-card.tsx
components/recruitment/pipeline/pipeline-kanban.tsx
components/providers/sse-provider.tsx                       # MODIFY if listener missing

messages/nl.json, messages/fr.json
```

### Anti-patterns to avoid

1. **DO NOT** fetch recruiter evaluation aggregates via `/api/recruitment/shared/[token]` — wrong trust boundary.
2. **DO NOT** embed full evaluator PII beyond what RBAC already allows on candidate endpoints.
3. **DO NOT** refetch entire pipeline on each evaluation SSE if local state merge is sufficient; **do** reconcile on reconnect (Story 2.5 pattern).
4. **DO NOT** block UI on evaluation fetch failure for whole profile — show inline error in Evaluations section only.
5. **DO NOT** duplicate `ScoreRing` color thresholds client-side in multiple ad hoc implementations — keep using `score-ring.tsx` thresholds (≥4 green, ≥3 amber, else red, null dashed).

### Previous story intelligence

- **Story 2.5** (`2-5-real-time-pipeline-updates-via-sse.md`): `useSSE` wildcard patterns, drag-queue for conflicts, reconnect refetch — extend rather than reinvent for evaluation updates.
- **Story 5.1** (`5-1-scorecard-template-definition.md`): `Vacancy.scorecardCriteria` IDs and ordering; evaluations store `scores` as `EvaluationScore[]` JSON keyed by criterion id.
- **Story 4.4 / architecture:** Share-token routes are reviewer-scoped reads and evaluation **writes** — recruiter reads stay on RBAC routes.
- **Components:** `ScoreRing` (`components/recruitment/pipeline/score-ring.tsx`) already encodes AC3 null and color behavior; reuse `sizes` — use `lg` in detail header if needed next to `text-lg font-bold` aggregate label.

### i18n keys (proposed namespace)

Namespace `recruitment.evaluations` (or extend `recruitment.candidate` if already crowded):

- `.title`, `.reviewCount`, `.overallAverage`, `.noEvaluations`
- `.criterion.average`, `.criterion.expandReviewers`, `.criterion.collapseReviewers`
- `.reviewer.score`, `.reviewer.recommendation`, `.reviewer.anonymousFallback` (if ever needed)
- `.updatedLive` (optional subtle hint when SSE refresh occurs — keep non-intrusive)

### Performance

- Single GET for evaluations when opening candidate detail; avoid refetching full candidate if only evaluations change (SSE-triggered partial refetch).
- Pipeline list: add aggregate fields in same query as candidates or use Prisma aggregation subquery to avoid O(n) extra requests.
- Cap JSON payload size: evaluations per candidate are typically small; if many reviewers, stream or paginate only if product demands (Phase 2).

### UX specifications

- **Detail view:** “Evaluations” section below existing overview blocks; overall score uses `ScoreRing` + **`text-lg font-bold`** numeric display for the aggregate (per UX note).
- **Breakdown:** Expandable per-criterion rows; inside expansion, show reviewer name, per-criterion score, and recommendation text (wrap long text, `text-sm text-muted-foreground` for secondary body).
- **Pipeline card:** `ScoreRing` reflects **evaluation** aggregate per AC; if product keeps nice-to-have score, use secondary visual (smaller badge) so primary ring matches evaluation — confirm with PM if ambiguous.
- **Empty state:** Friendly copy when zero evaluations completed; omit breakdown.

## References

- Epics: `_bmad-output/planning-artifacts/epics.md` — Epic 5, Story 5.3 (FR27)
- Architecture RBAC matrix, Evaluation model, recruiter read endpoints, SSE naming: `_bmad-output/planning-artifacts/architecture.md` (Evaluation table; Communication Patterns — `recruitment:share:evaluated`; Scoped View Write Architecture — align emit name with Patterns table)
- SSE patterns: `_bmad-output/implementation-artifacts/2-5-real-time-pipeline-updates-via-sse.md`
- Scorecard prerequisites: `_bmad-output/implementation-artifacts/5-1-scorecard-template-definition.md`
- Related: Story 5.2 evaluation submit + SSE (implementation artifact when present)
- UX aggregation & typography notes: UX context in story request; UX spec — structured scorecards / reviewer flow in `_bmad-output/planning-artifacts/ux-design-specification.md`
