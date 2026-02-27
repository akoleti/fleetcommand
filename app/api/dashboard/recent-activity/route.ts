/**
 * Dashboard Recent Activity API
 *
 * GET /api/dashboard/recent-activity - Combined alerts + delivery/pickup events
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'
import { prisma, handlePrismaError } from '@/lib/db'

const LIMIT = 50

export const GET = withAuth(async (request) => {
  try {
    const { user } = request
    const orgId = user.organizationId

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const [alerts, trips] = await Promise.all([
      prisma.alert.findMany({
        where: { organizationId: orgId },
        take: LIMIT,
        include: {
          truck: { select: { id: true, licensePlate: true, make: true, model: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.trip.findMany({
        where: {
          truck: { organizationId: orgId },
          OR: [
            { actualStart: { gte: sevenDaysAgo } },
            { actualEnd: { gte: sevenDaysAgo } },
          ],
        },
        include: {
          truck: { select: { id: true, licensePlate: true, make: true, model: true } },
          driver: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
    ])

    // Build activity items
    type ActivityItem =
      | { kind: 'alert'; id: string; type: string; severity: string; title: string; message: string; truck?: { id: string; licensePlate: string; make: string; model: string }; timestamp: Date }
      | { kind: 'delivery'; id: string; tripId: string; truck: { id: string; licensePlate: string; make: string; model: string }; driver: { id: string; name: string }; address: string; timestamp: Date }
      | { kind: 'pickup'; id: string; tripId: string; truck: { id: string; licensePlate: string; make: string; model: string }; driver: { id: string; name: string }; address: string; timestamp: Date }

    const items: ActivityItem[] = []

    for (const alert of alerts) {
      items.push({
        kind: 'alert',
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        truck: alert.truck ?? undefined,
        timestamp: alert.createdAt,
      })
    }

    for (const trip of trips) {
      if (trip.actualEnd) {
        items.push({
          kind: 'delivery',
          id: `delivery-${trip.id}`,
          tripId: trip.id,
          truck: trip.truck,
          driver: trip.driver,
          address: trip.destinationAddress,
          timestamp: trip.actualEnd,
        })
      }
      if (trip.actualStart) {
        items.push({
          kind: 'pickup',
          id: `pickup-${trip.id}`,
          tripId: trip.id,
          truck: trip.truck,
          driver: trip.driver,
          address: trip.originAddress,
          timestamp: trip.actualStart,
        })
      }
    }

    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    const data = items.slice(0, LIMIT)

    return NextResponse.json({ data })
  } catch (error) {
    console.error('GET /api/dashboard/recent-activity error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})
