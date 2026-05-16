# Story 6.3: Application Confirmation Email

Status: ready-for-dev

> Epic: 6 — Communication & Notifications
> Generated: 2026-05-16
> Depends on: Story 6.1 (RecruitmentEmailTemplate model + rendering), Story 6.2 (status-emails service pattern), Story 3.3 (one-click application form + email verification)

## Story

As a candidate,
I want to receive a confirmation email when I submit my application,
So that I know my application was received and what to expect next.

## Acceptance Criteria

**AC1:** Given I have submitted an application and verified my email,
When the verification is confirmed,
Then I receive a confirmation email with: vacancy title, entity name, acknowledgment text, and expected timeline (if configured).

**AC2:** Given the confirmation email template is configured,
When it is sent,
Then it uses the admin-configured template with variables substituted,
And it includes a link to the candidate portal (token-based, no login required).

**AC3:** Given the SendGrid delivery fails,
When the error is caught,
Then the candidate's application is still recorded in the pipeline (email is non-blocking),
And the email is queued for retry.

## Tasks / Subtasks

- [ ] Task 1: Integrate confirmation email into verification flow (AC: 1, 2, 3)
  - [ ] 1.1 In the existing email verification handler (candidate verification route), after successful verification: look up active `APPLICATION_CONFIRMATION` template for the vacancy's entity
  - [ ] 1.2 Build variables: candidate_name, vacancy_title, entity_name, application_date, portal_link (candidate verification token URL)
  - [ ] 1.3 Call `sendEmail()` with rendered template (non-blocking, try/catch)
  - [ ] 1.4 Log email attempt in audit log

- [ ] Task 2: Ensure no-template = no-email (AC: 1)
  - [ ] 2.1 If no active APPLICATION_CONFIRMATION template exists for the entity, skip email silently (opt-in per Story 6.1 AC4)

- [ ] Task 3: i18n keys (AC: all)
  - [ ] 3.1 Add any missing `recruitment.email.confirmation.*` keys

## Dev Notes

### Existing Infrastructure

- **Email verification**: `app/api/public/vacancies/[id]/apply/verify/route.ts` handles token verification
- **Candidate portal link**: Constructed from candidate's verificationToken
- **RecruitmentEmailTemplate**: Lookup by entityId + type = APPLICATION_CONFIRMATION + isActive
- **status-emails service**: Pattern from Story 6.2 — non-blocking send with retry

### Key Technical Constraints

- Must not block the verification flow — email failure must not prevent candidate from entering pipeline
- Portal link uses the existing verification token as access token

### References

- [Source: app/api/public/vacancies/[id]/apply/verify/route.ts]
- [Source: lib/recruitment/email-variables.ts]
- [Source: lib/recruitment/email-template-defaults.ts] — default APPLICATION_CONFIRMATION template

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
