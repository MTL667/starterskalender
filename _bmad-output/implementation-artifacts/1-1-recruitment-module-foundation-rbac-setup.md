# Story 1.1: Recruitment Module Foundation & RBAC Setup

Status: review

## Story

As a headhunter,
I want the recruitment module to exist in Airport with proper access control,
so that I can access recruitment features based on my role and entity membership.

## Acceptance Criteria

1. **Feature branch created**
   - Given the recruitment module does not yet exist
   - When a developer starts implementation
   - Then a feature branch `feature/recruitment-module` is created from main

2. **Prisma schema extended with Vacancy and VacancyStage**
   - Given the existing schema has no recruitment models
   - When the migration runs
   - Then `Vacancy` model exists with fields: id, title, entityId, functionId, status, content (Json), createdAt, updatedAt, createdById
   - And `VacancyStage` model exists with fields: id, vacancyId, name, order, isTerminal, triggersEmail
   - And proper relations are defined to Entity, User, and JobRole models
   - And existing models are not broken

3. **RBAC v2 extended with recruitment permissions**
   - Given the existing authz-registry has no recruitment permissions
   - When the permissions are registered
   - Then the following permissions exist: `recruitment:read`, `recruitment:write`, `recruitment:admin`, `vacancy:create`, `vacancy:edit`, `vacancy:publish`, `vacancy:delete`, `candidate:read`, `candidate:write`, `candidate:share`
   - And the permissions follow the existing category pattern with a new `recruitment` category

4. **Route group exists**
   - Given the app directory has no recruitment section
   - When the module is scaffolded
   - Then `app/(authenticated)/recruitment/` exists with a placeholder overview page
   - And `app/(authenticated)/recruitment/vacatures/` exists with a placeholder list page
   - And `app/api/recruitment/` exists with auth middleware applied

5. **Sidebar navigation**
   - Given a user with `recruitment:read` permission
   - When they view the sidebar
   - Then "Recruitment" appears with Users icon (from Lucide)
   - And users without `recruitment:read` do NOT see the menu item

6. **Lib structure**
   - Given no recruitment utilities exist
   - When the module is scaffolded
   - Then `lib/recruitment/permissions.ts` exports recruitment permission keys
   - And `lib/recruitment/schemas.ts` exists (initially with Vacancy Zod schemas)
   - And `lib/recruitment/types.ts` exports recruitment TypeScript types

7. **Dutch route naming**
   - Given the existing routes use Dutch names (kalender, starters, taken)
   - When recruitment routes are created
   - Then authenticated routes use `/recruitment/vacatures` (not `/recruitment/vacancies`)

## Tasks / Subtasks

