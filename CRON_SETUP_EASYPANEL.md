# 🔧 Cron Jobs Setup voor Easypanel

## 📋 Overzicht

De Starterskalender heeft 4 geautomatiseerde email cron jobs:

| Job | Schedule | Beschrijving |
|-----|----------|--------------|
| **Wekelijkse Reminder** | Dagelijks 08:00 | Starters die over 7 dagen beginnen |
| **Maandoverzicht** | 1e van maand 09:00 | Alle starters van vorige maand |
| **Kwartaaloverzicht** | 1e van kwartaal 10:00 | Overzicht vorig kwartaal |
| **Jaaroverzicht** | 1 januari 11:00 | Volledig overzicht vorig jaar |

---

## ⚙️ Stap 1: Generate CRON_SECRET

De cron endpoints zijn beveiligd met een `CRON_SECRET`. Genereer deze als volgt:

```bash
# Op je lokale machine of in de Easypanel terminal
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Output bijvoorbeeld:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

**Bewaar deze secret goed!** Je hebt hem straks nodig.

---

## ⚙️ Stap 2: Environment Variables in Easypanel

Ga naar je app in Easypanel → **Environment Variables** en voeg toe:

### **Verplichte Variabelen:**

```bash
# Cron Job Security
CRON_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6

# Timezone (belangrijk!)
TZ=Europe/Brussels

# SendGrid (voor emails)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@jouwdomein.be
MAIL_REPLY_TO=hr@jouwdomein.be

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db?schema=public

# NextAuth
NEXTAUTH_URL=https://jouw-app.easypanel.app
NEXTAUTH_SECRET=xxx
```

### **Belangrijke Notes:**

1. **CRON_SECRET:** 
   - Gebruik de secret die je in Stap 1 genereerde
   - Deel deze NOOIT publiekelijk
   - Uniek per environment (dev/prod)

2. **TZ (Timezone):**
   - **Essentieel!** Zonder deze draait cron in UTC
   - `TZ=Europe/Brussels` → Cron draait op Belgische tijd
   - Zonder: 08:00 cron = 06:00 Brussels in winter, 07:00 in zomer

3. **SendGrid:**
   - Zorg dat sender geauthenticeerd is
   - Check IP whitelisting in SendGrid

---

## ⚙️ Stap 3: Rebuild App

Na het toevoegen van environment variables:

1. **Easypanel → Je App → Rebuild**
2. Wacht tot deployment compleet is
3. Check logs voor `🚀 Starting Starterskalender...`

---

## ✅ Stap 4: Verificatie

### **4.1 Check of Cron Daemon Draait**

**Easypanel Terminal:**
```bash
ps aux | grep crond
```

**Verwacht:**
```
1 root crond -b -l 2
```

---

### **4.2 Check Crontab**

```bash
crontab -l
```

**Verwacht:**
```
0 8 * * * curl -f -H "Authorization: Bearer ${CRON_SECRET}" http://localhost:3000/api/cron/send-weekly-reminders > /proc/1/fd/1 2>&1
0 9 1 * * curl -f -H "Authorization: Bearer ${CRON_SECRET}" http://localhost:3000/api/cron/send-monthly-summary > /proc/1/fd/1 2>&1
0 10 1 1,4,7,10 * curl -f -H "Authorization: Bearer ${CRON_SECRET}" http://localhost:3000/api/cron/send-quarterly-summary > /proc/1/fd/1 2>&1
0 11 1 1 * curl -f -H "Authorization: Bearer ${CRON_SECRET}" http://localhost:3000/api/cron/send-yearly-summary > /proc/1/fd/1 2>&1
```

---

### **4.3 Test Handmatig (Aanbevolen!)**

**In Easypanel Terminal:**

```bash
# Test met CRON_SECRET
curl -H "Authorization: Bearer jouw-cron-secret-hier" \
     http://localhost:3000/api/cron/send-weekly-reminders
```

**Verwacht Succesvolle Response:**
```json
{
  "success": true,
  "message": "Weekly reminders sent",
  "emailsSent": 3,
  "usersNotified": ["user1@example.com", "user2@example.com"],
  "timestamp": "2025-11-12T08:00:00.000Z"
}
```

**Foutmelding als Secret Verkeerd:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing CRON_SECRET..."
}
```

---

### **4.4 Test Zonder Secret (Security Check)**

```bash
# Test ZONDER Authorization header (moet falen!)
curl http://localhost:3000/api/cron/send-weekly-reminders
```

**Verwacht:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing CRON_SECRET..."
}
```

**✅ Als je deze error krijgt, werkt de beveiliging correct!**

---

### **4.5 Check Timezone**

```bash
date
```

**Verwacht:**
```
Tue Nov 12 10:30:45 CET 2025
```

**Als UTC:** Voeg `TZ=Europe/Brussels` toe aan environment variables en rebuild.

---

## 📊 Monitoring

### **Via Audit Log:**

1. Ga naar: `https://jouw-app.com/admin/audit`
2. Filter op "cron" of "email"
3. Check:
   - Timestamps (moet 08:00, 09:00, etc zijn)
   - Success rate
   - Errors

