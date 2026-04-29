# Development Guide

> Generated: 2026-04-08 | Scan level: deep

## Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| **Node.js** | ≥ 18.0.0 (20+ recommended) | Runtime |
| **npm** | Bundled with Node | Package manager |
| **PostgreSQL** | Any recent version | Database |
| **Docker** (optional) | — | Local DB via compose or production build |

## Quick Start

```bash
# 1. Clone and install
git clone <repository-url>
cd starterskalender
npm install --legacy-peer-deps

# 2. Configure environment
cp .env.example .env
# Edit .env with your values (see Environment section below)

# 3. Set up database
npm run db:push          # Sync Prisma schema to database
npm run db:seed          # Seed development data

# 4. Start development server
npm run dev              # → http://localhost:3000
```

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_URL` | Application URL (e.g., `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Random secret for JWT signing |

### Azure AD SSO

| Variable | Description |
|----------|-------------|
| `AZURE_AD_CLIENT_ID` | Azure AD app registration client ID |
| `AZURE_AD_CLIENT_SECRET` | Azure AD app registration secret |
| `AZURE_AD_TENANT_ID` | Azure AD tenant ID |
| `ALLOWED_TENANT_IDS` | Comma-separated allowed tenant IDs |

### Email (SendGrid)

| Variable | Description |
|----------|-------------|
| `SENDGRID_API_KEY` | SendGrid API key |
| `EMAIL_FROM` | Sender address |
| `EMAIL_REPLY_TO` | Reply-to address |

### Microsoft Graph (Room Bookings)

| Variable | Description |
|----------|-------------|
| `AZURE_TENANT_ID` | Graph API tenant |
| `AZURE_CLIENT_ID` | Graph API client ID |
| `AZURE_CLIENT_SECRET` | Graph API client secret |

### Cron

| Variable | Description |
|----------|-------------|
| `CRON_SECRET` | Bearer token for cron endpoint auth |

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server with hot reload |
| `npm run build` | Production build (runs fix-template-types first) |
| `npm start` | Start production server |
| `npm run lint` | ESLint check |
| `npm run db:push` | Sync Prisma schema to database |
| `npm run db:migrate` | Run Prisma migrations (dev) |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:seed` | Seed development data |
| `npm run db:seed-templates` | Seed email templates |
| `npm run db:seed-tasks` | Seed task templates |
| `npm run db:fix-templates` | Fix template types |
| `npm test` | Run Vitest unit tests |
| `npm run test:ui` | Vitest with UI |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run email:cron` | Run email reminder job manually |

## Database Operations

### Schema Changes

The project uses `prisma db push` for schema synchronization:

```bash
# After editing prisma/schema.prisma:
npm run db:push

# For data transformations, create idempotent SQL in migrations/:
# See migrations/split-starter-name.sql as an example
```

### Data Migrations

Custom SQL migrations go in `migrations/` and must be:
- **Idempotent** — safe to run multiple times
- **Referenced in `start.sh`** — executed before `prisma db push` in production
- **Data-only** — schema changes handled by `db push`

### Seeding

```bash
npm run db:seed              # Full dev data (users, entities, starters)
npm run db:seed-templates    # Email templates only
npm run db:seed-tasks        # Task templates only
```

## Project Structure Conventions

### Routing

- **Pages**: `app/(authenticated)/<section>/page.tsx` — server components with auth checks
- **API routes**: `app/api/<domain>/route.ts` — REST handlers with Zod validation
- **Admin routes**: `app/api/admin/<domain>/route.ts` — HR_ADMIN only

### Components

- **Feature components**: `components/<domain>/` — domain-specific UI
- **UI primitives**: `components/ui/` — Radix-based reusable components
- **Layout**: `components/layout/` — navbar, notification bell, language switcher
- **Providers**: `components/providers/` — SSE context provider

### Business Logic

- **Auth**: `lib/auth-options.ts` (NextAuth config), `lib/auth-utils.ts` (helpers), `lib/rbac.ts` (RBAC)
- **Events**: `lib/events.ts` (SSE event bus)
- **Email**: `lib/email.ts` (sending), `lib/email-template-engine.ts` (rendering)
- **Automation**: `lib/task-automation.ts` (auto-create tasks from templates)

### Translations

- **Files**: `messages/nl.json`, `messages/fr.json`
- **Namespaces**: Match UI sections (e.g., `dashboard`, `calendar`, `admin`)
- **Usage**: `const t = useTranslations('namespace')` in components
- **Convention**: Add keys to both NL and FR files simultaneously

## Development with Docker

### Local Database

```bash
docker compose -f docker-compose.dev.yml up -d
# PostgreSQL available at localhost:5432
```

### Full Production Build

```bash
docker compose build
docker compose up
# Application at http://localhost:3000
```

## Testing

### Unit Tests (Vitest)

```bash
npm test              # Run all tests
npm run test:ui       # Run with browser UI
```

### E2E Tests (Playwright)

```bash
npm run test:e2e      # Run end-to-end tests
```

### Manual Testing

- **Cron jobs**: Admin → Cron Jobs → Preview/Trigger buttons
- **Email**: Admin → Mail Test → Send test email
- **SSE**: Open multiple tabs; create/edit starters — observe real-time updates

## Code Style

- **TypeScript**: Strict mode, ES2020 target
- **Formatting**: Controlled by ESLint (`eslint-config-next`)
- **Imports**: Path aliases via `@/*` (maps to project root)
- **Validation**: Zod schemas for all API request bodies
- **Error handling**: Return `{ error: "message" }` with appropriate HTTP status
- **Audit logging**: All mutations must call `createAuditLog()` from `lib/audit.ts`
- **SSE events**: All starter/task mutations should `eventBus.emit()` from `lib/events.ts`
