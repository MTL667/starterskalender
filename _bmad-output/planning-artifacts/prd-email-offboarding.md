---
stepsCompleted: ["step-01-init", "step-02-discovery", "step-02b-vision", "step-02c-executive-summary", "step-03-success", "step-04-journeys", "step-05-domain", "step-06-innovation", "step-07-project-type", "step-08-scoping", "step-09-functional", "step-10-nonfunctional", "step-11-polish", "step-12-complete"]
completedAt: "2026-06-17"
inputDocuments:
  - _bmad-output/brainstorming/brainstorming-session-2026-06-15-0850.md
  - docs/project-context.md
  - _bmad-output/planning-artifacts/prd-entra-mail-provisioning.md
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

# Product Requirements Document - Entra ID Email Offboarding

**Author:** Kevin
**Date:** 2026-06-15

## Executive Summary

The Email Offboarding feature completes the M365 lifecycle management in Starterskalender by automating mailbox deactivation when an employee exits. Today, when a starter's exit date is reached, an administrator must manually block login, set Out of Office replies, convert the mailbox, transfer Teams ownership, clean up group memberships, and reclaim the license — an 11-step sequence where any forgotten step creates a security exposure or wastes a paid license. This feature replaces that manual checklist with a guided, auditable flow executed via a single task button.

The system creates an offboarding task when HR fills in the exit date. When the administrator clicks "Handle Mailbox," the system executes a fixed-order sequence: set OOO (trilingual template) → block login → revoke all sessions → cancel calendar items → transfer Teams ownership → remove from distribution lists and security groups → remove forwarding rules → revoke delegate access → validate mailbox size → convert to shared mailbox → remove license. Each step is logged to the immutable audit trail. On failure, the flow stops and allows retry from the exact failed step.

The resulting shared mailbox enters a three-phase lifecycle: active (receives mail under original address with OOO), archived (renamed to `ZZ-Archived-name-date@onmicrosoft.com` with alias removed), and permanently deleted after one year.

### What Makes This Special

This is not just "reverse provisioning." The provisioning feature creates a single resource (user + mailbox + license). Offboarding touches eleven interdependent systems — identity, sessions, mail routing, calendar, Teams, groups, forwarding, delegation, mailbox type, and licensing — where the order matters and any gap is a security risk. The feature provides peace of mind: administrators no longer need to remember whether they revoked sessions, transferred Teams ownership, or cleaned up forwarding rules. The system guarantees completeness through its fixed-order execution with pre-flight safety checks (Graph API health, litigation hold detection, mailbox size validation) and task locking to prevent concurrent execution.

## Project Classification

| Attribute | Value |
|-----------|-------|
| Project Type | Web App (extension of existing Next.js 16 application) |
| Domain | General (internal HR tooling) |
| Complexity | Medium (Graph API integration, 11-step state machine, existing patterns reused) |
| Project Context | Brownfield (extends Starterskalender with existing Entra ID connections, RBAC, task system, SSE, and audit infrastructure) |

## Success Criteria

### User Success

- Administrator completes the full 11-step offboarding flow via a single "Handle Mailbox" button click and sees a green checkmark upon completion.
- Real-time step-by-step progress is visible during execution — the administrator knows exactly where the flow is at any moment.
- On failure: clear indication of which step failed, what succeeded, and a retry option starting from the failed step.
- Teams ownership transfer presents a clear list of owned channels/groups with search-and-select for new owners.
- Pre-flight warnings (litigation hold, mailbox >50GB) are surfaced before the flow starts, not mid-execution.

### Business Success

- 100% of offboarding starters at Entra ID-connected entities are handled through the system (no manual Graph API / Azure Portal actions).
- License reclamation happens immediately after mailbox conversion — no licenses sitting idle on departed employees.
- Zero security incidents from forgotten offboarding steps (active logins, unrestricted mailbox access, remaining group memberships).
- Complete audit trail for compliance: every offboarding action traceable to who performed it and when.

### Technical Success

- 11-step state machine with deterministic execution order and atomic step tracking.
- Stop-at-first-error with retry-from-failed-step — no partial states without explicit recovery path.
- Task lock prevents concurrent execution of the same offboarding flow.
- Pre-flight checks gate button visibility: Entra ID connection active, Graph API reachable, RBAC permission present, mailbox exists.
- Shared mailbox lifecycle (active → archived → deleted) managed via existing dependency task infrastructure.

