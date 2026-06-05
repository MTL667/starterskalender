# Story 10.2: Certificate Keypair Generation & Download

Status: done

## Story

As a System Admin,
I want the system to generate a certificate keypair for my Entra ID connection and let me download the public certificate,
so that I can upload it to Azure Portal for secure, certificate-based authentication without managing secrets manually.

## Acceptance Criteria

1. **Given** an entity has a registered Entra connection with Client ID and Tenant ID **When** I click "Generate Certificate Keypair" **Then** the system generates a 2048-bit RSA keypair with a 2-year expiry within 5 seconds **And** the private key is encrypted with AES-256-GCM before storage in the database **And** the CertificateDownload button appears to download the .cer public certificate
2. **Given** a keypair has been generated **When** I click the download button **Then** the .cer public certificate file is downloaded to my machine **And** step-by-step instructions are shown for uploading to Azure Portal (App registrations → Certificates & secrets)
3. **Given** a keypair has been generated and downloaded **When** I return to this page later **Then** the private key value is never retrievable or displayable (secret-once pattern) **And** I can see the certificate's expiry date and thumbprint as metadata
4. **Given** the ENTRA_ENCRYPTION_KEY environment variable is not configured **When** the system attempts to generate or decrypt a keypair **Then** a clear error is shown to the admin without exposing sensitive details

## Tasks / Subtasks

- [x] Task 1: Certificate Generation Module (AC: 1)
  - [x] Create `lib/certificate.ts` with `generateCertificateKeypair()` function
  - [x] Use Node.js `crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })` for keypair
  - [x] Create self-signed X.509 certificate with 2-year expiry using Node.js crypto
  - [x] Return object: `{ privateKeyPem: string, publicCertPem: string, thumbprint: string, expiresAt: Date }`
  - [x] Calculate SHA-1 thumbprint of the certificate (for Azure Portal matching)
  - [x] Ensure generation completes within 5 seconds (NFR11)
- [x] Task 2: Certificate Generation API Route (AC: 1, 4)
  - [x] Create `app/api/admin/entra-connection/[entityId]/regenerate/route.ts` — POST
  - [x] Verify entity has existing EntraAppConnection (404 if not)
  - [x] Call `generateCertificateKeypair()`
  - [x] Encrypt private key using `encryptEntra()` from `lib/encryption.ts`
  - [x] Update EntraAppConnection: set `encryptedPrivateKey`, `certificateExpiry`, `certificateThumbprint`
  - [x] Store public certificate PEM in a new field or return it in response for download
  - [x] Return 200 with `{ thumbprint, expiresAt }` (never return private key)
  - [x] Handle missing ENTRA_ENCRYPTION_KEY gracefully: return 500 with clear error message (no sensitive details)
  - [x] Use `requirePermission('admin:entities:manage')` + entity scope check
  - [x] Log audit entry: `CREATE` action for certificate generation
- [x] Task 3: Certificate Download API Route (AC: 2)
  - [x] Create `app/api/admin/entra-connection/[entityId]/certificate/route.ts` — GET
  - [x] Return the stored public certificate as a `.cer` file download
  - [x] Set headers: `Content-Type: application/x-x509-ca-cert`, `Content-Disposition: attachment; filename="entra-{entityId}.cer"`
  - [x] Return 404 if no certificate exists for this entity
  - [x] Use `requirePermission('admin:entities:manage')` + entity scope check
- [x] Task 4: Update Prisma Schema for Certificate Storage (AC: 1, 2, 3)
  - [x] Add `publicCertificatePem` field (String?, @db.Text) to EntraAppConnection model
  - [x] Run `npx prisma db push` and `npx prisma generate`
- [x] Task 5: CertificateDownload Component (AC: 2)
  - [x] Create `components/entra/CertificateDownload.tsx`
  - [x] Secondary button style (outlined gray) with download icon
  - [x] Triggers GET to `/api/admin/entra-connection/{entityId}/certificate`
  - [x] Downloads resulting file as `.cer`
