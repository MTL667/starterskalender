# Story 2.6: Pipeline Keyboard Accessibility

> Status: done

## User Story

As a headhunter who uses keyboard navigation,
I want to operate the pipeline board entirely with keyboard,
So that I can manage candidates efficiently without a mouse.

## Acceptance Criteria

1. **Given** I am on the pipeline page
   **When** I press Tab
   **Then** focus moves through: filter bar → first stage column header → first card in that column
   **And** focus indicators are clearly visible on all interactive elements (NFR19)

2. **Given** focus is on a stage column header
   **When** I press Left/Right arrow keys
   **Then** focus moves to the previous/next stage column header

3. **Given** focus is on a candidate card
   **When** I press Up/Down arrow keys
   **Then** focus moves to the previous/next card within the same column

4. **Given** focus is on a candidate card
   **When** I press Enter
   **Then** the candidate detail view opens (dialog overlay)

5. **Given** focus is on a candidate card
   **When** I press Space
   **Then** the card enters "grabbed" state (announced to screen reader: "Grabbed {Name}, use arrow keys to move between stages")
   **And** Left/Right arrow keys now move the card between stage columns
   **And** pressing Space again drops the card in the current column
   **And** pressing Escape cancels and returns the card to its original position

## Tasks

- [x] Task 1: Implement roving tabindex for stage column headers with Left/Right arrow navigation
- [x] Task 2: Implement roving tabindex for candidate cards within columns with Up/Down arrow navigation
- [x] Task 3: Implement Enter key on candidate card to open detail dialog (stub)
- [x] Task 4: Enhance dnd-kit keyboard drag with custom announcements and Space/Arrow/Escape flow
- [x] Task 5: Add skip link "Skip to pipeline" + focus indicators + screen reader refinements + i18n

### Review Findings

- [x] [Review][Patch] activeIdRef not set synchronously in handleDragStart — SSE events not queued during drag-start window [pipeline-kanban.tsx:handleDragStart]
- [x] [Review][Patch] focusedCardId persists after filter change or SSE move — can leave no element with tabIndex=0 [pipeline-kanban.tsx:focusedCardId]
- [x] [Review][Patch] Tab key never reaches first card after column header — AC1 fail [pipeline-kanban.tsx/stage-column.tsx]
- [x] [Review][Patch] Focus ring on inner CandidateCard div, not on the actually focused wrapper element [draggable-candidate-card.tsx]
- [x] [Review][Patch] role="listbox" contains non-option heading (h3) — invalid accessibility tree [stage-column.tsx]
- [x] [Review][Patch] No focus restoration when detail dialog closes [candidate-detail-dialog.tsx/pipeline-kanban.tsx]
- [x] [Review][Patch] Missing i18n key card.actionViewDetail in NL and FR [messages/nl.json, messages/fr.json]
- [x] [Review][Defer] Card action buttons unreachable by keyboard (tabIndex=-1) — deferred to detail dialog story
- [x] [Review][Defer] refreshKey remount nukes kanban state and focus — pre-existing pattern from Story 2.2
- [x] [Review][Defer] Empty column ArrowDown gives no feedback — polish, not in AC

## Dev Notes

### Architecture Decisions

- **Keyboard pattern:** Roving tabindex — only the actively focused item in each group has `tabIndex={0}`, all others have `tabIndex={-1}`. This follows WAI-ARIA composite widget best practices.
- **Focus groups:** Two focus groups exist: (1) stage column headers (Left/Right arrows), (2) candidate cards within a column (Up/Down arrows). Tab moves between groups.
- **dnd-kit keyboard sensor:** Already configured (`KeyboardSensor` in `pipeline-kanban.tsx`). The Space-to-grab and arrow-to-move behavior is largely built-in via dnd-kit's keyboard coordination strategy. This story refines the UX and announcements.
- **Candidate detail view:** AC4 requires Enter to open a "candidate detail view (dialog overlay)". No full detail view exists yet — implement as a minimal dialog showing candidate info. Full detail view is out of scope; the dialog serves as the keyboard-accessible entry point.
- **framer-motion compatibility:** The `motion.div` wrapper in `DraggableCandidateCard` must not interfere with focus management. The inner `div` (with dnd-kit refs) and the `CandidateCard` (with `tabIndex={0}`) need clear focus delegation.

### What Needs to Change

#### 1. `components/recruitment/pipeline/stage-column.tsx` — Roving tabindex on column header

The `<h3>` column header needs to be focusable and participate in roving tabindex:

```typescript
// Column header becomes focusable
<h3
  tabIndex={isFocusedColumn ? 0 : -1}
  role="columnheader"
  aria-label={t('pipeline.columnLabel', { stage: stageName, count: candidates.length })}
  onKeyDown={onColumnKeyDown}
  ref={headerRef}
  className="text-sm font-semibold truncate outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
>
```

New props: `isFocusedColumn: boolean`, `onColumnKeyDown: (e: KeyboardEvent) => void`, `headerRef: RefObject<HTMLHeadingElement>`.

