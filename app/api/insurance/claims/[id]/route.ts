import { NextResponse } from 'next/server'
import { withAuth, withRole, AuthenticatedRequest } from '@/middleware/auth'
import { prisma } from '@/lib/db'
import { handlePrismaError } from '@/lib/db'
import { UserRole } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string }>
}

export const GET = withAuth(async (request: AuthenticatedRequest, { params }: RouteParams) => {
  try {
    const { user } = request
    const { id } = await params

    const claim = await prisma.insuranceClaim.findUnique({
      where: { id },
      include: {
        policy: {
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

    if (!claim) {
      return NextResponse.json(
        { error: 'Claim not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    if (claim.policy.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    return NextResponse.json(claim)
  } catch (error) {
    console.error('GET /api/insurance/claims/[id] error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})

export const PATCH = withRole(UserRole.OWNER, UserRole.MANAGER)(
  async (request: AuthenticatedRequest, { params }: RouteParams) => {
    try {
      const { user } = request
      const { id } = await params
      const body = await request.json()

      const claim = await prisma.insuranceClaim.findUnique({
        where: { id },
        include: {
          policy: { select: { organizationId: true } },
        },
      })

      if (!claim) {
        return NextResponse.json(
          { error: 'Claim not found', code: 'NOT_FOUND' },
          { status: 404 }
        )
      }

      if (claim.policy.organizationId !== user.organizationId) {
        return NextResponse.json(
          { error: 'Access denied', code: 'FORBIDDEN' },
          { status: 403 }
        )
      }

      const { status, claimNumber, resolvedAt, notes, amount, documentS3Key } = body
      const updateData: any = {}

      if (status !== undefined) updateData.status = status
      if (claimNumber !== undefined) updateData.claimNumber = claimNumber
      if (resolvedAt !== undefined) updateData.resolvedAt = resolvedAt ? new Date(resolvedAt) : null
      if (notes !== undefined) updateData.notes = notes
      if (amount !== undefined) updateData.amount = parseFloat(amount)
      if (documentS3Key !== undefined) updateData.documentS3Key = documentS3Key

      const updated = await prisma.insuranceClaim.update({
        where: { id },
        data: updateData,
        include: {
          policy: {
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

      return NextResponse.json(updated)
    } catch (error) {
      console.error('PATCH /api/insurance/claims/[id] error:', error)
      const { code, message } = handlePrismaError(error)
      return NextResponse.json({ error: message, code }, { status: 500 })
    }
  }
)
