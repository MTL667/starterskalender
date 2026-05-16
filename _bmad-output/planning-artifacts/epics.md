---
stepsCompleted: [1, 2, 3, 4]
status: 'complete'
completedAt: '2026-05-15'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
---

# Starterskalender Recruitment Module - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for the Recruitment Module, decomposing the requirements from the PRD, Architecture, and UX Design Specification into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Headhunter can create a vacancy from a reusable template linked to an existing job function
FR2: Headhunter can build vacancy content from modular blocks (intro, team description, requirements, benefits, media)
FR3: Headhunter can define hard requirements (dealbreakers) per vacancy that auto-filter candidates
FR4: Headhunter can define weighted nice-to-have preferences per vacancy that score candidates
FR5: Headhunter can attach photos from a central SharePoint library to vacancy content
FR6: Headhunter can publish a vacancy to make it visible on the entity's public page
FR7: Headhunter can unpublish or close a vacancy to stop accepting applications
FR8: Headhunter can configure pipeline stages per vacancy (add, remove, reorder stages)
FR9: Admin can create and manage vacancy templates available to headhunters
FR10: Candidate can apply to a vacancy without creating an account (one-click apply)
FR11: Candidate can upload a CV document as part of their application
FR12: Candidate can provide optional additional information (motivation, availability)
FR13: System stores candidate personal data with GDPR-compliant processing basis
FR14: Headhunter can view a complete candidate profile with all submitted data
FR15: Headhunter can manually add a candidate to a vacancy (direct entry without application form)
FR16: System auto-filters candidates who fail dealbreaker requirements
FR17: System scores candidates on nice-to-have criteria with configurable weights
FR18: Headhunter can view all candidates for a vacancy in a Kanban board organized by pipeline stage
FR19: Headhunter can move candidates between pipeline stages via drag and drop
FR20: Headhunter can move a candidate to "Rejected" triggering the rejection workflow
FR21: Headhunter can move a candidate to "Hired" triggering the starter creation flow
FR22: System sends configured status email to candidate on each pipeline stage transition
FR23: Users see pipeline changes made by other users within 2 seconds via server-sent events
FR24: Headhunter can define a scorecard template with evaluation criteria per vacancy
FR25: Reviewer can score a candidate on each criterion in the scorecard
FR26: Reviewer can add a text recommendation alongside their scores
FR27: Headhunter can view aggregated scores across all reviewers for a candidate
FR28: Headhunter can compare multiple candidates side-by-side on scores and qualifications (Phase 2)
FR29: Headhunter can view and edit all candidate data for vacancies within their entities
FR30: Headhunter can share a candidate with a specific Airport user, selecting which data fields are visible
FR31: Headhunter can set shared access as temporary (auto-expiring after evaluation) or permanent when sharing a candidate
FR32: Technical reviewer can view only the shared fields plus the evaluation form for shared candidates
FR33: Shared access automatically expires after the reviewer submits their evaluation
FR34: System logs all candidate data access with actor, timestamp, fields viewed, and access mechanism
FR35: Admin can configure default access templates per reviewer role (pre-defined field sets)
FR36: System sends automatic confirmation email to candidate upon application receipt
FR37: Admin can configure email templates per pipeline stage with variable substitution
FR38: Headhunter can manually trigger or suppress status emails for individual stage transitions
FR39: Users can post internal comments on a candidate's profile visible only to authorized colleagues
FR40: O365 mailbox sync links emails to/from candidate to their profile automatically (Phase 2)
FR41: Headhunter can mark emails as private to exclude them from candidate file (Phase 2)
FR42: System hosts public vacancy listing pages per entity with active vacancies
FR43: Candidate can view a dedicated public detail page per vacancy with structured content and apply button
FR44: Public pages are indexable by search engines with structured vacancy metadata (title, location, requirements)
FR45: Admin can configure site grouping (which entities share a public vacancy page)
FR46: System provides an embeddable vacancy display for external websites per site group (Phase 2)
FR47: System provides a headless REST/JSON API for vacancies per site group (Phase 2)
FR48: System generates unique QR codes linking to individual vacancy pages (Phase 2)
FR49: Admin can configure candidate data retention period as a system setting
FR50: System sends retention expiry notification to candidates before deletion
FR51: System removes candidate data after retention period, with a configurable grace period before permanent deletion, unless consent is renewed
FR52: Candidate can request export of all their stored personal data (right to access)
FR53: Candidate can request deletion of their data (right to erasure) with audit confirmation
FR54: System retains audit logs as immutable, append-only records independent of candidate data deletion
FR55: DPO can access audit reports showing all candidate data processing activities
FR56: System auto-creates a Starter record in Airport when candidate reaches "Hired" status, pre-filling from candidate data
FR57: System populates the created Starter with correct entity, job function, and start date from vacancy context
FR58: Candidate can continue using the same portal login after hire, transitioning from application status to pre-onboarding tasks
FR59: System integrates with existing Airport notification system for share requests and evaluation completions
FR60: System integrates with existing Airport RBAC v2 permission infrastructure
FR61: Management can view recruitment pipeline metrics per entity and globally on the Airport dashboard (Phase 3)
FR62: Management can view a funnel visualization showing candidate counts per pipeline stage (Phase 3)
FR63: System displays SLA indicators on vacancies where candidates exceed configured stage duration thresholds (Phase 3)

### NonFunctional Requirements

NFR1: Pipeline Kanban initial load < 1 second
NFR2: Drag & drop visual feedback < 100ms
NFR3: Public vacancy page LCP < 1.5 seconds
NFR4: Application form submission < 500ms server response
NFR5: Candidate profile load (full) < 1 second
NFR6: Shared reviewer view load < 2 seconds
NFR7: Search/filter within pipeline < 500ms
NFR8: All candidate personal data encrypted at rest (database-level encryption)
NFR9: All data in transit encrypted via TLS 1.3
NFR10: No candidate PII logged in application error logs or debug output
NFR11: Session-based authentication for all internal interfaces (existing NextAuth flow)
NFR12: Public application form protected against spam (rate limiting + honeypot, no CAPTCHA)
NFR13: Shared candidate views use time-limited, non-guessable session tokens
NFR14: File uploads (CV documents) scanned and stored outside web-accessible paths
NFR15: API endpoints validate input schemas at boundary — reject malformed input before processing
NFR16: Public vacancy pages and application form: WCAG 2.1 Level AA compliance
NFR17: Pipeline Kanban: keyboard operable (arrow keys for stage navigation, Enter to open candidate)
NFR18: Scorecard evaluation form: fully accessible via screen reader and keyboard
NFR19: All interactive elements have visible focus indicators
NFR20: Color is never the sole indicator of state (pipeline stages use icons + labels alongside color)
NFR21: Form validation errors announced to assistive technology
NFR22: Microsoft Graph API calls tolerate transient failures with retry logic (3 attempts, exponential backoff)
NFR23: SharePoint photo library integration handles unavailability gracefully (placeholder shown, no blocking error)
NFR24: SSE event bus connection auto-reconnects on disconnect (existing pattern)
NFR25: Pre-onboarding bridge operates as atomic transaction — candidate-to-starter creation either succeeds completely or rolls back
NFR26: Email delivery (SendGrid) failures logged but non-blocking — queued for retry
NFR27: System available during Belgian business hours (Mon–Fri, 08:00–18:00) with 99% uptime target
NFR28: Database backups: daily automated with 30-day retention (existing infrastructure)
NFR29: Zero data loss on candidate applications — submissions persisted before confirmation shown
NFR30: Graceful degradation: if Graph API unavailable, core recruitment flow (pipeline, evaluation) continues unaffected
NFR31: Public vacancy pages cached and served even during backend maintenance

### Additional Requirements

From Architecture document:

- AR1: Extend Prisma schema with recruitment models (Vacancy, VacancyStage, Candidate, CandidateShare, Evaluation) without breaking existing models
- AR2: Add recruitment permissions to RBAC v2 (recruitment:*, vacancy:*, candidate:*)
- AR3: Field-level access via CandidateShare model with visibleFields[] — app-layer filtering via shared maskCandidateForViewer utility
- AR4: Pipeline stages as VacancyStage table (vacancyId + name + order + isTerminal + triggersEmail)
- AR5: Document storage in SharePoint via Graph API — folder structure: /Recruitment/{Entity}/{Function}/{Candidate}/
- AR6: Kanban drag & drop via dnd-kit library
- AR7: Candidate portal via token-based URL (UUID in path, no login)
- AR8: Public API under /api/public/vacancies/ — separate unauthenticated route group
- AR9: Extend existing SSE event bus with recruitment-specific event types (recruitment:pipeline:*, recruitment:share:*, recruitment:vacancy:*)
- AR10: Vacancy content as JSON content blocks (typed array — no rich text editor dependency)
- AR11: Extend existing EmailTemplate model with recruitment-specific email types
- AR12: Email verification on application (confirm email before entering pipeline)
- AR13: API response format: { data: T } success, { error: { message, code } } error
- AR14: Dutch route naming for authenticated pages: vacatures, kandidaten (matching kalender, starters, taken)
- AR15: All recruitment code under app/(authenticated)/recruitment/, app/api/recruitment/, components/recruitment/, lib/recruitment/
- AR16: Zod schemas co-located with routes or in shared lib/recruitment/schemas.ts
- AR17: Public vacancy pages under app/jobs/[entityGroup]/ with ISR/on-demand revalidation
- AR18: Testing framework to be established for recruitment module

### UX Design Requirements

