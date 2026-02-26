/**
 * Dashboard Stats API
 *
 * GET /api/dashboard/stats - Aggregated counts for dashboard (trucks, drivers, trips, alerts, fuel)
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'
import { prisma, handlePrismaError } from '@/lib/db'

export const GET = withAuth(async (request) => {
  try {
    const { user } = request
    const orgId = user.organizationId

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    const [
      trucksByStatus,
      driversByStatus,
      tripsByStatus,
      tripsCompletedToday,
      unackAlertsCount,
      alertsBySeverity,
      fuelThisMonth,
    ] = await Promise.all([
      prisma.truck.groupBy({
        by: ['status'],
        where: { organizationId: orgId },
        _count: true,
      }),
      prisma.driver.groupBy({
        by: ['status'],
        where: { organizationId: orgId },
        _count: true,
      }),
      prisma.trip.groupBy({
        by: ['status'],
        where: { truck: { organizationId: orgId } },
        _count: true,
      }),
      prisma.trip.count({
        where: {
          truck: { organizationId: orgId },
          status: 'COMPLETED',
          actualEnd: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.alert.count({
        where: { organizationId: orgId, acknowledged: false },
      }),
      prisma.alert.groupBy({
        by: ['severity'],
        where: { organizationId: orgId, acknowledged: false },
        _count: true,
      }),
      prisma.fuelLog.aggregate({
        where: {
          truck: { organizationId: orgId },
          fueledAt: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { gallons: true, totalCost: true },
      }),
    ])

    const toMap = (arr: { status?: string; severity?: string; _count: number }[], key: string) =>
      Object.fromEntries(arr.map((r) => [r[key as keyof typeof r] || 'UNKNOWN', r._count]))

    const truckMap = toMap(trucksByStatus as any, 'status')
    const driverMap = toMap(driversByStatus as any, 'status')
    const tripMap = toMap(tripsByStatus as any, 'status')
    const alertMap = toMap(alertsBySeverity as any, 'severity')

    return NextResponse.json({
      trucks: {
        total: Object.values(truckMap).reduce((a, b) => a + b, 0),
        active: truckMap['ACTIVE'] || 0,
        idle: truckMap['IDLE'] || 0,
        maintenance: truckMap['MAINTENANCE'] || 0,
        blocked: truckMap['BLOCKED'] || 0,
      },
      drivers: {
        total: Object.values(driverMap).reduce((a, b) => a + b, 0),
        available: driverMap['AVAILABLE'] || 0,
        onTrip: driverMap['ON_TRIP'] || 0,
        offDuty: driverMap['OFF_DUTY'] || 0,
      },
      trips: {
        total: Object.values(tripMap).reduce((a, b) => a + b, 0),
        scheduled: tripMap['SCHEDULED'] || 0,
        inProgress: tripMap['IN_PROGRESS'] || 0,
        completedToday: tripsCompletedToday,
      },
      alerts: {
        unacknowledged: unackAlertsCount,
        critical: alertMap['CRITICAL'] || 0,
        warning: alertMap['WARNING'] || 0,
      },
      fuel: {
        totalCostThisMonth: fuelThisMonth._sum.totalCost ?? 0,
        totalGallonsThisMonth: fuelThisMonth._sum.gallons ?? 0,
      },
    })
  } catch (error) {
    console.error('GET /api/dashboard/stats error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})
