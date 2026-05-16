# Story 2.4: Drag & Drop Stage Transitions

> Status: done

## User Story

As a headhunter,
I want to move candidates between pipeline stages by dragging their card,
So that I can quickly progress candidates through the recruitment process.

## Acceptance Criteria

1. **Given** I have `candidate:write` permission and am viewing the pipeline
   **When** I grab a candidate card (mouse down or Space key)
   **Then** the card lifts with a shadow, the source column dims slightly
   **And** visual feedback appears within 100ms of the grab action (NFR2)

2. **Given** I am dragging a candidate card
   **When** I hover over a valid target column
   **Then** the column border pulses with the stage color indicating a valid drop target

3. **Given** I drop a candidate card in a new stage column
   **When** the drop completes
   **Then** the card optimistically moves to the new column immediately
   **And** an API call fires to persist the stage transition
   **And** if the API call fails, the card animates back to its original position with an error toast

4. **Given** I drop a candidate in an intermediate (non-terminal) stage
   **When** the drop completes
   **Then** the move is recorded with timestamp, actor, from-stage, and to-stage

5. **Given** I drop a candidate in a terminal stage ("Rejected" or "Hired")
   **When** the drop completes
   **Then** a CandidateMoveDialog appears for confirmation before persisting
   **And** if I cancel, the card returns to its source column

6. **Given** I am dragging a card
   **When** I press Escape or drop outside any column
   **Then** the card animates back to its original position

## Tasks

- [x] Task 1: Create `lib/recruitment/pipeline-engine.ts` — stage transition validation
- [x] Task 2: Create `POST /api/recruitment/candidates/[id]/move` — API endpoint
- [x] Task 3: Add dnd-kit DndContext + sensors + DragOverlay to PipelineKanban; make CandidateCard draggable and StageColumn droppable with visual feedback
- [x] Task 4: Implement optimistic move with rollback + error toast
- [x] Task 5: Create CandidateMoveDialog for terminal stages + dnd-kit announcements + i18n

## Dev Notes

### Architecture Decisions

- **Library:** `@dnd-kit/core` (already installed v6.3.1) — mandated by architecture (AR6)
- **State model:** React Server Components for initial data + client-side optimistic updates for Kanban
- **API route:** `POST /api/recruitment/candidates/[id]/move` per architecture spec
- **Server logic:** `lib/recruitment/pipeline-engine.ts` for transition validation + audit logging
- **Audit:** Use existing `createAuditLog()` from `lib/audit.ts` with new action `CANDIDATE_STAGE_MOVE`
- **NFR:** <100ms visual response on grab (dnd-kit handles this natively with pointer sensor)

### Stage Transition Business Rules

From UX spec (`ux-design-specification.md`):
- Cards can only move **forward** (higher order) or to a **terminal** stage (Rejected/Hired)
- **No backward movement** — prevents accidental un-screening
- Exception: admin backward via candidate detail dropdown (**NOT** this story — future Epic)
- **One card at a time** (no multi-select drag in MVP)
- Invalid columns (backward) must NOT highlight as valid drop targets

Validation function signature:
```typescript
function canMoveToStage(
  currentStage: { order: number; isTerminal: boolean },
  targetStage: { order: number; isTerminal: boolean }
): boolean {
  if (targetStage.isTerminal) return true // Always allow move to terminal
  return targetStage.order > currentStage.order // Forward only
}
```

### Terminal vs Intermediate Drop Behavior

| Drop target | Behavior |
|-------------|----------|
| **Intermediate** (non-terminal, forward) | Optimistic move → API call → done (no dialog) |
| **Terminal** (Rejected/Hired) | Card stays in source → CandidateMoveDialog opens → on confirm: optimistic move + API → on cancel: no-op |

**Important:** The full contextual popover with email template selection is deferred to Epic 6. Story 2.4's CandidateMoveDialog is a simple confirmation dialog only.

### Component Architecture

```
PipelineKanban (owns DndContext)
├── DndContext (sensors, collision detection, announcements)
│   ├── StageColumn (useDroppable per column)
│   │   └── CandidateCard (useDraggable per card)
│   └── DragOverlay (portal, renders card preview during drag)
└── CandidateMoveDialog (AlertDialog for terminal confirmation)
```

