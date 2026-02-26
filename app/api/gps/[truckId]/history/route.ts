/**
 * GPS History Endpoint
 * Owner: GPS-01
 * GET /api/gps/[truckId]/history?limit=100&offset=0
 * 
 * Returns paginated GPS location history for a specific truck
 * From gps_locations table (TimescaleDB hypertable)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ truckId: string }> }
) {
  try {
    const { truckId } = await params
    const { searchParams } = new URL(request.url)

    // Parse pagination params
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 1000)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Optional date range filters
    const startDate = searchParams.get('startDate') 
      ? new Date(searchParams.get('startDate')!)
      : undefined
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined

    if (!truckId) {
      return NextResponse.json(
        { error: 'truckId is required' },
        { status: 400 }
      )
    }

    // Build where clause
    const where: any = { truckId }
    
    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = startDate
      if (endDate) where.timestamp.lte = endDate
    }

    // Fetch locations with pagination
    const [locations, total] = await Promise.all([
      prisma.gpsLocation.findMany({
        where,
        select: {
          id: true,
          latitude: true,
          longitude: true,
          speed: true,
          heading: true,
          fuelLevel: true,
          ignitionOn: true,
          timestamp: true
        },
        orderBy: { timestamp: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.gpsLocation.count({ where })
    ])

    // Format response
    const formattedLocations = locations.map(loc => ({
      id: loc.id,
      lat: loc.latitude,
      lng: loc.longitude,
      speed: loc.speed,
      heading: loc.heading,
      fuelLevel: loc.fuelLevel,
      ignitionOn: loc.ignitionOn,
      recordedAt: loc.timestamp.toISOString()
    }))

    return NextResponse.json({
      truckId,
      locations: formattedLocations,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[GPS History] Error:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch GPS history' },
      { status: 500 }
    )
  }
}

/**
 * POST endpoint to manually add GPS location (for testing)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ truckId: string }> }
) {
  try {
    const { truckId } = await params
    const body = await request.json()

    const { lat, lng, speed, heading, fuelLevel, ignitionOn, timestamp } = body

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'lat and lng are required' },
        { status: 400 }
      )
    }

    const location = await prisma.gpsLocation.create({
      data: {
        truckId,
        latitude: lat,
        longitude: lng,
        speed: speed || 0,
        heading: heading || 0,
        fuelLevel: fuelLevel || null,
        ignitionOn: ignitionOn || false,
        timestamp: timestamp ? new Date(timestamp) : new Date()
      }
    })

    return NextResponse.json({
      success: true,
      location: {
        id: location.id,
        lat: location.latitude,
        lng: location.longitude,
        speed: location.speed,
        heading: location.heading,
        fuelLevel: location.fuelLevel,
        ignitionOn: location.ignitionOn,
        recordedAt: location.timestamp.toISOString()
      }
    })

  } catch (error) {
    console.error('[GPS History] POST error:', error)
    
    return NextResponse.json(
      { error: 'Failed to add GPS location' },
      { status: 500 }
    )
  }
}
