---
stepsCompleted: [1, 2, 3, 4]
workflowType: 'epics-and-stories'
lastStep: 4
status: 'complete'
completedAt: '2026-06-17'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd-email-offboarding.md'
  - '_bmad-output/planning-artifacts/architecture-email-offboarding.md'
---

# Entra ID Email Offboarding - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for the Entra ID Email Offboarding feature, decomposing the requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: System can automatically create an offboarding task when HR fills in an exit date for a starter with a provisioned mailbox
FR2: System can show the "Handle Mailbox" button only when the starter's entity has a registered and valid Entra ID app connection
FR3: System can hide the "Handle Mailbox" button when the Graph API is unreachable
FR4: System can restrict the "Handle Mailbox" button to users with the "mail_offboarding" RBAC permission
FR5: System can lock the offboarding task once execution begins to prevent concurrent execution
FR6: System can escalate an offboarding task when it has not been completed before the exit date
FR7: System can verify Graph API reachability before enabling the offboarding flow
FR8: System can detect litigation hold on a mailbox and warn the administrator before flow execution
FR9: System can check mailbox size and warn when it exceeds the 50GB shared mailbox limit
FR10: System can scan Teams channels and groups where the departing user is owner (as pre-flight preparation)
FR11: System can warn when a selected new Teams owner is also approaching their exit date
FR12: System Admin can configure OOO auto-reply templates per function and per entity
FR13: System can render trilingual OOO templates (NL/FR/EN) with variable substitution ({voornaam}, {achternaam}, {algemeen_mailadres})
FR14: System Admin can preview a rendered OOO template before saving
FR15: System can conditionally show OOO template configuration only when the entity has a registered Entra ID app connection
FR16: System can display a list of all Teams channels and groups where the departing user is owner
FR17: System can show current members per channel/group for context during owner selection
FR18: Administrator can search and select a new owner per channel/group
FR19: System can transfer Teams/group ownership to the selected new owner via Graph API (sequentially)
FR20: System can present the Teams ownership transfer as a separate dedicated page
FR21: System can execute the offboarding flow in a fixed 11-step sequence
FR22: System can set Out of Office automatic replies using the configured template
FR23: System can disable user login (accountEnabled = false)
FR24: System can revoke all active sign-in sessions
FR25: System can cancel all calendar items where the departing user is organizer
FR26: System can remove the user from all distribution lists and security groups
FR27: System can remove all forwarding rules from the mailbox
FR28: System can revoke all delegate access permissions on the mailbox
FR29: System can convert a user mailbox to a shared mailbox
FR30: System can remove the assigned license after mailbox conversion
FR31: System can display real-time step-by-step progress during execution via SSE
FR32: System can replace the "Handle Mailbox" button with a success checkmark after completion
FR33: System can stop execution at the first failed step and display which steps succeeded and which failed
FR34: Administrator can retry execution from the exact failed step (skipping already-succeeded steps)
FR35: System can persist execution state in the backend so browser disconnection does not lose progress
FR36: Administrator can recover and view the current execution state after reconnecting
FR37: Administrator can manually trigger rollback (reactivation) of a completed offboarding
FR38: System can maintain the shared mailbox under the original email address with OOO active after offboarding
FR39: System can rename the shared mailbox to ZZ-Archived-{name}-{date}@onmicrosoft.com and remove the original alias (via dependency task)
FR40: System can permanently delete the archived shared mailbox after one year (via dependency task)
FR41: System can log every offboarding step execution to the immutable audit trail
FR42: System can store Graph API responses for each step for debugging purposes
FR43: System can track detailed offboarding state per starter

### NonFunctional Requirements

NFR1: Offboarding actions must only be executable by users with the "mail_offboarding" RBAC permission and access to the starter's entity
NFR2: Graph API credentials for one entity must never be accessible to users of another entity
NFR3: Audit logs of offboarding actions must be retained for at least 12 months
NFR4: The offboarding task lock must prevent any concurrent execution attempts regardless of user or session
NFR5: The "Handle Mailbox" button must respond within 1 second of click
NFR6: SSE step progress updates must reach the frontend within 2 seconds of each step completion
NFR7: Pre-flight checks must complete within 10 seconds total
NFR8: Teams ownership transfer page must load channel/group list within 5 seconds for up to 50 owned items
NFR9: The system must handle Graph API rate limiting gracefully with sequential execution and backoff
NFR10: The system must distinguish between authentication failures and transient errors
NFR11: The system must tolerate Graph API latency of up to 30 seconds per operation without state corruption
NFR12: The system must support Microsoft Graph API v1.0 endpoints
NFR13: No offboarding state may be lost due to browser closure, network interruption, or server restart
NFR14: The system must never leave a starter in an inconsistent state
NFR15: The shared mailbox lifecycle tasks must execute independently of main application availability
NFR16: The offboarding state machine must be resilient to frontend disconnection