UX-DR1: Implement PipelineKanban component with dnd-kit — 6 states (loading skeleton, empty, active, dragging, drop target hover, SSE update animation), arrow key navigation, Space to grab
UX-DR2: Implement CandidateCard component — 7 states (default, hover with action icons, dragging, dealbreaker fail at 50% opacity, new <24h blue accent, SLA warning amber, SLA exceeded red), screen reader metadata announcement
UX-DR3: Implement ShareDialog component — reviewer picker, 3 template cards, access duration, real-time field preview, 7 states including custom mode with FieldPicker
UX-DR4: Implement ShareTemplateSelector component — 3 pre-defined template cards (Technical Review, HR Review, Custom), configurable via admin settings
UX-DR5: Implement FieldPicker component — two-column checkbox grid with category headers (Personal, Professional, Documents), grouped with role="group"
UX-DR6: Implement ScorecardForm component — criterion list with 5 rating dots each, recommendation textarea, submit only enabled when all criteria rated, 5 states
UX-DR7: Implement CandidateMoveDialog component — 3 variants: standard (email toggle + template), rejection (red, rejection template + reason), hired (green, expanded with starter fields)
UX-DR8: Implement ScoreRing component — 28px circle with score, 4 color states (green ≥4.0, amber 3.0-3.9, red <3.0, gray dashed no score), 3 sizes
UX-DR9: Implement DaysCounter component — clock icon + number + "d", 3 color states (gray ≤7d, amber 8-14d, red >14d)
UX-DR10: Implement ContentBlockEditor component — block types: Text, List, Requirements, Benefits, Media, with drag reorder and inline editing
UX-DR11: Implement VacancyCard component — public vacancy list item with title, location, type, entity badge, posted date, hover elevation
UX-DR12: Implement ApplicationForm component — 3 fields (email, CV upload, optional motivation), mobile-first, 5 states, privacy notice, file upload keyboard accessible
UX-DR13: Implement recruitment-specific color tokens — pipeline stage colors, score ring colors, SLA indicator colors, all with dark mode HSL variants
UX-DR14: Implement toast notification patterns — 8 recruitment-specific toasts (share sent, review submitted, vacancy published, draft saved, candidate moved, email sent, error, access revoked), top-right stacked, auto-dismiss 4s
UX-DR15: Implement empty states for all views — vacancy list, pipeline, talent pool, reviews, search results — each with illustration, headline, description, primary action button
UX-DR16: Implement skeleton loading screens matching final layout — pipeline (gray columns with card placeholders), vacancy list (card rows), candidate detail (tabs)
UX-DR17: Implement responsive breakpoint behavior — desktop-first for internal pages (xl primary), mobile-first for public pages (sm primary), tablet pipeline shows 3 columns with horizontal scroll
UX-DR18: Implement keyboard accessibility for pipeline — arrow keys between columns, Enter to open candidate, Space to grab for drag, Tab order: filter bar → columns left-to-right → cards top-to-bottom
UX-DR19: Implement button hierarchy consistently — primary blue (1 per view), secondary outlined, destructive red outlined (always behind confirmation), ghost icon-only for micro-actions
UX-DR20: Implement form patterns — single-column, validate on blur, autosave vacancy builder every 30s, conditional fields (field picker in custom mode, starter fields on hire)
UX-DR21: Implement navigation patterns — sidebar entry "Recruitment", candidate detail as dialog overlay on pipeline (URL updates with query param), settings as slide-over sheet, breadcrumbs on all pages except vacancy list
UX-DR22: Implement SSE reconnection pattern — amber banner below filter bar "Reconnecting..." on disconnect, auto-reconnect, banner disappears on success

## FR Coverage Map

| FR | Epic | Beschrijving |
|----|------|-------------|
| FR1 | Epic 1 | Vacancy from template |
| FR2 | Epic 1 | Modular content blocks |
| FR3 | Epic 1 | Dealbreakers configuration |
| FR4 | Epic 1 | Weighted nice-to-haves |
| FR5 | Epic 1 | SharePoint photo library |
| FR6 | Epic 1 | Publish vacancy |
| FR7 | Epic 1 | Unpublish/close vacancy |
| FR8 | Epic 1 | Configurable pipeline stages |
| FR9 | Epic 1 | Admin vacancy templates |
| FR10 | Epic 3 | One-click apply |
| FR11 | Epic 3 | CV upload |
| FR12 | Epic 3 | Optional additional info |
| FR13 | Epic 3 | GDPR-compliant data storage |
| FR14 | Epic 3 | Complete candidate profile view |
| FR15 | Epic 2 | Manual candidate add |
| FR16 | Epic 3 | Auto-filter on dealbreakers |
| FR17 | Epic 3 | Score on nice-to-haves |
| FR18 | Epic 2 | Kanban board view |
| FR19 | Epic 2 | Drag & drop between stages |
| FR20 | Epic 6 | Rejection workflow |
| FR21 | Epic 8 | Hired → Starter creation |
| FR22 | Epic 6 | Status email on transition |
| FR23 | Epic 2 | Real-time SSE updates |
| FR24 | Epic 5 | Scorecard template per vacancy |
| FR25 | Epic 5 | Reviewer scores criteria |
| FR26 | Epic 5 | Text recommendation |
| FR27 | Epic 5 | Aggregated scores view |
| FR28 | Epic 5 | Side-by-side comparison (Phase 2) |
| FR29 | Epic 4 | Entity-scoped candidate access |
| FR30 | Epic 4 | Share with field selection |
| FR31 | Epic 4 | Temporary/permanent access |
| FR32 | Epic 4 | Reviewer scoped view |
| FR33 | Epic 4 | Auto-expire after evaluation |
| FR34 | Epic 4 | Audit all data access |
| FR35 | Epic 4 | Default access templates |
| FR36 | Epic 6 | Confirmation email on apply |
| FR37 | Epic 6 | Configurable email templates |
| FR38 | Epic 6 | Manual trigger/suppress emails |
| FR39 | Epic 6 | Internal comments |
| FR40 | Epic 6 | O365 mailbox sync (Phase 2) |
| FR41 | Epic 6 | Mark emails private (Phase 2) |
| FR42 | Epic 3 | Public vacancy listing pages |
| FR43 | Epic 3 | Public vacancy detail page |
| FR44 | Epic 3 | SEO with structured metadata |
| FR45 | Epic 3 | Site grouping configuration |
| FR46 | Epic 3 | Embeddable widget (Phase 2) |
| FR47 | Epic 3 | Headless REST API (Phase 2) |
| FR48 | Epic 3 | QR codes (Phase 2) |
| FR49 | Epic 7 | Configurable retention period |
| FR50 | Epic 7 | Retention expiry notification |
| FR51 | Epic 7 | Automated deletion with grace period |
| FR52 | Epic 7 | Right to access (data export) |
| FR53 | Epic 7 | Right to erasure |
| FR54 | Epic 7 | Immutable audit logs |
| FR55 | Epic 7 | DPO audit reports |
| FR56 | Epic 8 | Auto-create Starter on hire |
| FR57 | Epic 8 | Pre-fill Starter from vacancy |
| FR58 | Epic 8 | Candidate portal → onboarding transition |
| FR59 | Epic 6 | Notification system integration |
| FR60 | Epic 1 | RBAC v2 integration |
| FR61 | Epic 9 | Pipeline metrics dashboard (Phase 3) |
| FR62 | Epic 9 | Funnel visualization (Phase 3) |
| FR63 | Epic 9 | SLA indicators (Phase 3) |

## Epic List

### Epic 1: Vacancy Creation & Management

Headhunter kan vacatures aanmaken vanuit templates, content opbouwen met modulaire blokken, dealbreakers en gewogen preferences configureren, pipeline stages instellen, en vacatures publiceren of sluiten. Inclusief de foundational setup: aparte feature branch, Prisma schema extension, en RBAC v2 recruitment permissions.

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR60
**Dependencies:** None — eerste epic, legt de basis.
**Notes:** FR60 (RBAC) en de aparte branch zijn de eerste stories. Alle volgende epics bouwen op de hier aangemaakte database models en permission structuur.

---

### Epic 2: Pipeline & Candidate Tracking

Headhunter kan alle kandidaten voor een vacature bekijken op een Kanban bord georganiseerd per pipeline stage, kandidaten tussen stages slepen via drag & drop, en real-time updates van andere gebruikers zien. Handmatig kandidaten toevoegen mogelijk.

**FRs covered:** FR15, FR18, FR19, FR23
**Dependencies:** Epic 1 (vacatures met stages moeten bestaan)
**Notes:** Bouwt voort op de pipeline stages uit Epic 1. Nog geen email-triggers bij stage moves — dat komt in Epic 6.

---

### Epic 3: Public Presence & Candidate Application

Kandidaten kunnen vacatures vinden op publieke pagina's met SEO, solliciteren zonder account met one-click apply en CV upload. Systeem filtert automatisch op dealbreakers en scoort op preferences. Admin configureert site grouping.

**FRs covered:** FR10, FR11, FR12, FR13, FR14, FR16, FR17, FR42, FR43, FR44, FR45, FR46, FR47, FR48
**Dependencies:** Epic 1 (vacatures moeten bestaan), Epic 2 (pipeline moet kandidaten kunnen ontvangen)
**Notes:** FR46-48 (embeddable widget, headless API, QR codes) zijn Phase 2 stories binnen deze epic.

---

### Epic 4: Collaboration & Scoped Sharing

Headhunter kan kandidaatdata delen met specifieke Airport-gebruikers, per veld bepalen wat zichtbaar is, tijdelijke of permanente toegang instellen, en alle data-toegang wordt geaudit. Dit is het USP-feature van de module.

**FRs covered:** FR29, FR30, FR31, FR32, FR33, FR34, FR35
**Dependencies:** Epic 2 (kandidaten in pipeline)
**Notes:** CandidateShare model met visibleFields[] is de kern. Share templates (FR35) versnellen 80% van de use cases.

---

### Epic 5: Evaluation & Scoring

Headhunter kan scorecard templates definiëren per vacature. Reviewers evalueren kandidaten met criteria-scores en tekst-aanbeveling. Headhunter ziet geaggregeerde scores en kan kandidaten vergelijken.

**FRs covered:** FR24, FR25, FR26, FR27, FR28
**Dependencies:** Epic 4 (reviewer heeft gedeelde toegang nodig)
**Notes:** FR28 (side-by-side comparison) is Phase 2. ScorecardForm component is de primaire UI.

---

### Epic 6: Communication & Notifications

Systeem stuurt automatische statusmails bij pipeline-transities, admin configureert email templates met variabelen, headhunter kan emails handmatig triggeren of onderdrukken. Interne comments op kandidaat-profielen. Rejection workflow met reden en template.

**FRs covered:** FR20, FR22, FR36, FR37, FR38, FR39, FR40, FR41, FR59
**Dependencies:** Epic 2 (pipeline stage transitions), Epic 3 (application receipt triggers FR36)
**Notes:** FR40-41 (O365 mailbox sync, private emails) zijn Phase 2 stories. FR59 integreert met het bestaande Airport notification systeem.

