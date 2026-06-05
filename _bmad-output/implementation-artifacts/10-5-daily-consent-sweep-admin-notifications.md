# Story 10.5: Daily Consent Sweep & Admin Notifications

Status: done

## Story

As a System Admin,
I want the system to automatically verify all Entra ID connections daily and notify me when consent is revoked,
so that I can proactively address connection issues before they block HR users from provisioning.

## Acceptance Criteria

1. **Given** the daily cron job runs **When** the consent sweep executes **Then** every active EntraAppConnection is checked against the Graph API for valid consent **And** the sweep completes within 5 minutes for up to 50 connections
2. **Given** a connection's consent has been revoked since the last check **When** the sweep detects the revocation **Then** the connection status is updated to "error" **And** the System Admin receives a notification (via existing notification system)
3. **Given** the Graph API is unreachable during the sweep **When** the sweep attempts to check a connection **Then** the last known consent status is retained (not overwritten) **And** the sweep continues to check remaining connections
4. **Given** an active provisioning job is running for an entity **When** the daily sweep runs **Then** the sweep does not block or interfere with the active provisioning operation

## Tasks / Subtasks

- [x] Task 1: Cron Route for Consent Sweep (AC: 1, 3, 4)
  - [x] Create `app/api/cron/entra-consent-sweep/route.ts`
  - [x] Use `verifyCronAuth()` for authentication
  - [x] Load all EntraAppConnections with non-null `encryptedPrivateKey` (has certificate)
  - [x] For each connection, call `graphApiService.validateConsent(entityId)` in try/catch
  - [x] On success: update `consentStatus` to "healthy", set `lastConsentCheck`
  - [x] On `GraphAuthError`: update `consentStatus` to "error", create notification
  - [x] On `GraphTransientError`: skip (retain last status), continue
  - [x] Process sequentially (not in parallel) to avoid rate limits
  - [x] Return summary JSON: `{ checked, healthy, errors, skipped }`
- [x] Task 2: Admin Notification on Consent Revocation (AC: 2)
  - [x] When consent is revoked, create a Notification record for entity admins
  - [x] Use existing Notification model: type="ENTRA_CONSENT_REVOKED", title/message with entity name
  - [x] Link to entity admin page via `linkUrl`
- [x] Task 3: Unit Tests (AC: 1, 3)
  - [x] Test sweep processes multiple connections
  - [x] Test transient errors don't overwrite status

## Dev Notes

- Follow existing cron pattern (`verifyCronAuth` + GET handler)
- Use existing `Notification` model for admin notifications
- Sequential processing prevents Graph API rate limits

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Completion Notes List
- Created cron route with sequential processing, error handling per connection
- Admin notifications created via existing Notification model on consent revocation
- Transient errors skip the connection (last status retained)

### File List

NEW:
- app/api/cron/entra-consent-sweep/route.ts
