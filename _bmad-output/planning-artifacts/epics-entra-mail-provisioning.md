---
stepsCompleted: [1, 2, 3, 4]
status: complete
completedAt: '2026-06-04'
inputDocuments:
  - _bmad-output/planning-artifacts/prd-entra-mail-provisioning.md
  - _bmad-output/planning-artifacts/architecture-entra-mail-provisioning.md
  - _bmad-output/planning-artifacts/ux-design-entra-mail-provisioning.md
---

# Starterskalender - Entra ID Mail Provisioning - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for the Entra ID Mail Provisioning feature, decomposing the requirements from the PRD, Architecture, and UX Design Specification into implementable stories.

## Requirements Inventory

### Functional Requirements

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
- FR12: System Admin can configure a required license type (Business Basic or Business Standard) per job function on the functions page
- FR13: System can conditionally show license configuration options only when the entity has a registered app connection
- FR14: System Admin can configure a tenant-wide trickle-down policy (enabled/disabled)
- FR15: System Admin can override the trickle-down policy per individual job function
- FR16: System Admin can configure the temporary password complexity rules (length, character requirements) per tenant
- FR17: System can notify the admin when an app connection is removed but license configuration on functions still exists
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
- FR33: User can retry provisioning from the exact failure point when a provisioning attempt fails
- FR34: User can remove a partially created M365 user when a provisioning attempt fails
- FR35: System can recover provisioning state after browser closure or disconnection
- FR36: System can display an informational message when provisioning exceeds 60 seconds
- FR37: System can cache license availability counts per tenant with automated periodic refresh
- FR38: System can display cached license availability counts in the entity administration UI
- FR39: System can calculate license demand based on planned starters who have not yet been provisioned
- FR40: System can create an automated task for the IT person when available licenses are insufficient for upcoming starters
- FR41: System can display a status banner when the Graph API is unreachable
- FR42: System can create a cleanup task for IT when a starter is cancelled after mail provisioning
- FR43: System can create a cleanup task for IT when a starter's entity changes after mail provisioning
- FR44: System can apply the target entity's app connection and license settings when a starter migrates between entities
- FR45: System can hide the Generate Mail button when a starter migrates to an entity without an app connection
- FR46: System can log every provisioning action (who triggered, when, result) to the audit trail
- FR47: System can store Graph API responses for each provisioning step for debugging purposes
- FR48: System can track detailed provisioning state per starter (license_checking, user_creating, license_assigning, mailbox_waiting, success, failed_at_step)

### NonFunctional Requirements

- NFR1: Private keys for certificate-based authentication must be stored encrypted at rest in the database
- NFR2: Private key values must never be retrievable or displayable after initial generation and successful connection validation
- NFR3: All Graph API communication must use certificate-based authentication (no shared secrets)
- NFR4: Temporary passwords generated for new M365 users must enforce mandatory reset on first login
- NFR5: Provisioning actions must only be executable by users with HR_ADMIN or ENTITY_EDITOR roles with access to the starter's entity
- NFR6: Graph API credentials for one entity must never be accessible to users of another entity
- NFR7: Audit logs of provisioning actions (including Graph API responses) must be retained for at least 12 months
- NFR8: The Generate Mail button must respond within 1 second of click (initiate provisioning job)
- NFR9: Provisioning status updates must reach the frontend within 2 seconds of each state change
- NFR10: Daily consent sweep and license cache sync must complete within 5 minutes for up to 50 tenant connections
- NFR11: Certificate keypair generation must complete within 5 seconds
- NFR12: The system must handle Graph API rate limiting gracefully without data loss or requiring user intervention
- NFR13: The system must distinguish between Graph API authentication failures (consent revoked) and transient errors (service unavailable) and communicate the difference to the user
- NFR14: The system must tolerate Graph API latency of up to 30 seconds per operation without data loss
- NFR15: The system must support Microsoft Graph API v1.0 endpoints for user management and license operations
- NFR16: The provisioning state machine must be resilient to frontend disconnection — backend state must never depend on frontend connectivity
- NFR17: No provisioning data may be lost due to browser closure, network interruption, or server restart during an active provisioning job
- NFR18: The system must never leave a starter in an inconsistent state — every failure point must have a defined recovery path (retry or remove)
- NFR19: The daily automated checks (consent sweep, license sync) must not block or interfere with active provisioning operations

### Additional Requirements

From Architecture document:
- AR1: Extend Prisma schema with 5 new models (EntraAppConnection, ProvisioningJob, LicenseCache, LicenseConfig, TenantEntraConfig) and 2 enums (LicenseType, ProvisioningState)
- AR2: Implement AES-256-GCM encryption module (lib/encryption.ts) for private key storage with ENTRA_ENCRYPTION_KEY env variable
- AR3: Implement X.509 certificate generation module (lib/certificate.ts) using Node.js crypto with 2048-bit RSA and 2-year expiry
- AR4: Implement GraphApiService class (lib/graph-api-service.ts) with per-tenant credential resolution and typed error hierarchy (GraphAuthError, GraphTransientError, GraphRateLimitError, GraphConflictError)
- AR5: Implement ProvisioningEngine state machine (lib/provisioning-engine.ts) with in-process async execution and DB-backed state persistence
- AR6: Implement LicenseIntelligence module (lib/license-intelligence.ts) for trickle-down logic and demand calculation
- AR7: Implement SSE endpoint via Next.js API route ReadableStream at /api/provisioning/[starterId]/status
- AR8: Implement database-level mutex via unique constraint on (starterId, active status) in ProvisioningJob
- AR9: Configure Graph API application permissions: User.ReadWrite.All, Directory.ReadWrite.All, Organization.Read.All
- AR10: Add @azure/msal-node dependency for ConfidentialClientApplication with certificate credentials
- AR11: Implement parallel certificate rotation (new keypair, validate, remove old) for zero-downtime rotation
- AR12: All new API routes must use requireEntityAccess() for entity-scoped RBAC enforcement

