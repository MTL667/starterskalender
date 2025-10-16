import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth-options'
import { prisma } from './prisma'
import { UserWithMemberships } from './rbac'

/**
 * Haalt de huidige gebruiker op met memberships
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
    },
  })
  
  return user
}

/**
 * Vereist dat de gebruiker is ingelogd
 */
export async function requireAuth(): Promise<UserWithMemberships> {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error('Unauthorized')
  }
  
  return user
}

/**
 * Vereist dat de gebruiker HR_ADMIN is
 */
export async function requireAdmin(): Promise<UserWithMemberships> {
  const user = await requireAuth()
  
  if (user.role !== 'HR_ADMIN') {
    throw new Error('Forbidden: Admin rights required')
  }
  
  return user
}

