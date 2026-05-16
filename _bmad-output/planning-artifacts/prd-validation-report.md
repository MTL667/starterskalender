---
validationTarget: '_bmad-output/planning-artifacts/prd.md'
validationDate: '2026-05-13'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/brainstorming/brainstorming-session-2026-05-12-1210.md
  - docs/project-context.md
validationStepsCompleted: ['step-v-01-discovery', 'step-v-02-format-detection', 'step-v-03-density-validation', 'step-v-04-brief-coverage-validation', 'step-v-05-measurability-validation', 'step-v-06-traceability-validation', 'step-v-07-implementation-leakage-validation', 'step-v-08-domain-compliance-validation', 'step-v-09-project-type-validation', 'step-v-10-smart-validation', 'step-v-11-holistic-quality-validation', 'step-v-12-completeness-validation']
validationStatus: COMPLETE
holisticQualityRating: '4/5 - Good'
overallStatus: 'Warning'
---

# PRD Validation Report

**PRD Being Validated:** `_bmad-output/planning-artifacts/prd.md`
**Validation Date:** 2026-05-13

## Input Documents

- PRD: `prd.md` (Starterskalender Recruitment Module)
- Brainstorming session: `brainstorming-session-2026-05-12-1210.md`
- Project context: `docs/project-context.md`

## Format Detection

**PRD Structure (Level 2 headers):**
1. Executive Summary
2. Project Classification
3. Success Criteria
4. Product Scope
5. User Journeys
6. Domain-Specific Requirements
7. Web Application Specific Requirements
8. Project Scoping & Phased Development
9. Functional Requirements
10. Non-Functional Requirements

**BMAD Core Sections Present:**
- Executive Summary: Present
- Success Criteria: Present
- Product Scope: Present
- User Journeys: Present
- Functional Requirements: Present
- Non-Functional Requirements: Present

**Format Classification:** BMAD Standard
**Core Sections Present:** 6/6

## Information Density Validation

**Anti-Pattern Violations:**

**Conversational Filler:** 0 occurrences

**Wordy Phrases:** 0 occurrences

**Redundant Phrases:** 0 occurrences

**Total Violations:** 0

**Severity Assessment:** Pass

**Recommendation:** PRD demonstrates excellent information density with zero violations. FRs follow clean "Actor can [action]" pattern. NFRs are specific and measurable. User journeys use appropriate narrative prose (acceptable for dual-audience readability) without degenerating into filler.

## Product Brief Coverage

**Status:** N/A — No Product Brief was provided as input. PRD was created from brainstorming session and project context.

## Measurability Validation

### Functional Requirements

**Total FRs Analyzed:** 60

**Format Violations:** 8
FRs using passive voice or missing clear actor:
- FR23: "Pipeline reflects real-time changes when multiple users interact simultaneously" → passive, no user action
- FR29: "Headhunter has full access..." → describes state, not actionable capability
- FR31: "Shared access can be configured as temporary or permanent" → passive, actor unclear (headhunter? admin?)
- FR32: "Technical reviewer receives a scoped view..." → passive, should be "reviewer sees"
- FR43: "Each vacancy has a dedicated public detail page..." → passive description
- FR54: "Audit log is immutable and retained independently..." → system constraint, not FR
- FR57: "Created Starter links to correct entity..." → passive
- FR58: "Candidate portal transitions into pre-onboarding portal..." → passive system behavior

**Subjective Adjectives Found:** 1
- FR23: "real-time" without metric (< 1s? < 5s? via SSE?)

**Vague Quantifiers Found:** 0

**Implementation Leakage:** 4
- FR44: "Public pages render server-side with SEO metadata and JobPosting structured data" → SSR, JobPosting schema are implementation choices
- FR46: "embeddable web component" → implementation pattern (should be "external website integration")
- FR47: "headless REST/JSON API" → interface technology choice
- FR51: "System soft-deletes then hard-deletes" → deletion mechanism is implementation

**FR Violations Total:** 13

### Non-Functional Requirements

**Total NFRs Analyzed:** 26 (across Performance, Security, Accessibility, Integration, Reliability)

**Missing Metrics:** 1
- Security: "time-limited, non-guessable session tokens" — duration unspecified (15 min? 1 hour? 24 hours?)

