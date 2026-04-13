import { vi } from 'vitest'
import { createMockUser } from '../factories/user.factory'

type UserRole = 'HR_ADMIN' | 'GLOBAL_VIEWER' | 'ENTITY_EDITOR' | 'ENTITY_VIEWER' | 'NONE'

/**
 * Mock getCurrentUser to return a specific user for the duration of a test.
 * Call in beforeEach or at the start of individual tests.
 */
export function mockCurrentUser(role: UserRole = 'HR_ADMIN', overrides = {}) {
  const user = createMockUser({ role, ...overrides })

  vi.doMock('@/lib/auth-utils', () => ({
    getCurrentUser: vi.fn().mockResolvedValue(user),
    requireAuth: vi.fn().mockResolvedValue(user),
    requireAdmin: vi.fn().mockResolvedValue(user),
    requireGlobalViewer: vi.fn().mockResolvedValue(user),
    requireEntityAccess: vi.fn().mockResolvedValue(user),
    canMutateStarter: vi.fn().mockReturnValue(role === 'HR_ADMIN' || role === 'ENTITY_EDITOR'),
  }))

  return user
}

export function mockUnauthenticated() {
  vi.doMock('@/lib/auth-utils', () => ({
    getCurrentUser: vi.fn().mockResolvedValue(null),
    requireAuth: vi.fn().mockRejectedValue(new Error('Unauthorized')),
    requireAdmin: vi.fn().mockRejectedValue(new Error('Forbidden')),
    requireGlobalViewer: vi.fn().mockRejectedValue(new Error('Forbidden')),
    requireEntityAccess: vi.fn().mockRejectedValue(new Error('Forbidden')),
    canMutateStarter: vi.fn().mockReturnValue(false),
  }))
}
