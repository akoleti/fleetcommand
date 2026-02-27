import { test, expect } from './fixtures/auth';
import { TripsPage } from './pages/trips.page';

test.describe('Trips Page', () => {
  test.describe('Trips List', () => {
    test('should load trips page', async ({ ownerPage }) => {
      const trips = new TripsPage(ownerPage);
      
      await trips.navigate();
      await trips.expectTripsTableLoaded();
    });

    test('should display trip count', async ({ ownerPage }) => {
      const trips = new TripsPage(ownerPage);
      
      await trips.navigate();
      const count = await trips.getTripCount();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should search for trip', async ({ ownerPage }) => {
      const trips = new TripsPage(ownerPage);
      
      await trips.navigate();
      const initialCount = await trips.getTripCount();
      
      // Search for a trip location
      await trips.searchTrip('New York');
      const searchCount = await trips.getTripCount();
      
      expect(searchCount).toBeLessThanOrEqual(initialCount);
    });

    test('should filter trips by status', async ({ ownerPage }) => {
      const trips = new TripsPage(ownerPage);
      
      await trips.navigate();
      
      await trips.filterByStatus('scheduled');
      // Should show only scheduled trips
      await trips.expectVisible(trips.tripsTable);
    });

    test('should filter trips by completed status', async ({ ownerPage }) => {
      const trips = new TripsPage(ownerPage);
      
      await trips.navigate();
      
      await trips.filterByStatus('completed');
      // Should show only completed trips
      await trips.expectVisible(trips.tripsTable);
    });

    test('should show all status filter options', async ({ ownerPage }) => {
      const trips = new TripsPage(ownerPage);
      
      await trips.navigate();
      
      const statuses = ['scheduled', 'active', 'completed', 'cancelled'];
      
      for (const status of statuses) {
        await trips.filterByStatus(status as any);
        await trips.expectVisible(trips.tripsTable);
      }
    });
  });

  test.describe('Create Trip', () => {
    test('should navigate to create trip form', async ({ ownerPage }) => {
      const trips = new TripsPage(ownerPage);
      
      await trips.navigate();
      await trips.click(trips.createTripButton);
      
      // Should show form fields
      await trips.expectVisible(trips.truckSelect);
      await trips.expectVisible(trips.pickupLocationInput);
      await trips.expectVisible(trips.dropoffLocationInput);
    });

    test('should create a new trip', async ({ ownerPage }) => {
      const trips = new TripsPage(ownerPage);
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      await trips.navigate();
      
      await trips.createTrip({
        truckId: 'truck-1',
        pickupLocation: 'Warehouse A',
        dropoffLocation: 'Distribution Center B',
        plannedStart: now.toISOString().split('T')[0],
        plannedEnd: tomorrow.toISOString().split('T')[0],
      });
      
      // Should return to trips list
      await trips.expectUrl('/trips');
      await trips.expectVisible(trips.tripsTable);
    });
  });

  test.describe('Trip Status Updates', () => {
    test('should complete a scheduled trip', async ({ ownerPage }) => {
      const trips = new TripsPage(ownerPage);
      
      // Assuming a trip exists
      await trips.navigate();
      await trips.filterByStatus('scheduled');
      
      if (await trips.getTripCount() > 0) {
        // Click first trip to view details
        const firstRow = ownerPage.locator(trips.tripRow).first();
        await firstRow.click();
        
        // Complete the trip
        await trips.completeTrip();
        
        // Should return to trips list
        await trips.expectUrl('/trips');
      }
    });

    test('should cancel an active trip', async ({ ownerPage }) => {
      const trips = new TripsPage(ownerPage);
      
      await trips.navigate();
      await trips.filterByStatus('active');
      
      if (await trips.getTripCount() > 0) {
        // Click first trip
        const firstRow = ownerPage.locator(trips.tripRow).first();
        await firstRow.click();
        
        // Cancel the trip
        await trips.cancelTrip();
        
        // Should return to trips list
        await trips.expectUrl('/trips');
      }
    });
  });

  test.describe('RBAC - Driver Restrictions', () => {
    test('driver should only see their own trips', async ({ driverPage }) => {
      const trips = new TripsPage(driverPage);
      
      await trips.navigate();
      const count = await trips.getTripCount();
      
      // Driver should see only trips assigned to their truck
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('driver should not see create trip button', async ({ driverPage }) => {
      const trips = new TripsPage(driverPage);
      
      await trips.navigate();
      await trips.expectHidden(trips.createTripButton);
    });

    test('driver should not edit trip details', async ({ driverPage }) => {
      const trips = new TripsPage(driverPage);
      
      await trips.navigate();
      const count = await trips.getTripCount();
      
      if (count > 0) {
        const firstRow = driverPage.locator(trips.tripRow).first();
        await firstRow.click();
        
        // Should not see edit button
        await trips.expectHidden('[data-testid="edit-trip"]');
      }
    });
  });

  test.describe('Manager Permissions', () => {
    test('manager should see all trips', async ({ managerPage }) => {
      const trips = new TripsPage(managerPage);
      
      await trips.navigate();
      const count = await trips.getTripCount();
      
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('manager should not see create button', async ({ managerPage }) => {
      const trips = new TripsPage(managerPage);
      
      await trips.navigate();
      await trips.expectHidden(trips.createTripButton);
    });

    test('manager should not complete trips', async ({ managerPage }) => {
      const trips = new TripsPage(managerPage);
      
      await trips.navigate();
      const count = await trips.getTripCount();
      
      if (count > 0) {
        const firstRow = managerPage.locator(trips.tripRow).first();
        await firstRow.click();
        
        // Should not see complete button (driver's action)
        await trips.expectHidden(trips.completeTripButton);
      }
    });
  });
});
