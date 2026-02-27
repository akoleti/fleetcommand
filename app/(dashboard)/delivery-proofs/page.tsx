'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { handleAuthResponse } from '@/lib/api'

interface MediaSummary {
  id: string
  type: string
  mimeType: string | null
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
  trip: {
    id: string
    originAddress: string
    destinationAddress: string
    status: string
    scheduledStart: string
    truck: { id: string; make: string; model: string; licensePlate: string }
    driver: { id: string; name: string; phone: string }
  }
  media: MediaSummary[]
}

interface ProofDetail {
  id: string
  recipientName: string
  notes: string | null
  latitude: number | null
  longitude: number | null
  capturedAt: string
  syncedAt: string | null
  trip: {
    id: string
    originAddress: string
    destinationAddress: string
    status: string
    scheduledStart: string
    actualStart: string | null
    actualEnd: string | null
    truck: { id: string; make: string; model: string; licensePlate: string; organizationId: string }
    driver: { id: string; name: string; phone: string }
  }
  media: Array<{
    id: string
    type: string
    mimeType: string | null
    fileSize: number | null
    downloadUrl: string
    createdAt: string
  }>
}

interface PaginatedResponse {
  data: DeliveryProof[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

const mediaTypeLabels: Record<string, string> = {
  SIGNATURE: 'Signature',
  PHOTO: 'Photo',
  DOCUMENT: 'Document',
}

const mediaTypeConfig: Record<string, { bg: string; text: string }> = {
  SIGNATURE: { bg: 'bg-violet-50', text: 'text-violet-700' },
  PHOTO: { bg: 'bg-sky-50', text: 'text-sky-700' },
  DOCUMENT: { bg: 'bg-amber-50', text: 'text-amber-700' },
}

export default function DeliveryProofsPage() {
  const [proofs, setProofs] = useState<DeliveryProof[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedProof, setExpandedProof] = useState<ProofDetail | null>(null)
  const [expandLoading, setExpandLoading] = useState(false)

  useEffect(() => {
    fetchProofs()
  }, [page, dateFrom, dateTo])

  const fetchProofs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: page.toString(), limit: '20' })

      const token = localStorage.getItem('accessToken')
      const res = await fetch(`/api/delivery-proof?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!handleAuthResponse(res)) return
      if (!res.ok) throw new Error('Failed to fetch delivery proofs')

      const data: PaginatedResponse = await res.json()

      let filtered = data.data
      if (dateFrom) {
        const from = new Date(dateFrom)
        filtered = filtered.filter((p) => new Date(p.capturedAt) >= from)
      }
      if (dateTo) {
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        filtered = filtered.filter((p) => new Date(p.capturedAt) <= to)
      }

      setProofs(filtered)
      setTotalPages(data.pagination.totalPages)
      setTotal(data.pagination.total)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = async (proofId: string) => {
    if (expandedId === proofId) {
      setExpandedId(null)
      setExpandedProof(null)
      return
    }

    setExpandedId(proofId)
    setExpandLoading(true)

    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`/api/delivery-proof/${proofId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!handleAuthResponse(res)) return
      if (!res.ok) throw new Error('Failed to load proof details')
      const data: ProofDetail = await res.json()
      setExpandedProof(data)
    } catch {
      setExpandedProof(null)
    } finally {
      setExpandLoading(false)
    }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  const formatDateTime = (d: string) => `${formatDate(d)} at ${formatTime(d)}`

