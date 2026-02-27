'use client'

import React, { useState, useEffect } from 'react'
import { handleAuthResponse } from '@/lib/api'
import { SignaturePad } from '@/components/delivery/SignaturePad'
import { useUploadThing } from '@/lib/uploadthing'

interface MaintenanceProof {
  id: string
  signedBy: string
  notes: string | null
  media: Array<{ id: string; type: string; fileUrl?: string | null }>
}

interface MaintenanceRecord {
  proofs?: MaintenanceProof[]
}

interface CloseMaintenanceModalProps {
  maintenanceId: string
  maintenanceType?: string
  onClose: () => void
  onSuccess: () => void
}

export function CloseMaintenanceModal({
  maintenanceId,
  maintenanceType,
  onClose,
  onSuccess,
}: CloseMaintenanceModalProps) {
  const [closeLoading, setCloseLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signedBy, setSignedBy] = useState('')
  const [proofNotes, setProofNotes] = useState('')
  const [closeCost, setCloseCost] = useState('')
  const [completedDate, setCompletedDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  )
  const [proofId, setProofId] = useState<string | null>(null)
  const [addMediaForProofId, setAddMediaForProofId] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'signature' | 'photo' | null>(null)
  const [mediaUploading, setMediaUploading] = useState(false)
  const [currentProof, setCurrentProof] = useState<MaintenanceProof | null>(null)

  const { startUpload } = useUploadThing('maintenanceMedia', {
    headers: () => ({
      Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('accessToken') : ''}`,
    }),
    onClientUploadComplete: () => {
      setAddMediaForProofId(null)
      setMediaType(null)
      setMediaUploading(false)
      if (proofId) fetchMaintenanceForProof()
    },
    onUploadError: (err) => {
      setError(err.message)
      setMediaUploading(false)
    },
  })

  const fetchMaintenanceForProof = async () => {
    if (!proofId) return
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`/api/maintenance/${maintenanceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!handleAuthResponse(res) || !res.ok) return
      const data: MaintenanceRecord = await res.json()
      const proof = data.proofs?.find((p) => p.id === proofId)
      setCurrentProof(proof ?? null)
    } catch {}
  }

  useEffect(() => {
    if (proofId) fetchMaintenanceForProof()
  }, [proofId])

  const handleCreateProof = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signedBy.trim()) return

    try {
      setCloseLoading(true)
      setError(null)
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/maintenance-proof', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maintenanceId,
          signedBy: signedBy.trim(),
          notes: proofNotes.trim() || undefined,
        }),
      })

      if (!handleAuthResponse(res)) return
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create proof')
      }

      const proof = await res.json()
      setProofId(proof.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create proof')
    } finally {
      setCloseLoading(false)
    }
  }

  const handleSaveSignature = async (proofIdForSave: string, blob: Blob) => {
    const file = new File([blob], `signature-${Date.now()}.png`, { type: 'image/png' })
    setMediaUploading(true)
    await startUpload([file], { proofId: proofIdForSave, type: 'SIGNATURE' })
  }

  const handleUploadPhoto = async (proofIdForUpload: string, file: File) => {
    setMediaUploading(true)
    await startUpload([file], { proofId: proofIdForUpload, type: 'PHOTO' })
  }

  const handleCloseMaintenance = async () => {
    if (!proofId) return

    try {
      setCloseLoading(true)
      setError(null)
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`/api/maintenance/${maintenanceId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'COMPLETED',
          maintenanceProofId: proofId,
          completedDate: completedDate || new Date().toISOString().slice(0, 10),
          cost: closeCost ? parseFloat(closeCost) : undefined,
        }),
      })

      if (!handleAuthResponse(res)) return
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to close maintenance')
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close maintenance')
    } finally {
      setCloseLoading(false)
    }
  }

  const resetModal = () => {
    setProofId(null)
    setSignedBy('')
    setProofNotes('')
    setCloseCost('')
    setCompletedDate(new Date().toISOString().slice(0, 10))
    setAddMediaForProofId(null)
    setMediaType(null)
    setCurrentProof(null)
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">
            Close Maintenance{maintenanceType ? ` — ${maintenanceType}` : ''}
          </h3>
          <button
            onClick={resetModal}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {!proofId ? (
            <form onSubmit={handleCreateProof} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Signed by (vendor/person) *</label>
                <input
                  type="text"
                  value={signedBy}
                  onChange={(e) => setSignedBy(e.target.value)}
                  placeholder="e.g. ABC Auto Service"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={proofNotes}
                  onChange={(e) => setProofNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <button
                type="submit"
                disabled={closeLoading || !signedBy.trim()}
                className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {closeLoading ? 'Creating...' : 'Create proof & add signatures/photos'}
              </button>
            </form>
          ) : (
            <>
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
                <p className="text-sm font-medium text-slate-700">Proof created for {signedBy}</p>
                {currentProof?.media && currentProof.media.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    {currentProof.media.length} item(s) attached
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAddMediaForProofId(proofId)
                    setMediaType('signature')
                  }}
                  disabled={mediaUploading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998-5.059" />
                  </svg>
                  Add signature
                </button>
                <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={mediaUploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f && proofId) {
                        handleUploadPhoto(proofId, f)
                        e.target.value = ''
                      }
                    }}
                  />
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  Add photo
                </label>
              </div>

              {addMediaForProofId === proofId && mediaType === 'signature' && (
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                  <p className="text-sm font-medium text-slate-700 mb-2">Capture signature</p>
                  <SignaturePad
                    onSave={(blob) => handleSaveSignature(proofId, blob)}
                    onCancel={() => {
                      setAddMediaForProofId(null)
                      setMediaType(null)
                    }}
                    disabled={mediaUploading}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Completed date</label>
                  <input
                    type="date"
                    value={completedDate}
                    onChange={(e) => setCompletedDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={closeCost}
                    onChange={(e) => setCloseCost(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleCloseMaintenance}
                  disabled={closeLoading || mediaUploading}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {closeLoading ? 'Closing...' : 'Close maintenance'}
                </button>
                <button
                  onClick={resetModal}
                  disabled={closeLoading}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
