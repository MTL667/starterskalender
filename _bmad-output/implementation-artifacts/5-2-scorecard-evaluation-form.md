# Story 5.2: Scorecard Evaluation Form

> Status: ready-for-dev
> Epic: 5 — Evaluation & Scoring
> Generated: 2026-05-16
> Depends on: Story 5.1 (vacancy scorecard criteria), Stories 4.1–4.6 (scoped share, expiration, audit expectations)

## Story

As a reviewer,
I want to score a candidate on each criterion and add a recommendation,
so that my assessment is structured, consistent, and useful to the headhunter.

## Acceptance Criteria

**AC1:** Given I have an active share and the vacancy has a scorecard configured,
When I view the scoped candidate view,
Then `ScorecardForm` appears in the right panel listing all criteria, each criterion offers five rating dots (1–5), and a recommendation textarea appears below the criteria list.

**AC2:** Given I am filling out the scorecard,
When I click a rating dot for a criterion (1–5),
Then that dot and every dot to its left render filled (green), and the chosen score is visually confirmed.

**AC3:** Given not every criterion has a selected rating yet,
When I look at the submit control,
Then it stays disabled with the label explaining that all criteria must be rated (e.g. “Rate all criteria to submit”, exact copy via i18n).

**AC4:** Given every criterion has a rating selected,
When I optionally type in the recommendation textarea,
Then “Submit Review” becomes enabled using the primary (blue) button style.

**AC5:** Given I activate “Submit Review”,
When the submission request runs,
Then a loading spinner is shown during the API call; on success “Review submitted ✓” confirmation is displayed; the form becomes read-only while still showing submitted scores/recommendation; SSE event `recruitment:share:evaluated` is emitted with payload suitable for headhunters (e.g. share/candidate/vacancy ids).

**AC6:** Given I navigate with the keyboard only,
When I move focus through `ScorecardForm`,
Then each criterion group is focusable as a labelled unit, Tab advances between criterion groups (or logically ordered controls), dots are exposed as radios with numeric values announced by assistive tech, and arrow keys change/move within the ratings for the focused criterion group per expected radio-group behavior.

**AC7:** Given the vacancy has **no** scorecard criteria configured **or** the share is invalid / already evaluated,
When the scoped view renders,
Then the right panel does not present an interactive ScorecardForm (hide or show an appropriate informational state per Story 5.1 contract — placeholder text only if product agrees), and POST evaluate returns a clear HTTP error without mutating state.

## Tasks / Subtasks

- [ ] Task 1: Prisma schema — Evaluation model & relations (AC: 5,7)
  - [ ] 1.1 Add `Evaluation` model (`id`, `candidateId`, `shareId`, `vacancyId`, `evaluatorId`, `scores` Json, `comment` String?, `createdAt`; `@@unique([shareId])`; indexes per spec)
  - [ ] 1.2 Wire relations: Candidate, CandidateShare, Vacancy, User (evaluator); ensure cascade rules match recruitment patterns
  - [ ] 1.3 Extend `CandidateShare` with post-submit behavior expectations (consume `evaluationSubmittedAt` write from evaluate flow)
  - [ ] 1.4 Migrate + `npx prisma generate`

- [ ] Task 2: Shared types — EvaluationScore payload (AC: 1,5,7)
  - [ ] 2.1 Define `EvaluationScore` / submission DTO aligned with vacancy criteria IDs from Story 5.1 (`criterionId`, `score` 1–5)
  - [ ] 2.2 Zod schema validate POST body server-side against current vacancy criteria (reject unknown ids, duplicates, invalid scores)

- [ ] Task 3: Evaluate API — share-token write path (AC: 5,7)
  - [ ] 3.1 Create `app/api/recruitment/shared/[token]/evaluate/route.ts` — `POST` only
  - [ ] 3.2 `requireAuth()` then resolve `CandidateShare` by token
  - [ ] 3.3 Enforce layered checks: user match (`share.sharedWithUserId === session.user.id`), share not revoked, not expired (including post-evaluation 24h window per Story 4.5 rules), `evaluationSubmittedAt IS NULL`
  - [ ] 3.4 Confirm vacancy defines scorecard criteria (same payload source as reviewer UI); 400 if none
  - [ ] 3.5 Persist `Evaluation` in a transaction with `evaluationSubmittedAt` on share set to `now()`
  - [ ] 3.6 **Do not** check `recruitment:read`, `candidate:write`, or entity-scope lists — authorization is purely token + user identity + share validity + eligibility

- [ ] Task 4: SSE + realtime contract (AC: 5)
  - [ ] 4.1 Add `recruitment:share:evaluated` to `SSEEventType` in `lib/events.ts`
  - [ ] 4.2 Emit `eventBus.emit` with `entityId` matching how headhunters subscribe (typically vacancy’s entity scope — align with pipeline share events)

