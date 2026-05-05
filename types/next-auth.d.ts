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
      perms: string[]
      tenantId?: string
      oid?: string
      memberships: Membership[]
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    tenantId?: string
    oid?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    perms?: string[]
    tenantId?: string
    oid?: string
    memberships?: Membership[]
  }
}
