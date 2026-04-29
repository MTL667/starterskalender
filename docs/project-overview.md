# Starterskalender — Project Overview

> Generated: 2026-04-08 | Scan level: deep

## Executive Summary

**Starterskalender** is a production-grade web application for managing employee onboarding, offboarding, and internal migrations across multiple legal entities. Built as a multi-tenant SaaS-style tool with role-based access control, it replaces manual Excel-based tracking with a structured calendar, task automation, material tracking, KPI dashboards, and real-time collaboration features.

The application serves HR administrators and entity-level editors/viewers, providing a centralized platform for tracking new hires, departures, and inter-entity transfers with full audit trails, automated email notifications, and Microsoft 365 integration.

## Quick Reference

| Property | Value |
|----------|-------|
| **Repository Type** | Monolith |
| **Primary Language** | TypeScript |
| **Framework** | Next.js 16 (App Router) |
| **Runtime** | Node.js 20+ |
| **React** | React 19 |
| **Database** | PostgreSQL (via Prisma 5) |
| **Authentication** | NextAuth 4 + Azure AD / Entra ID (multi-tenant) |
| **Authorization** | RBAC (5 roles: HR_ADMIN, GLOBAL_VIEWER, ENTITY_EDITOR, ENTITY_VIEWER, NONE) |
| **UI Framework** | Tailwind CSS 3 + Radix UI + Lucide Icons |
| **i18n** | next-intl (Dutch + French, 37 namespaces) |
| **Real-Time** | Server-Sent Events (in-memory event bus) |
| **Email** | SendGrid + Nodemailer |
| **Charts** | Recharts 3 |
| **Testing** | Vitest + Playwright |
| **Deployment** | Docker (multi-stage) → Easypanel |
| **Entry Point** | `app/layout.tsx` → `middleware.ts` → `app/(authenticated)/` |
| **Architecture** | Layered: Pages → API Routes → Prisma → PostgreSQL |

## Technology Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | Next.js | 16.1+ | App Router, SSR, API routes, standalone build |
| **Language** | TypeScript | 5.3+ | Type safety across full stack |
| **UI Runtime** | React | 19.2+ | Component rendering |
| **Database ORM** | Prisma | 5.18+ | Schema management, migrations, type-safe queries |
| **Database** | PostgreSQL | — | Primary data store |
| **Auth Provider** | NextAuth | 4.24+ | Session management, JWT, provider abstraction |
| **Identity** | Azure AD / Entra ID | — | SSO, multi-tenant, tenant allowlist |
| **UI Components** | Radix UI | Various | Accessible, unstyled primitives |
| **Styling** | Tailwind CSS | 3.4+ | Utility-first CSS with HSL theme tokens |
| **Icons** | Lucide React | 0.294+ | Icon library |
| **Charts** | Recharts | 3.3+ | Bar, line, area charts for dashboards |
| **i18n** | next-intl | 4.8+ | Server/client translations, locale routing |
| **Email** | @sendgrid/mail | 8.1+ | Transactional email delivery |
| **PDF** | jsPDF + jsPDF-AutoTable | 3.0+ | PDF export generation |
| **Excel** | xlsx | 0.18+ | Excel export generation |
| **Date** | date-fns + date-fns-tz | 2.30+ | Date math, ISO weeks, timezone (Europe/Brussels) |
| **Validation** | Zod | 3.22+ | Request body validation |
| **Graph API** | @microsoft/microsoft-graph-client | 3.0+ | Room availability, calendar integration |
| **TOTP** | speakeasy | 2.0+ | Two-factor authentication |
| **QR** | qrcode | 1.5+ | QR code generation for 2FA |
| **Theme** | next-themes | 0.4+ | Dark/light mode |
| **Cron** | node-cron | 3.0+ | Scheduled email digests |
| **Testing** | Vitest | 1.2+ | Unit testing |
| **E2E Testing** | Playwright | 1.41+ | End-to-end browser testing |

## Architecture Pattern

**Layered monolith** following Next.js App Router conventions:

```
┌─────────────────────────────────────────────┐
│ Client (React 19 + SSE Provider)            │
│  ├── Pages (app/(authenticated)/)           │
│  ├── Components (components/)               │
│  └── UI Primitives (components/ui/)         │
├─────────────────────────────────────────────┤
│ Middleware (middleware.ts)                   │
│  └── Auth gate + locale sync                │
├─────────────────────────────────────────────┤
│ API Layer (app/api/)                        │
│  ├── REST endpoints (63 route files)        │
│  ├── SSE endpoint (real-time events)        │
│  ├── Cron endpoints (scheduled jobs)        │
│  └── Health probes                          │
├─────────────────────────────────────────────┤
│ Business Logic (lib/)                       │
│  ├── RBAC (rbac.ts, auth-utils.ts)          │
│  ├── Task Automation (task-automation.ts)    │
│  ├── Email (email.ts, template engine)      │
│  ├── Events (events.ts — SSE bus)           │
│  └── Integrations (graph.ts — MS Graph)     │
├─────────────────────────────────────────────┤
│ Data Layer (Prisma 5)                       │
│  ├── 20 models, 10 enums                   │
│  ├── Custom SQL migrations                  │
│  └── PostgreSQL                             │
└─────────────────────────────────────────────┘
```

## Core Business Domains

| Domain | Models | Key Features |
|--------|--------|--------------|
| **Starters** | Starter, StarterMaterial | Onboarding, offboarding, migration tracking |
| **Tasks** | Task, TaskTemplate, TaskAssignment | Automated task creation, assignment, completion |
| **Entities** | Entity, Membership | Multi-entity structure with RBAC |
| **Materials** | Material, JobRoleMaterial, StarterMaterial | Equipment/access tracking per job role |
| **Notifications** | Notification, NotificationPreference, EmailTemplate | In-app + email notifications, digest scheduling |
| **Calendar** | BlockedPeriod | Blocked date management per entity/role |
| **Rooms** | Room, Booking | Meeting room booking with MS Graph sync |
| **Users** | User, AllowedTenant | Azure AD SSO, roles, tenant allowlist |
| **Audit** | AuditLog | Full audit trail for all mutations |
| **Settings** | SystemSettings, SignatureTemplate | Branding, email signatures per entity |

## Repository Statistics

| Metric | Count |
|--------|-------|
| API route files | 63 |
| React components | 38 |
| Library modules | 19 |
| Prisma models | 20 |
| Prisma enums | 10 |
| i18n namespaces | 37 |
| Supported locales | 2 (NL, FR) |
| Admin pages | 16 |
| Cron endpoints | 5 |
| Existing documentation files | 14 (.md) |
