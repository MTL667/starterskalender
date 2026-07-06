# Cronicle Setup — EasyPanel

Cronicle is de externe job scheduler die alle cron jobs triggert voor de Starterskalender app.

## Waarom Cronicle?

- **Betrouwbaar** — draait als aparte container, onafhankelijk van de Next.js app
- **Visueel** — web UI met job history, logs, en failure alerts
- **Geen in-process scheduler** — Next.js API routes worden gewoon via HTTP getriggerd
- **Retry & alerting** — automatische herpoging bij falen

## EasyPanel Service Setup

### 1. Nieuwe service aanmaken

In EasyPanel, maak een nieuwe service aan:

- **Type:** Docker
- **Image:** `jhuckaby/cronicle:latest`
- **Port:** `3012` (web UI)

### 2. Environment variabelen

| Variabele | Waarde | Beschrijving |
|-----------|--------|--------------|
| `CRONICLE_base_app_url` | `https://cron.jouw-domein.nl` | Publiek URL voor de web UI |
| `CRONICLE_secret_key` | `<random-64-char-hex>` | Interne encryptie key |
| `CRONICLE_web_socket_use_hostnames` | `0` | Nodig voor Docker networking |

### 3. Volumes

| Container pad | Beschrijving |
|---------------|--------------|
| `/opt/cronicle/data` | Job definities, history, state |
| `/opt/cronicle/logs` | Logs |

### 4. Networking

Cronicle moet de Starterskalender app intern kunnen bereiken. In EasyPanel zijn services op hetzelfde netwerk bereikbaar via hun servicenaam:

```
http://<starterskalender-service-naam>:3000
```

Voorbeeld: als je app-service "starterskalender" heet:
```
http://starterskalender:3000/api/cron/send-weekly-reminders
```

## Job Configuratie

### Authenticatie

Alle jobs gebruiken dezelfde `CRON_SECRET` als Bearer token:

```
Authorization: Bearer <jouw-CRON_SECRET>
```

Dit is dezelfde waarde als de `CRON_SECRET` environment variabele in je Starterskalender service.

### Volledige Job Schedule

Configureer deze jobs in Cronicle (via de web UI):

#### Email Digests

| Job | Endpoint | Method | Schedule | Beschrijving |
|-----|----------|--------|----------|--------------|
| Weekly Reminders | `/api/cron/send-weekly-reminders` | GET | Dagelijks 08:00 | 7-dagen-vooruit starter herinnering |
| Monthly Summary | `/api/cron/send-monthly-summary` | GET | 1e v/d maand 09:00 | Maandoverzicht starters |
| Quarterly Summary | `/api/cron/send-quarterly-summary` | GET | 1 jan/apr/jul/okt 10:00 | Kwartaaloverzicht |
| Yearly Summary | `/api/cron/send-yearly-summary` | GET | 1 januari 11:00 | Jaaroverzicht |

#### Materialen & Licenties

| Job | Endpoint | Method | Schedule | Beschrijving |
|-----|----------|--------|----------|--------------|
| Material Delivery Check | `/api/cron/check-material-deliveries` | GET | Werkdagen 08:30 | Signaleert verlate leveringen |
| License Sync | `/api/cron/license-sync` | GET | Dagelijks 07:00 | Synct M365 licenties + shortage alerts |

#### Offboarding

| Job | Endpoint | Method | Schedule | Beschrijving |
|-----|----------|--------|----------|--------------|
| Offboarding Lifecycle | `/api/cron/offboarding-lifecycle` | GET | Dagelijks 02:00 | Rename na 1 dag, delete na 1 jaar |
| Offboarding Escalation | `/api/cron/offboarding-escalation` | GET | Werkdagen 07:00 | Escalatie als exit ≤3 dagen |

#### Entra ID & CardDAV

| Job | Endpoint | Method | Schedule | Beschrijving |
|-----|----------|--------|----------|--------------|
| Entra Consent Sweep | `/api/cron/entra-consent-sweep` | GET | Dagelijks 06:00 | Valideert Entra consent + cert expiry |
| CardDAV Cleanup | `/api/cron/carddav-cleanup` | GET | Dagelijks 03:00 | Verwijdert soft-deleted contacten (>30d) |

