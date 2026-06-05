---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'Technical architecture for per-tenant Entra ID app registration with license-gated mail provisioning in Starterskalender'
session_goals: 'Architecture proposal, possible approaches evaluation, edge cases and pitfalls identification'
selected_approach: 'ai-recommended'
techniques_used: ['Question Storming', 'Morphological Analysis', 'Chaos Engineering']
ideas_generated: ['certificate-based-auth', 'trickle-down-licensing', 'proactive-license-monitoring', 'secret-once-pattern', 'hybrid-license-check', 'async-provisioning-with-push', 'detailed-backend-state-machine', 'mutex-per-starter', 'orphan-config-detection', 'auto-task-license-shortage', 'graph-api-status-banner', 'recoverable-provisioning-state', 'entity-migration-inheritance']
session_active: false
workflow_completed: true
context_file: ''
---

# Brainstorming Session Results

**Facilitator:** Kevin
**Date:** 2026-06-04 09:01

## Session Overview

**Topic:** Technical architecture for per-tenant Entra ID app registration with license-gated mail provisioning in Starterskalender
**Goals:** Architecture proposal, possible approaches evaluation, edge cases and pitfalls identification

### Session Setup

- Focus is on the technical foundation: per-tenant Entra ID app registration, license checking (Business Basic / Business Standard), and conditional mail provisioning per starter
- UX integration into starter creation flow is secondary — the technical architecture is the primary concern
- Key areas: Graph API integration, permission models, consent flows, multi-tenant isolation, license validation, feature gating per function
- Selected approach: AI-Recommended Techniques

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Per-tenant Entra ID app registration architecture with focus on approaches, edge cases, and architecture design

**Recommended Techniques:**

- **Question Storming (Deep):** Map the complete problem space by generating all critical questions before seeking solutions — ensures we solve the right problems
- **Morphological Analysis (Deep):** Systematically explore all parameter combinations (permission models, consent flows, license check mechanisms, provisioning approaches) to find optimal architecture
- **Chaos Engineering (Wild):** Stress-test the emerging architecture by deliberately trying to break it — reveals edge cases, failure modes, and robustness requirements

**AI Rationale:** This sequence moves from understanding (questions) → exploration (systematic parameter mapping) → validation (stress testing). The technical complexity of multi-tenant Entra ID integration with conditional license gating requires first mapping all unknowns, then systematically evaluating options, and finally stress-testing for the edge cases that are a primary goal of this session.

## Technique 1: Question Storming Results

### Key Design Decisions Established

**App Registration & Credentials:**
- Admin (Kevin) registers a separate Entra ID app per tenant manually
- Credentials stored in database; secret value hidden after first successful connection
- Credential validation checker runs on input of app details
- Daily checker for consent status; last known status retained if API unreachable
- If consent revoked: Generate Mail button hidden + admin notification

**License Checking:**
- Check happens at button press time (not at config time)
- Only Business Basic and Business Standard for now
- Trickle-down logic: if configured type unavailable, fall back to lower tier with notification
- Trickle-down can be disabled per tenant ("only Standard, no fallback")
- License availability count shown per tenant; auto-task created for IT when insufficient licenses based on upcoming starters without mail

**Mail Provisioning:**
- Creates M365 user + assigns license + mailbox provisioning (no welcome mail)
- One starter at a time (no bulk action)
- Spinner during provisioning; state recoverable if browser closes
- Button replaced by checkmark after successful provisioning (no undo needed)
- Conflict detection if user already exists, with acceptance option
- Temporary password generated; format configurable per tenant
- Audit trail: log who clicked, when, result, and Graph API responses

**Configuration & UX:**
- License type setting per function, on existing functions-per-entity page (alongside materials)
- License config only visible/settable when entity has registered app
- If app removed from entity: notification about orphaned license config on functions
- One action per function (generate mail)
- Mailbox cleanup when starter cancels or start date changes

### Breakthrough Ideas
1. **Trickle-down license logic** — fallback from Standard to Basic with notification
2. **Proactive license monitoring** — show available counts + auto-task on shortage based on planned starters
3. **Secret-once pattern** — credential value invisible after first successful connection

### Open Questions for Architecture
- Which Graph API permissions are minimally required?
- Exact Graph API calls sequence for user creation + license assignment + mailbox wait

## Technique 2: Morphological Analysis Results

### Architecture Decision Matrix

| Parameter | Choice | Details |
|-----------|--------|---------|
| Permission Model | Application Permissions | Server-side, broad tenant access |
| Credential Storage | Certificate-based auth | App generates keypair at setup; admin downloads .cer to upload to Entra ID; private key stored encrypted in DB |
| Provisioning Flow | Async with push | Backend pushes status updates to frontend via events |
| License Check | Hybrid | Cached counts for UI display + real-time Graph API call at provisioning time |
| Trickle-Down | Tenant policy + function override | Tenant-wide default setting, overridable per function |
| Consent Monitoring | Pre-action + daily sweep | Check at every Generate Mail click + daily cron for all tenants |
| State Machine | Hybrid | Detailed states in backend (license_checking → user_creating → license_assigning → mailbox_waiting → success/failed_at_step), simple in frontend (spinner → checkmark/error) |
| Cleanup on cancellation | Manual with suggestion | Creates task for IT person via existing task system |

### Certificate Flow
- App generates keypair when admin sets up the app connection on the entities page
- Admin downloads .cer file and uploads it to the Entra ID app registration
- Private key stored encrypted in database, never visible after initial generation
- No shared secrets — aligns with "secret-once" pattern from Question Storming

