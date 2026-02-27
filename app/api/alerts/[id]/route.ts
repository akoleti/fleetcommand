import { NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/middleware/auth'
import { prisma, handlePrismaError } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/alerts/[id]
 */
export const GET = withAuth(async (request: AuthenticatedRequest, { params }: RouteParams) => {
  try {
    const { user } = request
    const { id } = await params

    const alert = await prisma.alert.findUnique({
      where: { id },
      include: {
        truck: { select: { id: true, licensePlate: true, make: true, model: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    })

    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    if (alert.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    return NextResponse.json(alert)
  } catch (error) {
    console.error('GET /api/alerts/[id] error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})

/**
 * PATCH /api/alerts/[id]
 *
 * Acknowledge an alert
 */
export const PATCH = withAuth(async (request: AuthenticatedRequest, { params }: RouteParams) => {
  try {
    const { user } = request
    const { id } = await params

    const existing = await prisma.alert.findUnique({
      where: { id },
      select: { organizationId: true, acknowledged: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Alert not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    if (existing.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    if (existing.acknowledged) {
      return NextResponse.json(
        { error: 'Alert already acknowledged', code: 'ALREADY_ACKNOWLEDGED' },
        { status: 409 }
      )
    }

    const updated = await prisma.alert.update({
      where: { id },
      data: {
        acknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedBy: user.userId,
      },
      include: {
        truck: { select: { id: true, licensePlate: true, make: true, model: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/alerts/[id] error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})
