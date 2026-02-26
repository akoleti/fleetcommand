/**
 * Single Driver API - Get and Update
 * Owner: FLEET-01
 * 
 * GET /api/drivers/[id] - Get driver profile with stats
 * PATCH /api/drivers/[id] - Update driver (owner/manager)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRole } from '@/middleware/auth'
import { prisma } from '@/lib/db'
import { handlePrismaError } from '@/lib/db'
import { UserRole } from '@prisma/client'

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * GET /api/drivers/[id]
 * 
 * Returns:
 * - Driver profile
 * - License info
 * - Trip history (last 20)
 * - Performance stats
 * 
 * RBAC:
 * - Own profile visible to driver
 * - MANAGER/OWNER see all
 */
export const GET = withAuth(async (request: NextRequest, { params }: RouteParams) => {
  try {
    const { user } = request
    const { id } = params

    // Fetch driver
    const driver = await prisma.driver.findUnique({
      where: { id },
      include: {
        assignedTrucks: {
          select: {
            id: true,
            vin: true,
            licensePlate: true,
            make: true,
            model: true,
            year: true,
            status: true,
          },
        },
        trips: {
          orderBy: { scheduledStart: 'desc' },
          take: 20,
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
        },
      },
    })

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check organization access
    if (driver.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // RBAC: Driver can only see their own profile
    if (user.role === UserRole.DRIVER && driver.userId !== user.userId) {
      return NextResponse.json(
        { error: 'Access denied', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // Calculate performance stats
    const completedTrips = await prisma.trip.findMany({
      where: {
        driverId: id,
        status: 'COMPLETED',
      },
      select: {
        actualStart: true,
        actualEnd: true,
        scheduledStart: true,
        scheduledEnd: true,
      },
    })

    const stats = {
      totalTrips: completedTrips.length,
      onTimeTrips: completedTrips.filter((trip) => {
        if (!trip.actualEnd || !trip.scheduledEnd) return false
        return trip.actualEnd <= trip.scheduledEnd
      }).length,
      avgDeliveryTime: 0,
    }

    // Calculate average delivery time in minutes
    if (completedTrips.length > 0) {
      const totalMinutes = completedTrips.reduce((sum, trip) => {
        if (!trip.actualStart || !trip.actualEnd) return sum
        const duration = trip.actualEnd.getTime() - trip.actualStart.getTime()
        return sum + duration / 60000 // Convert to minutes
      }, 0)
      stats.avgDeliveryTime = Math.round(totalMinutes / completedTrips.length)
    }

    // Check license expiry
    const daysUntilExpiry = Math.ceil(
      (driver.licenseExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    const licenseExpiryAlert = daysUntilExpiry < 30

    return NextResponse.json({
      ...driver,
      performanceStats: stats,
      licenseExpiryAlert,
      daysUntilLicenseExpiry: daysUntilExpiry,
    })
  } catch (error) {
    console.error(`GET /api/drivers/${params?.id} error:`, error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json(
      { error: message, code },
      { status: 500 }
    )
  }
})

/**
 * PATCH /api/drivers/[id]
 * 
 * Update driver profile (OWNER/MANAGER only)
 * Cannot update: id, userId, organizationId
 * 
 * Body: Partial driver data
 */
export const PATCH = withRole(UserRole.OWNER, UserRole.MANAGER)(
  async (request: NextRequest, { params }: RouteParams) => {
    try {
      const { user } = request
      const { id } = params
      const body = await request.json()

      // Check driver exists and belongs to user's org
      const existingDriver = await prisma.driver.findUnique({
        where: { id },
        select: { organizationId: true },
      })

      if (!existingDriver) {
        return NextResponse.json(
          { error: 'Driver not found', code: 'NOT_FOUND' },
          { status: 404 }
        )
      }

      if (existingDriver.organizationId !== user.organizationId) {
        return NextResponse.json(
          { error: 'Access denied', code: 'FORBIDDEN' },
          { status: 403 }
        )
      }

      // Remove fields that cannot be updated
      const {
        id: _id,
        userId: _userId,
        organizationId: _orgId,
        createdAt: _createdAt,
        ...updateData
      } = body

      // Validate licenseExpiry if provided
      if (updateData.licenseExpiry) {
        const expiryDate = new Date(updateData.licenseExpiry)
        if (isNaN(expiryDate.getTime())) {
          return NextResponse.json(
            { error: 'Invalid license expiry date', code: 'VALIDATION_ERROR' },
            { status: 400 }
          )
        }
        updateData.licenseExpiry = expiryDate
      }

      // Update driver
      const updatedDriver = await prisma.driver.update({
        where: { id },
        data: updateData,
        include: {
          assignedTrucks: {
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

      return NextResponse.json(updatedDriver)
    } catch (error) {
      console.error(`PATCH /api/drivers/${params?.id} error:`, error)
      const { code, message } = handlePrismaError(error)
      return NextResponse.json(
        { error: message, code },
        { status: 500 }
      )
    }
  }
)
