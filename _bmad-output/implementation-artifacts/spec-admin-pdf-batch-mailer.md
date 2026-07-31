---
title: 'Admin PDF batch mail distributor'
type: 'feature'
created: '2026-07-31'
status: 'done'
baseline_commit: '243065bc4ae2148d99fef461c94b242c5559dd05'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Admins need to distribute unique PDFs (e.g. vouchers) one-per-recipient from a mailing list, with a clear leftover report, send overview, and SendGrid delivery confirmation — none of which exists today.

**Approach:** Add an admin page where the user loads a recipient list, drops PDFs, sets From/subject/body, then runs a sequential batch that pairs list order to PDF upload order (1→1). Persist batch results and update delivery status via the existing SendGrid Event Webhook.

## Boundaries & Constraints

**Always:**
- Access: `admin:users:manage` (same as other admin mail tools).
- Pairing: recipient index N ↔ PDF index N (upload/list order). No filename matching.
- Recipients: paste one email per line **and** CSV with `email` + optional `name`.
- Mail: free subject + HTML/text body with placeholders `{name}`, `{email}`, `{filename}`.
- From: free text per batch; **before send**, validate the address is usable with SendGrid (Verified Senders / authenticated domain API). Block start with a clear error if invalid; also surface SendGrid From errors on send failure.
- Send **sequentially** (one mail at a time) with PDF attachment.
- Persist batch + per-item result (recipient, PDF filename, send status, SendGrid message id, delivery/bounce events).
- After batch: report leftover recipients (no PDF) and leftover PDFs (no recipient); show overview who got which PDF + delivery state.
- Extend SendGrid webhook to update batch items via `custom_args` (e.g. `pdfBatchItemId`), without breaking existing `documentId` signing flow.
- Hub card under Admin → System linking to the new page.

**Ask First:**
- If PDF/batch storage choice is blocked by infra (no durable disk): ask before inventing S3.

**Never:**
- No auto-matching by filename.
- No bulk `sendMultiple` of different attachments in one API call (must stay 1:1 sequential).
- No new RBAC permission key for v1.
- Do not remove or break existing document signing webhook handling.

## I/O & Edge-Case Matrix

| Scenario | Expected |
|----------|----------|
| Equal counts | N mails sent; overview N rows; no leftovers |
| More PDFs than recipients | Send for all recipients; list unused PDF filenames |
| More recipients than PDFs | Send for available PDFs; list unmatched emails |
| Invalid email in list | Skip/fail that row; continue batch; mark item failed |
| Invalid / unverified From | Block batch start with clear message |
| SendGrid bounce/drop after send | Item status updates via webhook to bounced |
| Delivered event | Item status → delivered |
| Empty list or no PDFs | Cannot start; validation error |
| Non-PDF file dropped | Reject that file before/at start |

</frozen-after-approval>

## Code Map

- `app/(authenticated)/admin/page.tsx` — hub card
- `app/(authenticated)/admin/pdf-mailer/page.tsx` — new UI (list, dropzone, From, subject/body, run, overview)
- `app/api/admin/pdf-mailer/**` — create batch, upload PDFs, start, status, From-validate
- `lib/email.ts` — attachments + optional `from` override on send
- `app/api/webhooks/sendgrid/route.ts` — handle `pdfBatchItemId` custom arg
- `prisma/schema.prisma` — PdfMailBatch + PdfMailBatchItem (+ delivery fields)
- `messages/nl.json` / `messages/fr.json` — copy

## Tasks & Acceptance

**Execution:**
- [x] Prisma models + migration for batch/items (recipient, filename, statuses, sg ids)
- [x] `lib/email.ts` — support attachments + per-message `from`
- [x] From validation API against SendGrid verified senders/domain
- [x] Admin APIs: parse list (paste/CSV), accept PDF uploads, start sequential send, fetch batch overview
- [x] Extend SendGrid webhook for `pdfBatchItemId` delivery/bounce updates
- [x] Admin UI page + hub card; i18n NL+FR
- [x] Unit tests for pairing leftovers + list parsing edge cases

**Acceptance Criteria:**
- Given a list of N emails and N PDFs, when the batch runs, then each recipient gets exactly one PDF in list/upload order and the overview shows the mapping.
- Given unequal counts, when the batch finishes, then leftovers (PDFs or recipients) are listed explicitly.
- Given an unverified From address, when the user starts the batch, then send is blocked with a clear error.
- Given SendGrid delivers or bounces a message, when the webhook fires, then the batch item delivery status updates.
- Given a user without `admin:users:manage`, when they hit the APIs, then they get 401/403.

## Spec Change Log

## Design Notes

Pairing example: recipients `[a@x.be, b@x.be]`, PDFs `[bon1.pdf, bon2.pdf, bon3.pdf]` → send 2 mails; leftover `bon3.pdf`.

Store PDF bytes for the batch lifetime (local/temp or DB-adjacent file store under upload limits already raised to 100mb); do not require SharePoint.

From check: call SendGrid Verified Senders (and/or authenticated domains) with the API key; accept if From matches a verified identity or verified domain.

## Verification

- `npm run lint` on touched files
- Unit tests for list parse + leftover pairing
- Manual: small batch with 2 PDFs / 3 emails; From validation fail; webhook delivery update in overview

## Suggested Review Order

**UI entry**

- Admin hub card → new PDF mailer page
  [`page.tsx:136`](../../app/(authenticated)/admin/page.tsx#L136)

- Batch composer: list, dropzone, From check, overview
  [`pdf-mailer/page.tsx:49`](../../app/(authenticated)/admin/pdf-mailer/page.tsx#L49)

**Pairing & send**

- Index pairing + leftover math
  [`pdf-mailer.ts:78`](../../lib/pdf-mailer.ts#L78)

- Sequential send with CAS start, skip already-sent, PDF magic bytes
  [`pdf-mail-batch-engine.ts:19`](../../lib/pdf-mail-batch-engine.ts#L19)

- Attachments + From override on SendGrid send
  [`email.ts:151`](../../lib/email.ts#L151)

**APIs & tracking**

- Create batch, validate From, store PDFs privately
  [`batches/route.ts:42`](../../app/api/admin/pdf-mailer/batches/route.ts#L42)

- From validation via SendGrid verified senders/domains
  [`sendgrid-from.ts:5`](../../lib/sendgrid-from.ts#L5)

- Webhook updates delivery/bounce via `pdfBatchItemId`
  [`sendgrid/route.ts:24`](../../app/api/webhooks/sendgrid/route.ts#L24)

**Persistence**

- Prisma models for batch + items
  [`schema.prisma:1465`](../../prisma/schema.prisma#L1465)

- Deploy SQL helper
  [`add-pdf-mail-batch.sql`](../../migrations/add-pdf-mail-batch.sql)

**Tests**

- Parse/pairing edge cases
  [`pdf-mailer.test.ts`](../../tests/unit/lib/pdf-mailer.test.ts)
