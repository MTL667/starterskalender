---
stepsCompleted: ["step-01-init", "step-02-discovery", "step-02b-vision", "step-02c-executive-summary", "step-03-success", "step-04-journeys", "step-05-domain", "step-06-innovation", "step-07-project-type", "step-08-scoping", "step-09-functional", "step-10-nonfunctional", "step-11-polish", "step-12-complete"]
completedAt: "2026-04-08"
inputDocuments:
  - docs/project-context.md
workflowType: 'prd'
documentCounts:
  briefCount: 0
  researchCount: 0
  brainstormingCount: 0
  projectDocsCount: 1
classification:
  projectType: web_app
  domain: general
  complexity: medium
  projectContext: brownfield
---

# Product Requirements Document - Starterskalender

**Author:** Kevin
**Date:** 2026-04-07

## Executive Summary

Starterskalender is an internal HR platform that centralizes the management of employee lifecycle events — onboarding, offboarding, and internal migrations — across multiple organizational entities. It replaces fragmented Excel-based workflows with a structured, calendar-driven system that provides HR teams with a unified view of all personnel movements, automated task generation, material provisioning tracking, and proactive email notifications.

The platform serves organizations operating multiple entities (subsidiaries, departments, divisions) where HR administrators must coordinate personnel movements involving different job roles, responsible stakeholders, and entity-specific processes. Target users range from HR administrators with full management capabilities to entity-level editors and viewers, and global viewers who need cross-entity oversight.

The core problem: managing dozens of starters per month across multiple entities using spreadsheets causes tasks to fall through the cracks, materials to be forgotten, and no single person to have the complete picture. Starterskalender solves this by embedding structure and automation into the onboarding/offboarding process.

### What Makes This Special

The combination of four capabilities in a single platform tailored to multi-entity organizations:

1. **Unified calendar view** across all entities with week/month/year/custom perspectives, showing onboarding, offboarding, and migration events with entity-specific color coding and type-based visual distinction.
2. **Automatic task orchestration** — task templates generate role-specific and entity-specific action items (IT setup, HR admin, facilities, manager actions) with assignment, deadlines, and notification channels the moment a starter is registered.
3. **Proactive stakeholder communication** — weekly, monthly, quarterly, and yearly email digests automatically notify relevant users based on their entity memberships and notification preferences, distinguishing between starters, leavers, and internal transfers.
4. **Digital document signing** — HR uploads contracts and documents for digital signing by starters. The system supports two methods: a simple electronic signature (SES) for internal confirmations, and a qualified electronic signature (QES) via itsme/eID (powered by Quill by Dioss) for legally binding documents — with automatic archival of signed PDFs to SharePoint.

The core insight: generic HR systems are not built for the operational complexity of multi-entity organizations where each entity has its own job roles, material requirements, blocked periods, and responsible stakeholders. Starterskalender provides entity-aware automation that scales with organizational complexity.

## Project Classification

- **Type:** Web application (Next.js 16, App Router, standalone Docker deployment)
- **Domain:** General / HR Enterprise — internal workforce lifecycle management
- **Complexity:** Medium — role-based access control with 5 tiers, entity-scoped permissions via memberships, Azure AD SSO, automated email system with 4 scheduled types, material provisioning matrix
- **Context:** Brownfield — fully operational production system deployed on Easypanel with PostgreSQL, serving active users via Azure AD authentication

## Success Criteria

### User Success

- **Single point of truth**: HR staff no longer switch between Excel, email, and other tools — all information about starters, leavers, and migrations lives in one place.
- **Zero missed tasks**: No onboarding or offboarding task is forgotten thanks to automatic task generation and proactive notifications.
- **Instant overview**: Every user sees a complete picture of all ongoing and planned personnel movements within seconds via the calendar view.
- **Trust in completeness**: The "aha moment" is when an HR employee stops maintaining a parallel Excel file because Starterskalender covers everything.

### Business Success

- **Time savings**: Significant reduction in manual work around onboarding/offboarding, with the long-term goal of saving the equivalent of **1 FTE**.
- **Error reduction**: Elimination of forgotten materials, missed tasks, and uninformed stakeholders — measurable via the number of post-start-date corrections.
- **Adoption**: 100% of HR staff uses Starterskalender as the primary source; no parallel Excel tracking remains.
- **Data authority**: Starterskalender becomes the authoritative source (single point of truth) for employee lifecycle data, forming the foundation for downstream integrations.

### Technical Success

- **Reliable automation**: Cron-based email notifications (weekly, monthly, quarterly, yearly) are delivered consistently and on time.
- **Scalable multi-entity model**: The system supports adding new entities without architectural changes.
- **Integration-ready**: Data structures and APIs are designed to serve as a source for ERP integrations.
- **Availability**: >99% uptime via Docker/Easypanel deployment with PostgreSQL.

### Measurable Outcomes

| Metric | Baseline (Excel) | Target |
|---|---|---|
| Time per starter registration | ~15-30 min | <5 min |
| Missed tasks per month | Unknown (untracked) | 0 |
| Parallel Excel files | Multiple per entity | 0 |
| HR admin lifecycle time investment | Multiple FTEs | -1 FTE |
| Stakeholder notification coverage | Ad hoc / manual | 100% automated |
| Contract signing turnaround | Days (print, sign, scan) | <24 hours |
| Forgotten documents per month | Unknown | 0 |
| Legally binding signatures | Manual via paper | 100% digital via itsme/eID |

