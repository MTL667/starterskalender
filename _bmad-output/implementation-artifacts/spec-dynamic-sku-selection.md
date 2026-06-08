---
title: 'Dynamic SKU selection from tenant for license provisioning'
type: 'feature'
created: '2026-06-08'
status: 'done'
baseline_commit: '41ad3c8'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The provisioning engine uses a hardcoded SKU_MAP to match license types to Microsoft SKU part numbers, which incorrectly selects unrelated products (e.g. Power Automate Standard instead of M365 Business Standard). Additionally, the license assignment step ignores the validated SKU and picks the first available one.

**Approach:** Replace the abstract `LicenseType` enum with the actual Microsoft `skuId` stored per job role. The admin UI fetches real available SKUs from the tenant's Graph API and presents them in a dropdown, storing the selected `skuId` and display name. The provisioning engine then uses that exact `skuId` for both availability checking and license assignment.

## Boundaries & Constraints

**Always:** Use the stored `skuId` directly for Graph API license assignment — never infer or pattern-match SKU part numbers. Keep trickle-down logic removed (single SKU selection is explicit enough).

**Ask First:** Adding new license types or tiers beyond what the tenant has available.

**Never:** Remove the ability to set "no license" for a job role. Never cache SKU list client-side for longer than the page session.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path | Admin opens job role license selector | Dropdown shows real SKU names + available counts from tenant | N/A |
| SKU no longer available | Stored skuId has 0 available units at provisioning time | Provisioning fails at LICENSE_CHECK with descriptive message | Show "no units available for {displayName}" |
| Entra connection unhealthy | Entity has no healthy connection | SKU selector disabled, shows hint | N/A |
| Graph API unreachable | getSubscribedSkus fails | Selector shows error state with retry button | Toast/inline error |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- LicenseConfig model: replace enum with skuId/displayName strings
- `lib/provisioning-engine.ts` -- checkLicenseAvailability + assignLicense: use stored skuId directly
- `app/(authenticated)/admin/job-roles/page.tsx` -- LicenseTypeSelector: fetch real SKUs, show in dropdown
- `app/api/admin/license-config/[jobRoleId]/route.ts` -- Update validation schema for new fields
- `app/api/admin/available-skus/[entityId]/route.ts` -- NEW: endpoint to fetch live SKUs from Graph

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` -- Replace `requiredLicenseType LicenseType` with `skuId String` + `skuDisplayName String` on LicenseConfig. Remove `trickleDownOverride`. Change `assignedLicenseType` on ProvisioningJob from `LicenseType?` to `String?`. Remove `LicenseType` enum if no other references. Remove `TenantEntraConfig.trickleDownEnabled` field.
- [x] `app/api/admin/available-skus/[entityId]/route.ts` -- CREATE new endpoint that calls `graphApiService.getSubscribedSkus(entityId)` and returns `[{ skuId, displayName (skuPartNumber), totalUnits, availableUnits }]`
- [x] `app/(authenticated)/admin/job-roles/page.tsx` -- Rewrite LicenseTypeSelector to fetch from `/api/admin/available-skus/{entityId}`, show SKU display names with available unit counts, store selected `skuId` + `skuDisplayName`
- [x] `app/api/admin/license-config/[jobRoleId]/route.ts` -- Update PUT schema to accept `{ skuId: string, skuDisplayName: string }` instead of enum. Update DELETE to remain unchanged.
- [x] `lib/provisioning-engine.ts` -- Remove `SKU_MAP` and `checkLicenseAvailability` pattern matching. Load `licenseConfig.skuId` directly. In availability check, verify that specific skuId has capacity via getSubscribedSkus. In assignment step, use that same skuId.
- [x] `app/api/admin/license-config/by-entity/route.ts` -- Update response to return `skuId` + `skuDisplayName` instead of `requiredLicenseType`
- [x] `components/kalender/starter-dialog.tsx` -- Update `starterHasLicenseConfig` check to look for `skuId` instead of `requiredLicenseType`

**Acceptance Criteria:**
- Given admin opens job role license config for an entity with healthy Entra, when dropdown loads, then real Microsoft SKU names with unit counts are shown
- Given admin selects a specific SKU and provisioning runs, when license is assigned, then exactly that SKU's skuId is used in the Graph API call
- Given stored SKU has 0 available units, when provisioning runs, then it fails at LICENSE_CHECK with the SKU display name in the error

## Verification

**Commands:**
- `npx prisma db push` -- expected: schema applies without error
- `npx tsc --noEmit` -- expected: no new type errors (pre-existing test errors acceptable)

## Suggested Review Order

**Schema & data model**

- LicenseType enum removed; LicenseConfig now stores skuId + skuDisplayName directly
  [`schema.prisma:1239`](../../prisma/schema.prisma#L1239)

**Provisioning engine (core fix)**

- Uses stored skuId for both availability check AND license assignment — no more pattern matching
  [`provisioning-engine.ts:149`](../../lib/provisioning-engine.ts#L149)

- Availability check distinguishes "SKU not in tenant" from "no capacity"
  [`provisioning-engine.ts:310`](../../lib/provisioning-engine.ts#L310)

- License assignment uses exact skuId from config
  [`provisioning-engine.ts:221`](../../lib/provisioning-engine.ts#L221)

**Admin UI (SKU selection)**

- LicenseTypeSelector fetches live SKUs from tenant on open, shows display names + counts
  [`job-roles/page.tsx:421`](../../app/(authenticated)/admin/job-roles/page.tsx#L421)

- New endpoint returns real available SKUs from Graph API with entity-scoped auth
  [`available-skus/[entityId]/route.ts:1`](../../app/api/admin/available-skus/[entityId]/route.ts#L1)

**Supporting changes**

- License config API schema updated to skuId/skuDisplayName
  [`license-config/[jobRoleId]/route.ts:6`](../../app/api/admin/license-config/[jobRoleId]/route.ts#L6)

- Cron demand forecasting keyed by skuId instead of enum
  [`license-sync/route.ts:95`](../../app/api/cron/license-sync/route.ts#L95)

- Starter dialog checks skuId for provisioning gate
  [`starter-dialog.tsx:479`](../../components/kalender/starter-dialog.tsx#L479)
