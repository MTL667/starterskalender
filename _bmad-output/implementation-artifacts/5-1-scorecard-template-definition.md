# Story 5.1: Scorecard Template Definition

> Status: ready-for-dev
> Epic: 5 — Evaluation & Scoring
> Generated: 2026-05-16

## Story

As a headhunter,
I want to define evaluation criteria per vacancy,
So that reviewers score candidates on relevant, standardized criteria for the role.

## Acceptance Criteria

**AC1:** Given I am editing a vacancy, When I open the "Scorecard" configuration tab, Then I see a list of evaluation criteria with: name, description, and weight.

**AC2:** Given I am in the scorecard configuration, When I click "Add criterion", Then I can add a criterion with: name (for example "Technical skills"), description (guidance text for reviewers), and weight (1–5 importance), And the criterion appears in the list.

**AC3:** Given I have multiple criteria, When I reorder them via drag handles, Then the order persists and determines display order on the reviewer’s evaluation form.

**AC4:** Given I save the scorecard configuration, When reviewers receive a shared candidate for this vacancy, Then the scoped share API returns the same persisted criteria (name, description, weight, order), And they see those criteria when the Scorecard panel is rendered for the share (interactive rating UI is Story 5.2; minimum bar for 5.1 is correct data on the share payload + recruiter-side verification that saved criteria match the GET response).

**AC5:** Given a vacancy was created from a vacancy template that includes pre-configured scorecard criteria, When I view the Scorecard tab, Then the template’s criteria are pre-filled on the vacancy and fully editable independently of the template.

**AC6:** Given at least one `Evaluation` already exists for this vacancy, When I edit scorecard criteria in the Scorecard tab, Then a persistent inline warning explains that existing evaluations are not rewritten and only new evaluations use updated criteria — exact copy: **"Existing evaluations will not be affected. New evaluations will use the updated criteria."**

## RBAC Impact

This story configures **per-vacancy** scorecard criteria (stored on `Vacancy` JSON). Editing share templates (`VacancyTemplate`) for default criteria requires **template admin** routes. Story 5.2 will consume criteria via token-scoped read APIs (not RBAC parity with recruiters).

### Permissions

| Permission | Where enforced | Purpose in this story |
|------------|----------------|------------------------|
| `vacancy:edit` | `PATCH /api/recruitment/vacancies/[id]` (`requirePermission` + entity `can(...)`) | Create/update reorderable `scorecardCriteria` JSON on an existing vacancy. |
| `recruitment:read` | `GET /api/recruitment/vacancies/[id]` | Load vacancy including `scorecardCriteria` and `_count.evaluations` (or equivalent) for the Scorecard UI and warnings. |
| `vacancy:create` | `POST /api/recruitment/vacancies` | Create vacancy; when `templateId` is supplied, persist template snapshot onto the vacancy (including `scorecardCriteria` — see tasks). |
| `recruitment:admin` | `POST/PATCH /api/recruitment/templates` and `/api/recruitment/templates/[id]` per architecture matrix | Edit `VacancyTemplate` definitions that carry default `scorecardCriteria` for new vacancies from that template. |

### Target roles

- **Recruiter / headhunter** (has `vacancy:edit`, `vacancy:create`, `recruitment:read` on scoped entities): primary user of vacancy Scorecard tab; saves criteria via PATCH.
- **Recruitment admin** (has `recruitment:admin`): maintains `VacancyTemplate` defaults including criteria list.
- **Reviewer**: **not** authorized by recruitment RBAC in this story; criteria are read through the share-token `GET` endpoint (token + user match).

### Endpoint reuse (verify on implementation)

