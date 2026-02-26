'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

interface Alert {
  id: string
  type: string
  severity: string
  title: string
  message: string
  acknowledged: boolean
  createdAt: string
  truck?: {
    id: string
    licensePlate: string
    make: string
    model: string
  }
}

interface PaginatedResponse {
  data: Alert[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const severityConfig: Record<string, { bg: string; text: string; dot: string }> = {
  CRITICAL: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  WARNING: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  INFO: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [severityFilter, setSeverityFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAcknowledged, setShowAcknowledged] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUnacknowledged, setTotalUnacknowledged] = useState(0)
  const [acknowledging, setAcknowledging] = useState<string | null>(null)

  useEffect(() => {
    fetchAlerts()
  }, [severityFilter, searchQuery, showAcknowledged, page])

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (severityFilter !== 'all') params.set('severity', severityFilter)
      if (!showAcknowledged) params.set('acknowledged', 'false')
      if (searchQuery) params.set('search', searchQuery)

      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/alerts?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) throw new Error('Failed to fetch alerts')

      const data: PaginatedResponse = await response.json()
      setAlerts(data.data)
      setTotalPages(data.pagination.totalPages)

      if (!showAcknowledged) {
        setTotalUnacknowledged(data.pagination.total)
      }

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleAcknowledge = async (id: string) => {
    try {
      setAcknowledging(id)
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/alerts/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ acknowledged: true }),
      })

      if (!response.ok) throw new Error('Failed to acknowledge alert')

      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)))
      setTotalUnacknowledged((prev) => Math.max(0, prev - 1))
    } catch {
      // Silently handle
    } finally {
      setAcknowledging(null)
    }
  }

  const formatTimestamp = (ts: string): string => {
    const date = new Date(ts)
    const diffMs = Date.now() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  const filters = ['all', 'CRITICAL', 'WARNING', 'INFO']

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alerts</h1>
          <p className="mt-1 text-sm text-slate-500">
            {totalUnacknowledged} unacknowledged alert{totalUnacknowledged !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search alerts..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
            className="block w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
          />
        </div>

        <div className="flex gap-1 p-1 rounded-xl bg-slate-100">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => { setSeverityFilter(filter); setPage(1) }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                severityFilter === filter
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {filter === 'all' ? 'All' : filter.charAt(0) + filter.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showAcknowledged}
            onChange={(e) => { setShowAcknowledged(e.target.checked); setPage(1) }}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/40"
          />
          <span className="text-sm text-slate-600">Show acknowledged</span>
        </label>
      </div>

      {error && (
        <div className="mt-6 flex items-start gap-3 rounded-xl bg-danger-50 border border-red-200 px-4 py-3">
          <svg className="w-5 h-5 text-danger-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      {loading && (
        <div className="mt-8 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-white border border-slate-200 p-5">
              <div className="flex items-start gap-3">
                <div className="h-6 w-20 bg-slate-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-slate-200 rounded" />
                  <div className="h-3 w-full bg-slate-100 rounded" />
                  <div className="h-3 w-2/3 bg-slate-100 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && (
        <div className="mt-6 space-y-3">
          {alerts.map((alert) => {
            const sev = severityConfig[alert.severity] || severityConfig.INFO
            return (
              <div
                key={alert.id}
                className={`rounded-2xl bg-white border shadow-sm transition-colors ${
                  alert.acknowledged ? 'border-slate-200 opacity-60' : 'border-slate-200'
                } ${alert.truck ? 'hover:border-brand-300' : ''}`}
              >
                {alert.truck ? (
                  <Link href={`/trucks/${alert.truck.id}`} className="block p-5">
                    <div className="flex items-start gap-4">
                      <span className={`mt-0.5 shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${sev.bg} ${sev.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                        {alert.severity}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-sm font-semibold text-slate-900">{alert.title}</h3>
                          <time className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                            {formatTimestamp(alert.createdAt)}
                          </time>
                        </div>
                        <p className="mt-1 text-sm text-slate-600 leading-relaxed">{alert.message}</p>
                        <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                          </svg>
                          {alert.truck.make} {alert.truck.model} — {alert.truck.licensePlate}
                        </div>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <span className={`mt-0.5 shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${sev.bg} ${sev.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                        {alert.severity}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-sm font-semibold text-slate-900">{alert.title}</h3>
                          <time className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                            {formatTimestamp(alert.createdAt)}
                          </time>
                        </div>
                        <p className="mt-1 text-sm text-slate-600 leading-relaxed">{alert.message}</p>
                      </div>
                    </div>
                  </div>
                )}
                {!alert.acknowledged && (
                  <div className="px-5 pb-4 flex justify-end">
                    <button
                      onClick={(e) => { e.preventDefault(); handleAcknowledge(alert.id) }}
                      disabled={acknowledging === alert.id}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {acknowledging === alert.id ? (
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                      Acknowledge
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {alerts.length === 0 && (
            <div className="py-16 text-center">
              <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <p className="mt-3 text-sm text-slate-500">No alerts found</p>
              <p className="mt-1 text-xs text-slate-400">Try adjusting your filters.</p>
            </div>
          )}
        </div>
      )}

      {!loading && !error && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Previous
          </button>
          <span className="text-sm text-slate-500">
            Page <span className="font-medium text-slate-700">{page}</span> of{' '}
            <span className="font-medium text-slate-700">{totalPages}</span>
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
