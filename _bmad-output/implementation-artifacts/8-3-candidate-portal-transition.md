# Story 8.3: Candidate Portal Transition

Status: ready-for-dev

> Epic: 8 — Hire-to-Onboarding Bridge
> Generated: 2026-05-16
> Depends on: Story 8.2, public candidate portal, Starter record

## Story

As a hired candidate,
I want my application portal to transition into pre-onboarding,
So that I have a seamless experience from application to first day preparation.

## Acceptance Criteria

**AC1:** Given I was a candidate and have been hired,
When I access my existing candidate portal link,
Then the portal shows "Welcome! Your onboarding starts [date]" with a timeline.

**AC2:** Given I am on the transitioned portal,
When I view available actions,
Then I see my start date, entity, and function.

**AC3:** Given the pre-onboarding period is active,
When I access the portal,
Then the same token-based URL works (no new login required).

## Tasks

- [ ] Task 1: Update public candidate status page to detect hired status
- [ ] Task 2: Show pre-onboarding content when hired (start date, entity, timeline)
- [ ] Task 3: i18n keys for portal transition

## Dev Notes
- Reuse existing token-based access pattern
- Detect via candidate.starterId != null or stage name check
