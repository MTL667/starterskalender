---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'Tijdsregistratie 2027 - Airport/Starterskalender als oplossing?'
session_goals: 'Verkennen of en hoe de app een tijdsregistratie-oplossing kan bieden'
selected_approach: 'progressive-flow'
techniques_used: ['what-if-scenarios', 'six-thinking-hats', 'morphological-analysis', 'decision-tree-mapping']
ideas_generated: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]
context_file: ''
session_complete: true
---

## Session Overview

**Topic:** Tijdsregistratie 2027 — Can Airport/Starterskalender provide a solution?
**Goals:** Explore whether and how the app can offer time registration capabilities aligned with the Belgian 2027 mandate

### Context Guidance

Key regulatory constraints:
- System must be objective, reliable, and accessible
- Digital systems and retroactive registration permitted
- Sufficient to register only deviations from agreed schedules
- Excluded categories: management, teleworkers, commercial reps, traveling personnel
- Deadline: April 1, 2027

Current product scope: HR onboarding/offboarding platform with entity management, task automation, material tracking, Entra ID integration, and multi-tenant RBAC.

## Technique Execution Results

### Phase 1: Expansive Exploration (What If Scenarios)

**Ideas Generated:**

1. **Stilte = Akkoord Model** — Werkrooster bij onboarding vastgelegd, geen actie = normaal gewerkt, alleen afwijkingen registreren.
2. **Tijdsregistratie als bijproduct van ERP Forms** — Bestaande formulierdata (verlof, overuren, ziekte) IS de afwijkingenregistratie.
3. **Airport als compliance-laag bovenop ERP** — Airport slurpt activiteitsdata, combineert met rooster, genereert wettelijk overzicht.
4. **ERP-activiteit als passieve tijdsregistratie** — Timestamps van inspecties/rapporten als bewijs van aanwezigheid.
5. **Bookend model** — Bij eerste/laatste ERP-actie korte bevestiging "werkdag gestart/gestopt om X — klopt? ✓"
6. **Unified compliance via eigen ecosysteem** — Airport + ERP Forms samen = compliant zonder extra werk.
7. **Tijdsregistratie Inbegrepen als sales-argument** — Klanten die beide producten gebruiken zijn al compliant.
8. **Airport als uren-dashboard voor HR** — Extra tab met overzicht per werknemer, afwijkingen, export.
9. **Inspectie-klaar export** — Eén klik rapport voor sociaal inspectie.
10. **Hybride model** — Passief (ERP) waar mogelijk, actief (bevestiging) waar nodig.
11. **Tijdsregistratie-configuratie per entiteit** — Elke entiteit eigen regime, pauzeregels, uitzonderingen.
12. **Drie registratiemodi per entiteit** — Passief / Stilte=akkoord / Actieve check-in, configureerbaar per functie.
13. **Lichtgewicht check-in via Airport** — PWA/bookmark, twee taps per dag voor wie geen ERP heeft.
14. **Email-gebaseerde dagbevestiging** — Dagelijkse mail "volgens schema? Ja/Nee", klik = klaar.
15. **Microsoft Teams-bot** — Check-in/out via Teams, zit al in het ecosysteem.
16. **Entiteit-specifieke uurpatronen als template** — Standaard werkweken/ploegen, automatisch gekoppeld bij onboarding.
17. **Verschillende compliance-regels per entiteit** — Bouw (streng) vs consultancy (licht) vs retail (variabel).

**Clusters:**
- Passieve registratie (ERP Forms, timestamps, sign-ins)
- Minimale actieve registratie (dagbevestiging, stilte=akkoord)
- Configuratie-architectuur (per entiteit, per functie, per modus)

---

## Phase 2: Pattern Recognition (Six Thinking Hats)

### White Hat — Facts
- Law requires objective, reliable, accessible system by April 2027
- Deviation-only registration likely sufficient (final law pending)
- Own ERP Forms + Airport = full control over both sides
- Target: SMEs with mixed workforce profiles per entity

### Red Hat — Intuition
- "Already compliant without knowing" = killer sales moment
- Passive registration via ERP Forms feels elegant
- Building a full time registration product feels like scope creep
- Hybrid model (passive + active fallback) = right balance

### Yellow Hat — Benefits
- Upsell existing clients, attract new ones, strengthen lock-in
- ERP Forms becomes more valuable, zero extra effort for field workers
- April 2027 deadline creates marketing urgency

### Black Hat — Risks
- Law may change to require full clock-in/out
- Liability if compliance guarantee fails at inspection
- Scope creep (overtime, night shifts, part-time, variable schedules)
- Competition with specialists (Protime, SD Worx)

### Green Hat — Alternatives
- Airport as data aggregator, not source (connect to existing tools)
- Compliance-audit feature instead of registration
- Phased approach: MVP → ERP coupling → advanced features

### Blue Hat — Conclusion
**Strongest direction:** Airport as compliance layer aggregating ERP Forms data, with lightweight fallback for non-ERP users. Configurable per entity.

---

## Phase 3: Concept Development (Morphological Analysis)

**Selected combination:**

| Parameter | Choice | Rationale |
|-----------|--------|-----------|
| Location | Feature in Airport (tab "Uren") | Fits existing architecture |
| Registration | Hybrid (passive ERP + active fallback) | Maximum usability, scales to all employees |
| Configuration | Layered (entity → role → individual) | Flexible for multi-entity, simple for basic cases |
| Output | Dashboard + Export + API | Dashboard now, export soon, API later |
| Legal strategy | Build flexible (supports both deviation and full registration) | Ready for either scenario |

---

## Phase 4: Action Plan (Decision Tree Mapping)

### Roadmap

| Phase | What | When | Effort |
|-------|------|------|--------|
| 0. Foundation | Data model (WorkSchedule, TimeEntry, TimeDeviation), entity config | Jul-Aug 2026 | 2-3 weeks |
| 1. MVP Core | Deviation form in Airport, "silence = agreement" logic, HR dashboard | Sep-Oct 2026 | 4-5 weeks |
| 2. ERP Coupling | Event webhook from ERP Forms → passive timestamps in Airport | Nov 2026 | 2-3 weeks |
| 3. Output | Inspection export (PDF), weekly overview, missing registration alerts | Dec 2026 | 2 weeks |
| 4. Compliance check | Validate MVP against final published law, adjust if needed | Q1 2027 | 1-2 weeks |
| 5. Extensions | Payroll API feed, Teams bot, email confirmation, shift schedules | Q2 2027+ | Ongoing |

### Go/No-go Criteria
- After Phase 0: Data model fits multi-entity architecture → Go to MVP
- After Phase 1: Internally testable, one pilot entity running → Go to ERP coupling
- After Phase 3: Client can show export to inspector → **Commercially ready**
- After Phase 4: Law confirms approach → continue. Law deviates → pivot with prepared flexibility.

### Immediate Next Steps
1. Data design: WorkScheduleTemplate, TimeEntry, TimeDeviation models
2. Entity admin: registration mode selector, default schedule config
3. ERP Forms: define event interface (which timestamps, format)

---

## Session Conclusion

| Aspect | Outcome |
|--------|---------|
| Do or don't? | Do — legally required |
| How? | Feature in Airport, hybrid registration, layered configuration |
| Unique proposition | "Already compliant via your existing workflow" — ERP Forms as passive source |
| Risk strategy | Build flexible, MVP now, adjust when law is final |
| Timeline | MVP ready Dec 2026, commercially ready Q1 2027 |
