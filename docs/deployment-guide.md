# Deployment Guide

> Generated: 2026-04-08 | Scan level: deep

## Overview

Starterskalender deploys as a **single Docker container** running both the Next.js application server and a cron daemon. The primary deployment target is **Easypanel** (Docker-based PaaS), though the container can run on any Docker host.

## Docker Build

### Multi-Stage Dockerfile

The production build uses a 3-stage Dockerfile:

| Stage | Base | Purpose |
|-------|------|---------|
| **deps** | `node:20-alpine3.19` | `npm ci` + `prisma generate` |
| **builder** | `node:20-alpine3.19` | `next build` (standalone output) |
| **runner** | `node:20-alpine3.19` | Minimal runtime: OpenSSL + curl + su-exec |

### Build Command

```bash
docker build -t starterskalender:latest .
```

### Build Output

- Next.js **standalone** mode produces a self-contained `server.js` + `.next/` directory
- Prisma client and CLI copied for runtime schema operations
- Custom SQL migrations copied from `migrations/`
- Crontab installed at `/etc/crontabs/root`
- `start.sh` serves as the entrypoint

## Container Architecture

```
┌─────────────────────────────────┐
│        Docker Container          │
│                                  │
│  ┌─────────────────────────┐    │
│  │   crond (background)    │    │  ← Scheduled email digests
│  │   PID: cron process     │    │
│  └─────────────────────────┘    │
│                                  │
│  ┌─────────────────────────┐    │
│  │   Node.js (foreground)  │    │  ← Next.js standalone server
│  │   Port: 3000            │    │
│  │   User: nextjs (1001)   │    │
│  └─────────────────────────┘    │
│                                  │
│  Volumes:                        │
│   /app/public/uploads (persist) │  ← User-uploaded files
└─────────────────────────────────┘
         │
         │ DATABASE_URL
         ▼
┌─────────────────────────────────┐
│       PostgreSQL (external)      │
└─────────────────────────────────┘
```

## Startup Sequence

The entrypoint `start.sh` executes:

1. **Data migrations** — Idempotent SQL scripts:
   - `fix-contractSignedOn.sql` — Fix NULL values
   - `split-starter-name.sql` — Split name into firstName/lastName
2. **Schema sync** — `prisma db push --accept-data-loss`
3. **Start crond** — Background process for scheduled jobs
4. **Start Next.js** — `su-exec nextjs:nodejs node server.js` (foreground)

This order ensures data is transformed **before** the new schema is enforced.

## Environment Configuration

### Required Variables

| Variable | Example | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | PostgreSQL connection |
| `NEXTAUTH_URL` | `https://app.example.com` | Public application URL |
| `NEXTAUTH_SECRET` | `<random-string>` | JWT signing secret |
| `NODE_ENV` | `production` | Must be `production` |

### Azure AD SSO

| Variable | Description |
|----------|-------------|
| `AZURE_AD_CLIENT_ID` | App registration client ID |
| `AZURE_AD_CLIENT_SECRET` | App registration secret |
| `AZURE_AD_TENANT_ID` | Directory (tenant) ID |
| `ALLOWED_TENANT_IDS` | Comma-separated allowed tenants |

### Email

| Variable | Description |
|----------|-------------|
| `SENDGRID_API_KEY` | SendGrid API key for transactional email |
| `EMAIL_FROM` | Sender address |
| `EMAIL_REPLY_TO` | Reply-to address |

### QES Document Signing (Quill by Dioss)

| Variable | Example | Description |
|----------|---------|-------------|
| `QUILL_API_URL` | `https://your-tenant.quill.dioss.com` | Quill API base URL |
| `QUILL_CLIENT_ID` | `your-company-client-id` | Quill OAuth2 client ID |
| `QUILL_API_KEY` | `your-api-key` | Quill OAuth2 client secret |

These are optional. When not set, QES signing is unavailable and documents default to SES (Simple Electronic Signature). When set, HR users can choose "Juridische handtekening via itsme/eID (QES)" when uploading documents.

### Cron Jobs

| Variable | Description |
|----------|-------------|
| `CRON_SECRET` | Bearer token for cron endpoint authentication |

## Easypanel Deployment

### Setup

1. Create a new service in Easypanel
2. Connect to GitHub repository
3. Set build type to **Dockerfile**
4. Configure environment variables
5. Add a persistent volume: `/app/public/uploads`
6. Set health check to `/api/health`
7. Deploy

### Volume Mount

| Mount Point | Purpose |
|-------------|---------|
| `/app/public/uploads` | User-uploaded files (logos, etc.) |

### Port Configuration

| Port | Protocol | Purpose |
|------|----------|---------|
| 3000 | HTTP | Next.js application |

## Health Probes

| Endpoint | Type | Description |
|----------|------|-------------|
| `GET /api/health` | Liveness | Always returns `{ status: "ok" }` |
| `GET /api/health/ready` | Readiness | Verifies DB connection + env vars present |

## Cron Schedule

Defined in `crontab`:

| Schedule | Endpoint | Description |
|----------|----------|-------------|
| Weekly | `/api/cron/send-weekly-reminders` | Starters starting in 7 days |
| Monthly | `/api/cron/send-monthly-summary` | Previous month digest |
| Quarterly | `/api/cron/send-quarterly-summary` | Previous quarter digest |
| Yearly | `/api/cron/send-yearly-summary` | Previous year digest |

Cron jobs use `curl` to hit the local API with `Authorization: Bearer $CRON_SECRET`.

## Security Considerations

- **Non-root**: Application runs as `nextjs:nodejs` (UID 1001) via `su-exec`
- **Cron auth**: All scheduled endpoints require `CRON_SECRET` bearer token
- **Minimal image**: Alpine-based with only essential runtime packages
- **No secrets in image**: All sensitive values via environment variables
- **Upload limits**: Logo upload capped at 2MB
- **DB migrations**: Idempotent — safe for rolling restarts

## Monitoring

- **Health probes**: Use `/api/health` and `/api/health/ready` for container orchestration
- **Audit logs**: All mutations logged to `AuditLog` table — viewable at `/admin/audit-log`
- **Email logs**: Email delivery tracked in `EmailLog` table — viewable at `/admin/cron-jobs`
- **SSE status**: Client-side connection indicator in navbar (Wifi icon)

## Rollback Strategy

1. **Schema**: `prisma db push` is additive; schema changes are forward-only
2. **Data migrations**: Idempotent scripts check state before executing — safe to re-run
3. **Container**: Roll back to previous image tag in Easypanel
4. **Database**: External PostgreSQL — manage backups independently
