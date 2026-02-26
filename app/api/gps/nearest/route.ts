/**
 * Nearest Truck Finder Endpoint
 * Owner: GPS-01
 * GET /api/gps/nearest?lat=40.7128&lng=-74.0060&limit=5
 * 
 * Find nearest active trucks using PostGIS ST_Distance
 * Returns trucks sorted by distance with ETA estimates
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { estimateETA, metersToKilometers } from '@/lib/gps-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const lat = parseFloat(searchParams.get('lat') || '')
    const lng = parseFloat(searchParams.get('lng') || '')
    const limit = Math.min(parseInt(searchParams.get('limit') || '5', 10), 50)

    // Validate coordinates
    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'Valid lat and lng parameters are required' },
        { status: 400 }
      )
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Invalid GPS coordinates' },
        { status: 400 }
      )
    }

    // Use PostGIS to find nearest trucks
    // Note: Using raw SQL for PostGIS geography calculations
    const nearestTrucks = await prisma.$queryRaw<
      Array<{
        truck_id: string
        truck_code: string
        driver_name: string | null
        current_fuel_pct: number | null
        speed: number
        ignition_on: boolean
        latitude: number
        longitude: number
        last_ping_at: Date
        dist_m: number
      }>
    >`
      SELECT 
        t.id AS truck_id,
        t.license_plate AS truck_code,
        d.name AS driver_name,
        ts.fuel_level AS current_fuel_pct,
        ts.speed,
        ts.ignition_on,
        ts.latitude,
        ts.longitude,
        ts.last_ping_at,
        ST_Distance(
          ST_MakePoint(ts.longitude, ts.latitude)::geography,
          ST_MakePoint(${lng}, ${lat})::geography
        ) AS dist_m
      FROM truck_status ts
      JOIN trucks t ON t.id = ts.truck_id
      LEFT JOIN drivers d ON d.id = t.current_driver_id
      WHERE 
        ts.ignition_on = true
        AND t.status = 'ACTIVE'
        AND ts.last_ping_at > NOW() - INTERVAL '10 minutes'
      ORDER BY dist_m ASC
      LIMIT ${limit}
    `

    // Format response with ETA calculations
    const formattedTrucks = nearestTrucks.map(truck => {
      const distanceKm = metersToKilometers(truck.dist_m)
      const etaMinutes = estimateETA(distanceKm, truck.speed || 60)

      return {
        truckId: truck.truck_id,
        truckCode: truck.truck_code,
        driverName: truck.driver_name || 'Unassigned',
        currentLocation: {
          lat: truck.latitude,
          lng: truck.longitude
        },
        fuelLevel: truck.current_fuel_pct,
        speed: truck.speed,
        ignitionOn: truck.ignition_on,
        distance: {
          meters: Math.round(truck.dist_m),
          kilometers: parseFloat(distanceKm.toFixed(2)),
          miles: parseFloat((distanceKm * 0.621371).toFixed(2))
        },
        eta: {
          minutes: etaMinutes,
          formatted: formatETA(etaMinutes)
        },
        lastPingAt: truck.last_ping_at.toISOString()
      }
    })

    return NextResponse.json({
      requestLocation: { lat, lng },
      trucks: formattedTrucks,
      count: formattedTrucks.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[GPS Nearest] Error:', error)
    
    return NextResponse.json(
      { error: 'Failed to find nearest trucks' },
      { status: 500 }
    )
  }
}

/**
 * Format ETA minutes into human-readable string
 */
function formatETA(minutes: number): string {
  if (minutes < 1) {
    return 'Less than 1 minute'
  }

  if (minutes < 60) {
    return `${minutes} minutes`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
  }

  return `${hours}h ${remainingMinutes}m`
}

/**
 * POST endpoint for batch distance calculations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { locations, limit = 5 } = body

    if (!Array.isArray(locations) || locations.length === 0) {
      return NextResponse.json(
        { error: 'locations array is required' },
        { status: 400 }
      )
    }

    // Validate all locations
    for (const loc of locations) {
      if (!loc.lat || !loc.lng) {
        return NextResponse.json(
          { error: 'Each location must have lat and lng' },
          { status: 400 }
        )
      }
    }

    // Process each location
    const results = await Promise.all(
      locations.map(async (loc) => {
        const nearestTrucks = await prisma.$queryRaw<
          Array<{
            truck_id: string
            truck_code: string
            dist_m: number
          }>
        >`
          SELECT 
            t.id AS truck_id,
            t.license_plate AS truck_code,
            ST_Distance(
              ST_MakePoint(ts.longitude, ts.latitude)::geography,
              ST_MakePoint(${loc.lng}, ${loc.lat})::geography
            ) AS dist_m
          FROM truck_status ts
          JOIN trucks t ON t.id = ts.truck_id
          WHERE 
            ts.ignition_on = true
            AND t.status = 'ACTIVE'
          ORDER BY dist_m ASC
          LIMIT ${limit}
        `

        return {
          location: loc,
          nearestTrucks: nearestTrucks.map(t => ({
            truckId: t.truck_id,
            truckCode: t.truck_code,
            distanceKm: parseFloat(metersToKilometers(t.dist_m).toFixed(2))
          }))
        }
      })
    )

    return NextResponse.json({
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[GPS Nearest] POST error:', error)
    
    return NextResponse.json(
      { error: 'Failed to calculate distances' },
      { status: 500 }
    )
  }
}
