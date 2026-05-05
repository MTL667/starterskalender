import { describe, it, expect } from 'vitest'
import {
  isHRAdmin,
  isGlobalViewer,
  getAccessibleEntityIds,
  canEditEntity,
  canViewEntity,
  filterStartersByRBAC,
  hasAdminRights,
  isMaterialManager,
  type UserWithMemberships,
} from '@/lib/rbac'

function makeRole(key: string, permissions: string[], bypassEntityScope = false) {
  return {
    id: `role-${key}`,
    key,
    name: key,
    isSystem: true,
    bypassEntityScope,
    permissions: permissions.map(p => ({ permissionKey: p })),
  }
}

function makeAssignment(roleKey: string, permissions: string[], opts: { entityIds?: string[]; bypassEntityScope?: boolean } = {}) {
  return {
    id: `ra-${roleKey}`,
    entityIds: opts.entityIds ?? [],
    expiresAt: null,
    role: makeRole(roleKey, permissions, opts.bypassEntityScope ?? false),
  }
}

const ALL_PERMS = [
  'starters:read', 'starters:create', 'starters:update', 'starters:delete', 'starters:export',
  'starters:read:salary', 'starters:read:bankaccount', 'starters:write:inspectornumber', 'starters:photo:manage',
  'tasks:read', 'tasks:read:assigned', 'tasks:create', 'tasks:update', 'tasks:complete', 'tasks:reassign', 'tasks:upload', 'tasks:regenerate',
  'materials:read', 'materials:manage', 'materials:assign',
  'admin:users:read', 'admin:users:manage', 'admin:entities:manage', 'admin:roles:manage',
  'admin:templates:manage', 'admin:system:settings', 'admin:audit:read', 'admin:cron:trigger',
  'reporting:kpi:read', 'reporting:export',
]

const READ_PERMS = ALL_PERMS.filter(k => k.includes(':read') && !k.includes(':salary') && !k.includes(':bankaccount'))

const EDITOR_PERMS = ALL_PERMS.filter(k =>
  (k.startsWith('starters:') || k.startsWith('tasks:') || k === 'materials:read' || k === 'materials:assign' || k === 'reporting:kpi:read') &&
  !k.includes(':salary') && !k.includes(':bankaccount'),
)

const VIEWER_PERMS = ['starters:read', 'tasks:read', 'materials:read']

const baseUser = {
  id: 'u1',
  email: 'test@test.local',
  name: 'Test',
  image: null,
  emailVerified: null,
  legacyRole: 'NONE',
  locale: 'nl',
  tenantId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  oid: null,
  status: 'ACTIVE',
  identityProvider: 'AZURE_AD',
  password: null,
  legacyPermissions: [],
  twoFASecret: null,
  twoFAEnabled: false,
  lastLoginAt: null,
  memberships: [],
  roleAssignments: [],
} as unknown as UserWithMemberships

function withV2Role(
  roleKey: string,
  permissions: string[],
  opts: { entityIds?: string[]; bypassEntityScope?: boolean; memberships?: any[] } = {},
): UserWithMemberships {
  return {
    ...baseUser,
    memberships: opts.memberships ?? [],
    roleAssignments: [makeAssignment(roleKey, permissions, { entityIds: opts.entityIds, bypassEntityScope: opts.bypassEntityScope })],
  } as UserWithMemberships
}

describe('RBAC v2 - Role Checks', () => {
  it('identifies admin correctly via roleAssignments', () => {
    const admin = withV2Role('hr-admin', ALL_PERMS, { bypassEntityScope: true })
    expect(isHRAdmin(admin)).toBe(true)

    const viewer = withV2Role('global-viewer', READ_PERMS, { bypassEntityScope: true })
    expect(isHRAdmin(viewer)).toBe(false)

    const noRole = { ...baseUser, roleAssignments: [] } as UserWithMemberships
    expect(isHRAdmin(noRole)).toBe(false)
  })

  it('identifies global viewer correctly', () => {
    const viewer = withV2Role('global-viewer', READ_PERMS, { bypassEntityScope: true })
    expect(isGlobalViewer(viewer)).toBe(true)

    const admin = withV2Role('hr-admin', ALL_PERMS, { bypassEntityScope: true })
    expect(isGlobalViewer(admin)).toBe(false)
  })

  it('hasAdminRights delegates to isHRAdmin', () => {
    const admin = withV2Role('hr-admin', ALL_PERMS, { bypassEntityScope: true })
    expect(hasAdminRights(admin)).toBe(true)

    const editor = withV2Role('entity-editor', EDITOR_PERMS, { entityIds: ['e1'] })
    expect(hasAdminRights(editor)).toBe(false)
  })

  it('isMaterialManager checks materials:manage permission', () => {
    const materialMgr = withV2Role('material-manager', ['materials:read', 'materials:manage', 'materials:assign'], { bypassEntityScope: true })
    expect(isMaterialManager(materialMgr)).toBe(true)

    const viewer = withV2Role('entity-viewer', VIEWER_PERMS, { entityIds: ['e1'] })
    expect(isMaterialManager(viewer)).toBe(false)
  })
})

