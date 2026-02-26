/**
 * Delivery Proof API - List and Create
 * Owner: DP-02
 *
 * GET /api/delivery-proof - List delivery proofs (filtered)
 * POST /api/delivery-proof - Create delivery proof for a trip
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'
import { prisma, handlePrismaError, getPaginationParams, createPaginatedResult } from '@/lib/db'
import { TripStatus } from '@prisma/client'

export const GET = withAuth(async (request) => {
  try {
    const { user } = request
    const { searchParams } = new URL(request.url)

    const tripId = searchParams.get('tripId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {
      trip: {
        truck: {
          organizationId: user.organizationId,
        },
      },
    }

    if (tripId) {
      where.tripId = tripId
    }

    const { skip, take } = getPaginationParams({ page, limit })

    const [proofs, total] = await Promise.all([
      prisma.deliveryProof.findMany({
        where,
        skip,
        take,
        include: {
          trip: {
            select: {
              id: true,
              originAddress: true,
              destinationAddress: true,
              status: true,
              scheduledStart: true,
              truck: {
                select: {
                  id: true,
                  make: true,
                  model: true,
                  licensePlate: true,
                },
              },
              driver: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                },
              },
            },
          },
          media: {
            select: {
              id: true,
              type: true,
              mimeType: true,
              createdAt: true,
            },
          },
        },
        orderBy: { capturedAt: 'desc' },
      }),
      prisma.deliveryProof.count({ where }),
    ])

    return NextResponse.json(createPaginatedResult(proofs, total, { page, limit }))
  } catch (error) {
    console.error('GET /api/delivery-proof error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})

export const POST = withAuth(async (request) => {
  try {
    const { user } = request
    const body = await request.json()
    const { tripId, recipientName, notes, latitude, longitude } = body

    if (!tripId || !recipientName) {
      return NextResponse.json(
        { error: 'Missing required fields: tripId, recipientName', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        truck: { select: { organizationId: true } },
      },
    })

    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    if (trip.truck.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    if (trip.status !== TripStatus.IN_PROGRESS) {
      return NextResponse.json(
        { error: 'Trip must be IN_PROGRESS to add delivery proof', code: 'INVALID_TRIP_STATUS' },
        { status: 400 }
      )
    }

    const proof = await prisma.deliveryProof.create({
      data: {
        tripId,
        recipientName,
        notes: notes || null,
        latitude: latitude != null ? parseFloat(latitude) : null,
        longitude: longitude != null ? parseFloat(longitude) : null,
        capturedAt: new Date(),
      },
      include: {
        trip: {
          select: {
            id: true,
            originAddress: true,
            destinationAddress: true,
            status: true,
          },
        },
        media: true,
      },
    })

    return NextResponse.json(proof, { status: 201 })
  } catch (error) {
    console.error('POST /api/delivery-proof error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})
