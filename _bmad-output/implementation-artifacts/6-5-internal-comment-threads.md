# Story 6.5: Internal Comment Threads

Status: ready-for-dev

> Epic: 6 — Communication & Notifications
> Generated: 2026-05-16
> Depends on: Story 2.3 (candidate card/profile), Story 4.4 (reviewer scoped view), existing SSE event bus, Notification model

## Story

As a headhunter or reviewer,
I want to post internal comments on a candidate's profile,
So that I can collaborate with colleagues about a candidate without email.

## Acceptance Criteria

**AC1:** Given I have `candidate:read` permission for a candidate,
When I view their profile and open the "Comments" tab,
Then I see a chronological list of all internal comments with: author name, avatar, timestamp, and text.

**AC2:** Given I am on the comments tab,
When I type in the comment input and press Enter or click "Post",
Then the comment is saved and appears instantly at the bottom of the thread,
And a timestamp "just now" is shown.

**AC3:** Given a new comment is posted on a candidate I have access to,
When I am viewing that candidate's profile,
Then the new comment appears in real-time via SSE.

**AC4:** Given a reviewer has a scoped share,
When they view the shared candidate,
Then they can see and post comments (comments are visible to all users with access to this candidate),
And their comments show as authored by their name.

**AC5:** Given a candidate's data is deleted (GDPR),
When the deletion runs,
Then internal comments are also deleted (they contain contextual candidate data).

## Tasks / Subtasks

- [ ] Task 1: Create CandidateComment model (AC: 1, 5)
  - [ ] 1.1 Add `CandidateComment` to Prisma schema: id, candidateId, authorId, text, createdAt
  - [ ] 1.2 Add relation to Candidate (onDelete: Cascade for GDPR AC5)
  - [ ] 1.3 Add relation to User (author)
  - [ ] 1.4 Run db push

- [ ] Task 2: Comments API (AC: 1, 2, 4)
  - [ ] 2.1 Create `app/api/recruitment/candidates/[id]/comments/route.ts` — GET (list) + POST (create)
  - [ ] 2.2 GET: require `recruitment:read` OR valid share token for candidate, return comments with author info
  - [ ] 2.3 POST: require `recruitment:write` OR valid share token, validate text min 1 max 2000, create comment
  - [ ] 2.4 Emit SSE event `recruitment:candidate:comment-added` on create

- [ ] Task 3: Comments UI in candidate detail dialog (AC: 1, 2)
  - [ ] 3.1 Add "Comments" tab to candidate detail dialog
  - [ ] 3.2 Comment list: author avatar (initials), name, relative timestamp, text
  - [ ] 3.3 Comment input at bottom with Enter to submit + Post button
  - [ ] 3.4 Optimistic add on submit

- [ ] Task 4: Real-time comments via SSE (AC: 3)
  - [ ] 4.1 Add `recruitment:candidate:comment-added` to SSEEventType in lib/events.ts
  - [ ] 4.2 Register in sse-provider.tsx
  - [ ] 4.3 On event received in comments tab: append new comment if candidateId matches

- [ ] Task 5: Comments in scoped reviewer view (AC: 4)
  - [ ] 5.1 Add comments section to scoped-view-client.tsx
  - [ ] 5.2 Share token auth for GET/POST comments API (validate sharedWithUserId matches)

- [ ] Task 6: i18n keys
  - [ ] 6.1 Add `recruitment.comments.*` keys to nl.json and fr.json

## Dev Notes

### Existing Infrastructure

- **Candidate detail dialog**: `components/recruitment/pipeline/candidate-detail-dialog.tsx` — has tabs (Overview, etc.)
- **Scoped view**: `app/(authenticated)/recruitment/shared/[token]/scoped-view-client.tsx`
- **SSE event bus**: `lib/events.ts` + `components/providers/sse-provider.tsx`
- **Notification model**: Already exists for in-app notifications
- **GDPR**: Cascade delete on Candidate → CandidateComment ensures automatic cleanup

### Key Technical Constraints

- Comments visible to ALL users with access (no private comments in this story)
- Reviewers with valid share token can read AND write comments
- Timestamps: use `formatDistanceToNow` from date-fns for relative time
- Avatar: use initials from author name (existing pattern in the app)

### References

- [Source: components/recruitment/pipeline/candidate-detail-dialog.tsx]
- [Source: lib/events.ts] — SSEEventType
- [Source: prisma/schema.prisma#Candidate] — onDelete: Cascade pattern

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
