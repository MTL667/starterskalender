# Epic 1: Vacancy Creation & Management — Code Review Findings

**Reviewed**: 2026-05-15
**Scope**: All new/modified files in Epic 1 (36 new files, 9 modified files, ~5000+ lines)
**Method**: Adversarial review in 3 groups (API routes, Components, Foundation)

---

## Summary

| Group | Files | Patch | Defer | Dismissed |
|-------|-------|-------|-------|-----------|
| A: API routes | 9 | 5 | 3 | 10 |
| B: Components | 15 | 1 | 2 | 8 |
| C: Foundation | 5 | 0 | 2 | 6 |
| **Total** | **29** | **6** | **7** | **24** |

All 6 patch findings have been fixed. The 7 defer items are low-severity technical debt.

---

## Group A: API Routes — Patch Findings (all fixed)

### A.1 — IDOR on stage single-update (HIGH)

- **File**: `app/api/recruitment/vacancies/[id]/stages/route.ts`
- **Issue**: PATCH handler for single stage updates did not verify that `stageId` belongs to the `vacancyId` from route params, allowing manipulation of stages from other vacancies.
- **Fix**: Added `findUnique` ownership check before updating.

### A.2 — TOCTOU on vacancy update (MEDIUM)

- **File**: `app/api/recruitment/vacancies/[id]/route.ts`
- **Issue**: PATCH handler missing `deletedAt: null` in `where` clause, allowing updates to soft-deleted records.
- **Fix**: Added `deletedAt: null` to `prisma.vacancy.update` where clause.

### A.3 — Permission inconsistency on template GET (MEDIUM)

- **File**: `app/api/recruitment/templates/[id]/route.ts`
- **Issue**: GET endpoint required `recruitment:admin` while list endpoint only required `recruitment:read`, blocking non-admin users from viewing template details.
- **Fix**: Changed to `recruitment:read` with proper `visibleEntityIds` check.

### A.4 — Search query injection in photo library (MEDIUM)

- **File**: `app/api/recruitment/sharepoint/photos/route.ts`
- **Issue**: User-provided search query was passed to Graph API filter without escaping single quotes, allowing injection into OData filter expressions.
- **Fix**: Added `search.replace(/'/g, "''")` sanitization before `encodeURIComponent`.

### A.5 — Cross-entity photo access via proxy (MEDIUM)

- **File**: `app/api/recruitment/vacancies/[id]/photo/route.ts`
- **Issue**: Photo proxy did not verify that the `driveId` in the query params matches the expected SharePoint site drive, allowing a user with access to one entity to fetch photos from another entity's drive.
- **Fix**: Added driveId resolution and validation against the expected site drive.

---

## Group B: Components — Patch Findings (all fixed)

### B.1 — Media blocks not rendered in read-only view (MEDIUM)

- **File**: `components/recruitment/vacancy/content-block-renderer.tsx`
- **Issue**: `ContentBlockRenderer` had no case for `type: 'media'`, so published vacancies with media blocks silently showed nothing for those blocks.
- **Fix**: Added `MediaBlockView` sub-component, added `media` to `BLOCK_ICONS`, added `vacancyId` prop for photo proxy URL construction, and threaded `vacancyId` through the usage in `app/(authenticated)/recruitment/vacatures/[id]/page.tsx`.

---

## Defer Findings (7 items — low severity, future refactor)

### Group A: API Routes

| # | Severity | File | Issue |
|---|----------|------|-------|
| 1 | LOW | `vacancies/route.ts` (list) | No pagination — will degrade with >100 vacancies |
| 2 | LOW | `templates/route.ts` (list) | No pagination — same concern |
| 3 | LOW | `stages/route.ts` | DELETE returns full stage array without entity-scope re-check |

### Group B: Components

| # | Severity | File | Issue |
|---|----------|------|-------|
| 4 | LOW | `vacancy-form.tsx` | Uses `alert()` for error display — inconsistent with inline error pattern in newer components |
| 5 | LOW | `template-form.tsx` | Same `alert()` pattern |

### Group C: Foundation

| # | Severity | File | Issue |
|---|----------|------|-------|
| 6 | LOW | `schemas.ts` | `contentBlockSchema` content union is not discriminated on `type` — a media block could pass validation with string content |
| 7 | LOW | `types.ts` | `ContentBlock.content` union type is broad — not fully type-safe at read-time; a discriminated union would be better |

---

## Dismissed Findings (24 items)

All dismissed findings were false positives, by-design patterns, or issues with negligible risk:

- API error response format consistency (already standardized)
- `can()` returning true without entityId (documented design choice)
- RBAC eager-load performance (acceptable for expected role count)
- Prisma unique constraint on `[vacancyId, order]` (already present)
- Pagination caps and cycle detection in Graph helpers (already implemented)
- Component state management patterns (appropriate for complexity level)
- Template usage count increment (atomic Prisma operation)
- Content block ordering (frontend-driven, server validates)
- And 16 others of similar nature
