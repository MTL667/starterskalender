---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-create-stories", "step-04-final-validation"]
completedAt: "2026-04-08"
inputDocuments:
  - prd.md
  - docs/project-context.md
---

# Starterskalender - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Starterskalender, decomposing the requirements from the PRD and existing codebase context into implementable stories. This is a brownfield project — Phase 1 (MVP) is already in production. Epics focus on Phase 2 (Growth) features and improvements to existing functionality.

## Requirements Inventory

### Functional Requirements

FR1: HR Admin can register a new starter with entity, job role, start date, and personal details
FR2: HR Admin can register a leaver with entity, end date, and departure details
FR3: HR Admin can register an internal migration between entities with transfer date
FR4: HR Admin can edit a registered starter's details, including changing entity assignment
FR5: HR Admin can delete or archive a starter record
FR6: System automatically recalculates tasks and material assignments when a starter's entity or job role is changed
FR7: Entity Editor can register starters, leavers, and migrations within their assigned entities only
FR8: Users can view all personnel movements in a calendar view with week, month, year, and custom date range perspectives
FR9: Users can filter the calendar by entity, starter type (onboarding/offboarding/migration), and date range
FR10: Calendar displays entity-specific color coding and type-based visual distinction
FR11: Global Viewer can view the calendar across all entities without modification capabilities
FR12: Entity Editor and Entity Viewer can only view calendar data for their assigned entities
FR13: System automatically generates tasks from templates when a starter is registered, based on job role and entity
FR14: Each generated task includes an assignee, deadline, and priority level
FR15: Assigned users can view their pending tasks filtered by status, priority, and entity
FR16: Assigned users can mark tasks as completed with completion timestamp
FR17: HR Admin can manually create, edit, and assign tasks
FR18: HR Admin can manage task templates linked to job roles and entities
FR19: System automatically cancels and regenerates tasks when a starter's entity changes
FR20: HR Admin can define materials required per job role
FR21: System displays required materials for each starter based on their job role
FR22: HR Admin can track material provisioning status per starter
FR23: System warns when job roles exist without any materials assigned
FR24: HR Admin can manage the material catalog (create, edit, deactivate materials)
FR25: System sends automated email digests at weekly, monthly, quarterly, and yearly frequencies
FR26: Each email digest contains personalized content based on the recipient's entity memberships
FR27: Email digests distinguish between starters, leavers, and migrations
FR28: Users can configure their notification preferences per entity
FR29: HR Admin can manage email templates with dynamic placeholders
FR30: HR Admin can preview email recipients and trigger manual email sends
FR31: System logs all sent emails with delivery status for audit purposes
FR32: Users receive live updates when tasks are assigned to them or completed by others
FR33: Calendar view auto-refreshes when new starters are registered by other users
FR34: Users see live notification indicators for pending actions
FR35: Real-time updates are scoped to the user's entity access — no cross-entity data leakage
FR36: System gracefully degrades to manual refresh if real-time connection is lost
FR37: Super Admin can create, edit, and deactivate user accounts
FR38: Super Admin can assign roles (HR Admin, Entity Editor, Entity Viewer, Global Viewer) to users
FR39: Super Admin can manage entity memberships per user
FR40: Users authenticate via Azure AD SSO
FR41: Entity-scoped users can only access data for entities they are assigned to
FR42: System tracks user confidentiality agreement status and can restrict access until agreement is confirmed
FR43: Super Admin can create and configure entities with color coding and blocked periods
FR44: Super Admin can manage job roles per entity
FR45: Super Admin can manage blocked periods per entity (periods where no starters can be scheduled)
FR46: Super Admin can configure email templates and cron job settings
FR47: Users can view statistics dashboards showing onboarding/offboarding/migration counts per entity
FR48: HR Admin can view KPI metrics: on-time task completion rate, onboarding lead time, material coverage (Phase 2)
FR49: Global Viewer can compare performance across entities (Phase 2)
FR50: System provides trend analysis over configurable time periods (Phase 2)
FR51: System logs all data modifications with actor identity, timestamp, action type, and before/after state
FR52: Audit logs are immutable and retained per ISO requirements
FR53: HR Admin can view audit log history for compliance reporting
FR54: Super Admin can configure entity-dependent ERP integrations
FR55: System can push starter data to configured external systems upon registration
FR56: System can trigger automatic email/account creation via identity provider APIs
FR57: System monitors integration health and logs integration errors
FR58: All user-facing content is available in Dutch and French
FR59: System supports adding additional languages without architectural changes

