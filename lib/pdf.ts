/**
 * PDF/Report Generation
 * Owner: FU-05
 *
 * Server-side HTML report generation for fleet, truck, and fuel reports.
 */

import { prisma } from '@/lib/db'

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatNumber(n: number, decimals = 1): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals })
}

function reportShell(title: string, orgName: string, dateRange: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${title}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; background: #fff; padding: 40px; max-width: 900px; margin: 0 auto; }
  @media print { body { padding: 20px; } .no-print { display: none !important; } }
  h1 { font-size: 24px; font-weight: 700; }
  h2 { font-size: 18px; font-weight: 600; margin-top: 32px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid #2563eb; }
  .header-meta { text-align: right; color: #64748b; font-size: 13px; }
  .header-meta .org { font-size: 15px; font-weight: 600; color: #334155; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-top: 12px; }
  .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; }
  .stat-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
  .stat-value { font-size: 24px; font-weight: 700; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
  th { text-align: left; padding: 8px 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; background: #f8fafc; border-bottom: 2px solid #e2e8f0; }
  td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
  tr:hover { background: #f8fafc; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
  .badge-blue { background: #dbeafe; color: #1d4ed8; }
  .badge-green { background: #dcfce7; color: #15803d; }
  .badge-amber { background: #fef3c7; color: #b45309; }
  .badge-red { background: #fee2e2; color: #dc2626; }
  .badge-slate { background: #f1f5f9; color: #475569; }
  .text-right { text-align: right; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
</style>
</head>
<body>
<div class="header">
  <div><h1>${title}</h1></div>
  <div class="header-meta">
    <div class="org">${orgName}</div>
    <div>${dateRange}</div>
    <div>Generated ${formatDate(new Date())}</div>
  </div>
</div>
${body}
<div class="footer">FleetCommand &mdash; Auto-generated report</div>
</body>
</html>`
}

function statCard(label: string, value: string): string {
  return `<div class="stat-card"><div class="stat-label">${label}</div><div class="stat-value">${value}</div></div>`
}

function severityBadge(severity: string): string {
  const map: Record<string, string> = { INFO: 'badge-blue', WARNING: 'badge-amber', CRITICAL: 'badge-red' }
  return `<span class="badge ${map[severity] || 'badge-slate'}">${severity}</span>`
}

function statusBadge(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'badge-green', IDLE: 'badge-slate', MAINTENANCE: 'badge-amber', BLOCKED: 'badge-red', INACTIVE: 'badge-slate',
    COMPLETED: 'badge-green', IN_PROGRESS: 'badge-blue', SCHEDULED: 'badge-amber', CANCELLED: 'badge-slate',
  }
  return `<span class="badge ${map[status] || 'badge-slate'}">${status.replace(/_/g, ' ')}</span>`
}

export async function generateFleetReport(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<{ html: string; title: string }> {
  const dateRange = `${formatDate(startDate)} — ${formatDate(endDate)}`
  const title = 'Fleet Overview Report'

  const [org, trucks, trips, fuelLogs, maintenance, alerts] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { name: true } }),
    prisma.truck.findMany({ where: { organizationId }, select: { id: true, status: true, licensePlate: true, make: true, model: true } }),
    prisma.trip.findMany({
      where: { truck: { organizationId }, scheduledStart: { gte: startDate, lte: endDate } },
      select: { status: true },
    }),
    prisma.fuelLog.findMany({
      where: { truck: { organizationId }, fueledAt: { gte: startDate, lte: endDate } },
      select: { gallons: true, totalCost: true, pricePerGallon: true },
    }),
    prisma.maintenance.findMany({
      where: { truck: { organizationId }, scheduledDate: { gte: startDate, lte: endDate } },
      select: { type: true, status: true, cost: true },
    }),
    prisma.alert.findMany({
      where: { organizationId, createdAt: { gte: startDate, lte: endDate } },
      select: { severity: true, type: true },
    }),
  ])

  const trucksByStatus = trucks.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1
    return acc
  }, {})

  const tripsByStatus = trips.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1
    return acc
  }, {})

  const totalGallons = fuelLogs.reduce((s, f) => s + f.gallons, 0)
  const totalFuelCost = fuelLogs.reduce((s, f) => s + f.totalCost, 0)
  const avgPrice = fuelLogs.length > 0 ? fuelLogs.reduce((s, f) => s + f.pricePerGallon, 0) / fuelLogs.length : 0

  const maintenanceByType = maintenance.reduce<Record<string, number>>((acc, m) => {
    acc[m.type] = (acc[m.type] || 0) + 1
    return acc
  }, {})
  const totalMaintenanceCost = maintenance.reduce((s, m) => s + (m.cost || 0), 0)

  const alertsBySeverity = alerts.reduce<Record<string, number>>((acc, a) => {
    acc[a.severity] = (acc[a.severity] || 0) + 1
    return acc
  }, {})

  const completedTrips = tripsByStatus['COMPLETED'] || 0
  const completionRate = trips.length > 0 ? ((completedTrips / trips.length) * 100).toFixed(1) : '0'

  let body = ''

  // Fleet Summary
  body += `<h2>Fleet Summary</h2><div class="grid">`
  body += statCard('Total Trucks', trucks.length.toString())
  Object.entries(trucksByStatus).forEach(([status, count]) => {
    body += statCard(status.replace(/_/g, ' '), count.toString())
  })
  body += `</div>`

  // Trip Summary
  body += `<h2>Trip Summary</h2><div class="grid">`
  body += statCard('Total Trips', trips.length.toString())
  body += statCard('Completion Rate', `${completionRate}%`)
  Object.entries(tripsByStatus).forEach(([status, count]) => {
    body += statCard(status.replace(/_/g, ' '), count.toString())
  })
  body += `</div>`

  // Fuel Summary
  body += `<h2>Fuel Summary</h2><div class="grid">`
  body += statCard('Total Gallons', formatNumber(totalGallons))
  body += statCard('Total Cost', formatCurrency(totalFuelCost))
  body += statCard('Avg Price/Gal', formatCurrency(avgPrice))
  body += statCard('Fill-ups', fuelLogs.length.toString())
  body += `</div>`

  // Maintenance Summary
  body += `<h2>Maintenance Summary</h2><div class="grid">`
  body += statCard('Total Records', maintenance.length.toString())
  body += statCard('Total Cost', formatCurrency(totalMaintenanceCost))
  body += `</div>`
  if (Object.keys(maintenanceByType).length > 0) {
    body += `<table><thead><tr><th>Type</th><th class="text-right">Count</th></tr></thead><tbody>`
    Object.entries(maintenanceByType).forEach(([type, count]) => {
      body += `<tr><td>${type.replace(/_/g, ' ')}</td><td class="text-right">${count}</td></tr>`
    })
    body += `</tbody></table>`
  }

  // Alert Summary
  body += `<h2>Alert Summary</h2><div class="grid">`
  body += statCard('Total Alerts', alerts.length.toString())
  Object.entries(alertsBySeverity).forEach(([severity, count]) => {
    body += statCard(severity, count.toString())
  })
  body += `</div>`

  return { html: reportShell(title, org.name, dateRange, body), title }
}

export async function generateTruckReport(
  truckId: string,
  startDate: Date,
  endDate: Date
): Promise<{ html: string; title: string }> {
  const dateRange = `${formatDate(startDate)} — ${formatDate(endDate)}`

  const truck = await prisma.truck.findUniqueOrThrow({
    where: { id: truckId },
    include: { organization: { select: { name: true } } },
  })

  const title = `Truck Report — ${truck.make} ${truck.model} (${truck.licensePlate})`

  const [trips, fuelLogs, maintenance] = await Promise.all([
    prisma.trip.findMany({
      where: { truckId, scheduledStart: { gte: startDate, lte: endDate } },
      include: { driver: { select: { name: true } } },
      orderBy: { scheduledStart: 'desc' },
    }),
    prisma.fuelLog.findMany({
      where: { truckId, fueledAt: { gte: startDate, lte: endDate } },
      orderBy: { fueledAt: 'desc' },
    }),
    prisma.maintenance.findMany({
      where: { truckId, scheduledDate: { gte: startDate, lte: endDate } },
      orderBy: { scheduledDate: 'desc' },
    }),
  ])

  let body = ''

  // Truck History Summary (who drove, km driven, etc.)
  const uniqueDrivers = [...new Set(trips.map((t) => t.driver?.name).filter(Boolean))] as string[]
  const fuelByDate = [...fuelLogs].sort(
    (a, b) => new Date(a.fueledAt).getTime() - new Date(b.fueledAt).getTime()
  )
  let milesDriven: number | null = null
  if (fuelByDate.length >= 2) {
    milesDriven = 0
    for (let i = 1; i < fuelByDate.length; i++) {
      const delta = fuelByDate[i].odometer - fuelByDate[i - 1].odometer
      if (delta > 0) milesDriven += delta
    }
  }

  body += `<h2>Truck History Summary</h2><div class="grid">`
  body += statCard('Drivers Who Drove', uniqueDrivers.length > 0 ? uniqueDrivers.join(', ') : 'None')
  body += statCard('Total Trips', trips.length.toString())
  body += statCard('Miles Driven (from odometer)', milesDriven != null ? `${milesDriven.toLocaleString()} mi` : 'N/A')
  body += statCard('Idle Time', 'Not tracked')
  body += `</div>`

  // Driver History (who drove, when)
  if (uniqueDrivers.length > 0) {
    body += `<h2>Driver History</h2>`
    const driverTrips = trips.reduce<Record<string, number>>((acc, t) => {
      const name = t.driver?.name ?? 'Unknown'
      acc[name] = (acc[name] || 0) + 1
      return acc
    }, {})
    body += `<table><thead><tr><th>Driver</th><th class="text-right">Trips</th></tr></thead><tbody>`
    Object.entries(driverTrips).forEach(([name, count]) => {
      body += `<tr><td>${name}</td><td class="text-right">${count}</td></tr>`
    })
    body += `</tbody></table>`
  }

  // Trips
  body += `<h2>Trips (${trips.length})</h2>`
  if (trips.length > 0) {
    body += `<table><thead><tr><th>Date</th><th>Driver</th><th>Origin</th><th>Destination</th><th>Status</th></tr></thead><tbody>`
    trips.forEach((t) => {
      body += `<tr>
        <td>${formatDate(t.scheduledStart)}</td>
        <td>${t.driver?.name ?? '—'}</td>
        <td>${t.originAddress}</td>
        <td>${t.destinationAddress}</td>
        <td>${statusBadge(t.status)}</td>
      </tr>`
    })
    body += `</tbody></table>`
  } else {
    body += `<p style="color:#94a3b8;margin-top:8px;">No trips in this period.</p>`
  }

  // Fuel
  const totalGallons = fuelLogs.reduce((s, f) => s + f.gallons, 0)
  const totalFuelCost = fuelLogs.reduce((s, f) => s + f.totalCost, 0)
  body += `<h2>Fuel Logs (${fuelLogs.length})</h2><div class="grid">`
  body += statCard('Total Gallons', formatNumber(totalGallons))
  body += statCard('Total Cost', formatCurrency(totalFuelCost))
  body += `</div>`
  if (fuelLogs.length > 0) {
    body += `<table><thead><tr><th>Date</th><th>Station</th><th class="text-right">Gallons</th><th class="text-right">Price/Gal</th><th class="text-right">Total</th><th class="text-right">Odometer</th></tr></thead><tbody>`
    fuelLogs.forEach((f) => {
      body += `<tr>
        <td>${formatDate(f.fueledAt)}</td>
        <td>${f.station || '—'}</td>
        <td class="text-right">${formatNumber(f.gallons)}</td>
        <td class="text-right">${formatCurrency(f.pricePerGallon)}</td>
        <td class="text-right">${formatCurrency(f.totalCost)}</td>
        <td class="text-right">${f.odometer.toLocaleString()}</td>
      </tr>`
    })
    body += `</tbody></table>`
  }

  // Maintenance
  const totalMaintCost = maintenance.reduce((s, m) => s + (m.cost || 0), 0)
  body += `<h2>Maintenance (${maintenance.length})</h2><div class="grid">`
  body += statCard('Records', maintenance.length.toString())
  body += statCard('Total Cost', formatCurrency(totalMaintCost))
  body += `</div>`
  if (maintenance.length > 0) {
    body += `<table><thead><tr><th>Date</th><th>Type</th><th>Status</th><th>Vendor</th><th class="text-right">Cost</th></tr></thead><tbody>`
    maintenance.forEach((m) => {
      body += `<tr>
        <td>${formatDate(m.scheduledDate)}</td>
        <td>${m.type.replace(/_/g, ' ')}</td>
        <td>${statusBadge(m.status)}</td>
        <td>${m.vendor || '—'}</td>
        <td class="text-right">${m.cost != null ? formatCurrency(m.cost) : '—'}</td>
      </tr>`
    })
    body += `</tbody></table>`
  }

  return { html: reportShell(title, truck.organization.name, dateRange, body), title }
}

export async function generateFuelReport(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<{ html: string; title: string }> {
  const dateRange = `${formatDate(startDate)} — ${formatDate(endDate)}`
  const title = 'Fuel Analysis Report'

  const [org, fuelLogs] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { name: true } }),
    prisma.fuelLog.findMany({
      where: { truck: { organizationId }, fueledAt: { gte: startDate, lte: endDate } },
      include: { truck: { select: { id: true, licensePlate: true, make: true, model: true } } },
      orderBy: { fueledAt: 'desc' },
    }),
  ])

  const totalGallons = fuelLogs.reduce((s, f) => s + f.gallons, 0)
  const totalCost = fuelLogs.reduce((s, f) => s + f.totalCost, 0)
  const avgPrice = fuelLogs.length > 0 ? fuelLogs.reduce((s, f) => s + f.pricePerGallon, 0) / fuelLogs.length : 0

  // Per-truck breakdown
  const byTruck = new Map<string, { plate: string; label: string; gallons: number; cost: number; count: number }>()
  fuelLogs.forEach((f) => {
    const key = f.truck.id
    const existing = byTruck.get(key) || { plate: f.truck.licensePlate, label: `${f.truck.make} ${f.truck.model}`, gallons: 0, cost: 0, count: 0 }
    existing.gallons += f.gallons
    existing.cost += f.totalCost
    existing.count += 1
    byTruck.set(key, existing)
  })

  // Station analysis
  const byStation = new Map<string, { gallons: number; cost: number; count: number }>()
  fuelLogs.forEach((f) => {
    const station = f.station || 'Unknown'
    const existing = byStation.get(station) || { gallons: 0, cost: 0, count: 0 }
    existing.gallons += f.gallons
    existing.cost += f.totalCost
    existing.count += 1
    byStation.set(station, existing)
  })

  let body = ''

  // Overall
  body += `<h2>Overall Summary</h2><div class="grid">`
  body += statCard('Fill-ups', fuelLogs.length.toString())
  body += statCard('Total Gallons', formatNumber(totalGallons))
  body += statCard('Total Cost', formatCurrency(totalCost))
  body += statCard('Avg Price/Gal', formatCurrency(avgPrice))
  body += `</div>`

  // Per-truck
  body += `<h2>Per-Truck Breakdown</h2>`
  if (byTruck.size > 0) {
    const sorted = [...byTruck.values()].sort((a, b) => b.cost - a.cost)
    body += `<table><thead><tr><th>Truck</th><th>Plate</th><th class="text-right">Fill-ups</th><th class="text-right">Gallons</th><th class="text-right">Total Cost</th><th class="text-right">Avg/Fill</th></tr></thead><tbody>`
    sorted.forEach((t) => {
      body += `<tr>
        <td>${t.label}</td>
        <td>${t.plate}</td>
        <td class="text-right">${t.count}</td>
        <td class="text-right">${formatNumber(t.gallons)}</td>
        <td class="text-right">${formatCurrency(t.cost)}</td>
        <td class="text-right">${formatCurrency(t.cost / t.count)}</td>
      </tr>`
    })
    body += `</tbody></table>`
  } else {
    body += `<p style="color:#94a3b8;margin-top:8px;">No fuel data available.</p>`
  }

  // Station analysis
  body += `<h2>Station Analysis</h2>`
  if (byStation.size > 0) {
    const sorted = [...byStation.entries()].sort((a, b) => b[1].cost - a[1].cost)
    body += `<table><thead><tr><th>Station</th><th class="text-right">Fill-ups</th><th class="text-right">Gallons</th><th class="text-right">Total Cost</th><th class="text-right">Avg Price/Gal</th></tr></thead><tbody>`
    sorted.forEach(([station, data]) => {
      const avg = data.gallons > 0 ? data.cost / data.gallons : 0
      body += `<tr>
        <td>${station}</td>
        <td class="text-right">${data.count}</td>
        <td class="text-right">${formatNumber(data.gallons)}</td>
        <td class="text-right">${formatCurrency(data.cost)}</td>
        <td class="text-right">${formatCurrency(avg)}</td>
      </tr>`
    })
    body += `</tbody></table>`
  }

  // Detailed log
  body += `<h2>Detailed Fuel Log</h2>`
  if (fuelLogs.length > 0) {
    body += `<table><thead><tr><th>Date</th><th>Truck</th><th>Station</th><th class="text-right">Gallons</th><th class="text-right">Price/Gal</th><th class="text-right">Total</th></tr></thead><tbody>`
    fuelLogs.forEach((f) => {
      body += `<tr>
        <td>${formatDate(f.fueledAt)}</td>
        <td>${f.truck.make} ${f.truck.model} (${f.truck.licensePlate})</td>
        <td>${f.station || '—'}</td>
        <td class="text-right">${formatNumber(f.gallons)}</td>
        <td class="text-right">${formatCurrency(f.pricePerGallon)}</td>
        <td class="text-right">${formatCurrency(f.totalCost)}</td>
      </tr>`
    })
    body += `</tbody></table>`
  }

  return { html: reportShell(title, org.name, dateRange, body), title }
}
