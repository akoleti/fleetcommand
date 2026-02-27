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

    const policy = await prisma.insurancePolicy.findUnique({
      where: { id },
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
        claims: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!policy) {
      return NextResponse.json(
        { error: 'Insurance policy not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    if (policy.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    return NextResponse.json(policy)
  } catch (error) {
    console.error('GET /api/insurance/[id] error:', error)
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

      const policy = await prisma.insurancePolicy.findUnique({
        where: { id },
        select: { organizationId: true },
      })

      if (!policy) {
        return NextResponse.json(
          { error: 'Insurance policy not found', code: 'NOT_FOUND' },
          { status: 404 }
        )
      }

      if (policy.organizationId !== user.organizationId) {
        return NextResponse.json(
          { error: 'Access denied', code: 'FORBIDDEN' },
          { status: 403 }
        )
      }

      const { id: _id, organizationId: _orgId, createdAt: _createdAt, truckId: _truckId, ...updateData } = body

      if (updateData.startDate) updateData.startDate = new Date(updateData.startDate)
      if (updateData.expiryDate) updateData.expiryDate = new Date(updateData.expiryDate)
      if (updateData.premium !== undefined) updateData.premium = parseFloat(updateData.premium)
      if (updateData.deductible !== undefined) updateData.deductible = parseFloat(updateData.deductible)
      if (updateData.coverageLimit !== undefined) updateData.coverageLimit = parseFloat(updateData.coverageLimit)

      const updated = await prisma.insurancePolicy.update({
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
          claims: {
            orderBy: { createdAt: 'desc' },
          },
        },
      })

      return NextResponse.json(updated)
    } catch (error) {
      console.error('PATCH /api/insurance/[id] error:', error)
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

      const policy = await prisma.insurancePolicy.findUnique({
        where: { id },
        select: { organizationId: true, isActive: true },
      })

      if (!policy) {
        return NextResponse.json(
          { error: 'Insurance policy not found', code: 'NOT_FOUND' },
          { status: 404 }
        )
      }

      if (policy.organizationId !== user.organizationId) {
        return NextResponse.json(
          { error: 'Access denied', code: 'FORBIDDEN' },
          { status: 403 }
        )
      }

      if (!policy.isActive) {
        return NextResponse.json(
          { error: 'Policy is already deactivated', code: 'ALREADY_INACTIVE' },
          { status: 400 }
        )
      }

      const deactivated = await prisma.insurancePolicy.update({
        where: { id },
        data: { isActive: false },
      })

      return NextResponse.json({ success: true, message: 'Policy deactivated', policy: deactivated })
    } catch (error) {
      console.error('DELETE /api/insurance/[id] error:', error)
      const { code, message } = handlePrismaError(error)
      return NextResponse.json({ error: message, code }, { status: 500 })
    }
  }
)
