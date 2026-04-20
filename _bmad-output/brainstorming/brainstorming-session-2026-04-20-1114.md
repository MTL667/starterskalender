---
stepsCompleted: [1]
inputDocuments: []
session_topic: 'Geautomatiseerde branding/marketing workflow voor nieuwe starters'
session_goals: 'Ontwerp + edge cases voor functie × artefact matrix (headshot, vCard, visitekaartje, badge, NFC, email signature)'
selected_approach: ''
techniques_used: []
ideas_generated: []
context_file: ''
---

# Brainstorming Session Results

**Facilitator:** Kevin
**Date:** 2026-04-20

## Session Overview

**Topic:** Geautomatiseerde branding/marketing workflow voor nieuwe starters

**Goals:**
- Workflow ontwerpen voor auto-aangemaakte taken (headshot → upload → UTM → vCard → visitekaartjes → badges → NFC → email handtekening)
- Configuratie-matrix per functie (welke artefacten horen bij welke functie)
- Ketting-afhankelijkheden tussen taken (volgorde & triggers)
- Notificatieflow (wie krijgt wanneer welke mail/notificatie)
- Alle edge cases onderzoeken (afwezigheid verantwoordelijke, buitenlandse starters, etc.)
- Convergeren naar een technisch ontwerp

### Initiële input Kevin

| Artefact | Verantwoordelijke | Trigger |
|----------|------------------|---------|
| Headshot (foto) | Annelies (Marketing) | Taak op startersdag |
| Profielfoto upload (Forms) | Lexi | Form met foto + email + pasfoto voor WhatsApp/LinkedIn |
| Emailhandtekening | Lexi (fase 2) | Na headshot + data |
| UTM creatie voor vCards | Thomas Guinee | Direct na starter-aanmaak (als vCard-ontvanger) |
| vCards aanmaken | Louis | Na UTM |
| Visitekaartjes bestellen | Taakverantwoordelijke | Met UTM info |
| Badge bestellen | Inspecteurs / Kwaliteit (Aceg vzw) | Per functie |
| SIMA NFC badges bestellen | Taakverantwoordelijke | Per functie |

**Kernprincipe:** Niet elke functie krijgt alles → functie × artefact matrix bepaalt welke taken automatisch aangemaakt worden.

---

## Dependency Graph (definitief)

```
Starter aangemaakt
  │
  ├──→ [A] Headshot nemen (Annelies — MARKETING_PHOTOGRAPHER)
  │      @startersdag + O365 calendar event
  │      │
  │      └──→ [B] Headshot uploaden naar SharePoint (Annelies)
  │             📂 /{entiteit}/{starter}/marketing/headshot-raw.jpg
  │             ⚠ KRITIEKE BLOKKEERSCHAKEL
  │             │
  │             └──→ [C] 3 varianten bewerken + uploaden (Lexi — PHOTO_EDITOR)
  │                    ├─ forms-photo.jpg
  │                    ├─ linkedin-whatsapp.jpg
  │                    └─ email-signature-photo.jpg
  │                    │
  │                    ├──→ [E] vCard aanmaken (Louis — VCARD_CREATOR) ← AND(C, D)
  │                    │      │
  │                    │      ├──→ [F] Visitekaartjes bestellen
  │                    │      ├──→ [G] Badge bestellen (per functie, Aceg vzw)
  │                    │      └──→ [H] NFC badge bestellen (per functie)
  │                    │
  │                    └──→ [I] Emailhandtekening (Lexi — EMAIL_SIGNATURE_CREATOR, fase 2)
  │
  └──→ [D] UTM aanmaken (Thomas — UTM_CREATOR) — parallel, direct bij aanmaak
```

---

## Functie × Artefact Matrix

