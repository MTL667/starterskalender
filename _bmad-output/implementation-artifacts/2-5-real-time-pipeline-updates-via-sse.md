# Story 2.5: Real-Time Pipeline Updates via SSE

> Status: done

## User Story

As a headhunter,
I want to see changes made by other users on the same pipeline in real-time,
So that I always have an accurate view of the current state without refreshing.

## Acceptance Criteria

1. **Given** I am viewing a vacancy pipeline
   **When** another user moves a candidate to a different stage
   **Then** I see the candidate card animate to its new column within 2 seconds (FR23)
   **And** the card briefly highlights to indicate it was moved externally

2. **Given** I am viewing a vacancy pipeline
   **When** another user adds a new candidate
   **Then** the new candidate card animates into the first stage column with a subtle highlight

3. **Given** the SSE connection drops
   **When** disconnection is detected
   **Then** an amber banner appears below the filter bar: "Reconnecting..."
   **And** the system attempts auto-reconnect with exponential backoff

4. **Given** the SSE connection reconnects
   **When** connection is re-established
   **Then** the amber banner disappears
   **And** the pipeline state is reconciled with the server (fetch latest state)

5. **Given** I am actively dragging a candidate
   **When** an SSE update arrives for that same candidate
   **Then** the update is queued and applied after my drag operation completes (no interruption)

## Tasks

- [x] Task 1: Create `lib/recruitment/pipeline-events.ts` — event type definitions + payload types + emit helper
- [x] Task 2: Extend SSE infrastructure — add recruitment event types to `SSEEventType`, `SSEProvider` listeners, and SSE route entity scope
- [x] Task 3: Emit SSE events from `pipeline-engine.ts` (candidate-moved) and candidates route (candidate-added)
- [x] Task 4: Subscribe to SSE in PipelineKanban — handle remote moves/adds with highlight animation + drag queueing
- [x] Task 5: Add reconnection banner below filter bar + full reconciliation on reconnect + i18n

## Dev Notes

### Architecture Decisions

- **SSE bus:** Reuse existing `lib/events.ts` EventBus + `app/api/sse/route.ts` endpoint + `SSEProvider`
- **Event types:** Extend `SSEEventType` union with `recruitment:pipeline:candidate-moved` and `recruitment:pipeline:candidate-added`
- **Pipeline events file:** New `lib/recruitment/pipeline-events.ts` as specified in architecture
- **Entity scoping:** SSE route must also subscribe to entities visible via `recruitment:read` (not just `starters:read`)
- **Performance:** <2s end-to-end perception (FR23) — emit immediately after DB commit, broadcast is in-memory

### Existing SSE Infrastructure (Reuse)

| Component | File | What it does |
|-----------|------|--------------|
| EventBus | `lib/events.ts` | In-memory pub/sub: `emit(event)`, `subscribe(entityIds, cb)` |
| SSE Route | `app/api/sse/route.ts` | Authenticated ReadableStream, entity-scoped, 30s heartbeat |
| SSE Provider | `components/providers/sse-provider.tsx` | `EventSource`, reconnect (exp backoff, max 5 attempts), `useSSE(pattern, handler)`, `useSSEStatus()` |
| Pattern matching | SSE Provider | `matchesPattern()` supports `recruitment:*` wildcards |
| Layout wiring | `app/(authenticated)/layout.tsx` | `SSEProvider` already wraps all authenticated routes |

### What Needs to Change

#### 1. `lib/events.ts` — Extend `SSEEventType`
```typescript
export type SSEEventType =
  | 'starter:created' | 'starter:updated' | 'starter:deleted'
  | 'task:created' | 'task:updated' | 'task:completed'
  | 'notification:new'
  | 'recruitment:pipeline:candidate-moved'   // NEW
  | 'recruitment:pipeline:candidate-added'   // NEW
```

#### 2. `components/providers/sse-provider.tsx` — Add recruitment event listeners
The `eventTypes` array in the `connect()` function needs the two new types so `EventSource.addEventListener` picks them up:
```typescript
const eventTypes: SSEEventType[] = [
  // ... existing ...
  'recruitment:pipeline:candidate-moved',
  'recruitment:pipeline:candidate-added',
]
```

