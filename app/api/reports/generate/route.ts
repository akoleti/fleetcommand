/**
 * Report Generation API
 * Owner: FU-04/FU-06
 *
 * POST /api/reports/generate - Generate an HTML report
 * Protected: OWNER/MANAGER only
 */

import { NextResponse } from 'next/server'
import { withRole } from '@/middleware/auth'
import { UserRole } from '@prisma/client'
import { generateFleetReport, generateTruckReport, generateFuelReport } from '@/lib/pdf'

const REPORT_TYPES = ['fleet', 'truck', 'fuel'] as const
type ReportType = (typeof REPORT_TYPES)[number]

interface GenerateBody {
  type: ReportType
  startDate: string
  endDate: string
  truckId?: string
}

export const POST = withRole(UserRole.OWNER, UserRole.MANAGER)(async (request) => {
  try {
    const body: GenerateBody = await request.json()
    const { type, startDate, endDate, truckId } = body

    if (!type || !REPORT_TYPES.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid report type. Must be one of: fleet, truck, fuel', code: 'INVALID_TYPE' },
        { status: 400 }
      )
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required', code: 'MISSING_DATES' },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format', code: 'INVALID_DATE' },
        { status: 400 }
      )
    }

    if (start > end) {
      return NextResponse.json(
        { error: 'startDate must be before endDate', code: 'INVALID_RANGE' },
        { status: 400 }
      )
    }

    const { user } = request
    let result: { html: string; title: string }

    switch (type) {
      case 'fleet':
        result = await generateFleetReport(user.organizationId, start, end)
        break
      case 'truck':
        if (!truckId) {
          return NextResponse.json(
            { error: 'truckId is required for truck reports', code: 'MISSING_TRUCK_ID' },
            { status: 400 }
          )
        }
        result = await generateTruckReport(truckId, start, end)
        break
      case 'fuel':
        result = await generateFuelReport(user.organizationId, start, end)
        break
    }

    return NextResponse.json({ html: result.html, title: result.title })
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as any).code === 'P2025') {
      return NextResponse.json(
        { error: 'Record not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }
    console.error('Report generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate report', code: 'GENERATION_ERROR' },
      { status: 500 }
    )
  }
})
