import { describe, it, expect } from 'vitest'
import {
  isHRAdmin,
  isGlobalViewer,
  getAccessibleEntityIds,
  canEditEntity,
  canViewEntity,
  filterStartersByRBAC,
  hasAdminRights,
  type UserWithMemberships,
} from '@/lib/rbac'

const baseUser = {
  id: 'u1',
  email: 'test@test.local',
  name: 'Test',
  image: null,
  emailVerified: null,
  role: 'NONE' as const,
  locale: 'nl',
  tenantId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  oid: null,
} as unknown as UserWithMemberships

const withMemberships = (
  role: 'HR_ADMIN' | 'GLOBAL_VIEWER' | 'ENTITY_EDITOR' | 'ENTITY_VIEWER' | 'NONE',
  memberships: any[] = []
): UserWithMemberships => ({
  ...baseUser,
  role,
  memberships,
}) as UserWithMemberships

describe('RBAC - Role Checks', () => {
  it('identifies HR_ADMIN correctly', () => {
    expect(isHRAdmin({ ...baseUser, role: 'HR_ADMIN' })).toBe(true)
    expect(isHRAdmin({ ...baseUser, role: 'GLOBAL_VIEWER' })).toBe(false)
    expect(isHRAdmin({ ...baseUser, role: 'NONE' })).toBe(false)
  })

  it('identifies GLOBAL_VIEWER correctly', () => {
    expect(isGlobalViewer({ ...baseUser, role: 'GLOBAL_VIEWER' })).toBe(true)
    expect(isGlobalViewer({ ...baseUser, role: 'HR_ADMIN' })).toBe(false)
  })

  it('hasAdminRights only for HR_ADMIN', () => {
    expect(hasAdminRights({ ...baseUser, role: 'HR_ADMIN' })).toBe(true)
    expect(hasAdminRights({ ...baseUser, role: 'GLOBAL_VIEWER' })).toBe(false)
    expect(hasAdminRights({ ...baseUser, role: 'ENTITY_EDITOR' })).toBe(false)
  })
})

describe('RBAC - Entity Access', () => {
  it('returns empty array for HR_ADMIN (means all entities)', () => {
    const user = withMemberships('HR_ADMIN')
    expect(getAccessibleEntityIds(user)).toEqual([])
  })

  it('returns empty array for GLOBAL_VIEWER (means all entities)', () => {
    const user = withMemberships('GLOBAL_VIEWER')
    expect(getAccessibleEntityIds(user)).toEqual([])
  })

  it('returns membership entity IDs for ENTITY_EDITOR', () => {
    const user = withMemberships('ENTITY_EDITOR', [
      { entityId: 'e1', entity: { id: 'e1', name: 'Aceg' }, canEdit: true },
      { entityId: 'e2', entity: { id: 'e2', name: 'Asbuilt' }, canEdit: false },
    ])
    expect(getAccessibleEntityIds(user)).toEqual(['e1', 'e2'])
  })
})

describe('RBAC - canEditEntity', () => {
  it('HR_ADMIN can edit any entity', () => {
    const user = withMemberships('HR_ADMIN')
    expect(canEditEntity(user, 'any-entity')).toBe(true)
  })

  it('ENTITY_EDITOR can edit entities where canEdit=true', () => {
    const user = withMemberships('ENTITY_EDITOR', [
      { entityId: 'e1', entity: { id: 'e1', name: 'Aceg' }, canEdit: true },
      { entityId: 'e2', entity: { id: 'e2', name: 'Other' }, canEdit: false },
    ])
    expect(canEditEntity(user, 'e1')).toBe(true)
    expect(canEditEntity(user, 'e2')).toBe(false)
    expect(canEditEntity(user, 'e3')).toBe(false)
  })
})

describe('RBAC - canViewEntity', () => {
  it('HR_ADMIN and GLOBAL_VIEWER can view everything', () => {
    expect(canViewEntity(withMemberships('HR_ADMIN'), 'any')).toBe(true)
    expect(canViewEntity(withMemberships('GLOBAL_VIEWER'), 'any')).toBe(true)
  })

  it('ENTITY_VIEWER can only view their own entities', () => {
    const user = withMemberships('ENTITY_VIEWER', [
      { entityId: 'e1', entity: { id: 'e1', name: 'Aceg' }, canEdit: false },
    ])
    expect(canViewEntity(user, 'e1')).toBe(true)
    expect(canViewEntity(user, 'e2')).toBe(false)
  })
})

describe('RBAC - filterStartersByRBAC', () => {
  it('returns unmodified where for HR_ADMIN', () => {
    const user = withMemberships('HR_ADMIN')
    const where = { year: 2026 }
    expect(filterStartersByRBAC(user, where)).toEqual({ year: 2026 })
  })

  it('adds entityId filter for ENTITY_EDITOR', () => {
    const user = withMemberships('ENTITY_EDITOR', [
      { entityId: 'e1', entity: { id: 'e1', name: 'Aceg' }, canEdit: true },
    ])
    const result = filterStartersByRBAC(user, { year: 2026 })
    expect(result).toEqual({ year: 2026, entityId: { in: ['e1'] } })
  })
})
