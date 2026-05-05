import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import {
  assignInspectorNumber,
  validateInspectorNumber,
  validateCheckDigit,
  roleRequiresInspectorNumber,
} from '@/lib/inspector-number'

vi.mock('@/lib/audit', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}))

describe('validateCheckDigit', () => {
  it('returns true for numbers below 100 (exempt)', () => {
    expect(validateCheckDigit(0)).toBe(true)
    expect(validateCheckDigit(1)).toBe(true)
    expect(validateCheckDigit(99)).toBe(true)
  })

  it('returns true when last two digits match modulo-97 check', () => {
    // base=1 → check = 97 - (1 % 97) = 96 → number 196
    expect(validateCheckDigit(196)).toBe(true)
    // base=100 → 100 % 97 = 3 → check = 94 → number 10094
    expect(validateCheckDigit(10094)).toBe(true)
  })

  it('returns false when check digits are wrong', () => {
    expect(validateCheckDigit(197)).toBe(false)
    expect(validateCheckDigit(10095)).toBe(false)
    expect(validateCheckDigit(1234511)).toBe(false)
  })
})

describe('validateInspectorNumber', () => {
  beforeEach(() => {
    vi.mocked(prisma.starter.findFirst).mockReset()
  })

  it('rejects non-integers and values below 1', async () => {
    await expect(validateInspectorNumber('e1', 0)).resolves.toMatch(/positief geheel/)
    await expect(validateInspectorNumber('e1', -1)).resolves.toMatch(/positief geheel/)
    await expect(validateInspectorNumber('e1', 1.5)).resolves.toMatch(/positief geheel/)
    expect(prisma.starter.findFirst).not.toHaveBeenCalled()
  })

  it('returns null when number is free in entity', async () => {
    vi.mocked(prisma.starter.findFirst).mockResolvedValue(null)
    await expect(validateInspectorNumber('entity-a', 42)).resolves.toBeNull()
    expect(prisma.starter.findFirst).toHaveBeenCalledWith({
      where: { entityId: 'entity-a', inspectorNumber: 42 },
      select: { firstName: true, lastName: true },
    })
  })

  it('returns error when another starter has the number', async () => {
    vi.mocked(prisma.starter.findFirst).mockResolvedValue({
      firstName: 'Jan',
      lastName: 'Janssen',
    })
    await expect(validateInspectorNumber('entity-a', 100)).resolves.toBe(
      'Inspecteurnummer 100 is al in gebruik door Jan Janssen',
    )
  })

  it('excludes a starter id when checking uniqueness', async () => {
    vi.mocked(prisma.starter.findFirst).mockResolvedValue(null)
    await validateInspectorNumber('entity-a', 55, 'starter-self')
    expect(prisma.starter.findFirst).toHaveBeenCalledWith({
      where: { entityId: 'entity-a', inspectorNumber: 55, id: { not: 'starter-self' } },
      select: { firstName: true, lastName: true },
    })
  })
})

describe('roleRequiresInspectorNumber', () => {
  beforeEach(() => {
    vi.mocked(prisma.entity.findUnique).mockReset()
    vi.mocked(prisma.jobRole.findUnique).mockReset()
  })

  it('returns false when entity is missing', async () => {
    vi.mocked(prisma.entity.findUnique).mockResolvedValue(null)
    await expect(roleRequiresInspectorNumber('missing', 'Driver')).resolves.toBe(false)
    expect(prisma.jobRole.findUnique).not.toHaveBeenCalled()
  })

  it('returns false when inspector numbers are disabled for entity', async () => {
    vi.mocked(prisma.entity.findUnique).mockResolvedValue({ inspectorNumberEnabled: false })
    await expect(roleRequiresInspectorNumber('e1', 'Driver')).resolves.toBe(false)
    expect(prisma.jobRole.findUnique).not.toHaveBeenCalled()
  })

  it('returns false when job role does not require inspector number', async () => {
    vi.mocked(prisma.entity.findUnique).mockResolvedValue({ inspectorNumberEnabled: true })
    vi.mocked(prisma.jobRole.findUnique).mockResolvedValue({ requiresInspectorNumber: false })
    await expect(roleRequiresInspectorNumber('e1', 'Office')).resolves.toBe(false)
    expect(prisma.jobRole.findUnique).toHaveBeenCalledWith({
      where: { entityId_title: { entityId: 'e1', title: 'Office' } },
      select: { requiresInspectorNumber: true },
    })
  })

  it('returns true when entity enables numbers and role requires them', async () => {
    vi.mocked(prisma.entity.findUnique).mockResolvedValue({ inspectorNumberEnabled: true })
    vi.mocked(prisma.jobRole.findUnique).mockResolvedValue({ requiresInspectorNumber: true })
    await expect(roleRequiresInspectorNumber('e1', 'Field')).resolves.toBe(true)
  })

  it('returns false when job role record is missing', async () => {
    vi.mocked(prisma.entity.findUnique).mockResolvedValue({ inspectorNumberEnabled: true })
    vi.mocked(prisma.jobRole.findUnique).mockResolvedValue(null)
    await expect(roleRequiresInspectorNumber('e1', 'Unknown')).resolves.toBe(false)
  })
})