## User Journeys

### Journey 1: Sophie — HR Admin (Primary User, Success Path)

**Who she is:** Sophie (34) is an HR Business Partner at an organization with 6 entities. She coordinates 15-25 starters, leavers, and internal migrations monthly. Previously she maintained a separate Excel file per entity, a shared mailbox full of requests, and a notebook of "things I must not forget."

**Opening Scene:** Monday morning. Sophie opens Starterskalender and immediately sees in the calendar view that 4 starters and 2 leavers are scheduled this week, spread across 3 entities. She doesn't need to open a single Excel file.

**Rising Action:** She registers a new starter for next month: Jan, Software Developer at entity "HQ". She selects the job role, entity, and start date. The system automatically generates 12 tasks — IT setup, badge request, workspace preparation, contract preparation — each assigned to the appropriate responsible person. She adds the required materials: laptop, headset, welcome package. Everything in under 5 minutes.

**Climax:** Thursday, Sophie discovers that a colleague had forgotten to complete a task for a starter arriving tomorrow. But she didn't discover it herself — the system had already notified the responsible person via the weekly digest. The task was completed after all. Previously, this would have caused panic on the start day.

**Resolution:** At the end of the month, Sophie pulls the statistics. All 18 starters this month are fully onboarded, zero forgotten materials, zero missed tasks. She closes her laptop and goes home on time. The parallel Excel file? She deleted it 3 months ago.

**Reveals requirements for:** Starter registration, automatic task generation, material provisioning, calendar view, statistics dashboard, email notifications.

---

### Journey 2: Mark — Entity Editor (Secondary User, Scoped Operations)

**Who he is:** Mark (41) is an office manager at entity "Gent". He's responsible for the practical side of onboarding at his location: workspaces, keys, parking cards. He doesn't need to know what's happening at other entities.

**Opening Scene:** Monday morning, Mark receives an automatic email: "2 new employees start at Gent this week." The email contains names, job roles, and start dates. He clicks through to Starterskalender.

**Rising Action:** In his task list, Mark sees 6 tasks assigned to him — 3 per starter. Prepare workspace, request badge, arrange parking card. He clicks the first one, reads the details, and marks it as completed. The next morning he repeats this for the badge.

**Climax:** One of the starters is unexpectedly transferred to entity "Antwerpen". Mark sees the tasks for that starter disappear from his list — Sophie processed the migration and the tasks were automatically reassigned to the office manager in Antwerpen. No duplicate work, no confusion.

**Resolution:** Mark spends 15 minutes per week on Starterskalender. Previously it cost him an hour to check Excel lists and answer emails with "yes, that's been arranged." Now he marks tasks as done and moves on with his day.

**Reveals requirements for:** Entity-scoped views, task assignment and completion, email notifications, migration handling with task reassignment.

---

### Journey 3: Anja — Global Viewer (Management Oversight)

**Who she is:** Anja (52) is HR Director overseeing all 6 entities. She has no need to register starters or check off tasks — she wants the big picture.

**Opening Scene:** Anja is preparing the quarterly report for the board. She opens Starterskalender and navigates to the statistics.

**Rising Action:** She filters on the past quarter and sees per entity how many starters, leavers, and migrations were processed. She switches to the calendar view at year level and sees a clear peak in September — the new academic year. She notes this as input for capacity planning.

**Climax:** She notices that entity "Luik" has a notably high percentage of incomplete tasks. She clicks through and sees that the responsible person there has been leaving tasks unfinished for 3 weeks. She sends a targeted message to Sophie to follow up.

**Resolution:** The quarterly report is ready in 20 minutes with concrete figures and trends. Last year it took her a full day to compile the same data from 6 different Excel files.

**Reveals requirements for:** Cross-entity calendar view, statistics and reporting, read-only access model, entity comparison.

---

### Journey 4: The System — Automatic Orchestration (Non-Human Actor)

**What it does:** Every night and at fixed intervals, Starterskalender runs automated processes without human intervention.

**Weekly cycle:** Sunday evening 22:00. The weekly cron job starts. The system processes all starters with a start date in the coming week. Per starter, the responsible persons are determined based on entity memberships and notification preferences. 47 personalized emails are composed and sent via SendGrid — each with the correct starters, leavers, and migrations for that specific recipient.

**Monthly cycle:** First day of the month. A broader overview is sent: all expected personnel movements for the coming month, grouped by entity.

**Task generation trigger:** When Sophie registers a new starter, the system immediately generates tasks based on task templates linked to the job role and entity. Each task receives a deadline, a responsible person, and a priority.

**Failure recovery:** If SendGrid cannot deliver an email, this is logged in the email logs. An HR Admin can see in the admin panel which emails were sent, failed, or pending.

**Reveals requirements for:** Cron scheduling (4 frequencies), email template engine, notification preference system, task template engine, email logging, error handling.

---

### Journey 5: Tom — Super Admin (Future Role, Technical Operations)

