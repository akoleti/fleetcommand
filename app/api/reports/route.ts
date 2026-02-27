/**
 * Reports API - List
 * Owner: FU-04
 *
 * GET /api/reports - List available report types and metadata
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'

export const GET = withAuth(async () => {
  const reportTypes = [
    {
      type: 'fleet',
      label: 'Fleet Overview',
      description: 'Complete fleet summary including trucks, trips, fuel, maintenance, and alerts',
    },
    {
      type: 'truck',
      label: 'Single Truck',
      description: 'Detailed report for an individual truck with trip, fuel, and maintenance history',
    },
    {
      type: 'fuel',
      label: 'Fuel Analysis',
      description: 'Fuel consumption breakdown by truck and station with cost analysis',
    },
  ]

  return NextResponse.json({ reportTypes })
})
