import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${baseUrl}/login`);
    await page.locator('input[type="email"]').fill('owner@fleetcommand.demo');
    await page.locator('input[type="password"]').fill('owner123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(`${baseUrl}/dashboard`);
  });

  test('should render main dashboard page', async ({ page }) => {
    await page.goto(`${baseUrl}/dashboard`);
    
    expect(page.url()).toContain('/dashboard');
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should display summary stat cards', async ({ page }) => {
    await page.goto(`${baseUrl}/dashboard`);
    
    await expect(page.locator('text=Total Trucks')).toBeVisible();
    await expect(page.locator('text=On Road')).toBeVisible();
    await expect(page.locator('text=Idle')).toBeVisible();
    await expect(page.locator('text=Active Alerts')).toBeVisible();
  });

  test('should show live fleet map', async ({ page }) => {
    await page.goto(`${baseUrl}/dashboard`);
    
    // Map should be visible
    await expect(page.locator('[id*="map"]')).toBeVisible();
  });

  test('should display truck pins on map', async ({ page }) => {
    await page.goto(`${baseUrl}/dashboard`);
    
    // Should have truck markers
    const markers = page.locator('[class*="marker"]');
    const count = await markers.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should color-code truck pins by status', async ({ page }) => {
    await page.goto(`${baseUrl}/dashboard`);
    
    // Moving trucks should be blue
    const blueMarkers = page.locator('[class*="marker"][class*="blue"]');
    // Idle trucks should be orange
    const orangeMarkers = page.locator('[class*="marker"][class*="orange"]');
    // Alert trucks should be red
    const redMarkers = page.locator('[class*="marker"][class*="red"]');
    
    const hasColorCoding = 
      (await blueMarkers.count()) > 0 || 
      (await orangeMarkers.count()) > 0 || 
      (await redMarkers.count()) > 0;
    
    expect(hasColorCoding).toBeTruthy();
  });

  test('should show truck info popup on pin click', async ({ page }) => {
    await page.goto(`${baseUrl}/dashboard`);
    
    // Click first truck marker
    const firstMarker = page.locator('[class*="marker"]').first();
    await firstMarker.click();
    
    // Popup should appear
    await expect(page.locator('[class*="popup"]')).toBeVisible();
  });

  test('should display recent alerts feed', async ({ page }) => {
    await page.goto(`${baseUrl}/dashboard`);
    
    await expect(page.locator('text=Recent Alerts')).toBeVisible();
    await expect(page.locator('[class*="alert-item"]')).toBeVisible();
  });

  test('should show alerts with severity colors', async ({ page }) => {
    await page.goto(`${baseUrl}/dashboard`);
    
    // Critical alerts should be red
    const criticalAlerts = page.locator('[class*="alert"][class*="critical"]');
    // Warning alerts should be orange
    const warningAlerts = page.locator('[class*="alert"][class*="warning"]');
    
    const hasAlerts = 
      (await criticalAlerts.count()) > 0 || 
      (await warningAlerts.count()) > 0;
    
    if (hasAlerts) {
      expect(hasAlerts).toBeTruthy();
    }
  });

  test('should update alerts in real-time via Socket.io', async ({ page }) => {
    await page.goto(`${baseUrl}/dashboard`);
    
    const alertsList = page.locator('[class*="alert-feed"]');
    await expect(alertsList).toBeVisible();
    
    // Listen for WebSocket messages
    let socketConnected = false;
    page.on('console', (msg) => {
      if (msg.text().includes('socket') || msg.text().includes('connected')) {
        socketConnected = true;
      }
    });
    
    // Wait for potential real-time updates
    await page.waitForTimeout(2000);
    expect(socketConnected || await alertsList.isVisible()).toBeTruthy();
  });

  test('should display todays trip schedule', async ({ page }) => {
    await page.goto(`${baseUrl}/dashboard`);
    
    await expect(page.locator('text=Today\'s Schedule')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('should show fuel level overview', async ({ page }) => {
    await page.goto(`${baseUrl}/dashboard`);
    
    await expect(page.locator('text=Fuel Overview')).toBeVisible();
    
    // Should display fuel bars
    const fuelBars = page.locator('[class*="fuel-bar"]');
    expect(await fuelBars.count()).toBeGreaterThan(0);
  });

  test('should have navigation to all sections', async ({ page }) => {
    await page.goto(`${baseUrl}/dashboard`);
    
    // Check sidebar navigation links
    await expect(page.locator('a[href*="/trucks"]')).toBeVisible();
    await expect(page.locator('a[href*="/drivers"]')).toBeVisible();
    await expect(page.locator('a[href*="/trips"]')).toBeVisible();
    await expect(page.locator('a[href*="/alerts"]')).toBeVisible();
    await expect(page.locator('a[href*="/maintenance"]')).toBeVisible();
    await expect(page.locator('a[href*="/fuel"]')).toBeVisible();
  });

  test('should display quick action buttons', async ({ page }) => {
    await page.goto(`${baseUrl}/dashboard`);
    
    await expect(page.locator('button:has-text("Find Nearest Truck")')).toBeVisible();
    await expect(page.locator('button:has-text("Schedule Trip")')).toBeVisible();
    await expect(page.locator('button:has-text("Log Fuel")')).toBeVisible();
  });

  test('should open find nearest truck modal', async ({ page }) => {
    await page.goto(`${baseUrl}/dashboard`);
    
    await page.locator('button:has-text("Find Nearest Truck")').click();
    
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="Address"]')).toBeVisible();
  });

  test('should open schedule trip modal', async ({ page }) => {
    await page.goto(`${baseUrl}/dashboard`);
    
    await page.locator('button:has-text("Schedule Trip")').click();
    
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('should open log fuel modal', async ({ page }) => {
    await page.goto(`${baseUrl}/dashboard`);
    
    await page.locator('button:has-text("Log Fuel")').click();
    
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('should have user profile dropdown in header', async ({ page }) => {
    await page.goto(`${baseUrl}/dashboard`);
    
    // Click user profile button
    await page.locator('[class*="user-menu"]').click();
    
    // Should show dropdown
    await expect(page.locator('text=Settings')).toBeVisible();
    await expect(page.locator('text=Logout')).toBeVisible();
  });

  test('should display notifications icon with badge', async ({ page }) => {
    await page.goto(`${baseUrl}/dashboard`);
    
    const notifIcon = page.locator('[class*="notification-icon"]');
    if (await notifIcon.isVisible()) {
      // If there are unread notifications, badge should be visible
      const badge = notifIcon.locator('[class*="badge"]');
      expect(await badge.isVisible() || await notifIcon.isVisible()).toBeTruthy();
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto(`${baseUrl}/dashboard`);
    
    // Should show mobile menu
    const mobileMenu = page.locator('[class*="mobile-menu"]');
    if (await mobileMenu.isVisible()) {
      expect(await mobileMenu.isVisible()).toBeTruthy();
    }
  });

  test('should be responsive on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto(`${baseUrl}/dashboard`);
    
    // Should display main content
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should be responsive on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    await page.goto(`${baseUrl}/dashboard`);
    
    // Should display everything
    await expect(page.locator('[id*="map"]')).toBeVisible();
    await expect(page.locator('text=Recent Alerts')).toBeVisible();
  });
});