---

### Epic 7: Compliance & Data Lifecycle

Admin configureert retentieperiode, systeem stuurt automatische verwijder-notificaties, data wordt na grace period permanent verwijderd. Kandidaten kunnen hun data opvragen (right to access) en laten verwijderen (right to erasure). DPO heeft toegang tot audit reports. Audit logs zijn immutable.

**FRs covered:** FR49, FR50, FR51, FR52, FR53, FR54, FR55
**Dependencies:** Epic 3 (kandidaatdata moet bestaan)
**Notes:** GDPR-compliance epic. Audit log infrastructure (FR54) wordt deels in Epic 4 opgezet (access logging) en hier uitgebreid tot volledig DPO-rapportage systeem.

---

### Epic 8: Hire-to-Onboarding Bridge

Wanneer headhunter een kandidaat naar "Hired" verplaatst, wordt automatisch een Starter record aangemaakt in Airport met pre-filled data (entiteit, functie, startdatum). Kandidaat-portal transitie naar pre-onboarding taken.

**FRs covered:** FR21, FR56, FR57, FR58
**Dependencies:** Epic 2 (pipeline move action), Epic 6 (hire confirmation flow)
**Notes:** Dit is de cirkel-rond feature: recruitment → onboarding in één platform. Atomic transaction — alles slaagt of alles faalt.

---

### Epic 9: Dashboard & Analytics (Phase 3)

Management kan pipeline metrics per entiteit en globaal bekijken, funnel visualisatie per vacature inzien, en SLA indicators worden getoond bij vacatures waar kandidaten te lang in een stage zitten.

**FRs covered:** FR61, FR62, FR63
**Dependencies:** Epic 2 (pipeline data), Epic 3 (candidate flow data)
**Notes:** Phase 3 epic. Levert management self-service zonder de headhunter te belasten.

---

## Epic 1: Vacancy Creation & Management

### Story 1.1: Recruitment Module Foundation & RBAC Setup

As a headhunter,
I want the recruitment module to exist in Airport with proper access control,
So that I can access recruitment features based on my role and entity membership.

**Acceptance Criteria:**

**Given** the recruitment module does not yet exist in Airport
**When** a developer deploys this story
**Then** a feature branch `feature/recruitment-module` is created from main
**And** the Prisma schema is extended with `Vacancy` model (id, title, entityId, functionId, status, content, createdAt, updatedAt, createdById) and `VacancyStage` model (id, vacancyId, name, order, isTerminal, triggersEmail)
**And** RBAC v2 is extended with permissions: `recruitment:read`, `recruitment:write`, `recruitment:admin`, `vacancy:create`, `vacancy:edit`, `vacancy:publish`, `vacancy:delete`, `candidate:read`, `candidate:write`, `candidate:share`
**And** the route group `app/(authenticated)/recruitment/` exists with a placeholder page
**And** the sidebar navigation shows "Recruitment" (icon: Users) for users with `recruitment:read` permission
**And** API routes exist under `app/api/recruitment/` with proper auth middleware
**And** `lib/recruitment/` directory exists with `permissions.ts`, `schemas.ts`, and `types.ts`
**And** Dutch route naming is used: `/recruitment/vacatures` (not `/recruitment/vacancies`)

---

### Story 1.2: Vacancy CRUD with Basic Fields

As a headhunter,
I want to create, view, edit, and delete vacancies with basic information,
So that I can start managing open positions for my entities.

**Acceptance Criteria:**

**Given** I have `vacancy:create` permission for my entity
**When** I navigate to `/recruitment/vacatures/nieuw`
**Then** I see a form with fields: title, entity (filtered to my entities), job function, employment type, location, and description (plain text)
**And** all form inputs are validated with Zod schemas at the API boundary
**And** on successful submission I am redirected to the vacancy detail page
**And** the vacancy appears in the list at `/recruitment/vacatures`

**Given** I am on the vacancy list page
**When** I view the list
**Then** I see all vacancies for my entities with title, entity badge, status, and created date
**And** I can filter by entity and status (draft, published, closed)

**Given** I have `vacancy:edit` permission
**When** I navigate to a vacancy's edit page
**Then** I can update all basic fields and save
**And** validation errors are shown inline per field

**Given** I have `vacancy:delete` permission
**When** I click delete on a draft vacancy
**Then** a destructive confirmation dialog appears (red outlined button, not primary)
**And** on confirmation the vacancy is soft-deleted

---

### Story 1.3: Vacancy Content Block Builder

As a headhunter,
I want to build rich vacancy descriptions using modular content blocks,
So that I can create professional, structured vacancy pages without a WYSIWYG editor.

**Acceptance Criteria:**

**Given** I am editing a vacancy
**When** I open the content builder tab
**Then** I see an ordered list of content blocks, each with a type icon, content area, and drag handle
**And** I can add blocks of type: Text (rich paragraph), List (bullet items), Requirements (dealbreaker/nice-to-have tagged), Benefits (icon + text)

**Given** I have multiple content blocks
**When** I drag a block's handle
**Then** the block lifts visually and I can reorder it among other blocks
**And** the new order persists immediately

**Given** I am editing a content block
**When** I click into the content area
**Then** I can edit inline (Enter to edit, Escape to stop)
**And** the vacancy builder autosaves every 30 seconds
**And** a "Draft saved" toast confirms each autosave

**Given** the vacancy has content blocks
**When** I view the vacancy detail
**Then** blocks render in order as structured content (JSON stored, React components rendered)

---

### Story 1.4: Vacancy Templates

As a headhunter,
I want to create a vacancy from a reusable template,
So that I can quickly set up new vacancies with pre-configured content, stages, and criteria.

**Acceptance Criteria:**

**Given** I have `recruitment:admin` permission
**When** I navigate to `/recruitment/admin/templates`
**Then** I see a list of existing vacancy templates with name, linked function, and usage count
**And** I can create a new template with: name, default content blocks, default pipeline stages, default dealbreakers, and default nice-to-haves

**Given** templates exist for my entities
**When** I create a new vacancy at `/recruitment/vacatures/nieuw`
**Then** I first see a template selector showing available templates
**And** selecting a template pre-fills content blocks, pipeline stages, and criteria configuration
**And** I can still edit all pre-filled values before saving

**Given** I select "Blank vacancy" in the template selector
**When** I proceed
**Then** I get an empty vacancy form with default pipeline stages (Applied, Screening, Interview, Offer, Hired, Rejected)

---

### Story 1.5: Dealbreakers & Nice-to-Have Configuration

As a headhunter,
I want to define hard requirements and weighted preferences per vacancy,
So that candidates are automatically filtered and scored when they apply.

**Acceptance Criteria:**

**Given** I am editing a vacancy
**When** I open the criteria configuration tab
**Then** I see two sections: "Dealbreakers" (hard requirements) and "Nice-to-haves" (weighted preferences)

**Given** I am in the Dealbreakers section
**When** I add a dealbreaker
**Then** I can specify: criterion name, type (boolean yes/no, minimum value, selection from options), and the required value
**And** each dealbreaker has a clear label explaining what disqualifies a candidate

**Given** I am in the Nice-to-haves section
**When** I add a preference
**Then** I can specify: criterion name, type (scale 1-5, boolean, selection), and a weight (1-10)
**And** the total weight distribution is shown as a percentage breakdown

**Given** I have configured criteria
**When** I save the vacancy
**Then** dealbreakers and nice-to-haves are stored as structured JSON per vacancy
**And** they are available for the candidate scoring engine (Epic 3)

---

### Story 1.6: Pipeline Stage Configuration

As a headhunter,
I want to configure the pipeline stages for each vacancy,
So that the recruitment process matches the specific requirements of each role.

**Acceptance Criteria:**

**Given** I am editing a vacancy
**When** I open the pipeline configuration tab
**Then** I see the current stages in order with: name, terminal flag, and email trigger toggle

**Given** I am viewing the stage list
**When** I click "Add stage"
**Then** I can add a new stage with a name, position in the order, and email trigger setting
**And** the stage appears in the configured position

**Given** I have multiple stages
**When** I drag a stage to reorder
**Then** the order updates and persists
**And** "Applied" always remains first and "Hired"/"Rejected" always remain as terminal stages (cannot be reordered away from terminal position)

**Given** I have a non-terminal, non-default stage
**When** I click remove on that stage
**Then** a confirmation appears warning about candidates currently in that stage (if any)
**And** on confirmation, the stage is removed

**Given** a vacancy was created from a template
**When** I view the pipeline configuration
**Then** the template's default stages are pre-filled but fully editable

---

### Story 1.7: Vacancy Publishing & Lifecycle

As a headhunter,
I want to publish, unpublish, and close vacancies,
So that I control when positions are visible to candidates and when they stop accepting applications.

**Acceptance Criteria:**

**Given** I have a draft vacancy with at least title, one content block, and pipeline stages configured
**When** I click "Publish" (primary blue button)
**Then** the vacancy status changes to "published"
**And** a success toast "Vacancy published" appears
**And** the vacancy becomes available for public pages (Epic 3)
**And** an SSE event `recruitment:vacancy:published` is emitted

**Given** I have a published vacancy
**When** I click "Unpublish"
**Then** the vacancy status changes to "draft"
**And** it is no longer visible on public pages
**And** existing candidates in the pipeline remain unaffected

**Given** I have a published vacancy
**When** I click "Close vacancy"
**Then** a confirmation dialog appears explaining that no new applications will be accepted
**And** on confirmation, status changes to "closed"
**And** the public page shows "This vacancy is no longer available"
**And** candidates already in pipeline can still progress

**Given** I try to publish a vacancy without required fields
**When** I click "Publish"
**Then** validation errors indicate which fields are missing (inline, not blocking)

---

### Story 1.8: SharePoint Photo Library Integration

As a headhunter,
I want to attach photos from our central SharePoint library to vacancy content,
So that vacancies include team photos and office images without manual upload.

**Acceptance Criteria:**

**Given** I am editing a vacancy content block of type "Media"
**When** I click "Add image"
**Then** a dialog opens showing the SharePoint photo library for my entity (via Graph API)
**And** I can browse folders and search photos by name

