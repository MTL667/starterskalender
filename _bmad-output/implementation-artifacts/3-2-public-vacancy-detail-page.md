# Story 3.2: Public Vacancy Detail Page

> Status: review
> Epic: 3 — Public Presence & Candidate Application
> Story: 3.2 — public-vacancy-detail-page
> Generated: 2026-05-15

## User Story

As a candidate,
I want to view full details of a specific vacancy,
So that I can decide whether to apply based on complete information.

## Acceptance Criteria

**Given** a published vacancy exists
**When** a visitor navigates to `/jobs/[entityGroup]/[vacancyId]`
**Then** they see the vacancy title, entity name, location, employment type, and all content blocks rendered in order
**And** a prominent "Apply" button (primary blue, sticky on mobile) is visible
**And** the page is server-side rendered with structured data (JobPosting)

**Given** the vacancy has content blocks of different types
**When** the page renders
**Then** Text blocks render as formatted paragraphs
**And** List blocks render as bullet lists
**And** Requirements blocks render with dealbreaker/nice-to-have labels
**And** Benefits blocks render with icons
**And** Media blocks render images from SharePoint

**Given** a vacancy is closed or unpublished
**When** a visitor navigates to its detail page
**Then** they see: "This vacancy is no longer available" with a link back to the listing page
**And** the page returns a 410 Gone status for SEO

**Given** WCAG 2.1 AA requirements
**When** the page renders
**Then** all text meets minimum contrast ratio (4.5:1)
**And** all interactive elements have visible focus indicators
**And** the page is fully navigable by keyboard

## Tasks

- [x] Task 1: Create SSR page `app/jobs/[entityGroup]/[vacancyId]/page.tsx` with SEO metadata + JSON-LD (JobPosting)
- [x] Task 2: Create public ContentBlockRenderer (Server Component variant — no `useTranslations`)
- [x] Task 3: Handle closed/unpublished vacancy → 410 Gone page with back link
- [x] Task 4: Apply button (sticky on mobile) + on-demand ISR revalidation for detail page
- [x] Task 5: WCAG 2.1 AA compliance (contrast, focus indicators, keyboard nav) + i18n keys

### Review Findings

- [x] [Review][Decision] Media blocks reference non-existent `/api/public/vacancies/[id]/photo` endpoint — resolved: implemented public photo proxy with security checks
- [x] [Review][Patch] Nav branding uses `entities[0]` instead of `vacancy.entity` — fixed
- [x] [Review][Patch] Employment type labels and date hardcoded Dutch — fixed, wired to i18n keys
- [x] [Review][Patch] Content block unsafe casts: list blocks need `Array.isArray`, media needs null check on driveId/itemId, filter empty items — fixed
- [x] [Review][Patch] Unknown `block.type` renders empty section card — fixed, filtered out
- [x] [Review][Patch] No fallback body when `content` blocks empty but `description` exists — fixed
- [x] [Review][Patch] Public detail API: no rate limiting, raw Json `content`, missing siteGroup validation — fixed
- [x] [Review][Patch] Contrast: `text-gray-400` at `text-xs` fails WCAG 4.5:1 on white — fixed to gray-500
- [x] [Review][Defer] Apply CTA links to non-existent `/apply` route [page.tsx] — deferred, Story 3.3
- [x] [Review][Defer] `datePosted` uses `createdAt` not true publish timestamp [page.tsx] — deferred, no `publishedAt` field exists yet
- [x] [Review][Defer] Apply button uses entity color not literal "primary blue" per AC [page.tsx] — deferred, UX spec overrides with entity branding
- [x] [Review][Defer] HTTP 410 Gone not achievable via `notFound()` — returns 404 [page.tsx] — deferred, Next.js limitation documented in dev notes

## Dev Notes

### Architecture Decisions

- Route: `app/jobs/[entityGroup]/[vacancyId]/page.tsx` — already referenced in architecture (`app/jobs/[entityGroup]/[vacancyId]/page.tsx`)
- SSR only (Server Component) — no client state on public pages
- ISR: `export const revalidate = 3600` + on-demand `revalidatePath` from publish/unpublish (extend existing trigger in `publish/route.ts`)
- JSON-LD: single `JobPosting` schema (not `ItemList`) with full content
- Apply button links to `/jobs/[entityGroup]/[vacancyId]/apply` (Story 3.3 will implement the form)
- Public API: optionally add `GET /api/public/vacancies/[id]` for headless consumers (architecture specifies this)

### What Needs to Change

#### 1. New SSR Detail Page

Create `app/jobs/[entityGroup]/[vacancyId]/page.tsx`:
- Server Component (no `'use client'`)
- Fetch vacancy by ID + validate: published, belongs to entityGroup's SiteGroup, not deleted
- If vacancy not found or not published → custom 410 handling (see Task 3)
- Use `cache()` from React to deduplicate `generateMetadata` + page queries
- Import `getTranslations('public.vacancy')` for server-side i18n