**Who he is:** Tom (38) is the IT Manager. He manages the technical infrastructure of Starterskalender: user management, entity configuration, system settings, and eventually ERP integrations. He has no access to HR-content data such as individual starter details or task progress.

**Opening Scene:** A new entity "Hasselt" is being established. Tom opens the admin panel and creates the entity with the correct color coding and blocked periods. He configures the job roles available for this entity and links the default materials.

**Rising Action:** Tom then manages user access: he adds 3 new users with the correct roles (1 entity editor, 2 entity viewers) and links them to entity "Hasselt". He configures the email templates and verifies that the cron jobs are running correctly.

**Climax:** The ERP integration for "Hasselt" needs to be set up (growth feature). Tom configures the connection with the payroll system and tests the automatic data push. When Sophie later registers a starter at "Hasselt", the data is automatically forwarded to payroll.

**Resolution:** Tom has the complete technical setup ready without ever needing to see individual starter data. The separation between technical management and HR content ensures that sensitive personnel information remains restricted to HR roles.

**Reveals requirements for:** Entity management, user/role management, ERP integration configuration, email template management, system monitoring, separation of technical admin from HR data access.

---

### Journey 6: Sophie — Edge Case (Error Recovery)

**The scenario:** Sophie accidentally registers a starter at the wrong entity. Tasks have already been generated and assigned to the wrong people.

**Discovery:** Mark calls: "I have tasks for a Jan Pieters, but that name means nothing to me." Sophie checks and sees her mistake.

**Recovery:** Sophie changes the starter's entity. The system recalculates the tasks: old tasks are cancelled, new tasks are generated for the correct entity and responsible persons. The material list is adjusted to match the job roles of the new entity.

**Resolution:** Within 2 minutes, everything is corrected. No manually walking through tasks, no emails to wrong people. The system handles the cascade.

**Reveals requirements for:** Starter editing with cascading updates, task regeneration on entity change, material reassignment, error recovery without data loss.

---

### Journey 7: Sophie — Document Signing (SES Flow)

**Who she is:** Same Sophie from Journey 1 — HR Business Partner coordinating starters across 6 entities.

**Opening Scene:** Sophie has just registered Jan as a new Software Developer at entity "HQ". Alongside the 12 generated tasks, Jan needs to sign an employment contract and an NDA before his start date.

**Rising Action:** Sophie opens Jan's starter detail page and navigates to the Documents section. She uploads the employment contract PDF, enters the document title "Arbeidscontract", selects "Interne bevestiging (SES)" as the signing method, and enters Jan's email address. After uploading, she opens the PDF field placer and positions the signature box at the bottom of the last page. She repeats for the NDA, setting the employment contract as a prerequisite — Jan must sign the contract before the NDA becomes available.

**Climax:** Sophie clicks "Mail versturen". Jan receives a branded email with a clear call-to-action. He clicks the link, sees the document with the signature field, enters his name, and signs. The system embeds the signature in the PDF, uploads the signed version to SharePoint, marks the linked task as completed, and sends Jan a confirmation email with a download link.

**Resolution:** Sophie sees both documents turn green in the progress bar. The linked tasks are completed automatically. The signed PDFs are archived in Jan's SharePoint folder. She didn't need to print, scan, or chase a single document.

**Reveals requirements for:** PDF upload, signature field placement, SES signing page, signing email with branded template, signed PDF archival to SharePoint, document prerequisite chains, linked task completion, confirmation email.

---

### Journey 8: Sophie — Legally Binding Signature (QES Flow)

**Who she is:** Same Sophie — but now she needs a legally binding signature for a confidentiality agreement with a contractor.

**Opening Scene:** The legal department requires that the confidentiality agreement for external contractor Lisa is signed via a qualified electronic signature (QES) to be legally equivalent to a handwritten signature.

**Rising Action:** Sophie uploads the confidentiality agreement PDF, selects "Itsme (gekwalificeerd)" as the signing method, and enters Lisa's email. The system uploads the PDF to SharePoint, creates a guest user in Quill, creates the document in Quill with a webhook URL, uploads the binary, and obtains a signing URL — all behind the scenes. Sophie sees a "Wacht op handtekening" badge on the document.

**Climax:** Sophie clicks "Mail versturen". Lisa receives the email through Starterskalender's SendGrid, not Quill — maintaining consistent branding. Lisa clicks the link, which takes her to the Quill signing interface. She authenticates via the itsme app on her phone and signs. Quill sends a webhook to Starterskalender. The system verifies the event, downloads the signed PDF from Quill, uploads it to SharePoint, marks the document as signed, completes the linked task, and sends Lisa a confirmation email.

**Resolution:** The signed document carries the legal weight of a handwritten signature under eIDAS regulation. Sophie can see the complete audit trail: creation, email sent, itsme signature, SharePoint archival. No paper, no scanning, no courier.

**Reveals requirements for:** QES signing method selection, Quill API integration (guest user, document, binary upload, send, signing URL), webhook processing, signed PDF download and archival, Quill status tracking, hybrid signing method per document.

---

### Journey 9: Jan — Signing a Document (Starter Perspective)

