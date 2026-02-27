'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { handleAuthResponse } from '@/lib/api'

interface InsurancePolicy {
  id: string
  provider: string
  policyNumber: string
  coverageType: string
  premium: number
  expiryDate: string
  isActive: boolean
  truck: {
    id: string
    licensePlate: string
    make: string
    model: string
  }
}

interface InsuranceClaim {
  id: string
  claimNumber: string
  incidentDate: string
  amount: number
  status: string
  filedDate: string
  policy: {
    id: string
    policyNumber: string
    provider: string
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

const claimStatusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  APPROVED: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  DENIED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  PAID: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
}

const COVERAGE_TYPES = ['Liability', 'Full Coverage', 'Comprehensive', 'Cargo Insurance', 'Physical Damage']

const emptyPolicyForm = {
  truckId: '', provider: '', policyNumber: '', coverageType: '',
  premium: '', deductible: '', coverageLimit: '', startDate: '', expiryDate: '', notes: '',
}

export default function InsurancePage() {
  const [activeTab, setActiveTab] = useState<'policies' | 'claims' | 'expiring'>('policies')
  const [policies, setPolicies] = useState<InsurancePolicy[]>([])
  const [claims, setClaims] = useState<InsuranceClaim[]>([])
  const [expiringPolicies, setExpiringPolicies] = useState<InsurancePolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [showModal, setShowModal] = useState(false)
  const [modalForm, setModalForm] = useState(emptyPolicyForm)
  const [modalError, setModalError] = useState<string | null>(null)
  const [modalSubmitting, setModalSubmitting] = useState(false)
  const [trucks, setTrucks] = useState<{ id: string; name: string | null; make: string; model: string; licensePlate: string }[]>([])

  useEffect(() => {
    setPage(1)
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'policies') fetchPolicies()
    else if (activeTab === 'claims') fetchClaims()
    else fetchExpiring()
  }, [activeTab, page])

  const getHeaders = () => {
    const token = localStorage.getItem('accessToken')
    return { Authorization: `Bearer ${token}` }
  }

