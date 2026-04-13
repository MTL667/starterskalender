type UserRole = 'HR_ADMIN' | 'GLOBAL_VIEWER' | 'ENTITY_EDITOR' | 'ENTITY_VIEWER' | 'NONE'

interface MockUser {
  id: string
  email: string
  name: string
  role: UserRole
  locale: string
  tenantId: string | null
  entityMemberships: Array<{ entityId: string; role: string }>
}

let counter = 0

export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  counter++
  return {
    id: `user-${counter}`,
    email: `user${counter}@test.local`,
    name: `Test User ${counter}`,
    role: 'HR_ADMIN',
    locale: 'nl',
    tenantId: 'test-tenant-id',
    entityMemberships: [],
    ...overrides,
  }
}

export function createAdminUser(overrides: Partial<MockUser> = {}): MockUser {
  return createMockUser({ role: 'HR_ADMIN', name: 'Admin User', ...overrides })
}

export function createViewerUser(overrides: Partial<MockUser> = {}): MockUser {
  return createMockUser({ role: 'GLOBAL_VIEWER', name: 'Viewer User', ...overrides })
}

export function createEntityEditorUser(entityId: string, overrides: Partial<MockUser> = {}): MockUser {
  return createMockUser({
    role: 'ENTITY_EDITOR',
    name: 'Entity Editor',
    entityMemberships: [{ entityId, role: 'EDITOR' }],
    ...overrides,
  })
}
