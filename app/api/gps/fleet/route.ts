/**
 * Fleet GPS Positions Endpoint
 * Owner: GPS-01
 * GET /api/gps/fleet
 * 
 * Returns all truck positions from Redis cache (no DB query)
 * Fast fleet dashboard loading (<50ms)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAllTruckPositions } from '@/lib/redis'

export async function GET(request: NextRequest) {
  try {
    // Get all cached truck positions from Redis
    const trucks = await getAllTruckPositions()

    return NextResponse.json({
      trucks,
      count: trucks.length,
      timestamp: new Date().toISOString(),
      source: 'redis-cache'
    })

  } catch (error) {
    console.error('[GPS Fleet] Error fetching fleet positions:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch fleet positions',
        trucks: [],
        count: 0,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * POST endpoint for bulk position updates (internal use)
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET to retrieve fleet positions.' },
    { status: 405 }
  )
}
