# Easypanel Deployment Guide

Deze guide helpt je om Starterskalender te deployen op Easypanel.

## 📋 Vereisten

- Easypanel installatie (self-hosted of cloud)
- Git repository (GitHub, GitLab, of Bitbucket)
- SendGrid account voor e-mailnotificaties

## 🚀 Deployment Stappen

### 1. Database Aanmaken

In Easypanel:

1. Ga naar **Services** → **Create Service**
2. Kies **PostgreSQL**
3. Configureer:
   - **Name**: `starterskalender-db`
   - **Database**: `starterskalender`
   - **Username**: `starterskalender`
   - **Password**: Genereer een sterk wachtwoord
4. Klik **Create**

Noteer de connection string: `postgresql://starterskalender:[PASSWORD]@starterskalender-db:5432/starterskalender`

### 2. Applicatie Deployen

#### Optie A: Via Git Repository (Aanbevolen)

1. Push je code naar een Git repository
2. In Easypanel:
   - **Services** → **Create Service** → **App**
   - **Source**: Verbind je Git repository
   - **Build Method**: Docker
   - **Dockerfile Path**: `./Dockerfile`

#### Optie B: Via Docker Image

Als je eerst een Docker image bouwt:

```bash
docker build -t starterskalender:latest .
docker push your-registry/starterskalender:latest
```

Dan in Easypanel:
- **Source**: Docker Image
- **Image**: `your-registry/starterskalender:latest`

### 3. Environment Variabelen

Voeg de volgende environment variabelen toe in Easypanel:

#### Database
```
DATABASE_URL=postgresql://starterskalender:[PASSWORD]@starterskalender-db:5432/starterskalender?schema=public
```

#### NextAuth
```
NEXTAUTH_URL=https://jouw-domein.com
NEXTAUTH_SECRET=[genereer met: openssl rand -base64 32]
```

#### Email (Magic Link via SMTP)
```
EMAIL_SERVER=smtp://user:pass@smtp.yourprovider.com:587
EMAIL_FROM=noreply@yourcompany.com
```

#### SendGrid (Reminders)
```
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
MAIL_FROM=starters@yourcompany.com
MAIL_REPLY_TO=hr@yourcompany.com
```

#### Optioneel - OIDC
```
OIDC_ENABLED=true
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_ISSUER=https://your-oidc-provider.com
```

#### Features
```
SEED_DUMMY=false
ENABLE_2FA=true
CRON_SECRET=[genereer een random string]
TZ=Europe/Brussels
```

### 4. Port Configuration

- **Port**: `3000`
- **Protocol**: HTTP

### 5. Domain & SSL

In Easypanel:
1. Ga naar **Domains**
2. Voeg je domein toe
3. Enable **SSL/TLS** (Let's Encrypt)

### 6. Database Migratie

Na deployment, run eenmalig:

1. Open de **App Console** in Easypanel
2. Run:
```bash
npx prisma db push
```

Optioneel, voeg dummy data toe:
```bash
SEED_DUMMY=true npx prisma db seed
```

### 7. Cron Service voor E-mail Reminders

#### Optie A: Easypanel Cron Jobs

Als Easypanel cron jobs ondersteunt:

1. Maak een nieuwe **Cron Job**
2. **Schedule**: `0 8 * * *` (dagelijks om 08:00)
3. **Command**: 
```bash
curl -X GET https://jouw-domein.com/api/cron/email-reminder \
  -H "Authorization: Bearer [CRON_SECRET]"
```

#### Optie B: Externe Cron Service

Gebruik een service zoals [cron-job.org](https://cron-job.org):

1. Maak een account aan
2. Voeg een cron job toe:
   - **URL**: `https://jouw-domein.com/api/cron/email-reminder`
   - **Header**: `Authorization: Bearer [CRON_SECRET]`
   - **Schedule**: Dagelijks om 08:00 CEST

#### Optie C: Aparte Cron Container

Voor meer controle, deploy de cron service apart:

1. In Easypanel: **Create Service** → **App**
2. **Build Method**: Docker
3. **Dockerfile**: `Dockerfile.cron`
4. Dezelfde environment variabelen als de main app

## 📊 Monitoring

### Health Check

Easypanel ondersteunt health checks:

- **Path**: `/api/health`
- **Interval**: 30s
- **Timeout**: 3s

### Logs

Bekijk logs in Easypanel:
- **App Logs**: Real-time application logs
- **Cron Logs**: Email reminder job logs

## 🔧 Troubleshooting

### Database Connectie Problemen

Controleer of de `DATABASE_URL` correct is en de database service actief is:

```bash
# In app console
npx prisma db pull
```

### E-mail Reminders Werken Niet

1. Check SENDGRID_API_KEY is correct
2. Bekijk de cron logs
3. Test handmatig:
```bash
curl -X GET https://jouw-domein.com/api/cron/email-reminder \
  -H "Authorization: Bearer [CRON_SECRET]"
```

### Build Errors

Als de build faalt:
1. Controleer of alle dependencies in `package.json` staan
2. Zorg dat `output: 'standalone'` in `next.config.js` staat
3. Rebuild de Docker image lokaal om errors te debuggen

### Prisma Errors

```bash
# In app console
npx prisma generate
npx prisma db push
```

## 🔄 Updates

### Automatische Deployments

Als je Git repository gebruikt:
1. Push naar main branch
2. Easypanel rebuild automatisch

### Handmatige Updates

1. Pull nieuwe changes
2. Rebuild Docker image
3. Restart de service in Easypanel

## 📁 Backup

### Database Backup

In Easypanel (of via pg_dump):

```bash
# Backup
docker exec starterskalender-db pg_dump -U starterskalender starterskalender > backup.sql

# Restore
docker exec -i starterskalender-db psql -U starterskalender starterskalender < backup.sql
```

### Automated Backups

Configureer automated backups in Easypanel onder **Backups**.

## 🔒 Security Checklist

- ✅ Sterke `NEXTAUTH_SECRET` en `CRON_SECRET`
- ✅ SSL/TLS enabled via Easypanel
- ✅ Database password sterk en uniek
- ✅ SendGrid API key restricted tot juiste IP/domein
- ✅ Firewall rules indien mogelijk
- ✅ Regular backups enabled

## 🎯 Performance

### Recommended Resources

- **CPU**: 1 vCPU minimum, 2+ voor productie
- **RAM**: 512MB minimum, 1GB+ voor productie
- **Storage**: 10GB minimum

### Scaling

Easypanel ondersteunt horizontal scaling:
1. Ga naar **Scaling**
2. Verhoog aantal replicas
3. Database blijft single instance

## 📞 Support

Voor Easypanel-specifieke vragen:
- [Easypanel Docs](https://easypanel.io/docs)
- [Easypanel Discord](https://discord.gg/easypanel)

Voor Starterskalender app vragen:
- Check de [README.md](./README.md)
- Bekijk de audit logs via `/admin/audit-log`

---

**Happy Deploying! 🚀**

