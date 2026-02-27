'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { litersToGallons } from '@/lib/format'
import { handleAuthResponse } from '@/lib/api'

interface Truck {
  id: string
  name: string | null
  vin: string
  licensePlate: string
  make: string
  model: string
  year: number
  status: string
  currentDriver: {
    id: string
    name: string
  } | null
  truckStatus: {
    fuelLevel: number | null
    lastPingAt: string
    speed: number
    latitude: number
    longitude: number
  } | null
  maintenanceRecords: Array<{
    id: string
    type: string
    scheduledDate: string
  }>
  idleMinutes: number | null
  mileage?: number
}

interface PaginatedResponse {
  data: Truck[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  ACTIVE: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  IDLE: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  MAINTENANCE: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  BLOCKED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  INACTIVE: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
}

const MAKES = ['Freightliner', 'Peterbilt', 'Kenworth', 'Volvo', 'Mack', 'International'] as const

type AddFormState = {
  name: string
  vin: string
  licensePlate: string
  make: (typeof MAKES)[number]
  model: string
  year: number
  fuelTankCapacityGallons: string
  initialFuelLevel: string
  latitude: string
  longitude: string
}

const VALID_STATUS_FILTERS = ['all', 'moving', 'idle', 'maintenance', 'alert']

export default function TrucksPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const statusFromUrl = searchParams.get('status')
  const initialStatus = statusFromUrl && VALID_STATUS_FILTERS.includes(statusFromUrl) ? statusFromUrl : 'all'

