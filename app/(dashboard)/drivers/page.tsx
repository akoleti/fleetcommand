'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { handleAuthResponse } from '@/lib/api'

interface Driver {
  id: string
  name: string
  licenseNumber: string
  phone: string
  status: string
  totalTripsCompleted: number
  assignedTruck: {
    id: string
    vin: string
    licensePlate: string
    make: string
    model: string
  } | null
}

interface PaginatedResponse {
  data: Driver[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  AVAILABLE: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  ON_TRIP: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  OFF_DUTY: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  SUSPENDED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
}

const initialFormState = {
  name: '',
  email: '',
  password: '',
  licenseNumber: '',
  licenseExpiry: '',
  phone: '',
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState(initialFormState)
  const [addError, setAddError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchDrivers()
  }, [statusFilter, searchQuery, page])

  const fetchDrivers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        status: statusFilter,
        search: searchQuery,
        page: page.toString(),
        limit: '20',
      })

      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/drivers?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!handleAuthResponse(response)) return
      if (!response.ok) throw new Error('Failed to fetch drivers')

      const data: PaginatedResponse = await response.json()
      setDrivers(data.data)
      setTotalPages(data.pagination.totalPages)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setAddError(null)

    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/drivers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(addForm),
      })

      if (!handleAuthResponse(res)) return
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        if (body?.code === 'EMAIL_EXISTS') {
          throw new Error('A driver with this email already exists.')
        }
        throw new Error(body?.message || 'Failed to create driver')
      }

      setShowAddModal(false)
      setAddForm(initialFormState)
      fetchDrivers()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const updateField = (field: string, value: string) =>
    setAddForm((prev) => ({ ...prev, [field]: value }))

  const filters = ['all', 'available', 'on_trip', 'off_duty']

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Drivers</h1>
          <p className="mt-1 text-sm text-slate-500">
            {drivers.length} drivers in your team
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
          Add Driver
        </button>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, license number, phone..."
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
              className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
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
        <div className="mt-8 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-4 rounded-2xl bg-white border border-slate-200 p-5">
              <div className="w-10 h-10 bg-slate-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-slate-200 rounded" />
                <div className="h-3 w-24 bg-slate-100 rounded" />
              </div>
              <div className="h-6 w-20 bg-slate-200 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* Drivers table */}
      {!loading && !error && (
        <div className="mt-6 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="bg-slate-50/80">
                <th scope="col" className="py-3 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Driver
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  License
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Assigned Truck
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Trips
                </th>
                <th scope="col" className="relative py-3 pl-3 pr-5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drivers.map((driver) => {
                const status = statusConfig[driver.status] || statusConfig.OFF_DUTY
                return (
                  <tr key={driver.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="whitespace-nowrap py-4 pl-5 pr-3">
                      <Link href={`/drivers/${driver.id}`} className="flex items-center gap-3 group">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {driver.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 group-hover:text-brand-600 transition-colors">{driver.name}</div>
                          <div className="text-xs text-slate-500">{driver.phone}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 font-mono">
                      {driver.licenseNumber}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.bg} ${status.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {driver.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      {driver.assignedTruck ? (
                        <Link href={`/trucks/${driver.assignedTruck.id}`} className="text-brand-600 hover:text-brand-700 transition-colors">
                          <div>{driver.assignedTruck.make} {driver.assignedTruck.model}</div>
                          <div className="text-xs text-slate-500">{driver.assignedTruck.licensePlate}</div>
                        </Link>
                      ) : (
                        <span className="text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4">
                      <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                        <span className="font-semibold tabular-nums">{driver.totalTripsCompleted}</span>
                        <span className="text-slate-400">completed</span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-4 pl-3 pr-5 text-right">
                      <Link
                        href={`/drivers/${driver.id}`}
                        className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {drivers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                    <p className="mt-3 text-sm text-slate-500">No drivers found</p>
                    <p className="mt-1 text-xs text-slate-400">Try adjusting your filters or add a new driver.</p>
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

      {/* Add Driver Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900">Add Driver</h2>
            <p className="mt-1 text-sm text-slate-500">Create a new driver account.</p>

            {addError && (
              <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddDriver} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
                  <input
                    type="text"
                    required
                    value={addForm.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                  <input
                    type="tel"
                    required
                    value={addForm.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={addForm.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={addForm.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="Min 8 characters"
                  className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">License Number</label>
                  <input
                    type="text"
                    required
                    value={addForm.licenseNumber}
                    onChange={(e) => updateField('licenseNumber', e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">License Expiry</label>
                  <input
                    type="date"
                    required
                    value={addForm.licenseExpiry}
                    onChange={(e) => updateField('licenseExpiry', e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Creating…' : 'Add Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
