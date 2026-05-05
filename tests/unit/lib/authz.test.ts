import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  can,
  visibleEntityIds,
  sanitizeFields,
  filterWritableFields,
  toAuthorizedUser,
  type AuthorizedUser,
  type LoadedRoleAssignment,
} from '@/lib/authz'

function makeRole(
  key: string,
  permissions: string[],
  bypassEntityScope: boolean,
): AuthorizedUser['roleAssignments'][number]['role'] {
  return {
    id: `role-${key}`,
    key,
    name: key,
    isSystem: true,
    bypassEntityScope,
    permissions: permissions.map((p) => ({ key: p })),
  }
}

function makeUser(assignments: LoadedRoleAssignment[]): AuthorizedUser {
  return {
    id: 'u1',
    email: 'u@test.local',
    name: 'User',
    locale: 'nl',
    status: 'ACTIVE',
    roleAssignments: assignments,
  }
}

function assignment(
  id: string,
  role: ReturnType<typeof makeRole>,
  entityIds: string[],
  expiresAt: Date | null = null,
): LoadedRoleAssignment {
  return { id, entityIds, expiresAt, role }
}

describe('toAuthorizedUser', () => {
  it('maps prisma-shaped user to AuthorizedUser', () => {
    const raw = {
      id: 'x',
      email: 'a@b.c',
      name: 'N',
      locale: 'fr',
      status: 'INVITED',
      roleAssignments: [
        {
          id: 'ra1',
          entityIds: ['e1'],
          expiresAt: null,
          role: {
            id: 'r1',
            key: 'k',
            name: 'K',
            isSystem: false,
            bypassEntityScope: false,
            permissions: [{ permissionKey: 'starters:read' }],
          },
        },
      ],
    }
    const u = toAuthorizedUser(raw)
    expect(u.id).toBe('x')
    expect(u.roleAssignments[0].role.permissions).toEqual([{ key: 'starters:read' }])
  })

  it('supports permission objects with key field', () => {
    const raw = {
      id: 'x',
      email: 'a@b.c',
      name: null,
      locale: 'nl',
      status: 'ACTIVE',
      roleAssignments: [
        {
          id: 'ra1',
          entityIds: [],
          expiresAt: null,
          role: {
            id: 'r1',
            key: 'k',
            name: 'K',
            isSystem: true,
            bypassEntityScope: true,
            permissions: [{ key: 'tasks:read' }],
          },
        },
      ],
    }
    expect(toAuthorizedUser(raw).roleAssignments[0].role.permissions[0].key).toBe('tasks:read')
  })
})

describe('can', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('returns false for null user', () => {
    expect(can(null, 'starters:read')).toBe(false)
  })

  it('returns true when user has permission with bypassEntityScope', () => {
    const user = makeUser([
      assignment('ra1', makeRole('admin', ['starters:read', 'starters:update'], true), []),
    ])
    expect(can(user, 'starters:read')).toBe(true)
    expect(can(user, 'starters:read', { entityId: 'any' })).toBe(true)
  })

  it('returns true for globally assigned role (empty entityIds) without entity context', () => {
    const user = makeUser([
      assignment('ra1', makeRole('viewer', ['starters:read'], false), []),
    ])
    expect(can(user, 'starters:read')).toBe(true)
  })

  it('returns true for globally assigned role with entityId (no filter required)', () => {
    const user = makeUser([
      assignment('ra1', makeRole('viewer', ['starters:read'], false), []),
    ])
    expect(can(user, 'starters:read', { entityId: 'e-locked' })).toBe(true)
  })

  it('returns true when entityId is in assignment scope', () => {
    const user = makeUser([
      assignment('ra1', makeRole('editor', ['starters:update'], false), ['e1', 'e2']),
    ])
    expect(can(user, 'starters:update', { entityId: 'e1' })).toBe(true)
    expect(can(user, 'starters:update', { entityId: 'e2' })).toBe(true)
  })

  it('returns false when entityId is outside assignment scope', () => {
    const user = makeUser([
      assignment('ra1', makeRole('editor', ['starters:update'], false), ['e1']),
    ])
    expect(can(user, 'starters:update', { entityId: 'e99' })).toBe(false)
  })

  it('returns false when assignment lacks the permission', () => {
    const user = makeUser([
      assignment('ra1', makeRole('limited', ['tasks:read'], false), ['e1']),
    ])
    expect(can(user, 'starters:read', { entityId: 'e1' })).toBe(false)
  })

  it('ignores expired assignments', () => {
    const past = new Date(Date.now() - 60_000)
    const user = makeUser([
      assignment('ra-old', makeRole('old', ['starters:read'], true), [], past),
      assignment('ra-new', makeRole('new', ['tasks:read'], false), ['e1'], null),
    ])
    expect(can(user, 'starters:read')).toBe(false)
    expect(can(user, 'tasks:read', { entityId: 'e1' })).toBe(true)
  })

  it('warns on unknown permission in non-production', () => {
    const prev = process.env.NODE_ENV
    vi.stubEnv('NODE_ENV', 'development')
    const user = makeUser([
      assignment('ra1', makeRole('r', ['tasks:read'], true), []),
    ])
    can(user, 'not:a:real:permission:key:xyz')
    expect(warnSpy).toHaveBeenCalled()
    vi.stubEnv('NODE_ENV', prev)
  })

  it('does not warn for unknown permission in production', () => {
    const prev = process.env.NODE_ENV
    vi.stubEnv('NODE_ENV', 'production')
    const user = makeUser([
      assignment('ra1', makeRole('r', ['tasks:read'], true), []),
    ])
    can(user, 'not:a:real:permission:key:xyz')
    expect(warnSpy).not.toHaveBeenCalled()
    vi.stubEnv('NODE_ENV', prev)
  })
})

