# Story 6.1: Email Template Configuration

Status: done

> Epic: 6 — Communication & Notifications
> Generated: 2026-05-16
> Depends on: Epic 1 (vacancy/pipeline stages with `triggersEmail` flag), existing `EmailTemplate` model + `email-template-engine.ts` + `sendEmail()` in `lib/email.ts`, recruitment admin settings page (`/recruitment/admin/instellingen`)

## Story

As an admin,
I want to configure email templates per pipeline stage with variable substitution,
So that candidates receive professional, contextual communication at each step.

## Acceptance Criteria

**AC1:** Given I have `recruitment:admin` permission,
When I navigate to `/recruitment/admin/instellingen` email templates section,
Then I see a list of recruitment email templates: one per pipeline stage type + application confirmation + rejection.

**AC2:** Given I edit a template,
When the editor opens,
Then I can edit: subject line, body text (rich text HTML), and see available variables (`{{candidate_name}}`, `{{vacancy_title}}`, `{{entity_name}}`, `{{stage_name}}`, `{{rejection_reason}}`),
And a preview pane shows the rendered template with sample data.

**AC3:** Given I save a template,
When validation runs,
Then templates with unresolved/unknown variables show a warning (not blocking),
And templates are stored extending the existing EmailTemplate model (architecture decision AR11).

**AC4:** Given no template is configured for a stage,
When a candidate enters that stage,
Then no email is sent (opt-in per stage, not opt-out).

## Tasks / Subtasks

- [x] Task 1: Extend Prisma schema for recruitment email templates (AC: 1, 3)
  - [x] 1.1 Created separate `RecruitmentEmailTemplate` model (architecture decision: entity-scoped, not tied to existing NotificationType)
  - [x] 1.2 Model fields: id, entityId, type (RecruitmentEmailType enum), name, subject, body (Text), variables (Json), isActive, createdById, timestamps
  - [x] 1.3 Relations added: Entity → RecruitmentEmailTemplate[], User → RecruitmentEmailTemplate[] ("RecruitmentEmailTemplateCreator")
  - [x] 1.4 Schema synced via `npx prisma db push`

- [x] Task 2: Define recruitment email variable system (AC: 2)
  - [x] 2.1 Created `lib/recruitment/email-variables.ts` with RECRUITMENT_EMAIL_VARIABLES constant
  - [x] 2.2 Variables: candidate_name, candidate_first_name, candidate_last_name, vacancy_title, entity_name, stage_name, rejection_reason, application_date, portal_link
  - [x] 2.3 Created `renderRecruitmentTemplate()` function reusing `{{variable}}` pattern
  - [x] 2.4 Created `getUnresolvedVariables()` utility for AC3 warning

- [x] Task 3: API routes for recruitment email template CRUD (AC: 1, 3)
  - [x] 3.1 Created GET (list + seed) + POST (create) at `/api/recruitment/admin/email-templates/`
  - [x] 3.2 Created GET/PATCH/DELETE at `/api/recruitment/admin/email-templates/[id]/`
  - [x] 3.3 Created POST preview at `/api/recruitment/admin/email-templates/preview/`
  - [x] 3.4 Added Zod schemas in `lib/recruitment/schemas.ts`

- [x] Task 4: Admin UI — email templates section (AC: 1, 2, 3)
  - [x] 4.1 Created `components/recruitment/admin/email-templates-section.tsx`
  - [x] 4.2 List view grouped by type with active/inactive badge
  - [x] 4.3 Edit dialog with subject/body fields and clickable variable chips
  - [x] 4.4 Preview pane with debounced live rendering
  - [x] 4.5 Yellow warning for unresolved variables (non-blocking)
  - [x] 4.6 Integrated into `/recruitment/admin/instellingen` page

- [x] Task 5: Seed default templates (AC: 4)
  - [x] 5.1 Created `lib/recruitment/email-template-defaults.ts` with defaults for confirmation, stage transition, rejection
  - [x] 5.2 Defaults seeded with `isActive: false` (opt-in per AC4) via `?seed=entityId` GET param

- [x] Task 6: i18n keys for NL + FR (AC: all)
  - [x] 6.1 Added `recruitment.emailTemplates.*` keys to both `messages/nl.json` and `messages/fr.json`

## Dev Notes

### Architecture Decision: Separate model vs extend existing EmailTemplate

