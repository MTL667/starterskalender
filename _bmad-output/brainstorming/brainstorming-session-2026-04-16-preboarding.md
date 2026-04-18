# Brainstorming: Airport als Pre-Onboarding Platform

**Datum:** 16 april 2026
**Deelnemers:** Mary (Analyst), John (PM), Sally (UX), Victor (Strategist), Winston (Architect), Carson (Coach)
**Status:** Tier 1 consensus bereikt — klaar voor implementatieplan

---

## Context

Airport is momenteel een intern HR-tool. De vraag: met welke functies wordt het een pre-onboarding platform — het eerste touchpoint tussen organisatie en nieuwe medewerker?

**Constraint:** Starters hebben nog geen bedrijfsaccount. Hun mailadres wordt pas later aangemaakt. Alle pre-onboarding communicatie gaat via hun privémail.

---

## Architectuurbesluit: Magic Link Portal

Geen login nodig. Hergebruik van het bestaande token-patroon (zoals document signing):

```
Starter aangemaakt in Airport
  → Systeem genereert uniek pre-boarding token (cuid + expiry)
  → HR stuurt invite-mail naar privéadres met magic link
  → Starter landt op /preboarding/{token}
  → Data vloeit direct in bestaand Starter-model
```

**Beveiliging:**
- Token uniek en tijdsgebonden (geldig tot startdatum + 7 dagen)
- Geen wachtwoord, geen account
- Gevoelige uploads via bestaande SharePoint/Azure Docs integratie
- Token revokable bij annulering

---

## Feature Tiers

### 🥇 Tier 1 — "Day One Ready" (hoogste impact, laagste effort)

| Feature | Beschrijving | Effort |
|---------|-------------|--------|
| **Magic link portal** | Token-based toegang via privémail, fundament voor alles | Medium |
| **Welkomstpagina + countdown** | Persoonlijke landing met "Nog X dagen" countdown | Laag |
| **Documenten upload** | ID, bankgegevens, foto — bespaart tijd op dag 1 | Medium |
| **Praktische info pagina** | Adres, parkeren, dresscode, lunch — #1 vraag van starters | Laag |
| **Dag 1 planning** | Exacte tijdlijn eerste dag — neemt grootste angst weg | Laag |

### 🥈 Tier 2 — "Feel Welcome" (engagement verhoging)

| Feature | Beschrijving |
|---------|-------------|
| **Team introductie cards** | Foto + naam + functie + fun fact van toekomstige collega's |
| **Buddy/mentor toewijzing** | Starter weet al wie hen opvangt |
| **Bedrijfscultuur content** | Korte video's, waarden, fun facts |
| **Voorkeurenprofiel** | Dieet, werkplek, communicatiestijl — organisatie bereidt zich voor |

### 🥉 Tier 3 — "Wow Factor" (disruptie-laag)

| Feature | Beschrijving |
|---------|-------------|
| **Boarding Pass visueel** | On-brand, deelbaar, emotionele hook |
| **Gamification** | "Je vlucht is 70% geboarded" voortgangsmetafoor |
| **Interactive org chart** | Waar pas ik in het grotere geheel? |
| **Pre-onboarding survey** | "Hoe voel je je?" → HR kan proactief inspelen |

---

## Starter Ervaring (UX Flow)

**Mail 1 — direct na contractondertekening:**
> "Hi Sarah, welkom! We hebben een persoonlijke pagina klaargezet."
> [Open mijn Airport portaal →]

**Portal (mobile-first):**
1. Boarding Pass met countdown bovenaan
2. Blokken: Documenten, Praktisch, Je Team, Dag 1
3. Voortgangsbalk onderaan ("3 van 5 stappen voltooid")
4. Elke stap zichtbaar voor HR in Airport dashboard

---

## Strategisch Inzicht (Victor)

- **Nu:** "Airport helpt HR om starters te managen"
- **Straks:** "Airport is het eerste dat een nieuwe medewerker ervaart van je organisatie"
- Magic link portal is uitbreidbaar naar offboarding (exit-docs, enquête) en externe contractors
- Employer branding op het meest kritieke moment: de eerste indruk

---

## Consensus

