# Project Context: Starterskalender

## Overview

Starterskalender is an internal HR tool for managing employee lifecycle events — onboarding (new hires), offboarding (leavers), and internal migrations between organizational entities. It provides calendar-based visualization, task management, material tracking, and automated email notifications for HR teams managing multi-entity organizations.

The application is built for a Belgian HR context (Dutch/French bilingual) and deployed as a Docker container on Easypanel with PostgreSQL.

## Business Domain

### Core Problem
HR administrators managing multiple organizational entities need a centralized system to track all personnel movements (arrivals, departures, internal transfers), assign and track onboarding/offboarding tasks, manage material provisioning, and notify relevant stakeholders at the right time.

### Target Users
- **HR Administrators** — Full access, manage all entities, users, templates, materials, job roles
- **Global Viewers** — Read access across all entities (e.g. C-level, finance)
- **Entity Editors** — Manage starters/tasks for specific entities they're assigned to
- **Entity Viewers** — View-only access to specific entities

### Key Business Concepts
- **Entity** — An organizational unit (department, subsidiary, division) with its own color, job roles, and members
- **Starter** — A personnel movement record: onboarding (new hire), offboarding (leaver), or migration (internal transfer)
- **Task** — An action item generated from templates, assigned to responsible users (IT setup, HR admin, facilities, manager actions)
- **Material** — Physical/digital assets (laptop, phone, badge, software licenses) tracked per job role and per starter
- **Job Role** — A function within an entity, with an associated material matrix
- **Blocked Period** — Date ranges where no new starters should be onboarded for an entity/role

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, standalone Docker output) |
| Language | TypeScript 5 (strict mode) |
| Runtime | React 19, Node.js 20 |
| Database | PostgreSQL via Prisma 5 ORM |
| Authentication | NextAuth 4 with Azure AD (Entra ID) SSO + optional credentials provider |
| Authorization | Role-based (5 roles) + entity-scoped memberships |
| Email | SendGrid (@sendgrid/mail) + Nodemailer fallback |
| UI | Radix UI primitives + shadcn/ui pattern, Tailwind CSS 3, Lucide icons |
| i18n | next-intl (Dutch + French) |
| Charts | Recharts |
| Export | jsPDF + jspdf-autotable (PDF), xlsx (Excel) |
| Theming | next-themes (light/dark mode) |
| Validation | Zod schemas at API boundaries |
| Azure Integration | @azure/msal-node, Microsoft Graph client |
| Deployment | Docker (Easypanel), PostgreSQL |

## Architecture

### Application Structure

```
app/                          # Next.js App Router
├── (authenticated)/          # Route group requiring auth
│   ├── dashboard/            # Dashboard with stats, charts, quick links
│   ├── kalender/             # Calendar view (week/month/year/custom)
│   ├── starters/             # Table view of all starters
│   ├── taken/                # Task management page
│   ├── profiel/              # User profile & notification preferences
│   ├── onboarding/           # New user onboarding flow
│   └── admin/                # Admin section (15 sub-pages)
├── api/                      # 61 API route handlers
│   ├── admin/                # Admin-only endpoints
│   ├── cron/                 # Scheduled email endpoints (CRON_SECRET auth)
│   ├── auth/                 # NextAuth catch-all
│   └── ...                   # Domain CRUD endpoints
├── auth/                     # Public auth pages (signin, welcome)
└── layout.tsx                # Root layout with providers
components/
├── admin/                    # Admin dialogs (notifications, materials, memberships)
├── dashboard/                # Dashboard widgets (stats, charts, recent starters)
├── kalender/                 # Calendar view, starter card, starter dialog
├── layout/                   # Navbar, notification bell, language switcher
├── starters/                 # Starters table
├── tasks/                    # Task card, detail dialog, status icon, helpers
└── ui/                       # Shared UI primitives (shadcn/ui style)
lib/
├── auth-options.ts           # NextAuth configuration (Azure AD + credentials)
├── auth-utils.ts             # Server-side auth helpers (getCurrentUser, requireAdmin, etc.)
├── rbac.ts                   # Role-based access control helpers
├── prisma.ts                 # Prisma client singleton
├── email.ts                  # Email sending (SendGrid)
├── email-template-engine.ts  # Template variable replacement
├── cron-email-helpers.ts     # Shared cron email rendering utilities
├── cron-auth.ts              # CRON_SECRET verification
├── task-automation.ts        # Auto-generate tasks from templates
├── audit.ts                  # Audit logging
├── types.ts                  # Shared TypeScript types
├── week-utils.ts             # ISO week number calculations
├── date-locale.ts            # Date formatting locale helpers
├── experience-utils.ts       # Experience text formatting
└── utils.ts                  # General utilities (cn, etc.)
```

### Authentication & Authorization

**Authentication Flow:**
1. Azure AD SSO via NextAuth (primary) — users authenticate with their Microsoft work account
2. Credentials provider (development only) — email/password for local testing
3. Tenant allowlist — only approved Azure AD tenants can sign in
4. New sign-ins get `NONE` role and are redirected to a welcome page until activated by an admin

**RBAC Model:**
- `HR_ADMIN` — Full access to all features and all entities
- `GLOBAL_VIEWER` — Read access to all entities (no mutations)
- `ENTITY_EDITOR` — Read/write access to specific entities via Membership
- `ENTITY_VIEWER` — Read-only access to specific entities via Membership
- `NONE` — Pending activation (blocked from all data/actions)