- [ ] Task 5: Audit logging (AC: 5)
  - [ ] 5.1 On successful evaluate, call `createAuditLog` with `CANDIDATE_EVALUATED`, `actorId = evaluator`, `target = candidateId`, meta summarizing criterion scores (not necessarily full verbatim comment length if truncation policy applies — follow audit patterns)

- [ ] Task 6: ScorecardForm component (AC: 1–6)
  - [ ] 6.1 Add `components/recruitment/share/scorecard-form.tsx` (props: `criteria`, `candidateId`, `shareToken` or derived submit handler — avoid redundant fetches from children)
  - [ ] 6.2 Render criterion rows: label typography `text-sm font-medium`; five-dot visual as controlled radio group with green filled state left of selection
  - [ ] 6.3 Recommendation textarea (optional until submit)
  - [ ] 6.4 SubmitDisabled until all ratings selected; tooltip or helper text communicates missing ratings
  - [ ] 6.5 States: empty | partial | complete | submitting | submitted (confirmation + read-only)

- [ ] Task 7: Scoped view integration — right panel (AC: 1–7)
  - [ ] 7.1 Extend `scoped-view-client.tsx` layout: desktop two-column (left candidate data / right ScorecardForm), stacked on mobile — align with UX spec
  - [ ] 7.2 Ensure GET scoped payload (or adjunct API) exposes scorecard criteria and flags: whether form should render, whether share already evaluated (read-only recap)

- [ ] Task 8: Accessibility (AC: 6)
  - [ ] 8.1 Use semantic `<fieldset>` / `<legend>` or `role="radiogroup"` + `aria-labelledby` per criterion
  - [ ] 8.2 Each radio exposes value 1–5; ArrowLeft/ArrowRight cycles within group when focus is inside
  - [ ] 8.3 Verify VoiceOver/NVDA spot-check (manual QA checklist item)

- [ ] Task 9: i18n (AC: 3–6)
  - [ ] 9.1 Add keys to `messages/nl.json` and `messages/fr.json` per Dev Notes § i18n

- [ ] Task 10: Tests (smoke/E2E as available)
  - [ ] 10.1 API: happy path POST evaluate; forbidden cases (wrong user, revoked, expired, double submit); criteria mismatch vs vacancy
  - [ ] 10.2 UI: submit disabled → enabled flow; spinner; post-submit read-only; keyboard radio behavior (Playwright prefers `getByRole('radio')`)

## Dev Notes

### Architecture Decisions

- **First share-scoped write path:** Evaluate is deliberately **not** `POST /api/recruitment/candidates/[id]/...` — reviewers must never need candidate write permission. Authorization is layered as specified by the retrospective: authenticated user, token lookup, reviewer match, share validity (revocation, timebox, evaluation state), vacancy scorecard existence, then persist `Evaluation` + mutate `evaluationSubmittedAt`.
- **SSE direction:** Mirrors share-created/revoked pattern so headhunters with an open candidate profile receive aggregate updates later (Story 5.3 will consume downstream).
- **Idempotency / duplicate:** `evaluationSubmittedAt` gate + DB `@@unique([shareId])` guard against double submits under races.
- **Grace period UX:** Story 4.5 already defines that after submission the reviewer retains read-only access for 24 hours — `ScorecardForm` must flip to recap mode rather than disappearing silently.

### Schema Changes (Evaluation model)

```prisma
model Evaluation {
  id            String          @id @default(cuid())
  candidateId   String
  candidate     Candidate       @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  shareId       String          @unique
  share         CandidateShare  @relation(fields: [shareId], references: [id])
  vacancyId     String
  vacancy       Vacancy         @relation(fields: [vacancyId], references: [id])
  evaluatorId   String
  evaluator     User            @relation(fields: [evaluatorId], references: [id])
  scores        Json            // EvaluationScore[] — aligned with vacancy criteria snapshots
  comment       String?
  createdAt     DateTime        @default(now())

  @@index([candidateId])
  @@index([vacancyId])
}
```

Suggested TypeScript pairing:

```typescript
interface EvaluationScore {
  criterionId: string
  score: 1 | 2 | 3 | 4 | 5
}
```

Persist full criterion metadata only if Story 5.1 already snapshots names on template — otherwise storing IDs + validating against current vacancy snapshot is acceptable for MVP with documented caveat on historical label drift.

### File Structure

| Area | Files / locations |
|------|-------------------|
| API | `app/api/recruitment/shared/[token]/evaluate/route.ts` |
| SSE | `lib/events.ts` (new event type); emit from evaluate route handler |
| Audit | `lib/audit.ts` — ensure `CANDIDATE_EVALUATED` invoked with consistent meta keys |
| UI | `components/recruitment/share/scorecard-form.tsx` |
| Page wiring | `app/(authenticated)/recruitment/shared/[token]/page.tsx`, `scoped-view-client.tsx` |
| Candidate card | `components/recruitment/share/candidate-scoped-card.tsx` (left panel only; scorecard stays right) |
| Types / Zod | `lib/recruitment/types.ts`, `lib/recruitment/schemas.ts` (extend as needed for evaluate body) |