### NonFunctional Requirements

NFR1: User-initiated page loads (calendar, task list, dashboard) complete within 2 seconds
NFR2: API responses return within 300ms at the 95th percentile under normal load
NFR3: Calendar view renders a full month of data (up to 50 starters) within 1 second
NFR4: Real-time event delivery from trigger to client notification within 500ms
NFR5: System supports 30 concurrent authenticated users without performance degradation
NFR6: Automated email digest generation (cron jobs) completes within 5 minutes per run
NFR7: All data transmitted between client and server is encrypted via TLS 1.2+
NFR8: All data at rest in PostgreSQL is encrypted
NFR9: Authentication is exclusively handled via Azure AD SSO — no local password storage
NFR10: Entity-scoped data isolation is enforced at the database query level
NFR11: Session tokens expire after a configurable inactivity period
NFR12: All API endpoints validate user authorization before returning data
NFR13: Audit logs are append-only and cannot be modified or deleted by any user role
NFR14: Personal employee data is only accessible to users with explicit role-based authorization
NFR15: System supports 100+ starters per year across all entities without architectural changes
NFR16: Adding new entities requires only configuration changes, no code modifications
NFR17: System supports scaling to 10 entities and 100 concurrent users with infrastructure scaling only
NFR18: Database schema supports growing historical data without query performance degradation
NFR19: System maintains >99% uptime measured monthly
NFR20: Automated email cron jobs execute reliably on schedule; missed executions detected and logged
NFR21: Database backups are performed daily with point-in-time recovery capability
NFR22: Application recovers automatically after container restart without data loss
NFR23: Real-time connection loss does not cause data loss
NFR24: ERP integrations use retry mechanisms with exponential backoff for transient failures
NFR25: Integration failures logged with sufficient detail for troubleshooting
NFR26: External system unavailability does not block core application functionality
NFR27: Azure AD SSO unavailability handled gracefully with clear user messaging

### Additional Requirements

From existing codebase analysis (docs/project-context.md):
- Brownfield project: 61 existing API routes, 20+ Prisma models, 15 admin pages already in production
- Current tech stack: Next.js 16, TypeScript 5, React 19, Prisma 5, PostgreSQL, SendGrid, Azure AD SSO
- Existing infrastructure: Docker standalone build on Easypanel, separate cron Dockerfile
- Room/Booking model exists in schema (Microsoft Graph integration) but usage unclear
- SignatureTemplate model for HTML email signatures per entity exists
- SystemSettings model for key/value branding configuration exists
- AllowedTenant model for Azure AD tenant allowlist exists
- Experience tracking fields on Starter model exist
- Dark mode support via next-themes already implemented

### UX Design Requirements

No UX Design document available. UX requirements will be derived from existing UI patterns in the codebase and PRD user journeys.

### FR Coverage Map

**Phase 1 — Already Implemented (Production):**

| FR | Area | Status |
|---|---|---|
| FR1-FR7 | Starter Lifecycle Management | Implemented |
| FR8-FR12 | Calendar & Overview | Implemented |
| FR13-FR19 | Task Management | Implemented |
| FR20-FR24 | Material Provisioning | Implemented |
| FR25-FR31 | Automated Notifications | Implemented |
| FR37-FR41 | User & Access Management | Implemented |
| FR43-FR46 | Entity & Configuration Management | Implemented |
| FR47 | Statistics Dashboard | Implemented |
| FR51-FR53 | Compliance & Audit | Implemented |
| FR58-FR59 | Internationalization | Implemented |

**Phase 2 — New Epics:**

