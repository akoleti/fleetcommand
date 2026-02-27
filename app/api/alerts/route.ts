import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRole } from '@/middleware/auth'
import { prisma, getPaginationParams, createPaginatedResult, handlePrismaError } from '@/lib/db'
import { createAlert } from '@/lib/alert-engine'
import { AlertType, AlertSeverity, UserRole } from '@prisma/client'

/**
 * GET /api/alerts
 *
 * Query params: type, severity, acknowledged, truckId, page, limit
 */
export const GET = withAuth(async (request) => {
  try {
    const { user } = request
    const { searchParams } = new URL(request.url)

    const typeParam = searchParams.get('type') as AlertType | null
    const severityParam = searchParams.get('severity') as AlertSeverity | null
    const acknowledgedParam = searchParams.get('acknowledged')
    const truckId = searchParams.get('truckId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {
      organizationId: user.organizationId,
    }

    if (typeParam && Object.values(AlertType).includes(typeParam)) {
      where.type = typeParam
    }
    if (severityParam && Object.values(AlertSeverity).includes(severityParam)) {
      where.severity = severityParam
    }
    if (acknowledgedParam === 'true' || acknowledgedParam === 'false') {
      where.acknowledged = acknowledgedParam === 'true'
    }
    if (truckId) {
      where.truckId = truckId
    }

    const { skip, take } = getPaginationParams({ page, limit })

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        skip,
        take,
        include: {
          truck: { select: { id: true, licensePlate: true, make: true, model: true } },
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.alert.count({ where }),
    ])

    return NextResponse.json(createPaginatedResult(alerts, total, { page, limit }))
  } catch (error) {
    console.error('GET /api/alerts error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})

/**
 * POST /api/alerts
 *
 * Create a manual alert (OWNER/MANAGER only)
 */
export const POST = withRole(UserRole.OWNER, UserRole.MANAGER)(async (request) => {
  try {
    const { user } = request
    const body = await request.json()

    const { type, severity, title, message, truckId, data } = body

    if (!type || !severity || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: type, severity, title, message', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    if (!Object.values(AlertType).includes(type)) {
      return NextResponse.json(
        { error: `Invalid alert type: ${type}`, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    if (!Object.values(AlertSeverity).includes(severity)) {
      return NextResponse.json(
        { error: `Invalid severity: ${severity}`, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const alert = await createAlert({
      organizationId: user.organizationId,
      userId: user.userId,
      truckId: truckId || undefined,
      type,
      severity,
      title,
      message,
      data: data || {},
    })

    return NextResponse.json(alert, { status: 201 })
  } catch (error) {
    console.error('POST /api/alerts error:', error)
    const { code, message: msg } = handlePrismaError(error)
    return NextResponse.json({ error: msg, code }, { status: 500 })
  }
})