| Artefact | Iedereen? | Per functie? |
|----------|-----------|-------------|
| Headshot (A) | ✅ Altijd | — |
| Headshot upload (B) | ✅ Altijd | — |
| 3 bewerkte foto's (C) | ✅ Altijd | — |
| Emailhandtekening (I) | ✅ Altijd | — |
| UTM (D) | ⚠️ Alleen als vCard | Volgt vCard |
| vCard (E) | ❌ | Per functie |
| Visitekaartje (F) | ❌ | Per functie |
| Badge (G) | ❌ | Alleen Aceg vzw (inspecteurs/kwaliteit) |
| NFC badge (H) | ❌ | Per functie |

---

## Migratie-logica

| Migratie type | A (Headshot) | B (Upload) | C (Foto-edit) | E-I (vCard etc.) |
|---------------|------|------|------|------|
| Functiewijziging binnen zelfde entiteit | ❌ Skip | ❌ Skip | ❌ Skip | ✅ Opnieuw |
| Entiteitswijziging | ❌ Skip | ❌ Skip | ✅ Nieuwe edit | ✅ Opnieuw |

Bestaande headshot blijft in SharePoint. Bij entiteitswijziging moet Lexi foto opnieuw bewerken (andere branding).

---

## Implementatiestrategie: Uitbreiden bestaand systeem

**Beslissing:** Geen nieuwe module bouwen — het bestaande task-systeem uitbreiden.

### Wat er al bestaat en hergebruikt wordt

- `TaskType` enum (IT_SETUP, HR_ADMIN, FACILITIES, MANAGER_ACTION, CUSTOM)
- `TaskTemplate` model met filters per entiteit / functie / starter type
- `Task` model met `BLOCKED` status, priority, assignee, dueDate
- `TaskAssignment` model (maps TaskType → User, globaal of per entiteit)
- Template variabelen (`{{starterName}}`, `{{entityName}}`, etc.)
- Auto-generatie in `lib/task-automation.ts`
- Admin UI `/admin/task-assignments`
- Notificatiesysteem (in-app + email)

### Schema wijzigingen (minimale uitbreiding)

```prisma
enum TaskType {
  // Bestaand:
  IT_SETUP
  HR_ADMIN
  FACILITIES
  MANAGER_ACTION
  CUSTOM
  // Nieuw voor marketing workflow:
  MARKETING_PHOTO              // Annelies — headshot nemen
  MARKETING_EDIT               // Lexi — 3 foto-varianten bewerken
  MARKETING_VCARD              // Louis — vCard aanmaken
  MARKETING_UTM                // Thomas — UTM code
  MARKETING_VISITEKAARTJE      // visitekaartjes bestellen
  MARKETING_BADGE              // Aceg badge bestellen
  MARKETING_NFC                // SIMA NFC badge bestellen
  MARKETING_SIGNATURE          // Lexi — emailhandtekening (fase 2)
}

enum ScheduleType {
  OFFSET_FROM_START      // bestaand gedrag via daysUntilDue
  ON_START_DATE          // nieuw — op startersdag zelf (voor headshot)
  AFTER_DEPENDENCIES     // nieuw — van zodra dependencies DONE zijn
}

model TaskTemplate {
  // ... bestaande velden ...
  dependsOnTemplateIds String[]     @default([])   // AND-gate dependencies
  scheduleType         ScheduleType @default(OFFSET_FROM_START)
  addToCalendar        Boolean      @default(false)
  uploadFolder         String?                      // "marketing"
  expectedOutputs      Json?                        // ["forms-photo", "linkedin", "signature"]
}

model Task {
  // ... bestaande velden ...
  dependsOnTaskIds String[]  @default([])   // concrete Task IDs (AND-gate)
  o365EventId      String?                    // MS Graph event reference
  scheduledFor     DateTime?                   // voor ON_START_DATE taken
  uploads          StarterTaskUpload[]
  reassignHistory  TaskReassignment[]
}

model StarterTaskUpload {
  id             String   @id @default(cuid())
  taskId         String
  task           Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  fileName       String
  sharePointPath String
  variant        String?   // "forms-photo", "linkedin", "signature"
  uploadedAt     DateTime @default(now())
  uploadedById   String?
}

model TaskReassignment {
  id           String   @id @default(cuid())
  taskId       String
  task         Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  fromUserId   String
  toUserId     String
  reason       String?
  reassignedAt DateTime @default(now())
}
```

