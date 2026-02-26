'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

interface FuelLog {
  id: string
  gallons: number
  pricePerGallon: number
  totalCost: number
  station: string | null
  odometer: number | null
  date: string
  truck: {
    id: string
    licensePlate: string
    make: string
    model: string
  }
}

interface FuelStats {
  totalGallons: number
  totalCost: number
  avgPricePerGallon: number
}

interface PaginatedResponse {
  data: FuelLog[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function FuelPage() {
  const [logs, setLogs] = useState<FuelLog[]>([])
  const [stats, setStats] = useState<FuelStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [truckFilter, setTruckFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [truckFilter, startDate, endDate, page])

  const getHeaders = () => {
    const token = localStorage.getItem('accessToken')
    return { Authorization: `Bearer ${token}` }
  }

  const fetchStats = async () => {
    try {
      setStatsLoading(true)
      const response = await fetch('/api/fuel/stats', { headers: getHeaders() })
      if (!response.ok) throw new Error('Failed to fetch fuel stats')
      const data = await response.json()
      setStats(data)
    } catch {
      // Stats are non-critical
    } finally {
      setStatsLoading(false)
    }
  }

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: page.toString(), limit: '20' })
      if (truckFilter) params.set('truckId', truckFilter)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)

      const response = await fetch(`/api/fuel?${params}`, { headers: getHeaders() })
      if (!response.ok) throw new Error('Failed to fetch fuel logs')

      const data: PaginatedResponse = await response.json()
      setLogs(data.data)
      setTotalPages(data.pagination.totalPages)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const statCards = [
    {
      label: 'Total Gallons',
      value: stats ? stats.totalGallons.toLocaleString('en-US', { maximumFractionDigits: 1 }) : '-',
      icon: (
        <svg className="w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
        </svg>
      ),
      iconBg: 'bg-brand-50',
    },
    {
      label: 'Total Cost',
      value: stats ? formatCurrency(stats.totalCost) : '-',
      icon: (
        <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: 'bg-emerald-50',
    },
    {
      label: 'Avg Price/Gallon',
      value: stats ? formatCurrency(stats.avgPricePerGallon) : '-',
      icon: (
        <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
      iconBg: 'bg-amber-50',
    },
  ]

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fuel Management</h1>
          <p className="mt-1 text-sm text-slate-500">Track fuel consumption and costs</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            {statsLoading ? (
              <div className="animate-pulse">
                <div className="h-4 w-20 bg-slate-200 rounded mb-3" />
                <div className="h-8 w-24 bg-slate-200 rounded" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{card.label}</p>
                  <div className={`w-8 h-8 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                    {card.icon}
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-900 tabular-nums">{card.value}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Filter by truck ID..."
            value={truckFilter}
            onChange={(e) => { setTruckFilter(e.target.value); setPage(1) }}
            className="block w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
          />
        </div>
        <input
          type="date"
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
          placeholder="Start date"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
          placeholder="End date"
        />
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
        <div className="mt-8 animate-pulse rounded-2xl bg-white border border-slate-200 overflow-hidden">
          <div className="h-12 bg-slate-50/80" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-t border-slate-100">
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-4 w-16 bg-slate-100 rounded" />
              <div className="h-4 w-16 bg-slate-100 rounded" />
              <div className="h-4 w-20 bg-slate-100 rounded" />
              <div className="h-4 w-28 bg-slate-100 rounded" />
              <div className="h-4 w-20 bg-slate-100 rounded" />
              <div className="h-4 w-24 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      )}

      {!loading && !error && (
        <div className="mt-6 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="bg-slate-50/80">
                  <th scope="col" className="py-3 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Truck</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Gallons</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Price/Gal</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Total Cost</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Station</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Odometer</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                  <th scope="col" className="relative py-3 pl-3 pr-5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="whitespace-nowrap py-4 pl-5 pr-3">
                      <Link href={`/trucks/${log.truck.id}`} className="group">
                        <div className="font-medium text-slate-900 group-hover:text-brand-600 transition-colors">
                          {log.truck.make} {log.truck.model}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{log.truck.licensePlate}</div>
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 tabular-nums">
                      {log.gallons.toFixed(1)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 tabular-nums">
                      {formatCurrency(log.pricePerGallon)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-slate-900 tabular-nums">
                      {formatCurrency(log.totalCost)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                      {log.station || <span className="text-slate-400">-</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 tabular-nums">
                      {log.odometer != null ? log.odometer.toLocaleString() : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                      {formatDate(log.date)}
                    </td>
                    <td className="whitespace-nowrap py-4 pl-3 pr-5 text-right">
                      <Link
                        href={`/fuel/${log.id}`}
                        className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
                      </svg>
                      <p className="mt-3 text-sm text-slate-500">No fuel logs found</p>
                      <p className="mt-1 text-xs text-slate-400">Try adjusting your filters or add a fuel log.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