  const getMediaCounts = (media: MediaSummary[]) => {
    const counts: Record<string, number> = {}
    media.forEach((m) => {
      counts[m.type] = (counts[m.type] || 0) + 1
    })
    return counts
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Delivery Proofs</h1>
          <p className="mt-1 text-sm text-slate-500">
            {total} proof{total !== 1 ? 's' : ''} captured
          </p>
        </div>
      </div>

      {/* Date Filters */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="dateFrom" className="text-sm text-slate-500 whitespace-nowrap">From</label>
          <input
            id="dateFrom"
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="dateTo" className="text-sm text-slate-500 whitespace-nowrap">To</label>
          <input
            id="dateTo"
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); setPage(1) }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-6 flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
          <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="mt-8 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-white border border-slate-200 p-5 flex gap-6">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-slate-200 rounded" />
                <div className="h-3 w-64 bg-slate-100 rounded" />
                <div className="h-3 w-32 bg-slate-100 rounded" />
              </div>
              <div className="h-6 w-20 bg-slate-200 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* Proof Cards */}
      {!loading && !error && (
        <div className="mt-6 space-y-3">
          {proofs.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm px-6 py-16 text-center">
              <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>
              <p className="mt-3 text-sm text-slate-500">No delivery proofs found</p>
              <p className="mt-1 text-xs text-slate-400">Proofs are captured when deliveries are confirmed.</p>
            </div>
          ) : (
            proofs.map((proof) => {
              const mediaCounts = getMediaCounts(proof.media)
              const isExpanded = expandedId === proof.id

              return (
                <div key={proof.id} className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                  {/* Card Header - Clickable */}
                  <button
                    onClick={() => toggleExpand(proof.id)}
                    className="w-full text-left px-6 py-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                          <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          {/* Route */}
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-900 font-medium truncate max-w-[180px]">
                              {proof.trip.originAddress}
                            </span>
                            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                            <span className="text-slate-900 font-medium truncate max-w-[180px]">
                              {proof.trip.destinationAddress}
                            </span>
                          </div>

                          {/* Recipient */}
                          <p className="mt-1 text-sm text-slate-500">
                            Received by <span className="font-medium text-slate-700">{proof.recipientName}</span>
                          </p>

                          {/* Truck + Driver */}
                          <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-400">
                            <span>{proof.trip.truck.make} {proof.trip.truck.model} ({proof.trip.truck.licensePlate})</span>
                            <span>&middot;</span>
                            <span>{proof.trip.driver.name}</span>
                          </div>

                          {/* Media Badges */}
                          {Object.keys(mediaCounts).length > 0 && (
                            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                              {Object.entries(mediaCounts).map(([type, count]) => {
                                const cfg = mediaTypeConfig[type] || { bg: 'bg-slate-50', text: 'text-slate-600' }
                                return (
                                  <span key={type} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                                    {count} {mediaTypeLabels[type] || type}{count > 1 ? 's' : ''}
                                  </span>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-slate-400">{formatDateTime(proof.capturedAt)}</span>
                        <svg
                          className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 px-6 py-4 bg-slate-50/30">
                      {expandLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
                        </div>
                      ) : expandedProof ? (
                        <div>
                          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            <div>
                              <dt className="text-xs text-slate-500">Recipient</dt>
                              <dd className="text-sm font-medium text-slate-900">{expandedProof.recipientName}</dd>
                            </div>
                            <div>
                              <dt className="text-xs text-slate-500">Captured</dt>
                              <dd className="text-sm font-medium text-slate-900">{formatDateTime(expandedProof.capturedAt)}</dd>
                            </div>
                            {expandedProof.notes && (
                              <div className="sm:col-span-2">
                                <dt className="text-xs text-slate-500">Notes</dt>
                                <dd className="text-sm text-slate-900">{expandedProof.notes}</dd>
                              </div>
                            )}
                            {expandedProof.latitude && expandedProof.longitude && (
                              <div>
                                <dt className="text-xs text-slate-500">Location</dt>
                                <dd className="text-sm font-medium text-slate-900">
                                  {expandedProof.latitude.toFixed(6)}, {expandedProof.longitude.toFixed(6)}
                                </dd>
                              </div>
                            )}
                            {expandedProof.syncedAt && (
                              <div>
                                <dt className="text-xs text-slate-500">Synced At</dt>
                                <dd className="text-sm font-medium text-slate-900">{formatDateTime(expandedProof.syncedAt)}</dd>
                              </div>
                            )}
                          </dl>

                          {/* Media Gallery */}
                          {expandedProof.media.length > 0 && (
                            <div className="pt-4 border-t border-slate-100">
                              <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                                Media ({expandedProof.media.length})
                              </h5>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {expandedProof.media.map((m) => (
                                  <a
                                    key={m.id}
                                    href={m.downloadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group relative rounded-xl border border-slate-200 overflow-hidden bg-white hover:border-brand-300 hover:shadow-md transition-all"
                                  >
                                    {m.mimeType?.startsWith('image/') ? (
                                      <div className="aspect-square bg-slate-50">
                                        <img
                                          src={m.downloadUrl}
                                          alt={mediaTypeLabels[m.type] || m.type}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="aspect-square bg-slate-50 flex flex-col items-center justify-center p-3">
                                        <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                        </svg>
                                        <span className="mt-1 text-xs text-slate-500">{mediaTypeLabels[m.type] || m.type}</span>
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

                          <div className="mt-4 pt-3 border-t border-slate-100">
                            <Link
                              href={`/trips/${expandedProof.trip.id}`}
                              className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
                            >
                              View Trip Details &rarr;
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 py-4 text-center">Failed to load proof details</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
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
    </div>
  )
}
