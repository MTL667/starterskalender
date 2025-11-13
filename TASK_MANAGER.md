# 📋 Task Manager - Documentatie

## Overzicht

Het Task Management systeem automatiseert het toewijzen en opvolgen van taken bij het onboarden van nieuwe starters. Wanneer een nieuwe starter wordt aangemaakt, worden automatisch relevante taken gegenereerd en toegewezen aan de verantwoordelijken.

---

## 🎯 Functionaliteit

### **Automatische Taak Creatie**
- Bij het aanmaken van een nieuwe starter worden automatisch taken gegenereerd
- Gebaseerd op vooraf geconfigureerde **Task Templates**
- Taken worden toegewezen aan de juiste verantwoordelijken per entiteit
- Notificaties (in-app + email) worden automatisch verstuurd

### **Taak Types**
- 🖥️ **IT Setup** - Telefoonnummer, email, laptop, accounts
- 📋 **HR Administratie** - Contract, badges, toegangspassen
- 🏢 **Facilities** - Werkplek, parkeerplaats, sleutels
- 👥 **Manager Actie** - Welkomstgesprek, intro team
- ⚙️ **Custom** - Andere taken

### **Taak Statussen**
- **In wachtrij** - Nog niet gestart
- **Bezig** - Wordt aan gewerkt
- **Geblokkeerd** - Wacht op iets/iemand
- **Voltooid** - Afgerond
- **Geannuleerd** - Niet meer nodig

### **Prioriteiten**
- 🚨 **Urgent** - Onmiddellijke actie vereist
- ⚠️ **Hoog** - Belangrijk, snel oppakken
- 📋 **Normaal** - Standaard prioriteit
- 💤 **Laag** - Kan later

---

## 🚀 Aan De Slag

### **1. Configureer Taak Verantwoordelijken**

**Navigeer naar:** `/admin/task-assignments`

Hier stel je in wie verantwoordelijk is voor welk type taak:

#### **Globale Verantwoordelijken**
- Geldt voor **alle entiteiten**
- Fallback als geen entiteit-specifieke verantwoordelijke bestaat

**Voorbeeld:**
```
Taak Type: IT Setup
Verantwoordelijke: IT Manager (john@company.com)
Notificatie: In-app + Email
```

#### **Entiteit-specifieke Verantwoordelijken**
- Overschrijft globale instellingen
- Per entiteit verschillende verantwoordelijken mogelijk

**Voorbeeld:**
```
Entiteit: Antwerpen
Taak Type: IT Setup
Verantwoordelijke: IT Support Antwerpen (support.ant@company.com)
Notificatie: Alleen Email
```

---

### **2. Maak Taak Templates (Toekomstige Feature)**

**Opmerking:** In de huidige versie worden default task templates automatisch aangemaakt bij het aanmaken van een starter. In een toekomstige versie kun je deze templates zelf configureren via een admin interface.

**Een Task Template bevat:**
- **Type** - IT_SETUP, HR_ADMIN, etc.
- **Titel** - Met variabelen: `"Email account aanmaken voor {{starterName}}"`
- **Beschrijving** - Gedetailleerde instructies
- **Prioriteit** - URGENT, HIGH, MEDIUM, LOW
- **Dagen tot deadline** - Bijvoorbeeld 7 dagen na startdatum
- **Filters** - Alleen voor specifieke entiteiten/functies

**Variabelen in templates:**
- `{{starterName}}` - Naam van de starter
- `{{entityName}}` - Naam van de entiteit
- `{{roleTitle}}` - Functie titel
- `{{startDate}}` - Startdatum (geformatteerd)

---

### **3. Nieuwe Starter Aanmaken**

Wanneer je een nieuwe starter aanmaakt via `/starters`:

**Wat gebeurt er automatisch?**

1. ✅ **Taak Templates worden geëvalueerd**
   - Welke templates zijn actief?
   - Voldoet de starter aan de filters?

2. ✅ **Taken worden aangemaakt**
   - Variabelen worden vervangen
   - Deadline wordt berekend
   - Verantwoordelijke wordt gezocht (entiteit-specifiek → globaal)

3. ✅ **Notificaties worden verstuurd**
   - In-app notificatie met bel-icoon
   - Email notificatie (als ingesteld)
   - Met link naar de taak

**Voorbeeld:**
```
Starter: Jan Janssens
Entiteit: Antwerpen
Functie: Developer
Startdatum: 15 januari 2025

→ Automatisch aangemaakt:
  - [IT Setup] Email account aanmaken voor Jan Janssens (deadline: 8 jan)
  - [IT Setup] Laptop voorbereiden voor Jan Janssens (deadline: 10 jan)
  - [HR Admin] Contract klaarmaken voor Jan Janssens (deadline: 12 jan)
  - [Facilities] Werkplek toewijzen aan Jan Janssens (deadline: 14 jan)
```

---

## 👤 Voor Taak Verantwoordelijken

### **Notificaties Ontvangen**

