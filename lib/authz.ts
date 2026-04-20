/**
 * RBAC v2 — Central authorization API.
 *
 * Alle permission-checks in de app gaan via `can()` / `require()`. De oude
 * helpers in `lib/rbac.ts` en `lib/auth-utils.ts` delegeren hier ook naartoe
 * tijdens de migratiefase en worden daarna weggehaald.
 *
 * Design:
 * - Rollen zijn globaal gedefinieerd.
 * - Scope zit op de toekenning (`UserRoleAssignment.entityIds`, leeg = alle).
 * - `bypassEntityScope` op een rol trumpt altijd (HR-admin stijl).
 * - `expiresAt` filtert verlopen toekenningen automatisch weg.
 */

import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth-options'
import { prisma } from './prisma'
import { fieldPermissionsFor, isKnownPermission } from './authz-registry'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LoadedPermission {
  key: string
}

export interface LoadedRole {
  id: string
  key: string
  name: string
  isSystem: boolean
  bypassEntityScope: boolean
  permissions: LoadedPermission[]
}

export interface LoadedRoleAssignment {
  id: string
  entityIds: string[]
  expiresAt: Date | null
  role: LoadedRole
}

export interface AuthorizedUser {
  id: string
  email: string
  name: string | null
  locale: string
  status: 'INVITED' | 'ACTIVE' | 'SUSPENDED'
  roleAssignments: LoadedRoleAssignment[]
}

/** Prisma include om alle data voor authz-checks eager-te laden. */
export const ROLE_ASSIGNMENTS_INCLUDE = {
  roleAssignments: {
    include: {
      role: {
        include: {
          permissions: { select: { permissionKey: true } },
        },
      },
    },
  },
} as const

/**
 * Normaliseer een Prisma-user (met `roleAssignments.role.permissions`) tot
 * de compactere `AuthorizedUser` shape die de rest van de code gebruikt.
 */
export function toAuthorizedUser(user: any): AuthorizedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    locale: user.locale,
    status: user.status,
    roleAssignments: (user.roleAssignments ?? []).map((ra: any) => ({
      id: ra.id,
      entityIds: ra.entityIds ?? [],
      expiresAt: ra.expiresAt ?? null,
      role: {
        id: ra.role.id,
        key: ra.role.key,
        name: ra.role.name,
        isSystem: ra.role.isSystem,
        bypassEntityScope: ra.role.bypassEntityScope,
        permissions: (ra.role.permissions ?? []).map((p: any) => ({
          key: p.permissionKey ?? p.key,
        })),
      },
    })),
  }
}

// ─── Core checks ─────────────────────────────────────────────────────────────

function activeAssignments(user: AuthorizedUser): LoadedRoleAssignment[] {
  const now = Date.now()
  return user.roleAssignments.filter(
    (ra) => !ra.expiresAt || ra.expiresAt.getTime() > now,
  )
}

function roleHasPermission(role: LoadedRole, permission: string): boolean {
  return role.permissions.some((p) => p.key === permission)
}

/**
 * Check of een user een specifieke permission heeft, optioneel binnen een entity-context.
 *
 * - Zonder `entityId`: check enkel dat de user de permission heeft (voor ten-minste 1 entity of globaal).
 *   Gebruik dit voor generieke UI-guards ("mag deze user überhaupt X?").
 * - Met `entityId`: check dat de user de permission heeft voor exact die entity
 *   (globaal-toegekend óf `entityId` zit in `entityIds` óf rol heeft `bypassEntityScope`).
 */
export function can(
  user: AuthorizedUser | null,
  permission: string,
  context?: { entityId?: string | null },
): boolean {
  if (!user) return false
  if (process.env.NODE_ENV !== 'production' && !isKnownPermission(permission)) {
    // Foutdetectie: voorkom typo's in permission-keys tijdens dev
    console.warn(`[authz] Unknown permission checked: "${permission}"`)
  }

  for (const assignment of activeAssignments(user)) {
    if (!roleHasPermission(assignment.role, permission)) continue
    if (assignment.role.bypassEntityScope) return true
    if (assignment.entityIds.length === 0) return true // globaal toegekend
    if (context?.entityId == null) return true // geen entity-filter gevraagd, rol matcht → ok
    if (assignment.entityIds.includes(context.entityId)) return true
  }
  return false
}