**Given** I am in the photo library browser
**When** I select a photo
**Then** a preview is shown with dimensions
**And** on confirmation, the photo reference (SharePoint URL) is stored in the content block
**And** the photo renders in the vacancy content preview

**Given** the SharePoint Graph API is unavailable
**When** I try to open the photo library
**Then** a friendly error message appears: "Photo library temporarily unavailable"
**And** the rest of the vacancy editor remains fully functional (graceful degradation per NFR23/NFR30)

**Given** I have a photo in a content block
**When** I view the published vacancy
**Then** the photo loads from SharePoint with appropriate caching headers

---

## Epic 2: Pipeline & Candidate Tracking

### Story 2.1: Candidate Model & Manual Candidate Entry

As a headhunter,
I want to manually add a candidate to a vacancy pipeline,
So that I can track candidates who come through direct channels (referrals, LinkedIn, walk-ins) without requiring them to apply online.

**Acceptance Criteria:**

**Given** I have `candidate:write` permission
**When** a developer deploys this story
**Then** the Prisma schema is extended with `Candidate` model (id, vacancyId, stageId, firstName, lastName, email, phone, source, notes, dealbreakersResult, niceToHaveScore, createdAt, updatedAt) and `CandidateApplication` model (id, candidateId, cvUrl, motivation, appliedAt)

**Given** I am on a vacancy detail page
**When** I click "Add candidate" (secondary button)
**Then** a dialog opens with fields: first name, last name, email, phone, source (dropdown: Direct, Referral, LinkedIn, Other), and notes
**And** all fields validate with Zod (email format, required first/last name)

**Given** I fill in the required fields
**When** I submit the form
**Then** the candidate is created in the first pipeline stage ("Applied")
**And** the candidate card appears in the first column of the Kanban board
**And** a success toast "Candidate added" confirms the action

**Given** a candidate with the same email already exists for this vacancy
**When** I try to add them
**Then** an inline error shows "This candidate already exists for this vacancy"

---

### Story 2.2: Pipeline Kanban Board

As a headhunter,
I want to view all candidates for a vacancy on a Kanban board organized by pipeline stage,
So that I have a visual overview of where every candidate is in the process.

**Acceptance Criteria:**

**Given** I have `recruitment:read` permission and navigate to `/recruitment/vacatures/[id]`
**When** the page loads
**Then** I see a horizontal Kanban board with one column per configured pipeline stage
**And** each column header shows the stage name and candidate count
**And** columns are ordered left-to-right matching the stage order
**And** the board loads in under 1 second (NFR1)

**Given** the pipeline is loading
**When** data is being fetched
**Then** I see skeleton columns with placeholder cards (gray rectangles matching card dimensions)

**Given** a vacancy has no candidates yet
**When** I view the pipeline
**Then** I see empty columns with an illustration and message "Waiting for applications" in the first stage column
**And** a primary action button "Add candidate" is visible

**Given** a vacancy has candidates in multiple stages
**When** I view the pipeline
**Then** candidates are displayed as cards within their respective stage columns
**And** columns with many candidates are vertically scrollable
**And** the board is horizontally scrollable if stages exceed viewport width

**Given** I am viewing the pipeline
**When** I use the filter bar above the board
**Then** I can filter candidates by: source, score range, days in stage
**And** filters apply instantly (<500ms per NFR7)

---

### Story 2.3: Candidate Card Component

As a headhunter,
I want candidate cards to show key information at a glance,
So that I can assess candidate status without opening each profile.

**Acceptance Criteria:**

**Given** a candidate exists in the pipeline
**When** their card renders
**Then** it shows: full name (top-left), entity badge (top-right), days in stage with clock icon (metadata row), source label (metadata row)
**And** bottom row shows: dealbreaker badge (pass/fail), score ring (if scored), review count

**Given** a candidate card is in default state
**When** I hover over it
**Then** the card elevates with shadow and action icons appear (share, comment, open)

**Given** a candidate was added less than 24 hours ago
**When** the card renders
**Then** it has a subtle blue left-border accent indicating "new"

**Given** a candidate has been in their current stage for 8-14 days
**When** the card renders
**Then** the days counter turns amber (SLA warning)

**Given** a candidate has been in their current stage for more than 14 days
**When** the card renders
**Then** the days counter turns red (SLA exceeded)

**Given** a candidate failed one or more dealbreakers
**When** the card renders
**Then** the card shows at 50% opacity with a red X badge

**Given** a screen reader user focuses a candidate card
**When** focus lands on the card
**Then** it announces: "{Name}, {Entity}, score {X.X}, {N} days in stage"

---

### Story 2.4: Drag & Drop Stage Transitions

As a headhunter,
I want to move candidates between pipeline stages by dragging their card,
So that I can quickly progress candidates through the recruitment process.

**Acceptance Criteria:**

**Given** I have `candidate:write` permission and am viewing the pipeline
**When** I grab a candidate card (mouse down or Space key)
**Then** the card lifts with a shadow, the source column dims slightly
**And** visual feedback appears within 100ms of the grab action (NFR2)

**Given** I am dragging a candidate card
**When** I hover over a valid target column
**Then** the column border pulses with the stage color indicating a valid drop target

**Given** I drop a candidate card in a new stage column
**When** the drop completes
**Then** the card optimistically moves to the new column immediately
**And** an API call fires to persist the stage transition
**And** if the API call fails, the card animates back to its original position with an error toast

**Given** I drop a candidate in an intermediate (non-terminal) stage
**When** the drop completes
**Then** the move is recorded with timestamp, actor, from-stage, and to-stage

**Given** I drop a candidate in a terminal stage ("Rejected" or "Hired")
**When** the drop completes
**Then** a CandidateMoveDialog appears for confirmation before persisting (details in Epic 6/8)
**And** if I cancel, the card returns to its source column

**Given** I am dragging a card
**When** I press Escape or drop outside any column
**Then** the card animates back to its original position

---

### Story 2.5: Real-Time Pipeline Updates via SSE

As a headhunter,
I want to see changes made by other users on the same pipeline in real-time,
So that I always have an accurate view of the current state without refreshing.

**Acceptance Criteria:**

**Given** I am viewing a vacancy pipeline
**When** another user moves a candidate to a different stage
**Then** I see the candidate card animate to its new column within 2 seconds (FR23)
**And** the card briefly highlights to indicate it was moved externally

**Given** I am viewing a vacancy pipeline
**When** another user adds a new candidate
**Then** the new candidate card animates into the first stage column with a subtle highlight

**Given** the SSE connection drops
**When** disconnection is detected
**Then** an amber banner appears below the filter bar: "Reconnecting..."
**And** the system attempts auto-reconnect with exponential backoff

**Given** the SSE connection reconnects
**When** connection is re-established
**Then** the amber banner disappears
**And** the pipeline state is reconciled with the server (fetch latest state)

**Given** I am actively dragging a candidate
**When** an SSE update arrives for that same candidate
**Then** the update is queued and applied after my drag operation completes (no interruption)

---

### Story 2.6: Pipeline Keyboard Accessibility

As a headhunter who uses keyboard navigation,
I want to operate the pipeline board entirely with keyboard,
So that I can manage candidates efficiently without a mouse.

**Acceptance Criteria:**

**Given** I am on the pipeline page
**When** I press Tab
**Then** focus moves through: filter bar → first stage column header → first card in that column
**And** focus indicators are clearly visible on all interactive elements (NFR19)

**Given** focus is on a stage column header
**When** I press Left/Right arrow keys
**Then** focus moves to the previous/next stage column header

**Given** focus is on a candidate card
**When** I press Up/Down arrow keys
**Then** focus moves to the previous/next card within the same column

**Given** focus is on a candidate card
**When** I press Enter
**Then** the candidate detail view opens (dialog overlay)

**Given** focus is on a candidate card
**When** I press Space
**Then** the card enters "grabbed" state (announced to screen reader: "Grabbed {Name}, use arrow keys to move between stages")
**And** Left/Right arrow keys now move the card between stage columns
**And** pressing Space again drops the card in the current column
**And** pressing Escape cancels and returns the card to its original position

---

## Epic 3: Public Presence & Candidate Application

### Story 3.1: Public Vacancy Listing Page

As a candidate,
I want to browse all open vacancies for an organization on a public page,
So that I can discover relevant job opportunities without needing an account.

**Acceptance Criteria:**

**Given** an entity group has published vacancies
**When** a visitor navigates to `/jobs/[entityGroup]`
**Then** they see a server-side rendered page listing all active vacancies for that entity group
**And** each vacancy shows: title, location, employment type, entity badge, posted date, and short description (VacancyCard component)
**And** the page has a Largest Contentful Paint under 1.5 seconds (NFR3)

**Given** the page is rendered
**When** a search engine crawls it
**Then** it finds proper meta tags (title, description, og:image) and structured data (JobPosting schema)
**And** the page is indexable with canonical URL

**Given** a vacancy is published or unpublished
**When** the change is saved
**Then** the public listing page revalidates (ISR on-demand) within 60 seconds

**Given** a visitor is on mobile
**When** they view the vacancy listing
**Then** the layout is mobile-first responsive: full-width cards, touch-friendly spacing, readable at 320px viewport

**Given** all vacancies for an entity group are closed
**When** a visitor navigates to the page
**Then** they see a friendly empty state: "No open positions at the moment" with organization info

---

### Story 3.2: Public Vacancy Detail Page

As a candidate,
I want to view full details of a specific vacancy,
So that I can decide whether to apply based on complete information.

**Acceptance Criteria:**

**Given** a published vacancy exists
**When** a visitor navigates to `/jobs/[entityGroup]/[vacancyId]`
**Then** they see the vacancy title, entity name, location, employment type, and all content blocks rendered in order
**And** a prominent "Apply" button (primary blue, sticky on mobile) is visible
**And** the page is server-side rendered with structured data (JobPosting)

**Given** the vacancy has content blocks of different types
**When** the page renders
**Then** Text blocks render as formatted paragraphs
**And** List blocks render as bullet lists
**And** Requirements blocks render with dealbreaker/nice-to-have labels
**And** Benefits blocks render with icons
**And** Media blocks render images from SharePoint

**Given** a vacancy is closed or unpublished
**When** a visitor navigates to its detail page
**Then** they see: "This vacancy is no longer available" with a link back to the listing page
**And** the page returns a 410 Gone status for SEO