### UX Design Requirements

- UX-DR1: Implement GenerateMailButton component with 4 states: ready (blue button), in-progress (disabled spinner), success (hidden, replaced by status), unavailable (not rendered)
- UX-DR2: Implement ProvisioningStatus component with vertical step list (○ pending, ◉ active, ✓ complete, ✗ failed), SSE subscription via useProvisioningStatus hook, and credential card on success
- UX-DR3: Implement EntraConnectionForm with progressive disclosure — 3 collapsible sections that reveal sequentially (Connection Details → Certificate → Validation)
- UX-DR4: Implement EntraConnectionStatus health indicator component (8px colored dot + text label) with 4 states: healthy/warning/error/unconfigured
- UX-DR5: Implement LicenseConfigPanel conditional dropdown on functions admin page, only visible when entity has active Entra connection
- UX-DR6: Implement LicenseDashboard with per-license-type cards showing availability count + color-coded capacity bar (green >20%, amber 5-20%, red <5%)
- UX-DR7: Implement CertificateDownload button component for .cer file download
- UX-DR8: Implement TrickleDownConfig toggle (Switch + Select) for tenant-wide policy
- UX-DR9: Implement PasswordConfig form (min length input + switches for complexity rules)
- UX-DR10: Implement useProvisioningStatus custom hook with SSE subscription, auto-reconnect, and state mapping
- UX-DR11: Define 10 Entra-specific CSS semantic color tokens (connection health, provisioning states, license capacity) in both light and dark mode
- UX-DR12: Implement secret-once credential display pattern: temporary password in highlighted card with copy button, "Only shown once" warning, "Copied ✓" feedback
- UX-DR13: Implement trickle-down positive framing: amber informational banner within success state ("Business Basic assigned instead of Standard")
- UX-DR14: Add i18n translation keys under entra.* namespace for all new UI strings (nl/fr)
- UX-DR15: Implement toast feedback patterns for provisioning success, failure, connection validated, certificate generated, password copied
- UX-DR16: Implement empty state patterns: no connection ("Set up connection" CTA), not provisioned (Generate Mail button), license cache empty ("Will sync automatically")
- UX-DR17: Implement loading state patterns: step list spinner (never full-page), validation spinner on button, skeleton cards for license dashboard
- UX-DR18: Implement accessibility: ARIA labels for provisioning steps, aria-live regions for status changes, focus management after provisioning completes, prefers-reduced-motion support

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 1 | Register Entra ID app connection per entity |
| FR2 | Epic 1 | Generate certificate keypair for app connection |
| FR3 | Epic 1 | Download .cer public certificate |
| FR4 | Epic 1 | Validate app connection against Graph API |
| FR5 | Epic 1 | Hide private key after successful validation |
| FR6 | Epic 1 | Check consent status before provisioning |
| FR7 | Epic 1 | Daily consent sweep of all connections |
| FR8 | Epic 1 | Retain last known consent status on API failure |
| FR9 | Epic 1 | Notify admin on consent revocation |
| FR10 | Epic 1 | Warn on certificate expiry within 30 days |
| FR11 | Epic 1 | Regenerate certificate keypair for existing connection |
| FR12 | Epic 2 | Configure license type per job function |
| FR13 | Epic 2 | Conditional license config visibility |
| FR14 | Epic 2 | Configure tenant-wide trickle-down policy |
| FR15 | Epic 2 | Override trickle-down per job function |
| FR16 | Epic 2 | Configure temporary password complexity per tenant |
| FR17 | Epic 2 | Notify admin on connection removal with active configs |
| FR18 | Epic 3 | Generate Mail button for starters |
| FR19 | Epic 3 | Conditional Generate Mail button visibility |
| FR20 | Epic 3 | Real-time license availability check |
| FR21 | Epic 3 | Trickle-down license assignment logic |
| FR22 | Epic 3 | Notify user on trickle-down fallback |
| FR23 | Epic 3 | Create M365 user in Entra ID |
| FR24 | Epic 3 | Assign license to created user |
| FR25 | Epic 3 | Wait for mailbox provisioning |
| FR26 | Epic 3 | Generate temporary password with mandatory reset |
| FR27 | Epic 3 | Real-time provisioning status updates |
| FR28 | Epic 3 | Replace button with success checkmark |
| FR29 | Epic 3 | Display temporary credentials |
| FR30 | Epic 3 | Detect duplicate M365 user conflicts |
| FR31 | Epic 3 | Accept or cancel on conflict detection |
| FR32 | Epic 3 | Prevent concurrent provisioning (mutex) |
| FR33 | Epic 3 | Retry from failure point |
| FR34 | Epic 3 | Remove partially created M365 user |
| FR35 | Epic 3 | Recover state after browser disconnection |
| FR36 | Epic 3 | Informational message on long-running provisioning |
| FR37 | Epic 4 | Cache license availability with periodic refresh |
| FR38 | Epic 4 | Display cached license counts in admin UI |
| FR39 | Epic 4 | Calculate license demand from planned starters |
| FR40 | Epic 4 | Automated IT task on insufficient licenses |
| FR41 | Epic 4 | Status banner on Graph API unreachable |
| FR42 | Epic 5 | Cleanup task on starter cancellation |
| FR43 | Epic 5 | Cleanup task on entity change |
| FR44 | Epic 5 | Apply target entity settings on migration |
| FR45 | Epic 5 | Hide Generate Mail on migration to unconfigured entity |
| FR46 | Epic 3 | Log every provisioning action to audit trail |
| FR47 | Epic 3 | Store Graph API responses for debugging |
| FR48 | Epic 3 | Track detailed provisioning state per starter |

