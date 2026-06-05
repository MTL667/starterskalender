# Story 11.4: Connection Removal Safeguard Notification

Status: done

## Story

As a System Admin,
I want to be notified when I remove an Entra connection that still has active license configurations on functions,
so that I don't accidentally orphan license settings that will no longer work.

## Acceptance Criteria

1. **Given** an entity has an Entra connection with license configurations on one or more functions **When** I attempt to remove the Entra connection **Then** I see a warning listing all functions that have active license configurations **And** I must confirm the removal explicitly
2. **Given** I confirm the removal of a connection with active configs **When** the connection is removed **Then** the admin receives a notification summarizing the orphaned license configurations
3. **Given** an entity has an Entra connection with no license configurations **When** I remove the connection **Then** the removal proceeds without a warning

## Tasks / Subtasks

- [x] Task 1: Update DELETE endpoint to check for orphaned LicenseConfig records
- [x] Task 2: Return 409 with warning + affected function names if configs exist and not confirmed
- [x] Task 3: Accept `?confirmed=true` query param to force deletion
- [x] Task 4: Create Notification record for admin after confirmed deletion with orphans

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Completion Notes List
- DELETE `/api/admin/entra-connection/[entityId]` now checks for LicenseConfig records linked to the entity's job roles
- Returns 409 with `warning: 'ORPHANED_CONFIGS'` and `affectedFunctions` array if unconfirmed
- After confirmed deletion with orphans, creates Notification for the acting user
- No warning shown when entity has no license configurations

### File List

MODIFIED:
- app/api/admin/entra-connection/[entityId]/route.ts
