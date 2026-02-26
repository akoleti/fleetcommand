/**
 * Trips API - List and Create
 * Owner: FLEET-01
 * 
 * GET /api/trips - List all trips (filtered)
 * POST /api/trips - Create/schedule new trip (owner/manager only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRole } from '@/middleware/auth'
import { prisma } from '@/lib/db'
import { getPaginationParams, createPaginatedResult, handlePrismaError } from '@/lib/db'
import { UserRole, TripStatus, TruckStatus, DriverStatus } from '@prisma/client'

/**
 * GET /api/trips
 * 
 * Query params:
 * - status: scheduled|in_progress|completed|cancelled|all (default: all)
 * - truckId: filter by truck
 * - driverId: filter by driver
 * - date: ISO date string (filters by scheduled date)
 * - page: page number (default: 1)
 * - limit: items per page (default: 20, max: 100)
 * 
 * RBAC:
 * - OWNER/MANAGER: see all trips
 * - DRIVER: see only their own trips
 */
export const GET = withAuth(async (request) => {
  try {
    const { user } = request
    const { searchParams } = new URL(request.url)
    
    const statusParam = searchParams.get('status') || 'all'
    const truckId = searchParams.get('truckId')
    const driverId = searchParams.get('driverId')
    const date = searchParams.get('date')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Build where clause
    const where: any = {}

    // Organization filter through truck relation
    where.truck = {
      organizationId: user.organizationId,
    }

    // RBAC: Drivers can only see their own trips
    if (user.role === UserRole.DRIVER) {
      const driver = await prisma.driver.findFirst({
        where: { userId: user.userId },
      })

      if (!driver) {
        return NextResponse.json(
          { error: 'Driver profile not found', code: 'DRIVER_NOT_FOUND' },
          { status: 404 }
        )
      }

      where.driverId = driver.id
    }

    // Status filter
    if (statusParam !== 'all') {
      const statusMap: Record<string, TripStatus> = {
        'scheduled': TripStatus.SCHEDULED,
        'in_progress': TripStatus.IN_PROGRESS,
        'completed': TripStatus.COMPLETED,
        'cancelled': TripStatus.CANCELLED,
      }
      
      const mappedStatus = statusMap[statusParam]
      if (mappedStatus) {
        where.status = mappedStatus
      }
    }

    // Truck filter
    if (truckId) {
      where.truckId = truckId
    }

    // Driver filter
    if (driverId) {
      where.driverId = driverId
    }

    // Date filter
    if (date) {
      const filterDate = new Date(date)
      if (!isNaN(filterDate.getTime())) {
        const startOfDay = new Date(filterDate.setHours(0, 0, 0, 0))
        const endOfDay = new Date(filterDate.setHours(23, 59, 59, 999))
        
        where.scheduledStart = {
          gte: startOfDay,
          lte: endOfDay,
        }
      }
    }

    // Pagination
    const { skip, take } = getPaginationParams({ page, limit })

    // Fetch trips with related data
    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        where,
        skip,
        take,
        include: {
          truck: {
            select: {
              id: true,
              vin: true,
              licensePlate: true,
              make: true,
              model: true,
            },
          },
          driver: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          deliveryProofs: {
            select: {
              id: true,
              recipientName: true,
              capturedAt: true,
              media: {
                select: {
                  type: true,
                },
              },
            },
          },
        },
        orderBy: [
          { scheduledStart: 'desc' },
        ],
      }),
      prisma.trip.count({ where }),
    ])

    return NextResponse.json(
      createPaginatedResult(trips, total, { page, limit })
    )
  } catch (error) {
    console.error('GET /api/trips error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json(
      { error: message, code },
      { status: 500 }
    )
  }
})

/**
 * POST /api/trips
 * 
 * Create/schedule new trip (OWNER/MANAGER only)
 * 
 * Body:
 * - truckId: string
 * - driverId: string
 * - originAddress: string
 * - originLat: number
 * - originLng: number
 * - destinationAddress: string
 * - destinationLat: number
 * - destinationLng: number
 * - scheduledStart: ISO date string
 * - scheduledEnd: ISO date string (optional)
 * - notes: string (optional)
 * 
 * Validations:
 * - Truck must be ACTIVE and NOT BLOCKED
 * - Driver must be AVAILABLE
 * - Both must belong to user's organization
 */