### Additional Requirements

- New Prisma models: OffboardingJob (state machine) + OooTemplate (template storage) + OffboardingState enum (27 states)
- GraphApiService extension: 15 new methods for offboarding operations
- New RBAC permission: `mail_offboarding` (separate from provisioning)
- SSE endpoint replication for offboarding status streaming
- Two new cron jobs: offboarding-lifecycle (archive rename + 1-year delete) and offboarding-escalation (task escalation)
- Offboarding engine with sequential step execution pattern (stop-at-first-error)
- Pre-flight check service with 5-minute cache
- OOO template rendering engine with variable substitution
- Teams ownership mapping persistence in OffboardingJob JSON field
- No starter template needed (brownfield extension of existing project)

### UX Design Requirements

No UX Design document exists for this feature. UX patterns are inherited from provisioning feature (same patterns for SSE status display, button states, admin pages).

### FR Coverage Map

FR1: Epic 2 - Auto-create offboarding task on exit date
FR2: Epic 2 - Button visibility based on Entra connection
FR3: Epic 2 - Button hidden when Graph API unreachable
FR4: Epic 2 - Button restricted to mail_offboarding permission
FR5: Epic 2 - Task lock during execution
FR6: Epic 2 - Escalation when task not completed before exit date
FR7: Epic 2 - Graph API reachability check
FR8: Epic 2 - Litigation hold detection and warning
FR9: Epic 2 - Mailbox size check (50GB limit)
FR10: Epic 2 - Teams ownership scan
FR11: Epic 2 - Warning when new owner approaching exit date
FR12: Epic 1 - OOO template configuration per function/entity
FR13: Epic 1 - Trilingual template rendering with variables
FR14: Epic 1 - Template preview before saving
FR15: Epic 1 - Conditional show based on Entra connection
FR16: Epic 3 - Display Teams channels/groups owned by user
FR17: Epic 3 - Show current members per group
FR18: Epic 3 - Search and select new owner
FR19: Epic 3 - Transfer ownership via Graph API
FR20: Epic 3 - Dedicated page for Teams transfer
FR21: Epic 4 - Fixed 11-step execution sequence
FR22: Epic 4 - Set OOO automatic replies
FR23: Epic 4 - Disable user login
FR24: Epic 4 - Revoke sign-in sessions
FR25: Epic 4 - Cancel calendar items
FR26: Epic 4 - Remove from groups
FR27: Epic 4 - Remove forwarding rules
FR28: Epic 4 - Revoke delegate access
FR29: Epic 4 - Convert to shared mailbox
FR30: Epic 4 - Remove license
FR31: Epic 4 - Real-time SSE progress
FR32: Epic 4 - Success checkmark after completion
FR33: Epic 4 - Stop at first failed step
FR34: Epic 4 - Retry from failed step
FR35: Epic 4 - Persist state backend-side
FR36: Epic 4 - Recover state after reconnection
FR37: Epic 5 - Manual rollback capability
FR38: Epic 5 - Maintain shared mailbox with OOO
FR39: Epic 5 - Archive rename via dependency task
FR40: Epic 5 - Delete after one year via dependency task
FR41: Epic 2 - Audit log every step execution
FR42: Epic 2 - Store Graph API responses
FR43: Epic 2 - Track detailed offboarding state

## Epic List

### Epic 1: OOO Template Configuration
Admin can create, edit, and preview trilingual OOO auto-reply templates per function and per entity, preparing for future offboarding flows.
**FRs covered:** FR12, FR13, FR14, FR15

### Epic 2: Offboarding Readiness & Pre-flight
System automatically creates offboarding tasks when HR fills in exit dates, and admin can see full pre-flight readiness status (Graph API health, litigation hold, mailbox size, Teams ownership) with audit trail operational from day one.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR41, FR42, FR43

### Epic 3: Teams Ownership Transfer
Admin can view all Teams channels/groups owned by a departing user, search and select new owners per group, and persist the ownership mapping as preparation for offboarding execution.
**FRs covered:** FR16, FR17, FR18, FR19, FR20

