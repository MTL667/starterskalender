# Architecture Document

> Generated: 2026-04-08 | Scan level: deep | Project type: web (Next.js 16 monolith)

## Executive Summary

Starterskalender is a **layered monolith** built with Next.js 16 (App Router), deployed as a single Docker container with an embedded cron daemon. The architecture separates concerns across client-side React components, server-side API route handlers, a business logic layer (`lib/`), and a Prisma-managed PostgreSQL database. Real-time updates use Server-Sent Events via an in-memory event bus.

## Architecture Pattern

**Layered monolith** with Next.js App Router conventions:

1. **Presentation Layer**: React 19 components with Radix UI primitives, SSE-subscribed for live updates
2. **Middleware Layer**: NextAuth JWT-based authentication + locale synchronization
3. **API Layer**: 63 REST route handlers with Zod validation and RBAC enforcement
4. **Business Logic Layer**: 19 library modules handling RBAC, email, task automation, events, and integrations
5. **Data Layer**: Prisma 5 ORM with 20 models on PostgreSQL

```
┌───────────────────────────────────────────────────────────┐
│                     Browser (Client)                       │
│  React 19 + Radix UI + Tailwind CSS + SSE EventSource     │
├───────────────────────────────────────────────────────────┤
│                   Next.js Middleware                        │
│  JWT auth gate │ RBAC (role NONE → /auth/welcome)          │
│  Locale cookie sync │ Route matching                       │
├───────────────────────────────────────────────────────────┤
│                  App Router (Server)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Pages (SSR)   │  │ API Routes   │  │ SSE Endpoint   │  │
│  │ 20+ pages     │  │ 63 files     │  │ Entity-scoped  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬─────────┘  │
├─────────┼─────────────────┼─────────────────┼─────────────┤
│         │     Business Logic (lib/)          │             │
│  ┌──────┴──────────────────┴─────────────────┴──────────┐ │
│  │ auth-utils │ rbac │ task-automation │ email │ events  │ │
│  │ audit │ graph │ week-utils │ cron-helpers │ types    │ │
│  └──────────────────────┬───────────────────────────────┘ │
├─────────────────────────┼─────────────────────────────────┤
│                    Prisma 5 ORM                            │
│  20 models │ 10 enums │ Type-safe queries                  │
├─────────────────────────┼─────────────────────────────────┤
│                    PostgreSQL                               │
└─────────────────────────────────────────────────────────────┘
```

## Authentication & Authorization

### Authentication Flow

1. **Azure AD / Entra ID SSO** (multi-tenant) via NextAuth
2. **Tenant Allowlist**: DB `AllowedTenant` table + `ALLOWED_TENANT_IDS` env var
3. **JWT Sessions**: Stateless, enriched with role + locale + memberships
4. **Dev Credentials**: Available in `NODE_ENV=development` only (auto-creates HR_ADMIN)
5. **New Users**: Created with `role: NONE`, redirected to `/auth/welcome` (pending approval)

### Authorization (RBAC)

| Role | Scope | Capabilities |
|------|-------|-------------- |
| **HR_ADMIN** | Global | Full CRUD on all entities, starters, tasks, users, settings |
| **GLOBAL_VIEWER** | Global | Read-only access across all entities |
| **ENTITY_EDITOR** | Entity | Create/edit starters and tasks within assigned entities |
| **ENTITY_VIEWER** | Entity | Read-only access within assigned entities |
| **NONE** | — | No access (pending approval, blocked by middleware) |

**Enforcement points:**
- `middleware.ts` — blocks NONE users from protected routes
- `lib/auth-utils.ts` — `requireAuth()`, `requireAdmin()`, `requireEntityAccess()`
- `lib/rbac.ts` — `filterStartersByRBAC()`, `canMutateStarter()`, `getVisibleEntities()`
- Individual API routes — per-endpoint checks

### Entity Membership

Users access entities through the `Membership` model with a `canEdit` boolean:
- `canEdit: true` → ENTITY_EDITOR within that entity
- `canEdit: false` → ENTITY_VIEWER within that entity
- HR_ADMIN / GLOBAL_VIEWER → implicit access to all entities

## Real-Time Architecture (SSE)

### Design Choice

**Server-Sent Events** over WebSocket because:
- Unidirectional (server → client) is sufficient
- Native cookie/session support for authentication
- Single-container deployment (no sticky sessions needed)
- Automatic reconnection built into browsers

### Implementation

```
┌─────────┐    EventSource     ┌─────────────┐
│ Browser  │──────────────────→│ /api/sse     │
│ (SSE     │    entity-scoped  │ (Route       │
│ Provider)│←──────────────────│  Handler)    │
└─────────┘    events + hbeat  └──────┬──────┘
                                      │ subscribe
                                      ▼
                               ┌─────────────┐
                               │  EventBus   │ (in-memory singleton)
                               │  (lib/      │
                               │  events.ts) │
                               └──────┬──────┘
                                      │ emit
                                      ▼
                               API route handlers
                               (starters, tasks, etc.)
```

**Event types**: `starter:created`, `starter:updated`, `starter:deleted`, `task:created`, `task:updated`, `task:completed`, `notification:new`

