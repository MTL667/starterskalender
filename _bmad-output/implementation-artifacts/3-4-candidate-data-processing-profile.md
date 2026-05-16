# Story 3.4: Candidate Data Processing & Profile

> Status: done
> Epic: 3 — Public Presence & Candidate Application
> Story: 3.4 — candidate-data-processing-profile
> Generated: 2026-05-15

## Story

As a headhunter,
I want to view a complete candidate profile with all submitted data,
so that I can assess the candidate's full application in one place.

## Acceptance Criteria

**AC1:** Given a candidate has applied and verified their email, When I navigate to their profile (via pipeline card click), Then I see a dialog overlay on the pipeline page (URL updates with query param `?candidate=<id>` per UX-DR21), And the profile shows tabs: Overview (personal data, source, applied date), CV (embedded viewer or download link), Motivation (if provided), Timeline (all stage transitions).

**AC2:** Given I view a candidate profile, When the data loads, Then all personal data is stored with processing basis "legitimate interest: recruitment" (GDPR per FR13), And the processing basis is visible in the profile footer.

**AC3:** Given I have `candidate:read` permission for the candidate's entity, When I access their profile, Then I see all submitted fields, And an audit log entry is created recording my access (actor, timestamp, fields viewed).

**AC4:** Given a candidate applied via the public form, When their CV was uploaded, Then the CV is stored in SharePoint under `/Recruitment/{Entity}/{Function}/{Candidate}/` (AR5), And I can download or preview it from the profile.

## Tasks / Subtasks

- [x] Task 1: Create candidate detail API endpoint (AC: 1,3)
  - [x] 1.1 Create `app/api/recruitment/candidates/[id]/route.ts` with GET handler
  - [x] 1.2 Require `recruitment:read` permission + entity scope
  - [x] 1.3 Include `application`, `vacancy`, `stage`, `createdBy` relations
  - [x] 1.4 Create audit log entry for `CANDIDATE_VIEWED` action
  - [x] 1.5 Add stage transition history (via AuditLog query for `CANDIDATE_STAGE_MOVE` on this candidate)

- [x] Task 2: Create candidate CV download/proxy endpoint (AC: 4)
  - [x] 2.1 Create `app/api/recruitment/candidates/[id]/documents/route.ts` with GET handler
  - [x] 2.2 Proxy SharePoint document via Graph API using stored `cvDriveId`/`cvItemId`
  - [x] 2.3 Require `recruitment:read` permission + entity scope
  - [x] 2.4 Audit log entry for `CANDIDATE_DOCUMENT_ACCESSED`

- [x] Task 3: Expand CandidateDetailDialog into full tabbed profile (AC: 1,2)
  - [x] 3.1 Replace stub dialog with full shadcn Tabs (Overview, CV, Motivation, Timeline)
  - [x] 3.2 Fetch candidate detail from new API on dialog open
  - [x] 3.3 Overview tab: personal data (name, email, phone), source, applied date, verification status, stage
  - [x] 3.4 CV tab: embedded PDF viewer (iframe for PDFs) or download link for DOCX
  - [x] 3.5 Motivation tab: rendered motivation text (or empty state if none provided)
  - [x] 3.6 Timeline tab: stage transition history with actor, timestamp, from/to stage
  - [x] 3.7 GDPR footer: processing basis text visible at bottom of dialog
  - [x] 3.8 Loading state with spinner while fetching

- [x] Task 4: Pipeline integration — click-to-open + URL sync (AC: 1)
  - [x] 4.1 Add click handler on DraggableCandidateCard to open detail dialog (distinguish from drag)
  - [x] 4.2 Sync `?candidate=<id>` query param with dialog open/close state
  - [x] 4.3 Support deep linking: if page loads with `?candidate=<id>`, auto-open dialog
  - [x] 4.4 Preserve focus restoration on dialog close (existing pattern)

- [x] Task 5: i18n keys + audit action types (AC: 1,2,3)
  - [x] 5.1 Add profile-related i18n keys to `messages/nl.json` and `messages/fr.json`
  - [x] 5.2 Extend `AuditAction` type in `lib/audit.ts` with `CANDIDATE_VIEWED` and `CANDIDATE_DOCUMENT_ACCESSED`

## Dev Notes

### Architecture Decisions

**Dialog overlay pattern (UX-DR21):** Candidate detail opens as a Radix Dialog overlay on the pipeline page. The pipeline stays visible behind the dialog backdrop. URL updates with `?candidate=<id>` query param for deep linking. Dialog close removes the query param and restores focus to the source card.

