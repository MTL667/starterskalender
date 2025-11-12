# 🔧 Cron Jobs Troubleshooting Guide

## 🚨 Probleem: Automatische Mails Worden Niet Verstuurd

### Mogelijke Oorzaken:

1. **Cron daemon draait niet**
2. **Timezone niet correct**
3. **Curl kan localhost niet bereiken**
4. **SendGrid config ontbreekt**
5. **Cron jobs hebben geen output/logs**
6. **Database connectie faalt**

---

## 📋 Stap-voor-Stap Diagnose

### **Stap 1: Check of Cron Daemon Draait**

```bash
# SSH in Easypanel container
ps aux | grep crond
```

**Verwacht:**
```
root    1  0.0  0.0  crond -b -l 2
```

**Als niet gevonden:**
- Cron daemon start niet
- Check `/app/start.sh` logs

---

### **Stap 2: Check Cron Logs**

```bash
# In container
tail -f /var/log/cron.log

# OF als geen log file:
cat /proc/1/fd/1
```

**Wat te zoeken:**
- Cron execution lines
- Curl output
- Error messages

---

### **Stap 3: Test Cron Job Manually**

```bash
# In container
curl -f http://localhost:3000/api/cron/send-weekly-reminders
```

**Verwacht:**
```json
{
  "success": true,
  "message": "Weekly reminders sent",
  "emailsSent": 3,
  "timestamp": "..."
}
```

**Als 404 of Connection Refused:**
- Next.js server draait niet op localhost:3000
- Probeer: `curl -f http://0.0.0.0:3000/api/...`

---

### **Stap 4: Check Environment Variables**

```bash
# In container
printenv | grep -E "SENDGRID|DATABASE|TZ"
```

**Moet bevatten:**
```
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@jouwdomein.be
DATABASE_URL=postgresql://...
TZ=Europe/Brussels
```

**Als TZ ontbreekt:**
- Cron draait in UTC ipv Brussels tijd
- 08:00 Brussels = 06:00 UTC in winter, 07:00 UTC in zomer

---

### **Stap 5: Check Crontab**

```bash
# In container (als root)
crontab -l
```

**Verwacht:**
```
0 8 * * * curl -f http://localhost:3000/api/cron/send-weekly-reminders > /proc/1/fd/1 2>&1
0 9 1 * * curl -f http://localhost:3000/api/cron/send-monthly-summary > /proc/1/fd/1 2>&1
...
```

**Als leeg:**
- Crontab niet correct geïnstalleerd
- Check `/etc/crontabs/root`

---

### **Stap 6: Test SendGrid Config**

1. Ga naar: `https://jouw-app.com/admin/mail-test`
2. Check of alle 3 config items ✅ zijn
3. Verstuur test email
4. Check error messages