**Who he is:** Jan (28) is starting as a Software Developer at entity "HQ" next month. He has never used Starterskalender — he is an external signer.

**Opening Scene:** Jan receives an email from Starterskalender on behalf of Sophie's organization. The email has a professional design, lists the document "Arbeidscontract", and contains a prominent "Documenten bekijken en ondertekenen" button.

**Rising Action (SES):** Jan clicks the button. He sees the employment contract PDF rendered in the browser with a signature field. He types his full name, clicks "Ondertekenen", and confirms. The page shows a success message.

**Rising Action (QES):** For the NDA, Jan receives a second email. This time, the button takes him to the Quill signing interface. He sees the document and a prompt to sign via itsme. He opens the itsme app, confirms his identity, and the signature is applied.

**Resolution:** Jan receives two confirmation emails — one per signed document — each with a download link to the signed PDF. He never needed an account in Starterskalender. The entire process took 5 minutes on his phone.

**Reveals requirements for:** Public signing page (no authentication), email template with signing link, QES redirect to Quill, confirmation email with download link, mobile-friendly signing experience.

---

### Journey Requirements Summary

| Capability Area | Journeys |
|---|---|
| Starter/leaver/migration registration | Sophie, Mark, System |
| Calendar view (multi-entity, multi-period) | Sophie, Anja |
| Automatic task generation & assignment | Sophie, System, Edge Case |
| Task completion workflow | Mark |
| Material provisioning & tracking | Sophie, Edge Case |
| Email notifications (4 frequencies) | Mark, System |
| Statistics & reporting | Sophie, Anja |
| Role-based access control | All journeys |
| Entity management & configuration | Tom |
| User & role management | Tom |
| ERP integration (growth) | Tom |
| Error recovery & cascading updates | Edge Case |
| Separation of technical vs HR admin | Tom, Sophie |
| Document upload & signing (SES) | Sophie (J7), Jan (J9) |
| Qualified electronic signature (QES/itsme) | Sophie (J8), Jan (J9) |
| Document prerequisite chains | Sophie (J7) |
| Signed PDF archival to SharePoint | Sophie (J7, J8), System |
| Signing audit trail | Sophie (J7, J8) |

## Domain-Specific Requirements

### Compliance & Regulatory

- **GDPR compliance**: Personal employee data (names, start dates, job roles, entity assignments) is processed for legitimate business purposes. Data retention follows organizational policy — records are maintained as long as they serve business operations.
- **ISO certification requirements**: The organization is ISO certified. All system changes, user actions, and data modifications must be traceable through comprehensive audit logging. This includes who changed what, when, and from which state to which state.
- **User confidentiality agreement**: Users with elevated access rights (HR Admin, Entity Editor, Super Admin) must sign a confidentiality agreement before gaining access to the system. The system should track agreement status and potentially restrict access until the agreement is signed.

### Data Access & Privacy Boundaries

- **Strict entity scoping**: Entity Editors can only view AND modify data for entities they are explicitly assigned to. No cross-entity data leakage is permitted — this applies to starters, tasks, materials, calendar views, and statistics.
- **Role-based data separation**: The future Super Admin role has full technical/configuration access but zero visibility into HR-content data (individual starter details, task progress, personal information). HR Admins have full HR data access but limited technical configuration capabilities.
- **Audit trail integrity**: All audit logs must be immutable and retained according to ISO requirements. Logs must capture: actor identity, timestamp, action type, affected entity, before/after state.

### Digital Signing & eIDAS Compliance

- **eIDAS Regulation (EU 910/2014):** The system supports two levels of electronic signature as defined by eIDAS. Simple Electronic Signatures (SES) serve as internal digital confirmations without specific legal standing. Qualified Electronic Signatures (QES) via itsme/eID carry the legal equivalence of handwritten signatures. HR selects the appropriate level per document.
- **Quill integration (Dioss Smart Solutions):** QES signing is delegated to the Quill platform, a certified eSignature service. The integration uses Quill's API V2 for document lifecycle management, guest user creation, and signing URL generation. Quill's own email notifications are suppressed — all communication to signers flows through the platform's SendGrid setup for consistent branding.
- **Signed document archival:** Both original and signed PDF documents are stored in the starter's SharePoint folder. Signed documents include an embedded signature (SES) or a Quill-certified signature (QES). The Quill Evidence Report (sealed audit proof) can be downloaded for legal proceedings.
- **Signing token security:** Public signing links (SES) use cryptographically random tokens. QES signing URLs contain Quill-generated guest keys. Both are treated as sensitive data and are not exposed in logs or error messages.
- **Document retention:** Signed documents are retained in SharePoint according to organizational retention policy. Quill retains documents according to the company's Quill document settings (configurable retention period).

### Integration Requirements

- **Integration architecture**: ERP integrations are a growth feature. Target systems and protocols are TBD. Architecture supports pluggable, entity-dependent integrations.
- **API readiness**: Internal APIs support future external consumption — consistent authentication, clear data contracts, and versioning.
- **Identity provider integration**: Azure AD SSO serves as the foundation. Future growth includes automatic email/account provisioning via Microsoft 365 / Azure AD APIs.

