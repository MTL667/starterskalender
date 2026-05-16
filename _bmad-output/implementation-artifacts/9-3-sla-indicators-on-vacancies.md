# Story 9.3: SLA Indicators on Vacancies

Status: ready-for-dev

> Epic: 9 — Dashboard & Analytics
> Generated: 2026-05-16
> Depends on: Entity model (SLA config), Candidate.updatedAt

## Story

As a headhunter or manager,
I want to see SLA indicators on vacancies,
So that I can take action on stalled candidates.

## Acceptance Criteria

**AC1:** Given SLA thresholds are configured,
When a candidate exceeds the warning threshold,
Then the vacancy list shows an amber SLA badge.

**AC2:** Given a candidate exceeds the exceeded threshold,
When the vacancy list renders,
Then a red SLA badge is shown.

**AC3:** Given SLA violations exist on the dashboard,
Then a "Needs attention" section highlights affected vacancies.

**AC4:** Given I want to configure thresholds,
When I navigate to settings,
Then I can set warning/exceeded thresholds in days.

## Tasks

- [ ] Task 1: Add SLA config fields to Entity model
- [ ] Task 2: SLA settings UI in admin settings
- [ ] Task 3: Compute SLA status in vacancy list API
- [ ] Task 4: SLA badge component on vacancy cards
- [ ] Task 5: "Needs attention" section on dashboard
- [ ] Task 6: i18n keys

## Dev Notes
- SLA = days since candidate.updatedAt (last stage move)
- Warning: amber, Exceeded: red
- Config is entity-scoped
