/**
 * GPS Ping Ingestion Endpoint
 * Owner: GPS-01
 * POST /api/gps/ping
 * 
 * Receives GPS pings from hardware trackers (Samsara, Geotab, Verizon, MQTT, Custom)
 * Requirements:
 * - Authenticate via X-GPS-Secret header
 * - Normalize payload to internal format
 * - Update truck_status in database
 * - Cache position in Redis
 * - Broadcast via Socket.io
 * - Return 200 OK immediately (fire and forget)
 * - Performance target: < 100ms response time
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { normalizeGpsPayload, GpsIngestionError, logGpsIngestion } from '@/lib/gps-ingestion'
import { cacheGPSPosition } from '@/lib/redis'
import { broadcastTruckLocation } from '@/lib/socket'
import { determineMovementStatus } from '@/lib/gps-utils'

const GPS_WEBHOOK_SECRET = process.env.GPS_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // 1. Authenticate request
    const authHeader = request.headers.get('X-GPS-Secret')
    
    if (!GPS_WEBHOOK_SECRET) {
      console.error('[GPS Ping] GPS_WEBHOOK_SECRET not configured')
      return NextResponse.json(
        { error: 'GPS webhook not configured' },
        { status: 500 }
      )
    }

    if (authHeader !== GPS_WEBHOOK_SECRET) {
      console.warn('[GPS Ping] Unauthorized attempt:', request.headers.get('x-forwarded-for'))
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Parse request body
    const rawPayload = await request.json()

    // 3. Normalize payload
    let normalizedPayload
    try {
      normalizedPayload = normalizeGpsPayload(rawPayload)
    } catch (error) {
      if (error instanceof GpsIngestionError) {
        console.error('[GPS Ping] Normalization failed:', error.message)
        logGpsIngestion(
          { truckId: 'unknown', lat: 0, lng: 0, speed: 0, heading: 0, fuelLevel: 0, ignitionOn: false, timestamp: new Date().toISOString() },
          error.source,
          false,
          error
        )
        
        return NextResponse.json(
          { error: 'Invalid GPS payload', details: error.message },
          { status: 400 }
        )
      }
      throw error
    }

    // 4. Fire and forget: Process in background, return 200 immediately
    // Using Promise.allSettled to avoid blocking response
    processGpsPing(normalizedPayload).catch(error => {
      console.error('[GPS Ping] Background processing error:', error)
    })

    const responseTime = Date.now() - startTime
    
    return NextResponse.json(
      { 
        success: true, 
        truckId: normalizedPayload.truckId,
        timestamp: normalizedPayload.timestamp,
        responseTime: `${responseTime}ms`
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('[GPS Ping] Unexpected error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Background processing of GPS ping
 * Steps:
 * 1. Write to gps_locations table (TimescaleDB)
 * 2. Update truck_status (upsert)
 * 3. Cache in Redis
 * 4. Broadcast via Socket.io
 */
async function processGpsPing(payload: {
  truckId: string
  lat: number
  lng: number
  speed: number
  heading: number
  fuelLevel: number
  ignitionOn: boolean
  timestamp: string
}): Promise<void> {
  try {
    // Determine movement status
    const movementStatus = determineMovementStatus(payload.speed, payload.ignitionOn)

    // 1. Write GPS location to TimescaleDB hypertable
    const gpsLocation = await prisma.gpsLocation.create({
      data: {
        truckId: payload.truckId,
        latitude: payload.lat,
        longitude: payload.lng,
        speed: payload.speed,
        heading: payload.heading,
        fuelLevel: payload.fuelLevel,
        ignitionOn: payload.ignitionOn,
        timestamp: new Date(payload.timestamp)
      }
    })

    // 2. Update truck status (upsert)
    const existingStatus = await prisma.truckStatusRecord.findUnique({
      where: { truckId: payload.truckId }
    })

    const now = new Date()
    const idleSince = movementStatus === 'idle' && !existingStatus?.ignitionOn
      ? existingStatus?.lastPingAt || now
      : movementStatus === 'moving'
      ? null
      : existingStatus?.lastPingAt

    await prisma.truckStatusRecord.upsert({
      where: { truckId: payload.truckId },
      update: {
        latitude: payload.lat,
        longitude: payload.lng,
        speed: payload.speed,
        heading: payload.heading,
        fuelLevel: payload.fuelLevel,
        ignitionOn: payload.ignitionOn,
        lastPingAt: now,
        updatedAt: now
      },
      create: {
        truckId: payload.truckId,
        latitude: payload.lat,
        longitude: payload.lng,
        speed: payload.speed,
        heading: payload.heading,
        fuelLevel: payload.fuelLevel,
        ignitionOn: payload.ignitionOn,
        lastPingAt: now,
        updatedAt: now
      }
    })

    // 3. Cache in Redis (TTL 120s)
    await cacheGPSPosition(payload.truckId, {
      lat: payload.lat,
      lng: payload.lng,
      speed: payload.speed,
      heading: payload.heading,
      fuelLevel: payload.fuelLevel,
      ignitionOn: payload.ignitionOn,
      movementStatus,
      timestamp: payload.timestamp
    })

    // 4. Broadcast via Socket.io
    broadcastTruckLocation({
      truckId: payload.truckId,
      lat: payload.lat,
      lng: payload.lng,
      speed: payload.speed,
      heading: payload.heading,
      fuelLevel: payload.fuelLevel,
      ignitionOn: payload.ignitionOn,
      movementStatus,
      timestamp: payload.timestamp
    })

    // Log success
    logGpsIngestion(payload, 'webhook', true)

  } catch (error) {
    console.error('[GPS Ping] Background processing error:', error)
    
    // Log failure but don't throw (already returned 200 to client)
    logGpsIngestion(
      payload,
      'webhook',
      false,
      error instanceof Error ? error : new Error('Unknown error')
    )
  }
}

/**
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    service: 'GPS Ingestion',
    status: 'healthy',
    timestamp: new Date().toISOString()
  })
}