**Given** WCAG 2.1 AA requirements
**When** the page renders
**Then** all text meets minimum contrast ratio (4.5:1)
**And** all interactive elements have visible focus indicators
**And** the page is fully navigable by keyboard

---

### Story 3.3: One-Click Application Form

As a candidate,
I want to apply to a vacancy with minimal effort,
So that I can submit my application in under 30 seconds without creating an account.

**Acceptance Criteria:**

**Given** I am on a public vacancy detail page
**When** I click "Apply"
**Then** I see a form with: email (required), CV upload zone (required, accepts .pdf/.docx, max 10MB), and optional motivation textarea
**And** a privacy notice with link to privacy policy is visible below the form
**And** the form is mobile-first designed with large touch targets

**Given** I fill in my email and upload a CV
**When** I click "Submit Application"
**Then** the form submits in under 500ms server response (NFR4)
**And** my application data is persisted before the confirmation is shown (NFR29: zero data loss)
**And** I see a success state: "Application submitted! Check your email to confirm."

**Given** I submit an application
**When** the system processes it
**Then** an email verification is sent to my email address (AR12)
**And** the candidate record is created with status "pending_verification"
**And** the candidate only enters the pipeline after email verification

**Given** spam protection is active
**When** a bot submits the form
**Then** rate limiting blocks more than 5 applications per IP per hour
**And** honeypot fields catch automated submissions
**And** no CAPTCHA is shown to real users (NFR12)

**Given** I try to upload an invalid file
**When** I select a file that exceeds 10MB or has wrong format
**Then** inline validation shows the error immediately (before submission)
**And** the file input is keyboard accessible

**Given** I submit with an invalid email format
**When** validation runs on blur
**Then** an inline error appears below the email field linked via aria-describedby (NFR21)

---

### Story 3.4: Candidate Data Processing & Profile

As a headhunter,
I want to view a complete candidate profile with all submitted data,
So that I can assess the candidate's full application in one place.

**Acceptance Criteria:**

**Given** a candidate has applied and verified their email
**When** I navigate to their profile (via pipeline card click)
**Then** I see a dialog overlay on the pipeline page (URL updates with query param per UX-DR21)
**And** the profile shows tabs: Overview (personal data, source, applied date), CV (embedded viewer or download link), Motivation (if provided), Timeline (all stage transitions)

**Given** I view a candidate profile
**When** the data loads
**Then** all personal data is stored with processing basis "legitimate interest: recruitment" (GDPR per FR13)
**And** the processing basis is visible in the profile footer

**Given** I have `candidate:read` permission for the candidate's entity
**When** I access their profile
**Then** I see all submitted fields
**And** an audit log entry is created recording my access (actor, timestamp, fields viewed)

**Given** a candidate applied via the public form
**When** their CV was uploaded
**Then** the CV is stored in SharePoint under `/Recruitment/{Entity}/{Function}/{Candidate}/` (AR5)
**And** I can download or preview it from the profile

---

### Story 3.5: Automatic Dealbreaker Filtering & Scoring

As a headhunter,
I want candidates to be automatically evaluated against my vacancy criteria,
So that I can instantly see who qualifies and how well they match.

**Acceptance Criteria:**

**Given** a vacancy has dealbreakers configured and a new candidate enters the pipeline
**When** the candidate's application data is processed
**Then** the system evaluates each dealbreaker against the candidate's responses
**And** candidates who fail any dealbreaker are marked with `dealbreakersResult: FAIL`
**And** their card shows at 50% opacity with red X badge in the pipeline

**Given** a vacancy has nice-to-have criteria with weights
**When** a candidate's application is processed
**Then** the system calculates a weighted score (0-5 scale) based on matching criteria
**And** the score is stored as `niceToHaveScore` on the candidate record
**And** the score is displayed via ScoreRing on the candidate card

**Given** a candidate fails dealbreakers
**When** the headhunter views the pipeline
**Then** failed candidates are still visible in their stage (not auto-rejected)
**And** the headhunter can still manually progress them if desired (override)

**Given** criteria cannot be automatically evaluated (e.g., free-text requirements)
**When** the system processes the application
**Then** those criteria are marked as "manual review needed"
**And** the partial score reflects only automatically evaluable criteria

---

### Story 3.6: Site Grouping Configuration

As an admin,
I want to configure which entities share a public vacancy page,
So that organizations with multiple entities can present a unified jobs page.

**Acceptance Criteria:**

**Given** I have `recruitment:admin` permission
**When** I navigate to `/recruitment/admin/instellingen`
**Then** I see a "Site Groups" section showing existing groups

**Given** I am in the Site Groups section
**When** I create a new site group
**Then** I can specify: group name, URL slug (used in `/jobs/[slug]`), and select which entities belong to this group
**And** an entity can belong to only one site group

**Given** a site group exists with multiple entities
**When** a visitor navigates to the group's vacancy page
**Then** they see vacancies from all entities in that group
**And** each vacancy shows which entity it belongs to via entity badge

**Given** I change a site group's entity composition
**When** I save the change
**Then** the public vacancy page revalidates immediately
**And** vacancies from removed entities disappear, new entity vacancies appear

---

### Story 3.7: Embeddable Vacancy Widget (Phase 2)

As an admin,
I want to embed a vacancy display on external websites,
So that partner organizations can show our open positions on their own sites.

**Acceptance Criteria:**

**Given** I have `recruitment:admin` permission
**When** I navigate to widget configuration
**Then** I can generate an embed code per site group
**And** the embed code is a single script tag that renders a styled vacancy list

**Given** an external website includes the embed code
**When** the page loads
**Then** the widget displays active vacancies for the configured site group
**And** the widget is styled independently (does not conflict with host page styles)
**And** clicking a vacancy opens the full vacancy page in a new tab

**Given** a vacancy is published or closed
**When** the change propagates
**Then** the widget updates automatically (within 5 minutes)

---

### Story 3.8: Headless Vacancy API (Phase 2)

As an external developer,
I want a JSON API for vacancies per site group,
So that I can build custom vacancy displays on external platforms.

**Acceptance Criteria:**

**Given** a valid site group exists
**When** I call `GET /api/public/vacancies?siteGroup=[slug]`
**Then** I receive a JSON response with: array of active vacancies (title, location, type, entity, publishedAt, detailUrl)
**And** the response includes pagination (total count, page, limit)

**Given** I want a specific vacancy's full content
**When** I call `GET /api/public/vacancies/[id]`
**Then** I receive full vacancy data including rendered content blocks as structured JSON
**And** the response includes apply URL

**Given** no authentication is provided
**When** I call the public API
**Then** rate limiting applies (100 requests per minute per IP)
**And** only published vacancies are returned

---

### Story 3.9: Vacancy QR Codes (Phase 2)

As a headhunter,
I want unique QR codes for each vacancy,
So that I can use them on printed materials, posters, and at events for direct mobile access.

**Acceptance Criteria:**

**Given** a vacancy is published
**When** I view the vacancy detail in the admin
**Then** I see a "QR Code" button that generates/shows a QR code linking to the public vacancy page

**Given** I click the QR code button
**When** the QR code is generated
**Then** it links to the canonical URL of the vacancy's public detail page
**And** I can download the QR code as PNG (high-res, suitable for print)

**Given** a candidate scans the QR code
**When** they open it on their phone
**Then** they land on the mobile-optimized vacancy detail page with the apply button visible

---

## Epic 4: Collaboration & Scoped Sharing

### Story 4.1: CandidateShare Model & Share API

As a headhunter,
I want a system that supports sharing candidate data with specific users and controlled field visibility,
So that the technical foundation exists for secure, scoped collaboration.

**Acceptance Criteria:**

**Given** a developer deploys this story
**When** the migration runs
**Then** the Prisma schema includes `CandidateShare` model (id, candidateId, sharedWithUserId, visibleFields: String[], token: String unique, expiresAt: DateTime?, createdAt, createdById, evaluationSubmittedAt?)

**Given** I have `candidate:share` permission
**When** I call `POST /api/recruitment/candidates/[id]/share` with userId, visibleFields[], and optional expiresAt
**Then** a CandidateShare record is created with a crypto-random non-guessable token
**And** the response includes the share token and expiration date
**And** an SSE event `recruitment:share:created` is emitted

**Given** I want to view existing shares for a candidate
**When** I call `GET /api/recruitment/candidates/[id]/share`
**Then** I receive all active shares with: shared-with user name, visible fields, created date, expiration, and evaluation status

**Given** I want to revoke a share
**When** I call `DELETE /api/recruitment/candidates/[id]/share/[shareId]`
**Then** the share is soft-deleted (revoked)
**And** the reviewer can no longer access the candidate
**And** a toast "Access revoked" confirms the action

---

### Story 4.2: Share Dialog & Template Selector

As a headhunter,
I want to share a candidate with one click using pre-defined templates,
So that I can quickly invite a reviewer without manually selecting fields every time.

**Acceptance Criteria:**

**Given** I am viewing the pipeline or a candidate profile
**When** I click the share icon on a candidate card (or "Share" button in profile)
**Then** the ShareDialog opens with: reviewer picker (Airport user search), 3 template cards, access duration selector, field preview, and action buttons

**Given** the ShareDialog is open
**When** I see the template cards
**Then** "Technical Review" is pre-selected (default)
**And** the 3 options are: "Technical Review" (CV + skills + experience), "HR Review" (all personal + professional), "Custom" (opens field picker)
**And** the field preview section updates in real-time showing which fields will be visible

**Given** I select a reviewer and keep a template selected
**When** I click "Share with [Name]" (primary blue button)
**Then** the share is created via API
**And** the dialog closes
**And** a toast "Shared with [Name]" confirms
**And** the reviewer receives a notification (via existing Airport notification system)

**Given** the dialog is open
**When** I interact with it
**Then** focus is trapped within the dialog
**And** Escape closes the dialog
**And** Tab moves through: reviewer picker → templates → duration → actions

---

### Story 4.3: Custom Field Picker

As a headhunter,
I want to select exactly which candidate fields to share,
So that I can handle edge cases where templates don't match my needs.

**Acceptance Criteria:**

