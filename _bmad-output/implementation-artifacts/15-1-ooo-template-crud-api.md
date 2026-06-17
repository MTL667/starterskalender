# Story 15.1: OOO Template CRUD API

Status: review

## Story

As a system administrator,
I want to create and manage OOO auto-reply templates per function and entity,
so that offboarding flows can use pre-configured templates without manual text entry.

## Acceptance Criteria

1. OooTemplate Prisma model exists with fields: id, entityId, jobRoleId (nullable), templateNl, templateFr, templateEn, generalMailAddress, createdAt, updatedAt
2. `GET /api/admin/ooo-templates/[entityId]` returns list of all OOO templates for that entity (requires `mail:offboarding` permission + entity access)
3. `GET /api/admin/ooo-templates/[entityId]/[jobRoleId]` returns a specific template for entity + jobRole combination
4. `PUT /api/admin/ooo-templates/[entityId]/[jobRoleId]` creates or upserts a template (requires `mail:offboarding` permission + entity access)
5. Users without `mail:offboarding` permission receive 403 Forbidden
6. Users with permission for entity A cannot access templates for entity B (entity isolation)
7. Zod validation ensures required fields are present and valid

## Tasks / Subtasks

- [x] Task 1: Add `mail:offboarding` permission to authz-registry (AC: #5)
  - [x] Add permission definition to `lib/authz-registry.ts` in a new "Offboarding" category
  - [x] Run `npm run db:seed-rbac` to sync permission to database
- [x] Task 2: Create OooTemplate Prisma model (AC: #1)
  - [x] Add OooTemplate model to `prisma/schema.prisma`
  - [x] Add relation to Entity model (entityId FK)
  - [x] Add optional relation to JobRole model (jobRoleId FK, nullable)
  - [x] Add unique constraint on [entityId, jobRoleId] for upsert semantics
  - [x] Run `npx prisma db push` to apply schema changes
- [x] Task 3: Create `GET /api/admin/ooo-templates/[entityId]/route.ts` (AC: #2, #5, #6)
  - [x] Implement permission check with `requirePermission('mail:offboarding', { entityId })`
  - [x] Query all OooTemplate records for the entityId
  - [x] Include jobRole title in response for display context
  - [x] Return JSON array response
- [x] Task 4: Create `GET /api/admin/ooo-templates/[entityId]/[jobRoleId]/route.ts` (AC: #3, #5, #6)
  - [x] Implement permission check with entity scope
  - [x] Query OooTemplate by entityId + jobRoleId combination
  - [x] Return 404 if template doesn't exist
  - [x] Return JSON response with template data
- [x] Task 5: Create `PUT /api/admin/ooo-templates/[entityId]/[jobRoleId]/route.ts` (AC: #4, #5, #6, #7)
  - [x] Implement permission check with entity scope
  - [x] Validate request body with Zod schema (templateNl, templateFr, templateEn required strings; generalMailAddress required email)
  - [x] Use Prisma upsert on [entityId, jobRoleId] unique constraint
  - [x] Create AuditLog entry with action `entra.offboarding.ooo_template_updated`
  - [x] Return saved template as JSON response
- [x] Task 6: Build verification (AC: #1-#7)
  - [x] TypeScript compilation passes (no errors in new files)
  - [x] Next.js build succeeds with new routes compiled
  - [x] Prisma schema pushed successfully
  - [x] RBAC permission seeded to database

## Dev Notes

### Architecture Requirements

- **Permission key**: Use `mail:offboarding` (colon-separated, matching existing pattern like `admin:entities:manage`)
- **Permission category**: Create new `PermissionCategory` value `'offboarding'` in `lib/authz-registry.ts`
- **Entity isolation**: Use `requirePermission('mail:offboarding', { entityId })` — this checks both permission AND entity scope via the existing `can()` function
- **Audit logging**: Use existing `createAuditLog()` from `lib/audit.ts`
- **Validation**: Zod schemas at API boundary (same pattern as `app/api/admin/entra-connection/[entityId]/route.ts`)
- **DB operations**: Use `prisma.oooTemplate.upsert()` with `where: { entityId_jobRoleId: { entityId, jobRoleId } }`

### Project Structure Notes

- New route files: `app/api/admin/ooo-templates/[entityId]/route.ts` and `app/api/admin/ooo-templates/[entityId]/[jobRoleId]/route.ts`
- Schema changes in `prisma/schema.prisma` — project uses `db push` (no migration files)
- Permission registration: `lib/authz-registry.ts` + run seed script
- Follow exact patterns from `app/api/admin/entra-connection/[entityId]/route.ts` for auth + error handling structure

### Existing Patterns to Follow

```typescript
// API route pattern (from entra-connection route):
import { requirePermission, can } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { z } from 'zod'

export async function GET(req, { params }) {
  try {
    const user = await requirePermission('mail:offboarding')
    const { entityId } = await params
    if (!can(user, 'mail:offboarding', { entityId })) {
      return NextResponse.json({ error: 'FORBIDDEN', message: '...' }, { status: 403 })
    }
    // ... query logic
  } catch (error) {
    // standard error handling
  }
}
```

### Prisma Model Reference

```prisma
model OooTemplate {
  id                String   @id @default(cuid())
  entityId          String
  entity            Entity   @relation(fields: [entityId], references: [id], onDelete: Cascade)
  jobRoleId         String?
  jobRole           JobRole? @relation(fields: [jobRoleId], references: [id], onDelete: SetNull)
  templateNl        String   @db.Text
  templateFr        String   @db.Text
  templateEn        String   @db.Text
  generalMailAddress String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([entityId, jobRoleId])
  @@index([entityId])
}
```

Note: `jobRoleId` is nullable — a null jobRoleId means "entity default template" (fallback when no role-specific template exists).

### References

- [Source: _bmad-output/planning-artifacts/architecture-email-offboarding.md#Data Architecture]
- [Source: _bmad-output/planning-artifacts/architecture-email-offboarding.md#API & Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture-email-offboarding.md#Implementation Patterns]
- [Source: lib/authz-registry.ts — permission registration pattern]
- [Source: app/api/admin/entra-connection/[entityId]/route.ts — API route pattern]
- [Source: prisma/schema.prisma — ProvisioningJob model as reference for new model structure]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Added `mail:offboarding` permission to authz-registry with new `offboarding` category
- Created OooTemplate Prisma model with entityId + jobRoleId unique constraint
- Created GET list endpoint (entity-scoped, includes jobRole title)
- Created GET single + PUT upsert endpoint with Zod validation
- Added `entra.offboarding.ooo_template_updated` audit action
- All routes follow existing entra-connection pattern (permission + entity isolation + error handling)
- Build passes, schema pushed, permission seeded

### File List

- lib/authz-registry.ts (modified — added offboarding category + mail:offboarding permission)
- lib/audit.ts (modified — added entra.offboarding.ooo_template_updated action type)
- prisma/schema.prisma (modified — added OooTemplate model + relations to Entity and JobRole)
- app/api/admin/ooo-templates/[entityId]/route.ts (new — GET list endpoint)
- app/api/admin/ooo-templates/[entityId]/[jobRoleId]/route.ts (new — GET single + PUT upsert)
