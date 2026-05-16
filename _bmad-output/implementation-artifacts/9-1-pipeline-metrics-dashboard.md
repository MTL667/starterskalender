# Story 9.1: Pipeline Metrics Dashboard

Status: ready-for-dev

> Epic: 9 — Dashboard & Analytics
> Generated: 2026-05-16
> Depends on: recruitment:read permission, Vacancy/Candidate models

## Story

As a manager,
I want to view recruitment pipeline metrics on the Airport dashboard,
So that I have visibility into hiring progress without asking the headhunter.

## Acceptance Criteria

**AC1:** Given I have `recruitment:read` permission,
When I navigate to `/recruitment`,
Then I see summary widgets: total active vacancies, total candidates in pipeline, average time-to-hire (last 6 months), open positions by entity.

**AC2:** Given I am on the dashboard,
When I filter by entity,
Then all metrics update to show only the selected entity's data.

**AC3:** Given I am on the dashboard,
When I view the metrics,
Then data refreshes with each page visit (no stale data) and loads within 3 seconds.

**AC4:** Given I have access to multiple entities,
When I view the global dashboard,
Then I see aggregated metrics across all accessible entities.

## Tasks

- [ ] Task 1: Create metrics API endpoint
- [ ] Task 2: Create DashboardMetrics client component with widget cards
- [ ] Task 3: Integrate into `/recruitment` page with entity filter
- [ ] Task 4: i18n keys

## Dev Notes
- Average time-to-hire: calculated from candidate createdAt to move to "hired" stage (from audit logs)
- Entity filter: reuse existing entity dropdown pattern from vacatures page