1. **Magic link** als toegangspatroon (token-based, geen account)
2. **Tier 1 eerst** implementeren
3. **Boarding Pass metafoor** als visuele rode draad
4. **Bi-directioneel** — starter vult in, HR ziet voortgang
5. **Privémail** als communicatiekanaal

---

---

## Signing Architectuur: Twee-lagen model

### Context

Niet elk document vereist dezelfde juridische waarde. Arbeidsovereenkomsten en NDA's moeten juridisch waterdicht zijn (eIDAS Qualified Electronic Signature), terwijl interne documenten zoals bedrijfsreglement of IT-voorwaarden volstaan met een simpele "voor gezien en akkoord" bevestiging.

### Oplossing: Quill (Dioss) als signing provider

[Quill](https://quill.dioss.com/) is een Belgisch signing platform van Dioss dat **itsme® signing** out-of-the-box aanbiedt. Geen apart itsme® partnercontract nodig — Quill is de intermediair.

**Voordelen:**
- Belgisch bedrijf → GDPR-compliant, data in EU
- Guest users → starter hoeft geen Quill-account aan te maken (past bij magic link concept)
- itsme® QES → juridisch equivalent aan natte handtekening (eIDAS gekwalificeerd)
- Webhook-gebaseerd → past naadloos in onze event-driven architectuur
- Redirect flow → starter tekent en keert terug naar portal

### Twee signing-niveaus

| Document type | Signing methode | Provider | Juridische waarde |
|--------------|----------------|----------|-------------------|
| Arbeidsovereenkomst | itsme® QES | **Quill (Dioss)** | eIDAS gekwalificeerd |
| NDA / Vertrouwelijkheidsclausule | itsme® QES | **Quill (Dioss)** | eIDAS gekwalificeerd |
| Bedrijfsreglement | Simpele bevestiging | **Airport intern** | Voor gezien & akkoord |
| IT Gebruiksvoorwaarden | Simpele bevestiging | **Airport intern** | Voor gezien & akkoord |

→ Configureerbaar per `DocumentTemplate` via veld `signingMethod: INTERNAL | ITSME_QES`

### Quill API integratie flow

```
Starter opent contract in portal
  → Airport backend: POST /users/create-guest (enabledNotifications: [])
  → Airport backend: POST /documents/create (signatureTypes: ["ITSME"], redirectUrl)
  → Airport backend: POST /documents/{id}/upload-binary (gegenereerde PDF)
  → Webhook: DOCUMENT_PREPARING ontvangen
  → Airport backend: POST /documents/{id}/send
  → Airport backend: POST /urls/create → guest link URL
  → Starter klikt "Tekenen via itsme®" → redirect naar Quill
  → Starter bevestigt in itsme® app (PIN)
  → Redirect terug naar Airport portal
  → Webhook: signing state change → Airport update status
  → Airport backend: GET /documents/{id}/artifacts → getekende PDF
  → Upload naar SharePoint
```

### Open punten

- [ ] **Contact leggen met Dioss** — trial/demo aanvragen voor Quill API-toegang
- [ ] **Pricing** — per-transactie kost voor itsme® signing uitklaren
- [ ] **Fallback voor niet-Belgische starters** — welke alternatieve signing methods biedt Quill? (eID andere landen, SMS OTP, etc.)
- [ ] **Iframe vs redirect** — Quill ondersteunt iframe via custom domain (support ticket nodig), redirect is aanbevolen standaard

### Referenties

- [Quill API Signing Flow documentatie](https://quill.dioss.com/docs/tutorials/api_integrations/example_signing_flow/)
- [BOSA FSP oAuth2 credentials](https://bosa.belgium.be/nl/fsp-oauth2-credentials) (indien directe federale diensten nodig in de toekomst)

---

## Document Template Engine (technisch ontwerp)

### Wat opvragen bij HR

1. **Per documenttype een blanco template** met gemarkeerde plekken voor startergegevens
2. **Matrix welke documenten verplicht zijn** per functie en per entiteit
3. **Welke extra persoonsgegevens** nodig zijn die we nu nog niet vragen

### Nieuwe database modellen

- **`DocumentTemplate`** — template bestand (DOCX/HTML/PDF) met merge fields, per entiteit/taal, versioning
- **`JobRoleDocumentTemplate`** — koppeltabel functie × verplichte documenten (met volgorde + verplicht/optioneel)
- **Extra velden op `Starter`** — adres, IBAN, geboortedatum, rijksregisternummer, contracttype, loon, arbeidsduur

### Merge Engine

- **DOCX route:** `docxtemplater` (PizZip) — Word templates met `{{placeholders}}`
- **HTML route:** Handlebars + Puppeteer → PDF
- **PDF route:** Statische PDF's zonder merge, alleen signing
- Beide routes uploaden gegenereerd document naar SharePoint en maken `StarterDocument` aan

### Beschikbare merge variabelen

Uit bestaand Starter model:
`firstName`, `lastName`, `startDate`, `roleTitle`, `entity.name`, `contractSignedOn`, `desiredEmail`, `phoneNumber`, `language`

Toe te voegen:
`birthDate`, `nationalRegNumber`, `address`, `city`, `postalCode`, `nationality`, `iban`, `contractType`, `endDate`, `grossSalary`, `weeklyHours`, `workSchedule`

### Flow: Template → Document → Signing

```
HR uploadt template + koppelt aan functies
  → Nieuwe starter aangemaakt
  → System vindt templates via JobRoleDocumentTemplate
  → HR (of starter via portal) vult ontbrekende gegevens aan
  → Merge engine genereert PDF per template
  → Upload naar SharePoint + StarterDocument aangemaakt
  → Signing via bestaande magic link infra (/sign/{token})
```

### Pre-onboarding integratie

Starter vult zelf persoonsgegevens in via portal (stap 1), documenten worden real-time gegenereerd (stap 2), starter tekent direct (stap 3). Geen papierwerk op dag 1.

### HR Interface

- **Admin → Document Templates:** upload, preview merge fields, koppel aan functies (checkbox matrix)
- **Starter Dossier → Documenten:** auto-gegenereerde docs met status tracking
- **Ontbrekende data markering:** "Adres ontbreekt — vul aan voordat documenten gegenereerd worden"

---

## Document Review Flow

### Twee categorieën

- **Getekende documenten** (contract, NDA, reglement): systeem genereert PDF, starter tekent. Optioneel "gezien" stempel door HR, niet blokkerend.
- **Geüploade documenten** (ID-kopie, bankafschrift, diploma, foto): user-generated content. **Review verplicht** indien `requiresReview` op template.

### Review statussen

```
Upload door starter → UPLOADED → IN_REVIEW → APPROVED (goedgekeurd)
                                            → REJECTED (afgekeurd + reden)
                                              → starter herinnering
                                              → opnieuw uploaden → cyclus herhaalt
```

### Schema toevoegingen (op StarterDocument)

- `reviewStatus`: `PENDING | IN_REVIEW | APPROVED | REJECTED`
- `reviewedBy`, `reviewedAt` — wie en wanneer
- `rejectionReason` — verplicht bij REJECTED
- `requiresReview: Boolean` op `DocumentTemplate` — per template configureerbaar

### HR Interface

- **Individueel:** preview document → goedkeuren / afkeuren met reden
- **Bulk:** checkbox-selectie → "Alles goedkeuren" per starter met bevestigingsdialoog
- **Notificaties:** upload → HR krijgt in-app notificatie; goedkeuring/afkeuring → starter krijgt mail via magic link

### Starter-zijde (portal)

- Upload ≠ klaar — pas bij "Goedgekeurd" wordt stap groen op runway
- "🔍 In review door HR" geeft vertrouwen
- Bij afkeuring: reden zichtbaar + direct opnieuw uploaden knop

### Compliance

HR kan aantonen dat elk document gecontroleerd is vóór startdatum. Volledige audit trail: wie, wanneer, welk oordeel, welke reden.

---

## Volgende stap

1. Schema migratie voorbereiden (DocumentTemplate + JobRoleDocumentTemplate + extra Starter velden + review fields)
2. HR checklist versturen en templates opvragen
3. Merge engine bouwen (start met DOCX route)
4. Admin UI voor template beheer
5. Review-flow bouwen (individueel + bulk goedkeuren/afkeuren)
6. Integratie met pre-onboarding portal
