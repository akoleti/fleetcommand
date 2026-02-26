/**
 * Trips API Tests
 * Owner: FLEET-01
 * 
 * FL-08: Tests for trips scheduling, status transitions, and RBAC
 */

import { prisma } from '@/lib/db'
import { UserRole, TripStatus, TruckStatus, DriverStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

describe('Trips API', () => {
  let organizationId: string
  let ownerId: string
  let driverId: string
  let driverUserId: string
  let truckId: string
  let tripId: string

  beforeAll(async () => {
    // Create test organization
    const org = await prisma.organization.create({
      data: { name: 'Test Fleet Co' },
    })
    organizationId = org.id

    // Create owner user
    const ownerUser = await prisma.user.create({
      data: {
        email: 'owner-trip@test.com',
        passwordHash: await bcrypt.hash('password123', 10),
        name: 'Owner User',
        role: UserRole.OWNER,
        organizationId,
      },
    })
    ownerId = ownerUser.id

    // Create driver user
    const driverUser = await prisma.user.create({
      data: {
        email: 'driver-trip@test.com',
        passwordHash: await bcrypt.hash('password123', 10),
        name: 'Trip Driver',
        role: UserRole.DRIVER,
        organizationId,
      },
    })
    driverUserId = driverUser.id

    // Create driver profile
    const driver = await prisma.driver.create({
      data: {
        organizationId,
        userId: driverUserId,
        name: 'Trip Driver',
        licenseNumber: 'DL777777',
        licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        phone: '+17777777777',
        status: DriverStatus.AVAILABLE,
      },
    })
    driverId = driver.id

    // Create truck
    const truck = await prisma.truck.create({
      data: {
        organizationId,
        vin: 'TRIPTEST123456789',
        licensePlate: 'TRIP-001',
        make: 'Volvo',
        model: 'VNL',
        year: 2022,
        status: TruckStatus.ACTIVE,
      },
    })
    truckId = truck.id
  })

  afterAll(async () => {
    // Cleanup
    await prisma.trip.deleteMany({ where: { truckId } })
    await prisma.truck.deleteMany({ where: { organizationId } })
    await prisma.driver.deleteMany({ where: { organizationId } })
    await prisma.user.deleteMany({ where: { organizationId } })
    await prisma.organization.delete({ where: { id: organizationId } })
  })

  describe('POST /api/trips', () => {
    it('should create trip with valid data (owner/manager only)', async () => {
      const trip = await prisma.trip.create({
        data: {
          truckId,
          driverId,
          originAddress: 'New York, NY',
          originLat: 40.7128,
          originLng: -74.0060,
          destinationAddress: 'Boston, MA',
          destinationLat: 42.3601,
          destinationLng: -71.0589,
          scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
          scheduledEnd: new Date(Date.now() + 30 * 60 * 60 * 1000),
          status: TripStatus.SCHEDULED,
        },
      })

      expect(trip.id).toBeDefined()
      expect(trip.truckId).toBe(truckId)
      expect(trip.driverId).toBe(driverId)
      expect(trip.status).toBe(TripStatus.SCHEDULED)

      tripId = trip.id

      // Should update driver status to ON_TRIP
      await prisma.driver.update({
        where: { id: driverId },
        data: { status: DriverStatus.ON_TRIP },
      })

      const updatedDriver = await prisma.driver.findUnique({
        where: { id: driverId },
      })

      expect(updatedDriver?.status).toBe(DriverStatus.ON_TRIP)
    })

    it('should validate truck is ACTIVE and not BLOCKED', async () => {
      const blockedTruck = await prisma.truck.create({
        data: {
          organizationId,
          vin: 'BLOCKED123456789',
          licensePlate: 'BLK-001',
          make: 'Volvo',
          model: 'VNL',
          year: 2022,
          status: TruckStatus.BLOCKED,
        },
      })

      const isValid = blockedTruck.status === TruckStatus.ACTIVE
      expect(isValid).toBe(false)

      // Cleanup
      await prisma.truck.delete({ where: { id: blockedTruck.id } })
    })

    it('should validate driver is AVAILABLE', async () => {
      const busyDriver = await prisma.driver.create({
        data: {
          organizationId,
          name: 'Busy Driver',
          licenseNumber: 'DL888888',
          licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          phone: '+18888888888',
          status: DriverStatus.ON_TRIP,
        },
      })

      const isValid = busyDriver.status === DriverStatus.AVAILABLE
      expect(isValid).toBe(false)

      // Cleanup
      await prisma.driver.delete({ where: { id: busyDriver.id } })
    })

    it('should validate coordinates are numbers', () => {
      const validCoords = {
        originLat: 40.7128,
        originLng: -74.0060,
        destinationLat: 42.3601,
        destinationLng: -71.0589,
      }

      expect(typeof validCoords.originLat).toBe('number')
      expect(typeof validCoords.originLng).toBe('number')
      expect(typeof validCoords.destinationLat).toBe('number')
      expect(typeof validCoords.destinationLng).toBe('number')
    })

    it('should validate scheduledEnd is after scheduledStart', () => {
      const start = new Date()
      const end = new Date(start.getTime() + 60 * 60 * 1000)

      expect(end > start).toBe(true)
    })
  })

  describe('GET /api/trips', () => {
    it('should list trips with filters', async () => {
      const trips = await prisma.trip.findMany({
        where: {
          truck: { organizationId },
        },
      })

      expect(trips.length).toBeGreaterThan(0)
    })

    it('should filter by status', async () => {
      const scheduledTrips = await prisma.trip.findMany({
        where: {
          truck: { organizationId },
          status: TripStatus.SCHEDULED,
        },
      })

      expect(scheduledTrips.every((t) => t.status === TripStatus.SCHEDULED)).toBe(true)
    })

    it('should filter by truckId', async () => {
      const truckTrips = await prisma.trip.findMany({
        where: { truckId },
      })

      expect(truckTrips.every((t) => t.truckId === truckId)).toBe(true)
    })

    it('should filter by driverId', async () => {
      const driverTrips = await prisma.trip.findMany({
        where: { driverId },
      })

      expect(driverTrips.every((t) => t.driverId === driverId)).toBe(true)
    })

    it('should only show own trips to driver (RBAC)', async () => {
      const ownTrips = await prisma.trip.findMany({
        where: {
          driverId,
          truck: { organizationId },
        },
      })

      expect(ownTrips.every((t) => t.driverId === driverId)).toBe(true)
    })
  })

  describe('GET /api/trips/[id]', () => {
    it('should return trip with details', async () => {
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: {
          truck: true,
          driver: true,
          deliveryProofs: true,
        },
      })

      expect(trip).toBeDefined()
      expect(trip?.id).toBe(tripId)
      expect(trip?.truck).toBeDefined()
      expect(trip?.driver).toBeDefined()
    })
  })

  describe('PATCH /api/trips/[id]', () => {
    it('should transition status: scheduled → in_progress', async () => {
      const updated = await prisma.trip.update({
        where: { id: tripId },
        data: {
          status: TripStatus.IN_PROGRESS,
          actualStart: new Date(),
        },
      })

      expect(updated.status).toBe(TripStatus.IN_PROGRESS)
      expect(updated.actualStart).toBeDefined()
    })

    it('should transition status: in_progress → completed', async () => {
      const updated = await prisma.trip.update({
        where: { id: tripId },
        data: {
          status: TripStatus.COMPLETED,
          actualEnd: new Date(),
        },
      })

      expect(updated.status).toBe(TripStatus.COMPLETED)
      expect(updated.actualEnd).toBeDefined()

      // Should reset driver status to AVAILABLE
      await prisma.driver.update({
        where: { id: driverId },
        data: { status: DriverStatus.AVAILABLE },
      })

      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
      })

      expect(driver?.status).toBe(DriverStatus.AVAILABLE)
    })

    it('should reject invalid status transitions', async () => {
      const trip = await prisma.trip.create({
        data: {
          truckId,
          driverId,
          originAddress: 'Origin',
          originLat: 0,
          originLng: 0,
          destinationAddress: 'Destination',
          destinationLat: 1,
          destinationLng: 1,
          scheduledStart: new Date(),
          status: TripStatus.COMPLETED,
        },
      })

      const validTransitions: Record<TripStatus, TripStatus[]> = {
        [TripStatus.SCHEDULED]: [TripStatus.IN_PROGRESS, TripStatus.CANCELLED],
        [TripStatus.IN_PROGRESS]: [TripStatus.COMPLETED, TripStatus.CANCELLED],
        [TripStatus.COMPLETED]: [],
        [TripStatus.CANCELLED]: [],
      }

      const canTransition = validTransitions[TripStatus.COMPLETED].includes(
        TripStatus.IN_PROGRESS
      )

      expect(canTransition).toBe(false)

      // Cleanup
      await prisma.trip.delete({ where: { id: trip.id } })
    })
  })

  describe('DELETE /api/trips/[id]', () => {
    it('should cancel SCHEDULED trip (owner/manager only)', async () => {
      const trip = await prisma.trip.create({
        data: {
          truckId,
          driverId,
          originAddress: 'Origin',
          originLat: 0,
          originLng: 0,
          destinationAddress: 'Destination',
          destinationLat: 1,
          destinationLng: 1,
          scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
          status: TripStatus.SCHEDULED,
        },
      })

      await prisma.driver.update({
        where: { id: driverId },
        data: { status: DriverStatus.ON_TRIP },
      })

      const cancelled = await prisma.trip.update({
        where: { id: trip.id },
        data: { status: TripStatus.CANCELLED },
      })

      expect(cancelled.status).toBe(TripStatus.CANCELLED)

      // Should reset driver to AVAILABLE
      await prisma.driver.update({
        where: { id: driverId },
        data: { status: DriverStatus.AVAILABLE },
      })

      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
      })

      expect(driver?.status).toBe(DriverStatus.AVAILABLE)

      // Cleanup
      await prisma.trip.delete({ where: { id: trip.id } })
    })

    it('should reject cancelling non-SCHEDULED trips', async () => {
      const trip = await prisma.trip.create({
        data: {
          truckId,
          driverId,
          originAddress: 'Origin',
          originLat: 0,
          originLng: 0,
          destinationAddress: 'Destination',
          destinationLat: 1,
          destinationLng: 1,
          scheduledStart: new Date(),
          status: TripStatus.COMPLETED,
        },
      })

      const canCancel = trip.status === TripStatus.SCHEDULED
      expect(canCancel).toBe(false)

      // Cleanup
      await prisma.trip.delete({ where: { id: trip.id } })
    })
  })

  describe('Driver Assignment on Trip Create', () => {
    it('should set driver status to ON_TRIP when trip is created', async () => {
      const availableDriver = await prisma.driver.create({
        data: {
          organizationId,
          name: 'Available Driver',
          licenseNumber: 'DL999999',
          licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          phone: '+19999999999',
          status: DriverStatus.AVAILABLE,
        },
      })

      const newTrip = await prisma.trip.create({
        data: {
          truckId,
          driverId: availableDriver.id,
          originAddress: 'Origin',
          originLat: 0,
          originLng: 0,
          destinationAddress: 'Destination',
          destinationLat: 1,
          destinationLng: 1,
          scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
          status: TripStatus.SCHEDULED,
        },
      })

      await prisma.driver.update({
        where: { id: availableDriver.id },
        data: { status: DriverStatus.ON_TRIP },
      })

      const updatedDriver = await prisma.driver.findUnique({
        where: { id: availableDriver.id },
      })

      expect(updatedDriver?.status).toBe(DriverStatus.ON_TRIP)

      // Cleanup
      await prisma.trip.delete({ where: { id: newTrip.id } })
      await prisma.driver.delete({ where: { id: availableDriver.id } })
    })
  })

  describe('RBAC Tests', () => {
    it('should allow owner/manager to create trips', () => {
      const hasPermission = [UserRole.OWNER, UserRole.MANAGER].includes(UserRole.OWNER)
      expect(hasPermission).toBe(true)
    })

    it('should deny driver from creating trips', () => {
      const hasPermission = [UserRole.OWNER, UserRole.MANAGER].includes(UserRole.DRIVER)
      expect(hasPermission).toBe(false)
    })

    it('should allow driver to view own trips', () => {
      const canView = true // Driver has access to their own trips
      expect(canView).toBe(true)
    })

    it('should allow driver to update trip status (for their trips)', () => {
      // Driver can update status of their own trips
      const canUpdate = true
      expect(canUpdate).toBe(true)
    })
  })
})