## Epic List

### Epic 1: Entra ID Connection & Certificate Management

System Admin (Kevin) can set up a secure Entra ID connection per entity, including certificate generation, Graph API validation, and ongoing consent monitoring — establishing the foundation for all mail provisioning capabilities.

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR11

**Key NFRs:** NFR1 (encrypted storage), NFR2 (secret-once), NFR3 (certificate auth), NFR6 (entity isolation), NFR11 (keygen <5s)

**Key ARs:** AR1 (EntraAppConnection model), AR2 (encryption module), AR3 (certificate module), AR4 (GraphApiService), AR10 (@azure/msal-node), AR11 (parallel rotation), AR12 (entity RBAC)

**Key UX-DRs:** UX-DR3 (EntraConnectionForm), UX-DR4 (EntraConnectionStatus), UX-DR7 (CertificateDownload), UX-DR11 (semantic tokens), UX-DR16 (empty states)

### Epic 2: License Configuration & Trickle-Down Policy

System Admin (Kevin) can configure which license type (Business Basic or Business Standard) is required per job function, set tenant-wide trickle-down policies with per-function overrides, and define temporary password complexity rules — all conditionally available only when the entity has an active Entra connection.

**FRs covered:** FR12, FR13, FR14, FR15, FR16, FR17

**Key NFRs:** NFR5 (RBAC enforcement)

**Key ARs:** AR1 (LicenseConfig, TenantEntraConfig models), AR6 (LicenseIntelligence trickle-down), AR12 (entity RBAC)

**Key UX-DRs:** UX-DR5 (LicenseConfigPanel), UX-DR8 (TrickleDownConfig), UX-DR9 (PasswordConfig), UX-DR14 (i18n)

### Epic 3: Starter Mail Provisioning & Recovery

HR Admin or Entity Editor (Sarah) can provision an M365 mail account for a starter via the "Generate Mail" button, with real-time status updates during user creation, license assignment, and mailbox provisioning. Includes conflict detection, concurrent provisioning protection, retry from failure point, partial user cleanup, state recovery after disconnection, and full audit trail with Graph API response storage for compliance and debugging.

**FRs covered:** FR18, FR19, FR20, FR21, FR22, FR23, FR24, FR25, FR26, FR27, FR28, FR29, FR30, FR31, FR32, FR33, FR34, FR35, FR36, FR46, FR47, FR48

**Key NFRs:** NFR4 (mandatory password reset), NFR5 (RBAC), NFR7 (12-month audit retention), NFR8 (<1s response), NFR9 (<2s status), NFR12 (rate limiting), NFR13 (error classification), NFR14 (30s timeout), NFR16 (frontend-independent state), NFR17 (no data loss), NFR18 (defined recovery paths)

**Key ARs:** AR1 (ProvisioningJob state tracking), AR4 (GraphApiService), AR5 (ProvisioningEngine), AR7 (SSE endpoint), AR8 (DB mutex), AR9 (Graph permissions)

**Key UX-DRs:** UX-DR1 (GenerateMailButton), UX-DR2 (ProvisioningStatus), UX-DR10 (useProvisioningStatus hook), UX-DR12 (secret-once credentials), UX-DR13 (trickle-down framing), UX-DR15 (toast feedback), UX-DR17 (loading states), UX-DR18 (accessibility)

### Epic 4: Proactive License Intelligence

IT Specialist (Marc) gains proactive visibility into license availability through cached counts, demand forecasting based on planned starters, automated tasks when licenses are insufficient, and a status banner when the Graph API is unreachable.

**FRs covered:** FR37, FR38, FR39, FR40, FR41

**Key NFRs:** NFR10 (<5min sync), NFR19 (non-blocking crons)

**Key ARs:** AR1 (LicenseCache model), AR6 (LicenseIntelligence demand), AR4 (GraphApiService)

**Key UX-DRs:** UX-DR6 (LicenseDashboard), UX-DR16 (empty states for license cache)

### Epic 5: Starter Lifecycle Integration

System automatically handles post-provisioning lifecycle events: creating cleanup tasks for IT when a starter is cancelled or changes entity, applying the target entity's connection and license settings on migration, and hiding the Generate Mail button when migrating to an entity without an app connection.

**FRs covered:** FR42, FR43, FR44, FR45

**Key NFRs:** NFR18 (no inconsistent state)

**Key ARs:** AR12 (entity RBAC)

---

## Epic 1: Entra ID Connection & Certificate Management

### Story 1.1: Register Entra ID App Connection

As a System Admin,
I want to register an Entra ID app connection for an entity by providing the Client ID and Tenant ID,
So that the entity is linked to its Microsoft 365 tenant for future mail provisioning.

**Acceptance Criteria:**

**Given** I am a System Admin with access to entity administration
**When** I navigate to the entity's Entra ID connection settings
**Then** I see an EntraConnectionForm with input fields for Client ID and Tenant ID