#### 2. Public ContentBlockRenderer (Server Component)

**CRITICAL: DO NOT reuse** `components/recruitment/vacancy/content-block-renderer.tsx` — that is a `'use client'` component using `useTranslations`.

Create `components/recruitment/public/content-block-renderer.tsx`:
- Server Component (no `'use client'`, no hooks)
- Accept `blocks: ContentBlock[]` and `translations: { ... }` prop for labels
- Render all 5 block types: text, list, requirements, benefits, media
- For **media blocks**: use a public-accessible image URL (proxy via `/api/public/vacancies/[id]/photo` or serve from SharePoint with a public token — see anti-patterns)
- Types reused from `lib/recruitment/types.ts`: `ContentBlock`, `RequirementItem`, `BenefitItem`, `MediaContent`

#### 3. 410 Gone for Closed/Unpublished Vacancies

- If vacancy has `status !== 'PUBLISHED'` OR `deletedAt !== null`:
  - Return HTTP 410 Gone (use Next.js App Router pattern: throw a custom error or use route segment config)
  - Render a friendly page: "This vacancy is no longer available" + link to `/jobs/[entityGroup]`
  - Add `<meta name="robots" content="noindex">` on the gone page
- Next.js doesn't natively support 410 via `notFound()` (which returns 404). Use a workaround:
  - Option A: Return the page content with `headers()` set to 410 via `next/headers` — **not possible in RSC**
  - Option B: Use `redirect()` — wrong semantics
  - **Option C (recommended)**: Create a custom `not-found.tsx` within the `[vacancyId]` segment that renders the "gone" UI + set response status via `generateMetadata` returning `robots: { index: false }`. The HTTP status will be 404 (not 410) from `notFound()` — this is acceptable for Next.js App Router limitations. Document trade-off.
  - **Option D (alternative)**: Use route handler (`route.ts`) alongside `page.tsx` — too complex.
  - **Go with Option C** — `notFound()` + custom `not-found.tsx` with robots noindex. SEO impact minimal since Google treats 404 and 410 similarly for deindexing.

#### 4. Apply Button (Sticky on Mobile)

- Primary blue button using entity `colorHex` as background
- Desktop: inline at bottom of content blocks
- Mobile (`< md`): sticky bottom bar with Apply button (full-width, `48px` height, `fixed bottom-0`)
- Links to `/jobs/[entityGroup]/[vacancyId]/apply` (not functional until Story 3.3)
- Text from i18n: `public.vacancy.applyNow`

#### 5. Extend `publish/route.ts` Revalidation

Add `revalidatePath(\`/jobs/${slug}/${vacancy.id}\`)` alongside existing listing revalidation.

#### 6. Public API Detail Endpoint (Optional / Architecture-specified)

Create `app/api/public/vacancies/[id]/route.ts`:
- `GET` returns full vacancy detail including content blocks as JSON
- Same rate limiting pattern as listing API
- Response shape: `{ data: { id, title, location, type, entity, content, publishedAt, applyUrl } }`

### File Structure

```
app/jobs/[entityGroup]/[vacancyId]/
├── page.tsx                    # SSR detail page
├── not-found.tsx               # 410/gone UI for closed vacancies
└── opengraph-image.tsx         # Dynamic OG (optional, can inherit parent)

components/recruitment/public/
├── content-block-renderer.tsx  # NEW: Server Component content renderer
├── vacancy-card.tsx            # existing (from 3.1)
└── empty-state.tsx             # existing (from 3.1)

app/api/public/vacancies/[id]/
└── route.ts                    # NEW: Public detail API endpoint
```

### RBAC

- No authentication required — public page
- `proxy.ts` already excludes `/jobs` and `/api/public` from auth matcher

### Anti-Patterns to Avoid

1. **DO NOT** use `components/recruitment/vacancy/content-block-renderer.tsx` — it's a client component with `useTranslations` hook
2. **DO NOT** use `useTranslations` in Server Components — use `getTranslations` from `next-intl/server`
3. **DO NOT** expose internal SharePoint API URLs on public pages — proxy media through a public endpoint or use pre-signed URLs
4. **DO NOT** expose internal vacancy fields (createdById, templateId, stages, candidates) on public page
5. **DO NOT** add client-side JavaScript unnecessarily — page should be pure SSR with zero JS bundle
6. **DO NOT** use `updatedAt` as "published date" — use `createdAt` (consistent with listing page JSON-LD)
7. **DO NOT** hardcode Dutch/French strings — wire all copy through `getTranslations('public.vacancy')`

### Previous Story Intelligence (3.1)

**Patterns to follow:**
- `cache()` wrapper on data fetching function (avoids duplicate queries in `generateMetadata` + page)
- `metadataBase` in root layout handles absolute canonical URLs
- JSON-LD XSS prevention: `.replace(/</g, '\\u003c')` before `dangerouslySetInnerHTML`
- `EMPLOYMENT_TYPE_MAP` for schema.org enum mapping (reuse from listing page or extract to shared util)
- Translations passed as props to presentational components
- `getTranslations('public.jobs')` pattern for server-side i18n

