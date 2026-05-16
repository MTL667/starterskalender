# Story 4.4: Reviewer Scoped View

> Status: review
> Epic: 4 — Collaboration & Scoped Sharing
> Generated: 2026-05-16
> Depends on: Story 4.1 (CandidateShare model, field-mask utility, share API)

## Story

As a technical reviewer,
I want to see only the data that was shared with me plus an evaluation form,
so that I can quickly assess the candidate without irrelevant information.

## Acceptance Criteria

**AC1:** Given I have a CandidateShare record for a candidate, When I click the notification link or navigate to the shared candidate, Then I see a scoped view showing ONLY the fields in my `visibleFields[]` array, And the view feels complete and purposeful (not like a restricted version of the full profile), And the page loads in under 2 seconds.

**AC2:** Given I am viewing a scoped candidate view, When the data is served, Then the `maskCandidateForViewer` utility filters all fields at the server layer before response, And non-visible fields are never sent to the client (not hidden via CSS — actually omitted from API response).

**AC3:** Given I am viewing a scoped candidate view, When I look at the interface, Then I see: shared candidate fields in a clean card layout, and the evaluation/scorecard form (if configured), And no navigation to other candidates or pipeline views is available, And the view clearly shows who shared this with me and when.

**AC4:** Given my share has expired (past expiresAt) or been revoked, When I try to access the scoped view, Then I see: "This access has expired. Contact the recruiter for renewed access.", And no candidate data is shown.

## Tasks / Subtasks

- [ ] Task 1: Scoped view API endpoint (AC: 1,2,4)
  - [ ] 1.1 Create `app/api/recruitment/shared/[token]/route.ts` — GET scoped candidate data
  - [ ] 1.2 Look up CandidateShare by token
  - [ ] 1.3 Validate: share not revoked (revokedAt IS NULL), not expired (expiresAt > now OR null)
  - [ ] 1.4 Apply `maskCandidateForViewer(candidate, share.visibleFields)` before response
  - [ ] 1.5 Return 410 Gone with message if share expired/revoked
  - [ ] 1.6 Include share metadata: sharedBy name, sharedAt date, expiresAt

- [ ] Task 2: Scoped view page (AC: 1,3)
  - [ ] 2.1 Create `app/(authenticated)/recruitment/shared/[token]/page.tsx` — server component
  - [ ] 2.2 Validate current user matches `sharedWithUserId`
  - [ ] 2.3 Render clean card layout with only visible fields
  - [ ] 2.4 Show "Shared by [name] on [date]" attribution at top
  - [ ] 2.5 No sidebar navigation, no pipeline links — standalone focused view

- [ ] Task 3: Candidate scoped card component (AC: 3)
  - [ ] 3.1 Create `components/recruitment/share/candidate-scoped-card.tsx`
  - [ ] 3.2 Render personal fields (if visible): name, email, phone
  - [ ] 3.3 Render professional fields (if visible): source, scores, stage
  - [ ] 3.4 Render documents (if visible): CV iframe/download link, motivation text
  - [ ] 3.5 Gracefully handle missing fields — only render sections that have visible data

- [ ] Task 4: Expired/revoked state (AC: 4)
  - [ ] 4.1 Show full-page message: "This access has expired. Contact the recruiter for renewed access."
  - [ ] 4.2 No candidate data leaked in expired state — not even the name

- [ ] Task 5: Audit logging (AC: 2)
  - [ ] 5.1 Log `CANDIDATE_VIEWED` with metadata `{ mechanism: 'share-link', shareId, fields: visibleFields }` on every scoped view access

- [ ] Task 6: Notification link (AC: 1)
  - [ ] 6.1 Ensure the notification created in Story 4.1 has `linkUrl: /recruitment/shared/[token]`
  - [ ] 6.2 Clicking notification navigates directly to scoped view

- [ ] Task 7: i18n keys (AC: 1,3,4)
  - [ ] 7.1 Add scoped view keys to `messages/nl.json` and `messages/fr.json`

## Dev Notes

### Architecture

The reviewer view is a standalone page, not a dialog. It has its own route (`/recruitment/shared/[token]`) to keep it isolated from the pipeline context. The token in the URL is the unique share token — not a candidateId.

**Critical security principle:** The API endpoint calls `maskCandidateForViewer()` on the server. Non-visible fields are NEVER sent to the client — they are omitted from the API response, not hidden with CSS.

### Two-Column Layout (Desktop)

From UX spec (Experience Mechanic 3 — Reviewer Evaluation Flow):

```
┌─────────────────┐  ┌──────────────────────┐
│  CV Summary      │  │  Scorecard           │
│  [rendered CV]   │  │  (Story 5.x)         │
│                  │  │                      │
│  Skills          │  │                      │
│  • Infrastructure│  │                      │
│  • Team mgmt     │  │                      │
│                  │  │                      │
└─────────────────┘  └──────────────────────┘
```

Left panel: shared candidate data. Right panel: scorecard form (placeholder for now — Story 5.x will add the actual evaluation form). On mobile: stacked layout.

### Token-Based Access

The share token is the access key. The reviewer MUST also be authenticated (session check) AND match `sharedWithUserId`. This provides double security: possession of token + authenticated as the correct user.

### CV Document Access

If `cv` is in `visibleFields`, render the CV using the same pattern as `candidate-detail-dialog.tsx`:
- PDF: iframe with document proxy endpoint
- DOCX: download link
- The document proxy endpoint (`/api/recruitment/candidates/[id]/documents`) will need to accept share-token-based auth in addition to direct RBAC

### Existing Patterns

- **Audit:** `createAuditLog({ action: 'CANDIDATE_VIEWED', actorId, target: candidateId, meta: { mechanism: 'share-link', shareId } })`
- **Document proxy:** `app/api/recruitment/candidates/[id]/documents/route.ts` — may need extension for share-token auth
- **Notification linkUrl:** Set in Story 4.1 notification creation

### Anti-Patterns to Avoid

1. **DO NOT** send all candidate data and hide fields with CSS — omit non-visible fields from API response
2. **DO NOT** show navigation to other candidates or pipeline — this is a focused micro-experience
3. **DO NOT** allow access without authentication — token alone is not enough
4. **DO NOT** show "restricted view" language — the view should feel complete and purposeful
5. **DO NOT** build the scorecard form — that's Story 5.x; show a placeholder panel

## References

- Epics: Story 4.4 ACs
- UX: Experience Mechanic 3 (Reviewer Evaluation Flow), scoped view layout, "zero navigation decisions"
- Architecture: `maskCandidateForViewer()`, token-based share access, document proxy
- Depends: Story 4.1 (CandidateShare model, field-mask utility)