**Given** I am in the ShareDialog and select "Custom" template
**When** the custom mode activates
**Then** the FieldPicker component appears below the template cards
**And** it shows a two-column checkbox grid with category headers: Personal (name, email, phone, photo), Professional (experience, skills, education, current role), Documents (CV, motivation, portfolio)

**Given** I toggle individual fields in the FieldPicker
**When** I check/uncheck a field
**Then** the field preview updates in real-time showing visible (green pill) and hidden (gray striped) fields
**And** each checkbox is labeled and grouped with `role="group"` per category

**Given** I have selected custom fields
**When** I click "Share with [Name]"
**Then** only the selected fields are stored in `visibleFields[]` on the CandidateShare record

**Given** no fields are selected
**When** I view the submit button
**Then** it is disabled with tooltip "Select at least one field to share"

---

### Story 4.4: Reviewer Scoped View

As a technical reviewer,
I want to see only the data that was shared with me plus an evaluation form,
So that I can quickly assess the candidate without irrelevant information.

**Acceptance Criteria:**

**Given** I have a CandidateShare record for a candidate
**When** I click the notification link or navigate to the shared candidate
**Then** I see a scoped view showing ONLY the fields in my `visibleFields[]` array
**And** the view feels complete and purposeful (not like a restricted version of the full profile)
**And** the page loads in under 2 seconds (NFR6)

**Given** I am viewing a scoped candidate view
**When** the data is served
**Then** the `maskCandidateForViewer` utility filters all fields at the server layer before response
**And** non-visible fields are never sent to the client (not hidden via CSS — actually omitted from API response)

**Given** I am viewing a scoped candidate view
**When** I look at the interface
**Then** I see: shared candidate fields in a clean card layout, and the evaluation/scorecard form (if configured)
**And** no navigation to other candidates or pipeline views is available
**And** the view clearly shows who shared this with me and when

**Given** my share has expired (past expiresAt)
**When** I try to access the scoped view
**Then** I see: "This access has expired. Contact the recruiter for renewed access."
**And** no candidate data is shown

---

### Story 4.5: Access Expiration & Auto-Revoke

As a headhunter,
I want shared access to expire automatically after evaluation or time limit,
So that candidate data exposure is minimized according to privacy principles.

**Acceptance Criteria:**

**Given** I share a candidate with temporary access (expiresAt set)
**When** the expiration time passes
**Then** the reviewer can no longer access the candidate data
**And** the share status shows "Expired" in my share overview

**Given** I share a candidate with "expire after evaluation" setting
**When** the reviewer submits their evaluation (scorecard)
**Then** the share's `evaluationSubmittedAt` is recorded
**And** access automatically expires 24 hours after evaluation submission (grace period for re-review)
**And** the reviewer sees "Thank you, your evaluation has been submitted" on subsequent visits

**Given** I want to manually revoke access
**When** I click "Revoke" on an active share in the candidate profile
**Then** a destructive confirmation appears: "Revoke access for [Name]?"
**And** on confirmation the share is revoked immediately
**And** toast "Access revoked" confirms

**Given** I share with "permanent" access selected
**When** the share is created
**Then** no expiresAt is set
**And** access remains until manually revoked or candidate is deleted

---

### Story 4.6: Candidate Access Audit Logging

As a DPO/admin,
I want every access to candidate data to be logged immutably,
So that we can demonstrate GDPR accountability and trace any data access.

**Acceptance Criteria:**

**Given** any user views candidate data (full profile or scoped view)
**When** the data is served
**Then** an audit log entry is created with: action ("candidate:viewed"), actorId, targetId (candidateId), metadata (fields viewed, access mechanism: "direct" or "share-link"), timestamp

**Given** a headhunter shares a candidate
**When** the share is created
**Then** an audit entry records: action "candidate:shared", actorId, targetId, metadata (sharedWithId, visibleFields, expiresAt)

**Given** a reviewer submits an evaluation
**When** the evaluation is saved
**Then** an audit entry records: action "candidate:evaluated", actorId, targetId, metadata (scores summary)

**Given** an admin wants to view audit history for a candidate
**When** they access the candidate's audit trail
**Then** they see a chronological list of all access events
**And** audit records are immutable (append-only, cannot be edited or deleted)
**And** audit records survive candidate data deletion (audit outlives candidate)

---

### Story 4.7: Default Share Templates (Admin)

As an admin,
I want to configure default share templates per reviewer role,
So that headhunters have consistent, organization-standard sharing options.

**Acceptance Criteria:**

**Given** I have `recruitment:admin` permission
**When** I navigate to `/recruitment/admin/instellingen` share templates section
**Then** I see existing share templates with: name, included fields, and usage count

**Given** I am in the templates section
**When** I create a new template
**Then** I can specify: template name, description, and select fields from the same FieldPicker component
**And** I can mark a template as "default" (pre-selected in ShareDialog)

**Given** I edit an existing template
**When** I change the included fields
**Then** existing shares created from this template are NOT retroactively affected
**And** only new shares will use the updated field set

**Given** share templates are configured
**When** a headhunter opens the ShareDialog
**Then** the configured templates appear as the selectable cards (replacing the hardcoded 3)
**And** the admin-marked default template is pre-selected

---

## Epic 5: Evaluation & Scoring

### Story 5.1: Scorecard Template Definition

As a headhunter,
I want to define evaluation criteria per vacancy,
So that reviewers score candidates on relevant, standardized criteria for the role.

**Acceptance Criteria:**

**Given** I am editing a vacancy
**When** I open the "Scorecard" configuration tab
**Then** I see a list of evaluation criteria with: name, description, and weight

**Given** I am in the scorecard configuration
**When** I click "Add criterion"
**Then** I can add a criterion with: name (e.g., "Technical skills"), description (guidance text for reviewer), and weight (1-5 importance)
**And** the criterion appears in the list

**Given** I have multiple criteria
**When** I reorder them via drag handles
**Then** the order persists and determines display order in the reviewer's form

**Given** I save the scorecard template
**When** reviewers receive a shared candidate for this vacancy
**Then** they see these exact criteria in their evaluation form

**Given** a vacancy was created from a template with pre-configured criteria
**When** I view the scorecard tab
**Then** the template's criteria are pre-filled but fully editable

**Given** evaluations already exist for this vacancy
**When** I try to edit criteria
**Then** a warning shows: "Existing evaluations will not be affected. New evaluations will use the updated criteria."

---

### Story 5.2: Scorecard Evaluation Form

As a reviewer,
I want to score a candidate on each criterion and add a recommendation,
So that my assessment is structured, consistent, and useful to the headhunter.

**Acceptance Criteria:**

**Given** I have an active share for a candidate and the vacancy has a scorecard configured
**When** I view the scoped candidate view
**Then** the ScorecardForm appears in the right panel with: all criteria listed, each with 5 rating dots, and a recommendation textarea at the bottom

**Given** I am filling out the scorecard
**When** I click a rating dot (1-5) for a criterion
**Then** that dot and all dots to its left fill with color (green)
**And** the score is visually confirmed

**Given** not all criteria are rated yet
**When** I look at the submit button
**Then** it is disabled with a label showing "Rate all criteria to submit"

**Given** all criteria are rated
**When** I optionally fill in the recommendation textarea
**Then** the "Submit Review" button becomes enabled (primary blue)

**Given** I click "Submit Review"
**When** the form submits
**Then** I see a spinner on the button during API call
**And** on success I see "Review submitted ✓" confirmation state
**And** the form becomes read-only (showing my submitted scores)
**And** an SSE event `recruitment:share:evaluated` is emitted

**Given** the scorecard form is rendered
**When** I use keyboard navigation
**Then** each criterion group is focusable and Tab moves between criteria
**And** rating dots are radio buttons with numeric values announced to screen reader (NFR18)
**And** arrow keys move between rating values within a criterion

---

### Story 5.3: Aggregated Score View

As a headhunter,
I want to see aggregated scores across all reviewers for each candidate,
So that I can make informed decisions based on combined assessments.

**Acceptance Criteria:**

**Given** a candidate has received one or more evaluations
**When** I view their profile (overview tab)
**Then** I see an "Evaluations" section showing: overall average score (ScoreRing), number of reviews completed, and a per-criterion breakdown

**Given** multiple reviewers have scored a candidate
**When** I view the per-criterion breakdown
**Then** each criterion shows: criterion name, average score across reviewers, individual reviewer scores (expandable), and reviewer names

**Given** a candidate has a score
**When** their card renders in the pipeline
**Then** the ScoreRing component displays the aggregate score with color coding (green ≥4.0, amber 3.0-3.9, red <3.0, gray dashed if no score)

**Given** I want to see reviewer recommendations
**When** I expand the evaluations section
**Then** I see each reviewer's text recommendation alongside their scores

**Given** a new evaluation is submitted
**When** I am viewing the candidate's profile
**Then** the aggregate score updates in real-time via SSE (ScoreRing re-renders)

---

### Story 5.4: Candidate Comparison View (Phase 2)

As a headhunter,
I want to compare multiple candidates side-by-side on their scores and qualifications,
So that I can make final selection decisions with a clear visual overview.

**Acceptance Criteria:**

**Given** I am viewing a vacancy pipeline with scored candidates
**When** I select 2-4 candidates for comparison (checkbox on card)
**Then** a "Compare" button appears in the action bar

**Given** I click "Compare"
**When** the comparison view opens
**Then** I see candidates in columns with rows for: each scorecard criterion (average + individual scores), overall score, days in pipeline, source, and key qualifications

**Given** I am in the comparison view
**When** I view criterion rows
**Then** the highest score per criterion is subtly highlighted (green background)
**And** significant differences (>1 point gap) are visually flagged

**Given** I want to remove a candidate from comparison
**When** I click the X on their column header
**Then** the column is removed and remaining candidates reflow

**Given** I am done comparing
**When** I close the comparison view
**Then** I return to the pipeline with my candidate selections cleared

---

## Epic 6: Communication & Notifications

### Story 6.1: Email Template Configuration

As an admin,
I want to configure email templates per pipeline stage with variable substitution,
So that candidates receive professional, contextual communication at each step.

**Acceptance Criteria:**

**Given** I have `recruitment:admin` permission
**When** I navigate to `/recruitment/admin/instellingen` email templates section
**Then** I see a list of recruitment email templates: one per pipeline stage + application confirmation + rejection

