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

interface RecentAlert {
  id: string
  type: string
  severity: string
  title: string
  message: string
  createdAt: string
  truck?: { id: string; licensePlate: string; make: string; model: string }
}

const severityConfig: Record<string, { bg: string; text: string; dot: string }> = {
  CRITICAL: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  WARNING: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  INFO: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [alerts, setAlerts] = useState<RecentAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const headers = { Authorization: `Bearer ${token}` }

      const [trucksRes, driversRes, alertsRes] = await Promise.allSettled([
        fetch('/api/trucks?limit=100', { headers }),
        fetch('/api/drivers?limit=100', { headers }),
        fetch('/api/alerts?limit=5&acknowledged=false', { headers }),
      ])

      const trucksData = trucksRes.status === 'fulfilled' && trucksRes.value.ok
        ? await trucksRes.value.json() : null
      const driversData = driversRes.status === 'fulfilled' && driversRes.value.ok
        ? await driversRes.value.json() : null
      const alertsData = alertsRes.status === 'fulfilled' && alertsRes.value.ok
        ? await alertsRes.value.json() : null

      const truckList = trucksData?.data || []
      const driverList = driversData?.data || []

      setStats({
        trucks: {
          total: truckList.length,
          active: truckList.filter((t: any) => t.status === 'ACTIVE').length,
          idle: truckList.filter((t: any) => t.status === 'IDLE').length,
          maintenance: truckList.filter((t: any) => t.status === 'MAINTENANCE').length,
          blocked: truckList.filter((t: any) => t.status === 'BLOCKED').length,
        },
        drivers: {
          total: driverList.length,
          available: driverList.filter((d: any) => d.status === 'AVAILABLE').length,
          onTrip: driverList.filter((d: any) => d.status === 'ON_TRIP').length,
          offDuty: driverList.filter((d: any) => d.status === 'OFF_DUTY').length,
        },
        trips: { total: 0, scheduled: 0, inProgress: 0, completedToday: 0 },
        alerts: {
          unacknowledged: alertsData?.pagination?.total || 0,
          critical: (alertsData?.data || []).filter((a: any) => a.severity === 'CRITICAL').length,
          warning: (alertsData?.data || []).filter((a: any) => a.severity === 'WARNING').length,
        },
        fuel: { totalCostThisMonth: 0, totalGallonsThisMonth: 0 },
      })
      setAlerts(alertsData?.data || [])
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

        <Link href="/maintenance" className="group rounded-2xl bg-white border border-slate-200 shadow-sm p-5 hover:border-brand-300 transition-colors">
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
      </div>

      {/* Recent alerts */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Recent Alerts</h2>
          <Link href="/alerts" className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
            View all
          </Link>
        </div>
        {alerts.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {alerts.map((alert) => {
              const sev = severityConfig[alert.severity] || severityConfig.INFO
              const Wrapper = alert.truck ? Link : 'div' as any
              const wrapperProps = alert.truck
                ? { href: `/trucks/${alert.truck.id}`, className: 'block px-6 py-4 flex items-start gap-4 hover:bg-slate-50 transition-colors' }
                : { className: 'px-6 py-4 flex items-start gap-4' }
              return (
                <Wrapper key={alert.id} {...wrapperProps}>
                  <span className={`mt-0.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${sev.bg} ${sev.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                    {alert.severity}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{alert.title}</p>
                    <p className="mt-0.5 text-sm text-slate-500 truncate">{alert.message}</p>
                    {alert.truck && (
                      <p className="mt-1 text-xs font-medium text-brand-600">
                        {alert.truck.make} {alert.truck.model} — {alert.truck.licensePlate}
                      </p>
                    )}
                  </div>
                  <time className="text-xs text-slate-400 whitespace-nowrap">
                    {new Date(alert.createdAt).toLocaleDateString()}
                  </time>
                </Wrapper>
              )
            })}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-3 text-sm text-slate-500">No active alerts</p>
            <p className="mt-1 text-xs text-slate-400">All clear — your fleet is operating normally.</p>
          </div>
        )}
      </div>
    </div>
  )
}
