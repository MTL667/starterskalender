# Story 3.6: Site Grouping Configuration

> Status: done
> Epic: 3 — Public Presence & Candidate Application
> Generated: 2026-05-16

## Story

As an admin,
I want to configure which entities share a public vacancy page,
so that organizations with multiple entities can present a unified jobs page.

## Acceptance Criteria

**AC1:** Given I have `recruitment:admin` permission, When I navigate to `/recruitment/admin/instellingen`, Then I see a "Site Groups" section showing existing groups.

**AC2:** Given I am in the Site Groups section, When I create a new site group, Then I can specify: group name, URL slug (used in `/jobs/[slug]`), and select which entities belong to this group, And an entity can belong to only one site group.

**AC3:** Given a site group exists with multiple entities, When a visitor navigates to the group's vacancy page, Then they see vacancies from all entities in that group, And each vacancy shows which entity it belongs to via entity badge.

**AC4:** Given I change a site group's entity composition, When I save the change, Then the public vacancy page revalidates immediately, And vacancies from removed entities disappear, new entity vacancies appear.

## Tasks / Subtasks

- [ ] Task 1: Create admin API for site groups CRUD (AC: 1,2,4)
  - [ ] 1.1 Create `app/api/recruitment/admin/site-groups/route.ts` (GET list, POST create)
  - [ ] 1.2 Create `app/api/recruitment/admin/site-groups/[id]/route.ts` (PATCH update, DELETE)
  - [ ] 1.3 Zod validation for name, slug, entityIds
  - [ ] 1.4 Enforce entity uniqueness (one entity per group)
  - [ ] 1.5 On save/delete, call `revalidatePath('/jobs/[slug]')` for affected groups

- [ ] Task 2: Create admin settings page at `/recruitment/admin/instellingen` (AC: 1,2)
  - [ ] 2.1 Create `app/(authenticated)/recruitment/admin/instellingen/page.tsx` (server component)
  - [ ] 2.2 Create `SiteGroupsSection` client component showing existing groups
  - [ ] 2.3 Create/Edit form: name input, slug input, entity multi-select
  - [ ] 2.4 Delete with confirmation dialog
  - [ ] 2.5 Guard with `recruitment:admin` permission

- [ ] Task 3: i18n keys (AC: 1,2)
  - [ ] 3.1 Add `recruitment.settings.*` keys to nl.json and fr.json

## Dev Notes

### Architecture Decisions

**Schema already exists.** `SiteGroup` model (id, name, slug, entities[]) and `Entity.siteGroupId` (optional FK) are already in Prisma. No schema changes needed.

**Admin page path:** `/recruitment/admin/instellingen` per AC1. The architecture doc mentions this page. There's already `/recruitment/admin/templates/` in the codebase.

**Entity uniqueness:** An entity can only belong to one site group (Entity.siteGroupId is a single FK). When assigning entities to a group, first clear `siteGroupId` from any entities being removed, then set it on the new ones.

**Revalidation:** Use `revalidatePath` or `revalidateTag` from `next/cache` to clear the cached public pages when a group is modified.

### File Structure

**New files:**
- `app/api/recruitment/admin/site-groups/route.ts`
- `app/api/recruitment/admin/site-groups/[id]/route.ts`
- `app/(authenticated)/recruitment/admin/instellingen/page.tsx`
- `components/recruitment/admin/site-groups-section.tsx`

**Modified files:**
- `messages/nl.json` — add settings keys
- `messages/fr.json` — add settings keys

### Existing Code Patterns

**RBAC:** Use `requirePermission('recruitment:admin')` pattern from existing admin routes.
**Prisma queries:** Standard patterns from vacancy CRUD routes.
**Slug validation:** Slug should be URL-safe lowercase alphanumeric + hyphens.
**Entity list API:** Entities available via existing admin API or direct Prisma query.

### Anti-Patterns to Avoid

1. **DO NOT** modify the Prisma schema — SiteGroup already exists
2. **DO NOT** create a complex wizard — simple form with name + slug + entity checkboxes
3. **DO NOT** forget revalidation — public pages cache with `s-maxage=300`
4. **DO NOT** allow duplicate slugs — slug is @unique in schema

### RBAC

- `recruitment:admin` permission required for all operations
- No public endpoints needed (site groups are admin-only config)

## References

- Epics: Story 3.6, FR45
- Architecture: `admin/instellingen/page.tsx` planned
- Schema: `SiteGroup` model, `Entity.siteGroupId`
- UX: Settings via Radix Sheet or tabs pattern
