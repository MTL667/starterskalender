# 📋 Task Templates Setup Guide

## Overzicht

Dit document legt uit hoe je **task templates** configureert en hoe het automatische taaksysteem werkt.

---

## 🎯 Hoe Werkt Het?

### **Stap 1: Task Assignments (Configuratie)**
Via `/admin/task-assignments` configureer je **WIE** verantwoordelijk is:

```
IT_SETUP → Kevin Van Hoecke
HR_ADMIN → HR Coordinator  
FACILITIES → Office Manager
MANAGER_ACTION → Department Manager
```

### **Stap 2: Task Templates (Wat Wordt Aangemaakt)**
Task templates definiëren **WELKE** taken automatisch worden aangemaakt:

```
Template: "Email account aanmaken voor {{starterName}}"
- Type: IT_SETUP
- Priority: HIGH
- Deadline: 7 dagen voor startdatum
```

### **Stap 3: Automatische Taak Creatie**
Wanneer een nieuwe starter wordt aangemaakt:

```
Nieuwe Starter: Jan Janssens
Startdatum: 15 januari 2025

→ Systeem maakt automatisch taken aan:
  ✅ [IT_SETUP] Email account aanmaken voor Jan Janssens
     Toegewezen aan: Kevin Van Hoecke
     Deadline: 8 januari
     
  ✅ [IT_SETUP] Laptop voorbereiden voor Jan Janssens
     Toegewezen aan: Kevin Van Hoecke
     Deadline: 12 januari
     
  ✅ [HR_ADMIN] Contract klaarmaken voor Jan Janssens
     Toegewezen aan: HR Coordinator
     Deadline: 5 januari
```

---

## 🚀 Setup: Task Templates Toevoegen

### **Optie 1: Via Seed Script (Aanbevolen)**

**In Easypanel Terminal:**

```bash
# Run seed script
npm run db:seed-tasks
```

**Output:**
```
🌱 Seeding task templates...
✅ Created: Mailadres toewijzen aan {{starterName}}
✅ Created: Telefoonnummer toewijzen aan {{starterName}}
✅ Created: Betrokken materialen voorzien voor {{starterName}}

🎉 Seeding complete!
✅ Created: 3 task template(s)

📋 Templates in database:
   1. Mailadres toewijzen (IT_SETUP) - 7 dagen voor start
   2. Telefoonnummer toewijzen (IT_SETUP) - 5 dagen voor start
   3. Betrokken materialen voorzien (IT_SETUP) - 3 dagen voor start
```

**Dit script is idempotent** - je kan het meerdere keren runnen zonder duplicates te maken.

---

## 📋 Ingebouwde Task Templates

### **IT_SETUP (3 templates)**

1. **Mailadres toewijzen**
   - Priority: HIGH
   - Deadline: 7 dagen voor start
   - Beschrijving: Email account aanmaken in Azure AD / Microsoft 365
   - Details: 
     - Gebruikt het gewenste mailadres uit het starter profiel
     - Licentie toewijzen
     - Inloggegevens versturen
     - Account testen

2. **Telefoonnummer toewijzen**
   - Priority: HIGH
   - Deadline: 5 dagen voor start
   - Beschrijving: Telefoonnummer reserveren en configureren
   - Details:
     - Check beschikbare nummers
     - Configureer in telefooncentrale
     - Koppel aan email account voor voicemail
     - Test in- en uitgaande gesprekken

3. **Betrokken materialen voorzien**
   - Priority: HIGH
   - Deadline: 3 dagen voor start
   - Beschrijving: Alle benodigde materialen klaarzetten
   - Details:
     - Laptop/desktop met software
     - Monitor(en), toetsenbord, muis
     - Headset voor Teams
     - Mobiele telefoon indien nodig
     - Toegangsbadge
     - Zie materialen lijst in starter profiel
     - Vink af in systeem welke materialen verstrekt zijn

---

## 🔧 Template Variabelen

Templates kunnen variabelen bevatten die automatisch worden vervangen:

| Variabele | Voorbeeld Waarde | Beschrijving |
|-----------|------------------|--------------|
| `{{starterName}}` | "Jan Janssens" | Naam van de starter |
| `{{entityName}}` | "Antwerpen" | Naam van de entiteit |
| `{{roleTitle}}` | "Developer" | Functie titel |
| `{{startDate}}` | "15/01/2025" | Startdatum (geformatteerd) |
| `{{phoneNumber}}` | "+32 123 456 789" | Gewenst telefoonnummer |
| `{{desiredEmail}}` | "jan.janssens@company.com" | Gewenst email adres |

**Voorbeeld Template:**
```
Title: "Email account aanmaken voor {{starterName}}"
Description: "Maak een email account aan voor {{starterName}} ({{desiredEmail}})..."

→ Wordt:
Title: "Email account aanmaken voor Jan Janssens"
Description: "Maak een email account aan voor Jan Janssens (jan.janssens@company.com)..."
```

---

## 🎯 Complete Workflow Voorbeeld

### **Scenario: IT Manager Setup**