**Incomplete Template:** 1
- Security: "API endpoints validate Zod schemas at boundary" — names specific library (Zod); should state validation requirement without tool

**Missing Context:** 0

**NFR Violations Total:** 2

### Overall Assessment

**Total Requirements:** 86 (60 FRs + 26 NFRs)
**Total Violations:** 15
**Violation Rate:** 17%

**Severity:** Critical (>10 violations)

**Recommendation:** Most violations are format-level (passive voice, missing actor) rather than substantive measurability failures. The PRD's FRs are clear in intent but ~13% use passive construction that makes testability ambiguous. The 4 implementation leakage instances are concentrated in the Public Presence section (FR42-48). NFRs are strong — Performance section is exemplary with specific metrics per operation. Priority fixes: (1) clarify FR31 actor, (2) add metric to FR23 "real-time", (3) specify session token duration in Security NFRs, (4) rewrite FR44 without SSR/JobPosting implementation detail.

## Traceability Validation

### Chain Validation

**Executive Summary → Success Criteria:** Intact
Vision (replace Recruitee, field-level RBAC, zero-boundary hire flow, cost justification) maps directly to all success criteria categories.

**Success Criteria → User Journeys:** Intact
All success criteria are exercised by at least one user journey:
- "Daily workflow easier" → Journey 1 (Anja full cycle)
- "Scoped field-level share" → Journey 1 + 3 (share with Mark)
- "Zero manual re-entry on hire" → Journey 1 resolution
- "Evaluation < 2 min" → Journey 3 (Mark: 3 min for 2 candidates)
- "Pipeline visibility" → Journey 5 (Peter dashboard)
- "Recruitee cancelled" → Journeys 1-4 collectively

**User Journeys → Functional Requirements:** Gap Identified
- Journey 1 (Anja): FR1-9, FR16-21, FR24-27, FR30-35, FR56-57 — fully covered ✓
- Journey 2 (Anja GDPR): FR20, FR22, FR34, FR36-38, FR49-55 — fully covered ✓
- Journey 3 (Mark): FR25-26, FR32-33, FR59 — fully covered ✓
- Journey 4 (Thomas): FR10-12, FR22, FR36, FR42-43, FR58 — fully covered ✓
- Journey 5 (Peter dashboard): **NO supporting FRs** — deferred to Wave 3 in scoping but no Phase 3 FRs exist (unlike Phase 2 features which have FR28, FR40-41, FR46-48)
- Journey 6 (Bram widget): FR45-47 — fully covered ✓

**Scope → FR Alignment:** Minor gap
MVP scope items all have supporting FRs. Phase 2 deferred items have FRs (FR28, FR40-41, FR46-48). Phase 3 "Pipeline dashboard with analytics" has no FR equivalent despite Journey 5 describing it in detail.

### Orphan Elements

