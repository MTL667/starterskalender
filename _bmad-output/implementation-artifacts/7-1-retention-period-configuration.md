# Story 7.1: Retention Period Configuration

Status: ready-for-dev

> Epic: 7 — Compliance & Data Lifecycle
> Generated: 2026-05-16
> Depends on: Story 1.1 (RBAC with recruitment:admin), admin settings page

## Story

As an admin,
I want to configure candidate data retention periods,
So that our organization complies with GDPR data minimization principles.

## Acceptance Criteria

**AC1:** Given I have `recruitment:admin` permission,
When I navigate to `/recruitment/admin/instellingen` compliance section,
Then I see a "Data Retention" configuration with: default retention period (days), grace period before hard delete (days), and notification lead time (days before expiry).

**AC2:** Given I set the default retention to 365 days,
When I save the configuration,
Then all new candidates inherit this retention period from their application date,
And existing candidates without explicit retention use the new default.

**AC3:** Given a vacancy has specific retention requirements,
When I edit the vacancy settings,
Then I can override the default retention period for that vacancy,
And candidates for that vacancy use the vacancy-specific retention.

**AC4:** Given the retention configuration is saved,
When I view the settings,
Then I see a summary: "Candidate data retained for {X} days, notification {Y} days before, hard-deleted {Z} days after soft-delete".

## Tasks

- [ ] Task 1: Create RetentionConfig model or use SystemSettings
  - [ ] 1.1 Add retention fields to Entity model: `retentionDays Int @default(365)`, `retentionGraceDays Int @default(30)`, `retentionNotifyDays Int @default(30)`
  - [ ] 1.2 Add `retentionDays Int?` override to Vacancy model
  - [ ] 1.3 Add `retentionExpiresAt DateTime?` to Candidate model (computed on creation)
  - [ ] 1.4 Run db push

- [ ] Task 2: Retention settings API
  - [ ] 2.1 Create GET/PATCH `app/api/recruitment/admin/retention/route.ts` — read/update entity retention config
  - [ ] 2.2 Require `recruitment:admin` permission
  - [ ] 2.3 On update: optionally backfill `retentionExpiresAt` for existing candidates without it

- [ ] Task 3: Retention settings UI component
  - [ ] 3.1 Create `components/recruitment/admin/retention-section.tsx`
  - [ ] 3.2 Three input fields: retention days, grace days, notify days
  - [ ] 3.3 Summary text showing the computed policy
  - [ ] 3.4 Save button with optimistic feedback

- [ ] Task 4: Integrate into admin settings page
  - [ ] 4.1 Import and add RetentionSection to instellingen page

- [ ] Task 5: Set retentionExpiresAt on candidate creation
  - [ ] 5.1 In candidate creation flows (apply + manual), compute and set `retentionExpiresAt` from vacancy or entity retention config

- [ ] Task 6: i18n keys
  - [ ] 6.1 Add `recruitment.retention.*` keys to nl.json and fr.json

## Dev Notes

### Existing Infrastructure
- **Admin settings page**: `app/(authenticated)/recruitment/admin/instellingen/page.tsx`
- **Entity model**: Already has entity-scoped config patterns
- **Candidate.deletedAt**: Already exists for soft-delete
- **SystemSettings model**: Key-value store, could be used but entity-scoped fields are cleaner

### Key Constraints
- Retention is entity-scoped (each entity can have different policies)
- Vacancy override takes precedence over entity default
- `retentionExpiresAt` on Candidate is the authoritative "delete by" date

## Dev Agent Record
### Agent Model Used
### Completion Notes List
### File List
