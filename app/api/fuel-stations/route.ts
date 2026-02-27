/**
 * Fuel Stations API - Organization-specific partner/preferred stations
 *
 * GET /api/fuel-stations - List fuel stations for the user's organization
 * POST /api/fuel-stations - Add a fuel station (OWNER/MANAGER only)
 */

import { NextResponse } from 'next/server'
import { withAuth, withRole } from '@/middleware/auth'
import { prisma, handlePrismaError } from '@/lib/db'
import { UserRole } from '@prisma/client'

export const GET = withAuth(async (request) => {
  try {
    const { user } = request

    const stations = await prisma.fuelStation.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    })

    return NextResponse.json(stations)
  } catch (error) {
    console.error('GET /api/fuel-stations error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})

export const POST = withRole(UserRole.OWNER, UserRole.MANAGER)(async (request) => {
  try {
    const { user } = request
    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Station name is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const trimmed = name.trim()
    if (!trimmed) {
      return NextResponse.json(
        { error: 'Station name cannot be empty', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const station = await prisma.fuelStation.upsert({
      where: {
        organizationId_name: {
          organizationId: user.organizationId,
          name: trimmed,
        },
      },
      create: {
        organizationId: user.organizationId,
        name: trimmed,
      },
      update: {},
      select: { id: true, name: true },
    })

    return NextResponse.json(station, { status: 201 })
  } catch (error) {
    console.error('POST /api/fuel-stations error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})