### Epic 4: Offboarding Execution
Admin can execute the complete 11-step offboarding flow with real-time SSE progress monitoring, error handling with stop-at-first-failure, retry from failed step, and state persistence across browser disconnections.
**FRs covered:** FR21, FR22, FR23, FR24, FR25, FR26, FR27, FR28, FR29, FR30, FR31, FR32, FR33, FR34, FR35, FR36

### Epic 5: Lifecycle Management & Rollback
System automatically manages post-offboarding shared mailbox lifecycle (archive rename after 1 day, permanent deletion after 1 year) and admin can trigger manual rollback of completed offboarding.
**FRs covered:** FR37, FR38, FR39, FR40

## Epic 1: OOO Template Configuration

Admin can create, edit, and preview trilingual OOO auto-reply templates per function and per entity, preparing for future offboarding flows.

### Story 1.1: OOO Template CRUD API

As a system administrator,
I want to create and manage OOO auto-reply templates per function and entity,
So that offboarding flows can use pre-configured templates without manual text entry.

**Acceptance Criteria:**

**Given** the OooTemplate Prisma model does not yet exist
**When** the migration runs
**Then** the OooTemplate table is created with fields: id, entityId, jobRoleId (nullable), templateNl, templateFr, templateEn, generalMailAddress, createdAt, updatedAt

**Given** an authenticated user with `mail_offboarding` permission for an entity
**When** they call `GET /api/admin/ooo-templates/[entityId]`
**Then** they receive a list of all OOO templates for that entity only

**Given** an authenticated user with `mail_offboarding` permission
**When** they call `PUT /api/admin/ooo-templates/[entityId]/[jobRoleId]` with template content
**Then** the template is created or updated for that entity/jobRole combination
**And** the response contains the saved template

**Given** an authenticated user without `mail_offboarding` permission
**When** they call any OOO template endpoint
**Then** they receive a 403 Forbidden response

**Given** an authenticated user with permission for entity A
**When** they call OOO template endpoints for entity B
**Then** they receive a 403 Forbidden response (entity isolation)

### Story 1.2: OOO Template Editor UI

As a system administrator,
I want a visual editor to create and edit OOO templates with fields for each language,
So that I can configure templates without technical knowledge.

**Acceptance Criteria:**

**Given** an admin with `mail_offboarding` permission navigates to the entity's functions admin page
**When** the entity has a registered Entra ID app connection
**Then** an OOO template section is visible with options to add/edit templates per function

**Given** the entity does NOT have a registered Entra ID app connection
**When** the admin navigates to the functions admin page
**Then** the OOO template section is not rendered

**Given** the admin opens the OOO template editor for a function
**When** the editor loads
**Then** it displays input fields for templateNl, templateFr, templateEn, and generalMailAddress
**And** existing values are pre-filled if a template already exists

**Given** the admin fills in template fields and clicks Save
**When** the form submits
**Then** the template is persisted via the API
**And** a success notification is shown

**Given** the admin leaves required fields empty
**When** they attempt to save
**Then** validation errors are displayed inline (Zod schema validation)

### Story 1.3: OOO Template Preview

As a system administrator,
I want to preview how an OOO template will look with real variable values,
So that I can verify the template renders correctly before it is used in offboarding.

**Acceptance Criteria:**

**Given** an admin has entered template content in the editor
**When** they click the Preview button
**Then** a `POST /api/admin/ooo-templates/[entityId]/preview` call is made with the template content

**Given** the preview endpoint receives template content
**When** it processes the request
**Then** it returns the rendered template with variables replaced: {voornaam} → example first name, {achternaam} → example last name, {algemeen_mailadres} → the configured generalMailAddress

**Given** the preview response is returned
**When** the OooTemplatePreview component renders
**Then** it displays the rendered NL, FR, and EN versions in a readable format
**And** the admin can see exactly how the auto-reply will appear to email recipients

**Given** a template contains an unrecognized variable like {onbekend}
**When** the preview renders
**Then** the unrecognized variable is left as-is in the output (not replaced, not errored)

## Epic 2: Offboarding Readiness & Pre-flight

System automatically creates offboarding tasks when HR fills in exit dates, and admin can see full pre-flight readiness status with audit trail operational from day one.

### Story 2.1: OffboardingJob Data Model & RBAC Permission

