# Story 11.2: Tenant-Wide Trickle-Down Policy

Status: done

## Story

As a System Admin,
I want to configure a tenant-wide trickle-down policy that falls back to a lower-tier license when the configured type is unavailable,
so that mail provisioning can still proceed even when the preferred license type runs out.

## Acceptance Criteria

1. **Given** I am on the tenant's Entra configuration page **When** I view the trickle-down settings **Then** I see a TrickleDownConfig component with a toggle and description
2. **Given** trickle-down is enabled tenant-wide **When** I view a specific job function's license configuration **Then** I see an option to override the trickle-down policy for that function
3. **Given** trickle-down is enabled and a function has no override **When** provisioning attempts to assign Business Standard but none are available **Then** the system checks for Business Basic availability as fallback
4. **Given** trickle-down is disabled tenant-wide **When** a function has trickle-down explicitly enabled as an override **Then** the override takes precedence

## Tasks / Subtasks

- [x] Task 1: Prisma Schema — TenantEntraConfig model
- [x] Task 2: API Route — GET/PUT `/api/admin/tenant-entra-config/[entityId]`
- [x] Task 3: TenantEntraConfigPanel component with trickle-down toggle
- [x] Task 4: Integration in entity admin dialog
- [x] Task 5: i18n translation keys

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Completion Notes List
- Added `TenantEntraConfig` model (entityId unique, trickleDownEnabled, password settings)
- Created GET/PUT API with upsert pattern and Zod validation
- Created `TenantEntraConfigPanel` component with Switch toggle for trickle-down
- Integrated panel in entity admin dialog (shows when connection is healthy)

### File List

NEW:
- app/api/admin/tenant-entra-config/[entityId]/route.ts
- components/entra/TenantEntraConfigPanel.tsx

MODIFIED:
- prisma/schema.prisma
- app/(authenticated)/admin/entities/page.tsx
- messages/nl.json
- messages/fr.json
