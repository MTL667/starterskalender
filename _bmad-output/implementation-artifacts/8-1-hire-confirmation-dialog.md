# Story 8.1: Hire Confirmation Dialog

Status: ready-for-dev

> Epic: 8 — Hire-to-Onboarding Bridge
> Generated: 2026-05-16
> Depends on: Pipeline kanban, CandidateMoveDialog, Starter model

## Story

As a headhunter,
I want a structured hire flow when moving a candidate to "Hired",
So that I can confirm the hire and provide the details needed to create their Starter record.

## Acceptance Criteria

**AC1:** Given I drag a candidate to the "Hired" stage,
When the card is dropped,
Then a HireConfirmationDialog appears in GREEN variant.

**AC2:** Given the hire dialog is shown,
When I view the form,
Then I see pre-filled fields from vacancy context: entity, job function,
And empty fields: start date (date picker), contract type, reporting to,
And a "Send hire notification email" toggle (default: on).

**AC3:** Given all required fields are filled,
When I click "Confirm hire" (green button),
Then the system proceeds to create the Starter record,
And the candidate moves to "Hired" stage.

**AC4:** Given I click Cancel,
When the dialog closes,
Then the candidate card returns to its source stage.

## Tasks

- [ ] Task 1: Create HireConfirmationDialog component
- [ ] Task 2: Detect "Hired" stage and show hire dialog instead of standard move dialog
- [ ] Task 3: Pass hire details to move API
- [ ] Task 4: i18n keys

## Dev Notes

### Key Constraint
- Detection: stage name contains "hired" or "aangenomen" (case-insensitive)
- Fields: entity (from vacancy), function (from vacancy), start date, contract type
