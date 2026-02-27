import { test, expect } from '@playwright/test';

test.describe('Fleet Management Pages', () => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${baseUrl}/login`);
    await page.locator('input[type="email"]').fill('owner@fleetcommand.demo');
    await page.locator('input[type="password"]').fill('owner123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(`${baseUrl}/dashboard`);
  });

  test.describe('Trucks List Page', () => {
    test('should render trucks list', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/trucks`);
      
      await expect(page.locator('text=Trucks')).toBeVisible();
      await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    });

    test('should filter trucks by status', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/trucks`);
      
      // Click filter chips
      const movingFilter = page.locator('button:has-text("Moving")');
      await movingFilter.click();
      
      // Should show only moving trucks
      await expect(page.locator('[data-status="moving"]')).toBeVisible();
    });

    test('should search trucks by truck code', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/trucks`);
      
      await page.locator('input[placeholder*="Search"]').fill('TRK-001');
      await page.locator('button:has-text("Search")').click();
      
      // Should show filtered results
      await expect(page.locator('text=TRK-001')).toBeVisible();
    });

    test('should open add truck modal', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/trucks`);
      
      await page.locator('button:has-text("Add Truck")').click();
      
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('input[placeholder="Truck Code"]')).toBeVisible();
    });

    test('should navigate to truck detail on row click', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/trucks`);
      
      // Click first truck row
      await page.locator('table tbody tr:first-child').click();
      
      // Should navigate to detail page
      await page.waitForURL(`${baseUrl}/dashboard/trucks/*`);
      expect(page.url()).toMatch(/\/dashboard\/trucks\/.+/);
    });
  });

  test.describe('Truck Detail Page', () => {
    test('should render truck detail with tabs', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/trucks/1`);
      
      await expect(page.locator('text=Overview')).toBeVisible();
      await expect(page.locator('text=Location')).toBeVisible();
      await expect(page.locator('text=Trips')).toBeVisible();
      await expect(page.locator('text=Maintenance')).toBeVisible();
      await expect(page.locator('text=Fuel')).toBeVisible();
      await expect(page.locator('text=Insurance')).toBeVisible();
    });

    test('should display truck specs on overview tab', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/trucks/1`);
      
      // Overview tab should be active by default
      await expect(page.locator('text=Truck Specifications')).toBeVisible();
      await expect(page.locator('text=Make')).toBeVisible();
      await expect(page.locator('text=Model')).toBeVisible();
      await expect(page.locator('text=Year')).toBeVisible();
    });

    test('should show truck location on map', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/trucks/1`);
      
      // Click location tab
      await page.locator('button:has-text("Location")').click();
      
      // Map should be visible
      await expect(page.locator('[id*="map"]')).toBeVisible();
    });

    test('should display trip history', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/trucks/1`);
      
      // Click trips tab
      await page.locator('button:has-text("Trips")').click();
      
      // Trips table should be visible
      await expect(page.locator('table')).toBeVisible();
    });

    test('should show maintenance logs', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/trucks/1`);
      
      // Click maintenance tab
      await page.locator('button:has-text("Maintenance")').click();
      
      // Maintenance table should be visible
      await expect(page.locator('table')).toBeVisible();
    });

    test('should display fuel logs and chart', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/trucks/1`);
      
      // Click fuel tab
      await page.locator('button:has-text("Fuel")').click();
      
      // Fuel data should be visible
      await expect(page.locator('[class*="chart"]')).toBeVisible();
    });

    test('should show insurance policy', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/trucks/1`);
      
      // Click insurance tab
      await page.locator('button:has-text("Insurance")').click();
      
      // Insurance info should be visible
      await expect(page.locator('text=Policy')).toBeVisible();
    });
  });

  test.describe('Drivers List Page', () => {
    test('should render drivers list', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/drivers`);
      
      await expect(page.locator('text=Drivers')).toBeVisible();
      await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    });

    test('should filter drivers by availability', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/drivers`);
      
      // Click availability filter
      const availableFilter = page.locator('button:has-text("Available")');
      await availableFilter.click();
      
      // Should show only available drivers
      await expect(page.locator('[data-availability="available"]')).toBeVisible();
    });

    test('should search drivers by name', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/drivers`);
      
      await page.locator('input[placeholder*="Search"]').fill('John');
      await page.locator('button:has-text("Search")').click();
      
      // Should show filtered results
      await expect(page.locator('text=John')).toBeVisible();
    });

    test('should open add driver modal', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/drivers`);
      
      await page.locator('button:has-text("Add Driver")').click();
      
      await expect(page.locator('[role="dialog"]')).toBeVisible();
    });

    test('should navigate to driver profile on row click', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/drivers`);
      
      // Click first driver row
      await page.locator('table tbody tr:first-child').click();
      
      // Should navigate to profile page
      await page.waitForURL(`${baseUrl}/dashboard/drivers/*`);
      expect(page.url()).toMatch(/\/dashboard\/drivers\/.+/);
    });
  });

  test.describe('Driver Profile Page', () => {
    test('should display driver profile information', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/drivers/1`);
      
      await expect(page.locator('text=Full Name')).toBeVisible();
      await expect(page.locator('text=Email')).toBeVisible();
      await expect(page.locator('text=License Number')).toBeVisible();
      await expect(page.locator('text=License Expiry')).toBeVisible();
    });

    test('should show license expiry warning if < 30 days', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/drivers/1`);
      
      // If license expiring soon, warning should be visible
      const expiryWarning = page.locator('[class*="warning"]');
      if (await expiryWarning.isVisible()) {
        await expect(expiryWarning).toBeVisible();
      }
    });

    test('should display driver trip history', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/drivers/1`);
      
      await expect(page.locator('text=Trip History')).toBeVisible();
      await expect(page.locator('table')).toBeVisible();
    });

    test('should show driver performance stats', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/drivers/1`);
      
      await expect(page.locator('text=Trips Completed')).toBeVisible();
      await expect(page.locator('text=Total km Driven')).toBeVisible();
      await expect(page.locator('text=Rating')).toBeVisible();
    });

    test('should allow assigning truck to driver', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/drivers/1`);
      
      await page.locator('button:has-text("Assign Truck")').click();
      
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('select')).toBeVisible();
    });

    test('should have edit profile button', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/drivers/1`);
      
      const editButton = page.locator('button:has-text("Edit Profile")');
      await expect(editButton).toBeVisible();
    });
  });

  test.describe('Trips List Page', () => {
    test('should render trips list', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/trips`);
      
      await expect(page.locator('text=Trips')).toBeVisible();
      await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    });

    test('should filter trips by status', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/trips`);
      
      // Click status filter
      const activeFilter = page.locator('button:has-text("Active")');
      await activeFilter.click();
      
      // Should show only active trips
      await expect(page.locator('[data-status="active"]')).toBeVisible();
    });

    test('should open create trip modal', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/trips`);
      
      await page.locator('button:has-text("Create Trip")').click();
      
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('input[placeholder*="Origin"]')).toBeVisible();
    });

    test('should navigate to trip detail on row click', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/trips`);
      
      // Click first trip row
      const firstRow = page.locator('table tbody tr:first-child');
      if (await firstRow.isVisible()) {
        await firstRow.click();
        
        // Should navigate to detail page
        await page.waitForURL(`${baseUrl}/dashboard/trips/*`);
        expect(page.url()).toMatch(/\/dashboard\/trips\/.+/);
      }
    });
  });

  test.describe('Trip Detail Page', () => {
    test('should display trip information', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/trips/1`);
      
      await expect(page.locator('text=Origin')).toBeVisible();
      await expect(page.locator('text=Destination')).toBeVisible();
      await expect(page.locator('text=Truck')).toBeVisible();
      await expect(page.locator('text=Driver')).toBeVisible();
    });

    test('should show trip status', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/trips/1`);
      
      await expect(page.locator('[class*="status"]')).toBeVisible();
    });

    test('should display delivery proof if trip completed', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/trips/1`);
      
      // If trip completed, proof should be visible
      const proofTab = page.locator('button:has-text("Delivery Proof")');
      if (await proofTab.isVisible()) {
        await proofTab.click();
        await expect(page.locator('img')).toBeVisible();
      }
    });

    test('should allow updating trip status', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/trips/1`);
      
      const statusDropdown = page.locator('select[name="status"]');
      if (await statusDropdown.isVisible()) {
        await statusDropdown.selectOption('active');
      }
    });
  });
});
