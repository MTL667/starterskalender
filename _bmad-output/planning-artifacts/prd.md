---
stepsCompleted: ["step-01-init", "step-02-discovery", "step-02b-vision", "step-02c-executive-summary", "step-03-success", "step-04-journeys", "step-05-domain", "step-06-innovation", "step-07-project-type", "step-08-scoping", "step-09-functional", "step-10-nonfunctional", "step-11-polish", "step-12-complete"]
completedAt: "2026-05-13"
inputDocuments:
  - _bmad-output/brainstorming/brainstorming-session-2026-05-12-1210.md
  - docs/project-context.md
workflowType: 'prd'
documentCounts:
  briefCount: 0
  researchCount: 0
  brainstormingCount: 1
  projectDocsCount: 1
classification:
  projectType: web_app
  domain: general
  complexity: medium
  projectContext: brownfield
---

# Product Requirements Document - Starterskalender

**Author:** Kevin
**Date:** 2026-05-13

## Executive Summary

Airport's Recruitment Module replaces Recruitee as the in-house vacancy and candidate management system, eliminating external SaaS dependency while delivering capabilities Recruitee cannot provide. The module extends the existing Starterskalender platform — which already manages onboarding, offboarding, and internal migrations — upstream into the hiring pipeline.

The module serves three user types: the HR headhunter who manages the full recruitment lifecycle daily, technical reviewers who evaluate candidates with scoped access to relevant data only, and management who monitors pipeline health through dashboards. It operates across multiple organizational entities with per-entity, per-vacancy, and per-field access control.

The core problem: Recruitee's all-or-nothing access model forces a choice between sharing too much candidate data or not collaborating at all. Its full feature set goes largely unused while its cost remains fixed. Meanwhile, hired candidates must be manually re-entered into the onboarding system — the boundary between "candidate" and "starter" exists only because two separate tools enforce it.

### What Makes This Special

**Field-level access control for candidate data.** The headhunter determines exactly which fields each collaborator can see per candidate — CV and skills for technical reviewers, full profile for HR, temporary scoped views via share button. This granularity maps directly to Airport's existing RBAC v2 architecture and is something Recruitee fundamentally cannot do.

**Zero-boundary candidate-to-starter flow.** When a candidate reaches "Hired" status in the pipeline, their data flows directly into pre-onboarding and subsequently into the existing starter calendar — same data, no re-entry, no export/import. Recruitment, pre-onboarding, and onboarding become phases of one continuous journey rather than handoffs between disconnected tools.

**Cost-justified feature coverage.** The module implements only what the organization actually uses: vacancy management, structured pipeline, evaluation scorecards, and scoped collaboration. No payment for unused features.

## Project Classification

| Attribute | Value |
|-----------|-------|
| Project Type | Web application (Next.js App Router, brownfield module) |
| Domain | HR / Recruitment |
| Complexity | Medium — GDPR-sensitive candidate data, field-level RBAC, multi-entity, external integrations (Graph API, embeddable widget), but leverages 60% existing infrastructure |
| Project Context | Brownfield — extends existing platform with established architecture (Prisma, RBAC v2, Graph API, SSE event bus, i18n) |

## Success Criteria

### User Success

**HR Headhunter (primary user):**
- Daily workflow feels easier than Recruitee — fewer clicks, less context-switching, no need to leave Airport for recruitment tasks
- Can share candidate data with scoped field-level access without workarounds
- Hired candidates flow into pre-onboarding without manual re-entry

**Technical Reviewer (secondary user):**
- Receives scoped candidate view (CV + skills), provides technical recommendation, done — minimal friction, no noise from irrelevant personal data
- Complete evaluation workflow (review + recommendation) achievable in under 2 minutes

**Management (tertiary user):**
- Pipeline visibility per entity and globally without requesting status updates from headhunter

### Business Success

| Metric | Target | Timeframe |
|--------|--------|-----------|
| Recruitee license cancelled | Contract terminated | September 2026 |
| Time-to-hire | Measurable baseline established, then improved | Wave 1 + 3 months |
| Candidate drop-off rate | Tracked per pipeline stage, identify bottleneck stages | Wave 1 + 3 months |
| Cost per hire | Reduction vs Recruitee period (tracked via source attribution) | Wave 2 |
| Recruitment data continuity | Zero manual re-entry from hired candidate to starter | Wave 1 |

### Technical Success

