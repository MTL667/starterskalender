---
title: 'Alternate Entra tenant selector after UPN domain failure'
type: 'feature'
created: '2026-07-27'
status: 'done'
baseline_commit: 'bb2068db2793c16642a4e4496847feca0f1cdf97'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A starter on entity A needs a mailbox UPN on a domain that only exists in entity B’s Entra tenant. Provisioning uses A’s connection, Graph fails on invalid `userPrincipalName` domain, and there is no recovery path.

**Approach:** After `FAILED_AT_USER_CREATION` with a UPN/domain error, show recovery: (1) create mailbox via another healthy Entra entity (selector), (2) edit desired email, or (3) cancel. On (1), retry with B’s Entra for Graph and keep license mapping from starter entity A when possible. If A’s SKU is not available in B, show a selector of licenses that *are* available in B so the user can pick one before continuing.

## Boundaries & Constraints

**Always:**
- First attempt stays on the starter’s entity (no selector upfront).
- Recovery UI only for `FAILED_AT_USER_CREATION` + UPN/domain error (match Graph text: `userPrincipalName` / `verified domain` / equivalent).
- Choices: other tenant | edit email | cancel.
- Selector: entities with healthy `EntraAppConnection` visible to the user (existing entities API with Entra).
- Retry: Graph + password rules from selected entity B; license SKU from starter entity A + `roleTitle` when that SKU exists/is available in B.
- If A’s mapped SKU is missing or unavailable in B: before/during retry, show a **license selector** listing available SKUs from B (subscribed SKUs / cached licenses with capacity); user must pick one; persist choice on the job and assign that SKU.
- Persist provisioning entity on `ProvisioningJob.entityId`; Graph uses job entity (not hard-coded `starter.entityId`).
- Auth: user may mutate starter; target entity must have healthy Entra.

**Ask First:**
- (none — resolved)

**Never:**
- No offboarding Entra changes.
- No auto-pick of another tenant or license.
- No verified-domain Graph precheck as v1 blocker.
- No Membership requirement; RBAC-visible healthy Entra entities only.

## I/O & Edge-Case Matrix

| Scenario | Expected |
|----------|----------|
| Domain fail → pick B, A SKU on B | New job entityId=B; Graph=B; license from A |
| Domain fail → pick B, A SKU not on B | License selector with B’s available SKUs; continue after pick |
| Edit email | Close recovery; user changes `desiredEmail`, retry on A |
| Cancel | Close; failed job unchanged |
| Non-domain user-creation fail | No tenant selector |
| No other healthy Entra | Tenant option disabled; edit/cancel remain |
| B has no available SKUs | Clear message; cannot continue until capacity/SKU exists |

</frozen-after-approval>

## Code Map

- `components/entra/ProvisioningStatus.tsx` / `starter-dialog.tsx` / `GenerateMailButton.tsx` — recovery + license selector
- `app/api/provisioning/[starterId]/route.ts` + `retry/route.ts` — `provisioningEntityId`, optional override SKU
- `lib/provisioning-engine.ts` — Graph via job entity; license from A or override
- Existing license listing for entity B (subscribed SKUs / license cache)
- `messages/nl.json` / `messages/fr.json` — copy

## Tasks & Acceptance

**Execution:**
- [x] Engine: Graph from `job.entityId`; license from A when available on B; accept `provisioningEntityId` + optional license SKU override
- [x] APIs: validate healthy Entra + auth; expose/use B’s available SKUs when A’s SKU missing
- [x] UI: recovery dialog — tenant / edit email / cancel; license selector when A’s SKU unavailable on B
- [x] i18n NL+FR

**Acceptance Criteria:**
- Domain UPN failure shows other-tenant / edit-email / cancel.
- Confirming another healthy entity retries with that Graph connection; license from A when present on B.
- When A’s SKU is not available on B, user sees a selector of available licenses on B and must choose one to continue.
- Non-domain failures do not offer the tenant selector.
- With no other healthy Entra entities, tenant option unavailable; edit/cancel remain.

## Spec Change Log

- 2026-07-27: When A’s SKU missing on B → license selector (available SKUs on B), not hard-fail.

## Design Notes

Domain-error helper: case-insensitive match on `userPrincipalName` + (`invalid` or `verified domain`).

License availability: prefer live or cached subscribed SKUs for entity B with remaining units; show `skuPartNumber` / display name.

## Verification

- `npm run lint` on touched files
- Manual: A + `@spoq.be` without domain → fail → pick B → success; A SKU missing on B → license picker; edit-email path; non-domain fail shows no selector

## Suggested Review Order

**Recovery UI**

- Gate recovery on UPN/domain user-creation failure only
  [`GenerateMailButton.tsx:39`](../../components/entra/GenerateMailButton.tsx#L39)

- Tenant / edit-email / cancel + license picker when A’s SKU missing on B
  [`DomainErrorRecoveryDialog.tsx:55`](../../components/entra/DomainErrorRecoveryDialog.tsx#L55)

- Client-safe Graph error matcher
  [`provisioning-errors.ts:2`](../../lib/provisioning-errors.ts#L2)

**Engine**

- Graph/password from job entity; license mapping from starter entity A
  [`provisioning-engine.ts:220`](../../lib/provisioning-engine.ts#L220)

- Map A’s SKU when available on B; else require selection
  [`provisioning-engine.ts:404`](../../lib/provisioning-engine.ts#L404)

- Fresh start only on tenant switch; block non-failed / concurrent retries
  [`provisioning-engine.ts:96`](../../lib/provisioning-engine.ts#L96)

**APIs**

- Retry accepts alternate entity; validates SKU live against Graph
  [`retry/route.ts:7`](../../app/api/provisioning/[starterId]/retry/route.ts#L7)

- License options for chosen tenant vs mapped SKU from A
  [`license-options/route.ts:10`](../../app/api/provisioning/[starterId]/license-options/route.ts#L10)

- Server-side SKU capacity + display name (ignore client display name)
  [`provisioning-license.ts:14`](../../lib/provisioning-license.ts#L14)
