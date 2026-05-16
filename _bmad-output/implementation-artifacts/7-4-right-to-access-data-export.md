# Story 7.4: Right to Access (Data Export)

Status: ready-for-dev

> Epic: 7 — Compliance & Data Lifecycle
> Generated: 2026-05-16
> Depends on: Candidate model, CandidateApplication, existing audit system

## Story

As a candidate,
I want to request an export of all my stored personal data,
So that I can exercise my GDPR right to access.

## Acceptance Criteria

**AC1:** Given I am a candidate with an active record,
When I access my candidate portal (token-based link),
Then I see a "Request my data" button.

**AC2:** Given I click "Request my data",
When the system processes the request,
Then a JSON file is generated containing: all personal fields, application history, stage transitions, and evaluation scores visible to me,
And I receive an email with a time-limited download link (expires in 48 hours).

**AC3:** Given a headhunter or admin receives a data access request via other channels,
When they locate the candidate,
Then they can trigger the same export from the admin view,
And an audit log records "data:exported" with the requesting mechanism.

**AC4:** Given the export is generated,
When it completes,
Then an audit entry records: action "CANDIDATE_DATA_EXPORTED", timestamp, mechanism (self-service or admin-triggered).

## Tasks

- [ ] Task 1: Data export service
  - [ ] 1.1 Create `lib/recruitment/data-export.ts` with `generateCandidateExport(candidateId)` function
  - [ ] 1.2 Collect: personal fields, application data, stage history (from audit logs), evaluation scores
  - [ ] 1.3 Return JSON object with all data

- [ ] Task 2: Export API endpoint
  - [ ] 2.1 Create `app/api/recruitment/candidates/[id]/export/route.ts` — POST
  - [ ] 2.2 Generate export, store as downloadable (temp file or signed URL pattern)
  - [ ] 2.3 Send email to candidate with time-limited download link
  - [ ] 2.4 Audit log "CANDIDATE_DATA_EXPORTED"

- [ ] Task 3: Public export request (self-service)
  - [ ] 3.1 Create `app/api/public/candidate/export/route.ts` — POST with verificationToken
  - [ ] 3.2 Validate token, trigger export

- [ ] Task 4: Admin export trigger
  - [ ] 4.1 Add "Export data" button to candidate detail dialog
  - [ ] 4.2 Calls export API with `mechanism: 'admin'`

- [ ] Task 5: Download endpoint
  - [ ] 5.1 Create `app/api/public/candidate/export/download/route.ts` — GET with token
  - [ ] 5.2 Return JSON as downloadable file
  - [ ] 5.3 Add `DataExportRequest` model for tracking: candidateId, token, expiresAt, downloadedAt

- [ ] Task 6: i18n keys + audit action
  - [ ] 6.1 Add CANDIDATE_DATA_EXPORTED to audit actions
  - [ ] 6.2 Add i18n keys

## Dev Notes

### Existing Infrastructure
- **Audit logs**: Already track candidate operations
- **Candidate portal**: Token-based access exists
- **sendEmail()**: For delivery link

### Key Constraints
- Export link expires in 48 hours
- Export includes ALL PII — treat the link as sensitive
- JSON format (no ZIP needed if no file attachments in scope)
