'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { gallonsToLiters, GALLONS_TO_LITERS } from '@/lib/format'
import { handleAuthResponse } from '@/lib/api'

interface FuelLog {
  id: string
  gallons: number
  pricePerGallon: number
  totalCost: number
  odometer: number
  station: string | null
  latitude: number | null
  longitude: number | null
  fueledAt: string
  truck: {
    id: string
    vin: string
    licensePlate: string
    make: string
    model: string
    year: number
  }
  createdBy: { id: string; name: string } | null
}

const getHeaders = () => {
  const token = localStorage.getItem('accessToken')
  return { Authorization: `Bearer ${token}` }
}

const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

const formatDate = (dateStr: string | undefined | null) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatDateTime = (dateStr: string | undefined | null) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function FuelLogDetailPage() {
  const params = useParams()
  const id = params?.id as string

  const [log, setLog] = useState<FuelLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) fetchLog()
  }, [id])

  const fetchLog = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/fuel/log/${id}`, { headers: getHeaders() })
      if (!handleAuthResponse(res)) return
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to fetch fuel log')
      }
      const data: FuelLog = await res.json()
      setLog(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          <span className="text-sm text-slate-500">Loading fuel log...</span>
        </div>
      </div>
    )
  }

  if (error || !log) {
    return (
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/fuel" className="hover:text-brand-600 transition-colors">Fuel</Link>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-slate-900 font-medium">Fuel Log Details</span>
        </div>
        <div className="flex items-start gap-3 rounded-2xl bg-red-50 border border-red-200 px-5 py-4">
          <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-700">{error || 'Fuel log not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/fuel" className="hover:text-brand-600 transition-colors">Fuel</Link>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-slate-900 font-medium">Fuel Log Details</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
            <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {gallonsToLiters(log.gallons).toFixed(1)} L @ {formatCurrency(log.pricePerGallon / GALLONS_TO_LITERS)}/L
            </h1>
            <div className="mt-1.5 flex items-center gap-2 text-sm text-slate-500">
              <span>{formatDateTime(log.fueledAt)}</span>
              <span>·</span>
              <Link href={`/trucks/${log.truck.id}`} className="text-brand-600 hover:text-brand-700 font-medium">
                {log.truck.make} {log.truck.model} — {log.truck.licensePlate}
              </Link>
            </div>
          </div>
        </div>
        <Link
          href={`/trucks/${log.truck.id}`}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          View Truck
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fuel Details Card */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Fuel Details</h3>
          </div>
          <dl className="px-6 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Liters</dt>
              <dd className="text-sm font-medium text-slate-900 tabular-nums">{gallonsToLiters(log.gallons).toFixed(1)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Price per Liter</dt>
              <dd className="text-sm font-medium text-slate-900 tabular-nums">{formatCurrency(log.pricePerGallon / GALLONS_TO_LITERS)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Total Cost</dt>
              <dd className="text-lg font-bold text-slate-900 tabular-nums">{formatCurrency(log.totalCost)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Odometer</dt>
              <dd className="text-sm font-medium text-slate-900 tabular-nums">{log.odometer.toLocaleString()} mi</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Station</dt>
              <dd className="text-sm font-medium text-slate-900">{log.station || '—'}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Date & Time</dt>
              <dd className="text-sm font-medium text-slate-900">{formatDateTime(log.fueledAt)}</dd>
            </div>
          </dl>
        </div>

        {/* Truck & Meta Card */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Truck & Record Info</h3>
          </div>
          <dl className="px-6 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Truck</dt>
              <dd>
                <Link href={`/trucks/${log.truck.id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                  {log.truck.make} {log.truck.model} ({log.truck.year})
                </Link>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">License Plate</dt>
              <dd className="text-sm font-medium text-slate-900">{log.truck.licensePlate}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">VIN</dt>
              <dd className="text-sm font-mono text-slate-700">{log.truck.vin}</dd>
            </div>
            {log.createdBy && (
              <div className="flex items-center justify-between">
                <dt className="text-sm text-slate-500">Logged by</dt>
                <dd className="text-sm font-medium text-slate-900">{log.createdBy.name}</dd>
              </div>
            )}
            {log.latitude != null && log.longitude != null && (
              <div className="flex items-center justify-between">
                <dt className="text-sm text-slate-500">Location</dt>
                <dd className="text-sm font-mono text-slate-700">
                  {log.latitude.toFixed(4)}, {log.longitude.toFixed(4)}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  )
}