**Existing dialog shell:** `components/recruitment/pipeline/candidate-detail-dialog.tsx` already exists as a stub with the correct Dialog structure, focus restoration, and Kanban wiring. **Extend this file in-place** rather than creating a new component. The dialog already receives `PipelineCandidateItem` from Kanban — add a full-data fetch on open for the rich profile.

**StarterDialog pattern reference:** The UX spec requires following the `StarterDialog` pattern (tabbed complex dialog). However, `StarterDialog` does NOT use shadcn Tabs — it's a single large dialog with sections. For Story 3.4, use **shadcn Tabs** (`components/ui/tabs.tsx`) inside the dialog, which is the recommended approach per UX spec ("Tabs for candidate detail dialog").

**Data fetching on open:** The Kanban only loads `PipelineCandidateItem` (lightweight: id, names, email, source, stage, scores). The profile dialog needs full data (application, CV, motivation, timeline). Fetch `GET /api/recruitment/candidates/[id]` when dialog opens. Show skeleton loader while loading.

**CV viewer approach:** For PDF files, render an `<iframe>` pointing to the document proxy endpoint. For DOCX files, show a download link (no in-browser DOCX rendering — too complex for MVP). The proxy endpoint streams the file from SharePoint via Graph API, enforcing RBAC before serving content.

**Timeline data:** Stage transitions are already audit-logged as `CANDIDATE_STAGE_MOVE` in `lib/audit.ts` via `pipeline-engine.ts`. Query the `AuditLog` table for `action = 'CANDIDATE_STAGE_MOVE'` and `target = candidateId` to build the timeline. Include the actor (who moved), timestamp, and stage names from `meta` JSON.

### Schema Changes

**No Prisma schema changes needed.** All required models exist:
- `Candidate` — with `application`, `vacancy`, `stage` relations
- `CandidateApplication` — has `cvDriveId`, `cvItemId`, `cvFileName`, `motivation`
- `AuditLog` — already captures `CANDIDATE_STAGE_MOVE`

Only code-level additions:
- Extend `AuditAction` type with `CANDIDATE_VIEWED` and `CANDIDATE_DOCUMENT_ACCESSED`

### File Structure

**New files:**
- `app/api/recruitment/candidates/[id]/route.ts` — GET detail endpoint
- `app/api/recruitment/candidates/[id]/documents/route.ts` — CV proxy endpoint

**Modified files:**
- `components/recruitment/pipeline/candidate-detail-dialog.tsx` — expand from stub to full tabbed profile
- `components/recruitment/pipeline/pipeline-kanban.tsx` — add click-to-open + URL sync
- `components/recruitment/pipeline/draggable-candidate-card.tsx` — add click handler (distinguish from drag)
- `lib/audit.ts` — add `CANDIDATE_VIEWED` and `CANDIDATE_DOCUMENT_ACCESSED` to `AuditAction`
- `messages/nl.json` — add profile i18n keys
- `messages/fr.json` — add profile i18n keys

### RBAC

- **`candidate:read`** (or `recruitment:read`): Required for viewing profile and downloading CV
- Entity scope: candidate's vacancy must belong to an entity the user has access to
- Follow same pattern as `app/api/recruitment/vacancies/[id]/candidates/route.ts` GET handler

### Anti-Patterns to Avoid

1. **DO NOT** create a new component file for the profile dialog — extend the existing `candidate-detail-dialog.tsx`
2. **DO NOT** load full candidate data in the Kanban list query — fetch on dialog open only (performance)
3. **DO NOT** build a DOCX viewer — download link is sufficient for MVP
4. **DO NOT** use `window.history.pushState` directly — use Next.js `useSearchParams` + `useRouter` for query param management
5. **DO NOT** skip audit logging — every profile view MUST be logged (GDPR requirement)
6. **DO NOT** inline field masking — use shared utility patterns (though field-level masking is Epic 4, not this story)

### Previous Story Intelligence

**From Story 3.3 review findings:**
- `CandidateStatus` enum exists with `PENDING_VERIFICATION` / `ACTIVE` — detail API should only return `ACTIVE` candidates (consistent with pipeline list)
- `CandidateApplication` stores `cvDriveId`, `cvItemId`, `cvFileName`, `motivation`
- `uploadCandidateCV` in `lib/recruitment/sharepoint-documents.ts` stores CVs at path `Recruitment/{Entity}/{Vacancy}/Applications/{Email}/{fileName}`
- HTML escaping pattern from email template (`escapeHtml`) — reuse if rendering user content
- Transaction pattern from apply route — reference for consistency

**From Story 3.2 review findings:**
- Public photo proxy pattern in `app/api/public/vacancies/[id]/photo/route.ts` — reference for CV proxy endpoint
- SharePoint Graph API streaming pattern — reuse for document download

