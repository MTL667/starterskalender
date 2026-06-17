---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'Automatic email offboarding — automated deactivation/deletion of M365 mailboxes and Entra ID accounts when an employee exits, integrated with existing provisioning flow'
session_goals: 'Architecture, triggers & timing, edge cases & risks, admin/HR UX, integration with existing Entra ID connection & license management'
selected_approach: 'ai-recommended'
techniques_used: ['Question Storming', 'Morphological Analysis', 'Chaos Engineering']
ideas_generated: ['offboarding-flow-11-steps', 'ooo-first-ordering', 'pre-flight-checks', 'shared-mailbox-lifecycle', 'ooo-trilingual-templates', 'teams-ownership-transfer', 'ownership-warning-leaving-target', 'sequential-graph-calls', 'stop-at-first-error', 'retry-from-failed-step', 'task-lock-mechanism', 'litigation-hold-detection', '50gb-blokkade', 'archive-rename-with-date', 'reactivation-separate-process', 'revoke-sessions-step', 'state-machine-6-states', 'rbac-controlled-action', 'graph-api-health-gate', 'calendar-cancellation', 'distribution-list-removal', 'delegate-access-revocation', 'forwarding-rules-removal', 'rollback-capability', 'audit-every-step']
session_active: false
workflow_completed: true
---

## Session Overview

**Topic:** Automatic email offboarding — automated deactivation/deletion of M365 mailboxes and Entra ID accounts when an employee exits, integrated with existing provisioning flow in Starterskalender.

**Goals:** Architecture, triggers & timing, edge cases & risks, admin/HR UX, integration with existing Entra ID connection & license management (epics 10–14).

### Session Setup

_Facilitator: AI-recommended approach selected. Three complementary deep/wild techniques chosen to cover problem definition, systematic design, and stress-testing._

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Email offboarding automation with focus on full-stack design (architecture through UX)

**Recommended Techniques:**

- **Question Storming:** Define the complete problem space — surface all unknowns before solving
- **Morphological Analysis:** Systematically map parameter combinations for architectural decisions
- **Chaos Engineering:** Stress-test the design against failure scenarios for robustness

**AI Rationale:** This sequence mirrors the successful Entra ID provisioning brainstorm. Question Storming prevents premature solutioning, Morphological Analysis ensures comprehensive coverage, and Chaos Engineering builds anti-fragility.

## Technique Execution Results

### Question Storming

**Interactive Focus:** Explored the problem domain from HR, IT, admin, compliance, employee, and manager perspectives.

**Key Discoveries:**

- Trigger = HR fills in exit date → task is created
- Flow must handle: OOO, mailbox conversion, license recovery, login blocking
- Shared mailbox has a 3-phase lifecycle (active → archived → deleted)
- Per-entity configuration (only if Entra is connected)
- Multi-entity: handled per entity independently
- No notification to employee or manager (manager sees in app)
- Existing dependency tasks handle retention/archival timing
- RBAC controls who can execute offboarding (same pattern as provisioning)

**Domains Explored:** Triggers & timing, data & compliance, integration, OOO templates, shared mailbox access, calendar/Teams/OneDrive, bulk operations, communication, audit

### Morphological Analysis

**Building on Previous:** Systematically mapped all architectural parameters discovered in Question Storming into a decision matrix.

**Parameters Mapped:**

**Parameter 1: Execution Steps (11 steps, fixed order)**

| Step | Action | Graph API |
|------|--------|-----------|
| 1 | Set Out of Office (trilingual template) | MailboxSettings / AutomaticReplies |
| 2 | Block login | `accountEnabled = false` |
| 3 | Revoke all sessions | `revokeSignInSessions` |
| 4 | Cancel calendar items | Events cancel |
| 5 | Teams ownership transfer | Owner update per channel/group |
| 6 | Remove from distribution lists / security groups | Group membership remove |
| 7 | Remove forwarding rules | InboxRules delete |
| 8 | Revoke delegate access | MailboxPermissions remove |
| 9 | Mailbox size check (<50GB) | Blokkade if exceeded |
| 10 | Convert user → shared mailbox | `convertToSharedMailbox` |
| 11 | Remove license | License assignment remove |

**Parameter 2: State Machine**

| Status | Meaning |
|--------|---------|
| `pending` | Task created, not yet actionable |
| `ready` | Actionable — button visible (all pre-conditions met) |
| `in-progress` | Flow started, steps executing |
| `blocked` | Step failed — awaiting retry |
| `completed` | All steps succeeded |
| `rolled-back` | Manually reversed |

**Parameter 3: Pre-flight Checks (button visibility)**

| Condition | Check |
|-----------|-------|
| Entra ID connected for entity | Connection active + healthy |
| Graph API reachable | Health check |
| RBAC permission "offboarding mail" | User has permission |
| Exit date filled | Task exists |
| Mailbox exists (was provisioned) | Status check |
| No litigation hold | Compliance check |

**Parameter 4: Error Handling**
- Stop at first error
- Show overview of succeeded/failed steps
- Retry from failed step (skip already-succeeded)
- Task lock prevents double execution

**Parameter 5: OOO Template Configuration**

| Dimension | Design |
|-----------|--------|
| Languages | Always trilingual (NL/FR/EN) in one template |
| Variables | `{voornaam}`, `{achternaam}`, `{algemeen_mailadres}` |
| Scope | Per function + per entity (entity determines mailbox address) |
| Preview | Yes, before activation |

**Parameter 6: Teams Ownership Transfer UX**

| Dimension | Design |
|-----------|--------|
| Detection | Scan all Teams/groups where user is owner (pre-flight) |
| Presentation | List per channel + per group with current members |
| Selection | Search & select new owner per item |
| Warning | Alert if selected new owner is also leaving soon |
| No members | Still required to assign (search outside channel) |
| API calls | Sequential (prevent rate limiting) |

