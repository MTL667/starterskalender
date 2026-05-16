# Story 3.5: Automatic Dealbreaker Filtering & Scoring

> Status: done
> Epic: 3 — Public Presence & Candidate Application
> Story: 3.5 — automatic-dealbreaker-filtering-scoring
> Generated: 2026-05-15

## Story

As a headhunter,
I want candidates to be automatically evaluated against my vacancy criteria,
so that I can instantly see who qualifies and how well they match.

## Acceptance Criteria

**AC1:** Given a vacancy has dealbreakers configured and a new candidate enters the pipeline, When the candidate's application data is processed, Then the system evaluates each dealbreaker against the candidate's responses, And candidates who fail any dealbreaker are marked with `dealbreakersResult: FAIL`, And their card shows at 50% opacity with red X badge in the pipeline.

**AC2:** Given a vacancy has nice-to-have criteria with weights, When a candidate's application is processed, Then the system calculates a weighted score (0-5 scale) based on matching criteria, And the score is stored as `niceToHaveScore` on the candidate record, And the score is displayed via ScoreRing on the candidate card.

**AC3:** Given a candidate fails dealbreakers, When the headhunter views the pipeline, Then failed candidates are still visible in their stage (not auto-rejected), And the headhunter can still manually progress them if desired (override).

**AC4:** Given criteria cannot be automatically evaluated (e.g., free-text requirements), When the system processes the application, Then those criteria are marked as "manual review needed", And the partial score reflects only automatically evaluable criteria.

## Tasks / Subtasks

- [x] Task 1: Schema — add `responses` field to CandidateApplication (AC: 1,2)
  - [x] 1.1 Add `responses Json @default("[]")` to `CandidateApplication` in `prisma/schema.prisma`
  - [x] 1.2 Run `npx prisma generate` (no migrate in dev)
  - [x] 1.3 Define TypeScript `CriterionResponse` interface in `lib/recruitment/types.ts`

- [x] Task 2: Create scoring engine `lib/recruitment/candidate-scoring.ts` (AC: 1,2,4)
  - [x] 2.1 `evaluateDealbreakers(dealbreakers: VacancyDealbreaker[], responses: CriterionResponse[]): DealbreakersResult` — returns PASS/FAIL/PENDING
  - [x] 2.2 `calculateNiceToHaveScore(niceToHaves: VacancyNiceToHave[], responses: CriterionResponse[]): number | null` — weighted 0–5 scale
  - [x] 2.3 `scoreCandidate(vacancyId: string, candidateId: string): Promise<{ dealbreakersResult, niceToHaveScore }>` — loads vacancy criteria + candidate responses, evaluates, updates candidate record
  - [x] 2.4 Handle unmatched criteria: if no response for a dealbreaker → FAIL; if no response for nice-to-have → skip (weight excluded from total)

- [x] Task 3: Extend public apply form with criterion questions (AC: 1,2)
  - [x] 3.1 Extend public vacancy API (`/api/public/vacancies/[id]/route.ts`) to include `dealbreakers` and `niceToHaves` in response
  - [x] 3.2 Create `CriteriaQuestions` client component rendering criterion fields based on type
  - [x] 3.3 Integrate into existing application form on the apply page
  - [x] 3.4 Boolean criteria → checkbox; Minimum criteria → number input; Selection criteria → select/checkbox group; Scale criteria → 1-5 radio/select

- [x] Task 4: Extend apply API route to accept and store responses (AC: 1,2)
  - [x] 4.1 Add `responses` to FormData parsing in apply route (JSON string of `{ criterionId, value }[]`)
  - [x] 4.2 Store responses on `CandidateApplication.responses`
  - [x] 4.3 Vacancy criteria loaded via apply page query (passed to form as props)

- [x] Task 5: Trigger scoring on email verification (AC: 1,2,3)
  - [x] 5.1 In `verify/route.ts`, after setting candidate status to ACTIVE, call `scoreCandidate(vacancyId, candidateId)`
  - [x] 5.2 scoreCandidate updates `candidate.dealbreakersResult` and `candidate.niceToHaveScore` directly
  - [ ] 5.3 Emit SSE event `CANDIDATE_SCORED` so pipeline updates in real-time — deferred (SSE system not yet implemented)