#### 3. `app/api/sse/route.ts` — Extend entity scope for recruitment
Currently scoped to `visibleEntityIds(authUser, 'starters:read')`. Add recruitment entity visibility:
```typescript
const starterScope = visibleEntityIds(authUser, 'starters:read')
const recruitmentScope = visibleEntityIds(authUser, 'recruitment:read')
// Merge both scopes into entityIds
```
If either scope is `'ALL'`, subscribe to all entities. Otherwise, union both arrays.

#### 4. `lib/recruitment/pipeline-events.ts` — NEW
```typescript
import { eventBus, type SSEEventType } from '@/lib/events'

export interface CandidateMovedPayload {
  vacancyId: string
  candidateId: string
  fromStageId: string
  toStageId: string
  movedBy: string
  timestamp: string
}

export interface CandidateAddedPayload {
  vacancyId: string
  candidateId: string
  stageId: string
  firstName: string
  lastName: string
  addedBy: string
  timestamp: string
}

export function emitCandidateMoved(entityId: string, payload: CandidateMovedPayload) {
  eventBus.emit({
    type: 'recruitment:pipeline:candidate-moved' as SSEEventType,
    entityId,
    payload: payload as Record<string, unknown>,
  })
}

export function emitCandidateAdded(entityId: string, payload: CandidateAddedPayload) {
  eventBus.emit({
    type: 'recruitment:pipeline:candidate-added' as SSEEventType,
    entityId,
    payload: payload as Record<string, unknown>,
  })
}
```

#### 5. `lib/recruitment/pipeline-engine.ts` — Emit after move
After `createAuditLog`, call `emitCandidateMoved` with the entity ID from `candidate.vacancy.entityId`.

#### 6. Candidate creation route — Emit after add
In `app/api/recruitment/vacancies/[id]/candidates/route.ts` POST handler, after successful creation, call `emitCandidateAdded`.

#### 7. PipelineKanban — Subscribe + handle SSE updates
```typescript
useSSE('recruitment:pipeline:*', (event) => {
  if (event.payload?.vacancyId !== vacancyId) return // filter to current vacancy

  if (event.type === 'recruitment:pipeline:candidate-moved') {
    handleRemoteMove(event.payload)
  } else if (event.type === 'recruitment:pipeline:candidate-added') {
    handleRemoteAdd(event.payload)
  }
})
```

**Remote move handling:**
- If `activeId` is set (user is dragging), queue the event and apply after drag ends
- Otherwise, update candidate's stage in local state + add a `isHighlighted` flag
- Clear highlight after ~2 seconds via timeout

**Remote add handling:**
- Fetch the new candidate data or reconstruct from payload
- Add to candidates array with `isHighlighted` flag
- Card animates in via CSS (opacity 0→1 transition)

#### 8. Drag queueing
```typescript
const pendingSSEEvents = useRef<SSEEvent[]>([])
const isDragging = !!activeId

// In SSE handler:
if (isDragging && event.payload?.candidateId === activeId) {
  pendingSSEEvents.current.push(event)
  return
}

// In handleDragEnd / handleDragCancel:
// After drag resolves, process queued events:
for (const queued of pendingSSEEvents.current) {
  processSSEEvent(queued)
}
pendingSSEEvents.current = []
```

#### 9. Reconnection banner
```tsx
const sseStatus = useSSEStatus()

{sseStatus === 'reconnecting' && (
  <div className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-md px-3 py-2">
    {t('pipeline.reconnecting')}
  </div>
)}
```

On reconnect (status changes from `reconnecting` to `connected`), trigger `fetchCandidates()` for full reconciliation.

### Highlight Animation for Remote Updates

New CSS utility for briefly highlighting moved/added cards:

```css
/* In candidate-card or a wrapper */
.sse-highlight {
  animation: sse-pulse 2s ease-out;
}

@keyframes sse-pulse {
  0% { box-shadow: 0 0 0 2px hsl(var(--primary) / 0.4); }
  100% { box-shadow: 0 0 0 0 transparent; }
}
```

Or use Tailwind `animate-` class with a custom keyframe in `tailwind.config.ts`.

### File Structure (New/Modified)

```
lib/recruitment/
  pipeline-events.ts              # NEW — event type definitions + emit helpers
  pipeline-engine.ts              # MODIFY — call emitCandidateMoved after stage move

lib/events.ts                     # MODIFY — add recruitment SSEEventType variants

app/api/sse/route.ts              # MODIFY — add recruitment:read entity scope
app/api/recruitment/vacancies/[id]/candidates/route.ts  # MODIFY — call emitCandidateAdded

components/providers/sse-provider.tsx          # MODIFY — add recruitment event listeners
components/recruitment/pipeline/pipeline-kanban.tsx  # MODIFY — useSSE subscription, handlers, drag queue, highlight
components/recruitment/pipeline/candidate-card.tsx   # MODIFY — accept isHighlighted prop for animation

messages/nl.json                  # MODIFY — add reconnection i18n key
messages/fr.json                  # MODIFY — add reconnection i18n key
```

### RBAC Rules

- SSE route: extend entity scope with `recruitment:read` visibility
- No new permission needed — existing SSE auth + entity scoping applies
- Pipeline events only broadcast to users who can see the entity

### Anti-Patterns to Avoid

- **Do NOT create a separate SSE endpoint for recruitment** — reuse `/api/sse`
- **Do NOT refetch on every SSE event** — update local state directly; only refetch on reconnect
- **Do NOT block drag interaction for SSE events** — queue and apply after drag completes
- **Do NOT emit SSE events before DB commit** — emit only after successful persistence
- **Do NOT include sensitive candidate data in SSE payloads** — only IDs and minimal metadata

### Previous Story Intelligence (from Stories 2.1–2.4)

Key patterns to maintain:
- `'use client'` for all pipeline components
- `useTranslations('recruitment')` with dotted keys
- `res.json()` wrapped in try/catch for non-JSON errors
- `fetchError` state pattern for graceful error display
- `useRef` for timers + cleanup on unmount
- `canMoveToStage` validation on client side (from `pipeline-rules.ts`)
- Optimistic update pattern with rollback (from Story 2.4)

Review findings from previous stories:
- Timer cleanup via useRef/useEffect (Story 2.1)
- Clear stale error state on success (Story 2.4)
- Don't duplicate onCancel invocations (Story 2.4)

### Existing Code to Reuse/Extend

- `lib/events.ts` — EventBus singleton
- `app/api/sse/route.ts` — SSE HTTP endpoint
- `components/providers/sse-provider.tsx` — `useSSE`, `useSSEStatus`, reconnection logic
- `components/recruitment/pipeline/pipeline-kanban.tsx` — main board to add SSE subscription
- `lib/recruitment/pipeline-engine.ts` — add emit call after stage move
- `app/api/recruitment/vacancies/[id]/candidates/route.ts` — add emit call after candidate add

### i18n Keys Needed

