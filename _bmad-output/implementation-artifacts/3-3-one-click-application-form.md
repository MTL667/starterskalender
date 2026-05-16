# Story 3.3: One-Click Application Form

> Status: done
> Epic: 3 — Public Presence & Candidate Application
> Story: 3.3 — one-click-application-form
> Generated: 2026-05-15

## User Story

As a candidate,
I want to apply to a vacancy with minimal effort,
So that I can submit my application in under 30 seconds without creating an account.

## Acceptance Criteria

**Given** I am on a public vacancy detail page
**When** I click "Apply"
**Then** I see a form with: email (required), CV upload zone (required, accepts .pdf/.docx, max 10MB), and optional motivation textarea
**And** a privacy notice with link to privacy policy is visible below the form
**And** the form is mobile-first designed with large touch targets

**Given** I fill in my email and upload a CV
**When** I click "Submit Application"
**Then** the form submits in under 500ms server response (NFR4)
**And** my application data is persisted before the confirmation is shown (NFR29: zero data loss)
**And** I see a success state: "Application submitted! Check your email to confirm."

**Given** I submit an application
**When** the system processes it
**Then** an email verification is sent to my email address (AR12)
**And** the candidate record is created with status "pending_verification"
**And** the candidate only enters the pipeline after email verification

**Given** spam protection is active
**When** a bot submits the form
**Then** rate limiting blocks more than 5 applications per IP per hour
**And** honeypot fields catch automated submissions
**And** no CAPTCHA is shown to real users (NFR12)

**Given** I try to upload an invalid file
**When** I select a file that exceeds 10MB or has wrong format
**Then** inline validation shows the error immediately (before submission)
**And** the file input is keyboard accessible

**Given** I submit with an invalid email format
**When** validation runs on blur
**Then** an inline error appears below the email field linked via aria-describedby (NFR21)

## Tasks

- [x] Task 1: Create `/jobs/[entityGroup]/[vacancyId]/apply/page.tsx` SSR page + Client Form Component (AC: all)
- [x] Task 2: Create `POST /api/public/vacancies/[id]/apply/route.ts` with Zod validation, rate limiting, honeypot, CV upload to SharePoint (AC: 1-4)
- [x] Task 3: Schema migration — add `verificationToken`, `verifiedAt`, `status` to Candidate; make `createdById` nullable; add `APPLICATION` source (AC: 3)
- [x] Task 4: Email verification flow — send verification email + create verify endpoint (AC: 3)
- [x] Task 5: i18n keys (nl + fr) + WCAG 2.1 AA compliance (AC: 1, 5, 6)

## Dev Notes

### Architecture Decisions

- Route: `app/jobs/[entityGroup]/[vacancyId]/apply/page.tsx` — public SSR page with Client Component form
- Form is the **only Client Component** in public pages — required for file upload state, inline validation, and submit handling
- API endpoint: `POST /api/public/vacancies/[id]/apply/route.ts` — unauthenticated, rate-limited
- CV storage: SharePoint via Graph API at path `/Recruitment/{Entity}/{Function}/{Candidate}/`
- Email verification: SendGrid with crypto-random token stored on Candidate record
- Candidate enters pipeline (first stage) ONLY after email verification

### What Needs to Change

#### 1. Prisma Schema Changes (CRITICAL — do first)

```prisma
enum CandidateSource {
  DIRECT
  REFERRAL
  LINKEDIN
  APPLICATION  // NEW: public form submissions
  OTHER
}

model Candidate {
  // ... existing fields ...
  createdById        String?  // CHANGE: nullable for public applications
  createdBy          User?    @relation("CandidateCreator", fields: [createdById], references: [id])
  verificationToken  String?  @unique
  verifiedAt         DateTime?
  // ...
}
```

