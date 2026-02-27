# E2E Tests for FleetCommand

This directory contains end-to-end tests for all FleetCommand pages and user interactions using Playwright.

## Test Structure

```
tests/e2e/
├── pages/
│   ├── auth.spec.ts          # Login & Register pages
│   ├── dashboard.spec.ts     # Main dashboard
│   ├── fleet.spec.ts         # Trucks, Drivers, Trips pages
│   ├── operations.spec.ts    # Alerts, Maintenance, Insurance, Fuel, Reports, Settings
├── README.md                 # This file
```

## Test Coverage

### Authentication (auth.spec.ts)
- **Login Page**
  - Render login form
  - Display validation errors on empty submit
  - Show error on invalid email
  - Show error on short password
  - Submit form with valid credentials
  - Show error on invalid credentials
  - Have register link

- **Register Page**
  - Render registration form
  - Display validation errors on empty submit
  - Show error on duplicate email
  - Successfully register new user
  - Have login link

### Dashboard (dashboard.spec.ts)
- Render main dashboard page
- Display summary stat cards (Total Trucks, On Road, Idle, Active Alerts)
- Show live fleet map with truck pins
- Color-code truck pins by status (blue=moving, orange=idle, red=alert)
- Show truck info popup on pin click
- Display recent alerts feed with severity colors
- Real-time Socket.io alert updates
- Display today's trip schedule
- Show fuel level overview
- Navigation to all sections
- Quick action buttons (Find Nearest, Schedule Trip, Log Fuel)
- User profile dropdown
- Notifications icon with badge
- Responsive design (mobile, tablet, desktop)

### Fleet Management (fleet.spec.ts)

#### Trucks List Page
- Render trucks list
- Filter trucks by status
- Search trucks by truck code
- Open add truck modal
- Navigate to truck detail on row click

#### Truck Detail Page (6 tabs)
- Render truck detail with all tabs (Overview, Location, Trips, Maintenance, Fuel, Insurance)
- Display truck specs on overview tab
- Show truck location on map
- Display trip history
- Show maintenance logs
- Display fuel logs and chart
- Show insurance policy

#### Drivers List Page
- Render drivers list
- Filter drivers by availability
- Search drivers by name
- Open add driver modal
- Navigate to driver profile on row click

#### Driver Profile Page
- Display driver profile information
- Show license expiry warning if < 30 days
- Display driver trip history
- Show driver performance stats
- Allow assigning truck to driver
- Have edit profile button

#### Trips List Page
- Render trips list
- Filter trips by status
- Open create trip modal
- Navigate to trip detail on row click

#### Trip Detail Page
- Display trip information
- Show trip status
- Display delivery proof if trip completed
- Allow updating trip status

### Operations (operations.spec.ts)

#### Alerts Page
- Render alerts list
- Filter alerts by type
- Filter alerts by severity
- Resolve alert on button click
- Show alert details on row click
- Clear all resolved alerts

#### Maintenance Page
- Render maintenance list
- Filter maintenance by truck
- Filter by status (overdue)
- Open log service modal
- Show overdue items with red background
- Navigate to maintenance detail

#### Insurance Page
- Render insurance page with tabs (Policies, Claims)
- Display policies on policies tab
- Open add policy modal
- Show expiry status with color coding
- Display claims on claims tab
- Open file claim modal
- Navigate to truck insurance detail

#### Fuel Page
- Render fuel overview page
- Display fuel level bars for all trucks
- Color-code fuel levels (green/orange/red)
- Show fleet trends chart
- Display fuel consumption statistics
- Navigate to truck fuel history on bar click

#### Reports Page
- Render reports page
- Display all report types (Mileage, Fuel, Maintenance, Insurance, Driver Performance)
- Open generate report modal
- Allow selecting month and year for report
- Show preview data for each report
- Allow downloading previously generated reports

#### Settings Page
- Render settings page
- Display user profile section
- Allow updating profile information
- Display notification preferences
- Have logout button
- Logout user on button click

## Running Tests

### Install Dependencies
```bash
npm install
npx playwright install
```

### Run All E2E Tests
```bash
npx playwright test tests/e2e
```

### Run Tests for Specific File
```bash
npx playwright test tests/e2e/pages/auth.spec.ts
npx playwright test tests/e2e/pages/dashboard.spec.ts
npx playwright test tests/e2e/pages/fleet.spec.ts
npx playwright test tests/e2e/pages/operations.spec.ts
```

### Run Tests in Headed Mode (See Browser)
```bash
npx playwright test tests/e2e --headed
```

### Run Specific Test
```bash
npx playwright test tests/e2e/pages/auth.spec.ts -g "Login Page"
```

### Debug Mode
```bash
npx playwright test tests/e2e --debug
```

### Generate HTML Report
```bash
npx playwright test tests/e2e
npx playwright show-report
```

## Configuration

Tests use configuration from `playwright.config.ts`:
- **Base URL:** `http://localhost:3000` (configurable via `BASE_URL` env var)
- **Timeout:** 30 seconds per test
- **Retries:** 1 retry on failure
- **Browsers:** Chromium, Firefox, WebKit (parallel execution)
- **Video:** On failure

## Test Credentials

Default test user credentials (created via seed data):
```
Email: owner@fleetcommand.demo
Password: owner123
Role: owner
```

Other available users:
```
manager@fleetcommand.demo / manager123 (manager role)
driver1@fleetcommand.demo / driver123 (driver role)
```

## Best Practices

1. **Selectors:**
   - Use `text=` selectors for buttons and labels
   - Use `placeholder*=` for input fields
   - Use `[data-*]` attributes for dynamic content
   - Use `[class*="..."]` for class-based selection

2. **Navigation:**
   - Always log in before each test with `test.beforeEach`
   - Use `page.waitForURL()` to confirm navigation
   - Check for element visibility before interaction

3. **Real-time Updates:**
   - Tests account for real-time Socket.io updates
   - May need to wait for WebSocket messages
   - Tests are idempotent (can run multiple times)

4. **Responsive Testing:**
   - Use `page.setViewportSize()` to test different breakpoints
   - Test mobile, tablet, and desktop views
   - Verify navigation and layout adapt correctly

5. **Error Handling:**
   - Tests handle elements that may or may not be visible
   - Use conditional checks with `if (await element.isVisible())`
   - Don't fail if optional UI elements are missing

## CI/CD Integration

Add to your CI pipeline:
```bash
npm run test:e2e
```

Or in GitHub Actions:
```yaml
- name: Run E2E Tests
  run: npx playwright test tests/e2e
```

## Debugging Failed Tests

1. **Check video:** Playwright records failures - check `test-results/`
2. **Check traces:** Use `--headed` to watch tests in real-time
3. **Use `--debug`:** Step through tests line by line
4. **Check logs:** Review browser console for JS errors

## Future Improvements

- [ ] Add visual regression tests
- [ ] Add performance benchmarks
- [ ] Add accessibility (a11y) tests
- [ ] Add load testing for real-time features
- [ ] Add API mocking for edge cases
- [ ] Add test data factories for complex scenarios
