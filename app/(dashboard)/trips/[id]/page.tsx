'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { handleAuthResponse } from '@/lib/api'

interface MediaItem {
  id: string
  type: string
  mimeType: string | null
  downloadUrl?: string
  createdAt: string
}

interface DeliveryProof {
  id: string
  recipientName: string
  notes: string | null
  latitude: number | null
  longitude: number | null
  capturedAt: string
  syncedAt: string | null
  media: MediaItem[]
}

interface TripStop {
  id: string
  sequence: number
  type: string
  address: string
  lat: number
  lng: number
  notes: string | null
}

interface Trip {
  id: string
  status: string
  originAddress: string
  destinationAddress: string
  originLat: number
  originLng: number
  destinationLat: number
  destinationLng: number
  scheduledStart: string
  scheduledEnd: string | null
  actualStart: string | null
  actualEnd: string | null
  notes: string | null
  stops?: TripStop[]
  truck: {
    id: string
    make: string
    model: string
    licensePlate: string
    year: number
    status: string
  }
  driver: {
    id: string
    name: string
    phone: string
    licenseNumber: string
    status: string
  }
  deliveryProofs: DeliveryProof[]
}

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  SCHEDULED: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  IN_PROGRESS: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
}

const mediaTypeLabels: Record<string, string> = {
  SIGNATURE: 'Signature',
  PHOTO: 'Photo',
  DOCUMENT: 'Document',
}

