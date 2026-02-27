import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { runAllChecks, type AlertCheckSummary } from '@/lib/alert-engine'

const CRON_SECRET = process.env.VERCEL_CRON_SECRET

/**
 * GET /api/cron/alerts
 *
 * Secured via VERCEL_CRON_SECRET header. Runs all alert checks
 * for every organization and returns a summary.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')

  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    )
  }

  try {
    const organizations = await prisma.organization.findMany({
      select: { id: true, name: true },
    })

    const results: Record<string, AlertCheckSummary> = {}
    let totalAlerts = 0

    for (const org of organizations) {
      const summary = await runAllChecks(org.id)
      results[org.id] = summary
      totalAlerts += summary.total
    }

    return NextResponse.json({
      success: true,
      organizationsChecked: organizations.length,
      totalAlertsCreated: totalAlerts,
      results,
    })
  } catch (error) {
    console.error('GET /api/cron/alerts error:', error)
    return NextResponse.json(
      { error: 'Cron job failed', code: 'CRON_ERROR' },
      { status: 500 }
    )
  }
}