The existing `EmailTemplate` model is tightly coupled to `NotificationType` enum (WEEKLY_REMINDER, MONTHLY_SUMMARY, etc.) with a `@unique` constraint on `type`. This means only ONE template per type can exist globally.

**Decision: Create a NEW `RecruitmentEmailTemplate` model** because:
1. Recruitment templates are entity-scoped (each entity can have different templates)
2. Multiple templates per type needed (one per stage per vacancy, or at least per entity)
3. The existing enum is for internal digest notifications, not candidate-facing communications
4. Architecture doc says "extend" but the practical implementation requires a separate model with entity scope

### Existing Infrastructure to Reuse

- **Variable substitution**: Reuse `{{variable}}` pattern from `lib/email-template-engine.ts` → `renderEmailTemplate()` replaces `{{key}}` with values
- **Email sending**: Use `sendEmail()` from `lib/email.ts` which wraps SendGrid with audit logging
- **Admin page**: Extend existing `/recruitment/admin/instellingen` page that already has `SiteGroupsSection` and `ShareTemplatesSection`
- **Permission model**: `recruitment:admin` permission already exists in RBAC registry

### Project Structure Notes

- API routes follow: `app/api/recruitment/admin/email-templates/`
- Component: `components/recruitment/admin/email-templates-section.tsx`
- Library: `lib/recruitment/email-variables.ts`
- Existing patterns: all admin sections use client components with `useEffect` + fetch, shadcn/ui Dialog for edit forms

### Key Technical Constraints

- SendGrid is the email provider (`@sendgrid/mail` already installed)
- `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `MAIL_FROM`, `MAIL_REPLY_TO` env vars already configured
- Template body should support HTML (same pattern as existing `DEFAULT_TEMPLATES` in `email-template-engine.ts`)
- Entity-scoped: templates belong to an entity, admin sees only their entity's templates (via `visibleEntityIds`)
- NL/FR i18n for UI chrome, but template content itself is authored by admin (not translated by system)

### Previous Story Intelligence

- Epic 5 patterns: Zod schemas in `lib/recruitment/schemas.ts`, API routes with `requirePermission` + `visibleEntityIds`, client components with `useState` + fetch, `toast` for success/error feedback
- Admin section pattern (from `share-templates-section.tsx`): list + create/edit dialog, using shadcn Button/Dialog/Input components
- Pipeline stages already have `triggersEmail: Boolean` flag (set during vacancy creation) — this story configures WHAT to send, Story 6.2 handles WHEN to send

### References

- [Source: architecture.md#Communication Patterns] — SendGrid + EmailTemplate extension
- [Source: architecture.md#API & Communication Patterns] — `lib/recruitment/status-emails.ts` planned
- [Source: epics.md#Story 6.1] — Full AC definitions
- [Source: prisma/schema.prisma#EmailTemplate] — Existing model (lines 505-522)
- [Source: lib/email-template-engine.ts] — Variable substitution engine
- [Source: lib/email.ts#sendEmail] — Generic email sender with SendGrid

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation with no blockers.

### Completion Notes List

- Created separate `RecruitmentEmailTemplate` model instead of extending existing `EmailTemplate` (entity-scoped requirement)
- Reused existing `{{variable}}` substitution pattern from `email-template-engine.ts`
- All templates default to `isActive: false` (opt-in per AC4)
- Preview endpoint renders with sample data and detects unresolved variables
- Lazy seed: GET with `?seed=entityId` auto-creates defaults if none exist for that entity

### File List

- prisma/schema.prisma (modified — added RecruitmentEmailType enum + RecruitmentEmailTemplate model + relations)
- lib/recruitment/email-variables.ts (new — variable definitions, render function, unresolved detection)
- lib/recruitment/email-template-defaults.ts (new — default template content for seeding)
- lib/recruitment/schemas.ts (modified — added Zod schemas for email template CRUD)
- app/api/recruitment/admin/email-templates/route.ts (new — GET list + seed, POST create)
- app/api/recruitment/admin/email-templates/[id]/route.ts (new — GET, PATCH, DELETE)
- app/api/recruitment/admin/email-templates/preview/route.ts (new — POST preview render)
- components/recruitment/admin/email-templates-section.tsx (new — admin UI component)
- app/(authenticated)/recruitment/admin/instellingen/page.tsx (modified — integrated EmailTemplatesSection)
- messages/nl.json (modified — added recruitment.emailTemplates.* keys)
- messages/fr.json (modified — added recruitment.emailTemplates.* keys)