export const POST = withRole(UserRole.OWNER, UserRole.MANAGER)(async (request) => {
  try {
    const { user } = request
    const body = await request.json()

    // Validate required fields
    const {
      truckId,
      driverId,
      originAddress,
      originLat,
      originLng,
      destinationAddress,
      destinationLat,
      destinationLng,
      scheduledStart,
      scheduledEnd,
      notes,
    } = body

    if (!truckId || !driverId || !originAddress || !destinationAddress || !scheduledStart) {
      return NextResponse.json(
        { 
          error: 'Missing required fields: truckId, driverId, originAddress, destinationAddress, scheduledStart',
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      )
    }

    if (
      typeof originLat !== 'number' ||
      typeof originLng !== 'number' ||
      typeof destinationLat !== 'number' ||
      typeof destinationLng !== 'number'
    ) {
      return NextResponse.json(
        { error: 'Coordinates must be numbers', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Validate dates
    const startDate = new Date(scheduledStart)
    if (isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid scheduledStart date', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    let endDate = null
    if (scheduledEnd) {
      endDate = new Date(scheduledEnd)
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid scheduledEnd date', code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }

      if (endDate <= startDate) {
        return NextResponse.json(
          { error: 'scheduledEnd must be after scheduledStart', code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }
    }

    // Fetch truck and driver
    const [truck, driver] = await Promise.all([
      prisma.truck.findUnique({
        where: { id: truckId },
        select: { organizationId: true, status: true },
      }),
      prisma.driver.findUnique({
        where: { id: driverId },
        select: { organizationId: true, status: true },
      }),
    ])

    // Validate truck exists
    if (!truck) {
      return NextResponse.json(
        { error: 'Truck not found', code: 'TRUCK_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Validate driver exists
    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found', code: 'DRIVER_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check organization access
    if (truck.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Truck not in your organization', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    if (driver.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Driver not in your organization', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // Validate truck is ACTIVE and NOT BLOCKED
    if (truck.status === TruckStatus.BLOCKED) {
      return NextResponse.json(
        { 
          error: 'Cannot schedule trip: truck is blocked (insurance expired?)',
          code: 'TRUCK_BLOCKED'
        },
        { status: 400 }
      )
    }

    if (truck.status !== TruckStatus.ACTIVE) {
      return NextResponse.json(
        { 
          error: `Cannot schedule trip: truck status is ${truck.status}`,
          code: 'INVALID_TRUCK_STATUS'
        },
        { status: 400 }
      )
    }

    // Validate driver is AVAILABLE
    if (driver.status !== DriverStatus.AVAILABLE) {
      return NextResponse.json(
        { 
          error: `Cannot schedule trip: driver status is ${driver.status}`,
          code: 'DRIVER_NOT_AVAILABLE'
        },
        { status: 400 }
      )
    }

    // Create trip and update driver status in transaction
    const result = await prisma.$transaction([
      // Create trip
      prisma.trip.create({
        data: {
          truckId,
          driverId,
          originAddress,
          originLat,
          originLng,
          destinationAddress,
          destinationLat,
          destinationLng,
          scheduledStart: startDate,
          scheduledEnd: endDate,
          notes,
          status: TripStatus.SCHEDULED,
        },
        include: {
          truck: {
            select: {
              id: true,
              vin: true,
              licensePlate: true,
              make: true,
              model: true,
            },
          },
          driver: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      }),
      // Update driver status to ON_TRIP
      prisma.driver.update({
        where: { id: driverId },
        data: { status: DriverStatus.ON_TRIP },
      }),
    ])

    const trip = result[0]

    return NextResponse.json(trip, { status: 201 })
  } catch (error) {
    console.error('POST /api/trips error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json(
      { error: message, code },
      { status: 500 }
    )
  }
})
