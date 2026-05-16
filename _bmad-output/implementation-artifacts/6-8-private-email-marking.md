# Story 6.8: Private Email Marking (Phase 2)

Status: ready-for-dev

> Epic: 6 — Communication & Notifications
> Generated: 2026-05-16
> Depends on: Story 6.7 (LinkedEmail model + emails tab in candidate detail)

## Story

As a headhunter,
I want to mark certain emails as private,
So that they are excluded from the candidate file and not visible to others.

## Acceptance Criteria

**AC1:** Given I am viewing linked emails on a candidate profile,
When I click "Mark as private" on an email,
Then the email is hidden from the candidate's profile for all other users,
And only I can still see it (marked with a "private" badge).

**AC2:** Given an email is marked as private,
When a reviewer or other headhunter views the candidate,
Then they do not see the private email in the communication history.

**AC3:** Given I want to undo a private marking,
When I click "Make visible" on a private email,
Then it becomes visible to all authorized users again.

## Tasks / Subtasks

- [ ] Task 1: Add private flag to LinkedEmail (AC: 1, 2)
  - [ ] 1.1 Ensure `isPrivate Boolean @default(false)` exists on LinkedEmail model (added in 6.7)
  - [ ] 1.2 Add `markedPrivateById String?` to track who marked it private

- [ ] Task 2: Filter private emails in API (AC: 2)
  - [ ] 2.1 In the GET emails endpoint: filter out emails where `isPrivate = true AND markedPrivateById != currentUser.id`
  - [ ] 2.2 For the owning user: include private emails with `isPrivate` flag for UI badge

- [ ] Task 3: Toggle private API (AC: 1, 3)
  - [ ] 3.1 Create PATCH `app/api/recruitment/candidates/[id]/emails/[emailId]/route.ts` — toggle isPrivate
  - [ ] 3.2 Only the original syncing user (email.userId) can mark/unmark private
  - [ ] 3.3 Validate ownership before toggle

- [ ] Task 4: UI for private marking (AC: 1, 3)
  - [ ] 4.1 Add "Mark as private" / "Make visible" action button on email list items
  - [ ] 4.2 Show "Private" badge on private emails for the owner
  - [ ] 4.3 Optimistic UI update on toggle

- [ ] Task 5: i18n keys
  - [ ] 5.1 Add `recruitment.emails.private` / `recruitment.emails.makeVisible` i18n keys

## Dev Notes

### Existing Infrastructure

- **LinkedEmail model**: Created in Story 6.7 with `isPrivate` field
- **Emails tab**: Created in Story 6.7 in candidate detail dialog
- **Permission check**: Only `email.userId` (the headhunter who synced) can toggle privacy

### Key Technical Constraints

- Private emails are still stored — just hidden from other users
- The owning user always sees their private emails (with badge)
- Reviewers with scoped share should also NOT see private emails

### References

- [Source: Story 6.7 implementation — LinkedEmail model]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
