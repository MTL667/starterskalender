# Inspector Number Feature — Technical Implementation Plan

**Source:** [Brainstorming session 2026-05-04](../brainstorming/brainstorming-session-2026-05-04-0808.md)
**Date:** 2026-05-04

---

## Overview

Add a government-mandated "Inspecteurnummer" system that auto-assigns sequential identification numbers to starters whose function (JobRole) requires one. Numbers are scoped per entity, configurable via the admin panel, and visible everywhere (profile, search, exports).

## Architecture Decision

Hardcoded `inspectorNumber Int?` column on the `Starter` model (YAGNI — no generic IdentificationNumber table). If a second number type is needed later, add another column + migration.

---

## Task 1: Schema Changes

### Prisma Schema

**File:** `prisma/schema.prisma`

Add to the `Entity` model:

```prisma
model Entity {
  // ... existing fields ...
  inspectorNumberEnabled  Boolean  @default(false)
  inspectorNumberStart    Int      @default(1)
  inspectorNumberLabel    String   @default("Inspecteurnummer")
}
```

Add to the `Starter` model:

```prisma
model Starter {
  // ... existing fields ...
  inspectorNumber  Int?

  @@unique([entityId, inspectorNumber])
}
```

Add to the `JobRole` model:

```prisma
model JobRole {
  // ... existing fields ...
  requiresInspectorNumber  Boolean  @default(false)
}
```

### Migration

```bash
npx prisma migrate dev --name add-inspector-number
```

The `@@unique([entityId, inspectorNumber])` composite constraint enforces uniqueness at the database level (the strongest guarantee against race conditions).

---

## Task 2: Inspector Number Assignment Logic

### New file: `lib/inspector-number.ts`

Core assignment engine — used by starter creation, manual entry, and bulk import.

```typescript
import { prisma } from '@/lib/prisma'

/**
 * Auto-assign the next inspector number for a starter within their entity.
 * Uses a Prisma transaction with the unique constraint as the ultimate guard.
 */
export async function assignInspectorNumber(
  starterId: string,
  entityId: string,
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const entity = await tx.entity.findUniqueOrThrow({
      where: { id: entityId },
      select: { inspectorNumberStart: true },
    })

    const maxResult = await tx.starter.aggregate({
      where: { entityId, inspectorNumber: { not: null } },
      _max: { inspectorNumber: true },
    })

    const nextNumber = Math.max(
      entity.inspectorNumberStart,
      (maxResult._max.inspectorNumber ?? 0) + 1,
    )

    const updated = await tx.starter.update({
      where: { id: starterId },
      data: { inspectorNumber: nextNumber },
    })

    return updated.inspectorNumber!
  })
}

/**
 * Validate a manually entered inspector number.
 * Returns null if valid, or an error message string.
 */
export async function validateInspectorNumber(
  entityId: string,
  number: number,
  excludeStarterId?: string,
): Promise<string | null> {
  if (!Number.isInteger(number) || number < 1) {
    return 'Inspecteurnummer moet een positief geheel getal zijn'
  }

  const existing = await prisma.starter.findFirst({
    where: {
      entityId,
      inspectorNumber: number,
      ...(excludeStarterId ? { id: { not: excludeStarterId } } : {}),
    },
  })

  if (existing) {
    return `Inspecteurnummer ${number} is al in gebruik door ${existing.firstName} ${existing.lastName}`
  }

  return null
}

/**
 * Check digit validation (modulo 97) for manual entry.
 * Returns true if the number passes the check digit test,
 * or if check digits are not enforced (numbers < 100).
 */
export function validateCheckDigit(number: number): boolean {
  if (number < 100) return true
  const base = Math.floor(number / 100)
  const check = number % 100
  return check === 97 - (base % 97)
}

/**
 * Check if a starter's role requires an inspector number for their entity.
 */
export async function roleRequiresInspectorNumber(
  entityId: string,
  roleTitle: string,
): Promise<boolean> {
  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    select: { inspectorNumberEnabled: true },
  })

  if (!entity?.inspectorNumberEnabled) return false

  const jobRole = await prisma.jobRole.findUnique({
    where: { entityId_title: { entityId, title: roleTitle } },
    select: { requiresInspectorNumber: true },
  })

  return jobRole?.requiresInspectorNumber ?? false
}
```

---

## Task 3: Integrate Auto-Assignment in Starter Creation

### File: `app/api/starters/route.ts`

