# Story 7.7: DPO Audit Reporting

Status: ready-for-dev

> Epic: 7 — Compliance & Data Lifecycle
> Generated: 2026-05-16
> Depends on: Story 7.6 (immutable audit system), existing AuditLog model

## Story

As a DPO,
I want to access audit reports showing all candidate data processing activities,
So that I can fulfill GDPR accountability obligations and respond to regulatory requests.

## Acceptance Criteria

**AC1:** Given I have `recruitment:admin` permission,
When I navigate to the audit reporting interface,
Then I see filters: date range, action type, actor, candidate (anonymized search).

**AC2:** Given I apply filters,
When the report generates,
Then I see a tabular view of matching audit entries with: timestamp, action, actor name, target, and metadata summary,
And the report loads within 5 seconds for up to 1 year of data.

**AC3:** Given I need to export for regulatory purposes,
When I click "Export",
Then a CSV is generated with all matching records,
And the export itself is logged in the audit trail.

**AC4:** Given I want to check a specific candidate's full access history,
When I search by candidate name or anonymized ID,
Then I see a complete chronological timeline: who accessed what, when, and how.

## Tasks

- [ ] Task 1: Audit report API
  - [ ] 1.1 Create `app/api/recruitment/admin/audit-report/route.ts` — GET with query params: dateFrom, dateTo, action, actorId, target
  - [ ] 1.2 Paginated response (limit 100 per page)
  - [ ] 1.3 Require `recruitment:admin` permission

- [ ] Task 2: Audit report UI page
  - [ ] 2.1 Create `app/(authenticated)/recruitment/admin/audit/page.tsx`
  - [ ] 2.2 Filter bar: date range picker, action type dropdown, actor search, target search
  - [ ] 2.3 Table: timestamp, action badge, actor name, target, meta summary
  - [ ] 2.4 Pagination controls

- [ ] Task 3: CSV export
  - [ ] 3.1 Add `?format=csv` support to audit-report API
  - [ ] 3.2 Return CSV with appropriate headers
  - [ ] 3.3 Log "AUDIT_REPORT_EXPORTED" on export

- [ ] Task 4: Candidate timeline view
  - [ ] 4.1 In candidate detail dialog, enhance existing audit trail tab to show complete access history
  - [ ] 4.2 Include: views, shares, evaluations, exports, stage moves — all from audit log

- [ ] Task 5: i18n keys + navigation
  - [ ] 5.1 Add audit report page to admin navigation
  - [ ] 5.2 Add `recruitment.auditReport.*` i18n keys

## Dev Notes

### Existing Infrastructure
- **AuditTrail component**: `components/recruitment/share/audit-trail.tsx` — already shows per-candidate audit
- **AuditLog model**: Indexed on action, actorId, createdAt
- **Admin nav**: Existing navigation structure

### Key Constraints
- Performance: must handle 1+ year of data — use cursor-based pagination
- Export is itself audited (prevents silent data extraction)
- Target field may contain anonymized IDs (from deleted candidates)