### Backwards compatibility

- Alle bestaande `TaskTemplate` / `Task` records blijven werken (nieuwe velden hebben defaults)
- Bestaande IT_SETUP / HR_ADMIN taken-flow blijft ongewijzigd
- Dependencies worden een **platform capability** — ook beschikbaar voor bestaande taaktypes
- Admin UI `/admin/task-assignments` werkt direct voor de nieuwe marketing-TaskTypes

### Marketing-taken als platform primitives

Eens geïmplementeerd zijn dependencies generiek. Voorbeelden elders:
- IT_SETUP "Welkomstmail sturen" kan wachten op IT_SETUP "Account aanmaken"
- HR_ADMIN "Contract laten tekenen" kan wachten op HR_ADMIN "Contract klaarmaken"

---

## Flow bij nieuwe starter aanmaken

```
1. Starter record aangemaakt in Airport
2. Airport leest JobRoleTaskTemplates voor functie
3. Voor elk gekoppeld TaskTemplate:
   → StarterTask aangemaakt
   → assignee = huidige TaskRoleAssignment voor die rol
   → status = PENDING (geen dependencies) of BLOCKED (met dependencies)
   → Als addToCalendar = true:
       Microsoft Graph API → event in assignee's O365 agenda
       o365EventId opgeslagen
   → Notificatie naar assignee (behalve voor BLOCKED taken)

4. Bij voltooiing van een taak:
   → Check alle taken met dependsOn die op deze taak wachten
   → Als AND-gate compleet → status: BLOCKED → PENDING
   → Notificatie naar de nieuwe assignees
   → O365 agenda events aanmaken indien nodig
```

---

## Reassign flow

```
Annelies klikt "↪️ Doorgeven" op een taak
  → Modal: open dropdown met alle systeem-gebruikers
  → Optioneel reden invullen
  → Bevestigen
  → StarterTask.assigneeUserId updated
  → TaskReassignment record aangemaakt (audit trail)
  → Als o365EventId: event verplaatst naar nieuwe assignee
  → Notificatie naar beide personen
  → Oude assignee (Annelies) ziet taak nog even met "doorgegeven aan [naam]"
```

**Admin bulk-reassign:** als een persoon uitvalt, kan HR-admin alle taken in bulk overdragen via admin-interface.

---

## Admin-configuratie (3 schermen)

### 1. Admin → Takenverantwoordelijken (rol → persoon)

Globale mapping van TaskRoles naar personen. Één persoon per rol, configureerbaar.

```
Rol                           | Verantwoordelijke       
MARKETING_PHOTOGRAPHER        | [Annelies Peeters ▾]   
PHOTO_EDITOR                  | [Lexi Verhoeven ▾]     
UTM_CREATOR                   | [Thomas Guinee ▾]      
VCARD_CREATOR                 | [Louis Baeyens ▾]      
VISITEKAARTJE_ORDERER         | [Lisa De Smet ▾]       
BADGE_ORDERER                 | [Inspecteur Kwaliteit ▾]
NFC_BADGE_ORDERER             | [Louis Baeyens ▾]      
EMAIL_SIGNATURE_CREATOR       | [Lexi Verhoeven ▾]     
```

### 2. Admin → Takentemplates

Lijst van alle TaskTemplates: naam, dependencies, upload-config, O365 agenda toggle. CRUD interface.

### 3. Admin → Functies → Taken-matrix

Per functie checkbox-matrix van taken. Analoog met bestaande materialen-matrix.

---

## SharePoint integratie