#### 2. `components/recruitment/pipeline/pipeline-kanban.tsx` — Focus management orchestration

Add state and handlers for roving tabindex:

```typescript
const [focusedColumnIndex, setFocusedColumnIndex] = useState(0)
const columnHeaderRefs = useRef<(HTMLHeadingElement | null)[]>([])
const cardRefs = useRef<Map<string, Map<string, HTMLDivElement | null>>>(new Map())

function handleColumnKeyDown(e: React.KeyboardEvent, columnIndex: number) {
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    const next = Math.min(columnIndex + 1, sortedStages.length - 1)
    setFocusedColumnIndex(next)
    columnHeaderRefs.current[next]?.focus()
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    const prev = Math.max(columnIndex - 1, 0)
    setFocusedColumnIndex(prev)
    columnHeaderRefs.current[prev]?.focus()
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    // Focus first card in this column
  }
}
```

Tab order management: the filter bar is naturally tabbable. After filter bar, Tab should reach the first column header. After column headers, Tab should reach the first card.

#### 3. `components/recruitment/pipeline/candidate-card.tsx` — Card focus refinements

Currently has `tabIndex={0}` and `role="article"`. Changes:
- Change to roving `tabIndex` (0 for focused card, -1 for others) — controlled by parent
- Add `onKeyDown` for Up/Down arrow navigation within column, Enter to open detail, Space to grab
- Add `ref` forwarding for programmatic focus

```typescript
// Card becomes controlled focusable
<div
  ref={cardRef}
  role="article"
  tabIndex={isFocused ? 0 : -1}
  aria-label={ariaLabel}
  onKeyDown={onCardKeyDown}
  ...
>
```

#### 4. `components/recruitment/pipeline/draggable-candidate-card.tsx` — Focus delegation

The `motion.div` outer wrapper must NOT capture focus. The inner `div` with dnd-kit refs currently spreads `{...attributes}` which may include `tabIndex` and `role` from dnd-kit. Review and ensure:
- Only one element per card is focusable (the `CandidateCard` inner article, not the dnd-kit wrapper)
- Or merge dnd-kit attributes with the card's focus management

**Critical:** dnd-kit's `useDraggable` returns `attributes` that include `role="button"`, `tabIndex={0}`, and `aria-roledescription`. These conflict with `CandidateCard`'s `tabIndex={0}` and `role="article"`. Resolution:
- Remove `tabIndex={0}` and `role="article"` from `CandidateCard`
- Let the dnd-kit wrapper be the single focusable element
- Move the `aria-label` from `CandidateCard` to the dnd-kit wrapper
- Keep card content purely presentational

#### 5. Candidate detail dialog (stub)

Create `components/recruitment/pipeline/candidate-detail-dialog.tsx`:
- Uses `Dialog` from shadcn/ui (Radix Dialog)
- Shows candidate name, email, source, stage, days in stage, notes
- Focus trapped within dialog (Radix default)
- Escape to close
- Triggered by Enter key on focused card OR click on "Open" action button

#### 6. Skip link

Add to `app/(authenticated)/recruitment/vacatures/[id]/page.tsx`:
```tsx
<a href="#pipeline" className="sr-only focus:not-sr-only focus:absolute ...">
  {t('pipeline.skipLink')}
</a>
// ...
<div id="pipeline">
  <PipelineSection ... />
</div>
```

### Focus Flow Diagram

```
Tab order:
[Skip link] → [Filter bar inputs] → [Column header 1] → (Tab) → [First card in column 1]

Within column headers (Left/Right arrows):
[Col 1 header] ←→ [Col 2 header] ←→ [Col 3 header] ←→ ...

Within cards in a column (Up/Down arrows):
[Card 1] ↕ [Card 2] ↕ [Card 3] ↕ ...

From column header to cards (Down arrow):
[Col header] → [First card in column]

From first card back to header (Up arrow when on first card):
[First card] → [Col header]

On card Enter: opens CandidateDetailDialog
On card Space: enters dnd-kit keyboard drag mode
```

### dnd-kit Keyboard Drag Integration

dnd-kit's `KeyboardSensor` already supports:
- Activating drag with Space/Enter on a draggable element
- Moving with arrow keys during drag
- Dropping with Space/Enter
- Cancelling with Escape

However, the current `KeyboardSensor` uses Enter AND Space for activation. Since we want Enter for "open detail" and Space for "grab card", we need a **custom keyboard sensor** or **custom activation constraint**:

```typescript
import { KeyboardSensor, KeyboardCode } from '@dnd-kit/core'

class PipelineKeyboardSensor extends KeyboardSensor {
  static activators = [
    {
      eventName: 'onKeyDown' as const,
      handler: ({ nativeEvent }: { nativeEvent: KeyboardEvent }) => {
        return nativeEvent.code === KeyboardCode.Space
      },
    },
  ]
}
```

This ensures only Space activates drag, leaving Enter free for opening the detail dialog.

### File Structure (New/Modified)

