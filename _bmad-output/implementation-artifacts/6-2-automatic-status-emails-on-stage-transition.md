# Story 6.2: Automatic Status Emails on Stage Transition

Status: ready-for-dev

> Epic: 6 — Communication & Notifications
> Generated: 2026-05-16
> Depends on: Story 6.1 (RecruitmentEmailTemplate model + email-variables.ts + renderRecruitmentTemplate), Story 2.4 (drag-drop stage transitions + candidate-move-dialog.tsx), existing sendEmail() in lib/email.ts

## Story

As a headhunter,
I want the system to send status emails when candidates move between stages,
So that candidates stay informed without me manually writing updates.

## Acceptance Criteria

**AC1:** Given a pipeline stage has an email template configured and `triggersEmail: true`,
When a candidate is moved to that stage,
Then the system sends the configured email to the candidate's email address,
And variables are substituted with actual candidate/vacancy data,
And email delivery uses SendGrid with retry queue (failures logged, non-blocking).

**AC2:** Given I am moving a candidate to a stage with email trigger,
When the CandidateMoveDialog appears,
Then I see a toggle "Send status email" (default: on if template exists),
And I can toggle it off to suppress the email for this specific move.

**AC3:** Given I manually trigger an email,
When I click "Send email" from the candidate profile,
Then I can select from available stage templates,
And I can preview the email before sending,
And the email is sent immediately.

**AC4:** Given an email fails to send,
When the SendGrid API returns an error,
Then the stage transition still succeeds (email is non-blocking),
And the failed email is queued for retry (up to 3 attempts),
And an admin notification is generated after 3 failures.

## Tasks / Subtasks

- [ ] Task 1: Create status email sending service (AC: 1, 4)
  - [ ] 1.1 Create `lib/recruitment/status-emails.ts` with `sendStageTransitionEmail(candidateId, vacancyId, stageId, entityId)` function
  - [ ] 1.2 Lookup active `RecruitmentEmailTemplate` for entity + type STAGE_TRANSITION
  - [ ] 1.3 Build variable context from candidate/vacancy/stage data using `renderRecruitmentTemplate()`
  - [ ] 1.4 Call `sendEmail()` from `lib/email.ts` with rendered subject + body
  - [ ] 1.5 Implement retry logic: create `EmailQueue` model or use in-memory retry with exponential backoff (3 attempts max)
  - [ ] 1.6 On final failure: create Notification for entity admins

- [ ] Task 2: Integrate email trigger into stage move API (AC: 1, 2)
  - [ ] 2.1 Modify `app/api/recruitment/vacancies/[id]/candidates/[candidateId]/move/route.ts` to accept `sendEmail: boolean` param
  - [ ] 2.2 After successful stage move, if `sendEmail === true` AND stage.triggersEmail AND active template exists → call `sendStageTransitionEmail()` (non-blocking, wrapped in try/catch)
  - [ ] 2.3 Add audit log entry `CANDIDATE_EMAIL_SENT` on success

- [ ] Task 3: Update CandidateMoveDialog with email toggle (AC: 2)
  - [ ] 3.1 Modify `components/recruitment/pipeline/candidate-move-dialog.tsx`
  - [ ] 3.2 Add "Send status email" toggle (Switch component), default ON if target stage has triggersEmail + active template exists
  - [ ] 3.3 Pass `sendEmail` boolean to the move API call
  - [ ] 3.4 Show template name/subject preview below toggle when ON

- [ ] Task 4: Manual email send from candidate profile (AC: 3)
  - [ ] 4.1 Create `app/api/recruitment/candidates/[id]/send-email/route.ts` — POST with templateId, preview flag
  - [ ] 4.2 Add "Send email" button to candidate detail dialog (overview tab)
  - [ ] 4.3 Email template selector dropdown + preview pane (reuse preview API from 6.1)
  - [ ] 4.4 On confirm: send email immediately using status-emails service

- [ ] Task 5: i18n keys (AC: all)
  - [ ] 5.1 Add `recruitment.email.*` keys to messages/nl.json and messages/fr.json

## Dev Notes

### Existing Infrastructure

- **CandidateMoveDialog**: `components/recruitment/pipeline/candidate-move-dialog.tsx` — currently shows confirmation with stage info
- **Move API**: `app/api/recruitment/vacancies/[id]/candidates/[candidateId]/move/route.ts` — handles stage transitions
- **VacancyStage.triggersEmail**: Boolean flag already on stages (set during vacancy creation)
- **RecruitmentEmailTemplate**: Created in Story 6.1 with type, entity scope, subject, body, isActive
- **sendEmail()**: `lib/email.ts` wraps SendGrid with audit logging
- **renderRecruitmentTemplate()**: `lib/recruitment/email-variables.ts` handles `{{var}}` substitution

### Key Technical Constraints

- Email sending MUST be non-blocking — stage transition succeeds regardless of email outcome
- Retry queue: simplest approach is a `RecruitmentEmailLog` model with status tracking (PENDING/SENT/FAILED) + a periodic check or immediate retry with setTimeout
- Notification system uses existing `Notification` model (type, title, message, linkUrl)

### References

- [Source: components/recruitment/pipeline/candidate-move-dialog.tsx]
- [Source: lib/recruitment/email-variables.ts] — renderRecruitmentTemplate
- [Source: lib/email.ts] — sendEmail with SendGrid
- [Source: prisma/schema.prisma#VacancyStage] — triggersEmail field

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
