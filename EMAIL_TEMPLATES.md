# Email Templates - Documentatie

## 📧 Overzicht

De applicatie heeft 4 professionele email templates voor geautomatiseerde notificaties:

1. **🔔 Wekelijkse Reminder** - 7 dagen voor startdatum
2. **📊 Maandoverzicht** - Eerste van de maand
3. **📈 Kwartaaloverzicht** - Eerste dag van het kwartaal
4. **🎉 Jaaroverzicht** - 1 januari

Alle templates zijn:
- ✅ **Responsive** - Werken op desktop en mobiel
- ✅ **Professional** - Modern design met gradient headers
- ✅ **Digest format** - Meerdere entiteiten in 1 email
- ✅ **Bewerkbaar** - Via admin panel aanpasbaar

---

## 🚀 Templates Activeren

### Stap 1: Push Database Schema

```bash
npx prisma db push
```

### Stap 2: Seed Email Templates

```bash
npm run db:seed-templates
```

### Stap 3: Verificatie

Ga naar `/admin/email-templates` en check of alle 4 templates er staan.

---

## 📋 Template Details

### 1️⃣ Wekelijkse Reminder

**Wanneer:** Dagelijks om 09:00 UTC  
**Criteria:** Starters die over exact 7 dagen beginnen  
**Formaat:** Digest (alle entiteiten in 1 email per user)