**Als SendGrid errors:**
- Zie [SendGrid Troubleshooting](#sendgrid-issues)

---

## 🐛 Veelvoorkomende Problemen & Fixes

### **1. Cron Draait Niet**

**Symptomen:**
- Geen emails
- `ps aux | grep crond` geeft niks

**Fix:**
```bash
# In container (als root)
crond -b -l 2

# Check logs
tail -f /var/log/cron.log
```

---

### **2. Timezone Verkeerd**

**Symptomen:**
- Emails komen op verkeerde tijd
- 08:00 scheduled, maar komt om 06:00 of 07:00

**Fix in Easypanel:**
```yaml
# Environment Variables
TZ=Europe/Brussels
```

**Verify:**
```bash
date
# Moet tonen: CET/CEST
```

---

### **3. Localhost Niet Bereikbaar**

**Symptomen:**
```
curl: (7) Failed to connect to localhost port 3000: Connection refused
```

**Fix 1 - Verander curl URL:**
```bash
# In crontab, verander:
curl -f http://localhost:3000/api/...

# Naar:
curl -f http://0.0.0.0:3000/api/...
```

**Fix 2 - Gebruik container IP:**
```bash
# Get container IP
hostname -i
# Bijvoorbeeld: 172.17.0.2

# Update crontab
curl -f http://172.17.0.2:3000/api/...
```

---

### **4. SendGrid Issues**

**Symptoom: 401 Unauthorized**

**Oorzaak:** IP whitelisting

**Fix:**
1. Ga naar SendGrid → Settings → API Keys
2. Klik op je API key
3. IP Access Management → **Allow any IP**
4. OF: Voeg Easypanel server IP toe

**Symptoom: 403 Forbidden - Sender not verified**

**Fix:**
1. SendGrid → Settings → Sender Authentication
2. Verify je `SENDGRID_FROM_EMAIL` adres
3. Of gebruik Domain Authentication

---

### **5. Database Connectie Faalt**

**Symptomen:**
```
Error: Can't reach database server
```

**Check:**
```bash
# In container
node -e "require('@/lib/prisma').prisma.user.count().then(console.log)"
```

**Als error:**
- Check `DATABASE_URL` env var
- Check of Postgres service draait
- Check network connectivity

---

### **6. Geen Logs Zichtbaar**

**Probleem:**
Cron output verdwijnt in de void

**Fix - Redirect naar stdout:**
```cron
0 8 * * * curl -f http://localhost:3000/api/cron/send-weekly-reminders > /proc/1/fd/1 2>&1
```

**OF - Log naar file:**
```cron
0 8 * * * curl -f http://localhost:3000/api/cron/send-weekly-reminders >> /var/log/cron.log 2>&1
```

---

## 🧪 Test Scenarios

### **Test 1: Manual Trigger**

```bash
# SSH in container
curl -X GET http://localhost:3000/api/cron/send-weekly-reminders

# Check response
{
  "success": true,
  "emailsSent": 2,
  "usersNotified": ["user@example.com", "admin@example.com"],
  "timestamp": "2025-11-12T08:00:00.000Z"
}
```

### **Test 2: Simulate Cron**

```bash
# In container (as root)
/bin/sh -c "curl -f http://localhost:3000/api/cron/send-weekly-reminders"
```

### **Test 3: Check Next Cron Run**

```bash
# Als root
date && cat /etc/crontabs/root
```

Vergelijk huidige tijd met cron schedule.

---

## 📊 Monitoring

### **Check Audit Log**

1. Ga naar: `/admin/audit`
2. Filter op: "cron" of "email"
3. Check timestamps & success rate

### **Database Check**

```sql
-- Check notification preferences
SELECT u.email, np.frequency, np.enabled
FROM "User" u
LEFT JOIN "NotificationPreference" np ON u.id = np."userId"
WHERE np.enabled = true;

-- Check email templates
SELECT name, isActive, language, frequency
FROM "EmailTemplate"
WHERE isActive = true;
```

---

## 🔐 Security Note

⚠️ **Belangrijk:** De cron endpoints zijn momenteel **niet beveiligd**!

Dit betekent dat iedereen `https://jouw-app.com/api/cron/send-weekly-reminders` kan aanroepen.

**Aanbevolen Fix:** Zie [CRON_SECURITY.md](./CRON_SECURITY.md)

---

## 📞 Quick Fixes voor Easypanel

### **Quick Fix 1: Force Cron Now**

```bash
# In Easypanel terminal
crond -b -l 2
curl http://localhost:3000/api/cron/send-weekly-reminders
```

### **Quick Fix 2: Rebuild met Fresh Crontab**

1. Push code changes naar Git
2. Easypanel → Rebuild
3. Wacht op deployment
4. Check logs: `docker logs <container> --tail 50`

### **Quick Fix 3: Add Timezone**

Easypanel → App → Environment Variables:
```
TZ = Europe/Brussels
```

Rebuild app.

---

## ✅ Success Checklist

- [ ] Cron daemon draait (`ps aux | grep crond`)
- [ ] Crontab is geladen (`crontab -l`)
- [ ] Timezone is correct (`date` toont CET/CEST)
- [ ] Next.js bereikbaar (`curl localhost:3000/api/health`)
- [ ] SendGrid geconfigureerd (mail-test page ✅)
- [ ] Database connectie OK
- [ ] Handmatige curl test succesvol
- [ ] Logs zichtbaar in Easypanel
- [ ] Audit log toont cron executions

---

## 🎯 Next Steps

Als alles werkt:
1. Wacht tot volgende cron run (08:00 volgende dag)
2. Check audit log voor execution
3. Check inbox voor test email
4. Monitor for 1 week

Als het NIET werkt na deze guide:
1. Deel de volgende info:
   - Easypanel container logs
   - Output van `ps aux | grep crond`
   - Output van handmatige curl test
   - Screenshot van mail-test page
2. We fixen het samen! 🛠️