export default function TripDetailPage() {
  const params = useParams()
  const tripId = params?.id as string

  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showProofForm, setShowProofForm] = useState(false)
  const [proofLoading, setProofLoading] = useState(false)
  const [recipientName, setRecipientName] = useState('')
  const [proofNotes, setProofNotes] = useState('')

  useEffect(() => {
    if (tripId) fetchTrip()
  }, [tripId])

  const fetchTrip = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`/api/trips/${tripId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!handleAuthResponse(res)) return
      if (!res.ok) throw new Error('Failed to fetch trip')
      const data: Trip = await res.json()

      if (data.deliveryProofs?.length) {
        const proofsWithMedia = await Promise.all(
          data.deliveryProofs.map(async (proof) => {
            try {
              const mediaRes = await fetch(`/api/delivery-proof/${proof.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              })
              if (!handleAuthResponse(mediaRes)) return proof
              if (mediaRes.ok) {
                const full = await mediaRes.json()
                return { ...proof, media: full.media || [] }
              }
            } catch {}
            return proof
          })
        )
        data.deliveryProofs = proofsWithMedia
      }

      setTrip(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProof = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recipientName.trim()) return

    try {
      setProofLoading(true)
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/delivery-proof', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tripId,
          recipientName: recipientName.trim(),
          notes: proofNotes.trim() || undefined,
        }),
      })

      if (!handleAuthResponse(res)) return
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create proof')
      }

      setShowProofForm(false)
      setRecipientName('')
      setProofNotes('')
      fetchTrip()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create proof')
    } finally {
      setProofLoading(false)
    }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  const formatDateTime = (d: string) => `${formatDate(d)} at ${formatTime(d)}`

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          <span className="text-sm text-slate-500">Loading trip details...</span>
        </div>
      </div>
    )
  }

  if (error || !trip) {
    return (
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/trips" className="hover:text-brand-600 transition-colors">Trips</Link>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-slate-900 font-medium">Trip Details</span>
        </div>
        <div className="flex items-start gap-3 rounded-2xl bg-red-50 border border-red-200 px-5 py-4">
          <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-700">{error || 'Trip not found'}</p>
        </div>
      </div>
    )
  }

  const status = statusConfig[trip.status] || statusConfig.SCHEDULED

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/trips" className="hover:text-brand-600 transition-colors">Trips</Link>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-slate-900 font-medium">Trip Details</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
            <svg className="w-7 h-7 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">Trip Details</h1>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.bg} ${status.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {trip.status.replace('_', ' ')}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-sm text-slate-500 flex-wrap">
              {trip.stops && trip.stops.length > 0 ? (
                <>
                  {trip.stops.map((stop, i) => (
                    <React.Fragment key={stop.id}>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${stop.type === 'PICKUP' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="max-w-[160px] truncate" title={stop.address}>
                          {stop.sequence}. {stop.address}
                        </span>
                      </div>
                      {i < trip.stops!.length - 1 && (
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      )}
                    </React.Fragment>
                  ))}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="max-w-[200px] truncate">{trip.originAddress}</span>
                  </div>
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="max-w-[200px] truncate">{trip.destinationAddress}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trip Details Card */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Trip Information</h3>
          </div>
          <dl className="px-6 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Status</dt>
              <dd>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.bg} ${status.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                  {trip.status.replace('_', ' ')}
                </span>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-slate-500">Scheduled Start</dt>
              <dd className="text-sm font-medium text-slate-900">{formatDateTime(trip.scheduledStart)}</dd>
            </div>
            {trip.scheduledEnd && (
              <div className="flex items-center justify-between">
                <dt className="text-sm text-slate-500">Scheduled End</dt>
                <dd className="text-sm font-medium text-slate-900">{formatDateTime(trip.scheduledEnd)}</dd>
              </div>
            )}
            {trip.actualStart && (
              <div className="flex items-center justify-between">
                <dt className="text-sm text-slate-500">Actual Start</dt>
                <dd className="text-sm font-medium text-slate-900">{formatDateTime(trip.actualStart)}</dd>
              </div>
            )}
            {trip.actualEnd && (
              <div className="flex items-center justify-between">
                <dt className="text-sm text-slate-500">Actual End</dt>
                <dd className="text-sm font-medium text-slate-900">{formatDateTime(trip.actualEnd)}</dd>
              </div>
            )}
            {trip.notes && (
              <div className="flex items-start justify-between">
                <dt className="text-sm text-slate-500">Notes</dt>
                <dd className="text-sm text-slate-900 text-right max-w-[60%]">{trip.notes}</dd>
              </div>
            )}
          </dl>
        </div>

        {trip.stops && trip.stops.length > 0 && (
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm lg:col-span-2">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Route Stops (optimized order)</h3>
            </div>
            <ul className="px-6 py-4 divide-y divide-slate-100">
              {trip.stops.map((stop) => (
                <li key={stop.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${stop.type === 'PICKUP' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {stop.sequence}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${stop.type === 'PICKUP' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {stop.type}
                  </span>
                  <span className="text-sm text-slate-900">{stop.address}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Truck & Driver */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Truck</h3>
            </div>
            <div className="px-6 py-4">
              <Link href={`/trucks/${trip.truck.id}`} className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-slate-900 group-hover:text-brand-600 transition-colors">
                    {trip.truck.make} {trip.truck.model}
                  </p>
                  <p className="text-sm text-slate-500">{trip.truck.licensePlate}</p>
                </div>
              </Link>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Driver</h3>
            </div>
            <div className="px-6 py-4">
              <Link href={`/drivers/${trip.driver.id}`} className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {trip.driver.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-slate-900 group-hover:text-brand-600 transition-colors">
                    {trip.driver.name}
                  </p>
                  <p className="text-sm text-slate-500">{trip.driver.phone}</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Proof Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Delivery Proof</h2>
          {trip.status === 'IN_PROGRESS' && !showProofForm && (
            <button
              onClick={() => setShowProofForm(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Proof
            </button>
          )}
        </div>

        {/* Proof Creation Form */}
        {showProofForm && (
          <div className="mb-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">New Delivery Proof</h3>
            </div>
            <form onSubmit={handleCreateProof} className="px-6 py-4 space-y-4">
              <div>
                <label htmlFor="recipientName" className="block text-sm font-medium text-slate-700 mb-1">
                  Recipient Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="recipientName"
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Enter recipient name"
                  required
                  className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                />
              </div>
              <div>
                <label htmlFor="proofNotes" className="block text-sm font-medium text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  id="proofNotes"
                  value={proofNotes}
                  onChange={(e) => setProofNotes(e.target.value)}
                  placeholder="Additional notes (optional)"
                  rows={3}
                  className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors resize-none"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={proofLoading || !recipientName.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {proofLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Creating...
                    </>
                  ) : (
                    'Create Proof'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowProofForm(false); setRecipientName(''); setProofNotes('') }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Existing Proofs */}
        {trip.deliveryProofs?.length > 0 ? (
          <div className="space-y-4">
            {trip.deliveryProofs.map((proof) => (
              <div key={proof.id} className="rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">Proof of Delivery</h4>
                      <p className="text-xs text-slate-500">{formatDateTime(proof.capturedAt)}</p>
                    </div>
                  </div>
                  {proof.syncedAt && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Synced
                    </span>
                  )}
                </div>
                <div className="px-6 py-4">
                  <dl className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <dt className="text-sm text-slate-500">Recipient</dt>
                      <dd className="text-sm font-medium text-slate-900">{proof.recipientName}</dd>
                    </div>
                    {proof.notes && (
                      <div className="flex items-start justify-between">
                        <dt className="text-sm text-slate-500">Notes</dt>
                        <dd className="text-sm text-slate-900 text-right max-w-[60%]">{proof.notes}</dd>
                      </div>
                    )}
                    {proof.latitude && proof.longitude && (
                      <div className="flex items-center justify-between">
                        <dt className="text-sm text-slate-500">Location</dt>
                        <dd className="text-sm font-medium text-slate-900">
                          {proof.latitude.toFixed(6)}, {proof.longitude.toFixed(6)}
                        </dd>
                      </div>
                    )}
                  </dl>

                  {/* Media Gallery */}
                  {proof.media?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                        Attachments ({proof.media.length})
                      </h5>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {proof.media.map((media) => (
                          <a
                            key={media.id}
                            href={media.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative rounded-xl border border-slate-200 overflow-hidden hover:border-brand-300 hover:shadow-md transition-all"
                          >
                            {media.mimeType?.startsWith('image/') ? (
                              <div className="aspect-square bg-slate-50">
                                <img
                                  src={media.downloadUrl}
                                  alt={mediaTypeLabels[media.type] || media.type}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="aspect-square bg-slate-50 flex flex-col items-center justify-center p-3">
                                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                </svg>
                                <span className="mt-1 text-xs text-slate-500">{mediaTypeLabels[media.type] || media.type}</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                              <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                              </svg>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm px-6 py-12 text-center">
            <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
            <h3 className="mt-3 text-sm font-medium text-slate-900">No delivery proof yet</h3>
            <p className="mt-1 text-sm text-slate-500">
              {trip.status === 'IN_PROGRESS'
                ? 'Add a delivery proof when the delivery is confirmed.'
                : 'Delivery proof can be added when the trip is in progress.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
