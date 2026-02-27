'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { handleAuthResponse } from '@/lib/api'

interface TripStop {
  type: 'PICKUP' | 'DROPOFF'
  address: string
  lat: number
  lng: number
  notes?: string
  sequence?: number
}

interface Trip {
  id: string
  status: string
  originAddress: string
  destinationAddress: string
  scheduledStart: string
  scheduledEnd: string | null
  actualStart: string | null
  actualEnd: string | null
  truck: { id: string; make: string; model: string; licensePlate: string }
  driver: { id: string; name: string }
  stops?: TripStop[]
}

interface PaginatedResponse {
  data: Trip[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

interface TruckOption {
  id: string
  make: string
  model: string
  licensePlate: string
}

interface DriverOption {
  id: string
  name: string
}

interface ScheduleForm {
  truckId: string
  driverId: string
  originAddress: string
  originLat: string
  originLng: string
  destinationAddress: string
  destinationLat: string
  destinationLng: string
  scheduledStart: string
  scheduledEnd: string
  notes: string
}

interface StopForm {
  type: 'PICKUP' | 'DROPOFF'
  address: string
  lat: string
  lng: string
  notes: string
}

const emptyForm: ScheduleForm = {
  truckId: '',
  driverId: '',
  originAddress: '',
  originLat: '',
  originLng: '',
  destinationAddress: '',
  destinationLat: '',
  destinationLng: '',
  scheduledStart: '',
  scheduledEnd: '',
  notes: '',
}

const emptyStop: StopForm = { type: 'PICKUP', address: '', lat: '', lng: '', notes: '' }

const errorMessages: Record<string, string> = {
  TRUCK_NOT_AVAILABLE: 'The selected truck is not available for this time period.',
  DRIVER_NOT_AVAILABLE: 'The selected driver is not available for this time period.',
}

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  SCHEDULED: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  IN_PROGRESS: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
}

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<ScheduleForm>(emptyForm)
  const [useMultiStop, setUseMultiStop] = useState(false)
  const [stops, setStops] = useState<StopForm[]>([])
  const [optimizing, setOptimizing] = useState(false)
  const [trucks, setTrucks] = useState<TruckOption[]>([])
  const [drivers, setDrivers] = useState<DriverOption[]>([])
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchTrips()
  }, [statusFilter, searchQuery, page])

  const fetchTrips = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (statusFilter !== 'all') params.set('status', statusFilter.toUpperCase())
      if (searchQuery) params.set('search', searchQuery)

      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/trips?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!handleAuthResponse(response)) return
      if (!response.ok) throw new Error('Failed to fetch trips')

      const data: PaginatedResponse = await response.json()
      setTrips(data.data)
      setTotalPages(data.pagination.totalPages)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const openModal = useCallback(async () => {
    setModalOpen(true)
    setForm(emptyForm)
    setStops([])
    setUseMultiStop(false)
    setModalError(null)
    setModalLoading(true)
    const token = localStorage.getItem('accessToken')
    const headers = { Authorization: `Bearer ${token}` }
    try {
      const [trucksRes, driversRes] = await Promise.all([
        fetch('/api/trucks?limit=100', { headers }),
        fetch('/api/drivers?status=available&limit=100', { headers }),
      ])
      if (!handleAuthResponse(trucksRes) || !handleAuthResponse(driversRes)) return
      if (!trucksRes.ok || !driversRes.ok) throw new Error('Failed to load form data')
      const trucksData = await trucksRes.json()
      const driversData = await driversRes.json()
      setTrucks(trucksData.data ?? trucksData)
      setDrivers(driversData.data ?? driversData)
    } catch {
      setModalError('Failed to load trucks or drivers.')
    } finally {
      setModalLoading(false)
    }
  }, [])

  const addStop = (type: 'PICKUP' | 'DROPOFF') =>
    setStops((s) => [...s, { ...emptyStop, type }])

  const removeStop = (idx: number) =>
    setStops((s) => s.filter((_, i) => i !== idx))

  const updateStop = (idx: number, field: keyof StopForm, value: string) =>
    setStops((s) => s.map((x, i) => (i === idx ? { ...x, [field]: value } : x)))

  const handleOptimize = async () => {
    const valid = stops.filter((s) => s.address)
    if (valid.length < 2) {
      setModalError('Add at least 2 stops with address and coordinates to optimize.')
      return
    }
    setOptimizing(true)
    setModalError(null)
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/trips/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          stops: valid.map((s) => {
            const lat = parseFloat(s.lat)
            const lng = parseFloat(s.lng)
            return {
              type: s.type,
              address: s.address,
              lat: !isNaN(lat) ? lat : undefined,
              lng: !isNaN(lng) ? lng : undefined,
              notes: s.notes || undefined,
            }
          }),
        }),
      })
      if (!handleAuthResponse(res)) return
      if (!res.ok) throw new Error('Failed to optimize route')
      const { stops: optimized } = await res.json()
      setStops(
        optimized.map((o: { type: string; address: string; lat: number; lng: number; notes?: string }) => ({
          type: o.type as 'PICKUP' | 'DROPOFF',
          address: o.address,
          lat: String(o.lat),
          lng: String(o.lng),
          notes: o.notes || '',
        }))
      )
    } catch {
      setModalError('Failed to optimize route. Check that all stops have valid coordinates.')
    } finally {
      setOptimizing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setModalError(null)
    try {
      const token = localStorage.getItem('accessToken')
      let body: Record<string, unknown>

      if (useMultiStop && stops.length >= 2) {
        const validStops = stops.filter((s) => s.address)
        if (validStops.length < 2) {
          setModalError('Add at least 2 stops with address and coordinates.')
          setSubmitting(false)
          return
        }
        body = {
          truckId: form.truckId,
          driverId: form.driverId,
          stops: validStops.map((s) => {
            const lat = parseFloat(s.lat)
            const lng = parseFloat(s.lng)
            return {
              type: s.type,
              address: s.address,
              lat: !isNaN(lat) ? lat : undefined,
              lng: !isNaN(lng) ? lng : undefined,
              notes: s.notes || undefined,
            }
          }),
          scheduledStart: new Date(form.scheduledStart).toISOString(),
        }
      } else {
        let originAddr = form.originAddress
        let originLat = form.originLat
        let originLng = form.originLng
        let destAddr = form.destinationAddress
        let destLat = form.destinationLat
        let destLng = form.destinationLng
        if (useMultiStop && stops.length === 1) {
          originAddr = stops[0].address
          originLat = stops[0].lat
          originLng = stops[0].lng
          destAddr = stops[0].address
          destLat = stops[0].lat
          destLng = stops[0].lng
        }
        body = {
          truckId: form.truckId,
          driverId: form.driverId,
          originAddress: originAddr,
          originLat: parseFloat(originLat),
          originLng: parseFloat(originLng),
          destinationAddress: destAddr,
          destinationLat: parseFloat(destLat),
          destinationLng: parseFloat(destLng),
          scheduledStart: new Date(form.scheduledStart).toISOString(),
        }
      }
      if (form.scheduledEnd) body.scheduledEnd = new Date(form.scheduledEnd).toISOString()
      if (form.notes) body.notes = form.notes

      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      if (!handleAuthResponse(res)) return
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        const code = err?.code || err?.error?.code || ''
        throw new Error(errorMessages[code] || err?.error || err?.message || 'Failed to schedule trip')
      }
      setModalOpen(false)
      fetchTrips()
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const updateField = (field: keyof ScheduleForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const filters = ['all', 'scheduled', 'in_progress', 'completed', 'cancelled']

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Trips</h1>
          <p className="mt-1 text-sm text-slate-500">Manage scheduled and active trips</p>
        </div>
        <button
          type="button"
          onClick={openModal}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Schedule Trip
        </button>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search by origin, destination, driver..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
          />
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-slate-100 overflow-x-auto">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => { setStatusFilter(filter); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                statusFilter === filter
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {filter.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-6 flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
          <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading && (
        <div className="mt-8 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-white border border-slate-200 p-5 flex gap-6">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-slate-200 rounded" />
                <div className="h-3 w-32 bg-slate-100 rounded" />
              </div>
              <div className="h-6 w-24 bg-slate-200 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {!loading && !error && (
        <div className="mt-6 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="bg-slate-50/80">
                <th scope="col" className="py-3 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Route</th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Truck</th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Driver</th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Schedule</th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                <th scope="col" className="relative py-3 pl-3 pr-5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trips.map((trip) => {
                const status = statusConfig[trip.status] || statusConfig.SCHEDULED
                return (
                  <tr key={trip.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 pl-5 pr-3">
                      <div className="flex items-start gap-2">
                        <div className="mt-1 flex flex-col items-center gap-0.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="w-px h-4 bg-slate-300" />
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-slate-900 truncate max-w-[220px]">{trip.originAddress}</p>
                          <p className="text-sm text-slate-500 truncate max-w-[220px] mt-1">
                            {trip.stops && trip.stops.length > 2
                              ? `${trip.stops.length} stops → ${trip.destinationAddress}`
                              : trip.destinationAddress}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      {trip.truck ? (
                        <Link href={`/trucks/${trip.truck.id}`} className="text-brand-600 hover:text-brand-700 transition-colors">
                          <div>{trip.truck.make} {trip.truck.model}</div>
                          <div className="text-xs text-slate-500">{trip.truck.licensePlate}</div>
                        </Link>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      {trip.driver ? (
                        <Link href={`/drivers/${trip.driver.id}`} className="flex items-center gap-2 group">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {trip.driver.name.charAt(0)}
                          </div>
                          <span className="text-slate-700 group-hover:text-brand-600 transition-colors">{trip.driver.name}</span>
                        </Link>
                      ) : (
                        <span className="text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                      <div>{formatDate(trip.scheduledStart)}</div>
                      <div className="text-xs text-slate-400">{formatTime(trip.scheduledStart)}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.bg} ${status.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {trip.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-4 pl-3 pr-5 text-right">
                      <Link href={`/trips/${trip.id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
                        View
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {trips.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                    </svg>
                    <p className="mt-3 text-sm text-slate-500">No trips found</p>
                    <p className="mt-1 text-xs text-slate-400">Schedule a new trip to get started.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900">Schedule Trip</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {modalError && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
                {modalError}
              </div>
            )}

            {modalLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Truck</label>
                    <select
                      required
                      value={form.truckId}
                      onChange={(e) => updateField('truckId', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                    >
                      <option value="">Select a truck</option>
                      {trucks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.make} {t.model} — {t.licensePlate}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Driver</label>
                    <select
                      required
                      value={form.driverId}
                      onChange={(e) => updateField('driverId', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                    >
                      <option value="">Select a driver</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 p-1 rounded-xl bg-slate-100">
                  <button
                    type="button"
                    onClick={() => setUseMultiStop(false)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${!useMultiStop ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Single trip (A → B)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseMultiStop(true)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${useMultiStop ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Multi-stop (pickups & dropoffs)
                  </button>
                </div>

                {!useMultiStop ? (
                  <>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 mb-3">Origin</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
                          <input
                            type="text"
                            required
                            value={form.originAddress}
                            onChange={(e) => updateField('originAddress', e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                          />
                        </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Latitude <span className="text-slate-400 font-normal">(optional)</span></label>
                        <input
                          type="number"
                          step="any"
                          value={form.originLat}
                          onChange={(e) => updateField('originLat', e.target.value)}
                          placeholder="e.g. 18.4386"
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Longitude <span className="text-slate-400 font-normal">(optional)</span></label>
                        <input
                          type="number"
                          step="any"
                          value={form.originLng}
                          onChange={(e) => updateField('originLng', e.target.value)}
                          placeholder="e.g. 79.1288"
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                        />
                      </div>
                    </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 mb-3">Destination</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
                          <input
                            type="text"
                            required
                            value={form.destinationAddress}
                            onChange={(e) => updateField('destinationAddress', e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                          />
                        </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Latitude <span className="text-slate-400 font-normal">(optional)</span></label>
                        <input
                          type="number"
                          step="any"
                          value={form.destinationLat}
                          onChange={(e) => updateField('destinationLat', e.target.value)}
                          placeholder="e.g. 17.9689"
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Longitude <span className="text-slate-400 font-normal">(optional)</span></label>
                        <input
                          type="number"
                          step="any"
                          value={form.destinationLng}
                          onChange={(e) => updateField('destinationLng', e.target.value)}
                          placeholder="e.g. 79.5941"
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                        />
                      </div>
                    </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-800">Stops (pickups & dropoffs)</h3>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => addStop('PICKUP')}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Add Pickup
                        </button>
                        <button
                          type="button"
                          onClick={() => addStop('DROPOFF')}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full bg-red-500" /> Add Drop-off
                        </button>
                        {stops.length >= 2 && (
                          <button
                            type="button"
                            onClick={handleOptimize}
                            disabled={optimizing}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-300 bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-50 transition-colors"
                          >
                            {optimizing ? 'Optimizing…' : 'Optimize route'}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {stops.length === 0 ? (
                        <p className="text-sm text-slate-500 py-4 text-center">Add at least 2 stops. Click &quot;Optimize route&quot; to find the best order.</p>
                      ) : (
                        stops.map((stop, idx) => (
                          <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${stop.type === 'PICKUP' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {idx + 1}. {stop.type}
                              </span>
                              <button type="button" onClick={() => removeStop(idx)} className="text-slate-400 hover:text-red-600 text-sm">
                                Remove
                              </button>
                            </div>
                            <input
                              type="text"
                              placeholder="Address"
                              value={stop.address}
                              onChange={(e) => updateStop(idx, 'address', e.target.value)}
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                step="any"
                                placeholder="Lat (optional, for route optimization)"
                                value={stop.lat}
                                onChange={(e) => updateStop(idx, 'lat', e.target.value)}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                              />
                              <input
                                type="number"
                                step="any"
                                placeholder="Lng (optional)"
                                value={stop.lng}
                                onChange={(e) => updateStop(idx, 'lng', e.target.value)}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Scheduled Start</label>
                    <input
                      type="datetime-local"
                      required
                      value={form.scheduledStart}
                      onChange={(e) => updateField('scheduledStart', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Scheduled End <span className="text-slate-400 font-normal">(optional)</span></label>
                    <input
                      type="datetime-local"
                      value={form.scheduledEnd}
                      onChange={(e) => updateField('scheduledEnd', e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? 'Scheduling…' : 'Schedule Trip'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
