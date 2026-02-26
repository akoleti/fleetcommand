import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRole } from '@/middleware/auth'
import { prisma } from '@/lib/db'
import { getPaginationParams, createPaginatedResult, handlePrismaError } from '@/lib/db'
import { UserRole, ClaimStatus } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string }>
}

export const GET = withAuth(async (request: NextRequest, { params }: RouteParams) => {
  try {
    const { user } = request
    const { id: policyId } = await params
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const policy = await prisma.insurancePolicy.findUnique({
      where: { id: policyId },
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

    const where = { policyId }
    const { skip, take } = getPaginationParams({ page, limit })

    const [claims, total] = await Promise.all([
      prisma.insuranceClaim.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.insuranceClaim.count({ where }),
    ])

    return NextResponse.json(createPaginatedResult(claims, total, { page, limit }))
  } catch (error) {
    console.error('GET /api/insurance/[id]/claims error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})

export const POST = withRole(UserRole.OWNER, UserRole.MANAGER)(
  async (request: NextRequest, { params }: RouteParams) => {
    try {
      const { user } = request
      const { id: policyId } = await params
      const body = await request.json()

      const { incidentDate, description, amount, notes } = body

      if (!incidentDate || !description || amount == null) {
        return NextResponse.json(
          { error: 'Missing required fields: incidentDate, description, amount', code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }

      const incident = new Date(incidentDate)
      if (isNaN(incident.getTime())) {
        return NextResponse.json(
          { error: 'Invalid incidentDate', code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }

      const policy = await prisma.insurancePolicy.findUnique({
        where: { id: policyId },
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
          { error: 'Cannot file claim on inactive policy', code: 'POLICY_INACTIVE' },
          { status: 400 }
        )
      }

      const claim = await prisma.insuranceClaim.create({
        data: {
          policyId,
          incidentDate: incident,
          description,
          amount: parseFloat(amount),
          status: ClaimStatus.PENDING,
          filedAt: new Date(),
          notes,
        },
      })

      return NextResponse.json(claim, { status: 201 })
    } catch (error) {
      console.error('POST /api/insurance/[id]/claims error:', error)
      const { code, message } = handlePrismaError(error)
      return NextResponse.json({ error: message, code }, { status: 500 })
    }
  }
)