**Given** I have entered a valid Client ID and Tenant ID
**When** I submit the connection form
**Then** an EntraAppConnection record is created in the database linked to the entity
**And** the connection status shows as "unconfigured" (pending certificate setup)

**Given** I am an admin for Entity A
**When** I try to access or modify the Entra connection for Entity B
**Then** the system denies access (entity-scoped RBAC via requireEntityAccess())

**Given** an entity already has a registered Entra connection
**When** I view the entity administration page
**Then** I see the EntraConnectionStatus health indicator instead of the empty state

**Given** an entity has no Entra connection
**When** I view the entity administration page
**Then** I see the empty state with a "Set up connection" call-to-action

**Requirements:** FR1, AR1 (EntraAppConnection model), AR12, NFR6, UX-DR3 (section 1), UX-DR4, UX-DR11, UX-DR16

---

### Story 1.2: Certificate Keypair Generation & Download

As a System Admin,
I want the system to generate a certificate keypair for my Entra ID connection and let me download the public certificate,
So that I can upload it to Azure Portal for secure, certificate-based authentication without managing secrets manually.

**Acceptance Criteria:**

**Given** an entity has a registered Entra connection with Client ID and Tenant ID
**When** I click "Generate Certificate Keypair"
**Then** the system generates a 2048-bit RSA keypair with a 2-year expiry within 5 seconds
**And** the private key is encrypted with AES-256-GCM before storage in the database
**And** the CertificateDownload button appears to download the .cer public certificate

**Given** a keypair has been generated
**When** I click the download button
**Then** the .cer public certificate file is downloaded to my machine
**And** step-by-step instructions are shown for uploading to Azure Portal (App registrations → Certificates & secrets)

**Given** a keypair has been generated and downloaded
**When** I return to this page later
**Then** the private key value is never retrievable or displayable (secret-once pattern)
**And** I can see the certificate's expiry date and thumbprint as metadata

**Given** the ENTRA_ENCRYPTION_KEY environment variable is not configured
**When** the system attempts to generate or decrypt a keypair
**Then** a clear error is shown to the admin without exposing sensitive details

**Requirements:** FR2, FR3, FR5, AR2, AR3, NFR1, NFR2, NFR11, UX-DR3 (section 2), UX-DR7, UX-DR15 (certificate generated toast)

---

### Story 1.3: Graph API Connection Validation

As a System Admin,
I want the system to validate my Entra ID connection against the Graph API after certificate upload,
So that I can confirm the connection is working before relying on it for provisioning.

**Acceptance Criteria:**

**Given** I have uploaded the .cer certificate to Azure Portal and returned to the app
**When** I click "I've uploaded the certificate" / validate connection
**Then** the system authenticates against Graph API using the certificate via @azure/msal-node ConfidentialClientApplication
**And** a validation spinner is shown on the button during the check

**Given** the Graph API validation succeeds
**When** the validation completes
**Then** the connection status changes to "healthy" (green dot + label)
**And** a success toast is shown ("Connection validated")
**And** the available license types in the tenant are displayed

**Given** the Graph API validation fails due to missing consent
**When** the validation completes
**Then** the connection status shows "error" with a clear message distinguishing auth failure from transient error (GraphAuthError vs GraphTransientError)
**And** the admin is guided on next steps

**Given** the Graph API returns a rate limit response
**When** the validation is attempted
**Then** the system retries automatically respecting the Retry-After header
**And** the user sees a "Validating..." status without manual intervention

**Requirements:** FR4, AR4 (GraphApiService foundation), AR9, AR10, NFR3, NFR12, NFR13, UX-DR3 (section 3), UX-DR15 (connection validated toast)

---

### Story 1.4: Connection Status & Health Indicator

As a System Admin,
I want to see the current health status of each entity's Entra ID connection at a glance,
So that I can quickly identify and address connection issues across entities.

**Acceptance Criteria:**

**Given** an entity has a healthy, validated Entra connection
**When** I view the entity administration page
**Then** I see a green 8px dot with "Healthy" label on the EntraConnectionStatus component

**Given** an entity's connection has a certificate expiring within 30 days
**When** I view the entity administration page
**Then** I see an amber dot with "Warning" label and the expiry date

**Given** an entity's connection has lost consent or failed validation
**When** I view the entity administration page
**Then** I see a red dot with "Error" label and a description of the issue

**Given** an entity has no Entra connection configured
**When** I view the entity administration page
**Then** I see a grey dot with "Not configured" label

**Given** the system needs to check consent status
**When** any provisioning action is about to be performed
**Then** the system performs a real-time consent check against Graph API before proceeding

**Requirements:** FR6, UX-DR4, UX-DR11 (semantic color tokens for connection health)

---

### Story 1.5: Daily Consent Sweep & Admin Notifications

As a System Admin,
I want the system to automatically verify all Entra ID connections daily and notify me when consent is revoked,
So that I can proactively address connection issues before they block HR users from provisioning.

**Acceptance Criteria:**

**Given** the daily cron job runs
**When** the consent sweep executes
**Then** every active EntraAppConnection is checked against the Graph API for valid consent
**And** the sweep completes within 5 minutes for up to 50 connections

**Given** a connection's consent has been revoked since the last check
**When** the sweep detects the revocation
**Then** the connection status is updated to "error"
**And** the System Admin receives a notification (via existing notification system)

**Given** the Graph API is unreachable during the sweep
**When** the sweep attempts to check a connection
**Then** the last known consent status is retained (not overwritten)
**And** the sweep continues to check remaining connections

