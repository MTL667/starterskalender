---
title: 'OOO template missing popup on offboarding page'
type: 'feature'
created: '2026-06-18'
status: 'done'
baseline_commit: '087c296'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** When the job role being offboarded has no OOO template configured, the offboarding process blocks at step 1 (BLOCKED_AT_OOO) with an error — by then the user has already started. There is no upfront warning or way to create the template inline.

**Approach:** Check for OOO template existence in the pre-flight panel. If missing, show a warning with a button that opens an inline dialog to create the OOO template (NL/FR/EN + general mail address). Once saved, the pre-flight refreshes and the user can proceed.

## Boundaries & Constraints

**Always:** Reuse existing PUT `/api/admin/ooo-templates/[entityId]/[jobRoleId]` endpoint for saving. Template validation (min 1 char per language, valid email) stays server-side. Dialog must be usable on the offboarding page itself without navigating away.

**Ask First:** Whether to also surface entity-default template as fallback in the warning (currently engine supports it).

**Never:** Don't modify the offboarding engine's OOO execution logic. Don't create a new API endpoint for saving.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Template exists for role | OooTemplate record with matching jobRoleId | No warning shown, allClear unaffected | N/A |
| No role template, entity default exists | OooTemplate with jobRoleId=null | No warning shown (engine falls back) | N/A |
| No template at all | No OooTemplate for role OR entity | Warning in pre-flight + dialog button | N/A |
| User fills template and saves | Valid NL/FR/EN + email | Dialog closes, pre-flight refreshes, warning disappears | Show validation errors from API |
| User has no mail:offboarding permission | No permission | Dialog button not shown, warning text only | N/A |

</frozen-after-approval>

## Code Map

- `lib/offboarding-preflight.ts` -- Pre-flight check logic; needs OOO template check added
- `app/api/offboarding/[starterId]/preflight/route.ts` -- Pre-flight API route; passes starter context
- `components/offboarding/PreFlightPanel.tsx` -- Renders pre-flight results; needs OOO warning + dialog trigger
- `components/offboarding/OooTemplateDialog.tsx` -- NEW: inline dialog for creating OOO template
- `app/api/admin/ooo-templates/[entityId]/[jobRoleId]/route.ts` -- Existing PUT endpoint (reuse)
- `messages/nl.json` -- i18n keys for new warning/dialog text
- `messages/fr.json` -- i18n keys for new warning/dialog text

## Tasks & Acceptance

**Execution:**
- [x] `lib/offboarding-preflight.ts` -- Add `oooTemplateConfigured: boolean` to `PreFlightResult`; query OooTemplate existence for the starter's role + entity default fallback
- [x] `app/api/offboarding/[starterId]/preflight/route.ts` -- Pass `roleTitle` to preflight function so it can resolve jobRoleId
- [x] `components/offboarding/OooTemplateDialog.tsx` -- Create dialog with 3 textarea fields (NL/FR/EN), email input, save button. Uses existing PUT API. Shows validation errors.
- [x] `components/offboarding/PreFlightPanel.tsx` -- Show yellow warning when `oooTemplateConfigured === false`. Add button to open OooTemplateDialog. Re-fetch preflight on dialog close.
- [x] `messages/nl.json` -- Add keys: `oooTemplateMissing`, `configureOooTemplate`, `oooTemplateDialogTitle`, `oooTemplateSaved`
- [x] `messages/fr.json` -- Add French equivalents

**Acceptance Criteria:**
- Given a starter with a role that has no OOO template, when pre-flight runs, then a yellow warning is shown with a "Configure" button
- Given the user clicks "Configure", when the dialog opens, then NL/FR/EN textareas and a general email field are shown
- Given the user fills all fields and saves, when the API returns success, then the dialog closes and the pre-flight re-checks (warning disappears)
- Given an entity-default template exists (jobRoleId=null), when pre-flight runs, then no warning is shown

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: no type errors

## Suggested Review Order

**Pre-flight OOO check logic**

- OOO template check runs before cache, always fresh result
  [`offboarding-preflight.ts:17`](../../lib/offboarding-preflight.ts#L17)

- Passes roleTitle to preflight for jobRole resolution
  [`preflight/route.ts:15`](../../app/api/offboarding/[starterId]/preflight/route.ts#L15)

**UI warning and dialog**

- Yellow alert shown when no template; button opens dialog
  [`PreFlightPanel.tsx:115`](../../components/offboarding/PreFlightPanel.tsx#L115)

- Inline OOO creation dialog with NL/FR/EN fields, calls existing PUT API
  [`OooTemplateDialog.tsx:1`](../../components/offboarding/OooTemplateDialog.tsx#L1)

**Wiring**

- OffboardingSection passes entityId/jobRoleId/jobRoleTitle down
  [`OffboardingSection.tsx:55`](../../components/offboarding/OffboardingSection.tsx#L55)

- StarterDialog resolves jobRoleId from jobRoles array
  [`starter-dialog.tsx:1706`](../../components/kalender/starter-dialog.tsx#L1706)

**i18n**

- Dutch keys for OOO warning/dialog
  [`nl.json:2022`](../../messages/nl.json#L2022)

- French keys for OOO warning/dialog
  [`fr.json:2021`](../../messages/fr.json#L2021)
