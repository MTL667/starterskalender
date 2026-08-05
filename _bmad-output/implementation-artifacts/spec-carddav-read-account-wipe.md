---
title: 'CardDAV read-account personal contact wipe'
type: 'feature'
created: '2026-08-05'
status: 'done'
baseline_commit: '06b0db6a1dd380c7bdf2566cd7b52b053d766643'
context:
  - docs/cronicle-setup.md
  - docs/project-context.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Per entity syncen we starters naar een Nextcloud MASTER address book (read-write). Jamf pusht aparte read-accounts die die book gedeeld krijgen (read-only). Op die read-accounts ontstaat ook het standaard persoonlijke adresboek `contacts` met contacten die daar niet horen.

**Approach:** Per entity een CardDAV read-account configureerbaar maken, en een uurlijkse cron die hard alle contacten wist in het vaste persoonlijke boek `contacts` van die read-user — nooit de gedeelde MASTER-book.

## Boundaries & Constraints

**Always:**
- Wipe-target is altijd het vaste Nextcloud-standaardboek `contacts` (geen apart configureerbaar adresboekveld).
- Weigeren te wissen als MASTER `cardDavAddressBook` (case-insensitive, getrimd) gelijk is aan `contacts`.
- Read-wachtwoorden AES-encrypted opslaan (zelfde `CARDDAV_ENCRYPTION_KEY` als MASTER).
- Cron beschermd met `verifyCronAuth` / `CRON_SECRET`.
- MASTER sync/delete/cleanup-gedrag ongewijzigd laten.
- Eén read-account config per entity (parity met bestaande MASTER-velden).

**Ask First:**
- Meer dan één read-account per entity nodig.
- Wipe-target wijzigen naar iets anders dan het vaste boek `contacts`.

**Never:**
- Contacten wissen via MASTER-credentials of in de gedeelde entity-book.
- Jamf/MDM-profielen of Nextcloud share-ACL’s aanpassen vanuit de app.
- Soft-delete lifecycle van starters wijzigen.
- Orphan-cleanup op MASTER (bestaande `carddav-cleanup` blijft soft-delete→hard-delete).
- Een UI-/DB-veld voor “welk adresboek wissen” — dat is hard `contacts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path | Read config complete; `contacts` has N `.vcf` | List UIDs → DELETE each → `{ wiped, failed }` | Per-contact failure telt als failed; rest gaat door |
| Empty book | Read config complete; 0 contacts | `{ wiped: 0, failed: 0 }` | N/A |
| Safety block | MASTER book == `contacts` | Skip entity; log warn; no DELETEs | Count as skipped, not failed |
| Incomplete config | Missing url/user/pass or wipe disabled | Skip entity | No remote calls |
| Auth/list fail | PROPFIND/REPORT fails | Entity failed; continue others | Log error; no partial blind deletes if list failed |
| Shared book 403 | Accidental DELETE on shared href | Treat as failed for that UID; continue | Must not abort whole run |
| Cron unauthorized | Missing/invalid secret | 401/403 from `verifyCronAuth` | No work |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- Entity MASTER CardDAV fields; extend with read-account fields (no read address-book column)
- `lib/carddav.ts` -- PROPFIND/REPORT + per-UID DELETE; add list + wipe helpers; constant `contacts`
- `lib/crypto.ts` -- encrypt/decrypt for passwords
- `lib/cron-auth.ts` -- Bearer/`?secret=` cron gate
- `app/api/entities/[id]/route.ts` -- PATCH MASTER CardDAV; extend for read fields
- `app/(authenticated)/admin/entities/page.tsx` -- CardDAV admin UI section
- `app/api/cron/carddav-cleanup/route.ts` -- pattern for batch cron + audit
- `app/api/cron/carddav-read-wipe/route.ts` -- NEW hourly wipe endpoint
- `docs/cronicle-setup.md` -- document Cronicle job `0 * * * *`
- `lib/audit.ts` -- add audit action for wipe runs
- `lib/authz-registry.ts` -- reuse `carddav:configure` for admin fields

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` -- Add Entity fields: `cardDavReadEnabled`, `cardDavReadUrl`, `cardDavReadUsername`, `cardDavReadPasswordEnc` (no `cardDavReadAddressBook`) -- credentials only; wipe book is code constant
- [x] `lib/carddav.ts` -- Constant `CARDDAV_READ_WIPE_BOOK = 'contacts'`; add `listContactUids(config)` and `wipeAddressBook(config)`; `decryptReadConfig` sets `addressBook` to that constant -- need list-all before wipe
- [x] `app/api/entities/[id]/route.ts` (+ test route if needed) -- Accept/persist read fields with encrypt; never return plaintext; expose `cardDavReadPasswordSet` -- admin can configure after MASTER setup
- [x] `app/(authenticated)/admin/entities/page.tsx` -- UI block “Read-account (Jamf)”: enable, URL, user, password; note that wipe altijd `contacts` raakt -- make config operable
- [x] `app/api/cron/carddav-read-wipe/route.ts` -- GET cron: entities with `cardDavReadEnabled`, skip if MASTER book is `contacts`, wipe read-user `contacts`, audit summary -- hourly cleanup
- [x] `lib/audit.ts` -- Add `CARDDAV_READ_WIPE` action -- observability
- [x] `docs/cronicle-setup.md` -- Register job hourly `0 * * * *` → `/api/cron/carddav-read-wipe` -- ops can schedule
- [x] Unit tests for safety (MASTER book `contacts` → skip) and I/O edge cases -- lock invariants

