/**
 * Authorization registry — source of truth voor alle permission-keys die in
 * de applicatie gecheckt worden. De seed synchroniseert deze lijst naar de
 * `Permission` tabel; `lib/authz.ts` matcht tegen deze keys.
 *
 * Nieuwe permission? Voeg hier toe + run `npm run seed:rbac` → check wordt live.
 * Bestaande keys NIET hernoemen (breekt role-assignments). Gebruik deprecation
 * via een nieuwe key + migratie van role-toekenningen.
 */

export type PermissionCategory =
  | 'starters'
  | 'tasks'
  | 'materials'
  | 'admin'
  | 'reporting'

export interface PermissionDefinition {
  key: string
  description: string
  category: PermissionCategory
  isFieldLevel?: boolean
}

export const PERMISSIONS: readonly PermissionDefinition[] = [
  // ── Starters ──────────────────────────────────────────────────────────────
  { key: 'starters:read', category: 'starters', description: 'Starters bekijken (lijst + detail)' },
  { key: 'starters:create', category: 'starters', description: 'Nieuwe starters aanmaken' },
  { key: 'starters:update', category: 'starters', description: 'Starters bewerken' },
  { key: 'starters:delete', category: 'starters', description: 'Starters verwijderen of annuleren' },
  { key: 'starters:export', category: 'starters', description: 'Starters-data exporteren' },
  { key: 'starters:read:salary', category: 'starters', description: 'Salarisveld zien en bewerken', isFieldLevel: true },
  { key: 'starters:read:bankaccount', category: 'starters', description: 'Bankrekening zien en bewerken', isFieldLevel: true },

  // ── Tasks ─────────────────────────────────────────────────────────────────
  { key: 'tasks:read', category: 'tasks', description: 'Alle taken bekijken' },
  { key: 'tasks:read:assigned', category: 'tasks', description: 'Enkel eigen toegewezen taken bekijken' },
  { key: 'tasks:create', category: 'tasks', description: 'Taken handmatig aanmaken' },
  { key: 'tasks:update', category: 'tasks', description: 'Taken bewerken' },
  { key: 'tasks:complete', category: 'tasks', description: 'Taken voltooien' },
  { key: 'tasks:reassign', category: 'tasks', description: 'Taken hertoewijzen aan andere gebruiker' },
  { key: 'tasks:upload', category: 'tasks', description: 'Bestanden uploaden bij taken' },
  { key: 'tasks:regenerate', category: 'tasks', description: 'Automatische taken opnieuw genereren voor starter' },

  // ── Materials ─────────────────────────────────────────────────────────────
  { key: 'materials:read', category: 'materials', description: 'Materiaal-catalogus bekijken' },
  { key: 'materials:manage', category: 'materials', description: 'Materialen CRUD + bulk-operaties' },
  { key: 'materials:assign', category: 'materials', description: 'Materialen toewijzen aan starters' },

  // ── Admin ─────────────────────────────────────────────────────────────────
  { key: 'admin:users:read', category: 'admin', description: 'Gebruikers en hun rollen bekijken' },
  { key: 'admin:users:manage', category: 'admin', description: 'Gebruikers beheren (rol-toekenningen, status)' },
  { key: 'admin:entities:manage', category: 'admin', description: 'Entiteiten beheren' },
  { key: 'admin:roles:manage', category: 'admin', description: 'Rollen en permissies beheren (dit systeem zelf)' },
  { key: 'admin:templates:manage', category: 'admin', description: 'Email-, task- en signature-templates beheren' },
  { key: 'admin:system:settings', category: 'admin', description: 'Systeemconfiguratie (branding, mail, allowed tenants)' },
  { key: 'admin:audit:read', category: 'admin', description: 'Audit-logs inzien' },
  { key: 'admin:cron:trigger', category: 'admin', description: 'Cron-jobs manueel triggeren' },

  // ── Reporting ─────────────────────────────────────────────────────────────
  { key: 'reporting:kpi:read', category: 'reporting', description: 'KPI-dashboard bekijken' },
  { key: 'reporting:export', category: 'reporting', description: 'Rapporten exporteren' },
]

export type PermissionKey = string

const KEY_SET: ReadonlySet<string> = new Set(PERMISSIONS.map((p) => p.key))

/** Runtime-check of een string een bekende permission-key is. */
export function isKnownPermission(key: string): key is PermissionKey {
  return KEY_SET.has(key)
}

/** Alle veld-permissies voor een gegeven resource (bv. "starters" → ["starters:read:salary", …]). */
export function fieldPermissionsFor(resource: string): string[] {
  return PERMISSIONS.filter((p) => p.isFieldLevel && p.key.startsWith(`${resource}:`)).map((p) => p.key)
}
