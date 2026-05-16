# Story 7.6: Immutable Audit Log System

Status: ready-for-dev

> Epic: 7 — Compliance & Data Lifecycle
> Generated: 2026-05-16
> Depends on: Existing AuditLog model

## Story

As a DPO,
I want audit logs that cannot be modified or deleted,
So that we can prove GDPR compliance in case of regulatory inquiry.

## Acceptance Criteria

**AC1:** Given any candidate data operation occurs (view, edit, share, delete, export),
When the operation is executed,
Then an immutable audit log entry is created with: action type, actor, target, timestamp, metadata.

**AC2:** Given an audit entry exists,
When any user attempts to modify or delete it,
Then the operation is rejected — audit records are append-only,
And no API endpoint exists for audit mutation.

**AC3:** Given candidate data is deleted,
When the deletion completes,
Then related audit entries persist with anonymized candidate reference.

**AC4:** Given the audit system is operational,
When entries are stored,
Then each entry has a sequential ID and cryptographic hash linking to the previous entry (tamper-evident chain).

## Tasks

- [ ] Task 1: Add integrity hash to AuditLog
  - [ ] 1.1 Add `sequenceNum Int @default(autoincrement())` and `integrityHash String?` to AuditLog model
  - [ ] 1.2 Run db push

- [ ] Task 2: Hash chain in createAuditLog
  - [ ] 2.1 Modify `lib/audit.ts` createAuditLog to: fetch previous entry's hash, compute SHA-256 of (prevHash + action + target + timestamp + meta), store as integrityHash
  - [ ] 2.2 Add sequenceNum auto-increment

- [ ] Task 3: Database-level protection
  - [ ] 3.1 Create a Prisma migration or raw SQL to add a RULE/TRIGGER preventing UPDATE/DELETE on audit_log table
  - [ ] 3.2 Document: "Audit logs protected by DB trigger — only INSERT allowed"

- [ ] Task 4: Verify no mutation endpoints exist
  - [ ] 4.1 Ensure no PATCH/DELETE API routes target audit logs
  - [ ] 4.2 Add explicit 405 handler if needed

- [ ] Task 5: Integrity verification utility
  - [ ] 5.1 Create `lib/audit-integrity.ts` with `verifyAuditChain(fromSeq, toSeq)` function
  - [ ] 5.2 Walk the chain, verify each hash against previous — return boolean + first break point

## Dev Notes

### Existing Infrastructure
- **AuditLog model**: id, actorId, action, target, meta, createdAt
- **createAuditLog()**: `lib/audit.ts` — central creation function

### Key Constraints
- Hash chain provides tamper evidence, not prevention (DB trigger provides prevention)
- Performance: hash computation is cheap; sequential counter doesn't block
- Previous hash fetch adds one DB read per audit write (acceptable)