As a developer,
I want the OffboardingJob model and offboarding RBAC permission to exist,
So that all subsequent offboarding features have a solid data foundation and access control.

**Acceptance Criteria:**

**Given** the OffboardingJob Prisma model does not yet exist
**When** the migration runs
**Then** the OffboardingJob table is created with fields: id, starterId (unique active constraint), state (OffboardingState enum), triggeredBy, startedAt, completedAt, currentStep, error, graphApiResponses (JSON), teamsOwnershipMapping (JSON), preFlightResults (JSON), createdAt, updatedAt

**Given** the OffboardingState enum does not yet exist
**When** the migration runs
**Then** the enum is created with all 27 states (PENDING, READY, TEAMS_TRANSFER_PENDING, EXECUTING_*, BLOCKED_AT_*, COMPLETED, ROLLED_BACK)

**Given** the RBAC system exists
**When** the `mail_offboarding` permission is added
**Then** it can be assigned to users independently from existing permissions
**And** it is entity-scoped (user can have permission for entity A but not B)

**Given** a starter already has an active OffboardingJob (state != COMPLETED, ROLLED_BACK)
**When** an attempt is made to create another OffboardingJob for the same starter
**Then** the creation fails with a unique constraint error (task lock)

### Story 2.2: Offboarding Task Auto-Creation & Escalation

As an HR administrator,
I want offboarding tasks to be automatically created when I fill in an exit date,
So that mail administrators are notified and can prepare for mailbox offboarding.

**Acceptance Criteria:**

**Given** a starter has a provisioned mailbox and no active OffboardingJob
**When** HR fills in an exit date (uitdiensttredingsdatum) for that starter
**Then** an OffboardingJob is created with state PENDING
**And** a task of type `offboarding_handle_mailbox` is created and assigned to users with `mail_offboarding` permission for the starter's entity

**Given** a starter does NOT have a provisioned mailbox
**When** HR fills in an exit date
**Then** no OffboardingJob or task is created

**Given** an offboarding task exists with state != COMPLETED
**When** the `offboarding-escalation` cron runs and the exit date is approaching (≤3 days)
**Then** an escalation task of type `offboarding_escalation` is created
**And** the escalation is visible to entity administrators

**Given** the offboarding task is already COMPLETED
**When** the escalation cron runs
**Then** no escalation is created

### Story 2.3: GraphApiService Pre-flight Methods

As a developer,
I want GraphApiService to expose pre-flight check methods,
So that the pre-flight service can validate offboarding readiness via Microsoft Graph.

**Acceptance Criteria:**

**Given** a valid EntraAppConnection exists for the entity
**When** `checkLitigationHold(entityId, userId)` is called
**Then** it returns a boolean indicating whether the mailbox has an active litigation hold

**Given** a valid EntraAppConnection exists for the entity
**When** `getMailboxStatistics(entityId, userId)` is called
**Then** it returns an object containing mailboxSizeMb

**Given** a valid EntraAppConnection exists for the entity
**When** `getUserOwnedGroups(entityId, userId)` is called
**Then** it returns an array of groups/Teams where the user is owner, including groupId and groupName

**Given** the Graph API is unreachable or credentials are invalid
**When** any pre-flight method is called
**Then** a typed error is thrown (GraphApiError subtype) distinguishing auth failure from transient error

**Given** the Graph API responds within 30 seconds
**When** any pre-flight method is called
**Then** the response is returned without timeout or state corruption

### Story 2.4: Pre-flight Check Service & API

As a mail administrator,
I want a single endpoint that runs all pre-flight checks,
So that I can see the complete readiness status before starting offboarding.

**Acceptance Criteria:**

**Given** an admin with `mail_offboarding` permission calls `GET /api/offboarding/[starterId]/preflight`
**When** cached results are less than 5 minutes old
**Then** the cached results are returned immediately from OffboardingJob.preFlightResults

**Given** cached results are older than 5 minutes or don't exist
**When** the endpoint is called
**Then** all pre-flight checks run in parallel (litigation hold, mailbox size, Teams ownership, Graph API health)
**And** results are cached in OffboardingJob.preFlightResults with current timestamp
**And** the response includes: litigationHold (boolean), mailboxSizeMb (number), teamsOwnerships (array), checkedAt (timestamp), allClear (boolean)

**Given** all checks pass (no litigation hold, size < 50GB, Graph API healthy)
**When** results are returned
**Then** `allClear` is true

