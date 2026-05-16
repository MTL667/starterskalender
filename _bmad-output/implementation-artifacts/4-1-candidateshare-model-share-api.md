# Story 4.1: CandidateShare Model & Share API

> Status: review
> Epic: 4 — Collaboration & Scoped Sharing
> Generated: 2026-05-16

## Story

As a headhunter,
I want a system that supports sharing candidate data with specific users and controlled field visibility,
so that the technical foundation exists for secure, scoped collaboration.

## Acceptance Criteria

**AC1:** Given a developer deploys this story, When the migration runs, Then the Prisma schema includes `CandidateShare` model (id, candidateId, sharedWithUserId, visibleFields: String[], token: String unique, expiresAt: DateTime?, createdAt, createdById, evaluationSubmittedAt?, revokedAt?).

**AC2:** Given I have `candidate:share` permission, When I call `POST /api/recruitment/candidates/[id]/share` with userId, visibleFields[], and optional expiresAt, Then a CandidateShare record is created with a crypto-random non-guessable token, And the response includes the share token and expiration date, And an SSE event `recruitment:share:created` is emitted.

**AC3:** Given I want to view existing shares for a candidate, When I call `GET /api/recruitment/candidates/[id]/share`, Then I receive all active shares with: shared-with user name, visible fields, created date, expiration, and evaluation status.

**AC4:** Given I want to revoke a share, When I call `DELETE /api/recruitment/candidates/[id]/share/[shareId]`, Then the share is soft-deleted (revokedAt set), And the reviewer can no longer access the candidate.

## Tasks / Subtasks

- [ ] Task 1: Prisma schema — add CandidateShare model (AC: 1)
  - [ ] 1.1 Add CandidateShare model with fields: id, candidateId (FK), sharedWithUserId (FK), createdById (FK), visibleFields (String[]), token (String @unique), expiresAt (DateTime?), evaluationSubmittedAt (DateTime?), revokedAt (DateTime?), createdAt
  - [ ] 1.2 Add relations: candidate → Candidate, sharedWith → User, createdBy → User
  - [ ] 1.3 Add indexes: @@index([candidateId]), @@index([sharedWithUserId]), @@index([token])
  - [ ] 1.4 Run `npx prisma generate`

- [ ] Task 2: Extend AuditAction type (AC: 2,4)
  - [ ] 2.1 Add `CANDIDATE_SHARED`, `CANDIDATE_SHARE_REVOKED` to AuditAction union in `lib/audit.ts`

- [ ] Task 3: Create share API routes (AC: 2,3,4)
  - [ ] 3.1 Create `app/api/recruitment/candidates/[id]/share/route.ts` — GET (list shares) + POST (create share)
  - [ ] 3.2 Create `app/api/recruitment/candidates/[id]/share/[shareId]/route.ts` — DELETE (revoke share)
  - [ ] 3.3 POST: validate userId exists, generate `crypto.randomUUID()` token, enforce entity scope
  - [ ] 3.4 POST: create audit log entry with `CANDIDATE_SHARED` action
  - [ ] 3.5 GET: filter out revoked shares (revokedAt IS NULL), include sharedWith user name
  - [ ] 3.6 DELETE: set revokedAt, create audit log with `CANDIDATE_SHARE_REVOKED`

- [ ] Task 4: Create field-mask utility (AC: 2)
  - [ ] 4.1 Create `lib/recruitment/field-mask.ts` with `maskCandidateForViewer(candidate, visibleFields): MaskedCandidate`
  - [ ] 4.2 Define `SHAREABLE_FIELDS` constant listing all candidate fields that can be shared

- [ ] Task 5: SSE event + notification (AC: 2)
  - [ ] 5.1 Add `recruitment:share:created` to pipeline events
  - [ ] 5.2 Create in-app notification for the reviewer on share creation (use existing Notification model)

- [ ] Task 6: i18n keys (AC: 2,4)
  - [ ] 6.1 Add share-related keys to `messages/nl.json` and `messages/fr.json`

## Dev Notes

### Schema Design

```prisma
model CandidateShare {
  id                    String    @id @default(cuid())
  candidateId           String
  candidate             Candidate @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  sharedWithUserId      String
  sharedWith            User      @relation("SharedWithUser", fields: [sharedWithUserId], references: [id])
  createdById           String
  createdBy             User      @relation("ShareCreator", fields: [createdById], references: [id])
  visibleFields         String[]
  token                 String    @unique @default(cuid())
  expiresAt             DateTime?
  evaluationSubmittedAt DateTime?
  revokedAt             DateTime?
  createdAt             DateTime  @default(now())

  @@index([candidateId])
  @@index([sharedWithUserId])
  @@index([token])
}
```

### SHAREABLE_FIELDS constant

```typescript
export const SHAREABLE_FIELDS = {
  personal: ['firstName', 'lastName', 'email', 'phone'],
  professional: ['source', 'niceToHaveScore', 'dealbreakersResult'],
  documents: ['cv', 'motivation'],
  meta: ['appliedAt', 'verifiedAt', 'stage'],
} as const
```

### Existing Patterns

**Permission:** `candidate:share` already registered in `lib/authz-registry.ts` and `lib/recruitment/permissions.ts`.
**Audit:** Use `createAuditLog` from `lib/audit.ts` — same pattern as `CANDIDATE_VIEWED`.
**Notification:** Use `prisma.notification.create` + `eventBus.emit({ type: 'notification:new' })` — same as task notification pattern.
**Entity scope:** Enforce via `visibleEntityIds(user, 'candidate:share')` — candidate's vacancy must be in user's entity scope.

### Anti-Patterns to Avoid

1. **DO NOT** store the full candidate data in the share — only store `visibleFields[]` as field name references
2. **DO NOT** use guessable tokens — use `crypto.randomUUID()`
3. **DO NOT** hard-delete shares — use `revokedAt` for audit trail
4. **DO NOT** skip entity scope check — headhunter must have access to the vacancy's entity

## References

- Epics: Story 4.1 ACs
- Architecture: `lib/recruitment/field-mask.ts` (planned), `CandidateShare` model
- UX: ShareDialog mechanics (Experience Mechanic 1)
- Existing: `lib/audit.ts` (audit pattern), `lib/recruitment/permissions.ts` (candidate:share), Notification model
