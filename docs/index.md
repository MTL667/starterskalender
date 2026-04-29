# Starterskalender — Project Documentation Index

> Generated: 2026-04-08 | Deep scan | Next.js 16 monolith

## Project Overview

- **Type:** Monolith — single cohesive codebase
- **Primary Language:** TypeScript
- **Framework:** Next.js 16 (App Router) + React 19
- **Database:** PostgreSQL via Prisma 5
- **Architecture:** Layered monolith (Pages → API Routes → Business Logic → Prisma → PostgreSQL)

## Quick Reference

- **Tech Stack:** Next.js 16, React 19, Prisma 5, PostgreSQL, Tailwind CSS, Radix UI, NextAuth + Azure AD, SendGrid, SSE, Recharts
- **Entry Point:** `app/layout.tsx` → `middleware.ts` → `app/(authenticated)/`
- **Architecture Pattern:** Layered monolith with RBAC, SSE real-time, and task automation
- **Roles:** HR_ADMIN, GLOBAL_VIEWER, ENTITY_EDITOR, ENTITY_VIEWER, NONE
- **Locales:** Dutch (NL, default), French (FR) — 37 i18n namespaces
- **Deployment:** Docker (standalone) → Easypanel + embedded cron daemon

## Generated Documentation

- [Project Overview](./project-overview.md)
- [Architecture](./architecture.md)
- [Source Tree Analysis](./source-tree-analysis.md)
- [API Contracts](./api-contracts.md)
- [Data Models](./data-models.md)
- [Component Inventory](./component-inventory.md)
- [Development Guide](./development-guide.md)
- [Deployment Guide](./deployment-guide.md)

## Existing Documentation

- [README](../README.md) — Project introduction and setup
- [Azure AD Setup](../AZURE_AD_SETUP.md) — Azure AD / Entra ID SSO configuration
- [Cron Setup](../CRON_SETUP.md) — Cron job configuration
- [Cron Setup (Easypanel)](../CRON_SETUP_EASYPANEL.md) — Easypanel-specific cron
- [Cron Troubleshooting](../CRON_TROUBLESHOOTING.md) — Cron debugging guide
- [Easypanel Deployment](../EASYPANEL.md) — Easypanel deployment guide
- [Easypanel Volumes](../EASYPANEL_VOLUME_SETUP.md) — Volume mount setup
- [Email Templates](../EMAIL_TEMPLATES.md) — Email template system
- [Notifications Setup](../NOTIFICATIONS_SETUP.md) — Notification system
- [Room Booking Setup](../ROOM_BOOKING_SETUP.md) — Room booking feature
- [Room Booking Summary](../ROOM_BOOKING_SUMMARY.md) — Room booking overview
- [Task Manager](../TASK_MANAGER.md) — Task management documentation
- [Task Templates Setup](../TASK_TEMPLATES_SETUP.md) — Task template configuration
- [Logo Troubleshooting](../LOGO_TROUBLESHOOTING.md) — Logo upload debugging

## Planning Artifacts

- [Product Requirements Document](../_bmad-output/planning-artifacts/prd.md)
- [Epics & Stories](../_bmad-output/planning-artifacts/epics.md)
- [Implementation Readiness Report](../_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-08.md)

## Getting Started

### For Developers

1. Review the [Development Guide](./development-guide.md) for setup instructions
2. Study the [Architecture](./architecture.md) for system design understanding
3. Browse the [Source Tree Analysis](./source-tree-analysis.md) for codebase orientation
4. Check [API Contracts](./api-contracts.md) before implementing new endpoints
5. Review [Data Models](./data-models.md) before modifying the schema

### For AI-Assisted Development

When planning new features, provide this index plus relevant detail documents:
- **Full-stack features**: Architecture + API Contracts + Data Models + Component Inventory
- **UI features**: Component Inventory + Source Tree Analysis
- **API features**: API Contracts + Data Models
- **Infrastructure**: Deployment Guide + Architecture

### For New Feature PRDs

Point the PRD workflow to this `docs/index.md` as the primary project knowledge source. The generated documentation covers:
- Complete technology stack and architecture patterns
- All 63 API endpoints with auth requirements
- All 20 database models with relationships
- All 38 UI components with features
- Development, testing, and deployment workflows