/**
 * Zoals `can()` maar gooit een Error met duidelijke message bij falen.
 * Gebruik in API-routes zodat 403-handling uniform blijft.
 */
export async function requirePermission(
  permission: string,
  context?: { entityId?: string | null },
): Promise<AuthorizedUser> {
  const user = await getCurrentAuthorizedUser()
  if (!user) throw new Error('Unauthorized: Not logged in')
  if (user.status !== 'ACTIVE' && user.status !== 'INVITED') {
    throw new Error('Forbidden: Your account is not active')
  }
  if (!can(user, permission, context)) {
    throw new Error(`Forbidden: missing permission "${permission}"`)
  }
  return user
}

/**
 * Variant voor gevallen waar de caller al een user-object geladen heeft.
 * Handig in server-components die `getCurrentAuthorizedUser()` al hebben gedaan.
 */
export function requirePermissionOn(
  user: AuthorizedUser | null,
  permission: string,
  context?: { entityId?: string | null },
): AuthorizedUser {
  if (!user) throw new Error('Unauthorized: Not logged in')
  if (!can(user, permission, context)) {
    throw new Error(`Forbidden: missing permission "${permission}"`)
  }
  return user
}

/**
 * Verzamel alle entity-IDs waar de user een specifieke permission heeft.
 * Return:
 *  - `'ALL'`: de user heeft de permission globaal (gebruik géén entity-filter in queries).
 *  - `string[]`: exacte lijst van entity-IDs (gebruik `{ entityId: { in: ids } }`).
 */
export function visibleEntityIds(
  user: AuthorizedUser | null,
  permission: string,
): 'ALL' | string[] {
  if (!user) return []
  const collected = new Set<string>()
  for (const assignment of activeAssignments(user)) {
    if (!roleHasPermission(assignment.role, permission)) continue
    if (assignment.role.bypassEntityScope || assignment.entityIds.length === 0) return 'ALL'
    assignment.entityIds.forEach((id) => collected.add(id))
  }
  return [...collected]
}

/**
 * Pas een Prisma `where`-clause aan zodat enkel entity-IDs overblijven waar
 * de user `permission` heeft. Gebruikt de `field` sleutel als naam van de
 * entity-kolom (default `entityId`).
 */
export function scopeWhereByPermission<T extends Record<string, any>>(
  user: AuthorizedUser | null,
  permission: string,
  where: T = {} as T,
  field: string = 'entityId',
): T {
  const scope = visibleEntityIds(user, permission)
  if (scope === 'ALL') return where
  return { ...where, [field]: { in: scope } } as T
}

/**
 * Retourneer de set veld-permissies die deze user HEEFT voor een resource.
 * Bv. voor resource `'starters'`, als user `starters:read:salary` heeft,
 * komt `'starters:read:salary'` in de set terug.
 *
 * Gebruik dit om velden selectief in/uit te laten in API-responses.
 */
export function visibleFieldPermissions(
  user: AuthorizedUser | null,
  resource: string,
  context?: { entityId?: string | null },
): Set<string> {
  const all = fieldPermissionsFor(resource)
  const visible = new Set<string>()
  for (const key of all) {
    if (can(user, key, context)) visible.add(key)
  }
  return visible
}

// ─── Field-level filtering ───────────────────────────────────────────────────

/**
 * Mapping tussen een resource-veldnaam en de permissie-key die vereist is
 * om dat veld te mogen zien/bewerken. Uitbreidbaar per resource.
 *
 * Opmerking: veld-permissies controleren zowel READ als WRITE toegang; wie
 * het veld niet mag zien, mag het ook niet schrijven.
 */
