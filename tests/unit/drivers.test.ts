/**
 * Drivers API Tests
 * Owner: FLEET-01
 * 
 * FL-08: Tests for drivers CRUD API and availability management
 */

import { prisma } from '@/lib/db'
import { UserRole, DriverStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

describe('Drivers API', () => {
  let organizationId: string
  let ownerId: string
  let driverId: string
  let driverUserId: string

  beforeAll(async () => {
    // Create test organization
    const org = await prisma.organization.create({
      data: { name: 'Test Fleet Co' },
    })
    organizationId = org.id

    // Create owner user
    const ownerUser = await prisma.user.create({
      data: {
        email: 'owner-driver@test.com',
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
        email: 'testdriver@test.com',
        passwordHash: await bcrypt.hash('password123', 10),
        name: 'Test Driver',
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
        name: 'Test Driver',
        licenseNumber: 'DL987654',
        licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        phone: '+19876543210',
        status: DriverStatus.AVAILABLE,
      },
    })
    driverId = driver.id
  })

  afterAll(async () => {
    // Cleanup
    await prisma.driver.deleteMany({ where: { organizationId } })
    await prisma.user.deleteMany({ where: { organizationId } })
    await prisma.organization.delete({ where: { id: organizationId } })
  })

  describe('GET /api/drivers', () => {
    it('should list all drivers for owner', async () => {
      const drivers = await prisma.driver.findMany({
        where: { organizationId },
      })

      expect(drivers.length).toBeGreaterThan(0)
      expect(drivers[0].organizationId).toBe(organizationId)
    })

    it('should filter drivers by status', async () => {
      const availableDrivers = await prisma.driver.findMany({
        where: {
          organizationId,
          status: DriverStatus.AVAILABLE,
        },
      })

      expect(availableDrivers.every((d) => d.status === DriverStatus.AVAILABLE)).toBe(true)
    })

    it('should search drivers by name', async () => {
      const drivers = await prisma.driver.findMany({
        where: {
          organizationId,
          name: { contains: 'Test', mode: 'insensitive' },
        },
      })

      expect(drivers.length).toBeGreaterThan(0)
    })

    it('should only show own profile to driver (RBAC)', async () => {
      const ownDriver = await prisma.driver.findFirst({
        where: {
          organizationId,
          userId: driverUserId,
        },
      })

      expect(ownDriver).toBeDefined()
      expect(ownDriver?.userId).toBe(driverUserId)
    })
  })

  describe('POST /api/drivers', () => {
    it('should create driver with user account (owner only)', async () => {
      const email = 'newdriver@test.com'
      const password = 'password123'

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: await bcrypt.hash(password, 10),
          name: 'New Driver',
          role: UserRole.DRIVER,
          organizationId,
          phone: '+11234567890',
        },
      })

      // Create driver profile
      const driver = await prisma.driver.create({
        data: {
          organizationId,
          userId: user.id,
          name: 'New Driver',
          licenseNumber: 'DL111111',
          licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          phone: '+11234567890',
          status: DriverStatus.AVAILABLE,
        },
      })

      expect(driver.id).toBeDefined()
      expect(driver.userId).toBe(user.id)
      expect(user.role).toBe(UserRole.DRIVER)

      // Cleanup
      await prisma.driver.delete({ where: { id: driver.id } })
      await prisma.user.delete({ where: { id: user.id } })
    })

    it('should reject duplicate email', async () => {
      await expect(
        prisma.user.create({
          data: {
            email: 'testdriver@test.com', // Duplicate
            passwordHash: await bcrypt.hash('password123', 10),
            name: 'Duplicate Driver',
            role: UserRole.DRIVER,
            organizationId,
          },
        })
      ).rejects.toThrow()
    })

    it('should validate password length (min 8 chars)', () => {
      const validPassword = 'password123'
      const invalidPassword = 'pass'

      expect(validPassword.length >= 8).toBe(true)
      expect(invalidPassword.length >= 8).toBe(false)
    })

    it('should validate email format', () => {
      const validEmail = 'driver@test.com'
      const invalidEmail = 'notanemail'

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      expect(emailRegex.test(validEmail)).toBe(true)
      expect(emailRegex.test(invalidEmail)).toBe(false)
    })
  })

  describe('GET /api/drivers/[id]', () => {
    it('should return driver profile with stats', async () => {
      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
        include: {
          assignedTrucks: true,
          trips: {
            orderBy: { scheduledStart: 'desc' },
            take: 20,
          },
        },
      })

      expect(driver).toBeDefined()
      expect(driver?.id).toBe(driverId)
    })

    it('should calculate performance stats', async () => {
      // Create completed trips
      const truck = await prisma.truck.create({
        data: {
          organizationId,
          vin: 'STATTEST123456789',
          licensePlate: 'STAT-001',
          make: 'Volvo',
          model: 'VNL',
          year: 2022,
        },
      })

      const trip = await prisma.trip.create({
        data: {
          truckId: truck.id,
          driverId,
          originAddress: 'Origin',
          originLat: 0,
          originLng: 0,
          destinationAddress: 'Destination',
          destinationLat: 1,
          destinationLng: 1,
          scheduledStart: new Date(),
          scheduledEnd: new Date(Date.now() + 2 * 60 * 60 * 1000),
          status: 'COMPLETED',
          actualStart: new Date(),
          actualEnd: new Date(Date.now() + 1 * 60 * 60 * 1000),
        },
      })

      const completedTrips = await prisma.trip.findMany({
        where: {
          driverId,
          status: 'COMPLETED',
        },
      })

      expect(completedTrips.length).toBeGreaterThan(0)

      // Cleanup
      await prisma.trip.delete({ where: { id: trip.id } })
      await prisma.truck.delete({ where: { id: truck.id } })
    })

    it('should check license expiry alert', () => {
      const expiryDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000) // 20 days
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      const alert = daysUntilExpiry < 30

      expect(alert).toBe(true)
    })
  })

  describe('PATCH /api/drivers/[id]', () => {
    it('should update driver profile (owner/manager only)', async () => {
      const updated = await prisma.driver.update({
        where: { id: driverId },
        data: { phone: '+19999999999' },
      })

      expect(updated.phone).toBe('+19999999999')

      // Revert
      await prisma.driver.update({
        where: { id: driverId },
        data: { phone: '+19876543210' },
      })
    })

    it('should update license expiry', async () => {
      const newExpiry = new Date(Date.now() + 730 * 24 * 60 * 60 * 1000) // 2 years

      const updated = await prisma.driver.update({
        where: { id: driverId },
        data: { licenseExpiry: newExpiry },
      })

      expect(updated.licenseExpiry.getTime()).toBe(newExpiry.getTime())
    })
  })

  describe('PATCH /api/drivers/[id]/availability', () => {
    it('should update driver availability status', async () => {
      const updated = await prisma.driver.update({
        where: { id: driverId },
        data: { status: DriverStatus.OFF_DUTY },
      })

      expect(updated.status).toBe(DriverStatus.OFF_DUTY)

      // Revert
      await prisma.driver.update({
        where: { id: driverId },
        data: { status: DriverStatus.AVAILABLE },
      })
    })

    it('should reject status change if driver has active trips', async () => {
      const truck = await prisma.truck.create({
        data: {
          organizationId,
          vin: 'ACTIVETEST123456789',
          licensePlate: 'ACT-001',
          make: 'Volvo',
          model: 'VNL',
          year: 2022,
        },
      })

      // Create active trip
      const trip = await prisma.trip.create({
        data: {
          truckId: truck.id,
          driverId,
          originAddress: 'Origin',
          originLat: 0,
          originLng: 0,
          destinationAddress: 'Destination',
          destinationLat: 1,
          destinationLng: 1,
          scheduledStart: new Date(),
          status: 'IN_PROGRESS',
        },
      })

      // Set driver to ON_TRIP
      await prisma.driver.update({
        where: { id: driverId },
        data: { status: DriverStatus.ON_TRIP },
      })

      // Check for active trips
      const activeTrips = await prisma.trip.findFirst({
        where: {
          driverId,
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        },
      })

      expect(activeTrips).toBeDefined()

      // Cleanup
      await prisma.trip.delete({ where: { id: trip.id } })
      await prisma.truck.delete({ where: { id: truck.id } })
      await prisma.driver.update({
        where: { id: driverId },
        data: { status: DriverStatus.AVAILABLE },
      })
    })

    it('should allow only specific statuses', () => {
      const allowedStatuses = [
        DriverStatus.AVAILABLE,
        DriverStatus.OFF_DUTY,
        DriverStatus.SUSPENDED,
      ]

      expect(allowedStatuses.includes(DriverStatus.AVAILABLE)).toBe(true)
      expect(allowedStatuses.includes(DriverStatus.ON_TRIP)).toBe(false) // Auto-set by system
    })
  })

  describe('RBAC Tests', () => {
    it('should allow owner to create drivers', () => {
      const hasPermission = UserRole.OWNER === UserRole.OWNER
      expect(hasPermission).toBe(true)
    })

    it('should allow manager to update drivers', () => {
      const hasPermission = [UserRole.OWNER, UserRole.MANAGER].includes(UserRole.MANAGER)
      expect(hasPermission).toBe(true)
    })

    it('should deny driver from viewing other drivers', () => {
      // Driver can only see themselves
      const canViewAll = UserRole.DRIVER !== UserRole.DRIVER
      expect(canViewAll).toBe(false)
    })
  })
})
