# Story 3.1: Public Vacancy Listing Page

> Status: done
> Epic: 3 — Public Presence & Candidate Application
> Story: 3.1 — public-vacancy-listing-page
> Generated: 2026-05-15

## User Story

As a candidate,
I want to browse all open vacancies for an organization on a public page,
So that I can discover relevant job opportunities without needing an account.

## Acceptance Criteria

**Given** an entity group has published vacancies
**When** a visitor navigates to `/jobs/[entityGroup]`
**Then** they see a server-side rendered page listing all active vacancies for that entity group
**And** each vacancy shows: title, location, employment type, entity badge, posted date, and short description (VacancyCard component)
**And** the page has a Largest Contentful Paint under 1.5 seconds (NFR3)

**Given** the page is rendered
**When** a search engine crawls it
**Then** it finds proper meta tags (title, description, og:image) and structured data (JobPosting schema)
**And** the page is indexable with canonical URL

**Given** a vacancy is published or unpublished
**When** the change is saved
**Then** the public listing page revalidates (ISR on-demand) within 60 seconds

**Given** a visitor is on mobile
**When** they view the vacancy listing
**Then** the layout is mobile-first responsive: full-width cards, touch-friendly spacing, readable at 320px viewport

**Given** all vacancies for an entity group are closed
**When** a visitor navigates to the page
**Then** they see a friendly empty state: "No open positions at the moment" with organization info

## Tasks

- [x] Task 1: Create SiteGroup Prisma model + seed default group + admin is out of scope (hardcode one group per entity for now)
- [x] Task 2: Create public API route `GET /api/public/vacancies?siteGroup=[slug]` with rate limiting
- [x] Task 3: Create SSR page `app/jobs/[entityGroup]/page.tsx` with SEO metadata + JSON-LD
- [x] Task 4: Create VacancyCard component for public listing + empty state
- [x] Task 5: Add on-demand ISR revalidation trigger from publish/unpublish action + i18n keys

### Review Findings

- [x] [Review][Decision] Missing og:image in Open Graph metadata — resolved: dynamic opengraph-image.tsx with org branding
- [x] [Review][Patch] JSON-LD XSS via `</script>` in vacancy data [page.tsx:113-116] — fixed
- [x] [Review][Patch] Duplicate Prisma query — no React `cache()` wrapper on `getSiteGroupData` [page.tsx:46+74] — fixed
- [x] [Review][Patch] Contradictory emptiness: page returns 404 for zero entities but API returns 200 [page.tsx:21 vs route.ts:36-66] — fixed
- [x] [Review][Patch] Canonical URL is relative — no `metadataBase` defined [page.tsx:66-68] — fixed
- [x] [Review][Patch] JSON-LD `datePosted` uses `updatedAt` not publish time; `employmentType` not schema.org enum [page.tsx:93-101] — fixed
- [x] [Review][Patch] Missing `@@index([siteGroupId])` on Entity model [schema.prisma] — fixed
- [x] [Review][Patch] Long titles can overflow at 320px — missing `min-w-0` / `break-words` [vacancy-card.tsx:55-67] — fixed
- [x] [Review][Patch] Invalid `publishedAt` produces NaN in relative date display [vacancy-card.tsx:15-17] — fixed
- [x] [Review][Patch] `revalidatePath` failure swallowed silently [publish/route.ts:94-98] — fixed
- [x] [Review][Patch] i18n keys defined but not used — components hardcode Dutch copy [empty-state.tsx, vacancy-card.tsx] — fixed
- [x] [Review][Patch] Missing og:image — added dynamic opengraph-image.tsx — fixed
- [x] [Review][Defer] Rate-limit IP spoofing via client-controlled `x-forwarded-for` [route.ts:19-20] — deferred, deployment/platform concern
- [x] [Review][Defer] Links and JSON-LD URLs point to non-existent vacancy detail page [vacancy-card.tsx:51-52] — deferred, detail page is Story 3.2
- [x] [Review][Defer] Rate-limit in-memory Map grows without bound in serverless [route.ts:6-17] — deferred, production scaling
- [x] [Review][Defer] `/jobs` (no entityGroup) returns 404 with no handler [app/jobs/] — deferred, future UX story

## Dev Notes

### Architecture Decisions

- **Route structure:** `app/jobs/[entityGroup]/page.tsx` — public, no auth, SSR. This is a NEW route group outside `(authenticated)/`.
- **No auth middleware:** The existing `proxy.ts` matcher must be updated to exclude `/jobs` paths (currently catches everything not explicitly listed).
- **Site grouping (simplified):** The full SiteGroup admin UI is Story 3.6. For 3.1, create the Prisma model but seed one group per entity using entity slug. No admin CRUD yet.
- **API layer:** `GET /api/public/vacancies?siteGroup=[slug]` — separate from authenticated `/api/recruitment/vacancies`. No auth, rate-limited, read-only.
- **SSR + ISR:** Use Next.js `revalidateTag` / `revalidatePath` for on-demand revalidation when a vacancy is published/unpublished. Set `export const revalidate = 3600` as fallback.
- **No dark mode:** Public pages do not use dark mode (per UX spec). Use `forcedTheme` or explicit light-only styling.
- **Entity branding:** Use entity `colorHex` + entity name from the database. Entity logo placeholder (first letter of entity name in colored circle).

