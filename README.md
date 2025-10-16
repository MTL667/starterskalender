# Starterskalender

Een productierijpe webapp voor het beheren van starters met een kalender, YTD-tellers, RBAC en automatische e-mailnotificaties.

## 📋 Overzicht

Starterskalender is een Next.js 14 applicatie gebouwd voor HR-teams om nieuwe medewerkers te plannen en te beheren. De applicatie biedt:

- 📅 **Kalender** - 52-weken overzicht met starter kaartjes
- 📊 **YTD Tellers** - Year-to-date statistieken per entiteit
- 🔐 **RBAC** - Role-Based Access Control met 4 rollen
- 📧 **E-mail Reminders** - Automatische notificaties 7 dagen vooraf via SendGrid
- 🎨 **Entiteit Kleuren** - Visuele identificatie per organisatie-eenheid
- 📝 **Audit Logging** - Complete trail van alle acties
- 🔍 **Zoeken & Filteren** - Krachtige filtering en CSV export

## 🏗️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **TypeScript**: Strict mode
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js (Magic Link + optioneel OIDC)
- **UI**: Tailwind CSS + shadcn/ui + Radix UI
- **Email**: SendGrid
- **Deployment**: Vercel (met Cron)

## 🚀 Setup

### 1. Prerequisites

- Node.js >= 18
- PostgreSQL database
- SendGrid account (voor e-mailnotificaties)

### 2. Installatie

```bash
# Clone de repository
git clone <repository-url>
cd HRboarding

# Installeer dependencies
npm install

# Kopieer environment variabelen
cp .env.example .env

# Bewerk .env met jouw configuratie
nano .env
```

### 3. Database Setup

```bash
# Push Prisma schema naar database
npm run db:push

# (Optioneel) Seed met dummy data
SEED_DUMMY=true npm run db:seed
```

### 4. Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in je browser.

### 5. Production Build

```bash
npm run build
npm start
```

## 🔐 RBAC Matrix

| Rol              | Beschrijving                                  | Rechten                                                                 |
|------------------|-----------------------------------------------|-------------------------------------------------------------------------|
| `HR_ADMIN`       | Volledige controle over de applicatie        | CRUD op alle entiteiten, users, starters, settings, memberships         |
| `ENTITY_EDITOR`  | Editor binnen toegewezen entiteiten           | CRUD op starters binnen eigen entiteiten                                |
| `ENTITY_VIEWER`  | Read-only binnen toegewezen entiteiten        | Bekijken van starters binnen eigen entiteiten                           |
| `GLOBAL_VIEWER`  | Read-only over alle entiteiten                | Bekijken van alle starters en entiteiten (geen edit/delete)             |

### Membership Model

- Gebruikers krijgen **Memberships** per entiteit
- Elke membership heeft een `canEdit` boolean:
  - `true` → Kan starters bewerken binnen die entiteit
  - `false` → Kan alleen bekijken
- `HR_ADMIN` en `GLOBAL_VIEWER` hebben automatisch toegang tot alle entiteiten

### Server-Side Enforcement

1. **API Routes**: Elke mutatie controleert permissies via `canMutateStarter()` en `requireAdmin()`
2. **Prisma Middleware**: Queries worden gefilterd op zichtbare entiteiten
3. **UI Disabling**: Buttons/forms worden disabled op basis van rechten

## 📧 E-mail Notificaties

### SendGrid Setup

1. Maak een SendGrid account aan
2. Genereer een API key
3. Voeg toe aan `.env`:

```env
SENDGRID_API_KEY=SG.xxxxx
MAIL_FROM=starters@yourcompany.com
MAIL_REPLY_TO=hr@yourcompany.com
```

### Cron Job

De applicatie stuurt dagelijks e-mails naar entiteiten voor starters die over 7 dagen beginnen.

#### Vercel Deployment

Vercel Cron draait automatisch via `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/email-reminder",
    "schedule": "0 8 * * *"
  }]
}
```

**Vereist**: Voeg `CRON_SECRET` toe aan Vercel environment variables.

#### Handmatig/Node-Cron

```bash
# Draai handmatig
tsx lib/cron/email-reminder.ts

# Of gebruik node-cron in productie
node -r dotenv/config lib/cron/email-reminder.js
```

### Mail Test