**From pipeline-kanban.tsx existing patterns:**
- `detailCandidate` state + `detailOpenerRef` for focus restoration — keep and extend
- Enter-to-open on keyboard (line ~299) — add mouse click-to-open
- `CandidateDetailDialog` mounted at bottom of Kanban (line ~592) — keep in place
- **Known gap:** No mouse click-to-open handler on `DraggableCandidateCard` — only keyboard Enter opens dialog

### i18n Keys

Add to `recruitment` namespace in both `nl.json` and `fr.json`:

```
"profile": {
  "title": "Kandidaat profiel" / "Profil du candidat",
  "tabOverview": "Overzicht" / "Aperçu",
  "tabCv": "CV",
  "tabMotivation": "Motivatie" / "Motivation",
  "tabTimeline": "Tijdlijn" / "Chronologie",
  "personalData": "Persoonlijke gegevens" / "Données personnelles",
  "email": "E-mailadres" / "Adresse e-mail",
  "phone": "Telefoonnummer" / "Numéro de téléphone",
  "source": "Bron" / "Source",
  "appliedAt": "Gesolliciteerd op" / "Postulé le",
  "verifiedAt": "Geverifieerd op" / "Vérifié le",
  "stage": "Fase" / "Étape",
  "noMotivation": "Geen motivatie opgegeven" / "Aucune motivation fournie",
  "noCv": "Geen CV beschikbaar" / "Aucun CV disponible",
  "downloadCv": "CV downloaden" / "Télécharger le CV",
  "previewCv": "CV bekijken" / "Voir le CV",
  "processingBasis": "Verwerkingsgrondslag: gerechtvaardigd belang (werving)" / "Base de traitement: intérêt légitime (recrutement)",
  "timelineEmpty": "Nog geen acties geregistreerd" / "Aucune action enregistrée",
  "timelineMoved": "{actor} verplaatste naar {stage}" / "{actor} déplacé vers {stage}",
  "timelineCreated": "Kandidaat aangemaakt" / "Candidat créé",
  "loading": "Profiel laden..." / "Chargement du profil..."
}
```

### SEO

Not applicable — candidate profile is an authenticated internal dialog, not a public page. No metadata generation needed.

### Performance

- **NFR5:** Candidate profile load (full) < 1 second
- Fetch detail data only when dialog opens (not on list load)
- Single API call for candidate + application + timeline data
- CV proxy streams from SharePoint — do not buffer full file in memory
- Timeline query uses existing `AuditLog` index on `target` field
- Consider `React.lazy` for tab content if dialog gets heavy (defer to review)

### UX

**Dialog layout:** Full-width Radix Dialog with `max-w-2xl` (matching UX spec "Candidate detail: Full-width dialog with tabs, p-6 content padding, gap-4 between sections").

**Tab navigation:** shadcn Tabs component with underline style. 4 tabs: Overview, CV, Motivation, Timeline. Active tab highlighted with entity color if possible.

**Overview tab layout:**
- Header: name + entity badge + stage badge
- Personal data: email, phone (if available), source, applied date, verified date
- Section dividers between groups

**CV tab layout:**
- PDF: embedded `<iframe>` with full height (min 500px)
- DOCX: centered download card with file name, size, and download button
- No CV: empty state with message

**Motivation tab layout:**
- Rendered text in readable paragraph format
- Empty state if no motivation was provided

**Timeline tab layout:**
- Vertical timeline with dots and connecting line
- Each entry: timestamp, actor name, action description
- Most recent first

**GDPR footer:**
- Small text at bottom of dialog: processing basis statement
- Visible on all tabs

**Loading state:**
- Skeleton loader matching dialog layout (header + tabs outline + content placeholder)

**Click vs drag on cards:**
- Mouse click on card body opens profile dialog
- Drag starts on pointer move (dnd-kit handles this — `activationConstraint.distance` threshold)
- Existing dnd-kit `useSortable` pointer sensor uses distance constraint; click fires if no movement

**Colors:**
- Entity color badge in header
- Stage badge with appropriate color
- Score ring from existing component

**Touch targets:**
- Tab buttons: min 44px height
- Download/close buttons: min 44px touch target

### Review Findings