- [x] Task 6: Update EntraConnectionForm — Section 2 Progressive Disclosure (AC: 1, 2, 3)
  - [x] Extend `components/entra/EntraConnectionForm.tsx` to reveal Section 2 when connection exists but has no certificate
  - [x] Section 2 contains: "Generate Certificate Keypair" button + CertificateDownload button (after generation)
  - [x] After generation: show thumbprint and expiry date as metadata
  - [x] Show Azure Portal upload instructions (numbered steps)
  - [x] Show "I've uploaded the certificate" button (placeholder for story 10-3 validation)
  - [x] Toast notification: "Keypair generated" (blue) on success
- [x] Task 7: Entity Admin Dialog Integration (AC: 1, 2, 3)
  - [x] Update entity admin page Entra section to show certificate section when connection exists
  - [x] When connection has `consentStatus === 'unconfigured'` and no certificate: show generate button
  - [x] When connection has certificate: show thumbprint, expiry, and download button
  - [x] Never display or expose the private key value
- [x] Task 8: i18n Translation Keys (AC: 1, 2, 4)
  - [x] Add keys: `entra.certificate.generate`, `entra.certificate.download`, `entra.certificate.generated`, `entra.certificate.thumbprint`, `entra.certificate.expiry`, `entra.certificate.uploadInstructions`, `entra.certificate.uploadStep1`, `entra.certificate.uploadStep2`, `entra.certificate.uploadStep3`, `entra.certificate.uploaded`, `entra.certificate.errorMissingKey`
  - [x] Add to both `messages/nl.json` and `messages/fr.json`
- [x] Task 9: Unit Tests (AC: 1, 4)
  - [x] Test `lib/certificate.ts`: generates valid 2048-bit RSA keypair, certificate has 2-year expiry, thumbprint is SHA-1 hex, completes within 5s
  - [x] Test encryption integration: private key encrypts and decrypts correctly via `lib/encryption.ts`
  - [x] Test API error handling: missing ENTRA_ENCRYPTION_KEY returns 500 with safe message

## Dev Notes

### Architecture Compliance

- **Certificate module:** New `lib/certificate.ts` following the architecture decision: Node.js `crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })` + self-signed X.509. No external dependencies — uses only built-in `crypto` module.
- **X.509 generation:** Use Node.js `crypto.createSign()` or `X509Certificate` class. The certificate needs: subject CN (entity name or ID), 2-year validity, RSA 2048-bit key. Output as PEM format for both private key and public certificate.
- **Encryption:** Use existing `lib/encryption.ts` (`encryptEntra`/`decryptEntra`) to encrypt the private key PEM before storing in `EntraAppConnection.encryptedPrivateKey`. The private key is NEVER returned in any API response after storage.
- **Secret-once pattern:** After successful generation, the private key is encrypted and stored. It can only be used internally by the system (decrypted by `GraphApiService` in story 10-3). It is NEVER displayed to the user.
- **Certificate storage:** The public certificate PEM is stored in a new `publicCertificatePem` field so it can be re-downloaded later. Unlike the private key, the public cert is not secret.
- **Thumbprint:** SHA-1 hash of the DER-encoded certificate. Azure Portal uses this to match the uploaded certificate.

### Technical Implementation Details

- **Node.js crypto for X.509:** Since Node.js doesn't have a built-in high-level X.509 certificate creation API, use `crypto.generateKeyPairSync` for the keypair and then create a self-signed certificate. Options:
  - Use `crypto.X509Certificate` (Node 15+) for parsing/validation, but NOT for creation
  - For certificate creation, use `crypto.createSign()` to self-sign a certificate structure
  - Alternative: Use the `node-forge` library (if acceptable) which has a cleaner X.509 API
  - **Recommended approach:** Use raw Node.js crypto with manual ASN.1/DER construction for the self-signed cert, OR add `node-forge` as a dependency (lightweight, pure JS, well-maintained)
  - The architecture says "Native Node.js, no external dependencies" — so prefer raw crypto approach. If too complex, `node-forge` is an acceptable fallback (check with project conventions)

