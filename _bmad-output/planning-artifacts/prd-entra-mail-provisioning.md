---
stepsCompleted: ["step-01-init", "step-02-discovery", "step-02b-vision", "step-02c-executive-summary", "step-03-success", "step-04-journeys", "step-05-domain", "step-06-innovation", "step-07-project-type", "step-08-scoping", "step-09-functional", "step-10-nonfunctional", "step-11-polish", "step-12-complete"]
completedAt: "2026-06-04"
inputDocuments:
  - _bmad-output/brainstorming/brainstorming-session-2026-06-04-0901.md
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

# Product Requirements Document - Entra ID Mail Provisioning

**Author:** Kevin
**Date:** 2026-06-04

## Executive Summary

The Entra ID Mail Provisioning feature eliminates manual M365 user and mailbox creation for new starters by embedding provisioning directly into the existing Starterskalender workflow. Today, every new starter requires IT to manually create a Microsoft 365 user, assign a license, and wait for mailbox provisioning — a repetitive, error-prone process that scales poorly across multiple organizational entities. This feature replaces that with a single "Generate Mail" button on the starter record that handles the entire sequence: license validation, user creation, license assignment, and mailbox provisioning.

The system operates on a per-tenant architecture where each organizational entity can optionally connect its own Entra ID app registration with certificate-based authentication. License requirements (Business Basic or Business Standard) are configurable per job function, and provisioning is only available when the entity has a registered app. The feature targets HR administrators and entity editors who manage the starter lifecycle, while IT personnel receive automated tasks for license shortages and mailbox cleanup.

### What Makes This Special

Beyond simple automation, the feature introduces intelligent license management: a trickle-down mechanism that falls back to lower-tier licenses when the preferred type is unavailable (with notification), proactive monitoring that alerts IT when available licenses are insufficient for upcoming starters, and a certificate-based "secret-once" security pattern where credentials are never visible after initial setup. The provisioning engine uses a detailed backend state machine for audit and recovery while presenting a simple spinner-to-checkmark experience to the user.

## Project Classification

| Attribute | Value |
|-----------|-------|
| Project Type | Web App (extension of existing Next.js application) |
| Domain | General (internal HR tooling) |
| Complexity | Medium (Graph API integration, certificate auth, state machine, license logic) |
| Project Context | Brownfield (extends Starterskalender platform with existing entity model, RBAC, task system, and Azure AD SSO) |

## Success Criteria

### User Success

- HR administrator or entity editor provisions a starter's M365 mailbox via a single button click without leaving Starterskalender or opening Azure Portal.
- Real-time status updates during provisioning keep the user informed at every stage (license check → user creation → license assignment → mailbox provisioning).
- On success: button is replaced by a permanent checkmark. On failure: clear error message with retry and remove options.
- Trickle-down license fallback triggers a visible notification explaining which license type was assigned and why.
- Generate Mail button is only visible when the entity has a registered Entra ID app — no confusion about availability.

### Business Success

- At least two tenants actively using the mail provisioning feature within the first quarter after release.
- IT personnel no longer perform manual M365 user creation and license assignment for starters managed in Starterskalender.
- Proactive license shortage alerts reduce "no license available" failures to near-zero by surfacing issues before they block provisioning.
- Starter cancellation cleanup tasks ensure no orphaned mailboxes accumulate unnoticed.

### Technical Success

- Async provisioning engine with full state machine recovery: browser closure does not lose provisioning state.
- Certificate-based authentication with no shared secrets exposed after initial setup.
- Complete audit trail for every provisioning action including Graph API responses.
- Pre-action consent validation plus daily sweep catches revoked permissions within 24 hours.
- Mutex per starter prevents duplicate provisioning jobs.

### Measurable Outcomes

| Metric | Target |
|--------|--------|
| Provisioning success rate | >95% on first attempt |
| Active tenants using feature | ≥2 within first quarter |
| Manual IT provisioning tasks | Reduced to zero for connected tenants |
| Orphaned mailbox incidents | Zero (cleanup tasks always created on cancellation) |
| Audit trail completeness | 100% of provisioning actions logged |

## Product Scope

### MVP (Phase 1)

**MVP Approach:** Problem-solving MVP — eliminates a concrete daily pain point (manual M365 provisioning). All features ship in a single phase. Solo developer leveraging existing codebase patterns (entities, job roles, tasks, cron, audit).

**Core User Journeys Supported:** All three journeys are MVP: HR Editor (provisioning), System Admin (configuration), IT Specialist (monitoring/cleanup).

**Tenant App Connection:**
- Per-entity Entra ID app registration on entities page
- Certificate keypair generation with .cer download
- Connection validation on input
- Consent status monitoring (pre-action check + daily cron)
- Certificate expiry warning

