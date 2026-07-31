---
title: 'PDF mailer chunked upload for large batches'
type: 'feature'
created: '2026-07-31'
status: 'done'
baseline_commit: '61c33e16d4a3794bc77cf4daa5681baa9e2403be'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Starting a PDF-mailer batch with ~200 PDFs in one multipart POST aborts with `ECONNRESET` / timeout before send begins.

**Approach:** Split the flow: create a DRAFT batch with list + mail fields (JSON), upload PDFs in small chunks, then finalize (pair + start sequential send). UI shows upload progress and only starts send after all chunks succeed.

## Boundaries & Constraints

**Always:**
- Chunked path is the default for the admin UI (works for small and large batches).
- Create-batch request carries recipients + from/subject/body only (no PDF binaries).
- Persist parsed recipients on the batch until finalize (e.g. JSON field).
- Upload endpoint accepts a limited chunk (max **10 PDFs** or **25MB** total per request, whichever hits first); validate PDF magic bytes + 15MB per file as today.
- Client uploads chunks sequentially with stable global order (list/upload order unchanged).
- Finalize pairs recipients↔PDFs by index, writes leftovers, then starts `runPdfMailBatch` (async, as today).
- Progress UI: “Uploading X/Y PDFs…” then batch overview / send status.
- Failed chunk: show error, allow retry of that chunk without re-uploading successful ones; do not start send until finalize succeeds.
- Auth remains `admin:users:manage` via `requireAdmin`.

**Ask First:**
- (none)

**Never:**
- Do not require loading all 200 PDF bytes into one browser→server request.
- Do not change SendGrid delivery/webhook behavior.
- Do not auto-start send before all intended PDFs are uploaded (unless user explicitly finalizes with fewer PDFs — leftovers reported as today).

## I/O & Edge-Case Matrix

| Scenario | Expected |
|----------|----------|
| 202 PDFs, chunk 10 | ~21 upload calls succeed; finalize starts send; no ECONNRESET on create |
| Chunk fails mid-way | Error shown; already-uploaded PDFs kept; retry chunk; then finalize |
| Finalize with 200 recipients / 202 PDFs | 200 pairs; 2 leftover PDF names |
| Finalize with 0 PDFs | 400 — need at least one PDF |
| Small batch (3 PDFs) | Still uses chunked API; one upload chunk + finalize |

</frozen-after-approval>

## Code Map

- `app/(authenticated)/admin/pdf-mailer/page.tsx` — chunked upload + progress
- `app/api/admin/pdf-mailer/batches/route.ts` — create JSON draft (no PDFs)
- `app/api/admin/pdf-mailer/batches/[id]/pdfs/route.ts` — chunk upload
- `app/api/admin/pdf-mailer/batches/[id]/finalize/route.ts` — pair + start
- `prisma/schema.prisma` — store `recipientsJson` (and optional upload meta) on `PdfMailBatch`
- `lib/pdf-mail-batch-engine.ts` — reuse send; helpers for storage paths
- `messages/nl.json` / `messages/fr.json` — progress copy

## Tasks & Acceptance

**Execution:**
- [x] Schema: `recipientsJson` on batch (+ db push / SQL helper)
- [x] POST create batch JSON (validate from + parse list); no PDFs
- [x] POST chunk upload PDFs with startIndex; append files in order
- [x] POST finalize: pair, leftovers, start send
- [x] UI: sequential chunk uploads + progress; then poll overview
- [x] Keep/adapt unit coverage for pairing; smoke-test large N client chunking helper if extracted
- [x] i18n NL+FR

**Acceptance Criteria:**
- Given ~200 PDFs selected, when the user starts the batch, then uploads complete via multiple chunk requests without a single giant multipart POST.
- Given all chunks succeed, when finalize runs, then pairing/leftovers/send behave as today.
- Given a chunk fails, when the user retries, then previously uploaded PDFs are not lost and send has not started yet.

## Spec Change Log

## Design Notes

Keep old monolithic multipart create only if cheap for backward compatibility; UI must not use it for large sets. Prefer retiring it to one code path.

Client chunking: `const CHUNK = 10` files.

## Verification

- Unit: pairing unchanged
- Manual: 25+ PDFs (or mock) with progress; simulate fail mid-chunk; full 200-file run if available

## Suggested Review Order

**Create → upload → finalize API**

- JSON-only DRAFT create; recipients stored, no PDF binaries
  [`batches/route.ts:35`](../../app/api/admin/pdf-mailer/batches/route.ts#L35)

- Chunk limits: 10 files or 25MB; append by startIndex
  [`pdfs/route.ts:10`](../../app/api/admin/pdf-mailer/batches/[id]/pdfs/route.ts#L10)

- Pair leftovers + transactional finalize, then async send
  [`finalize/route.ts:45`](../../app/api/admin/pdf-mailer/batches/[id]/finalize/route.ts#L45)

**Schema & helpers**

- Persist recipientsJson + uploadedPdfs on batch
  [`schema.prisma:1473`](../../prisma/schema.prisma#L1473)

- Safe JSON coercion for finalize/upload
  [`pdf-mail-batch-store.ts:8`](../../lib/pdf-mail-batch-store.ts#L8)

**Admin UI**

- Byte+count-aware chunks, resume, progress, invalidate on edit
  [`page.tsx:217`](../../app/(authenticated)/admin/pdf-mailer/page.tsx#L217)

- Progress copy NL/FR
  [`nl.json:1519`](../../messages/nl.json#L1519)