| Endpoint | Method | Required permission | Entity scope | Change for 5.1 |
|----------|--------|--------------------|--------------|----------------|
| `/api/recruitment/vacancies/[id]` | GET | `recruitment:read` | Yes | Extend select/serialization to include `scorecardCriteria`; include `_count.evaluations` (needs `Evaluation` model + relation) so UI can satisfy AC6. |
| `/api/recruitment/vacancies/[id]` | PATCH | `vacancy:edit` | Yes | Accept validated `scorecardCriteria` partial updates alongside existing PATCH fields (`dealbreakers`, `niceToHaves`). |
| `/api/recruitment/vacancies` | POST | `vacancy:create` | Yes | On `templateId`, copy template’s `scorecardCriteria` snapshot onto the created vacancy for AC5. |
| `/api/recruitment/shared/[token]` | GET | Session + `share.sharedWithUserId === session.user.id`; no recruitment RBAC | No | Include `scorecardCriteria` (sorted by `order`) in `vacancy` object of JSON response so reviewer clients display the headhunter-defined template. |
| `/api/recruitment/templates` | POST | `recruitment:admin` | Yes | Accept `scorecardCriteria` on template create. |
| `/api/recruitment/templates/[id]` | GET/PATCH/DELETE | `recruitment:read` / `recruitment:admin` | Yes | Read for recruiters; PATCH/DELETE templates including `scorecardCriteria`. |

**Out of scope for 5.1:** `POST /api/recruitment/admin/scorecard-templates` from the architecture doc is listed as Epic 5 / admin-level **library** API — implement only if product confirms a separate global template catalog; vacancy-level + `VacancyTemplate` JSON fulfills FR24 without that route.

### Security checklist

- Reviewers must not call recruitment vacancy APIs; **read** access to `scorecardCriteria` goes through `GET /api/recruitment/shared/[token]` (this story); **write** (evaluation submit) remains Story 5.2.
- Preserve entity scope on vacancy GET/PATCH/create — same pattern as `dealbreakers` / `niceToHaves`.

## Tasks / Subtasks

- [ ] Task 1: Schema — vacancy + template JSON + Evaluation model prerequisite (AC: 3–6)
  - [ ] 1.1 Add `scorecardCriteria Json @default("[]")` to `Vacancy` in `prisma/schema.prisma` (stored array of criterion objects).
  - [ ] 1.2 Add `scorecardCriteria Json @default("[]")` to `VacancyTemplate`.
  - [ ] 1.3 Add `Evaluation` model and relations (`CandidateShare` unique per share; relations to `Vacancy`, `Candidate`, `User`) matching architecture snippet so vacancy-level evaluation counts and Epic 5.2 can attach scores.
  - [ ] 1.4 Run migration + `npx prisma generate`.

- [ ] Task 2: Types & Zod (AC: 1–3, 6)
  - [ ] 2.1 Define `VacancyScorecardCriterion` in `lib/recruitment/types.ts`: `id` (stable string / cuid), `name`, `description`, `weight` (int 1–5), `order` (non-negative int; sort/display order).
  - [ ] 2.2 Add `vacancyScorecardCriterionSchema` and extend `vacancyUpdateSchema`, `vacancyTemplateCreateSchema`, `vacancyTemplateUpdateSchema` in `lib/recruitment/schemas.ts` (enforce max count, string max lengths; optionally validate unique `order`; at minimum validate weight range 1–5 and non-empty trimmed name).

- [ ] Task 3: API — PATCH/GET vacancy + share read (AC: 1–6, 4)
  - [ ] 3.1 Ensure `PATCH /api/recruitment/vacancies/[id]` persists `scorecardCriteria` via Prisma (already spreads `parsed.data`).
  - [ ] 3.2 Ensure `GET /api/recruitment/vacancies/[id]` returns parsed JSON arrays consistently (like `dealbreakers`) and `_count.evaluations` for Scorecard banner logic.
  - [ ] 3.3 Extend `GET /api/recruitment/shared/[token]/route.ts`: select `scorecardCriteria` from linked vacancy, serialize under `data.vacancy` (array sorted by `order` ascending) so reviewers receive the exact saved template without `recruitment:read`.

- [ ] Task 4: Vacancy create + template APIs (AC: 5)
  - [ ] 4.1 On `POST /api/recruitment/vacancies` when `templateId` is present, fetch template and set `scorecardCriteria` from `VacancyTemplate.scorecardCriteria` (default empty array).
  - [ ] 4.2 Extend `/api/recruitment/templates` handlers to accept and return `scorecardCriteria` (`recruitment:admin` enforced existing).