| FR | Epic | Description |
|---|---|---|
| FR32 | Epic 1 | Live task assignment/completion updates |
| FR33 | Epic 1 | Calendar auto-refresh on new starters |
| FR34 | Epic 1 | Live notification indicators |
| FR35 | Epic 1 | Entity-scoped real-time channels |
| FR36 | Epic 1 | Graceful degradation on connection loss |
| FR42 | Epic 3 | Confidentiality agreement tracking |
| FR48 | Epic 2 | KPI metrics (completion rate, lead time, coverage) |
| FR49 | Epic 2 | Cross-entity performance comparison |
| FR50 | Epic 2 | Trend analysis over time |
| FR54 | Epic 4 | Entity-dependent ERP integration config |
| FR55 | Epic 4 | Push starter data to external systems |
| FR56 | Epic 4 | Automatic email/account creation via identity provider |
| FR57 | Epic 4 | Integration health monitoring and error logging |

## Epic List

### Epic 1: Real-Time Communication
Users receive live updates when tasks are assigned, completed, or when new starters are registered — without page refresh. Entity-scoped channels ensure privacy compliance. Graceful degradation maintains usability when connections drop.
**FRs covered:** FR32, FR33, FR34, FR35, FR36
**NFRs addressed:** NFR4, NFR23

### Epic 2: KPI Dashboard & Performance Metrics
HR Admins and Global Viewers can measure on-time task completion rates, onboarding lead times, and material coverage per entity. Entities become comparable, and trends are visible over configurable time periods.
**FRs covered:** FR48, FR49, FR50
**NFRs addressed:** NFR1, NFR3

### Epic 3: User Confidentiality Agreement & Access Control
The system tracks whether users with elevated access rights have signed the confidentiality agreement and can restrict access until the agreement is confirmed. Strengthens ISO compliance posture.
**FRs covered:** FR42
**NFRs addressed:** NFR12, NFR14

### Epic 4: ERP Integration Framework
Super Admins can configure entity-dependent ERP connections. The system pushes starter data to external systems upon registration, triggers automatic account creation, and monitors integration health with error logging.
**FRs covered:** FR54, FR55, FR56, FR57
**NFRs addressed:** NFR24, NFR25, NFR26

## Epic 1: Real-Time Communication

Users receive live updates when tasks are assigned, completed, or when new starters are registered — without page refresh. Entity-scoped channels ensure privacy compliance. Graceful degradation maintains usability when connections drop.

### Story 1.1: Real-Time Event Infrastructure

As a **developer**,
I want a server-side event broadcasting system with entity-scoped channels,
So that real-time updates can be delivered securely to authorized users only.

**Acceptance Criteria:**

**Given** a server-side event occurs (task created, task completed, starter registered)
**When** the event is broadcast
**Then** only users with access to the affected entity receive the event
**And** users without entity access receive nothing (FR35)

**Given** the real-time infrastructure is running
**When** 30 concurrent users are connected
**Then** event delivery completes within 500ms from trigger (NFR4)

**Given** a user authenticates via Azure AD SSO
**When** they connect to the real-time channel
**Then** their entity memberships determine which channels they subscribe to
**And** HR Admins subscribe to all entity channels

### Story 1.2: Live Task Updates

As a **task assignee (Mark)**,
I want to see new task assignments and status changes appear in my task list immediately,
So that I don't miss urgent tasks and always have an up-to-date view.

**Acceptance Criteria:**

**Given** Mark has his task list open
**When** Sophie assigns a new task to him
**Then** the task appears in Mark's list without page refresh (FR32)
**And** a visual indicator highlights the new task

**Given** Mark has his task list open
**When** another user completes a task he can see
**Then** the task status updates in his view without refresh (FR32)

**Given** Sophie has the dashboard open
**When** Mark marks a task as completed
**Then** Sophie's dashboard task counts update live

### Story 1.3: Calendar Auto-Refresh

As an **HR Admin (Sophie)**,
I want the calendar to automatically show new starters when they are registered by another user,
So that I always see the latest personnel movements without manually refreshing.

