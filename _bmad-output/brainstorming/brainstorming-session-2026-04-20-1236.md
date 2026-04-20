---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'Granulair, configureerbaar rechten- en rollenmodel (dynamische permission groups)'
session_goals: 'Ontwerp een flexibel authZ-systeem dat hardcoded Role/Permission checks vervangt, met beheerbare rechtengroepen, gescopete rechten (entity/feature/actie) en een veilig migratiepad.'
selected_approach: 'RBAC v2: globaal gedefinieerde rollen met permissions per `resource:action(:field)`, toegewezen aan users met entity-scope op het toekenningsniveau. Big-bang migratie via seeded system roles.'
techniques_used: ['Assumption surfacing', 'Persona stress-testing', 'Layered decomposition']
ideas_generated: 12
context_file: ''
---

# Brainstorming Session Results

**Facilitator:** Kevin
**Date:** 2026-04-20

## Session Overview

**Topic:** Granulair, configureerbaar rechten- en rollenmodel

**Drijfveer:** Toekomstvast maken (niet reactief). Vandaag zit elke recht-check hardcoded — nieuwe rollen vereisen een deployment. We willen dat HR-admins via de UI rollen kunnen samenstellen uit fijnmazige permissions.

## 1. Convergentie-antwoorden

| # | Vraag | Keuze |
|---|-------|-------|
| 1 | Probleem-framing | Toekomstvast: granulaire rechten moeten straks op groepniveau kunnen |
| 2 | Granulariteit | Per `resource:action`, met veld-scoping als eerste uitbreiding (salaris) |
| 3 | Scope-model | Rollen zijn globaal gedefinieerd; scope zit op de toekenning |
| 4 | Entity-scoping | Toekenningen dragen een `entityIds[]` (leeg = alle entiteiten). Vervangt `Membership` |
| 5 | Persona-stresstest | Alle 6 scenario's moeten werken; expiry is fase 2 |
| 6 | Meerdere rollen per user | Ja — union van permissions over alle toekenningen |
| 7 | Seeded system roles | Ja — huidige 5 rollen 1-op-1 als seeded rollen, niet verwijderbaar, permissions bewerkbaar |
| 8 | Veld-permissies | Unified keys (`starters:read:salary`) — geen aparte FieldPermission tabel |
| 9 | Migratiepad | Big-bang op feature branch, één gecoördineerde deploy |

## 2. Definitief datamodel

```prisma
// Catalogus van alle bestaande permission-keys in de applicatie.
// Geseed door de app; beheerders kennen ze toe aan rollen maar maken geen nieuwe aan.
model Permission {
  key         String  @id                 // "starters:read", "starters:update:salary", …
  description String?
  category    String                       // "starters" | "tasks" | "materials" | "admin" | "users" | …
  isFieldLevel Boolean @default(false)     // UI-hint: toon onder "veld-permissies"

  roles       RolePermission[]
}

// Rechtengroep = "Rol" in UI-taal. Globaal gedefinieerd.
model Role {
  id           String   @id @default(cuid())
  key          String   @unique            // "hr-admin", "marketing-operator", …
  name         String                       // vertaalbaar label voor UI
  description  String?
  isSystem     Boolean  @default(false)     // seeded, niet verwijderbaar (permissions wel bewerkbaar)
  bypassEntityScope Boolean @default(false) // HR-admin-stijl all-access, trumpt entityIds
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  permissions  RolePermission[]
  assignments  UserRoleAssignment[]
}

model RolePermission {
  roleId        String
  permissionKey String
  role          Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission    Permission @relation(fields: [permissionKey], references: [key])
  @@id([roleId, permissionKey])
}

// Toekenning van een rol aan een user, met entity-scope.
model UserRoleAssignment {
  id          String    @id @default(cuid())
  userId      String
  roleId      String
  entityIds   String[]  @default([])        // leeg = alle entiteiten
  grantedAt   DateTime  @default(now())
  grantedById String?
  expiresAt   DateTime?                      // fase 2, kolom wél meteen meenemen

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  role        Role      @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@unique([userId, roleId])                 // 1 toekenning per (user, rol); scope in entityIds
  @@index([userId])
  @@index([roleId])
}
```