```
components/recruitment/pipeline/
  pipeline-kanban.tsx              # MODIFY — focus state, column/card refs, keyboard handlers, custom sensor
  stage-column.tsx                 # MODIFY — focusable header, onColumnKeyDown, headerRef
  draggable-candidate-card.tsx     # MODIFY — focus delegation, merge dnd-kit attrs with card focus
  candidate-card.tsx               # MODIFY — controlled tabIndex, onKeyDown, ref forwarding
  candidate-detail-dialog.tsx      # NEW — minimal candidate detail dialog

app/(authenticated)/recruitment/vacatures/[id]/page.tsx  # MODIFY — skip link + #pipeline anchor

messages/nl.json                   # MODIFY — add accessibility i18n keys
messages/fr.json                   # MODIFY — add accessibility i18n keys
```

### RBAC Rules

- No new permissions needed — keyboard navigation is a UI accessibility layer
- Drag via keyboard still respects `canWrite` permission (sensor disabled when `canWrite` is false)

### Anti-Patterns to Avoid

- **Do NOT add `tabIndex={0}` to everything** — use roving tabindex (only active item has `tabIndex={0}`)
- **Do NOT use `onKeyDown` on non-focusable elements** — ensure the element receiving keyboard events is focusable
- **Do NOT create duplicate focusable nodes** — resolve dnd-kit `attributes` vs `CandidateCard` `tabIndex` conflict
- **Do NOT break existing drag-and-drop** — the custom keyboard sensor must still work with dnd-kit's drag lifecycle
- **Do NOT hardcode keyboard codes** — use `KeyboardCode` from dnd-kit or standard `key` values
- **Do NOT forget `prefers-reduced-motion`** — existing `motion-safe:` prefixes must remain

### Previous Story Intelligence (from Stories 2.1–2.5)

Key patterns to maintain:
- `'use client'` for all pipeline components
- `useTranslations('recruitment')` with dotted keys
- `useRef` for timers + cleanup on unmount
- `canMoveToStage` validation on client side (from `pipeline-rules.ts`)
- Optimistic update pattern with rollback (from Story 2.4)
- framer-motion `layoutId` + `LayoutGroup` for cross-column animation (Story 2.5)
- `animate-sse-highlight` CSS animation for remote updates (Story 2.5)
- `activeIdRef` set directly before flushQueuedEvents (Story 2.5 review fix)

Review findings from previous stories:
- Timer cleanup via useRef/useEffect (Story 2.1)
- Clear stale error state on success (Story 2.4)
- Don't duplicate onCancel invocations (Story 2.4)
- Wrap emit calls in try/catch (Story 2.5)
- Use server timestamp from SSE payload (Story 2.5)

Existing accessibility features to preserve:
- `CandidateCard`: `role="article"`, `tabIndex={0}`, `aria-label` with name/entity/score/days
- `DraggableCandidateCard`: dnd-kit `{...attributes}` and `{...listeners}` spread on wrapper
- `pipeline-kanban.tsx`: dnd-kit `accessibility={{ announcements }}` with i18n screen reader text
- `candidate-card.tsx`: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
- `candidate-card.tsx`: action buttons with `aria-label` and min 44px touch targets
- `pipeline-kanban.tsx`: `role="alert"` on move error banner

### Existing Code to Reuse/Extend

- `@dnd-kit/core` — `KeyboardSensor`, `KeyboardCode` for custom activation
- `components/ui/dialog.tsx` — shadcn/ui Dialog for candidate detail
- `components/recruitment/pipeline/candidate-card.tsx` — existing aria-label construction
- `components/recruitment/pipeline/pipeline-kanban.tsx` — existing `announcements` object
- `lib/recruitment/pipeline-rules.ts` — `canMoveToStage` for keyboard move validation

### i18n Keys Needed

Under `recruitment.pipeline` namespace:
- `pipeline.skipLink` — "Ga naar pipeline" / "Aller au pipeline"
- `pipeline.columnLabel` — "{stage} — {count} kandidaten" / "{stage} — {count} candidats"
- `pipeline.cardGrabInstructions` — "Gebruik pijltjestoetsen om tussen fases te verplaatsen, spatie om te plaatsen, escape om te annuleren"
- `pipeline.candidateDetailTitle` — "Kandidaat details" / "Détails du candidat"

Under `recruitment.card` namespace:
- `card.actionViewDetail` — "Details bekijken" / "Voir les détails"

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.6]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility Strategy, Keyboard navigation, Screen reader support, Focus indicators]
- [Source: _bmad-output/planning-artifacts/architecture.md#Kanban dnd-kit accessible, WCAG 2.1 AA]
- [Source: _bmad-output/planning-artifacts/prd.md#Accessibility NFRs, Pipeline keyboard operable]
- [Source: _bmad-output/implementation-artifacts/2-5-real-time-pipeline-updates-via-sse.md#Dev Notes, Review Findings]
- [WAI-ARIA Practices: Grid pattern, Roving tabindex](https://www.w3.org/WAI/ARIA/apg/patterns/)
