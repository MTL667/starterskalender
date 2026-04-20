---
stepsCompleted: ['step-01-preflight', 'step-02-select-framework', 'step-03-scaffold-framework', 'step-04-docs-and-scripts', 'step-05-validate-and-summary']
lastStep: 'step-05-validate-and-summary'
lastSaved: '2026-04-07'
---

# Test Framework Setup Progress

## Step 1: Preflight

- **Detected stack**: fullstack (Next.js 16 + Prisma backend)
- **Framework**: Next.js 16.1.0, React 19, TypeScript 5.3
- **Bundler**: Turbopack
- **Existing test deps**: vitest ^1.2.0, @playwright/test ^1.41.0 (no config files)
- **Architecture docs**: docs/architecture.md
- **Key integrations**: Azure AD SSO, Microsoft Graph API, SendGrid, Prisma/PostgreSQL

## Step 2: Framework Selection

- **E2E**: Playwright — multi-browser, API+UI integration, CI parallelism, iPad signing support
- **Unit/Integration**: Vitest — ESM native, fast watch, Jest-compatible API
- **Rationale**: Complex fullstack app with RBAC, document signing, SSE, PDF rendering requires robust multi-layer testing

## Step 3: Scaffold Framework

### Directory Structure
```
tests/
├── e2e/                          # Playwright E2E tests
│   ├── auth.setup.ts             # Auth setup (dev-credentials login)
│   ├── dashboard.spec.ts         # Dashboard smoke tests
│   └── public-signing.spec.ts    # Public signing page tests
├── unit/                         # Vitest unit tests
│   └── lib/
│       ├── rbac.test.ts          # RBAC pure function tests (12 passing)
│       └── graph-teams.test.ts   # Graph Teams config tests
├── integration/                  # Vitest integration tests (API routes)
└── support/
    ├── .auth/                    # Playwright auth storage (gitignored)
    ├── factories/
    │   ├── index.ts              # Barrel export
    │   ├── user.factory.ts       # Mock user factory (admin, viewer, editor)
    │   ├── starter.factory.ts    # Mock starter factory
    │   └── document.factory.ts   # Mock document factory (pending, signed)
    ├── fixtures/
    │   └── base.fixture.ts       # Playwright base fixture with API client
    ├── helpers/
    │   ├── mock-auth.ts          # Vitest auth mocking utilities
    │   └── api-client.ts         # Playwright typed API client
    └── vitest-setup.ts           # Global Vitest setup (Prisma + NextAuth mocks)
```

### Configuration Files
- `playwright.config.ts` — 3 projects (Chromium, Firefox, Mobile Safari), auth setup, HTML+JUnit reporters
- `vitest.config.ts` — Node environment, V8 coverage, path aliases
- `.env.test` — Test environment variables
- `.nvmrc` — Node 22

### Test Results
- **12/12 RBAC unit tests passing**
- Playwright Chromium browser installed