#### Recruitment (GDPR)

| Job | Endpoint | Method | Schedule | Beschrijving |
|-----|----------|--------|----------|--------------|
| Retention Notify | `/api/recruitment/cron/retention-notify` | POST | Dagelijks 09:00 | Waarschuwt kandidaten over verlopen retentie |
| Retention Expire | `/api/recruitment/cron/retention-expire` | POST | Dagelijks 01:00 | Soft-delete verlopen kandidaten |
| Retention Purge | `/api/recruitment/cron/retention-purge` | POST | Dagelijks 02:00 | Hard-delete + anonimiseer na grace period |
| Expiration Reminders | `/api/recruitment/cron/expiration-reminders` | POST | Dagelijks 08:00 | Alert bij share-toegang die verloopt |

#### Legacy / Monitoring

| Job | Endpoint | Method | Schedule | Beschrijving |
|-----|----------|--------|----------|--------------|
| Email Reminder (legacy) | `/api/cron/email-reminder` | GET | Dagelijks 08:00 | Simpele entity-level reminder |

> **Let op:** `/api/health/cron` is GEEN scheduled job maar een monitoring endpoint (voor UptimeRobot/EasyPanel health checks). Geen auth nodig.

### Cronicle HTTP Plugin Configuratie

Per job in Cronicle:

1. **Plugin:** HTTP Request
2. **URL:** `http://starterskalender:3000` + endpoint pad
3. **Method:** GET of POST (zie tabel)
4. **Headers:**
   ```
   Authorization: Bearer <CRON_SECRET>
   Content-Type: application/json
   ```
5. **Timeout:** 60 seconden
6. **Retry:** 2 pogingen met 30s interval
7. **Notification:** Bij failure → email naar admin

### Cron Expressions (voor copy-paste in Cronicle)

```
# Email digests
0 8 * * *         → send-weekly-reminders
0 9 1 * *         → send-monthly-summary
0 10 1 1,4,7,10 * → send-quarterly-summary
0 11 1 1 *        → send-yearly-summary

# Materialen & licenties
30 8 * * 1-5      → check-material-deliveries
0 7 * * *         → license-sync

# Offboarding
0 2 * * *         → offboarding-lifecycle
0 7 * * 1-5       → offboarding-escalation

# Entra & CardDAV
0 6 * * *         → entra-consent-sweep
0 3 * * *         → carddav-cleanup

# Recruitment GDPR
0 9 * * *         → retention-notify
0 1 * * *         → retention-expire
0 2 * * *         → retention-purge (na expire!)
0 8 * * *         → expiration-reminders

# Legacy
0 8 * * *         → email-reminder
```

## Timezone

Stel de timezone in Cronicle in op `Europe/Brussels` zodat schedules overeenkomen met lokale werktijden.

## Monitoring

- **Cronicle dashboard:** Toont per job de laatste run, duur, en status
- **Health endpoint:** Configureer EasyPanel/UptimeRobot op `GET /api/health/cron` (geen auth). Geeft 503 als weekly-reminders >25u niet gelopen heeft.

## Migratie van start.sh

De crontab logica is verwijderd uit `start.sh`. De app start nu alleen de Next.js server. `cron-curl.sh` kan na succesvolle Cronicle-migratie verwijderd worden.

## Troubleshooting

| Probleem | Oplossing |
|----------|-----------|
| Job faalt met 401 | Check of `CRON_SECRET` in Cronicle headers matcht met de app env var |
| Job faalt met connection refused | Check servicenaam in EasyPanel (moet intern bereikbaar zijn op port 3000) |
| Job draait niet op schema | Check timezone instelling in Cronicle (moet `Europe/Brussels` zijn) |
| POST endpoints falen | Zorg dat Method op POST staat en `Content-Type: application/json` header aanwezig is |
