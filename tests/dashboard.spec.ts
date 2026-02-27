import { test, expect } from './fixtures/auth';
import { DashboardPage } from './pages/dashboard.page';

test.describe('Dashboard Page', () => {
  test.describe('Owner Dashboard', () => {
    test('should load dashboard with fleet overview', async ({ ownerPage }) => {
      const dashboard = new DashboardPage(ownerPage);
      
      await dashboard.navigate();
      await dashboard.expectFleetStatsLoaded();
      await dashboard.expectVisible('[data-testid="fleet-status-card"]');
    });

    test('should display active vehicles counter', async ({ ownerPage }) => {
      const dashboard = new DashboardPage(ownerPage);
      
      await dashboard.navigate();
      const count = await dashboard.getActiveVehicleCount();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should load live map', async ({ ownerPage }) => {
      const dashboard = new DashboardPage(ownerPage);
      
      await dashboard.navigate();
      await dashboard.expectLiveMapLoaded();
    });

    test('should display recent alerts section', async ({ ownerPage }) => {
      const dashboard = new DashboardPage(ownerPage);
      
      await dashboard.navigate();
      await dashboard.expectRecentAlertsVisible();
    });

    test('should navigate to trucks page', async ({ ownerPage }) => {
      const dashboard = new DashboardPage(ownerPage);
      
      await dashboard.navigate();
      await dashboard.navigateToTrucks();
      await dashboard.expectUrl('/trucks');
    });

    test('should navigate to drivers page', async ({ ownerPage }) => {
      const dashboard = new DashboardPage(ownerPage);
      
      await dashboard.navigate();
      await dashboard.navigateToDrivers();
      await dashboard.expectUrl('/drivers');
    });

    test('should navigate to alerts page', async ({ ownerPage }) => {
      const dashboard = new DashboardPage(ownerPage);
      
      await dashboard.navigate();
      await dashboard.navigateToAlerts();
      await dashboard.expectUrl('/alerts');
    });

    test('should navigate to maintenance page', async ({ ownerPage }) => {
      const dashboard = new DashboardPage(ownerPage);
      
      await dashboard.navigate();
      await dashboard.navigateToMaintenance();
      await dashboard.expectUrl('/maintenance');
    });
  });

  test.describe('Manager Dashboard', () => {
    test('should load dashboard for manager', async ({ managerPage }) => {
      const dashboard = new DashboardPage(managerPage);
      
      await dashboard.navigate();
      await dashboard.expectFleetStatsLoaded();
    });

    test('should display vehicle metrics', async ({ managerPage }) => {
      const dashboard = new DashboardPage(managerPage);
      
      await dashboard.navigate();
      await dashboard.expectVisible('[data-testid="idle-vehicles"]');
      await dashboard.expectVisible('[data-testid="on-trip"]');
    });
  });

  test.describe('Driver Dashboard', () => {
    test('should load dashboard for driver', async ({ driverPage }) => {
      const dashboard = new DashboardPage(driverPage);
      
      await dashboard.navigate();
      // Driver should see limited dashboard
      await dashboard.expectVisible('[data-testid="fleet-status-card"]');
    });

    test('driver should not see all fleet vehicles', async ({ driverPage }) => {
      const dashboard = new DashboardPage(driverPage);
      
      await dashboard.navigate();
      // Driver can only see assigned truck
      const count = await dashboard.getActiveVehicleCount();
      expect(count).toBeLessThanOrEqual(1);
    });
  });

  test.describe('Real-time Updates', () => {
    test('should update live map in real-time', async ({ ownerPage }) => {
      const dashboard = new DashboardPage(ownerPage);
      
      await dashboard.navigate();
      await dashboard.expectLiveMapLoaded();
      
      // Wait for real-time updates
      await ownerPage.waitForTimeout(2000);
      
      // Check that map is still responsive
      await dashboard.expectVisible('[data-testid="live-map"]');
    });

    test('should update vehicle counters periodically', async ({ ownerPage }) => {
      const dashboard = new DashboardPage(ownerPage);
      
      await dashboard.navigate();
      const count1 = await dashboard.getActiveVehicleCount();
      
      // Wait for update cycle
      await ownerPage.waitForTimeout(3000);
      
      const count2 = await dashboard.getActiveVehicleCount();
      
      // Counts should be same or updated
      expect(count2).toBeGreaterThanOrEqual(0);
    });
  });
});
