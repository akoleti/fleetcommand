/**
 * Database Unit Tests
 * Tests connection, schema validation, relationships, and spatial queries
 */

import { PrismaClient } from '@prisma/client';
import { db, coordsToGeography, calculateDistance, getActiveTrucks } from '../../lib/db';

describe('Database Tests', () => {
  let testOrgId: string;
  let testUserId: string;
  let testTruckId: string;
  let testDriverId: string;

  beforeAll(async () => {
    // Get existing test data from seed
    const org = await db.organization.findFirst();
    if (!org) throw new Error('No organization found - run seed first');
    testOrgId = org.id;

    const user = await db.user.findFirst({ where: { role: 'DRIVER' } });
    if (!user) throw new Error('No driver user found');
    testUserId = user.id;

    const driver = await db.driverProfile.findFirst();
    if (!driver) throw new Error('No driver profile found');
    testDriverId = driver.id;

    const truck = await db.truck.findFirst();
    if (!truck) throw new Error('No truck found');
    testTruckId = truck.id;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  describe('Connection Tests', () => {
    it('should connect to Neon database', async () => {
      const result = await db.$queryRaw`SELECT 1 as value`;
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should verify PostGIS extension is enabled', async () => {
      const result = await db.$queryRaw<Array<{ extname: string }>>`
        SELECT extname FROM pg_extension WHERE extname = 'postgis'
      `;
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].extname).toBe('postgis');
    });
  });

  describe('Schema Validation Tests', () => {
    it('should have all 14 tables created', async () => {
      const tables = await db.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE '_prisma%'
        ORDER BY tablename
      `;

      const tableNames = tables.map(t => t.tablename);
      
      expect(tableNames).toContain('organizations');
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('trucks');
      expect(tableNames).toContain('truck_status');
      expect(tableNames).toContain('gps_locations');
      expect(tableNames).toContain('driver_profiles');
      expect(tableNames).toContain('trips');
      expect(tableNames).toContain('maintenance_logs');
      expect(tableNames).toContain('fuel_logs');
      expect(tableNames).toContain('alerts');
      expect(tableNames).toContain('delivery_proofs');
      expect(tableNames).toContain('delivery_media');
      expect(tableNames).toContain('truck_insurance');
      expect(tableNames).toContain('insurance_claims');
    });

    it('should have correct columns in trucks table', async () => {
      const columns = await db.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'trucks'
        ORDER BY ordinal_position
      `;

      const columnNames = columns.map(c => c.column_name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('truck_code');
      expect(columnNames).toContain('plate_number');
      expect(columnNames).toContain('vin');
      expect(columnNames).toContain('status');
      expect(columnNames).toContain('current_driver_id');
    });

    it('should have correct columns in gps_locations table', async () => {
      const columns = await db.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'gps_locations'
        ORDER BY ordinal_position
      `;

      const columnNames = columns.map(c => c.column_name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('truck_id');
      expect(columnNames).toContain('coordinates');
      expect(columnNames).toContain('latitude');
      expect(columnNames).toContain('longitude');
      expect(columnNames).toContain('speed_kmh');
      expect(columnNames).toContain('recordedAt');
    });
  });

  describe('Relationship Tests', () => {
    it('should link truck to organization', async () => {
      const truck = await db.truck.findUnique({
        where: { id: testTruckId },
        include: { organization: true },
      });

      expect(truck).toBeDefined();
      expect(truck?.organization).toBeDefined();
      expect(truck?.organization.id).toBe(testOrgId);
    });

    it('should link truck to current driver', async () => {
      const truck = await db.truck.findFirst({
        where: { currentDriverId: { not: null } },
        include: { 
          currentDriver: {
            include: { user: true }
          }
        },
      });

      expect(truck).toBeDefined();
      expect(truck?.currentDriver).toBeDefined();
      expect(truck?.currentDriver?.user.role).toBe('DRIVER');
    });

    it('should link trip to truck and driver', async () => {
      const trip = await db.trip.findFirst({
        include: {
          truck: true,
          driver: true,
        },
      });

      expect(trip).toBeDefined();
      expect(trip?.truck).toBeDefined();
      expect(trip?.driver).toBeDefined();
      expect(trip?.truckId).toBe(trip?.truck.id);
      expect(trip?.driverId).toBe(trip?.driver.id);
    });

    it('should link maintenance log to truck and user', async () => {
      const log = await db.maintenanceLog.findFirst({
        include: {
          truck: true,
          logger: true,
        },
      });

      expect(log).toBeDefined();
      expect(log?.truck).toBeDefined();
      expect(log?.logger).toBeDefined();
    });

    it('should link truck status to truck', async () => {
      const status = await db.truckStatusRecord.findFirst({
        include: { truck: true },
      });

      expect(status).toBeDefined();
      expect(status?.truck).toBeDefined();
      expect(status?.truckId).toBe(status?.truck.id);
    });
  });

  describe('Spatial Index Tests', () => {
    it('should have spatial index on gps_locations.coordinates', async () => {
      const indexes = await db.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'gps_locations'
        AND indexname LIKE '%coordinates%'
      `;

      expect(indexes.length).toBeGreaterThan(0);
    });

    it('should perform ST_Distance query on GPS locations', async () => {
      // Get two GPS locations
      const locations = await db.gpsLocation.findMany({
        take: 2,
        orderBy: { recordedAt: 'desc' },
      });

      if (locations.length < 2) {
        console.warn('Not enough GPS locations for distance test');
        return;
      }

      const [loc1, loc2] = locations;

      // Test PostGIS distance query (this validates PostGIS is working)
      const result = await db.$queryRaw<Array<{ distance: number }>>`
        SELECT ST_Distance(
          ST_MakePoint(${loc1.longitude}, ${loc1.latitude})::geography,
          ST_MakePoint(${loc2.longitude}, ${loc2.latitude})::geography
        ) as distance
      `;

      expect(result).toBeDefined();
      expect(result[0].distance).toBeGreaterThanOrEqual(0);
    });

    it('should perform ST_DWithin query (nearby trucks)', async () => {
      const location = await db.gpsLocation.findFirst();
      if (!location) {
        console.warn('No GPS location found for DWithin test');
        return;
      }

      // Find trucks within 100km (100000 meters)
      const result = await db.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM gps_locations
        WHERE ST_DWithin(
          ST_MakePoint(${location.longitude}, ${location.latitude})::geography,
          ST_MakePoint(longitude, latitude)::geography,
          100000
        )
      `;

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Seed Data Tests', () => {
    it('should have seeded 30 trucks', async () => {
      const count = await db.truck.count();
      expect(count).toBe(30);
    });

    it('should have trucks with codes TRK-001 to TRK-030', async () => {
      const trucks = await db.truck.findMany({
        select: { truckCode: true },
        orderBy: { truckCode: 'asc' },
      });

      expect(trucks[0].truckCode).toBe('TRK-001');
      expect(trucks[29].truckCode).toBe('TRK-030');
    });

    it('should have seeded 30 drivers', async () => {
      const count = await db.driverProfile.count();
      expect(count).toBe(30);
    });

    it('should have seeded at least 100 trips', async () => {
      const count = await db.trip.count();
      expect(count).toBeGreaterThanOrEqual(100);
    });

    it('should have seeded GPS locations', async () => {
      const count = await db.gpsLocation.count();
      expect(count).toBeGreaterThan(300);
    });

    it('should have seeded maintenance logs', async () => {
      const count = await db.maintenanceLog.count();
      expect(count).toBeGreaterThanOrEqual(20);
    });

    it('should have seeded fuel logs', async () => {
      const count = await db.fuelLog.count();
      expect(count).toBeGreaterThanOrEqual(30);
    });

    it('should have seeded alerts', async () => {
      const count = await db.alert.count();
      expect(count).toBeGreaterThanOrEqual(10);
    });

    it('should have seeded insurance policies', async () => {
      const count = await db.truckInsurance.count();
      expect(count).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Utility Function Tests', () => {
    it('should convert coordinates to PostGIS geography format', () => {
      const geography = coordsToGeography(40.7128, -74.0060);
      expect(geography).toBe('SRID=4326;POINT(-74.006 40.7128)');
    });

    it('should calculate distance between coordinates', () => {
      // Distance between NYC and LA (roughly 3935 km)
      const distance = calculateDistance(40.7128, -74.0060, 34.0522, -118.2437);
      expect(distance).toBeGreaterThan(3900);
      expect(distance).toBeLessThan(4000);
    });

    it('should get active trucks for organization', async () => {
      const trucks = await getActiveTrucks(testOrgId);
      expect(Array.isArray(trucks)).toBe(true);
      trucks.forEach(truck => {
        expect(truck.status).toBe('ACTIVE');
        expect(truck.orgId).toBe(testOrgId);
      });
    });
  });

  describe('Index Performance Tests', () => {
    it('should have index on trucks.truck_code', async () => {
      const indexes = await db.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'trucks'
        AND indexname LIKE '%truck_code%'
      `;

      expect(indexes.length).toBeGreaterThan(0);
    });

    it('should have index on alerts.is_resolved', async () => {
      const indexes = await db.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'alerts'
        AND indexname LIKE '%is_resolved%'
      `;

      expect(indexes.length).toBeGreaterThan(0);
    });

    it('should have index on gps_locations.recordedAt', async () => {
      const indexes = await db.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'gps_locations'
        AND (indexname LIKE '%recorded%' OR indexname LIKE '%recordedAt%')
      `;

      expect(indexes.length).toBeGreaterThan(0);
    });
  });
});