Under `recruitment.pipeline` namespace:
- `pipeline.reconnecting` — "Opnieuw verbinden..."

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.5]
- [Source: _bmad-output/planning-artifacts/architecture.md#SSE Event Naming, Event Payload, pipeline-events.ts]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#PipelineKanban SSE update state, Reconnection UX]
- [Source: lib/events.ts, app/api/sse/route.ts, components/providers/sse-provider.tsx — existing infrastructure]
- [Source: _bmad-output/implementation-artifacts/2-4-drag-drop-stage-transitions.md#Dev Notes]

### Review Findings

- [x] fixed: [Review][Decision→Patch] Cross-column motion animation — added framer-motion `layoutId` + `LayoutGroup` for smooth cross-column transitions
- [x] fixed: [Review][Decision→Patch] New candidate entrance animation — added framer-motion `initial={{ opacity: 0, y: 8 }}` for slide-in on mount, highlight set before fetchCandidates
- [x] fixed: [Review][Patch] Emit helpers wrapped in try/catch — SSE emit failure no longer breaks API response [pipeline-engine.ts, candidates/route.ts]
- [x] fixed: [Review][Patch] flushQueuedEvents loop wrapped in try/catch — malformed queued events skipped safely [pipeline-kanban.tsx]
- [x] fixed: [Review][Patch] activeIdRef race — set `activeIdRef.current = null` directly in handleDragEnd/handleDragCancel before flushQueuedEvents [pipeline-kanban.tsx]
- [x] fixed: [Review][Patch] Remote move now uses server timestamp from payload instead of client timestamp [pipeline-kanban.tsx]
- [x] fixed: [Review][Patch] Reconnect refetch now covers any non-connected→connected transition (not just reconnecting→connected) [pipeline-kanban.tsx]
- [x] [Review][Defer] Entity scope over-subscription — user with only starters:read receives recruitment events for same entity — deferred, architectural limitation

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- No linter errors across all new/modified files
- TypeScript compiles cleanly (no errors in Story 2.5 files)
- Reused existing SSE infrastructure (EventBus, SSE route, SSEProvider) — no new dependencies
- Added `sse-highlight` keyframe animation to tailwind.config.ts

### Completion Notes List
- Task 1: Created `lib/recruitment/pipeline-events.ts` — typed payloads (`CandidateMovedPayload`, `CandidateAddedPayload`), `PIPELINE_EVENTS` const, and emit helpers (`emitCandidateMoved`, `emitCandidateAdded`)
- Task 2: Extended `SSEEventType` in `lib/events.ts` with 2 recruitment types. Added both to `SSEProvider` eventTypes array. Extended SSE route entity scope to union `starters:read` and `recruitment:read` visibility.
- Task 3: Added `emitCandidateMoved` call in `pipeline-engine.ts` after audit log. Added `emitCandidateAdded` call in candidates POST route after successful creation.
- Task 4: Added `useSSE('recruitment:pipeline:*', handler)` in PipelineKanban. Remote moves update candidate stage in local state + add highlight. Remote adds trigger full refetch + highlight. Drag queueing via `queuedEvents` ref — events buffered while `activeId` is set, flushed in `handleDragEnd`/`handleDragCancel`. Added `highlightedIds` state with 2s auto-clear timers. Threaded `highlightedIds` through StageColumn → DraggableCandidateCard. Added `animate-sse-highlight` CSS animation (2s box-shadow pulse).
- Task 5: Added amber reconnection banner using `useSSEStatus()` — shown when status is 'reconnecting'. Auto-reconciliation: `useEffect` detects reconnecting→connected transition and triggers `fetchCandidates()`. Added `pipeline.reconnecting` i18n key to NL and FR.

### File List
- `lib/recruitment/pipeline-events.ts` — NEW (SSE event types + emit helpers)
- `lib/events.ts` — MODIFIED (added 2 recruitment SSEEventType variants)
- `components/providers/sse-provider.tsx` — MODIFIED (added 2 recruitment event listeners)
- `app/api/sse/route.ts` — MODIFIED (extended entity scope with recruitment:read)
- `lib/recruitment/pipeline-engine.ts` — MODIFIED (emit candidate-moved after stage move)
- `app/api/recruitment/vacancies/[id]/candidates/route.ts` — MODIFIED (emit candidate-added after creation)
- `components/recruitment/pipeline/pipeline-kanban.tsx` — MODIFIED (SSE subscription, highlight, drag queue, reconnect banner)
- `components/recruitment/pipeline/stage-column.tsx` — MODIFIED (added highlightedIds prop)
- `components/recruitment/pipeline/draggable-candidate-card.tsx` — MODIFIED (added isHighlighted prop + animation class)
- `tailwind.config.ts` — MODIFIED (added sse-highlight keyframe + animation)
- `messages/nl.json` — MODIFIED (added pipeline.reconnecting)
- `messages/fr.json` — MODIFIED (added pipeline.reconnecting)
