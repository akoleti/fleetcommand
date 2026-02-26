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

    // Mileage per truck: max(odometer) - min(odometer) from fuel logs
    const mileageByTruck: Record<string, number> = {}
    const logsByTruck = fuelLogs.reduce<Record<string, { min: number; max: number }>>((acc, log) => {
      if (!acc[log.truckId]) acc[log.truckId] = { min: log.odometer, max: log.odometer }
      else {
        acc[log.truckId].min = Math.min(acc[log.truckId].min, log.odometer)
        acc[log.truckId].max = Math.max(acc[log.truckId].max, log.odometer)
      }
      return acc
    }, {})
    for (const t of trucks) {
      const range = logsByTruck[t.id]
      mileageByTruck[t.id] = range && range.max >= range.min ? range.max - range.min : 0
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
