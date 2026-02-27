/**
 * Fleet Fuel Stats API
 * Owner: FU-01
 *
 * GET /api/fuel/stats - Fleet-wide fuel statistics
 */

import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { withAuth } from '@/middleware/auth'
import { prisma, handlePrismaError } from '@/lib/db'
import { gallonsToLiters } from '@/lib/format'

export const GET = withAuth(async (request) => {
  try {
    const { user } = request
    const { searchParams } = new URL(request.url)

    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {
      truck: { organizationId: user.organizationId },
    }

    if (startDate || endDate) {
      where.fueledAt = {}
      if (startDate) where.fueledAt.gte = new Date(startDate)
      if (endDate) where.fueledAt.lte = new Date(endDate)
    }

    const dateFragments: Prisma.Sql[] = []
    if (startDate) dateFragments.push(Prisma.sql`AND fl."fueledAt" >= ${new Date(startDate)}`)
    if (endDate) dateFragments.push(Prisma.sql`AND fl."fueledAt" <= ${new Date(endDate)}`)
    const dateClause = dateFragments.length > 0
      ? Prisma.sql`${Prisma.join(dateFragments, ' ')}`
      : Prisma.empty

    const [aggregation, stationData, monthlyData] = await Promise.all([
      prisma.fuelLog.aggregate({
        where,
        _sum: { gallons: true, totalCost: true },
        _avg: { pricePerGallon: true },
      }),

      prisma.fuelLog.groupBy({
        by: ['station'],
        where: { ...where, station: { not: null } },
        _sum: { gallons: true, totalCost: true },
        orderBy: { _sum: { totalCost: 'desc' } },
        take: 10,
      }),

      prisma.$queryRaw<Array<{ month: string; gallons: number; cost: number }>>`
        SELECT
          to_char(fl."fueledAt", 'YYYY-MM') AS month,
          COALESCE(SUM(fl."gallons"), 0)::float AS gallons,
          COALESCE(SUM(fl."totalCost"), 0)::float AS cost
        FROM fuel_logs fl
        JOIN trucks t ON t.id = fl."truckId"
        WHERE t."organizationId" = ${user.organizationId}::uuid
          ${dateClause}
        GROUP BY month
        ORDER BY month ASC
      `,
    ])

    const totalGallons = aggregation._sum.gallons ?? 0
    const totalCost = aggregation._sum.totalCost ?? 0
    const totalLiters = gallonsToLiters(totalGallons)
    const avgPricePerLiter = totalLiters > 0 ? totalCost / totalLiters : 0

    const topStations = stationData.map((s) => ({
      station: s.station,
      totalGallons: s._sum.gallons ?? 0,
      totalCost: s._sum.totalCost ?? 0,
    }))

    return NextResponse.json({
      totalGallons,
      totalCost,
      totalLiters,
      avgPricePerLiter: Math.round(avgPricePerLiter * 1000) / 1000,
      topStations,
      monthlyTrend: monthlyData,
    })
  } catch (error) {
    console.error('GET /api/fuel/stats error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})
