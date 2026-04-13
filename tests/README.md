# Airport — Test Suite

## Setup

```bash
# Install dependencies
npm ci

# Install Playwright browsers
npx playwright install chromium

# Copy environment
cp .env.test .env.test.local  # adjust DATABASE_URL if needed
```

## Running Tests

### Unit & Integration (Vitest)

```bash
npm test                # Run all unit + integration tests
npm run test:ui         # Interactive Vitest UI
npx vitest --coverage   # With coverage report
```

### E2E (Playwright)

```bash
npm run test:e2e                         # Run all E2E tests (headless)
npx playwright test --headed             # Run with browser visible
npx playwright test --project=chromium   # Single browser
npx playwright test --debug              # Step-through debugger
npx playwright show-report               # View HTML report
```

## Architecture

```
tests/
├── e2e/                    Playwright E2E tests (browser-based)
│   ├── auth.setup.ts       Authenticates via dev-credentials, saves session
│   └── *.spec.ts           Test specs (Given/When/Then format)
├── unit/                   Vitest unit tests (pure functions, no I/O)
├── integration/            Vitest integration tests (API routes, services)
└── support/
    ├── .auth/              Stored auth sessions (gitignored)
    ├── factories/          Test data factories (user, starter, document)
    ├── fixtures/           Playwright custom fixtures (API client, etc.)
    ├── helpers/            Shared utilities (mock-auth, api-client)
    └── vitest-setup.ts     Global mocks (Prisma, NextAuth)
```

### Factories

Create test data with sensible defaults and overrides:

```typescript
import { createMockUser, createMockStarter } from './support/factories'

const admin = createAdminUser()
const starter = createMockStarter({ entityId: 'my-entity' })
```

### Fixtures (Playwright)

Custom fixtures extend Playwright's `test` with typed helpers:

```typescript
import { test, expect } from '../support/fixtures/base.fixture'

test('dashboard loads', async ({ page, api }) => {
  const { data } = await api.getStarters()
  // ...
})
```

## Best Practices

- Use `data-testid` attributes for E2E selectors
- Each test should be independent — no shared state between tests
- Use factories instead of hardcoded test data
- Mock external services (Graph API, SendGrid) in unit tests
- E2E tests run against a real dev server with dev-credentials auth

## CI Integration

Both Vitest and Playwright produce JUnit XML reports in `test-results/`:
- `test-results/junit-unit.xml` (Vitest)
- `test-results/junit-e2e.xml` (Playwright)

Set `CI=true` environment variable in your pipeline to enable CI-specific reporters and retry behavior.
