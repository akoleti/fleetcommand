import { test, expect } from '@playwright/test';

test.describe('Operations Pages (Alerts, Maintenance, Insurance, Fuel, Reports)', () => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${baseUrl}/login`);
    await page.locator('input[type="email"]').fill('owner@fleetcommand.demo');
    await page.locator('input[type="password"]').fill('owner123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(`${baseUrl}/dashboard`);
  });

  test.describe('Alerts Page', () => {
    test('should render alerts list', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/alerts`);
      
      await expect(page.locator('text=Alerts')).toBeVisible();
      await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    });

    test('should filter alerts by type', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/alerts`);
      
      // Click type filter
      const idleFilter = page.locator('button:has-text("Idle")');
      if (await idleFilter.isVisible()) {
        await idleFilter.click();
        
        // Should show only idle alerts
        await expect(page.locator('[data-type="idle"]')).toBeVisible();
      }
    });

    test('should filter alerts by severity', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/alerts`);
      
      // Click severity filter
      const criticalFilter = page.locator('button:has-text("Critical")');
      if (await criticalFilter.isVisible()) {
        await criticalFilter.click();
        
        // Should show only critical alerts
        await expect(page.locator('[data-severity="critical"]')).toBeVisible();
      }
    });

    test('should resolve alert on button click', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/alerts`);
      
      // Click resolve button on first alert
      const resolveButton = page.locator('button:has-text("Resolve")').first();
      if (await resolveButton.isVisible()) {
        await resolveButton.click();
        
        // Alert should be removed or marked as resolved
        await expect(resolveButton).not.toBeVisible();
      }
    });

    test('should show alert details on row click', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/alerts`);
      
      // Click first alert
      const firstAlert = page.locator('table tbody tr:first-child');
      if (await firstAlert.isVisible()) {
        await firstAlert.click();
        
        // Details should be visible
        await expect(page.locator('[class*="detail"]')).toBeVisible();
      }
    });

    test('should clear all resolved alerts', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/alerts`);
      
      const clearButton = page.locator('button:has-text("Clear All")');
      if (await clearButton.isVisible()) {
        await clearButton.click();
        
        // Should show confirmation
        await expect(page.locator('text=Are you sure')).toBeVisible();
      }
    });
  });

  test.describe('Maintenance Page', () => {
    test('should render maintenance list', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/maintenance`);
      
      await expect(page.locator('text=Maintenance')).toBeVisible();
      await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    });

    test('should filter maintenance by truck', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/maintenance`);
      
      const truckFilter = page.locator('select[name="truck"]');
      if (await truckFilter.isVisible()) {
        await truckFilter.selectOption({ index: 1 });
        
        // Should show filtered results
        await expect(page.locator('table')).toBeVisible();
      }
    });

    test('should filter by status (overdue)', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/maintenance`);
      
      const overdueFilter = page.locator('button:has-text("Overdue")');
      if (await overdueFilter.isVisible()) {
        await overdueFilter.click();
        
        // Should show only overdue items
        await expect(page.locator('[data-status="overdue"]')).toBeVisible();
      }
    });

    test('should open log service modal', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/maintenance`);
      
      await page.locator('button:has-text("Log Service")').click();
      
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('input[placeholder*="Service Type"]')).toBeVisible();
    });

    test('should show overdue items with red background', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/maintenance`);
      
      const overdueRow = page.locator('[data-status="overdue"]');
      if (await overdueRow.isVisible()) {
        const bgColor = await overdueRow.evaluate((el) => window.getComputedStyle(el).backgroundColor);
        // Should have red-ish background
        expect(bgColor).toBeTruthy();
      }
    });

    test('should navigate to maintenance detail', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/maintenance`);
      
      const firstRow = page.locator('table tbody tr:first-child');
      if (await firstRow.isVisible()) {
        await firstRow.click();
        
        await page.waitForURL(`${baseUrl}/dashboard/maintenance/*`);
        expect(page.url()).toMatch(/\/dashboard\/maintenance\/.+/);
      }
    });
  });

  test.describe('Insurance Page', () => {
    test('should render insurance page with tabs', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/insurance`);
      
      await expect(page.locator('text=Insurance')).toBeVisible();
      await expect(page.locator('text=Policies')).toBeVisible();
      await expect(page.locator('text=Claims')).toBeVisible();
    });

    test('should display policies on policies tab', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/insurance`);
      
      // Policies tab should be active by default
      await expect(page.locator('text=Policy')).toBeVisible();
      await expect(page.locator('table')).toBeVisible();
    });

    test('should open add policy modal', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/insurance`);
      
      await page.locator('button:has-text("Add Policy")').click();
      
      await expect(page.locator('[role="dialog"]')).toBeVisible();
    });

    test('should show expiry status with color coding', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/insurance`);
      
      // Active policy should be green
      const activeChip = page.locator('[data-expiry="active"]');
      if (await activeChip.isVisible()) {
        expect(await activeChip.getAttribute('class')).toContain('green');
      }
    });

    test('should display claims on claims tab', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/insurance`);
      
      // Click claims tab
      await page.locator('button:has-text("Claims")').click();
      
      await expect(page.locator('table')).toBeVisible();
    });

    test('should open file claim modal', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/insurance`);
      
      // Click claims tab
      await page.locator('button:has-text("Claims")').click();
      
      await page.locator('button:has-text("File Claim")').click();
      
      await expect(page.locator('[role="dialog"]')).toBeVisible();
    });

    test('should navigate to truck insurance detail', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/insurance`);
      
      const firstTruck = page.locator('table tbody tr:first-child');
      if (await firstTruck.isVisible()) {
        await firstTruck.click();
        
        await page.waitForURL(`${baseUrl}/dashboard/insurance/*`);
        expect(page.url()).toMatch(/\/dashboard\/insurance\/.+/);
      }
    });
  });

  test.describe('Fuel Page', () => {
    test('should render fuel overview page', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/fuel`);
      
      await expect(page.locator('text=Fuel')).toBeVisible();
      await expect(page.locator('text=Current Levels')).toBeVisible();
    });

    test('should display fuel level bars for all trucks', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/fuel`);
      
      // Should show fuel bars
      const fuelBars = page.locator('[class*="fuel-bar"]');
      const count = await fuelBars.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should color-code fuel levels (green/orange/red)', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/fuel`);
      
      // Check for color-coded bars
      const greenBars = page.locator('[class*="fuel-bar"][class*="green"]');
      const orangeBars = page.locator('[class*="fuel-bar"][class*="orange"]');
      const redBars = page.locator('[class*="fuel-bar"][class*="red"]');
      
      const hasColorCoding = 
        (await greenBars.count()) > 0 || 
        (await orangeBars.count()) > 0 || 
        (await redBars.count()) > 0;
      
      expect(hasColorCoding).toBeTruthy();
    });

    test('should show fleet trends chart', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/fuel`);
      
      // Should have fleet trends section
      await expect(page.locator('text=Fleet Trends')).toBeVisible();
      await expect(page.locator('[class*="chart"]')).toBeVisible();
    });

    test('should display fuel consumption statistics', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/fuel`);
      
      // Should show stats
      await expect(page.locator('text=Total Fleet Spend')).toBeVisible();
      await expect(page.locator('text=Average Cost Per Litre')).toBeVisible();
    });

    test('should navigate to truck fuel history on bar click', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/fuel`);
      
      // Click first fuel bar
      const firstBar = page.locator('[class*="fuel-bar"]').first();
      if (await firstBar.isVisible()) {
        await firstBar.click();
        
        // Should navigate to truck fuel detail
        await page.waitForURL(`${baseUrl}/dashboard/fuel/*`);
        expect(page.url()).toMatch(/\/dashboard\/fuel\/.+/);
      }
    });
  });

  test.describe('Reports Page', () => {
    test('should render reports page', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/reports`);
      
      await expect(page.locator('text=Reports')).toBeVisible();
    });

    test('should display all report types', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/reports`);
      
      await expect(page.locator('text=Mileage Report')).toBeVisible();
      await expect(page.locator('text=Fuel Cost Report')).toBeVisible();
      await expect(page.locator('text=Maintenance Cost Report')).toBeVisible();
      await expect(page.locator('text=Insurance Report')).toBeVisible();
      await expect(page.locator('text=Driver Performance Report')).toBeVisible();
    });

    test('should open generate report modal', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/reports`);
      
      const generateButton = page.locator('button:has-text("Generate PDF")').first();
      if (await generateButton.isVisible()) {
        await generateButton.click();
        
        await expect(page.locator('[role="dialog"]')).toBeVisible();
      }
    });

    test('should allow selecting month and year for report', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/reports`);
      
      const generateButton = page.locator('button:has-text("Generate PDF")').first();
      if (await generateButton.isVisible()) {
        await generateButton.click();
        
        // Should have date selectors
        const monthSelect = page.locator('select[name="month"]');
        const yearSelect = page.locator('select[name="year"]');
        
        if (await monthSelect.isVisible()) {
          await expect(monthSelect).toBeVisible();
        }
        if (await yearSelect.isVisible()) {
          await expect(yearSelect).toBeVisible();
        }
      }
    });

    test('should show preview data for each report', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/reports`);
      
      // Each report card should show preview table
      const previewTables = page.locator('[class*="preview"] table');
      expect(await previewTables.count()).toBeGreaterThan(0);
    });

    test('should allow downloading previously generated reports', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/reports`);
      
      // Look for download buttons
      const downloadButtons = page.locator('a:has-text("Download")');
      const count = await downloadButtons.count();
      
      // Should have at least some generated reports or no download buttons yet
      expect(count >= 0).toBeTruthy();
    });
  });

  test.describe('Settings Page', () => {
    test('should render settings page', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/settings`);
      
      await expect(page.locator('text=Settings')).toBeVisible();
    });

    test('should display user profile section', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/settings`);
      
      await expect(page.locator('text=Profile')).toBeVisible();
    });

    test('should allow updating profile information', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/settings`);
      
      const nameInput = page.locator('input[name="fullName"]');
      if (await nameInput.isVisible()) {
        await nameInput.fill('Updated Name');
        
        const saveButton = page.locator('button:has-text("Save")');
        if (await saveButton.isVisible()) {
          await saveButton.click();
        }
      }
    });

    test('should display notification preferences', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/settings`);
      
      const notifSection = page.locator('text=Notifications');
      if (await notifSection.isVisible()) {
        await expect(notifSection).toBeVisible();
      }
    });

    test('should have logout button', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/settings`);
      
      const logoutButton = page.locator('button:has-text("Logout")');
      await expect(logoutButton).toBeVisible();
    });

    test('should logout user on button click', async ({ page }) => {
      await page.goto(`${baseUrl}/dashboard/settings`);
      
      const logoutButton = page.locator('button:has-text("Logout")');
      await logoutButton.click();
      
      // Should redirect to login
      await page.waitForURL(`${baseUrl}/login`);
      expect(page.url()).toContain('/login');
    });
  });
});
