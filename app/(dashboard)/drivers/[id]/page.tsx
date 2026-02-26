'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Driver {
  id: string
  name: string
  licenseNumber: string
  licenseExpiry: string
  phone: string
  status: string
  assignedTrucks: Array<{
    id: string
    vin: string
    licensePlate: string
    make: string
    model: string
    year: number
  }>
  trips: Array<{
    id: string
    status: string
    scheduledStart: string
    destinationAddress: string
    truck: {
      id: string
      vin: string
      licensePlate: string
      make: string
      model: string
    }
  }>
  performanceStats: {
    totalTrips: number
    onTimeTrips: number
    avgDeliveryTime: number
  }
  licenseExpiryAlert: boolean
  daysUntilLicenseExpiry: number
}

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  AVAILABLE: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  ON_TRIP: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  OFF_DUTY: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  SUSPENDED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  SCHEDULED: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  IN_PROGRESS: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
}

interface TruckOption {
  id: string
  make: string
  model: string
  licensePlate: string
  status: string
}

export default function DriverDetailPage() {
  const params = useParams()
  const driverId = params?.id as string

  const [driver, setDriver] = useState<Driver | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [trucks, setTrucks] = useState<TruckOption[]>([])
  const [selectedTruckId, setSelectedTruckId] = useState('')
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)

  useEffect(() => {
    if (driverId) fetchDriver()
  }, [driverId])

  const fetchDriver = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/drivers/${driverId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) throw new Error('Failed to fetch driver')

      const data: Driver = await response.json()
      setDriver(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const openAssignModal = async () => {
    setAssignModalOpen(true)
    setAssignError(null)
    setSelectedTruckId('')
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/trucks?limit=100&status=all', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setTrucks((data.data || []).filter((t: TruckOption) => t.status === 'ACTIVE'))
      }
    } catch {}
  }

  const handleAssign = async () => {
    if (!selectedTruckId) return
    setAssignLoading(true)
    setAssignError(null)
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`/api/trucks/${selectedTruckId}/assign`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId }),
      })
      if (!res.ok) {
        const data = await res.json()
        setAssignError(data.error || 'Failed to assign truck')
        return
      }
      setAssignModalOpen(false)
      fetchDriver()
    } catch {
      setAssignError('An unexpected error occurred')
    } finally {
      setAssignLoading(false)
    }
  }

  const handleUnassign = async (truckId: string) => {
    try {
      const token = localStorage.getItem('accessToken')
      await fetch(`/api/trucks/${truckId}/assign`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: null }),
      })
      fetchDriver()
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          <span className="text-sm text-slate-500">Loading driver profile...</span>
        </div>
      </div>
    )
  }

  if (error || !driver) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-danger-50 border border-red-200 px-5 py-4">
        <svg className="w-5 h-5 text-danger-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
        </svg>
        <p className="text-sm text-danger-700">{error || 'Driver not found'}</p>
      </div>
    )
  }

  const status = statusConfig[driver.status] || statusConfig.OFF_DUTY
  const onTimeRate = driver.performanceStats.totalTrips > 0
    ? Math.round((driver.performanceStats.onTimeTrips / driver.performanceStats.totalTrips) * 100)
    : 0

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/drivers" className="hover:text-brand-600 transition-colors">Drivers</Link>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-slate-900 font-medium">{driver.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {driver.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{driver.name}</h1>
            <p className="mt-1 text-sm text-slate-500">
              License: {driver.licenseNumber} &middot; {driver.phone}
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-sm font-medium ${status.bg} ${status.text}`}>
          <span className={`w-2 h-2 rounded-full ${status.dot}`} />
          {driver.status.replace('_', ' ')}
        </span>
      </div>

      {/* License expiry alert */}
      {driver.licenseExpiryAlert && (
        <div className="mb-8 flex items-start gap-3 rounded-2xl bg-warning-50 border border-amber-200 px-5 py-4">
          <svg className="w-5 h-5 text-warning-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-warning-700">License expiring soon</p>
            <p className="mt-0.5 text-sm text-amber-600">
              Expires in {driver.daysUntilLicenseExpiry} days ({new Date(driver.licenseExpiry).toLocaleDateString()})
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Trips</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 tabular-nums">{driver.performanceStats.totalTrips}</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">On-Time Rate</p>
          <div className="mt-2 flex items-end gap-2">
            <p className="text-3xl font-bold text-slate-900 tabular-nums">{onTimeRate}%</p>
            {onTimeRate >= 90 && (
              <span className="mb-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Excellent</span>
            )}
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Avg Delivery Time</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 tabular-nums">
            {driver.performanceStats.avgDeliveryTime > 0
              ? `${Math.floor(driver.performanceStats.avgDeliveryTime / 60)}h ${driver.performanceStats.avgDeliveryTime % 60}m`
              : 'N/A'}
          </p>
        </div>
      </div>

      {/* Two column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Profile details */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Profile Details</h3>
          </div>
          <dl className="px-6 py-4 space-y-3">
            {[
              ['License Number', driver.licenseNumber],
              ['License Expiry', new Date(driver.licenseExpiry).toLocaleDateString()],
              ['Phone', driver.phone],
              ['Status', driver.status.replace('_', ' ')],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-center justify-between">
                <dt className="text-sm text-slate-500">{label}</dt>
                <dd className="text-sm font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Assigned truck */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Assigned Truck</h3>
          </div>
          <div className="px-6 py-4">
            {driver.assignedTrucks?.length > 0 ? (
              <Link href={`/trucks/${driver.assignedTrucks[0].id}`} className="group block">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 group-hover:text-brand-600 transition-colors">
                      {driver.assignedTrucks[0].make} {driver.assignedTrucks[0].model} ({driver.assignedTrucks[0].year})
                    </p>
                    <p className="text-sm text-slate-500 mt-0.5">{driver.assignedTrucks[0].licensePlate}</p>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">VIN: {driver.assignedTrucks[0].vin}</p>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="text-center py-4">
                <svg className="mx-auto h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
                <p className="mt-2 text-sm text-slate-500">No truck assigned</p>
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <button
                onClick={openAssignModal}
                className="flex-1 rounded-xl border-2 border-dashed border-slate-200 px-4 py-2.5 text-sm font-medium text-brand-600 hover:border-brand-300 hover:bg-brand-50 transition-colors"
              >
                {driver.assignedTrucks?.length > 0 ? 'Reassign Truck' : 'Assign Truck'}
              </button>
              {driver.assignedTrucks?.length > 0 && (
                <button
                  onClick={() => handleUnassign(driver.assignedTrucks[0].id)}
                  className="rounded-xl border border-red-200 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  Unassign
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent trips */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Recent Trips</h3>
        </div>
        {driver.trips?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="py-3 pl-6 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Destination</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Truck</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Scheduled</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="relative py-3 pl-3 pr-6"><span className="sr-only">View</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {driver.trips.slice(0, 10).map((trip) => {
                  const tripStatus = statusConfig[trip.status] || statusConfig.OFF_DUTY
                  return (
                    <tr key={trip.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 pl-6 pr-3 text-sm text-slate-900">{trip.destinationAddress}</td>
                      <td className="px-3 py-3 text-sm">
                        <div className="text-slate-700">{trip.truck.make} {trip.truck.model}</div>
                        <div className="text-xs text-slate-500">{trip.truck.licensePlate}</div>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">
                        {new Date(trip.scheduledStart).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tripStatus.bg} ${tripStatus.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${tripStatus.dot}`} />
                          {trip.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 pl-3 pr-6 text-right">
                        <Link href={`/trips/${trip.id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
                          View
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
            <p className="mt-3 text-sm text-slate-500">No trips found</p>
          </div>
        )}
      </div>

      {/* Assign Truck Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setAssignModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {driver.assignedTrucks?.length > 0 ? 'Reassign Truck' : 'Assign Truck'}
            </h3>

            {assignError && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {assignError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Truck</label>
              <select
                value={selectedTruckId}
                onChange={(e) => setSelectedTruckId(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
              >
                <option value="">Choose a truck...</option>
                {trucks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.make} {t.model} — {t.licensePlate}
                  </option>
                ))}
              </select>
              {trucks.length === 0 && (
                <p className="mt-2 text-xs text-slate-400">No active trucks available</p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setAssignModalOpen(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedTruckId || assignLoading}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {assignLoading ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