**Given** any check fails (litigation hold detected, size ≥ 50GB, or Graph API unreachable)
**When** results are returned
**Then** `allClear` is false
**And** the specific failing checks are identifiable in the response

**Given** all pre-flight checks execute
**When** measured end-to-end
**Then** total response time is within 10 seconds

### Story 2.5: Handle Mailbox Button & Pre-flight Panel UI

As a mail administrator,
I want to see the "Handle Mailbox" button with pre-flight status on the starter detail page,
So that I know immediately whether a starter is ready for offboarding and what blockers exist.

**Acceptance Criteria:**

**Given** a starter has an OffboardingJob with state PENDING or READY
**When** the admin has `mail_offboarding` permission and the entity has a valid Entra connection
**Then** the HandleMailboxButton is rendered on the starter detail page

**Given** the entity does NOT have a registered Entra ID app connection
**When** the starter detail page loads
**Then** the HandleMailboxButton is NOT rendered

**Given** the admin does NOT have `mail_offboarding` permission for the entity
**When** the starter detail page loads
**Then** the HandleMailboxButton is NOT rendered

**Given** the HandleMailboxButton is visible
**When** pre-flight results show `allClear: false`
**Then** the button is disabled
**And** the PreFlightPanel shows specific warnings (litigation hold, size exceeded, Graph API down)

**Given** pre-flight results show litigation hold detected
**When** the PreFlightPanel renders
**Then** a warning is displayed explaining the mailbox cannot be offboarded until the hold is resolved

**Given** pre-flight results show mailbox size ≥ 50GB
**When** the PreFlightPanel renders
**Then** a warning is displayed explaining the shared mailbox limit will be exceeded

**Given** pre-flight results show Teams ownership items
**When** the PreFlightPanel renders
**Then** a notice is displayed indicating Teams ownership transfer is needed
**And** a link to the Teams ownership transfer page is shown

**Given** a selected new Teams owner is approaching their exit date (from starter data)
**When** the pre-flight panel renders Teams ownership info
**Then** a warning indicator is shown next to that owner

### Story 2.6: Audit Trail Integration

As a compliance officer,
I want every offboarding action logged to the immutable audit trail,
So that there is a complete record of who did what and when for compliance purposes.

**Acceptance Criteria:**

**Given** any offboarding action occurs (task creation, pre-flight check, state change)
**When** the action completes
**Then** an AuditLog entry is created with action prefix `entra.offboarding.*` (e.g., `entra.offboarding.task_created`, `entra.offboarding.preflight_checked`)
**And** metadata includes entityId, starterId, triggeredBy, and relevant details

**Given** a Graph API call is made during pre-flight checks
**When** the response is received
**Then** the response is stored in OffboardingJob.graphApiResponses JSON field
**And** the stored data includes timestamp, endpoint called, response status, and relevant response body

**Given** audit log entries exist for offboarding actions
**When** queried
**Then** entries are retained for at least 12 months (existing retention policy applies)

**Given** the OffboardingJob state changes
**When** the state transition occurs
**Then** the new state is persisted in the database
**And** the state is queryable for reporting (FR43: detailed state tracking per starter)

## Epic 3: Teams Ownership Transfer

Admin can view all Teams channels/groups owned by a departing user, search and select new owners per group, and persist the ownership mapping as preparation for offboarding execution.

### Story 3.1: Teams Ownership API Routes

As a mail administrator,
I want API endpoints to retrieve Teams ownership data and save my ownership mapping,
So that the transfer decisions are persisted and available for the offboarding execution flow.

**Acceptance Criteria:**

**Given** an admin with `mail_offboarding` permission calls `GET /api/offboarding/[starterId]/teams-ownership`
**When** the starter has owned groups detected by pre-flight
**Then** the response contains a list of groups with groupId, groupName, and current members per group

**Given** the Graph API is called to fetch group members
**When** each group is processed
**Then** members are returned with userId and displayName for context during owner selection

**Given** an admin calls `POST /api/offboarding/[starterId]/teams-ownership` with a mapping array
**When** the payload contains valid entries `[{ groupId, groupName, newOwnerId, newOwnerName }]`
**Then** the mapping is saved to `OffboardingJob.teamsOwnershipMapping` JSON field
**And** the OffboardingJob state transitions to TEAMS_TRANSFER_PENDING

**Given** an admin without `mail_offboarding` permission or without entity access
**When** they call any teams-ownership endpoint
**Then** they receive a 403 Forbidden response