### RBAC Impact

- **Reviewer role assumption:** Typical reviewers **do not** hold `recruitment:read`, `candidate:write`, `candidate:share`, or entity-scoped recruitment lists. Treat them as general Airport users authenticated only via session.
- **Explicit non-checks:** The evaluate endpoint must **not** require or consult `visibleEntityIds`, `recruitment:read`, pipeline permissions, or “full profile” RBAC helpers. Grants flow only from owning a valid share row tied to `sharedWithUserId`.
- **Headhunter path unchanged:** Headhunters continue to rely on RBAC for candidate APIs; reviewer path remains isolated behind `/recruitment/shared/[token]` and `/api/recruitment/shared/...`.

### Anti-Patterns to Avoid

1. **Do not** reuse `POST /api/recruitment/candidates/[id]/evaluate` for reviewer submissions — violates token-first architecture and leaks permission assumptions.
2. **Do not** trust client-only disables — server must enforce share validity, uniqueness, criterion coverage, numeric bounds, and scorecard-config presence.
3. **Do not** emit SSE before DB commit succeeds; emit after consistent transaction completes.
4. **Do not** hide failure behind generic toast without mapping HTTP codes (429/409/403/410) to reviewer-safe copy.
5. **Do not** implement dots as clickable `div`s without radios — violates AC6 and UX accessibility contract.

### Previous Story Intelligence (Epic 4)

- **4.1** Establishes `CandidateShare`, token secrecy, notifications to reviewer, SSE `recruitment:share:created`, and audit `CANDIDATE_SHARED`.
- **4.2–4.3** UX for share dialogs / field picker — doesn’t gate evaluate but reinforces field-minimization mindset.
- **4.4** Defines `/recruitment/shared/[token]` SSR + client boundary, two-column UX placeholder for scorecard, `maskCandidateForViewer` omission rule, and attribution header.
- **4.5** Expiration DAG (revoked → expiresAt → evaluation grace 24h) must be mirrored in BOTH GET scoped data and POST evaluate guards.
- **4.6** Expects audit `CANDIDATE_EVALUATED` wiring when evaluations exist — implement now rather than reopening Epic 5.
- **4.7** Share templates indirectly speed headhunter flow but reviewer still ends on same scoped page — no template-specific divergence for scoring.
- **Retro note:** Majority of Epic 4 code-review HIGH severity items were RBAC mistakes — repetition here escalates severity because writes mutate compliance-sensitive data.

### i18n Keys (add to `messages/nl.json`, `messages/fr.json`)

| Key | Purpose |
|-----|---------|
| `recruitment.scorecard.title` | Right panel heading |
| `recruitment.scorecard.recommendationLabel` | Textarea label / placeholder |
| `recruitment.scorecard.submitDisabledHint` | “Rate all criteria to submit” |
| `recruitment.scorecard.submit` | “Submit Review” |
| `recruitment.scorecard.submitting` | Loading verb |
| `recruitment.scorecard.submitted` | “Review submitted ✓” |
| `recruitment.scorecard.readOnlyGrace` | Optional banner referencing 4.5 grace wording |
| `recruitment.scorecard.error.generic` | Network/server failure |
| `recruitment.scorecard.error.duplicateSubmit` | Already evaluated |
| `recruitment.scorecard.error.noScorecard` | Vacancy without criteria |

### Performance

- Form is small-DOM (~5–15 criteria typical) — prioritize server validation latency over client memoization gymnastics.
- Single POST per submission; avoid N+1 on evaluate route (preload vacancy + criteria in one round-trip inside handler).
- Large recommendation text stays within Vacancy/policy limits if imposed (coordinate with Story 5.1 or global validation).

### UX Specifications

- Anatomy: vertically stacked criterion list → recommendation textarea → primary submit.
- Labels: criterion text `text-sm font-medium`; green fill conveys positive scale (consistent with UX tokens for scoring).
- Disabled submit copy explicit per AC3; primary blue highlight only when completeness achieved.
- Submitted success state clearly non-interactive; align copy with reviewer flow targeting under two minutes.
- Responsive: stacked mobile; maintain reading order Left-to-Right panels on desktop identical to UX Experiential Mechanic 3.

### References

- Epic AC source: `_bmad-output/planning-artifacts/epics.md` (Story 5.2 block)
- RBAC retrospective: `_bmad-output/implementation-artifacts/epic-3-4-retro-2026-05-16.md`
- Scoped view story: `_bmad-output/implementation-artifacts/4-4-reviewer-scoped-view.md`
- Expiration & grace: `_bmad-output/implementation-artifacts/4-5-access-expiration-auto-revoke.md`
- Audit expectations: `_bmad-output/implementation-artifacts/4-6-candidate-access-audit-logging.md`
- UX Scorecard component + layout: `_bmad-output/planning-artifacts/ux-design-specification.md` (ScorecardForm, reviewer panel)
- Planning architecture notes: `_bmad-output/planning-artifacts/architecture.md` (Evaluation & expiration flow)
