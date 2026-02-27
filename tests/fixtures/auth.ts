import { test as base, expect } from '@playwright/test';

/**
 * Auth Fixture: Provides authenticated contexts for different user roles
 * 
 * Usage:
 *   test('should load page', async ({ ownerPage }) => {
 *     await ownerPage.goto('/dashboard');
 *   });
 */

type AuthFixture = {
  ownerPage: typeof base;
  managerPage: typeof base;
  driverPage: typeof base;
};

// Test users (must exist in seeded database)
const TEST_USERS = {
  owner: {
    email: 'owner@fleetcommand.local',
    password: 'Owner@12345',
    role: 'owner',
  },
  manager: {
    email: 'manager@fleetcommand.local',
    password: 'Manager@12345',
    role: 'manager',
  },
  driver: {
    email: 'driver@fleetcommand.local',
    password: 'Driver@12345',
    role: 'driver',
  },
};

async function authenticateUser(page, email, password) {
  // Navigate to login page
  await page.goto('/login');
  
  // Fill in credentials
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  
  // Submit login form
  await page.click('button[type="submit"]');
  
  // Wait for redirect to dashboard (successful login)
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  
  // Verify session cookie exists
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find(c => c.name.includes('access') || c.name.includes('session'));
  expect(sessionCookie).toBeTruthy();
}

export const test = base.extend<AuthFixture>({
  ownerPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await authenticateUser(page, TEST_USERS.owner.email, TEST_USERS.owner.password);
    
    await use(page);
    
    // Cleanup
    await context.close();
  },

  managerPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await authenticateUser(page, TEST_USERS.manager.email, TEST_USERS.manager.password);
    
    await use(page);
    
    // Cleanup
    await context.close();
  },

  driverPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await authenticateUser(page, TEST_USERS.driver.email, TEST_USERS.driver.password);
    
    await use(page);
    
    // Cleanup
    await context.close();
  },
});

export { expect };