### Risk Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Cross-entity data exposure | Privacy breach, trust loss | Strict entity-scoped queries at database level, not just UI filtering |
| Unauthorized access to HR data | Confidentiality breach | User agreement enforcement, role separation, audit logging |
| Audit log gaps | ISO non-compliance | Immutable logging on all write operations, regular audit log reviews |
| ERP integration data leakage | Sensitive data in wrong system | Entity-specific integration configs, data mapping validation per integration |
| User agreement not signed | Unauthorized data access | System-level gate: block elevated access until agreement is confirmed |
| Quill API unavailability | QES documents cannot be signed | Graceful degradation: document uploaded to SharePoint regardless; Quill setup retried via webhook |
| Signing token/URL leakage | Unauthorized document access | Cryptographically random tokens; URLs treated as sensitive; not logged in plain text |
| Expired QES signing links | Starter cannot sign | Quill webhooks update status to EXPIRED; HR notified to re-send |

## Innovation & Novel Patterns

### Detected Innovation Areas

Starterskalender excels through execution of proven patterns applied to a specific niche. Several innovation trajectories emerge from the platform's unique position:

1. **Single Point of Action**: Beyond being a single point of truth (data authority), the platform evolves into a single point of action — where one registration triggers zero-touch provisioning cascades across external systems (Azure AD account creation, Microsoft 365 licensing, IT asset ordering, facility management).

2. **Predictive HR Operations**: Historical data on seasonal peaks, turnover rates per entity, and average lead times per job role enables the system to forecast upcoming personnel movements and proactively suggest capacity planning actions.

3. **Bi-directional Onboarding**: Extending the platform from an HR-only tool to include the new employee as a participant — self-service onboarding progress tracking, document uploads, and direct communication with responsible stakeholders.

4. **Entity Performance Benchmarking**: Measurable onboarding quality scores per entity (on-time task completion rate, material coverage, lead times) creating accountability and healthy competition between entities.

5. **Hybrid Signing Strategy**: The platform supports both simple electronic signatures (SES) for internal confirmations and qualified electronic signatures (QES) via itsme/eID for legally binding documents. HR chooses per document (and later per template with override), enabling organizations to use the right level of legal assurance for each document type — without external signing portals or separate workflows. All signing emails flow through the platform's own branding, not the QES provider's.

### Market Context & Competitive Landscape

Generic HR platforms (BambooHR, Personio, Workday) assume single-entity, single-process organizations. Starterskalender's defensibility: entity-aware automation that scales with organizational complexity — a niche off-the-shelf products do not serve.

### Validation Approach

- **KPI Dashboard**: Build measurable validation into the product itself — on-time task completion rate, average time from registration to full onboarding completion, material coverage percentage, email notification delivery rates.
- **Baseline establishment**: Since the Excel-era baseline was never measured, establish forward-looking KPIs from the current system and track improvement over time.
- **Adoption metric**: Track parallel Excel file elimination as a concrete adoption indicator — target: zero parallel tracking.

## Web Application Specific Requirements

### Project-Type Overview

Next.js 16 web application (App Router), deployed as standalone Docker container on Easypanel. Internal enterprise tool accessed exclusively via Azure AD SSO — no public-facing pages, no SEO, no offline requirements.

### Technical Architecture Considerations

**Rendering Strategy:**
- Hybrid rendering via Next.js App Router: server components for data fetching, client components for interactive UI
- No SSG/ISR needed — all pages are behind authentication
- Online-only; no service worker or PWA capabilities required

**Browser Support Matrix:**

| Browser | Support Level |
|---|---|
| Chrome (latest 2 versions) | Full support |
| Edge (latest 2 versions) | Full support |
| Firefox (latest 2 versions) | Full support |
| Safari (latest 2 versions) | Full support |
| Mobile browsers (iOS Safari, Chrome Android) | Full support |

Cross-browser testing should cover all major rendering engines: Blink (Chrome/Edge), Gecko (Firefox), and WebKit (Safari).

### Real-Time Communication

**Current state:** All data updates require manual page refresh or re-navigation. Task assignments, status changes, and new starter registrations are only visible after reload.

**Target state:** Real-time updates for key events:
- **Task assignments**: When Sophie assigns a task, Mark sees it appear immediately in his task list
- **Task status changes**: When Mark completes a task, Sophie's dashboard updates live
- **Starter registration**: New starters appear on the calendar for all relevant entity members without refresh
- **Notification indicators**: Live badge counts for pending tasks, upcoming starters

**Technical approach considerations:**
- **WebSocket / Server-Sent Events (SSE)**: For push-based real-time updates from server to client
- **Scope**: Entity-scoped channels — users only receive real-time updates for entities they have access to (aligns with RBAC and privacy requirements)
- **Graceful degradation**: If WebSocket connection drops, the application should fall back to polling or manual refresh without data loss

### Responsive Design

- Desktop-first design (primary use case is HR staff at workstations)
- Responsive layout for tablet and mobile access (entity editors like Mark may check tasks on-the-go)
- No dedicated mobile app required — responsive web covers mobile needs

### Implementation Considerations