### Wat verdwijnt

- `enum Role` op `prisma/schema.prisma` → vervangen door `Role` model (naam collision; rename enum kolom op `User` naar `legacyRole` tijdens transitie, weggooien na cutover).
- `User.permissions: String[]` → niet meer gebruikt.
- `Membership` model (en `canEdit`) → geabsorbeerd door `UserRoleAssignment.entityIds`.

### Wat blijft

- `Entity` model en koppelingen naar `Starter`/`Task` blijven ongewijzigd.
- `authOptions` / NextAuth-integratie blijft — enkel de post-login role-resolution verandert.

## 3. Initiële permission-taxonomie

Keys volgen het patroon `<resource>:<action>[:<field>]`. Niet alle resources hebben alle acties.

### Categorie `starters`
- `starters:read` — lijst en detail
- `starters:create`
- `starters:update`
- `starters:delete`
- `starters:read:salary` *(veld)*
- `starters:read:bankaccount` *(veld, toekomstig)*
- `starters:export`

### Categorie `tasks`
- `tasks:read` — alle taken zien
- `tasks:read:assigned` — enkel eigen toegewezen taken
- `tasks:update`
- `tasks:complete`
- `tasks:reassign`
- `tasks:upload`

### Categorie `materials`
- `materials:read`
- `materials:manage` — CRUD + bulk
- `materials:assign`

### Categorie `admin`
- `admin:users:read`
- `admin:users:manage`
- `admin:entities:manage`
- `admin:roles:manage` — beheert dit systeem zelf
- `admin:templates:manage` — email-, task-, signature-templates
- `admin:system:settings`
- `admin:audit:read`

### Categorie `reporting`
- `reporting:kpi:read`
- `reporting:export`

> Deze lijst is de **seed**. Dev voegt een key toe → migratie + seed-entry. Admins kunnen bestaande keys toewijzen aan rollen via UI, maar geen nieuwe keys maken (die zijn code-gedreven — anders krijg je "dood" rechten die nergens gecheckt worden).

## 4. Seeded system roles

| Role key | Naam (NL) | Bypass entity scope | Permissions |
|----------|-----------|---------------------|-------------|
| `hr-admin` | HR Administrator | ✓ | `*` (alle) |
| `global-viewer` | Globale lezer | ✓ | alle `:read`-keys |
| `entity-editor` | Entiteit-beheerder | ✗ | `starters:*` (excl. `:salary`), `tasks:*`, `materials:read`, `reporting:kpi:read` |
| `entity-viewer` | Entiteit-lezer | ✗ | `starters:read`, `tasks:read`, `materials:read` |
| `material-manager` | Materiaalbeheerder | ✓ | `materials:manage`, `materials:assign`, `materials:read` |
| `none` | Geen toegang | n.v.t. | — (gebruiker krijgt geen toekenning; blijft "pending") |

**Custom rollen** die Kevin meteen wil kunnen maken:
- `marketing-operator` → `tasks:read`, `tasks:complete`, `tasks:upload`, `tasks:read:assigned`, `starters:read`
- `task-assignee` → `tasks:read:assigned`, `tasks:complete`, `tasks:upload`
- `salary-viewer` → `starters:read`, `starters:read:salary` *(met `expiresAt` voor externe boekhouder)*

## 5. Centrale API (code-patroon)