- [x] Task 6: i18n keys for criterion questions and scoring (AC: 1,2,4)
  - [x] 6.1 Add `public.apply.criteria.*` keys to `messages/nl.json` and `messages/fr.json`
  - [x] 6.2 Add `recruitment.scoring.*` keys for pipeline context (manual review indicator)

## Dev Notes

### Architecture Decisions

**Scoring trigger: on email verification.** The candidate is `PENDING_VERIFICATION` at apply time. Scoring runs when verification completes (candidate → ACTIVE), ensuring only real candidates are scored. This keeps the apply flow fast and avoids scoring spam/unverified submissions.

**Responses stored on CandidateApplication.** The `responses` JSON field stores the candidate's answers to vacancy criteria. Shape: `CriterionResponse[]` where each entry has `{ criterionId: string, value: boolean | number | string[] }`. This maps directly to `VacancyDealbreaker.id` and `VacancyNiceToHave.id`.

**Scoring is synchronous in the verification route.** No background worker needed — scoring is a pure computation over in-memory data (vacancy criteria JSON + candidate responses JSON). Expected < 50ms for 20 criteria.

**PENDING state on cards.** Currently, `PENDING` dealbreakersResult shows neither pass nor fail badge on `CandidateCard`. This is correct behavior — candidates awaiting scoring have no indicator. After scoring, PASS shows green check, FAIL shows red X with 50% opacity.

### Schema Changes

**Add to CandidateApplication:**
```prisma
model CandidateApplication {
  // ... existing fields ...
  responses   Json      @default("[]") // CriterionResponse[] — answers to vacancy criteria
}
```

**No changes to Candidate model** — `dealbreakersResult` (DealbreakersResult enum: PASS/FAIL/PENDING) and `niceToHaveScore` (Float?) already exist.

### File Structure

**New files:**
- `lib/recruitment/candidate-scoring.ts` — scoring engine (evaluateDealbreakers, calculateNiceToHaveScore, scoreCandidate)
- `components/recruitment/public/criteria-questions.tsx` — Client component for rendering criterion questions on the apply form

**Modified files:**
- `prisma/schema.prisma` — add `responses` to CandidateApplication
- `app/api/public/vacancies/[id]/route.ts` — include dealbreakers/niceToHaves in response
- `app/api/public/vacancies/[id]/apply/route.ts` — accept responses in body, store on CandidateApplication
- `app/api/public/vacancies/[id]/apply/verify/route.ts` — trigger scoring after verification
- `app/jobs/[entityGroup]/[vacancyId]/apply/page.tsx` — integrate CriteriaQuestions
- `components/recruitment/public/application-form.tsx` — pass criteria data, collect responses
- `lib/recruitment/pipeline-events.ts` — add CANDIDATE_SCORED event
- `messages/nl.json` — add criterion + scoring i18n keys
- `messages/fr.json` — add criterion + scoring i18n keys

### Existing Code Patterns

**Vacancy criteria types** (already defined in `lib/recruitment/types.ts`):
```typescript
interface VacancyDealbreaker {
  id: string; name: string; type: 'boolean' | 'minimum' | 'selection'; requiredValue: boolean | number | string[]; label: string
}
interface VacancyNiceToHave {
  id: string; name: string; type: 'scale' | 'boolean' | 'selection'; weight: number
}
```

**Zod validation** (in `lib/recruitment/schemas.ts`): `vacancyDealbreakerSchema` and `vacancyNiceToHaveSchema` already validate criteria structure. Reuse for parsing vacancy JSON.

**Apply route** (`app/api/public/vacancies/[id]/apply/route.ts`):
- Current Zod: `{ email, motivation, _hp }` — extend with `responses`
- Candidate created with `dealbreakersResult: 'PENDING'` — correct starting state
- Vacancy query does NOT load `dealbreakers`/`niceToHaves` — add to select