**Acceptance Criteria:**

**Given** Sophie has the calendar open on the current month
**When** another HR Admin registers a new starter for that month
**Then** the starter appears on the calendar without page refresh (FR33)
**And** the starter shows with correct entity color coding and type icon

**Given** an Entity Editor registers a starter in their entity
**When** Sophie's calendar includes that entity in her current filter
**Then** the new starter appears on Sophie's calendar live

**Given** a starter is edited (date changed, entity changed)
**When** the change is saved
**Then** the calendar updates to reflect the new position or removal

### Story 1.4: Live Notification Indicators

As a **user**,
I want to see live badge counts for pending tasks and new notifications,
So that I'm immediately aware of items requiring my attention.

**Acceptance Criteria:**

**Given** the user is on any page in Starterskalender
**When** a new task is assigned to them
**Then** the notification bell shows an updated unread count without refresh (FR34)

**Given** the user has 3 pending notifications
**When** they read a notification
**Then** the badge count decrements to 2 in real-time

**Given** the user is on the dashboard
**When** new tasks arrive for their entities
**Then** the "My Tasks" section count updates live

### Story 1.5: Graceful Degradation & Connection Recovery

As a **user**,
I want the application to continue working normally if the real-time connection is lost,
So that I never lose data or experience errors due to connectivity issues.

**Acceptance Criteria:**

**Given** the user has an active real-time connection
**When** the connection drops (network issue, server restart)
**Then** the application falls back to standard page-based updates (FR36)
**And** no error is shown to the user beyond an optional subtle indicator

**Given** the real-time connection was lost
**When** the connection is restored
**Then** the client automatically reconnects and receives any missed events
**And** the UI updates to reflect the current state

**Given** the user performs an action (complete task, register starter)
**When** the real-time connection is down
**Then** the action completes successfully via the standard API (NFR23)
**And** the change persists regardless of WebSocket/SSE status

## Epic 2: KPI Dashboard & Performance Metrics

HR Admins and Global Viewers can measure on-time task completion rates, onboarding lead times, and material coverage per entity. Entities become comparable, and trends are visible over configurable time periods.

### Story 2.1: On-Time Task Completion Metrics

As an **HR Admin (Sophie)**,
I want to see the on-time task completion rate per entity,
So that I can identify entities where onboarding tasks are consistently late.

**Acceptance Criteria:**

**Given** Sophie navigates to the KPI dashboard
**When** the page loads
**Then** she sees the on-time task completion percentage per entity for the selected period (FR48)
**And** the page loads within 2 seconds (NFR1)

**Given** tasks have deadlines and completion timestamps in the database
**When** the metric is calculated
**Then** on-time = completed before or on deadline; late = completed after deadline; missed = not completed and past deadline

**Given** Sophie selects a specific time period (this month, this quarter, custom range)
**When** the filter is applied
**Then** all KPI metrics recalculate for the selected period

### Story 2.2: Onboarding Lead Time Tracking

As an **HR Admin (Sophie)**,
I want to see the average onboarding lead time per entity,
So that I can measure how long it takes from starter registration to all tasks being completed.

**Acceptance Criteria:**

**Given** Sophie views the KPI dashboard
**When** lead time metrics are displayed
**Then** she sees average days from starter registration date to last task completion date, per entity (FR48)

**Given** some starters have incomplete tasks
**When** lead time is calculated
**Then** only fully completed starters are included in the average
**And** starters with open tasks are shown separately as "in progress"

**Given** entity "Gent" has an average lead time of 5 days and "Luik" has 12 days
**When** Sophie compares them
**Then** the visual representation clearly highlights the difference

### Story 2.3: Material Coverage Dashboard

As an **HR Admin (Sophie)**,
I want to see the material coverage percentage per entity,
So that I can ensure all starters receive their required materials.

**Acceptance Criteria:**

**Given** Sophie views the KPI dashboard
**When** material coverage is displayed
**Then** she sees the percentage of starters who received all required materials per entity (FR48)