export const FIELD_PERMISSIONS: Record<string, Record<string, string>> = {
  starters: {
    salary: 'starters:read:salary',
    salaryCurrency: 'starters:read:salary',
    bankAccount: 'starters:read:bankaccount',
  },
}

/**
 * Verwijdert uit een record alle velden waarvoor de user geen field-permissie
 * heeft. Geeft een nieuw object terug, origineel blijft ongewijzigd.
 *
 * ```ts
 * const safe = sanitizeFields(starter, user, 'starters')
 * return NextResponse.json(safe)
 * ```
 */
export function sanitizeFields<T extends Record<string, any>>(
  record: T | null | undefined,
  user: AuthorizedUser | null,
  resource: string,
  context?: { entityId?: string | null },
): T | null | undefined {
  if (!record) return record
  const map = FIELD_PERMISSIONS[resource]
  if (!map) return record
  const granted = visibleFieldPermissions(user, resource, context)
  const result: Record<string, any> = { ...record }
  for (const [field, permKey] of Object.entries(map)) {
    if (!granted.has(permKey)) {
      delete result[field]
    }
  }
  return result as T
}

/** Bulk-variant van `sanitizeFields`. Contextloze scope (list-response). */
export function sanitizeFieldsList<T extends Record<string, any>>(
  records: T[],
  user: AuthorizedUser | null,
  resource: string,
): T[] {
  const map = FIELD_PERMISSIONS[resource]
  if (!map) return records
  return records.map((r) => {
    const entityId = (r as any).entityId ?? null
    return sanitizeFields(r, user, resource, { entityId }) as T
  })
}

/**
 * Strip velden uit een *input*-payload (PATCH/POST) waarvoor de user geen
 * write-permissie heeft. Retourneert de gesanitiseerde payload en, optioneel,
 * een lijst van genegeerde velden voor audit/warning.
 */
export function filterWritableFields<T extends Record<string, any>>(
  payload: T,
  user: AuthorizedUser | null,
  resource: string,
  context?: { entityId?: string | null },
): { data: T; dropped: string[] } {
  const map = FIELD_PERMISSIONS[resource]
  if (!map) return { data: payload, dropped: [] }
  const granted = visibleFieldPermissions(user, resource, context)
  const data: Record<string, any> = { ...payload }
  const dropped: string[] = []
  for (const [field, permKey] of Object.entries(map)) {
    if (field in data && !granted.has(permKey)) {
      delete data[field]
      dropped.push(field)
    }
  }
  return { data: data as T, dropped }
}

// ─── Session helpers ─────────────────────────────────────────────────────────

/**
 * Laadt de huidige user uit de sessie incl. alle roleAssignments + permissions.
 * Retourneert `null` als niet ingelogd.
 */
export async function getCurrentAuthorizedUser(): Promise<AuthorizedUser | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: ROLE_ASSIGNMENTS_INCLUDE,
  })
  if (!user) return null
  return toAuthorizedUser(user)
}

/**
 * Vereist een ingelogde, actieve user. Gooit 401/403 bij ontbreken.
 * Dit vervangt `requireAuth()` uit lib/auth-utils.ts.
 */
export async function requireAuthorized(): Promise<AuthorizedUser> {
  const user = await getCurrentAuthorizedUser()
  if (!user) throw new Error('Unauthorized: Not logged in')
  if (user.status === 'SUSPENDED') {
    throw new Error('Forbidden: Your account is suspended')
  }
  if (user.roleAssignments.length === 0) {
    throw new Error(
      'Forbidden: Your account has no roles assigned. Contact an administrator.',
    )
  }
  return user
}

// ─── Convenience: admin check ────────────────────────────────────────────────

/**
 * Shorthand voor "heeft admin-privileges" — true als een rol met
 * `bypassEntityScope` + `admin:users:manage` toegekend is.
 */
export function isAdmin(user: AuthorizedUser | null): boolean {
  return can(user, 'admin:users:manage')
}
