/**
 * Single Fuel Station API
 *
 * DELETE /api/fuel-stations/[id] - Remove a fuel station (OWNER/MANAGER only)
 */

import { NextResponse } from 'next/server'
import { withRole, AuthenticatedRequest } from '@/middleware/auth'
import { prisma, handlePrismaError } from '@/lib/db'
import { UserRole } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string }>
}

export const DELETE = withRole(UserRole.OWNER, UserRole.MANAGER)(
  async (request: AuthenticatedRequest, { params }: RouteParams) => {
    try {
      const { user } = request
      const { id } = await params

      const station = await prisma.fuelStation.findUnique({
        where: { id },
        select: { organizationId: true },
      })

      if (!station) {
        return NextResponse.json(
          { error: 'Fuel station not found', code: 'NOT_FOUND' },
          { status: 404 }
        )
      }

      if (station.organizationId !== user.organizationId) {
        return NextResponse.json(
          { error: 'Access denied', code: 'FORBIDDEN' },
          { status: 403 }
        )
      }

      await prisma.fuelStation.delete({ where: { id } })
      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('DELETE /api/fuel-stations/[id] error:', error)
      const { code, message } = handlePrismaError(error)
      return NextResponse.json({ error: message, code }, { status: 500 })
    }
  }
)