### Measurable Outcomes

| Metric | Target |
|--------|--------|
| Offboarding success rate | >95% on first attempt |
| Starters offboarded via system | 100% (for Entra-connected entities) |
| Manual Azure Portal offboarding actions | Zero (for connected entities) |
| License reclamation time | Immediate (within flow completion) |
| Audit trail completeness | 100% of offboarding actions logged |
| Security incidents from missed steps | Zero |

## Product Scope

### MVP (Phase 1)

**MVP Approach:** Complete feature — all offboarding capabilities ship in a single phase. Solo developer leveraging existing codebase patterns (Entra ID connections, RBAC, task system, SSE, audit, dependency tasks).

**All core capabilities are MVP:**

- Offboarding task auto-creation when exit date is filled
- "Handle Mailbox" button with RBAC + Entra connection gating
- 11-step execution flow (OOO → login block → revoke sessions → calendar → Teams → groups → forwarding → delegates → size check → conversion → license)
- OOO trilingual templates per function/entity
- Teams ownership transfer with channel/group scanning and new-owner selection
- Pre-flight checks: Graph API health, litigation hold, mailbox size, RBAC
- Stop-at-first-error + retry from failed step
- Task lock against concurrent execution
- Shared mailbox lifecycle (active → archive rename → 1-year deletion)
- Rollback capability (manual reactivation)
- Full immutable audit logging per step
- Escalation when task is not picked up before exit date

### Growth (Post-MVP)

- Bulk insights dashboard: overview of pending offboarding tasks across all entities
- Configurable grace period per entity (delay between exit date and flow availability)
- Auto-execution option (scheduled offboarding without manual button click)

### Vision (Future)

- Full self-service reactivation flow (rehire scenario automated instead of manual)
- OneDrive content transfer automation
- Integration with external ITSM systems for offboarding ticket creation

## User Journeys

### Journey 1: Lisa — HR Administrator Offboards a Departing Employee's Mailbox

**Who:** Lisa is an HR administrator at a mid-sized organization with the "mail offboarding" RBAC permission. She handles 3-5 departures per month and used to manually coordinate with IT to disable accounts — a process where steps were regularly forgotten, leaving active logins or occupied licenses for weeks.

**Opening Scene:** Lisa opens the starter record for Tom, whose last working day is next Friday. She filled in his exit date last week, and an offboarding task was automatically created. The task shows "Handle Mailbox" — it's available because the entity's Entra ID app is connected, Graph API is healthy, and Tom's mailbox exists. A pre-flight panel shows: no litigation hold, mailbox size 2.3GB, and Tom is owner of 2 Teams channels.

**Rising Action:** Lisa clicks "Handle Mailbox." The flow begins with a Teams ownership step: the system presents Tom's 2 owned channels with their current members. For "Finance Team," she searches and selects Maria as the new owner. For "Project Alpha," she assigns Jan. She confirms the selections.

The execution flow starts. Step-by-step progress shows: "Setting Out of Office..." ✓ → "Blocking login..." ✓ → "Revoking sessions..." ✓ → "Cancelling 4 calendar items..." ✓ → "Transferring Teams ownership..." ✓ → "Removing from 3 distribution lists..." ✓ → "Removing forwarding rules..." ✓ → "Revoking delegate access..." ✓ → "Validating mailbox size..." ✓ → "Converting to shared mailbox..." ✓ → "Removing license..." ✓

**Climax:** A green checkmark replaces the button. The audit log shows 11 completed steps with timestamps. The license is immediately available for the next new starter.

**Resolution:** Lisa moves on to her next task. No IT ticket filed. No mental checklist. No follow-up in two weeks wondering if someone remembered to block Tom's login. The shared mailbox exists under Tom's original address with OOO active — anyone emailing Tom gets the trilingual auto-reply pointing to the general mailbox.

### Journey 2: Lisa — Offboarding Flow Fails Mid-Execution

**Who:** Same Lisa, different day. She's offboarding Maria, who has a 48GB mailbox.

**Opening Scene:** Lisa opens Maria's offboarding task and clicks "Handle Mailbox." Pre-flight checks pass (mailbox is under 50GB). Teams ownership is transferred successfully.

