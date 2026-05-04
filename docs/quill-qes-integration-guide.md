# Quill QES Integration Guide

Guide for integrating **Quill by Dioss Smart Solutions** for Qualified Electronic Signatures (QES) via itsme/Belgian eID in a Next.js application.

## Overview

```
User uploads PDF → Create Quill guest user → Create Quill document → Binary upload →
Quill processes → Send document → Signing URL → Email to signer →
Signer signs via itsme/eID → Webhook FULLY_SIGNED →
Download signed PDF → Store → Status SIGNED → Confirmation email
```

## 1. Quill Account & Setup

### Request from Dioss
- Account at https://quill.dioss.com
- API credentials (client_id + client_secret)
- Enable desired signature types (ITSME, BELGIAN_EID, SMS_OTP)
- QA environment URL (e.g. `https://quill-qa.dioss.io`)

### Environment Variables

```env
QUILL_API_URL=https://quill-qa.dioss.io        # Tenant-specific URL
QUILL_CLIENT_ID=your-client-id                  # OAuth2 client ID
QUILL_API_KEY=your-client-secret                # OAuth2 client secret
QUILL_SIGNATURE_TYPES=ITSME,BELGIAN_EID         # Comma-separated, available types
```

## 2. API Client (`lib/quill.ts`)

Copy this file directly into your project. It contains:

- **OAuth2 token caching** with `client_credentials` grant, auto-refresh on 401
- **Generic HTTP helpers** (`quillFetch`, `quillJson`) with structured error handling
- **All Quill API functions** you need

### Functions

| Function | Purpose |
|----------|---------|
| `isQuillConfigured()` | Check if env vars are set |
| `getDefaultSignatureTypes()` | Reads `QUILL_SIGNATURE_TYPES` env |
| `createGuestUser(email, firstName, lastName)` | Create signer in Quill |
| `createDocument(opts)` | Create document with webhook URL and signature location |
| `uploadDocumentBinary(id, buffer)` | Upload PDF via multipart/form-data |
| `sendDocument(id)` | Activate the document for signing |
| `getSigningUrl(docId, userId)` | Retrieve the signing URL for the signer |
| `getDocumentStatus(id)` | Get current status (for verification) |
| `downloadSignedDocument(id)` | Download the signed PDF |

### Important Details

**Token endpoint:**
```
POST {QUILL_API_URL}/auth/realms/dioss/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded
client_id={QUILL_CLIENT_ID}&client_secret={QUILL_API_KEY}&grant_type=client_credentials
```

**Binary upload:** Use `upload-multipart` (not `upload-binary`) — more reliable in Node.js/Next.js:
```typescript
const form = new FormData()
form.append('file', blob, 'document.pdf')
```

**Signing URL endpoint:** `/api/rest/v2/urls/user-signing` (not `/urls/create`)

**Document status:** The `state` field can appear in different locations in the response. Check `raw.state || raw.status || raw.documentInfo?.state`.

### Full File

```typescript
// lib/quill.ts — Copy from the source project
// See: /lib/quill.ts (~350 lines)
```

## 3. Database Schema

Add these fields to your document model (Prisma example):

```prisma
model Document {
  // ... existing fields ...

  // Quill QES integration
  quillDocumentId Int?      // Quill's internal document ID
  quillUserId     Int?      // Quill guest user ID for the signer
  quillSigningUrl String?   // Cached signing URL from Quill (SENSITIVE)
  quillState      String?   // Last known Quill state
}
```

**Important:** `quillSigningUrl` is sensitive — strip it from all API responses to the client.

## 4. Document Upload Flow

When a user uploads a PDF and selects QES:

```typescript
// 1. Validate Quill is configured
if (!isQuillConfigured()) throw new Error('Quill not configured')
if (!recipientEmail) throw new Error('Email required for QES')

// 2. Create guest user
const guestUser = await createGuestUser(recipientEmail, firstName, lastName)

// 3. Create document with webhook URL
const quillDoc = await createDocument({
  name: documentTitle,
  webhookUrl: `${process.env.APP_URL}/api/webhooks/quill`,
  signerUserId: guestUser.id,
  signatureTypes: getDefaultSignatureTypes(),
  // Optional: signaturePlaceholder: '{{SIGNATURE}}'
})

// 4. STORE QUILL IDS IMMEDIATELY (webhooks can arrive during upload)
await db.document.update({
  where: { id: documentId },
  data: {
    quillDocumentId: quillDoc.documentId,
    quillUserId: guestUser.id,
    quillState: 'CREATED',
  },
})

// 5. Upload the PDF binary
await uploadDocumentBinary(quillDoc.documentId, pdfBuffer)

// 6. Poll for processing (max ~15 seconds)
let ready = false
for (let i = 0; i < 10; i++) {
  await new Promise((r) => setTimeout(r, 1500))
  const status = await getDocumentStatus(quillDoc.documentId)
  if (status.state === 'PREPARING' || status.state === 'WAITING_FOR_SIGNATURES') {
    ready = true
    break
  }
  if (status.state === 'PREPARING_FAILED') {
    throw new Error(`Processing failed: ${status.creationError}`)
  }
}

// 7. Send and retrieve signing URL
if (ready) {
  await sendDocument(quillDoc.documentId)
  const signingUrl = await getSigningUrl(quillDoc.documentId, guestUser.id)

  await db.document.update({
    where: { id: documentId },
    data: { quillSigningUrl: signingUrl, quillState: 'WAITING_FOR_SIGNATURES' },
  })

  // 8. Automatically send the signing email
  await sendSigningEmail({ to: recipientEmail, signingUrl, ... })
}
```

**Critical:** Store `quillDocumentId` BEFORE the binary upload (step 4), not after. The `DOCUMENT_PREPARING` webhook can arrive while the upload is still in progress.

## 5. Webhook Handler

### Route: `POST /api/webhooks/quill`

**Requirements:**
- Must return a 2xx response within 3 seconds (Quill retries up to 5x with exponential backoff)
- No HMAC verification — verify by calling `getDocumentStatus()` API instead
- Heavy processing (PDF download, email) should be fire-and-forget
- Idempotent: check if document is already SIGNED

### Webhook Events

| Event | Action |
|-------|--------|
| `DOCUMENT_PREPARING` | Log + if signing URL missing: send document → get URL → email |
| `DOCUMENT_WAITING_FOR_SIGNATURES` | If signing URL missing: get URL → email (fallback) |
| `DOCUMENT_FULLY_SIGNED` | Download signed PDF → store → status SIGNED → confirmation email |
| `SIGNATURE_DECLINED` / `DOCUMENT_DECLINED` | Status → CANCELLED |
| `DOCUMENT_EXPIRE` | Status → EXPIRED |
| `NEW_SIGNATURE` | Audit log |
| `DOCUMENT_PREPARING_FAILED` | Status → PREPARING_FAILED |
| `DOCUMENT_PAGE_PREVIEWS_READY` | Ignore |
| `DOCUMENT_DELETED` | Ignore |

### Verification Pattern

```typescript
export async function POST(request) {
  const body = await request.json()
  const { type, documentId } = body

  // Find document in your own database
  const doc = await db.document.findFirst({ where: { quillDocumentId: documentId } })
  if (!doc) return Response.json({ ok: true }) // Unknown document, ACK anyway

  // Verify status via Quill API (instead of HMAC)
  const verified = await getDocumentStatus(documentId)
  const verifiedState = verified.state

  // Store verified state
  await db.document.update({ data: { quillState: verifiedState } })

  // Handle event...
  return Response.json({ ok: true }) // Always return 2xx
}
```

### DOCUMENT_FULLY_SIGNED Handler