```typescript
// lib/authz.ts  (nieuw)

export async function can(
  user: UserWithRoles,
  permission: string,
  context?: { entityId?: string }
): Promise<boolean> {
  for (const assignment of user.roleAssignments) {
    if (assignment.expiresAt && assignment.expiresAt < new Date()) continue
    if (!roleHasPermission(assignment.role, permission)) continue
    if (assignment.role.bypassEntityScope) return true
    if (assignment.entityIds.length === 0) return true           // globaal toegekend
    if (context?.entityId && assignment.entityIds.includes(context.entityId)) return true
  }
  return false
}

export async function require(permission: string, context?: { entityId?: string }) {
  const user = await requireAuth()
  if (!(await can(user, permission, context))) {
    throw new Error(`Forbidden: missing ${permission}`)
  }
  return user
}

export async function visibleEntityIds(user: UserWithRoles, permission: string): Promise<string[] | 'ALL'> {
  let collected = new Set<string>()
  for (const assignment of user.roleAssignments) {
    if (!roleHasPermission(assignment.role, permission)) continue
    if (assignment.role.bypassEntityScope || assignment.entityIds.length === 0) return 'ALL'
    assignment.entityIds.forEach(id => collected.add(id))
  }
  return [...collected]
}

export function visibleFields(user: UserWithRoles, resource: string): Set<string> {
  // Intern: kijkt welke ":field"-permissies de user heeft voor gegeven resource
  // Handig voor UI om bv. het salaris-veld te tonen/verbergen
}
```

**Impact op bestaande helpers:**
- `lib/rbac.ts` → wordt een thin adapter die naar `can()` delegeert, **of** wordt gewoon verwijderd en vervangen door directe calls naar `can()`. Voorstel: verwijder na cutover.
- `lib/auth-utils.ts` → behoudt `getCurrentUser`/`requireAuth`, verwijdert `requireAdmin`/`requireMaterialManager`/`requireGlobalViewer`. Alle call-sites migreren naar `require('admin:...' of specifieke key)`.

## 6. Migratieplan (big-bang)

### Branch: `feat/rbac-v2`

**Stap 1 — Schema + seed**
1. Voeg `Permission`, `Role`, `RolePermission`, `UserRoleAssignment` toe aan `prisma/schema.prisma`.
2. Rename kolom `User.role` naar `User.legacyRole` (tijdelijk). Kolom `User.permissions` blijft even staan.
3. `prisma migrate dev` → nieuwe migration file.
4. Nieuwe seed: `prisma/seed-rbac.ts`
   - Seed alle permissions uit sectie 3.
   - Seed de 6 system roles uit sectie 4 met bijhorende permissions.
5. Backfill-script `prisma/backfill-rbac.ts`:
   - Voor elke `User` met `legacyRole = HR_ADMIN` → `UserRoleAssignment(role: hr-admin, entityIds: [])`.
   - Voor `GLOBAL_VIEWER` → `UserRoleAssignment(role: global-viewer, entityIds: [])`.
   - Voor `ENTITY_EDITOR`/`ENTITY_VIEWER` → één `UserRoleAssignment` naar resp. `entity-editor`/`entity-viewer`, met `entityIds` = alle `Membership.entityId` waar `canEdit` matcht.
   - Voor users met `permissions` bevat `MATERIAL_MANAGER` → extra `UserRoleAssignment(role: material-manager, entityIds: [])`.
   - `NONE` → geen toekenning.
6. Verificatie-script: print per user zijn oude vs nieuwe effectieve rechten en diff → zero divergence eisen vóór merge.

**Stap 2 — `lib/authz.ts` schrijven**
- Nieuwe `can()`, `require()`, `visibleEntityIds()`, `visibleFields()`.
- `getCurrentUser` aanpassen om `roleAssignments` (incl. nested role + permissions) te eager-loaden.

**Stap 3 — Refactor call-sites** (grootste werk, ~70 files)
- Volgorde: `lib/auth-utils.ts` → API-routes (`app/api/**`) → server components (`app/(authenticated)/**`) → client components.
- **Mechanische mapping** (kan grotendeels met codemod):

| Oud | Nieuw |
|-----|-------|
| `requireAdmin()` | `require('admin:users:manage')` (of specifieker per route) |
| `requireGlobalViewer()` | `require('starters:read')` + `visibleEntityIds` |
| `requireMaterialManager()` | `require('materials:manage')` |
| `isHRAdmin(user)` | `await can(user, 'admin:users:manage')` |
| `isMaterialManager(user)` | `await can(user, 'materials:manage')` |
| `canEditEntity(user, id)` | `await can(user, 'starters:update', { entityId: id })` |
| `canViewEntity(user, id)` | `await can(user, 'starters:read', { entityId: id })` |
| `filterStartersByRBAC(user, where)` | `const ids = await visibleEntityIds(user, 'starters:read'); ids === 'ALL' ? where : { ...where, entityId: { in: ids } }` |