### dnd-kit Integration Details

**Sensors:**
```typescript
import { useSensors, useSensor, PointerSensor, KeyboardSensor, TouchSensor } from '@dnd-kit/core'

const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  useSensor(KeyboardSensor),
  useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
)
```

**Keyboard interaction:** Space to grab (dnd-kit KeyboardSensor default), Arrow keys to move between columns, Space/Enter to drop, Escape to cancel.

**DragOverlay:** Renders a copy of CandidateCard at cursor position (portal). Source card gets `opacity-30` while dragging.

**Drop validation:** Use `onDragOver` to check `canMoveToStage()` and set visual state on columns. Invalid targets get no highlight. Valid targets get border pulse with green/stage-color.

**Announcements (a11y):**
```typescript
const announcements = {
  onDragStart: ({ active }) => `Grabbed ${active.data.current.name}`,
  onDragOver: ({ over }) => over ? `Over ${over.data.current.stageName}` : '',
  onDragEnd: ({ active, over }) => over
    ? `Dropped ${active.data.current.name} in ${over.data.current.stageName}`
    : `Cancelled drag of ${active.data.current.name}`,
  onDragCancel: ({ active }) => `Cancelled drag of ${active.data.current.name}`,
}
```

### API Endpoint Design

**`POST /api/recruitment/candidates/[id]/move`**

Request body:
```json
{ "toStageId": "cuid_target_stage" }
```

Response (200):
```json
{ "data": { "id": "...", "stageId": "new_stage_id", "updatedAt": "..." } }
```

Errors:
- `400 INVALID_MOVE` — backward move to non-terminal stage
- `403 FORBIDDEN` — missing `candidate:write` permission
- `404 NOT_FOUND` — candidate or stage not found
- `500 INTERNAL_ERROR` — database failure

Server logic:
1. `requirePermission('candidate:write', { entityId })` — uses vacancy→entity relation
2. Load candidate + current stage + target stage (verify both belong to same vacancy)
3. `canMoveToStage(currentStage, targetStage)` — validate direction
4. `prisma.candidate.update({ stageId, updatedAt: now() })` — move candidate
5. `createAuditLog({ action: 'CANDIDATE_STAGE_MOVE', actorId, target: candidateId, meta: { fromStageId, toStageId, vacancyId } })`
6. Return updated candidate subset

### Optimistic Update Pattern

```typescript
// On drop (intermediate stage):
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event
  if (!over || !canMoveToStage(activeStage, targetStage)) return

  if (targetStage.isTerminal) {
    // Open dialog, don't move yet
    setPendingMove({ candidateId, fromStageId, toStageId })
    return
  }

  // Optimistic: immediately update local state
  setCandidates(prev => prev.map(c =>
    c.id === candidateId
      ? { ...c, stage: targetStage, updatedAt: new Date().toISOString() }
      : c
  ))

  // Fire API
  const res = await fetch(`/api/recruitment/candidates/${candidateId}/move`, { ... })
  if (!res.ok) {
    // Rollback
    setCandidates(prev => prev.map(c =>
      c.id === candidateId
        ? { ...c, stage: originalStage, updatedAt: originalUpdatedAt }
        : c
    ))
    toast.error(t('pipeline.moveError'))
  }
}
```

### CandidateMoveDialog

Simple AlertDialog for terminal stages:
- Title: "Move [name] to [stage]?"
- Description: stage-specific context (Rejected → warning tone; Hired → positive tone)
- Actions: Confirm (destructive variant for Rejected, default for Hired) + Cancel
- On confirm: optimistic move + API call + close dialog
- On cancel: clear pendingMove, card stays in source
- Focus trap + `role="alertdialog"` (Radix AlertDialog provides this)

### Visual States (CSS)

| Element | State | CSS |
|---------|-------|-----|
| Source card | Dragging | `opacity-30` |
| DragOverlay card | Active | `shadow-lg rotate-2 scale-105` |
| Valid column | Drag over | `ring-2 ring-primary/50 animate-pulse` |
| Invalid column | Drag over | No visual change (drops disabled) |
| Source column | Card lifted | `opacity-75` (slight dim) |

### Data Flow