**Given** the mapping is saved
**When** the same endpoint is called again with updated mapping
**Then** the previous mapping is overwritten (admin can revise their selection)

### Story 3.2: Teams Ownership Transfer Page

As a mail administrator,
I want a dedicated page to view all Teams/groups owned by a departing user and select new owners,
So that I can make informed transfer decisions with full context.

**Acceptance Criteria:**

**Given** an admin navigates to `/admin/offboarding/[starterId]/teams`
**When** the page loads
**Then** it displays a list of all Teams channels/groups where the departing user is owner
**And** the page loads within 5 seconds for up to 50 owned items

**Given** the group list is displayed
**When** the admin views a group row
**Then** it shows group name, number of members, and a search-and-select field for new owner

**Given** the admin clicks the owner selection field for a group
**When** they type a search query
**Then** matching users from the organization are shown (via existing user search endpoint)
**And** the admin can select one user as the new owner

**Given** a selected new owner has an exit date approaching (within 30 days)
**When** the selection is displayed
**Then** a warning indicator is shown next to that owner's name

**Given** the admin has selected new owners for all groups
**When** they click "Confirm"
**Then** the complete mapping is saved via POST to teams-ownership API
**And** a success notification is shown
**And** the admin can navigate back to the starter detail page

**Given** the admin has NOT selected a new owner for one or more groups
**When** they click "Confirm"
**Then** validation prevents submission with a message indicating which groups still need an owner

### Story 3.3: Teams Ownership Execution via Graph API

As a developer,
I want GraphApiService methods to transfer group ownership,
So that the offboarding engine can execute Teams transfers using the persisted mapping.

**Acceptance Criteria:**

**Given** a valid EntraAppConnection exists for the entity
**When** `transferGroupOwnership(entityId, groupId, fromUserId, toUserId)` is called
**Then** it adds toUserId as owner of the group via Graph API
**And** it removes fromUserId as owner of the group via Graph API

**Given** multiple groups need ownership transfer
**When** the transfers are executed
**Then** they are processed sequentially (one at a time, not in parallel)
**And** each transfer result is logged

**Given** a transfer fails for one group
**When** the error occurs
**Then** a typed GraphApiError is thrown with details about which group failed
**And** the error includes whether the failure is retryable (transient) or permanent (auth/permission)

**Given** the Graph API rate limits the requests
**When** a 429 response is received
**Then** the service waits for the specified retry-after period before continuing

## Epic 4: Offboarding Execution

Admin can execute the complete 11-step offboarding flow with real-time SSE progress monitoring, error handling with stop-at-first-failure, retry from failed step, and state persistence across browser disconnections.

### Story 4.1: GraphApiService Offboarding Methods

As a developer,
I want all remaining Graph API methods for offboarding operations available in GraphApiService,
So that the offboarding engine can execute all 11 steps via a consistent service interface.

**Acceptance Criteria:**

**Given** a valid EntraAppConnection exists for the entity
**When** `setOutOfOffice(entityId, userId, template)` is called
**Then** it sets automaticRepliesSetting on the mailbox with internalReplyMessage and externalReplyMessage via Graph API

**Given** a valid EntraAppConnection exists
**When** `disableUser(entityId, userId)` is called
**Then** it sets accountEnabled = false on the user via Graph API

**Given** a valid EntraAppConnection exists
**When** `revokeSignInSessions(entityId, userId)` is called
**Then** it calls the revokeSignInSessions endpoint to invalidate all active sessions

**Given** a valid EntraAppConnection exists
**When** `getUserCalendarEvents(entityId, userId)` is called
**Then** it returns all future calendar events where the user is organizer

**Given** a valid EntraAppConnection exists
**When** `cancelCalendarEvent(entityId, eventId)` is called
**Then** it cancels the specified calendar event via Graph API

**Given** a valid EntraAppConnection exists
**When** `removeGroupMember(entityId, groupId, userId)` is called
**Then** it removes the user from the specified distribution list or security group

**Given** a valid EntraAppConnection exists
**When** `getUserMailRules(entityId, userId)` is called
**Then** it returns all inbox rules (forwarding rules) for the user's mailbox

**Given** a valid EntraAppConnection exists
**When** `deleteMailRule(entityId, ruleId)` is called
**Then** it deletes the specified mail rule from the mailbox

**Given** a valid EntraAppConnection exists
**When** `convertToSharedMailbox(entityId, userId)` is called
**Then** it converts the user mailbox to a shared mailbox via Graph API