- **SEO**: Explicitly out of scope — no meta tags, sitemaps, or crawl optimization needed
- **Accessibility**: No formal WCAG compliance requirements, but standard usability best practices should be maintained (readable fonts, sufficient contrast, keyboard-navigable forms)
- **Offline**: Not supported — online-only application
- **Internationalization**: Already implemented (NL/FR) — architecture supports additional languages

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-solving MVP — the current production system already validates the core hypothesis that structured, entity-aware onboarding management replaces Excel chaos. The MVP is proven and adopted.

**Resource Model:** Development is handled as a focused initiative rather than a dedicated product team. Phased delivery must be realistic in scope per iteration and self-contained — each feature should deliver standalone value without depending on other Phase 2 features.

### MVP Feature Set (Phase 1) — Current Production

**Core User Journeys Supported:** Sophie (HR Admin), Mark (Entity Editor), Anja (Global Viewer), System (automation)

**Delivered Capabilities:**
- Starter/leaver/migration registration with entity scoping
- Calendar view (week/month/year/custom) with entity and type filtering
- Automatic task generation based on templates, job roles, and entities
- Material provisioning per job role with multi-status tracking (pending, in stock, ordered, received, reserved)
- Role-based access control (5 tiers + granular permissions) with Azure AD SSO
- Automated email notifications (weekly, monthly, quarterly, yearly) with cron health monitoring
- Statistics dashboard
- Multi-language support (NL/FR)
- Blocked periods management per entity
- Audit logging for ISO compliance
- Admin panel for entities, users, job roles, materials, email templates
- Document signing (SES): PDF upload to SharePoint, signature field placement, public signing page, signed PDF archival, prerequisite document chains, signing email via SendGrid, confirmation email with download link
- Document signing (QES): Quill by Dioss integration for itsme/eID qualified signatures, webhook-based document lifecycle, automatic signed PDF download and SharePoint archival

### Phase 2: Growth — Prioritized Roadmap

**Priority 1: Real-Time Updates**
- WebSocket/SSE infrastructure for live data push
- Entity-scoped channels (privacy-compliant)
- Live task assignment and completion updates
- Calendar auto-refresh on new starter registration
- Notification badge indicators
- Graceful degradation to polling on connection loss

**Priority 2: KPI Dashboard**
- On-time task completion rate per entity
- Average onboarding lead time (registration → all tasks complete)
- Material coverage percentage
- Entity performance comparison
- Trend analysis over configurable periods

**Priority 3: Super Admin Role Separation**
- Split current HR_ADMIN into Super Admin (broad operational) and HR Admin (HR-content specialist)
- Super Admin: full access to current functionality — entity config, user management, materials, job roles, email templates, system settings, integration config, starters, tasks, calendar, statistics
- HR Admin: same current access, plus exclusive access to future Phase 3 features (Employee Journey data, bi-directional onboarding portal, personal employee timelines)
- The role separation is forward-looking: in current state both roles have identical permissions. The distinction activates when Phase 3 HR-content features are built
- User confidentiality agreement tracking and enforcement applies to both roles

**Priority 4: ERP Integrations**
- Pluggable integration architecture (entity-dependent configs)
- First integration: automatic email/account provisioning via Azure AD / Microsoft 365
- Subsequent: payroll system push, IT asset management triggers
- Per-entity integration configuration (each entity may use different ERP systems)
- Integration health monitoring and error logging
- Reduced risk: ERP systems are internally managed, allowing close coordination

**Priority 5: Advanced Reporting**
- Cross-entity trend reports
- Onboarding process bottleneck identification
- Export capabilities for board reporting

### Phase 3: Vision — Future Expansion

**Employee Journey Platform:**
- Full employee timeline beyond onboarding/offboarding
- Special period tracking: parental leave, long-term illness, secondment, training
- Period-specific task generation and stakeholder notification
- Lifecycle-wide dashboard per employee
- Exclusive to HR Admin role (not accessible by Super Admin)

**Predictive HR Operations:**
- Historical pattern analysis (seasonal peaks, turnover rates)
- Proactive capacity planning suggestions
- Forecasting for material procurement and resource allocation

**Bi-directional Onboarding:**
- Starter self-service portal (limited access)
- Personal onboarding checklist and progress tracking
- Document upload capability
- Direct communication with assigned stakeholders
- Exclusive to HR Admin role (not accessible by Super Admin)

**Bi-directional ERP Sync:**
- Receive change events from external systems
- Conflict resolution for simultaneous updates
- Full data synchronization audit trail

### Risk Mitigation Strategy

**Technical Risks:**

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| WebSocket complexity in Next.js | Medium | Medium | Evaluate SSE as simpler alternative; use proven libraries (Socket.io, Pusher) |
| ERP integration variety | Low | Medium | Own systems reduce risk; pluggable architecture allows per-system adapters |
| Role separation migration | Low | High | Phased rollout: add Super Admin alongside existing HR_ADMIN, migrate gradually |

**Market Risks:**

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Feature request overload from HR teams | High | Medium | Formal product owner role; impact vs. effort prioritization framework |
| Adoption plateau | Low | High | KPI dashboard creates visibility and accountability, driving continued engagement |

**Resource Risks:**

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Limited development capacity | Medium | High | Each Phase 2 feature is self-contained; can be delivered independently without blocking others |
| Knowledge concentration | Medium | High | Document architecture decisions; PRD and technical docs serve as knowledge base |

