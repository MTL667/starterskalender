---
title: 'Date-change notification with confirm dialog'
type: 'feature'
created: '2026-07-24'
status: 'done'
context: []
baseline_commit: '6b55b4da1f6c6d423f369e322a8d414c4ada6368'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** When a starter’s `startDate` or `materialReturnDate` is changed, colleagues who follow that entity are not informed, so planning surprises stay silent.

**Approach:** On edit, if either date actually changes, show a confirmation dialog with three choices: save and email eligible colleagues (with recipient preview), save without email, or cancel. Eligible = users with `starters:read` on the starter’s entity, preference on, excluding the actor. Different email copy for start-date vs return-date. Users can toggle the preference in profile (like other operational notifications).

## Boundaries & Constraints

**Always:**
- Intercept only when editing an existing starter and the submitted value for `startDate` and/or `materialReturnDate` differs from the stored value.
- Three dialog actions: (1) save + notify, (2) save without notify, (3) cancel (no PATCH).
- Recipients: users who `can(..., 'starters:read', { entityId })` for the starter’s entity, with the new preference enabled, excluding the current actor.
- Show recipient preview (name + email) in the dialog before option (1); empty list still allows save+notify (no-op send) or save without notify.
- Use separate email subject/body for start-date change vs material-return-date change; if both change in one save, send one combined email (or two short sections in one mail).
- Preference default `true`; gated by `starters:read` capability like `starterCreated`.
- PATCH must only send mail when the client explicitly requests notify (never auto-mail on every date PATCH).

**Ask First:**
- If recipient resolution for global ALL-scope roles is unexpectedly huge (>100 users), ask before shipping a hard cap.

**Never:**
- Do not notify on create / pending-boarding activation unless the user also changed a date in a true edit flow.
- Do not email entity `notifyEmails` aliases (only app users with prefs).
- Do not change task recalculation behavior beyond existing `recalculateTaskDates`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy: startDate change + notify | Edit, new startDate, choose save+mail | PATCH with notify flag; recipients (minus actor) get start-date email; dialog closes | Preview/API fail → show error, stay on dialog |
| Happy: return date + no mail | OFFBOARDING, materialReturnDate change, save without mail | PATCH without notify; no email | N/A |
| Cancel | Date changed in form, choose cancel | No PATCH; form stays open with edits | N/A |
| Preference off | User has `starters:read` but pref false | Not in preview / not emailed | N/A |
| Actor excluded | Editor also has pref on | Editor not listed / not emailed | N/A |
| No entity | Starter has null entityId | Skip dialog notify path or show empty recipients; still allow save without mail | Prefer: treat as no notify available, still allow save w/o mail or cancel |
| Both dates change | startDate + materialReturnDate in one save | One confirmation; one email covering both changes | N/A |

</frozen-after-approval>

## Code Map

- `components/kalender/starter-dialog.tsx` -- detect date delta on edit submit; open confirm dialog; pass notify flag to PATCH
- `components/kalender/date-change-confirmation-dialog.tsx` -- new 3-action dialog + recipient list (optional extract)
- `components/ui/alert-dialog.tsx` / `dialog.tsx` -- primitives
- `app/api/starters/[id]/route.ts` -- accept `notifyDateChange?: boolean`; send email after successful update
- `app/api/starters/[id]/date-change-recipients/route.ts` -- new preview endpoint for dialog
- `lib/starter-notification-recipients.ts` -- new shared resolve: starters:read + pref + exclude actor
- `lib/notification-prefs.ts` -- add `starterDateChange` to `NotifField`
- `lib/email.ts` -- `sendStarterDateChangeEmail` helper
- `prisma/schema.prisma` + migration -- `NotificationPreference.starterDateChange`
- `app/api/user/notification-preferences/route.ts` -- GET/PATCH/capabilities
- `app/(authenticated)/profiel/page.tsx` -- operational toggle
- `messages/nl.json`, `messages/fr.json` -- labels

## Tasks & Acceptance

**Execution:**
- [x] `prisma/schema.prisma` + migration -- add `starterDateChange Boolean @default(true)` on `NotificationPreference`
- [x] `lib/notification-prefs.ts` + prefs API + `profiel/page.tsx` + i18n -- expose toggle with `starters:read` capability
- [x] `lib/starter-notification-recipients.ts` -- resolve eligible users (starters:read on entity, pref on, exclude actor)
- [x] `app/api/starters/[id]/date-change-recipients/route.ts` -- GET/POST preview for authenticated mutator
- [x] `lib/email.ts` -- date-change email (start / return / both)
- [x] `app/api/starters/[id]/route.ts` -- optional `notifyDateChange`; send after update when true and dates actually changed
- [x] `components/kalender/starter-dialog.tsx` (+ optional dialog component) -- intercept date changes; 3 actions; load preview before/with dialog

**Acceptance Criteria:**
- Given an existing starter with a startDate, when the user changes the date and chooses “save and notify”, then eligible colleagues receive an email and the actor does not.
- Given the same change, when the user chooses “save without notify”, then the date is saved and no date-change email is sent.
- Given the same change, when the user chooses cancel, then no save occurs.
- Given a user with `starters:read` on the entity, when they open profile preferences, then they can toggle “date change” notifications for that entity.
- Given the confirm dialog, when it opens, then it lists the recipients who would get the mail (name/email).

## Spec Change Log

## Design Notes

Recipient resolution should follow **cancellation’s permission idea** (`starters:read` on the entity) but **not** membership-only like `starterCreated`, and **must** exclude the actor like `starterCreated`. Prefer a shared helper so preview and send stay identical.

Dialog UX: show old → new date(s), short explanation, recipient list (scrollable if long), then three buttons. Fetch preview when the dialog opens (after detecting a date delta).

## Verification

**Commands:**
- `npm run lint` -- expected: exit 0 (no new errors in touched files)
- Manual: edit starter startDate → dialog → verify preview → save+notify / save only / cancel
- Manual: profile toggle off for user A → A disappears from preview and does not receive mail

## Suggested Review Order

**Confirm dialog UX**

- 3 actions + recipient preview + preview error handling
  [`date-change-confirmation-dialog.tsx:1`](../../components/kalender/date-change-confirmation-dialog.tsx#L1)

- Intercept date deltas on edit; skip pending boarding; Brussels day keys
  [`starter-dialog.tsx:700`](../../components/kalender/starter-dialog.tsx#L700)

**Server send path**

- Explicit `notifyDateChange` + Brussels same-day check + email
  [`route.ts:110`](../../app/api/starters/[id]/route.ts#L110)

- Shared recipient resolve (starters:read + pref + exclude actor)
  [`starter-notification-recipients.ts:1`](../../lib/starter-notification-recipients.ts#L1)

- Preview endpoint for dialog list
  [`date-change-recipients/route.ts:1`](../../app/api/starters/[id]/date-change-recipients/route.ts#L1)

**Preference toggle**

- Schema field + profile capability
  [`schema.prisma:575`](../../prisma/schema.prisma#L575)
