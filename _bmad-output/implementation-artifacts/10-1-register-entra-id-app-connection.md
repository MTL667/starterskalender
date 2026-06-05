# Story 10.1: Register Entra ID App Connection

Status: done

## Story

As a System Admin,
I want to register an Entra ID app connection for an entity by providing the Client ID and Tenant ID,
so that the entity is linked to its Microsoft 365 tenant for future mail provisioning.

## Acceptance Criteria

1. **Given** I am a System Admin with access to entity administration **When** I navigate to the entity's Entra ID connection settings **Then** I see an EntraConnectionForm with input fields for Client ID and Tenant ID
2. **Given** I have entered a valid Client ID and Tenant ID **When** I submit the connection form **Then** an EntraAppConnection record is created in the database linked to the entity **And** the connection status shows as "unconfigured" (pending certificate setup)
3. **Given** I am an admin for Entity A **When** I try to access or modify the Entra connection for Entity B **Then** the system denies access (entity-scoped RBAC via requireEntityAccess())
4. **Given** an entity already has a registered Entra connection **When** I view the entity administration page **Then** I see the EntraConnectionStatus health indicator instead of the empty state
5. **Given** an entity has no Entra connection **When** I view the entity administration page **Then** I see the empty state with a "Set up connection" call-to-action

## Tasks / Subtasks

- [x] Task 1: Prisma Schema Extension (AC: 2)
  - [x] Add `EntraAppConnection` model to `prisma/schema.prisma`
  - [x] Add `ProvisioningState` enum (needed for future stories but define now for schema stability)
  - [x] Add `LicenseType` enum
  - [x] Add relation from `Entity` model to `EntraAppConnection`
  - [x] Run `npx prisma db push` to apply schema changes
  - [x] Run `npx prisma generate` to update client types
- [x] Task 2: Encryption Module (AC: 2)
  - [x] Create `lib/encryption.ts` with AES-256-GCM encrypt/decrypt using `ENTRA_ENCRYPTION_KEY`
  - [x] Follows same pattern as existing `lib/crypto.ts` but with separate env var
  - [x] Store format: base64 encoded `iv + authTag + ciphertext`
  - [x] Add `ENTRA_ENCRYPTION_KEY` to `.env.test`
- [x] Task 3: API Routes (AC: 1, 2, 3)
  - [x] Create `app/api/admin/entra-connection/route.ts` — POST to register new connection
  - [x] Create `app/api/admin/entra-connection/[entityId]/route.ts` — GET, PUT, DELETE
  - [x] Implement Zod validation schemas for request bodies: `{ entityId: z.string().cuid(), clientId: z.string().uuid(), tenantId: z.string().uuid() }`
  - [x] POST returns 201 with created connection; 409 if entity already has connection; 400 for validation errors
  - [x] GET returns 200 with connection object; 404 if entity has no connection
  - [x] DELETE returns 204 on success
  - [x] Use `requireAuth()` + entity-scoped RBAC check (`can(user, 'admin:entities:manage')` or equivalent)
  - [x] Return 401 if not authenticated, 403 for cross-entity access attempts
- [x] Task 4: EntraConnectionForm Component (AC: 1, 2)
  - [x] Create `components/entra/EntraConnectionForm.tsx`
  - [x] Progressive disclosure section 1: Client ID + Tenant ID input fields
  - [x] Submit handler calls POST `/api/admin/entra-connection`
  - [x] On success, show status change to "unconfigured" (ready for certificate step in next story)
  - [x] Validate UUID format client-side before submit
- [x] Task 5: EntraConnectionStatus Component (AC: 4, 5)
  - [x] Create `components/entra/EntraConnectionStatus.tsx`
  - [x] 8px colored dot + text label: healthy (green), warning (amber), error (red), unconfigured (gray)
  - [x] For this story, only "unconfigured" and empty states are reachable
  - [x] Use Entra semantic color tokens
