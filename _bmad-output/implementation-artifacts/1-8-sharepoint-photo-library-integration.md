# Story 1.8: SharePoint Photo Library Integration

Status: done

## Story

As a headhunter,
I want to attach photos from our central SharePoint library to vacancy content,
So that vacancies include team photos and office images without manual upload.

## Acceptance Criteria

1. **Given** I am editing a vacancy and click "Add image" on a Media content block
   **When** the photo library dialog opens
   **Then** I see photos from my entity's SharePoint photo library via Microsoft Graph
   **And** I can browse folders and search photos by name

2. **Given** I select a photo in the library dialog
   **When** I confirm the selection
   **Then** a preview with dimensions is shown
   **And** a photo reference (driveId + itemId) is stored in the content block
   **And** the image appears in the vacancy content preview

3. **Given** SharePoint Graph API is unavailable
   **When** I open the photo library dialog
   **Then** a message "Photo library temporarily unavailable" is shown
   **And** the rest of the vacancy editor stays fully usable

4. **Given** a vacancy with a photo in a Media content block is published
   **When** the vacancy is viewed
   **Then** the photo loads from SharePoint with appropriate caching headers

## Tasks / Subtasks

- [x] Task 1: Add Media block type to content block system (AC: #1, #2)
  - [x] Extend `ContentBlock` type in `lib/recruitment/types.ts` with `media` type and `MediaContent` interface (`driveId`, `itemId`, `fileName`, `mimeType`, `width`, `height`)
  - [x] Extend `contentBlockSchema` in `lib/recruitment/schemas.ts` for media validation
  - [x] Add `media` entry to `BLOCK_TYPE_CONFIG` in `content-block-editor.tsx` with `Image` icon
  - [x] Create `components/recruitment/vacancy/blocks/media-block.tsx` — renders image preview via proxy API

- [x] Task 2: Create photo proxy API route (AC: #2, #4)
  - [x] Create `app/api/recruitment/vacancies/[id]/photo/route.ts` — GET handler
  - [x] Accept query params `driveId` and `itemId`
  - [x] Use existing `graphDocs()` + `downloadDocument()` from `lib/graph-teams.ts`
  - [x] Apply RBAC: `recruitment:read` for authenticated users, verify vacancy entity scope
  - [x] Set caching headers: `Cache-Control: private, max-age=300` (same pattern as starter photo proxy)
  - [x] Validate mime type with `isSafeImageMimeType()` — reject non-image files
  - [x] Return image binary with proper `Content-Type`

- [x] Task 3: Create SharePoint photo library browser dialog (AC: #1, #3)
  - [x] Create `components/recruitment/vacancy/photo-library-dialog.tsx` — client component
  - [x] Create `app/api/recruitment/sharepoint/photos/route.ts` — GET handler to list photos
  - [x] API: Accept query param `entityId`, use `graphDocs()` to browse entity's photo library folder
  - [x] API: Return array of `{ driveId, itemId, fileName, mimeType, width, height, thumbnailUrl }`
  - [x] Dialog: Radix `Dialog` with folder browse, search by name, thumbnail grid
  - [x] Dialog: Preview panel on selection showing image + dimensions
  - [x] Dialog: Confirm/Cancel buttons — on confirm, return selected photo reference
  - [x] Handle Graph API unavailability: show "Photo library temporarily unavailable" message

- [x] Task 4: Integrate Media block into vacancy edit page (AC: #1, #2)
  - [x] Wire `MediaBlock` into `renderBlockContent` in `content-block-editor.tsx`
  - [x] MediaBlock: display image preview when photo reference exists, "Add image" button when empty
  - [x] MediaBlock: clicking "Add image" opens PhotoLibraryDialog
  - [x] On photo selection, update block content via `onContentChange`
  - [x] Ensure autosave picks up media block content changes

- [x] Task 5: Add translation keys (AC: all)
  - [x] Add media/photo keys to `messages/nl.json`
  - [x] Add matching keys to `messages/fr.json`

## Dev Notes

### Data Model

**Media content block structure** (stored in vacancy `content` JSON array):
```typescript
interface MediaContent {
  driveId: string
  itemId: string
  fileName: string
  mimeType: string
  width?: number
  height?: number
}
```

The content block type `media` stores a SharePoint reference, NOT the image binary. Images are served through a server-side proxy that authenticates with Graph API.

### Architecture Compliance

**Reuse existing Graph infrastructure — DO NOT reinvent:**
- `lib/graph-teams.ts` — `graphDocs()` client, `downloadDocument()`, `isSafeImageMimeType()`, `graphErrorToStatus()` already exist
- `isDocsGraphConfigured()` — check before any Graph operation
- Env vars: `AZURE_DOCS_TENANT_ID`, `AZURE_DOCS_CLIENT_ID`, `AZURE_DOCS_CLIENT_SECRET`, `TEAMS_SITE_ID`
- `lib/graph-teams.ts` handles pagination (`fetchAllPages`), safe mime types, error mapping

**Photo library folder path** (TBD — needs entity-level photo library config):
- Starter docs use: `/Entity/LastName FirstName/` pattern
- For vacancy photos, the library path should be entity-scoped: e.g. `/{EntityName}/Photos/` or a configured SharePoint site/drive
- If entities use separate SharePoint sites/drives, add an `photoLibraryDriveId` field to Entity or use a convention

**Photo proxy pattern** — follow `app/api/starters/[id]/photo/route.ts`:
- Download via `downloadDocument(driveId, itemId)`
- Validate mime with `isSafeImageMimeType()`
- Set `Content-Type`, `Cache-Control: private, max-age=300`, `X-Content-Type-Options: nosniff`
- Sanitize filename for Content-Disposition

**RBAC:**
- Photo listing API: `requirePermission('recruitment:read')` + entity scope check
- Photo proxy: authenticate + verify vacancy belongs to user's entity scope

### UX Patterns from Spec

- **Media block in ContentBlockEditor**: UX-DR10 lists Media as a block type alongside Text, List, Requirements, Benefits
- **Photo picker dialog**: Radix `Dialog` (consistent with AlertDialog patterns in 1.6/1.7)
- **Thumbnail grid**: Browse photos visually, not just file names
- **Preview on selection**: Show image + dimensions before confirming
- **Graceful degradation**: If Graph unavailable, show message but don't break the editor (NFR23, NFR30)
- **Loading states**: Skeleton loading for thumbnail grid; spinner for photo proxy
- **Image rendering**: Use `next/image` with responsive `sizes` attribute (UX implementation guideline)

### Anti-Patterns to Avoid

- Do NOT upload images to local storage or the database — use SharePoint references only
- Do NOT embed base64 image data in the content JSON — store driveId/itemId references
- Do NOT expose SharePoint URLs directly to the browser — proxy through server API
- Do NOT create a new Graph client — reuse `graphDocs()` from `lib/graph-teams.ts`
- Do NOT skip mime type validation — reuse `isSafeImageMimeType()` for XSS prevention
- Do NOT serve SVG files (excluded in safe mime types already)
- Do NOT add retry logic manually — if needed later, add to `graphDocs()` layer (NFR22 deferred)

### Existing Patterns to Follow

**Graph API existing patterns from `lib/graph-teams.ts`:**
- `graphDocs()` for authenticated Graph client
- `downloadDocument(driveId, itemId)` for binary download
- `listStarterImages(entity, last, first)` — browse + filter images from SharePoint
- `isSafeImageMimeType()` — allowlist check
- `graphErrorToStatus()` — consistent HTTP error mapping

**Photo proxy existing pattern from `app/api/starters/[id]/photo/route.ts`:**
- Download binary → validate mime → set headers → return `new NextResponse(Uint8Array)`
- `Cache-Control: private, max-age=300`
- `X-Content-Type-Options: nosniff`
- Bare mime (strip `;` params from Graph responses)

**ContentBlockEditor pattern (Story 1.3):**
- `BLOCK_TYPE_CONFIG` object with icon + default content
- `renderBlockContent` switch for type-specific rendering
- Block component receives `content`, `editing`, `onChange` props
- Blocks in `components/recruitment/vacancy/blocks/`

**Edit page integration pattern (Stories 1.5-1.7):**
- Component manages own API calls
- Updates parent via callback
- Explicit save vs autosave (content blocks use autosave)

### Previous Story Intelligence

**Story 1.7 learnings:**
- JSON parse guard on request.json() — wrap in try/catch
- TOCTOU guard: include `deletedAt: null` in update WHERE clauses
- Separate error states for network vs validation vs generic API failures
- Timer cleanup with useRef + useEffect for auto-dismiss messages
- `requirePermission` + `can()` pattern for RBAC

**Story 1.6 learnings:**
- Entity-scope checks critical for all API routes (review finding)
- Stage ownership verification before mutations

**Key files to modify:**
- `components/recruitment/vacancy/content-block-editor.tsx` — Add media to BLOCK_TYPE_CONFIG + renderBlockContent
- `lib/recruitment/types.ts` — Add MediaContent interface, extend ContentBlock type
- `lib/recruitment/schemas.ts` — Add media content validation
- `messages/nl.json` / `messages/fr.json` — Media/photo translation keys

**Key files to create:**
- `components/recruitment/vacancy/blocks/media-block.tsx` — Media block renderer
- `components/recruitment/vacancy/photo-library-dialog.tsx` — SharePoint photo picker
- `app/api/recruitment/vacancies/[id]/photo/route.ts` — Photo proxy
- `app/api/recruitment/sharepoint/photos/route.ts` — Photo listing API

**Key files to reference (DO NOT modify):**
- `lib/graph-teams.ts` — Existing Graph utilities (graphDocs, downloadDocument, isSafeImageMimeType, etc.)
- `app/api/starters/[id]/photo/route.ts` — Reference pattern for photo proxy

### Scope Boundaries

**In scope for Story 1.8:**
- Media content block type in the editor
- SharePoint photo library browser dialog with thumbnail grid
- Photo proxy API route (server-side, authenticated)
- Photo listing API for entity-scoped library
- Graceful degradation when Graph is unavailable
- Image preview in editor and rendered content
- Caching headers for served photos
- i18n for nl/fr

**Deferred (explicit):**
- Public vacancy page rendering of media blocks (Epic 3, Story 3.2)
- Image upload TO SharePoint (not in spec — browse only)
- Image cropping/resizing in the editor
- Image alt text / caption fields (future UX enhancement)
- Graph API retry logic (NFR22 — infrastructure-level concern)
- Multiple image support per block (one image per Media block for now)

### References

- [Epics: Story 1.8 ACs] `_bmad-output/planning-artifacts/epics.md` lines 533-547
- [Architecture: SharePoint via Graph] `_bmad-output/planning-artifacts/architecture.md` — AR5
- [Architecture: Content blocks] `_bmad-output/planning-artifacts/architecture.md` — AR10
- [UX: ContentBlockEditor + Media] `_bmad-output/planning-artifacts/ux-design-specification.md` — UX-DR10
- [UX: next/image responsive] `_bmad-output/planning-artifacts/ux-design-specification.md` — Implementation Guidelines
- [Existing: Graph utils] `lib/graph-teams.ts`
- [Existing: Photo proxy] `app/api/starters/[id]/photo/route.ts`
- [Existing: ContentBlockEditor] `components/recruitment/vacancy/content-block-editor.tsx`
- [NFR22: Graph retries] `_bmad-output/planning-artifacts/epics.md`
- [NFR23: SharePoint degradation] `_bmad-output/planning-artifacts/epics.md`
- [NFR30: Graph unavailability] `_bmad-output/planning-artifacts/epics.md`

### Review Findings

- [x] [Review][Patch] Search query injection risk — fixed: escape single quotes in search input before Graph API call
- [x] [Review][Patch] Photo proxy cross-entity read — fixed: verify driveId matches expected site drive before downloading
- [x] [Review][Defer] Graph folder path assumes `{EntityName}/Photos/` exists — returns empty if not created in SharePoint — deferred, operational setup concern

## Dev Agent Record

### Agent Model Used
Opus 4.6

### Debug Log References
- No linter errors on any modified/created files

### Completion Notes List
- Reused existing `graphDocs()`, `downloadDocument()`, `isSafeImageMimeType()`, `graphErrorToStatus()` from `lib/graph-teams.ts` — zero Graph reinvention
- Photo proxy follows exact same pattern as starter photo proxy: binary download → mime validation → caching headers → nosniff
- Photo library API browses `{EntityName}/Photos/` folder in SharePoint, returns folders + filtered image list
- Graph unavailability handled gracefully: 503 from API, friendly message in dialog, editor stays usable
- MediaBlock stores driveId+itemId references in content JSON, NOT base64 or URLs
- ContentBlockEditor extended with vacancyId+entityId props threaded through to MediaBlock and PhotoLibraryDialog
- Search implemented via Graph search endpoint on the folder scope

### Change Log
- Added Media content block type to vacancy content system
- Created photo proxy API with RBAC, caching, mime validation
- Created SharePoint photo library browser with folder navigation, search, and selection
- Integrated media blocks into vacancy edit page
- Added 12 translation keys for nl and fr

### File List
- `lib/recruitment/types.ts` (modified — added MediaContent interface, extended ContentBlock)
- `lib/recruitment/schemas.ts` (modified — added mediaContentSchema, extended contentBlockSchema)
- `components/recruitment/vacancy/content-block-editor.tsx` (modified — added media to BLOCK_TYPE_CONFIG, vacancyId/entityId props)
- `components/recruitment/vacancy/blocks/media-block.tsx` (created)
- `components/recruitment/vacancy/photo-library-dialog.tsx` (created)
- `app/api/recruitment/vacancies/[id]/photo/route.ts` (created)
- `app/api/recruitment/sharepoint/photos/route.ts` (created)
- `app/(authenticated)/recruitment/vacatures/[id]/bewerken/client.tsx` (modified — passes vacancyId/entityId to ContentBlockEditor)
- `messages/nl.json` (modified — added media namespace + type_media key)
- `messages/fr.json` (modified — added media namespace + type_media key)
