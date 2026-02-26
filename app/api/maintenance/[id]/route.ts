import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRole } from '@/middleware/auth'
import { prisma } from '@/lib/db'
import { handlePrismaError } from '@/lib/db'
import { UserRole } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string }>
}

export const GET = withAuth(async (request: NextRequest, { params }: RouteParams) => {
  try {
    const { user } = request
    const { id } = await params

    const record = await prisma.maintenance.findUnique({
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
          },
        },
        insuranceClaim: true,
      },
    })

    if (!record) {
      return NextResponse.json(
        { error: 'Maintenance record not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    if (record.truck.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    return NextResponse.json(record)
  } catch (error) {
    console.error('GET /api/maintenance/[id] error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})

export const PATCH = withRole(UserRole.OWNER, UserRole.MANAGER)(
  async (request: NextRequest, { params }: RouteParams) => {
    try {
      const { user } = request
      const { id } = await params
      const body = await request.json()

      const record = await prisma.maintenance.findUnique({
        where: { id },
        include: { truck: { select: { organizationId: true } } },
      })

      if (!record) {
        return NextResponse.json(
          { error: 'Maintenance record not found', code: 'NOT_FOUND' },
          { status: 404 }
        )
      }

      if (record.truck.organizationId !== user.organizationId) {
        return NextResponse.json(
          { error: 'Access denied', code: 'FORBIDDEN' },
          { status: 403 }
        )
      }

      const { status, completedDate, cost, notes, insuranceClaimId, description, vendor, odometer, nextDueDate, nextDueMileage } = body
      const updateData: any = {}

      if (status !== undefined) updateData.status = status
      if (completedDate !== undefined) updateData.completedDate = completedDate ? new Date(completedDate) : null
      if (cost !== undefined) updateData.cost = cost != null ? parseFloat(cost) : null
      if (notes !== undefined) updateData.notes = notes
      if (insuranceClaimId !== undefined) updateData.insuranceClaimId = insuranceClaimId
      if (description !== undefined) updateData.description = description
      if (vendor !== undefined) updateData.vendor = vendor
      if (odometer !== undefined) updateData.odometer = odometer != null ? parseInt(odometer) : null
      if (nextDueDate !== undefined) updateData.nextDueDate = nextDueDate ? new Date(nextDueDate) : null
      if (nextDueMileage !== undefined) updateData.nextDueMileage = nextDueMileage != null ? parseInt(nextDueMileage) : null

      const updated = await prisma.maintenance.update({
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
          insuranceClaim: true,
        },
      })

      return NextResponse.json(updated)
    } catch (error) {
      console.error('PATCH /api/maintenance/[id] error:', error)
      const { code, message } = handlePrismaError(error)
      return NextResponse.json({ error: message, code }, { status: 500 })
    }
  }
)

export const DELETE = withRole(UserRole.OWNER)(
  async (request: NextRequest, { params }: RouteParams) => {
    try {
      const { user } = request
      const { id } = await params

      const record = await prisma.maintenance.findUnique({
        where: { id },
        include: { truck: { select: { organizationId: true } } },
      })

      if (!record) {
        return NextResponse.json(
          { error: 'Maintenance record not found', code: 'NOT_FOUND' },
          { status: 404 }
        )
      }

      if (record.truck.organizationId !== user.organizationId) {
        return NextResponse.json(
          { error: 'Access denied', code: 'FORBIDDEN' },
          { status: 403 }
        )
      }

      await prisma.maintenance.delete({ where: { id } })

      return NextResponse.json({ success: true, message: 'Maintenance record deleted' })
    } catch (error) {
      console.error('DELETE /api/maintenance/[id] error:', error)
      const { code, message } = handlePrismaError(error)
      return NextResponse.json({ error: message, code }, { status: 500 })
    }
  }
)
