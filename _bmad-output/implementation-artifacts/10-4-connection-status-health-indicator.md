# Story 10.4: Connection Status & Health Indicator

Status: done

## Story

As a System Admin,
I want to see the current health status of each entity's Entra ID connection at a glance,
so that I can quickly identify and address connection issues across entities.

## Acceptance Criteria

1. **Given** an entity has a healthy, validated Entra connection **When** I view the entity administration page **Then** I see a green 8px dot with "Healthy" label on the EntraConnectionStatus component
2. **Given** an entity's connection has a certificate expiring within 30 days **When** I view the entity administration page **Then** I see an amber dot with "Warning" label and the expiry date
3. **Given** an entity's connection has lost consent or failed validation **When** I view the entity administration page **Then** I see a red dot with "Error" label and a description of the issue
4. **Given** an entity has no Entra connection configured **When** I view the entity administration page **Then** I see a grey dot with "Not configured" label
5. **Given** the system needs to check consent status **When** any provisioning action is about to be performed **Then** the system performs a real-time consent check against Graph API before proceeding

## Tasks / Subtasks

- [x] Task 1: Update EntraConnectionStatus for 30-day Warning Logic (AC: 2)
  - [x] Add logic: if `certificateExpiry` is within 30 days AND `consentStatus` is "healthy", show "warning" state
  - [x] Show expiry date prominently in warning state
- [x] Task 2: Server-side Status Derivation (AC: 1, 2, 3, 4)
  - [x] Ensure the GET `/api/admin/entra-connection/[entityId]` response includes enough data for client-side status derivation
  - [x] Client derives display status: healthy (consentStatus=healthy AND cert not expiring soon), warning (cert <30d), error (consentStatus=error), unconfigured (no connection)
- [x] Task 3: Pre-provisioning Consent Check Pattern (AC: 5)
  - [x] Document in GraphApiService that `validateConsent()` should be called before any provisioning action
  - [x] Add a convenience method `ensureHealthy(entityId)` that validates consent and throws if not healthy

## Dev Notes

### Implementation Notes

- `EntraConnectionStatus` component (from story 10-1) already displays 4 states with semantic color tokens
- The 30-day warning logic was added: client checks if `certificateExpiry` is within 30 days of now
- The `ensureHealthy()` method on `GraphApiService` provides a single call that validates consent before provisioning
- All 4 AC states (healthy, warning, error, unconfigured) are properly rendered by the existing component

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Completion Notes List
- Updated EntraConnectionStatus to derive "warning" state when certificate expires within 30 days
- Added `ensureHealthy(entityId)` method to GraphApiService for pre-provisioning checks
- All states already handled by existing component infrastructure from stories 10-1 through 10-3

### File List

MODIFIED:
- components/entra/EntraConnectionStatus.tsx
- lib/graph-api-service.ts
