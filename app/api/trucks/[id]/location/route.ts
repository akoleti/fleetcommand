/**
 * Truck Location API - Manual location update
 *
 * PATCH /api/trucks/[id]/location - Update truck's current location (OWNER/MANAGER/DRIVER for assigned)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'
import { prisma, handlePrismaError } from '@/lib/db'
import { UserRole } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string }>
}

export const PATCH = withAuth(async (request: NextRequest, { params }: RouteParams) => {
  try {
    const { user } = request
    const { id: truckId } = await params
    const body = await request.json()

    const { latitude, longitude } = body

    if (latitude == null || longitude == null) {
      return NextResponse.json(
        { error: 'latitude and longitude are required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const lat = parseFloat(String(latitude))
    const lng = parseFloat(String(longitude))

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'latitude and longitude must be valid numbers', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates: lat must be -90 to 90, lng must be -180 to 180', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const truck = await prisma.truck.findUnique({
      where: { id: truckId },
      select: { organizationId: true, currentDriverId: true },
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

    // Drivers can only update location for their assigned truck
    if (user.role === UserRole.DRIVER) {
      const driver = await prisma.driver.findFirst({
        where: { userId: user.userId },
      })
      if (!driver || truck.currentDriverId !== driver.id) {
        return NextResponse.json(
          { error: 'Drivers can only update location for their assigned truck', code: 'FORBIDDEN' },
          { status: 403 }
        )
      }
    }

    const status = await prisma.truckStatusRecord.upsert({
      where: { truckId },
      create: {
        truckId,
        latitude: lat,
        longitude: lng,
        speed: 0,
        heading: 0,
        fuelLevel: null,
        ignitionOn: false,
        lastPingAt: new Date(),
      },
      update: {
        latitude: lat,
        longitude: lng,
        lastPingAt: new Date(),
      },
    })

    return NextResponse.json({
      latitude: status.latitude,
      longitude: status.longitude,
      lastPingAt: status.lastPingAt,
    })
  } catch (error) {
    console.error('PATCH /api/trucks/[id]/location error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})
