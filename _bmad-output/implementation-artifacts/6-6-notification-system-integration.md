# Story 6.6: Notification System Integration

Status: ready-for-dev

> Epic: 6 — Communication & Notifications
> Generated: 2026-05-16
> Depends on: Story 4.1 (CandidateShare model), Story 5.2 (Evaluation submission), existing Notification model + notification-bell component

## Story

As a reviewer or headhunter,
I want to receive Airport notifications for share requests and completed evaluations,
So that I know when action is needed without checking the recruitment module.

## Acceptance Criteria

**AC1:** Given a headhunter shares a candidate with me,
When the share is created,
Then I receive an Airport notification: "[Sharer] shared a candidate for review: [Candidate Name] for [Vacancy Title]",
And the notification links directly to the scoped candidate view.

**AC2:** Given a reviewer submits an evaluation,
When the evaluation is saved,
Then the headhunter who created the share receives a notification: "[Reviewer Name] submitted their review for [Candidate Name]",
And the notification links to the candidate's evaluation summary.

**AC3:** Given a share is about to expire (24h before),
When the expiration check runs,
Then the reviewer receives a reminder notification: "Your access to [Candidate Name] expires tomorrow".

**AC4:** Given I receive a notification,
When I click it,
Then I am taken directly to the relevant view (scoped candidate view or evaluation summary),
And the notification is marked as read.

## Tasks / Subtasks

- [ ] Task 1: Create notification on share creation (AC: 1)
  - [ ] 1.1 In the existing share creation endpoint, after successful CandidateShare create: create a Notification for the reviewer
  - [ ] 1.2 Notification type: `RECRUITMENT_SHARE_RECEIVED`, title with sharer name + candidate info
  - [ ] 1.3 linkUrl: `/recruitment/shared/{token}` (the reviewer's scoped view)
  - [ ] 1.4 Emit SSE `notification:new` event for the reviewer

- [ ] Task 2: Create notification on evaluation submission (AC: 2)
  - [ ] 2.1 In `app/api/recruitment/shared/[token]/evaluate/route.ts`, after evaluation create: create Notification for the share creator (headhunter)
  - [ ] 2.2 Notification type: `RECRUITMENT_EVALUATION_SUBMITTED`, with reviewer name + candidate info
  - [ ] 2.3 linkUrl: `/recruitment/vacatures/{vacancyId}` (pipeline view with candidate)

- [ ] Task 3: Expiration reminder check (AC: 3)
  - [ ] 3.1 Create utility function `checkExpiringShares()` that finds shares expiring within 24h that haven't been notified
  - [ ] 3.2 Add `expirationNotifiedAt DateTime?` field to CandidateShare model
  - [ ] 3.3 Create Notification for the reviewer with expiration warning
  - [ ] 3.4 Hook into existing cron/scheduled job pattern OR create API route callable via external cron

- [ ] Task 4: Notification click navigation (AC: 4)
  - [ ] 4.1 Verify existing notification-bell component handles linkUrl routing correctly
  - [ ] 4.2 Ensure notification marks as read on click (existing behavior)

- [ ] Task 5: Schema + i18n
  - [ ] 5.1 Add `expirationNotifiedAt DateTime?` to CandidateShare + db push
  - [ ] 5.2 Add notification type constants
  - [ ] 5.3 Add `recruitment.notifications.*` i18n keys

## Dev Notes

### Existing Infrastructure

- **Notification model**: `prisma/schema.prisma` — id, userId, type, title, message, linkUrl, isRead, createdAt
- **Notification bell**: `components/layout/notification-bell.tsx` — fetches unread notifications, marks read on click
- **SSE**: `notification:new` event already handled in sse-provider
- **Share creation**: `app/api/recruitment/candidates/[id]/share/route.ts`
- **Evaluation**: `app/api/recruitment/shared/[token]/evaluate/route.ts`

### Key Technical Constraints

- Notification creation is non-blocking (wrap in try/catch, don't fail the main operation)
- Expiration check needs scheduling — use existing cron pattern or Easypanel cron job
- linkUrl must be relative path (existing pattern in Notification model)
- `notification:new` SSE event already triggers notification bell update

### References

- [Source: prisma/schema.prisma#Notification]
- [Source: components/layout/notification-bell.tsx]
- [Source: app/api/recruitment/shared/[token]/evaluate/route.ts]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
