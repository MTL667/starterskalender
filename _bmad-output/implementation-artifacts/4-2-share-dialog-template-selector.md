# Story 4.2: Share Dialog & Template Selector

> Status: review
> Epic: 4 — Collaboration & Scoped Sharing
> Generated: 2026-05-16
> Depends on: Story 4.1 (CandidateShare model & API)

## Story

As a headhunter,
I want to share a candidate with one click using pre-defined templates,
so that I can quickly invite a reviewer without manually selecting fields every time.

## Acceptance Criteria

**AC1:** Given I am viewing the pipeline or a candidate profile, When I click the share icon on a candidate card (or "Share" button in profile), Then the ShareDialog opens with: reviewer picker (Airport user search), 3 template cards, access duration selector, field preview, and action buttons.

**AC2:** Given the ShareDialog is open, When I see the template cards, Then "Technical Review" is pre-selected (default), And the 3 options are: "Technical Review" (CV + skills + experience), "HR Review" (all personal + professional), "Custom" (opens field picker), And the field preview section updates in real-time showing which fields will be visible.

**AC3:** Given I select a reviewer and keep a template selected, When I click "Share with [Name]" (primary blue button), Then the share is created via API (`POST /api/recruitment/candidates/[id]/share`), And the dialog closes, And a toast "Shared with [Name]" confirms, And the reviewer receives a notification (via existing Airport notification system).

**AC4:** Given the dialog is open, When I interact with it, Then focus is trapped within the dialog, And Escape closes the dialog, And Tab moves through: reviewer picker → templates → duration → actions.

## Tasks / Subtasks

- [ ] Task 1: ShareDialog component (AC: 1,4)
  - [ ] 1.1 Create `components/recruitment/share/share-dialog.tsx` using Radix Dialog
  - [ ] 1.2 Add reviewer picker: user search dropdown (fetch `/api/admin/users` with search param)
  - [ ] 1.3 Add access duration selector: "After evaluation" (default), "24 hours", "7 days", "30 days", "Permanent"
  - [ ] 1.4 Add field preview panel showing visible/hidden fields as colored pills
  - [ ] 1.5 Add action buttons: Cancel + "Share with [Name]" (disabled until reviewer selected)
  - [ ] 1.6 Ensure focus trap, Escape close, Tab order

- [ ] Task 2: ShareTemplateSelector component (AC: 2)
  - [ ] 2.1 Create `components/recruitment/share/share-template-selector.tsx`
  - [ ] 2.2 Render 3 template cards: "Technical Review", "HR Review", "Custom"
  - [ ] 2.3 Each card shows included field names as small list
  - [ ] 2.4 Pre-select "Technical Review" on mount
  - [ ] 2.5 "Custom" card indicates it opens the field picker (Story 4.3)

- [ ] Task 3: Template field definitions (AC: 2)
  - [ ] 3.1 Define hardcoded templates in `lib/recruitment/share-templates.ts`:
    - Technical Review: cv, motivation, niceToHaveScore, dealbreakersResult, source, stage
    - HR Review: firstName, lastName, email, phone, cv, motivation, niceToHaveScore, dealbreakersResult, source, stage, appliedAt
    - Custom: opens FieldPicker (empty initial selection)

- [ ] Task 4: Integrate with Share API (AC: 3)
  - [ ] 4.1 On submit: call `POST /api/recruitment/candidates/[id]/share` with reviewerId, visibleFields[], expiresAt
  - [ ] 4.2 Handle loading state on submit button
  - [ ] 4.3 Show toast on success, error toast on failure
  - [ ] 4.4 Close dialog on success

- [ ] Task 5: Wire into pipeline & profile (AC: 1)
  - [ ] 5.1 Add Share button to `candidate-detail-dialog.tsx` header actions
  - [ ] 5.2 Add Share icon to `draggable-candidate-card.tsx` hover actions (if hover actions exist)
  - [ ] 5.3 Manage dialog open/close state

- [ ] Task 6: i18n keys (AC: 1,2,3)
  - [ ] 6.1 Add share dialog keys to `messages/nl.json` and `messages/fr.json`

## Dev Notes

### Architecture

The ShareDialog is a Radix Dialog component. It follows the same pattern as other recruitment dialogs (e.g., candidate-detail-dialog). The template selector is a self-contained sub-component that emits the selected field set.

### UX Reference (from ux-design-specification.md)

```
┌─────────────────────────────────────────────────┐
│  Share [Candidate Name] with...                  │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │ 👤 Select reviewer     [User picker ▼]      │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  Share profile:                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │Technical │ │    HR    │ │  Custom  │        │
│  │ Review   │ │  Review  │ │          │        │
│  │ ✓ CV     │ │ ✓ CV     │ │ Pick     │        │
│  │ ✓ Skills │ │ ✓ Skills │ │ fields...│        │
│  │ ✓ Score  │ │ ✓ Name   │ │          │        │
│  │          │ │ ✓ Contact│ │          │        │
│  │          │ │ ✓ Score  │ │          │        │
│  └──────────┘ └──────────┘ └──────────┘        │
│                                                   │
│  ⏱ Access expires: [After evaluation ▼]          │
│                                                   │
│  Preview: "Mark will see..."                      │
│  ┌─────────────────────────────────────────────┐ │
│  │  [Masked candidate card preview]             │ │
│  │  CV: ✓  Skills: ✓  Name: ✗  Address: ✗     │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│              [Cancel]  [Share →]                   │
└─────────────────────────────────────────────────┘
```

### User Picker

Reuse the existing Airport user search pattern. Fetch `/api/admin/users?search=query` and display as a Combobox/autocomplete. Show user name + avatar. Filter out the current user (can't share with yourself).

### Duration → expiresAt Mapping

| Duration option       | expiresAt value                                |
|-----------------------|-----------------------------------------------|
| After evaluation      | null (handled by Story 4.5 auto-revoke logic) |
| 24 hours              | now + 24h                                     |
| 7 days                | now + 7d                                      |
| 30 days               | now + 30d                                     |
| Permanent             | null (no expiration)                          |

### Existing Patterns

- **Dialog:** Radix Dialog — same as `candidate-detail-dialog.tsx`
- **Toast:** Use existing toast pattern from the project
- **User search:** Check if `/api/admin/users` supports a search param; if not, fetch all and filter client-side

### Anti-Patterns to Avoid

1. **DO NOT** build the FieldPicker in this story — "Custom" template just shows a message "Coming in next update" or is disabled until Story 4.3
2. **DO NOT** create a new user search endpoint if one exists — reuse existing
3. **DO NOT** allow sharing with yourself — filter out current user from picker
4. **DO NOT** skip the preview panel — it's the UX differentiator

## References

- Epics: Story 4.2 ACs
- UX: ShareDialog component spec, Experience Mechanic 1 (Scoped Share Flow)
- Architecture: `CandidateShare` model (Story 4.1), share templates
- Depends: Story 4.1 must be deployed (CandidateShare model + API)
