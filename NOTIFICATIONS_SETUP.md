# Email Notificatie Systeem - Setup Guide

## Overzicht

Het notificatiesysteem verstuurt automatisch emails naar gebruikers op basis van hun voorkeuren:

- 🔔 **Wekelijkse Reminder**: 1 week voor de startdatum
- 📊 **Maandelijks Overzicht**: Eerste dag van de maand
- 📈 **Kwartaal Overzicht**: Eerste dag van het nieuwe kwartaal
- 🎉 **Jaarlijks Overzicht**: 1 januari

## ✨ Email Strategie: Gecombineerde Digest

**Alle emails zijn gecombineerd per user voor minimale inbox clutter.**

### Hoe het werkt

**Per User:**
- Systeem verzamelt ALLE starters van ALLE entiteiten waar de user toegang tot heeft
- Groepeert per entiteit binnen de email
- Verstuurt **1 gecombineerde email** in plaats van meerdere aparte emails

**Voorbeeld:**

**❌ Oude aanpak (veel emails):**
```
📧 Email 1: "2 starters volgende week bij Entiteit Noord"
📧 Email 2: "1 starter volgende week bij Entiteit Midden"
📧 Email 3: "3 starters volgende week bij Entiteit Oost"
```

**✅ Nieuwe aanpak (1 email):**
```
📧 Email 1: "6 starters beginnen volgende week"

Entiteit Noord (2)
- Jan Jansen 🇳🇱 | Sales Manager | Start: 3 nov
- Piet Peters 🇳🇱 | Developer | Start: 5 nov

Entiteit Midden (1)
- Marie Martens 🇫🇷 | HR Manager | Start: 6 nov

Entiteit Oost (3)
- ...
```

### Voordelen

✅ **Minder emails** - 1 digest per dag/maand/kwartaal/jaar  
✅ **Overzichtelijk** - Alle info op 1 plek  
✅ **Gegroepeerd** - Per entiteit georganiseerd  
✅ **Schaalbaar** - Werkt goed met 1 of 100 entiteiten  

## Database Migratie

**Stap 1: Push schema naar database**

```bash
npx prisma db push
```

Dit maakt de volgende models aan:
- `NotificationPreference` - User voorkeuren per entiteit
- `EmailTemplate` - Editable email templates

## Email Templates Setup

### Default Templates

Het systeem gebruikt default templates als er geen in de database staan. Deze zijn gedefinieerd in `lib/email-template-engine.ts`.

### Custom Templates Aanmaken

1. Log in als HR_ADMIN
2. Ga naar **Admin → Email Templates**
3. Klik **Nieuw Template**
4. Selecteer type en vul subject/body in
5. Gebruik variabelen: `{{variableName}}`

### Beschikbare Variabelen

**Wekelijkse Reminder:**
- `{{userName}}` - Naam ontvanger
- `{{userEmail}}` - Email ontvanger
- `{{starterName}}` - Naam starter
- `{{starterRole}}` - Functie starter
- `{{starterStartDate}}` - Startdatum (volledig geformatteerd)
- `{{starterLanguage}}` - Taal (Nederlands/Frans)
- `{{entityName}}` - Entiteitnaam

**Maandelijks/Kwartaal/Jaarlijks:**
- `{{userName}}` - Naam ontvanger
- `{{userEmail}}` - Email ontvanger
- `{{entityName}}` - Entiteitnaam
- `{{period}}` - Periode (bv. "december 2025", "Q4 2025", "2025")
- `{{totalStarters}}` - Aantal starters
- `{{startersList}}` - HTML lijst van starters
- `{{statsHtml}}` - Optionele statistieken (alleen yearly)

## Cron Jobs Configureren in Easypanel

### Stap 1: Ga naar Service Settings

1. Selecteer je `starterskalender` service in Easypanel
2. Ga naar **Settings**
3. Scroll naar **Cron Jobs** sectie

### Stap 2: Voeg Cron Jobs Toe

#### 1. Wekelijkse Reminder (Dagelijks om 8:00 AM)

```
Schedule: 0 8 * * *
URL: https://jouw-domain.be/api/cron/send-weekly-reminders
```

**Wat het doet:**
- Draait elke dag om 8:00 AM (Brussels tijd)
- Zoekt starters die over exact 7 dagen beginnen
- Verstuurt reminder naar users met `weeklyReminder: true`

#### 2. Maandelijks Overzicht (1e van maand om 9:00 AM)

```
Schedule: 0 9 1 * *
URL: https://jouw-domain.be/api/cron/send-monthly-summary
```

**Wat het doet:**
- Draait op 1e dag van elke maand om 9:00 AM
- Verzamelt alle starters van vorige maand
- Verstuurt summary naar users met `monthlySummary: true`

#### 3. Kwartaal Overzicht (1e dag nieuw kwartaal om 10:00 AM)

```
Schedule: 0 10 1 1,4,7,10 *
URL: https://jouw-domain.be/api/cron/send-quarterly-summary
```

**Wat het doet:**
- Draait op 1 januari, 1 april, 1 juli, 1 oktober om 10:00 AM
- Verzamelt alle starters van vorig kwartaal
- Verstuurt summary naar users met `quarterlySummary: true`

#### 4. Jaarlijks Overzicht (1 januari om 11:00 AM)

```
Schedule: 0 11 1 1 *
URL: https://jouw-domain.be/api/cron/send-yearly-summary
```

**Wat het doet:**
- Draait op 1 januari om 11:00 AM
- Verzamelt alle starters van vorig jaar
- Genereert maandelijkse statistieken
- Verstuurt summary naar users met `yearlySummary: true`

