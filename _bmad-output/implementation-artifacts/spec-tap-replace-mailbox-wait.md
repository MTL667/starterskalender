---
title: 'Replace mailbox wait with TAP creation'
type: 'feature'
created: '2026-06-08'
status: 'ready-for-dev'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The mailbox activation step polls for ~60 seconds and often times out, blocking the entire provisioning flow. The admin only needs a working credential to hand off — not a live mailbox.

**Approach:** Remove the `MAILBOX_WAITING` polling loop. After license assignment, create a Temporary Access Pass (TAP) via Graph API, store it, and surface it in the UI with a message that the mailbox activates within ~5 minutes.

## Boundaries & Constraints

**Always:** Reuse the existing `temporaryPassword` DB field (encrypted) to store the TAP value. Keep generating a random password for user creation (Graph API requirement) but do not surface it.

**Ask First:** TAP lifetime/policy changes (currently defaulting to 60 minutes, single-use).

**Never:** Do not remove old `MAILBOX_WAITING`/`FAILED_AT_MAILBOX_WAIT` enum values (existing records reference them). Do not wait for mailbox activation.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path | License assigned successfully | TAP created, stored encrypted, state → SUCCESS | N/A |
| TAP creation fails (policy disabled) | Graph returns 400/403 | State → FAILED_AT_TAP, error message stored | Retry available |
| TAP permission missing | Graph returns 401 | State → FAILED_AT_TAP, clear error | Admin must add permission |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- Add `TAP_CREATING` and `FAILED_AT_TAP` to ProvisioningState enum
- `lib/provisioning-engine.ts` -- Replace mailbox polling with TAP creation call
- `components/entra/GenerateMailButton.tsx` -- Update credential card: TAP label + mailbox delay message
- `app/api/provisioning/[starterId]/status/route.ts` -- No change needed (already surfaces `temporaryPassword`)
- `messages/nl.json` -- Update i18n keys for TAP card and mailbox message
- `messages/fr.json` -- Update i18n keys for TAP card and mailbox message

## Tasks & Acceptance

**Execution:**
- [ ] `prisma/schema.prisma` -- Add `TAP_CREATING` and `FAILED_AT_TAP` enum values after `LICENSE_ASSIGNING`
- [ ] `lib/provisioning-engine.ts` -- Remove `MAILBOX_WAITING` polling loop; add `TAP_CREATING` step that calls `POST /users/{graphUserId}/authentication/temporaryAccessPassMethods` with `{ isUsableOnce: true, lifetimeInMinutes: 60 }`; store encrypted `temporaryAccessPass` in `temporaryPassword` field; on failure → `FAILED_AT_TAP`
- [ ] `components/entra/GenerateMailButton.tsx` -- Change credential card title to "Temporary Access Pass"; add info message below stating mailbox activates in ~5 minutes; keep copy button
- [ ] `messages/nl.json` -- Add/update keys: `credentialCard.title` → "Temporary Access Pass", `credentialCard.warning` → mention single-use + mailbox delay, `credentialCard.mailboxInfo` → "De mailbox is actief binnen ~5 minuten"
- [ ] `messages/fr.json` -- Mirror Dutch translations to French

**Acceptance Criteria:**
- Given a starter with valid license config, when admin clicks "Generate Mail", then provisioning completes without waiting for mailbox and a TAP is displayed within ~10 seconds
- Given provisioning succeeds, when the credential card appears, then it shows a copyable TAP code and an informational message about the 5-minute mailbox delay
- Given TAP creation fails, when the Graph API returns an error, then the job transitions to `FAILED_AT_TAP` with a clear error message

## Verification

**Commands:**
- `npx prisma validate` -- expected: schema valid
- `npx tsc --noEmit` -- expected: no new type errors

**Manual checks:**
- Trigger provisioning for a starter → confirm TAP appears in credential card within seconds
- Verify the TAP works for initial sign-in to the M365 account
