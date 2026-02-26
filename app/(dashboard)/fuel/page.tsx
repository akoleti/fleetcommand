'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'

interface Truck {
  id: string
  licensePlate: string
  make: string
  model: string
  year: number
  vin: string
}

interface FuelLog {
  id: string
  gallons: number
  pricePerGallon: number
  totalCost: number
  station: string | null
  odometer: number | null
  fueledAt?: string
  date?: string
  truck: {
    id: string
    licensePlate: string
    make: string
    model: string
  }
}

interface FuelStats {
  totalGallons: number
  totalCost: number
  avgPricePerGallon: number
  topStations?: { station: string; totalGallons: number; totalCost: number }[]
  monthlyTrend?: { month: string; gallons: number; cost: number }[]
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

interface FuelStation {
  id: string
  name: string
}

const getHeaders = () => {
  const token = localStorage.getItem('accessToken')
  return { Authorization: `Bearer ${token}` }
}

const formatCurrency = (amount: number) =>
  `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`

const formatDate = (dateStr: string | undefined | null) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function FuelPage() {
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [selectedTruckId, setSelectedTruckId] = useState<string>('')
  const [logs, setLogs] = useState<FuelLog[]>([])
  const [allLogs, setAllLogs] = useState<FuelLog[]>([])
  const [stats, setStats] = useState<FuelStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [trucksLoading, setTrucksLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Partner fuel stations
  const [fuelStations, setFuelStations] = useState<FuelStation[]>([])
  const [newStation, setNewStation] = useState('')
  const [stationsLoading, setStationsLoading] = useState(true)
  const [addingStation, setAddingStation] = useState(false)
  const [deletingStationId, setDeletingStationId] = useState<string | null>(null)
  const [stationError, setStationError] = useState<string | null>(null)

  useEffect(() => {
    fetchTrucks()
    fetchStats()
    fetchStations()
  }, [])

  const fetchStations = async () => {
    try {
      setStationsLoading(true)
      const res = await fetch('/api/fuel-stations', { headers: getHeaders() })
      if (!res.ok) throw new Error('Failed to fetch fuel stations')
      const data = await res.json()
      setFuelStations(data)
      setStationError(null)
    } catch {
      // non-critical
    } finally {
      setStationsLoading(false)
    }
  }

  const handleAddStation = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newStation.trim()
    if (!trimmed) return
    try {
      setAddingStation(true)
      setStationError(null)
      const res = await fetch('/api/fuel-stations', {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add station')
      setNewStation('')
      setFuelStations((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    } catch (err) {
      setStationError(err instanceof Error ? err.message : 'Failed to add')
    } finally {
      setAddingStation(false)
    }
  }

  const handleDeleteStation = async (id: string) => {
    try {
      setDeletingStationId(id)
      const res = await fetch(`/api/fuel-stations/${id}`, { method: 'DELETE', headers: getHeaders() })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to remove')
      }
      setFuelStations((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      setStationError(err instanceof Error ? err.message : 'Failed to remove')
    } finally {
      setDeletingStationId(null)
    }
  }

  useEffect(() => {
    if (selectedTruckId) {
      fetchTruckLogs()
    } else {
      fetchAllLogs()
    }
  }, [selectedTruckId, page])

  const fetchTrucks = async () => {
    try {
      setTrucksLoading(true)
      const res = await fetch('/api/trucks?limit=100', { headers: getHeaders() })
      if (!res.ok) throw new Error('Failed to fetch trucks')
      const data: PaginatedResponse<Truck> = await res.json()
      setTrucks(data.data)
    } catch {
      // non-critical
    } finally {
      setTrucksLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      setStatsLoading(true)
      const res = await fetch('/api/fuel/stats', { headers: getHeaders() })
      if (!res.ok) throw new Error('Failed to fetch fuel stats')
      setStats(await res.json())
    } catch {
      // non-critical
    } finally {
      setStatsLoading(false)
    }
  }

  const fetchAllLogs = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/fuel?limit=100`, { headers: getHeaders() })
      if (!res.ok) throw new Error('Failed to fetch fuel logs')
      const data: PaginatedResponse<FuelLog> = await res.json()
      setAllLogs(data.data)
      setLogs([])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const fetchTruckLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ truckId: selectedTruckId, page: page.toString(), limit: '50' })
      const res = await fetch(`/api/fuel?${params}`, { headers: getHeaders() })
      if (!res.ok) throw new Error('Failed to fetch fuel logs')
      const data: PaginatedResponse<FuelLog> = await res.json()
      setLogs(data.data)
      setTotalPages(data.pagination.totalPages)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const selectedTruck = useMemo(
    () => trucks.find((t) => t.id === selectedTruckId),
    [trucks, selectedTruckId]
  )

  const truckFuelSummary = useMemo(() => {
    if (selectedTruckId || allLogs.length === 0) return []
    const map = new Map<string, { truck: FuelLog['truck']; gallons: number; cost: number; count: number }>()
    for (const log of allLogs) {
      const existing = map.get(log.truck.id)
      if (existing) {
        existing.gallons += log.gallons
        existing.cost += log.totalCost
        existing.count += 1
      } else {
        map.set(log.truck.id, { truck: log.truck, gallons: log.gallons, cost: log.totalCost, count: 1 })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.cost - a.cost)
  }, [allLogs, selectedTruckId])

  const truckStats = useMemo(() => {
    if (!selectedTruckId || logs.length === 0) return null
    const totalGallons = logs.reduce((s, l) => s + l.gallons, 0)
    const totalCost = logs.reduce((s, l) => s + l.totalCost, 0)
    const avgPrice = totalGallons > 0 ? totalCost / totalGallons : 0
    return { totalGallons, totalCost, avgPrice }
  }, [logs, selectedTruckId])

  const handleTruckChange = (id: string) => {
    setSelectedTruckId(id)
    setPage(1)
  }

  const statCards = selectedTruckId && truckStats
    ? [
        { label: 'Total Gallons', value: truckStats.totalGallons.toLocaleString('en-US', { maximumFractionDigits: 1 }), iconBg: 'bg-brand-50', iconColor: 'text-brand-600' },
        { label: 'Total Cost', value: formatCurrency(truckStats.totalCost), iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
        { label: 'Avg Price/Gal', value: formatCurrency(truckStats.avgPrice), iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
      ]
    : [
        { label: 'Total Gallons', value: stats ? stats.totalGallons.toLocaleString('en-US', { maximumFractionDigits: 1 }) : '-', iconBg: 'bg-brand-50', iconColor: 'text-brand-600' },
        { label: 'Total Cost', value: stats ? formatCurrency(stats.totalCost) : '-', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
        { label: 'Avg Price/Gal', value: stats ? formatCurrency(stats.avgPricePerGallon) : '-', iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
      ]

  const iconSvgs = [
    <svg key="fuel" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" /></svg>,
    <svg key="cost" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    <svg key="avg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
  ]

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fuel Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            {selectedTruck
              ? `${selectedTruck.make} ${selectedTruck.model} — ${selectedTruck.licensePlate}`
              : 'Fleet-wide fuel tracking'}
          </p>
        </div>
        <select
          value={selectedTruckId}
          onChange={(e) => handleTruckChange(e.target.value)}
          disabled={trucksLoading}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors min-w-[220px]"
        >
          <option value="">All Trucks (Fleet Overview)</option>
          {trucks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.make} {t.model} — {t.licensePlate}
            </option>
          ))}
        </select>
      </div>

      {selectedTruck && (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{selectedTruck.make} {selectedTruck.model} ({selectedTruck.year})</p>
            <p className="text-xs text-slate-500">{selectedTruck.licensePlate} · {selectedTruck.vin}</p>
          </div>
          <Link href={`/trucks/${selectedTruck.id}`} className="ml-auto text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors">
            View Truck →
          </Link>
        </div>
      )}

      {/* Partner Fuel Stations */}
      <div className="mt-6 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Partner Fuel Stations</h2>
          <p className="mt-1 text-sm text-slate-500">
            Add fuel stations you have tie-ups with. They appear as suggestions when logging fuel on a truck.
          </p>
        </div>
        <div className="px-6 py-4">
          {stationError && (
            <div className="mb-4 flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
              <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-700">{stationError}</p>
            </div>
          )}
          <form onSubmit={handleAddStation} className="flex gap-3 mb-4">
            <input
              type="text"
              value={newStation}
              onChange={(e) => setNewStation(e.target.value)}
              placeholder="e.g. ABC Fleet Fuel, XYZ Truck Stop"
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
            />
            <button
              type="submit"
              disabled={addingStation || !newStation.trim()}
              className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {addingStation ? 'Adding...' : 'Add Station'}
            </button>
          </form>
          {stationsLoading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2].map((i) => <div key={i} className="h-10 bg-slate-200 rounded-lg" />)}
            </div>
          ) : fuelStations.length === 0 ? (
            <p className="text-sm text-slate-500 py-2">No partner stations yet. Add stations above to see them when logging fuel.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {fuelStations.map((station) => (
                <li key={station.id} className="flex items-center justify-between py-3 first:pt-0">
                  <span className="text-sm font-medium text-slate-900">{station.name}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteStation(station.id)}
                    disabled={deletingStationId === station.id}
                    className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors"
                  >
                    {deletingStationId === station.id ? 'Removing...' : 'Remove'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((card, i) => (
          <div key={card.label} className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            {(statsLoading && !selectedTruckId) || (loading && selectedTruckId) ? (
              <div className="animate-pulse">
                <div className="h-4 w-20 bg-slate-200 rounded mb-3" />
                <div className="h-8 w-24 bg-slate-200 rounded" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{card.label}</p>
                  <div className={`w-8 h-8 rounded-lg ${card.iconBg} flex items-center justify-center ${card.iconColor}`}>
                    {iconSvgs[i]}
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-900 tabular-nums">{card.value}</p>
              </>
            )}
          </div>
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
              <div className="h-4 w-16 bg-slate-100 rounded" />
              <div className="h-4 w-16 bg-slate-100 rounded" />
              <div className="h-4 w-20 bg-slate-100 rounded" />
              <div className="h-4 w-28 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Fleet Overview — per-truck summary table */}
      {!loading && !error && !selectedTruckId && (
        <div className="mt-6 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="bg-slate-50/80">
                  <th scope="col" className="py-3 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Truck</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Fill-ups</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Total Gallons</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Total Cost</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Avg $/Gal</th>
                  <th scope="col" className="relative py-3 pl-3 pr-5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {truckFuelSummary.map((row) => (
                  <tr key={row.truck.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="whitespace-nowrap py-4 pl-5 pr-3">
                      <div className="font-medium text-slate-900">{row.truck.make} {row.truck.model}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{row.truck.licensePlate}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 tabular-nums">{row.count}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 tabular-nums">{row.gallons.toLocaleString('en-US', { maximumFractionDigits: 1 })}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-slate-900 tabular-nums">{formatCurrency(row.cost)}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 tabular-nums">{row.gallons > 0 ? formatCurrency(row.cost / row.gallons) : '-'}</td>
                    <td className="whitespace-nowrap py-4 pl-3 pr-5 text-right">
                      <button
                        onClick={() => handleTruckChange(row.truck.id)}
                        className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
                      >
                        View Logs
                      </button>
                    </td>
                  </tr>
                ))}
                {truckFuelSummary.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
                      </svg>
                      <p className="mt-3 text-sm text-slate-500">No fuel logs found</p>
                      <p className="mt-1 text-xs text-slate-400">Add fuel logs to see fleet-wide stats.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Truck-specific fuel log table */}
      {!loading && !error && selectedTruckId && (
        <div className="mt-6 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="bg-slate-50/80">
                  <th scope="col" className="py-3 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Station</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Gallons</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Price/Gal</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Total Cost</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Odometer</th>
                  <th scope="col" className="relative py-3 pl-3 pr-5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="whitespace-nowrap py-4 pl-5 pr-3 text-sm text-slate-900">
                      {formatDate(log.fueledAt ?? log.date)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                      {log.station || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 tabular-nums">
                      {log.gallons.toFixed(1)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 tabular-nums">
                      {formatCurrency(log.pricePerGallon)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-slate-900 tabular-nums">
                      {formatCurrency(log.totalCost)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 tabular-nums">
                      {log.odometer != null ? log.odometer.toLocaleString() : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="whitespace-nowrap py-4 pl-3 pr-5 text-right">
                      <Link href={`/fuel/${log.id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
                      </svg>
                      <p className="mt-3 text-sm text-slate-500">No fuel logs for this truck</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && selectedTruckId && totalPages > 1 && (
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