**Given** I edit a template
**When** the editor opens
**Then** I can edit: subject line, body text (rich text), and see available variables ({{candidate_name}}, {{vacancy_title}}, {{entity_name}}, {{stage_name}}, {{rejection_reason}})
**And** a preview pane shows the rendered template with sample data

**Given** I save a template
**When** validation runs
**Then** templates with unresolved variables show a warning (not blocking)
**And** templates are stored extending the existing EmailTemplate model (AR11)

**Given** no template is configured for a stage
**When** a candidate enters that stage
**Then** no email is sent (opt-in per stage, not opt-out)

---

### Story 6.2: Automatic Status Emails on Stage Transition

As a headhunter,
I want the system to send status emails when candidates move between stages,
So that candidates stay informed without me manually writing updates.

**Acceptance Criteria:**

**Given** a pipeline stage has an email template configured and `triggersEmail: true`
**When** a candidate is moved to that stage
**Then** the system sends the configured email to the candidate's email address
**And** variables are substituted with actual candidate/vacancy data
**And** email delivery uses SendGrid with retry queue (NFR26: failures logged, non-blocking)

**Given** I am moving a candidate to a stage with email trigger
**When** the CandidateMoveDialog appears (for intermediate stages: simple confirmation)
**Then** I see a toggle "Send status email" (default: on if template exists)
**And** I can toggle it off to suppress the email for this specific move (FR38)

**Given** I manually trigger an email
**When** I click "Send email" from the candidate profile
**Then** I can select from available stage templates
**And** I can preview the email before sending
**And** the email is sent immediately

**Given** an email fails to send
**When** the SendGrid API returns an error
**Then** the stage transition still succeeds (email is non-blocking)
**And** the failed email is queued for retry (up to 3 attempts)
**And** an admin notification is generated after 3 failures

---

### Story 6.3: Application Confirmation Email

As a candidate,
I want to receive a confirmation email when I submit my application,
So that I know my application was received and what to expect next.

**Acceptance Criteria:**

**Given** I have submitted an application and verified my email
**When** the verification is confirmed
**Then** I receive a confirmation email with: vacancy title, entity name, acknowledgment text, and expected timeline (if configured)

**Given** the confirmation email template is configured
**When** it is sent
**Then** it uses the admin-configured template with variables substituted
**And** it includes a link to the candidate portal (token-based, no login required)

**Given** the SendGrid delivery fails
**When** the error is caught
**Then** the candidate's application is still recorded in the pipeline (email is non-blocking)
**And** the email is queued for retry

---

### Story 6.4: Rejection Workflow & Dialog

As a headhunter,
I want a structured rejection flow when moving candidates to "Rejected",
So that candidates receive a professional rejection and I can document the reason.

**Acceptance Criteria:**

**Given** I drag a candidate to the "Rejected" stage
**When** the card is dropped
**Then** the CandidateMoveDialog appears in its RED variant: red confirm button, rejection template selector, optional reason textarea

**Given** the rejection dialog is shown
**When** I view the options
**Then** I see: selected rejection email template (dropdown of configured rejection templates), optional reason field (internal, not sent to candidate unless variable used), and "Send rejection email" toggle (default: on)

**Given** I confirm the rejection
**When** I click "Reject candidate" (red button)
**Then** the candidate moves to the Rejected stage
**And** the rejection email is sent (if toggled on)
**And** the internal reason is stored on the candidate record
**And** an SSE event `recruitment:pipeline:candidate-moved` is emitted
**And** the candidate card shows in the Rejected column (visually distinct: muted/gray)

**Given** I click Cancel in the rejection dialog
**When** the dialog closes
**Then** the candidate card animates back to its original stage

---

### Story 6.5: Internal Comment Threads

As a headhunter or reviewer,
I want to post internal comments on a candidate's profile,
So that I can collaborate with colleagues about a candidate without email.

**Acceptance Criteria:**

**Given** I have `candidate:read` permission for a candidate
**When** I view their profile and open the "Comments" tab
**Then** I see a chronological list of all internal comments with: author name, avatar, timestamp, and text

**Given** I am on the comments tab
**When** I type in the comment input and press Enter or click "Post"
**Then** the comment is saved and appears instantly at the bottom of the thread
**And** a timestamp "just now" is shown

**Given** a new comment is posted on a candidate I have access to
**When** I am viewing that candidate's profile
**Then** the new comment appears in real-time via SSE

**Given** a reviewer has a scoped share
**When** they view the shared candidate
**Then** they can see and post comments (comments are visible to all users with access to this candidate)
**And** their comments show as authored by their name

**Given** a candidate's data is deleted (GDPR)
**When** the deletion runs
**Then** internal comments are also deleted (they contain contextual candidate data)

---

### Story 6.6: Notification System Integration

As a reviewer or headhunter,
I want to receive Airport notifications for share requests and completed evaluations,
So that I know when action is needed without checking the recruitment module.

**Acceptance Criteria:**

**Given** a headhunter shares a candidate with me
**When** the share is created
**Then** I receive an Airport notification: "Anja shared a candidate for review: [Candidate Name] for [Vacancy Title]"
**And** the notification links directly to the scoped candidate view

**Given** a reviewer submits an evaluation
**When** the evaluation is saved
**Then** the headhunter who created the share receives a notification: "[Reviewer Name] submitted their review for [Candidate Name]"
**And** the notification links to the candidate's evaluation summary

**Given** a share is about to expire (24h before)
**When** the expiration check runs
**Then** the reviewer receives a reminder notification: "Your access to [Candidate Name] expires tomorrow"

**Given** I receive a notification
**When** I click it
**Then** I am taken directly to the relevant view (scoped candidate view or evaluation summary)
**And** the notification is marked as read

---

### Story 6.7: O365 Mailbox Sync (Phase 2)

As a headhunter,
I want emails to/from a candidate to be automatically linked to their profile,
So that all communication history is centralized without manual effort.

**Acceptance Criteria:**

**Given** O365 mailbox sync is enabled for my account
**When** I send or receive an email matching a candidate's email address
**Then** the email is linked to the candidate's profile in the "Emails" tab
**And** the email shows: subject, date, direction (sent/received), and preview

**Given** a linked email exists on a candidate profile
**When** I click it
**Then** I can view the full email content within the recruitment module

**Given** sync is running
**When** an email arrives from an unknown address
**Then** it is not linked (only matches known candidate email addresses)

**Given** a candidate has multiple applications across vacancies
**When** emails are synced
**Then** they are linked to the most recent active vacancy for that candidate

---

### Story 6.8: Private Email Marking (Phase 2)

As a headhunter,
I want to mark certain emails as private,
So that they are excluded from the candidate file and not visible to others.

**Acceptance Criteria:**

**Given** I am viewing linked emails on a candidate profile
**When** I click "Mark as private" on an email
**Then** the email is hidden from the candidate's profile for all other users
**And** only I can still see it (marked with a "private" badge)

**Given** an email is marked as private
**When** a reviewer or other headhunter views the candidate
**Then** they do not see the private email in the communication history

**Given** I want to undo a private marking
**When** I click "Make visible" on a private email
**Then** it becomes visible to all authorized users again

---

## Epic 7: Compliance & Data Lifecycle

### Story 7.1: Retention Period Configuration

As an admin,
I want to configure candidate data retention periods,
So that our organization complies with GDPR data minimization principles.

**Acceptance Criteria:**

**Given** I have `recruitment:admin` permission
**When** I navigate to `/recruitment/admin/instellingen` compliance section
**Then** I see a "Data Retention" configuration with: default retention period (days), grace period before hard delete (days), and notification lead time (days before expiry)

**Given** I set the default retention to 365 days
**When** I save the configuration
**Then** all new candidates inherit this retention period from their application date
**And** existing candidates without explicit retention use the new default

**Given** a vacancy has specific retention requirements
**When** I edit the vacancy settings
**Then** I can override the default retention period for that vacancy
**And** candidates for that vacancy use the vacancy-specific retention

**Given** the retention configuration is saved
**When** I view the settings
**Then** I see a summary: "Candidate data retained for {X} days, notification {Y} days before, hard-deleted {Z} days after soft-delete"

---

### Story 7.2: Retention Expiry Notification

As a candidate,
I want to be notified before my data is deleted,
So that I can choose to renew my consent if I want to remain in the talent pool.

**Acceptance Criteria:**

**Given** a candidate's retention period approaches expiry (notification lead time reached)
**When** the daily retention check job runs
**Then** the candidate receives an email: "Your data will be deleted in {X} days. Click here to extend your consent."
**And** the email contains a token-based link (no login required) to a consent renewal page

**Given** the candidate clicks the renewal link
**When** they confirm renewal
**Then** the retention period resets from the renewal date
**And** the candidate record is updated with new `retentionExpiresAt`
**And** an audit log records "consent:renewed" with timestamp

**Given** the candidate does not respond to the notification
**When** the retention period expires
**Then** the candidate proceeds to the soft-delete phase (Story 7.3)

**Given** a candidate's email bounces
**When** the notification cannot be delivered
**Then** the system proceeds with deletion (notification is best-effort, not blocking)

---

### Story 7.3: Automated Data Deletion

As a system,
I want to automatically delete candidate data after the retention period,
So that GDPR compliance is maintained without manual intervention.

**Acceptance Criteria:**

**Given** a candidate's retention period has expired and no consent renewal occurred
**When** the daily retention job runs
**Then** the candidate record is soft-deleted (status: "retention_expired", data still in DB but inaccessible)
**And** the candidate disappears from all pipeline views and search results

**Given** a candidate has been soft-deleted for the configured grace period
**When** the daily cleanup job runs
**Then** all candidate personal data is permanently deleted (hard-delete): name, email, phone, CV, motivation, scores, comments
**And** the SharePoint folder for this candidate is deleted via Graph API
**And** associated CandidateShare records are deleted

**Given** a candidate's data is hard-deleted
**When** the deletion completes
**Then** audit log entries for this candidate REMAIN (audit outlives data per FR54)
**And** the audit records reference the candidate by anonymized ID only
**And** pipeline statistics retain anonymized counts (for funnel metrics)

**Given** a headhunter tries to access a soft-deleted candidate
**When** they follow an old link
**Then** they see: "This candidate's data has been removed per retention policy"

---

