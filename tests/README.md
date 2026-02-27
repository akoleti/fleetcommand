# FleetCommand E2E Test Suite

Comprehensive Playwright test suite covering all FleetCommand user-facing pages and features.

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Local dev server running (`npm run dev`)

### Installation

Tests are configured in `playwright.config.ts` and dependencies are already in `package.json`.

To install Playwright browsers:

```bash
npx playwright install
```

## Running Tests

### All Tests (All Browsers)

```bash
npm run test:e2e
```

### Specific Browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Single Test File

```bash
npx playwright test tests/auth.spec.ts
```

### Watch Mode (Recommended for Development)

```bash
npx playwright test --watch
```

### UI Mode (Visual Inspector)

```bash
npx playwright test --ui
```

### Debug Mode

```bash
npx playwright test --debug
```

## Test Structure

### Page Objects

Page objects encapsulate page selectors and interactions for maintainability:

- `tests/pages/base.page.ts` — Base class with common methods
- `tests/pages/auth.page.ts` — Login/register pages
- `tests/pages/dashboard.page.ts` — Dashboard with fleet overview
- `tests/pages/trucks.page.ts` — Trucks list and detail
- `tests/pages/drivers.page.ts` — Drivers list and profiles
- `tests/pages/trips.page.ts` — Trips management
- `tests/pages/alerts.page.ts` — Fleet alerts (Sprint 4)
- `tests/pages/maintenance.page.ts` — Maintenance/insurance/claims (Sprint 4-5)
- `tests/pages/fuel.page.ts` — Fuel logs and cost analysis (Sprint 6)
- `tests/pages/delivery.page.ts` — Delivery proof capture (Sprint 7-8)

### Test Fixtures

**Auth Fixtures** (`tests/fixtures/auth.ts`):

Provides authenticated page contexts for different user roles:

```typescript
test('should load dashboard', async ({ ownerPage, managerPage, driverPage }) => {
  // ownerPage: authenticated as owner
  // managerPage: authenticated as manager
  // driverPage: authenticated as driver (limited access)
});
```

### Test Files

| File | Status | Coverage |
|------|--------|----------|
| `auth.spec.ts` | ✅ Complete | Login, register, auth errors, protected routes, logout |
| `dashboard.spec.ts` | ✅ Complete | Fleet overview, metrics, navigation, real-time updates |
| `trucks.spec.ts` | ✅ Complete | List, search, detail tabs, CRUD, RBAC (6 tabs: location, trips, maintenance, fuel, insurance, alerts) |
| `drivers.spec.ts` | ✅ Complete | List, search, profile, CRUD, trip history, RBAC |
| `trips.spec.ts` | ✅ Complete | List, filter by status, create, complete, cancel, RBAC |
| `alerts.spec.ts` | 🚧 Scaffold | 12 alert types, search/filter, severity routing, multi-channel notifications |
| `maintenance.spec.ts` | 🚧 Scaffold | Maintenance logs, insurance policies, claims workflow, expiry alerts |
| `fuel.spec.ts` | 🚧 Scaffold | Fuel logs, cost analysis, efficiency metrics, PDF reports |
| `delivery.spec.ts` | 🚧 Scaffold | Signature capture, photo upload, GPS embedding, offline sync, S3 integration |

## Test Coverage

### Existing Pages (Sprint 1-3)

✅ **Auth Pages**
- Login/register/logout flows
- Credential validation
- Rate limiting (5 attempts → 15min lockout)
- Protected route redirects

✅ **Dashboard**
- Fleet stats loading
- Live map real-time updates
- Navigation between modules
- Role-based dashboard views

✅ **Trucks Management**
- List with search/filter
- Detail page with 6 tabs (location, trips, maintenance, fuel, insurance, alerts)
- CRUD operations (owner only)
- RBAC enforcement (driver sees only assigned truck, 403 on unauthorized)

✅ **Drivers Management**
- List with search/filter
- Profile page with trip history
- CRUD operations (owner only)
- RBAC enforcement (driver sees only own profile)