- Per route expliciet de juiste permission kiezen (niet alles onder `admin:users:manage` kwakken).

**Stap 4 — Admin UI**
- `/admin/roles` → lijst van alle rollen met kleurlabel system/custom, zoek, create.
- `/admin/roles/[id]` → rol-detail met permission-checkboxen gegroepeerd per category, `bypassEntityScope` toggle, rename, delete (niet voor system).
- `/admin/users/[id]` → sectie "Rollen" met lijst van `UserRoleAssignment`, add-button met role-selector + entity-selector (met "alle entiteiten"-optie).
- Vervangt huidige user-admin page's role-dropdown.

**Stap 5 — Veld-permissies UI**
- In starter-detail component: `if (can(user, 'starters:read:salary')) ...` — salaris-veld tonen/verbergen.
- In API `/api/starters/[id]`: filter het salaris-veld uit de response als user de permission niet heeft (server-side truth, niet alleen UI).

**Stap 6 — Cleanup (ná cutover, paar dagen monitoring)**
- `lib/rbac.ts` verwijderen (of volledig stubben).
- `User.legacyRole` + `User.permissions` droppen in volgende migration.
- `Membership` + `canEdit` droppen.
- `@prisma/client` regenereren.

### Rollback-plan
- DB-snapshot vóór migratie.
- Feature branch merge in één deploy; als iets breekt: `git revert` + rollback migration (down-migration zet kolommen terug + behoudt `UserRoleAssignment` data).
- `legacyRole` kolom bewaart oude rol-data → instant fallback mogelijk in 24u-window.

## 7. Fase-splitsing

### Fase 1 (de big-bang deploy)
- Schema + backfill + system roles seeded
- `can()` + `require()` API live
- Refactor van alle call-sites
- Admin UI voor **system roles** permissie-assignering en **user → role toekenning met entity-scope**
- Salaris veld-permissie werkend (eerste use case)

### Fase 2 (iteratief, weken later)
- Custom role creation-UI (nieuwe rollen aanmaken, rename, delete)
- `expiresAt` op toekenningen + UI voor tijdelijke toegang
- Audit-log rond permission changes
- Permission catalogus-browser (welke rol heeft permission X?)
- Bulk-toekenning ("geef deze 10 users allen rol Y voor entiteit Z")

### Fase 3 (speculatief)
- Deny-rules (expliciete uitsluitingen)
- Object-level permissions (per starter ipv per entity)
- OAuth / SCIM-sync met Entra ID group memberships

## 8. Risico's & mitigaties

| Risico | Mitigatie |
|--------|-----------|
| Iemand verliest toegang door bug in backfill | Verificatie-script verplicht vóór merge; `legacyRole` blijft kolom voor 2 weken |
| Trage permission-checks (N+1) | `roleAssignments.role.permissions` eager-loaden bij login; session cache in NextAuth JWT |
| "Dood" permission-keys in DB | Seed is source of truth; post-deploy check vergelijkt `Permission.key` met geregistreerde keys in `lib/authz-registry.ts` en waarschuwt |
| UI toont features die user niet mag gebruiken | `can()` helper ook client-side bruikbaar maken via session-embedded permission lijst; server valideert altijd |
| Circular role-editing (iemand neemt zichzelf `admin:roles:manage` af) | Blokkade: laatste assignment met `admin:roles:manage` kan niet verwijderd worden door dezelfde user |

## 9. Volgende stap

Converge-document klaar. Wanneer Kevin "go" zegt: nieuwe sessie in **build-modus** die dit document als input neemt en start met Stap 1 (schema + seed + backfill-script) op feature branch `feat/rbac-v2`.

