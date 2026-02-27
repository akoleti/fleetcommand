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
import { optimizeRoute2Opt } from '@/lib/route-optimizer'

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
          createdBy: {
            select: { id: true, name: true },
          },
          stops: { orderBy: { sequence: 'asc' } },
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
 * Body (legacy single trip):
 * - truckId, driverId, originAddress, originLat, originLng, destinationAddress, destinationLat, destinationLng, scheduledStart, scheduledEnd?, notes?
 * 
 * Body (multi-stop):
 * - truckId, driverId, stops: [{ type: 'PICKUP'|'DROPOFF', address, lat, lng, notes? }], scheduledStart, scheduledEnd?, notes?
 * - System optimizes stop order for minimal distance
 * 
 * Validations:
 * - Truck must be ACTIVE and NOT BLOCKED
 * - Driver must be AVAILABLE
 */
export const POST = withRole(UserRole.OWNER, UserRole.MANAGER)(async (request) => {
  try {
    const { user } = request
    const body = await request.json()

    const {
      truckId,
      driverId,
      originAddress,
      originLat,
      originLng,
      destinationAddress,
      destinationLat,
      destinationLng,
      stops: stopsInput,
      scheduledStart,
      scheduledEnd,
      notes,
    } = body

    if (!truckId || !driverId || !scheduledStart) {
      return NextResponse.json(
        { error: 'Missing required fields: truckId, driverId, scheduledStart', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    let originAddr: string
    let originLatVal: number | null
    let originLngVal: number | null
    let destAddr: string
    let destLatVal: number | null
    let destLngVal: number | null
    let tripStops: Array<{ type: 'PICKUP' | 'DROPOFF'; address: string; lat: number | null; lng: number | null; notes?: string; sequence: number }> = []

    if (Array.isArray(stopsInput) && stopsInput.length >= 1) {
      // Multi-stop: validate and optimize (lat/lng optional, coerce when provided)
      const toNum = (v: unknown) => {
        const n = typeof v === 'number' && !isNaN(v) ? v : parseFloat(String(v ?? ''))
        return isNaN(n) ? null : n
      }
      const validStops = stopsInput
        .filter((s: any) => s && (s.type === 'PICKUP' || s.type === 'DROPOFF') && typeof s.address === 'string')
        .map((s: any) => ({ ...s, lat: toNum(s.lat), lng: toNum(s.lng) }))
      if (validStops.length === 0) {
        return NextResponse.json(
          { error: 'stops must be a non-empty array of { type, address }', code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }
      const withCoords = validStops.filter((s: any) => s.lat != null && s.lng != null)
      const optimized = withCoords.length === validStops.length
        ? optimizeRoute2Opt(validStops.map((s: any) => ({ type: s.type, address: s.address, lat: s.lat!, lng: s.lng!, notes: s.notes })))
        : validStops.map((s: any, i) => ({ ...s, sequence: i + 1 }))
      const first = optimized[0]
      const last = optimized[optimized.length - 1]
      originAddr = first.address
      originLatVal = first.lat ?? null
      originLngVal = first.lng ?? null
      destAddr = last.address
      destLatVal = last.lat ?? null
      destLngVal = last.lng ?? null
      tripStops = optimized.map((s: any) => ({ ...s, lat: s.lat ?? null, lng: s.lng ?? null }))
    } else if (originAddress && destinationAddress) {
      // Legacy single trip - lat/lng optional, coerce when provided
      const toNum = (v: unknown) => {
        const n = typeof v === 'number' && !isNaN(v) ? v : parseFloat(String(v ?? ''))
        return isNaN(n) ? null : n
      }
      const olat = toNum(originLat)
      const olng = toNum(originLng)
      const dlat = toNum(destinationLat)
      const dlng = toNum(destinationLng)
      originAddr = originAddress
      originLatVal = olat ?? null
      originLngVal = olng ?? null
      destAddr = destinationAddress
      destLatVal = dlat ?? null
      destLngVal = dlng ?? null
    } else {
      return NextResponse.json(
        { error: 'Provide either (originAddress, originLat, originLng, destinationAddress, destinationLat, destinationLng) or stops array', code: 'VALIDATION_ERROR' },
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
        select: { organizationId: true, status: true, currentDriverId: true },
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

    // Validate driver is AVAILABLE, or is the truck's assigned driver (can schedule back-to-back trips)
    const isTruckAssignedDriver = truck.currentDriverId === driverId
    if (driver.status !== DriverStatus.AVAILABLE && !isTruckAssignedDriver) {
      return NextResponse.json(
        { 
          error: `Cannot schedule trip: driver status is ${driver.status}`,
          code: 'DRIVER_NOT_AVAILABLE'
        },
        { status: 400 }
      )
    }

    // Create trip and update driver status in transaction
    const result = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.create({
        data: {
          truckId,
          driverId,
          originAddress: originAddr,
          originLat: originLatVal,
          originLng: originLngVal,
          destinationAddress: destAddr,
          destinationLat: destLatVal,
          destinationLng: destLngVal,
          scheduledStart: startDate,
          scheduledEnd: endDate,
          notes,
          status: TripStatus.SCHEDULED,
          createdById: user.userId,
        },
      })

      if (tripStops.length > 0) {
        await tx.tripStop.createMany({
          data: tripStops.map((s) => ({
            tripId: trip.id,
            sequence: s.sequence,
            type: s.type,
            address: s.address,
            lat: s.lat,
            lng: s.lng,
            notes: s.notes ?? null,
          })),
        })
      }

      await tx.driver.update({
        where: { id: driverId },
        data: { status: DriverStatus.ON_TRIP },
      })

      return tx.trip.findUnique({
        where: { id: trip.id },
        include: {
          truck: { select: { id: true, vin: true, licensePlate: true, make: true, model: true } },
          driver: { select: { id: true, name: true, phone: true } },
          stops: { orderBy: { sequence: 'asc' } },
        },
      })
    })

    const trip = result!

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
