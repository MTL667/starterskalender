# 📅 Cron Jobs Setup - Email Notifications

Dit document beschrijft hoe de automatische email notificaties werken in de Starterskalender app.

## 🕐 Email Verzendschema

### 1️⃣ Wekelijkse Reminder
- **Schedule:** Elke dag om 08:00 (Brussels tijd)
- **Cron:** `0 8 * * *`
- **Doel:** Verstuurt reminders voor starters die over **exact 7 dagen** beginnen
- **Endpoint:** `/api/cron/send-weekly-reminders`
- **Ontvangers:** Users met `weeklyReminder` enabled

**Voorbeeld:**
- Als iemand start op 7 november → mail op 31 oktober om 08:00

---

### 2️⃣ Maandelijks Overzicht
- **Schedule:** 1e dag van elke maand om 09:00
- **Cron:** `0 9 1 * *`
- **Doel:** Overzicht van alle starters van de **vorige maand**
- **Endpoint:** `/api/cron/send-monthly-summary`
- **Ontvangers:** Users met `monthlySummary` enabled

**Voorbeeld:**
- Op 1 november om 09:00 → overzicht van oktober

---

### 3️⃣ Kwartaaloverzicht
- **Schedule:** 1e dag van elk kwartaal om 10:00
  - Q1 (jan-mrt): 1 april
  - Q2 (apr-jun): 1 juli
  - Q3 (jul-sep): 1 oktober
  - Q4 (okt-dec): 1 januari
- **Cron:** `0 10 1 1,4,7,10 *`
- **Doel:** Overzicht van het **vorige kwartaal**
- **Endpoint:** `/api/cron/send-quarterly-summary`
- **Ontvangers:** Users met `quarterlySummary` enabled

---

### 4️⃣ Jaaroverzicht
- **Schedule:** 1 januari om 11:00
- **Cron:** `0 11 1 1 *`
- **Doel:** Volledig overzicht van het **vorige jaar**
- **Endpoint:** `/api/cron/send-yearly-summary`
- **Ontvangers:** Users met `yearlySummary` enabled

---

## 🐳 Docker Implementation

De cron jobs zijn **geïntegreerd in de Dockerfile** en draaien automatisch bij elke deployment.

### Bestanden

#### 1. `Dockerfile`
- Installeert `curl` (voor API calls) en `su-exec` (voor user switching)
- Kopieert `crontab` naar `/etc/crontabs/root`
- Kopieert en maakt `start.sh` executable

#### 2. `crontab`
Bevat alle 4 cron job definities:
```cron
0 8 * * * curl -f http://localhost:3000/api/cron/send-weekly-reminders
0 9 1 * * curl -f http://localhost:3000/api/cron/send-monthly-summary
0 10 1 1,4,7,10 * curl -f http://localhost:3000/api/cron/send-quarterly-summary
0 11 1 1 * curl -f http://localhost:3000/api/cron/send-yearly-summary
```

#### 3. `start.sh`
Start script dat beide processen draait:
1. **Crond** (als root) - voor cron job execution
2. **Next.js** (als `nextjs` user) - voor security

### Security
- Crond draait als **root** (required voor cron execution)
- Next.js draait als **nextjs user** (security best practice)
- User switching gebeurt via `su-exec`

---

## ⚙️ Configuratie

### Tijdzone
Alle tijden zijn in **Europe/Brussels** (CET/CEST).

Configuratie in Easypanel environment variabele:
```
TZ=Europe/Brussels
```

### Logging
Cron output wordt gelogd naar Docker logs:
```bash
# In Easypanel terminal:
docker logs <container-id> -f
```

Output wordt naar `stdout` gestuurd via `> /proc/1/fd/1 2>&1`

---

## 🧪 Testen

### Manueel Triggeren
Je kunt de cron jobs handmatig triggeren voor testing:

**Via browser (als admin):**
```
https://starterskalender.kevinit.be/api/cron/send-weekly-reminders
https://starterskalender.kevinit.be/api/cron/send-monthly-summary
https://starterskalender.kevinit.be/api/cron/send-quarterly-summary
https://starterskalender.kevinit.be/api/cron/send-yearly-summary
```

**Via Easypanel terminal:**
```bash
curl http://localhost:3000/api/cron/send-weekly-reminders
curl http://localhost:3000/api/cron/send-monthly-summary
curl http://localhost:3000/api/cron/send-quarterly-summary
curl http://localhost:3000/api/cron/send-yearly-summary
```

### Cron Status Checken
```bash
# In container terminal:
ps aux | grep crond
crontab -l
```

---

## 📧 Email Behavior

### Digest Emails
Elke user ontvangt **1 gecombineerde email** per periode met:
- Data van **alle entiteiten** waar ze toegang tot hebben
- Groepering per entiteit in de email
- Geen email als er geen starters zijn

### Notificatie Voorkeuren
Users kunnen per entiteit aan/uit zetten via hun profiel:
- ✅ Wekelijkse reminders
- ✅ Maandoverzichten
- ✅ Kwartaaloverzichten
- ✅ Jaaroverzichten

### Templates
Email templates zijn **aanpasbaar** via Admin Panel:
- Ga naar **Admin** → **Systeembeheer** → **E-mailtemplates**
- Edit subject en body
- Gebruik variabelen voor dynamische content

---

## 🚨 Troubleshooting

### Cron Jobs Draaien Niet
1. Check of crond actief is:
   ```bash
   ps aux | grep crond
   ```

2. Check crontab:
   ```bash
   cat /etc/crontabs/root
   ```

3. Check Docker logs voor errors:
   ```bash
   docker logs <container-id> -f
   ```

### Emails Worden Niet Verzonden
1. Check SendGrid configuratie in Admin → **E-mail Test**
2. Check API endpoint output (manueel triggeren)
3. Check Audit Log voor SEND_MAIL events

### Tijdzone Issues
Verify TZ environment variable:
```bash
# In container:
echo $TZ
date
```

Should show: `Europe/Brussels` en correcte lokale tijd

---

## 📝 Deployment Checklist

Wanneer je deploy naar Easypanel:

- [x] `TZ=Europe/Brussels` environment variable ingesteld
- [x] SendGrid API key geconfigureerd (`SENDGRID_API_KEY`)
- [x] SendGrid from email ingesteld (`SENDGRID_FROM_EMAIL`)
- [x] Sender identity geverifieerd in SendGrid
- [x] Database schema up-to-date (`npx prisma db push`)
- [x] Cron jobs testen na deployment

---

## 🔄 Updates

Als je de cron schedule wilt aanpassen:
1. Edit `crontab` bestand
2. Commit naar Git
3. Deploy naar Easypanel
4. Container restart automatisch met nieuwe crontab

---

**Setup compleet!** 🎉

De cron jobs draaien nu automatisch bij elke container start.