Ga naar `/admin/mail-test` om een test e-mail te versturen.

## 📅 Weeknummer Berekening

- **Timezone**: `Europe/Brussels`
- **Week Start**: Maandag (ISO 8601)
- **Logica**: `date-fns` met `weekStartsOn: 1`

De `weekNumber` wordt automatisch berekend en opgeslagen bij het aanmaken/bewerken van een starter.

## 🗄️ Database Schema

### Core Models

- **User**: Gebruikers met role en 2FA support
- **Entity**: Organisatie-eenheden met kleuren en notify e-mails
- **Membership**: Koppeling tussen User en Entity (met `canEdit`)
- **Starter**: De starters zelf met naam, functie, regio, startdatum, etc.
- **DropdownOption**: Configureerbare dropdown waarden (Regio, Via, etc.)
- **AuditLog**: Logging van alle CRUD en email acties

Zie `prisma/schema.prisma` voor het volledige schema.

## 🎨 UI Features

### Dashboard

- YTD tellers (totaal + per entiteit)
- Recente starters
- Quick actions

### Kalender

- 52/53 weken grid per jaar
- Kleur-coded entiteit badges
- Filters: jaar, entiteit, zoekterm
- Drag & drop (TODO: future enhancement)
- CSV export (respecteert RBAC)

### Starter Detail

- Modal/drawer met alle velden
- CRUD functionaliteit (indien rechten)
- Readonly weekNumber (afgeleid)

### Admin

- Entities: CRUD, kleurkiezer, notify e-mails
- Users: Uitnodigen, rol toekennen, memberships beheren
- Dropdowns: Beheer per group
- Mail Test: SendGrid validatie
- Audit Log: Bekijk alle acties

## 🔒 Privacy & Security

### Privacy-by-Design

- **Geen import**: Alle data wordt handmatig beheerd via de UI
- **Geen bronbestanden**: Geen Excel/CSV import functionaliteit
- **Logging**: Volledige audit trail server-side
- **RBAC**: Strikte autorisatie op API én Prisma niveau

### Security Best Practices

- Server-side validatie met Zod schemas
- NextAuth JWT sessions
- CSRF protection (Next.js ingebouwd)
- Environment variable secrets
- Optionele 2FA (TOTP)

## 📊 CSV Export

Export functionaliteit respecteert RBAC:

- Alleen zichtbare starters worden geëxporteerd
- Geen verborgen kolommen
- Format: UTF-8, comma-separated

## 🧪 Testing

```bash
# Unit tests
npm test

# E2E tests (Playwright)
npm run test:e2e
```

**Test Coverage** (aanbevolen):

- YTD logic: Correcte telling tot vandaag
- RBAC guards: Permissies enforcement
- Email cron: Dry-run zonder echte verzending

## 🚢 Deployment

### Easypanel (Self-Hosted)

Voor deployment op Easypanel, zie de gedetailleerde guide: [EASYPANEL.md](./EASYPANEL.md)

Quick start:
1. Maak PostgreSQL database in Easypanel
2. Deploy via Git repository of Docker
3. Configureer environment variabelen
4. Setup cron job voor e-mail reminders

### Vercel (Cloud)

1. Push naar GitHub
2. Importeer in Vercel
3. Configureer environment variables
4. Deploy!

Vercel Cron wordt automatisch geconfigureerd via `vercel.json`.

### Docker / Docker Compose

```bash
# Kopieer .env.example naar .env en configureer
cp .env.example .env

# Start alle services (app + database + cron)
docker-compose up -d

# Run database migratie
docker-compose exec app npx prisma db push

# Optioneel: seed data
docker-compose exec app npm run db:seed
```

### Custom Server

```bash
npm run build
NODE_ENV=production npm start
```

**Cron**: Gebruik `node-cron` of systeem cron:

```cron
0 8 * * * cd /app && tsx lib/cron/email-reminder.ts
```

## 🔧 Environment Variables