- Module integrates with existing RBAC v2 without architectural changes to permission system
- Prisma schema extension — no breaking changes to existing models
- Graph API reuse for mail sync leverages existing authentication flow
- Performance: pipeline Kanban renders under 1s with 50+ candidates per vacancy
- GDPR: candidate data retention policy automated, deletion verifiable

### Measurable Outcomes

- **Go/No-Go gate:** Wave 1 feature-complete by mid-August 2026, allowing 2-week UAT before Recruitee contract expiry
- **Adoption metric:** Headhunter completes first full recruitment cycle (vacancy → hire) within Airport before Recruitee cancellation
- **Quality metric:** Zero candidate data visible to unauthorized users (verified via RBAC audit log)

## Product Scope

See [Project Scoping & Phased Development](#project-scoping--phased-development) for detailed MVP feature set, phased roadmap, and risk mitigation strategy.

## User Journeys

### Journey 1: Anja — The HR Headhunter (Happy Path)

**Who:** Anja, 34, HR specialist at a multi-entity organization. She manages all recruitment single-handedly across 4 entities. Currently switches between Recruitee (vacancies), Outlook (candidate emails), Teams (reviewer feedback), and Excel (pipeline tracking).

**Opening Scene:** Monday morning. Anja needs to fill a Facility Manager position for entity ACEG. In Recruitee, she'd create a vacancy from scratch, then manually email the technical reviewer a PDF of the candidate's CV, hoping he doesn't see the candidate's age or address.

**Rising Action:** In Airport, Anja opens the recruitment module. She selects the "Facility Manager" template linked to the existing job function — pre-filled with standard requirements, team description, and SharePoint stock photos. She adds two dealbreakers (driver's license, Dutch-speaking) and three weighted nice-to-haves. One click publishes to the ACEG vacancy page.

**Climax:** Three weeks later, 12 candidates have applied. The dealbreaker filter has already sorted out 4 who lack the driver's license. Anja drags her top 3 into the "Technical Review" stage. She clicks "Share with Mark" → selects only CV, skills, and evaluation form → Mark receives a notification with a stripped-down view. No name, no address, no age visible. Mark fills his scorecard in 90 seconds. Anja sees his recommendation instantly in her pipeline.

**Resolution:** Candidate Thomas scores highest. Anja drags him to "Hired." Airport auto-creates a Starter record for entity ACEG with Thomas's data — name, contact, function, start date — all pre-filled from the candidate profile. Pre-onboarding kicks off. Anja never re-entered a single field.

### Journey 2: Anja — Edge Case (Rejection & GDPR)

**Opening Scene:** A vacancy has been open for 8 weeks. 3 candidates were rejected after technical review, 2 withdrew. The pipeline shows red — SLA exceeded.

**Rising Action:** Anja needs to reject the final candidate and close the vacancy. She moves the candidate to "Rejected," triggering an automatic status email using the rejection template. She closes the vacancy.

**Climax:** Three months later, GDPR retention policy fires. An automated email goes to the rejected candidates: "Your data will be deleted in 30 days. Want to stay in our talent pool?" No response from 4 of 5. One responds yes — moved to talent pool with fresh consent timestamp.

**Resolution:** After 30 days, 4 candidate records are soft-deleted, then hard-deleted after the grace period. Audit log confirms compliance. Anja didn't have to remember a single deletion.

### Journey 3: Mark — The Technical Reviewer

**Who:** Mark, 41, team lead Infrastructure. Reviews technical candidates 2-3 times per quarter. This is not his main job — he wants to help but not get dragged into HR processes.

**Opening Scene:** Mark gets a notification in Airport: "Anja shared 2 candidates for Facility Manager — your review requested."

**Rising Action:** Mark clicks through. He sees a clean card per candidate: CV summary, relevant skills, a scorecard with 5 criteria (technical knowledge, problem-solving, team fit, communication, experience). No name, no photo, no personal details — just the professional profile.

**Climax:** Mark scores each candidate on the 5 criteria, adds a one-line recommendation: "Candidate A: strong on infra, weak on communication. Candidate B: solid all-round, recommend." Submits. Total time: 3 minutes for both candidates.

**Resolution:** His access to these candidates automatically expires after submission. He's back to his real work. No follow-up needed unless Anja explicitly re-shares for a second opinion.

### Journey 4: Thomas — The Candidate (External)

**Who:** Thomas, 29, looking for a Facility Manager role. Finds the vacancy on the ACEG website.

**Opening Scene:** Thomas sees the vacancy on aceg.be/jobs. Clean layout, clear requirements, honest "what we offer" section. He notices the dealbreakers listed transparently: driver's license required, Dutch-speaking required.

**Rising Action:** He clicks "Apply" — one-click apply: upload CV, optional motivation field, confirm email. No account creation. He receives a confirmation email within seconds: "We received your application. You'll hear from us within 5 working days."

**Climax:** Over the next 3 weeks, Thomas receives status emails as he progresses: "Moved to Technical Review" → "Moved to Interview" → "Moved to Offer." Each email has clear next steps. He never has to log in or check a portal.

**Resolution:** Thomas receives the "Hired" email with a link to his candidate portal. The portal already shows his start date, pre-onboarding tasks, and documents to upload. Same login he'll use on his first day. One continuous journey from applicant to employee.

### Journey 5: Peter — Management Dashboard

**Who:** Peter, 52, Managing Director. Oversees 4 entities. Wants recruitment visibility without micromanaging Anja.

**Opening Scene:** Monthly management meeting. Peter wants to know: how many open vacancies across all entities? What's the average time-to-hire? Are there bottlenecks?

**Rising Action:** Peter opens the Airport dashboard. The recruitment widget shows: 6 open vacancies (2 ACEG, 1 VGC, 3 Facil), 14 candidates in pipeline, average time-to-hire: 32 days. One vacancy flagged orange — SLA exceeded.

**Climax:** Peter clicks into the entity view for ACEG. Sees the funnel: 45 applications → 12 screened → 5 interviewed → 2 in offer stage. No candidate personal data visible — only aggregated metrics.

**Resolution:** Peter has his answer in 30 seconds. No email to Anja needed. He mentions the SLA flag in the management meeting — Anja already knew and has a plan.

### Journey 6: Bram — External Widget Integration

**Who:** Bram, 28, front-end developer at the web agency managing websites for entities ACEG+VGC (shared site) and Facil (separate site).

**Opening Scene:** Airport's recruitment module is live. Bram needs to display vacancies on two separate websites with different branding.

**Rising Action:** In Airport admin, the site grouping is configured: ACEG+VGC → aceg-vgc.be, Facil → facil.be. Bram gets either an embeddable web component `<airport-vacancies group="aceg-vgc" />` or the headless API endpoint `/api/public/vacancies?group=aceg-vgc`.

**Climax:** Bram chooses the headless API for full styling control on aceg-vgc.be, and the pre-styled widget for facil.be (quick implementation). Both pull from the same source of truth — when Anja publishes a vacancy for ACEG, it appears on aceg-vgc.be within minutes.

**Resolution:** No deployment needed when vacancies change. Bram's implementation is done once. Entity branding (logo, colors) comes from Airport config. New entities added later just need a site group assignment.

### Journey Requirements Summary

| Journey | Key Capabilities Revealed |
|---------|--------------------------|
| Anja (happy path) | Vacancy templates, dealbreaker filter, pipeline Kanban, share button with field-level RBAC, auto-create Starter on hire |
| Anja (edge case) | Rejection workflow, status emails, GDPR retention automation, audit logging |
| Mark (reviewer) | Scoped candidate view, scorecard evaluation, auto-expiring access, notification system |
| Thomas (candidate) | One-click apply, status emails per phase, candidate portal, pre-onboarding bridge |
| Peter (management) | Dashboard widgets, per-entity metrics, funnel visualization, SLA indicators |
| Bram (external dev) | Embeddable widget, headless API, site grouping configuration, entity branding |

**MVP Coverage:** Journeys 1, 3, and 4 (core flows) fully within Wave 1. Journey 2 (GDPR) partially Wave 1 (status emails) and partially Wave 3 (auto-retention). Journey 5 (dashboard) Wave 3. Journey 6 (widget) Wave 2.

## Domain-Specific Requirements

### Compliance & Regulatory

**GDPR — Candidate Personal Data:**
- Candidates are external data subjects (not employees) — processing basis: legitimate interest (recruitment) with consent for extended retention (talent pool)
- Data Processing Register (verwerkingsregister): recruitment module must be documented as a processing activity, reviewable by DPO
- Right to access: candidate can request export of all stored personal data
- Right to erasure: candidate can request deletion; system must support complete removal with audit trail confirmation
- Right to rectification: candidate can update their information
- Data breach notification: if candidate data is compromised, 72-hour notification requirement applies

**Retention Policy:**
- Configurable retention period per system setting (not hardcoded) — organization determines appropriate duration
- Automated retention workflow: expiry notification → consent renewal request → soft-delete → hard-delete
- Talent pool opt-in requires explicit consent with timestamp and purpose documentation
- DPO must be able to audit retention compliance at any time

### Technical Constraints

**Privacy-by-Design:**
- Field-level access control is architectural requirement, not optional feature — default is "no access," explicitly granted per field/role
- Candidate personal data encrypted at rest (database-level or field-level for sensitive fields)
- No candidate PII in application logs
- Session-based access for shared views — no permanent URLs containing candidate data

**Audit Requirements:**
- Complete access log: who viewed which candidate fields, when, via what mechanism (direct access, share link, API)
- Audit log immutable — append-only, no deletion or modification
- DPO dashboard or export capability for compliance reporting
- Retention of audit logs independent of candidate data deletion (audit survives data erasure)

### Integration Requirements

- Microsoft Graph API: mail sync must respect headhunter's "private" marking — excluded emails never stored
- Public vacancy pages/API: no candidate data exposed — only vacancy information
- Pre-onboarding bridge: data transfer from candidate to starter must be atomic and auditable
- External websites (widget/API): no cookies or tracking of visitors beyond standard analytics

### Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| Unauthorized access to candidate PII | Field-level RBAC with default-deny; auto-expiring shared views; audit logging |
| GDPR retention violation | Configurable automated retention policy; DPO audit capability; hard-delete with confirmation |
| Data leak via email sync | Private-marking opt-out; only emails matching candidate email address linked; headhunter explicit consent |
| Over-sharing via share button | Explicit field selection required (no "share all"); temporary access by default; audit trail |
| DPO compliance gap | Processing activity documentation in system; exportable audit logs; retention policy transparency |

## Web Application Specific Requirements

### Project-Type Overview

The recruitment module is a hybrid Next.js application: server-rendered public-facing pages (vacancy listings, application forms) combined with highly interactive client-side interfaces (pipeline Kanban, scorecard evaluation, admin configuration). It extends the existing Starterskalender architecture — same framework, same patterns, same deployment.

### Technical Architecture Considerations

**Rendering Strategy:**
- Public vacancy pages: Server-Side Rendered (SSR) for SEO and fast first paint
- Embeddable widget: Pre-rendered with hydration, or static JSON via headless API
- Internal pipeline/admin: Client-side interactivity with React Server Components for data fetching
- Follows existing App Router patterns (route groups, server actions, streaming)

**Real-Time:**
- Pipeline Kanban uses existing SSE event bus for live updates (candidate moved by colleague → instant reflection)
- Notification system for share requests and evaluation completions
- No WebSocket requirement — SSE sufficient for unidirectional updates

### Browser Support

| Context | Browsers | Rationale |
|---------|----------|-----------|
| Internal (pipeline, admin) | Latest Chrome, Edge, Safari, Firefox | Internal users on managed devices |
| Public (vacancy pages, apply form) | Chrome, Edge, Safari, Firefox (last 2 versions) + mobile browsers | External candidates on any device |
| Embeddable widget | Same as host website — must not break host page styling or scripts | Isolation via Shadow DOM or iframe |

### SEO Strategy

**SEO-Required Pages:**
- Public vacancy listing pages (per entity / per site group)
- Individual vacancy detail pages (title, location, requirements as structured data)
- Embeddable widget content (crawlable by search engines)

**SEO Implementation:**
- Server-rendered HTML with proper meta tags (title, description, Open Graph)
- JSON-LD structured data (JobPosting schema) per vacancy
- Sitemap generation for active vacancies
- Canonical URLs per vacancy (avoid duplicate content across widget and hosted page)

**No SEO Required:**
- Internal pipeline interface
- Admin configuration pages
- Candidate portal (authenticated)

### Responsive Design

| Interface | Mobile Priority | Rationale |
|-----------|----------------|-----------|
| Public vacancy pages | Mobile-first | Candidates browse jobs on phone |
| Application form | Mobile-first | One-click apply must work on mobile |
| Pipeline Kanban | Desktop-primary | Headhunter works on desktop; touch drag & drop secondary |
| Scorecard evaluation | Responsive | Reviewer might use tablet/phone |
| Admin configuration | Desktop-only acceptable | Internal admin on workstation |

### Performance Targets

See [Non-Functional Requirements — Performance](#performance) for measurable performance contracts.

No virtualization needed — candidate counts per vacancy remain manageable.

### Accessibility

**Target:** WCAG 2.1 Level AA

**Priority by context:**
- **High priority:** Public vacancy pages + application form (external users, legal exposure)
- **Medium priority:** Pipeline Kanban, scorecard forms (internal but diverse users)
- **Lower priority:** Admin configuration (power users, controlled environment)

**Key requirements:**
- Keyboard navigation for pipeline Kanban (arrow keys to move candidates between stages)
- Screen reader labels for scorecard criteria and rating inputs
- Sufficient color contrast on public pages
- Focus management for dialogs (share button, candidate detail)

### Implementation Considerations

- Follows existing codebase patterns: Radix UI + shadcn/ui, Tailwind CSS, Zod validation
- i18n: Dutch + French for internal interfaces; public vacancy pages language determined by entity/site group configuration
- Dark mode: supported via existing next-themes setup
- No new framework dependencies — leverage what's already in place

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving MVP — solves a concrete, measurable problem (unjustifiable SaaS cost + insufficient access control). Validation is binary: can Recruitee be cancelled by September 2026?

**Resource Requirements:** Solo developer (Kevin), full-stack. Estimated 12–15 weeks for Wave 1. No external dependencies for MVP delivery. AI-assisted development accelerates implementation.

**MVP Philosophy:** Build only what the headhunter needs daily to run a complete recruitment cycle (vacancy → pipeline → evaluation → hire). Every feature must answer: "Without this, can we cancel Recruitee?"

### MVP Feature Set (Phase 1) — Deadline: August 2026

**Core User Journeys Supported:**
- Journey 1 (Anja — happy path): Full recruitment cycle
- Journey 3 (Mark — technical reviewer): Scoped evaluation
- Journey 4 (Thomas — candidate): Apply and receive status updates

**Must-Have Capabilities:**

| Capability | Justification |
|-----------|---------------|
| Vacancy CRUD + template builder | Cannot post jobs without this |
| Dealbreaker + nice-to-have configuration | Core filter mechanism, replaces manual screening |
| Candidate intake (form + CV upload) | Cannot receive applications without this |
| Pipeline Kanban (stages, drag & drop) | Core daily workflow for headhunter |
| Scorecard evaluation | Technical reviewer workflow depends on this |
| RBAC: headhunter / reviewer / share | The USP — without this, no advantage over Recruitee |
| Internal comment thread | Replaces scattered Teams messages |
| Status email templates | Candidate communication is non-negotiable |
| Public vacancy page (per entity) | Candidates need somewhere to find and apply for jobs |

**Explicitly Deferred from MVP:**
- O365 mailbox sync (headhunter continues using Outlook separately)
- Embeddable widget (start with Airport-hosted public pages)
- Dashboard analytics (headhunter has pipeline visibility; management reporting waits)
- CV parser (manual data entry acceptable for MVP volumes)
- Assessment integration (external tools continue standalone)

### Post-MVP Features

**Phase 2 — Communication & Publication (Q4 2026):**
- O365 mailbox sync via Graph API
- Embeddable vacancy widget (multi-site)
- Headless vacancy API (REST/JSON)
- QR codes per vacancy
- Candidate comparison side-by-side

**Phase 3 — Intelligence & Extras (2027):**
- Pipeline dashboard with analytics
- Digital assessment integration
- Employee referral system
- CV parser (AI extraction)
- Anonymous screening (double opt-in)
- GDPR auto-retention with talent pool
- Multi-channel publication

### Risk Mitigation Strategy

**Technical Risks:**

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Pipeline Kanban complexity (drag & drop + RBAC + real-time) | Medium | High | Use proven library (dnd-kit); implement RBAC filtering server-side; add real-time last |
| Field-level RBAC scoping is architecturally more complex than expected | Medium | High | Start with role-based views (headhunter/reviewer/shared) before full field-level granularity; existing RBAC v2 patterns provide foundation |
| Candidate-to-Starter bridge data mapping | Low | Medium | Start with manual "convert to starter" button; automate after core flow works |
| Public page SEO + performance under production load | Low | Medium | Leverage Next.js SSR defaults; optimize after launch if needed |

**Market Risks:**
- Low — this is an internal tool replacing a known SaaS. No market validation needed. The "market" is one headhunter who has explicitly stated requirements.

**Resource Risks:**

| Scenario | Contingency |
|----------|-------------|
| Timeline pressure (August deadline tight) | Defer: comment threads, candidate comparison, real-time SSE updates. Core pipeline + RBAC + public page is the absolute minimum |
| Unexpected technical blocker | Simplify: start with fixed pipeline stages (not configurable per vacancy); add configurability post-launch |
| Recruitee data migration complexity | Parallel run: keep Recruitee read-only for historical data; new vacancies in Airport only |

**Absolute Minimum (if everything goes wrong):**
Vacancy creation + candidate intake + pipeline (without drag & drop, use simple stage-change buttons) + basic RBAC (headhunter vs read-only) + public page. This would still allow cancelling Recruitee.

## Functional Requirements

### Vacancy Management

- FR1: Headhunter can create a vacancy from a reusable template linked to an existing job function
- FR2: Headhunter can build vacancy content from modular blocks (intro, team description, requirements, benefits, media)
- FR3: Headhunter can define hard requirements (dealbreakers) per vacancy that auto-filter candidates
- FR4: Headhunter can define weighted nice-to-have preferences per vacancy that score candidates
- FR5: Headhunter can attach photos from a central SharePoint library to vacancy content
- FR6: Headhunter can publish a vacancy to make it visible on the entity's public page
- FR7: Headhunter can unpublish or close a vacancy to stop accepting applications
- FR8: Headhunter can configure pipeline stages per vacancy (add, remove, reorder stages)
- FR9: Admin can create and manage vacancy templates available to headhunters

### Candidate Management

- FR10: Candidate can apply to a vacancy without creating an account (one-click apply)
- FR11: Candidate can upload a CV document as part of their application
- FR12: Candidate can provide optional additional information (motivation, availability)
- FR13: System stores candidate personal data with GDPR-compliant processing basis
- FR14: Headhunter can view a complete candidate profile with all submitted data
- FR15: Headhunter can manually add a candidate to a vacancy (direct entry without application form)
- FR16: System auto-filters candidates who fail dealbreaker requirements
- FR17: System scores candidates on nice-to-have criteria with configurable weights

### Pipeline & Selection

- FR18: Headhunter can view all candidates for a vacancy in a Kanban board organized by pipeline stage
- FR19: Headhunter can move candidates between pipeline stages via drag and drop
- FR20: Headhunter can move a candidate to "Rejected" triggering the rejection workflow
- FR21: Headhunter can move a candidate to "Hired" triggering the starter creation flow
- FR22: System sends configured status email to candidate on each pipeline stage transition
- FR23: Users see pipeline changes made by other users within 2 seconds via server-sent events

### Evaluation & Scoring

- FR24: Headhunter can define a scorecard template with evaluation criteria per vacancy
- FR25: Reviewer can score a candidate on each criterion in the scorecard
- FR26: Reviewer can add a text recommendation alongside their scores
- FR27: Headhunter can view aggregated scores across all reviewers for a candidate
- FR28: Headhunter can compare multiple candidates side-by-side on scores and qualifications (Phase 2)

### Access Control & Sharing

- FR29: Headhunter can view and edit all candidate data for vacancies within their entities
- FR30: Headhunter can share a candidate with a specific Airport user, selecting which data fields are visible
- FR31: Headhunter can set shared access as temporary (auto-expiring after evaluation) or permanent when sharing a candidate
- FR32: Technical reviewer can view only the shared fields plus the evaluation form for shared candidates
- FR33: Shared access automatically expires after the reviewer submits their evaluation
- FR34: System logs all candidate data access with actor, timestamp, fields viewed, and access mechanism
- FR35: Admin can configure default access templates per reviewer role (pre-defined field sets)

### Communication

- FR36: System sends automatic confirmation email to candidate upon application receipt
- FR37: Admin can configure email templates per pipeline stage with variable substitution
- FR38: Headhunter can manually trigger or suppress status emails for individual stage transitions
- FR39: Users can post internal comments on a candidate's profile visible only to authorized colleagues
- FR40: O365 mailbox sync links emails to/from candidate to their profile automatically (Phase 2)
- FR41: Headhunter can mark emails as private to exclude them from candidate file (Phase 2)

### Public Presence

- FR42: System hosts public vacancy listing pages per entity with active vacancies
- FR43: Candidate can view a dedicated public detail page per vacancy with structured content and apply button
- FR44: Public pages are indexable by search engines with structured vacancy metadata (title, location, requirements)
- FR45: Admin can configure site grouping (which entities share a public vacancy page)
- FR46: System provides an embeddable vacancy display for external websites per site group (Phase 2)
- FR47: System provides a headless REST/JSON API for vacancies per site group (Phase 2)
- FR48: System generates unique QR codes linking to individual vacancy pages (Phase 2)

### Compliance & Audit

- FR49: Admin can configure candidate data retention period as a system setting
- FR50: System sends retention expiry notification to candidates before deletion
- FR51: System removes candidate data after retention period, with a configurable grace period before permanent deletion, unless consent is renewed
- FR52: Candidate can request export of all their stored personal data (right to access)
- FR53: Candidate can request deletion of their data (right to erasure) with audit confirmation
- FR54: System retains audit logs as immutable, append-only records independent of candidate data deletion
- FR55: DPO can access audit reports showing all candidate data processing activities

### Integration & Flow

- FR56: System auto-creates a Starter record in Airport when candidate reaches "Hired" status, pre-filling from candidate data
- FR57: System populates the created Starter with correct entity, job function, and start date from vacancy context
- FR58: Candidate can continue using the same portal login after hire, transitioning from application status to pre-onboarding tasks
- FR59: System integrates with existing Airport notification system for share requests and evaluation completions
- FR60: System integrates with existing Airport RBAC v2 permission infrastructure

### Dashboard & Analytics

- FR61: Management can view recruitment pipeline metrics per entity and globally on the Airport dashboard (Phase 3)
- FR62: Management can view a funnel visualization showing candidate counts per pipeline stage (Phase 3)
- FR63: System displays SLA indicators on vacancies where candidates exceed configured stage duration thresholds (Phase 3)

## Non-Functional Requirements

### Performance

| Metric | Requirement | Context |
|--------|-------------|---------|
| Pipeline Kanban initial load | < 1 second | Headhunter opens this dozens of times daily |
| Drag & drop visual feedback | < 100ms | Must feel instant for stage transitions |
| Public vacancy page LCP | < 1.5 seconds | SEO ranking factor + candidate first impression |
| Application form submission | < 500ms server response | Perceived speed prevents candidate drop-off |
| Candidate profile load (full) | < 1 second | Headhunter reviewing candidates in sequence |
| Shared reviewer view load | < 2 seconds | Reviewer has low patience for non-core tasks |
| Search/filter within pipeline | < 500ms | Headhunter expects instant filtering |

### Security

- All candidate personal data encrypted at rest (database-level encryption)
- All data in transit encrypted via TLS 1.3
- No candidate PII logged in application error logs or debug output
- Session-based authentication for all internal interfaces (existing NextAuth flow)
- Public application form protected against spam (rate limiting + honeypot, no CAPTCHA)
- Shared candidate views use time-limited, non-guessable session tokens (no permanent URLs with data)
- File uploads (CV documents) scanned and stored outside web-accessible paths
- API endpoints validate input schemas at boundary — reject malformed input before processing

For GDPR-specific security requirements (field-level access, audit logging, data retention), see [Domain-Specific Requirements](#domain-specific-requirements).

### Accessibility

- Public vacancy pages and application form: WCAG 2.1 Level AA compliance
- Pipeline Kanban: keyboard operable (arrow keys for stage navigation, Enter to open candidate)
- Scorecard evaluation form: fully accessible via screen reader and keyboard
- All interactive elements have visible focus indicators
- Color is never the sole indicator of state (pipeline stages use icons + labels alongside color)
- Form validation errors announced to assistive technology

### Integration

- Microsoft Graph API calls tolerate transient failures with retry logic (3 attempts, exponential backoff)
- SharePoint photo library integration handles unavailability gracefully (placeholder shown, no blocking error)
- SSE event bus connection auto-reconnects on disconnect (existing pattern)
- Pre-onboarding bridge operates as atomic transaction — candidate-to-starter creation either succeeds completely or rolls back
- Email delivery (SendGrid) failures logged but non-blocking — candidate status email queued for retry

### Reliability

- System available during Belgian business hours (Mon–Fri, 08:00–18:00) with 99% uptime target
- Database backups: daily automated with 30-day retention (existing infrastructure)
- Zero data loss on candidate applications — submissions persisted before confirmation shown
- Graceful degradation: if Graph API unavailable, core recruitment flow (pipeline, evaluation) continues unaffected
- Public vacancy pages cached and served even during backend maintenance
