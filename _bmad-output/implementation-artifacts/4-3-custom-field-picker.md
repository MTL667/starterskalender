# Story 4.3: Custom Field Picker

> Status: review
> Epic: 4 — Collaboration & Scoped Sharing
> Generated: 2026-05-16
> Depends on: Story 4.2 (ShareDialog exists)

## Story

As a headhunter,
I want to select exactly which candidate fields to share,
so that I can handle edge cases where templates don't match my needs.

## Acceptance Criteria

**AC1:** Given I am in the ShareDialog and select "Custom" template, When the custom mode activates, Then the FieldPicker component appears below the template cards, And it shows a two-column checkbox grid with category headers: Personal (name, email, phone, photo), Professional (experience, skills, education, current role), Documents (CV, motivation, portfolio).

**AC2:** Given I toggle individual fields in the FieldPicker, When I check/uncheck a field, Then the field preview updates in real-time showing visible (green pill) and hidden (gray striped) fields, And each checkbox is labeled and grouped with `role="group"` per category.

**AC3:** Given I have selected custom fields, When I click "Share with [Name]", Then only the selected fields are stored in `visibleFields[]` on the CandidateShare record.

**AC4:** Given no fields are selected, When I view the submit button, Then it is disabled with tooltip "Select at least one field to share".

## Tasks / Subtasks

- [ ] Task 1: FieldPicker component (AC: 1,2)
  - [ ] 1.1 Create `components/recruitment/share/field-picker.tsx`
  - [ ] 1.2 Render two-column checkbox grid with category headers
  - [ ] 1.3 Categories: Personal, Professional, Documents (mapped from `SHAREABLE_FIELDS` in `lib/recruitment/field-mask.ts`)
  - [ ] 1.4 Each checkbox uses `role="group"` per category with accessible labels
  - [ ] 1.5 Emit `onChange(selectedFields: string[])` on every toggle

- [ ] Task 2: Integrate into ShareDialog (AC: 1,3)
  - [ ] 2.1 When "Custom" template is selected in `share-dialog.tsx`, render FieldPicker below template cards
  - [ ] 2.2 Pass selected fields from FieldPicker to the field preview panel
  - [ ] 2.3 On submit, use FieldPicker's selection as `visibleFields[]` for the API call

- [ ] Task 3: Preview integration (AC: 2)
  - [ ] 3.1 Update field preview panel in ShareDialog to show green pills for checked fields, gray striped pills for unchecked
  - [ ] 3.2 Ensure real-time update as checkboxes toggle

- [ ] Task 4: Validation (AC: 4)
  - [ ] 4.1 Disable "Share with [Name]" button when in custom mode and zero fields selected
  - [ ] 4.2 Show tooltip on disabled button: "Select at least one field to share"

- [ ] Task 5: i18n keys (AC: 1,2,4)
  - [ ] 5.1 Add field picker category headers and tooltip to `messages/nl.json` and `messages/fr.json`

## Dev Notes

### Field Categories

Map directly from `SHAREABLE_FIELDS` defined in Story 4.1's `lib/recruitment/field-mask.ts`:

| Category     | Fields                                           |
|-------------|--------------------------------------------------|
| Personal    | firstName, lastName, email, phone                |
| Professional| source, niceToHaveScore, dealbreakersResult      |
| Documents   | cv, motivation                                   |
| Meta        | appliedAt, verifiedAt, stage                     |

### Component Design

```typescript
interface FieldPickerProps {
  availableFields: typeof SHAREABLE_FIELDS
  selectedFields: string[]
  onChange: (fields: string[]) => void
}
```

The FieldPicker renders a two-column grid (CSS grid or flex-wrap). Each category is a fieldset with a `<legend>` for accessibility. Checkboxes are standard HTML inputs styled with Tailwind.

### Accessibility

- Each category group uses `<fieldset>` with `<legend>` (or `role="group"` with `aria-labelledby`)
- Each checkbox has an associated `<label>`
- "Select all" / "Clear all" per category is a nice-to-have but not required by AC

### Existing Patterns

- **Checkbox styling:** Follow the same pattern as existing checkbox inputs in the project
- **SHAREABLE_FIELDS:** Defined in `lib/recruitment/field-mask.ts` (Story 4.1)
- **ShareDialog:** Parent component from Story 4.2

### Anti-Patterns to Avoid

1. **DO NOT** allow submitting with zero fields — validate client-side
2. **DO NOT** hardcode field names in the component — import from `SHAREABLE_FIELDS`
3. **DO NOT** render photo/portfolio if those fields don't exist in the Candidate model yet — only show fields that actually exist

## References

- Epics: Story 4.3 ACs
- UX: FieldPicker component spec — "checkbox grid for field-level selection"
- Architecture: `SHAREABLE_FIELDS` constant, `visibleFields[]` on CandidateShare
- Depends: Story 4.2 (ShareDialog component)