**Verify route** (`verify/route.ts`):
- Sets `status: 'ACTIVE'` — add scoring call after this
- Has access to `vacancyId` via candidate lookup — use to load criteria

**Candidate list API** (`/api/recruitment/vacancies/[id]/candidates/route.ts`):
- Returns full Candidate rows including `dealbreakersResult` and `niceToHaveScore` — no change needed

**CandidateCard** (`candidate-card.tsx`):
- Already renders: FAIL (red X, 50% opacity), PASS (green check), ScoreRing for niceToHaveScore
- PENDING shows no badge — correct for unscored candidates

**ScoreRing** (`score-ring.tsx`):
- Already handles null score (dashed gray ring with "–")
- Color thresholds: ≥4.0 green, ≥3.0 amber, <3.0 red

**SSE pattern** (`lib/recruitment/pipeline-events.ts`):
- Existing events: CANDIDATE_MOVED, CANDIDATE_ADDED
- Add CANDIDATE_SCORED with payload `{ vacancyId, candidateId, dealbreakersResult, niceToHaveScore }`

### RBAC

- Public apply form: no authentication (public route)
- Public vacancy API: no authentication (public route)
- Scoring runs server-side during verification (no user session needed)
- Pipeline display uses existing `recruitment:read` permission

### Anti-Patterns to Avoid

1. **DO NOT** build a background job/queue for scoring — it's a synchronous computation, < 50ms
2. **DO NOT** modify the Candidate model schema — `dealbreakersResult` and `niceToHaveScore` already exist
3. **DO NOT** auto-reject candidates — failed candidates stay visible in pipeline (AC3)
4. **DO NOT** score at apply time — candidate is PENDING_VERIFICATION, score on verification
5. **DO NOT** create new Zod schemas for criteria types — reuse `vacancyDealbreakerSchema` and `vacancyNiceToHaveSchema` from `lib/recruitment/schemas.ts`
6. **DO NOT** add scoring to the candidate list API query — scores are already on the Candidate record

### Previous Story Intelligence

**From Story 3.3 (apply flow):**
- Apply route uses FormData (not JSON) for CV upload
- Honeypot `_hp` field for anti-spam
- Rate limiting per IP (5/hour)
- Transaction wraps candidate + application creation
- `P2002` catch for duplicate applications (409)

**From Story 3.4 (profile):**
- CandidateDetailDialog shows score and dealbreaker data from PipelineCandidateItem
- AbortController pattern for fetch cancellation
- `safeSourceLabel` for translation fallback

**From Story 3.3 review (CandidateStatus enum):**
- `PENDING_VERIFICATION` → `ACTIVE` transition happens in verify/route.ts
- Only ACTIVE candidates appear in pipeline list

### Scoring Algorithm

**Dealbreaker evaluation:**
```
for each dealbreaker in vacancy.dealbreakers:
  response = responses.find(r => r.criterionId === dealbreaker.id)
  if (!response):
    return FAIL  // missing answer = fail
  if dealbreaker.type === 'boolean':
    if response.value !== dealbreaker.requiredValue: return FAIL
  if dealbreaker.type === 'minimum':
    if response.value < dealbreaker.requiredValue: return FAIL
  if dealbreaker.type === 'selection':
    if !dealbreaker.requiredValue.includes(response.value): return FAIL
return PASS (or PENDING if no dealbreakers configured)
```

**Nice-to-have scoring (0–5 scale):**
```
totalWeight = 0
totalScore = 0
for each criterion in vacancy.niceToHaves:
  response = responses.find(r => r.criterionId === criterion.id)
  if (!response): continue  // skip unmatched, exclude weight
  totalWeight += criterion.weight
  if criterion.type === 'scale':
    totalScore += criterion.weight * (response.value / 5)  // normalize to 0-1
  if criterion.type === 'boolean':
    totalScore += criterion.weight * (response.value ? 1 : 0)
  if criterion.type === 'selection':
    totalScore += criterion.weight * (matchRatio)  // proportion of matching selections
if totalWeight === 0: return null
return (totalScore / totalWeight) * 5  // scale to 0-5
```

