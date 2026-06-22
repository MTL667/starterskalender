---
title: 'Reroute open tasks when changing task assignment responsible'
type: 'feature'
created: '2026-06-22'
status: 'done'
baseline_commit: '6169c17'
context: ['docs/project-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** When an admin changes the default responsible person for a task type via the task assignments page, existing open tasks of that type remain assigned to the old person. The admin must manually reassign each task or delete+recreate the assignment.

**Approach:** After saving an assignment edit, show a confirmation dialog asking whether to reroute existing open tasks to the new person. If confirmed, bulk-reassign matching open tasks (PENDING/IN_PROGRESS/BLOCKED) and send ONE grouped email to the new responsible with all rerouted tasks listed.

## Boundaries & Constraints

**Always:**
- Only reroute tasks with status PENDING, IN_PROGRESS, or BLOCKED
- Create a `TaskReassignment` audit record per rerouted task
- Respect entity scoping: entity-specific assignment → only that entity's tasks; global assignment → tasks where no entity-specific override exists for that taskType
- Send a single grouped email (not per-task), respecting the assignment's `notifyChannel` setting
- Only reroute when `assignedToId` actually changed (not on channel-only edits)

**Ask First:**
- Whether to also create in-app notifications per rerouted task

**Never:**
- Reroute COMPLETED or CANCELLED tasks
- Auto-reroute without user confirmation
- Change the existing per-task reassignment flow in `/api/tasks/[id]`

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path: reroute confirmed | Admin edits assignment, confirms reroute, 5 open tasks match | 5 tasks reassigned, 5 TaskReassignment records, 1 grouped email sent | N/A |
| No open tasks exist | Admin confirms reroute, 0 tasks match | Assignment updated, no email sent, message "Geen taken om te herleiden" | N/A |
| Channel-only edit | Admin changes only notifyChannel, not assignedToId | No reroute dialog shown, assignment saved normally | N/A |
| Reroute declined | Admin clicks "Nee" on confirmation | Assignment updated, existing tasks untouched | N/A |
| Global assignment with entity overrides | Global assignment changed, some entities have specific override | Only reroute tasks for entities WITHOUT a specific override for that taskType | N/A |
| Email send failure | SendGrid fails | Tasks still reassigned, error logged, user sees success for task reroute | Log error, don't roll back task changes |

</frozen-after-approval>

## Code Map

- `app/api/admin/task-assignments/[id]/route.ts` -- PATCH endpoint, add reroute logic
- `app/(authenticated)/admin/task-assignments/page.tsx` -- Frontend page, add confirmation dialog after edit
- `lib/task-automation.ts` -- Email helpers, add grouped reroute email builder
- `messages/nl.json` -- Dutch translations for dialog and messages
- `prisma/schema.prisma` -- TaskReassignment model (already exists, reuse)

## Tasks & Acceptance

**Execution:**
- [x] `app/api/admin/task-assignments/[id]/route.ts` -- Extend PATCH to accept `rerouteTasks: boolean`, find matching open tasks with entity-scope logic, bulk update `assignedToId`/`assignedAt`, create `TaskReassignment` records, call grouped email sender, return reroute count
- [x] `lib/task-automation.ts` -- Add exported `sendBulkRerouteEmail(tasks, newAssignee, reassignerName, notifyChannel)` that builds one HTML email with a table/list of all rerouted tasks grouped by starter, respecting notifyChannel
- [x] `app/(authenticated)/admin/task-assignments/page.tsx` -- After successful PATCH (when assignedToId changed), show confirmation dialog "Wil je de X openstaande taken ook herleiden naar [naam]?". On confirm, call PATCH again with `rerouteTasks: true`. Show result count.
- [x] `messages/nl.json` -- Add translation keys for reroute dialog, confirmation, and result messages

**Acceptance Criteria:**
- Given an admin changes the responsible person of a task assignment, when they confirm reroute, then all matching open tasks (PENDING/IN_PROGRESS/BLOCKED) are reassigned to the new person
- Given tasks are rerouted, when the new assignee has email and channel allows it, then they receive ONE email listing all rerouted tasks grouped by starter
- Given no open tasks match, when admin confirms reroute, then a message indicates zero tasks were rerouted
- Given only notifyChannel was changed, when the edit is saved, then no reroute dialog appears

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: no type errors
- `npm run build` -- expected: successful build

**Manual checks:**
- Edit a task assignment's responsible person → dialog appears asking about reroute
- Confirm reroute → tasks reassigned, email received with grouped task list
- Decline reroute → tasks unchanged
- Change only channel → no reroute dialog

## Suggested Review Order

**API reroute logic**

- Entry point: PATCH handler splits count (initial save) from reroute (confirm call)
  [`route.ts:24`](../../app/api/admin/task-assignments/[id]/route.ts#L24)

- Entity-scoped task filter with global override exclusion
  [`route.ts:54`](../../app/api/admin/task-assignments/[id]/route.ts#L54)

- Bulk task reassignment loop with skip-if-already-assigned guard
  [`route.ts:89`](../../app/api/admin/task-assignments/[id]/route.ts#L89)

**Grouped email builder**

- Single email per reroute with tasks grouped by starter in HTML tables
  [`task-automation.ts:961`](../../lib/task-automation.ts#L961)

**Frontend confirmation flow**

- Reroute dialog state and two-step flow: save → dialog → confirm
  [`page.tsx:78`](../../app/(authenticated)/admin/task-assignments/page.tsx#L78)

- handleReroute with error-resilient dialog (stays open on failure)
  [`page.tsx:230`](../../app/(authenticated)/admin/task-assignments/page.tsx#L230)

- Dialog component with reroute count and assignee name
  [`page.tsx:535`](../../app/(authenticated)/admin/task-assignments/page.tsx#L535)

**i18n**

- Dutch and French translation keys for dialog, confirmation, and zero-match message
  [`nl.json:1535`](../../messages/nl.json#L1535)
  [`fr.json:1533`](../../messages/fr.json#L1533)