- **DER/PEM format:**
  - Private key: PEM format (`-----BEGIN RSA PRIVATE KEY-----`)
  - Public certificate: PEM format (`-----BEGIN CERTIFICATE-----`) for storage, DER format for `.cer` download
  - `.cer` file: DER-encoded X.509 certificate (binary format that Azure Portal expects)

- **API route structure:** Follows established pattern from story 10-1:
  - `POST /api/admin/entra-connection/[entityId]/regenerate` — generate new keypair
  - `GET /api/admin/entra-connection/[entityId]/certificate` — download .cer file

### Previous Story Intelligence (10-1)

- **Patterns established:**
  - `lib/encryption.ts` — use `encryptEntra(privateKeyPem)` to encrypt before DB storage
  - `app/api/admin/entra-connection/[entityId]/route.ts` — reference for RBAC pattern (`requirePermission` + `can()` check)
  - `components/entra/EntraConnectionForm.tsx` — extend this component (currently only shows Section 1)
  - Entity admin page at `app/(authenticated)/admin/entities/page.tsx` — Entra section in edit dialog fetches connection via `fetchEntraConnection(entityId)`
  - State variable `entraConnection` in entity page stores: `{ id, clientId, tenantId, consentStatus, certificateExpiry }`
- **Key learnings:**
  - API returns exclude `encryptedPrivateKey` (use `select` in Prisma query to omit it)
  - Entity page uses `useTranslations('entra')` for the `te()` helper
  - Entra section only shows for `selectedEntity` (not for new entities)

### File Structure

```
NEW FILES:
  lib/certificate.ts                                           # X.509 keypair generation
  app/api/admin/entra-connection/[entityId]/regenerate/route.ts  # POST generate keypair
  app/api/admin/entra-connection/[entityId]/certificate/route.ts # GET download .cer
  components/entra/CertificateDownload.tsx                     # Download button component
  tests/unit/lib/certificate.test.ts                           # Certificate generation tests

MODIFIED FILES:
  prisma/schema.prisma                           # Add publicCertificatePem field
  components/entra/EntraConnectionForm.tsx        # Add Section 2 (certificate)
  app/(authenticated)/admin/entities/page.tsx    # Update Entra section for cert state
  messages/nl.json                               # Add entra.certificate.* keys
  messages/fr.json                               # Add entra.certificate.* keys
```

### Anti-Patterns to Avoid

- Do NOT return the private key in any API response — ever. It is stored encrypted and only decrypted internally by GraphApiService (story 10-3).
- Do NOT use `crypto.generateKeyPair` (async) — use `crypto.generateKeyPairSync` since it completes in <1s for 2048-bit and simplifies the API route handler.
- Do NOT use external certificate libraries unless absolutely necessary — the architecture mandates "native Node.js, no external dependencies." Try raw crypto first.
- Do NOT store the private key in PEM as plain text in the database — ALWAYS encrypt via `encryptEntra()`.
- Do NOT create a separate page for certificate management — extend the existing entity admin dialog Entra section with progressive disclosure.
- Do NOT show a full-page spinner during generation — use a button loading state (Loader2 spinner on the button, button disabled).

### UX Specifications

- **Progressive disclosure:** Section 2 (Certificate) reveals after Section 1 (Connection Details) is complete. When the entity has a connection but no certificate, show the generate button. After generation, show metadata + download.
- **Generate button:** Primary action (blue filled), text "Generate Certificate Keypair", shows `Loader2` spinner while processing.
- **CertificateDownload button:** Secondary style (outlined gray), text "Download Certificate (.cer)", download icon (Lucide `Download`).
- **Certificate metadata:** After generation, display certificate thumbprint (monospace font) and expiry date in readable format.
- **Azure instructions:** Numbered list: 1. Go to App registrations, 2. Select your app → Certificates & secrets, 3. Upload the .cer file. Clear, concise.
- **Toast:** "Keypair generated" in blue (informational) on successful generation.
- **Error handling:** If ENTRA_ENCRYPTION_KEY is missing, show: "Configuration error. Contact your system administrator." — no technical details exposed.