```
User grabs card → dnd-kit DndContext onDragStart
  → Set activeId, source card gets opacity-30
  → DragOverlay renders card preview

User drags over column → onDragOver
  → canMoveToStage() check
  → Valid: column gets ring-2 + pulse animation
  → Invalid: no highlight (column ignores)

User drops → onDragEnd
  → Terminal stage? → Open CandidateMoveDialog
  → Intermediate stage? → Optimistic update + API call
  → Outside / Escape? → No-op (dnd-kit auto-cancels)

API response:
  → Success: state already updated (optimistic)
  → Failure: rollback local state + error toast
```

### File Structure (New/Modified)

```
lib/recruitment/
  pipeline-engine.ts         # NEW — canMoveToStage(), MoveValidationError

app/api/recruitment/candidates/[id]/move/
  route.ts                   # NEW — POST handler

components/recruitment/pipeline/
  pipeline-kanban.tsx        # MODIFY — wrap with DndContext, sensors, DragOverlay, handleDragEnd
  candidate-card.tsx         # MODIFY — add useDraggable, drag data attributes
  stage-column.tsx           # MODIFY — add useDroppable, visual drop zone state
  candidate-move-dialog.tsx  # NEW — AlertDialog for terminal stage confirmation

lib/audit.ts                 # MODIFY — add CANDIDATE_STAGE_MOVE to AuditAction type
```

### RBAC Rules

- `candidate:write` required to drag cards (hide drag affordance if not permitted)
- `canWrite` prop already threaded through PipelineKanban — use to conditionally apply draggable
- API endpoint validates `candidate:write` server-side via `requirePermission`
- Entity scope: candidate→vacancy→entity chain for entity-level permission check

### Anti-Patterns to Avoid

- **Do NOT implement email template selection in CandidateMoveDialog** — that's Epic 6
- **Do NOT implement SSE event emission** — that's Story 2.5
- **Do NOT support backward moves** — forward-only + terminal is the rule
- **Do NOT add multi-select drag** — MVP is one card at a time
- **Do NOT use `@dnd-kit/sortable`** for card reordering within a column — cards don't reorder within a stage
- **Do NOT make drag available without `candidate:write`** — hide grab affordance for read-only users

### Previous Story Intelligence (from Stories 2.1, 2.2, 2.3)

Key patterns to maintain:
- `'use client'` for all pipeline components
- `useTranslations('recruitment')` with dotted keys
- Error handling: `res.json()` wrapped in try/catch for non-JSON errors
- `fetchError` state pattern for graceful error display
- Toast for user feedback (use existing toast utility from shadcn)
- `PipelineCandidateItem` interface lives in `candidate-card.tsx`
- `daysInStage()` utility exported from `candidate-card.tsx`

### Existing Code to Reuse/Extend

- `components/recruitment/pipeline/pipeline-kanban.tsx` — main board to wrap with DndContext
- `components/recruitment/pipeline/candidate-card.tsx` — add useDraggable hook
- `components/recruitment/pipeline/stage-column.tsx` — add useDroppable hook
- `lib/audit.ts` — extend AuditAction type, use createAuditLog
- `lib/authz.ts` — requirePermission for API route
- `@dnd-kit/core` — already installed (v6.3.1)
- `@/components/ui/alert-dialog` — for CandidateMoveDialog (shadcn AlertDialog)

### i18n Keys Needed

