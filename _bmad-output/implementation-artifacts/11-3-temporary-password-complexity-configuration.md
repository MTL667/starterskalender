# Story 11.3: Temporary Password Complexity Configuration

Status: done

## Story

As a System Admin,
I want to configure the temporary password complexity rules per tenant,
so that generated passwords meet my organization's security policies.

## Acceptance Criteria

1. **Given** I am on the tenant's Entra configuration page **When** I view the password settings **Then** I see a PasswordConfig form with minimum length input and switches for character requirements
2. **Given** I configure password rules **When** I save the configuration **Then** the rules are stored in TenantEntraConfig
3. **Given** no password complexity rules are configured **When** a temporary password needs to be generated **Then** sensible defaults are applied (16 chars, all character types enabled)

## Tasks / Subtasks

- [x] Task 1: Password config fields in TenantEntraConfig model (already added in 11-2)
- [x] Task 2: Password section in TenantEntraConfigPanel component
- [x] Task 3: i18n translation keys for password settings

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Completion Notes List
- Password settings (minLength, requireUppercase, requireNumbers, requireSpecialChars) already part of TenantEntraConfig model
- UI form with number input and Switch toggles included in TenantEntraConfigPanel
- Defaults: 16 chars, all requirements enabled (handled in API GET when no config exists)

### File List

(All files already created/modified in story 11-2)
