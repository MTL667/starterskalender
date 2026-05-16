# Story 7.3: Automated Data Deletion

Status: ready-for-dev

> Epic: 7 — Compliance & Data Lifecycle
> Generated: 2026-05-16
> Depends on: Story 7.1 (retentionExpiresAt), Story 7.2 (notification sent)

## Story

As a system,
I want to automatically delete candidate data after the retention period,
So that GDPR compliance is maintained without manual intervention.

## Acceptance Criteria

**AC1:** Given a candidate's retention period has expired and no consent renewal occurred,
When the daily retention job runs,
Then the candidate record is soft-deleted (status: "RETENTION_EXPIRED", data still in DB but inaccessible),
And the candidate disappears from all pipeline views and search results.

**AC2:** Given a candidate has been soft-deleted for the configured grace period,
When the daily cleanup job runs,
Then all candidate personal data is permanently deleted (hard-delete): name, email, phone, CV, motivation, scores, comments,
And associated CandidateShare records are deleted.

**AC3:** Given a candidate's data is hard-deleted,
When the deletion completes,
Then audit log entries for this candidate REMAIN (audit outlives data),
And the audit records reference the candidate by anonymized ID only,
And pipeline statistics retain anonymized counts (for funnel metrics).

**AC4:** Given a headhunter tries to access a soft-deleted candidate,
When they follow an old link,
Then they see: "This candidate's data has been removed per retention policy".

## Tasks

- [ ] Task 1: Add RETENTION_EXPIRED to CandidateStatus enum
  - [ ] 1.1 Extend CandidateStatus enum with RETENTION_EXPIRED
  - [ ] 1.2 Run db push

- [ ] Task 2: Soft-delete cron (retention expired)
  - [ ] 2.1 Create `app/api/recruitment/cron/retention-expire/route.ts`
  - [ ] 2.2 Find candidates where retentionExpiresAt <= now AND status != RETENTION_EXPIRED AND deletedAt is null
  - [ ] 2.3 Set status = RETENTION_EXPIRED, deletedAt = now
  - [ ] 2.4 Audit log "CANDIDATE_RETENTION_EXPIRED"

- [ ] Task 3: Hard-delete cron (grace period elapsed)
  - [ ] 3.1 Create `app/api/recruitment/cron/retention-purge/route.ts`
  - [ ] 3.2 Find candidates where deletedAt is not null AND deletedAt + graceDays <= now
  - [ ] 3.3 Anonymize audit entries (replace candidateId target with "anon-{hash}")
  - [ ] 3.4 Delete: CandidateComment, CandidateShare, Evaluation, CandidateApplication, LinkedEmail, then Candidate
  - [ ] 3.5 Audit log "CANDIDATE_DATA_PURGED" with anonymized reference

- [ ] Task 4: Filter soft-deleted candidates from views
  - [ ] 4.1 Verify all existing queries use `deletedAt: null` filter (they do)

- [ ] Task 5: i18n keys
  - [ ] 5.1 Add retention-related status messages

## Dev Notes

### Existing Infrastructure
- **Candidate.deletedAt**: Already exists, already filtered in queries
- **Cascade deletes**: Comments, LinkedEmails already cascade
- **CandidateShare/Evaluation**: Need explicit delete before candidate

### Key Constraints
- Audit logs MUST survive candidate deletion
- Anonymize audit target before deleting candidate
- Hard-delete must be thorough — no PII remnants
