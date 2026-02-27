/**
 * Maintenance Proof API - Create proof for closing maintenance
 *
 * POST /api/maintenance-proof - Create maintenance proof (maintenance must be SCHEDULED or IN_PROGRESS)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'
import { prisma, handlePrismaError } from '@/lib/db'
import { MaintenanceStatus } from '@prisma/client'

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const { user } = request
    const body = await request.json()
    const { maintenanceId, signedBy, notes } = body

    if (!maintenanceId || !signedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: maintenanceId, signedBy', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const maintenance = await prisma.maintenance.findUnique({
      where: { id: maintenanceId },
      include: { truck: { select: { organizationId: true } } },
    })

    if (!maintenance) {
      return NextResponse.json(
        { error: 'Maintenance record not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    if (maintenance.truck.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    if (![MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS].includes(maintenance.status)) {
      return NextResponse.json(
        { error: 'Maintenance must be SCHEDULED or IN_PROGRESS to add proof', code: 'INVALID_STATUS' },
        { status: 400 }
      )
    }

    const proof = await prisma.maintenanceProof.create({
      data: {
        maintenanceId,
        signedBy: signedBy.trim(),
        notes: notes?.trim() || null,
      },
      include: {
        maintenance: {
          select: {
            id: true,
            status: true,
            type: true,
          },
        },
        media: true,
      },
    })

    return NextResponse.json(proof, { status: 201 })
  } catch (error) {
    console.error('POST /api/maintenance-proof error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})