**Given** a starter has 5 required materials and 4 are provisioned
**When** coverage is calculated
**Then** that starter counts as 80% covered at individual level
**And** entity-level coverage is the average across all starters in the period

### Story 2.4: Cross-Entity Performance Comparison

As a **Global Viewer (Anja)**,
I want to compare KPI performance across all entities side by side,
So that I can identify underperforming entities and take action.

**Acceptance Criteria:**

**Given** Anja navigates to the KPI dashboard
**When** cross-entity comparison view is displayed
**Then** all entities are shown side by side with on-time completion, lead time, and material coverage (FR49)
**And** entities are ranked by a composite score or sortable by individual metric

**Given** Anja is a Global Viewer (read-only)
**When** she views entity comparisons
**Then** she can see all entities but cannot modify any data

**Given** Entity Editors view the KPI dashboard
**When** entity comparison is displayed
**Then** they only see metrics for their assigned entities

### Story 2.5: Trend Analysis Over Time

As an **HR Admin (Sophie)**,
I want to see how KPI metrics evolve over configurable time periods,
So that I can track improvement and detect regression.

**Acceptance Criteria:**

**Given** Sophie selects a KPI metric (e.g., on-time completion rate)
**When** she chooses a time range (3 months, 6 months, 12 months)
**Then** a trend chart displays the metric over time per entity (FR50)
**And** the chart renders within 1 second (NFR3)

**Given** the trend shows a declining on-time completion rate for entity "Luik"
**When** Sophie hovers over data points
**Then** she sees the specific values for that period

**Given** Sophie selects "all entities" for trend comparison
**When** multiple entity trends are overlaid
**Then** each entity line uses its configured entity color

## Epic 3: User Confidentiality Agreement & Access Control

The system tracks whether users with elevated access rights have signed the confidentiality agreement and can restrict access until the agreement is confirmed. Strengthens ISO compliance posture.

### Story 3.1: Confidentiality Agreement Tracking Model

As a **Super Admin (Tom)**,
I want the system to track whether each user has signed the confidentiality agreement,
So that I can ensure compliance before granting data access.

**Acceptance Criteria:**

**Given** a user exists in the system with an elevated role (HR Admin, Entity Editor, Super Admin)
**When** their profile is viewed in the admin panel
**Then** the agreement status is visible: signed (with date) or not signed (FR42)

**Given** a new user is created with an elevated role
**When** the user record is saved
**Then** the agreement status defaults to "not signed"

**Given** Tom views the user management page
**When** users are listed
**Then** a visual indicator shows which users have not yet signed the agreement

### Story 3.2: Agreement Confirmation Flow

As a **user with elevated access**,
I want to be presented with the confidentiality agreement and confirm I've signed it,
So that I can gain access to the system in compliance with organizational policy.

**Acceptance Criteria:**

**Given** a user with elevated role logs in for the first time (or agreement is pending)
**When** they navigate to any authenticated page
**Then** they are redirected to the agreement confirmation page

**Given** the user is on the agreement confirmation page
**When** they confirm they have signed the agreement
**Then** their agreement status is updated to "signed" with the current timestamp
**And** they are redirected to the dashboard

**Given** the user has not confirmed the agreement
**When** they try to access any data page
**Then** they are blocked and redirected to the agreement page (FR42)

### Story 3.3: Admin Agreement Management

As a **Super Admin (Tom)**,
I want to manage confidentiality agreement status for users,
So that I can reset agreements when policies change or manually confirm for users who signed offline.

**Acceptance Criteria:**

**Given** Tom views a user's profile in the admin panel
**When** he clicks "Reset Agreement"
**Then** the user's agreement status is set to "not signed"
**And** the user will be prompted to re-confirm on next login

**Given** a user signed the agreement on paper
**When** Tom clicks "Mark as Signed" with a date
**Then** the agreement status is updated to "signed" with the provided date

**Given** Tom resets all agreements (policy update)
**When** bulk reset is triggered
**Then** all users with elevated roles have their agreement status reset
**And** an audit log entry is created for the bulk action (NFR12)