**Acceptance Criteria:**
- Given an entity with MASTER book `EntityA` and a configured read-account, when the cron runs, then only contacts under the read-user’s `contacts` book are deleted.
- Given MASTER `cardDavAddressBook` is `contacts`, when the cron runs, then that entity is skipped with no DELETE calls.
- Given `carddav:configure`, when an admin saves read-account fields, then the password is stored encrypted and never returned in API responses.
- Given Cronicle calls the endpoint hourly with `CRON_SECRET`, when authorized, then the handler returns `{ ok: true, wiped, failed, skipped }` aggregates.
- Given MASTER CardDAV sync/cleanup, when this feature ships, then existing starter sync and soft-delete cleanup behave unchanged.

## Spec Change Log

## Design Notes

Nextcloud personal default book path:  
`…/remote.php/dav/addressbooks/users/{readUser}/contacts/`  
Shared MASTER books appear as a separate collection on the same account. Wipe always targets `contacts` only — not configurable in DB/UI.

Golden safety check:

```ts
const WIPE_BOOK = 'contacts'
if (norm(entity.cardDavAddressBook) === WIPE_BOOK) skip()
```

Listing: PROPFIND Depth 1 on the `contacts` book URL; `href` ending in `.vcf` = contact; UID from filename. Do not wipe hrefs outside that book path.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: no type errors in touched files
- `npx vitest run` (or project test command for new unit tests) -- expected: safety + wipe edge cases pass

**Manual checks:**
- Admin entity dialog: save read-account (no address-book field), confirm password masked / `cardDavReadPasswordSet`
- Against a Nextcloud test read-user: put a dummy vCard in `contacts`, run wipe endpoint with cron secret, confirm `contacts` empty and shared MASTER book untouched

## Suggested Review Order

**Wipe core**

- Fixed personal book + safety helpers (MASTER name / same credentials)
  [`carddav.ts:4`](../../lib/carddav.ts#L4)

- Only delete under `/contacts/` hrefs; refuse other wipe targets
  [`carddav.ts:387`](../../lib/carddav.ts#L387)

**Hourly cron**

- Entry: enabled entities → skip guards → wipe → audit aggregates
  [`route.ts:12`](../../app/api/cron/carddav-read-wipe/route.ts#L12)

**Config API + schema**

- Encrypted read fields; require complete config when enabling
  [`route.ts:105`](../../app/api/entities/[id]/route.ts#L105)

- Entity columns for Jamf read-account (no address-book column)
  [`schema.prisma:241`](../../prisma/schema.prisma#L241)

**Admin UI**

- Read-account block under MASTER CardDAV; wipe note for `contacts`
  [`page.tsx:692`](../../app/(authenticated)/admin/entities/page.tsx#L692)

**Ops + tests**

- Cronicle hourly job registration
  [`cronicle-setup.md:95`](../../docs/cronicle-setup.md#L95)

- Safety, parse, empty-book, and wipe edge cases
  [`carddav-read-wipe.test.ts:1`](../../tests/unit/lib/carddav-read-wipe.test.ts#L1)
