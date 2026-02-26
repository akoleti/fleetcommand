'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Truck {
  id: string
  vin: string
  licensePlate: string
  make: string
  model: string
  year: number
  status: string
  currentDriver: {
    id: string
    name: string
    licenseNumber: string
    phone: string
    status: string
  } | null
  truckStatus: {
    latitude: number
    longitude: number
    speed: number
    heading: number
    fuelLevel: number | null
    ignitionOn: boolean
    lastPingAt: string
  } | null
  insurancePolicies: Array<{
    id: string
    provider: string
    policyNumber: string
    expiryDate: string
    coverageType: string
  }>
}

type TabType = 'overview' | 'location' | 'trips' | 'maintenance' | 'fuel' | 'insurance'

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  ACTIVE: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  IDLE: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  MAINTENANCE: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  BLOCKED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  INACTIVE: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
}

const tabs: { id: TabType; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'location', label: 'Location' },
  { id: 'trips', label: 'Trips' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'fuel', label: 'Fuel' },
  { id: 'insurance', label: 'Insurance' },
]

export default function TruckDetailPage() {
  const params = useParams()
  const truckId = params?.id as string

  const [truck, setTruck] = useState<Truck | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  useEffect(() => {
    if (truckId) fetchTruck()
  }, [truckId])

  const fetchTruck = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/trucks/${truckId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) throw new Error('Failed to fetch truck')

      const data: Truck = await response.json()
      setTruck(data)
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
          <span className="text-sm text-slate-500">Loading truck details...</span>
        </div>
      </div>
    )
  }

  if (error || !truck) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-danger-50 border border-red-200 px-5 py-4">
        <svg className="w-5 h-5 text-danger-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
        </svg>
        <p className="text-sm text-danger-700">{error || 'Truck not found'}</p>
      </div>
    )
  }

  const status = statusConfig[truck.status] || statusConfig.INACTIVE

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/trucks" className="hover:text-brand-600 transition-colors">Trucks</Link>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-slate-900 font-medium">{truck.make} {truck.model}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
            <svg className="w-7 h-7 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {truck.make} {truck.model} <span className="text-slate-400 font-normal">({truck.year})</span>
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {truck.licensePlate} &middot; VIN: {truck.vin}
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-sm font-medium ${status.bg} ${status.text}`}>
          <span className={`w-2 h-2 rounded-full ${status.dot}`} />
          {truck.status}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-slate-100 mb-8 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Specifications */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Specifications</h3>
            </div>
            <dl className="px-6 py-4 space-y-3">
              {[
                ['Make', truck.make],
                ['Model', truck.model],
                ['Year', truck.year],
                ['VIN', truck.vin],
                ['License Plate', truck.licensePlate],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between">
                  <dt className="text-sm text-slate-500">{label}</dt>
                  <dd className="text-sm font-medium text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Current Driver */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Current Driver</h3>
            </div>
            <div className="px-6 py-4">
              {truck.currentDriver ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-lg font-bold">
                      {truck.currentDriver.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{truck.currentDriver.name}</p>
                      <p className="text-sm text-slate-500">{truck.currentDriver.phone}</p>
                    </div>
                  </div>
                  <dl className="space-y-3">
                    <div className="flex items-center justify-between">
                      <dt className="text-sm text-slate-500">License</dt>
                      <dd className="text-sm font-medium text-slate-900">{truck.currentDriver.licenseNumber}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-sm text-slate-500">Status</dt>
                      <dd className="text-sm font-medium text-slate-900">{truck.currentDriver.status}</dd>
                    </div>
                  </dl>
                </>
              ) : (
                <div className="text-center py-6">
                  <svg className="mx-auto h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  <p className="mt-2 text-sm text-slate-500">No driver assigned</p>
                  <button className="mt-3 text-sm font-medium text-brand-600 hover:text-brand-700">Assign Driver</button>
                </div>
              )}
            </div>
          </div>

          {/* Live status */}
          {truck.truckStatus && (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Live Status</h3>
              </div>
              <div className="px-6 py-4 grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Speed</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{truck.truckStatus.speed} <span className="text-sm font-normal text-slate-500">km/h</span></p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Heading</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{truck.truckStatus.heading}&deg;</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Fuel Level</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{truck.truckStatus.fuelLevel ?? 'N/A'}<span className="text-sm font-normal text-slate-500">%</span></p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Ignition</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    <span className={`inline-flex items-center gap-1.5 ${truck.truckStatus.ignitionOn ? 'text-emerald-600' : 'text-slate-400'}`}>
                      <span className={`w-2 h-2 rounded-full ${truck.truckStatus.ignitionOn ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      {truck.truckStatus.ignitionOn ? 'On' : 'Off'}
                    </span>
                  </p>
                </div>
              </div>
              <div className="px-6 pb-4">
                <p className="text-xs text-slate-400">
                  Last update: {new Date(truck.truckStatus.lastPingAt).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Insurance summary */}
          {truck.insurancePolicies?.length > 0 && (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Active Insurance</h3>
              </div>
              <dl className="px-6 py-4 space-y-3">
                {[
                  ['Provider', truck.insurancePolicies[0].provider],
                  ['Policy No.', truck.insurancePolicies[0].policyNumber],
                  ['Coverage', truck.insurancePolicies[0].coverageType],
                  ['Expiry', new Date(truck.insurancePolicies[0].expiryDate).toLocaleDateString()],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex items-center justify-between">
                    <dt className="text-sm text-slate-500">{label}</dt>
                    <dd className="text-sm font-medium text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      )}

      {activeTab === 'location' && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Current Location</h3>
          </div>
          {truck.truckStatus ? (
            <div>
              <div className="px-6 py-3 text-sm text-slate-500 bg-slate-50/50">
                Coordinates: {truck.truckStatus.latitude.toFixed(6)}, {truck.truckStatus.longitude.toFixed(6)}
              </div>
              <div className="bg-slate-100 h-96 flex items-center justify-center">
                <div className="text-center">
                  <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <p className="mt-3 text-sm text-slate-500">Map integration coming soon</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-sm text-slate-500">No location data available</div>
          )}
        </div>
      )}

      {activeTab === 'trips' && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm px-6 py-12 text-center">
          <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
          </svg>
          <h3 className="mt-3 text-sm font-medium text-slate-900">Trip History</h3>
          <p className="mt-1 text-sm text-slate-500">Trip integration coming soon</p>
        </div>
      )}

      {activeTab === 'maintenance' && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm px-6 py-12 text-center">
          <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384 5.384a2.625 2.625 0 01-3.712-3.712l5.384-5.384m0 0L11.42 15.17m-4.714-4.714a2.625 2.625 0 013.712-3.712l5.384 5.384m0 0l-5.384 5.384" />
          </svg>
          <h3 className="mt-3 text-sm font-medium text-slate-900">Maintenance History</h3>
          <p className="mt-1 text-sm text-slate-500">Maintenance module coming soon</p>
        </div>
      )}

      {activeTab === 'fuel' && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm px-6 py-12 text-center">
          <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
          </svg>
          <h3 className="mt-3 text-sm font-medium text-slate-900">Fuel Logs</h3>
          <p className="mt-1 text-sm text-slate-500">Fuel module coming soon</p>
        </div>
      )}

      {activeTab === 'insurance' && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm px-6 py-12 text-center">
          <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <h3 className="mt-3 text-sm font-medium text-slate-900">Insurance Policies</h3>
          <p className="mt-1 text-sm text-slate-500">Insurance module coming soon</p>
        </div>
      )}
    </div>
  )
}