## Epic 4: ERP Integration Framework

Super Admins can configure entity-dependent ERP connections. The system pushes starter data to external systems upon registration, triggers automatic account creation, and monitors integration health with error logging.

### Story 4.1: Integration Configuration Management

As a **Super Admin (Tom)**,
I want to configure ERP integrations per entity,
So that each entity can connect to its own downstream systems.

**Acceptance Criteria:**

**Given** Tom navigates to the admin panel
**When** he opens the integration configuration page
**Then** he sees a list of entities with their configured integrations (FR54)

**Given** Tom selects entity "Hasselt"
**When** he adds a new ERP integration
**Then** he can configure: integration type, endpoint URL, authentication credentials, and entity-specific mapping
**And** the configuration is saved and validated

**Given** entity "Gent" uses payroll system A and "Antwerpen" uses payroll system B
**When** both are configured
**Then** each entity's integration operates independently with its own credentials and endpoints

**Given** Tom saves an integration configuration
**When** the configuration is stored
**Then** sensitive credentials are encrypted at rest
**And** an audit log entry is created

### Story 4.2: Starter Data Push on Registration

As the **system**,
I want to automatically push starter data to configured ERP systems when a starter is registered,
So that downstream systems receive personnel data without manual re-entry.

**Acceptance Criteria:**

**Given** entity "Hasselt" has a configured ERP integration
**When** Sophie registers a new starter for "Hasselt"
**Then** the starter data is pushed to the configured endpoint (FR55)
**And** the push does not block the registration process — the starter is saved first, push happens asynchronously

**Given** an ERP push fails (network timeout, authentication error)
**When** the failure is detected
**Then** the system retries with exponential backoff (NFR24)
**And** the failure is logged with detail sufficient for troubleshooting (NFR25)

**Given** the ERP system is completely unavailable
**When** a starter is registered
**Then** the registration completes successfully in Starterskalender (NFR26)
**And** the push is queued for retry when the system recovers

**Given** an entity has no configured integration
**When** a starter is registered for that entity
**Then** no push is attempted and no error occurs

### Story 4.3: Automatic Account Provisioning

As an **HR Admin (Sophie)**,
I want the system to automatically create a company email address for new starters,
So that IT doesn't need to manually create accounts for each new hire.

**Acceptance Criteria:**

**Given** entity "HQ" has Azure AD / Microsoft 365 account provisioning configured
**When** Sophie registers a new starter with first name, last name, and job role
**Then** the system triggers account creation via the identity provider API (FR56)
**And** the created email address is stored on the starter record

**Given** automatic account creation fails (name conflict, API error)
**When** the failure is detected
**Then** the starter registration still succeeds
**And** the failure is logged and visible to Tom in the integration dashboard
**And** the account can be created manually and linked later

**Given** a starter is registered as a leaver (offboarding)
**When** the registration is saved
**Then** no account creation is triggered (only for onboarding type)

### Story 4.4: Integration Health Monitoring

As a **Super Admin (Tom)**,
I want to monitor the health and status of all ERP integrations,
So that I can identify and resolve connection issues before they impact operations.

**Acceptance Criteria:**

**Given** Tom navigates to the integration monitoring page
**When** the page loads
**Then** he sees per-integration: status (healthy/degraded/failed), last successful push, error count in last 24h (FR57)

**Given** an integration has 3 consecutive failures
**When** the status is evaluated
**Then** the integration is marked as "degraded" with a warning indicator

**Given** Tom clicks on a specific integration
**When** the detail view opens
**Then** he sees the last 50 push attempts with timestamp, status, and error details if failed (NFR25)
**And** sensitive data from payloads is masked in the logs

**Given** an integration has been failing for 24+ hours
**When** Tom views the monitoring page
**Then** a prominent alert is displayed
**And** an email notification is sent to Tom (if notification preferences are configured)

## Epic 5: Document Signing & Management

