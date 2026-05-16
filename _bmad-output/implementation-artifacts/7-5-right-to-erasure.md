# Story 7.5: Right to Erasure

Status: ready-for-dev

> Epic: 7 — Compliance & Data Lifecycle
> Generated: 2026-05-16
> Depends on: Story 7.3 (deletion machinery), Story 7.4 (portal pattern)

## Story

As a candidate,
I want to request deletion of all my data,
So that I can exercise my GDPR right to erasure.

## Acceptance Criteria

**AC1:** Given I am a candidate with an active record,
When I access my candidate portal,
Then I see a "Delete my data" button with explanation of what will be removed.

**AC2:** Given I click "Delete my data",
When I confirm the action (double confirmation),
Then the system initiates immediate soft-delete of my candidate record,
And I receive a confirmation email: "Your data deletion request has been processed",
And my data is queued for hard-delete (within configured grace period, max 30 days per GDPR).

**AC3:** Given a candidate is in an active recruitment process,
When they request erasure,
Then a notification is sent to the headhunter: "[Candidate] has requested data deletion",
And the deletion proceeds regardless.

**AC4:** Given the erasure completes,
When all personal data is removed,
Then audit logs retain an anonymized record,
And the candidate can no longer access the portal link.

## Tasks

- [ ] Task 1: Erasure request API (self-service)
  - [ ] 1.1 Create `app/api/public/candidate/erasure/route.ts` — POST with verificationToken
  - [ ] 1.2 Validate token, soft-delete candidate (status RETENTION_EXPIRED, deletedAt = now)
  - [ ] 1.3 Send confirmation email to candidate
  - [ ] 1.4 If candidate is in active pipeline: notify headhunter (creator or entity admins)
  - [ ] 1.5 Audit log "CANDIDATE_ERASURE_REQUESTED"

- [ ] Task 2: Admin-triggered erasure
  - [ ] 2.1 Add "Delete candidate data" button to candidate detail (admin only)
  - [ ] 2.2 Confirmation dialog with double-confirm pattern
  - [ ] 2.3 Call existing delete mechanism

- [ ] Task 3: Add CANDIDATE_ERASURE_REQUESTED audit action
  - [ ] 3.1 Add to audit action enum

- [ ] Task 4: i18n keys
  - [ ] 4.1 Add erasure confirmation messages

## Dev Notes

### Existing Infrastructure
- **Soft-delete**: Candidate.deletedAt + status
- **Hard-delete cron**: From Story 7.3 handles the actual purge
- **Notification pattern**: From Story 6.6

### Key Constraints
- Candidate right to erasure supersedes recruitment convenience
- Max 30 days to complete (GDPR requirement)
- Grace period allows admin to intervene if needed
