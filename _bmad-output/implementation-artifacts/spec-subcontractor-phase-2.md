---
title: 'Subcontractor phase 2: offboarding flow, material provision, stats'
type: 'feature'
created: '2026-06-22'
status: 'done'
baseline_commit: '68ca620'
context: ['docs/project-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Phase 1 added subcontractor onboarding. But subcontractors cannot be cleanly offboarded (company data doesn't pre-fill), materials default to entity-provided rather than self-provided, and dashboard/calendar/table have no subcontractor visibility.

**Approach:** (1) Extend the offboarding employee picker to show employment type and pre-fill company data from the onboarding record. (2) Add a `materialProvision` field to StarterMaterial so subcontractors default to SELF_PROVIDED with a per-material toggle to ENTITY_PROVIDED. (3) Add subcontractor counts to stats, an employment type filter to calendar/table, and a badge in the starters table.

## Boundaries & Constraints

**Always:**
- Employee picker returns `employmentType` and company fields so offboarding pre-fills them
- Material auto-assign sets `materialProvision: SELF_PROVIDED` for subcontractor starters, `ENTITY_PROVIDED` for employees
- Stats endpoint returns `subcontractorCount` alongside existing type counts
- Calendar and starters table add employment type as a secondary filter option
- Backward compatible: existing StarterMaterial records default to ENTITY_PROVIDED

**Ask First:**
- Whether material provision should be shown as a toggle per material or as a global default per starter