**Rising Action:** The flow progresses: OOO ✓ → login block ✓ → revoke sessions ✓ → cancel calendar ✓ → Teams ✓ → groups ✓ → forwarding ✓ → delegates ✓ → mailbox size validation... The step fails: "Mailbox size exceeds 50GB limit for shared mailbox conversion. Current size: 50.2GB."

**Climax:** The flow stops. Lisa sees a clear overview: 8 steps completed successfully, step 9 blocked. The UI shows two options: "Retry" (after mailbox is cleaned up) and the list of completed steps marked with checkmarks. No rollback needed — the completed steps (login blocked, sessions revoked) are actually desired regardless.

**Resolution:** Lisa contacts Maria's manager to clean up old emails, reducing the mailbox to 45GB. She returns to the task and clicks "Retry." The flow resumes from step 9: mailbox size validation ✓ → conversion ✓ → license removal ✓. Green checkmark. Done.

**Edge Case — Graph API Timeout:** On another occasion, step 5 (Teams ownership transfer) times out. Lisa sees the failure clearly: "Graph API timeout during Teams ownership transfer." She waits a few minutes and clicks Retry. The sequential API call succeeds on the second attempt.

### Journey 3: Kevin — System Admin Configures OOO Templates and Monitors Offboarding

**Who:** Kevin is the platform administrator managing Starterskalender. He configures the offboarding infrastructure: OOO templates per function and entity, and monitors escalations.

**Opening Scene:** A new entity "Acme Corp" is being onboarded to Starterskalender. Their Entra ID app is already connected (from provisioning setup). Kevin needs to configure the OOO auto-reply templates before offboarding can work for this entity.

**Rising Action:** Kevin navigates to the entity's function settings. Each function now shows an "OOO Template" section (only visible because Entra ID is connected). He opens the template editor for "Accountant" and sees the trilingual template with variables:

```
Bedankt voor uw bericht. Gelieve er rekening mee te houden dat {voornaam} {achternaam} niet langer werkzaam is...
```

He fills in the general mailbox address for Acme Corp (`info@acmecorp.be`) and previews the rendered template. It looks correct in all three languages. He saves and repeats for the other functions.

**Climax:** A week later, Kevin receives an escalation notification: "Offboarding task for Jan Peeters not completed — exit date is tomorrow." He checks the task owner's activity and reassigns the task to another administrator with the offboarding permission.

**Resolution:** Kevin's role is configuration and oversight, not daily execution. He sets up templates once per entity/function and only intervenes when escalations surface neglected tasks. The system handles the rest.

### Journey Requirements Summary

| Journey | Capabilities Revealed |
|---------|----------------------|
| Lisa (Success) | Handle Mailbox button, pre-flight panel, Teams ownership selection UI, step-by-step progress, checkmark success state, audit trail, license reclamation |
| Lisa (Failure) | Stop-at-first-error display, retry from failed step, clear succeeded/failed overview, Graph API error messaging |
| Kevin (Config) | OOO template editor per function/entity, trilingual template with variables, preview rendering, escalation notifications, task reassignment |

## Technical Architecture

### Platform Integration

This feature extends the existing Starterskalender Next.js 16 application (App Router, React 19, TypeScript strict mode). It integrates into the existing authenticated interface and reuses established infrastructure patterns.

**Existing Patterns Leveraged:**

- Authentication: NextAuth + Azure AD SSO (user identity already available)
- Authorization: RBAC model extended with new "mail_offboarding" permission
- Entra ID Connections: Per-entity app registrations with certificate-based Graph API auth (from provisioning feature)
- Task System: Offboarding task auto-created via existing task template + dependency task infrastructure
- SSE: Server-Sent Events for real-time step progress (same pattern as provisioning)
- Audit: Immutable AuditLog model for per-step logging
- State Machine: Backend-persisted state that survives browser disconnection (same recovery pattern as provisioning)

### Real-Time Status Communication

Server-Sent Events (SSE) for offboarding step progress. One-directional push from backend to frontend during execution. The SSE endpoint streams step completion/failure events. On browser reconnect, the frontend fetches current state machine status — no progress lost.

### Graph API Integration Layer

Extends the existing Graph API service module with offboarding-specific operations:

