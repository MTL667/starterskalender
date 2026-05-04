import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

/**
 * Auto-assign the next inspector number for a starter within their entity.
 * Uses a Prisma transaction with the @@unique([entityId, inspectorNumber])
 * constraint as the ultimate guard against duplicates.
 */
export async function assignInspectorNumber(
  starterId: string,
  entityId: string,
  actorId?: string,
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

    await tx.starter.update({
      where: { id: starterId },
      data: { inspectorNumber: nextNumber },
    })

    if (actorId) {
      await createAuditLog({
        actorId,
        action: 'UPDATE',
        target: `Starter:${starterId}`,
        meta: { field: 'inspectorNumber', value: nextNumber, method: 'auto' },
      })
    }

    return nextNumber
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
    select: { firstName: true, lastName: true },
  })

  if (existing) {
    return `Inspecteurnummer ${number} is al in gebruik door ${existing.firstName} ${existing.lastName}`
  }

  return null
}

/**
 * Check digit validation (modulo 97).
 * For numbers >= 100: last 2 digits must equal 97 - (remaining digits mod 97).
 * Numbers < 100 are exempt (too short for meaningful check digit).
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

/**
 * Bulk-import inspector numbers from parsed CSV rows.
 * Returns per-row results: either success or error message.
 */
export async function bulkImportInspectorNumbers(
  entityId: string,
  rows: Array<{ firstName: string; lastName: string; inspectorNumber: number }>,
  actorId: string,
): Promise<Array<{ row: number; success: boolean; error?: string }>> {
  const results: Array<{ row: number; success: boolean; error?: string }> = []

  for (let i = 0; i < rows.length; i++) {
    const { firstName, lastName, inspectorNumber } = rows[i]

    if (!Number.isInteger(inspectorNumber) || inspectorNumber < 1) {
      results.push({ row: i + 1, success: false, error: 'Ongeldig nummer' })
      continue
    }

    const matches = await prisma.starter.findMany({
      where: {
        entityId,
        firstName: { equals: firstName, mode: 'insensitive' },
        lastName: { equals: lastName, mode: 'insensitive' },
      },
      select: { id: true, inspectorNumber: true },
    })

    if (matches.length === 0) {
      results.push({ row: i + 1, success: false, error: `Starter "${firstName} ${lastName}" niet gevonden` })
      continue
    }

    if (matches.length > 1) {
      results.push({ row: i + 1, success: false, error: `Meerdere starters gevonden met naam "${firstName} ${lastName}" — kan niet automatisch toewijzen` })
      continue
    }

    const starter = matches[0]

    if (starter.inspectorNumber !== null) {
      results.push({ row: i + 1, success: false, error: `Starter heeft al nummer ${starter.inspectorNumber}` })
      continue
    }

    const validationError = await validateInspectorNumber(entityId, inspectorNumber)
    if (validationError) {
      results.push({ row: i + 1, success: false, error: validationError })
      continue
    }

    try {
      await prisma.starter.update({
        where: { id: starter.id },
        data: { inspectorNumber },
      })

      await createAuditLog({
        actorId,
        action: 'UPDATE',
        target: `Starter:${starter.id}`,
        meta: { field: 'inspectorNumber', value: inspectorNumber, method: 'import' },
      })

      results.push({ row: i + 1, success: true })
    } catch {
      results.push({ row: i + 1, success: false, error: 'Database fout (mogelijk duplicaat)' })
    }
  }

  return results
}