  const [trucks, setTrucks] = useState<Truck[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState<AddFormState>({ name: '', vin: '', licensePlate: '', make: MAKES[0], model: '', year: new Date().getFullYear(), fuelTankCapacityGallons: '', initialFuelLevel: '', latitude: '', longitude: '' })
  const [addError, setAddError] = useState<string | null>(null)
  const [addSubmitting, setAddSubmitting] = useState(false)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const deliveryBucket = searchParams.get('deliveryBucket')
  const mileageBucket = searchParams.get('mileageBucket')

  useEffect(() => {
    const urlStatus = searchParams.get('status')
    const newFilter = urlStatus && VALID_STATUS_FILTERS.includes(urlStatus) ? urlStatus : 'all'
    setStatusFilter(newFilter)
  }, [searchParams])

  useEffect(() => {
    fetchTrucks()
  }, [statusFilter, searchQuery, page, deliveryBucket, mileageBucket])

  const fetchTrucks = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        status: statusFilter,
        search: searchQuery,
        page: page.toString(),
        limit: '20',
      })
      if (deliveryBucket) params.set('deliveryBucket', deliveryBucket)
      if (mileageBucket) params.set('mileageBucket', mileageBucket)

      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/trucks?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!handleAuthResponse(response)) return
      if (!response.ok) throw new Error('Failed to fetch trucks')

      const data: PaginatedResponse = await response.json()
      setTrucks(data.data)
      setTotalPages(data.pagination.totalPages)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getFuelColor = (level: number | null) => {
    if (!level) return 'bg-slate-200'
    if (level > 50) return 'bg-emerald-500'
    if (level > 25) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const formatLastSeen = (timestamp: string | null): string => {
    if (!timestamp) return 'Never'
    const diffMinutes = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000)
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return `${Math.floor(diffHours / 24)}d ago`
  }

  const formatIdleTime = (minutes: number | null): string => {
    if (!minutes) return '-'
    if (minutes < 60) return `${minutes}m`
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
  }

  const handleAddTruck = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError(null)
    setAddSubmitting(true)
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/trucks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...addForm,
          name: addForm.name.trim() || null,
          fuelTankCapacityGallons: addForm.fuelTankCapacityGallons ? Math.round(litersToGallons(parseFloat(addForm.fuelTankCapacityGallons))) : null,
          initialFuelLevel: addForm.initialFuelLevel ? parseInt(addForm.initialFuelLevel, 10) : null,
          latitude: addForm.latitude ? parseFloat(addForm.latitude) : null,
          longitude: addForm.longitude ? parseFloat(addForm.longitude) : null,
        }),
      })
      if (!handleAuthResponse(res)) return
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || `Failed to add truck (${res.status})`)
      }
      setShowAddModal(false)
      setAddForm({ name: '', vin: '', licensePlate: '', make: MAKES[0], model: '', year: new Date().getFullYear(), fuelTankCapacityGallons: '', initialFuelLevel: '', latitude: '', longitude: '' })
      fetchTrucks()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setAddSubmitting(false)
    }
  }

  const handleDeleteTruck = async (id: string) => {
    setDeletingId(id)
    setDeleteError(null)
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`/api/trucks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!handleAuthResponse(res)) return
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || `Failed to delete truck (${res.status})`)
      }
      setConfirmDeleteId(null)
      fetchTrucks()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setDeletingId(null)
    }
  }

  const filters = ['all', 'moving', 'idle', 'maintenance', 'alert']

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Trucks</h1>
          <p className="mt-1 text-sm text-slate-500">
            {trucks.length} vehicles in your fleet
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setShowAddModal(true); setAddError(null) }}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Truck
        </button>
      </div>

      {/* Bucket filter indicator */}
      {(deliveryBucket || mileageBucket) && (
        <div className="mt-6 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-500">Filtered by:</span>
          {deliveryBucket && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
              Deliveries: {deliveryBucket}
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString())
                  params.delete('deliveryBucket')
                  router.push(params.toString() ? `/trucks?${params}` : '/trucks')
                }}
                className="hover:text-brand-900"
              >
                ×
              </button>
            </span>
          )}
          {mileageBucket && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
              Mileage: {mileageBucket}
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString())
                  params.delete('mileageBucket')
                  router.push(params.toString() ? `/trucks?${params}` : '/trucks')
                }}
                className="hover:text-brand-900"
              >
                ×
              </button>
            </span>
          )}
          <Link
            href="/trucks"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Clear all
          </Link>
        </div>
      )}

      {/* Filters bar */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search by VIN, plate, make, or model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
          />
        </div>

        <div className="flex gap-1 p-1 rounded-xl bg-slate-100">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                statusFilter === filter
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-6 flex items-start gap-3 rounded-xl bg-danger-50 border border-red-200 px-4 py-3">
          <svg className="w-5 h-5 text-danger-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-white border border-slate-200 p-5">
              <div className="flex items-start justify-between">
                <div className="h-5 w-32 bg-slate-200 rounded" />
                <div className="h-6 w-16 bg-slate-200 rounded-full" />
              </div>
              <div className="mt-3 h-4 w-24 bg-slate-100 rounded" />
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="h-10 bg-slate-100 rounded-lg" />
                <div className="h-10 bg-slate-100 rounded-lg" />
                <div className="h-10 bg-slate-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trucks table */}
      {!loading && !error && (
        <div className="mt-6 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="bg-slate-50/80">
                <th scope="col" className="py-3 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Truck
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Driver
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Fuel
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Mileage
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Last Seen
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Idle Time
                </th>
                <th scope="col" className="relative py-3 pl-3 pr-5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trucks.map((truck) => {
                const status = statusConfig[truck.status] || statusConfig.INACTIVE
                return (
                  <tr key={truck.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="whitespace-nowrap py-4 pl-5 pr-3">
                      <Link href={`/trucks/${truck.id}`} className="group">
                        <div className="font-medium text-slate-900 group-hover:text-brand-600 transition-colors">
                          {truck.name || `${truck.make} ${truck.model}`}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{truck.licensePlate}</div>
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      {truck.currentDriver ? (
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {truck.currentDriver.name.charAt(0)}
                          </div>
                          <span className="text-slate-700">{truck.currentDriver.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">Unassigned</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.bg} ${status.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {truck.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getFuelColor(truck.truckStatus?.fuelLevel ?? 0)}`}
                            style={{ width: `${Math.min(100, Math.max(0, truck.truckStatus?.fuelLevel ?? 0))}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-600 tabular-nums">{Math.round(truck.truckStatus?.fuelLevel ?? 0)}%</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 tabular-nums">
                      {truck.mileage != null
                        ? `${truck.mileage.toLocaleString()} mi`
                        : '-'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                      {formatLastSeen(truck.truckStatus?.lastPingAt || null)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                      {truck.status === 'IDLE' ? formatIdleTime(truck.idleMinutes) : '-'}
                    </td>
                    <td className="whitespace-nowrap py-4 pl-3 pr-5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {confirmDeleteId === truck.id ? (
                          <span className="flex items-center gap-2">
                            {deleteError && <span className="text-xs text-red-600">{deleteError}</span>}
                            <button
                              onClick={() => handleDeleteTruck(truck.id)}
                              disabled={deletingId === truck.id}
                              className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                            >
                              {deletingId === truck.id ? 'Deleting...' : 'Confirm'}
                            </button>
                            <button
                              onClick={() => { setConfirmDeleteId(null); setDeleteError(null) }}
                              className="text-xs font-medium text-slate-500 hover:text-slate-700"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => { setConfirmDeleteId(truck.id); setDeleteError(null) }}
                            className="text-slate-400 hover:text-red-600 transition-colors"
                            title="Delete truck"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        )}
                        <Link
                          href={`/trucks/${truck.id}`}
                          className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {trucks.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                    </svg>
                    <p className="mt-3 text-sm text-slate-500">No trucks found</p>
                    <p className="mt-1 text-xs text-slate-400">Try adjusting your filters or add a new truck.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
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

      {/* Add Truck Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-900">Add Truck</h2>
            <form onSubmit={handleAddTruck} className="mt-5 space-y-4">
              {addError && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {addError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Name <span className="text-slate-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="e.g. Big Red"
                  className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">VIN</label>
                <input
                  type="text"
                  required
                  value={addForm.vin}
                  onChange={(e) => setAddForm({ ...addForm, vin: e.target.value })}
                  className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">License Plate</label>
                <input
                  type="text"
                  required
                  value={addForm.licensePlate}
                  onChange={(e) => setAddForm({ ...addForm, licensePlate: e.target.value })}
                  className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Make</label>
                  <select
                    value={addForm.make}
                    onChange={(e) => setAddForm({ ...addForm, make: e.target.value as (typeof MAKES)[number] })}
                    className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                  >
                    {MAKES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Model</label>
                  <input
                    type="text"
                    required
                    value={addForm.model}
                    onChange={(e) => setAddForm({ ...addForm, model: e.target.value })}
                    className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Year</label>
                <input
                  type="number"
                  required
                  value={addForm.year}
                  onChange={(e) => setAddForm({ ...addForm, year: parseInt(e.target.value) || new Date().getFullYear() })}
                  className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Fuel Tank Capacity <span className="text-slate-400 font-normal">(L, optional)</span></label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={addForm.fuelTankCapacityGallons}
                    onChange={(e) => setAddForm({ ...addForm, fuelTankCapacityGallons: e.target.value })}
                    placeholder="e.g. 568"
                    className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Current Fuel Level <span className="text-slate-400 font-normal">(%, optional)</span></label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={addForm.initialFuelLevel}
                    onChange={(e) => setAddForm({ ...addForm, initialFuelLevel: e.target.value })}
                    placeholder="e.g. 75"
                    className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Latitude <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={addForm.latitude}
                    onChange={(e) => setAddForm({ ...addForm, latitude: e.target.value })}
                    placeholder="e.g. 37.7749"
                    className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Longitude <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={addForm.longitude}
                    onChange={(e) => setAddForm({ ...addForm, longitude: e.target.value })}
                    placeholder="e.g. -122.4194"
                    className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSubmitting}
                  className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {addSubmitting ? 'Adding...' : 'Add Truck'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
