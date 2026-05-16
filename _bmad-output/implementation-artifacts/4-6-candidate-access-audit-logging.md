# Story 4.6: Candidate Access Audit Logging

> Status: review
> Epic: 4 — Collaboration & Scoped Sharing
> Generated: 2026-05-16
> Depends on: Story 4.1 (CandidateShare model), Story 4.4 (Scoped view)

## Story

As a DPO/admin,
I want every access to candidate data to be logged immutably,
so that we can demonstrate GDPR accountability and trace any data access.

## Acceptance Criteria

**AC1:** Given any user views candidate data (full profile or scoped view), When the data is served, Then an audit log entry is created with: action ("CANDIDATE_VIEWED"), actorId, targetId (candidateId), metadata (fields viewed, access mechanism: "direct" or "share-link"), timestamp.

**AC2:** Given a headhunter shares a candidate, When the share is created, Then an audit entry records: action "CANDIDATE_SHARED", actorId, targetId, metadata (sharedWithId, visibleFields, expiresAt).

**AC3:** Given a reviewer submits an evaluation, When the evaluation is saved, Then an audit entry records: action "CANDIDATE_EVALUATED", actorId, targetId, metadata (scores summary).

**AC4:** Given an admin wants to view audit history for a candidate, When they access the candidate's audit trail, Then they see a chronological list of all access events, And audit records are immutable (append-only, cannot be edited or deleted), And audit records survive candidate data deletion (audit outlives candidate).

## Tasks / Subtasks

- [ ] Task 1: Extend AuditAction type (AC: 1,2,3)
  - [ ] 1.1 Add to `lib/audit.ts` AuditAction type: `CANDIDATE_SHARED`, `CANDIDATE_SHARE_REVOKED`, `CANDIDATE_EVALUATED` (if not already added in Story 4.1)
  - [ ] 1.2 Verify `CANDIDATE_VIEWED` and `CANDIDATE_DOCUMENT_ACCESSED` already exist (added in Story 3.4)

- [ ] Task 2: Audit full-profile views (AC: 1)
  - [ ] 2.1 Verify `GET /api/recruitment/candidates/[id]` logs `CANDIDATE_VIEWED` with `{ mechanism: 'direct', fields: 'all' }`
  - [ ] 2.2 If not present, add audit call

- [ ] Task 3: Audit share-link views (AC: 1)
  - [ ] 3.1 Verify `GET /api/recruitment/shared/[token]` logs `CANDIDATE_VIEWED` with `{ mechanism: 'share-link', shareId, fields: visibleFields }`
  - [ ] 3.2 If not present, add audit call (Story 4.4 Task 5 should handle this)

- [ ] Task 4: Audit share creation (AC: 2)
  - [ ] 4.1 Verify `POST /api/recruitment/candidates/[id]/share` logs `CANDIDATE_SHARED` with `{ sharedWithId, visibleFields, expiresAt }`
  - [ ] 4.2 If not present, add audit call (Story 4.1 Task 3.4 should handle this)

- [ ] Task 5: Audit share revocation (AC: 2)
  - [ ] 5.1 Verify `DELETE /api/recruitment/candidates/[id]/share/[shareId]` logs `CANDIDATE_SHARE_REVOKED`
  - [ ] 5.2 If not present, add audit call

- [ ] Task 6: Audit trail UI in candidate detail (AC: 4)
  - [ ] 6.1 Add "History" tab or extend existing timeline in `candidate-detail-dialog.tsx`
  - [ ] 6.2 Create `components/recruitment/candidate/audit-trail.tsx`
  - [ ] 6.3 Fetch audit logs: `GET /api/recruitment/candidates/[id]/audit`
  - [ ] 6.4 Display chronological list: timestamp, actor name, action description, metadata summary
  - [ ] 6.5 Show field-level detail: "Mark viewed: CV, Skills via share link"

