# Story 9.2: Funnel Visualization

Status: ready-for-dev

> Epic: 9 — Dashboard & Analytics
> Generated: 2026-05-16
> Depends on: VacancyStage, Candidate models

## Story

As a manager,
I want to see a funnel visualization per vacancy,
So that I can identify where candidates drop off in the process.

## Acceptance Criteria

**AC1:** Given I navigate to a vacancy's analytics view,
When the funnel loads,
Then I see each pipeline stage as a horizontal bar, width proportional to candidate count.

**AC2:** Given the funnel is displayed,
When I hover over a stage bar,
Then I see: stage name, current count, drop-off %, average days in stage.

**AC3:** Given a vacancy has historical data,
When I toggle "Include closed candidates",
Then the funnel shows complete data including rejected/withdrawn.

## Tasks

- [ ] Task 1: Create funnel API endpoint per vacancy
- [ ] Task 2: Create FunnelChart client component
- [ ] Task 3: Integrate into vacancy detail page as a tab or section
- [ ] Task 4: i18n keys

## Dev Notes
- Pure CSS bars (no chart library needed)
- Drop-off = (previous stage count - current count) / previous count * 100