Entity-scoped access is controlled through the `Membership` model (M:N User <-> Entity with `canEdit` flag).

**Protection layers:**
1. Middleware — route-level session check, NONE redirect, locale cookie
2. Server helpers — `requireAuth()`, `requireAdmin()`, `requireEntityAccess()`
3. RBAC helpers — `isHRAdmin()`, `hasEntityAccess()`, `filterStartersByRBAC()`

### Database Schema (20+ models)

**Core domain models:**
- `User` — accounts with global role, Azure AD fields, locale, 2FA support
- `Entity` — organizational units with color, memberships, job roles
- `Membership` — M:N User <-> Entity with canEdit permission
- `Starter` — personnel records (onboarding/offboarding/migration) with dates, entity, role, experience fields
- `JobRole` — functions per entity with material matrix
- `Task` / `TaskTemplate` — auto-generated tasks from templates with assignment, status, priority
- `TaskAssignment` — default responsible user per entity+task type
- `Material` / `JobRoleMaterial` / `StarterMaterial` — material catalog, role matrix, and per-starter tracking

**Supporting models:**
- `NotificationPreference` — per-user, per-entity email toggle settings
- `EmailTemplate` — customizable email templates per notification type
- `EmailLog` — outbound email audit trail
- `Notification` — in-app notifications (bell icon)
- `AuditLog` — action audit trail with actor, action, target, metadata
- `BlockedPeriod` — date ranges blocking new starters per entity/role
- `Room` / `Booking` — room/resource booking with Microsoft Graph integration
- `SignatureTemplate` — HTML email signature templates per entity
- `AllowedTenant` — Azure AD tenant allowlist for SSO
- `SystemSettings` — key/value branding configuration

### Cron Jobs & Email System

Four scheduled email types, each with its own API route under `/api/cron/`:
- **Weekly Reminders** — starters arriving next week
- **Monthly Summary** — starters for the coming month
- **Quarterly Summary** — starters for the coming quarter
- **Yearly Summary** — annual overview

Each cron route:
1. Verifies CRON_SECRET authentication
2. Queries eligible users via notification preferences + entity memberships
3. Groups starters by type (onboarding/offboarding/migration) with visual distinction
4. Renders HTML emails using shared helpers (`lib/cron-email-helpers.ts`)
5. Sends via SendGrid and logs to EmailLog

Admin features include cron preview (recipient selection), manual trigger, and diagnostics.

## Feature Inventory

### User-Facing Pages
| Page | Description |
|------|------------|
| Dashboard | Welcome, YTD stats (Recharts), recent starters, my tasks, monthly charts per entity |
| Calendar | Week/month/year/custom views, entity filters, type filters, create/edit starters, deep-link support, PDF/Excel export |
| Starters | Sortable/filterable table view, search, export, experience tracking |
| Tasks | Task list grouped by status (urgent/queued/in-progress/completed/blocked), task detail dialog, reassignment (admin), notification deep-links |
| Profile | Notification preferences per entity, language selection |
| Onboarding | Welcome flow for new users with NONE role |

### Admin Pages (15)
| Page | Description |
|------|------------|
| Entities | CRUD organizational units |
| Job Roles | Manage functions per entity, material warning badges |
| Users | Manage user accounts, roles, memberships, notification prefs |
| Materials | Material catalog management |
| Material Matrix | Visual matrix of materials per job role |
| Task Assignments | Default task owners per entity and type |
| Signature Templates | HTML email signature editor per entity |
| Blocked Periods | Manage no-hire date ranges per entity/role |
| Cron Jobs | Preview recipients, manual trigger, email logs, diagnostics |
| Email Templates | Edit email content templates |
| Audit Log | Searchable/filterable action log |
| Allowed Tenants | Azure AD tenant allowlist |
| Branding | Logo and system settings |
| Task Diagnostics | Task system health checks |
| Mail Test | Send test emails |

### API Routes (61 endpoints)
Organized under `/api/` with RESTful patterns:
- Domain CRUD: starters, entities, job-roles, materials, tasks, blocked-periods, signature-templates, notifications
- Admin: users, memberships, task-assignments, audit-logs, email-logs, email-templates, system settings, cron management
- Auth: NextAuth catch-all
- Cron: 4 scheduled email endpoints + legacy reminder
- System: health checks, setup verification

## Integrations

### Azure AD / Entra ID
- SSO authentication via MSAL
- Tenant-based access control (AllowedTenant model)
- Microsoft Graph client for room booking and resource management

### SendGrid
- Primary email delivery for all cron notifications and test emails
- Template-based with variable substitution engine
- Full email logging and error tracking

## Internationalization

- Two locales: Dutch (nl, default) and French (fr)
- next-intl with server/client translation hooks
- ~1000+ translation keys covering all features
- Locale stored per user in database, synced via cookie

## Deployment

- Dockerized Next.js standalone build
- Separate cron Dockerfile for scheduled tasks
- PostgreSQL database (managed via Prisma, no migrations directory — uses `db push`)
- Deployed on Easypanel with environment-based configuration
- Build args for all secrets (DATABASE_URL, Azure AD, SendGrid, CRON_SECRET, etc.)