## Functional Requirements

### Starter Lifecycle Management

- **FR1:** HR Admin can register a new starter with entity, job role, start date, and personal details
- **FR2:** HR Admin can register a leaver with entity, end date, and departure details
- **FR3:** HR Admin can register an internal migration between entities with transfer date
- **FR4:** HR Admin can edit a registered starter's details, including changing entity assignment
- **FR5:** HR Admin can delete or archive a starter record
- **FR6:** System automatically recalculates tasks and material assignments when a starter's entity or job role is changed
- **FR7:** Entity Editor can register starters, leavers, and migrations within their assigned entities only

### Calendar & Overview

- **FR8:** Users can view all personnel movements in a calendar view with week, month, year, and custom date range perspectives
- **FR9:** Users can filter the calendar by entity, starter type (onboarding/offboarding/migration), and date range
- **FR10:** Calendar displays entity-specific color coding and type-based visual distinction
- **FR11:** Global Viewer can view the calendar across all entities without modification capabilities
- **FR12:** Entity Editor and Entity Viewer can only view calendar data for their assigned entities

### Task Management

- **FR13:** System automatically generates tasks from templates when a starter is registered, based on job role and entity
- **FR14:** Each generated task includes an assignee, deadline, and priority level
- **FR15:** Assigned users can view their pending tasks filtered by status, priority, and entity
- **FR16:** Assigned users can mark tasks as completed with completion timestamp
- **FR17:** HR Admin can manually create, edit, and assign tasks
- **FR18:** HR Admin can manage task templates linked to job roles and entities
- **FR19:** System automatically cancels and regenerates tasks when a starter's entity changes

### Material Provisioning

- **FR20:** HR Admin can define materials required per job role
- **FR21:** System displays required materials for each starter based on their job role
- **FR22:** HR Admin can track material provisioning status per starter
- **FR23:** System warns when job roles exist without any materials assigned
- **FR24:** HR Admin can manage the material catalog (create, edit, deactivate materials)

### Automated Notifications

- **FR25:** System sends automated email digests at weekly, monthly, quarterly, and yearly frequencies
- **FR26:** Each email digest contains personalized content based on the recipient's entity memberships
- **FR27:** Email digests distinguish between starters, leavers, and migrations
- **FR28:** Users can configure their notification preferences per entity
- **FR29:** HR Admin can manage email templates with dynamic placeholders
- **FR30:** HR Admin can preview email recipients and trigger manual email sends
- **FR31:** System logs all sent emails with delivery status for audit purposes

### Real-Time Updates (Phase 2)

- **FR32:** Users receive live updates when tasks are assigned to them or completed by others
- **FR33:** Calendar view auto-refreshes when new starters are registered by other users
- **FR34:** Users see live notification indicators for pending actions
- **FR35:** Real-time updates are scoped to the user's entity access — no cross-entity data leakage
- **FR36:** System gracefully degrades to manual refresh if real-time connection is lost

### User & Access Management

- **FR37:** Super Admin can create, edit, and deactivate user accounts
- **FR38:** Super Admin can assign roles (HR Admin, Entity Editor, Entity Viewer, Global Viewer) to users
- **FR39:** Super Admin can manage entity memberships per user
- **FR40:** Users authenticate via Azure AD SSO
- **FR41:** Entity-scoped users can only access data for entities they are assigned to
- **FR42:** System tracks user confidentiality agreement status and can restrict access until agreement is confirmed

### Entity & Configuration Management

- **FR43:** Super Admin can create and configure entities with color coding and blocked periods
- **FR44:** Super Admin can manage job roles per entity
- **FR45:** Super Admin can manage blocked periods per entity (periods where no starters can be scheduled)
- **FR46:** Super Admin can configure email templates and cron job settings

### Statistics & Reporting

- **FR47:** Users can view statistics dashboards showing onboarding/offboarding/migration counts per entity
- **FR48:** HR Admin can view KPI metrics: on-time task completion rate, onboarding lead time, material coverage (Phase 2)
- **FR49:** Global Viewer can compare performance across entities (Phase 2)
- **FR50:** System provides trend analysis over configurable time periods (Phase 2)

### Compliance & Audit

- **FR51:** System logs all data modifications with actor identity, timestamp, action type, and before/after state
- **FR52:** Audit logs are immutable and retained per ISO requirements
- **FR53:** HR Admin can view audit log history for compliance reporting

### ERP Integration (Phase 2)

- **FR54:** Super Admin can configure entity-dependent ERP integrations
- **FR55:** System can push starter data to configured external systems upon registration
- **FR56:** System can trigger automatic email/account creation via identity provider APIs
- **FR57:** System monitors integration health and logs integration errors

### Internationalization

- **FR58:** All user-facing content is available in Dutch and French
- **FR59:** System supports adding additional languages without architectural changes

### Document Signing

