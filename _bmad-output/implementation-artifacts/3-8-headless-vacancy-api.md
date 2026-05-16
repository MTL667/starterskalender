# Story 3.8: Headless Vacancy API (Phase 2)

> Status: done
> Epic: 3 — Public Presence & Candidate Application
> Generated: 2026-05-16

## Story

As an external developer,
I want a JSON API for vacancies per site group,
so that I can build custom vacancy displays on external platforms.

## Acceptance Criteria

**AC1:** Pagination support on GET /api/public/vacancies — includes total, page, limit in response.
**AC2:** Detail endpoint returns full content + apply URL (already exists).
**AC3:** Rate limiting (100/min/IP), only published vacancies (already exists).

## Tasks / Subtasks

- [x] Task 1: Add pagination to public vacancies list (AC: 1)
- [x] Task 2: Return entity as structured object in list response (AC: 1)

## Dev Agent Record

### Completion Notes

- Added `page` and `limit` query params to `/api/public/vacancies`
- Response now includes `{ data, total, page, limit }` pagination metadata
- Entity returned as `{ name, colorHex }` object (renamed from flat fields)
- Detail endpoint already satisfies AC2 (has `content` + `applyUrl`)
- Rate limiting (100/min/IP) + published-only filter already in place from Story 3.1