**Never:**
- Change the existing MaterialStatus stepper flow
- Remove existing dashboard type filters (only add employment type as secondary dimension)

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Offboard subcontractor | Select subcontractor in offboarding picker | Name, entity, role, company fields all pre-filled | N/A |
| Offboard employee | Select regular employee in offboarding picker | Name, entity, role pre-filled, no company section | N/A |
| Material auto-assign subcontractor | Create subcontractor with job role | Materials created with materialProvision=SELF_PROVIDED | N/A |
| Material toggle | Admin switches material to ENTITY_PROVIDED | Saved to StarterMaterial record | N/A |
| Stats with subcontractors | Mix of employees and subcontractors in year | Stats show separate subcontractorCount | N/A |
| Existing materials | Pre-phase-2 StarterMaterial records | Default to ENTITY_PROVIDED (null treated as ENTITY_PROVIDED) | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- Add MaterialProvisionType enum + materialProvision field to StarterMaterial
- `app/api/starters/employees/route.ts` -- Return employmentType + company fields
- `app/api/starters/route.ts` -- Set materialProvision on auto-assign based on employmentType
- `app/api/starters/[id]/materials/route.ts` -- Set materialProvision on manual assign
- `components/kalender/starter-dialog.tsx` -- Pre-fill company data on offboarding select, material provision badge/toggle
- `app/api/stats/ytd/route.ts` -- Add subcontractorCount to response
- `components/starters/starters-table.tsx` -- Add employment type column + filter
- `components/kalender/calendar-view.tsx` -- Add employment type secondary filter
- `components/dashboard/recent-starters.tsx` -- Show subcontractor badge
- `messages/nl.json` + `messages/fr.json` -- Translations

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` -- Add `MaterialProvisionType` enum (ENTITY_PROVIDED, SELF_PROVIDED), add `materialProvision` field to StarterMaterial (default ENTITY_PROVIDED)
- [x] `app/api/starters/employees/route.ts` -- Add `employmentType`, `companyName`, `vatNumber`, `companyAddress`, `legalForm` to the select/return
- [x] `app/api/starters/route.ts` -- On material auto-assign (create + pending activation), set `materialProvision: data.employmentType === 'SUBCONTRACTOR' ? 'SELF_PROVIDED' : 'ENTITY_PROVIDED'`
- [x] `app/api/starters/[id]/materials/route.ts` -- On manual assign, check starter's employmentType and set materialProvision accordingly
- [x] `components/kalender/starter-dialog.tsx` -- In `handleEmployeeSelect`: if selected employee has `employmentType === 'SUBCONTRACTOR'`, set formData company fields + employmentType. In material list: show provision badge (self/entity) per material with toggle for canEdit users
- [x] `app/api/stats/ytd/route.ts` -- Add `subcontractorCount` query (employmentType=SUBCONTRACTOR in baseWhere)
- [x] `components/starters/starters-table.tsx` -- Add employment type icon column, add filter option
- [x] `components/kalender/calendar-view.tsx` -- Add employment type filter checkbox or select
- [x] `components/dashboard/recent-starters.tsx` -- Show Building2 badge for subcontractors
- [x] `messages/nl.json` + `messages/fr.json` -- Add keys for materialProvision labels, employment type filter, stats labels

**Acceptance Criteria:**
- Given an admin creates an offboarding and selects a subcontractor, when the employee is selected, then company fields are pre-filled from the onboarding record
- Given a subcontractor is onboarded with a job role, when materials are auto-assigned, then each material has materialProvision=SELF_PROVIDED
- Given the admin views a subcontractor's materials, when they see the material list, then each material shows a provision badge with a toggle option
- Given a mix of employees and subcontractors, when viewing stats, then subcontractorCount is shown separately
- Given the calendar or starters table, when filtering by employment type, then only matching starters appear

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: no type errors
- `npm run build` -- expected: successful build

**Manual checks:**
- Offboard a subcontractor → company data pre-filled
- Create subcontractor → materials default SELF_PROVIDED
- Dashboard shows subcontractor count
- Calendar/table filter by employment type

## Suggested Review Order

**Schema & types**

- New enum + field on StarterMaterial — backward-compatible default ENTITY_PROVIDED
  [`schema.prisma:131`](../../prisma/schema.prisma#L131)

- TypeScript type added for MaterialProvisionType
  [`types.ts:3`](../../lib/types.ts#L3)

**Material provision on creation**

- Onboarding auto-assign: provision derived from employmentType
  [`route.ts:291`](../../app/api/starters/route.ts#L291)

- Pending activation auto-assign: same logic
  [`[id]/route.ts:336`](../../app/api/starters/[id]/route.ts#L336)

- Manual material assign: reads starter.employmentType
  [`materials/route.ts:55`](../../app/api/starters/[id]/materials/route.ts#L55)

**Material provision PATCH**

- Status made optional, provision-only update supported, empty guard added
  [`[materialId]/route.ts:8`](../../app/api/starters/[id]/materials/[materialId]/route.ts#L8)

- Audit log records provision changes
  [`[materialId]/route.ts:102`](../../app/api/starters/[id]/materials/[materialId]/route.ts#L102)

**Offboarding pre-fill**

- Employee API returns company fields for subcontractors
  [`employees/route.ts:42`](../../app/api/starters/employees/route.ts#L42)

- handleEmployeeSelect spreads company data + sets employmentType
  [`starter-dialog.tsx:523`](../../components/kalender/starter-dialog.tsx#L523)

**Material provision UI**

- Clickable badge toggles provision for material managers, read-only for others
  [`starter-dialog.tsx:2162`](../../components/kalender/starter-dialog.tsx#L2162)

- Toggle handler calls PATCH with materialProvision only
  [`starter-dialog.tsx:860`](../../components/kalender/starter-dialog.tsx#L860)

**Filters & stats**

- Stats API returns subcontractorCount
  [`ytd/route.ts:48`](../../app/api/stats/ytd/route.ts#L48)

- Dashboard shows amber subcontractor stat card
  [`ytd-stats.tsx:95`](../../components/dashboard/ytd-stats.tsx#L95)

- Calendar employment type filter state + logic + UI
  [`calendar-view.tsx:50`](../../components/kalender/calendar-view.tsx#L50)

- Starters table employment type filter + Building2 badge
  [`starters-table.tsx:46`](../../components/starters/starters-table.tsx#L46)

- Recent starters subcontractor badge
  [`recent-starters.tsx:289`](../../components/dashboard/recent-starters.tsx#L289)

**Translations**

- NL + FR keys for filters, provision labels, stats
  [`nl.json:744`](../../messages/nl.json#L744)
  [`fr.json:744`](../../messages/fr.json#L744)