- **FR60:** HR Admin can upload PDF documents per starter for digital signing, with document title, recipient email, optional deadline, and optional prerequisite document
- **FR61:** HR Admin can select signing method per document: SES (internal digital confirmation) or QES (qualified electronic signature via itsme/eID)
- **FR62:** HR Admin can place signature field locations on PDF documents using a visual field placer before sending
- **FR63:** HR Admin can define prerequisite chains between documents — a dependent document becomes signable only after its prerequisite is signed
- **FR64:** System stores uploaded PDF documents in the starter's SharePoint folder via Microsoft Graph API
- **FR65:** HR Admin can send a signing invitation email to the recipient via SendGrid, containing a signing link and document summary
- **FR66:** Starters can view and sign SES documents via a public signing page accessible without authentication, using a cryptographically random token
- **FR67:** For SES documents, the system embeds the signature in the PDF using pdf-lib, uploads the signed version to SharePoint, and stores the signed item reference
- **FR68:** For QES documents, the system creates a Quill guest user (with notifications suppressed), creates a Quill document, uploads the PDF binary, and obtains a signing URL — all within the upload flow
- **FR69:** For QES documents, the signing email contains the Quill signing URL instead of the internal signing page link
- **FR70:** Starters sign QES documents via the Quill signing interface using itsme or eID authentication
- **FR71:** System receives Quill webhook events (DOCUMENT_FULLY_SIGNED, SIGNATURE_DECLINED, DOCUMENT_EXPIRE) and updates document status accordingly
- **FR72:** Upon QES signing completion, the system downloads the signed PDF from Quill, uploads it to SharePoint, marks the document as signed, and completes the linked task
- **FR73:** System sends a confirmation email to the signer after successful signing (both SES and QES), including a download link for the signed document
- **FR74:** HR Admin can view a complete audit trail per document with timestamped events: created, email sent, email delivered/opened/clicked/bounced, viewed, signed, and QES-specific events (preparing, waiting, signed, declined, expired)
- **FR75:** Document signing progress is visible per starter with a progress bar showing signed vs. total documents

## Non-Functional Requirements

### Performance

- **NFR1:** User-initiated page loads (calendar, task list, dashboard) complete within 2 seconds
- **NFR2:** API responses return within 300ms at the 95th percentile under normal load
- **NFR3:** Calendar view renders a full month of data (up to 50 starters) within 1 second
- **NFR4:** Real-time event delivery from trigger to client notification within 500ms
- **NFR5:** System supports 30 concurrent authenticated users without performance degradation
- **NFR6:** Automated email digest generation (cron jobs) completes within 5 minutes per run, regardless of recipient count

### Security

- **NFR7:** All data transmitted between client and server is encrypted via TLS 1.2+
- **NFR8:** All data at rest in PostgreSQL is encrypted
- **NFR9:** Authentication is exclusively handled via Azure AD SSO — no local password storage
- **NFR10:** Entity-scoped data isolation is enforced at the database query level, not solely at the UI layer
- **NFR11:** Session tokens expire after a configurable inactivity period
- **NFR12:** All API endpoints validate user authorization before returning data
- **NFR13:** Audit logs are append-only and cannot be modified or deleted by any user role
- **NFR14:** Personal employee data is only accessible to users with explicit role-based authorization

### Scalability

- **NFR15:** System supports 100+ starters per year across all entities without architectural changes
- **NFR16:** Adding new entities requires only configuration changes, no code modifications
- **NFR17:** System supports scaling to 10 entities and 100 concurrent users with infrastructure scaling only (no application changes)
- **NFR18:** Database schema supports growing historical data (multi-year retention) without query performance degradation through proper indexing

### Reliability & Availability

- **NFR19:** System maintains >99% uptime measured monthly
- **NFR20:** Automated email cron jobs execute reliably on schedule; missed executions are detected and logged
- **NFR21:** Database backups are performed daily with point-in-time recovery capability
- **NFR22:** Application recovers automatically after container restart without data loss
- **NFR23:** Real-time connection loss does not cause data loss — all state changes persist via standard API calls regardless of WebSocket status

### Integration

- **NFR24:** ERP integrations use retry mechanisms with exponential backoff for transient failures
- **NFR25:** Integration failures are logged with sufficient detail for troubleshooting without exposing sensitive data
- **NFR26:** External system unavailability does not block core application functionality (starter registration, task management)
- **NFR27:** Azure AD SSO unavailability is handled gracefully with clear user messaging

### Document Signing

- **NFR28:** SES signing tokens are cryptographically random (cuid) and unique — each token grants access to exactly one document without authentication
- **NFR29:** Quill signing URLs are treated as sensitive data with equivalent protection to signing tokens — not logged in plain text, not exposed in API error responses
- **NFR30:** Quill API unavailability does not block document upload to SharePoint — QES setup is retried via the DOCUMENT_PREPARING webhook when Quill becomes available
- **NFR31:** Quill webhook processing responds with 2xx within 3 seconds to prevent Quill retry storms (Quill retries up to 5x with exponential backoff)
- **NFR32:** Quill webhook events are verified by fetching authoritative document state from the Quill API before processing — no blind trust of webhook payloads (spoof protection per Quill recommendation)
- **NFR33:** PDF content served via the application enforces authorization checks and sets X-Content-Type-Options: nosniff, Content-Disposition headers with sanitized filenames, and MIME type allowlisting for image/PDF content
