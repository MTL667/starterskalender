import { Role } from '@prisma/client'
import 'next-auth'
import 'next-auth/jwt'

interface Membership {
  entityId: string
  entityName: string
  canEdit: boolean
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      role: Role
      tenantId?: string
      oid?: string
      memberships: Membership[]
      twoFAEnabled: boolean
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    role?: Role
    tenantId?: string
    oid?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role?: Role
    tenantId?: string
    oid?: string
    memberships?: Membership[]
  }
}