**Given** an active provisioning job is running for an entity
**When** the daily sweep runs
**Then** the sweep does not block or interfere with the active provisioning operation

**Requirements:** FR7, FR8, FR9, NFR10, NFR19

---

### Story 1.6: Certificate Expiry Warning & Rotation

As a System Admin,
I want to be warned when a certificate is about to expire and be able to rotate it without downtime,
So that I can maintain uninterrupted Entra ID connectivity.

**Acceptance Criteria:**

**Given** an entity's certificate expires within 30 days
**When** I view the entity administration page or the daily sweep runs
**Then** the connection status shows a warning with the exact expiry date
**And** a "Regenerate Certificate" action is prominently available

**Given** I click "Regenerate Certificate" on an active connection
**When** the system generates a new keypair
**Then** a new 2048-bit RSA keypair is generated (parallel to the existing one)
**And** I can download the new .cer file for upload to Azure Portal
**And** the old certificate remains active until the new one is validated

**Given** I have uploaded the new certificate to Azure and click validate
**When** the validation succeeds with the new certificate
**Then** the old certificate is deactivated and removed
**And** the connection status returns to "healthy" with the new expiry date

**Given** the new certificate validation fails
**When** the validation completes
**Then** the old certificate remains active (zero-downtime guarantee)
**And** the admin is informed of the failure

**Requirements:** FR10, FR11, AR3, AR11, UX-DR7

---

## Epic 2: License Configuration & Trickle-Down Policy

### Story 2.1: License Type Configuration per Job Function

As a System Admin,
I want to configure which Microsoft 365 license type is required for each job function,
So that new starters in that function automatically receive the correct license during mail provisioning.

**Acceptance Criteria:**

**Given** I am on the functions administration page for an entity that has an active Entra connection
**When** I view a job function's settings
**Then** I see a LicenseConfigPanel with a dropdown to select "Business Basic" or "Business Standard"

**Given** I am on the functions page for an entity without an Entra connection
**When** I view a job function's settings
**Then** the LicenseConfigPanel is not visible (conditional rendering)

**Given** I select a license type for a job function
**When** I save the configuration
**Then** a LicenseConfig record is created/updated linking the function to the selected LicenseType enum
**And** future starters in this function will use this license type for provisioning

**Given** I want to change the license type for a function
**When** I update the dropdown and save
**Then** the configuration is updated for future provisioning (existing provisioned starters are not affected)

**Requirements:** FR12, FR13, AR1 (LicenseConfig model, LicenseType enum), AR12, NFR5, UX-DR5, UX-DR14 (i18n)

---

### Story 2.2: Tenant-Wide Trickle-Down Policy

As a System Admin,
I want to configure a tenant-wide trickle-down policy that falls back to a lower-tier license when the configured type is unavailable,
So that mail provisioning can still proceed even when the preferred license type runs out.

**Acceptance Criteria:**

**Given** I am on the tenant's Entra configuration page
**When** I view the trickle-down settings
**Then** I see a TrickleDownConfig component with a toggle (enabled/disabled) and a description of the fallback behavior (Business Standard → Business Basic)

**Given** trickle-down is enabled tenant-wide
**When** I view a specific job function's license configuration
**Then** I see an option to override the trickle-down policy for that function (enable/disable per function)

**Given** trickle-down is enabled and a function has no override
**When** provisioning attempts to assign Business Standard but none are available
**Then** the system checks for Business Basic availability as fallback

**Given** trickle-down is disabled tenant-wide
**When** a function has trickle-down explicitly enabled as an override
**Then** the override takes precedence — trickle-down is applied for that function only

**Requirements:** FR14, FR15, AR1 (TenantEntraConfig model), AR6, UX-DR8

---

### Story 2.3: Temporary Password Complexity Configuration

As a System Admin,
I want to configure the temporary password complexity rules per tenant,
So that generated passwords meet my organization's security policies.

**Acceptance Criteria:**

**Given** I am on the tenant's Entra configuration page
**When** I view the password settings
**Then** I see a PasswordConfig form with minimum length input and switches for character requirements (uppercase, lowercase, digits, special characters)

**Given** I configure password rules (e.g., min 12 chars, require uppercase + digits + special)
**When** I save the configuration
**Then** the rules are stored in TenantEntraConfig
**And** all future temporary passwords generated for this tenant follow these rules

**Given** no password complexity rules are configured for a tenant
**When** a temporary password needs to be generated
**Then** sensible defaults are applied (e.g., 16 chars, all character types enabled)

**Requirements:** FR16, AR1 (TenantEntraConfig), UX-DR9

---

### Story 2.4: Connection Removal Safeguard Notification

As a System Admin,
I want to be notified when I remove an Entra connection that still has active license configurations on functions,
So that I don't accidentally orphan license settings that will no longer work.

**Acceptance Criteria:**

**Given** an entity has an Entra connection with license configurations on one or more functions
**When** I attempt to remove the Entra connection
**Then** I see a warning listing all functions that have active license configurations
**And** I must confirm the removal explicitly

**Given** I confirm the removal of a connection with active configs
**When** the connection is removed
**Then** the admin receives a notification summarizing the orphaned license configurations
**And** the LicenseConfigPanel on affected functions becomes hidden (no Entra connection)

**Given** an entity has an Entra connection with no license configurations
**When** I remove the connection
**Then** the removal proceeds without a warning

**Requirements:** FR17, UX-DR15 (toast feedback)

---