- [x] [Review][Patch] P1 — Race condition: fetchDetail lacks AbortController; rapid candidate switches can show wrong profile [candidate-detail-dialog.tsx] — fixed: AbortController + stale response guard
- [x] [Review][Patch] P2 — Deep-link handling: deepLinkHandled ref never resets; invalid/missing candidate not handled; URL ?candidate= dangling [pipeline-kanban.tsx] — fixed: replaced one-shot ref with lastHandledParam tracking, cleans up invalid URLs
- [x] [Review][Patch] P3 — Applied date uses detail.createdAt instead of detail.application?.appliedAt [candidate-detail-dialog.tsx] — fixed: uses application.appliedAt with createdAt fallback
- [x] [Review][Patch] P4 — Missing json.data validation after fetch — empty body yields blank dialog [candidate-detail-dialog.tsx] — fixed: guard on !json?.data
- [x] [Review][Patch] P5 — Await createAuditLog in both API routes (fire-and-forget can lose compliance logs) [candidates/[id]/route.ts, documents/route.ts] — fixed: await in both routes
- [x] [Review][Patch] P6 — Timeline query includes generic CREATE action — filter to CANDIDATE_STAGE_MOVE only [candidates/[id]/route.ts] — fixed: removed CREATE from filter
- [x] [Review][Patch] P7 — i18n gaps: hardcoded "Retry" label + missing profile.retry and profile.title keys [candidate-detail-dialog.tsx, nl.json, fr.json] — fixed: added retry, title, pendingVerification, cvPreviewFailed keys
- [x] [Review][Patch] P8 — PDF iframe has no error/fallback handling — silent blank on SharePoint failure [candidate-detail-dialog.tsx] — fixed: onError + fallback download card
- [x] [Review][Patch] P9 — Source translation: missing fallback for unknown CandidateSource enum values crashes lookup [candidate-detail-dialog.tsx] — fixed: safeSourceLabel with allowlist
- [x] [Review][Patch] P10 — Document access audit logged before download succeeds — log after buffer returned [documents/route.ts] — fixed: audit moved after downloadDocument
- [x] [Review][Patch] P11 — Verification status not surfaced in Overview tab (AC4 / spec Task 3.3) [candidate-detail-dialog.tsx] — fixed: shows verified/pending with icon
- [x] [Review][Patch] P12 — GDPR processing basis footer hidden during loading/error states — should always be visible [candidate-detail-dialog.tsx] — fixed: moved outside conditional block
- [x] [Review][Patch] P13 — Touch targets below 44px minimum: tab triggers (h-10 = 40px) and download button (size="sm") [candidate-detail-dialog.tsx] — fixed: min-h-[44px] on tabs and buttons
- [x] [Review][Defer] W1 — CV proxy buffers entire file in memory [documents/route.ts] — deferred, requires shared lib refactor
- [x] [Review][Defer] W2 — Auth errors detected via message substring [candidates/[id]/route.ts, documents/route.ts] — deferred, pre-existing pattern
- [x] [Review][Defer] W3 — SSE updates not reflected in open dialog [pipeline-kanban.tsx] — deferred, broader SSE system concern
- [x] [Review][Defer] W4 — NaN from non-numeric filter inputs [pipeline-kanban.tsx:~262] — deferred, pre-existing
- [x] [Review][Defer] W5 — Skeleton loader vs spinner — no Skeleton component available [candidate-detail-dialog.tsx] — deferred, documented dev decision
- [x] [Review][Defer] W6 — DOCX download card lacks file size [candidate-detail-dialog.tsx] — deferred, needs extra Graph API call
- [x] [Review][Defer] W7 — Tab pill vs underline style [candidate-detail-dialog.tsx] — deferred, cosmetic
- [x] [Review][Defer] W8 — Date locale forced to nl-BE [candidate-detail-dialog.tsx] — deferred, broader i18n concern
- [x] [Review][Defer] W9 — Graph error type narrowing via message substring [documents/route.ts] — deferred, pre-existing pattern

## References

- Architecture: `architecture.md` → Data Architecture (field-level access, document storage), Structure Patterns (route organization, candidate components), Process Patterns (audit logging, field masking)
- UX: `ux-design-specification.md` → Navigation Patterns (dialog overlay + query param), Spacing (p-6 content, gap-4), Component spec (StarterDialog tabs pattern)
- PRD: FR13 (GDPR processing basis), FR14 (complete candidate profile), FR34 (audit logging), NFR5 (<1s profile load)
- Epics: Story 3.4 acceptance criteria, UX-DR21 (navigation patterns)
- Previous stories: `3-3-one-click-application-form.md` (CV upload patterns, CandidateApplication model), `3-2-public-vacancy-detail-page.md` (SharePoint proxy pattern)
- Existing code: `candidate-detail-dialog.tsx` (stub to extend), `pipeline-kanban.tsx` (dialog wiring + focus restore), `lib/audit.ts` (audit pattern), `lib/recruitment/sharepoint-documents.ts` (Graph API patterns)