  const fetchPolicies = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: page.toString(), limit: '20' })
      const response = await fetch(`/api/insurance?${params}`, { headers: getHeaders() })
      if (!handleAuthResponse(response)) return
      if (!response.ok) throw new Error('Failed to fetch policies')
      const data: PaginatedResponse<InsurancePolicy> = await response.json()
      setPolicies(data.data)
      setTotalPages(data.pagination.totalPages)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const fetchClaims = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: page.toString(), limit: '20' })
      const response = await fetch(`/api/insurance?${params}&includeClaims=true`, { headers: getHeaders() })
      if (!handleAuthResponse(response)) return
      if (!response.ok) throw new Error('Failed to fetch claims')

      const data = await response.json()
      const allPolicies: InsurancePolicy[] = data.data || []
      const allClaims: InsuranceClaim[] = []

      for (const policy of allPolicies) {
        try {
          const claimsRes = await fetch(`/api/insurance/${policy.id}/claims`, { headers: getHeaders() })
          if (!handleAuthResponse(claimsRes)) return
          if (claimsRes.ok) {
            const claimsData = await claimsRes.json()
            const policyClaims = (claimsData.data || claimsData || []).map((c: any) => ({
              ...c,
              policy: { id: policy.id, policyNumber: policy.policyNumber, provider: policy.provider },
            }))
            allClaims.push(...policyClaims)
          }
        } catch {
          // skip
        }
      }

      setClaims(allClaims)
      setTotalPages(1)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const fetchExpiring = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ expiringSoon: 'true', page: page.toString(), limit: '20' })
      const response = await fetch(`/api/insurance?${params}`, { headers: getHeaders() })
      if (!handleAuthResponse(response)) return
      if (!response.ok) throw new Error('Failed to fetch expiring policies')
      const data: PaginatedResponse<InsurancePolicy> = await response.json()
      setExpiringPolicies(data.data)
      setTotalPages(data.pagination.totalPages)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const formatCurrency = (amount: number) =>
    `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

  const daysUntilExpiry = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const openAddModal = async () => {
    setShowModal(true)
    setModalForm(emptyPolicyForm)
    setModalError(null)
    try {
      const res = await fetch('/api/trucks?limit=100', { headers: getHeaders() })
      if (!handleAuthResponse(res)) return
      if (res.ok) {
        const data = await res.json()
        setTrucks(data.data || [])
      }
    } catch {}
  }

  const handleAddPolicy = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalSubmitting(true)
    setModalError(null)
    try {
      const res = await fetch('/api/insurance', {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          truckId: modalForm.truckId,
          provider: modalForm.provider,
          policyNumber: modalForm.policyNumber,
          coverageType: modalForm.coverageType,
          premium: parseFloat(modalForm.premium),
          deductible: parseFloat(modalForm.deductible),
          coverageLimit: parseFloat(modalForm.coverageLimit),
          startDate: modalForm.startDate,
          expiryDate: modalForm.expiryDate,
          notes: modalForm.notes || null,
        }),
      })
      if (!handleAuthResponse(res)) return
      if (!res.ok) {
        const data = await res.json()
        setModalError(data.error || 'Failed to add policy')
        return
      }
      setShowModal(false)
      fetchPolicies()
    } catch {
      setModalError('An unexpected error occurred')
    } finally {
      setModalSubmitting(false)
    }
  }

  const tabs = [
    { key: 'policies' as const, label: 'Policies' },
    { key: 'claims' as const, label: 'Claims' },
    { key: 'expiring' as const, label: 'Expiring Soon' },
  ]

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Insurance</h1>
          <p className="mt-1 text-sm text-slate-500">Manage policies and claims</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Policy
        </button>
      </div>

      <div className="mt-6 flex gap-1 p-1 rounded-xl bg-slate-100 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
              <div className="h-4 w-32 bg-slate-100 rounded" />
              <div className="h-4 w-20 bg-slate-100 rounded" />
              <div className="h-6 w-16 bg-slate-200 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* Policies Tab */}
      {!loading && !error && activeTab === 'policies' && (
        <div className="mt-6 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="bg-slate-50/80">
                  <th scope="col" className="py-3 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Provider</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Policy #</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Truck</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Coverage</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Premium</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Expiry</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {policies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="whitespace-nowrap py-4 pl-5 pr-3">
                      <span className="font-medium text-slate-900">{policy.provider}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 font-mono">
                      {policy.policyNumber}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4">
                      <Link href={`/trucks/${policy.truck.id}`} className="group">
                        <div className="text-sm font-medium text-slate-900 group-hover:text-brand-600 transition-colors">
                          {policy.truck.make} {policy.truck.model}
                        </div>
                        <div className="text-xs text-slate-500">{policy.truck.licensePlate}</div>
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                      {policy.coverageType}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 tabular-nums">
                      {formatCurrency(policy.premium)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                      {formatDate(policy.expiryDate)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4">
                      {policy.isActive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {policies.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                      </svg>
                      <p className="mt-3 text-sm text-slate-500">No insurance policies found</p>
                      <p className="mt-1 text-xs text-slate-400">Add a policy to get started.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Claims Tab */}
      {!loading && !error && activeTab === 'claims' && (
        <div className="mt-6 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="bg-slate-50/80">
                  <th scope="col" className="py-3 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Claim #</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Policy</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Incident Date</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Amount</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Filed Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {claims.map((claim) => {
                  const status = claimStatusConfig[claim.status] || claimStatusConfig.PENDING
                  return (
                    <tr key={claim.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="whitespace-nowrap py-4 pl-5 pr-3 font-mono text-sm font-medium text-slate-900">
                        {claim.claimNumber}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4">
                        <div className="text-sm text-slate-900">{claim.policy.provider}</div>
                        <div className="text-xs text-slate-500 font-mono">{claim.policy.policyNumber}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                        {formatDate(claim.incidentDate)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 tabular-nums">
                        {formatCurrency(claim.amount)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.bg} ${status.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {claim.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                        {formatDate(claim.filedDate)}
                      </td>
                    </tr>
                  )
                })}
                {claims.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      <p className="mt-3 text-sm text-slate-500">No claims found</p>
                      <p className="mt-1 text-xs text-slate-400">Claims will appear here when filed.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expiring Soon Tab */}
      {!loading && !error && activeTab === 'expiring' && (
        <div className="mt-6 space-y-3">
          {expiringPolicies.map((policy) => {
            const days = daysUntilExpiry(policy.expiryDate)
            return (
              <div
                key={policy.id}
                className={`rounded-2xl border shadow-sm p-5 ${
                  days <= 7 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-semibold text-slate-900">{policy.provider}</h3>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        days <= 7 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${days <= 7 ? 'bg-red-500' : 'bg-amber-500'}`} />
                        {days <= 0 ? 'Expired' : `${days} day${days !== 1 ? 's' : ''} left`}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      Policy <span className="font-mono">{policy.policyNumber}</span> &middot; {policy.coverageType}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {policy.truck.make} {policy.truck.model} ({policy.truck.licensePlate}) &middot; Expires {formatDate(policy.expiryDate)}
                    </p>
                  </div>
                  <Link
                    href={`/insurance/${policy.id}`}
                    className="shrink-0 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    View
                  </Link>
                </div>
              </div>
            )
          })}

          {expiringPolicies.length === 0 && (
            <div className="py-16 text-center">
              <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-3 text-sm text-slate-500">No policies expiring soon</p>
              <p className="mt-1 text-xs text-slate-400">All policies are valid for more than 30 days.</p>
            </div>
          )}
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

      {/* Add Policy Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 mb-5">Add Insurance Policy</h3>

            {modalError && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{modalError}</div>
            )}

            <form onSubmit={handleAddPolicy} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Truck</label>
                <select required value={modalForm.truckId} onChange={(e) => setModalForm({ ...modalForm, truckId: e.target.value })}
                  className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500">
                  <option value="">Select a truck...</option>
                  {trucks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name ? `${t.name} — ` : ''}{t.make} {t.model} ({t.licensePlate})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Insurance Provider</label>
                  <input type="text" required placeholder="e.g. State Farm" value={modalForm.provider}
                    onChange={(e) => setModalForm({ ...modalForm, provider: e.target.value })}
                    className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Policy Number</label>
                  <input type="text" required placeholder="POL-123456" value={modalForm.policyNumber}
                    onChange={(e) => setModalForm({ ...modalForm, policyNumber: e.target.value })}
                    className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Coverage Type</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {COVERAGE_TYPES.map((ct) => (
                    <label key={ct}
                      className={`flex items-center justify-center rounded-xl border-2 py-2 px-2 text-xs font-medium cursor-pointer transition-all ${
                        modalForm.coverageType === ct
                          ? 'border-brand-600 bg-brand-50 text-brand-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}>
                      <input type="radio" name="coverageType" value={ct} checked={modalForm.coverageType === ct}
                        onChange={(e) => setModalForm({ ...modalForm, coverageType: e.target.value })} className="sr-only" />
                      {ct}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Premium (₹)</label>
                  <input type="number" step="0.01" required placeholder="1200" value={modalForm.premium}
                    onChange={(e) => setModalForm({ ...modalForm, premium: e.target.value })}
                    className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Deductible ($)</label>
                  <input type="number" step="0.01" required placeholder="1000" value={modalForm.deductible}
                    onChange={(e) => setModalForm({ ...modalForm, deductible: e.target.value })}
                    className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Coverage Limit (₹)</label>
                  <input type="number" step="0.01" required placeholder="500000" value={modalForm.coverageLimit}
                    onChange={(e) => setModalForm({ ...modalForm, coverageLimit: e.target.value })}
                    className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Date</label>
                  <input type="date" required value={modalForm.startDate}
                    onChange={(e) => setModalForm({ ...modalForm, startDate: e.target.value })}
                    className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Expiry Date</label>
                  <input type="date" required value={modalForm.expiryDate}
                    onChange={(e) => setModalForm({ ...modalForm, expiryDate: e.target.value })}
                    className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Notes <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea rows={2} placeholder="Any additional notes..." value={modalForm.notes}
                  onChange={(e) => setModalForm({ ...modalForm, notes: e.target.value })}
                  className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 resize-none" />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={modalSubmitting || !modalForm.coverageType}
                  className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {modalSubmitting ? 'Adding...' : 'Add Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