| Variable              | Required | Description                                    |
|-----------------------|----------|------------------------------------------------|
| `DATABASE_URL`        | ✅       | PostgreSQL connection string                   |
| `NEXTAUTH_URL`        | ✅       | Base URL (http://localhost:3000)               |
| `NEXTAUTH_SECRET`     | ✅       | Secret for JWT signing                         |
| `EMAIL_SERVER`        | ✅       | SMTP server voor magic links                   |
| `EMAIL_FROM`          | ✅       | Van-adres voor magic links                     |
| `SENDGRID_API_KEY`    | ✅       | SendGrid API key                               |
| `MAIL_FROM`           | ✅       | Van-adres voor reminders                       |
| `MAIL_REPLY_TO`       | ⚠️       | Reply-to adres (optioneel)                     |
| `OIDC_ENABLED`        | ⚠️       | "true" om OIDC in te schakelen                 |
| `OIDC_CLIENT_ID`      | ⚠️       | OIDC client ID                                 |
| `OIDC_CLIENT_SECRET`  | ⚠️       | OIDC client secret                             |
| `OIDC_ISSUER`         | ⚠️       | OIDC issuer URL                                |
| `SEED_DUMMY`          | ⚠️       | "true" voor dummy seed data                    |
| `CRON_SECRET`         | ⚠️       | Secret voor Vercel Cron auth                   |
| `ENABLE_2FA`          | ⚠️       | "true" om 2FA in te schakelen                  |

## 📝 Scripts

| Script           | Beschrijving                              |
|------------------|-------------------------------------------|
| `npm run dev`    | Start development server                  |
| `npm run build`  | Productie build                           |
| `npm start`      | Start productie server                    |
| `npm run lint`   | ESLint check                              |
| `npm run db:push`| Push Prisma schema naar DB                |
| `npm run db:migrate` | Maak nieuwe migratie                  |
| `npm run db:studio` | Open Prisma Studio                     |
| `npm run db:seed` | Seed database (als SEED_DUMMY=true)      |
| `npm test`       | Run unit tests                            |
| `npm run test:e2e` | Run E2E tests                           |
| `npm run email:cron` | Run email reminder job handmatig      |

## 🛠️ Development Tips

### Prisma Studio

```bash
npm run db:studio
```

Bekijk en bewerk database direct in de browser.

### Hot Reload

Next.js heeft hot reload ingebouwd. Wijzigingen worden automatisch herladen.

### Debugging

- Server logs: Check terminal waar `npm run dev` draait
- Client errors: Check browser console
- API errors: Check Network tab in DevTools

## 📚 Folder Structuur

```
HRboarding/
├── app/                    # Next.js App Router
│   ├── (authenticated)/    # Authenticated layout group
│   ├── api/                # API routes
│   ├── auth/               # Auth pages
│   └── globals.css         # Global styles
├── components/             # React components
│   ├── ui/                 # shadcn/ui components
│   ├── dashboard/          # Dashboard specific
│   ├── kalender/           # Kalender specific
│   └── layout/             # Layout components
├── lib/                    # Utilities & helpers
│   ├── cron/               # Cron jobs
│   ├── prisma.ts           # Prisma client
│   ├── rbac.ts             # RBAC logic
│   ├── audit.ts            # Audit logging
│   ├── email.ts            # SendGrid wrapper
│   └── week-utils.ts       # Week calculations
├── prisma/                 # Database
│   ├── schema.prisma       # Schema definitie
│   └── seed.ts             # Seed script
├── types/                  # TypeScript types
├── .env.example            # Environment template
├── next.config.js          # Next.js config
├── tailwind.config.ts      # Tailwind config
├── tsconfig.json           # TypeScript config
└── vercel.json             # Vercel cron config
```

## 🤝 Contributing

Dit is een productie-ready project. Voor wijzigingen:

1. Fork de repo
2. Maak een feature branch (`git checkout -b feature/naam`)
3. Commit je changes (`git commit -m 'Add feature'`)
4. Push naar de branch (`git push origin feature/naam`)
5. Open een Pull Request

## 📄 License

Proprietary - Alle rechten voorbehouden.

## 🙋 Support

Voor vragen of problemen, contacteer het development team of open een issue.

## 🎯 Roadmap

Toekomstige features:

- [ ] Drag & drop om startdatum te wijzigen in kalender
- [ ] Bulk import (optioneel, met privacy waarborgen)
- [ ] Mobile app (React Native)
- [ ] Notificaties in-app (naast e-mail)
- [ ] Dashboard widgets configureerbaar maken
- [ ] Multi-language support (NL/FR/EN)

---

**Gebouwd met ❤️ voor efficiënt HR-management**