**Parameter 7: Shared Mailbox Lifecycle**

| Phase | Timing | Action |
|-------|--------|--------|
| Active | After offboarding | Shared mailbox under original name, receives mail, OOO active |
| Archived | Via dependency task | Rename to `ZZ-Archived-naam-YYYY-MM-DD@onmicrosoft.com`, remove original alias |
| Deleted | +1 year after archival | Permanently deleted |

**Parameter 8: Reactivation (Rehire)**

| Scenario | Approach |
|----------|----------|
| During active phase | Separate "reactivate" process: shared → user + license + unblock |
| After archival | Manual: rename back + conversion + license |

**Parameter 9: Audit Logging**

| Event | Logged |
|-------|--------|
| Task created | Who, when, for which employee |
| Each step succeeded | Step, timestamp, by whom |
| Step failed | Step, error message, timestamp |
| Retry executed | Step, timestamp, by whom |
| Rollback | Who, when, which steps reversed |
| Archival (rename) | Automatic, timestamp |
| Permanent deletion | Automatic, timestamp |

### Chaos Engineering

**Stress-testing the design against 15 failure scenarios:**

| # | Scenario | Resolution |
|---|----------|------------|
| 1 | Race condition: HR changes exit date during flow | Verbal coordination (organizational, not technical) |
| 2 | Partial completion + Graph API timeout | Retry from failed step (manual) |
| 3 | Mailbox >50GB (shared mailbox limit) | Blokkade: "Reduce mailbox size first" |
| 4 | Double execution (two admins) | Task lock once started |
| 5 | Teams ownership target also leaving soon | Warning displayed |
| 6 | License removal fails (other service dependency) | Not applicable currently; if so, find solution per case |
| 7 | OOO after login block (technically impossible?) | Solved: OOO is now step 1 (before login block) |
| 8 | Employee logs in between steps | Not a risk: revokeSignInSessions handles this |
| 9 | OOO fails (first step) | Retry mandatory, no skip option |
| 10 | Archive name conflict (same name already exists) | Add date to archived name |
| 11 | Rehire during active shared mailbox phase | Separate reactivation process |
| 12 | Concurrent Graph API calls (20+ Teams channels) | Sequential execution |
| 13 | Litigation hold on mailbox | Detect before flow starts, warn admin (blokkade) |
| 14 | Recurring meeting with 30 attendees (user is organizer) | Cancel meeting (Microsoft auto-notifies attendees) |
| 15 | Internal transfer (exit entity A, start entity B) | Handled by existing migration functionality |

### Creative Facilitation Narrative

_This session followed a disciplined structure: Question Storming opened the full problem space across 6 stakeholder perspectives, Morphological Analysis turned discoveries into a systematic 11-step architecture with 9 mapped parameters, and Chaos Engineering stress-tested 15 failure scenarios. The key architectural breakthrough was reordering OOO before login block (discovered via chaos scenario 7). The design integrates seamlessly with the existing Entra ID provisioning flow (epics 10–14), reusing patterns like RBAC gating, Graph API health checks, and the step-by-step execution UX._

## Idea Organization and Prioritization

### Thematic Organization

**Theme 1: Offboarding Flow Architecture**
- 11-step fixed-order execution flow
- OOO first (critical ordering insight from Chaos Engineering)
- State machine with 6 states
- Same step-by-step UX pattern as provisioning flow

**Theme 2: Pre-flight & Safety**
- 6 pre-conditions for button visibility
- Litigation hold detection
- 50GB mailbox size blokkade
- Teams ownership pre-scan as preparation
- Task lock to prevent double execution

**Theme 3: Shared Mailbox Lifecycle**
- 3-phase lifecycle (active → archived → deleted)
- Date-stamped archive naming prevents conflicts
- 1-year retention before permanent deletion
- Handled via existing dependency tasks

**Theme 4: Templates & Configuration**
- Trilingual OOO templates with variables
- Per function + per entity scoping
- Preview before activation
- General mailbox address per entity/function

**Theme 5: Teams & Group Management**
- Ownership transfer per channel and per group
- Warning system for soon-departing targets
- Sequential API calls for safety
- Full cleanup: distribution lists, security groups, delegates, forwarding rules

**Theme 6: Error Handling & Recovery**
- Stop at first error with clear overview
- Retry from failed step (skip succeeded)
- Full rollback capability
- Separate reactivation process for rehire

**Theme 7: Audit & Compliance**
- Every action in immutable audit log
- Complete event taxonomy (7 event types)
- Integration with existing compliance infrastructure

### Next Steps

1. **[CP] Create PRD** — Use this session as input for a detailed PRD (`bmad-create-prd`)
2. **[CA] Create Architecture** — State machine, Graph API calls, integration with existing Entra flows
3. **[CU] Create UX** — Step-by-step flow design (same pattern as provisioning)

## Session Summary and Insights

**Key Achievements:**

- Complete architecture blueprint for email offboarding with 11 execution steps
- 15 failure scenarios identified and resolved
- Full integration design with existing Entra ID provisioning (epics 10–14)
- Reusable patterns identified (RBAC, Graph API health gate, step-by-step UX)

**Breakthrough Moments:**

- OOO must be set BEFORE login block (Chaos Engineering scenario 7)
- Revoke sessions makes "login between steps" a non-issue
- Date-stamped archive naming solves duplicate name conflicts
- Teams ownership scan as pre-flight preparation (before the flow starts)

**Session Duration:** ~45 minutes
**Techniques Completed:** 3/3
**Ideas Generated:** 25 organized concepts across 7 themes