## Epic 3: Starter Mail Provisioning & Recovery

### Story 3.1: Generate Mail Button & Conditional Visibility

As an HR Admin or Entity Editor,
I want to see a "Generate Mail" button on a starter's page when their entity has a valid Entra connection,
So that I can initiate mail provisioning when ready.

**Acceptance Criteria:**

**Given** a starter belongs to an entity with a healthy Entra connection and a license config on their function
**When** I view the starter's page
**Then** I see a "Generate Mail" button in the ready state (blue, clickable)

**Given** a starter belongs to an entity without an Entra connection
**When** I view the starter's page
**Then** the Generate Mail button is not rendered (unavailable state)

**Given** a starter has already been successfully provisioned
**When** I view the starter's page
**Then** the Generate Mail button is hidden and replaced by a success checkmark with provisioning details

**Given** a provisioning job is currently in progress for this starter
**When** I view the starter's page
**Then** the button is in the in-progress state (disabled with spinner)

**Given** I do not have HR_ADMIN or ENTITY_EDITOR role for this starter's entity
**When** I view the starter's page
**Then** the Generate Mail button is not shown

**Requirements:** FR18, FR19, FR28, AR12, NFR5, UX-DR1 (4 button states), UX-DR14 (i18n)

---

### Story 3.2: Provisioning Engine & M365 User Creation

As an HR Admin or Entity Editor,
I want the system to create an M365 user account with the correct license and a temporary password when I click Generate Mail,
So that the starter gets a working Microsoft 365 account.

**Acceptance Criteria:**

**Given** I click the Generate Mail button for a starter
**When** the provisioning job starts
**Then** the button responds within 1 second (initiates the job)
**And** a ProvisioningJob record is created in the database with state "license_checking"
**And** a database-level mutex prevents concurrent provisioning for the same starter

**Given** the provisioning engine is running
**When** the license check passes
**Then** the engine creates an M365 user in the tenant's Entra ID via Graph API
**And** the state transitions to "user_creating"

**Given** the M365 user is created
**When** the engine proceeds to license assignment
**Then** the appropriate license (from LicenseConfig) is assigned to the user
**And** the state transitions to "license_assigning"

**Given** the license is assigned
**When** the engine generates a temporary password
**Then** the password follows the tenant's configured complexity rules
**And** the password enforces mandatory reset on first login
**And** the state transitions to "mailbox_waiting"

**Given** another user tries to trigger provisioning for the same starter simultaneously
**When** the system checks the mutex
**Then** the second request is rejected with a clear message ("Provisioning already in progress")

**Given** the backend provisioning state changes
**When** the frontend is disconnected (browser closed)
**Then** the backend state machine continues running independently — no data is lost

**Given** the provisioning engine makes a Graph API call (user creation, license assignment, mailbox check)
**When** the API responds (success or failure)
**Then** the response payload is stored in the ProvisioningJob.graphApiResponses field linked to the specific step
**And** sensitive data (tokens, keys) is excluded from stored responses

**Given** any provisioning action occurs (trigger, state change, success, failure)
**When** the action completes
**Then** an audit entry is created via existing AuditLog with `entra.provisioning.*` action prefix containing: who triggered the action (user ID, name, role), when it occurred (timestamp), what action was performed, the result (success/failure with details), and the starter ID and entity ID

**Given** a provisioning job is created for a starter
**When** the job progresses through states
**Then** each state transition is recorded with timestamp in the ProvisioningJob: license_checking → user_creating → license_assigning → mailbox_waiting → success (or failed_at_step)

**Given** multiple provisioning attempts exist for a starter (initial + retries)
**When** the frontend queries the starter's provisioning status
**Then** all attempts with their state progression and outcomes are available regardless of SSE connection status

**Requirements:** FR23, FR24, FR26, FR32, FR46, FR47, FR48, AR1, AR4, AR5, AR8, AR9, NFR4, NFR7, NFR8, NFR14, NFR16, NFR17

---

### Story 3.3: License Availability Check & Trickle-Down

As an HR Admin or Entity Editor,
I want the system to check license availability and apply trickle-down logic before creating the M365 user,
So that provisioning only proceeds when a license is available and falls back gracefully when needed.

**Acceptance Criteria:**

**Given** I trigger provisioning for a starter whose function requires Business Standard
**When** the provisioning engine starts
**Then** it performs a real-time license availability check via Graph API

**Given** the configured license type (Business Standard) is available
**When** the check completes
**Then** provisioning proceeds with Business Standard
**And** no trickle-down notification is shown

**Given** Business Standard is unavailable but trickle-down is enabled (tenant or function level)
**When** the license check runs
**Then** the system checks for Business Basic availability
**And** if available, proceeds with Business Basic
**And** the user sees an amber informational banner: "Business Basic assigned instead of Standard"

**Given** trickle-down is disabled and the configured license is unavailable
**When** the license check runs
**Then** provisioning fails with a clear message: "No Business Standard licenses available"
**And** no M365 user is created

**Given** both Business Standard and Business Basic are unavailable (with trickle-down enabled)
**When** the license check runs
**Then** provisioning fails with: "No licenses available"

**Requirements:** FR20, FR21, FR22, AR6, UX-DR13 (trickle-down framing)

---

### Story 3.4: Real-Time Provisioning Status via SSE

As an HR Admin or Entity Editor,
I want to see real-time progress updates during mail provisioning,
So that I know exactly what's happening and don't have to guess whether the process is working.

**Acceptance Criteria:**

