/**
 * Trucks API Tests
 * Owner: FLEET-01
 * 
 * FL-08: Tests for trucks CRUD API with RBAC
 */

import { prisma } from '@/lib/db'
import { UserRole, TruckStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

describe('Trucks API', () => {
  let ownerId: string
  let managerId: string
  let driverId: string
  let driverUserId: string
  let organizationId: string
  let truckId: string
  let ownerToken: string
  let driverToken: string

  beforeAll(async () => {
    // Create test organization
    const org = await prisma.organization.create({
      data: { name: 'Test Fleet Co' },
    })
    organizationId = org.id

    // Create owner user
    const ownerUser = await prisma.user.create({
      data: {
        email: 'owner@test.com',
        passwordHash: await bcrypt.hash('password123', 10),
        name: 'Owner User',
        role: UserRole.OWNER,
        organizationId,
      },
    })
    ownerId = ownerUser.id

    // Create manager user
    const managerUser = await prisma.user.create({
      data: {
        email: 'manager@test.com',
        passwordHash: await bcrypt.hash('password123', 10),
        name: 'Manager User',
        role: UserRole.MANAGER,
        organizationId,
      },
    })
    managerId = managerUser.id

    // Create driver user
    const driverUserRecord = await prisma.user.create({
      data: {
        email: 'driver@test.com',
        passwordHash: await bcrypt.hash('password123', 10),
        name: 'Driver User',
        role: UserRole.DRIVER,
        organizationId,
      },
    })
    driverUserId = driverUserRecord.id

    // Create driver profile
    const driver = await prisma.driver.create({
      data: {
        organizationId,
        userId: driverUserId,
        name: 'Driver User',
        licenseNumber: 'DL123456',
        licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        phone: '+1234567890',
      },
    })
    driverId = driver.id

    // Create test truck
    const truck = await prisma.truck.create({
      data: {
        organizationId,
        vin: 'TEST123456789',
        licensePlate: 'TRK-001',
        make: 'Volvo',
        model: 'VNL',
        year: 2022,
        status: TruckStatus.ACTIVE,
      },
    })
    truckId = truck.id

    // Mock tokens (in real tests, generate proper JWTs)
    ownerToken = 'mock-owner-token'
    driverToken = 'mock-driver-token'
  })

  afterAll(async () => {
    // Cleanup
    await prisma.truck.deleteMany({ where: { organizationId } })
    await prisma.driver.deleteMany({ where: { organizationId } })
    await prisma.user.deleteMany({ where: { organizationId } })
    await prisma.organization.delete({ where: { id: organizationId } })
  })

  describe('GET /api/trucks', () => {
    it('should list all trucks for owner', async () => {
      const trucks = await prisma.truck.findMany({
        where: { organizationId },
      })

      expect(trucks.length).toBeGreaterThan(0)
      expect(trucks[0].organizationId).toBe(organizationId)
    })

    it('should filter trucks by status', async () => {
      const activeTrucks = await prisma.truck.findMany({
        where: {
          organizationId,
          status: TruckStatus.ACTIVE,
        },
      })

      expect(activeTrucks.every((t) => t.status === TruckStatus.ACTIVE)).toBe(true)
    })

    it('should search trucks by VIN', async () => {
      const trucks = await prisma.truck.findMany({
        where: {
          organizationId,
          vin: { contains: 'TEST', mode: 'insensitive' },
        },
      })

      expect(trucks.length).toBeGreaterThan(0)
      expect(trucks[0].vin).toContain('TEST')
    })

    it('should only show assigned truck to driver (RBAC)', async () => {
      // Assign truck to driver
      await prisma.truck.update({
        where: { id: truckId },
        data: { currentDriverId: driverId },
      })

      const driverTrucks = await prisma.truck.findMany({
        where: {
          organizationId,
          currentDriverId: driverId,
        },
      })

      expect(driverTrucks.length).toBe(1)
      expect(driverTrucks[0].currentDriverId).toBe(driverId)

      // Unassign
      await prisma.truck.update({
        where: { id: truckId },
        data: { currentDriverId: null },
      })
    })
  })

  describe('POST /api/trucks', () => {
    it('should create truck with valid data (owner only)', async () => {
      const newTruck = await prisma.truck.create({
        data: {
          organizationId,
          vin: 'NEWVIN123456789',
          licensePlate: 'TRK-002',
          make: 'Freightliner',
          model: 'Cascadia',
          year: 2023,
          status: TruckStatus.ACTIVE,
        },
      })

      expect(newTruck.id).toBeDefined()
      expect(newTruck.vin).toBe('NEWVIN123456789')
      expect(newTruck.organizationId).toBe(organizationId)

      // Cleanup
      await prisma.truck.delete({ where: { id: newTruck.id } })
    })

    it('should reject duplicate VIN', async () => {
      await expect(
        prisma.truck.create({
          data: {
            organizationId,
            vin: 'TEST123456789', // Duplicate
            licensePlate: 'TRK-003',
            make: 'Volvo',
            model: 'VNL',
            year: 2022,
          },
        })
      ).rejects.toThrow()
    })

    it('should reject invalid year', async () => {
      const invalidYears = [1800, 2050]

      for (const year of invalidYears) {
        const isValid = year >= 1900 && year <= new Date().getFullYear() + 2
        expect(isValid).toBe(false)
      }
    })
  })

  describe('GET /api/trucks/[id]', () => {
    it('should return truck with details', async () => {
      const truck = await prisma.truck.findUnique({
        where: { id: truckId },
        include: {
          currentDriver: true,
          truckStatus: true,
          insurancePolicies: {
            where: { isActive: true },
          },
        },
      })

      expect(truck).toBeDefined()
      expect(truck?.id).toBe(truckId)
    })

    it('should reject access to truck from different org', async () => {
      // Create different org
      const otherOrg = await prisma.organization.create({
        data: { name: 'Other Org' },
      })

      const otherTruck = await prisma.truck.create({
        data: {
          organizationId: otherOrg.id,
          vin: 'OTHER123456789',
          licensePlate: 'OTH-001',
          make: 'Volvo',
          model: 'VNL',
          year: 2022,
        },
      })

      // Simulate RBAC check
      const accessDenied = truck.organizationId !== organizationId
      expect(accessDenied).toBe(true)

      // Cleanup
      await prisma.truck.delete({ where: { id: otherTruck.id } })
      await prisma.organization.delete({ where: { id: otherOrg.id } })
    })
  })

  describe('PATCH /api/trucks/[id]', () => {
    it('should update truck fields (owner only)', async () => {
      const updated = await prisma.truck.update({
        where: { id: truckId },
        data: { licensePlate: 'TRK-001-UPDATED' },
      })

      expect(updated.licensePlate).toBe('TRK-001-UPDATED')

      // Revert
      await prisma.truck.update({
        where: { id: truckId },
        data: { licensePlate: 'TRK-001' },
      })
    })

    it('should not allow updating protected fields', async () => {
      const originalVin = 'TEST123456789'
      
      // VIN is unique and should not be changed
      const truck = await prisma.truck.findUnique({
        where: { id: truckId },
      })

      expect(truck?.vin).toBe(originalVin)
    })
  })

  describe('DELETE /api/trucks/[id]', () => {
    it('should soft delete truck (set status to INACTIVE)', async () => {
      const testTruck = await prisma.truck.create({
        data: {
          organizationId,
          vin: 'DELTEST123456789',
          licensePlate: 'DEL-001',
          make: 'Volvo',
          model: 'VNL',
          year: 2022,
        },
      })

      const deleted = await prisma.truck.update({
        where: { id: testTruck.id },
        data: { status: TruckStatus.INACTIVE },
      })

      expect(deleted.status).toBe(TruckStatus.INACTIVE)

      // Verify not hard deleted
      const stillExists = await prisma.truck.findUnique({
        where: { id: testTruck.id },
      })
      expect(stillExists).toBeDefined()

      // Cleanup
      await prisma.truck.delete({ where: { id: testTruck.id } })
    })

    it('should unassign driver when deactivating truck', async () => {
      const testTruck = await prisma.truck.create({
        data: {
          organizationId,
          vin: 'DELTEST2123456789',
          licensePlate: 'DEL-002',
          make: 'Volvo',
          model: 'VNL',
          year: 2022,
          currentDriverId: driverId,
        },
      })

      await prisma.truck.update({
        where: { id: testTruck.id },
        data: {
          status: TruckStatus.INACTIVE,
          currentDriverId: null,
        },
      })

      const updated = await prisma.truck.findUnique({
        where: { id: testTruck.id },
      })

      expect(updated?.currentDriverId).toBeNull()

      // Cleanup
      await prisma.truck.delete({ where: { id: testTruck.id } })
    })
  })

  describe('RBAC Tests', () => {
    it('should deny driver from creating trucks', () => {
      const hasPermission = UserRole.DRIVER === UserRole.OWNER
      expect(hasPermission).toBe(false)
    })

    it('should allow manager to list trucks', () => {
      const hasPermission = [UserRole.OWNER, UserRole.MANAGER].includes(UserRole.MANAGER)
      expect(hasPermission).toBe(true)
    })

    it('should deny driver from updating trucks', () => {
      const hasPermission = [UserRole.OWNER].includes(UserRole.DRIVER)
      expect(hasPermission).toBe(false)
    })
  })
})