### i18n Keys

Add to `public.apply` namespace:
```
"criteria": {
  "sectionTitle": "Vragen bij deze vacature" / "Questions pour ce poste",
  "dealbreakersTitle": "Vereisten" / "Exigences",
  "niceToHavesTitle": "Voorkeuren" / "Préférences",
  "booleanYes": "Ja" / "Oui",
  "booleanNo": "Nee" / "Non",
  "minimumLabel": "Minimaal {value}" / "Minimum {value}",
  "selectionPlaceholder": "Selecteer..." / "Sélectionner...",
  "scaleLabel": "{value} van 5" / "{value} sur 5",
  "required": "(verplicht)" / "(obligatoire)"
}
```

Add to `recruitment` namespace:
```
"scoring": {
  "manualReviewNeeded": "Handmatige beoordeling vereist" / "Évaluation manuelle requise",
  "scoredAutomatically": "Automatisch beoordeeld" / "Évalué automatiquement"
}
```

### Performance

- Scoring computation: < 50ms for 20 criteria (pure in-memory)
- Public apply form: criterion questions add minimal weight (no extra API call — criteria included in vacancy response)
- Scoring on verification: single DB read (vacancy criteria) + single DB update (candidate scores)
- No re-scoring needed — scores are computed once at verification

### UX

**Apply form criteria section:**
- Appears below the email/motivation/CV fields
- Grouped: "Requirements" (dealbreakers) header, then "Preferences" (nice-to-haves) header
- Each criterion shows: name, label (for dealbreakers), input field matching type
- Required indicator on dealbreaker questions
- Touch targets ≥ 44px on all interactive elements

**Pipeline card (no changes needed):**
- CandidateCard already renders PASS/FAIL badges and ScoreRing
- PENDING state (pre-scoring) shows no badge — correct

## References

- Epics: Story 3.5 ACs, FR3 (dealbreakers config), FR4 (weighted nice-to-haves), FR16 (auto-filter), FR17 (score)
- Architecture: `lib/recruitment/candidate-scoring.ts` (planned), Candidate Management FR10-17
- PRD: FR16/FR17, NFR7 (<500ms filter), Accessibility (WCAG 2.1 AA)
- UX: CandidateCard states (dealbreaker fail 50% opacity), ScoreRing component, design tokens
- Previous: `3-3-one-click-application-form.md` (apply flow), `3-4-candidate-data-processing-profile.md` (profile + scoring display)
- Existing code: `lib/recruitment/types.ts` (VacancyDealbreaker, VacancyNiceToHave), `lib/recruitment/schemas.ts` (Zod), `candidate-card.tsx` (UI), `score-ring.tsx` (display)

## Dev Agent Record

### Completion Notes

- Scoring engine created with `evaluateDealbreakers`, `calculateNiceToHaveScore`, and `scoreCandidate` functions
- CriteriaQuestions component renders boolean (radio), minimum (number input), selection (checkboxes), and scale (1-5 radio) inputs
- Scoring triggered on email verification — synchronous, < 50ms expected
- SSE event deferred: CANDIDATE_SCORED not added (SSE bus not implemented yet in this project)
- CandidateCard already handles PASS/FAIL/PENDING states — no UI changes needed
- Task 5.3 (SSE) left unchecked as deferred item

### File List

**New:**
- `lib/recruitment/candidate-scoring.ts`
- `components/recruitment/public/criteria-questions.tsx`

**Modified:**
- `prisma/schema.prisma`
- `lib/recruitment/types.ts`
- `app/api/public/vacancies/[id]/route.ts`
- `app/api/public/vacancies/[id]/apply/route.ts`
- `app/api/public/vacancies/[id]/apply/verify/route.ts`
- `app/jobs/[entityGroup]/[vacancyId]/apply/page.tsx`
- `components/recruitment/public/application-form.tsx`
- `messages/nl.json`
- `messages/fr.json`