**Changes needed:**
- Add `APPLICATION` to `CandidateSource` enum
- Make `createdById` nullable (was required `String`) — public applications have no authenticated user
- Add `verificationToken String? @unique` to `Candidate`
- Add `verifiedAt DateTime?` to `Candidate`
- Run `npx prisma db push` (existing migration pattern)

**CRITICAL:** Update the existing `candidateCreateSchema` in `lib/recruitment/schemas.ts` to handle the nullable `createdById`. The internal candidate creation API should continue to require it — only the public apply route skips it.

#### 2. Apply Page (`app/jobs/[entityGroup]/[vacancyId]/apply/page.tsx`)

Server Component wrapper that:
- Validates vacancy exists, is published, belongs to entity group
- If not published → `notFound()`
- Passes vacancy metadata (title, entity, entityColor) to client form
- Sets SEO metadata: title = "Apply — {vacancy.title}", robots: noindex (application pages shouldn't be indexed)

#### 3. ApplicationForm Client Component

Create `components/recruitment/public/application-form.tsx` (`'use client'`):

**Form fields (anatomy from UX spec):**
1. Email input (required) — validate on blur, `type="email"`
2. CV upload zone (required) — dashed border, drag & drop + click, PDF/DOCX only, max 10MB
3. Motivation textarea (optional) — max 2000 chars
4. Honeypot field (hidden via CSS `position: absolute; left: -9999px`) — if filled, silently reject
5. Privacy notice with link to `/privacy`
6. Submit button — entity-colored, full-width on mobile, `48px` height

**States:**
- Empty → Filling (validation on blur) → Submitting (spinner, disabled) → Success (confirmation) → Error (inline)

**File upload UX:**
- Dashed border drop zone with upload icon
- Accepts drag & drop + click to browse
- Shows filename + size after selection, X to remove
- Upload starts on form submit (not on selection) — file kept in local state as `File` object
- Progress bar during API call
- Accept: `.pdf,.docx` / `application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Client-side size validation (10MB = 10_485_760 bytes) before submit

**Validation:**
- Email: regex on blur + `aria-describedby` linking to error
- CV: file type + size validated on selection (inline error immediately)
- Motivation: maxLength with character counter
- All errors use `aria-describedby` + `aria-invalid="true"`

#### 4. Apply API Route (`POST /api/public/vacancies/[id]/apply/route.ts`)

```typescript
// Zod schema for request body (FormData)
const applySchema = z.object({
  email: z.string().email().max(254),
  motivation: z.string().max(2000).optional(),
  honeypot: z.string().max(0), // must be empty
})
// + file validation in handler (type + size)
```

**Flow:**
1. Rate limit check: 5 per IP per hour (stricter than listing page)
2. Parse `FormData` — extract email, motivation, honeypot field, CV file
3. If honeypot non-empty → return 200 (fake success, don't persist)
4. Validate vacancy exists, is PUBLISHED, not deleted, entity has siteGroup
5. Check duplicate: `Candidate` with same `vacancyId + email` already exists → return error "Already applied"
6. Upload CV to SharePoint: `/Recruitment/{Entity.name}/{Vacancy.title}/{LastName_FirstName}/CV_{filename}`
   - Use existing `graphDocs()` client from `lib/graph-teams.ts`
   - Derive candidate name from email prefix as folder fallback (will be just email since no name fields)
   - Actually: store CV in `/Recruitment/{Entity.name}/{Vacancy.title}/Applications/{email}/`
7. Create `Candidate` record with:
   - `firstName`: empty string (public apply doesn't collect name — or extract from email)
   - `lastName`: empty string
   - `email`: from form
   - `source`: `APPLICATION`
   - `createdById`: null
   - `vacancyId`: from params
   - `stageId`: first stage (lowest `order`) of the vacancy
   - `verificationToken`: `crypto.randomUUID()`
   - `dealbreakersResult`: `PENDING`
8. Create `CandidateApplication` record with: `cvDriveId`, `cvItemId`, `cvFileName`, `motivation`
9. Send verification email via SendGrid (use existing `sendEmail` from `lib/email.ts`)
10. Return 201 with `{ data: { message: 'Application submitted' } }`

**IMPORTANT**: Persist candidate BEFORE sending email (zero data loss guarantee). If email fails, candidate is still saved — they can request resend later.

#### 5. Email Verification Endpoint

Create `app/api/public/vacancies/[id]/apply/verify/route.ts`:

```
GET /api/public/vacancies/[id]/apply/verify?token={verificationToken}
```

**Flow:**
1. Find candidate by `verificationToken`
2. If not found or already verified → redirect to apply page with error/info
3. Set `verifiedAt = now()`, clear `verificationToken`
4. Emit SSE event `recruitment:pipeline:new_candidate` (so Kanban updates in real-time)
5. Redirect to a "Verification successful" page or `/jobs/[entityGroup]/[vacancyId]?verified=true`

**DESIGN DECISION**: Candidate record exists immediately after form submit (with `verifiedAt: null`). It's visible in the admin pipeline with a "pending verification" indicator. After email click, `verifiedAt` is set and dealbreaker scoring runs.

#### 6. Verification Email Content

Use `sendEmail` from `lib/email.ts`:
- Subject: "Bevestig je sollicitatie bij {entity.name}" / "Confirmez votre candidature chez {entity.name}"
- Body: Professional HTML email with:
  - Vacancy title
  - Entity branding (name, color)
  - CTA button: "Verify my email" linking to verify endpoint
  - Note: "This link expires in 48 hours"
- Token expiry: 48 hours (check in verify endpoint)

### File Structure

```
app/jobs/[entityGroup]/[vacancyId]/apply/
├── page.tsx                           # SSR wrapper (validates vacancy, passes props)
└── (no layout — inherits parent)

components/recruitment/public/
├── application-form.tsx               # NEW: 'use client' form component
├── content-block-renderer.tsx         # existing (from 3.2)
├── vacancy-card.tsx                   # existing (from 3.1)
└── empty-state.tsx                    # existing (from 3.1)

app/api/public/vacancies/[id]/apply/
├── route.ts                           # NEW: POST application submission
└── verify/route.ts                    # NEW: GET email verification

lib/recruitment/
├── schemas.ts                         # EXTEND: add applicationSubmitSchema
├── types.ts                           # existing
└── sharepoint-documents.ts            # NEW: uploadCandidateCV helper
```

### RBAC

- No authentication required — public page and API
- `proxy.ts` already excludes `/jobs` and `/api/public` from auth matcher
- SharePoint upload uses app-level Graph API credentials (not user context)

### Anti-Patterns to Avoid

1. **DO NOT** put upload logic in the Client Component — all file processing happens server-side in the API route
2. **DO NOT** use `useTranslations` — page.tsx is Server Component; form component receives translations as props
3. **DO NOT** send email before persisting — always save first (zero data loss)
4. **DO NOT** expose internal candidate ID in public responses
5. **DO NOT** create `VacancyStage` assignment before verification (candidate gets stageId at creation but only "counts" in pipeline after verify)
6. **DO NOT** use existing `candidateCreateSchema` for public apply — it requires `firstName`/`lastName` which public form doesn't collect
7. **DO NOT** make GraphAPI upload blocking for the response — if upload fails, still save candidate with null CV references and log error
8. **DO NOT** use `uploadDocument` from `lib/graph-teams.ts` directly — it uses starter-specific folder paths. Create a dedicated `uploadCandidateCV` helper
9. **DO NOT** show CAPTCHA — architecture explicitly forbids it for one-click UX
10. **DO NOT** add firstName/lastName fields — UX spec says 3 fields max (email, CV, optional motivation)

### Previous Story Intelligence (3.2)

**Patterns to follow:**
- `cache()` wrapper on data fetching in SSR page
- `notFound()` for unpublished vacancies
- Entity color used for button styling
- `getTranslations('public.vacancy')` for server-side i18n
- JSON-LD XSS prevention in page output
- Rate limiting pattern from `app/api/public/vacancies/[id]/route.ts`
- `proxy.ts` already excludes public routes

**Review findings from 3.2 (prevent regressions):**
- Use `vacancy.entity.colorHex` (not `entities[0]`) for branding
- Runtime type guards on any JSON content
- `text-gray-500` minimum for WCAG contrast (not gray-400)
- Normalize JSON arrays before use

**Key code references:**
- Rate limiting: `app/api/public/vacancies/[id]/route.ts` (same IP-based pattern, but 5/hour not 100/min)
- SendGrid email: `lib/email.ts` → `sendEmail({ to, subject, html })`
- Graph upload: `lib/graph-teams.ts` → `uploadDocument()` (study pattern, build recruitment variant)
- Prisma Candidate model: `prisma/schema.prisma:978-1003`
- CandidateApplication model: `prisma/schema.prisma:1005-1014`
- Vacancy stages: query `VacancyStage` where `vacancyId` ordered by `order ASC`, take first

### Existing Code to Reuse/Extend

| Asset | How to use |
|-------|------------|
| `lib/email.ts` → `sendEmail()` | Send verification email (to, subject, html) |
| `lib/graph-teams.ts` → `graphDocs()`, `resolveDriveId()` | Get Graph client for SharePoint upload |
| `lib/recruitment/schemas.ts` | Add `applicationSubmitSchema` (separate from `candidateCreateSchema`) |
| `app/api/public/vacancies/[id]/route.ts` | Rate limiting pattern (adapt: 5/hour/IP) |
| `app/jobs/[entityGroup]/[vacancyId]/page.tsx` | SSR validation pattern (getVacancyData + notFound) |
| `components/recruitment/public/` | Existing public UI components as reference |
| `prisma/schema.prisma` → Candidate, CandidateApplication | Extend with verification fields |

### i18n Keys to Add

Add under `public.apply` namespace in `messages/nl.json` and `messages/fr.json`:

| Key | NL | FR |
|-----|----|----|
| `public.apply.title` | Solliciteren | Postuler |
| `public.apply.emailLabel` | E-mailadres | Adresse e-mail |
| `public.apply.emailPlaceholder` | jouw@email.com | votre@email.com |
| `public.apply.emailError` | Voer een geldig e-mailadres in | Veuillez entrer une adresse e-mail valide |
| `public.apply.cvLabel` | CV uploaden (PDF of DOCX, max 10MB) | Télécharger CV (PDF ou DOCX, max 10MB) |
| `public.apply.cvDropzone` | Sleep je CV hierheen of klik om te bladeren | Glissez votre CV ici ou cliquez pour parcourir |
| `public.apply.cvError` | Upload een PDF of DOCX bestand (max 10MB) | Téléchargez un fichier PDF ou DOCX (max 10MB) |
| `public.apply.motivationLabel` | Motivatie (optioneel) | Motivation (optionnel) |
| `public.apply.motivationPlaceholder` | Vertel kort waarom je geïnteresseerd bent... | Expliquez brièvement pourquoi vous êtes intéressé(e)... |
| `public.apply.privacyNotice` | Door te solliciteren ga je akkoord met ons {link}. | En postulant, vous acceptez notre {link}. |
| `public.apply.privacyLink` | privacybeleid | politique de confidentialité |
| `public.apply.submit` | Sollicitatie versturen | Envoyer la candidature |
| `public.apply.submitting` | Bezig met versturen... | Envoi en cours... |
| `public.apply.successTitle` | Sollicitatie verstuurd! | Candidature envoyée ! |
| `public.apply.successDescription` | Controleer je e-mail om je sollicitatie te bevestigen. | Vérifiez votre e-mail pour confirmer votre candidature. |
| `public.apply.alreadyApplied` | Je hebt al gesolliciteerd voor deze vacature | Vous avez déjà postulé pour ce poste |
| `public.apply.verifySubject` | Bevestig je sollicitatie bij {entity} | Confirmez votre candidature chez {entity} |
| `public.apply.verifiedTitle` | E-mail bevestigd! | E-mail confirmé ! |
| `public.apply.verifiedDescription` | Je sollicitatie is compleet. We nemen zo snel mogelijk contact op. | Votre candidature est complète. Nous vous contacterons dès que possible. |

### SEO Requirements

1. **`generateMetadata`**: title = "Apply — {vacancy.title}", robots: `{ index: false, follow: false }` (application pages not indexed)
2. **No JSON-LD** on apply page (not a public content page)
3. **Canonical**: not needed (noindex)

### Performance Budget

- Server response < 500ms for form submission (NFR4)
- SSR page load < 1.5s LCP
- CV upload: allow up to 10s for large files (10MB over slow connection)
- Form state: minimal client JS — only the form component is hydrated
- SharePoint upload: non-blocking for response if possible (but must persist reference)

### UX Specifications

**Layout (from UX spec):**
- Single-column, `max-width: 480px` centered
- `gap-4` between fields
- Mobile-first: stacked fields, large touch targets (`48px` height minimum)
- Same nav/breadcrumb as detail page (inherit parent visual context)

**Form anatomy (ordered):**
1. Email input with label + asterisk
2. CV upload drop zone (dashed border, upload icon)
3. Motivation textarea with optional label
4. Privacy notice (small text with link)
5. Submit button (entity-colored, full-width, `48px` height)

**Typography:**
- Field labels: `text-sm`, `font-medium`
- Error text: `text-sm`, `text-red-600`
- Privacy notice: `text-xs`, `text-gray-500`
- Submit button: `text-lg`, `font-semibold`, `text-white`

**States:**
- Submitting: spinner replaces button text, button disabled, all fields disabled
- Success: form replaced with confirmation card (checkmark icon + title + description)
- Error: inline below relevant field, red border on field

**Colors:**
- Submit button: entity `colorHex` background
- Upload zone border: `border-gray-300` (default), `border-blue-500` (drag over), `border-red-500` (error)
- No dark mode on public pages

**Touch targets:**
- All form fields: `48px` height minimum
- Submit button: full-width, `48px` height
- File upload zone: minimum `120px` height, full-width

## Review Findings

- [x] D1: Unverified candidates in pipeline — Added `CandidateStatus` enum (`PENDING_VERIFICATION`/`ACTIVE`), pipeline queries filter on `status: 'ACTIVE'`
- [x] P1: Honeypot `max(0)` removed — bots now reach silent 201
- [x] P2: Race condition — `$transaction` + P2002 catch returns 409
- [x] P3: CV fileName sanitized — path traversal blocked in SharePoint upload
- [x] P4: Verify redirect uses resolved slug instead of hardcoded `/jobs/unknown/`
- [x] P5: HTML injection in email template — `escapeHtml()` + color regex + `encodeURI()`
- [x] P6: Candidate + CandidateApplication in `$transaction` — no orphan rows
- [x] P7: Token cleared → 2nd click shows "already verified" instead of "invalid"
- [x] P8: Email `onBlur` validates empty field — required check no longer missed

## References

- Architecture: `app/api/public/vacancies/[id]/apply/route.ts` (route structure)
- UX: Screen 5 in `ux-design-directions.html` (mobile application form mockup)
- PRD: FR10 (one-click apply), FR11 (CV upload), FR12 (optional info), FR13 (GDPR storage)
- NFR: Performance (< 500ms), Reliability (zero data loss), Security (rate limit + honeypot)
- Epics: Story 3.3 acceptance criteria
- Previous story: `3-2-public-vacancy-detail-page.md` (patterns, review findings)
