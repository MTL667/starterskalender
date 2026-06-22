---
title: 'RBAC field-level permissions for leave reason fields'
type: 'feature'
created: '2026-06-22T15:10:00'
status: 'done'
context: ['docs/project-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The leave-reason fields (terminationInitiator, leaveReasonId, leaveReasonNote) on offboarding starters are currently visible and writable by any authenticated user. These should be gated behind RBAC field-level permissions (read + write), consistent with how salary and bankAccount fields are protected.

**Approach:** Add a new field-level permission key `starters:read:leavereason` to the RBAC registry and wire it through the existing field-permission infrastructure (FIELD_PERMISSIONS map, sanitizeFields/filterWritableFields, seed-rbac). Protect the three leave-reason fields in API read/write paths, and gate the UI section in starter-dialog behind the permission. Also gate the public `/api/leave-reasons` endpoints and the `/api/stats/offboarding` route behind the new permission, and restrict admin leave-reason CRUD to `offboarding:reasons:manage`.

## Boundaries & Constraints

**Always:**
- Follow the single-key pattern already used for salary/bankAccount: one permission controls both read and write for the leave-reason field group.
- `hr-admin` role gets the new permissions by default (gets ALL).
- `global-viewer` and `entity-viewer` should NOT get this permission by default (consistent with salary exclusion pattern).
- `entity-editor` should get this permission by default (they manage offboardings).
- Field-level stripping via `sanitizeFields`/`filterWritableFields` is the authoritative server-side gate.
- UI uses `userPerms.includes()` as a UX hint only.
- Admin leave-reason management uses a new `offboarding:reasons:manage` permission instead of generic `requireAdmin`.

**Ask First:** Changing the permission key naming convention (currently `starters:read:<field>`).

**Never:** Break existing salary/bankAccount field protection. Add separate read and write keys (one key controls both, per project convention).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| User WITHOUT permission views offboarding starter | GET /api/starters/[id] | terminationInitiator, leaveReasonId, leaveReasonNote, leaveReason stripped from response | N/A — fields silently removed |
| User WITHOUT permission updates leave-reason fields | PATCH /api/starters/[id] with terminationInitiator etc. | Fields silently dropped from update payload | Logged server-side, no error to client |
| User WITH permission views offboarding starter | GET /api/starters/[id] | All leave-reason fields present in response | N/A |
| User WITHOUT permission accesses leave-reasons list | GET /api/leave-reasons | 403 Forbidden | JSON error response |
| User WITHOUT permission accesses offboarding stats | GET /api/stats/offboarding | 403 Forbidden | JSON error response |
| User WITHOUT offboarding:reasons:manage accesses admin leave-reasons | GET /api/admin/leave-reasons | 403 Forbidden | JSON error response |
| User WITHOUT permission sees starter-dialog for offboarding | UI render | Leave-reason section hidden entirely | N/A |

</frozen-after-approval>

## Code Map

- `lib/authz-registry.ts` -- Permission definitions (add new keys)
- `lib/authz.ts` -- FIELD_PERMISSIONS map (add leave-reason field mappings)
- `prisma/seed-rbac.ts` -- System role default permissions (include/exclude new keys)
- `app/api/starters/route.ts` -- POST creates starters (already uses filterWritableFields)
- `app/api/starters/[id]/route.ts` -- GET/PATCH individual starter (already uses sanitizeFields + filterWritableFields)
- `app/api/leave-reasons/route.ts` -- Public leave-reasons endpoint (add permission check)
- `app/api/admin/leave-reasons/route.ts` -- Admin leave-reasons CRUD (switch from requireAdmin to requirePermission)
- `app/api/admin/leave-reasons/[id]/route.ts` -- Admin leave-reason update/delete (switch from requireAdmin)
- `app/api/stats/offboarding/route.ts` -- Offboarding stats (switch from requireAdmin)
- `components/kalender/starter-dialog.tsx` -- UI conditional rendering of leave-reason section
- `components/admin/kpi-dashboard.tsx` -- Offboarding tab permission gating
- `messages/nl.json` -- Dutch translations (category label)
- `messages/fr.json` -- French translations (category label)

## Tasks & Acceptance

**Execution:**
- [ ] `lib/authz-registry.ts` -- Add `starters:read:leavereason` (isFieldLevel, category starters) and `offboarding:reasons:manage` (category offboarding) permission keys
- [ ] `lib/authz.ts` -- Add terminationInitiator, leaveReasonId, leaveReasonNote, leaveReason to FIELD_PERMISSIONS.starters mapped to `starters:read:leavereason`
- [ ] `prisma/seed-rbac.ts` -- Exclude `starters:read:leavereason` from global-viewer/entity-viewer (like salary); include it in entity-editor. Add `offboarding:reasons:manage` to entity-editor match function
- [ ] `app/api/leave-reasons/route.ts` -- Replace `getCurrentUser` with `requirePermission('starters:read:leavereason')` for GET; replace user check with `requirePermission('offboarding:reasons:manage')` for POST
- [ ] `app/api/admin/leave-reasons/route.ts` -- Replace `requireAdmin` with `requirePermission('offboarding:reasons:manage')`
- [ ] `app/api/admin/leave-reasons/[id]/route.ts` -- Replace `requireAdmin` with `requirePermission('offboarding:reasons:manage')`
- [ ] `app/api/stats/offboarding/route.ts` -- Replace `requireAdmin` with `requirePermission('starters:read:leavereason')`
- [ ] `components/kalender/starter-dialog.tsx` -- Gate leave-reason UI section behind `userPerms.includes('starters:read:leavereason')`, gate inline reason creation behind `userPerms.includes('offboarding:reasons:manage')`
- [ ] `components/admin/kpi-dashboard.tsx` -- Gate Offboarding tab behind `starters:read:leavereason`, gate reason management table behind `offboarding:reasons:manage`
- [ ] Run `npm run db:seed-rbac` to sync new permissions to database
- [ ] Verify TypeScript compilation (`npx tsc --noEmit`)

**Acceptance Criteria:**
- Given a user without `starters:read:leavereason`, when viewing an offboarding starter via API, then terminationInitiator/leaveReasonId/leaveReasonNote/leaveReason are absent from the response
- Given a user without `starters:read:leavereason`, when updating an offboarding starter with leave-reason fields, then the fields are silently dropped
- Given a user without `starters:read:leavereason`, when opening the starter dialog for an offboarding starter, then the leave-reason section is not rendered
- Given a user with `starters:read:leavereason` but without `offboarding:reasons:manage`, when viewing the offboarding tab, then they see statistics but NOT the reasons management table
- Given a user without `offboarding:reasons:manage`, when calling POST /api/leave-reasons, then they receive 403

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: no errors
- `npm run db:seed-rbac` -- expected: permissions seeded successfully, new keys visible in output