describe('RBAC v2 - Entity Access', () => {
  it('returns empty array for admin (means all entities)', () => {
    const admin = withV2Role('hr-admin', ALL_PERMS, { bypassEntityScope: true })
    expect(getAccessibleEntityIds(admin)).toEqual([])
  })

  it('returns empty array for global-viewer (means all entities)', () => {
    const viewer = withV2Role('global-viewer', READ_PERMS, { bypassEntityScope: true })
    expect(getAccessibleEntityIds(viewer)).toEqual([])
  })

  it('returns scoped entity IDs for entity-editor', () => {
    const editor = withV2Role('entity-editor', EDITOR_PERMS, { entityIds: ['e1', 'e2'] })
    expect(getAccessibleEntityIds(editor)).toEqual(['e1', 'e2'])
  })
})

describe('RBAC v2 - canEditEntity', () => {
  it('admin can edit any entity', () => {
    const admin = withV2Role('hr-admin', ALL_PERMS, { bypassEntityScope: true })
    expect(canEditEntity(admin, 'any-entity')).toBe(true)
  })

  it('entity-editor can only edit scoped entities', () => {
    const editor = withV2Role('entity-editor', EDITOR_PERMS, { entityIds: ['e1'] })
    expect(canEditEntity(editor, 'e1')).toBe(true)
    expect(canEditEntity(editor, 'e2')).toBe(false)
  })

  it('entity-viewer cannot edit', () => {
    const viewer = withV2Role('entity-viewer', VIEWER_PERMS, { entityIds: ['e1'] })
    expect(canEditEntity(viewer, 'e1')).toBe(false)
  })
})

describe('RBAC v2 - canViewEntity', () => {
  it('admin and global-viewer can view everything', () => {
    const admin = withV2Role('hr-admin', ALL_PERMS, { bypassEntityScope: true })
    const viewer = withV2Role('global-viewer', READ_PERMS, { bypassEntityScope: true })
    expect(canViewEntity(admin, 'any')).toBe(true)
    expect(canViewEntity(viewer, 'any')).toBe(true)
  })

  it('entity-viewer can only view scoped entities', () => {
    const viewer = withV2Role('entity-viewer', VIEWER_PERMS, { entityIds: ['e1'] })
    expect(canViewEntity(viewer, 'e1')).toBe(true)
    expect(canViewEntity(viewer, 'e2')).toBe(false)
  })
})

describe('RBAC v2 - filterStartersByRBAC', () => {
  it('returns unmodified where for admin', () => {
    const admin = withV2Role('hr-admin', ALL_PERMS, { bypassEntityScope: true })
    const where = { year: 2026 }
    expect(filterStartersByRBAC(admin, where)).toEqual({ year: 2026 })
  })

  it('adds entityId filter for scoped editor', () => {
    const editor = withV2Role('entity-editor', EDITOR_PERMS, { entityIds: ['e1'] })
    const result = filterStartersByRBAC(editor, { year: 2026 })
    expect(result).toEqual({ year: 2026, entityId: { in: ['e1'] } })
  })

  it('returns empty scope for user without roles', () => {
    const noRole = { ...baseUser, roleAssignments: [], memberships: [] } as UserWithMemberships
    const result = filterStartersByRBAC(noRole, { year: 2026 })
    expect(result).toEqual({ year: 2026, entityId: { in: [] } })
  })
})