Hergebruik bestaande Azure Docs integratie:
- Upload via Airport → pusht naar SharePoint via Graph API
- Locatie: `{entiteit}/{achternaam voornaam}/marketing/`
- Bestandsnamen: `headshot-raw.jpg`, `forms-photo.jpg`, `linkedin-whatsapp.jpg`, `email-signature-photo.jpg`
- Opgeslagen in `StarterTaskUpload` met SharePoint referentie

---

## O365 Calendar integratie

Voor taken met `addToCalendar = true` (headshot-taak):

```
POST /users/{assigneeEmail}/events
{
  subject: "📸 Headshot — {starterNaam} ({functie})",
  start: startersdag 09:00,
  end: startersdag 10:00,
  location: "Fotografie-studio",
  body: {
    contentType: "HTML",
    content: "Airport-taak: [link]\n\nStarter: {starter}\nFunctie: {functie}\nEntiteit: {entiteit}"
  },
  attendees: [starter, assignee]
}
→ event.id opslaan in StarterTask.o365EventId
```

Bij reassign: event verplaatsen naar nieuwe assignee.
Bij voltooiing: event markeren als done / optioneel behouden.

---

## MVP vs Fase 2

**MVP (fase 1):**
1. `TaskType` enum uitbreiden met 7 marketing-types (6 in MVP, signature in fase 2)
2. `TaskTemplate` uitbreiden met `dependsOnTemplateIds`, `scheduleType`, `uploadFolder`, `expectedOutputs`
3. `Task` uitbreiden met `dependsOnTaskIds`, `scheduledFor`
4. Nieuwe models: `StarterTaskUpload`, `TaskReassignment`
5. `TaskAssignment` hergebruiken (bestaand) voor mapping TaskType → verantwoordelijke
6. Auto-generatie in `lib/task-automation.ts` uitbreiden met dependency resolution (AND-gate)
7. SharePoint upload flow voor foto's (submap `/marketing/`)
8. Reassign flow (open dropdown) + `TaskReassignment` log
9. Admin UI: bestaande `/admin/task-assignments` + templates matrix uitbreiden
10. Task UI: dependency visualisatie ("wacht op: taak X, Y")
11. Rich task info in beschrijving via template-variabelen (voor handmatig bestellen)
12. Notificaties (per taak, niet geaggregeerd voor MVP)

**Fase 2:**
11. O365 Calendar integratie (Microsoft Graph)
12. Auto-gegenereerde emailhandtekening (HTML template + foto merge)
13. Geaggregeerde dagelijkse notificaties (één mail per persoon per dag)
14. Admin bulk-reassign tool
15. API integraties (Moo voor visitekaartjes, SIMA voor NFC)

---

## Open punten / volgende stap

1. **Prisma migratie schrijven** — `TaskType` enum uitbreiden + nieuwe velden op `TaskTemplate`/`Task` + 2 nieuwe models
2. **`lib/task-automation.ts` aanpassen** — dependency resolution toevoegen, blocked/pending state transitions
3. **Seed-data** — 7 marketing task templates met correcte dependencies en job-role-filters
4. **Task detail-pagina** — dependency visualisatie ("wacht op: X, Y")
5. **Upload component** — foto-variant upload naar SharePoint `/marketing/` submap
6. **Reassign UI** — dropdown met reden, schrijft naar `TaskReassignment`
7. **Migratie-detector** — functie- vs entiteitswijziging onderscheiden (nieuwe edit enkel bij entity change)
8. **Notificatie templates** — initial, blocked-unblocked, reassigned
9. **Demo UI** voor board-presentatie (zoals pre-onboarding en HR validation demos)

## Beslissing

**Aanpak: Uitbreiden bestaand task-systeem** (geen aparte marketing-module).
Rationale: hergebruik van auto-generatie, admin UI, notificaties, filters per entiteit/functie. Dependencies en uploads worden platform-capabilities die ook IT_SETUP / HR_ADMIN taken kunnen benutten.

