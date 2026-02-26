/**
 * Single Truck API - Get, Update, Delete
 * Owner: FLEET-01
 * 
 * GET /api/trucks/[id] - Get truck details
 * PATCH /api/trucks/[id] - Update truck (owner only)
 * DELETE /api/trucks/[id] - Soft delete truck (owner only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRole } from '@/middleware/auth'
import { prisma } from '@/lib/db'
import { handlePrismaError } from '@/lib/db'
import { UserRole, TruckStatus } from '@prisma/client'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/trucks/[id]
 * 
 * Returns truck + current driver + latest status + active insurance
 * 
 * RBAC:
 * - OWNER/MANAGER: can view any truck in their org
 * - DRIVER: can only view assigned truck
 */
export const GET = withAuth(async (request: NextRequest, { params }: RouteParams) => {
  try {
    const { user } = request
    const { id } = await params

    // Fetch truck with related data
    const truck = await prisma.truck.findUnique({
      where: { id },
      include: {
        currentDriver: {
          select: {
            id: true,
            name: true,
            licenseNumber: true,
            licenseExpiry: true,
            phone: true,
            status: true,
          },
        },
        truckStatus: true,
        insurancePolicies: {
          where: {
            isActive: true,
            expiryDate: { gte: new Date() },
          },
          orderBy: { expiryDate: 'desc' },
          take: 1,
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

    // RBAC: Driver can only see their assigned truck
    if (user.role === UserRole.DRIVER) {
      const driver = await prisma.driver.findFirst({
        where: { userId: user.userId },
      })

      if (!driver || truck.currentDriverId !== driver.id) {
        return NextResponse.json(
          { error: 'Access denied', code: 'FORBIDDEN' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json(truck)
  } catch (error) {
    console.error(`GET /api/trucks/${id} error:`, error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json(
      { error: message, code },
      { status: 500 }
    )
  }
})

/**
 * PATCH /api/trucks/[id]
 * 
 * Update truck fields (OWNER only)
 * Cannot update: id, vin, organizationId, currentDriverId (use assign endpoint)
 * 
 * Body: Partial truck data
 */
export const PATCH = withRole(UserRole.OWNER)(async (request: NextRequest, { params }: RouteParams) => {
  try {
    const { user } = request
    const { id } = await params
    const body = await request.json()

    // Check truck exists and belongs to user's org
    const existingTruck = await prisma.truck.findUnique({
      where: { id },
      select: { organizationId: true },
    })

    if (!existingTruck) {
      return NextResponse.json(
        { error: 'Truck not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    if (existingTruck.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // Remove fields that cannot be updated
    const {
      id: _id,
      vin: _vin,
      organizationId: _orgId,
      currentDriverId: _driverId,
      createdAt: _createdAt,
      ...updateData
    } = body

    // Validate year if provided
    if (updateData.year !== undefined) {
      const currentYear = new Date().getFullYear()
      if (typeof updateData.year !== 'number' || updateData.year < 1900 || updateData.year > currentYear + 2) {
        return NextResponse.json(
          { error: 'Invalid year', code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }
    }

    // Update truck
    const updatedTruck = await prisma.truck.update({
      where: { id },
      data: updateData,
      include: {
        currentDriver: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        truckStatus: true,
      },
    })

    return NextResponse.json(updatedTruck)
  } catch (error) {
    console.error(`PATCH /api/trucks/${id} error:`, error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json(
      { error: message, code },
      { status: 500 }
    )
  }
})

/**
 * DELETE /api/trucks/[id]
 * 
 * Soft delete: set status = 'INACTIVE' (OWNER only)
 * Never hard delete trucks
 */
export const DELETE = withRole(UserRole.OWNER)(async (request: NextRequest, { params }: RouteParams) => {
  try {
    const { user } = request
    const { id } = await params

    // Check truck exists and belongs to user's org
    const existingTruck = await prisma.truck.findUnique({
      where: { id },
      select: { organizationId: true, status: true },
    })

    if (!existingTruck) {
      return NextResponse.json(
        { error: 'Truck not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    if (existingTruck.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // Soft delete: set status to INACTIVE
    const deletedTruck = await prisma.truck.update({
      where: { id },
      data: { 
        status: TruckStatus.INACTIVE,
        // Unassign driver
        currentDriverId: null,
      },
    })

    // If driver was assigned, set them back to available
    if (existingTruck.status !== TruckStatus.INACTIVE) {
      await prisma.driver.updateMany({
        where: { id: deletedTruck.currentDriverId || undefined },
        data: { status: 'AVAILABLE' },
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Truck deactivated successfully',
      truck: deletedTruck,
    })
  } catch (error) {
    console.error(`DELETE /api/trucks/${id} error:`, error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json(
      { error: message, code },
      { status: 500 }
    )
  }
})