**Voorbeeld Audit Entries:**
```
[2025-11-12 08:00:15] INFO  Weekly reminders sent - 3 emails
[2025-11-01 09:00:22] INFO  Monthly summary sent - 5 emails
[2025-11-01 10:00:10] INFO  Quarterly summary sent - 2 emails
```

---

### **Via Easypanel Logs:**

**Easypanel → App → Logs:**

Zoek naar:
```
📅 Starting cron daemon...
🌐 Starting Next.js server as nextjs user...
```

En later (bij cron execution):
```
{\"success\":true,\"message\":\"Weekly reminders sent\",\"emailsSent\":3}
```

---

## 🐛 Troubleshooting

Als cron jobs niet werken, zie: **[CRON_TROUBLESHOOTING.md](./CRON_TROUBLESHOOTING.md)**

**Quick Checklist:**

- [ ] `CRON_SECRET` environment variable ingesteld
- [ ] `TZ=Europe/Brussels` ingesteld
- [ ] `SENDGRID_API_KEY` geconfigureerd
- [ ] `SENDGRID_FROM_EMAIL` verified in SendGrid
- [ ] App ge-rebuild na env changes
- [ ] Cron daemon draait (`ps aux | grep crond`)
- [ ] Handmatige test succesvol
- [ ] Timezone correct (`date` toont CET/CEST)

---

## 🔐 Security Best Practices

### **1. CRON_SECRET Beheer**

❌ **Niet Doen:**
```
# In code hardcoded
const CRON_SECRET = 'mijn-geheime-secret'
```

✅ **Wel Doen:**
```
# Environment variable
CRON_SECRET=<random-64-char-hex>
```

### **2. Separate Secrets per Environment**

```bash
# Development
CRON_SECRET=dev_a1b2c3d4...

# Production  
CRON_SECRET=prod_x9y8z7w6...
```

### **3. Rotate Secrets Periodically**

Elke 3-6 maanden:
1. Generate nieuwe secret
2. Update environment variable
3. Rebuild app
4. Old secret werkt niet meer

### **4. IP Whitelisting (Optioneel)**

Als extra beveiliging, limiteer toegang tot cron endpoints:

**In middleware of API route:**
```typescript
const allowedIPs = ['127.0.0.1', '::1', 'container-ip']
const clientIP = req.headers.get('x-forwarded-for') || 'unknown'

if (!allowedIPs.includes(clientIP)) {
  return Response.json({ error: 'Forbidden' }, { status: 403 })
}
```

---

## 📅 Cron Schedule Details

### **Wekelijkse Reminder (08:00 Dagelijks)**

```cron
0 8 * * *
│ │ │ │ │
│ │ │ │ └─ Dag van week (any)
│ │ │ └─── Maand (any)
│ │ └───── Dag van maand (any)
│ └─────── Uur (8 AM)
└───────── Minuut (0)
```

**Voorbeelden:**
- Ma 11 nov 08:00 → Check starters op ma 18 nov
- Di 12 nov 08:00 → Check starters op di 19 nov
- etc.

### **Maandoverzicht (09:00 op 1e)**

```cron
0 9 1 * *
│ │ │ │ │
│ │ │ │ └─ Dag van week (any)
│ │ │ └─── Maand (any)
│ │ └───── Dag van maand (1st)
│ └─────── Uur (9 AM)
└───────── Minuut (0)
```

**Voorbeelden:**
- 1 nov 09:00 → Overzicht oktober
- 1 dec 09:00 → Overzicht november

### **Kwartaaloverzicht (10:00 op 1e van Q)**

```cron
0 10 1 1,4,7,10 *
│ │  │ │        │
│ │  │ │        └─ Dag van week (any)
│ │  │ └────────── Maanden (jan/apr/jul/okt)
│ │  └───────────── Dag van maand (1st)
│ └──────────────── Uur (10 AM)
└─────────────────── Minuut (0)
```

**Voorbeelden:**
- 1 jan 10:00 → Q4 overzicht (okt-nov-dec)
- 1 apr 10:00 → Q1 overzicht (jan-feb-mrt)

### **Jaaroverzicht (11:00 op 1 jan)**

```cron
0 11 1 1 *
│ │  │ │ │
│ │  │ │ └─ Dag van week (any)
│ │  │ └─── Maand (januari)
│ │  └───── Dag van maand (1st)
│ └──────── Uur (11 AM)
└───────── Minuut (0)
```

**Voorbeeld:**
- 1 jan 2026 11:00 → Volledig overzicht 2025

---

## 🎯 Success!

Als alles werkt zie je:

✅ Cron daemon draait  
✅ Crontab correct geladen  
✅ Timezone op Brussels tijd  
✅ Handmatige test succesvol  
✅ Security check OK (zonder secret = 401)  
✅ Audit log toont executions  
✅ Emails worden verstuurd op geplande tijden  

**Klaar om te gebruiken!** 🎉

---

## 📞 Hulp Nodig?

Zie ook:
- [CRON_TROUBLESHOOTING.md](./CRON_TROUBLESHOOTING.md) - Problemen oplossen
- [NOTIFICATIONS_SETUP.md](./NOTIFICATIONS_SETUP.md) - Notification systeem uitleg
- [EMAIL_TEMPLATES.md](./EMAIL_TEMPLATES.md) - Email templates beheer

Of open een issue in de repository! 🙋‍♂️

