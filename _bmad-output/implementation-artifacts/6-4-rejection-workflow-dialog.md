# Story 6.4: Rejection Workflow & Dialog

Status: ready-for-dev

> Epic: 6 — Communication & Notifications
> Generated: 2026-05-16
> Depends on: Story 6.1 (REJECTION email templates), Story 6.2 (email sending service), Story 2.4 (candidate-move-dialog.tsx + drag-drop)

## Story

As a headhunter,
I want a structured rejection flow when moving candidates to "Rejected",
So that candidates receive a professional rejection and I can document the reason.

## Acceptance Criteria

**AC1:** Given I drag a candidate to the "Rejected" stage,
When the card is dropped,
Then the CandidateMoveDialog appears in its RED variant: red confirm button, rejection template selector, optional reason textarea.

**AC2:** Given the rejection dialog is shown,
When I view the options,
Then I see: selected rejection email template (dropdown of configured rejection templates), optional reason field (internal, not sent to candidate unless variable used), and "Send rejection email" toggle (default: on).

**AC3:** Given I confirm the rejection,
When I click "Reject candidate" (red button),
Then the candidate moves to the Rejected stage,
And the rejection email is sent (if toggled on),
And the internal reason is stored on the candidate record,
And an SSE event `recruitment:pipeline:candidate-moved` is emitted,
And the candidate card shows in the Rejected column (visually distinct: muted/gray).

**AC4:** Given I click Cancel in the rejection dialog,
When the dialog closes,
Then the candidate card animates back to its original stage.

## Tasks / Subtasks

- [ ] Task 1: Detect rejection stage in move dialog (AC: 1)
  - [ ] 1.1 In `candidate-move-dialog.tsx`, detect if target stage `isTerminal` AND stage name matches "Rejected" pattern
  - [ ] 1.2 Switch dialog variant: red confirm button, different title, show rejection-specific fields

- [ ] Task 2: Rejection dialog fields (AC: 2)
  - [ ] 2.1 Add rejection template dropdown (fetch REJECTION type templates for entity)
  - [ ] 2.2 Add optional reason textarea (internal note)
  - [ ] 2.3 Add "Send rejection email" toggle (default: on if template selected)
  - [ ] 2.4 Preview of selected template subject

- [ ] Task 3: Rejection execution (AC: 3)
  - [ ] 3.1 Extend move API to accept `rejectionReason` and `rejectionTemplateId` params
  - [ ] 3.2 Store rejection reason on Candidate model (add `rejectionReason String?` field)
  - [ ] 3.3 Send rejection email using selected template with variables including `rejection_reason`
  - [ ] 3.4 SSE event emission (already happens on stage move)

- [ ] Task 4: Visual styling for rejected candidates (AC: 3)
  - [ ] 4.1 Add `opacity-60` or muted styling to candidate cards in terminal/rejected stages
  - [ ] 4.2 Show rejection reason as tooltip or sub-text on rejected cards

- [ ] Task 5: Cancel behavior (AC: 4)
  - [ ] 5.1 Ensure dialog cancel properly reverts optimistic stage move (existing dnd-kit revert pattern)

- [ ] Task 6: i18n + schema migration
  - [ ] 6.1 Add `rejectionReason String?` to Candidate model + db push
  - [ ] 6.2 Add `recruitment.rejection.*` i18n keys

## Dev Notes

### Existing Infrastructure

- **CandidateMoveDialog**: Already handles stage moves, needs variant detection for rejection
- **VacancyStage.isTerminal**: Boolean flag identifies terminal stages (Hired, Rejected)
- **Pipeline revert**: dnd-kit onDragEnd already handles cancel/revert via optimistic update pattern
- **Candidate model**: Already has notes field, needs dedicated `rejectionReason` field

### Key Technical Constraints

- Red variant: use `variant="destructive"` on confirm button (shadcn pattern)
- Rejection reason is internal only — NOT sent to candidate unless admin explicitly uses `{{rejection_reason}}` variable in template
- SSE event is already emitted on any stage move — no new event needed

### References

- [Source: components/recruitment/pipeline/candidate-move-dialog.tsx]
- [Source: components/recruitment/pipeline/pipeline-kanban.tsx] — dnd-kit revert logic
- [Source: prisma/schema.prisma#VacancyStage] — isTerminal field

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
