/**
 * Driver Availability API
 * Owner: FLEET-01
 * 
 * PATCH /api/drivers/[id]/availability - Update driver availability status
 */

import { NextResponse } from 'next/server'
import { withRole, AuthenticatedRequest } from '@/middleware/auth'
import { prisma } from '@/lib/db'
import { handlePrismaError } from '@/lib/db'
import { UserRole, DriverStatus } from '@prisma/client'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * PATCH /api/drivers/[id]/availability
 * 
 * Update driver availability status (OWNER/MANAGER only)
 * 
 * Body:
 * - status: AVAILABLE | OFF_DUTY | SUSPENDED
 * 
 * Note: ON_TRIP status is automatically set by trip assignment/completion
 */
export const PATCH = withRole(UserRole.OWNER, UserRole.MANAGER)(
  async (request: AuthenticatedRequest, { params }: RouteParams) => {
    try {
      const { user } = request
      const { id } = await params
      const body = await request.json()
      const { status } = body

      // Validate status
      const allowedStatuses = [
        DriverStatus.AVAILABLE,
        DriverStatus.OFF_DUTY,
        DriverStatus.SUSPENDED,
      ]

      if (!status || !(allowedStatuses as readonly DriverStatus[]).includes(status as DriverStatus)) {
        return NextResponse.json(
          { 
            error: `Invalid status. Allowed: ${allowedStatuses.join(', ')}`,
            code: 'VALIDATION_ERROR'
          },
          { status: 400 }
        )
      }

      // Check driver exists and belongs to user's org
      const existingDriver = await prisma.driver.findUnique({
        where: { id },
        select: { 
          organizationId: true, 
          status: true,
          assignedTrucks: {
            select: { id: true },
          },
        },
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

      // Check if driver is currently on a trip
      if (existingDriver.status === DriverStatus.ON_TRIP) {
        const activeTrips = await prisma.trip.findFirst({
          where: {
            driverId: id,
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          },
        })

        if (activeTrips) {
          return NextResponse.json(
            { 
              error: 'Cannot change status: driver has active trips',
              code: 'DRIVER_HAS_ACTIVE_TRIPS'
            },
            { status: 400 }
          )
        }
      }

      // Update driver status
      const updatedDriver = await prisma.driver.update({
        where: { id },
        data: { status: status as DriverStatus },
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

      return NextResponse.json({
        success: true,
        message: 'Driver availability updated',
        driver: updatedDriver,
      })
    } catch (error) {
      console.error('PATCH /api/drivers/[id]/availability error:', error)
      const { code, message } = handlePrismaError(error)
      return NextResponse.json(
        { error: message, code },
        { status: 500 }
      )
    }
  }
)
