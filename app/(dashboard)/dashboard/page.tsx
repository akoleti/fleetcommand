'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

interface DashboardStats {
  trucks: { total: number; active: number; idle: number; maintenance: number; blocked: number }
  drivers: { total: number; available: number; onTrip: number; offDuty: number }
  trips: { total: number; scheduled: number; inProgress: number; completedToday: number }
  alerts: { unacknowledged: number; critical: number; warning: number }
  fuel: { totalCostThisMonth: number; totalGallonsThisMonth: number }
}

type ActivityItem =
  | { kind: 'alert'; id: string; type: string; severity: string; title: string; message: string; truck?: { id: string; licensePlate: string; make: string; model: string }; timestamp: string }
  | { kind: 'delivery'; id: string; tripId: string; truck: { id: string; licensePlate: string; make: string; model: string }; driver: { id: string; name: string }; address: string; timestamp: string }
  | { kind: 'pickup'; id: string; tripId: string; truck: { id: string; licensePlate: string; make: string; model: string }; driver: { id: string; name: string }; address: string; timestamp: string }

const severityConfig: Record<string, { bg: string; text: string; dot: string }> = {
  CRITICAL: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  WARNING: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  INFO: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const headers = { Authorization: `Bearer ${token}` }

      const [statsRes, activityRes] = await Promise.allSettled([
        fetch('/api/dashboard/stats', { headers }),
        fetch('/api/dashboard/recent-activity', { headers }),
      ])

      const statsData = statsRes.status === 'fulfilled' && statsRes.value.ok
        ? await statsRes.value.json() : null
      const activityData = activityRes.status === 'fulfilled' && activityRes.value.ok
        ? await activityRes.value.json() : null

      if (statsData) {
        setStats({
          trucks: statsData.trucks ?? { total: 0, active: 0, idle: 0, maintenance: 0, blocked: 0 },
          drivers: statsData.drivers ?? { total: 0, available: 0, onTrip: 0, offDuty: 0 },
          trips: statsData.trips ?? { total: 0, scheduled: 0, inProgress: 0, completedToday: 0 },
          alerts: statsData.alerts ?? { unacknowledged: 0, critical: 0, warning: 0 },
          fuel: statsData.fuel ?? { totalCostThisMonth: 0, totalGallonsThisMonth: 0 },
        })
      }
      setActivity(activityData?.data || [])
    } catch {
      // Silently handle dashboard fetch errors
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-white border border-slate-200 p-5">
              <div className="h-4 w-20 bg-slate-200 rounded mb-3" />
              <div className="h-8 w-16 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Fleet overview and operational status</p>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <Link href="/trucks" className="group rounded-2xl bg-white border border-slate-200 shadow-sm p-5 hover:border-brand-300 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Trucks</p>
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900 tabular-nums">{stats?.trucks.total || 0}</p>
          <div className="mt-2 flex gap-3 text-xs text-slate-500">
            <span><span className="font-medium text-emerald-600">{stats?.trucks.active}</span> active</span>
            <span><span className="font-medium text-amber-600">{stats?.trucks.idle}</span> idle</span>
          </div>
        </Link>

        <Link href="/drivers" className="group rounded-2xl bg-white border border-slate-200 shadow-sm p-5 hover:border-brand-300 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Drivers</p>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900 tabular-nums">{stats?.drivers.total || 0}</p>
          <div className="mt-2 flex gap-3 text-xs text-slate-500">
            <span><span className="font-medium text-emerald-600">{stats?.drivers.available}</span> available</span>
            <span><span className="font-medium text-blue-600">{stats?.drivers.onTrip}</span> on trip</span>
          </div>
        </Link>

        <Link href="/alerts" className="group rounded-2xl bg-white border border-slate-200 shadow-sm p-5 hover:border-brand-300 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Alerts</p>
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900 tabular-nums">{stats?.alerts.unacknowledged || 0}</p>
          <div className="mt-2 flex gap-3 text-xs text-slate-500">
            {(stats?.alerts.critical || 0) > 0 && (
              <span><span className="font-medium text-red-600">{stats?.alerts.critical}</span> critical</span>
            )}
            {(stats?.alerts.warning || 0) > 0 && (
              <span><span className="font-medium text-amber-600">{stats?.alerts.warning}</span> warning</span>
            )}
          </div>
        </Link>

        <Link href="/trucks?status=maintenance" className="group rounded-2xl bg-white border border-slate-200 shadow-sm p-5 hover:border-brand-300 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Maintenance</p>
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384 5.384a2.625 2.625 0 01-3.712-3.712l5.384-5.384m0 0L11.42 15.17m-4.714-4.714a2.625 2.625 0 013.712-3.712l5.384 5.384m0 0l-5.384 5.384" />
              </svg>
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900 tabular-nums">{stats?.trucks.maintenance || 0}</p>
          <div className="mt-2 text-xs text-slate-500">trucks in maintenance</div>
        </Link>

        <Link href="/trips" className="group rounded-2xl bg-white border border-slate-200 shadow-sm p-5 hover:border-brand-300 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Trips</p>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900 tabular-nums">{stats?.trips.total || 0}</p>
          <div className="mt-2 flex gap-3 text-xs text-slate-500">
            <span><span className="font-medium text-amber-600">{stats?.trips.scheduled}</span> scheduled</span>
            <span><span className="font-medium text-blue-600">{stats?.trips.inProgress}</span> in progress</span>
            <span><span className="font-medium text-emerald-600">{stats?.trips.completedToday}</span> done today</span>
          </div>
        </Link>

        <Link href="/fuel" className="group rounded-2xl bg-white border border-slate-200 shadow-sm p-5 hover:border-brand-300 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fuel This Month</p>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
              </svg>
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900 tabular-nums">
            ${(stats?.fuel.totalCostThisMonth ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="mt-2 text-xs text-slate-500">
            {(stats?.fuel.totalGallonsThisMonth ?? 0).toLocaleString('en-US', { maximumFractionDigits: 1 })} gal
          </div>
        </Link>
      </div>

      {/* Recent alerts & activity */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Recent Alerts & Activity</h2>
          <Link href="/alerts" className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
            View all alerts
          </Link>
        </div>
        {activity.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Truck</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activity.map((item) => {
                  const ts = new Date(item.timestamp)
                  const dateStr = ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  const timeStr = ts.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                  if (item.kind === 'alert') {
                    const sev = severityConfig[item.severity] || severityConfig.INFO
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{dateStr} {timeStr}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${sev.bg} ${sev.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                            {item.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {item.truck ? (
                            <Link href={`/trucks/${item.truck.id}`} className="font-medium text-brand-600 hover:text-brand-700">
                              {item.truck.make} {item.truck.model} — {item.truck.licensePlate}
                            </Link>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          <span className="font-medium text-slate-900">{item.title}</span>
                          {item.message && <span className="text-slate-500"> — {item.message}</span>}
                        </td>
                      </tr>
                    )
                  }
                  if (item.kind === 'delivery') {
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{dateStr} {timeStr}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Delivery
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          <Link href={`/trucks/${item.truck.id}`} className="font-medium text-brand-600 hover:text-brand-700">
                            {item.truck.make} {item.truck.model} — {item.truck.licensePlate}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          <Link href={`/trips/${item.tripId}`} className="text-slate-700 hover:text-brand-600">
                            Delivered by {item.driver.name} at {item.address}
                          </Link>
                        </td>
                      </tr>
                    )
                  }
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{dateStr} {timeStr}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          Pickup
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <Link href={`/trucks/${item.truck.id}`} className="font-medium text-brand-600 hover:text-brand-700">
                          {item.truck.make} {item.truck.model} — {item.truck.licensePlate}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        <Link href={`/trips/${item.tripId}`} className="text-slate-700 hover:text-brand-600">
                          Picked up by {item.driver.name} at {item.address}
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-3 text-sm text-slate-500">No recent activity</p>
            <p className="mt-1 text-xs text-slate-400">Alerts and delivery/pickup events will appear here.</p>
          </div>
        )}
      </div>
    </div>
  )
}
