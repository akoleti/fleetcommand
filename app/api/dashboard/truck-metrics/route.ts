/**
 * Dashboard Truck Metrics API
 *
 * GET /api/dashboard/truck-metrics - Deliveries and mileage per truck for pie charts
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'
import { prisma, handlePrismaError } from '@/lib/db'

export const GET = withAuth(async (request) => {
  try {
    const { user } = request
    const orgId = user.organizationId

    const [trucks, completedTrips, fuelLogs] = await Promise.all([
      prisma.truck.findMany({
        where: { organizationId: orgId },
        select: { id: true, licensePlate: true, make: true, model: true },
      }),
      prisma.trip.findMany({
        where: {
          truck: { organizationId: orgId },
          status: 'COMPLETED',
          actualEnd: { not: null },
        },
        select: { truckId: true },
      }),
      prisma.fuelLog.findMany({
        where: { truck: { organizationId: orgId } },
        select: { truckId: true, odometer: true, fueledAt: true },
        orderBy: { fueledAt: 'asc' },
      }),
    ])

    // Count deliveries per truck
    const deliveryCountByTruck: Record<string, number> = {}
    for (const t of trucks) {
      deliveryCountByTruck[t.id] = 0
    }
    for (const trip of completedTrips) {
      deliveryCountByTruck[trip.truckId] = (deliveryCountByTruck[trip.truckId] ?? 0) + 1
    }

    // Mileage per truck: sum of miles driven between consecutive fuel logs (odometer delta per fill)
    // Miles = sum of (odometer[i] - odometer[i-1]) for each fuel-up, sorted by date
    const mileageByTruck: Record<string, number> = {}
    const logsByTruck = fuelLogs.reduce<Record<string, { odometer: number; fueledAt: Date }[]>>((acc, log) => {
      if (!acc[log.truckId]) acc[log.truckId] = []
      acc[log.truckId].push({ odometer: log.odometer, fueledAt: log.fueledAt })
      return acc
    }, {})
    for (const t of trucks) {
      const logs = (logsByTruck[t.id] || []).sort((a, b) => a.fueledAt.getTime() - b.fueledAt.getTime())
      let miles = 0
      for (let i = 1; i < logs.length; i++) {
        const delta = logs[i].odometer - logs[i - 1].odometer
        if (delta > 0) miles += delta
      }
      mileageByTruck[t.id] = miles
    }

    const data = trucks.map((t) => ({
      id: t.id,
      licensePlate: t.licensePlate,
      make: t.make,
      model: t.model,
      deliveryCount: deliveryCountByTruck[t.id] ?? 0,
      mileage: mileageByTruck[t.id] ?? 0,
    }))

    return NextResponse.json({ data })
  } catch (error) {
    console.error('GET /api/dashboard/truck-metrics error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})
