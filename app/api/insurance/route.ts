import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRole } from '@/middleware/auth'
import { prisma } from '@/lib/db'
import { getPaginationParams, createPaginatedResult, handlePrismaError } from '@/lib/db'
import { UserRole } from '@prisma/client'

export const GET = withAuth(async (request) => {
  try {
    const { user } = request
    const { searchParams } = new URL(request.url)

    const truckId = searchParams.get('truckId')
    const isActive = searchParams.get('isActive')
    const expiringSoon = searchParams.get('expiringSoon')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {
      organizationId: user.organizationId,
    }

    if (truckId) where.truckId = truckId
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true'
    }
    if (expiringSoon === 'true') {
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
      where.isActive = true
      where.expiryDate = {
        gte: new Date(),
        lte: thirtyDaysFromNow,
      }
    }

    const { skip, take } = getPaginationParams({ page, limit })

    const [policies, total] = await Promise.all([
      prisma.insurancePolicy.findMany({
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
          createdBy: {
            select: { id: true, name: true },
          },
          claims: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
        orderBy: { expiryDate: 'asc' },
      }),
      prisma.insurancePolicy.count({ where }),
    ])

    return NextResponse.json(createPaginatedResult(policies, total, { page, limit }))
  } catch (error) {
    console.error('GET /api/insurance error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})

export const POST = withRole(UserRole.OWNER, UserRole.MANAGER)(async (request) => {
  try {
    const { user } = request
    const body = await request.json()

    const { truckId, provider, policyNumber, coverageType, premium, deductible, coverageLimit, startDate, expiryDate, notes } = body

    if (!truckId || !provider || !policyNumber || !coverageType || premium == null || deductible == null || coverageLimit == null || !startDate || !expiryDate) {
      return NextResponse.json(
        { error: 'Missing required fields: truckId, provider, policyNumber, coverageType, premium, deductible, coverageLimit, startDate, expiryDate', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    const expiry = new Date(expiryDate)
    if (isNaN(start.getTime()) || isNaN(expiry.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    if (expiry <= start) {
      return NextResponse.json(
        { error: 'expiryDate must be after startDate', code: 'VALIDATION_ERROR' },
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

    const policy = await prisma.insurancePolicy.create({
      data: {
        organizationId: user.organizationId,
        truckId,
        provider,
        policyNumber,
        coverageType,
        premium: parseFloat(premium),
        deductible: parseFloat(deductible),
        coverageLimit: parseFloat(coverageLimit),
        startDate: start,
        expiryDate: expiry,
        notes,
        isActive: true,
        createdById: user.userId,
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

    return NextResponse.json(policy, { status: 201 })
  } catch (error) {
    console.error('POST /api/insurance error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})