**Design:**
- Blauwe accent kleur (#3b82f6)
- Clean header met 🔔 icoon
- Gegroepeerd per entiteit
- Tip box met voorbereidingen

**Subject:** `🔔 Wekelijkse Reminder - Aankomende Starters`

**Beschikbare Variabelen:**
- `{{userName}}` - Naam van ontvanger
- `{{startersList}}` - HTML lijst (gegenereerd door cron job)
- `{{appUrl}}` - Link naar applicatie

**Voorbeeld Use Case:**
```
🔔 Wekelijkse Reminder - Aankomende Starters

Hallo Kevin,

De volgende starters beginnen volgende week...

Entiteit Noord (2)
- Jan Jansen 🇳🇱 | Sales Manager | Start: 3 november
- Piet Peters 🇳🇱 | Developer | Start: 5 november

💡 TIP: Controleer of alle materialen klaar zijn
```

---

### 2️⃣ Maandoverzicht

**Wanneer:** 1e van de maand om 10:00 UTC  
**Criteria:** Alle starters uit vorige maand  
**Formaat:** Digest (alle entiteiten in 1 email per user)

**Design:**
- Paarse gradient header (#667eea → #764ba2)
- Stats section met totalen
- Success indicator box

**Subject:** `📊 Maandoverzicht - [maand jaar]`

**Beschikbare Variabelen:**
- `{{userName}}` - Naam van ontvanger
- `{{period}}` - Periode (bijv. "december 2025")
- `{{startersList}}` - HTML lijst gegroepeerd per entiteit
- `{{appUrl}}` - Link naar applicatie

**Voorbeeld Use Case:**
```
📊 Maandoverzicht - december 2025

Hallo Kevin,

Hier is je maandelijkse samenvatting van alle nieuwe starters.

Entiteit Noord (5 starters)
- [Lijst van 5 starters]

Entiteit Midden (3 starters)
- [Lijst van 3 starters]

📈 Succesvol: Alle onboardings afgerond in december 2025
```

---

### 3️⃣ Kwartaaloverzicht

**Wanneer:** 1 jan/apr/jul/okt om 11:00 UTC  
**Criteria:** Alle starters uit vorig kwartaal  
**Formaat:** Digest (alle entiteiten in 1 email per user)

**Design:**
- Groene gradient header (#10b981 → #059669)
- Kwartaal statistieken
- Growth indicator box

**Subject:** `📈 Kwartaaloverzicht - Q[1-4] [jaar]`

**Beschikbare Variabelen:**
- `{{userName}}` - Naam van ontvanger
- `{{period}}` - Periode (bijv. "Q4 2025")
- `{{startersList}}` - HTML lijst gegroepeerd per entiteit
- `{{appUrl}}` - Link naar applicatie

**Voorbeeld Use Case:**
```
📈 Kwartaaloverzicht - Q4 2025

Hallo Kevin,

Een kijkje terug op Q4 2025!

Totaal: 15 nieuwe starters

Per entiteit:
- Noord: 8 starters
- Midden: 4 starters
- Oost: 3 starters

🎯 Kwartaaldoelstellingen: Op schema met de groeiplannen
```

---

### 4️⃣ Jaaroverzicht

**Wanneer:** 1 januari om 12:00 UTC  
**Criteria:** Alle starters uit vorig jaar  
**Formaat:** Digest met maandelijkse statistieken

**Design:**
- Oranje/rode gradient header (#f59e0b → #dc2626)
- Meest uitgebreide template
- Maandelijkse breakdown
- Feestelijk design met badges
- Success banner

**Subject:** `🎉 Jaaroverzicht - [jaar]`

**Beschikbare Variabelen:**
- `{{userName}}` - Naam van ontvanger
- `{{period}}` - Jaar (bijv. "2025")
- `{{startersList}}` - HTML lijst gegroepeerd per entiteit
- `{{statsHtml}}` - Maandelijkse statistieken (gegenereerd door cron)
- `{{appUrl}}` - Link naar applicatie

**Voorbeeld Use Case:**
```
🎉 Jaaroverzicht 2025

Beste Kevin,

Het jaar 2025 zit erop! Tijd voor een terugblik...

📊 Statistieken per Maand
Jan: 5  Feb: 3  Mrt: 4  Apr: 2  Mei: 3  Jun: 2
Jul: 1  Aug: 4  Sep: 3  Okt: 2  Nov: 2  Dec: 1

📋 Alle Starters van 2025
[Volledige lijst per entiteit]

🏆 Gefeliciteerd met een succesvol jaar!
```

---

## 🎨 Design System

### Kleuren

**Weekly Reminder:**
- Primary: `#3b82f6` (Blue)
- Background: `#eff6ff` (Light Blue)

**Monthly Summary:**
- Primary: `#667eea` → `#764ba2` (Purple Gradient)
- Accent: `#15803d` (Green)

**Quarterly Summary:**
- Primary: `#10b981` → `#059669` (Green Gradient)
- Accent: `#047857` (Dark Green)

**Yearly Summary:**
- Primary: `#f59e0b` → `#dc2626` (Orange/Red Gradient)
- Accent: `#78350f` (Dark Yellow)

### Typography

- Headers: 28-32px, Bold
- Body: 16px, Line-height 1.6
- Footer: 12px, Muted

### Layout

- Max width: 600px
- Padding: 40px
- Border radius: 8px
- Shadow: 0 2px 4px rgba(0,0,0,0.1)

---

## ✏️ Templates Aanpassen

### Via Admin Panel (Aanbevolen)

1. Ga naar `/admin/email-templates`
2. Klik op een template
3. Edit subject of body
4. Gebruik variabelen: `{{variableName}}`
5. Preview in browser
6. Save

### Via Code (Voor Developers)

Edit `lib/email-template-engine.ts`:

```typescript
export const DEFAULT_TEMPLATES = {
  WEEKLY_REMINDER: {
    subject: 'Jouw custom subject',
    body: `<html>...</html>`,
  },
  // ...
}
```

Dan run:
```bash
npm run db:seed-templates
```

⚠️ **Waarschuwing:** Overschrijft bestaande templates niet automatisch!

---

## 🧪 Templates Testen

### Methode 1: Via Cron API Route (Aanbevolen)

```bash
# Test weekly reminder
curl http://localhost:3000/api/cron/send-weekly-reminders

# Test monthly summary
curl http://localhost:3000/api/cron/send-monthly-summary

# Test quarterly summary
curl http://localhost:3000/api/cron/send-quarterly-summary

# Test yearly summary
curl http://localhost:3000/api/cron/send-yearly-summary
```

### Methode 2: Via Admin Panel

1. Ga naar `/admin/mail-test`
2. Selecteer een template type
3. Verstuur test email
4. Check je inbox

### Methode 3: Via Prisma Studio

```bash
npm run db:studio
```

1. Open `EmailTemplate` tabel
2. View/edit templates
3. Check `isActive` status

---

## 🔧 Troubleshooting

### Template Niet Zichtbaar in Admin Panel

**Check:**
```bash
npm run db:studio
```

Ga naar `EmailTemplate` tabel - moeten 4 records zijn.

**Fix:**
```bash
npm run db:seed-templates
```

### Email Wordt Niet Verstuurd

**Check:**
1. Template `isActive` = true
2. User heeft notificaties enabled voor die entiteit
3. SendGrid API key is correct
4. Cron job draait (check Easypanel logs)

**Debug:**
```bash
# In Easypanel terminal:
curl http://localhost:3000/api/cron/send-weekly-reminders
# Check de response
```

### Variabelen Niet Vervangen

**Probleem:** `{{userName}}` blijft letterlijk staan in email

**Oorzaak:** Variabele niet correct gegenereerd door cron job

**Check:** `lib/email-template-engine.ts` - functie `renderEmailTemplate`

### Styling Niet Correct in Email Client

**Oorzaak:** Sommige email clients strippen CSS

**Fix:** Gebruik inline styles (al gedaan in templates)

**Test in:** Gmail, Outlook, Apple Mail

---

## 📊 Statistieken

### Email Verzending Tracking

Check `AuditLog` tabel:
```sql
SELECT * FROM AuditLog 
WHERE action = 'SEND_MAIL' 
ORDER BY createdAt DESC 
LIMIT 100;
```

### Meest Populaire Template

```sql
SELECT 
  JSON_EXTRACT(meta, '$.type') as template_type,
  COUNT(*) as count
FROM AuditLog 
WHERE action = 'SEND_MAIL'
GROUP BY template_type;
```

---

## 🚀 Deployment Checklist

Voordat je deploy:

- [ ] `npx prisma db push` gedraaid
- [ ] `npm run db:seed-templates` gedraaid
- [ ] Email templates getest via `/admin/mail-test`
- [ ] SendGrid API key geconfigureerd
- [ ] Cron jobs geconfigureerd in Easypanel
- [ ] Timezone op `Europe/Brussels`
- [ ] Test emails ontvangen en geverifieerd

---

## 💡 Best Practices

1. **Test Eerst Lokaal:** Run cron jobs lokaal voor je deploy
2. **Gebruik Preview:** Admin panel heeft preview functie
3. **Backup Templates:** Voor grote wijzigingen, maak eerst een backup
4. **Gradual Rollout:** Test met 1 user voor je naar iedereen stuurt
5. **Monitor Logs:** Check Easypanel logs na elke cron run
6. **A/B Testing:** Maak een template copy en test varianten

---

## 📖 Variabelen Referentie

### Altijd Beschikbaar
- `{{userName}}` - Naam van ontvanger
- `{{userEmail}}` - Email van ontvanger  
- `{{appUrl}}` - Base URL van applicatie

### Context-Specific
- `{{startersList}}` - Gegenereerde HTML lijst
- `{{period}}` - Tijd periode (maand/kwartaal/jaar)
- `{{statsHtml}}` - Statistieken (alleen yearly)

### Dynamic Variables (Gegenereerd door Cron)
Zie `lib/email-template-engine.ts` voor complete lijst.

---

## 🎯 Roadmap

**Geplande Features:**
- [ ] Email A/B testing
- [ ] Click tracking
- [ ] Open rate analytics
- [ ] Template versioning
- [ ] Multi-language templates (NL/FR switch)
- [ ] Rich text editor in admin panel
- [ ] Email preview met test data
- [ ] Schedule preview (zie email voor volgende maand)

---

## 📞 Support

**Vragen over templates?**
- Check de code: `lib/email-template-engine.ts`
- Check de schema: `prisma/schema.prisma` → `EmailTemplate` model
- Check de docs: `NOTIFICATIONS_SETUP.md`

**Email niet ontvangen?**
1. Check spam folder
2. Check SendGrid dashboard
3. Check Easypanel logs
4. Check `AuditLog` tabel voor verzonden emails

