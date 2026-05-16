# Story 7.2: Retention Expiry Notification

Status: ready-for-dev

> Epic: 7 — Compliance & Data Lifecycle
> Generated: 2026-05-16
> Depends on: Story 7.1 (retentionExpiresAt on Candidate, retention config), Story 6.2 (email sending pattern)

## Story

As a candidate,
I want to be notified before my data is deleted,
So that I can choose to renew my consent if I want to remain in the talent pool.

## Acceptance Criteria

**AC1:** Given a candidate's retention period approaches expiry (notification lead time reached),
When the daily retention check job runs,
Then the candidate receives an email: "Your data will be deleted in {X} days. Click here to extend your consent.",
And the email contains a token-based link (no login required) to a consent renewal page.

**AC2:** Given the candidate clicks the renewal link,
When they confirm renewal,
Then the retention period resets from the renewal date,
And the candidate record is updated with new `retentionExpiresAt`,
And an audit log records "consent:renewed" with timestamp.

**AC3:** Given the candidate does not respond to the notification,
When the retention period expires,
Then the candidate proceeds to the soft-delete phase (Story 7.3).

**AC4:** Given a candidate's email bounces,
When the notification cannot be delivered,
Then the system proceeds with deletion (notification is best-effort, not blocking).

## Tasks

- [ ] Task 1: Add retention notification tracking
  - [ ] 1.1 Add `retentionNotifiedAt DateTime?` and `consentRenewalToken String?` to Candidate model
  - [ ] 1.2 Run db push

- [ ] Task 2: Cron endpoint for retention notifications
  - [ ] 2.1 Create `app/api/recruitment/cron/retention-notify/route.ts`
  - [ ] 2.2 Find candidates where retentionExpiresAt is within notifyDays AND retentionNotifiedAt is null
  - [ ] 2.3 Generate consentRenewalToken, send email with link, set retentionNotifiedAt
  - [ ] 2.4 Secure with CRON_SECRET header

- [ ] Task 3: Consent renewal page
  - [ ] 3.1 Create public route `app/(public)/consent/renew/page.tsx` — token-based, no auth
  - [ ] 3.2 Display: "Your data is scheduled for deletion. Click to extend your consent."
  - [ ] 3.3 Confirm button resets retentionExpiresAt, clears token, logs audit

- [ ] Task 4: Consent renewal API
  - [ ] 4.1 Create `app/api/public/consent/renew/route.ts` — POST with token
  - [ ] 4.2 Validate token, reset retention, audit log "CONSENT_RENEWED"

- [ ] Task 5: i18n keys + email template
  - [ ] 5.1 Add default RETENTION_WARNING email template type (or use direct send)
  - [ ] 5.2 Add i18n keys for consent renewal page

## Dev Notes

### Existing Infrastructure
- **Cron pattern**: `app/api/recruitment/cron/expiration-reminders/route.ts` — same pattern
- **sendEmail()**: `lib/email.ts` for direct email sending
- **Token-based pages**: Pattern from candidate verification

### Key Constraints
- Email is best-effort — bounce does NOT block deletion
- Renewal resets from today (not from original date)
- CRON_SECRET must be set for the endpoint to work
