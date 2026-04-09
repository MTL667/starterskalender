# Product Brief: Digitale Documentondertekening in Starterskalender

**Datum:** 8 april 2026
**Opgesteld door:** Product Team Starterskalender
**Doelgroep:** Management / Directie
**Status:** Voorstel ter goedkeuring

---

## Samenvatting

We stellen voor om **digitale documentondertekening** toe te voegen aan Starterskalender. HR kan documenten (arbeidscontracten, NDA's, onboarding-checklists, opleidingsdossiers) uploaden in het platform, waarna starters deze digitaal ondertekenen. Getekende documenten worden automatisch opgeslagen in Microsoft Teams, waar HR ze kan terugvinden in hun vertrouwde werkomgeving.

De oplossing wordt in **twee fasen** uitgerold:
- **Fase 1:** Eenvoudige digitale handtekening (click-to-sign) + Teams-integratie
- **Fase 2:** Juridisch gekwalificeerde handtekening via Itsme (na consultatie met Itsme)

---

## Probleemstelling

### Huidige situatie

| Pijnpunt | Impact |
|---|---|
| Documenten worden per e-mail verstuurd of op papier getekend | Tijdverlies van 15-30 minuten per starter |
| Geen centraal overzicht van ondertekeningsstatus | HR moet handmatig opvolgen wie al getekend heeft |
| Getekende documenten worden verspreid opgeslagen | Moeilijk terug te vinden bij audits of juridische geschillen |
| Geen koppeling met het onboardingproces | Documentstatus is onzichtbaar in de planningtools |

### Gewenste situatie

- Volledig digitaal ondertekeningsproces, geïntegreerd in het bestaande onboardingplatform
- Real-time zichtbaarheid van ondertekeningsstatus op het dashboard
- Automatische opslag in Microsoft Teams — toegankelijk voor het hele HR-team
- Juridisch waterdichte ondertekening via Itsme voor contracten en NDA's

---

## Oplossing

### Fase 1: Eenvoudige Handtekening + Teams-opslag

HR uploadt documenten in Starterskalender en wijst ze toe aan een starter. De starter ziet een overzicht van te ondertekenen documenten, kan ze bekijken en met één klik bevestigen.

**Kenmerken:**
- Document upload (PDF) door HR per starter
- Inline documentpreview via Microsoft 365
- Click-to-sign voor interne documenten (checklists, opleidingsdossiers)
- Automatische opslag in een gestructureerde mappenstructuur in Microsoft Teams
- Voortgangsindicator op het dashboard (geïntegreerd in de bestaande Health Score)
- Sequentiële ondertekening mogelijk (bv. contract eerst, dan NDA)

**Geschikt voor:** Onboarding-checklists, opleidingsdossiers, interne beleidsverklaringen

### Fase 2: Gekwalificeerde Handtekening via Itsme

Na consultatie met Itsme en onboarding op hun B2B-platform wordt de juridisch gekwalificeerde elektronische handtekening (QES) toegevoegd. Deze is conform de Europese eIDAS-verordening en heeft dezelfde juridische waarde als een handgeschreven handtekening.

**Kenmerken:**
- Ondertekening via de Itsme-app (mobiel of desktop)
- Cryptografische handtekening ingebed in het PDF-document (PAdES-formaat)
- Verifieerbaar in elke standaard PDF-lezer
- Onafhankelijk verifieerbare identiteit van de ondertekenaar

**Geschikt voor:** Arbeidscontracten, NDA's/geheimhoudingsverklaringen, juridisch bindende documenten

---

## Technische Aanpak

### Wat we hergebruiken (geen extra kosten)

| Component | Status |
|---|---|
| Microsoft 365 Business Standard | ✅ Reeds in gebruik |
| Microsoft Teams | ✅ Reeds in gebruik door HR |
| Azure AD / Entra ID | ✅ Reeds geïntegreerd voor SSO |
| Microsoft Graph API | ✅ SDK reeds in de codebase |
| Real-time updates (SSE) | ✅ Reeds operationeel |
| Health Score systeem | ✅ Reeds operationeel |

### Wat er nieuw bij komt

| Component | Fase | Toelichting |
|---|---|---|
| Azure App Registration voor documenten | Fase 1 | Aparte credentials met enkel bestandsrechten |
| Document upload/preview functionaliteit | Fase 1 | Integreert met bestaande StarterDialog |
| Click-to-sign flow | Fase 1 | Nieuwe UI-component |
| Itsme B2B portal account | Fase 2 | Registratie en onboarding bij Itsme |
| Itsme Sign API integratie | Fase 2 | CSC API voor gekwalificeerde handtekeningen |

---

## Kostenanalyse

### Eenmalige kosten

| Item | Schatting |
|---|---|
| Ontwikkeling Fase 1 (SES + Teams) | ~3-4 ontwikkeldagen |
| Azure App Registration configuratie | ~1 uur (IT-beheerder) |
| Ontwikkeling Fase 2 (Itsme QES) | ~4-5 ontwikkeldagen |
| Itsme B2B onboarding | ~2-4 weken doorlooptijd (consultatie + setup) |

### Lopende kosten

| Item | Kosten |
|---|---|
| Microsoft Teams opslag | ✅ Inbegrepen in Business Standard (1 TB/gebruiker) |
| Itsme transacties (Fase 2) | ~€0,15-0,50 per ondertekening (volume-afhankelijk) |
| Externe signing-tool (DocuSign/Connective) | ❌ **Niet nodig** — besparing van €500-2.000/maand |

### Kostenbesparing vs. externe oplossing

| Oplossing | Maandelijkse kosten | Jaarlijkse kosten |
|---|---|---|
| DocuSign Business | €500-1.500/maand | €6.000-18.000/jaar |
| Connective (eSignatures) | €800-2.000/maand | €9.600-24.000/jaar |
| **Starterskalender (eigen oplossing)** | **~€20-50/maand** (Itsme transacties) | **~€240-600/jaar** |

---

## Tijdsbesparing voor HR

| Activiteit | Huidig | Na implementatie |
|---|---|---|
| Documenten klaarzetten per starter | ~15 min | ~3 min |
| Opvolgen of alles getekend is | ~10 min/dag | 0 min (automatisch zichtbaar) |
| Getekend document opslaan/archiveren | ~5 min per document | 0 min (automatisch in Teams) |
| Document terugvinden voor audit | ~15-30 min | ~30 sec (zoeken in Teams) |

**Geschatte besparing:** 20-40 minuten per starter, plus doorlopende tijdsbesparing op opvolging en archivering.

---

## Risico's en Mitigatie

| Risico | Waarschijnlijkheid | Impact | Mitigatie |
|---|---|---|---|
| Itsme B2B onboarding duurt lang | Middel | Laag | Fase 1 is onafhankelijk bruikbaar; Itsme is enkel voor Fase 2 |
| Starter heeft geen Itsme | Laag | Laag | Fase 2 documenten kunnen ook via alternatief pad worden afgehandeld |
| Microsoft Graph API wijzigingen | Zeer laag | Middel | Microsoft Graph v1.0 is stabiel; we gebruiken standaard endpoints |
| Juridische vragen over SES-geldigheid | Laag | Middel | SES alleen voor interne documenten; juridisch bindende documenten via Itsme QES |

---

## Planning

```
Fase 1: Eenvoudige Handtekening + Teams           Fase 2: Itsme QES
┃                                                   ┃
┣━━ Week 1-2: Backend + Teams integratie            ┣━━ Week 1: Itsme B2B onboarding starten
┣━━ Week 2-3: UI (upload, preview, sign)            ┣━━ Week 2-3: CSC API integratie
┣━━ Week 3:   Testen + Health Score koppeling       ┣━━ Week 3-4: PAdES signing + testen
┣━━ Week 4:   Uitrol + HR training                  ┣━━ Week 4:   Uitrol
┃                                                   ┃
▼ Live                                              ▼ Live
   ↕                                                   
   Evaluatieperiode + Itsme consultatie
```

---

## Aanbeveling

We raden aan om **Fase 1 onmiddellijk te starten**. Dit levert direct waarde op voor HR zonder externe afhankelijkheden. Parallel kan de consultatie met Itsme worden opgestart voor Fase 2.

De oplossing bouwt volledig voort op de bestaande technische infrastructuur (Microsoft 365, Azure AD, Microsoft Graph) en vereist geen nieuwe licenties of externe diensten voor Fase 1.

---

*Voor vragen of een demo van het concept, neem contact op met het Product Team.*
