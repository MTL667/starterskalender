# Story 4.7: Default Share Templates (Admin)

> Status: review
> Epic: 4 — Collaboration & Scoped Sharing
> Generated: 2026-05-16
> Depends on: Story 4.2 (ShareDialog with hardcoded templates), Story 4.3 (FieldPicker)

## Story

As an admin,
I want to configure default share templates per reviewer role,
so that headhunters have consistent, organization-standard sharing options.

## Acceptance Criteria

**AC1:** Given I have `recruitment:admin` permission, When I navigate to `/recruitment/admin/instellingen` share templates section, Then I see existing share templates with: name, included fields, and usage count.

**AC2:** Given I am in the templates section, When I create a new template, Then I can specify: template name, description, and select fields from the same FieldPicker component, And I can mark a template as "default" (pre-selected in ShareDialog).

**AC3:** Given I edit an existing template, When I change the included fields, Then existing shares created from this template are NOT retroactively affected, And only new shares will use the updated field set.

**AC4:** Given share templates are configured, When a headhunter opens the ShareDialog, Then the configured templates appear as the selectable cards (replacing the hardcoded 3), And the admin-marked default template is pre-selected.

## Tasks / Subtasks

- [ ] Task 1: Prisma schema — ShareTemplate model (AC: 1,2)
  - [ ] 1.1 Add `ShareTemplate` model: id, name, description, visibleFields (String[]), isDefault (Boolean @default(false)), usageCount (Int @default(0)), createdAt, updatedAt
  - [ ] 1.2 Run `npx prisma generate`

- [ ] Task 2: Admin API for templates (AC: 1,2,3)
  - [ ] 2.1 Create `app/api/recruitment/admin/share-templates/route.ts` — GET (list) + POST (create)
  - [ ] 2.2 Create `app/api/recruitment/admin/share-templates/[id]/route.ts` — PATCH (update) + DELETE
  - [ ] 2.3 GET: return all templates ordered by isDefault DESC, name ASC
  - [ ] 2.4 POST: validate name uniqueness, visibleFields not empty
  - [ ] 2.5 PATCH: update name, description, fields, isDefault; enforce only one default (unset others when setting new default)
  - [ ] 2.6 DELETE: only if usageCount is 0 (or soft-delete)
  - [ ] 2.7 Require `recruitment:admin` permission for all operations

- [ ] Task 3: Admin UI — templates section (AC: 1,2)
  - [ ] 3.1 Add "Share Templates" section to `/recruitment/admin/instellingen` page (below site groups)
  - [ ] 3.2 Create `components/recruitment/admin/share-templates-section.tsx`
  - [ ] 3.3 List existing templates as cards with: name, description, field count, usage count, default badge
  - [ ] 3.4 "New template" button opens inline form with: name input, description textarea, FieldPicker
  - [ ] 3.5 "Default" toggle — radio-style (only one can be default)
  - [ ] 3.6 Edit: inline expand of template card to show editable form
  - [ ] 3.7 Delete: confirmation dialog, disabled if usage count > 0

- [ ] Task 4: Integrate with ShareDialog (AC: 4)
  - [ ] 4.1 Update `components/recruitment/share/share-dialog.tsx` to fetch templates from API instead of using hardcoded list
  - [ ] 4.2 Render admin-configured templates as cards (plus always keep "Custom" as last option)
  - [ ] 4.3 Pre-select the template marked as `isDefault`
  - [ ] 4.4 Fallback: if no templates configured, use the hardcoded defaults from `lib/recruitment/share-templates.ts`

- [ ] Task 5: Usage tracking (AC: 1,3)
  - [ ] 5.1 When a share is created using a template, increment `usageCount` on the template
  - [ ] 5.2 Store template snapshot (visibleFields at time of share) in the CandidateShare — NOT a reference to the template
  - [ ] 5.3 This ensures AC3: editing a template does not affect existing shares

- [ ] Task 6: Seed default templates (AC: 4)
  - [ ] 6.1 Create seed logic or first-run migration that creates "Technical Review" and "HR Review" templates with the same fields as the hardcoded defaults
  - [ ] 6.2 Mark "Technical Review" as default

- [ ] Task 7: i18n keys (AC: 1,2)
  - [ ] 7.1 Add admin share template keys to `messages/nl.json` and `messages/fr.json`

## Dev Notes

### ShareTemplate Model

```prisma
model ShareTemplate {
  id            String   @id @default(cuid())
  name          String
  description   String?
  visibleFields String[]
  isDefault     Boolean  @default(false)
  usageCount    Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### Default Enforcement

Only one template can be `isDefault: true`. When setting a new default:
```typescript
await prisma.$transaction([
  prisma.shareTemplate.updateMany({ where: { isDefault: true }, data: { isDefault: false } }),
  prisma.shareTemplate.update({ where: { id }, data: { isDefault: true } }),
])
```

### Template Snapshot Pattern

When creating a CandidateShare, the `visibleFields[]` on the share record stores the actual fields at the time of sharing — copied from the template's current `visibleFields[]`. This means:
- Editing a template later does NOT change what existing reviewers can see
- The share is a snapshot, not a live reference to the template
- This is critical for GDPR: the access scope at time of sharing is what matters

### Integration with Existing Admin Page

The admin settings page (`/recruitment/admin/instellingen`) already exists from Story 3.6 with the SiteGroupsSection. Add the ShareTemplatesSection below it. Follow the same component pattern.

### FieldPicker Reuse

The same `FieldPicker` component from Story 4.3 is reused here in the admin template editor. Props are identical — it reads from `SHAREABLE_FIELDS` and emits selected fields.

### Existing Patterns

- **Admin section pattern:** `components/recruitment/admin/site-groups-section.tsx` — same structure for CRUD on admin entities
- **FieldPicker:** `components/recruitment/share/field-picker.tsx` (Story 4.3)
- **Permission:** `requirePermission('recruitment:admin')` — same as site groups page

### Anti-Patterns to Avoid

1. **DO NOT** store a templateId reference on CandidateShare — store the actual fields (snapshot pattern)
2. **DO NOT** allow deleting templates with active usage — prevent orphan references in audit trails
3. **DO NOT** allow zero templates — ensure the hardcoded fallbacks are always available
4. **DO NOT** skip the "Custom" option — it should always be available even with admin templates

## References

- Epics: Story 4.7 ACs
- UX: ShareTemplateSelector component spec, "One click for common, three clicks for custom"
- Architecture: ShareTemplate model, snapshot pattern, admin configuration
- Depends: Story 4.2 (ShareDialog), Story 4.3 (FieldPicker component)