**In-app (bel-icoon in navbar):**
- Badge toont aantal ongelezen notificaties
- Klik om dropdown te openen
- Direct naar taak navigeren

**Per Email:**
- Professionele HTML email
- Details van de taak
- Direct link naar taak in systeem

### **Taken Beheren**

**Navigeer naar:** `/taken`

#### **Filters:**
- **Zoeken** - Zoek op titel, beschrijving, starter naam
- **Status** - Filter op status (in wachtrij, bezig, etc.)
- **Type** - Filter op taak type
- **Mijn taken** - Toon alleen aan jou toegewezen taken

#### **Taak Statussen Wijzigen:**
1. Klik op een taak om details te openen
2. Bekijk alle informatie over starter en deadline
3. Markeer als **Voltooid** wanneer klaar
4. Optioneel: Voeg notities toe bij voltooiing

#### **Dashboard Widget:**
- Toon top 5 openstaande taken
- Met urgentie indicatoren
- Quick link naar volledige taken pagina

---

## 👨‍💼 Voor Administrators

### **Taak Verantwoordelijken Beheren**

**Navigeer naar:** `/admin/task-assignments`

#### **Nieuwe Verantwoordelijke Toevoegen:**
1. Selecteer **Entiteit** (of Globaal)
2. Selecteer **Taak Type**
3. Selecteer **Verantwoordelijke** (gebruiker)
4. Kies **Notificatie Kanaal**:
   - Alleen in-app
   - Alleen email
   - Beide
5. Klik **Opslaan**

#### **Bestaande Verantwoordelijke Wijzigen:**
- Selecteer dezelfde combinatie (Entiteit + Taak Type)
- Kies nieuwe verantwoordelijke
- Klik Opslaan (overschrijft oude)

#### **Verantwoordelijke Verwijderen:**
- Klik op prullenbak icoon
- Bevestig verwijdering
- **Let op:** Valt terug naar globale instelling (als die bestaat)

---

## 🔧 Technische Details

### **Database Models**

#### **Task**
```prisma
model Task {
  id              String
  type            TaskType        // IT_SETUP, HR_ADMIN, etc.
  title           String
  description     String?
  status          TaskStatus      // PENDING, IN_PROGRESS, etc.
  priority        TaskPriority    // URGENT, HIGH, MEDIUM, LOW
  starterId       String?         // Gekoppeld aan starter
  entityId        String?         // Gekoppeld aan entiteit
  assignedToId    String?         // Verantwoordelijke
  dueDate         DateTime?       // Deadline
  completedAt     DateTime?
  completedById   String?
  // ... meer velden
}
```

#### **TaskTemplate**
```prisma
model TaskTemplate {
  id                String
  type              TaskType
  title             String          // Met variabelen: {{starterName}}
  description       String?
  priority          TaskPriority
  daysUntilDue      Int            // Dagen vanaf startDate
  isActive          Boolean
  autoAssign        Boolean        // Automatisch toewijzen
  forEntityIds      String[]       // Filter op entiteiten
  forJobRoleTitles  String[]       // Filter op functies
  // ... meer velden
}
```

#### **TaskAssignment**
```prisma
model TaskAssignment {
  id            String
  entityId      String?          // null = globaal
  taskType      TaskType
  assignedToId  String           // Verantwoordelijke user ID
  notifyChannel NotificationChannelType  // IN_APP, EMAIL, BOTH
  // ... meer velden
  @@unique([entityId, taskType])  // Per entiteit+type 1 verantwoordelijke
}
```

#### **Notification**
```prisma
model Notification {
  id          String
  userId      String           // Ontvanger
  type        String          // TASK_ASSIGNED, TASK_COMPLETED, etc.
  title       String
  message     String
  taskId      String?         // Link naar taak
  starterId   String?         // Link naar starter
  linkUrl     String?         // Navigatie link
  isRead      Boolean
  readAt      DateTime?
  createdAt   DateTime
}
```

### **API Endpoints**

#### **Taken**
- `GET /api/tasks` - Lijst van taken (met filters)
- `GET /api/tasks/[id]` - Specifieke taak
- `POST /api/tasks` - Nieuwe taak aanmaken
- `PATCH /api/tasks/[id]` - Taak updaten
- `DELETE /api/tasks/[id]` - Taak verwijderen
- `POST /api/tasks/[id]/complete` - Taak voltooien

#### **Notificaties**
- `GET /api/notifications` - Mijn notificaties
- `POST /api/notifications/[id]/read` - Markeer als gelezen
- `POST /api/notifications/mark-all-read` - Alle als gelezen

#### **Admin**
- `GET /api/admin/task-assignments` - Alle assignments
- `POST /api/admin/task-assignments` - Upsert assignment
- `DELETE /api/admin/task-assignments/[id]` - Verwijder assignment

### **Automatische Taak Creatie**

**Bestand:** `lib/task-automation.ts`

**Functie:** `createAutomaticTasks(starter)`

