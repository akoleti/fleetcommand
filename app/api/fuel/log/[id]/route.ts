/**
 * Single Fuel Log API
 *
 * GET /api/fuel/log/[id] - Get fuel log details by ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'
import { prisma, handlePrismaError } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

export const GET = withAuth(async (request: NextRequest, { params }: RouteParams) => {
  try {
    const { user } = request
    const { id } = await params

    const fuelLog = await prisma.fuelLog.findUnique({
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
          },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
    })

    if (!fuelLog) {
      return NextResponse.json(
        { error: 'Fuel log not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    if (fuelLog.truck.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    return NextResponse.json(fuelLog)
  } catch (error) {
    console.error('GET /api/fuel/log/[id] error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})