**Configuration:**
- License type setting per job function on functions page (conditional on app registration)
- Trickle-down policy: tenant-wide default + per-function override
- Temporary password format configurable per tenant
- Orphan notification when app removed but function settings remain

**Provisioning Engine:**
- Async provisioning with status push to frontend via SSE
- Detailed backend state machine, simple frontend (spinner → checkmark/error)
- Real-time license check at provisioning time with cached counts for UI
- Retry and remove user options on failure
- Mutex per starter to prevent duplicate jobs
- Mandatory password reset on first login

**Monitoring & Lifecycle:**
- License availability counter based on planned starters
- Auto-task for IT on license shortage
- Graph API status banner for admin
- Complete audit trail with Graph API responses
- Cleanup task on starter cancellation or entity migration
- Entity migration: starter inherits target entity settings

### Growth (Phase 2)

- Additional license types beyond Business Basic and Business Standard (E3, E5, F1)
- Trickle-down upgrade detection (notify when higher-tier license becomes available)
- Bulk provisioning action for multiple starters

### Vision (Phase 3)

- Full M365 lifecycle management (disable account on offboarding, license reclamation)
- Self-service Entra ID app registration via admin consent flow (instead of manual setup)
- Additional M365 service provisioning (Teams, SharePoint, OneDrive)

### Risk Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
| Graph API integration complexity (cert auth, user creation, license assignment sequence) | High | Build and test Graph API service module in isolation first. Validate full chain against test tenant before UI integration. |
| SSE reliability (connection drops, reconnection) | Medium | Backend state machine is source of truth. SSE is display layer only — frontend reconnects and fetches current state. |
| Certificate generation in Node.js | Low | Node.js `crypto` module supports X.509 certificate generation natively. |
| Solo developer resource constraint | Medium | Prioritize provisioning engine (Priority 1-3) and ship monitoring/intelligence (Priority 4-5) as fast follow if needed. |

## User Journeys

### Journey 1: Sarah — HR Entity Editor Provisions a New Starter's Mailbox

**Who:** Sarah is an HR administrator at a mid-sized organization managing onboarding for two entities. She handles 5-10 new starters per month and currently relies on IT to manually create M365 accounts — a process that often delays Day 1 readiness.

**Opening Scene:** Sarah creates a new starter record in Starterskalender for Tom, starting next Monday as a Junior Accountant. She fills in his personal details, selects his entity and job function. Below the materials section, she sees a "Generate Mail" button — it's available because her entity's Entra ID app is connected.

**Rising Action:** Sarah clicks "Generate Mail." A spinner appears with status updates: "Checking license availability..." → "Creating M365 user..." → "Assigning Business Standard license..." → "Waiting for mailbox provisioning..." She notices a notification: "Business Standard unavailable. Business Basic assigned instead (trickle-down). Contact IT to upgrade." She nods — at least Tom will have email on Day 1.

**Climax:** The spinner is replaced by a green checkmark. Tom's temporary credentials appear on screen. Sarah copies the password and notes that Tom will need to reset it on first login.

**Resolution:** Sarah moves on to the next starter. No IT ticket filed. No waiting. No follow-up email asking "is the mailbox ready yet?" Tom's onboarding is complete from her side.

**Edge Case — Failure Recovery:** Sarah clicks "Generate Mail" for another starter but the process fails at license assignment (Graph API timeout). The UI shows the state machine stopped at "license_assigning" with two options: "Retry" and "Remove Created User." She clicks Retry. It succeeds on the second attempt.

### Journey 2: Kevin — System Admin Configures Entra ID App Connection

**Who:** Kevin is the platform administrator who manages Starterskalender across all tenants. He's responsible for connecting each entity's Entra ID environment and configuring which license types apply to which job functions.

**Opening Scene:** A new client entity "Acme Corp" is being onboarded to Starterskalender. Kevin navigates to the Entities admin page and opens Acme Corp's settings.

**Rising Action:** Kevin clicks "Configure Entra ID App" in the entity settings. The system generates a certificate keypair. Kevin downloads the .cer file and switches to Azure Portal, where he uploads it to the Entra ID app registration for Acme Corp. Back in Starterskalender, he enters the Client ID and Tenant ID and clicks "Validate Connection." The system tests the certificate against Graph API — green checkmark, connection works.

**Climax:** Kevin navigates to the Job Functions page for Acme Corp. Now that the app is registered, each function shows a new "License Type" dropdown. He sets "Accountant" to Business Standard, "Receptionist" to Business Basic. He configures the tenant-wide trickle-down policy to "enabled" with a per-function override on "Accountant" set to "strict — no fallback."

**Resolution:** Kevin checks the entity dashboard. A badge shows "12 Business Standard licenses available, 8 Business Basic available." The system has already calculated that 3 upcoming starters will need licenses and all are covered. Acme Corp is ready. If licenses run low, IT will receive an automatic task.

