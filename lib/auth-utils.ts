import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth-options'
import { prisma } from './prisma'
import { UserWithMemberships, isMaterialManager } from './rbac'
import { can, visibleEntityIds, toAuthorizedUser } from './authz'

/**
 * Haalt de huidige gebruiker op met memberships + roleAssignments (RBAC v2).
 *
 * Het returned object heeft `role` als alias voor `legacyRole` om backwards-
 * compat te behouden met bestaande code die `user.role === 'HR_ADMIN'` doet.
 */
export async function getCurrentUser(): Promise<UserWithMemberships | null> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      memberships: {
        include: {
          entity: {
            select: { id: true, name: true },
          },
        },
      },
      roleAssignments: {
        include: {
          role: { include: { permissions: { select: { permissionKey: true } } } },
        },
      },
    },
  })

  if (!user) return null
  return {
    ...user,
    role: user.legacyRole,
  } as UserWithMemberships
}

/**
 * Vereist dat de gebruiker is ingelogd EN een actieve rol heeft (niet NONE zonder roleAssignments)
 */
export async function requireAuth(): Promise<UserWithMemberships> {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Unauthorized: Not logged in')
  }

  // Block users zonder rollen EN zonder legacy NONE-fallback
  const hasAnyRole =
    (user.roleAssignments?.length ?? 0) > 0 || user.legacyRole !== 'NONE'
  if (!hasAnyRole) {
    throw new Error(
      'Forbidden: Your account is pending approval. Contact an administrator.',
    )
  }

  return user
}

/**
 * Vereist dat de gebruiker admin rechten heeft.
 * Delegeert naar `can(user, 'admin:users:manage')` onder RBAC v2.
 */
export async function requireAdmin(): Promise<UserWithMemberships> {
  const user = await requireAuth()

  const authUser = toAuthorizedUser(user)
  if (!can(authUser, 'admin:users:manage')) {
    throw new Error('Forbidden: Admin rights required')
  }

  return user
}

/**
 * Vereist dat de gebruiker alle data mag zien (HR_ADMIN of GLOBAL_VIEWER-niveau).
 * @deprecated Gebruik `visibleEntityIds(user, 'starters:read') === 'ALL'` indien mogelijk.
 */
export async function requireGlobalViewer(): Promise<UserWithMemberships> {
  const user = await requireAuth()

  const authUser = toAuthorizedUser(user)
  if (visibleEntityIds(authUser, 'starters:read') !== 'ALL') {
    throw new Error('Forbidden: Global viewer rights required')
  }

  return user
}

/**
 * Check of gebruiker toegang heeft tot een specifieke entiteit.
 * Onder RBAC v2: delegeert naar `can(user, 'starters:read' | 'starters:update', { entityId })`.
 */
export async function hasEntityAccess(
  user: UserWithMemberships,
  entityId: string,
  requireEdit: boolean = false,
): Promise<boolean> {
  const authUser = toAuthorizedUser(user)
  const permission = requireEdit ? 'starters:update' : 'starters:read'
  return can(authUser, permission, { entityId })
}

/**
 * Vereist dat de gebruiker MATERIAL_MANAGER permission heeft.
 */
export async function requireMaterialManager(): Promise<UserWithMemberships> {
  const user = await requireAuth()

  const authUser = toAuthorizedUser(user)
  if (!can(authUser, 'materials:manage')) {
    // Backwards-compat: ook de legacy permissions check honoreren
    if (!isMaterialManager(user)) {
      throw new Error('Forbidden: Material manager permission required')
    }
  }

  return user
}

/**
 * Vereist toegang tot een specifieke entiteit.
 */
export async function requireEntityAccess(
  entityId: string,
  requireEdit: boolean = false,
): Promise<UserWithMemberships> {
  const user = await requireAuth()

  const hasAccess = await hasEntityAccess(user, entityId, requireEdit)

  if (!hasAccess) {
    throw new Error(
      requireEdit
        ? 'Forbidden: You do not have edit rights for this entity'
        : 'Forbidden: You do not have access to this entity',
    )
  }

  return user
}