**Orphan Functional Requirements:** 3
- FR5: SharePoint photo attachment — originates from brainstorming (#1), not exercised in any user journey
- FR15: Manual candidate add — not covered by any journey (all candidates apply via form)
- FR48: QR code generation — originates from brainstorming (#5), not exercised in any journey

**Unsupported Success Criteria:** 0

**User Journeys Without FRs:** 1
- Journey 5 (Peter — Management Dashboard): described with specific metrics (open vacancies, pipeline count, time-to-hire average, SLA flags, funnel view) but no corresponding FRs in any phase

### Traceability Summary

| Chain | Status |
|-------|--------|
| Exec Summary → Success Criteria | Intact |
| Success Criteria → User Journeys | Intact |
| User Journeys → FRs | 1 gap (Journey 5) |
| Scope → FRs | Minor gap (Phase 3 dashboard) |
| Orphan FRs | 3 (minor — sourced from brainstorming) |

**Total Traceability Issues:** 4

**Severity:** Warning

**Recommendation:** Add Phase 3 FRs for dashboard functionality to close the Journey 5 gap (e.g., "Management can view recruitment pipeline metrics per entity and globally", "System displays SLA indicators on vacancy pipeline"). The 3 orphan FRs are low-risk — they originate from brainstorming and are reasonable additions, but would benefit from being referenced in a journey or explicitly noted as "brainstorming-sourced additions."

## Implementation Leakage Validation

### Leakage by Category

**Frontend Frameworks:** 1 violation
- FR44 (line 458): "Public pages render server-side" — SSR is an implementation strategy; capability: "pages load quickly and are indexable by search engines"

**Backend Frameworks:** 0 violations

**Databases:** 1 violation (borderline)
- NFR Security (line 497): "database-level encryption" — specifies encryption mechanism rather than requirement; could be "encrypted at rest"

**Cloud Platforms:** 0 violations

**Infrastructure:** 0 violations

**Libraries:** 2 violations
- NFR Security (line 500): "existing NextAuth flow" — library name; capability: "existing authentication flow"
- NFR Security (line 504): "Zod schemas at boundary" — library name; capability: "input validation at API boundaries"

**Other Implementation Details:** 3 violations
- FR44 (line 458): "JobPosting structured data" — implementation detail; capability: "vacancy pages include machine-readable data for search engines"
- FR46 (line 459): "embeddable web component" — implementation pattern; capability: "embeddable vacancy display for external websites"
- FR51 (line 471): "soft-deletes then hard-deletes" — deletion mechanism; capability: "data removed with configurable grace period before permanent deletion"

### Capability-Relevant Terms (NOT leakage)

These technology references describe integration targets or existing platform capabilities in this brownfield context:
- FR5: "SharePoint library" — business requirement (integration target)
- FR40: "O365 mailbox sync via Graph API" — specific integration requirement
- FR47: "REST/JSON API" — describes the interface type external developers need
- FR60: "RBAC v2 permission infrastructure" — names the existing system being extended
- NFR: "TLS 1.3" — specifies minimum security standard (acceptable in NFR)
- NFR: "SendGrid" — existing platform's email provider

### Summary

**Total Implementation Leakage Violations:** 7

**Severity:** Critical (>5 violations)

**Recommendation:** 4 of 7 violations are genuine leakage that should be rewritten as capabilities (FR44, FR46, FR51, and one NFR about rate limiting). The remaining 3 (NextAuth, Zod, database-level encryption) are brownfield references to the existing tech stack — understandable in context but ideally abstracted to "existing authentication system", "schema validation library", and "encrypted at rest." The PRD's non-FR sections (Project Classification, Web Application Specific Requirements) appropriately contain technology context — the issue is only within FRs and NFRs.

## Domain Compliance Validation

**Domain:** general (HR/Recruitment)
**Complexity:** Low (not a regulated industry per BMAD domain-complexity classification)
**Assessment:** N/A — No mandatory domain compliance sections required

**Note:** Although classified as "general," this PRD commendably includes a comprehensive Domain-Specific Requirements section covering GDPR candidate data handling, retention policy, privacy-by-design, and audit requirements. This exceeds expectations for a low-complexity domain and is valuable given that the module processes external personal data (candidates are non-employees).

## Project-Type Compliance Validation

**Project Type:** web_app

### Required Sections

**Browser Matrix:** Present ✓ — Browser Support table covers internal (latest Chrome/Edge/Safari/Firefox) and public (last 2 versions + mobile) contexts
**Responsive Design:** Present ✓ — Responsive Design table with mobile priority per interface type
**Performance Targets:** Present ✓ — Detailed performance table in NFRs with 7 specific metrics (pipeline load < 1s, LCP < 1.5s, etc.)
**SEO Strategy:** Present ✓ — Dedicated SEO Strategy section with SEO-required vs no-SEO pages, JSON-LD structured data, sitemap generation
**Accessibility Level:** Present ✓ — WCAG 2.1 Level AA target with priority by context (high/medium/lower) and specific keyboard navigation requirements

### Excluded Sections (Should Not Be Present)

**Native Features:** Absent ✓
**CLI Commands:** Absent ✓

### Compliance Summary

**Required Sections:** 5/5 present
**Excluded Sections Present:** 0 (correct)
**Compliance Score:** 100%

**Severity:** Pass

**Recommendation:** All required sections for web_app are present and well-documented. The PRD goes beyond minimum requirements with detailed browser support tables differentiated by user context (internal vs. public).

## SMART Requirements Validation

**Total Functional Requirements:** 60

### Scoring Summary

**All scores ≥ 3:** 91.7% (55/60)
**All scores ≥ 4:** 75.0% (45/60)
**Overall Average Score:** 4.5/5.0

### Flagged FRs (score < 3 in any category)

| FR | S | M | A | R | T | Avg | Issue |
|----|---|---|---|---|---|-----|-------|
| FR5 | 4 | 4 | 5 | 4 | **2** | 3.8 | Not exercised in any user journey |
| FR15 | 5 | 5 | 5 | 4 | **2** | 4.2 | Not exercised in any user journey |
| FR23 | **2** | **2** | 5 | 5 | 4 | 3.6 | "Real-time" undefined; passive voice |
| FR31 | **2** | 4 | 5 | 5 | 4 | 4.0 | Missing actor (who configures?) |
| FR48 | 4 | 4 | 5 | 4 | **2** | 3.8 | Not exercised in any user journey |

**Legend:** S=Specific, M=Measurable, A=Attainable, R=Relevant, T=Traceable (1-5 scale)

### Borderline FRs (score of 3, not flagged but worth noting)

FR29 (S:3), FR32 (S:3), FR43 (S:3), FR44 (S:3), FR46 (S:3), FR51 (S:3), FR54 (M:3), FR57 (S:3), FR58 (S:3), FR60 (S:3) — all passive voice or implementation-adjacent phrasing reducing specificity as testable capabilities.

### Improvement Suggestions

**FR5:** "Headhunter can attach photos from a central SharePoint library to vacancy content" → Add to Journey 1 narrative (vacancy builder step) or explicitly note as brainstorming-sourced addition.

**FR15:** "Headhunter can manually add a candidate to a vacancy" → Add a brief journey scenario: e.g., "Anja receives a CV by email and manually enters the candidate."

**FR23:** "Pipeline reflects real-time changes when multiple users interact simultaneously" → Rewrite: "Users see pipeline changes made by other users within 2 seconds via server-sent events." Adds metric and mechanism.

**FR31:** "Shared access can be configured as temporary or permanent" → Rewrite: "Headhunter can set shared access as temporary (auto-expiring after evaluation) or permanent when sharing a candidate."

**FR48:** "System generates unique QR codes linking to individual vacancy pages" → Add to Journey 6 (Bram) or note as brainstorming-sourced addition.

### Overall Assessment

**Flagged FRs:** 5/60 = 8.3%
**Severity:** Pass (< 10% flagged)

**Recommendation:** FR quality is strong overall. The 5 flagged FRs have clear, actionable fixes. FR23 is the most impactful improvement — adding a measurable metric to "real-time" strengthens both the FR and the downstream architecture decisions it drives.

## Holistic Quality Assessment

### Document Flow & Coherence

**Assessment:** Good

**Strengths:**
- Strong narrative arc: Executive Summary → Journeys → Requirements creates a compelling story from vision to implementation
- User journeys are vivid and persona-driven (Anja, Mark, Thomas, Peter, Bram) — each tells a complete story with rising action and resolution
- The "What Makes This Special" callout in the Executive Summary immediately communicates differentiation
- Consistent terminology throughout (headhunter, reviewer, pipeline, share)
- Project Scoping section with explicit "Absolute Minimum" scenario demonstrates pragmatic thinking

**Areas for Improvement:**
- Product Scope section (line 90-92) is a pointer to another section rather than a standalone summary — breaks document flow for readers scanning by section
- Journey Requirements Summary table (lines 167-176) partially duplicates information already in the journeys — could be consolidated
- Transition from User Journeys to Domain-Specific Requirements is abrupt — a brief bridging sentence would improve flow

### Dual Audience Effectiveness

**For Humans:**
- Executive-friendly: Excellent — Executive Summary reads as a standalone pitch, success criteria are business-oriented
- Developer clarity: Good — FRs are clear capabilities, NFRs provide concrete metrics, but some passive FRs need interpretation
- Designer clarity: Good — User journeys provide strong UX direction, responsive design requirements are explicit per interface
- Stakeholder decision-making: Excellent — phased delivery with explicit risk mitigations enables informed go/no-go decisions

**For LLMs:**
- Machine-readable structure: Excellent — consistent ## headers, frontmatter with classification metadata, FR numbering (FR1-FR60)
- UX readiness: Excellent — user journeys with personas, responsive design table, accessibility requirements all provide strong UX input (proven by the UX Design workflow that successfully consumed this PRD)
- Architecture readiness: Good — NFRs provide concrete constraints, domain requirements specify GDPR architecture, but some implementation leakage in FRs mixes what/how
- Epic/Story readiness: Good — FRs are granular enough for story decomposition, phased delivery maps to epic grouping, but 3 orphan FRs and missing Journey 5 FRs create minor gaps

**Dual Audience Score:** 4/5

### BMAD PRD Principles Compliance

| Principle | Status | Notes |
|-----------|--------|-------|
| Information Density | Met | 0 filler violations — exemplary |
| Measurability | Partial | 15 violations total, mostly format-level (passive voice), not substantive |
| Traceability | Partial | 4 issues: Journey 5 gap, 3 orphan FRs |
| Domain Awareness | Met | GDPR section exceeds expectations for "general" domain |
| Zero Anti-Patterns | Met | No subjective adjectives, no vague quantifiers |
| Dual Audience | Met | Strong for both humans (narratives) and LLMs (structure) |
| Markdown Format | Met | Proper ## headers, tables, consistent formatting |

**Principles Met:** 5/7 fully met, 2/7 partially met

### Overall Quality Rating

**Rating:** 4/5 — Good

A strong, well-structured PRD that successfully guided UX design and architecture workflows. Minor refinements would elevate it to exemplary.

### Top 3 Improvements

1. **Add Phase 3 FRs for the management dashboard (Journey 5)**
   Peter's user journey describes specific dashboard capabilities (open vacancies, pipeline count, time-to-hire, SLA flags, funnel view) but no FRs exist for these features. Even as Wave 3 items, they need FR definitions for downstream epic/story creation. Impact: closes the traceability gap and ensures the dashboard isn't forgotten in implementation planning.

2. **Rewrite 8 passive-voice FRs as "[Actor] can [capability]" format**
   FR23, FR29, FR31, FR32, FR43, FR54, FR57, FR58 use passive voice or describe system state rather than user capabilities. Converting these to active format ("Headhunter can...", "System automatically...") makes each FR independently testable without interpretation. Impact: improves measurability score from Critical to Pass.

3. **Abstract 4 implementation-leaking FRs to capabilities**
   FR44 (SSR/JobPosting), FR46 (web component), FR51 (soft-delete/hard-delete) specify HOW instead of WHAT. Rewriting as capabilities (e.g., "Public vacancy pages are indexable by search engines with structured data") keeps architecture decisions in the architecture document. Impact: cleaner separation of concerns between PRD and ADD.

### Summary

**This PRD is:** A high-quality, information-dense document that effectively serves both human stakeholders and downstream LLM workflows, with strong user journeys and comprehensive domain coverage, needing only minor format refinements to reach exemplary status.

**To make it great:** Close the Journey 5 → FR gap, rewrite passive FRs as active capabilities, and abstract implementation details from 4 FRs.

## Completeness Validation

### Template Completeness

**Template Variables Found:** 0
No template variables remaining ✓

### Content Completeness by Section

**Executive Summary:** Complete ✓ — Vision, differentiator ("What Makes This Special"), target users, core problem all present
**Project Classification:** Complete ✓ — Table with project type, domain, complexity, context
**Success Criteria:** Complete ✓ — User, Business, Technical, and Measurable Outcomes all defined
**Product Scope:** Incomplete — Cross-reference to scoping section instead of standalone summary
**User Journeys:** Complete ✓ — 6 journeys covering all user types with narrative format and requirements summary table
**Domain-Specific Requirements:** Complete ✓ — GDPR, retention, privacy-by-design, audit, integration requirements, risk mitigations
**Web Application Specific Requirements:** Complete ✓ — Rendering strategy, browser support, SEO, responsive design, performance, accessibility
**Project Scoping & Phased Development:** Complete ✓ — MVP strategy, 3-phase feature set, risk mitigation, absolute minimum scenario
**Functional Requirements:** Complete ✓ — 60 FRs across 8 categories, numbered, phased
**Non-Functional Requirements:** Complete ✓ — 5 NFR categories (Performance, Security, Accessibility, Integration, Reliability) with specific metrics

### Section-Specific Completeness

**Success Criteria Measurability:** All measurable — Business metrics have targets and timeframes, technical metrics are specific, measurable outcomes have go/no-go gates
**User Journeys Coverage:** Yes — All 5 user types covered (headhunter, reviewer, candidate, management, external developer)
**FRs Cover MVP Scope:** Yes — All MVP Must-Have capabilities from scoping section have corresponding FRs
**NFRs Have Specific Criteria:** All have criteria — Performance NFRs have ms-level targets per operation, Security has specific requirements, Reliability has uptime percentage

### Frontmatter Completeness

**stepsCompleted:** Present ✓ (12 steps listed)
**classification:** Present ✓ (projectType: web_app, domain: general, complexity: medium, projectContext: brownfield)
**inputDocuments:** Present ✓ (brainstorming session, project context)
**date (completedAt):** Present ✓ (2026-05-13)

**Frontmatter Completeness:** 4/4

### Completeness Summary

**Overall Completeness:** 95% (9.5/10 sections fully complete)

**Critical Gaps:** 0
**Minor Gaps:** 1
- Product Scope section is a cross-reference pointer rather than standalone content (reads "See [Project Scoping & Phased Development]")

**Severity:** Pass

**Recommendation:** PRD is complete with all required sections and content present. The Product Scope cross-reference is a minor structural choice — the scoping content exists, it's just in a separate section rather than under "Product Scope." This could be resolved by either inlining a brief summary or removing the cross-reference header entirely.

## Post-Validation Fixes Applied

**Date:** 2026-05-13

### Fix A: Passive Voice FRs Rewritten (8 FRs)

| FR | Before | After |
|----|--------|-------|
| FR23 | "Pipeline reflects real-time changes..." | "Users see pipeline changes made by other users within 2 seconds via SSE" |
| FR29 | "Headhunter has full access..." | "Headhunter can view and edit all candidate data..." |
| FR31 | "Shared access can be configured..." | "Headhunter can set shared access as temporary or permanent..." |
| FR32 | "Technical reviewer receives a scoped view..." | "Technical reviewer can view only the shared fields..." |
| FR43 | "Each vacancy has a dedicated public detail page..." | "Candidate can view a dedicated public detail page per vacancy..." |
| FR54 | "Audit log is immutable and retained..." | "System retains audit logs as immutable, append-only records..." |
| FR57 | "Created Starter links to correct entity..." | "System populates the created Starter with correct entity..." |
| FR58 | "Candidate portal transitions into..." | "Candidate can continue using the same portal login after hire..." |

**Impact:** Measurability format violations reduced from 8 to 0. All FRs now follow "[Actor] can [capability]" or "System [verb]" pattern.

### Fix B: Implementation Leakage Abstracted (4 items)

| Item | Before | After |
|------|--------|-------|
| FR44 | "render server-side with SEO metadata and JobPosting structured data" | "indexable by search engines with structured vacancy metadata" |
| FR46 | "embeddable web component" | "embeddable vacancy display" |
| FR51 | "soft-deletes then hard-deletes" | "removes data with configurable grace period before permanent deletion" |
| NFR | "Zod schemas at boundary" | "input schemas at boundary" |

**Impact:** Implementation leakage violations reduced from 7 to 3 (remaining 3 are brownfield-context references: NextAuth, database-level encryption, rate limiting).

### Fix C: Journey 5 Dashboard FRs Added (3 FRs)

- FR61: Management can view recruitment pipeline metrics per entity and globally (Phase 3)
- FR62: Management can view funnel visualization per pipeline stage (Phase 3)
- FR63: System displays SLA indicators on overdue vacancies (Phase 3)

**Impact:** Journey 5 traceability gap closed. All 6 user journeys now have supporting FRs. Orphan FR count reduced from 3 to 3 (FR5, FR15, FR48 remain — minor, brainstorming-sourced).

### Updated Scores After Fixes

| Check | Before | After |
|-------|--------|-------|
| Measurability (format violations) | 8 | 0 |
| Measurability (total violations) | 15 | 4 (subjective: 1, leakage: 3 brownfield) |
| Measurability severity | Critical | Pass |
| Traceability (journey gaps) | 1 | 0 |
| Traceability severity | Warning | Pass (3 minor orphans remain) |
| Implementation leakage | 7 | 3 (brownfield only) |
| Implementation leakage severity | Critical | Warning |
| SMART flagged FRs | 5/60 (8.3%) | 3/63 (4.8%) |
| Overall FR count | 60 | 63 |
| **Holistic Quality** | **4/5** | **4.5/5** |