HR can upload documents (contracts, NDAs, checklists, training dossiers) for starters to sign digitally. Documents are stored in Microsoft Teams via the Graph API using a dedicated Azure App Registration. Two signing methods are supported: Simple Electronic Signature (SES) for internal documents, and Qualified Electronic Signature (QES) via Itsme Sign for legally binding documents. Integrates with the existing Task system, Health Score, and SSE real-time updates.

### Phase 5A: Simple Electronic Signature + Teams Storage

Core document management infrastructure with click-to-sign capability and Microsoft Teams as the document storage layer.

#### Story 5A.1: Teams Document Storage Integration

As a **developer**,
I want a Graph API client dedicated to Teams/SharePoint document operations using a separate Azure App Registration,
So that document storage is isolated from authentication credentials and follows least-privilege principles.

**Acceptance Criteria:**

**Given** the environment variables `AZURE_DOCS_TENANT_ID`, `AZURE_DOCS_CLIENT_ID`, and `AZURE_DOCS_CLIENT_SECRET` are configured
**When** the document storage service initializes
**Then** it authenticates via MSAL Client Credentials flow against the configured tenant
**And** it can read/write files to the designated Teams channel files folder

**Given** the document storage credentials are not configured
**When** document features are accessed
**Then** the system gracefully indicates that document signing is not available
**And** all other Starterskalender features continue to work normally

**Given** documents are uploaded via the Graph API
**When** they are stored in Teams
**Then** the folder structure follows: `{TeamName}/Bestanden/{EntityName}/{Year}/{StarterLastName}, {StarterFirstName}/`
**And** HR can browse these folders directly in Microsoft Teams

#### Story 5A.2: Document Upload by HR

As an **HR Admin (Sophie)**,
I want to upload PDF documents for a starter and specify the required signing method per document,
So that I can prepare all paperwork as part of the onboarding process.

**Acceptance Criteria:**

**Given** Sophie opens the StarterDialog for an existing starter
**When** she navigates to the "Documents" tab
**Then** she sees a list of existing documents and an "Upload Document" button

**Given** Sophie clicks "Upload Document"
**When** she selects a PDF file and chooses a signing method (Simple or Itsme)
**Then** the document is uploaded to the Teams folder for that starter
**And** a `StarterDocument` record is created in the database with status "PENDING"
**And** a task is automatically generated for the starter to sign the document

**Given** Sophie uploads multiple documents
**When** she sets the order
**Then** documents can be configured as sequential (document B unlocks only after document A is signed)

#### Story 5A.3: Document Preview & Simple Electronic Signature (SES)

As a **starter**,
I want to view documents assigned to me and sign simple documents with a click,
So that I can complete onboarding paperwork efficiently.

**Acceptance Criteria:**

**Given** a starter has pending documents to sign
**When** they open their signing overview
**Then** they see all documents with status indicators (pending, signed, locked)
**And** a progress bar shows overall completion

**Given** a document is marked for Simple signing
**When** the starter clicks on it
**Then** the document is displayed via Microsoft Graph preview (embedded viewer)
**And** a checkbox "I have read and agree to this document" and a "Sign" button are shown

**Given** the starter confirms and clicks "Sign"
**When** the signing is processed
**Then** the document status changes to "SIGNED" with timestamp and IP address
**And** the associated task is marked as completed
**And** an SSE event is broadcast to update the Health Score in real-time
**And** if sequential signing is configured, the next document becomes available

**Given** the starter has not yet signed a prerequisite document
**When** they view a locked document
**Then** it shows as locked with a message indicating which document must be signed first

#### Story 5A.4: Document Status Dashboard for HR

As an **HR Admin (Sophie)**,
I want to see the signing status of all documents across all starters,
So that I can identify who hasn't signed yet and follow up proactively.

**Acceptance Criteria:**

**Given** Sophie views the StarterDialog for a specific starter
**When** the dialog opens
**Then** the document section shows all assigned documents with their signing status
**And** signed documents show the timestamp and can be downloaded from Teams

**Given** Sophie views the dashboard
**When** starters have pending documents
**Then** the Health Score reflects unsigned documents (material score component)
**And** the HealthDot indicator on the dashboard and calendar updates accordingly

