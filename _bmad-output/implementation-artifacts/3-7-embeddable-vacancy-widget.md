# Story 3.7: Embeddable Vacancy Widget (Phase 2)

> Status: done
> Epic: 3 — Public Presence & Candidate Application
> Generated: 2026-05-16

## Story

As an admin,
I want to embed a vacancy display on external websites,
so that partner organizations can show our open positions on their own sites.

## Acceptance Criteria

**AC1:** Given I have `recruitment:admin` permission, When I navigate to widget configuration, Then I can generate an embed code per site group, And the embed code is a single script tag that renders a styled vacancy list.

**AC2:** Given an external website includes the embed code, When the page loads, Then the widget displays active vacancies for the configured site group, And the widget is styled independently (does not conflict with host page styles), And clicking a vacancy opens the full vacancy page in a new tab.

**AC3:** Given a vacancy is published or closed, When the change propagates, Then the widget updates automatically (within 5 minutes).

## Tasks / Subtasks

- [ ] Task 1: Create widget script endpoint (AC: 2,3)
  - [ ] 1.1 Create `app/api/public/widget/[slug]/route.ts` — returns JavaScript that fetches vacancies and renders a widget
  - [ ] 1.2 Script fetches from `/api/public/vacancies?siteGroup=[slug]` and renders vacancy cards
  - [ ] 1.3 Use Shadow DOM for style isolation
  - [ ] 1.4 Set `Cache-Control: public, max-age=300` (5-min refresh per AC3)

- [ ] Task 2: Widget embed code generator in admin (AC: 1)
  - [ ] 2.1 Add widget section to `/recruitment/admin/instellingen` page
  - [ ] 2.2 Show copyable `<script>` tag per site group with the widget URL
  - [ ] 2.3 Include preview of embed code

- [ ] Task 3: i18n keys (AC: 1)
  - [ ] 3.1 Add widget-related keys to nl.json and fr.json

## Dev Notes

### Architecture Decisions

**Shadow DOM for isolation.** The widget script creates a Shadow DOM root on the host page, isolating styles completely. No iframe needed (better SEO, simpler integration).

**Self-contained JS bundle.** The widget is served as a plain JavaScript file from `/api/public/widget/[slug]`. It creates a custom element, fetches vacancies from the public API, and renders cards inside its shadow root.

**5-minute cache.** The widget JS has `max-age=300`, so hosts see updates within 5 minutes without any action.

**Public API reuse.** Vacancies are already served by `/api/public/vacancies?siteGroup=[slug]` with `s-maxage=300`. The widget simply fetches from this endpoint.

### File Structure

**New files:**
- `app/api/public/widget/[slug]/route.ts` — serves widget JavaScript
- Widget embed section in existing site-groups-section.tsx

**Modified files:**
- `components/recruitment/admin/site-groups-section.tsx` — add embed code display
- `messages/nl.json` — widget keys
- `messages/fr.json` — widget keys

### Anti-Patterns to Avoid

1. **DO NOT** use an iframe — Shadow DOM provides better integration
2. **DO NOT** bundle React in the widget — use vanilla DOM for minimal size
3. **DO NOT** add CORS restrictions — widget must work on any external domain
4. **DO NOT** hardcode the app URL — use request origin to construct API URLs

## References

- Epics: Story 3.7 ACs, FR46
- Architecture: deferred decision "Shadow DOM vs iframe" — choosing Shadow DOM
- UX: VacancyWidget (embeddable web component), Wave 2
