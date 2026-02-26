import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRole } from '@/middleware/auth'
import { prisma } from '@/lib/db'
import { getPaginationParams, createPaginatedResult, handlePrismaError } from '@/lib/db'
import { UserRole, MaintenanceType, MaintenanceStatus } from '@prisma/client'

export const GET = withAuth(async (request) => {
  try {
    const { user } = request
    const { searchParams } = new URL(request.url)

    const truckId = searchParams.get('truckId')
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {
      truck: { organizationId: user.organizationId },
    }

    if (truckId) where.truckId = truckId
    if (type && Object.values(MaintenanceType).includes(type as MaintenanceType)) {
      where.type = type
    }
    if (status && Object.values(MaintenanceStatus).includes(status as MaintenanceStatus)) {
      where.status = status
    }

    const { skip, take } = getPaginationParams({ page, limit })

    const [records, total] = await Promise.all([
      prisma.maintenance.findMany({
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
        },
        orderBy: { scheduledDate: 'desc' },
      }),
      prisma.maintenance.count({ where }),
    ])

    return NextResponse.json(createPaginatedResult(records, total, { page, limit }))
  } catch (error) {
    console.error('GET /api/maintenance error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})

export const POST = withRole(UserRole.OWNER, UserRole.MANAGER)(async (request) => {
  try {
    const { user } = request
    const body = await request.json()

    const { truckId, type, description, cost, vendor, scheduledDate, nextDueDate, nextDueMileage, odometer, notes } = body

    if (!truckId || !type || !scheduledDate) {
      return NextResponse.json(
        { error: 'Missing required fields: truckId, type, scheduledDate', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    if (!Object.values(MaintenanceType).includes(type)) {
      return NextResponse.json(
        { error: 'Invalid maintenance type', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const scheduled = new Date(scheduledDate)
    if (isNaN(scheduled.getTime())) {
      return NextResponse.json(
        { error: 'Invalid scheduledDate', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const truck = await prisma.truck.findUnique({
      where: { id: truckId },
      select: { organizationId: true },
    })

    if (!truck) {
      return NextResponse.json(
        { error: 'Truck not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    if (truck.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Truck not in your organization', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    const record = await prisma.maintenance.create({
      data: {
        truckId,
        type,
        status: MaintenanceStatus.SCHEDULED,
        description,
        cost: cost != null ? parseFloat(cost) : undefined,
        vendor,
        scheduledDate: scheduled,
        nextDueDate: nextDueDate ? new Date(nextDueDate) : undefined,
        nextDueMileage: nextDueMileage != null ? parseInt(nextDueMileage) : undefined,
        odometer: odometer != null ? parseInt(odometer) : undefined,
        notes,
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
      },
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('POST /api/maintenance error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})
