# Deferred Work

## Deferred from: code review of 2-2-pipeline-kanban-board (2026-05-15)

- **Candidates with unknown stage.id silently dropped from board** — If the API returns a candidate whose `stage.id` is not in the `stages` prop (e.g., stale SSR data after stage configuration change), that candidate is not rendered on the board. Add a fallback "Unknown stage" bucket or refresh stages when a mismatch is detected. [pipeline-kanban.tsx:74-84]

## Deferred from: code review of 2-4-drag-drop-stage-transitions (2026-05-15)

- **Race condition: read-then-write without transaction in executeStageMove** — Concurrent moves can interleave between the findUnique validation and the update call. Low risk in single-user context but should be wrapped in a Prisma transaction for production-grade safety. [pipeline-engine.ts]
- **Soft-deleted candidate/vacancy not guarded during update phase** — Between validation read and stage update write, a candidate or vacancy could be soft-deleted. The update should include a deletedAt guard or use a transaction to prevent stale writes. Broader vacancy lifecycle concern. [pipeline-engine.ts + route.ts]

## Deferred from: code review of 2-5-real-time-pipeline-updates-via-sse (2026-05-15)

- **Entity scope over-subscription** — SSE route merges `starters:read` and `recruitment:read` entity scopes into one subscription. A user with only `starters:read` for an entity receives recruitment SSE events for that entity (payloads contain IDs only, client discards them). Per-event-type scoping in the SSE route would be needed to fix this. [app/api/sse/route.ts]

## Deferred from: code review of 2-6-pipeline-keyboard-accessibility (2026-05-15)

- **Card action buttons unreachable by keyboard** — Share/Comment/Open buttons have `tabIndex={-1}` and are only visible on hover. Keyboard-only users cannot reach them. Will be addressed when the detail dialog provides full action paths. [candidate-card.tsx]
- **refreshKey remount nukes kanban state and focus** — Pre-existing pattern from Story 2.2. Incrementing `refreshKey` fully remounts PipelineKanban, resetting all state including focus position. [pipeline-section.tsx]
- **Empty column ArrowDown gives no feedback** — When a column has no cards, ArrowDown from the header does nothing with no visual or auditory indication. Polish item, not required by AC. [pipeline-kanban.tsx]

## Deferred from: code review of 3-1-public-vacancy-listing-page (2026-05-15)

- **Rate-limit IP spoofing via client-controlled x-forwarded-for** — Public API uses first element of `x-forwarded-for` without verifying trusted proxy chain. Attackers can rotate spoofed IPs. When header absent, all clients share one `'unknown'` bucket. Requires platform/deployment decision. [app/api/public/vacancies/route.ts:19-20]
- **Links and JSON-LD URLs point to non-existent vacancy detail page** — VacancyCard links to `/jobs/[entityGroup]/[vacancyId]` and JSON-LD sets `url` to the same path, but the detail page route doesn't exist yet. Will be resolved by Story 3.2. [components/recruitment/public/vacancy-card.tsx:51-52]
- **Rate-limit in-memory Map grows without bound** — Module-scoped `ipHits` Map has no eviction for expired/idle keys. In serverless environments, separate instances maintain separate limits. Production concern for scaling. [app/api/public/vacancies/route.ts:6-17]
- **`/jobs` (no entityGroup) returns 404 with no handler** — Only `app/jobs/[entityGroup]/page.tsx` exists. A request to `/jobs` does not match the dynamic segment, resulting in a generic 404. Future story should add an index/redirect. [app/jobs/]

## Deferred from: code review of 3-2-public-vacancy-detail-page (2026-05-15)

- **Apply CTA links to non-existent `/apply` route** — Both desktop and mobile Apply buttons link to `/jobs/[entityGroup]/[vacancyId]/apply` which doesn't exist yet. Will be implemented in Story 3.3. [app/jobs/[entityGroup]/[vacancyId]/page.tsx]
- **`datePosted` uses `createdAt` not true publish timestamp** — JSON-LD `datePosted` derives from vacancy creation time, not actual publish time. No `publishedAt` column exists in the Vacancy model. Should be addressed when publish lifecycle adds a dedicated timestamp. [page.tsx]
- **Apply button uses entity color, not literal "primary blue"** — AC says "primary blue" but UX spec explicitly states entity branding for public page CTA buttons. Intentional UX-spec-driven decision. [page.tsx]
- **HTTP 410 Gone not achievable via `notFound()`** — Next.js App Router returns 404 for `notFound()`. True 410 would require custom middleware or API route workaround. SEO impact is minimal (Google treats 404 and 410 similarly for deindexing). Documented trade-off in story dev notes. [page.tsx]

## Deferred from: code review of 3-4-candidate-data-processing-profile (2026-05-15)

- **CV proxy buffers entire file in memory** — downloadDocument returns a full Buffer. Large uploads can spike heap. Requires refactoring shared lib to support streaming. [documents/route.ts]
- **Auth errors detected via message substring** — Both candidate API routes compare err.message to 'Unauthorized'/'Forbidden' strings, coupling to wording in requirePermission. Needs typed errors / instanceof pattern. Pre-existing. [candidates/[id]/route.ts, documents/route.ts]
- **SSE updates not reflected in open dialog** — Pipeline SSE moves update the candidates list but not the open detail dialog or detailCandidate state. Broader SSE subscription concern. [pipeline-kanban.tsx]
- **NaN from non-numeric filter inputs** — parseInt on daysMin/daysMax yields NaN for invalid input; comparisons always false. Pre-existing in filter logic. [pipeline-kanban.tsx:~262]
- **Skeleton loader vs spinner** — Spec calls for skeleton matching dialog layout; no Skeleton component exists. Documented dev decision to use spinner. [candidate-detail-dialog.tsx]
- **DOCX download card lacks file size** — UX spec describes centered card with name, size, and download button. Implementation shows compact row without size. Needs extra Graph API call for metadata. [candidate-detail-dialog.tsx]
- **Tab pill vs underline style** — UX spec calls for underline tabs with entity-colored active indicator. Default shadcn tabs use pill/segmented style. Cosmetic. [candidate-detail-dialog.tsx]
- **Date locale forced to nl-BE** — formatDate/formatShortDate always use nl-BE locale regardless of active language. Broader i18n concern. [candidate-detail-dialog.tsx]
- **Graph error type narrowing via message substring** — Documents route checks error?.statusCode without verifying it originates from Microsoft Graph. Pre-existing pattern. [documents/route.ts]