### Combined Architecture Summary
The system uses per-tenant Entra ID app registrations with certificate-based authentication. When a user clicks "Generate Mail" on a starter, the system does a real-time license check via Graph API (with cached counts for UI display), creates the M365 user, assigns the appropriate license (with trickle-down fallback if configured), and waits for mailbox provisioning. The frontend shows a spinner during processing and a checkmark on success. Detailed state tracking in the backend enables audit trails and debugging. Consent status is verified both pre-action and via daily sweeps. License availability is monitored proactively, creating tasks for IT when counts are low relative to planned starters.

## Technique 3: Chaos Engineering Results

### Scenarios Tested & Mitigations

| # | Scenario | Severity | Mitigation |
|---|----------|----------|------------|
| 1 | Certificate expiry | Medium | Generate with long expiry (e.g. 2-10 years) + warning before expiry |
| 2 | Double-click race condition | Low | Mutex per starter (check if job already running) — cheap to implement |
| 3 | Half-provisioned starter | High | Retry button + "Remove created user" button; state machine tracks exact failure point |
| 4 | Admin removes Entra ID app | Medium | Pre-action check catches it; show clear user notification (not raw API error) |
| 5 | License cache vs reality mismatch | Low | Hybrid model (real-time at provisioning) catches it; cache is for display only |
| 6 | Graph API outage | Medium | Status banner on admin; distinguish "consent revoked" from "API down" via error type |
| 7 | Forgotten cleanup task | Low | Existing task system handles reminders |
| 8 | Temp password leak | Medium | Force password reset on first login |
| 9 | Starter migrates to entity without app | Medium | Starter adopts future tenant settings; no Generate Mail button if app not registered on new entity |
| 10 | Trickle-down upgrade opportunity | N/A | Out of scope — IT handles manually |
| 11 | Multi-function starter | N/A | Not applicable — one function per starter |

### Key Robustness Decisions
- Certificate: long expiry + expiry warning
- Race conditions: mutex per starter (cheap insurance)
- Failure recovery: retry + manual removal at exact failure point
- API outage: status banner + error type differentiation
- Entity migration: inherit target entity settings
- Password security: mandatory reset on first login

## Idea Organization and Prioritization

### Thematic Organization

**Theme 1: Tenant App Lifecycle**
- Certificate-based auth with app-generated keypair; admin downloads .cer at setup
- Credential validation on input; daily consent sweep + pre-action check
- Certificate expiry warning; conditional UI (license settings only visible when app registered)
- Orphan detection: notification when app removed but function license settings remain

**Theme 2: License Intelligence**
- Trickle-down license logic: Standard → Basic fallback with notification, disableable per tenant, overridable per function
- Proactive license monitoring: show available counts based on planned starters without mail
- Auto-task for IT on shortage via existing task system
- Hybrid check: cache for UI display, real-time Graph API at provisioning

**Theme 3: Provisioning Engine**
- Async with status push from backend to frontend
- Detailed backend state machine: license_checking → user_creating → license_assigning → mailbox_waiting → success/failed_at_[step]
- Simple frontend: spinner → checkmark/error
- Retry + remove buttons at failure; mutex per starter
- Temporary password with mandatory reset, configurable per tenant

**Theme 4: UX & Configuration**
- Generate Mail button: visible only when app registered on entity; replaced by checkmark after success
- Functions page as configuration point for license types (alongside materials)
- Graph API status banner for admin; entity migration: starter inherits target entity settings

**Theme 5: Audit & Lifecycle**
- Complete audit trail: who, when, result, Graph API responses stored
- Cleanup via task system on cancellation/date change
- Recoverable provisioning state if browser closes

### Breakthrough Concepts
1. **Trickle-down license logic** — intelligent fallback instead of hard failure
2. **Proactive license monitoring** — predictive alerting based on planned starters
3. **Certificate secret-once pattern** — maximum security with minimum friction

### Prioritized Action Plan

**Priority 1: Foundation — Tenant App Connection**
- DB model for tenant app registrations (client ID, certificate, status)
- Certificate generation + .cer download endpoint
- Connection validation on input
- Consent check mechanism (pre-action + daily cron)

**Priority 2: Configuration Layer**
- License settings on functions page per entity (conditional on app registration)
- Trickle-down config (tenant-level + function override)
- Temporary password format per tenant

**Priority 3: Provisioning Engine**
- Async job with state machine
- Graph API integration: user create → license assign → mailbox wait
- Frontend status push (spinner → checkmark/error)
- Retry/remove mechanism on failure

**Priority 4: Monitoring & Intelligence**
- License cache with periodic sync
- Availability counter based on planned starters
- Auto-task on license shortage
- Certificate expiry warning
- Graph API status banner

**Priority 5: Lifecycle**
- Audit trail logging
- Cleanup task on cancellation/migration
- Entity migration logic

## Session Summary and Insights

**Key Achievements:**
- Complete architecture defined across 8 parameters with systematic evaluation of all options
- 11 chaos scenarios tested with concrete mitigations
- 3 breakthrough concepts identified (trickle-down, proactive monitoring, secret-once)
- 5-priority action plan ready for implementation

**Session Reflections:**
Kevin demonstrated strong pragmatic thinking throughout — cutting through complexity to make decisive architecture choices while remaining open to creative solutions like trickle-down licensing. The combination of Question Storming (mapping the unknown), Morphological Analysis (systematic option evaluation), and Chaos Engineering (stress testing) produced a comprehensive and robust architecture design in under 40 minutes.
