---
title: 'Replace TAP with fixed initial password per entity'
type: 'feature'
created: '2026-06-29'
status: 'done'
baseline_commit: '7eff9a3'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Temporary Access Pass (TAP) created via Graph API during provisioning is unreliable — tenant policies may block it, it expires quickly, and it adds complexity. Admins prefer a known, fixed password they can hand to new users.

**Approach:** Add a `fixedInitialPassword` field to the per-entity Entra config. During provisioning, use this password for user creation (instead of a random one) and skip the TAP step entirely. Surface the fixed password in the credential card so the admin can copy/share it.

## Boundaries & Constraints

**Always:** Store the fixed password encrypted in the database (reuse `encryptEntra`/`decryptEntra`). The password is set once per entity and reused for all new users — the admin is responsible for telling users to change it on first login (`forceChangePasswordNextSignIn: true` remains set).

**Ask First:** Whether to completely remove the `new-tap` API route or keep it dormant.

**Never:** Do not remove `TAP_CREATING` / `FAILED_AT_TAP` enum values from the schema (existing records reference them). Do not remove the random password generation logic (fallback when no fixed password is configured).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path — fixed password configured | Entity has `fixedInitialPassword` set | User created with fixed password, TAP step skipped, credential card shows the password | N/A |
| No fixed password configured (fallback) | Entity `fixedInitialPassword` is empty | User created with random password, TAP step skipped, random password shown in credential card | N/A |
| Fixed password too weak for Azure AD | Password doesn't meet tenant policy | User creation fails at `FAILED_AT_USER_CREATION` with clear error | Error surfaced in UI |
| Admin saves config without password | Field left empty | Config saved, provisioning falls back to random password | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- Add `fixedInitialPassword` (encrypted String, nullable) to TenantEntraConfig
- `lib/provisioning-engine.ts` -- Use fixed password from config; skip TAP step entirely
- `components/entra/TenantEntraConfigPanel.tsx` -- Add password input field to config panel
- `app/api/admin/tenant-entra-config/[entityId]/route.ts` -- Handle new field in GET/PUT (encrypt on write, decrypt on read)
- `components/entra/GenerateMailButton.tsx` -- Update credential card label from "TAP" to "Initial Password"
- `components/entra/ProvisioningStatus.tsx` -- Remove TAP_CREATING from visible steps
- `app/api/provisioning/[starterId]/new-tap/route.ts` -- Disable (return 410 Gone)
- `messages/nl.json` -- Update provisioning i18n keys
- `messages/fr.json` -- Update provisioning i18n keys

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` -- Add `fixedInitialPassword String?` to TenantEntraConfig model
- [x] `app/api/admin/tenant-entra-config/[entityId]/route.ts` -- Add `fixedInitialPassword` to GET (decrypt) and PUT (encrypt via `encryptEntra`); add to Zod schema as optional string
- [x] `components/entra/TenantEntraConfigPanel.tsx` -- Add password input with show/hide toggle; label "Vast initieel wachtwoord"; hint that it's used for all new users of this entity
- [x] `lib/provisioning-engine.ts` -- In `generatePassword()`: check TenantEntraConfig for `fixedInitialPassword`; if set, decrypt and return it; otherwise keep current random generation. Remove TAP step (lines 241-272): after license assignment, go directly to SUCCESS. Keep storing the password (fixed or random) in `temporaryPassword` field.
- [x] `components/entra/ProvisioningStatus.tsx` -- Remove `TAP_CREATING` entry from `STEPS` array
- [x] `components/entra/GenerateMailButton.tsx` -- Change credential card title from "Temporary Access Pass" to "Initieel Wachtwoord"; keep monospace display + copy button so admin can copy it immediately after provisioning; remove "Nieuwe Access Pass genereren" button and `handleNewTap` logic; ensure password is visible (not masked) in the credential card on SUCCESS
- [x] `app/api/provisioning/[starterId]/new-tap/route.ts` -- Return 410 Gone with message "TAP generation is no longer supported"
- [x] `messages/nl.json` -- Update `entra.provisioning.credentialCard` keys: title → "Initieel Wachtwoord", warning → "Eenmalig gebruik — gebruiker moet wachtwoord wijzigen bij eerste aanmelding", remove TAP-specific keys; add `entra.config.fixedPassword.*` keys
- [x] `messages/fr.json` -- Mirror Dutch translations to French

**Acceptance Criteria:**
- Given an entity with a fixed initial password configured, when admin triggers provisioning, then the user is created with that password, TAP step is skipped, and the credential card displays the password in plain text with a copy button so the admin can immediately share it
- Given an entity without a fixed password, when admin triggers provisioning, then a random password is generated and displayed in the same credential card (visible + copyable)
- Given the TenantEntraConfigPanel for an entity, when admin enters a fixed password and saves, then it is stored encrypted and shown masked on reload

## Verification

**Commands:**
- `npx prisma validate` -- expected: schema valid
- `npx tsc --noEmit` -- expected: no new type errors

## Suggested Review Order

**Core mechanism: fixed password in provisioning**

- Entry point — generatePassword now returns fixed password from entity config (with error handling)
  [`provisioning-engine.ts:312`](../../lib/provisioning-engine.ts#L312)

- Schema: nullable field on TenantEntraConfig
  [`schema.prisma:1307`](../../prisma/schema.prisma#L1307)

- API: decrypt on GET, encrypt on PUT with trimming/max-length validation
  [`route.ts:35`](../../app/api/admin/tenant-entra-config/[entityId]/route.ts#L35)

**TAP removal**

- Engine: TAP step completely removed, license assignment goes straight to SUCCESS
  [`provisioning-engine.ts:238`](../../lib/provisioning-engine.ts#L238)

- SSE: FAILED_AT_TAP added to server terminal states
  [`status/route.ts:65`](../../app/api/provisioning/[starterId]/status/route.ts#L65)

- UI steps: TAP_CREATING removed from visible provisioning steps
  [`ProvisioningStatus.tsx:28`](../../components/entra/ProvisioningStatus.tsx#L28)

- Button: handleNewTap removed, credential card kept for initial password display
  [`GenerateMailButton.tsx:108`](../../components/entra/GenerateMailButton.tsx#L108)

- Deprecated route now returns 410 Gone
  [`new-tap/route.ts:1`](../../app/api/provisioning/[starterId]/new-tap/route.ts#L1)

**Admin UI config**

- Password input with show/hide toggle added to config panel
  [`TenantEntraConfigPanel.tsx:112`](../../components/entra/TenantEntraConfigPanel.tsx#L112)

**i18n**

- Dutch: credential card title/warning, fixedPassword keys
  [`nl.json:2038`](../../messages/nl.json#L2038)

- French: mirror translations
  [`fr.json:2037`](../../messages/fr.json#L2037)
