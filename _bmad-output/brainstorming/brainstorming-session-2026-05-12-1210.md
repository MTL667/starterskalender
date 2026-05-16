---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'Recruitment module to fully replace Recruitee within Airport'
session_goals: 'Cost reduction, job posting & application pipeline, granular RBAC per vacancy/phase, seamless flow into pre-onboarding module'
selected_approach: 'progressive-flow'
techniques_used: ['cross-pollination', 'morphological-analysis', 'six-thinking-hats', 'solution-matrix']
ideas_generated: ['E-commerce #1', 'E-commerce #2', 'E-commerce #3', 'E-commerce #4', 'E-commerce #5', 'E-commerce #6', 'Dating #7', 'CRM #8', 'CRM #9', 'CRM #10', 'PM #11', 'PM #12', 'PM #13', 'Compliance #14', 'Compliance #15', 'Compliance #16', 'Gaming #17', 'Gaming #18', 'Social #19', 'Logistiek #20', 'Logistiek #21', 'Logistiek #22', 'Assessment #23', 'Vastgoed #24', 'Web #25', 'Web #26', 'Web #27']
context_file: ''
---

# Brainstorming Session Results

**Facilitator:** Kevin
**Date:** 2026-05-12 12:10

## Session Overview

**Topic:** Recruitment module — full Recruitee replacement within Airport
**Goals:**
1. Cost reduction — eliminate external SaaS dependency
2. Job posting management — create vacancies, publish to company site, collect applications into selection pipeline
3. Granular RBAC — per-vacancy, per-phase permissions (vs Recruitee's all-or-nothing)
4. Seamless candidate-to-starter flow — selected candidate flows into pre-onboarding module, then into existing starter flow

### Context Guidance

_Existing Airport platform provides: starter calendar, task automation, RBAC v2 with granular permissions, entity management, CardDAV sync, document management, SSE real-time updates, cron jobs, i18n (NL/FR), Microsoft Graph API (mail, calendar, SharePoint). Pre-onboarding module is in development (separate brainstorm session)._

### Session Setup

_Kevin wants to fully replace Recruitee with an in-house recruitment module. Key pain points: cost, lack of granular access control. Key strengths to preserve: vacancy creation, website publication, application collection into structured pipeline. Integration target: pre-onboarding module._

### Key User Requirements (captured during session)

- **Modular vacancy builder** with SharePoint stock photo integration
- **One-click apply** with minimal friction (no account required)
- **Templates linked to job functions** (reusable across Airport)
- **Dealbreaker auto-filter** is a must-have — hard requirements vs weighted nice-to-haves
- **HR headhunter as gatekeeper** — fixed pipeline process, she sees everything
- **Technical reviewer gets scoped view** — CV + limited data only, no personal info leakage
- **Share button** for ad-hoc access to specific candidate data
- **O365 mailbox sync** — headhunter uses personal email, mails auto-linked to candidate file, with private-marking opt-out
- **Candidate self-service portal** bridges into pre-onboarding module
- **Status emails** per pipeline phase transition
- **Referral system** with personal tracking links
- **Digital assessment integration** — existing tests to be integrated
- **Embeddable vacancy widget** — multi-site with entity grouping (entity X+Y share one site, entity Z has its own)
- **Pipeline dashboard** — per entity AND global view
- **Anonymous screening** — double opt-in: headhunter enables per vacancy, candidate chooses to opt in
- **Interview scheduling** remains phone-based (no self-service planner for now)

---

## Technique Selection

**Approach:** Progressive Technique Flow
**Journey Design:** Systematic development from exploration to action

**Progressive Techniques:**
- **Phase 1 - Exploration:** Cross-Pollination — borrow ideas from 10+ domains
- **Phase 2 - Pattern Recognition:** Morphological Analysis — cluster into architecture
- **Phase 3 - Development:** Six Thinking Hats — evaluate from all perspectives
- **Phase 4 - Action Planning:** Solution Matrix — prioritize and plan implementation

---

## Phase 1: Cross-Pollination — Expansive Exploration

**Domains explored:** E-commerce, Dating/Matching, CRM/Sales, Project Management, Compliance/GDPR, Gaming/Onboarding, Social Media, Logistics, Assessment/Education, Real Estate, Web/Embedding

### 27 Ideas Generated

**[E-commerce #1]**: Modulaire Vacature Builder
_Concept_: Build vacancies from reusable blocks — intro, team description, requirements, benefits, photo/video. Drag & drop. Stock photos from central SharePoint library.
_Novelty_: No blank page, consistent employer branding, non-designers create professional pages.

**[E-commerce #2]**: One-Click Apply
_Concept_: Minimal friction: upload CV, click "Apply". No account required — guest checkout model.
_Novelty_: Every extra step = lost candidates. Lowest possible barrier.

**[E-commerce #3]**: Template-per-Function Linking
_Concept_: Vacancy templates linked to job functions in Airport. Bridge between recruitment and existing starter flow — data flows from vacancy → application → pre-onboarding → starter.
_Novelty_: Reusable in current Airport functions, consistent structure.

**[E-commerce #4]**: CV Parser with AI Extraction
_Concept_: Upload PDF/Word, AI extracts name, work experience, skills, education into structured fields. Enables search/filter on skills.
_Novelty_: Structured data from day 1, not just at onboarding.

**[E-commerce #5]**: QR Application for Job Fairs
_Concept_: Unique QR code per vacancy. Scan at job fair → mobile form → application in 30 sec. Track which fair yields most candidates.
_Novelty_: Measurable ROI per job fair, direct pipeline without paper CVs.

**[E-commerce #6]**: Anonymous First Screening
_Concept_: Optional mode: name, photo, age, gender hidden in first selection round. Hiring manager sees only skills, experience, motivation.
_Novelty_: Diversity & inclusion as feature. Configurable per entity via RBAC.

**[Dating #7]**: Dealbreaker Auto-Filter
_Concept_: Hard requirements (driver's license, diploma, location) vs soft preferences (experience, languages). System auto-filters on dealbreakers, scores nice-to-haves with weights.
_Novelty_: Recruiter sees only relevant candidates, sorted by match strength.

**[CRM #8]**: Role-Based Candidate Pipeline
_Concept_: Fixed pipeline process with HR headhunter as gatekeeper. Three access levels: (1) headhunter sees all, (2) technical reviewer sees CV + limited data, (3) ad-hoc shared via share button.
_Novelty_: Per-field and per-phase visibility via RBAC v2.

**[CRM #9]**: Share Button with Scoped Access
_Concept_: Headhunter clicks "Share with..." → picks Airport user → picks which data fields. Read-only view, temporary or permanent. Audit log.
_Novelty_: Google Drive-like sharing for candidate data. GDPR-compliant.

**[CRM #10]**: Technical Interview View
_Concept_: Technical reviewer gets stripped-down view: only CV, skills, evaluation form. No personal data. Access expires after evaluation.
_Novelty_: Privacy by design — data minimization built into workflow.

**[PM #11]**: Structured Scorecard Evaluation
_Concept_: Per vacancy scorecard template. Every reviewer fills same criteria. System aggregates scores. Historical data: "which profiles perform best after 1 year?"
_Novelty_: Objective, comparable, replaces ad-hoc Excel evaluation.

**[PM #12]**: Email Integration per Candidate (O365 Mailbox Sync)
_Concept_: Headhunter's personal O365 mailbox linked via Graph API. Emails to/from candidate automatically linked to candidate file. Private marking as opt-out.
_Novelty_: Zero workflow change. Outlook stays, Airport captures. Complete audit trail.

**[PM #13]**: Internal Comment Thread per Candidate
_Concept_: Discussion thread under each candidate profile. RBAC-governed. Replaces scattered Teams messages and emails.
_Novelty_: Decision history in one place.

**[Compliance #14]**: Double Opt-in Anonymization
_Concept_: Headhunter enables option per vacancy. Applicant chooses whether to be anonymously evaluated. Both must opt in.
_Novelty_: Respects autonomy of both organization and candidate.

**[Compliance #15]**: Automatic GDPR Retention Policy
_Concept_: Candidate data expires after X months. Auto-email: "Want to stay in talent pool?" No response = deletion. Similar to CardDAV soft-delete → hard-delete pattern.
_Novelty_: Compliance on autopilot.

**[Compliance #16]**: Personal Mailbox Sync via Graph API
_Concept_: Graph API matches emails on candidate email address. Auto-linked. Headhunter can mark emails as private.
_Novelty_: Zero workflow change, full control.

**[Gaming #17]**: Candidate Self-Service Portal → Pre-onboarding Bridge
_Concept_: Applicant has portal: upload documents, provide availability, add references. On hire, transforms into pre-onboarding portal. Same login.
_Novelty_: One continuous candidate journey without boundaries.

**[Gaming #18]**: Configurable Status Emails per Pipeline Phase
_Concept_: Per stage an email template with variables. Manual or automatic on phase transition. Headhunter retains control.
_Novelty_: Consistent, professional, no candidate left in the dark.

**[Social #19]**: Employee Referral System
_Concept_: Employee shares vacancy with personal tracking link. Tracking: who shared, who applied, who was hired. Dashboard + optional bonus registration.
_Novelty_: Best candidates via network. Measurable, lower cost per hire.

**[Logistiek #20]**: Multi-channel Publication (Optional)
_Concept_: Publish vacancy to external channels (Indeed, VDAB, LinkedIn). Per-channel tracking via UTM. Optional module.
_Novelty_: Start with own site, scale when needed.

**[Logistiek #21]**: Recruitment Pipeline Dashboard
_Concept_: Funnel view: candidates per phase, throughput time, bottlenecks. Per entity AND global. Filterable on period, function, entity.
_Novelty_: Management insight supporting multi-entity structure. Headhunter sees workload, management sees KPIs.

**[Logistiek #22]**: Bottleneck Alerts with SLAs
_Concept_: Configurable SLA per pipeline phase. Overdue = alert to responsible person. Dashboard turns orange/red.
_Novelty_: Proactive, prevents candidate drop-off due to slowness.

**[Assessment #23]**: Digital Assessment Integration
_Concept_: Link assessment to pipeline phase. Candidate takes test via link, score flows automatically into scorecard. Internal or external via webhook/API.
_Novelty_: Assessment as integrated pipeline step, not standalone.

**[Vastgoed #24]**: Candidate Comparison View
_Concept_: Side-by-side view of 2-4 candidates: scorecards, dealbreakers, assessments, notes. Export to PDF as shortlist report.
_Novelty_: Objective comparison replaces gut feeling.

**[Web #25]**: Embeddable Vacancy Widget (Multi-site)
_Concept_: Web component per configuration: per entity, grouped (X+Y on one site), or separate. One source of truth, multiple websites.
_Novelty_: Create vacancy = automatically visible on correct site(s).

**[Web #26]**: Configurable Site Grouping
_Concept_: In Admin define "website groups": which entities share a site. Widget picks up branding per entity/group.
_Novelty_: Manages multi-entity reality without code changes.

**[Web #27]**: Headless Vacancy API
_Concept_: REST/JSON API alongside widget. Any developer can fetch vacancies and style them. Widget for quick, API for control.
_Novelty_: No vendor lock-in, modern headless architecture.

---

## Phase 2: Morphological Analysis — Pattern Recognition

### 7 Clusters Identified

#### Cluster 1: VACANCY MANAGEMENT (#1, #3, #6, #7, #14)
| Parameter | Options |
|---|---|
| Construction | Modular blocks, drag & drop, SharePoint photos |
| Templates | Per function linked, reusable content blocks |
| Requirements | Dealbreakers (hard) + nice-to-haves (weighted) |
| Anonymization | Double opt-in: headhunter enables, candidate chooses |

**Insight**: The vacancy is not just an ad — it's a _filter specification_ that drives the entire pipeline.

#### Cluster 2: CANDIDATE INTAKE (#2, #4, #5, #17, #19)
| Parameter | Options |
|---|---|
| Application method | One-click (CV upload), QR code (job fair), referral link |
| Data processing | CV parser → structured fields |
| Portal | Self-service → transforms to pre-onboarding |
| Referral | Personal link, tracking, bonus registration |

**Insight**: Multiple entry points, one standardized pipeline. The CV parser is the key — all data gets structured regardless of intake channel.

#### Cluster 3: PIPELINE & SELECTION (#8, #11, #13, #18, #22, #23, #24)
| Parameter | Options |
|---|---|
| Stages | Configurable per vacancy, Kanban view |
| Evaluation | Scorecard templates, assessment integration |
| Communication | Status emails per phase, internal threads |
| Comparison | Side-by-side view, shortlist export |
| SLA | Throughput time per phase, bottleneck alerts |

**Insight**: The pipeline is the heart. Stages are configurable, but the evaluation model (scorecard + dealbreakers + assessments) is the real value.

#### Cluster 4: ACCESS CONTROL / RBAC (#8, #9, #10)
| Parameter | Options |
|---|---|
| Headhunter | Full access to all candidate data |
| Technical reviewer | Scoped view: CV + skills + evaluation form |
| Ad-hoc share | Share button, choose fields, temporary/permanent |
| Audit | Who viewed what when |

**Insight**: This is the USP vs Recruitee. Three levels: full, scoped, shared. Maps 1:1 to existing RBAC v2.

#### Cluster 5: COMMUNICATION & MAIL (#12, #16, #18)
| Parameter | Options |
|---|---|
| Mailbox sync | Graph API, headhunter's personal mailbox |
| Matching | Automatic on candidate email address |
| Privacy | Private marking to exclude emails from file |
| Status emails | Templates per phase, manual or automatic |

**Insight**: One communication stream: headhunter emails from Outlook, Airport captures. Status emails are outbound, mailbox sync is inbound.

#### Cluster 6: WEBSITE INTEGRATION (#5, #25, #26, #27)
| Parameter | Options |
|---|---|
| Widget | Embeddable web component per entity/group |
| Grouping | Entities share site or separate, configurable |
| API | Headless REST/JSON for developers |
| Branding | White-label per entity, QR codes per vacancy |

**Insight**: The public-facing side is a separate layer. One source (Airport), multiple outlets (widgets, API, QR).

#### Cluster 7: ANALYTICS & COMPLIANCE (#15, #20, #21, #22)
| Parameter | Options |
|---|---|
| Dashboard | Per entity + global, funnel, throughput time |
| Sourcing | Multi-channel tracking (optional) |
| GDPR | Auto retention, consent, right to be forgotten |
| Alerts | SLA overdue, bottleneck detection |

**Insight**: Data and compliance as foundation, not afterthought.

---

## Phase 3: Six Thinking Hats — Idea Development

### White Hat — FACTS
- Existing infra: RBAC v2, Graph API (mail + calendar + SharePoint), Prisma/PostgreSQL, Next.js, SSE event bus, i18n (NL/FR), entity model
- Users: 1 HR headhunter (primary), technical reviewers (secondary), management (dashboards)
- Volume: ~329 contacts in CardDAV = company size indicator. Estimate: dozens of vacancies per year, not hundreds
- Multi-entity: multiple entities, some share website, others don't
- Pre-onboarding: in development, becomes next step after recruitment

### Red Hat — EMOTION & INTUITION
- Headhunter uses this daily — her experience is make-or-break
- Technical reviewers want minimal friction — they do this alongside their real job
- Candidates form first impression of company via application experience
- Kevin's excitement is at RBAC granularity and the flow-through — these are the true differentiators

### Yellow Hat — BENEFITS
- Cost reduction: no more Recruitee license
- Data ownership: everything in own DB, no vendor lock-in
- Integration: seamless flow recruitment → pre-onboarding → starter → tasks → CardDAV
- RBAC as USP: something Recruitee cannot do
- Existing building blocks: Graph API, entities, event bus — 60% of infra already exists

### Black Hat — RISKS
- Scope creep: 27 ideas, 7 clusters, all v1 — ambitious. Risk of half-finished product that doesn't fully replace Recruitee
- CV parser complexity: AI extraction sounds simple but is notoriously unreliable for unstructured CVs
- Mail sync privacy: auto-scanning someone's mailbox is GDPR-sensitive. Headhunter consent needed
- Widget maintenance: embeddable components on external sites = cross-origin issues, version updates, caching
- Migration: existing Recruitee data — how do active vacancies and candidates transfer?

### Green Hat — CREATIVITY (Risk Mitigation)
- MVP strategy: start with headhunter workflow (vacancy → pipeline → evaluation). Candidate portal and widget can be phase 2
- CV parser: start with simple field extraction (name, email, phone from PDF metadata), AI parsing later
- Mail sync light: start with manual "link this email" instead of auto-sync. Automation later
- Widget alternative: start with simple public page on Airport itself (`airport.kevinit.be/jobs/aceg`), widget later

### Blue Hat — PROCESS
Key question: what is the minimum set that replaces Recruitee?

**Three-wave delivery agreed upon:**

| Wave | Clusters | Rationale |
|---|---|---|
| Wave 1: Core | Vacancy Management, Pipeline & Selection, RBAC | Without this, cannot cancel Recruitee |
| Wave 2: Communication | Mail integration, Status emails, Website integration | Completes daily usage |
| Wave 3: Intelligence | Analytics, Assessment, CV parser, Referral | Adds value but not blocking |

---

## Phase 4: Solution Matrix — Action Plan

### Wave 1: CORE (Recruitee replacement)

| Feature | Priority | Dependencies | Complexity |
|---|---|---|---|
| Prisma schema (Vacancy, Candidate, PipelineStage, Evaluation, etc.) | P0 | None | Medium |
| RBAC permissions (recruitment:*, vacancy:*, candidate:*) | P0 | Schema | Low — existing pattern |
| Vacancy CRUD + template builder | P0 | Schema, RBAC | High |
| Dealbreaker + nice-to-have configuration | P0 | Vacancy model | Medium |
| Candidate intake (application form, CV upload) | P0 | Schema | Medium |
| Pipeline Kanban (stages, drag & drop) | P0 | Schema | High |
| Scorecard evaluation | P0 | Pipeline | Medium |
| Share button with scoped access | P0 | RBAC, Candidate model | Medium |
| Technical reviewer view (stripped-down) | P0 | Share, RBAC | Medium |
| Internal comment thread | P1 | Candidate model | Low |
| Candidate comparison side-by-side | P1 | Scorecard | Medium |

### Wave 2: COMMUNICATION & PUBLICATION

| Feature | Priority | Dependencies | Complexity |
|---|---|---|---|
| Status email templates per phase | P0 | Pipeline | Medium |
| Public vacancy page (Airport-hosted, per entity) | P0 | Vacancy model | Medium |
| Site grouping (entities share site) | P0 | Vacancy page | Low |
| O365 mailbox sync (Graph API) | P1 | Graph integration | High |
| Embeddable widget | P1 | Public API | High |
| Headless API (REST/JSON) | P1 | Vacancy model | Low |
| QR code per vacancy | P2 | Public URL | Low |

### Wave 3: INTELLIGENCE & EXTRAS

| Feature | Priority | Dependencies | Complexity |
|---|---|---|---|
| Pipeline dashboard (per entity + global) | P1 | Pipeline data | Medium |
| Bottleneck alerts / SLA | P1 | Dashboard | Medium |
| GDPR retention policy + consent | P1 | Candidate model | Medium |
| Assessment integration | P1 | Pipeline, Scorecard | High |
| Referral system | P2 | Vacancy, tracking | Medium |
| CV parser (AI) | P2 | Candidate model | High |
| Anonymous screening (double opt-in) | P2 | RBAC, Candidate view | Medium |
| Multi-channel publication | P3 | Public API | High |
| Talent pool nurturing | P3 | Candidate DB, mailing | Medium |

### Suggested Build Order — Wave 1

```
Week 1-2:   Prisma schema + migration + RBAC permissions + seed
Week 3-4:   Vacancy CRUD + template builder + SharePoint photos
Week 5-6:   Candidate intake + application form + CV upload
Week 7-8:   Pipeline (stages, Kanban, drag & drop)
Week 9-10:  Dealbreaker/nice-to-have filter + scorecard
Week 11-12: RBAC views (headhunter/reviewer/share) + comments
```

### Data Flow: Candidate → Starter

```
Pipeline stage: "Hired"
    → Auto-create Starter in Airport (name, contact, function, entity, start date)
    → Pre-onboarding module starts
    → Tasks auto-created
    → CardDAV sync
    → Status email to candidate: "Welcome!"
```

### Core Data Model (Prisma schema preview)

```
Vacancy              → Entity (existing)
  ├─ stages[]             (PipelineStage)
  ├─ dealbreakers[]       (VacancyRequirement)
  ├─ niceToHaves[]        (VacancyPreference)
  └─ template             (VacancyTemplate)

Candidate            → Vacancy
  ├─ stage                (current pipeline phase)
  ├─ evaluations[]        (ScorecardEntry per reviewer)
  ├─ comments[]           (internal thread)
  ├─ emails[]             (synced emails)
  ├─ documents[]          (CV, attachments)
  ├─ assessments[]        (test results)
  └─ referredBy?          (referral tracking)

CandidateShare       → Candidate + User
  ├─ fields[]             (which fields visible)
  └─ expiresAt?           (temporary access)

WebsiteGroup         → Entity[] (site grouping)
```

---

## Development Strategy

### Branch & Server Setup

```
main                    → production (starterskalender.kevinit.be)
feature/recruitment     → dev server (recruitment-dev.kevinit.be)
```

- **Single feature branch** `feature/recruitment` — the module touches existing code (Prisma, RBAC, Graph API, entities), so a separate repo would cause duplication
- **Separate database** — Prisma migrations on the recruitment branch are incompatible with main during development
- **Regular rebase on main** — keep the branch in sync with ongoing production fixes
- **Merge per wave** — Wave 1 complete → merge to main → deploy to production → continue on branch for Wave 2

### Deploy Configuration

Separate `docker-compose.recruitment-dev.yml` with:
- Own PostgreSQL database (`starterskalender_recruitment`)
- Build from `feature/recruitment` branch
- Exposed on port 3001 or separate subdomain
- Own uploads volume
- Same environment variables as production (with dev-specific overrides)

---

## Creative Facilitation Narrative

_Kevin demonstrated strong practical vision throughout this session. He consistently filtered ideas through a feasibility lens while remaining open to novel approaches. Key breakthrough moments: the realization that vacancy templates can bridge recruitment and existing Airport functions (#3), the granular three-tier RBAC model for candidate data access (#8-10), the O365 mailbox sync leveraging existing Graph API infrastructure (#12/#16), and the multi-site widget architecture for different entity-website relationships (#25-27)._

_The session revealed a clear architectural pattern: Airport's existing infrastructure (RBAC v2, Graph API, entity model, event bus) provides a natural foundation for approximately 60% of the recruitment module. The remaining 40% is new domain-specific logic (vacancy builder, pipeline, candidate evaluation) that follows established patterns in the codebase._

_Kevin's strongest conviction was around the RBAC granularity — the ability for the headhunter to control exactly who sees what per candidate. This was identified as the primary USP versus Recruitee and should drive architectural decisions._

### Session Statistics

- **Ideas generated:** 27
- **Domains explored:** 10+
- **Clusters identified:** 7
- **Delivery waves:** 3
- **Estimated Wave 1 timeline:** 12 weeks
- **Key risk:** Scope creep — mitigated by wave-based delivery
