---
title: 'Add subcontractor starter type with VAT lookup (phase 1)'
type: 'feature'
created: '2026-06-22'
status: 'done'
baseline_commit: '6bc8948'
context: ['docs/project-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The system only tracks employees for onboarding/offboarding. Subcontractors (onderaannemers) working via subcontracting need to be tracked with company data (name, VAT number, address, legal form) auto-populated from EU VIES/KBO APIs.

**Approach:** Add `employmentType` field (EMPLOYEE/SUBCONTRACTOR) orthogonal to the existing `StarterType` (event lifecycle). Add company fields to Starter. Build a VAT lookup API (VIES + KBO enrichment for Belgian numbers). Extend the starter dialog with employment type selector and conditional company fields with BTW-lookup. Show subcontractors on calendar with visual distinction. Phase 2 (deferred): material provision toggle, offboarding subcontractor flow, stats integration.

## Boundaries & Constraints

**Always:**
- `employmentType` is orthogonal to `StarterType` — subcontractors go through same lifecycle events
- Default is EMPLOYEE for backward compatibility (nullable field with EMPLOYEE semantics)
- VAT lookup: VIES REST API primary, KBO enrichment for Belgian numbers, manual fallback when APIs unavailable
- Same task types apply to subcontractors
- Existing starters remain unchanged (no data migration needed)

**Ask First:**
- Whether subcontractors need inspector numbers or mail provisioning

**Never:**
- Break existing employee flows
- Make `employmentType` changeable after creation
- Store API credentials (VIES/KBO are public)

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| VAT lookup BE | "BE0123456789" | Name, address, legal form from VIES+KBO | N/A |
| VAT lookup EU non-BE | "NL123456789B01" | Name + address from VIES only | N/A |
| Invalid VAT | Malformed number | Inline error "Ongeldig BTW-nummer" | Show validation error |
| API unreachable | VIES/KBO timeout | Allow manual entry, show warning | Don't block form |
| Subcontractor onboard | type=ONBOARDING, employmentType=SUBCONTRACTOR | Starter with company fields, auto tasks | N/A |
| Calendar display | Mix of employees and subcontractors | Both visible, subcontractors with distinct badge | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- Add EmploymentType enum + company fields to Starter
- `lib/types.ts` -- Add EmploymentType to TypeScript types
- `app/api/vat-lookup/route.ts` -- New endpoint: VIES + KBO VAT lookup
- `app/api/starters/route.ts` -- Extend POST schema + create logic for subcontractor fields
- `app/api/starters/[id]/route.ts` -- Extend PATCH for company fields
- `components/kalender/starter-dialog.tsx` -- Employment type selector, conditional company section, BTW lookup
- `components/kalender/starter-card.tsx` -- Visual badge for subcontractors
- `messages/nl.json` + `messages/fr.json` -- Translations for new UI elements

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` -- Add `EmploymentType` enum (EMPLOYEE, SUBCONTRACTOR), add fields to Starter: `employmentType` (default EMPLOYEE), `companyName`, `vatNumber`, `companyAddress`, `legalForm`. Run `db push`.
- [x] `lib/types.ts` -- Add EmploymentType to TypeScript type definitions
- [x] `app/api/vat-lookup/route.ts` -- Create GET endpoint: validate+lookup VAT via VIES REST API (`https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number`), enrich Belgian numbers via KBO, return `{ valid, companyName, address, legalForm }`, 5s timeout, error handling
- [x] `app/api/starters/route.ts` -- Extend StarterSchema with `employmentType`, `companyName`, `vatNumber`, `companyAddress`, `legalForm`; pass to create; keep existing employee logic unchanged
- [x] `app/api/starters/[id]/route.ts` -- Accept company field updates in PATCH
- [x] `components/kalender/starter-dialog.tsx` -- Add employment type radio/select after type selector (disabled on edit), show company fields section when SUBCONTRACTOR selected, add BTW lookup button that calls `/api/vat-lookup` and auto-fills company fields
- [x] `components/kalender/starter-card.tsx` -- Add Building2 icon + "Onderaannemer" badge for subcontractor starters
- [x] `messages/nl.json` + `messages/fr.json` -- Add keys: employmentType labels, company field labels, VAT lookup button/status/errors, subcontractor badge

**Acceptance Criteria:**
- Given creating a new starter, when selecting "Onderaannemer", then company fields with BTW-lookup appear
- Given a valid Belgian BTW number, when clicking lookup, then company name, address, and legal form auto-populate
- Given VIES/KBO is unavailable, when lookup fails, then manual entry is allowed with a warning
- Given subcontractors on the calendar, when viewing starters, then subcontractors show a distinct visual badge
- Given existing employee starters, when the schema changes, then they continue working unchanged

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: no type errors
- `npm run build` -- expected: successful build

**Manual checks:**
- Create subcontractor with BTW lookup → fields auto-populated
- Create regular employee → unchanged flow
- Calendar shows subcontractor badge

## Suggested Review Order

**Data model**

- EmploymentType enum + company fields on Starter
  [`schema.prisma:106`](../../prisma/schema.prisma#L106)

- TypeScript type mirror
  [`types.ts:2`](../../lib/types.ts#L2)

**VAT lookup API**

- VIES + KBO enrichment endpoint with 5s timeout
  [`route.ts:27`](../../app/api/vat-lookup/route.ts#L27)

**Starter CRUD**

- POST schema + create logic extended with subcontractor fields
  [`route.ts:14`](../../app/api/starters/route.ts#L14)

- PATCH accepts company field updates
  [`route.ts:39`](../../app/api/starters/[id]/route.ts#L39)

**UI**

- Employment type selector + company section + BTW lookup in dialog
  [`starter-dialog.tsx:1122`](../../components/kalender/starter-dialog.tsx#L1122)

- Building2 icon badge on calendar cards
  [`starter-card.tsx:59`](../../components/kalender/starter-card.tsx#L59)

**i18n**

- Dutch and French translations
  [`nl.json:941`](../../messages/nl.json#L941)
  [`fr.json:941`](../../messages/fr.json#L941)