describe('visibleEntityIds', () => {
  it('returns empty array for null user', () => {
    expect(visibleEntityIds(null, 'starters:read')).toEqual([])
  })

  it("returns ALL when bypassEntityScope role has permission", () => {
    const user = makeUser([
      assignment('ra1', makeRole('admin', ['reporting:export'], true), ['e1']),
    ])
    expect(visibleEntityIds(user, 'reporting:export')).toBe('ALL')
  })

  it("returns ALL when global assignment (empty entityIds) has permission", () => {
    const user = makeUser([
      assignment('ra1', makeRole('global', ['starters:read'], false), []),
    ])
    expect(visibleEntityIds(user, 'starters:read')).toBe('ALL')
  })

  it('collects distinct entity ids from scoped assignments', () => {
    const user = makeUser([
      assignment('ra1', makeRole('a', ['starters:read'], false), ['e1', 'e2']),
      assignment('ra2', makeRole('b', ['starters:read'], false), ['e2', 'e3']),
    ])
    const ids = visibleEntityIds(user, 'starters:read')
    expect(ids).not.toBe('ALL')
    expect((ids as string[]).sort()).toEqual(['e1', 'e2', 'e3'])
  })

  it('ignores assignments without the permission', () => {
    const user = makeUser([
      assignment('ra1', makeRole('a', ['tasks:read'], false), ['e1']),
    ])
    expect(visibleEntityIds(user, 'starters:read')).toEqual([])
  })
})

describe('sanitizeFields for starters', () => {
  const record = {
    id: '1',
    firstName: 'A',
    salary: 5000,
    salaryCurrency: 'EUR',
    bankAccount: 'BE68539007547034',
  }

  it('returns record unchanged for null/undefined', () => {
    expect(sanitizeFields(null, null, 'starters')).toBeNull()
    expect(sanitizeFields(undefined, null, 'starters')).toBeUndefined()
  })

  it('returns record unchanged for unknown resource', () => {
    expect(sanitizeFields(record, null, 'unknown-resource')).toEqual(record)
  })

  it('strips salary and bank fields when user lacks field permissions', () => {
    const user = makeUser([
      assignment('ra1', makeRole('basic', ['starters:read'], true), []),
    ])
    const safe = sanitizeFields(record, user, 'starters')
    expect(safe).toEqual({ id: '1', firstName: 'A' })
  })

  it('keeps salary fields when user has starters:read:salary', () => {
    const user = makeUser([
      assignment('ra1', makeRole('hr', ['starters:read', 'starters:read:salary'], true), []),
    ])
    const safe = sanitizeFields(record, user, 'starters')
    expect(safe).toMatchObject({ salary: 5000, salaryCurrency: 'EUR' })
    expect(safe).not.toHaveProperty('bankAccount')
  })

  it('keeps bankAccount when user has starters:read:bankaccount', () => {
    const user = makeUser([
      assignment('ra1', makeRole('finance', ['starters:read', 'starters:read:bankaccount'], true), []),
    ])
    const safe = sanitizeFields(record, user, 'starters')
    expect(safe).toMatchObject({ bankAccount: 'BE68539007547034' })
    expect(safe).not.toHaveProperty('salary')
  })

  it('respects entity-scoped field permissions', () => {
    const user = makeUser([
      assignment('ra1', makeRole('scoped', ['starters:read', 'starters:read:salary'], false), ['e1']),
    ])
    const withEntity = { ...record, entityId: 'e1' }
    expect(sanitizeFields(withEntity, user, 'starters', { entityId: 'e1' })).toMatchObject({
      salary: 5000,
    })
    expect(sanitizeFields(withEntity, user, 'starters', { entityId: 'e2' })).not.toHaveProperty('salary')
  })
})

describe('filterWritableFields for starters', () => {
  const payload = {
    firstName: 'B',
    salary: 999,
    salaryCurrency: 'USD',
    bankAccount: 'X',
    notes: 'keep-me',
  }

  it('returns payload unchanged for unknown resource', () => {
    expect(filterWritableFields(payload, null, 'other')).toEqual({ data: payload, dropped: [] })
  })

  it('does not drop protected fields when user has all field permissions', () => {
    const user = makeUser([
      assignment(
        'ra1',
        makeRole('full', ['starters:read:salary', 'starters:read:bankaccount'], true),
        [],
      ),
    ])
    const { data, dropped } = filterWritableFields(payload, user, 'starters')
    expect(dropped).toEqual([])
    expect(data).toEqual(payload)
  })

  it('removes protected fields from payload and lists dropped keys', () => {
    const user = makeUser([assignment('ra1', makeRole('basic', ['starters:update'], false), ['e1'])])
    const { data, dropped } = filterWritableFields(payload, user, 'starters', { entityId: 'e1' })
    expect(dropped.sort()).toEqual(['bankAccount', 'salary', 'salaryCurrency'].sort())
    expect(data).toEqual({ firstName: 'B', notes: 'keep-me' })
  })

  it('ignores map fields not present on payload', () => {
    const user = makeUser([assignment('ra1', makeRole('basic', ['starters:read'], true), [])])
    const { data, dropped } = filterWritableFields({ firstName: 'Only' }, user, 'starters')
    expect(dropped).toEqual([])
    expect(data).toEqual({ firstName: 'Only' })
  })
})