- [ ] Task 5: UI — Scorecard editor (AC: 1–3)
  - [ ] 5.1 Create `components/recruitment/vacancy/scorecard-criteria-config.tsx`: list rows (name, description, weight selector 1–5), add/remove, explicit save affordance aligned with Criteria (dealbreakers) pattern — not autosave by default unless team standard changes.
  - [ ] 5.2 Implement drag-and-drop reorder with `@dnd-kit/sortable` mirroring `content-block-editor.tsx` (handles, animations, optimistic local order persisted on save/PATCH).

- [ ] Task 6: Integrate vacancy edit page (AC: 1–3, 6)
  - [ ] 6.1 Add a **Scorecard** tab/surface to `app/(authenticated)/recruitment/vacatures/[id]/bewerken/client.tsx` (collocated with existing expandable sections — prefer `Tabs` if design system adopts tabs for this screen; minimum requirement: clearly labeled Scorecard navigation per AC).
  - [ ] 6.2 Banner/warning UI when `_count.evaluations > 0` using exact Epic copy (also add i18n keys with same semantics in nl/fr).

- [ ] Task 7: Template admin UX (AC: 5)
  - [ ] 7.1 Extend `components/recruitment/template/template-form.tsx` (or equivalent admin template UI) so recruitment admins configure default `scorecardCriteria` reused on vacancy creation (`recruitment:admin` gated).

- [ ] Task 8: i18n & a11y (AC: all)
  - [ ] 8.1 Add keys under `messages/nl.json` and `messages/fr.json` for Scorecard labels, warnings, drag instructions, weights.
  - [ ] 8.2 Announce reorder to screen readers (live region optional) consistent with Kanban/card patterns.

## Dev Notes

### Architecture decisions

- **JSON vs normalized tables:** Store `Vacancy.scorecardCriteria` and `VacancyTemplate.scorecardCriteria` as structured JSON arrays, matching `dealbreakers` / `niceToHaves` — vacancy-scoped config without child tables or independent lifecycle entities.
- **Stable criterion `id`:** Each criterion retains a persistent `id` so future `EvaluationScore[]` references in evaluation JSON remain traceable across reorders; renaming text does not need to remap historical scores tied to outdated labels (historic rows remain keyed by criterion id at submission time).
- **Separate from applicant-facing criteria:** Scorecard criteria are **reviewer evaluation** constructs only — do not confuse with vacancy dealbreaker / nice-to-have application filters (explicitly orthogonal per Story 1.5 retrospective note).

### Schema changes (concise reference)

```prisma
model Vacancy {
  // ...existing fields...
  scorecardCriteria Json @default("[]") // VacancyScorecardCriterion[]
}

model VacancyTemplate {
  // ...existing fields...
  scorecardCriteria Json @default("[]") // VacancyScorecardCriterion[] — snapshot defaults
}

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
  scores        Json            // EvaluationScore[] — per criterion (Epic 5.2)
  comment       String?
  createdAt     DateTime        @default(now())

  @@index([candidateId])
  @@index([vacancyId])
}
```

_Adjust relation field names/links to match actual `CandidateShare`/`Candidate` Prisma wiring when merging._

### File structure

```
prisma/schema.prisma                    # Vacancy, VacancyTemplate, Evaluation additions
lib/recruitment/types.ts                # VacancyScorecardCriterion
lib/recruitment/schemas.ts              # Zod for criteria + templates
app/api/recruitment/vacancies/[id]/route.ts   # GET include _count evaluations
app/api/recruitment/vacancies/route.ts      # POST copy from templateId
app/api/recruitment/shared/[token]/route.ts  # GET include vacancy scorecardCriteria
app/api/recruitment/templates/*.ts           # Extend template payloads
components/recruitment/vacancy/scorecard-criteria-config.tsx
app/(authenticated)/recruitment/vacatures/[id]/bewerken/client.tsx
components/recruitment/template/template-form.tsx
messages/nl.json, messages/fr.json
```