**Entity scoping**: SSE endpoint determines user's accessible entities from session memberships. HR_ADMIN/GLOBAL_VIEWER receive events for all entities.

**Client-side**: `SSEProvider` wraps `(authenticated)` layout, providing `useSSE(pattern, handler)` hook with wildcard support (`starter:*`, `task:*`).

## Data Architecture

### Schema Management

- **Prisma schema** (`prisma/schema.prisma`): 20 models, 10 enums — source of truth
- **Schema sync**: `prisma db push` (not formal migrations) — idempotent, accepts data loss for dev
- **Data migrations**: Custom SQL in `migrations/` — idempotent scripts run before `db push` in `start.sh`
- **Seeds**: Development data via `prisma/seed.ts`, email/task templates via dedicated scripts

### Key Data Patterns

- **Multi-entity isolation**: Starters, tasks, and resources scoped to entities via `entityId` FKs
- **Soft delete via cancellation**: Starters use `isCancelled` + metadata fields instead of hard delete
- **Template-driven automation**: `TaskTemplate` → `Task` creation via `task-automation.ts`
- **Audit trail**: Every mutation logs to `AuditLog` with actor, action, target, and metadata

## Email System

### Architecture

```
┌─────────────────┐
│ Email Templates  │ (DB: EmailTemplate + TEMPLATE_VARIABLES)
│ {{variables}}    │
└────────┬────────┘
         │ render
         ▼
┌─────────────────┐
│ Template Engine  │ (lib/email-template-engine.ts)
│ renderTemplate() │
└────────┬────────┘
         │ send
         ▼
┌─────────────────┐
│ SendGrid API     │ (lib/email.ts via @sendgrid/mail)
└────────┬────────┘
         │ log
         ▼
┌─────────────────┐
│ EmailLog (DB)    │ (status, error tracking)
└─────────────────┘
```

### Email Triggers

| Trigger | Type | Frequency |
|---------|------|-----------|
| Weekly reminders | Cron | Starters starting within 7 days |
| Monthly summary | Cron | Previous month's starters |
| Quarterly summary | Cron | Previous quarter's starters |
| Yearly summary | Cron | Previous year's starters |
| Task assignment | Event | On new task auto-creation |
| Task reassignment | Event | On task assignee change |
| Starter cancellation | Event | On starter cancel |

## Internationalization

- **Framework**: next-intl 4.8+
- **Locales**: Dutch (NL, default), French (FR)
- **Namespace count**: 37 (matching major UI sections)
- **Locale detection**: Cookie `NEXT_LOCALE` → user DB preference → default `nl`
- **Server**: `getRequestConfig()` loads messages from `messages/{locale}.json`
- **Client**: `NextIntlClientProvider` in root layout; `useTranslations(namespace)` in components

## Deployment Architecture

### Docker Build (Multi-Stage)

```
Stage 1: deps       → npm ci + prisma generate
Stage 2: builder    → next build (standalone output)
Stage 3: runner     → Alpine + OpenSSL + curl + su-exec
                    → Copies standalone build + Prisma + migrations
                    → Installs crontab
                    → Runs start.sh as entrypoint
```

### Startup Sequence (`start.sh`)

1. Execute `fix-contractSignedOn.sql` (idempotent data fix)
2. Execute `split-starter-name.sql` (idempotent name migration)
3. `prisma db push --accept-data-loss` (schema sync)
4. Start `crond` (background)
5. Start Next.js server via `su-exec nextjs:nodejs node server.js`

### Infrastructure

- **Platform**: Easypanel (Docker-based PaaS)
- **Container**: Single container running both Next.js and cron daemon
- **Persistent storage**: Docker volume for `public/uploads/`
- **Database**: External PostgreSQL (connection via `DATABASE_URL`)
- **Health probes**: `/api/health` (liveness), `/api/health/ready` (readiness with DB check)

## Testing Strategy

| Level | Framework | Patterns |
|-------|-----------|----------|
| **Unit** | Vitest | `*.test.ts` / `*.spec.ts` |
| **E2E** | Playwright | `*.test.ts` in test directory |
| **Manual** | — | Admin test email, cron preview/trigger |

## Security Considerations

- **Auth**: JWT sessions with Azure AD; tenant allowlist; NONE role blocks all access
- **RBAC**: Multi-layer enforcement (middleware → auth-utils → rbac → API handlers)
- **Cron**: Bearer token (`CRON_SECRET`) for all scheduled job endpoints
- **File uploads**: Logo max 2MB; uploads served via dedicated route handler
- **Audit**: Immutable log for all mutations (actor, action, target, metadata)
- **2FA**: TOTP support via speakeasy (optional per user)

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| SSE over WebSocket | SSE | Unidirectional; native auth; single-container; auto-reconnect |
| In-memory event bus | Global singleton | Single process; no external broker needed; dev HMR-safe |
| prisma db push over migrations | Schema push | Simpler deployment; custom SQL for data transforms |
| Custom SQL migrations | Idempotent scripts | Safe re-execution; run before schema changes |
| Standalone Docker output | Next.js standalone | Minimal image size; self-contained server.js |
| HSL CSS variables | Theme tokens | Dark/light mode via class toggle; Radix + Tailwind integration |