- `PATCH /users/{id}` — accountEnabled: false
- `POST /users/{id}/revokeSignInSessions`
- `PATCH /users/{id}/mailboxSettings` — automaticRepliesSetting (OOO)
- `GET /users/{id}/events` + `DELETE /events/{id}` — calendar cancellation
- `GET /users/{id}/ownedObjects` — Teams/group ownership detection
- `POST /groups/{id}/owners` + `DELETE /groups/{id}/owners/{userId}` — ownership transfer
- `DELETE /groups/{id}/members/{userId}` — group membership removal
- `GET /users/{id}/mailFolderRules` + `DELETE` — forwarding rules
- `GET /users/{id}/mailboxPermissions` + `DELETE` — delegate access
- `GET /users/{id}/mailboxStatistics` — size validation
- `POST /users/{id}/convertToSharedMailbox`
- `POST /users/{id}/assignLicense` (remove) — license removal

### Teams Ownership Transfer UI

Separate dedicated page (not modal) for Teams ownership transfer due to interaction complexity:

- Full-page layout with channel/group list, current members per item, and search-and-select for new owner
- Accessible before flow execution as pre-flight preparation
- Accessible during flow execution as step 5
- Warning indicators when selected new owner is also approaching exit date

### State Machine Design

Backend-persisted state machine with identical recovery guarantees as provisioning:

| State | Description |
|-------|-------------|
| `pending` | Task created, awaiting execution |
| `ready` | All pre-flight checks pass, button visible |
| `teams_transfer` | Teams ownership selection in progress |
| `executing_step_N` | Currently executing step N (1-11) |
| `blocked_at_step_N` | Step N failed, awaiting retry |
| `completed` | All 11 steps succeeded |
| `rolled_back` | Manually reversed |

### New Infrastructure

- OOO template storage and rendering engine (per function/entity, trilingual, variable substitution)
- Teams ownership transfer page with group/channel scanning
- Offboarding-specific RBAC permission ("mail_offboarding")
- Shared mailbox lifecycle cron (archive rename + 1-year deletion) via existing dependency task pattern
- Escalation notification when offboarding task approaches exit date without completion

### Risk Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
| Graph API complexity (11 different endpoint types, sequential execution) | High | Build and test Graph API service methods in isolation per step. Validate full chain against test tenant before UI integration. |
| Teams ownership transfer UX (variable number of channels/groups, search complexity) | Medium | Separate page with clear list layout. Pre-flight scan runs async so data is ready before admin clicks "Handle Mailbox." |
| Shared mailbox 50GB limit (can block conversion mid-flow) | Medium | Pre-flight size check warns before flow starts. Additional check at step 9 as safeguard. Clear messaging directs admin to resolve. |
| State machine recovery (browser disconnect, server restart during execution) | Medium | Same proven pattern as provisioning: backend state machine is source of truth. SSE is display layer only. Frontend reconnects and fetches current state. |
| Solo developer resource constraint | Medium | All 11 steps share one execution engine pattern — implement once, configure per step. Teams ownership page is the only wholly new UI. |
| Litigation hold blocking conversion | Low | Pre-flight detection via Graph API. Clear admin warning. Flow does not start until hold is resolved. |

## Functional Requirements

### Offboarding Task Management

- FR1: System can automatically create an offboarding task when HR fills in an exit date for a starter with a provisioned mailbox
- FR2: System can show the "Handle Mailbox" button only when the starter's entity has a registered and valid Entra ID app connection
- FR3: System can hide the "Handle Mailbox" button when the Graph API is unreachable
- FR4: System can restrict the "Handle Mailbox" button to users with the "mail_offboarding" RBAC permission
- FR5: System can lock the offboarding task once execution begins to prevent concurrent execution
- FR6: System can escalate an offboarding task when it has not been completed before the exit date

### Pre-flight Checks

- FR7: System can verify Graph API reachability before enabling the offboarding flow
- FR8: System can detect litigation hold on a mailbox and warn the administrator before flow execution
- FR9: System can check mailbox size and warn when it exceeds the 50GB shared mailbox limit
- FR10: System can scan Teams channels and groups where the departing user is owner (as pre-flight preparation)
- FR11: System can warn when a selected new Teams owner is also approaching their exit date

### OOO Template Configuration

- FR12: System Admin can configure OOO auto-reply templates per function and per entity
- FR13: System can render trilingual OOO templates (NL/FR/EN) with variable substitution ({voornaam}, {achternaam}, {algemeen_mailadres})
- FR14: System Admin can preview a rendered OOO template before saving
- FR15: System can conditionally show OOO template configuration only when the entity has a registered Entra ID app connection