Under `recruitment` namespace:
- `pipeline.moveError` — "Verplaatsen mislukt. Probeer opnieuw."
- `pipeline.moveSuccess` — "Kandidaat verplaatst naar {stage}."
- `pipeline.grabbed` — "{name} opgepakt"
- `pipeline.overStage` — "Boven {stage}"
- `pipeline.dropped` — "{name} geplaatst in {stage}"
- `pipeline.dragCancelled` — "Verplaatsen geannuleerd"
- `pipeline.confirmMoveTitle` — "{name} verplaatsen naar {stage}?"
- `pipeline.confirmMoveReject` — "Deze kandidaat wordt als afgewezen gemarkeerd."
- `pipeline.confirmMoveHire` — "Deze kandidaat wordt als aangenomen gemarkeerd."
- `pipeline.confirmButton` — "Bevestigen"
- `pipeline.cancelButton` — "Annuleren"

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture, dnd-kit, pipeline-engine.ts, POST candidates/[id]/move]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#PipelineKanban Drag States, CandidateMoveDialog, Drag Sensors, Accessibility]
- [Source: _bmad-output/implementation-artifacts/2-3-candidate-card-component.md#Dev Notes, Previous Story Intelligence]

### Review Findings

- [x] [Review][Patch] Double onCancel invocation in CandidateMoveDialog [candidate-move-dialog.tsx:48] — fixed: removed onClick from AlertDialogCancel; onOpenChange handles cancel
- [x] [Review][Patch] Stale moveError persists after subsequent successful move [pipeline-kanban.tsx:executeMove] — fixed: clear moveError on successful API response
- [x] [Review][Patch] Unused `isTerminal` prop in CandidateMoveDialog [candidate-move-dialog.tsx:18] — fixed: removed unused prop from interface and call site
- [x] [Review][Defer] Race condition: read-then-write without transaction in executeStageMove — deferred, pre-existing architectural pattern
- [x] [Review][Defer] Soft-deleted candidate/vacancy not guarded during update phase — deferred, vacancy lifecycle concern broader than this story

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- No linter errors across all new/modified files
- TypeScript compiles cleanly (pre-existing errors in unrelated test files only)
- Split `canMoveToStage` into client-safe `pipeline-rules.ts` to avoid bundling Prisma in client components
- `@dnd-kit/core` v6.3.1 already installed, no new dependencies needed

### Completion Notes List
- Task 1: Created `lib/recruitment/pipeline-rules.ts` (client-safe pure validation: `canMoveToStage`) and `lib/recruitment/pipeline-engine.ts` (server: `executeStageMove` with Prisma + audit logging + validation). Added `CANDIDATE_STAGE_MOVE` to `AuditAction` type.
- Task 2: Created `app/api/recruitment/candidates/[id]/move/route.ts` — POST handler with RBAC (`candidate:write`), entity-scoped permission check, Zod validation, proper error responses (400/403/404/422/500).
- Task 3: Rewrote `pipeline-kanban.tsx` with `DndContext`, `PointerSensor`/`KeyboardSensor`/`TouchSensor`, `DragOverlay` with card preview (rotate-2 + shadow-lg). Created `draggable-candidate-card.tsx` (useDraggable wrapper) and updated `stage-column.tsx` (useDroppable + valid/invalid visual states). Added `isTerminal` to Stage interface throughout component tree.
- Task 4: Implemented optimistic state update on drop → API call → rollback on failure with error toast (auto-dismiss 5s). Timer cleanup via useRef/useEffect.
- Task 5: Created `candidate-move-dialog.tsx` (AlertDialog for terminal stage confirmation, red variant for Reject). Added dnd-kit `announcements` for screen reader narration (grabbed/over/dropped/cancelled). Added 10 i18n keys to both `messages/nl.json` and `messages/fr.json`.

### File List
- `lib/recruitment/pipeline-rules.ts` — NEW (client-safe canMoveToStage validation)
- `lib/recruitment/pipeline-engine.ts` — NEW (server-side executeStageMove + audit)
- `lib/audit.ts` — MODIFIED (added CANDIDATE_STAGE_MOVE action)
- `app/api/recruitment/candidates/[id]/move/route.ts` — NEW (POST endpoint)
- `components/recruitment/pipeline/pipeline-kanban.tsx` — MODIFIED (DndContext integration)
- `components/recruitment/pipeline/stage-column.tsx` — MODIFIED (useDroppable + visual states)
- `components/recruitment/pipeline/draggable-candidate-card.tsx` — NEW (useDraggable wrapper)
- `components/recruitment/pipeline/candidate-move-dialog.tsx` — NEW (terminal confirmation)
- `components/recruitment/pipeline/pipeline-section.tsx` — MODIFIED (Stage interface + isTerminal)
- `app/(authenticated)/recruitment/vacatures/[id]/page.tsx` — MODIFIED (pass isTerminal to stages)
- `messages/nl.json` — MODIFIED (10 new pipeline DnD keys)
- `messages/fr.json` — MODIFIED (10 new pipeline DnD keys)
