# Story 6.7: O365 Mailbox Sync (Phase 2)

Status: ready-for-dev

> Epic: 6 — Communication & Notifications
> Generated: 2026-05-16
> Depends on: Existing Microsoft Graph API client (MSAL), Candidate model with email field, User model

## Story

As a headhunter,
I want emails to/from a candidate to be automatically linked to their profile,
So that all communication history is centralized without manual effort.

## Acceptance Criteria

**AC1:** Given O365 mailbox sync is enabled for my account,
When I send or receive an email matching a candidate's email address,
Then the email is linked to the candidate's profile in the "Emails" tab,
And the email shows: subject, date, direction (sent/received), and preview.

**AC2:** Given a linked email exists on a candidate profile,
When I click it,
Then I can view the full email content within the recruitment module.

**AC3:** Given sync is running,
When an email arrives from an unknown address,
Then it is not linked (only matches known candidate email addresses).

**AC4:** Given a candidate has multiple applications across vacancies,
When emails are synced,
Then they are linked to the most recent active vacancy for that candidate.

## Tasks / Subtasks

- [ ] Task 1: Create LinkedEmail model (AC: 1, 4)
  - [ ] 1.1 Add `LinkedEmail` to Prisma schema: id, candidateId, userId (headhunter), messageId (Graph API), subject, preview, sentAt, direction (SENT/RECEIVED), isPrivate, graphMessageId
  - [ ] 1.2 Relations: Candidate (cascade delete), User
  - [ ] 1.3 Unique constraint on [userId, graphMessageId]
  - [ ] 1.4 Run db push

- [ ] Task 2: Graph API email sync service (AC: 1, 3)
  - [ ] 2.1 Create `lib/recruitment/mailbox-sync.ts` — sync function that fetches recent emails for a user via Graph API
  - [ ] 2.2 Filter: match sender/recipient against known candidate email addresses
  - [ ] 2.3 For matches: create LinkedEmail records with metadata
  - [ ] 2.4 Track last sync timestamp per user (add `lastMailSyncAt DateTime?` to User or separate config)

- [ ] Task 3: Sync trigger mechanism (AC: 1)
  - [ ] 3.1 Create `app/api/recruitment/mailbox/sync/route.ts` — POST triggers sync for current user
  - [ ] 3.2 Background processing: sync runs async, returns immediately
  - [ ] 3.3 Optional: scheduled sync via cron for all users with sync enabled

- [ ] Task 4: Emails tab in candidate detail (AC: 1, 2)
  - [ ] 4.1 Add "Emails" tab to candidate detail dialog
  - [ ] 4.2 List linked emails: subject, date, direction badge (sent/received), preview snippet
  - [ ] 4.3 On click: fetch full email content from Graph API, display in dialog/panel

- [ ] Task 5: Multi-vacancy linking logic (AC: 4)
  - [ ] 5.1 When linking email to candidate with multiple vacancies: prefer most recent active (non-ARCHIVED) vacancy
  - [ ] 5.2 Store vacancyId on LinkedEmail for context

- [ ] Task 6: User settings + i18n
  - [ ] 6.1 Add "Enable mailbox sync" toggle in user profile/settings
  - [ ] 6.2 Add `recruitment.emails.*` i18n keys

## Dev Notes

### Existing Infrastructure

- **Graph API**: Existing MSAL client in the project for SharePoint operations
- **Candidate.email**: Already stored on candidate records
- **Microsoft Graph Mail API**: `GET /me/messages` with `$filter` on sender/recipient
- **Phase 2**: This is marked as Phase 2 — implement foundation, can defer full automation

### Key Technical Constraints

- Graph API requires delegated permissions: `Mail.Read` scope
- Email content should NOT be stored in DB (privacy) — only metadata + preview; full content fetched on demand from Graph
- Sync must handle pagination (Graph API returns max 50 per page)
- Rate limiting: Graph API throttles at 10,000 requests per 10 minutes per user

### References

- [Source: lib/graph-client.ts or similar] — existing MSAL setup
- [Source: prisma/schema.prisma#Candidate] — email field for matching

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
