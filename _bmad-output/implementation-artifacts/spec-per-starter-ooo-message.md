---
title: 'Per-starter OOO message for offboarding'
type: 'feature'
created: '2026-06-29'
status: 'in-progress'
baseline_commit: '8dff427'
context:
  - docs/project-context.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** When a job role has no OOO template, the admin sees "Template instellen" which opens a nested Dialog inside the starter-dialog — causing focus issues that close the parent page. Even when it works, saving the OOO as a job-role template is not the admin's intent: they just want a one-off message for this specific person leaving.

**Approach:** Add per-starter OOO fields on the Starter model. In the pre-flight panel, replace the "Template instellen" nested dialog with an inline collapsible OOO editor scoped to the starter. The offboarding engine uses the per-starter message first, falling back to the job-role/entity template.

## Boundaries & Constraints

**Always:** Keep the existing OooTemplate system intact (admin/job-roles page still works). Per-starter OOO fields are optional — when empty the engine falls back to templates. Pre-flight considers OOO configured if either per-starter fields OR a template exist.

**Ask First:** N/A (pre-fill from job-role template confirmed: yes).

**Never:** Do not remove or modify the OooTemplate model/CRUD. Do not change the admin job-roles OOO editor. Do not remove the `{voornaam}`, `{achternaam}`, `{algemeen_mailadres}` variable substitution.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Starter has custom OOO, no template | oooMessageNl filled, no OooTemplate | Engine uses starter OOO, offboarding succeeds | N/A |
| Starter has no custom OOO, template exists | oooMessage* all null, OooTemplate exists | Engine uses template (existing behavior) | N/A |
| Starter has custom OOO AND template exists | Both filled | Engine prefers starter OOO | N/A |
| Neither custom OOO nor template | All null, no OooTemplate | Engine throws, job goes BLOCKED_AT_OOO | Error shown in UI |
| Pre-flight: custom OOO filled | oooMessageNl present | Warning disappears, allClear path works | N/A |
| Save custom OOO from inline editor | Admin types NL+general mail, saves | Fields stored on Starter, pre-flight re-checks | API returns 400 on invalid input |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- Add oooMessageNl/Fr/En + oooGeneralMailAddress to Starter model
- `app/api/offboarding/[starterId]/ooo/route.ts` -- New API: GET/PUT per-starter OOO fields
- `components/offboarding/PreFlightPanel.tsx` -- Replace nested OooTemplateDialog with inline per-starter editor
- `lib/offboarding-engine.ts` -- executeOoo: check starter OOO first, then fallback to template
- `lib/offboarding-preflight.ts` -- Include per-starter OOO in oooTemplateConfigured check
- `messages/nl.json` -- i18n keys for inline editor
- `messages/fr.json` -- i18n keys for inline editor

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` -- Add `oooMessageNl String? @db.Text`, `oooMessageFr String? @db.Text`, `oooMessageEn String? @db.Text`, `oooGeneralMailAddress String?` to Starter model
- [x] `app/api/offboarding/[starterId]/ooo/route.ts` -- Create GET (read starter OOO fields) and PUT (update starter OOO fields) with auth check (`mail:offboarding` permission)
- [x] `lib/offboarding-preflight.ts` -- Query starter OOO fields; set `oooTemplateConfigured = true` if either template or per-starter OOO exists
- [x] `components/offboarding/PreFlightPanel.tsx` -- Remove OooTemplateDialog import/usage. Add inline collapsible OOO form (NL/FR/EN textareas + general mail address) with save button. Fetch/save via new API. Re-run preflight after save. Pre-fill from template if available.
- [x] `lib/offboarding-engine.ts` -- In executeOoo: select starter OOO fields first; if any oooMessage* is filled, use those + oooGeneralMailAddress for rendering; otherwise fall through to existing OooTemplate lookup
- [x] `messages/nl.json` -- Add keys: writeOooForStarter, oooSaved, oooGeneralMailAddressLabel, oooEditorDescription, oooSaveButton + placeholders
- [x] `messages/fr.json` -- Mirror French translations
- [x] Run `npx prisma generate` and `npx tsc --noEmit` to verify (pre-existing test errors only)

**Acceptance Criteria:**
- Given an offboarding starter whose job role has no OOO template, when admin opens the starter dialog, then an inline OOO editor is shown (no nested dialog, no page navigation)
- Given admin fills in NL text + general mail address and saves, when pre-flight re-checks, then the OOO warning disappears
- Given a starter with custom OOO fields filled, when offboarding executes OOO step, then the per-starter message is used (not the template)
- Given a starter with no custom OOO but a job-role template exists, when offboarding executes, then the template is used (backward compatible)

## Verification

**Commands:**
- `npx prisma validate` -- expected: no errors
- `npx prisma generate` -- expected: generates client
- `npx tsc --noEmit` -- expected: no type errors in changed files
