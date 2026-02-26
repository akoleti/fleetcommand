/**
 * Trucks API - List and Create
 * Owner: FLEET-01
 * 
 * GET /api/trucks - List all trucks (filtered by status and search)
 * POST /api/trucks - Create new truck (owner only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRole } from '@/middleware/auth'
import { prisma } from '@/lib/db'
import { getPaginationParams, createPaginatedResult, handlePrismaError } from '@/lib/db'
import { TruckStatus, UserRole } from '@prisma/client'

/**
 * GET /api/trucks
 * 
 * Query params:
 * - status: moving|idle|alert|all (default: all)
 * - search: search by truck code or plate
 * - page: page number (default: 1)
 * - limit: items per page (default: 20, max: 100)
 * 
 * RBAC:
 * - OWNER/MANAGER: see all trucks
 * - DRIVER: see only assigned truck
 */
export const GET = withAuth(async (request) => {
  try {
    const { user } = request
    const { searchParams } = new URL(request.url)
    
    const statusParam = searchParams.get('status') || 'all'
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Build where clause
    const where: any = {
      organizationId: user.organizationId,
    }

    // RBAC: Drivers can only see their assigned truck
    if (user.role === UserRole.DRIVER) {
      // Get driver record for this user
      const driver = await prisma.driver.findFirst({
        where: { userId: user.userId },
      })
      
      if (!driver) {
        return NextResponse.json(
          { error: 'Driver profile not found', code: 'DRIVER_NOT_FOUND' },
          { status: 404 }
        )
      }

      // Filter by assigned truck
      where.currentDriverId = driver.id
    }

    // Status filter
    if (statusParam !== 'all') {
      // Map status param to database enums
      const statusMap: Record<string, TruckStatus | TruckStatus[]> = {
        'moving': TruckStatus.ACTIVE,
        'idle': TruckStatus.IDLE,
        'maintenance': TruckStatus.MAINTENANCE,
        'alert': [TruckStatus.MAINTENANCE, TruckStatus.BLOCKED],
      }
      
      const mappedStatus = statusMap[statusParam]
      if (mappedStatus) {
        where.status = Array.isArray(mappedStatus) 
          ? { in: mappedStatus } 
          : mappedStatus
      }
    }

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { vin: { contains: search, mode: 'insensitive' } },
        { licensePlate: { contains: search, mode: 'insensitive' } },
        { make: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Pagination
    const { skip, take } = getPaginationParams({ page, limit })

    // Fetch trucks with related data
    const [trucks, total] = await Promise.all([
      prisma.truck.findMany({
        where,
        skip,
        take,
        include: {
          currentDriver: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          truckStatus: {
            select: {
              latitude: true,
              longitude: true,
              speed: true,
              heading: true,
              fuelLevel: true,
              ignitionOn: true,
              lastPingAt: true,
            },
          },
          maintenanceRecords: {
            where: {
              status: { not: 'COMPLETED' },
            },
            orderBy: { scheduledDate: 'asc' },
            take: 1,
            select: {
              id: true,
              type: true,
              scheduledDate: true,
            },
          },
        },
        orderBy: [
          { status: 'asc' },
          { vin: 'asc' },
        ],
      }),
      prisma.truck.count({ where }),
    ])

    // Calculate idle time for idle trucks
    const trucksWithIdleTime = trucks.map((truck) => {
      let idleMinutes = null
      
      if (truck.truckStatus && truck.status === TruckStatus.IDLE) {
        const idleMs = Date.now() - truck.truckStatus.lastPingAt.getTime()
        idleMinutes = Math.floor(idleMs / 60000)
      }

      return {
        ...truck,
        idleMinutes,
      }
    })

    return NextResponse.json(
      createPaginatedResult(trucksWithIdleTime, total, { page, limit })
    )
  } catch (error) {
    console.error('GET /api/trucks error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json(
      { error: message, code },
      { status: 500 }
    )
  }
})

/**
 * POST /api/trucks
 * 
 * Create new truck (OWNER only)
 * 
 * Body:
 * - vin: string (unique)
 * - licensePlate: string
 * - make: string
 * - model: string
 * - year: number
 */
export const POST = withRole(UserRole.OWNER)(async (request) => {
  try {
    const { user } = request
    const body = await request.json()

    // Validate required fields
    const { name, vin, licensePlate, make, model, year, fuelTankCapacityGallons, initialFuelLevel, latitude, longitude } = body
    
    if (!vin || !licensePlate || !make || !model || !year) {
      return NextResponse.json(
        { 
          error: 'Missing required fields: vin, licensePlate, make, model, year',
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      )
    }

    // Validate year
    const currentYear = new Date().getFullYear()
    if (typeof year !== 'number' || year < 1900 || year > currentYear + 2) {
      return NextResponse.json(
        { error: 'Invalid year', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Check for unique VIN
    const existingTruck = await prisma.truck.findUnique({
      where: { vin },
    })

    if (existingTruck) {
      return NextResponse.json(
        { error: 'Truck with this VIN already exists', code: 'DUPLICATE_VIN' },
        { status: 409 }
      )
    }

    // Validate optional fuel fields
    const tankCapacity = fuelTankCapacityGallons != null && fuelTankCapacityGallons !== ''
      ? parseInt(String(fuelTankCapacityGallons), 10)
      : null
    const fuelLevel = initialFuelLevel != null && initialFuelLevel !== ''
      ? Math.max(0, Math.min(100, parseInt(String(initialFuelLevel), 10)))
      : null

    if (tankCapacity != null && (isNaN(tankCapacity) || tankCapacity < 0)) {
      return NextResponse.json(
        { error: 'Fuel tank capacity must be a positive number', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Create truck
    const truck = await prisma.truck.create({
      data: {
        organizationId: user.organizationId,
        name: name || null,
        vin,
        licensePlate,
        make,
        model,
        year,
        status: TruckStatus.ACTIVE,
        fuelTankCapacityGallons: tankCapacity ?? undefined,
      },
      include: {
        currentDriver: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    })

    // If initial fuel level or location provided, create/update TruckStatusRecord
    const hasLocation = latitude != null && longitude != null && latitude !== '' && longitude !== ''
    const lat = hasLocation ? parseFloat(String(latitude)) : 0
    const lng = hasLocation ? parseFloat(String(longitude)) : 0
    const validLocation = hasLocation && !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180

    if (fuelLevel != null && !isNaN(fuelLevel) || validLocation) {
      await prisma.truckStatusRecord.upsert({
        where: { truckId: truck.id },
        create: {
          truckId: truck.id,
          latitude: validLocation ? lat : 0,
          longitude: validLocation ? lng : 0,
          speed: 0,
          heading: 0,
          fuelLevel: fuelLevel ?? null,
          ignitionOn: false,
          lastPingAt: new Date(),
        },
        update: {
          ...(validLocation && { latitude: lat, longitude: lng }),
          ...(fuelLevel != null && !isNaN(fuelLevel) && { fuelLevel }),
          lastPingAt: new Date(),
        },
      })
    }

    return NextResponse.json(truck, { status: 201 })
  } catch (error) {
    console.error('POST /api/trucks error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json(
      { error: message, code },
      { status: 500 }
    )
  }
})