### Teams Ownership Transfer

- FR16: System can display a list of all Teams channels and groups where the departing user is owner
- FR17: System can show current members per channel/group for context during owner selection
- FR18: Administrator can search and select a new owner per channel/group
- FR19: System can transfer Teams/group ownership to the selected new owner via Graph API (sequentially)
- FR20: System can present the Teams ownership transfer as a separate dedicated page

### Offboarding Execution Flow

- FR21: System can execute the offboarding flow in a fixed 11-step sequence (OOO → login block → revoke sessions → cancel calendar → Teams transfer → remove groups → remove forwarding → revoke delegates → size check → convert mailbox → remove license)
- FR22: System can set Out of Office automatic replies using the configured template
- FR23: System can disable user login (accountEnabled = false)
- FR24: System can revoke all active sign-in sessions
- FR25: System can cancel all calendar items where the departing user is organizer
- FR26: System can remove the user from all distribution lists and security groups
- FR27: System can remove all forwarding rules from the mailbox
- FR28: System can revoke all delegate access permissions on the mailbox
- FR29: System can convert a user mailbox to a shared mailbox
- FR30: System can remove the assigned license after mailbox conversion
- FR31: System can display real-time step-by-step progress during execution via SSE
- FR32: System can replace the "Handle Mailbox" button with a success checkmark after completion

### Error Handling & Recovery

- FR33: System can stop execution at the first failed step and display which steps succeeded and which failed
- FR34: Administrator can retry execution from the exact failed step (skipping already-succeeded steps)
- FR35: System can persist execution state in the backend so browser disconnection does not lose progress
- FR36: Administrator can recover and view the current execution state after reconnecting
- FR37: Administrator can manually trigger rollback (reactivation) of a completed offboarding

### Shared Mailbox Lifecycle

- FR38: System can maintain the shared mailbox under the original email address with OOO active after offboarding
- FR39: System can rename the shared mailbox to `ZZ-Archived-{name}-{date}@onmicrosoft.com` and remove the original alias (via dependency task)
- FR40: System can permanently delete the archived shared mailbox after one year (via dependency task)

### Audit & Observability

- FR41: System can log every offboarding step execution (who triggered, which step, result, timestamp) to the immutable audit trail
- FR42: System can store Graph API responses for each step for debugging purposes
- FR43: System can track detailed offboarding state per starter (pending, ready, teams_transfer, executing_step_N, blocked_at_step_N, completed, rolled_back)

## Non-Functional Requirements

### Security

- NFR1: Offboarding actions must only be executable by users with the "mail_offboarding" RBAC permission and access to the starter's entity
- NFR2: Graph API credentials for one entity must never be accessible to users of another entity (existing security boundary from provisioning)
- NFR3: Audit logs of offboarding actions (including Graph API responses) must be retained for at least 12 months
- NFR4: The offboarding task lock must prevent any concurrent execution attempts regardless of user or session

### Performance

- NFR5: The "Handle Mailbox" button must respond within 1 second of click (initiate execution job)
- NFR6: SSE step progress updates must reach the frontend within 2 seconds of each step completion
- NFR7: Pre-flight checks (Graph API health, mailbox size, litigation hold, Teams ownership scan) must complete within 10 seconds total
- NFR8: Teams ownership transfer page must load channel/group list within 5 seconds for up to 50 owned items

### Integration

- NFR9: The system must handle Graph API rate limiting gracefully — sequential execution with backoff, no data loss
- NFR10: The system must distinguish between Graph API authentication failures (consent revoked) and transient errors (timeout, 503) and communicate the difference to the administrator
- NFR11: The system must tolerate Graph API latency of up to 30 seconds per operation without data loss or state corruption
- NFR12: The system must support Microsoft Graph API v1.0 endpoints for all offboarding operations

### Reliability

- NFR13: No offboarding state may be lost due to browser closure, network interruption, or server restart during execution
- NFR14: The system must never leave a starter in an inconsistent state — every failure point has a defined recovery path (retry from failed step)
- NFR15: The shared mailbox lifecycle tasks (archive, deletion) must execute independently of the main application availability
- NFR16: The offboarding state machine must be resilient to frontend disconnection — backend state must never depend on frontend connectivity
