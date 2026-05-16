---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: "CardDAV-integratie voor automatisch contactbeheer per entiteit via Nextcloud"
session_goals: "Architectuur, dataflow, configuratie-UI, RBAC en edge cases uitwerken"
selected_approach: "ai-recommended"
techniques_used: ["Morphological Analysis", "SCAMPER Method", "Chaos Engineering"]
ideas_generated: 25
technique_execution_complete: true
session_active: false
workflow_completed: true
---

# Brainstorming Session: CardDAV Integration

**Date:** 2026-05-11
**Facilitator:** AI (Morphological Analysis + SCAMPER + Chaos Engineering)
**Participant:** Kevin

## Session Overview

**Topic:** Automatically push starter contact data (first name, last name, phone, email) to a Nextcloud CardDAV server, with per-entity configuration and full lifecycle management (onboard, update, offboard).

**Goals:** Design the architecture, data model, UI, RBAC permissions, and edge case handling for a production-ready CardDAV integration within the Starterskalender application.

**Existing Infrastructure:**
- Nextcloud CardDAV server already in use
- Jamf MDM distributes address book to employee devices
- Current process is fully manual

## Technique Selection

**Approach:** AI-Recommended Techniques

**Recommended Techniques:**
- **Morphological Analysis:** Break down all design parameters systematically
- **SCAMPER Method:** Challenge and improve the design through 7 creative lenses
- **Chaos Engineering:** Stress-test the design against failure scenarios

## Phase 1: Morphological Analysis

### Parameter 1: Sync Triggers

| ID | Trigger | Description |
|----|---------|-------------|
| Trigger #1 | Manual push button | Visible on starter page only when phone + email are filled AND entity has CardDAV configured. Pushes vCard on click. |
| Trigger #2 | Automatic soft-delete at offboarding | On offboarding date, contact is soft-deleted. Confirmed via task on offboarding page. |
| Trigger #3 | Resync on contact data change | When phone or email changes after initial sync, "Resync" button appears. Updates existing vCard via UID. |

### Parameter 2: vCard Fields and Data Storage

**vCard Field Mapping:**

| vCard Field | Source |
|-------------|--------|
| `FN` | "Voornaam Naam" (combined) |
| `TEL` | Starter phone number |
| `EMAIL` | Starter email address |
| `ORG` | Entity name |
| `PHOTO` | Selected photo (WhatsApp/Graph candidates, optional) |

**Database Fields on Starter Model:**

| Field | Type | Purpose |
|-------|------|---------|
| `cardDavUid` | String? | vCard UID for update/delete operations |
| `cardDavSyncedAt` | DateTime? | Last successful sync timestamp |
| `cardDavStatus` | Enum | NONE / SYNCED / OUTDATED / SOFT_DELETED / DELETED / ERROR |

**Sync Status Indicator:** Visual indicator on starter page showing sync state and last sync date. "Not up to date — Resync" when data changed after last sync.

### Parameter 3: Error Handling

| Scenario | Handling |
|----------|----------|
| Server unreachable | Error message with retry button. Status → ERROR. |
| Photo not available | Push without photo. Photo included on next resync if available. |
| Duplicate contacts | Primary: UID-based PUT (idempotent). Fallback: search by FN in address book, re-link UID. |

### Parameter 4: RBAC Permissions

| Permission | Purpose |
|------------|---------|
| `carddav:sync` | Push/resync button on starter page |
| `carddav:configure` | Entity CardDAV settings in admin |
| `carddav:delete` | Delete button on offboarding page |

**Offboarding deletion** is handled via the existing task automation system — a TaskTemplate with `ON_START_DATE` scheduling for offboarding entities with CardDAV. The task assignee confirms deletion via the offboarding page button (requires `carddav:delete`).

## Phase 2: SCAMPER Analysis

### S — Substitute

- **Address book picker** instead of raw URL input. Admin connects to Nextcloud and selects from available address books. (Nice-to-have)
- **App Password** instead of main Nextcloud password. Safer, revokable, limited scope. (Must-have)

### C — Combine