**Review findings applied in 3.1 (prevent regressions):**
- Always escape JSON-LD output for HTML context
- Use `createdAt` for datePosted (not `updatedAt`)
- Add `min-w-0` + `break-words` for long text containers
- Guard date parsing with `Number.isFinite` check
- Log `revalidatePath` errors (don't swallow)

### Existing Code to Reuse/Extend

| Asset | How to use |
|-------|------------|
| `lib/recruitment/types.ts` | Import `ContentBlock`, `RequirementItem`, `BenefitItem`, `MediaContent` types |
| `EMPLOYMENT_TYPE_MAP` in listing `page.tsx` | Extract to `lib/recruitment/constants.ts` or reuse inline |
| `getSiteGroupData` in listing `page.tsx` | Reference pattern; detail page needs different query (single vacancy by ID) |
| `components/recruitment/vacancy/content-block-renderer.tsx` | Study block rendering logic — replicate as Server Component |
| `app/jobs/[entityGroup]/layout.tsx` | Shared layout already wraps the detail page (no new layout needed) |
| `app/jobs/[entityGroup]/opengraph-image.tsx` | Parent OG image; detail page can override with vacancy-specific title |
| `app/api/public/vacancies/route.ts` | Rate limiting pattern + error shapes to replicate |
| `publish/route.ts` revalidation logic | Extend to include detail page path |

### i18n Keys to Add

Add under `public.vacancy` namespace in `messages/nl.json` and `messages/fr.json`:

| Key | NL | FR |
|-----|----|----|
| `public.vacancy.applyNow` | Solliciteer nu | Postuler maintenant |
| `public.vacancy.backToListing` | Terug naar alle vacatures | Retour aux postes vacants |
| `public.vacancy.closedTitle` | Deze vacature is niet meer beschikbaar | Ce poste n'est plus disponible |
| `public.vacancy.closedDescription` | Deze functie is ondertussen ingevuld of niet meer open. | Ce poste a été pourvu ou n'est plus ouvert. |
| `public.vacancy.postedOn` | Geplaatst op {date} | Publié le {date} |
| `public.vacancy.requirements` | Vereisten | Exigences |
| `public.vacancy.benefits` | Wat wij bieden | Ce que nous offrons |
| `public.vacancy.dealbreaker` | Vereist | Requis |
| `public.vacancy.niceToHave` | Pluspunt | Atout |
| `public.vacancy.description` | Over deze functie | À propos de ce poste |

### SEO Requirements

1. **`generateMetadata`**: title = `{vacancy.title} — {entity.name}`, description from first text block (truncated 160 chars), OG title/description/type, canonical URL
2. **JSON-LD** (`JobPosting` schema): `title`, `datePosted`, `description`, `jobLocation`, `employmentType`, `hiringOrganization` (name, URL), `url` (canonical), `validThrough` (optional if vacancy has expiry)
3. **Robots**: `index: true, follow: true` for published; `index: false` for gone/closed
4. **OG Image**: Inherit parent `opengraph-image.tsx` OR override with vacancy-specific variant

### Performance Budget

- LCP < 1.5 seconds (NFR3)
- SSR only — zero client-side data fetching
- ISR with on-demand revalidation (fallback: 1 hour)
- Minimal JS bundle — no client components on detail page
- Images lazy-loaded via `loading="lazy"`

### UX Specifications

**Layout (from UX spec):**
- Single-column centered, `max-width: 720px`
- `py-8` between content blocks, `px-4` on mobile
- Generous whitespace — marketing style, not admin style

**Typography (from UX spec):**
- Title: `text-2xl` to `text-3xl`, `font-bold`
- Body/blocks: `text-base`, `leading-relaxed`
- Dealbreaker items: bold with icon prefix
- Apply button: `text-lg`, `font-semibold`

**Colors:**
- Entity `colorHex` for: Apply button background, accent links
- Neutral grays for text/backgrounds
- White card backgrounds for content blocks
- No dark mode on public pages

**Apply Button (mobile sticky):**
- Desktop: inline after content blocks, entity-colored, rounded
- Mobile (`< md`): `fixed bottom-0 left-0 right-0` with `bg-white border-t` container, full-width button inside, `z-50`, `48px` height, padding `p-4`

**Breadcrumb:**
- `{siteGroup.name} / {vacancy.title}` — links back to listing

**Vacancy meta row:**
- Location (pin icon) + Type (clock icon) + Entity (colored dot) + Posted date
- Same icon pattern as VacancyCard from 3.1

## References

- Architecture: `app/jobs/[entityGroup]/[vacancyId]/page.tsx` (route structure)
- UX: Screen 4 in `ux-design-directions.html` (public vacancy mockup)
- PRD: FR43 (public detail page), FR44 (SEO structured data)
- NFR: Performance table (LCP < 1.5s)
- Epics: Story 3.2 acceptance criteria