**Given** a provisioning job is in progress for a starter
**When** I am on the starter's page
**Then** I see a ProvisioningStatus component with a vertical step list showing each provisioning phase (○ pending, ◉ active, ✓ complete, ✗ failed)

**Given** the provisioning engine transitions between states
**When** a state change occurs
**Then** the status update reaches the frontend within 2 seconds via the SSE endpoint (/api/provisioning/[starterId]/status)

**Given** provisioning has been running for more than 60 seconds
**When** the user is watching the status
**Then** an informational message is displayed: "This is taking longer than usual. The process continues in the background."

**Given** I close the browser during provisioning
**When** I reopen the starter's page
**Then** the useProvisioningStatus hook reconnects via SSE
**And** the current state is recovered from the database (not dependent on SSE history)

**Given** the SSE connection drops temporarily
**When** the hook detects disconnection
**Then** it auto-reconnects and fetches the latest state from the DB

**Requirements:** FR27, FR36, AR7, NFR9, NFR16, UX-DR2, UX-DR10, UX-DR17 (step list spinner), UX-DR18 (aria-live for status changes, prefers-reduced-motion)

---

### Story 3.5: Mailbox Provisioning & Success Completion

As an HR Admin or Entity Editor,
I want the system to wait for mailbox provisioning to complete and then show me the temporary credentials,
So that I can hand off the login details to the starter's manager or IT contact.

**Acceptance Criteria:**

**Given** the license has been assigned to the M365 user
**When** the provisioning engine enters "mailbox_waiting" state
**Then** the engine polls for mailbox readiness via Graph API
**And** the status step list shows "Waiting for mailbox provisioning" as active

**Given** the mailbox is provisioned successfully
**When** the engine detects completion
**Then** the state transitions to "success"
**And** the Generate Mail button is permanently replaced by a success checkmark
**And** the provisioning details (email, license type, mailbox status) are displayed

**Given** provisioning completes successfully
**When** the success state is shown
**Then** a credential card displays the temporary password with a copy button
**And** a warning states "Only shown once. Copy now."
**And** after copying, "Copied ✓" feedback is shown
**And** a success toast notification appears

**Given** I navigate away from the page and return
**When** I view the starter's page after successful provisioning
**Then** the temporary password is no longer displayed (secret-once pattern)
**And** the success checkmark and provisioning details remain visible

**Given** provisioning completes
**When** the screen reader reads the page
**Then** focus is managed to the success state and ARIA labels describe the provisioning result

**Requirements:** FR25, FR28, FR29, AR5, NFR17, UX-DR1 (success state), UX-DR2 (credential card), UX-DR12 (secret-once), UX-DR15 (success toast), UX-DR18 (focus management)

---

### Story 3.6: Conflict Detection & Resolution

As an HR Admin or Entity Editor,
I want the system to detect when an M365 user already exists and let me choose how to proceed,
So that I don't accidentally create duplicate accounts.

**Acceptance Criteria:**

**Given** the provisioning engine attempts to create an M365 user
**When** Graph API returns a conflict error (user already exists with the same UPN)
**Then** the provisioning pauses and shows a conflict notification to the user
**And** the conflict includes the existing user's details (display name, email)

**Given** a conflict is detected
**When** I choose "Accept & Proceed"
**Then** the system proceeds with the existing user (assigns license if needed)
**And** provisioning continues from the license assignment step

**Given** a conflict is detected
**When** I choose "Cancel"
**Then** the provisioning job is cancelled
**And** no changes are made to the existing M365 user
**And** the Generate Mail button returns to the ready state

**Requirements:** FR30, FR31, AR4 (GraphConflictError)

---

### Story 3.7: Provisioning Failure Recovery & Reconnection

As an HR Admin or Entity Editor,
I want to retry provisioning from the exact failure point or remove a partially created user when provisioning fails,
So that I can recover from errors without starting over or leaving orphaned accounts.

**Acceptance Criteria:**

**Given** provisioning fails at any step (e.g., license assignment after user creation)
**When** the failure is displayed
**Then** I see the step list with ✓ for completed steps and ✗ for the failed step
**And** the specific error message from Graph API is shown (classified: auth, transient, rate limit)
**And** I am presented with two options: "Retry" and "Remove Created User"

**Given** I click "Retry"
**When** the retry executes
**Then** provisioning resumes from the exact failure point (not from scratch)
**And** previously completed steps are not repeated
**And** a new ProvisioningJob record tracks the retry attempt

**Given** I click "Remove Created User"
**When** the removal executes
**Then** the partially created M365 user is deleted from Entra ID via Graph API
**And** any assigned license is freed
**And** the Generate Mail button returns to the ready state

**Given** I closed my browser during a failed provisioning
**When** I return to the starter's page
**Then** the failed state is recovered from the database
**And** the retry/remove options are available as if I never left

**Given** a transient Graph API error occurs
**When** the error is classified as GraphTransientError
**Then** the error message clearly indicates it's a temporary issue ("Service temporarily unavailable — retry recommended")

**Given** I retry or remove a partially created user
**When** the action completes
**Then** an audit entry is logged with `entra.provisioning.retried` or `entra.provisioning.user_removed` action prefix
**And** the Graph API response for the retry/removal is stored in the ProvisioningJob record

**Requirements:** FR33, FR34, FR35, FR46, FR47, AR4 (typed error hierarchy), AR5 (resume from last state), NFR7, NFR13, NFR18, UX-DR15 (failure toast)

---

## Epic 4: Proactive License Intelligence