### What Needs to Change

**1. Prisma Schema — new `SiteGroup` model:**

```prisma
model SiteGroup {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  entities  Entity[] @relation("SiteGroupEntities")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Add to `Entity` model: `siteGroup SiteGroup? @relation("SiteGroupEntities", fields: [siteGroupId], references: [id])` + `siteGroupId String?`

**2. `proxy.ts` — exclude `/jobs` from auth middleware:**

Add `jobs` to the exclusion list in the middleware matcher regex so public pages are not intercepted by the auth proxy.

**3. `app/api/public/vacancies/route.ts` — new public API:**

```
GET /api/public/vacancies?siteGroup=aceg
→ { data: VacancyPublicItem[], total: number }
```

Query: `prisma.vacancy.findMany({ where: { status: 'PUBLISHED', deletedAt: null, entity: { siteGroup: { slug } } }, include: { entity: true }, orderBy: { createdAt: 'desc' } })`

Response shape per vacancy:
```typescript
interface VacancyPublicItem {
  id: string
  title: string
  location: string | null
  type: string | null
  entityName: string
  entityColor: string // from Entity.colorHex or fallback
  description: string | null
  publishedAt: string // use createdAt or updatedAt as proxy — no publishedAt field exists
  detailUrl: string // `/jobs/${siteGroup}/${vacancy.id}`
}
```

Rate limiting: use existing rate-limit pattern if available, or add `next-rate-limit` / IP-based in-memory limiter (100 req/min/IP per architecture spec).

**4. `app/jobs/[entityGroup]/page.tsx` — SSR listing page:**

- Server Component (no `'use client'`)
- Fetch site group + vacancies via Prisma directly (no API call — server-side)
- Generate `metadata` export for SEO: `title`, `description`, `openGraph`
- Generate JSON-LD `ItemList` with `JobPosting` items
- Render: entity nav bar (logo placeholder + name + open count) → vacancy card grid → empty state if no vacancies
- Use `getTranslations` from `next-intl/server` for i18n

**5. `app/jobs/[entityGroup]/layout.tsx` — public layout:**

- Minimal layout: no sidebar, no auth provider, no SSE provider
- Force light theme
- Include `<html lang>` from locale detection
- Minimal footer with organization info

**6. `components/recruitment/public/vacancy-card.tsx` — new component:**

Per UX spec (UX-DR11):
- Title (text-lg font-semibold)
- Location + employment type as meta badges
- Entity badge (colored dot + name)
- Posted date (relative: "3 weeks ago")
- Short description (2-line clamp)
- Hover: subtle elevation (`hover:shadow-md`)
- Link to `/jobs/[entityGroup]/[vacancyId]` (Story 3.2 will create that page)
- Mobile: full-width card, generous padding
- Desktop: grid of cards (1 col mobile, 2 col md, 3 col lg)

**7. `components/recruitment/public/empty-state.tsx` — new component:**

- Friendly illustration placeholder (icon)
- "No open positions at the moment" heading
- Organization name and info
- i18n keys

**8. Revalidation trigger — modify `app/api/recruitment/vacancies/[id]/publish/route.ts`:**

After successful publish/unpublish action, call:
```typescript
import { revalidatePath } from 'next/cache'
// Revalidate the public listing for this vacancy's entity's site group
revalidatePath(`/jobs/${siteGroup.slug}`)
```

### File Structure

```
app/
  jobs/
    [entityGroup]/
      page.tsx          # SSR public listing (NEW)
      layout.tsx        # Public layout — no auth (NEW)
  api/
    public/
      vacancies/
        route.ts        # GET public vacancy list (NEW)

components/
  recruitment/
    public/
      vacancy-card.tsx  # Public VacancyCard (NEW)
      empty-state.tsx   # Empty state component (NEW)

prisma/
  schema.prisma         # Add SiteGroup model + Entity relation

messages/
  nl.json               # Add public.* keys
  fr.json               # Add public.* keys