**Flow:**
1. Haal actieve task templates op
2. Filter templates op basis van entiteit/functie
3. Voor elke template:
   - Vervang variabelen in titel/beschrijving
   - Bereken deadline (startDate + daysUntilDue)
   - Zoek verantwoordelijke (entiteit-specifiek → globaal)
   - Maak taak aan
   - Maak notificatie aan
   - Verstuur email (als ingesteld)

**Aangeroepen in:** `app/api/starters/route.ts` → `POST` endpoint

---

## 📊 Monitoring & Rapportage

### **Dashboard**
- Widget "Mijn Openstaande Taken"
- Urgente taken bovenaan
- Quick link naar volledige taken pagina

### **Audit Log**
Alle taak acties worden gelogd in audit log:
- `TASK_CREATED` - Taak aangemaakt
- `TASK_UPDATED` - Taak gewijzigd
- `TASK_COMPLETED` - Taak voltooid
- `TASK_DELETED` - Taak verwijderd
- `TASK_ASSIGNMENT_UPDATED` - Verantwoordelijke gewijzigd

**Navigeer naar:** `/admin/audit-log`

---

## 🔒 Beveiliging & Permissions

### **Rollen**

#### **HR_ADMIN**
- ✅ Alle taken zien en beheren
- ✅ Taak verantwoordelijken configureren
- ✅ Task templates beheren (toekomstig)

#### **ENTITY_EDITOR**
- ✅ Taken zien van eigen entiteiten
- ✅ Taken voltooien die aan hem/haar toegewezen zijn

#### **ENTITY_VIEWER**
- ✅ Taken bekijken (read-only)

#### **GLOBAL_VIEWER**
- ✅ Alle taken bekijken (read-only)

### **API Security**
- Alle endpoints requireren authenticatie
- RBAC controles op entity-niveau
- Taken kunnen alleen door toegewezen persoon of admin worden voltooid

---

## 🎓 Best Practices

### **Voor Administrators**

1. **Start met Globale Verantwoordelijken**
   - Stel eerst default verantwoordelijken in voor alle taak types
   - Overschrijf daarna per entiteit waar nodig

2. **Notificatie Kanalen**
   - **Beiden (In-app + Email)** - Voor urgente taken
   - **Alleen Email** - Voor minder urgente taken
   - **Alleen In-app** - Voor informatie taken

3. **Review Regelmatig**
   - Check of verantwoordelijken nog actueel zijn
   - Pas aan bij team wijzigingen

### **Voor Verantwoordelijken**

1. **Check Notificaties Dagelijks**
   - Kijk naar bel-icoon in navbar
   - Check email voor nieuwe taken

2. **Update Status**
   - Zet taak op "Bezig" wanneer je begint
   - Zet op "Geblokkeerd" als je wacht op iets
   - Markeer als "Voltooid" zodra klaar

3. **Voeg Notities Toe**
   - Bij voltooiing: Voeg relevante info toe
   - Bij blokkering: Vermeld waarom

4. **Let Op Deadlines**
   - Urgente taken eerst
   - Hoge prioriteit taken snel oppakken

---

## 🚨 Troubleshooting

### **Taken worden niet automatisch aangemaakt**

**Mogelijke oorzaken:**
1. Geen actieve task templates
2. Templates matchen niet met entiteit/functie
3. Fout in task-automation script

**Oplossing:**
- Check console logs in Easypanel
- Zoek naar: `✅ Created X automatic tasks`
- Als 0 tasks: Check template configuratie

### **Notificaties worden niet verzonden**

**Mogelijke oorzaken:**
1. Geen verantwoordelijke gevonden
2. SendGrid niet correct geconfigureerd
3. Notificatie kanaal op "Alleen In-app"

**Oplossing:**
- Check task assignments configuratie
- Verify SendGrid settings in `/admin/mail-test`
- Check audit log voor task creation

### **Verantwoordelijke ontvangt geen email**

**Mogelijke oorzaken:**
1. Notificatie kanaal staat niet op "Email" of "Beiden"
2. SendGrid API key niet geldig
3. Email in spam terecht gekomen

**Oplossing:**
- Check task assignment notificatie kanaal
- Test SendGrid via `/admin/mail-test`
- Whitelist `SENDGRID_FROM_EMAIL` in email client

---

## 🔮 Toekomstige Features

### **Geplanned**
- ✨ Admin interface voor Task Templates
- 📊 Taak rapportage & analytics
- 🔔 Herinneringen voor bijna verlopen deadlines
- 📎 Bijlagen toevoegen aan taken
- 💬 Commentaar systeem op taken
- 🔄 Recurring taken
- 📧 Email reply-to voor taak updates
- 🎯 Taak dependencies (blokkeer taak B tot taak A voltooid)
- 📱 Push notificaties (PWA)

---

## 📞 Support

Bij vragen of problemen:
- Check deze documentatie
- Review code comments in `lib/task-automation.ts`
- Check audit log voor debug info
- Contacteer systeembeheerder

---

**Versie:** 1.0  
**Laatst bijgewerkt:** November 2025  
**Gemaakt voor:** HRBoarding Starterskalender