**1. Task Assignment Configureren:**
```
Ga naar: /admin/task-assignments

Voeg toe:
- Entiteit: Globaal (alle entiteiten)
- Taak Type: IT Setup
- Verantwoordelijke: Kevin Van Hoecke
- Notificatie: In-app + Email
→ Opslaan
```

**2. Task Templates Laden:**
```bash
# In Easypanel terminal
npm run db:seed-tasks
```

**3. Test met Nieuwe Starter:**
```
Ga naar: /starters

Klik: "Nieuwe Starter"

Vul in:
- Naam: Jan Janssens
- Entiteit: Antwerpen
- Functie: Developer
- Startdatum: 15 januari 2025
- Email: jan.janssens@company.com
- Telefoon: +32 123 456 789

→ Klik "Toevoegen"
```

**4. Check Resultaat:**

**Kevin ziet:**
- 🔔 **3 nieuwe notificaties** in bell icon
- 📧 **3 emails** in inbox
- 📊 **Dashboard widget** toont 3 taken

**Taken:**
```
✅ Mailadres toewijzen aan Jan Janssens
   Deadline: 8 januari (7 dagen voor start)
   Priority: HIGH
   Status: In wachtrij
   
✅ Telefoonnummer toewijzen aan Jan Janssens
   Deadline: 10 januari (5 dagen voor start)
   Priority: HIGH
   Status: In wachtrij
   
✅ Betrokken materialen voorzien voor Jan Janssens
   Deadline: 12 januari (3 dagen voor start)
   Priority: HIGH
   Status: In wachtrij
```

**5. Kevin Werkt Taken Af:**
```
Ga naar: /taken

Voor elke taak:
1. Klik op taak → Details openen
2. Voer uit (email account aanmaken, etc.)
3. Klik "Markeer als Voltooid"
4. Optioneel: Voeg notities toe
```

---

## 🔍 Troubleshooting

### **Probleem: Geen taken verschijnen na nieuwe starter**

**Check 1: Zijn er task templates?**
```sql
-- In Prisma Studio of database
SELECT * FROM "TaskTemplate" WHERE "isActive" = true;
```

Als leeg → Run `npm run db:seed-tasks`

**Check 2: Zijn task assignments geconfigureerd?**
```
Ga naar: /admin/task-assignments
Check of er assignments zijn voor de taak types
```

**Check 3: Check logs**
```
Easypanel → Logs
Zoek naar: "✅ Created X automatic tasks for starter"
```

### **Probleem: Tasks aan verkeerde persoon toegewezen**

**Oplossing:**
1. Ga naar `/admin/task-assignments`
2. Update de verantwoordelijke voor het taak type
3. Nieuwe starters zullen de nieuwe verantwoordelijke krijgen
4. Bestaande taken blijven bij oude verantwoordelijke (handmatig aan te passen)

### **Probleem: Template variabelen worden niet vervangen**

**Controle:**
```javascript
// In lib/task-automation.ts
function replaceVariables(text, variables) {
  // Moet alle {{variableName}} vervangen
}
```

Dit moet automatisch werken. Als niet → check logs voor errors.

---

## 🎨 Custom Templates Toevoegen (Toekomstig)

**Momenteel:** Templates via seed script  
**Toekomst:** Admin UI voor template management

**Handmatig toevoegen via Prisma Studio:**
```
Ga naar: Prisma Studio
Table: TaskTemplate

Voeg toe:
- type: "IT_SETUP"
- title: "Custom taak voor {{starterName}}"
- description: "Beschrijving..."
- priority: "HIGH"
- daysUntilDue: -7 (negatief = voor startdatum)
- isActive: true
- autoAssign: true
- forEntityIds: []  (leeg = alle entiteiten)
- forJobRoleTitles: [] (leeg = alle functies)
```

---

## 📊 Template Filters (Geavanceerd)

### **Per Entiteit:**
```javascript
{
  forEntityIds: ["entity-id-antwerpen", "entity-id-brussel"],
  // Deze template alleen voor Antwerpen en Brussel
}
```

### **Per Functie:**
```javascript
{
  forJobRoleTitles: ["Developer", "Senior Developer"],
  // Deze template alleen voor developers
}
```

### **Voorbeeld: Developer-specifieke Taken**
```javascript
{
  type: "IT_SETUP",
  title: "Git account aanmaken voor {{starterName}}",
  forJobRoleTitles: ["Developer", "Senior Developer", "Tech Lead"],
  // Alleen voor developers!
}
```

---

## 🔐 Permissions

**Task Templates maken/bewerken:**
- Alleen via seed script of Prisma Studio
- Geen UI (nog) voor template management

**Task Assignments configureren:**
- Alleen `HR_ADMIN` role
- Via `/admin/task-assignments`

**Taken bekijken/voltooien:**
- Alle users kunnen eigen taken zien
- Alleen toegewezen persoon kan voltooien

---

## 📚 Zie Ook

- `TASK_MANAGER.md` - Complete taakmanager documentatie
- `lib/task-automation.ts` - Automatische taak creatie logica
- `prisma/seed-task-templates.js` - Seed script code

---

**Questions?** Check de console logs of documentatie! 🚀