**Given** a valid EntraAppConnection exists
**When** `removeLicense(entityId, userId, skuId)` is called
**Then** it removes the specified license assignment from the user

**Given** any Graph API method fails
**When** the error is caught
**Then** a typed GraphApiError is thrown distinguishing auth failures from transient errors
**And** rate limiting (429) is handled with backoff

### Story 4.2: Offboarding Engine State Machine

As a mail administrator,
I want the offboarding flow to execute reliably through all 11 steps with state persistence,
So that no progress is lost and failures are clearly identified.

**Acceptance Criteria:**

**Given** an OffboardingJob exists with state READY and all pre-flight checks pass
**When** `POST /api/offboarding/[starterId]/start` is called
**Then** the engine begins executing steps sequentially: OOO → login block → revoke sessions → calendar → Teams transfer → groups → forwarding → delegates → size check → conversion → license removal

**Given** the engine is executing step N
**When** the step begins
**Then** the OffboardingJob state is updated to EXECUTING_{step} in the database BEFORE the Graph API call is made

**Given** step N succeeds
**When** the engine proceeds
**Then** it immediately moves to step N+1
**And** the total flow executes without pause between steps

**Given** step N fails with a Graph API error
**When** the error is caught
**Then** the OffboardingJob state is updated to BLOCKED_AT_{step}
**And** the error details are stored in the error field
**And** execution stops immediately (no further steps attempted)

**Given** the OOO step executes
**When** it processes
**Then** it loads the OooTemplate for the starter's jobRole + entity (fallback to entity default)
**And** it renders variables and calls setOutOfOffice

**Given** the Teams transfer step executes
**When** it processes
**Then** it reads teamsOwnershipMapping from the OffboardingJob
**And** it transfers each group ownership sequentially

**Given** all 11 steps complete successfully
**When** the final step finishes
**Then** the OffboardingJob state is set to COMPLETED
**And** completedAt timestamp is recorded

**Given** the server restarts during execution
**When** the application comes back online
**Then** the OffboardingJob remains in its last persisted state (EXECUTING_* or BLOCKED_AT_*)
**And** no state is lost

### Story 4.3: SSE Endpoint & Real-time Status Hook

As a mail administrator,
I want to see real-time progress updates during offboarding execution,
So that I know exactly which step is running and can monitor the flow without refreshing.

**Acceptance Criteria:**

**Given** an admin calls `GET /api/offboarding/[starterId]/status`
**When** the connection is established
**Then** an SSE stream is opened that sends events as the offboarding progresses

**Given** the offboarding engine transitions to a new state
**When** the state change occurs
**Then** an SSE event is pushed within 2 seconds containing: state, step (1-11), totalSteps (11), message, timestamp

**Given** a step fails
**When** the BLOCKED_AT_* state is written
**Then** an SSE event is pushed with error details including type, message, and retryable flag

**Given** the `useOffboardingStatus` hook is active in a component
**When** SSE events arrive
**Then** the hook updates its state reactively
**And** components re-render with the latest step information

**Given** the browser disconnects and reconnects
**When** the hook re-establishes the SSE connection
**Then** it receives the current state from the stream
**And** the UI reflects the actual backend state without data loss

### Story 4.4: Offboarding Execution UI

As a mail administrator,
I want a visual interface showing step-by-step offboarding progress,
So that I can monitor execution and see clearly when it completes.

**Acceptance Criteria:**

**Given** an admin clicks the "Handle Mailbox" button
**When** the button is clicked
**Then** a `POST /api/offboarding/[starterId]/start` call is made
**And** the button responds within 1 second
**And** the OffboardingStatus component appears with progress display

**Given** the offboarding is executing
**When** the OffboardingStatus component renders
**Then** it shows a list of all 11 steps with their status (pending, executing, completed, failed)
**And** the currently executing step is highlighted
**And** completed steps show a checkmark

**Given** the offboarding completes successfully (state = COMPLETED)
**When** the UI updates
**Then** the HandleMailboxButton is replaced with a success checkmark
**And** all 11 steps show as completed in the OffboardingStatus component

**Given** the offboarding is blocked (state = BLOCKED_AT_*)
**When** the UI updates
**Then** the failed step is highlighted in red with the error message
**And** completed steps remain showing their checkmarks
**And** pending steps show as not yet attempted

