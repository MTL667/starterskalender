---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'Materials tracking with stock status and ordering workflow per item'
session_goals: 'Practical multi-status system replacing simple checkbox, scalable for future multiple managers'
selected_approach: 'ai-recommended'
techniques_used: ['SCAMPER Method', 'Role Playing']
ideas_generated: [12]
context_file: ''
session_active: false
workflow_completed: true
---

# Brainstorming Session Results

**Facilitator:** Kevin
**Date:** 2026-04-14

## Session Overview

**Topic:** Materials tracking — from simple checkbox to multi-status workflow with stock management
**Goals:** Design a practical, intuitive system that tracks the full material lifecycle per item, from stock check to reservation, without unnecessary complexity. Must scale for future multiple managers and additional specializations.

**Constraints:**
- One manager per material (for now)
- Same person manages stock and delivery
- Manager check is manual per starter per item (no global inventory system)
- Materials dashboard only visible to users with MATERIAL_MANAGER permission
- Material templates per function already exist in the system

### Session Setup

Session focused on evolving the current single-checkbox material tracking into a visual, multi-status workflow. Two techniques were used: SCAMPER for systematic feature evolution and Role Playing for stakeholder validation.

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Materials tracking workflow improvement with focus on practical UX and scalability

**Recommended Techniques:**

- **SCAMPER Method:** Systematically evolve the existing checkbox through 7 creative lenses (Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate, Reverse)
- **Role Playing:** Validate ideas from material manager, HR admin, and starter perspectives
- **Decision Tree Mapping:** (Skipped — sufficient ideas generated from first two techniques)

**AI Rationale:** SCAMPER was ideal for evolving an existing feature. Role Playing ensured we caught blind spots from different user perspectives before implementation.

## Technique Execution Results

### SCAMPER Method

**S — Substitute:**
- Replace single checkbox with visual timeline/stepper per item (package tracking style)
- Two routes: "In stock → Reserved" or "Ordered (+ expected delivery date) → Received → Reserved"

**C — Combine:**
- Route choice as first action: "In stock" or "Order" button determines the path — no separate stock checkbox needed
- Combine ordering action with expected delivery date input
- Status "Reserved" (Gereserveerd) as endpoint instead of "Delivered" — physical handover is covered by a global task

**A — Adapt:**
- Kanban-style manager dashboard showing all items across all starters, grouped by status
- Filterable by material type, starter, entity, expected delivery date
- Bulk operations from filtered views

**M — Modify:**
- Proactive notifications when expected delivery dates are exceeded (via cron)
- Auto-generation of material items from existing function templates when creating a new starter

**P — Put to other uses:**
- Status flow pattern (item → statuses → manager → deadline) designed to be reusable for IT accounts, access cards, trainings in future phases

**E — Eliminate:**
- No separate "not in stock" status — the action IS the status
- No manual creation of standard items — auto-generated from function templates

**R — Reverse:**
- Starter self-view was considered but rejected — materials tracking is purely manager territory

### Role Playing

**Material Manager Perspective:**
- "Action needed" as default dashboard view — completed items hidden by default
- Color-coded urgency: 🔴 New items, 🟡 Overdue deliveries, 🔵 Received (ready to reserve)
- Bulk operations: filter on material type, select multiple, set status + delivery date in one action
- Editable delivery dates — plans change, system must reflect reality frictionlessly

**HR Admin Perspective:**
- Read-only view of material status per starter (visual timeline)
- Can only edit if they also have MATERIAL_MANAGER permission
- Led to discovery: need permission-based access model

**Permission Model Discovery:**
- New `MATERIAL_MANAGER` permission separate from existing role system
- Role = access level (HR_ADMIN, GLOBAL_VIEWER, etc.)
- Permissions = specializations (MATERIAL_MANAGER, future: DOCUMENT_MANAGER, TRAINING_MANAGER, etc.)
- Scales cleanly to 10+ specializations without polluting role system

## Idea Organization and Prioritization

### Theme 1: Visual Status Flow per Item
*The core of the new system — how each material item moves through the process*

- **Package tracking style steppers** — Horizontal steps that light up per item
- **Two routes** — "In stock → Reserved" or "Ordered → Received → Reserved"
- **Route choice as first action** — No separate stock checkbox, the choice determines the route
- **Editable expected delivery date** — Can always be adjusted after contacting supplier

### Theme 2: Manager Dashboard & Efficiency
*Tools for the material manager to work at scale*

- **Dashboard with status grouping** — All items across all starters, grouped by status
- **"Action needed" as default view** — Dashboard shows only what requires attention now
- **Filters by material type, starter, entity** — Quick zoom into what's relevant
- **Bulk operations** — Mark multiple items as "Ordered" or "In stock" simultaneously

### Theme 3: Automation & Proactivity
*The system that thinks ahead*

- **Proactive notifications** — Daily cron check for exceeded delivery dates
- **Auto-generation of items** — From existing function templates when creating new starter

### Theme 4: Access Model & Permissions
*Who can do what*

- **Permission-based access** — `MATERIAL_MANAGER` as separate permission alongside existing role
- **Scalable to 10+ specializations** — Role = access level, permissions = specializations
- **Dashboard only visible with permission** — MATERIAL_MANAGER required to see/access materials dashboard

### Prioritization Results

**Top Impact (implement first):**
1. Visual status flow with two routes (the core)
2. Permission-based access model (architectural foundation)
3. Manager dashboard with filters

**Quick Wins:**
1. Auto-generation from function templates (logic mostly exists)
2. Editable delivery date

**Build on top:**
1. Bulk operations
2. Proactive notifications via cron
3. Reusable status flow pattern for other domains

**Implementation order:** All features to be implemented. Permission system first (foundation), then status flow, then dashboard, then automation features.

## Session Summary and Insights

**Key Achievements:**

- Evolved a simple checkbox into a comprehensive material lifecycle tracking system
- Discovered the need for a permission-based access model that scales beyond materials
- Designed a manager dashboard that functions as a to-do list, not an archive
- Identified auto-generation opportunity leveraging existing function templates

**Status Flow Definition:**

```
Route A (in stock):   ● In Stock  →  ● Reserved ✓
Route B (ordering):   ● Ordered (+ expected date)  →  ● Received  →  ● Reserved ✓
```

**Permission Model:**

```
User → role: HR_ADMIN | GLOBAL_VIEWER | ENTITY_EDITOR | ENTITY_VIEWER | NONE
     → permissions: [MATERIAL_MANAGER, ...]  (additive specializations)
```

**Creative Facilitation Narrative:**

Kevin approached this session with clear practical thinking and strong product instincts. Key decisions like choosing "Reserved" over "Delivered", rejecting starter self-view, and identifying the permission model emerged naturally from structured exploration. The SCAMPER technique proved particularly effective for systematically evolving an existing feature, while Role Playing validated the dashboard concept and uncovered the permission architecture need.
