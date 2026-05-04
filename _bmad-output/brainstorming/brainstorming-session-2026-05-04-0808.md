---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'Entity- and function-specific identification numbers (e.g. inspector number at ACEG vzw)'
session_goals: 'Design a uniform, reusable system for mandatory ID numbers per entity/function that conditionally appear based on the starter role'
selected_approach: 'ai-recommended'
techniques_used: ['Question Storming', 'Analogical Thinking', 'Morphological Analysis']
ideas_generated: [Config #1, Config #2, Teller #3, UX #4, Data #5, Visibility #6, Import #7, Validatie #8, Architectuur #9, Race #10, UI #11, Audit #12, Export #13, BulkError #14]
context_file: ''
technique_execution_complete: true
session_active: false
workflow_completed: true
---

# Brainstorming Session Results

**Facilitator:** Kevin
**Date:** 2026-05-04 08:08

## Session Overview

**Topic:** Entity- and function-specific identification numbers (e.g. inspector number at ACEG vzw) — a "uniform number" system that is conditionally required based on the starter's function/role.

**Goals:**
- Design a generic, reusable concept for mandatory ID numbers
- Numbers are configured per entity + per function (not global)
- Only appears/is required when a starter has a matching function
- Government-mandated, used as identification on official reports/documents
- Extensible to other entities and number types in the future

### Context

- At ACEG vzw, inspectors need an "inspecteurnummer" (inspector number) because it's legally required by the government as identification on reports.
- This is function-specific: only inspectors need it, not all employees.
- This is entity-specific: currently only ACEG, but could expand to other entities.
- The number should only "pop up" (be visible/required) when the starter's function matches the configured requirement.

### Session Setup

_Brainstorming session initialized with AI-recommended techniques._

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Entity- and function-specific identification numbers with focus on generic, extensible design

**Recommended Techniques:**

- **Question Storming:** Map the full problem space — all requirements, edge cases, stakeholders, and constraints before designing
- **Analogical Thinking:** Draw parallels from existing numbering systems (RIZIV, rijksregister, BTW) to borrow proven patterns
- **Morphological Analysis:** Systematically explore all parameter combinations to produce a concrete design matrix

**AI Rationale:** The topic is concrete but has hidden complexity (conditionality, extensibility, multi-entity). Starting with questions prevents premature design. Analogies ground us in real-world patterns. Morphological analysis delivers actionable design parameters.

## Technique Execution Results

### Technique 1: Question Storming

**Interactive Focus:** Systematically uncovering all requirements, edge cases, and design decisions through pure question generation.

**Key Discoveries:**

1. **Who decides?** HR Admin configures which functions require the number, per entity, in the admin panel.
2. **When assigned?** Automatically at starter creation if the starter's function requires it.
3. **Number format?** Purely numeric, sequential, no leading zeros, no prefix. Simply 1, 2, 3.
4. **Scope?** Shared sequence per entity — multiple functions draw from the same counter.
5. **Uniqueness?** Unique within entity. Duplicates blocked.
6. **Lifecycle?** Definitive, never changed, never reused. Preserved in history on function change or deletion.
7. **Backfill?** For existing starters: open editable field. For new starters: auto-assigned.
8. **Counter logic?** MAX(all existing numbers in entity) + 1. Manual entries count toward the counter.
9. **Manual gaps?** Allowed — if HR enters 1050 while counter is at 1003, counter stays at 1004 until it would naturally reach 1050, then skips to 1051.
10. **Visibility?** Everywhere: starter profile, exports, reports. Searchable. Visible to everyone.
11. **Cross-entity?** New number in new entity. Numbers don't transfer.
12. **Approval?** Not needed. Immediately valid upon entry.
13. **Admin panel config?** Label ("Inspecteurnummer") + start number + which functions require it.
14. **New number types?** Dev task, not self-service.

### Technique 2: Analogical Thinking

**Building on Previous:** Used real-world numbering systems to validate and refine design decisions.

**Analogies Explored:**

1. **RIZIV numbers (doctors):** Validated the pattern of profession-linked, permanent, universally visible ID numbers. Decided against prefix (RIZIV uses profession prefix) — keeping it purely numeric.

2. **Employee numbers (large companies):** Explored leading zeros and start number conventions. Decided: no leading zeros, configurable start number per entity.

3. **Ticket numbers (Jira/Zendesk):** Inspired audit logging of assignment (who, when, auto vs manual) and bulk-import capability for backfill.

4. **License plates:** Confirmed number is person-bound (not position-bound). New number on entity transfer.

5. **IBAN (bank accounts):** Inspired check digit validation for manual entry to prevent silent typos.

6. **VAT numbers:** Confirmed no approval flow needed — immediately valid.

**New Ideas Generated:**

- **[Import #7]**: Bulk CSV import per entity for backfilling existing starters
- **[Validatie #8]**: Check digit (modulo 97) for manual entry validation

### Technique 3: Morphological Analysis

**Building on Previous:** Systematically mapped all design parameters with chosen values.

**Complete Design Matrix:**

| Parameter | Chosen Value | Rejected Alternatives |
|---|---|---|
| **Naming** | "Inspecteurnummer" (configurable label) | Hardcoded name |
| **Scope** | Per entity | Global / per function |
| **Sequence** | Shared within entity, all functions | Separate per function |
| **Format** | Purely numeric, no leading zeros, no prefix | With prefix / leading zeros |
| **Assignment** | Auto (MAX+1) on creation | Always manual / always auto |
| **Backfill** | Open field for existing starters | Migration script |
| **Bulk import** | CSV import per entity | No bulk |
| **Uniqueness** | Unique within entity, duplicates blocked | Globally unique |
| **Lifecycle** | Definitive, never reused, never changed | Changeable / reusable |
| **History** | Preserved on function change or deletion | Deleted |
| **Validation** | Check digit on manual entry | No extra validation |
| **Visibility** | Everywhere: profile, exports, reports, searchable | HR only / profile only |
| **Trigger** | Auto on starter creation with linked function | Manual by HR |
| **Configuration** | Admin panel: start number + which functions | Hardcoded / config file |
| **Entity transfer** | New number in new entity | Keep number |
| **Approval** | Not needed, immediately valid | Approval flow |
| **Architecture** | Hardcoded `inspectorNumber` column on Starter model | Generic IdentificationNumber model |
| **Race condition** | Database transaction (SELECT MAX + INSERT) | Optimistic / no protection |
| **UI display** | Readonly field on profile, editable if empty | Badge / label / hidden |
| **Audit log** | Log who, when, auto vs manual | No logging |
| **Export** | Separate column in CSV/Excel | Embedded in profile data |
| **Bulk import errors** | Per-row error reporting (valid rows proceed) | Reject entire import |

**Additional Ideas:**

- **[Architectuur #9]**: Hardcoded `inspectorNumber` column — YAGNI principle
- **[Race #10]**: Database transaction for concurrent assignment safety
- **[UI #11]**: Readonly/editable hybrid field based on empty state
- **[Audit #12]**: Assignment audit trail (who, when, auto vs manual)
- **[Export #13]**: Inspector number as dedicated export column
- **[BulkError #14]**: Per-row validation with partial import success

## Idea Organization and Prioritization

### Thematic Organization

**Theme 1: Configuration & Administration**
_How the system is set up and managed_

- **[Config #1]** Entity-bound number sequence — one shared counter per entity
- **[Config #2]** Function linking via admin panel — admin checks which functions require the number
- **[Architectuur #9]** Hardcoded `inspectorNumber` column on Starter model

**Theme 2: Number Assignment & Logic**
_How numbers are generated and assigned_

- **[Teller #3]** MAX+1 counter with conflict check — hybrid auto/manual
- **[UX #4]** Automatic + manual fallback — auto on creation, open field for backfill
- **[Race #10]** Database transaction — prevents duplicate numbers on concurrent creation
- **[Validatie #8]** Check digit on manual entry — prevents silent typos

**Theme 3: Data & Lifecycle**
_How numbers behave over time_

- **[Data #5]** Immutable, never reused — audit-proof by design
- **[Audit #12]** Assignment audit trail — who, when, auto vs manual

**Theme 4: Visibility & Integration**
_Where the number appears and how it's usable_

- **[Visibility #6]** Visible everywhere and searchable — first-class data field
- **[UI #11]** Readonly/editable hybrid field — based on empty state
- **[Export #13]** Separate column in CSV/Excel exports

**Theme 5: Migration & Import**
_How existing data is loaded_

- **[Import #7]** Bulk CSV import per entity — solves backfill at scale
- **[BulkError #14]** Per-row error reporting — valid rows proceed, failed rows reported

### Implementation Order

All 14 items implemented in a single release, in logical build order:

1. **Schema** — Add `inspectorNumber` column to Starter model + migration
2. **Admin panel config** — Entity settings: start number + function checkboxes for inspector number requirement
3. **Auto-assignment engine** — MAX+1 in database transaction on starter creation when function requires it
4. **Manual entry + validation** — Editable field on profile if empty, check digit validation, uniqueness check, readonly after set
5. **Audit logging** — Log assignment events (who, when, auto vs manual)
6. **Search & visibility** — Inspector number on starter profile, searchable in starter list
7. **Export integration** — Inspector number as dedicated column in CSV/Excel exports
8. **Bulk CSV import** — Import per entity with per-row error reporting, auto-teller adjustment

### Action Plan

| Step | What | Key Details |
|---|---|---|
| 1 | Prisma schema change | `inspectorNumber Int?` on Starter, unique constraint within entity |
| 2 | Admin panel: entity settings | New section: start number (Int), function multi-select for inspector number requirement |
| 3 | Assignment logic | `$transaction`: SELECT MAX(inspectorNumber) WHERE entityId, check uniqueness, INSERT. Trigger on starter creation when function is in configured list |
| 4 | Starter profile UI | Show field if entity has inspector number configured for starter's function. Editable if null, readonly if set. Check digit validation on manual input |
| 5 | Audit events | New event type `INSPECTOR_NUMBER_ASSIGNED` with metadata: value, assignedBy, method (auto/manual/import) |
| 6 | Search | Add `inspectorNumber` to starter search/filter |
| 7 | Export | Add column to existing CSV/Excel export |
| 8 | Bulk import | New endpoint: CSV upload per entity. Validate uniqueness per row, report errors, adjust MAX counter |

## Session Summary and Insights

**Key Achievements:**

- Complete specification for "Inspecteurnummer" system in under 30 minutes
- 14 structured design decisions covering all aspects from schema to UI to migration
- Clear implementation order with no ambiguity
- All edge cases addressed: backfill, concurrency, manual entry, bulk import, entity transfer

**Breakthrough Moments:**
- The "auto + manual fallback" insight: graceful migration without scripts
- Check digit from IBAN analogy: lightweight typo prevention
- Bulk import from helpdesk analogy: solves backfill at scale
- MAX+1 with conflict-skip: elegant handling of manual entries

**Session Reflections:**
Kevin's decisiveness and instinct for simplicity drove the session to a complete, pragmatic specification. Every decision favored the simplest solution that meets the requirements — no over-engineering, no premature abstraction. The result is a feature that can be built end-to-end in a single sprint.

## Overall Creative Journey

**User Creative Strengths:** Kevin demonstrated clear, decisive thinking — answering quickly and precisely, cutting through unnecessary complexity. Strong instinct for simplicity (no prefix, no leading zeros, no approval, hardcoded column).

**AI Facilitation Approach:** Started broad with Question Storming to uncover hidden requirements, then used real-world analogies to validate decisions and discover check digit validation and bulk import. Concluded with Morphological Analysis to produce a complete, actionable design matrix.

**Energy Flow:** High throughout — fast-paced, concrete, and productive. The session moved from broad exploration to a complete specification in under 30 minutes.
