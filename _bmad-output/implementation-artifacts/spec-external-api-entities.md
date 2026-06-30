---
title: 'External API: entities and job roles (read-only)'
type: 'feature'
created: '2026-06-30'
status: 'done'
baseline_commit: '58bf517'
context:
  - docs/project-context.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** An external application needs to fetch the list of entities and their job roles from Starterskalender, but no public/external API exists today — all routes require session auth.

**Approach:** Add a lightweight external API (`/api/external/entities`) secured with a static API key (env var `EXTERNAL_API_KEY`). The endpoint returns active entities with their active job roles. Authentication uses `Authorization: Bearer <key>` header matching the env var.

## Boundaries & Constraints

**Always:** Only expose non-sensitive data (entity id/name, job role id/title/description/order). Never expose internal config, user data, or credentials. Return 401 immediately if the key is missing or wrong.

**Ask First:** N/A

**Never:** Do not add user/session management to external APIs. Do not expose inactive entities or job roles. Do not allow writes through this endpoint.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Valid key, entities exist | `Authorization: Bearer <valid>` | 200 — array of entities with nested jobRoles | N/A |
| Valid key, no entities | `Authorization: Bearer <valid>`, 0 active entities | 200 — empty array `[]` | N/A |
| Missing header | No Authorization header | 401 `{ error: "Unauthorized" }` | N/A |
| Wrong key | `Authorization: Bearer wrong` | 401 `{ error: "Unauthorized" }` | N/A |
| Env var not set | `EXTERNAL_API_KEY` undefined/empty | All requests get 401 (API effectively disabled) | N/A |
| Non-GET method | POST/PUT/DELETE | 405 Method Not Allowed | N/A |

</frozen-after-approval>

## Code Map

- `app/api/external/entities/route.ts` -- New endpoint: GET entities + job roles
- `lib/external-auth.ts` -- Shared helper to validate API key from header
- `.env.example` -- Document the new EXTERNAL_API_KEY var
- `messages/nl.json` -- Not needed (no UI)

## Tasks & Acceptance

**Execution:**
- [x] `lib/external-auth.ts` -- Create `validateExternalApiKey(req): boolean` helper that checks `Authorization: Bearer X` against `process.env.EXTERNAL_API_KEY`
- [x] `app/api/external/entities/route.ts` -- Create GET handler: validate key → query active entities with active job roles → return shaped JSON
- [x] `.env.example` -- Add `EXTERNAL_API_KEY=` placeholder with comment

**Acceptance Criteria:**
- Given a valid API key in the Authorization header, when GET `/api/external/entities`, then response contains active entities each with their active job roles (id, title, description, order)
- Given an invalid or missing key, when any request to `/api/external/entities`, then 401 is returned with no data leakage
- Given `EXTERNAL_API_KEY` env var is empty, when any request hits the endpoint, then 401 is returned

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: no new type errors
- `curl -H "Authorization: Bearer test" http://localhost:3000/api/external/entities` -- expected: 200 with entity data (when env var = "test")
- `curl http://localhost:3000/api/external/entities` -- expected: 401