- **Photo selector at sync time.** When photos are available (WhatsApp, Graph candidates), show thumbnail picker. User chooses which photo goes into the company address book.
- **Health score integration.** "Contact not synchronized" becomes a factor in the existing starter health score dashboard.
- **Offboarding delete task via existing TaskTemplate system.** Zero new infrastructure — reuses task automation 100%.

### A — Adapt

- **Audit log** for all CardDAV actions (push, update, delete). Reuses existing audit log infrastructure.
- **Cron email reminder** for contacts not yet deleted after offboarding. Reuses existing cron email infrastructure.

### M — Modify

- **Bulk sync** button in admin CardDAV configuration panel. "Synchronize all active starters" with SSE progress bar and partial success reporting. Must-have for initial rollout.

### P — Put to Other Uses

- **Reuse CardDAV engine for external contacts** (contractors, consultants, vendors) in v2.

### E — Eliminate

- **No separate admin page.** Embed CardDAV configuration as expandable section within existing entity management page.
- **No queue/worker for v1.** CardDAV calls are fast (single vCard PUT/DELETE). Synchronous in API route. Bulk sync uses sequential calls with SSE progress.

### R — Reverse

- **Soft-delete before hard-delete.** At offboarding confirmation: update vCard with "Left on [date]" note, status → SOFT_DELETED. Then two paths: (1) "Permanently delete" button for immediate action, or (2) cron job auto-cleans after 30 days. Status → DELETED.

## Phase 3: Chaos Engineering

| # | Scenario | Mitigation |
|---|----------|------------|
| 1 | **Credentials rotated in Nextcloud** | Detect 401/403 at use time. Clear error message "CardDAV credentials invalid". Audit log entry. Red indicator in admin panel. No periodic health check needed. |
| 2 | **Contact deleted directly in Nextcloud** | 404 on resync → recreate with same UID. 404 on delete → status → DELETED. No proactive existence checks. |
| 3 | **Bulk sync 200+ starters** | SSE progress stream. Sequential with short pause between calls. Partial success preserved. "X/Y succeeded, Z failed — Retry failed" UI. |
| 4 | **Starter changes entity** | Auto-delete from old address book (old entity credentials). Status → NONE. Push button reappears for new entity. Handles all combos: both have CardDAV, only old has it, only new has it. |
| 5 | **Credential storage security** | Same pattern as Graph API secrets. AES-encrypted in DB, key in `.env`. |
| 6 | **Race condition: two users sync same starter** | CardDAV PUT with same UID is idempotent. Last `cardDavSyncedAt` wins. No lock needed. |
| 7 | **Nextcloud address book deleted** | "Test connection" button validates address book existence. Bulk resync recreates all contacts after address book is restored. |

## Prioritization

### Must-Have (v1)

1. Manual push button with `carddav:sync` permission
2. vCard fields: FN, TEL, EMAIL, ORG, PHOTO (optional)
3. DB fields: cardDavUid, cardDavSyncedAt, cardDavStatus
4. Sync status indicator on starter page
5. Per-entity CardDAV config (URL, username, app password encrypted) in entity admin
6. Test connection button
7. Bulk sync with SSE progress
8. Resync button on contact data change
9. Photo selector (choose from available photos)
10. Soft-delete at offboarding via task automation
11. Hard-delete button (`carddav:delete` permission)
12. Auto-cleanup cron after 30 days
13. `carddav:configure` permission for admin settings
14. Audit log for all CardDAV actions
15. Error handling: retry, 401 detection, 404 graceful recovery
16. Entity switch: auto-delete from old address book
17. No queue/worker — synchronous API calls
18. Embed config in entity page (no separate admin page)

### Nice-to-Have (v1.1)

19. Address book picker (instead of raw URL)
20. Cron email reminder for non-deleted contacts
21. Health score integration

### Future (v2)

22. Reusable engine for external contacts (contractors, vendors)

## Session Summary

- **25+ concrete ideas** across 6 themes
- **18 must-haves** for v1
- **3 nice-to-haves** for v1.1
- **1 v2 idea** (external contacts)
- **3 new RBAC permissions** + 1 task template
- **7 chaos scenarios** with tested mitigations
- **3 techniques applied:** Morphological Analysis, SCAMPER, Chaos Engineering