### Testing Guidance

- `lib/certificate.ts`: test keypair generation returns valid PEM strings, certificate has 2-year expiry, thumbprint is 40-char hex (SHA-1), generation completes in <5s.
- Integration: encrypt private key → store → (never retrieve as plaintext). Test that API omits encryptedPrivateKey from responses.
- API: test POST regenerate succeeds, updates DB fields, returns thumbprint/expiry. Test GET certificate returns DER .cer file with correct headers.
- Error: test missing env key returns 500 with safe message.

### References

- [Source: _bmad-output/planning-artifacts/architecture-entra-mail-provisioning.md#Infrastructure & Deployment] — Certificate generation decision (Node.js crypto, 2048-bit RSA, 2-year expiry)
- [Source: _bmad-output/planning-artifacts/architecture-entra-mail-provisioning.md#Authentication & Security] — Secret-once pattern, private key visibility rules
- [Source: _bmad-output/planning-artifacts/architecture-entra-mail-provisioning.md#Structure Patterns] — lib/certificate.ts placement
- [Source: _bmad-output/planning-artifacts/epics-entra-mail-provisioning.md#Story 1.2] — Full acceptance criteria (FR2, FR3, FR5, AR2, AR3, NFR1, NFR2, NFR11)
- [Source: _bmad-output/planning-artifacts/ux-design-entra-mail-provisioning.md#Step 2] — Certificate upload UX wireframe
- [Source: _bmad-output/planning-artifacts/ux-design-entra-mail-provisioning.md#CertificateDownload] — Component spec
- [Source: _bmad-output/planning-artifacts/ux-design-entra-mail-provisioning.md#Feedback Patterns] — Toast: "Keypair generated" (blue)
- [Source: lib/encryption.ts] — Existing encryption module (encryptEntra/decryptEntra)
- [Source: _bmad-output/implementation-artifacts/10-1-register-entra-id-app-connection.md] — Previous story patterns, file list, learnings

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- No issues encountered during implementation.

### Completion Notes List

- All 9 tasks implemented successfully
- `lib/certificate.ts` created using native Node.js `crypto` — pure ASN.1/DER construction for self-signed X.509 (no external deps)
- Certificate generation produces valid X.509 parsed by Node.js `X509Certificate` class
- 2048-bit RSA keypair with 2-year expiry, SHA-1 thumbprint calculation
- POST `/api/admin/entra-connection/[entityId]/regenerate` encrypts private key via `encryptEntra()` before DB storage
- GET `/api/admin/entra-connection/[entityId]/certificate` returns DER-encoded .cer file download
- `publicCertificatePem` field added to Prisma schema (`@db.Text` for long PEM strings)
- `EntraCertificateSection` component: progressive disclosure with generate button, metadata display, download, and Azure upload instructions
- `CertificateDownload` component: secondary button triggering file download
- Entity admin dialog updated: certificate section appears below connection status
- i18n keys added for both nl and fr under `entra.certificate.*` namespace
- 11 unit tests for certificate module (generation, validity, thumbprint, encryption integration, error handling)
- Full test suite: 96 tests passing, 0 regressions

### File List

NEW:
- lib/certificate.ts
- app/api/admin/entra-connection/[entityId]/regenerate/route.ts
- app/api/admin/entra-connection/[entityId]/certificate/route.ts
- components/entra/CertificateDownload.tsx
- components/entra/EntraCertificateSection.tsx
- tests/unit/lib/certificate.test.ts

MODIFIED:
- prisma/schema.prisma
- app/(authenticated)/admin/entities/page.tsx
- messages/nl.json
- messages/fr.json
