# Source Tree Analysis

> Generated: 2026-04-08 | Scan level: deep | Project type: web (Next.js 16)

## Repository Structure

```
starterskalender/                      # Monolith — Next.js 16 App Router
├── app/                               # Next.js App Router pages & API
│   ├── layout.tsx                     # Root: Inter font, i18n, theme, session providers
│   ├── page.tsx                       # Entry redirect: → /auth/signin or /dashboard
│   ├── providers.tsx                  # Client: SessionProvider + ThemeProvider
│   ├── globals.css                    # Tailwind base + CSS variables (HSL theme tokens)
│   ├── (authenticated)/               # Route group — shared authenticated chrome
│   │   ├── layout.tsx                 # Session gate → SSEProvider → Navbar → <main>
│   │   ├── dashboard/page.tsx         # Welcome hub: stats, charts, recent starters, tasks
│   │   ├── kalender/page.tsx          # Calendar view (week/month/year/custom)
│   │   ├── starters/page.tsx          # Starters table view with export
│   │   ├── taken/page.tsx             # Task list + detail dialog
│   │   ├── profiel/page.tsx           # User notification preferences
│   │   ├── onboarding/page.tsx        # First-time setup wizard (entities)
│   │   └── admin/                     # HR Admin pages
│   │       ├── page.tsx               # Admin hub (requireAdmin)
│   │       ├── entities/page.tsx      # Entity CRUD
│   │       ├── users/page.tsx         # User management + roles
│   │       ├── job-roles/page.tsx     # Job roles + materials dialog
│   │       ├── materials/page.tsx     # Materials catalog
│   │       ├── material-matrix/page.tsx  # Materials × Job roles grid
│   │       ├── task-assignments/page.tsx # Task type → default assignee
│   │       ├── blocked-periods/page.tsx  # Date blocks per entity/role
│   │       ├── kpi/page.tsx           # KPI dashboard (requireAdmin)
│   │       ├── signature-templates/page.tsx # Email signature builder
│   │       ├── email-templates/page.tsx    # Transactional email templates
│   │       ├── audit-log/page.tsx     # Audit log viewer + export
│   │       ├── allowed-tenants/page.tsx   # Azure AD tenant allowlist
│   │       ├── branding/page.tsx      # Logo upload, system settings
│   │       ├── cron-jobs/page.tsx     # Cron preview, triggers, email logs
│   │       ├── task-diagnostics/page.tsx  # Task/template diagnostics
│   │       └── mail-test/page.tsx     # Test email sender
│   ├── api/                           # API Route Handlers
│   │   ├── auth/[...nextauth]/route.ts  # NextAuth endpoints
│   │   ├── sse/route.ts              # Server-Sent Events endpoint
│   │   ├── health/route.ts           # Liveness probe
│   │   ├── health/ready/route.ts     # Readiness probe (DB check)
│   │   ├── starters/route.ts         # Starters CRUD + RBAC
│   │   ├── starters/[id]/route.ts    # Individual starter ops
│   │   ├── starters/[id]/cancel/route.ts  # Cancel with notifications
│   │   ├── starters/[id]/materials/route.ts  # Starter materials
│   │   ├── starters/[id]/regenerate-tasks/route.ts  # Re-create auto tasks
│   │   ├── starters/employees/route.ts  # Distinct employees picker
│   │   ├── tasks/route.ts            # Tasks CRUD
│   │   ├── tasks/[id]/route.ts       # Individual task ops
│   │   ├── tasks/[id]/complete/route.ts  # Task completion
│   │   ├── entities/route.ts         # Entities CRUD
│   │   ├── entities/[id]/route.ts    # Individual entity ops
│   │   ├── job-roles/route.ts        # Job roles CRUD
│   │   ├── job-roles/[id]/route.ts   # Individual job role
│   │   ├── job-roles/[id]/materials/route.ts  # Job role materials
│   │   ├── materials/route.ts        # Materials CRUD
│   │   ├── materials/[id]/route.ts   # Individual material
│   │   ├── blocked-periods/route.ts  # Blocked periods CRUD + check
│   │   ├── blocked-periods/[id]/route.ts
│   │   ├── notifications/route.ts    # User notifications
│   │   ├── notifications/[id]/read/route.ts  # Mark read
│   │   ├── notifications/mark-all-read/route.ts
│   │   ├── signature-templates/route.ts  # Signature templates CRUD
│   │   ├── stats/ytd/route.ts        # Year-to-date statistics
│   │   ├── stats/kpi/route.ts        # KPI metrics (HR_ADMIN)
│   │   ├── setup/check/route.ts      # Initial setup check
│   │   ├── system/settings/route.ts  # Public system settings
│   │   ├── uploads/[...path]/route.ts # Static file serving
│   │   ├── user/locale/route.ts      # Locale preference
│   │   ├── user/notification-preferences/route.ts
│   │   ├── admin/                     # Admin-only API routes
│   │   │   ├── users/route.ts        # User management
│   │   │   ├── users/[id]/...        # Memberships, prefs
│   │   │   ├── allowed-tenants/route.ts  # Tenant allowlist
│   │   │   ├── audit-logs/route.ts   # Audit log queries
│   │   │   ├── email-templates/route.ts  # Email template CRUD
│   │   │   ├── email-logs/route.ts   # Email send logs
│   │   │   ├── task-assignments/route.ts # Task assignment CRUD
│   │   │   ├── task-diagnostics/route.ts # Diagnostics
│   │   │   ├── cron-preview/route.ts # Cron recipient preview
│   │   │   ├── cron-diagnostics/route.ts # Cron env diagnostics
│   │   │   ├── trigger-cron/route.ts # Manual cron trigger
│   │   │   ├── material-matrix/route.ts  # Material × role matrix
│   │   │   ├── mail-config/route.ts  # Mail config status
│   │   │   ├── mail-test/route.ts    # Send test email
│   │   │   └── system/logo/route.ts  # Logo upload/delete
│   │   └── cron/                      # Cron job endpoints
│   │       ├── email-reminder/route.ts    # Weekly reminders
│   │       ├── send-weekly-reminders/route.ts
│   │       ├── send-monthly-summary/route.ts
│   │       ├── send-quarterly-summary/route.ts
│   │       └── send-yearly-summary/route.ts
│   └── auth/                          # Public auth pages
│       ├── signin/page.tsx            # Azure AD + dev credentials
│       └── welcome/page.tsx           # Pending approval page
├── components/                        # React components
│   ├── admin/                         # Admin-specific components
│   │   ├── kpi-dashboard.tsx          # KPI analytics dashboard
│   │   ├── user-notification-prefs-dialog.tsx
│   │   ├── job-role-materials-dialog.tsx
│   │   └── user-memberships-dialog.tsx
│   ├── dashboard/                     # Dashboard widgets
│   │   ├── my-tasks.tsx               # Assigned tasks overview
│   │   ├── recent-starters.tsx        # Upcoming starters
│   │   ├── ytd-stats.tsx              # Year-to-date counts
│   │   ├── monthly-charts.tsx         # Monthly type charts
│   │   └── entity-monthly-charts.tsx  # Entity breakdown charts
│   ├── kalender/                      # Calendar feature
│   │   ├── calendar-view.tsx          # Main calendar (week/month/year/custom)
│   │   ├── starter-card.tsx           # Starter badge card
│   │   └── starter-dialog.tsx         # Full create/edit/cancel dialog
│   ├── layout/                        # App shell components
│   │   ├── navbar.tsx                 # Navigation + SSE status
│   │   ├── notification-bell.tsx      # Real-time notification bell
│   │   └── language-switcher.tsx      # NL/FR locale toggle
│   ├── providers/                     # React context providers
│   │   └── sse-provider.tsx           # SSE connection + event bus
│   ├── starters/                      # Starter list feature
│   │   └── starters-table.tsx         # Sortable data table + export
│   ├── tasks/                         # Task components
│   │   ├── task-card.tsx              # Task summary card
│   │   ├── task-detail-dialog.tsx     # Task detail + actions
│   │   └── task-status-icon.tsx       # Status icons
│   ├── ui/                            # Radix UI primitives (15 files)
│   │   ├── alert.tsx, badge.tsx, button.tsx, card.tsx, checkbox.tsx
│   │   ├── dialog.tsx, dropdown-menu.tsx, input.tsx, label.tsx
│   │   ├── popover.tsx, select.tsx, switch.tsx, tabs.tsx, textarea.tsx
│   │   └── export-dropdown.tsx
│   ├── signature-generator-dialog.tsx # Email signature generator
│   ├── signature-builder.tsx          # Signature template builder
│   └── theme-toggle.tsx               # Dark/light mode toggle
├── lib/                               # Server & shared utilities
│   ├── prisma.ts                      # PrismaClient singleton
│   ├── auth-options.ts                # NextAuth config (Azure AD)
│   ├── auth-utils.ts                  # Auth/RBAC server helpers
│   ├── rbac.ts                        # Role-Based Access Control logic
│   ├── audit.ts                       # Audit logging
│   ├── events.ts                      # In-memory SSE event bus
│   ├── email.ts                       # SendGrid email sending
│   ├── email-template-engine.ts       # Template variable rendering
│   ├── cron-email-helpers.ts          # Digest email HTML builders
│   ├── cron-auth.ts                   # Cron endpoint auth
│   ├── task-automation.ts             # Auto-create tasks from templates
│   ├── graph.ts                       # Microsoft Graph client (MSAL)
│   ├── availability.ts               # Room availability (Graph)
│   ├── week-utils.ts                  # ISO week math (Europe/Brussels)
│   ├── date-locale.ts                 # date-fns locale mapping
│   ├── experience-utils.ts            # Work experience duration calc
│   ├── types.ts                       # Shared TypeScript interfaces
│   ├── utils.ts                       # cn() + normalizeString
│   └── cron/
│       └── email-reminder.ts          # Standalone reminder job
├── prisma/                            # Database layer
│   ├── schema.prisma                  # 20 models, 10 enums
│   ├── seed.ts                        # Development seed data
│   ├── seed-email-templates.js        # Email template seeds
│   ├── seed-task-templates.js         # Task template seeds
│   ├── fix-template-types.js          # Template type fix script
│   └── migrations/                    # Prisma migration history
├── migrations/                        # Custom SQL migrations
│   ├── fix-contractSignedOn.sql       # Fix NULL contractSignedOn
│   └── split-starter-name.sql         # Split name → firstName + lastName
├── i18n/                              # Internationalization config
│   ├── request.ts                     # next-intl request config
│   └── routing.ts                     # Locale definitions (nl, fr)
├── messages/                          # Translation files
│   ├── nl.json                        # Dutch (37 namespaces)
│   └── fr.json                        # French (37 namespaces)
├── types/                             # Global TypeScript declarations
│   └── next-auth.d.ts                 # Session/JWT augmentation
├── public/                            # Static assets
│   └── uploads/                       # User-uploaded files
├── docker/                            # Docker support files
├── Dockerfile                         # Multi-stage production build
├── Dockerfile.alternative             # Alternative build
├── Dockerfile.cron                    # Cron-only container
├── docker-compose.yml                 # Production compose
├── docker-compose.dev.yml             # Dev compose with PostgreSQL
├── start.sh                           # Entrypoint: migrations → db push → cron → next
├── crontab                            # Cron schedule definitions
├── middleware.ts                       # Auth middleware + locale sync
├── next.config.js                     # Next.js config (i18n, standalone)
├── tailwind.config.ts                 # Tailwind + Radix theme tokens
├── tsconfig.json                      # TypeScript (ES2020, bundler)
├── postcss.config.js                  # PostCSS (Tailwind + Autoprefixer)
├── package.json                       # Dependencies & scripts
├── vercel.json                        # Vercel config (unused in production)
└── *.md                               # Feature documentation (14 files)
```

## Critical Directories

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `app/api/` | REST API (63 route files) | All CRUD endpoints, SSE, cron, health |
| `app/(authenticated)/` | Protected UI pages | Dashboard, calendar, starters, tasks, admin |
| `components/` | 38 React components | Feature + layout + UI primitives |
| `lib/` | 19 utility modules | Auth, RBAC, email, events, automation |
| `prisma/` | Database schema & seeds | 20 models, 10 enums, seed scripts |
| `messages/` | i18n translations | 37 namespaces in NL + FR |
| `migrations/` | Custom SQL migrations | Idempotent data transformations |

## Entry Points

| Entry Point | File | Description |
|-------------|------|-------------|
| Web application | `app/layout.tsx` → `app/page.tsx` | Root layout with providers, redirects to dashboard |
| API | `app/api/**/route.ts` | 63 API route handler files |
| SSE | `app/api/sse/route.ts` | Real-time event stream |
| Auth | `app/api/auth/[...nextauth]/route.ts` | NextAuth signin/callback/session |
| Cron | `app/api/cron/*/route.ts` | 5 scheduled job endpoints |
| Docker | `start.sh` → `server.js` | Migration → schema sync → cron → Next.js |
| Middleware | `middleware.ts` | Auth gate + locale sync for all routes |
