'use client'

/**
 * Client-side RBAC v2 helpers. Gebruiken `session.user.perms` (flat lijst van
 * effectieve permission-keys) zoals gevuld in `lib/auth-options.ts`.
 *
 * Let op: dit is een UX-hint. Server-side blijft `requirePermission()` / de
 * field-filters in `lib/authz.ts` de autoritaire check.
 */

import { useSession } from 'next-auth/react'

export function usePermission(key: string): boolean {
  const { data: session } = useSession()
  const perms = ((session?.user as any)?.perms as string[] | undefined) ?? []
  return perms.includes(key)
}

export function useAnyPermission(keys: string[]): boolean {
  const { data: session } = useSession()
  const perms = ((session?.user as any)?.perms as string[] | undefined) ?? []
  return keys.some((k) => perms.includes(k))
}

export function useAllPermissions(keys: string[]): boolean {
  const { data: session } = useSession()
  const perms = ((session?.user as any)?.perms as string[] | undefined) ?? []
  return keys.every((k) => perms.includes(k))
}
