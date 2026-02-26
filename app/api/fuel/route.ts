/**
 * Fuel Logs API - List and Create
 * Owner: FU-01
 *
 * GET /api/fuel - List fuel logs with optional filters
 * POST /api/fuel - Create a new fuel log
 */

import { NextResponse } from 'next/server'
import { withAuth, withRole } from '@/middleware/auth'
import { prisma, handlePrismaError, getPaginationParams, createPaginatedResult } from '@/lib/db'
import { UserRole } from '@prisma/client'

export const GET = withAuth(async (request) => {
  try {
    const { user } = request
    const { searchParams } = new URL(request.url)

    const truckId = searchParams.get('truckId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {
      truck: { organizationId: user.organizationId },
    }

    if (truckId) where.truckId = truckId

    if (startDate || endDate) {
      where.fueledAt = {}
      if (startDate) where.fueledAt.gte = new Date(startDate)
      if (endDate) where.fueledAt.lte = new Date(endDate)
    }

    const { skip, take } = getPaginationParams({ page, limit })

    const [logs, total] = await Promise.all([
      prisma.fuelLog.findMany({
        where,
        skip,
        take,
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
        orderBy: { fueledAt: 'desc' },
      }),
      prisma.fuelLog.count({ where }),
    ])

    return NextResponse.json(createPaginatedResult(logs, total, { page, limit }))
  } catch (error) {
    console.error('GET /api/fuel error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})

export const POST = withRole(UserRole.OWNER, UserRole.MANAGER, UserRole.DRIVER)(async (request) => {
  try {
    const { user } = request
    const body = await request.json()

    const { truckId, gallons, pricePerGallon, odometer, station, latitude, longitude, fueledAt } = body

    if (!truckId || gallons == null || pricePerGallon == null || odometer == null) {
      return NextResponse.json(
        { error: 'Missing required fields: truckId, gallons, pricePerGallon, odometer', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    if (gallons <= 0 || pricePerGallon <= 0) {
      return NextResponse.json(
        { error: 'gallons and pricePerGallon must be positive numbers', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const truck = await prisma.truck.findUnique({
      where: { id: truckId },
      select: { organizationId: true },
    })

    if (!truck) {
      return NextResponse.json(
        { error: 'Truck not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    if (truck.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    const totalCost = Math.round(gallons * pricePerGallon * 100) / 100

    const fuelLog = await prisma.fuelLog.create({
      data: {
        truckId,
        gallons,
        pricePerGallon,
        totalCost,
        odometer: Math.round(odometer),
        station: station || null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        fueledAt: fueledAt ? new Date(fueledAt) : new Date(),
      },
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
    })

    return NextResponse.json(fuelLog, { status: 201 })
  } catch (error) {
    console.error('POST /api/fuel error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})