**Given** a document has been pending for more than the configured deadline
**When** Sophie views the document overview
**Then** the document is highlighted as overdue

#### Story 5A.5: Prisma Schema & Data Model

As a **developer**,
I want database models that track documents, their signing status, and their relationship to starters and tasks,
So that document state is persisted and queryable.

**Acceptance Criteria:**

**Given** the schema migration runs
**When** the `StarterDocument` model is created
**Then** it includes: id, starterId, title, signingMethod (SES/QES), status (PENDING/SIGNED/EXPIRED), teamsItemId, teamsDriveId, teamsPath, signedAt, signedByIp, taskId, sortOrder, prerequisiteDocumentId, createdAt, updatedAt

**Given** a starter is deleted or cancelled
**When** their documents are queried
**Then** documents remain in the database for audit purposes but are marked as inactive

**Given** the schema supports future QES signing
**When** Itsme integration is added in Phase 5B
**Then** no schema migration is needed — only the `signingMethod` enum gains a new value

### Phase 5B: Qualified Electronic Signature via Itsme

Adds legally binding digital signatures via the Itsme Sign CSC API for documents that require qualified electronic signatures (contracts, NDAs). Requires Itsme B2B portal onboarding and consultation.

#### Story 5B.1: Itsme Sign CSC API Integration

As a **developer**,
I want to integrate the Itsme Sign CSC API for qualified electronic signatures,
So that legally binding documents can be signed with eIDAS-compliant QES.

**Acceptance Criteria:**

**Given** the Itsme B2B portal credentials are configured (`ITSME_CLIENT_ID`, `ITSME_CLIENT_SECRET`, `ITSME_REDIRECT_URI`)
**When** a QES signing is initiated
**Then** the system computes a SHA-256 hash of the PDF document
**And** initiates an OAuth2 Authorization Code flow with Itsme Sign
**And** the user is redirected to the Itsme signature page

**Given** the user confirms the signature in the Itsme app
**When** the callback is received
**Then** the system retrieves the digital signature value and signer certificate
**And** embeds the signature in the PDF using PAdES format
**And** uploads the signed PDF to Teams, replacing or alongside the original

**Given** the Itsme signing flow is cancelled or fails
**When** the user returns to Starterskalender
**Then** the document remains in "PENDING" status
**And** the user can retry the signing process

#### Story 5B.2: Itsme QES Signing Flow for Starters

As a **starter**,
I want to sign contracts and NDAs via Itsme on my phone or desktop,
So that my signature is legally binding and equivalent to a handwritten signature.

**Acceptance Criteria:**

**Given** a document is marked for Itsme signing
**When** the starter clicks "Sign via Itsme"
**Then** they are redirected to the Itsme authentication/signing page
**And** the Itsme button follows official Itsme branding guidelines

**Given** the starter is on a mobile device
**When** they click "Sign via Itsme"
**Then** the Itsme app opens directly via deep link (no QR code needed)

**Given** the starter completes the Itsme signing
**When** they return to Starterskalender
**Then** the document shows as "SIGNED (QES)" with Itsme verification details
**And** the signed PDF with embedded PAdES signature is available for download
**And** the associated task is completed and Health Score updates via SSE

#### Story 5B.3: Signed Document Verification & Archival

As an **HR Admin (Sophie)**,
I want to verify and archive QES-signed documents,
So that I have legally valid proof of signature for compliance purposes.

**Acceptance Criteria:**

**Given** a document has been signed via Itsme QES
**When** Sophie views the document in the StarterDialog
**Then** she sees: signer identity (from Itsme certificate), signing timestamp, signature validity status

**Given** Sophie downloads the signed PDF
**When** she opens it in Adobe Reader or another PDF viewer
**Then** the digital signature is shown as valid (PAdES long-term validation)

**Given** the signed document is stored in Teams
**When** Sophie browses the Teams folder for the starter
**Then** the signed version is clearly distinguishable from the original (e.g., `contract-signed.pdf`)