**Edge Case — Certificate Expiry:** Months later, Kevin receives a warning notification: "Acme Corp certificate expires in 30 days." He generates a new keypair, downloads the .cer, uploads it to Azure, and validates — zero downtime.

### Journey 3: Marc — IT Specialist Handles License Shortage and Cleanup

**Who:** Marc is the IT specialist at Acme Corp. He manages M365 licenses and user accounts. He used to manually create mailboxes for every new starter — now he monitors license availability and handles exceptions.

**Opening Scene:** Marc opens his task list in Starterskalender and sees a new automated task: "License shortage alert: 2 Business Standard licenses available, 4 starters planned in the next 2 weeks. Purchase additional licenses."

**Rising Action:** Marc logs into the Microsoft 365 admin center and purchases 5 additional Business Standard licenses. The next day, Starterskalender's daily sync picks up the new count and the shortage alert auto-resolves.

**Climax:** A week later, Marc sees another task: "Starter cancelled: Lisa Janssens (start date withdrawn). M365 mailbox provisioned on 2026-05-28. Review and clean up mailbox and license." Marc removes the user from Entra ID, freeing the license.

**Resolution:** Marc's role has shifted from repetitive provisioning work to strategic license management. He spends 10 minutes per week on Starterskalender tasks instead of 30 minutes per starter.

### Journey Requirements Summary

| Journey | Capabilities Revealed |
|---------|----------------------|
| Sarah (HR Editor) | Generate Mail button, provisioning status UI, trickle-down notification, temporary credentials display, checkmark success state, retry/remove on failure |
| Kevin (System Admin) | Entity app registration page, certificate generation/download, connection validation, license type configuration per function, trickle-down policy settings, license availability dashboard, certificate expiry warnings |
| Marc (IT Specialist) | Auto-generated license shortage tasks, cleanup tasks on cancellation, license count monitoring, task resolution workflow |

## Technical Architecture

### Platform Integration

This feature extends the existing Starterskalender Next.js application (App Router, React 19, TypeScript strict mode). It integrates into the existing authenticated admin interface and follows established UI patterns (shadcn/ui, Tailwind CSS, Radix primitives).

**Existing Patterns Leveraged:**
- Authentication: NextAuth + Azure AD SSO (user identity already available)
- Authorization: RBAC model (HR_ADMIN, ENTITY_EDITOR) controls button visibility
- Audit: AuditLog model extended for provisioning events
- Tasks: Existing task system for license shortage and cleanup tasks
- Entities/Job Roles: Existing models extended with Entra ID app config and license type settings

### Real-Time Status Communication

Server-Sent Events (SSE) for provisioning status updates. One-directional push from backend to frontend during the provisioning flow. SSE provides built-in reconnection support, aligning with the recoverable state requirement. Implemented via a Next.js API route that streams status events.

### Graph API Integration Layer

New server-side service module for Microsoft Graph API operations using the existing `@azure/msal-node` and Microsoft Graph client dependencies. Certificate-based authentication via `ConfidentialClientApplication` with per-tenant credential resolution. Operations: user creation (`POST /users`), license assignment (`POST /users/{id}/assignLicense`), license inventory (`GET /subscribedSkus`), consent validation.

### Timeout and User Communication

Graph API calls have variable latency. If provisioning exceeds an expected threshold (e.g., 30 seconds per step), the UI displays an informational message: "This is taking longer than expected — provisioning continues in the background." State machine ensures no data loss regardless of frontend connection status.

### New Infrastructure

- Certificate generation and storage (Node.js `crypto` module for keypair generation)
- SSE endpoint for provisioning status streaming
- Daily cron job for consent sweep and license cache sync (extends existing cron pattern under `/api/cron/`)
- Graph API service module with per-tenant credential resolution

## Functional Requirements

### Tenant App Connection Management

- FR1: System Admin can register an Entra ID app connection per entity by providing Client ID and Tenant ID
- FR2: System can generate a certificate keypair when setting up a new app connection
- FR3: System Admin can download the generated .cer public certificate file for upload to Azure
- FR4: System can validate a new app connection against the Graph API upon registration
- FR5: System can hide the private key value after the first successful connection validation
- FR6: System can check consent status of a tenant's app connection before any provisioning action
- FR7: System can perform a daily sweep of all tenant app connections to verify consent status
- FR8: System can retain the last known consent status when the Graph API is unreachable
- FR9: System Admin can receive a notification when consent for an app connection has been revoked
- FR10: System can warn when an app connection's certificate expires within 30 days
- FR11: System Admin can regenerate a certificate keypair for an existing app connection

### License Configuration