### Anti-patterns to avoid

1. **DO NOT** mutate stored `scores` JSON on existing evaluations when criteria change — only show warning; recruiters keep historical payloads for audit/consistency with submitted share state.
2. **DO NOT** require `recruitment:read` for reviewers; token-backed `GET /api/recruitment/shared/[token]` supplies read models; evaluation **POST** is Story 5.2.
3. **DO NOT** invent a second source of truth (separate Scorecard Template table + vacancy JSON) unless `recruitment:admin/library` endpoints are deliberately implemented — defaults live on `VacancyTemplate`; live config on `Vacancy`.
4. **DO NOT** use guessable sequential-only ids without stable cuid for criteria if evaluations already reference ids.
5. **DO NOT** block saves when evaluations exist — warn only.

### Previous story intelligence

- **Story 1.5** (`1-5-dealbreakers-nice-to-have-configuration.md`): Established JSON criteria on `Vacancy`, Zod-bound PATCH pattern, expandable “Criteria” section on `bewerken/client.tsx`, and explicit Save button UX — replicate for Scorecard independence from content autosave.
- **Story 4.x scoped reviewer view** (`4-4-reviewer-scoped-view.md`): Right-panel scorecard is placeholder until Story 5.2 plugs in form; confirm payload shape aligns with persisted `Vacancy.scorecardCriteria` ordering.
- **Content blocks** (`content-block-editor.tsx`): Use `@dnd-kit/sortable` as reference DnD implementation for ordering rows vs pipeline drag for cards (`pipeline-kanban.tsx` handles heavier drag surfaces).

### i18n keys (proposed namespace)

Namespace `recruitment.scorecard`:

- `.tabTitle`, `.sectionDescription`
- `.criterion.name`, `.criterion.descriptionHint`, `.criterion.weight`
- `.addCriterion`, `.removeCriterion`, `.save`, `.saving`, `.saved`, `.saveError`
- `.reorderHandleAria`
- `.warningExistingEvaluations` — translation must preserve legal/HR clarity: unchanged meaning of English reference string.

### Performance

- Cap scorecard criteria count similarly to dealbreakers (suggest ≤ 20 validation in Zod).
- PATCH payloads remain small JSON arrays; skip heavy joins beyond `_count.evaluations`.
- Prefer single GET for edit page (already fetched vacancy) rather than auxiliary round-trip.

### UX specifications

- **Layout:** Dedicated Scorecard panel with vertical list rows; alignment with Greenhouse-inspired structured prompts (criteria label + guidance body + reviewer rating affordance deferred to 5.2).
- **Weight:** Discrete 1–5 importance (not percentages on this surface); optionally show textual labels ("Low"→"Critical") mapped in i18n.
- **Drag handles:** Visible affordance (`GripVertical`-style icon pattern used elsewhere); entire row draggable only when handle focused or handle-only drag pattern for accessibility parity with sortable lists.
- **Empty state:** Short helper text explaining reviewers will rate each criterion once sharing is configured.
- **Reviewer preview:** Optional read-only collapsible snippet is **not** required in 5.1 if it duplicates 5.2 work — keep recruiter UI focused.

## References

- Epics & AC source: `_bmad-output/planning-artifacts/epics.md` — Epic 5, Story 5.1
- Architecture RBAC matrix & Evaluation model: `_bmad-output/planning-artifacts/architecture.md` (Recruitment RBAC Permission Matrix; Scoped View Write Architecture; Evaluation JSON pattern)
- Retrospective (RBAC Impact template): `_bmad-output/implementation-artifacts/epic-3-4-retro-2026-05-16.md`
- Patterns: `_bmad-output/implementation-artifacts/1-5-dealbreakers-nice-to-have-configuration.md`, `components/recruitment/vacancy/content-block-editor.tsx`, `_bmad-output/planning-artifacts/ux-design-specification.md` (structured scorecards / reviewer flow)
- Planned consumer: `_bmad-output/implementation-artifacts/5-2-scorecard-evaluation-form.md` (not authored here)