describe('assignInspectorNumber', () => {
  beforeEach(async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn({ starter: prisma.starter, entity: prisma.entity }))
    vi.mocked(prisma.entity.findUniqueOrThrow).mockReset()
    vi.mocked(prisma.starter.aggregate).mockReset()
    vi.mocked(prisma.starter.update).mockReset()
    const { createAuditLog } = await import('@/lib/audit')
    vi.mocked(createAuditLog).mockClear()
  })

  afterEach(() => {
    vi.mocked(prisma.$transaction).mockImplementation((fn: any) =>
      fn({ starter: prisma.starter, entity: prisma.entity }),
    )
  })

  it('assigns max(inspectorNumberStart, maxExisting+1) and updates starter', async () => {
    vi.mocked(prisma.entity.findUniqueOrThrow).mockResolvedValue({ inspectorNumberStart: 1000 })
    vi.mocked(prisma.starter.aggregate).mockResolvedValue({ _max: { inspectorNumber: 1005 } })
    vi.mocked(prisma.starter.update).mockResolvedValue({} as any)

    const next = await assignInspectorNumber('s1', 'e1')
    expect(next).toBe(1006)
    expect(prisma.starter.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { inspectorNumber: 1006 },
    })
  })

  it('uses start value when no existing numbers', async () => {
    vi.mocked(prisma.entity.findUniqueOrThrow).mockResolvedValue({ inspectorNumberStart: 2000 })
    vi.mocked(prisma.starter.aggregate).mockResolvedValue({ _max: { inspectorNumber: null } })
    vi.mocked(prisma.starter.update).mockResolvedValue({} as any)

    await expect(assignInspectorNumber('s2', 'e2')).resolves.toBe(2000)
  })

  it('writes audit log when actorId is passed', async () => {
    vi.mocked(prisma.entity.findUniqueOrThrow).mockResolvedValue({ inspectorNumberStart: 1 })
    vi.mocked(prisma.starter.aggregate).mockResolvedValue({ _max: { inspectorNumber: null } })
    vi.mocked(prisma.starter.update).mockResolvedValue({} as any)
    const { createAuditLog } = await import('@/lib/audit')

    await assignInspectorNumber('s3', 'e3', 'actor-99')

    expect(createAuditLog).toHaveBeenCalledWith({
      actorId: 'actor-99',
      action: 'UPDATE',
      target: 'Starter:s3',
      meta: { field: 'inspectorNumber', value: 1, method: 'auto' },
    })
  })

  it('skips audit log when actorId is omitted', async () => {
    vi.mocked(prisma.entity.findUniqueOrThrow).mockResolvedValue({ inspectorNumberStart: 10 })
    vi.mocked(prisma.starter.aggregate).mockResolvedValue({ _max: { inspectorNumber: 10 } })
    vi.mocked(prisma.starter.update).mockResolvedValue({} as any)
    const { createAuditLog } = await import('@/lib/audit')

    await assignInspectorNumber('s4', 'e4')

    expect(createAuditLog).not.toHaveBeenCalled()
  })
})
