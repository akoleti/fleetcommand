'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { fetchWithAuth } from '@/lib/api'

interface MaintenanceRecord {
  id: string
  truckId: string
  type: string
  status: string
  description: string | null
  cost: number | null
  vendor: string | null
  scheduledDate: string
  completedDate: string | null
  nextDueDate: string | null
  nextDueMileage: number | null
  odometer: number | null
  notes: string | null
  insuranceClaimId: string | null
  createdAt: string
  updatedAt: string
  truck: {
    id: string
    vin: string
    licensePlate: string
    make: string
    model: string
  }
  insuranceClaim?: { id: string; status: string } | null
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
  BRAKE_SERVICE: 'Brake Service',
  ENGINE_REPAIR: 'Engine Repair',
  TRANSMISSION: 'Transmission',
  ELECTRICAL: 'Electrical',
  BODY_WORK: 'Body Work',
  INSPECTION: 'Inspection',
  OTHER: 'Other',
}

const formatDate = (dateStr: string | undefined | null) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatCurrency = (amount: number | null | undefined) =>
  amount != null ? `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'

export default function MaintenanceDetailPage() {
  const params = useParams()
  const id = params?.id as string

  const [record, setRecord] = useState<MaintenanceRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) fetchRecord()
  }, [id])

  const fetchRecord = async () => {
    try {
      setLoading(true)
      const res = await fetchWithAuth(`/api/maintenance/${id}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to fetch maintenance record')
      }
      const data: MaintenanceRecord = await res.json()
      setRecord(data)
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
          <span className="text-sm text-slate-500">Loading maintenance record...</span>
        </div>
      </div>
    )
  }

  if (error || !record) {
    return (
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/maintenance" className="hover:text-brand-600 transition-colors">Maintenance</Link>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-slate-900 font-medium">Record Details</span>
        </div>
        <div className="flex items-start gap-3 rounded-2xl bg-red-50 border border-red-200 px-5 py-4">
          <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-700">{error || 'Maintenance record not found'}</p>
        </div>
      </div>
    )
  }

  const status = statusConfig[record.status] || statusConfig.SCHEDULED
  const typeLabel = typeLabels[record.type] || record.type.replace(/_/g, ' ')

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/maintenance" className="hover:text-brand-600 transition-colors">Maintenance</Link>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-slate-900 font-medium">{typeLabel}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
            <svg className="w-7 h-7 text-orange-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384 5.384a2.625 2.625 0 01-3.712-3.712l5.384-5.384m0 0L11.42 15.17m-4.714-4.714a2.625 2.625 0 013.712-3.712l5.384 5.384" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{typeLabel}</h1>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.bg} ${status.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {record.status.replace('_', ' ')}
              </span>
              <span className="text-sm text-slate-500">·</span>
              <Link href={`/trucks/${record.truck.id}`} className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                {record.truck.make} {record.truck.model} — {record.truck.licensePlate}
              </Link>
            </div>
          </div>
        </div>
        <Link
          href={`/trucks/${record.truck.id}`}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          View Truck
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Maintenance Details */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Maintenance Details</h3>
          </div>
          <dl className="px-6 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Type</dt>
              <dd className="text-sm font-medium text-slate-900">{typeLabel}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Status</dt>
              <dd>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.bg} ${status.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                  {record.status.replace('_', ' ')}
                </span>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Scheduled Date</dt>
              <dd className="text-sm font-medium text-slate-900">{formatDate(record.scheduledDate)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Completed Date</dt>
              <dd className="text-sm font-medium text-slate-900">{formatDate(record.completedDate)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Cost</dt>
              <dd className="text-sm font-medium text-slate-900 tabular-nums">{formatCurrency(record.cost)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Vendor</dt>
              <dd className="text-sm font-medium text-slate-900">{record.vendor || '—'}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Odometer</dt>
              <dd className="text-sm font-medium text-slate-900 tabular-nums">
                {record.odometer != null ? `${record.odometer.toLocaleString()} mi` : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Next Due Date</dt>
              <dd className="text-sm font-medium text-slate-900">{formatDate(record.nextDueDate)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Next Due Mileage</dt>
              <dd className="text-sm font-medium text-slate-900 tabular-nums">
                {record.nextDueMileage != null ? `${record.nextDueMileage.toLocaleString()} mi` : '—'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Truck & Notes */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Truck & Notes</h3>
          </div>
          <dl className="px-6 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Truck</dt>
              <dd>
                <Link href={`/trucks/${record.truck.id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                  {record.truck.make} {record.truck.model}
                </Link>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">License Plate</dt>
              <dd className="text-sm font-medium text-slate-900">{record.truck.licensePlate}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">VIN</dt>
              <dd className="text-sm font-mono text-slate-700">{record.truck.vin}</dd>
            </div>
            {record.description && (
              <div className="pt-2">
                <dt className="text-sm text-slate-500 mb-1">Description</dt>
                <dd className="text-sm text-slate-700">{record.description}</dd>
              </div>
            )}
            {record.notes && (
              <div className="pt-2">
                <dt className="text-sm text-slate-500 mb-1">Notes</dt>
                <dd className="text-sm text-slate-700 whitespace-pre-wrap">{record.notes}</dd>
              </div>
            )}
            {record.insuranceClaim && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <dt className="text-sm text-slate-500">Insurance Claim</dt>
                <dd className="text-sm font-medium text-slate-900">{record.insuranceClaim.status}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  )
}
