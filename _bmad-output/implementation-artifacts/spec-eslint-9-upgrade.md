---
title: 'Upgrade to ESLint 9 flat config'
type: 'chore'
created: '2026-07-22'
status: 'done'
context: []
baseline_commit: 'be13e8208704e2445a00f2588243ce0d2f107217'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Docker `npm ci` still warns that `eslint@8.57.1` is unsupported/deprecated, and `eslint-config-next@16` already peers on `eslint >=9`. The `lint` script still calls `next lint`, which no longer exists in Next.js 16 (CLI treats `lint` as a directory).

**Approach:** Upgrade to ESLint 9, add a flat `eslint.config.mjs` using `eslint-config-next`, and point the `lint` script at `eslint` directly so Docker/local installs stop pulling unsupported ESLint 8 trees.

## Boundaries & Constraints

**Always:**
- Keep Next.js recommended rules via `eslint-config-next` (or `eslint-config-next/core-web-vitals`).
- `npm run lint` must exit successfully (exit 0) after the upgrade; fix only blockers introduced by the new config, not drive-by style refactors.
- Dev-only change: no production runtime dependency changes except transitive cleanup from the eslint bump.

**Ask First:**
- If the new ESLint run surfaces hundreds of pre-existing errors that would require broad code edits, ask whether to (a) fix them, or (b) temporarily relax rules/`ignores` to ship the tooling upgrade first.

**Never:**
- Do not run `npm audit fix` / major security bumps in this story (deferred separately).
- Do not migrate to Biome/oxlint or replace Next's recommended config with a custom rule set.
- Do not change app feature code unless required for lint to pass.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path | `npm run lint` after upgrade | ESLint 9 runs flat config; exit 0 | N/A |
| Install | `npm ci` / Docker deps stage | No `eslint@8` / deprecated eslint-related EBADENGINE noise for visitor-keys from eslint 8 tree | N/A |
| Missing next lint | `npm run lint` | Must not invoke removed `next lint` CLI | Fail with real eslint errors only |

</frozen-after-approval>

## Code Map

- `package.json` -- bump `eslint` to ^9; change `lint` script from `next lint` to `eslint .` (or equivalent)
- `package-lock.json` -- lockfile refresh after eslint 9 install
- `eslint.config.mjs` -- new flat config exporting Next recommended presets (file does not exist yet)
- `Dockerfile` -- no change expected; benefit is quieter `npm ci` via dependency tree

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- upgrade `eslint` to ^9.x and set `"lint"` to run ESLint CLI against the repo -- Next 16 no longer provides `next lint`
- [x] `eslint.config.mjs` -- add flat config that extends `eslint-config-next` / core-web-vitals and ignores build artifacts (`.next`, `node_modules`, `public`, `_bmad*`, etc.) -- required for ESLint 9
- [x] `package-lock.json` -- regenerate via npm install so eslint 8 and its deprecated transitive tree drop out
- [x] Verify `npm run lint` -- fix only newly blocking issues; if volume is large, halt per Ask First

**Acceptance Criteria:**
- Given a clean install, when `npm ci` runs, then the install no longer depends on `eslint@8.57.1`
- Given the upgraded tooling, when `npm run lint` runs, then ESLint 9 executes via flat config and exits 0
- Given Docker deps install, when logs are inspected, then the deprecated `eslint@8` warning is gone

## Spec Change Log

## Verification

**Commands:**
- `npm ls eslint` -- expected: eslint@9.x only (no invalid peer vs eslint-config-next)
- `npm run lint` -- expected: exit 0
- `npm ls eslint@8` -- expected: empty / not found

## Suggested Review Order

**Flat config entry point**

- Next core-web-vitals + ignore list + React Compiler rules as warnings
  [`eslint.config.mjs:1`](../../eslint.config.mjs#L1)

**Package wiring**

- `next lint` replaced; ESLint 9 declared
  [`package.json:10`](../../package.json#L10)

**Targeted blocker fixes**

- Playwright `use` fixture disable (not React)
  [`base.fixture.ts:11`](../../tests/support/fixtures/base.fixture.ts#L11)

- Escape quotes in admin roles label
  [`page.tsx:290`](../../app/(authenticated)/admin/roles/page.tsx#L290)

- Escape quotes in user roles dialog
  [`user-roles-dialog.tsx:155`](../../components/admin/user-roles-dialog.tsx#L155)