- [ ] Task 7: Audit trail API (AC: 4)
  - [ ] 7.1 Create `app/api/recruitment/candidates/[id]/audit/route.ts` — GET
  - [ ] 7.2 Query `AuditLog` where target = candidateId AND action starts with `CANDIDATE_`
  - [ ] 7.3 Include actor name (join with User), ordered by createdAt DESC
  - [ ] 7.4 Require `recruitment:admin` or `candidate:read` permission

- [ ] Task 8: Audit immutability (AC: 4)
  - [ ] 8.1 Verify AuditLog table has no UPDATE/DELETE API endpoints
  - [ ] 8.2 AuditLog records use candidateId as string target — survive candidate deletion
  - [ ] 8.3 Document in dev notes: audit records are intentionally NOT cascaded on candidate delete

- [ ] Task 9: i18n keys (AC: 4)
  - [ ] 9.1 Add audit trail display keys to `messages/nl.json` and `messages/fr.json`

## Dev Notes

### Audit Action Descriptions (for UI)

| Action | i18n key | Display text (NL) | Display text (FR) |
|--------|----------|-------------------|-------------------|
| CANDIDATE_VIEWED | audit.candidateViewed | Kandidaat bekeken | Candidat consulté |
| CANDIDATE_SHARED | audit.candidateShared | Kandidaat gedeeld met {name} | Candidat partagé avec {name} |
| CANDIDATE_SHARE_REVOKED | audit.shareRevoked | Toegang ingetrokken voor {name} | Accès révoqué pour {name} |
| CANDIDATE_EVALUATED | audit.candidateEvaluated | Evaluatie ingediend door {name} | Évaluation soumise par {name} |
| CANDIDATE_DOCUMENT_ACCESSED | audit.documentAccessed | Document geopend: {fileName} | Document ouvert: {fileName} |
| CANDIDATE_STAGE_MOVE | audit.stageMove | Verplaatst van {from} naar {to} | Déplacé de {from} vers {to} |

### Audit Record Structure

```typescript
{
  id: string,
  actorId: string,
  action: 'CANDIDATE_VIEWED' | 'CANDIDATE_SHARED' | ...,
  target: candidateId, // string, survives candidate deletion
  meta: {
    mechanism?: 'direct' | 'share-link',
    shareId?: string,
    fields?: string[] | 'all',
    sharedWithId?: string,
    visibleFields?: string[],
    expiresAt?: string,
  },
  createdAt: string,
}
```

### Integration Points

Most audit logging should already be in place from Stories 4.1 and 4.4. This story focuses on:
1. **Verification** — confirming all actions are properly logged
2. **Gap filling** — adding any missing audit calls
3. **Audit trail UI** — the new visible component for viewing audit history
4. **Candidate detail integration** — the History/Audit tab

### Immutability Design

The `AuditLog` model has no UPDATE or DELETE Prisma operations exposed. The `target` field stores a string (candidateId), not a foreign key with cascade delete. When a candidate is deleted, their audit records persist in the log with the original candidateId as an orphaned reference — this is intentional for GDPR accountability.

### Existing Patterns

- **Timeline:** Story 3.4 already displays stage move history from AuditLog in the candidate detail dialog. Extend or reuse this pattern.
- **Audit creation:** `createAuditLog()` from `lib/audit.ts`
- **Tab addition:** Add "History" tab in `candidate-detail-dialog.tsx` alongside existing tabs

### Anti-Patterns to Avoid

1. **DO NOT** create UPDATE or DELETE endpoints for AuditLog — immutable by design
2. **DO NOT** use foreign key cascade on AuditLog.target → Candidate — audit must survive deletion
3. **DO NOT** skip logging for any candidate data access — 100% coverage required for GDPR
4. **DO NOT** log PII in audit meta — log field names viewed, not field values
5. **DO NOT** make this a separate admin page — integrate into existing candidate detail view

## References

- Epics: Story 4.6 ACs
- UX: "Invisible complexity — RBAC, field masking, audit logging all happen silently"
- Architecture: `lib/audit.ts`, AuditLog model, immutability constraints
- Depends: Story 4.1 (share creation audit), Story 4.4 (view audit), Story 3.4 (existing timeline)