In the `POST` handler, after the starter is created and has an `entityId` + `roleTitle`, auto-assign if the role requires it:

```typescript
// After starter creation, before audit log
if (starter.entityId && starter.roleTitle) {
  const { roleRequiresInspectorNumber, assignInspectorNumber } = await import('@/lib/inspector-number')
  const needsNumber = await roleRequiresInspectorNumber(starter.entityId, starter.roleTitle)
  if (needsNumber) {
    try {
      const inspectorNumber = await assignInspectorNumber(starter.id, starter.entityId)
      console.log(`🔢 Auto-assigned inspector number ${inspectorNumber} to ${starter.firstName} ${starter.lastName}`)
    } catch (err) {
      console.error('Failed to auto-assign inspector number:', err)
    }
  }
}
```

---

## Task 4: Manual Entry + Validation in Starter PATCH

### File: `app/api/starters/[id]/route.ts`

Add `inspectorNumber` to the `UpdateStarterSchema`:

```typescript
inspectorNumber: z.number().int().positive().nullable().optional(),
```

In the `PATCH` handler, add validation before update:

```typescript
if (data.inspectorNumber !== undefined && data.inspectorNumber !== null) {
  const existing = await prisma.starter.findUnique({ where: { id }, select: { inspectorNumber: true, entityId: true } })

  // Cannot change once set
  if (existing?.inspectorNumber !== null) {
    return NextResponse.json({ error: 'Inspecteurnummer kan niet gewijzigd worden' }, { status: 400 })
  }

  // Validate uniqueness within entity
  const { validateInspectorNumber } = await import('@/lib/inspector-number')
  const validationError = await validateInspectorNumber(existing!.entityId!, data.inspectorNumber, id)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }
}
```

---

## Task 5: Audit Logging

### File: `app/api/starters/route.ts` and `app/api/starters/[id]/route.ts`

Add audit events for inspector number assignment:

```typescript
await createAuditLog({
  actorId: user.id,
  action: 'UPDATE',
  target: `Starter:${starter.id}`,
  meta: {
    field: 'inspectorNumber',
    value: inspectorNumber,
    method: 'auto', // or 'manual' or 'import'
  },
})
```

---

## Task 6: Admin Panel — Entity Inspector Number Settings

### File: `app/(authenticated)/admin/entities/page.tsx`

Extend the entity edit dialog with inspector number configuration:

1. **Checkbox**: "Inspecteurnummer activeren" (`inspectorNumberEnabled`)
2. **Input**: "Startnummer" (`inspectorNumberStart`, only visible when enabled)
3. **Label**: "Label" (`inspectorNumberLabel`, only visible when enabled)

### File: `app/api/entities/[id]/route.ts`

Add new fields to the PATCH schema and handler.

---

## Task 7: Admin Panel — JobRole Inspector Number Toggle

### File: `app/(authenticated)/admin/job-roles/page.tsx`

Add a checkbox "Vereist inspecteurnummer" to the job role edit dialog. Only visible when the entity has `inspectorNumberEnabled: true`.

### File: `app/api/job-roles/route.ts` or `app/api/job-roles/[id]/route.ts`

Add `requiresInspectorNumber` to the create/update schema.

---

## Task 8: Starter Profile UI

### File: `components/kalender/starter-dialog.tsx`

1. Add `inspectorNumber` to the local `Starter` interface
2. Show the field only if the entity has `inspectorNumberEnabled` and the starter's role requires it
3. If `inspectorNumber` is set: show as **readonly** badge/field
4. If `inspectorNumber` is null and role requires it: show as **editable input** (for backfill)
5. On save with manual entry: PATCH sends `inspectorNumber` to API

**Display:**

```tsx
{starter.inspectorNumber && (
  <div>
    <Label>{entity.inspectorNumberLabel || 'Inspecteurnummer'}</Label>
    <div className="font-mono text-lg font-semibold">{starter.inspectorNumber}</div>
  </div>
)}
{!starter.inspectorNumber && roleRequiresInspectorNumber && (
  <div>
    <Label>{entity.inspectorNumberLabel || 'Inspecteurnummer'}</Label>
    <Input
      type="number"
      value={formData.inspectorNumber || ''}
      onChange={(e) => setFormData({ ...formData, inspectorNumber: parseInt(e.target.value) || null })}
      placeholder="Wordt automatisch toegewezen bij opslaan"
    />
  </div>
)}
```

### File: `lib/types.ts`