```typescript
// Fire-and-forget to meet the 3-second response deadline
handleFullySigned(doc, quillDocId).catch(console.error)

async function handleFullySigned(doc, quillDocId) {
  // Idempotency check
  if (doc.status === 'SIGNED') return

  // Download signed PDF
  const pdfBuffer = await downloadSignedDocument(quillDocId)

  // Upload to your storage (SharePoint, S3, etc.)
  const storedId = await uploadToStorage(pdfBuffer, `${doc.fileName}-signed.pdf`)

  // Only mark SIGNED if the PDF was successfully stored
  if (!storedId) {
    await db.document.update({ data: { quillState: 'SIGNED_PDF_UPLOAD_FAILED' } })
    return
  }

  await db.document.update({
    data: {
      status: 'SIGNED',
      quillState: 'DOCUMENT_FULLY_SIGNED',
      signedAt: new Date(),
    },
  })

  // Send confirmation email
  await sendConfirmationEmail(doc)
}
```

## 6. Middleware / Proxy

Ensure the webhook endpoint is not behind authentication:

```typescript
// Add to your auth middleware bypass
if (pathname.startsWith('/api/webhooks')) {
  return NextResponse.next()
}
```

## 7. UI Considerations

### Status Badges

```typescript
const QUILL_STATE_LABELS = {
  CREATED: 'Processing',
  PREPARING: 'Preparing',
  PREPARING_FAILED: 'Preparation failed',
  SETUP_FAILED: 'Setup failed',
  WAITING_FOR_SIGNATURES: 'Awaiting signature',
  DOCUMENT_FULLY_SIGNED: 'Signed',
  SIGNED_PDF_UPLOAD_FAILED: 'Storage failed',
  SIGNATURE_DECLINED: 'Declined',
  DOCUMENT_DECLINED: 'Declined',
  DOCUMENT_EXPIRE: 'Expired',
}
```

### Buttons

- **Hide** the "place signature fields" button for QES (Quill manages this)
- **Disable** the "send email" button if `quillState !== 'WAITING_FOR_SIGNATURES'`
- Or better: send the email **automatically** after obtaining the signing URL

### Signature Placement

Two options for signature position:

1. **Placeholder** (recommended for templates): text in the PDF e.g. `{{SIGNATURE}}` that Quill finds automatically
2. **Coordinates** (fallback): default position bottom-left of page 1

```typescript
createDocument({
  // Option 1: Placeholder
  signaturePlaceholder: '{{SIGNATURE}}',

  // Option 2: Coordinates (default when placeholder is empty)
  signatureLocation: {
    pageIndex: 0,
    relativeLocationX: 0.1,
    relativeLocationY: 0.85,
    relativeWidth: 0.35,
    relativeHeight: 0.08,
  },
})
```

## 8. Security Checklist

- [ ] Strip `quillSigningUrl` from ALL API responses (GET list, GET single, POST create, PATCH)
- [ ] Webhook endpoint outside auth middleware
- [ ] `enabledNotifications: []` on guest user (prevents duplicate emails from Quill)
- [ ] `QUILL_API_KEY` never in client-side code
- [ ] Idempotency guard in FULLY_SIGNED handler
- [ ] Verification via `getDocumentStatus()` on every webhook

## 9. Common Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| `SIGNATURE_TYPE_NOT_ALLOWED` | Type not enabled by Dioss | Ask Dioss to enable the type, or use a different one |
| 500 on `upload-binary` | Buffer serialization in Next.js | Use `upload-multipart` with FormData |
| Document not found on webhook | Quill IDs not yet stored | Store IDs BEFORE binary upload |
| `verified state is undefined` | Quill response structure varies | Parse flexibly: `raw.state \|\| raw.status \|\| raw.documentInfo?.state` |
| 404 on `/urls/create` | Wrong endpoint | Use `/api/rest/v2/urls/user-signing` |
| `DOCUMENT_PREPARING_FAILED` | PDF placeholder text not found | Use empty placeholder (coordinate fallback) |

## 10. References

- [Quill API Docs](https://quill.dioss.com/docs/technical/introduction/)
- [Quill Swagger (v2)](https://quill.dioss.com/docs/swagger-ui/?urls.primaryName=v2)
- [Example signing flow](https://quill.dioss.com/docs/nl/tutorials/api_integrations/example_signing_flow/)