```

### RBAC

No RBAC needed — public pages are unauthenticated. The API route and SSR page query only `PUBLISHED` vacancies with `deletedAt: null`.

### Anti-Patterns to Avoid

- Do NOT reuse `components/recruitment/vacancy/` components — those use `'use client'` and `useTranslations`. Public pages need Server Components for SSR/SEO.
- Do NOT add auth checks on public routes — they must be fully unauthenticated.
- Do NOT use `useTranslations` in Server Components — use `getTranslations` from `next-intl/server`.
- Do NOT add a full SiteGroup admin UI — that's Story 3.6.
- Do NOT add a vacancy detail page — that's Story 3.2.
- Do NOT implement search/filtering on the listing — the UX spec has no public listing filters.
- Do NOT use the existing `ContentBlockRenderer` (client component) — create a server-compatible renderer in Story 3.2 if needed.

### Previous Story Intelligence

From Epic 2 (Stories 2.1–2.6):
- i18n pattern: `useTranslations('recruitment')` with dotted keys, ICU plural for counts
- Entity color: entities have a `colorHex` field (or similar) used for entity badges
- Vacancy status: `VacancyStatus` enum (`DRAFT`, `PUBLISHED`, `CLOSED`, `ARCHIVED`) — no `publishedAt` timestamp, use `updatedAt` as proxy for "posted date"
- Content blocks: `Json` field on Vacancy with typed `ContentBlock[]` (text, list, requirements, benefits, media)
- `proxy.ts` matcher controls which routes require auth — must be updated for `/jobs`

### Existing Code to Reuse/Extend

| What | Where | How |
|------|-------|-----|
| Vacancy types | `lib/recruitment/types.ts` | `VacancyWithRelations`, `ContentBlock` |
| Entity model | `prisma/schema.prisma` | Extend with `siteGroupId` |
| Publish route | `app/api/recruitment/vacancies/[id]/publish/route.ts` | Add revalidation call |
| Badge component | `components/ui/badge.tsx` | Reuse for entity/type badges |
| i18n setup | `messages/nl.json`, `messages/fr.json` | Add `public.*` namespace |
| API response format | Architecture spec | `{ data: T[], total: number }` |

### i18n Keys Needed

Under `public` namespace (new top-level key, separate from `recruitment`):

| Key | NL | FR |
|-----|----|----|
| `public.jobs.title` | `Vacatures bij {org}` | `Postes vacants chez {org}` |
| `public.jobs.metaDescription` | `Bekijk alle openstaande vacatures bij {org}` | `Consultez tous les postes vacants chez {org}` |
| `public.jobs.openCount` | `{count, plural, =0 {Geen openstaande vacatures} =1 {1 openstaande vacature} other {# openstaande vacatures}}` | `{count, plural, =0 {Aucun poste vacant} =1 {1 poste vacant} other {# postes vacants}}` |
| `public.jobs.emptyTitle` | `Momenteel geen openstaande vacatures` | `Aucun poste vacant pour le moment` |
| `public.jobs.emptyDescription` | `Kijk later nog eens terug voor nieuwe mogelijkheden bij {org}.` | `Revenez plus tard pour de nouvelles opportunités chez {org}.` |
| `public.jobs.postedAgo` | `{days, plural, =0 {Vandaag geplaatst} =1 {1 dag geleden} other {# dagen geleden}}` | `{days, plural, =0 {Publié aujourd'hui} =1 {Il y a 1 jour} other {Il y a # jours}}` |
| `public.jobs.viewVacancy` | `Bekijk vacature` | `Voir le poste` |
| `public.jobs.location` | `Locatie` | `Lieu` |
| `public.jobs.type` | `Type` | `Type` |

### SEO Requirements

1. **`metadata` export** on page.tsx:
   - `title`: "{org} — Open Positions" (or i18n equivalent)
   - `description`: "Browse all open vacancies at {org}"
   - `openGraph.title`, `openGraph.description`, `openGraph.type: 'website'`
   - `robots: { index: true, follow: true }`
   - `alternates.canonical`: absolute URL

2. **JSON-LD** structured data:
   ```json
   {
     "@context": "https://schema.org",
     "@type": "ItemList",
     "name": "Open positions at {org}",
     "itemListElement": [
       {
         "@type": "JobPosting",
         "title": "...",
         "datePosted": "...",
         "jobLocation": { "@type": "Place", "address": "..." },
         "employmentType": "...",
         "hiringOrganization": { "@type": "Organization", "name": "..." }
       }
     ]
   }
   ```

3. Render JSON-LD via `<script type="application/ld+json">` in the page.

### Performance Budget

- LCP < 1.5 seconds (NFR3)
- SSR — no client-side data fetching on initial load
- ISR with on-demand revalidation (fallback: 1 hour)
- Minimal JS bundle — no unnecessary client components on the listing page

## References

- Architecture: AR17 (public pages under `app/jobs/[entityGroup]/` with ISR)
- UX: UX-DR11 (VacancyCard component spec)
- PRD: FR42 (public vacancy listing), FR44 (SEO structured data), FR45 (site grouping)
- NFR: NFR3 (LCP < 1.5s)
