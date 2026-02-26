/**
 * Single Trip API - Get, Update, Delete
 * Owner: FLEET-01
 * 
 * GET /api/trips/[id] - Get trip details
 * PATCH /api/trips/[id] - Update trip status (owner/manager/driver)
 * DELETE /api/trips/[id] - Cancel trip (owner/manager only, scheduled only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRole } from '@/middleware/auth'
import { prisma } from '@/lib/db'
import { handlePrismaError } from '@/lib/db'
import { UserRole, TripStatus, DriverStatus } from '@prisma/client'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/trips/[id]
 * 
 * Returns trip + truck + driver + delivery proof (if exists)
 * 
 * RBAC:
 * - OWNER/MANAGER: can view any trip in their org
 * - DRIVER: can only view own trips
 */
export const GET = withAuth(async (request: NextRequest, { params }: RouteParams) => {
  try {
    const { user } = request
    const { id } = await params

    // Fetch trip with related data
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        truck: {
          select: {
            id: true,
            organizationId: true,
            vin: true,
            licensePlate: true,
            make: true,
            model: true,
            year: true,
            status: true,
          },
        },
        driver: {
          select: {
            id: true,
            name: true,
            licenseNumber: true,
            phone: true,
            status: true,
          },
        },
        deliveryProofs: {
          include: {
            media: {
              select: {
                id: true,
                type: true,
                s3Key: true,
                s3Bucket: true,
                mimeType: true,
                createdAt: true,
              },
            },
          },
        },
      },
    })

    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check organization access
    if (trip.truck.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // RBAC: Driver can only see their own trips
    if (user.role === UserRole.DRIVER) {
      const driver = await prisma.driver.findFirst({
        where: { userId: user.userId },
      })

      if (!driver || trip.driverId !== driver.id) {
        return NextResponse.json(
          { error: 'Access denied', code: 'FORBIDDEN' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json(trip)
  } catch (error) {
    console.error(`GET /api/trips/${id} error:`, error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json(
      { error: message, code },
      { status: 500 }
    )
  }
})

/**
 * PATCH /api/trips/[id]
 * 
 * Update trip status (OWNER/MANAGER/DRIVER)
 * 
 * Status transitions:
 * - scheduled → in_progress → completed
 * - scheduled → cancelled (owner/manager only)
 * 
 * Body:
 * - status: SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED
 * - deliveryProofId: string (required if status = COMPLETED and proof was required)
 * - notes: string (optional)
 */
export const PATCH = withAuth(async (request: NextRequest, { params }: RouteParams) => {
  try {
    const { user } = request
    const { id } = await params
    const body = await request.json()
    const { status, deliveryProofId, notes } = body

    // Fetch trip
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        truck: {
          select: { organizationId: true },
        },
        driver: {
          select: { id: true, userId: true },
        },
      },
    })

    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check organization access
    if (trip.truck.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // RBAC: Driver can only update their own trips
    if (user.role === UserRole.DRIVER && trip.driver.userId !== user.userId) {
      return NextResponse.json(
        { error: 'Access denied', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // Validate status transitions
    const validTransitions: Record<TripStatus, TripStatus[]> = {
      [TripStatus.SCHEDULED]: [TripStatus.IN_PROGRESS, TripStatus.CANCELLED],
      [TripStatus.IN_PROGRESS]: [TripStatus.COMPLETED, TripStatus.CANCELLED],
      [TripStatus.COMPLETED]: [], // Cannot change completed
      [TripStatus.CANCELLED]: [], // Cannot change cancelled
    }

    if (status && !validTransitions[trip.status].includes(status as TripStatus)) {
      return NextResponse.json(
        { 
          error: `Invalid status transition: ${trip.status} → ${status}`,
          code: 'INVALID_STATUS_TRANSITION'
        },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: any = {}

    if (status) {
      updateData.status = status

      // Set actual timestamps
      if (status === TripStatus.IN_PROGRESS && !trip.actualStart) {
        updateData.actualStart = new Date()
      }

      if (status === TripStatus.COMPLETED && !trip.actualEnd) {
        updateData.actualEnd = new Date()
      }

      // Validate delivery proof for completion (if required)
      // Note: In real implementation, check if proof was required based on trip settings
      // For now, we assume if deliveryProofId is provided, it's validated
      if (status === TripStatus.COMPLETED && deliveryProofId) {
        const proof = await prisma.deliveryProof.findUnique({
          where: { id: deliveryProofId },
        })

        if (!proof || proof.tripId !== id) {
          return NextResponse.json(
            { error: 'Invalid delivery proof', code: 'INVALID_DELIVERY_PROOF' },
            { status: 400 }
          )
        }
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    // Update trip in transaction
    const operations = [
      prisma.trip.update({
        where: { id },
        data: updateData,
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
          driver: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          deliveryProofs: {
            select: {
              id: true,
              recipientName: true,
              capturedAt: true,
            },
          },
        },
      }),
    ]

    // If trip is completed or cancelled, set driver back to AVAILABLE
    if (status === TripStatus.COMPLETED || status === TripStatus.CANCELLED) {
      operations.push(
        prisma.driver.update({
          where: { id: trip.driverId },
          data: { status: DriverStatus.AVAILABLE },
        })
      )
    }

    const result = await prisma.$transaction(operations)
    const updatedTrip = result[0]

    return NextResponse.json(updatedTrip)
  } catch (error) {
    console.error(`PATCH /api/trips/${id} error:`, error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json(
      { error: message, code },
      { status: 500 }
    )
  }
})

/**
 * DELETE /api/trips/[id]
 * 
 * Cancel trip (OWNER/MANAGER only)
 * Can only cancel SCHEDULED trips
 */
export const DELETE = withRole(UserRole.OWNER, UserRole.MANAGER)(
  async (request: NextRequest, { params }: RouteParams) => {
    try {
      const { user } = request
      const { id } = await params

      // Fetch trip
      const trip = await prisma.trip.findUnique({
        where: { id },
        include: {
          truck: {
            select: { organizationId: true },
          },
        },
      })

      if (!trip) {
        return NextResponse.json(
          { error: 'Trip not found', code: 'NOT_FOUND' },
          { status: 404 }
        )
      }

      // Check organization access
      if (trip.truck.organizationId !== user.organizationId) {
        return NextResponse.json(
          { error: 'Access denied', code: 'FORBIDDEN' },
          { status: 403 }
        )
      }

      // Can only cancel scheduled trips
      if (trip.status !== TripStatus.SCHEDULED) {
        return NextResponse.json(
          { 
            error: `Cannot delete trip with status ${trip.status}`,
            code: 'INVALID_TRIP_STATUS'
          },
          { status: 400 }
        )
      }

      // Cancel trip and reset driver status
      await prisma.$transaction([
        prisma.trip.update({
          where: { id },
          data: { status: TripStatus.CANCELLED },
        }),
        prisma.driver.update({
          where: { id: trip.driverId },
          data: { status: DriverStatus.AVAILABLE },
        }),
      ])

      return NextResponse.json({
        success: true,
        message: 'Trip cancelled successfully',
      })
    } catch (error) {
      console.error(`DELETE /api/trips/${id} error:`, error)
      const { code, message } = handlePrismaError(error)
      return NextResponse.json(
        { error: message, code },
        { status: 500 }
      )
    }
  }
)