Add to `Starter` interface:

```typescript
inspectorNumber?: number | null
```

---

## Task 9: Search Integration

### File: `app/api/starters/route.ts` (GET)

Add `inspectorNumber` to the search OR clause:

```typescript
if (search) {
  const searchNum = parseInt(search)
  andConditions.push({
    OR: [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { roleTitle: { contains: search, mode: 'insensitive' } },
      { region: { contains: search, mode: 'insensitive' } },
      ...(Number.isInteger(searchNum) ? [{ inspectorNumber: searchNum }] : []),
    ],
  })
}
```

### File: `components/starters/starters-table.tsx`

Add to client-side search filter:

```typescript
starter.inspectorNumber?.toString().includes(query)
```

---

## Task 10: Export Integration

### File: `components/starters/starters-table.tsx`

Add inspector number as a column in CSV, XLSX, and PDF exports:

```typescript
// In exportCSV, exportXLS, etc.
return {
  // ... existing columns ...
  Inspecteurnummer: s.inspectorNumber || '',
}
```

### File: `components/kalender/calendar-view.tsx`

Add inspector number to calendar export if available.

---

## Task 11: Bulk CSV Import

### New file: `app/api/entities/[id]/import-inspector-numbers/route.ts`

New API endpoint for bulk import of inspector numbers per entity.

**Input:** CSV with columns `firstName`, `lastName`, `inspectorNumber` (or `email` as identifier)

**Logic:**
1. Parse CSV rows
2. For each row: find starter by name + entity, validate number (uniqueness, integer)
3. Per-row error reporting: valid rows proceed, failed rows collected
4. After import: log bulk audit event
5. Return summary: `{ imported: N, failed: [{ row, error }] }`

### UI: `app/(authenticated)/admin/entities/page.tsx`

Add "Inspecteurnummers importeren" button per entity (only when `inspectorNumberEnabled`). Opens file upload dialog with CSV template download.

---

## Task 12: Entity Settings API

### File: `app/api/entities/[id]/route.ts`

Extend the PATCH handler to accept:

```typescript
inspectorNumberEnabled: z.boolean().optional(),
inspectorNumberStart: z.number().int().positive().optional(),
inspectorNumberLabel: z.string().min(1).optional(),
```

### File: `app/api/entities/route.ts`

Include these fields in GET response (already returned from Prisma include).

---

## Implementation Order

```
Task 1  → Schema changes (foundation)
Task 2  → Assignment logic (engine)
Task 3  → Auto-assignment on starter creation
Task 12 → Entity settings API
Task 6  → Admin panel: entity config UI
Task 7  → Admin panel: job role toggle
Task 4  → Manual entry + validation on PATCH
Task 8  → Starter profile UI (display + manual entry)
Task 5  → Audit logging
Task 9  → Search integration
Task 10 → Export integration
Task 11 → Bulk CSV import (last — depends on all above)
```

## Files Changed (Summary)

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add fields to Entity, Starter, JobRole |
| `lib/inspector-number.ts` | **NEW** — assignment engine, validation |
| `lib/types.ts` | Add `inspectorNumber` to Starter interface |
| `app/api/starters/route.ts` | Auto-assign on POST, search on GET |
| `app/api/starters/[id]/route.ts` | Manual entry validation on PATCH |
| `app/api/entities/[id]/route.ts` | Accept inspector number settings |
| `app/api/entities/[id]/import-inspector-numbers/route.ts` | **NEW** — bulk import |
| `app/(authenticated)/admin/entities/page.tsx` | Config UI + import button |
| `app/(authenticated)/admin/job-roles/page.tsx` | requiresInspectorNumber toggle |
| `components/kalender/starter-dialog.tsx` | Display + manual entry field |
| `components/starters/starters-table.tsx` | Search + export columns |
| `components/kalender/calendar-view.tsx` | Export column |

## Edge Cases Addressed

1. **Race condition**: `@@unique([entityId, inspectorNumber])` at DB level + `$transaction` for MAX+1
2. **Backfill**: Editable field when null, readonly when set
3. **Manual gaps**: Counter uses MAX+1, skips existing numbers naturally
4. **Entity transfer**: New entity = new number (old number stays in history via audit log)
5. **Immutability**: API rejects PATCH if `inspectorNumber` is already set
6. **Check digit**: Modulo 97 validation on manual entry to catch typos
7. **Bulk import errors**: Per-row validation, partial success