- [x] Task 6: Entity Admin Page Integration (AC: 1, 4, 5)
  - [x] Add Entra ID connection section to the entity admin page (`app/(authenticated)/admin/entities/page.tsx`)
  - [x] Integration approach: add a **collapsible Entra section per entity card** below existing CardDAV section in the entity edit dialog OR as an expandable section per entity on the list view. Recommended: add inside entity edit dialog (follows CardDAV pattern) with a clear section header "Entra ID Connection"
  - [x] Conditional render: show EntraConnectionForm (empty state CTA) or EntraConnectionStatus (existing connection)
  - [x] Server-side data fetch: extend entity API response to include `entraConnection` (null or object with id, clientId, tenantId, consentStatus)
- [x] Task 7: Semantic Color Tokens (AC: 4, 5)
  - [x] Define 10 CSS custom properties in globals.css for Entra states (connection health, provisioning states, license capacity) in both light and dark mode
- [x] Task 8: i18n Translation Keys (AC: 1, 5)
  - [x] Add `entra.*` namespace keys to Dutch (nl) and French (fr) message files (`messages/nl.json`, `messages/fr.json`)
  - [x] Use separate top-level `entra` namespace (not nested under `adminEntities`) since Entra features span multiple pages
  - [x] Keys needed: `entra.connection.title`, `entra.connection.clientId`, `entra.connection.tenantId`, `entra.connection.submit`, `entra.connection.emptyState`, `entra.connection.setupCta`, `entra.status.unconfigured`, `entra.status.healthy`, `entra.status.warning`, `entra.status.error`

## Dev Notes

### Architecture Compliance

- **Database:** Use Prisma `db push` (no migrations directory). Add `EntraAppConnection` model with fields: `id` (cuid), `entityId` (unique FK to Entity), `clientId` (String), `tenantId` (String), `encryptedPrivateKey` (String? — not set until story 10-2), `certificateExpiry` (DateTime?), `certificateThumbprint` (String?), `consentStatus` (String, @default("unconfigured") — values: "unconfigured" | "healthy" | "warning" | "error", NOT a Prisma enum), `lastConsentCheck` (DateTime?), `createdAt` (DateTime @default(now())), `updatedAt` (DateTime @updatedAt).
- **Encryption module:** Separate from existing `lib/crypto.ts` (which uses `CARDDAV_ENCRYPTION_KEY`). New `lib/encryption.ts` uses `ENTRA_ENCRYPTION_KEY` env var — must be a 64-character hex string representing 32 bytes. Same AES-256-GCM algorithm, same IV+tag+ciphertext base64 pattern. The encryption module is foundational — it will be used by stories 10-2 through 10-6 for private key storage.
- **API pattern:** Follow existing RESTful patterns (see `/api/admin/` routes). Use `NextResponse.json()` for responses. Direct JSON response on success, `{ error, message }` on failure. POST `/api/admin/entra-connection` accepts `{ entityId, clientId, tenantId }` in the request body.
- **RBAC enforcement:** Use `requireAuth()` from `lib/auth-utils.ts`, then check entity access. The existing pattern uses `can(toAuthorizedUser(user), 'admin:entities:manage')` from `lib/authz.ts` for admin operations. Additionally verify user has membership access to the specific entity.
- **Entity isolation (NFR6):** All queries MUST include `entityId` in WHERE clause. Never allow cross-entity data access.

### Technical Stack Details

- **@azure/msal-node ^2.12.0** — already installed. The existing `lib/graph.ts` uses `ConfidentialClientApplication` with client secret. The Entra provisioning feature will use a SEPARATE `GraphApiService` class (story 10-3) with certificate-based auth. Do NOT modify the existing `lib/graph.ts`.
- **Prisma 5** — existing schema at `prisma/schema.prisma`. Use `db push` for schema changes.
- **shadcn/ui + Radix + Tailwind** — follow existing component conventions in `components/` directory.
- **next-intl** — i18n keys in message files (Dutch + French). Use `useTranslations('entra')` hook in components.
- **Zod** — validate all API request bodies with Zod schemas.