**Given** the admin navigates away and returns to the starter detail page
**When** the page loads and an OffboardingJob exists with state != PENDING
**Then** the OffboardingStatus component renders showing the current/last state

### Story 4.5: Retry from Failed Step

As a mail administrator,
I want to retry offboarding from the exact step that failed,
So that I don't have to re-execute already completed steps.

**Acceptance Criteria:**

**Given** an OffboardingJob is in state BLOCKED_AT_{step}
**When** the admin clicks the Retry button
**Then** a `POST /api/offboarding/[starterId]/retry` call is made

**Given** the retry endpoint is called
**When** the current state is BLOCKED_AT_{step}
**Then** the engine resumes execution from that exact step (skipping all prior steps)
**And** prior completed steps are NOT re-executed

**Given** the retry endpoint is called
**When** the current state is NOT a BLOCKED_AT_* state
**Then** a 400 Bad Request is returned (can only retry from blocked state)

**Given** the retried step succeeds
**When** execution continues
**Then** the engine proceeds with remaining steps as normal
**And** SSE events are pushed for each subsequent step

**Given** the Teams transfer step is retried (BLOCKED_AT_TEAMS_TRANSFER)
**When** the engine resumes
**Then** it re-reads teamsOwnershipMapping from the OffboardingJob
**And** it resumes transferring from the last incomplete group (not all groups again)

**Given** an admin reconnects after browser disconnection
**When** the starter detail page loads and an OffboardingJob exists in BLOCKED_AT_* state
**Then** the Retry button is visible
**And** the current state and error are displayed

## Epic 5: Lifecycle Management & Rollback

System automatically manages post-offboarding shared mailbox lifecycle (archive rename after 1 day, permanent deletion after 1 year) and admin can trigger manual rollback of completed offboarding.

### Story 5.1: Shared Mailbox Lifecycle Cron

As a system,
I want to automatically rename and eventually delete shared mailboxes after offboarding,
So that the email namespace is cleaned up and archived mailboxes are removed after the retention period.

**Acceptance Criteria:**

**Given** an OffboardingJob has state COMPLETED and completedAt is more than 1 day ago
**When** the `offboarding-lifecycle` cron runs
**Then** it calls `renameMailbox(entityId, userId, newUpn)` to rename the shared mailbox to `ZZ-Archived-{lastname}-{date}@{tenant}.onmicrosoft.com`
**And** the original email alias is removed from the mailbox
**And** a dependency task is created for deletion in 1 year

**Given** a renamed archived mailbox exists for more than 1 year
**When** the `offboarding-lifecycle` cron runs
**Then** it permanently deletes the archived shared mailbox via Graph API
**And** the deletion is logged to the audit trail

**Given** the cron runs and finds no mailboxes needing rename or deletion
**When** it completes
**Then** no actions are taken and no errors are produced

**Given** a rename or deletion fails due to a Graph API error
**When** the error is caught
**Then** the failure is logged to the audit trail
**And** the task remains for retry on the next cron run

**Given** the cron endpoint is called
**When** the CRON_SECRET header is missing or invalid
**Then** a 401 Unauthorized response is returned

**Given** a valid EntraAppConnection exists for the entity
**When** `renameMailbox(entityId, userId, newUpn)` is called on GraphApiService
**Then** it updates the user's UPN to the new archived format via Graph API

### Story 5.2: Manual Rollback

As a mail administrator,
I want to manually trigger rollback of a completed offboarding,
So that I can reverse the process if the offboarding was triggered in error or the employee returns.

**Acceptance Criteria:**

**Given** an OffboardingJob has state COMPLETED
**When** the admin clicks the Rollback button on the starter detail page
**Then** a confirmation dialog is shown explaining the rollback action

**Given** the admin confirms the rollback
**When** `POST /api/offboarding/[starterId]/rollback` is called
**Then** the OffboardingJob state transitions to ROLLED_BACK
**And** an audit log entry is created with action `entra.offboarding.rolled_back`

**Given** the OffboardingJob is NOT in COMPLETED state
**When** the rollback endpoint is called
**Then** a 400 Bad Request is returned (can only rollback completed offboarding)

**Given** the rollback is recorded
**When** the starter detail page renders
**Then** the OffboardingStatus shows "Rolled Back" state
**And** the HandleMailboxButton is no longer visible (manual reactivation is a separate process)

**Given** an admin without `mail_offboarding` permission
**When** they attempt to call the rollback endpoint
**Then** a 403 Forbidden response is returned
