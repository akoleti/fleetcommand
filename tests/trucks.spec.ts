import { test, expect } from './fixtures/auth';
import { TrucksPage } from './pages/trucks.page';

test.describe('Trucks Pages', () => {
  test.describe('Trucks List Page', () => {
    test('should load trucks list', async ({ ownerPage }) => {
      const trucks = new TrucksPage(ownerPage);
      
      await trucks.navigate();
      await trucks.expectTrucksTableLoaded();
    });

    test('should display truck count', async ({ ownerPage }) => {
      const trucks = new TrucksPage(ownerPage);
      
      await trucks.navigate();
      const count = await trucks.getTruckCountFromList();
      expect(count).toBeGreaterThan(0);
    });

    test('should search for truck by license number', async ({ ownerPage }) => {
      const trucks = new TrucksPage(ownerPage);
      
      await trucks.navigate();
      const initialCount = await trucks.getTruckCountFromList();
      
      // Search for first truck
      await trucks.searchTruck('TRUCK-001');
      const searchCount = await trucks.getTruckCountFromList();
      
      expect(searchCount).toBeLessThanOrEqual(initialCount);
    });

    test('should navigate to create truck page', async ({ ownerPage }) => {
      const trucks = new TrucksPage(ownerPage);
      
      await trucks.navigate();
      await trucks.clickCreateTruck();
      await trucks.expectUrl(/\/trucks\/new/);
    });
  });

  test.describe('Truck Detail Page', () => {
    test('should load truck detail', async ({ ownerPage }) => {
      const trucks = new TrucksPage(ownerPage);
      
      // Navigate to first truck (assuming TRUCK-001 exists)
      await trucks.navigateToTruckDetail('truck-1');
      
      // Should see truck details and tabs
      await trucks.expectVisible('[data-testid="truck-detail-header"]');
    });

    test('should display all truck tabs', async ({ ownerPage }) => {
      const trucks = new TrucksPage(ownerPage);
      
      await trucks.navigateToTruckDetail('truck-1');
      
      await trucks.expectVisible(trucks.locationTab);
      await trucks.expectVisible(trucks.tripsTab);
      await trucks.expectVisible(trucks.maintenanceTab);
      await trucks.expectVisible(trucks.fuelTab);
      await trucks.expectVisible(trucks.insuranceTab);
      await trucks.expectVisible(trucks.alertsTab);
    });

    test('should switch to location tab and load map', async ({ ownerPage }) => {
      const trucks = new TrucksPage(ownerPage);
      
      await trucks.navigateToTruckDetail('truck-1');
      await trucks.clickTab('location');
      await trucks.expectTabContentLoaded('location');
    });

    test('should switch to trips tab', async ({ ownerPage }) => {
      const trucks = new TrucksPage(ownerPage);
      
      await trucks.navigateToTruckDetail('truck-1');
      await trucks.clickTab('trips');
      await trucks.expectTabContentLoaded('trips');
    });

    test('should switch to maintenance tab', async ({ ownerPage }) => {
      const trucks = new TrucksPage(ownerPage);
      
      await trucks.navigateToTruckDetail('truck-1');
      await trucks.clickTab('maintenance');
      await trucks.expectTabContentLoaded('maintenance');
    });

    test('should switch to fuel tab', async ({ ownerPage }) => {
      const trucks = new TrucksPage(ownerPage);
      
      await trucks.navigateToTruckDetail('truck-1');
      await trucks.clickTab('fuel');
      await trucks.expectTabContentLoaded('fuel');
    });

    test('should switch to insurance tab', async ({ ownerPage }) => {
      const trucks = new TrucksPage(ownerPage);
      
      await trucks.navigateToTruckDetail('truck-1');
      await trucks.clickTab('insurance');
      await trucks.expectTabContentLoaded('insurance');
    });

    test('should switch to alerts tab', async ({ ownerPage }) => {
      const trucks = new TrucksPage(ownerPage);
      
      await trucks.navigateToTruckDetail('truck-1');
      await trucks.clickTab('alerts');
      await trucks.expectTabContentLoaded('alerts');
    });

    test('should edit truck details', async ({ ownerPage }) => {
      const trucks = new TrucksPage(ownerPage);
      
      await trucks.navigateToTruckDetail('truck-1');
      await trucks.editTruck({
        status: 'active',
      });
      
      await trucks.expectUrl(/\/trucks\/truck-1/);
    });
  });

  test.describe('RBAC - Driver Restrictions', () => {
    test('driver should only see assigned truck', async ({ driverPage }) => {
      const trucks = new TrucksPage(driverPage);
      
      await trucks.navigate();
      const count = await trucks.getTruckCountFromList();
      
      // Driver should see only 1 truck (their assigned truck)
      expect(count).toBeLessThanOrEqual(1);
    });

    test('driver should not access truck detail of other truck', async ({ driverPage }) => {
      const trucks = new TrucksPage(driverPage);
      
      // Try to access a truck that's not assigned (assuming truck-100 doesn't exist)
      await trucks.navigateToTruckDetail('truck-100');
      
      // Should get 403 or redirect to trucks list
      const currentUrl = driverPage.url();
      expect(currentUrl).toMatch(/\/trucks|\/403|\/error/);
    });

    test('driver should not see create truck button', async ({ driverPage }) => {
      const trucks = new TrucksPage(driverPage);
      
      await trucks.navigate();
      await trucks.expectHidden(trucks.createTruckButton);
    });

    test('driver should not see delete truck button', async ({ driverPage }) => {
      const trucks = new TrucksPage(driverPage);
      
      if (driverPage.url().includes('truck-')) {
        await trucks.expectHidden(trucks.deleteButton);
      }
    });
  });

  test.describe('Manager Permissions', () => {
    test('manager should see all trucks', async ({ managerPage }) => {
      const trucks = new TrucksPage(managerPage);
      
      await trucks.navigate();
      const count = await trucks.getTruckCountFromList();
      
      expect(count).toBeGreaterThan(0);
    });

    test('manager should not see delete button', async ({ managerPage }) => {
      const trucks = new TrucksPage(managerPage);
      
      await trucks.navigateToTruckDetail('truck-1');
      await trucks.expectHidden(trucks.deleteButton);
    });

    test('manager should see edit button', async ({ managerPage }) => {
      const trucks = new TrucksPage(managerPage);
      
      await trucks.navigateToTruckDetail('truck-1');
      await trucks.expectVisible(trucks.editButton);
    });
  });
});