✅ **Trips Management**
- List with status filtering
- Create, complete, cancel workflows
- RBAC enforcement (driver can't create, owner/manager can manage)

### Upcoming Pages (Scaffolds, test.skip())

🚧 **Sprint 4 - Alerts**
- 12 alert types (idle, fuel, maintenance, license, insurance, GPS, pickup, trip complete, claim, theft, emergency)
- Severity routing (info/warning/critical)
- Multi-channel notifications (FCM, SMS, SendGrid)
- Duplicate prevention
- Auto-resolution

🚧 **Sprint 4-5 - Maintenance**
- Maintenance logs CRUD (service history, next service tracking)
- Insurance policies CRUD (multiple per truck, 1 active)
- Claims workflow (open → pending → settled)
- Expiry alerts (30-day warning, 7-day critical)
- Truck blocking on expired documents

🚧 **Sprint 6 - Fuel**
- Fuel logs CRUD (per-truck, per-trip)
- Cost tracking and analysis
- Efficiency metrics (MPG)
- PDF report generation
- Truck-by-truck comparison

🚧 **Sprint 7-8 - Delivery**
- Signature canvas capture
- Photo upload with GPS embedding
- Offline queue sync
- S3 presigned URL viewing
- Recipient information validation

## RBAC Testing

Each test file includes RBAC tests for 3 roles:

- **Owner**: Full access (create, read, update, delete)
- **Manager**: Read and update, no delete or sensitive actions
- **Driver**: Read-only their assigned data, limited actions

Example:

```typescript
test('driver should only see assigned truck', async ({ driverPage }) => {
  const trucks = new TrucksPage(driverPage);
  await trucks.navigate();
  const count = await trucks.getTruckCountFromList();
  expect(count).toBeLessThanOrEqual(1); // Only assigned truck
});
```

## Test Reports

Test results are generated in `test-results/`:

- `junit.xml` — JUnit format (for CI/CD)
- `results.json` — JSON format (detailed)
- `test-results/` — HTML report (`npx playwright show-report`)

View HTML report:

```bash
npx playwright show-report
```

## Configuration

### Timeout

Default test timeout: 30 seconds  
Default action timeout: 10 seconds

Override per test:

```typescript
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
}, { timeout: 60000 });
```

### Retries

- **Local**: No retries
- **CI**: 2 retries on failure

Override in config or per test:

```typescript
test.describe('Critical Tests', () => {
  test.describe.configure({ retries: 3 });
});
```

### Base URL

Tests run against `http://localhost:3000` by default.

Override with env var:

```bash
PLAYWRIGHT_TEST_BASE_URL=https://staging.example.com npm run test:e2e
```

## Debugging

### Screenshots on Failure

Automatically saved to `test-results/` on failure.

### Videos on Failure

Enabled by default in config. Videos saved to `test-results/` when test fails.

### Trace On Retry

Traces are collected on first retry and can be inspected:

```bash
npx playwright show-trace test-results/trace.zip
```

### Step-by-Step Debug

```bash
npx playwright test --debug tests/auth.spec.ts
```

Opens browser in debug mode with inspector.

## Adding New Tests

### Template

```typescript
import { test, expect } from './fixtures/auth';
import { NewPage } from './pages/new.page';

test.describe('New Feature', () => {
  test('should do something', async ({ ownerPage }) => {
    const page = new NewPage(ownerPage);
    
    await page.navigate();
    await page.expectVisible('[data-testid="element"]');
    
    expect(true).toBeTruthy();
  });
});
```

### Page Object Template

```typescript
import { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class NewPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Selectors
  get element() {
    return '[data-testid="element"]';
  }

  // Actions
  async doSomething() {
    await this.click(this.element);
  }
}
```

## CI/CD Integration

For GitHub Actions, add to `.github/workflows/e2e.yml`:

```yaml
- name: Install Playwright browsers
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test:e2e

- name: Upload Playwright report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Best Practices

1. **Use page objects** — Avoid selectors scattered in tests
2. **Test user flows** — Not implementation details
3. **Use data-testid** — More reliable than role/text selectors
4. **Keep tests independent** — No test-to-test dependencies
5. **Use fixtures** — For setup/teardown and auth
6. **Group related tests** — Use `test.describe` blocks
7. **Meaningful names** — Describe what the test verifies
8. **Avoid waits** — Use implicit waits via `waitForElement`, `waitForNavigation`
9. **RBAC everywhere** — Test access control for each role
10. **Mock external services** — Firebase FCM, Twilio, SendGrid

## Troubleshooting

### Tests timing out

Increase timeout:

```bash
npx playwright test --timeout=60000
```

### Tests failing on CI but passing locally

- Check base URL (may differ on CI)
- Verify database seed (CI may have different data)
- Check for race conditions (add explicit waits)

### Flaky tests

- Increase timeout for unreliable selectors
- Avoid hard waits (`page.waitForTimeout`)
- Use explicit waits: `waitForElement`, `waitForNavigation`
- Check for animations (disable in tests if needed)

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)

## Contacts

For test infrastructure issues, contact QA-01 agent.
