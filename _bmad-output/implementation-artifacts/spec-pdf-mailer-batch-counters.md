---
title: 'PDF mailer pre-send batch counters'
type: 'feature'
created: '2026-07-31'
status: 'done'
baseline_commit: 'b56d795'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Before starting a PDF-mailer batch, admins cannot see how many valid contacts and PDFs will be paired — mismatches only appear after finalize.

**Approach:** Show live pre-send counters (valid recipients, PDFs, mails that will send, leftovers) on the new-batch form, updating as the list and PDF selection change.

## Boundaries & Constraints

**Always:**
- Counters update live from current textarea + selected PDF files (same pairing rules as server: `parseRecipientList` + index pairing).
- Show at least: valid recipient count, PDF count, will-send count (`min`), leftover recipients, leftover PDFs.
- Surface parse warning/skip count when > 0 (duplicates/invalid lines), without blocking the summary.
- Place summary near the start-batch control so it is visible before submit.
- NL + FR i18n under `adminPdfMailer`.
- Keep one-to-one send semantics unchanged (no API/send changes required unless needed for client-safe import).

**Ask First:**
- (none)

**Never:**
- Do not change SendGrid send/webhook behavior or pairing order.
- Do not require a server round-trip just to show counts.
- Do not invent a dashboard of post-send stats beyond existing overview/statusCounts.

## I/O & Edge-Case Matrix

| Scenario | Expected |
|----------|----------|
| 200 valid recipients, 202 PDFs | Recipients 200 · PDFs 202 · Will send 200 · Leftover PDFs 2 |
| 10 recipients, 8 PDFs | Will send 8 · Leftover recipients 2 |
| Empty list / no PDFs | Counts 0; no false “will send” |
| List with duplicates/invalids | Valid count excludes them; warning count > 0 |
| ACEG `;` CSV with Naam / Werk - E-mail | Same valid count as server parse |

</frozen-after-approval>

## Code Map

- `app/(authenticated)/admin/pdf-mailer/page.tsx` — live summary UI near submit
- `lib/pdf-mailer.ts` — reuse `parseRecipientList` / `pairRecipientsAndPdfs`; extract client-safe module if `Buffer` in `looksLikePdf` would break client bundle
- `messages/nl.json` / `messages/fr.json` — `adminPdfMailer` counter strings
- `tests/unit/lib/pdf-mailer.test.ts` — keep pairing/parse coverage; add count helper test only if extracted

## Tasks & Acceptance

**Execution:**
- [x] Ensure client can call parse + pair safely (extract tiny module if needed)
- [x] `page.tsx` — useMemo summary from recipients string + files; render compact count row
- [x] i18n NL+FR for labels (recipients, PDFs, willSend, leftoverEmails, leftoverPdfs, parseIssues)
- [x] Manual: ACEG CSV + unequal PDF count shows correct leftover numbers

**Acceptance Criteria:**
- Given a loaded list and PDFs, when the admin views the form, then they see valid contact count, PDF count, and how many mails will be sent before clicking start.
- Given unequal counts, when viewing the summary, then leftover recipient/PDF counts match index pairing (same as finalize leftovers).
- Given invalid/duplicate lines, when the list is parsed, then valid count excludes them and issues are indicated.

## Spec Change Log

## Design Notes

Compact muted text or small labeled numbers (like task-diagnostics / materials status tiles) — not a card-heavy dashboard. Prefer one line or a short row above the Start button.

Will-send = `Math.min(validRecipients, pdfCount)`. Leftovers = abs difference on the longer side.

If importing from `lib/pdf-mailer.ts` pulls Node `Buffer` into the client bundle, move parse/pair (+ EMAIL helpers) to e.g. `lib/pdf-mailer-parse.ts` and re-export from the existing module so the server API stays unchanged.

## Verification

- `npm test -- --run tests/unit/lib/pdf-mailer.test.ts` — pass
- Manual: drop ACEG CSV (~200) + fewer/more PDFs; confirm counters before start

## Suggested Review Order

**Live preview**

- Same parse/pair as server; counts update with form state
  [`page.tsx:318`](../../app/(authenticated)/admin/pdf-mailer/page.tsx#L318)

- Compact summary above Start (will-send + leftovers)
  [`page.tsx:522`](../../app/(authenticated)/admin/pdf-mailer/page.tsx#L522)

**Client-safe lib**

- Buffer-free PDF magic so client can import `@/lib/pdf-mailer`
  [`pdf-mailer.ts:178`](../../lib/pdf-mailer.ts#L178)

**i18n & tests**

- NL/FR preview labels
  [`nl.json:1517`](../../messages/nl.json#L1517)

- Magic-byte unit coverage
  [`pdf-mailer.test.ts`](../../tests/unit/lib/pdf-mailer.test.ts)
