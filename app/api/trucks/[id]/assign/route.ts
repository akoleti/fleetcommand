/**
 * Truck Driver Assignment API
 * Owner: FLEET-01
 * 
 * PATCH /api/trucks/[id]/assign - Assign or unassign driver
 */

import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/middleware/auth'
import { prisma } from '@/lib/db'
import { handlePrismaError } from '@/lib/db'
import { UserRole, TruckStatus, DriverStatus } from '@prisma/client'

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * PATCH /api/trucks/[id]/assign
 * 
 * Assign or unassign driver to truck (OWNER/MANAGER only)
 * 
 * Body:
 * - driverId: string | null (null to unassign)
 * 
 * Validations:
 * - Truck must be ACTIVE
 * - Driver must be AVAILABLE (when assigning)
 * - Updates driver status to ON_TRIP (when assigning) or AVAILABLE (when unassigning)
 */
export const PATCH = withRole(UserRole.OWNER, UserRole.MANAGER)(
  async (request: NextRequest, { params }: RouteParams) => {
    try {
      const { user } = request
      const { id: truckId } = params
      const body = await request.json()
      const { driverId } = body

      // Validate body
      if (driverId !== null && typeof driverId !== 'string') {
        return NextResponse.json(
          { error: 'Invalid driverId: must be string or null', code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }

      // Fetch truck
      const truck = await prisma.truck.findUnique({
        where: { id: truckId },
        include: {
          currentDriver: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      })

      if (!truck) {
        return NextResponse.json(
          { error: 'Truck not found', code: 'NOT_FOUND' },
          { status: 404 }
        )
      }

      // Check organization access
      if (truck.organizationId !== user.organizationId) {
        return NextResponse.json(
          { error: 'Access denied', code: 'FORBIDDEN' },
          { status: 403 }
        )
      }

      // Validate truck is ACTIVE
      if (truck.status !== TruckStatus.ACTIVE) {
        return NextResponse.json(
          { 
            error: `Cannot assign driver: truck status is ${truck.status}`,
            code: 'INVALID_TRUCK_STATUS'
          },
          { status: 400 }
        )
      }

      // UNASSIGN: Set driver to null
      if (driverId === null) {
        const previousDriverId = truck.currentDriverId

        await prisma.$transaction([
          // Unassign driver from truck
          prisma.truck.update({
            where: { id: truckId },
            data: { currentDriverId: null },
          }),
          // Set previous driver to AVAILABLE (if exists)
          ...(previousDriverId
            ? [prisma.driver.update({
                where: { id: previousDriverId },
                data: { status: DriverStatus.AVAILABLE },
              })]
            : []
          ),
        ])

        const updatedTruck = await prisma.truck.findUnique({
          where: { id: truckId },
          include: {
            currentDriver: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        })

        return NextResponse.json({
          success: true,
          message: 'Driver unassigned successfully',
          truck: updatedTruck,
        })
      }

      // ASSIGN: Validate and assign driver
      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
      })

      if (!driver) {
        return NextResponse.json(
          { error: 'Driver not found', code: 'DRIVER_NOT_FOUND' },
          { status: 404 }
        )
      }

      // Check driver belongs to same organization
      if (driver.organizationId !== user.organizationId) {
        return NextResponse.json(
          { error: 'Driver not in your organization', code: 'FORBIDDEN' },
          { status: 403 }
        )
      }

      // Validate driver is AVAILABLE
      if (driver.status !== DriverStatus.AVAILABLE) {
        return NextResponse.json(
          { 
            error: `Cannot assign driver: driver status is ${driver.status}`,
            code: 'DRIVER_NOT_AVAILABLE'
          },
          { status: 400 }
        )
      }

      const previousDriverId = truck.currentDriverId

      // Assign driver
      await prisma.$transaction([
        // Assign driver to truck
        prisma.truck.update({
          where: { id: truckId },
          data: { currentDriverId: driverId },
        }),
        // Set new driver to ON_TRIP
        prisma.driver.update({
          where: { id: driverId },
          data: { status: DriverStatus.ON_TRIP },
        }),
        // Set previous driver to AVAILABLE (if exists and different)
        ...(previousDriverId && previousDriverId !== driverId
          ? [prisma.driver.update({
              where: { id: previousDriverId },
              data: { status: DriverStatus.AVAILABLE },
            })]
          : []
        ),
      ])

      const updatedTruck = await prisma.truck.findUnique({
        where: { id: truckId },
        include: {
          currentDriver: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Driver assigned successfully',
        truck: updatedTruck,
      })
    } catch (error) {
      console.error(`PATCH /api/trucks/${params?.id}/assign error:`, error)
      const { code, message } = handlePrismaError(error)
      return NextResponse.json(
        { error: message, code },
        { status: 500 }
      )
    }
  }
)
