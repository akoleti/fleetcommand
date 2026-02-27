/**
 * Truck Fuel Logs API
 * Owner: FU-02
 *
 * GET /api/fuel/[truckId] - Get fuel logs and summary stats for a specific truck
 */

import { NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/middleware/auth'
import { prisma, handlePrismaError, getPaginationParams, createPaginatedResult } from '@/lib/db'
import { gallonsToLiters } from '@/lib/format'

interface RouteParams {
  params: Promise<{ truckId: string }>
}

export const GET = withAuth(async (request: AuthenticatedRequest, { params }: RouteParams) => {
  try {
    const { user } = request
    const { truckId } = await params
    const { searchParams } = new URL(request.url)

    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

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
        { error: 'Access denied', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    const where: any = { truckId }

    if (startDate || endDate) {
      where.fueledAt = {}
      if (startDate) where.fueledAt.gte = new Date(startDate)
      if (endDate) where.fueledAt.lte = new Date(endDate)
    }

    const { skip, take } = getPaginationParams({ page, limit })

    const [logs, total, aggregation] = await Promise.all([
      prisma.fuelLog.findMany({
        where,
        skip,
        take,
        orderBy: { fueledAt: 'desc' },
      }),
      prisma.fuelLog.count({ where }),
      prisma.fuelLog.aggregate({
        where,
        _sum: { gallons: true, totalCost: true },
        _avg: { pricePerGallon: true },
        _count: true,
      }),
    ])

    const totalGallons = aggregation._sum.gallons ?? 0
    const totalCost = aggregation._sum.totalCost ?? 0
    const totalLiters = gallonsToLiters(totalGallons)
    const avgPricePerLiter = totalLiters > 0 ? totalCost / totalLiters : 0

    const summary = {
      totalGallons,
      totalCost,
      totalLiters,
      avgPricePerLiter: Math.round(avgPricePerLiter * 1000) / 1000,
      entries: aggregation._count,
    }

    return NextResponse.json({
      ...createPaginatedResult(logs, total, { page, limit }),
      summary,
    })
  } catch (error) {
    console.error('GET /api/fuel/[truckId] error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})