### Story 4.1: License Cache & Periodic Refresh

As a System Admin,
I want the system to automatically cache and refresh license availability counts per tenant,
So that license data is always reasonably up-to-date without manual effort.

**Acceptance Criteria:**

**Given** an entity has an active Entra connection
**When** the daily license sync cron job runs
**Then** the system queries Graph API for current license counts (Business Basic and Business Standard)
**And** stores the results in the LicenseCache model with a timestamp

**Given** the license sync runs
**When** it processes all tenant connections
**Then** the entire sync completes within 5 minutes for up to 50 connections

**Given** the Graph API is unreachable during sync
**When** the sync fails for a specific tenant
**Then** the last cached values are retained (not cleared)
**And** the sync continues for remaining tenants

**Given** an active provisioning job is running
**When** the license sync cron executes
**Then** the sync does not block or interfere with the provisioning operation

**Requirements:** FR37, AR1 (LicenseCache model), AR4, NFR10, NFR19

---

### Story 4.2: License Dashboard in Admin UI

As a System Admin,
I want to see license availability at a glance in the entity administration UI,
So that I can monitor license consumption across entities.

**Acceptance Criteria:**

**Given** an entity has cached license data
**When** I view the entity administration page
**Then** I see a LicenseDashboard with per-license-type cards showing:
- License name (Business Basic / Business Standard)
- Available count / total count
- Color-coded capacity bar (green >20%, amber 5-20%, red <5%)

**Given** no license data has been cached yet
**When** I view the dashboard
**Then** I see an empty state: "License data will sync automatically" with a skeleton card loading pattern

**Given** the license data shows less than 5% availability
**When** I view the dashboard
**Then** the capacity bar is red and visually emphasizes the low availability

**Requirements:** FR38, UX-DR6, UX-DR16 (empty state), UX-DR17 (skeleton cards)

---

### Story 4.3: License Demand Forecasting & IT Task Creation

As an IT Specialist,
I want the system to forecast license demand based on planned starters and create a task for me when licenses are insufficient,
So that I can procure additional licenses before provisioning is blocked.

**Acceptance Criteria:**

**Given** there are planned starters (with Generate Mail not yet triggered) across entities
**When** the system calculates license demand
**Then** it counts the required licenses per type based on each starter's function configuration

**Given** the calculated demand exceeds available licenses for a license type
**When** the demand check runs (as part of the daily cron)
**Then** an automated task is created for the IT person via the existing task system
**And** the task includes: license type, available count, required count, and affected starters

**Given** sufficient licenses are available for all planned starters
**When** the demand check runs
**Then** no task is created

**Given** a demand task was already created and is still open
**When** the demand check runs again with the same shortage
**Then** a duplicate task is not created

**Requirements:** FR39, FR40, AR6 (demand calculation)

---

### Story 4.4: Graph API Status Banner

As a System Admin,
I want to see a status banner when the Graph API is unreachable,
So that I know provisioning may be affected and can communicate this to HR users.

**Acceptance Criteria:**

**Given** the system detects that the Graph API is unreachable (via consent sweep, license sync, or failed provisioning)
**When** an admin views any Entra-related admin page
**Then** a status banner is displayed at the top: "Microsoft Graph API is currently unreachable. Provisioning and license data may be affected."

**Given** the Graph API becomes reachable again
**When** the next successful API call is made
**Then** the status banner is removed

**Given** the Graph API is unreachable
**When** an HR user views a starter's page
**Then** the Generate Mail button is still visible but shows a warning if clicked

**Requirements:** FR41, UX-DR11 (semantic tokens for status)

---

## Epic 5: Starter Lifecycle Integration

### Story 5.1: Cleanup Tasks on Starter Cancellation & Entity Change

As an IT Specialist,
I want to receive a cleanup task when a provisioned starter is cancelled or changes entity,
So that I can deactivate or reassign their M365 account and free the license.

**Acceptance Criteria:**

**Given** a starter has been successfully provisioned with an M365 account
**When** the starter is cancelled
**Then** the system creates a cleanup task for the IT person via the existing task system
**And** the task includes: starter name, email address, license type, and "Deactivate account and free license"

**Given** a starter has been successfully provisioned
**When** the starter's entity changes (transfer)
**Then** the system creates a cleanup task for the IT person
**And** the task includes: starter name, old entity, new entity, email address, and required actions

**Given** a starter has NOT been provisioned
**When** the starter is cancelled or changes entity
**Then** no cleanup task is created (nothing to clean up)

**Requirements:** FR42, FR43, NFR18

---

### Story 5.2: Entity Migration Handling

As an HR Admin,
I want the system to apply the correct Entra settings when a starter migrates between entities,
So that the starter's provisioning state reflects their new entity's configuration.

**Acceptance Criteria:**

**Given** a starter migrates from Entity A to Entity B
**When** Entity B has an active Entra connection
**Then** the starter's provisioning context uses Entity B's connection and license settings
**And** the Generate Mail button reflects Entity B's configuration

**Given** a starter migrates from Entity A to Entity B
**When** Entity B does NOT have an Entra connection
**Then** the Generate Mail button is hidden for this starter
**And** the starter is treated as if their entity has no mail provisioning capability

**Given** a starter was already provisioned in Entity A
**When** they migrate to Entity B
**Then** the existing provisioning record is retained for audit
**And** a cleanup task is created (from Story 5.1)
**And** the Generate Mail button reflects Entity B's state (may allow re-provisioning if B is configured)

**Requirements:** FR44, FR45, AR12

---