- FR12: System Admin can configure a required license type (Business Basic or Business Standard) per job function on the functions page
- FR13: System can conditionally show license configuration options only when the entity has a registered app connection
- FR14: System Admin can configure a tenant-wide trickle-down policy (enabled/disabled)
- FR15: System Admin can override the trickle-down policy per individual job function
- FR16: System Admin can configure the temporary password complexity rules (length, character requirements) per tenant
- FR17: System can notify the admin when an app connection is removed but license configuration on functions still exists

### Mail Provisioning

- FR18: HR Admin or Entity Editor can trigger mail provisioning for a starter via a "Generate Mail" button
- FR19: System can show the Generate Mail button only when the starter's entity has a registered and valid app connection
- FR20: System can perform a real-time license availability check via Graph API at provisioning time
- FR21: System can apply trickle-down logic to assign a lower-tier license when the configured type is unavailable
- FR22: System can notify the user when a trickle-down fallback license was assigned instead of the configured type
- FR23: System can create an M365 user in the tenant's Entra ID
- FR24: System can assign the appropriate license to the created M365 user
- FR25: System can wait for mailbox provisioning to complete after license assignment
- FR26: System can generate a temporary password with mandatory reset on first login for the created user
- FR27: System can display real-time provisioning status updates to the user during the provisioning flow
- FR28: System can replace the Generate Mail button with a success checkmark after successful provisioning
- FR29: System can display the temporary credentials to the user after successful provisioning
- FR30: System can detect and report conflicts when an M365 user already exists in the tenant
- FR31: User can accept a conflict and proceed or cancel when a duplicate user is detected
- FR32: System can prevent concurrent provisioning jobs for the same starter (mutex)

### Provisioning Recovery

- FR33: User can retry provisioning from the exact failure point when a provisioning attempt fails
- FR34: User can remove a partially created M365 user when a provisioning attempt fails
- FR35: System can recover provisioning state after browser closure or disconnection
- FR36: System can display an informational message when provisioning exceeds 60 seconds

### License Intelligence

- FR37: System can cache license availability counts per tenant with automated periodic refresh
- FR38: System can display cached license availability counts in the entity administration UI
- FR39: System can calculate license demand based on planned starters who have not yet been provisioned
- FR40: System can create an automated task for the IT person when available licenses are insufficient for upcoming starters
- FR41: System can display a status banner when the Graph API is unreachable

### Provisioning Lifecycle

- FR42: System can create a cleanup task for IT when a starter is cancelled after mail provisioning
- FR43: System can create a cleanup task for IT when a starter's entity changes after mail provisioning
- FR44: System can apply the target entity's app connection and license settings when a starter migrates between entities
- FR45: System can hide the Generate Mail button when a starter migrates to an entity without an app connection

### Audit & Observability

- FR46: System can log every provisioning action (who triggered, when, result) to the audit trail
- FR47: System can store Graph API responses for each provisioning step for debugging purposes
- FR48: System can track detailed provisioning state per starter (license_checking, user_creating, license_assigning, mailbox_waiting, success, failed_at_step)

## Non-Functional Requirements

### Security

- NFR1: Private keys for certificate-based authentication must be stored encrypted at rest in the database
- NFR2: Private key values must never be retrievable or displayable after initial generation and successful connection validation
- NFR3: All Graph API communication must use certificate-based authentication (no shared secrets)
- NFR4: Temporary passwords generated for new M365 users must enforce mandatory reset on first login
- NFR5: Provisioning actions must only be executable by users with HR_ADMIN or ENTITY_EDITOR roles with access to the starter's entity
- NFR6: Graph API credentials for one entity must never be accessible to users of another entity
- NFR7: Audit logs of provisioning actions (including Graph API responses) must be retained for at least 12 months

### Performance

- NFR8: The Generate Mail button must respond within 1 second of click (initiate provisioning job)
- NFR9: Provisioning status updates must reach the frontend within 2 seconds of each state change
- NFR10: Daily consent sweep and license cache sync must complete within 5 minutes for up to 50 tenant connections
- NFR11: Certificate keypair generation must complete within 5 seconds

### Integration

- NFR12: The system must handle Graph API rate limiting gracefully without data loss or requiring user intervention
- NFR13: The system must distinguish between Graph API authentication failures (consent revoked) and transient errors (service unavailable) and communicate the difference to the user
- NFR14: The system must tolerate Graph API latency of up to 30 seconds per operation without data loss
- NFR15: The system must support Microsoft Graph API v1.0 endpoints for user management and license operations
- NFR16: The provisioning state machine must be resilient to frontend disconnection — backend state must never depend on frontend connectivity

### Reliability

- NFR17: No provisioning data may be lost due to browser closure, network interruption, or server restart during an active provisioning job
- NFR18: The system must never leave a starter in an inconsistent state — every failure point must have a defined recovery path (retry or remove)
- NFR19: The daily automated checks (consent sweep, license sync) must not block or interfere with active provisioning operations