### File Structure

```
NEW FILES:
  lib/encryption.ts                              # AES-256-GCM for ENTRA_ENCRYPTION_KEY
  app/api/admin/entra-connection/route.ts        # POST create connection
  app/api/admin/entra-connection/[entityId]/route.ts  # GET/PUT/DELETE connection
  components/entra/EntraConnectionForm.tsx        # Progressive disclosure form (section 1 only for this story)
  components/entra/EntraConnectionStatus.tsx      # Health indicator dot + label

MODIFIED FILES:
  prisma/schema.prisma                           # Add EntraAppConnection model + enums
  .env.example                                   # Add ENTRA_ENCRYPTION_KEY
  messages/nl.json                               # Add entra.* keys
  messages/fr.json                               # Add entra.* keys
  app/(authenticated)/admin/entities/page.tsx    # Add Entra section to entity admin dialog
  app/globals.css                                # Add Entra semantic color tokens (HSL format)
```

### Existing Patterns to Follow

- **`lib/crypto.ts`** — Reference implementation for AES-256-GCM encryption. New `lib/encryption.ts` follows same structure but uses `ENTRA_ENCRYPTION_KEY` (64-char hex = 32 bytes) instead of `CARDDAV_ENCRYPTION_KEY`.
- **`lib/audit.ts`** — Audit logging pattern. For this story, log `CREATE` action when connection is created. Use existing `createAuditLog()` function.
- **`lib/auth-utils.ts`** — `requireAuth()` and `getCurrentUser()` for server-side auth.
- **`lib/rbac.ts` + `lib/authz.ts`** — RBAC v2 system with `can()` permission checks. Use `admin:entities:manage` or similar permission for Entra admin operations.
- **Entity admin page** — Located at `app/(authenticated)/admin/entities/page.tsx`. Uses client component with dialog-based CRUD. CardDAV config is integrated into the entity edit dialog as a section. Entra connection should follow same dialog-section pattern.
- **CSS tokens** — `app/globals.css` uses HSL format without `hsl()` wrapper: `222.2 84% 4.9%`. New Entra tokens must use same format.

### Anti-Patterns to Avoid

- Do NOT use the existing `lib/graph.ts` for Entra provisioning — that module is for the app's own Azure AD SSO and room booking. Entra provisioning uses per-entity credentials (different tenant, different client).
- Do NOT store private keys in plain text — even though this story doesn't generate keypairs yet, the `encryptedPrivateKey` field must be defined as nullable String (not encrypted yet, that's story 10-2).
- Do NOT create a full wizard/multi-step modal — use progressive disclosure within the existing entity admin page layout.
- Do NOT hardcode Dutch/French strings — use i18n keys for all user-facing text.
- Do NOT skip Zod validation on API routes — all request bodies must be validated.

### Testing Guidance

- Unit test `lib/encryption.ts`: encrypt → decrypt round-trip, invalid key handling, malformed ciphertext handling.
- API route tests: successful creation, duplicate entity (409), missing fields (400), unauthorized (401/403), cross-entity access (403).
- Component: EntraConnectionForm renders fields, submits correctly, shows validation errors.
- Component: EntraConnectionStatus renders correct dot color and label for each state.

### UX Specifications

- **EntraConnectionForm:** Single-column layout, `p-6` card padding, `gap-4` between fields. Client ID and Tenant ID are standard Input components with Label. Submit button is primary (blue). Form reveals only section 1 (Connection Details) for this story. Sections 2 (Certificate) and 3 (Validation) are placeholder/disabled — implemented in stories 10-2 and 10-3.
- **EntraConnectionStatus:** Compact inline indicator. 8px colored dot rendered as a `<span>` with rounded-full and the semantic color token. Text label beside it. Follows Badge-like layout but custom (not using Badge component directly).
- **Empty state:** "No Entra ID connection configured" message with a "Set up connection" CTA button that opens/reveals the form.
- **Color tokens:** Define as CSS custom properties in `:root` and `.dark` selectors. Use HSL format matching existing theme: `H S% L%` without `hsl()` wrapper (e.g., `142 71% 45%` for green-500). Reference with `hsl(var(--entra-connection-healthy))` in Tailwind.

