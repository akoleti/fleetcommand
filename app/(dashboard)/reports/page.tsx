'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { handleAuthResponse } from '@/lib/api'

interface TruckOption {
  id: string
  name: string | null
  make: string
  model: string
  licensePlate: string
  vin: string
}

type ReportType = 'fleet' | 'truck' | 'fuel'

const reportTypes: { value: ReportType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'fleet',
    label: 'Fleet Overview',
    description: 'Trucks, trips, fuel, maintenance & alerts',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    value: 'truck',
    label: 'Single Truck',
    description: 'Individual truck trip, fuel & maintenance',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
  },
  {
    value: 'fuel',
    label: 'Fuel Analysis',
    description: 'Per-truck breakdown & station costs',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
      </svg>
    ),
  },
]

export default function ReportsPage() {
  const [selectedType, setSelectedType] = useState<ReportType>('fleet')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [truckId, setTruckId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reportHtml, setReportHtml] = useState<string | null>(null)
  const [reportTitle, setReportTitle] = useState('')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [truckSearch, setTruckSearch] = useState('')
  const [truckResults, setTruckResults] = useState<TruckOption[]>([])
  const [truckSearchLoading, setTruckSearchLoading] = useState(false)
  const [selectedTruck, setSelectedTruck] = useState<TruckOption | null>(null)
  const [showTruckDropdown, setShowTruckDropdown] = useState(false)
  const truckDropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const searchTrucks = useCallback(async (query: string) => {
    if (!query.trim()) {
      setTruckResults([])
      return
    }
    setTruckSearchLoading(true)
    try {
      const token = localStorage.getItem('accessToken')
      const params = new URLSearchParams({ search: query, limit: '10' })
      const res = await fetch(`/api/trucks?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!handleAuthResponse(res)) return
      if (res.ok) {
        const data = await res.json()
        const trucks: TruckOption[] = (data.data ?? data).map((t: TruckOption) => ({
          id: t.id, name: t.name, make: t.make, model: t.model, licensePlate: t.licensePlate, vin: t.vin,
        }))
        setTruckResults(trucks)
        setShowTruckDropdown(true)
      }
    } catch { /* ignore */ } finally {
      setTruckSearchLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedTruck) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchTrucks(truckSearch), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [truckSearch, searchTrucks, selectedTruck])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (truckDropdownRef.current && !truckDropdownRef.current.contains(e.target as Node)) {
        setShowTruckDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getHeaders = () => {
    const token = localStorage.getItem('accessToken')
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  }

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      setError('Please select both a start and end date.')
      return
    }

    if (selectedType === 'truck' && !truckId) {
      setError('Please search and select a truck.')
      return
    }

    setLoading(true)
    setError(null)
    setReportHtml(null)

    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          type: selectedType,
          startDate,
          endDate,
          ...(selectedType === 'truck' ? { truckId: truckId.trim() } : {}),
        }),
      })

      if (!handleAuthResponse(response)) return
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate report')
      }

      const data = await response.json()
      setReportHtml(data.html)
      setReportTitle(data.title)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.print()
    }
  }

  const handleOpenNewWindow = () => {
    if (!reportHtml) return
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(reportHtml)
      win.document.close()
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">Generate and view fleet reports</p>
        </div>
      </div>

      {/* Report Generator Card */}
      <div className="mt-6 rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-900">Generate Report</h2>
        <p className="mt-1 text-sm text-slate-500">Select a report type and date range</p>

        {/* Report Type Selector */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {reportTypes.map((rt) => (
            <button
              key={rt.value}
              type="button"
              onClick={() => setSelectedType(rt.value)}
              className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left text-sm font-medium cursor-pointer transition-all ${
                selectedType === rt.value
                  ? 'border-brand-600 bg-brand-50 text-brand-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className={`mt-0.5 shrink-0 ${selectedType === rt.value ? 'text-brand-600' : 'text-slate-400'}`}>
                {rt.icon}
              </div>
              <div>
                <div className="font-semibold">{rt.label}</div>
                <div className={`mt-0.5 text-xs font-normal ${selectedType === rt.value ? 'text-brand-600/70' : 'text-slate-400'}`}>
                  {rt.description}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Date Range */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="startDate" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              End Date
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
            />
          </div>
        </div>

        {/* Truck Selector (conditional) */}
        {selectedType === 'truck' && (
          <div className="mt-4" ref={truckDropdownRef}>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Truck
            </label>
            <div className="relative">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  value={truckSearch}
                  onChange={(e) => {
                    setTruckSearch(e.target.value)
                    if (selectedTruck) {
                      setSelectedTruck(null)
                      setTruckId('')
                    }
                  }}
                  onFocus={() => { if (truckResults.length > 0 && !selectedTruck) setShowTruckDropdown(true) }}
                  placeholder="Search by name, VIN, or license plate…"
                  className="block w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                />
                {truckSearchLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600" />
                  </div>
                )}
              </div>

              {showTruckDropdown && truckResults.length > 0 && !selectedTruck && (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg max-h-60 overflow-y-auto">
                  {truckResults.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedTruck(t)
                        setTruckId(t.id)
                        setTruckSearch(t.name || `${t.make} ${t.model}`)
                        setShowTruckDropdown(false)
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                    >
                      <div className="text-sm font-medium text-slate-900">{t.name || `${t.make} ${t.model}`}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{t.licensePlate} &middot; VIN: {t.vin}</div>
                    </button>
                  ))}
                </div>
              )}

              {showTruckDropdown && truckResults.length === 0 && truckSearch.trim() && !truckSearchLoading && !selectedTruck && (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg px-4 py-3">
                  <p className="text-sm text-slate-500">No trucks found</p>
                </div>
              )}
            </div>

            {selectedTruck && (
              <div className="mt-2 flex items-center gap-3 rounded-xl bg-brand-50 border border-brand-200 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-900">{selectedTruck.name || `${selectedTruck.make} ${selectedTruck.model}`}</p>
                  <p className="text-xs text-brand-700/70 mt-0.5">{selectedTruck.licensePlate} &middot; VIN: {selectedTruck.vin}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedTruck(null); setTruckId(''); setTruckSearch('') }}
                  className="shrink-0 text-brand-600 hover:text-brand-800 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Generate Button */}
        <div className="mt-5">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                Generate Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="mt-6 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="animate-pulse p-6">
            <div className="h-6 w-48 bg-slate-200 rounded mb-4" />
            <div className="h-4 w-full bg-slate-100 rounded mb-2" />
            <div className="h-4 w-3/4 bg-slate-100 rounded mb-2" />
            <div className="h-4 w-5/6 bg-slate-100 rounded mb-6" />
            <div className="grid grid-cols-3 gap-4">
              <div className="h-20 bg-slate-100 rounded-xl" />
              <div className="h-20 bg-slate-100 rounded-xl" />
              <div className="h-20 bg-slate-100 rounded-xl" />
            </div>
          </div>
        </div>
      )}

      {/* Report Preview */}
      {reportHtml && !loading && (
        <div className="mt-6 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50/80">
            <h3 className="text-sm font-semibold text-slate-700 truncate">{reportTitle}</h3>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12zm-8.25 0h.008v.008H10.5V12z" />
                </svg>
                Print
              </button>
              <button
                type="button"
                onClick={handleOpenNewWindow}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                Open in New Tab
              </button>
            </div>
          </div>
          <iframe
            ref={iframeRef}
            srcDoc={reportHtml}
            title={reportTitle}
            className="w-full border-0"
            style={{ minHeight: '600px' }}
            onLoad={() => {
              if (iframeRef.current?.contentDocument) {
                const height = iframeRef.current.contentDocument.documentElement.scrollHeight
                iframeRef.current.style.height = `${Math.min(height + 40, 1200)}px`
              }
            }}
          />
        </div>
      )}
    </div>
  )
}
