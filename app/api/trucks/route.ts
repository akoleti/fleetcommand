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

const DELIVERY_BUCKETS: Record<string, { min: number; max: number }> = {
  '0': { min: 0, max: 0 },
  '1-5': { min: 1, max: 5 },
  '6-10': { min: 6, max: 10 },
  '11-20': { min: 11, max: 20 },
  '20+': { min: 21, max: Infinity },
}

const MILEAGE_BUCKETS: Record<string, { min: number; max: number }> = {
  '0': { min: 0, max: 0 },
  '1-1k': { min: 1, max: 1000 },
  '1k-5k': { min: 1001, max: 5000 },
  '5k-10k': { min: 5001, max: 10000 },
  '10k+': { min: 10001, max: Infinity },
}

/**
 * GET /api/trucks
 * 
 * Query params:
 * - status: moving|idle|alert|maintenance|all (default: all)
 * - search: search by truck code or plate
 * - deliveryBucket: 0|1-5|6-10|11-20|20+
 * - mileageBucket: 0|1-1k|1k-5k|5k-10k|10k+
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
    const deliveryBucket = searchParams.get('deliveryBucket')
    const mileageBucket = searchParams.get('mileageBucket')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Build where clause
    const where: any = {
      organizationId: user.organizationId,
    }

    // Filter by delivery or mileage bucket (requires computing metrics)
    if (deliveryBucket && DELIVERY_BUCKETS[deliveryBucket]) {
      const [completedTrips] = await Promise.all([
        prisma.trip.findMany({
          where: {
            truck: { organizationId: user.organizationId },
            status: 'COMPLETED',
            actualEnd: { not: null },
          },
          select: { truckId: true },
        }),
      ])
      const countByTruck: Record<string, number> = {}
      for (const t of completedTrips) {
        countByTruck[t.truckId] = (countByTruck[t.truckId] ?? 0) + 1
      }
      const bucket = DELIVERY_BUCKETS[deliveryBucket]
      let truckIds: string[]
      if (bucket.min === 0 && bucket.max === 0) {
        const allTrucks = await prisma.truck.findMany({
          where: { organizationId: user.organizationId },
          select: { id: true },
        })
        const withDeliveries = new Set(Object.keys(countByTruck))
        truckIds = allTrucks.filter((t) => !withDeliveries.has(t.id)).map((t) => t.id)
      } else {
        truckIds = Object.entries(countByTruck)
          .filter(([, c]) => c >= bucket.min && c <= bucket.max)
          .map(([id]) => id)
      }
      if (truckIds.length === 0) {
        return NextResponse.json(createPaginatedResult([], 0, { page, limit }))
      }
      where.id = where.id ? { in: truckIds, ...where.id } : { in: truckIds }
    }

    if (mileageBucket && MILEAGE_BUCKETS[mileageBucket]) {
      const fuelLogs = await prisma.fuelLog.findMany({
        where: { truck: { organizationId: user.organizationId } },
        select: { truckId: true, odometer: true, fueledAt: true },
        orderBy: { fueledAt: 'asc' },
      })
      const logsByTruck = fuelLogs.reduce<Record<string, { odometer: number }[]>>((acc, log) => {
        if (!acc[log.truckId]) acc[log.truckId] = []
        acc[log.truckId].push({ odometer: log.odometer })
        return acc
      }, {})
      const bucket = MILEAGE_BUCKETS[mileageBucket]
      const allTrucks = await prisma.truck.findMany({
        where: { organizationId: user.organizationId },
        select: { id: true },
      })
      const truckIds = allTrucks.filter((t) => {
        const logs = logsByTruck[t.id] || []
        let miles = 0
        for (let i = 1; i < logs.length; i++) {
          const delta = logs[i].odometer - logs[i - 1].odometer
          if (delta > 0) miles += delta
        }
        return miles >= bucket.min && miles <= bucket.max
      }).map((t) => t.id)
      if (truckIds.length === 0) {
        return NextResponse.json(createPaginatedResult([], 0, { page, limit }))
      }
      where.id = where.id ? { in: truckIds.filter((id) => (where.id as { in: string[] }).in.includes(id)) } : { in: truckIds }
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

    // Fetch fuel logs for mileage (sum of odometer deltas between consecutive fills)
    const truckIds = trucks.map((t) => t.id)
    const fuelLogs = truckIds.length > 0
      ? await prisma.fuelLog.findMany({
          where: { truckId: { in: truckIds } },
          select: { truckId: true, odometer: true, fueledAt: true },
          orderBy: { fueledAt: 'asc' },
        })
      : []

    const logsByTruck = fuelLogs.reduce<Record<string, { odometer: number; fueledAt: Date }[]>>((acc, log) => {
      if (!acc[log.truckId]) acc[log.truckId] = []
      acc[log.truckId].push({ odometer: log.odometer, fueledAt: log.fueledAt })
      return acc
    }, {})

    const mileageByTruck: Record<string, number> = {}
    for (const tid of truckIds) {
      const logs = (logsByTruck[tid] || []).sort((a, b) => a.fueledAt.getTime() - b.fueledAt.getTime())
      let miles = 0
      for (let i = 1; i < logs.length; i++) {
        const delta = logs[i].odometer - logs[i - 1].odometer
        if (delta > 0) miles += delta
      }
      mileageByTruck[tid] = miles
    }

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
        mileage: mileageByTruck[truck.id] ?? 0,
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
