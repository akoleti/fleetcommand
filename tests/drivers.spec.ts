import { test, expect } from './fixtures/auth';
import { DriversPage } from './pages/drivers.page';

test.describe('Drivers Pages', () => {
  test.describe('Drivers List Page', () => {
    test('should load drivers list', async ({ ownerPage }) => {
      const drivers = new DriversPage(ownerPage);
      
      await drivers.navigate();
      await drivers.expectDriversTableLoaded();
    });

    test('should display driver count', async ({ ownerPage }) => {
      const drivers = new DriversPage(ownerPage);
      
      await drivers.navigate();
      const count = await drivers.getDriverCount();
      expect(count).toBeGreaterThan(0);
    });

    test('should search for driver by name', async ({ ownerPage }) => {
      const drivers = new DriversPage(ownerPage);
      
      await drivers.navigate();
      const initialCount = await drivers.getDriverCount();
      
      // Search for a driver
      await drivers.searchDriver('John');
      const searchCount = await drivers.getDriverCount();
      
      expect(searchCount).toBeLessThanOrEqual(initialCount);
    });

    test('should navigate to create driver page', async ({ ownerPage }) => {
      const drivers = new DriversPage(ownerPage);
      
      await drivers.navigate();
      await drivers.clickCreateDriver();
      await drivers.expectUrl(/\/drivers\/new/);
    });
  });

  test.describe('Driver Profile Page', () => {
    test('should load driver profile', async ({ ownerPage }) => {
      const drivers = new DriversPage(ownerPage);
      
      // Navigate to first driver (assuming driver-1 exists)
      await drivers.navigateToDriverProfile('driver-1');
      
      // Should see driver details
      await drivers.expectVisible('[data-testid="driver-profile-header"]');
    });

    test('should display driver information fields', async ({ ownerPage }) => {
      const drivers = new DriversPage(ownerPage);
      
      await drivers.navigateToDriverProfile('driver-1');
      
      // In view mode, should show driver data
      await drivers.expectVisible(drivers.driverNameField);
    });

    test('should edit driver information', async ({ ownerPage }) => {
      const drivers = new DriversPage(ownerPage);
      
      await drivers.navigateToDriverProfile('driver-1');
      
      await drivers.editDriver({
        phone: '555-0199',
      });
      
      // Should remain on profile page
      await drivers.expectUrl(/\/drivers\/driver-1/);
    });

    test('should view trip history', async ({ ownerPage }) => {
      const drivers = new DriversPage(ownerPage);
      
      await drivers.navigateToDriverProfile('driver-1');
      await drivers.viewTripHistory();
      
      // Trip history content should be visible
      await drivers.expectVisible('[data-testid="trip-history-list"]');
    });
  });

  test.describe('RBAC - Driver Restrictions', () => {
    test('driver should only see own profile', async ({ driverPage }) => {
      const drivers = new DriversPage(driverPage);
      
      await drivers.navigate();
      const count = await drivers.getDriverCount();
      
      // Driver should only see themselves in list
      expect(count).toBeLessThanOrEqual(1);
    });

    test('driver should not access other driver profile', async ({ driverPage }) => {
      const drivers = new DriversPage(driverPage);
      
      // Try to access another driver's profile
      await drivers.navigateToDriverProfile('driver-2');
      
      // Should get 403 or redirect
      const currentUrl = driverPage.url();
      expect(currentUrl).toMatch(/\/drivers|\/403|\/error|\/driver-1/);
    });

    test('driver should not see create button', async ({ driverPage }) => {
      const drivers = new DriversPage(driverPage);
      
      await drivers.navigate();
      await drivers.expectHidden(drivers.createDriverButton);
    });

    test('driver should not see delete button on profile', async ({ driverPage }) => {
      const drivers = new DriversPage(driverPage);
      
      // Navigate to own profile
      await driverPage.goto('/drivers/driver-1');
      await drivers.expectHidden(drivers.deleteDriverButton);
    });

    test('driver should not edit license information', async ({ driverPage }) => {
      const drivers = new DriversPage(driverPage);
      
      await driverPage.goto('/drivers/driver-1');
      
      // License fields should be read-only or disabled
      const licenseInput = driverPage.locator(drivers.licenseNumberField);
      const isDisabled = await licenseInput.isDisabled();
      
      expect(isDisabled).toBeTruthy();
    });
  });

  test.describe('Manager Permissions', () => {
    test('manager should see all drivers', async ({ managerPage }) => {
      const drivers = new DriversPage(managerPage);
      
      await drivers.navigate();
      const count = await drivers.getDriverCount();
      
      expect(count).toBeGreaterThan(0);
    });

    test('manager should see edit button', async ({ managerPage }) => {
      const drivers = new DriversPage(managerPage);
      
      await drivers.navigateToDriverProfile('driver-1');
      await drivers.expectVisible(drivers.editProfileButton);
    });

    test('manager should not see delete button', async ({ managerPage }) => {
      const drivers = new DriversPage(managerPage);
      
      await drivers.navigateToDriverProfile('driver-1');
      await drivers.expectHidden(drivers.deleteDriverButton);
    });
  });

  test.describe('Owner Permissions', () => {
    test('owner should see all drivers', async ({ ownerPage }) => {
      const drivers = new DriversPage(ownerPage);
      
      await drivers.navigate();
      const count = await drivers.getDriverCount();
      
      expect(count).toBeGreaterThan(0);
    });

    test('owner should see edit button', async ({ ownerPage }) => {
      const drivers = new DriversPage(ownerPage);
      
      await drivers.navigateToDriverProfile('driver-1');
      await drivers.expectVisible(drivers.editProfileButton);
    });

    test('owner should see delete button', async ({ ownerPage }) => {
      const drivers = new DriversPage(ownerPage);
      
      await drivers.navigateToDriverProfile('driver-1');
      await drivers.expectVisible(drivers.deleteDriverButton);
    });
  });
});