### Story 7.4: Right to Access (Data Export)

As a candidate,
I want to request an export of all my stored personal data,
So that I can exercise my GDPR right to access.

**Acceptance Criteria:**

**Given** I am a candidate with an active record
**When** I access my candidate portal (token-based link)
**Then** I see a "Request my data" button

**Given** I click "Request my data"
**When** the system processes the request
**Then** a ZIP file is generated containing: all personal fields (JSON), my CV document, any uploaded files, application history, stage transitions, and evaluation scores visible to me
**And** I receive an email with a time-limited download link (expires in 48 hours)

**Given** a headhunter or admin receives a data access request via other channels (email, phone)
**When** they locate the candidate
**Then** they can trigger the same export from the admin view
**And** an audit log records "data:exported" with the requesting mechanism

**Given** the export is generated
**When** it completes
**Then** an audit entry records: action "candidate:data_exported", timestamp, mechanism (self-service or admin-triggered)

---

### Story 7.5: Right to Erasure

As a candidate,
I want to request deletion of all my data,
So that I can exercise my GDPR right to erasure.

**Acceptance Criteria:**

**Given** I am a candidate with an active record
**When** I access my candidate portal
**Then** I see a "Delete my data" button with explanation of what will be removed

**Given** I click "Delete my data"
**When** I confirm the action (double confirmation: "Are you sure? This cannot be undone.")
**Then** the system initiates immediate soft-delete of my candidate record
**And** I receive a confirmation email: "Your data deletion request has been processed"
**And** my data is queued for hard-delete (within configured grace period, max 30 days per GDPR)

**Given** a candidate is in an active recruitment process (not yet rejected/hired)
**When** they request erasure
**Then** a notification is sent to the headhunter: "[Candidate] has requested data deletion"
**And** the deletion proceeds regardless (candidate right supersedes recruitment convenience)

**Given** the erasure completes
**When** all personal data is removed
**Then** audit logs retain an anonymized record: "Candidate [anonymized-id] data erased at [timestamp] per right-to-erasure request"
**And** the candidate can no longer access the portal link

---

### Story 7.6: Immutable Audit Log System

As a DPO,
I want audit logs that cannot be modified or deleted,
So that we can prove GDPR compliance in case of regulatory inquiry.

**Acceptance Criteria:**

**Given** any candidate data operation occurs (view, edit, share, delete, export)
**When** the operation is executed
**Then** an immutable audit log entry is created with: action type, actor (user or system), target (candidate ID), timestamp, metadata (fields accessed, mechanism, IP)

**Given** an audit entry exists
**When** any user (including admin) attempts to modify or delete it
**Then** the operation is rejected — audit records are append-only at the database level
**And** no API endpoint exists for audit mutation

**Given** candidate data is deleted (retention or erasure)
**When** the deletion completes
**Then** related audit entries persist with anonymized candidate reference
**And** audit entries still show: when data existed, who accessed it, and when it was deleted

**Given** the audit system is operational
**When** entries are stored
**Then** each entry has a sequential ID and cryptographic hash linking to the previous entry (tamper-evident chain)
**And** the storage is optimized for append (no indexes on mutable fields)

---

### Story 7.7: DPO Audit Reporting

As a DPO,
I want to access audit reports showing all candidate data processing activities,
So that I can fulfill GDPR accountability obligations and respond to regulatory requests.

**Acceptance Criteria:**

**Given** I have `recruitment:admin` permission (DPO role)
**When** I navigate to the audit reporting interface
**Then** I see filters: date range, action type, actor, candidate (anonymized search)

**Given** I apply filters
**When** the report generates
**Then** I see a tabular view of matching audit entries with: timestamp, action, actor name, target (candidate name or anonymized ID), and metadata summary
**And** the report loads within 5 seconds for up to 1 year of data

**Given** I need to export for regulatory purposes
**When** I click "Export"
**Then** a CSV/PDF is generated with all matching records
**And** the export itself is logged in the audit trail

**Given** I want to check a specific candidate's full access history
**When** I search by candidate name or anonymized ID
**Then** I see a complete chronological timeline: who accessed what, when, and how (direct access, share link, export)
**And** I can verify no unauthorized access occurred

---

## Epic 8: Hire-to-Onboarding Bridge

### Story 8.1: Hire Confirmation Dialog

As a headhunter,
I want a structured hire flow when moving a candidate to "Hired",
So that I can confirm the hire and provide the details needed to create their Starter record.

**Acceptance Criteria:**

**Given** I drag a candidate to the "Hired" stage
**When** the card is dropped
**Then** the CandidateMoveDialog appears in its GREEN variant: green confirm button, expanded layout with starter detail fields

**Given** the hire dialog is shown
**When** I view the form
**Then** I see pre-filled fields from vacancy context: entity (from vacancy), job function (from vacancy), and empty fields: start date (date picker), contract type, reporting to
**And** a "Send hire notification email" toggle (default: on)

**Given** all required fields are filled (entity, function, start date)
**When** I click "Confirm hire" (green button)
**Then** the system proceeds to create the Starter record (Story 8.2)
**And** the candidate moves to "Hired" stage
**And** an SSE event `recruitment:pipeline:candidate-moved` is emitted

**Given** I click Cancel
**When** the dialog closes
**Then** the candidate card returns to its source stage
**And** no data is persisted

---

### Story 8.2: Automatic Starter Creation

As a headhunter,
I want the system to automatically create a Starter record when I hire a candidate,
So that onboarding begins immediately without re-entering data in another module.

**Acceptance Criteria:**

**Given** the hire is confirmed with required fields
**When** the system processes the hire
**Then** a new Starter record is created in Airport with: first name, last name, email, phone (from candidate), entity, job function, start date, contract type (from hire dialog)
**And** the creation is atomic — either the Starter is fully created AND the candidate moves to Hired, or both operations roll back (NFR25)

**Given** the Starter is created successfully
**When** the headhunter sees the confirmation
**Then** a success toast shows: "Candidate hired! Starter record created for [Name]"
**And** a link to the new Starter record is provided in the toast

**Given** the Starter creation fails (e.g., database error, validation failure)
**When** the error is caught
**Then** the candidate does NOT move to "Hired" (atomic rollback)
**And** an error toast shows: "Could not create Starter record. Please try again."
**And** the candidate remains in their previous stage

**Given** the Starter is created
**When** I view the candidate's profile
**Then** a banner shows: "Hired — Starter record: [link to starter]"
**And** the candidate record is marked with a reference to the Starter ID

---

### Story 8.3: Candidate Portal Transition

As a hired candidate,
I want my application portal to transition into pre-onboarding,
So that I have a seamless experience from application to first day preparation.

**Acceptance Criteria:**

**Given** I was a candidate and have been hired
**When** I access my existing candidate portal link
**Then** the portal content transitions from "Application status" to "Welcome! Your onboarding starts [date]"
**And** I see a timeline: Application → Hired → Pre-onboarding → First day

**Given** I am on the transitioned portal
**When** I view available actions
**Then** I see any pre-onboarding tasks assigned to my Starter record (if the onboarding module has tasks)
**And** I see my start date, entity, and function

**Given** the pre-onboarding period is active
**When** I access the portal
**Then** the same token-based URL works (no new login required per FR58)
**And** the portal is mobile-friendly (same responsive approach as application)

**Given** my data retention period starts after onboarding completes
**When** I am fully onboarded (Starter status: active)
**Then** the candidate record's retention period begins from the onboarding completion date (not application date)

---

## Epic 9: Dashboard & Analytics (Phase 3)

### Story 9.1: Pipeline Metrics Dashboard

As a manager,
I want to view recruitment pipeline metrics on the Airport dashboard,
So that I have visibility into hiring progress without asking the headhunter.

**Acceptance Criteria:**

**Given** I have `recruitment:read` permission
**When** I navigate to the recruitment dashboard at `/recruitment`
**Then** I see summary widgets: total active vacancies, total candidates in pipeline, average time-to-hire (last 6 months), open positions by entity

**Given** I am on the dashboard
**When** I filter by entity
**Then** all metrics update to show only the selected entity's data

**Given** I am on the dashboard
**When** I view the metrics
**Then** data refreshes with each page visit (no stale data)
**And** the dashboard loads within 3 seconds

**Given** I have access to multiple entities
**When** I view the global dashboard
**Then** I see aggregated metrics across all my accessible entities
**And** I can drill down to individual entity views

---

### Story 9.2: Funnel Visualization

As a manager,
I want to see a funnel visualization per vacancy,
So that I can identify where candidates drop off in the process.

**Acceptance Criteria:**

**Given** I navigate to a specific vacancy's analytics view
**When** the funnel loads
**Then** I see a visual funnel showing: each pipeline stage as a horizontal bar, width proportional to candidate count, with absolute numbers and percentage of initial applicants

**Given** the funnel is displayed
**When** I hover over a stage bar
**Then** I see a tooltip with: stage name, current count, drop-off from previous stage (%), average days candidates spend in this stage

**Given** I want to compare funnels
**When** I select multiple vacancies
**Then** I see funnels side-by-side for comparison

**Given** a vacancy has historical data
**When** I toggle "Include closed candidates"
**Then** the funnel shows the complete picture including rejected/withdrawn candidates at each stage

---

### Story 9.3: SLA Indicators on Vacancies

As a headhunter or manager,
I want to see SLA indicators on vacancies where candidates exceed stage duration thresholds,
So that I can take action on stalled candidates before they lose interest.

**Acceptance Criteria:**

**Given** an admin has configured SLA thresholds (warning: 7 days, exceeded: 14 days — configurable in settings)
**When** a candidate has been in a stage longer than the warning threshold
**Then** the vacancy list shows an amber SLA indicator badge with the count of warning-level candidates

**Given** a candidate exceeds the exceeded threshold
**When** the vacancy list renders
**Then** the vacancy shows a red SLA indicator badge

**Given** I am on the dashboard
**When** SLA violations exist
**Then** a "Needs attention" section highlights vacancies with candidates exceeding thresholds
**And** clicking the indicator takes me directly to the pipeline filtered to show only SLA-exceeded candidates

**Given** I want to configure thresholds
**When** I navigate to recruitment settings
**Then** I can set: warning threshold (days), exceeded threshold (days), and optionally per-stage overrides
