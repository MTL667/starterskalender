# Story 10.3: Graph API Connection Validation

Status: done

## Story

As a System Admin,
I want the system to validate my Entra ID connection against the Graph API after certificate upload,
so that I can confirm the connection is working before relying on it for provisioning.

## Acceptance Criteria

1. **Given** I have uploaded the .cer certificate to Azure Portal and returned to the app **When** I click "I've uploaded the certificate" / validate connection **Then** the system authenticates against Graph API using the certificate via @azure/msal-node ConfidentialClientApplication **And** a validation spinner is shown on the button during the check
2. **Given** the Graph API validation succeeds **When** the validation completes **Then** the connection status changes to "healthy" (green dot + label) **And** a success message is shown **And** the available license types in the tenant are displayed
3. **Given** the Graph API validation fails due to missing consent **When** the validation completes **Then** the connection status shows "error" with a clear message distinguishing auth failure from transient error **And** the admin is guided on next steps
4. **Given** the Graph API returns a rate limit response **When** the validation is attempted **Then** the system retries automatically respecting the Retry-After header **And** the user sees a "Validating..." status without manual intervention

## Tasks / Subtasks

- [ ] Task 1: GraphApiService Foundation (AC: 1, 2, 3, 4)
  - [ ] Create `lib/graph-api-service.ts` with `GraphApiService` class
  - [ ] Implement `getAuthenticatedClient(entityId)` — loads EntraAppConnection, decrypts private key via `decryptEntra()`, creates `ConfidentialClientApplication` with certificate credentials
  - [ ] Implement `validateConsent(entityId)` — calls Graph API (e.g. `GET /organization`) to verify access works
  - [ ] Implement `getSubscribedSkus(entityId)` — fetches available license types from tenant
  - [ ] Implement typed error hierarchy: `GraphApiError` (base), `GraphAuthError`, `GraphTransientError`, `GraphRateLimitError`
  - [ ] Implement retry logic for `GraphRateLimitError` respecting Retry-After header (max 3 attempts)
- [ ] Task 2: Validate Connection API Route (AC: 1, 2, 3, 4)
  - [ ] Create `app/api/admin/entra-connection/[entityId]/validate/route.ts` — POST
  - [ ] Call `GraphApiService.validateConsent(entityId)`
  - [ ] On success: update `consentStatus` to "healthy", set `lastConsentCheck` to now
  - [ ] On success: call `getSubscribedSkus()` and return license info
  - [ ] On `GraphAuthError`: update `consentStatus` to "error", return error type + guidance
  - [ ] On `GraphTransientError`: return transient error (don't update status)
  - [ ] On `GraphRateLimitError`: retry handled in service, surface final result
  - [ ] Use `requirePermission('admin:entities:manage')` + entity scope check
  - [ ] Log audit entry
- [ ] Task 3: Update EntraCertificateSection — Validate Button (AC: 1)
  - [ ] Enable the "I've uploaded the certificate" button (currently disabled placeholder)
  - [ ] On click: call POST `/api/admin/entra-connection/{entityId}/validate`
  - [ ] Show Loader2 spinner on button while validating
  - [ ] On success: trigger parent state update to show healthy status
  - [ ] On error: show inline error message with guidance
- [ ] Task 4: License Info Display (AC: 2)
  - [ ] After successful validation, display available license types returned by the API
  - [ ] Show as a simple list in the Entra section (license name + available/total count)
- [ ] Task 5: i18n Translation Keys (AC: 1, 2, 3)
  - [ ] Add keys: `entra.validation.validate`, `entra.validation.validating`, `entra.validation.success`, `entra.validation.errorAuth`, `entra.validation.errorTransient`, `entra.validation.guidance`, `entra.validation.licenses`
  - [ ] Add to both `messages/nl.json` and `messages/fr.json`
- [ ] Task 6: Unit Tests (AC: 1, 3, 4)
  - [ ] Test `GraphApiService` error classification (mock MSAL responses)
  - [ ] Test retry logic for rate limit errors
  - [ ] Test validate endpoint returns correct status codes

## Dev Notes

### Architecture Compliance

- **GraphApiService:** Single class at `lib/graph-api-service.ts`. Uses `@azure/msal-node` `ConfidentialClientApplication` with certificate-based auth (NOT client secret). Each entity has its own credentials — service resolves per-entity.
- **Certificate auth:** Use `certificateThumbprint` and decrypted private key from `EntraAppConnection` to create the MSAL client. The `ConfidentialClientApplication` config uses `{ clientId, authority: 'https://login.microsoftonline.com/{tenantId}', clientCertificate: { thumbprint, privateKey } }`.
- **Error hierarchy:** Custom typed errors extending base `GraphApiError`. Each error type maps to specific recovery behavior.
- **DO NOT modify existing `lib/graph.ts`** — that's for the app's own Azure AD SSO. The Entra provisioning feature uses per-entity credentials.
- **Retry pattern:** For 429 responses, extract `Retry-After` header, wait that duration, retry up to 3 times.
- **Validation check:** Call `GET https://graph.microsoft.com/v1.0/organization` with the entity's credentials to verify consent is valid.
- **Subscribed SKUs:** Call `GET https://graph.microsoft.com/v1.0/subscribedSkus` to get available license types.

### Technical Stack

- **@azure/msal-node ^2.12.0** — already installed. Use `ConfidentialClientApplication` with `clientCertificate` config.
- **@microsoft/microsoft-graph-client** — already installed. Use `Client.initWithMiddleware` or raw fetch with bearer token.

### Previous Story Intelligence (10-2)

- `lib/encryption.ts` — use `decryptEntra(encryptedPrivateKey)` to get the private key PEM for MSAL
- `EntraCertificateSection` component has a disabled "I've uploaded the certificate" button — enable it
- Entity admin page state: `entraConnection` includes `certificateThumbprint`, `consentStatus`
- API pattern: `requirePermission` + `can()` + entity scope

### File Structure

```
NEW FILES:
  lib/graph-api-service.ts                                    # GraphApiService class
  app/api/admin/entra-connection/[entityId]/validate/route.ts # POST validate
  tests/unit/lib/graph-api-service.test.ts                    # Service tests

MODIFIED FILES:
  components/entra/EntraCertificateSection.tsx                # Enable validate button
  app/(authenticated)/admin/entities/page.tsx                 # Show license info after validation
  messages/nl.json                                            # Add entra.validation.* keys
  messages/fr.json                                            # Add entra.validation.* keys
```

### Anti-Patterns to Avoid

- Do NOT use the existing `lib/graph.ts` — it uses client secret auth for the app's own tenant
- Do NOT store Graph API tokens — acquire fresh token per request via MSAL token cache
- Do NOT block the UI during retry — show validating state continuously

### References

- [Source: architecture-entra-mail-provisioning.md#API & Communication Patterns] — GraphApiService class design, error hierarchy
- [Source: architecture-entra-mail-provisioning.md#Authentication & Security] — Certificate-based auth
- [Source: epics-entra-mail-provisioning.md#Story 1.3] — Full acceptance criteria

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### File List
