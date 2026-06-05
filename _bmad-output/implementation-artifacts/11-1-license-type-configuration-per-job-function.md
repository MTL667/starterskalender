# Story 11.1: License Type Configuration per Job Function

Status: done

## Story

As a System Admin,
I want to configure which Microsoft 365 license type is required for each job function,
so that new starters in that function automatically receive the correct license during mail provisioning.

## Acceptance Criteria

1. **Given** I am on the functions administration page for an entity that has an active Entra connection **When** I view a job function's settings **Then** I see a LicenseConfigPanel with a dropdown to select "Business Basic" or "Business Standard"
2. **Given** I am on the functions page for an entity without an Entra connection **When** I view a job function's settings **Then** the LicenseConfigPanel is not visible (conditional rendering)
3. **Given** I select a license type for a job function **When** I save the configuration **Then** a LicenseConfig record is created/updated linking the function to the selected LicenseType enum
4. **Given** I want to change the license type for a function **When** I update the dropdown and save **Then** the configuration is updated for future provisioning

## Tasks / Subtasks

- [x] Task 1: Prisma Schema — LicenseConfig model
- [x] Task 2: API Route — GET/PUT `/api/admin/license-config/[jobRoleId]`
- [x] Task 3: LicenseConfigPanel component with select dropdown
- [x] Task 4: i18n translation keys

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Completion Notes List
- Added `LicenseConfig` model to Prisma (unique on jobRoleId, with LicenseType enum and trickleDownOverride)
- Created GET/PUT API with Zod validation, RBAC, entity scoping via jobRole lookup
- Created `LicenseConfigPanel` component with Select dropdown and save button
- Added i18n keys for nl and fr

### File List

NEW:
- app/api/admin/license-config/[jobRoleId]/route.ts
- components/entra/LicenseConfigPanel.tsx

MODIFIED:
- prisma/schema.prisma
- messages/nl.json
- messages/fr.json
