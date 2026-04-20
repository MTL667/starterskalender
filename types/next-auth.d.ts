import { LegacyRole } from '@prisma/client'
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
      role: LegacyRole // @deprecated — backwards-compat alias, blijft populated via legacyRole
      permissions: string[] // @deprecated — legacyPermissions
      perms: string[] // RBAC v2: flat lijst van permission-keys
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
    role?: LegacyRole
    tenantId?: string
    oid?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role?: LegacyRole // @deprecated
    permissions?: string[] // @deprecated
    perms?: string[] // RBAC v2
    tenantId?: string
    oid?: string
    memberships?: Membership[]
  }
}