- [x] Task 1: Create feature branch (AC: #1)
  - [x] Branch from main: `feature/recruitment-module`
- [x] Task 2: Extend Prisma schema (AC: #2)
  - [x] Add `VacancyStatus` enum (DRAFT, PUBLISHED, CLOSED, ARCHIVED)
  - [x] Add `Vacancy` model with all fields and relations
  - [x] Add `VacancyStage` model with vacancy relation and ordering
  - [x] Run `npx prisma generate` to regenerate client
  - [x] Verify existing models are unaffected (prisma validate passed)
- [x] Task 3: Register recruitment RBAC permissions (AC: #3)
  - [x] Add `recruitment` category to `PermissionCategory` type in `lib/authz-registry.ts`
  - [x] Add all 10 recruitment permission definitions to `PERMISSIONS` array
  - [x] Note: `npm run seed:rbac` deferred until db push on dev environment
- [x] Task 4: Create route group and pages (AC: #4, #7)
  - [x] Create `app/(authenticated)/recruitment/page.tsx` (overview with permission guard)
  - [x] Create `app/(authenticated)/recruitment/vacatures/page.tsx` (list page)
  - [x] Create `app/api/recruitment/vacancies/route.ts` (GET/POST with auth + Zod validation)
- [x] Task 5: Add sidebar navigation item (AC: #5)
  - [x] Add "Recruitment" entry to navbar with `recruitment:read` permission guard
  - [x] Use `Briefcase` icon from lucide-react
  - [x] Position before Materials and Admin items
  - [x] Added translation keys in nl.json and fr.json
- [x] Task 6: Create lib/recruitment/ structure (AC: #6)
  - [x] Create `lib/recruitment/permissions.ts` with exported permission constants
  - [x] Create `lib/recruitment/schemas.ts` with Zod schema for Vacancy create/update
  - [x] Create `lib/recruitment/types.ts` with TypeScript types matching Prisma models

## Dev Notes

### Critical Architecture Constraints

- **Prisma schema extension rules**: Add models at the bottom of `prisma/schema.prisma`. Do NOT modify existing models. Relations to `Entity`, `User`, `JobRole` use standard `@relation` directives.
- **No migrations directory**: This project uses `prisma db push` (not `prisma migrate`). See `prisma/schema.prisma` generator config and deployment pattern.
- **RBAC v2 system**: Permissions live in `lib/authz-registry.ts` as a typed array. New permissions MUST be added to the `PERMISSIONS` array and synced via `npm run seed:rbac`. The `can()` function in `lib/authz.ts` checks permission strings at runtime.
- **Single Docker container**: Recruitment is part of the same Next.js app — no separate service.

### Existing RBAC v2 Pattern to Follow

The RBAC system uses:
- `lib/authz-registry.ts` — Source of truth for all permission keys (grouped by category)
- `lib/authz.ts` — `can(user, permissionKey, { entityId? })` for checks, `requirePermission()` for API routes
- `lib/rbac.ts` — Legacy helpers that delegate to authz (thin wrappers)
- Database models: `Role`, `Permission`, `UserRoleAssignment` (with `entityIds[]` for scoping)

**How to add new permissions:**
1. Add `'recruitment'` to `PermissionCategory` union type in `lib/authz-registry.ts`
2. Add permission objects to the `PERMISSIONS` array (follow existing format exactly)
3. Run `npm run seed:rbac` to sync Permission table

**Permission key format**: `{category}:{resource}:{action}` or `{category}:{action}`, e.g. `recruitment:read`, `vacancy:create`, `candidate:share`

### Existing Sidebar Pattern

The sidebar navigation is defined in the layout component. Look for the navigation config in `components/layout/` (likely `Navbar.tsx` or similar). Each item has:
- Label (translated via next-intl)
- Icon (from lucide-react)
- Path
- Permission guard (using `can()` check)

Follow the exact pattern used by "Kalender", "Starters", "Taken" items.

### Existing API Route Pattern

API routes in this project follow:
```typescript
import { requirePermission } from '@/lib/authz'

export async function GET(req: Request) {
  const user = await requirePermission('recruitment:read')
  // ... handler logic
}
```

Every route uses Zod validation at the boundary. Response format: `{ data: T }` for success, error handling via try/catch with structured error responses.

### Prisma Schema Conventions

- Model names: PascalCase singular (`Vacancy`, `VacancyStage`)
- Field names: camelCase (`createdAt`, `entityId`, `vacancyId`)
- IDs: `String @id @default(cuid())`
- Timestamps: `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`
- Relations: explicit `@relation` with foreign key field
- Enums: defined above models, PascalCase name with UPPER_SNAKE values

### Project Structure Notes

Files to create:
```
app/(authenticated)/recruitment/
├── page.tsx                    # Module overview (placeholder)
└── vacatures/
    └── page.tsx               # Vacancy list (placeholder)

app/api/recruitment/
└── vacancies/
    └── route.ts               # Stub GET/POST with auth

lib/recruitment/
├── permissions.ts             # Permission key constants
├── schemas.ts                 # Zod schemas
└── types.ts                   # TypeScript types

prisma/schema.prisma           # Extended (append at bottom)
```

Files to modify:
```
lib/authz-registry.ts          # Add 'recruitment' category + permissions
components/layout/Navbar.tsx   # Add recruitment nav item (verify exact file)
```

### Translation Keys

Add recruitment translation keys to the existing next-intl structure. The locale files are likely in `messages/nl.json` and `messages/fr.json`. Add a `recruitment` namespace:
```json
{
  "recruitment": {
    "title": "Recruitment",
    "vacancies": "Vacatures",
    "overview": "Overzicht"
  }
}
```

### References

- [Source: lib/authz-registry.ts] — Permission definitions and category system
- [Source: lib/authz.ts] — `can()`, `requirePermission()`, `AuthorizedUser` type
- [Source: lib/rbac.ts] — Legacy helpers delegating to authz
- [Source: prisma/schema.prisma] — Existing schema conventions and model patterns
- [Source: docs/project-context.md#Architecture] — Full application structure
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns] — Recruitment-specific naming conventions
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure] — Complete recruitment directory structure

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Prisma validate: passed after schema extension
- Prisma generate: regenerated client with Vacancy + VacancyStage models
- TypeScript check: no errors in recruitment files (pre-existing errors in test files unrelated)

### Completion Notes List

- Feature branch `feature/recruitment-module` created from main
- Prisma schema extended with VacancyStatus enum, Vacancy model (9 fields + relations), VacancyStage model (6 fields + compound unique)
- Relations added to existing Entity (vacancies[]), User (createdVacancies[]), JobRole (vacancies[]) models
- 10 recruitment permissions registered in authz-registry under new 'recruitment' category
- Route group created with overview page and vacancy list page (both with permission guards)
- API route `/api/recruitment/vacancies` with GET (list) and POST (create with default stages)
- Sidebar navigation added with Briefcase icon, guarded by recruitment:read
- Translation keys added for NL and FR
- lib/recruitment/ created with permissions.ts, schemas.ts, types.ts

### Review Findings

- [x] [Review][Patch] GET route returns empty results for admin users — fixed: uses `visibleEntityIds()` which returns `'ALL'` for bypassEntityScope roles [app/api/recruitment/vacancies/route.ts]
- [x] [Review][Patch] POST route missing entity-scoped permission check — fixed: added `can(user, 'vacancy:create', { entityId })` check after input validation [app/api/recruitment/vacancies/route.ts]
- [x] [Review][Defer] VacancyStage @@unique([vacancyId, order]) will complicate stage reordering in Story 1.6 — deferred, future concern

### Change Log

- 2026-05-15: Story 1.1 implemented — Recruitment module foundation with schema, RBAC, routes, navigation, and lib structure

### File List

New files:
- app/(authenticated)/recruitment/page.tsx
- app/(authenticated)/recruitment/vacatures/page.tsx
- app/api/recruitment/vacancies/route.ts
- lib/recruitment/permissions.ts
- lib/recruitment/schemas.ts
- lib/recruitment/types.ts

Modified files:
- prisma/schema.prisma (added VacancyStatus enum, Vacancy model, VacancyStage model, relations on Entity/User/JobRole)
- lib/authz-registry.ts (added 'recruitment' category + 10 permission definitions)
- components/layout/navbar.tsx (added Briefcase import + recruitment nav item)
- messages/nl.json (added recruitment namespace + navbar.recruitment key)
- messages/fr.json (added recruitment namespace + navbar.recruitment key)
