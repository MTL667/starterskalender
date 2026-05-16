# Story 4.5: Access Expiration & Auto-Revoke

> Status: review
> Epic: 4 — Collaboration & Scoped Sharing
> Generated: 2026-05-16
> Depends on: Story 4.1 (CandidateShare model), Story 4.4 (Scoped view)

## Story

As a headhunter,
I want shared access to expire automatically after evaluation or time limit,
so that candidate data exposure is minimized according to privacy principles.

## Acceptance Criteria

**AC1:** Given I share a candidate with temporary access (expiresAt set), When the expiration time passes, Then the reviewer can no longer access the candidate data, And the share status shows "Expired" in my share overview.

**AC2:** Given I share a candidate with "expire after evaluation" setting, When the reviewer submits their evaluation (scorecard), Then the share's `evaluationSubmittedAt` is recorded, And access automatically expires 24 hours after evaluation submission (grace period for re-review), And the reviewer sees "Thank you, your evaluation has been submitted" on subsequent visits.

**AC3:** Given I want to manually revoke access, When I click "Revoke" on an active share in the candidate profile, Then a destructive confirmation appears: "Revoke access for [Name]?", And on confirmation the share is revoked immediately, And toast "Access revoked" confirms.

**AC4:** Given I share with "permanent" access selected, When the share is created, Then no expiresAt is set, And access remains until manually revoked or candidate is deleted.

## Tasks / Subtasks

- [ ] Task 1: Expiration logic in scoped view API (AC: 1,2)
  - [ ] 1.1 Update `app/api/recruitment/shared/[token]/route.ts` to check expiration rules:
    - If `expiresAt` is set and past → return 410 expired
    - If `evaluationSubmittedAt` is set and > 24h ago → return 410 expired with "evaluation submitted" message
    - If `revokedAt` is set → return 410 revoked
  - [ ] 1.2 Return appropriate status messages for each expiration reason

- [ ] Task 2: Share status display (AC: 1)
  - [ ] 2.1 Create `components/recruitment/share/share-status-badge.tsx` — shows Active, Expired, Revoked, Evaluated
  - [ ] 2.2 Display in shares list (from GET share API)
  - [ ] 2.3 Show remaining time for time-limited shares ("Expires in 2 days")

- [ ] Task 3: Post-evaluation message (AC: 2)
  - [ ] 3.1 In scoped view page: if `evaluationSubmittedAt` is set but still within 24h grace period, show "Your evaluation was submitted. You can review until [date]."
  - [ ] 3.2 After grace period: show "Thank you, your evaluation has been submitted. Access has expired."

- [ ] Task 4: Manual revoke UI (AC: 3)
  - [ ] 4.1 Add "Revoke" button next to each active share in candidate profile shares tab
  - [ ] 4.2 Show destructive confirmation dialog: "Revoke access for [Name]? They will no longer be able to view this candidate."
  - [ ] 4.3 On confirm: call `DELETE /api/recruitment/candidates/[id]/share/[shareId]`
  - [ ] 4.4 Show success toast "Access revoked"
  - [ ] 4.5 Update share list to show "Revoked" status

- [ ] Task 5: Shares tab in candidate detail (AC: 1,3)
  - [ ] 5.1 Add "Shares" tab to `candidate-detail-dialog.tsx`
  - [ ] 5.2 List all shares for this candidate with: reviewer name, shared date, status badge, visible fields summary, revoke button
  - [ ] 5.3 Fetch from `GET /api/recruitment/candidates/[id]/share`

- [ ] Task 6: i18n keys (AC: 1,2,3)
  - [ ] 6.1 Add expiration and revoke keys to `messages/nl.json` and `messages/fr.json`

## Dev Notes

### Expiration Decision Tree

```
Is revokedAt set?
  → Yes: 410 "Access has been revoked"
  → No: continue

Is expiresAt set and past?
  → Yes: 410 "Access has expired"
  → No: continue

Is evaluationSubmittedAt set?
  → Yes, and > 24h ago: 410 "Evaluation submitted, access expired"
  → Yes, and ≤ 24h ago: Allow access, show grace period notice
  → No: continue

Allow access (active share)
```

### Status Badge Logic

| Condition | Badge | Color |
|-----------|-------|-------|
| `revokedAt` set | Revoked | Red |
| `expiresAt` past | Expired | Gray |
| `evaluationSubmittedAt` set, > 24h | Evaluated & Expired | Gray |
| `evaluationSubmittedAt` set, ≤ 24h | Evaluated (grace) | Amber |
| `expiresAt` set, future | Active (expires [date]) | Green |
| No expiration, no evaluation | Active | Green |

### Shares Tab in Candidate Detail

The candidate detail dialog (from Story 3.4) uses Tabs. Add a new "Shares" tab showing:
- Table of shares: Reviewer | Shared | Status | Fields | Actions
- "Revoke" button only on active shares
- Show evaluation score summary if evaluation was submitted

### Existing Patterns

- **Destructive confirmation:** Follow the same pattern as vacancy delete confirmation
- **Tab addition:** The candidate-detail-dialog uses `Tabs` from shadcn — add "Shares" tab after existing tabs
- **Badge:** Reuse existing Badge component with color variants

### Anti-Patterns to Avoid

1. **DO NOT** rely on a cron job for expiration — check at access time (lazy expiration)
2. **DO NOT** hard-delete expired shares — keep for audit trail
3. **DO NOT** allow revoke without confirmation — destructive action requires confirmation dialog
4. **DO NOT** show revoke button on already-revoked/expired shares

## References

- Epics: Story 4.5 ACs
- UX: Access duration selector (ShareDialog), share management, "Forgiveness → Undo and confirmation"
- Architecture: Lazy expiration checking, `evaluationSubmittedAt` + 24h grace period
- Depends: Story 4.1 (share model), Story 4.4 (scoped view page)