### Timezone Instelling

⚠️ **Belangrijk**: Zorg dat de timezone in Easypanel op **Europe/Brussels** staat.

Check environment variabele:
```
TZ=Europe/Brussels
```

## Cron Schedule Format

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
* * * * *
```

**Voorbeelden:**
- `0 8 * * *` - Dagelijks om 8:00 AM
- `0 9 1 * *` - Eerste van elke maand om 9:00 AM
- `0 10 1 1,4,7,10 *` - 1 jan/apr/jul/okt om 10:00 AM
- `0 11 1 1 *` - 1 januari om 11:00 AM

## User Voorkeuren

### Voor Gebruikers

1. Klik op **Profiel** in de navbar
2. Zie alle entiteiten waar je toegang tot hebt
3. Toggle notificaties per type per entiteit
4. Wijzigingen worden automatisch opgeslagen

### Voor Admins

**Notification Logica:**
- HR_ADMIN krijgt **altijd** notificaties voor alle entiteiten (tenzij expliciet uitgeschakeld)
- Andere users krijgen alleen notificaties voor entiteiten met:
  - Een `Membership` record
  - EN een `NotificationPreference` record met de betreffende toggle op `true`

**Default Settings:**
- Bij nieuwe membership worden automatisch preferences aangemaakt
- Alle toggles staan standaard op `true`
- Users kunnen zelf hun voorkeuren aanpassen

## Testing

### Handmatig Testen van Cron Jobs

Je kunt cron jobs handmatig testen door de URL te bezoeken:

```bash
# Weekly reminder
curl https://jouw-domain.be/api/cron/send-weekly-reminders

# Monthly summary
curl https://jouw-domain.be/api/cron/send-monthly-summary

# Quarterly summary
curl https://jouw-domain.be/api/cron/send-quarterly-summary

# Yearly summary
curl https://jouw-domain.be/api/cron/send-yearly-summary
```

**Response Format:**
```json
{
  "message": "Weekly reminders sent",
  "sent": 3,
  "starters": 2,
  "errors": []
}
```

### Email Test

Gebruik **Admin → E-mail Test** om je SendGrid configuratie te testen.

## Troubleshooting

### Geen Emails Ontvangen?

1. **Check SendGrid configuratie**
   - `SENDGRID_API_KEY` correct?
   - `SENDGRID_FROM_EMAIL` geverifieerd?

2. **Check notification preferences**
   - Ga naar Profiel
   - Controleer of toggles aan staan
   - HR_ADMIN: Preferences worden automatisch aangemaakt

3. **Check cron job logs**
   - Easypanel → Service → Logs
   - Zoek naar "send-weekly-reminders" etc.
   - Check voor errors

4. **Check audit log**
   - Admin → Audit Log
   - Filter op `SEND_MAIL`
   - Zie wie emails heeft ontvangen

### Emails Gaan Naar Spam?

1. **SPF Record**: Voeg SendGrid toe aan je DNS
2. **DKIM**: Configureer in SendGrid
3. **Domain Authentication**: Gebruik geverifieerd domein

### Cron Jobs Draaien Niet?

1. **Check Easypanel cron configuratie**
   - Settings → Cron Jobs
   - Controleer URL en schedule

2. **Check timezone**
   - `TZ=Europe/Brussels` in environment

3. **Check service logs**
   - Easypanel → Logs
   - Filter op tijd van scheduled run

## Security

### API Route Protection

Cron endpoints zijn **publiekelijk toegankelijk** (geen auth required) omdat Easypanel cron geen auth headers kan meesturen.

**Best Practices:**
- Use een secret token in URL of header (optioneel)
- Monitor audit logs voor misbruik
- Rate limiting op cron endpoints

**Voorbeeld met Secret:**
```typescript
// In cron route
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')
  
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // ... rest of logic
}
```

Easypanel cron URL:
```
https://jouw-domain.be/api/cron/send-weekly-reminders?secret=your-secret-here
```

## Audit Logging

Alle verzonden emails worden gelogd in de `AuditLog` tabel:

**Action:** `SEND_MAIL`  
**Target:** `Starter:id` of `Entity:id`  
**Meta:**
```json
{
  "type": "WEEKLY_REMINDER",
  "recipient": "user@example.com",
  "starter": "John Doe",
  "startDate": "2025-12-01"
}
```

## Veelgestelde Vragen

### Kan ik notificaties pauzeren?

Ja, op twee manieren:
1. **User level**: Toggle uitschakelen in Profiel
2. **Template level**: Template deactiveren in Admin → Email Templates

### Krijg ik notificaties voor alle entiteiten?

- **HR_ADMIN**: Ja, voor alle entiteiten
- **Andere roles**: Alleen voor entiteiten met membership

### Kan ik de email inhoud aanpassen?

Ja! Ga naar **Admin → Email Templates** en bewerk de templates. Gebruik HTML en variabelen.

### Wanneer worden default preferences aangemaakt?

Automatisch bij:
- Nieuwe membership toekennen
- Eerste keer Profiel pagina bezoeken

### Wat als er geen starters zijn?

Geen email wordt verstuurd. Cron job returnt:
```json
{
  "message": "No starters in previous month",
  "sent": 0
}
```

## Ondersteuning

Voor vragen of problemen:
1. Check deze documentatie
2. Check audit logs
3. Check Easypanel service logs
4. Test handmatig via curl

---

✅ **Setup Compleet!** Je notificatiesysteem is nu operationeel.