### Project Structure Notes

- Entity admin page path: `app/(authenticated)/admin/entities/page.tsx` (NOT `entiteiten/`).
- The entities page is a `'use client'` component that fetches via `/api/entities` and uses dialog-based CRUD.
- CardDAV integration pattern in that page shows how to add per-entity configuration sections within the edit dialog.
- Components go in `components/entra/` (new directory for all Entra feature components).
- Lib modules go in `lib/` at root level.
- API routes follow Next.js App Router convention: `app/api/admin/entra-connection/route.ts`.
- i18n messages: `messages/nl.json` and `messages/fr.json` with flat nested JSON structure.

### References

- [Source: _bmad-output/planning-artifacts/architecture-entra-mail-provisioning.md#Data Architecture] — EntraAppConnection model definition
- [Source: _bmad-output/planning-artifacts/architecture-entra-mail-provisioning.md#Implementation Patterns] — Naming patterns, encryption pattern, enforcement guidelines
- [Source: _bmad-output/planning-artifacts/architecture-entra-mail-provisioning.md#API & Communication Patterns] — API route structure
- [Source: _bmad-output/planning-artifacts/epics-entra-mail-provisioning.md#Story 1.1] — Full acceptance criteria and requirements
- [Source: _bmad-output/planning-artifacts/ux-design-entra-mail-provisioning.md#Component Strategy] — EntraConnectionForm and EntraConnectionStatus specs
- [Source: _bmad-output/planning-artifacts/ux-design-entra-mail-provisioning.md#Design System Foundation] — Semantic color tokens
- [Source: docs/project-context.md] — Full project structure, RBAC model, existing patterns
- [Source: lib/crypto.ts] — Reference encryption implementation (AES-256-GCM pattern)
- [Source: lib/audit.ts] — Audit logging pattern with integrity hashing
- [Source: lib/auth-utils.ts] — Authentication helpers (requireAuth, getCurrentUser)
- [Source: lib/graph.ts] — Existing Graph client (DO NOT modify; Entra feature uses separate service)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- No issues encountered during implementation.

### Completion Notes List

- All 8 tasks implemented successfully
- Prisma schema extended with EntraAppConnection model + LicenseType + ProvisioningState enums
- `lib/encryption.ts` created following existing `lib/crypto.ts` pattern with separate ENTRA_ENCRYPTION_KEY
- API routes at `/api/admin/entra-connection` with full CRUD, Zod validation, RBAC enforcement
- EntraConnectionForm component with client-side UUID validation, i18n support
- EntraConnectionStatus component with 4-state health indicator using semantic tokens
- Entity admin page integrated: Entra section appears in edit dialog for existing entities
- 10 CSS semantic color tokens defined for both light and dark modes
- i18n keys added for both nl and fr locales under `entra` namespace
- 8 unit tests for encryption module (all pass)
- Full test suite (85 tests) passes with zero regressions
- Database schema pushed successfully

### File List

NEW:
- lib/encryption.ts
- app/api/admin/entra-connection/route.ts
- app/api/admin/entra-connection/[entityId]/route.ts
- components/entra/EntraConnectionForm.tsx
- components/entra/EntraConnectionStatus.tsx
- tests/unit/lib/encryption.test.ts

MODIFIED:
- prisma/schema.prisma
- app/globals.css
- app/(authenticated)/admin/entities/page.tsx
- messages/nl.json
- messages/fr.json
- .env.test
