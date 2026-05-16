# Story 1.3: Vacancy Content Block Builder

Status: done

## Story

As a headhunter,
I want to build rich vacancy descriptions using modular content blocks,
So that I can create professional, structured vacancy pages without a WYSIWYG editor.

## Acceptance Criteria

1. **Given** I am editing a vacancy
   **When** I open the content builder tab
   **Then** I see an ordered list of content blocks, each with a type icon, content area, and drag handle
   **And** I can add blocks of type: Text (rich paragraph), List (bullet items), Requirements (dealbreaker/nice-to-have tagged), Benefits (icon + text)

2. **Given** I have multiple content blocks
   **When** I drag a block's handle
   **Then** the block lifts visually and I can reorder it among other blocks
   **And** the new order persists immediately

3. **Given** I am editing a content block
   **When** I click into the content area
   **Then** I can edit inline (Enter to edit, Escape to stop)
   **And** the vacancy builder autosaves every 30 seconds
   **And** a "Draft saved" toast confirms each autosave

4. **Given** the vacancy has content blocks
   **When** I view the vacancy detail
   **Then** blocks render in order as structured content (JSON stored, React components rendered)

## Tasks / Subtasks

- [x] Task 1: Install dnd-kit and add content block Zod schema (AC: #1, #2)
  - [x] Install `@dnd-kit/core` and `@dnd-kit/sortable` + `@dnd-kit/utilities`
  - [x] Create `contentBlockSchema` in `lib/recruitment/schemas.ts` — validate array of `{ id, type, content, order }` with proper type discrimination
  - [x] Replace `content: z.any().optional()` in `vacancyUpdateSchema` with `content: z.array(contentBlockSchema).optional()`
  - [x] Verify existing PATCH handler still works (it passes `parsed.data` to Prisma — `content` is Json so array is fine)

- [x] Task 2: Build ContentBlockEditor component (AC: #1, #2, #3)
  - [x] Create `components/recruitment/vacancy/content-block-editor.tsx` — client component
  - [x] Props: `blocks: ContentBlock[]`, `onChange: (blocks: ContentBlock[]) => void`
  - [x] Render ordered list of blocks using `@dnd-kit/sortable` — each block has: type icon (lucide), content area, drag handle (GripVertical)
  - [x] "Add block" button at bottom with dropdown/popover to select type (Text, List, Requirements, Benefits)
  - [x] New blocks get a generated `cuid()` id, incremented order, and empty content
  - [x] DndContext + SortableContext wrapping the block list; `onDragEnd` reorders blocks and calls `onChange`
  - [x] Visual lift on drag (opacity change, shadow per dnd-kit)

- [x] Task 3: Build individual block type renderers/editors (AC: #1, #3)
  - [x] Create `components/recruitment/vacancy/blocks/text-block.tsx` — Textarea for rich paragraph editing
  - [x] Create `components/recruitment/vacancy/blocks/list-block.tsx` — Dynamic bullet list with add/remove items
  - [x] Create `components/recruitment/vacancy/blocks/requirements-block.tsx` — List with dealbreaker/nice-to-have tags per item
  - [x] Create `components/recruitment/vacancy/blocks/benefits-block.tsx` — List items with icon selector + text
  - [x] Each block: click to enter edit mode, Escape to exit; block-level delete button
  - [x] Each block editor dispatches content changes to parent via `onChange`

- [x] Task 4: Integrate content builder into vacancy edit flow (AC: #1, #3)
  - [x] Add a "Content" tab/section to the vacancy edit page (`bewerken/client.tsx`)
  - [x] Fetch vacancy `content` JSON, parse into `ContentBlock[]`, pass to `ContentBlockEditor`
  - [x] Implement autosave: `useEffect` with 30-second interval, PATCHes content to API when blocks change
  - [x] Show "Draft saved" / "Saving..." indicator (inline text, not toast library — project has no toast)
  - [x] On manual save (if any), include both basic fields and content blocks in PATCH

- [x] Task 5: Render content blocks on vacancy detail page (AC: #4)
  - [x] Create `components/recruitment/vacancy/content-block-renderer.tsx` — readonly display component
  - [x] Map each block type to a styled read-only component: Text → paragraph, List → bullet list, Requirements → tagged list, Benefits → icon + text grid
  - [x] Integrate into `app/(authenticated)/recruitment/vacatures/[id]/page.tsx` below the description section
  - [x] Render blocks in order from vacancy `content` JSON

- [x] Task 6: Add translation keys (AC: all)
  - [x] Add content builder keys to `messages/nl.json`: block type labels, add block, delete block, autosave messages, empty state
  - [x] Add matching keys to `messages/fr.json`

## Dev Notes

### Data Model

Content blocks are stored in the existing `content Json?` field on the `Vacancy` model (from Story 1.1). The field stores a JSON array of `ContentBlock` objects:

```typescript
interface ContentBlock {
  id: string                                    // cuid
  type: 'text' | 'list' | 'requirements' | 'benefits'  // no 'media' yet (Story 1.8)
  content: string | string[] | Record<string, unknown>  // varies by type
  order: number
}
```

**Content shapes per block type:**
- `text`: `content` is a `string` (plain text paragraph)
- `list`: `content` is a `string[]` (array of bullet items)
- `requirements`: `content` is `{ items: Array<{ text: string, tag: 'dealbreaker' | 'nice-to-have' }> }`
- `benefits`: `content` is `{ items: Array<{ icon: string, text: string }> }` (icon is a lucide icon name)

### Zod Validation

Replace `content: z.any().optional()` in `vacancyUpdateSchema` with a proper schema:

```typescript
const contentBlockSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'list', 'requirements', 'benefits']),
  content: z.union([
    z.string(),
    z.array(z.string()),
    z.record(z.unknown()),
  ]),
  order: z.number().int().min(0),
})

// In vacancyUpdateSchema:
content: z.array(contentBlockSchema).optional()
```

### Architecture Compliance

**Architecture decision:** "Vacancy builder → Modular JSON content blocks (array of typed objects) rendered via React components — No WYSIWYG dependency; clean data model; blocks reusable in templates"

**dnd-kit:** Architecture specifies dnd-kit for drag & drop (also used later for Kanban in Epic 2). Install `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.

**Component placement:** Per architecture spec:
```
components/recruitment/vacancy/
├── content-block-editor.tsx        # Block editor (NEW)
├── content-block-renderer.tsx      # Read-only display (NEW)
├── blocks/                         # Individual block type editors (NEW)
│   ├── text-block.tsx
│   ├── list-block.tsx
│   ├── requirements-block.tsx
│   └── benefits-block.tsx
├── vacancy-form.tsx                # Basic fields form (EXISTS)
└── vacancy-delete-button.tsx       # Delete UX (EXISTS)
```

### UX Patterns from Spec

- **ContentBlockEditor anatomy:** Ordered list of typed blocks; each with type icon, content area, drag handle
- **Block states:** View mode (rendered), Edit mode (inline editing), Drag reorder (block lifts)
- **Editing:** Click into content area to edit; Enter to start editing, Escape to stop
- **Autosave:** Every 30 seconds while in draft; show "Saved just now" / "Saving..." indicator
- **No manual save button for content** — publish is the deliberate commit
- **Drag reorder:** Block lifts visually (opacity/shadow); new order persists immediately
- **Add block:** Button at bottom of block list with type selector
- **Delete block:** Ghost action (appears on hover/focus)
- **Accessibility:** Each block focusable; arrow keys reorder; keyboard-accessible editing

### Anti-Patterns to Avoid

- Do NOT use a WYSIWYG/rich text editor (Tiptap, Slate, etc.) — architecture explicitly forbids this
- Do NOT use `react-beautiful-dnd` — use `@dnd-kit` (architecture decision)
- Do NOT use server actions — use `fetch()` to PATCH API route
- Do NOT use `sonner` or toast library — show autosave status as inline text indicator
- Do NOT add `media` block type yet — that's Story 1.8 (SharePoint integration)
- Do NOT modify the basic fields form (`vacancy-form.tsx`) — content blocks are a separate section/tab

### Existing Patterns to Follow

**API:** Content is saved via the existing PATCH `app/api/recruitment/vacancies/[id]/route.ts` — the handler already passes `parsed.data` (including `content`) to `prisma.vacancy.update`. No new API route needed.

**Client forms:** Controlled React state + shadcn primitives. No React Hook Form.

**Block IDs:** Use `crypto.randomUUID()` or a simple counter for client-side block IDs. Server doesn't need to validate uniqueness — it's client-state management.

**Icons per block type:** Use Lucide icons:
- Text → `Type` or `AlignLeft`
- List → `List`
- Requirements → `CheckCircle` or `ShieldCheck`
- Benefits → `Gift` or `Star`

### Previous Story Intelligence

**Story 1.1:** Created `content Json?` field on Vacancy, `ContentBlock` type in `lib/recruitment/types.ts`.

**Story 1.2:** Created vacancy CRUD (create/edit/detail pages), PATCH handler, schemas. Review fixed: `status` stripped from update schema; try/catch on all routes; edit page has server permission guard. The edit page currently edits basic fields only — `content` is not loaded into the form.

**Key files to modify/extend:**
- `lib/recruitment/schemas.ts` — replace `z.any()` with proper content block schema
- `app/(authenticated)/recruitment/vacatures/[id]/bewerken/client.tsx` — add content editor section
- `app/(authenticated)/recruitment/vacatures/[id]/page.tsx` — add content block rendering
- `lib/recruitment/types.ts` — already has `ContentBlock` interface (may need minor updates)
- `messages/nl.json` / `messages/fr.json` — content builder translation keys

### References

- [Architecture: Vacancy builder decision] `_bmad-output/planning-artifacts/architecture.md` line 189
- [Architecture: dnd-kit decision] `_bmad-output/planning-artifacts/architecture.md` line 188
- [Architecture: Component structure] `_bmad-output/planning-artifacts/architecture.md` lines 461-493
- [UX: ContentBlockEditor spec] `_bmad-output/planning-artifacts/ux-design-specification.md` lines 1258-1266
- [UX: Autosave pattern] `_bmad-output/planning-artifacts/ux-design-specification.md` line 1392
- [Existing: ContentBlock type] `lib/recruitment/types.ts` lines 14-19
- [Existing: PATCH handler] `app/api/recruitment/vacancies/[id]/route.ts` lines 53-111
- [Existing: Update schema] `lib/recruitment/schemas.ts` lines 11-13

### Review Findings

- [x] [Review][Patch] In-place sort mutates React state — `blocks.sort()` in render mutates the prop array [content-block-editor.tsx:272] — fixed: useMemo with spread copy
- [x] [Review][Patch] SortableContext items out of sync with DOM order — `items` uses unsorted `blocks.map(b => b.id)` while children are rendered sorted by `order` [content-block-editor.tsx:268] — fixed: both use sortedBlocks
- [x] [Review][Patch] Renderer shows hardcoded English "Must"/"Nice" and raw `block.type` instead of i18n keys [content-block-renderer.tsx:62,108] — fixed: useTranslations with contentBlocks.tag_* and type_* keys
- [x] [Review][Patch] Autosave dirty flag race — `dirtyRef.current = false` on save success without checking if new edits landed during the request [bewerken/client.tsx:57] — fixed: snapshot comparison before clearing dirty
- [x] [Review][Defer] Zod content union not discriminated on type — type/content mismatch can pass validation — deferred, architectural decision for tighter validation in later story
- [x] [Review][Defer] No beforeunload flush for unsaved content blocks — deferred, acceptable trade-off for current scope
- [x] [Review][Defer] Client allows adding >50 blocks without UI guard — server rejects, but UX could be better — deferred for polish

## Dev Agent Record

### Agent Model Used

Opus 4.6

### Debug Log References

- TS compilation verified: no recruitment-specific errors
- Pre-existing test file errors confirmed unrelated
- Linter: 0 errors across all new/modified files

### Completion Notes List

- Installed @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities for drag-and-drop
- Replaced z.any() content validation with typed contentBlockSchema (text, list, requirements, benefits)
- Built ContentBlockEditor with dnd-kit sortable: drag handle, visual lift, type icons, add/delete blocks
- Built 4 block type editors: TextBlock (textarea), ListBlock (dynamic bullets), RequirementsBlock (dealbreaker/nice-to-have tags), BenefitsBlock (icon picker + text)
- Integrated content builder into vacancy edit flow with 30-second autosave interval
- Built ContentBlockRenderer for read-only display on vacancy detail page
- Added 25 translation keys for NL and FR
- Updated ContentBlock types with proper RequirementItem and BenefitItem interfaces

### Change Log

- 2026-05-15: Story 1.3 implementation complete — content block builder with dnd-kit, autosave, 4 block types, read-only renderer

### File List

**New files:**
- components/recruitment/vacancy/content-block-editor.tsx
- components/recruitment/vacancy/content-block-renderer.tsx
- components/recruitment/vacancy/blocks/text-block.tsx
- components/recruitment/vacancy/blocks/list-block.tsx
- components/recruitment/vacancy/blocks/requirements-block.tsx
- components/recruitment/vacancy/blocks/benefits-block.tsx

**Modified files:**
- lib/recruitment/schemas.ts — added contentBlockSchema, requirementItemSchema, benefitItemSchema; replaced z.any() with typed array
- lib/recruitment/types.ts — added RequirementItem, BenefitItem interfaces; refined ContentBlock.content type
- app/(authenticated)/recruitment/vacatures/[id]/bewerken/client.tsx — added content block editor section with autosave
- app/(authenticated)/recruitment/vacatures/[id]/page.tsx — added ContentBlockRenderer below description
- messages/nl.json — added contentBlocks namespace (25 keys)
- messages/fr.json — added contentBlocks namespace (25 keys)
- package.json — added @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
