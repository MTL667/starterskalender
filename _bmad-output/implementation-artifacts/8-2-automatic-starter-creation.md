# Story 8.2: Automatic Starter Creation

Status: ready-for-dev

> Epic: 8 — Hire-to-Onboarding Bridge
> Generated: 2026-05-16
> Depends on: Story 8.1, Starter model, pipeline-engine

## Story

As a headhunter,
I want the system to automatically create a Starter record when I hire a candidate,
So that onboarding begins immediately without re-entering data.

## Acceptance Criteria

**AC1:** Given the hire is confirmed,
When the system processes the hire,
Then a new Starter record is created with candidate data,
And the creation is atomic (both Starter + move succeed or both roll back).

**AC2:** Given the Starter is created successfully,
When the headhunter sees the confirmation,
Then a success toast shows with link to the new Starter.

**AC3:** Given the Starter creation fails,
When the error is caught,
Then the candidate does NOT move to "Hired" (atomic rollback).

**AC4:** Given the Starter is created,
When I view the candidate's profile,
Then a banner shows with link to the Starter record.

## Tasks

- [ ] Task 1: Add starterId to Candidate model (done in schema)
- [ ] Task 2: Create hire API endpoint that atomically creates Starter + moves candidate
- [ ] Task 3: Show starter link in candidate detail dialog
- [ ] Task 4: Return starterId in hire API response for toast link

## Dev Notes
- Atomic: use Prisma $transaction
- Starter fields: firstName, lastName, phone from candidate; entity, roleTitle, startDate from hire dialog
