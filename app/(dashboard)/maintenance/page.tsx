'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { fetchWithAuth } from '@/lib/api'

interface Truck {
  id: string
  licensePlate: string
  make: string
  model: string
  year: number
  vin: string
}

interface MaintenanceRecord {
  id: string
  type: string
  status: string
  scheduledDate: string
  completedDate: string | null
  cost: number | null
  vendor: string | null
  notes: string | null
  truck: {
    id: string
    licensePlate: string
    make: string
    model: string
  }
}

interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  SCHEDULED: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  IN_PROGRESS: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  CANCELLED: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
}

const typeLabels: Record<string, string> = {
  OIL_CHANGE: 'Oil Change',
  TIRE_ROTATION: 'Tire Rotation',
  BRAKE_INSPECTION: 'Brake Inspection',
  ENGINE_REPAIR: 'Engine Repair',
  TRANSMISSION: 'Transmission',
  GENERAL_INSPECTION: 'General Inspection',
  OTHER: 'Other',
}

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const formatCurrency = (amount: number | null) =>
  amount != null ? `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'

export default function MaintenancePage() {
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [selectedTruckId, setSelectedTruckId] = useState<string>('')
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [trucksLoading, setTrucksLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)

  useEffect(() => {
    fetchTrucks()
  }, [])

  useEffect(() => {
    fetchMaintenance()
  }, [statusFilter, selectedTruckId, page])

  const fetchTrucks = async () => {
    try {
      setTrucksLoading(true)
      const res = await fetchWithAuth('/api/trucks?limit=100')
      if (!res.ok) throw new Error('Failed to fetch trucks')
      const data: PaginatedResponse<Truck> = await res.json()
      setTrucks(data.data)
    } catch {
      // non-critical
    } finally {
      setTrucksLoading(false)
    }
  }

  const fetchMaintenance = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: page.toString(), limit: '20' })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (selectedTruckId) params.set('truckId', selectedTruckId)

      const res = await fetchWithAuth(`/api/maintenance?${params}`)
      if (!res.ok) throw new Error('Failed to fetch maintenance records')

      const data: PaginatedResponse<MaintenanceRecord> = await res.json()
      setRecords(data.data)
      setTotalPages(data.pagination.totalPages)
      setTotalRecords(data.pagination.total)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const selectedTruck = useMemo(
    () => trucks.find((t) => t.id === selectedTruckId),
    [trucks, selectedTruckId]
  )

  const handleTruckChange = (id: string) => {
    setSelectedTruckId(id)
    setPage(1)
  }

  const scheduleHref = selectedTruckId
    ? `/maintenance/new?truckId=${selectedTruckId}`
    : '/maintenance/new'

  const filters = ['all', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED']
  const filterLabels: Record<string, string> = {
    all: 'All',
    SCHEDULED: 'Scheduled',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
  }

  const statusSummary = useMemo(() => {
    if (!selectedTruckId) return null
    const scheduled = records.filter((r) => r.status === 'SCHEDULED').length
    const inProgress = records.filter((r) => r.status === 'IN_PROGRESS').length
    const completed = records.filter((r) => r.status === 'COMPLETED').length
    const totalCost = records.reduce((s, r) => s + (r.cost || 0), 0)
    return { scheduled, inProgress, completed, totalCost }
  }, [records, selectedTruckId])

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Maintenance</h1>
          <p className="mt-1 text-sm text-slate-500">
            {selectedTruck
              ? `${selectedTruck.make} ${selectedTruck.model} — ${selectedTruck.licensePlate}`
              : `${totalRecords} records across fleet`}
          </p>
        </div>
        <Link
          href={scheduleHref}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Schedule Maintenance
        </Link>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <select
          value={selectedTruckId}
          onChange={(e) => handleTruckChange(e.target.value)}
          disabled={trucksLoading}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors min-w-[220px]"
        >
          <option value="">All Trucks</option>
          {trucks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.make} {t.model} — {t.licensePlate}
            </option>
          ))}
        </select>

        <div className="flex gap-1 p-1 rounded-xl bg-slate-100">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => { setStatusFilter(filter); setPage(1) }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                statusFilter === filter
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {filterLabels[filter]}
            </button>
          ))}
        </div>
      </div>

      {selectedTruck && (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{selectedTruck.make} {selectedTruck.model} ({selectedTruck.year})</p>
            <p className="text-xs text-slate-500">{selectedTruck.licensePlate} · {selectedTruck.vin}</p>
          </div>
          <Link href={`/trucks/${selectedTruck.id}`} className="ml-auto text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors">
            View Truck →
          </Link>
        </div>
      )}

      {selectedTruck && statusSummary && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Scheduled', value: statusSummary.scheduled, color: 'text-blue-600' },
            { label: 'In Progress', value: statusSummary.inProgress, color: 'text-amber-600' },
            { label: 'Completed', value: statusSummary.completed, color: 'text-emerald-600' },
            { label: 'Total Cost', value: formatCurrency(statusSummary.totalCost > 0 ? statusSummary.totalCost : null), color: 'text-slate-900' },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{s.label}</p>
              <p className={`mt-2 text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

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
              <div className="h-4 w-24 bg-slate-100 rounded" />
              <div className="h-6 w-20 bg-slate-200 rounded-full" />
              <div className="h-4 w-24 bg-slate-100 rounded" />
              <div className="h-4 w-16 bg-slate-100 rounded" />
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
                  {!selectedTruckId && (
                    <th scope="col" className="py-3 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Truck</th>
                  )}
                  <th scope="col" className={`${selectedTruckId ? 'pl-5 pr-3' : 'px-3'} py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500`}>Type</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Scheduled</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Cost</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Vendor</th>
                  <th scope="col" className="relative py-3 pl-3 pr-5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((record) => {
                  const status = statusConfig[record.status] || statusConfig.SCHEDULED
                  return (
                    <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                      {!selectedTruckId && (
                        <td className="whitespace-nowrap py-4 pl-5 pr-3">
                          <button onClick={() => handleTruckChange(record.truck.id)} className="text-left group">
                            <div className="font-medium text-slate-900 group-hover:text-brand-600 transition-colors">
                              {record.truck.make} {record.truck.model}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">{record.truck.licensePlate}</div>
                          </button>
                        </td>
                      )}
                      <td className={`whitespace-nowrap ${selectedTruckId ? 'pl-5 pr-3' : 'px-3'} py-4 text-sm text-slate-600`}>
                        {typeLabels[record.type] || record.type}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.bg} ${status.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {record.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                        {formatDate(record.scheduledDate)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 tabular-nums">
                        {formatCurrency(record.cost)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                        {record.vendor || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="whitespace-nowrap py-4 pl-3 pr-5 text-right">
                        <Link
                          href={`/maintenance/${record.id}`}
                          className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                })}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={selectedTruckId ? 6 : 7} className="py-16 text-center">
                      <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384 5.384a2.625 2.625 0 01-3.712-3.712l5.384-5.384m0 0L11.42 15.17m-4.714-4.714a2.625 2.625 0 013.712-3.712l5.384 5.384m0 0l-5.384 5.384" />
                      </svg>
                      <p className="mt-3 text-sm text-slate-500">No maintenance records found</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {selectedTruckId ? 'No records for this truck.' : 'Try adjusting your filters or schedule new maintenance.'}
                      </p>
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
