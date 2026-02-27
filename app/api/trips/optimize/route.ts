/**
 * POST /api/trips/optimize
 * Returns optimized stop order for minimal route distance.
 * Body: { stops: [{ type: 'PICKUP'|'DROPOFF', address, lat, lng, notes? }] }
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'
import { optimizeRoute2Opt } from '@/lib/route-optimizer'

export const POST = withAuth(async (request) => {
  try {
    const body = await request.json()
    const { stops } = body

    if (!Array.isArray(stops) || stops.length < 2) {
      return NextResponse.json(
        { error: 'stops must be an array with at least 2 items', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const validStops = stops.filter(
      (s: any) => s && (s.type === 'PICKUP' || s.type === 'DROPOFF') && typeof s.address === 'string'
    )

    if (validStops.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 valid stops required (type, address)', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const toNum = (v: unknown) => {
      const n = typeof v === 'number' && !isNaN(v) ? v : parseFloat(String(v ?? ''))
      return isNaN(n) ? null : n
    }
    const withCoords = validStops
      .map((s: any) => ({ ...s, lat: toNum(s.lat), lng: toNum(s.lng) }))
      .filter((s: any) => s.lat != null && s.lng != null)

    const optimized =
      withCoords.length === validStops.length
        ? optimizeRoute2Opt(withCoords.map((s: any) => ({ type: s.type, address: s.address, lat: s.lat!, lng: s.lng!, notes: s.notes })))
        : validStops.map((s: any, i) => ({ ...s, sequence: i + 1, lat: toNum(s.lat), lng: toNum(s.lng) }))

    return NextResponse.json({ stops: optimized })
  } catch (error) {
    console.error('POST /api/trips/optimize error:', error)
    return NextResponse.json({ error: 'Failed to optimize route' }, { status: 500 })
  }
})
