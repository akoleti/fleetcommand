'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { gallonsToLiters, litersToGallons, GALLONS_TO_LITERS } from '@/lib/format'
import { handleAuthResponse } from '@/lib/api'
import { CloseMaintenanceModal } from '@/components/maintenance/CloseMaintenanceModal'

interface Truck {
  id: string
  organizationId: string
  name: string | null
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

interface AvailableDriver {
  id: string
  name: string
  licenseNumber: string
  phone: string
  status: string
}

interface TripRecord {
  id: string
  originAddress: string
  destinationAddress: string
  scheduledStart: string
  status: string
  driver: { id: string; name: string } | null
}

interface MaintenanceRecord {
  id: string
  type: string
  status: string
  description: string | null
  scheduledDate: string
  cost: number | null
  vendor: string | null
}

interface FuelRecord {
  id: string
  date?: string
  fueledAt?: string
  station: string | null
  gallons: number
  pricePerGallon: number
  totalCost: number
  odometer: number | null
}

interface InsurancePolicy {
  id: string
  provider: string
  policyNumber: string
  coverageType: string
  premium: number | null
  expiryDate: string
  isActive: boolean
  claims: Array<{
    id: string
    claimNumber: string
    description: string
    amount: number | null
    status: string
    filedDate: string
  }>
}

type TabType = 'overview' | 'location' | 'trips' | 'maintenance' | 'fuel' | 'insurance'

const maintenanceTypeLabels: Record<string, string> = {
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

const maintenanceStatusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  SCHEDULED: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  IN_PROGRESS: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
}

const tripStatusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  SCHEDULED: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  IN_PROGRESS: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
}

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  ACTIVE: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  IDLE: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  MAINTENANCE: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  BLOCKED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  INACTIVE: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
}

const ISSUE_TYPES = [
  { value: 'ENGINE_REPAIR', label: 'Engine' },
  { value: 'BRAKE_SERVICE', label: 'Brakes' },
  { value: 'TIRE_ROTATION', label: 'Tires' },
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'TRANSMISSION', label: 'Transmission' },
  { value: 'BODY_WORK', label: 'Body' },
  { value: 'OTHER', label: 'Other' },
]

const FUEL_STATIONS = ['Pilot Flying J', "Love's Travel Stop", 'TA Petro', "Casey's", "Buc-ee's", 'QuikTrip', 'Other']

const COVERAGE_TYPES = ['Liability', 'Full Coverage', 'Comprehensive', 'Cargo Insurance', 'Physical Damage']

const tabs: { id: TabType; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'location', label: 'Location' },
  { id: 'trips', label: 'Trips' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'fuel', label: 'Fuel' },
  { id: 'insurance', label: 'Insurance' },
]

const inputCls = 'block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500'
const labelCls = 'block text-sm font-medium text-slate-700 mb-1.5'
const primaryBtnCls = 'rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
const secondaryBtnCls = 'rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors'

const formatFuelDate = (dateStr: string | undefined | null) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      {children}
    </div>
  )
}

export default function TruckDetailPage() {
  const params = useParams()
  const truckId = params?.id as string

  const [truck, setTruck] = useState<Truck | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  const [trips, setTrips] = useState<TripRecord[]>([])
  const [tripsLoading, setTripsLoading] = useState(false)
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([])
  const [maintenanceLoading, setMaintenanceLoading] = useState(false)
  const [fuelLogs, setFuelLogs] = useState<FuelRecord[]>([])
  const [fuelLoading, setFuelLoading] = useState(false)
  const [insurance, setInsurance] = useState<InsurancePolicy[]>([])
  const [insuranceLoading, setInsuranceLoading] = useState(false)

  const [truckAlerts, setTruckAlerts] = useState<{ id: string; severity: string; title: string; message: string; createdAt: string; acknowledged: boolean }[]>([])

  const fetchedTabs = useRef<Set<TabType>>(new Set())

  // Driver assign modal
  const [driverModalOpen, setDriverModalOpen] = useState(false)
  const [availableDrivers, setAvailableDrivers] = useState<AvailableDriver[]>([])
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [driverAssigning, setDriverAssigning] = useState(false)
  const [driverError, setDriverError] = useState<string | null>(null)

  // Trip modal
  const [tripModalOpen, setTripModalOpen] = useState(false)
  const [tripForm, setTripForm] = useState({ driverId: '', originAddress: '', originLat: '', originLng: '', destinationAddress: '', destinationLat: '', destinationLng: '', scheduledStart: '', scheduledEnd: '', notes: '' })
  const [tripSubmitting, setTripSubmitting] = useState(false)
  const [tripError, setTripError] = useState<string | null>(null)

  // Maintenance modal
  const [maintModalOpen, setMaintModalOpen] = useState(false)
  const [maintForm, setMaintForm] = useState({ type: 'OTHER', description: '', vendor: '', scheduledDate: '', notes: '' })
  const [maintSubmitting, setMaintSubmitting] = useState(false)
  const [maintError, setMaintError] = useState<string | null>(null)

  // Close maintenance modal (from trucks page)
  const [closeMaintId, setCloseMaintId] = useState<string | null>(null)

  // Fuel modal
  const [fuelModalOpen, setFuelModalOpen] = useState(false)
  const [fuelForm, setFuelForm] = useState({ liters: '', pricePerLiter: '', odometer: '', station: '' })
  const [fuelSubmitting, setFuelSubmitting] = useState(false)
  const [fuelModalError, setFuelModalError] = useState<string | null>(null)
  const [orgFuelStations, setOrgFuelStations] = useState<string[]>([])

  // Insurance modal
  const [insuranceModalOpen, setInsuranceModalOpen] = useState(false)
  const [insuranceForm, setInsuranceForm] = useState({ provider: '', policyNumber: '', coverageType: 'Liability', premium: '', deductible: '', coverageLimit: '', startDate: '', expiryDate: '', notes: '' })
  const [insuranceSubmitting, setInsuranceSubmitting] = useState(false)
  const [insuranceError, setInsuranceError] = useState<string | null>(null)

  // Location update
  const [locationFormOpen, setLocationFormOpen] = useState(false)
  const [locationForm, setLocationForm] = useState({ latitude: '', longitude: '' })
  const [locationSubmitting, setLocationSubmitting] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  const authHeaders = () => {
    const token = localStorage.getItem('accessToken')
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  }

  useEffect(() => {
    if (truckId) fetchTruck()
  }, [truckId])

  useEffect(() => {
    if (!truckId || fetchedTabs.current.has(activeTab)) return
    const token = localStorage.getItem('accessToken')
    const headers = { Authorization: `Bearer ${token}` }

    if (activeTab === 'trips') {
      fetchedTabs.current.add('trips')
      setTripsLoading(true)
      fetch(`/api/trips?truckId=${truckId}&limit=20`, { headers })
        .then((r) => { if (!handleAuthResponse(r)) return Promise.reject(); return r.ok ? r.json() : Promise.reject() })
        .then((d) => setTrips(d.data ?? d))
        .catch(() => {})
        .finally(() => setTripsLoading(false))
    }

    if (activeTab === 'maintenance') {
      fetchedTabs.current.add('maintenance')
      setMaintenanceLoading(true)
      fetch(`/api/maintenance?truckId=${truckId}&limit=20`, { headers })
        .then((r) => { if (!handleAuthResponse(r)) return Promise.reject(); return r.ok ? r.json() : Promise.reject() })
        .then((d) => setMaintenance(d.data ?? d))
        .catch(() => {})
        .finally(() => setMaintenanceLoading(false))
    }

    if (activeTab === 'fuel') {
      fetchedTabs.current.add('fuel')
      setFuelLoading(true)
      Promise.all([
        fetch(`/api/fuel?truckId=${truckId}&limit=20`, { headers }).then((r) => { if (!handleAuthResponse(r)) return Promise.reject(); return r.ok ? r.json() : Promise.reject() }).then((d) => d.data ?? d),
        fetch('/api/fuel-stations', { headers }).then((r) => { if (!handleAuthResponse(r)) return Promise.reject(); return r.ok ? r.json() : [] }).catch(() => []),
      ]).then(([logs, stations]: [FuelRecord[], { name: string }[]]) => {
        setFuelLogs(logs)
        setOrgFuelStations(stations.map((s) => s.name))
      }).catch(() => {}).finally(() => setFuelLoading(false))
    }

    if (activeTab === 'insurance') {
      fetchedTabs.current.add('insurance')
      setInsuranceLoading(true)
      fetch(`/api/insurance?truckId=${truckId}&limit=10`, { headers })
        .then((r) => { if (!handleAuthResponse(r)) return Promise.reject(); return r.ok ? r.json() : Promise.reject() })
        .then((d) => setInsurance(d.data ?? d))
        .catch(() => {})
        .finally(() => setInsuranceLoading(false))
    }
  }, [activeTab, truckId])

  const fetchTruck = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('accessToken')
      const headers = { Authorization: `Bearer ${token}` }

      const [truckRes, alertsRes] = await Promise.all([
        fetch(`/api/trucks/${truckId}`, { headers }),
        fetch(`/api/alerts?truckId=${truckId}&limit=10&acknowledged=false`, { headers }),
      ])

      if (!handleAuthResponse(truckRes) || !handleAuthResponse(alertsRes)) return
      if (!truckRes.ok) throw new Error('Failed to fetch truck')

      const data: Truck = await truckRes.json()
      setTruck(data)
      setError(null)

      if (alertsRes.ok) {
        const alertData = await alertsRes.json()
        setTruckAlerts(alertData.data || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const refetchTrips = async () => {
    const token = localStorage.getItem('accessToken')
    const headers = { Authorization: `Bearer ${token}` }
    setTripsLoading(true)
    try {
      const r = await fetch(`/api/trips?truckId=${truckId}&limit=20`, { headers })
      if (!handleAuthResponse(r)) return
      if (r.ok) { const d = await r.json(); setTrips(d.data ?? d) }
    } catch {} finally { setTripsLoading(false) }
  }

  const refetchMaintenance = async () => {
    const token = localStorage.getItem('accessToken')
    const headers = { Authorization: `Bearer ${token}` }
    setMaintenanceLoading(true)
    try {
      const r = await fetch(`/api/maintenance?truckId=${truckId}&limit=20`, { headers })
      if (!handleAuthResponse(r)) return
      if (r.ok) { const d = await r.json(); setMaintenance(d.data ?? d) }
    } catch {} finally { setMaintenanceLoading(false) }
  }

  const refetchFuel = async () => {
    const token = localStorage.getItem('accessToken')
    const headers = { Authorization: `Bearer ${token}` }
    setFuelLoading(true)
    try {
      const r = await fetch(`/api/fuel?truckId=${truckId}&limit=20`, { headers })
      if (!handleAuthResponse(r)) return
      if (r.ok) { const d = await r.json(); setFuelLogs(d.data ?? d) }
    } catch {} finally { setFuelLoading(false) }
  }

  const refetchInsurance = async () => {
    const token = localStorage.getItem('accessToken')
    const headers = { Authorization: `Bearer ${token}` }
    setInsuranceLoading(true)
    try {
      const r = await fetch(`/api/insurance?truckId=${truckId}&limit=10`, { headers })
      if (!handleAuthResponse(r)) return
      if (r.ok) { const d = await r.json(); setInsurance(d.data ?? d) }
    } catch {} finally { setInsuranceLoading(false) }
  }

  const fetchAvailableDrivers = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const r = await fetch('/api/drivers?status=available&limit=100', { headers: { Authorization: `Bearer ${token}` } })
      if (!handleAuthResponse(r)) return
      if (r.ok) { const d = await r.json(); setAvailableDrivers(d.data ?? d) }
    } catch {}
  }

  const fetchDriversForTripModal = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const r = await fetch('/api/drivers?status=available&limit=100', { headers: { Authorization: `Bearer ${token}` } })
      if (!handleAuthResponse(r)) return
      if (r.ok) {
        const d = await r.json()
        const drivers: AvailableDriver[] = d.data ?? d
        // Include truck's assigned driver even if not "available" (e.g. ON_TRIP, OFF_DUTY)
        if (truck?.currentDriver && !drivers.some((dd: AvailableDriver) => dd.id === truck.currentDriver!.id)) {
          const cd = truck.currentDriver
          setAvailableDrivers([{ id: cd.id, name: cd.name, licenseNumber: cd.licenseNumber, phone: cd.phone, status: cd.status }, ...drivers])
        } else {
          setAvailableDrivers(drivers)
        }
      }
    } catch {}
  }

  const openDriverModal = () => {
    setDriverError(null)
    setSelectedDriverId('')
    setDriverModalOpen(true)
    fetchAvailableDrivers()
  }

  const handleAssignDriver = async () => {
    if (!selectedDriverId) return
    setDriverAssigning(true)
    setDriverError(null)
    try {
      const res = await fetch(`/api/trucks/${truckId}/assign`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ driverId: selectedDriverId }),
      })
      if (!handleAuthResponse(res)) return
      if (!res.ok) { const d = await res.json(); setDriverError(d.error || 'Failed to assign driver'); return }
      setDriverModalOpen(false)
      await fetchTruck()
    } catch { setDriverError('An unexpected error occurred') }
    finally { setDriverAssigning(false) }
  }

  const handleUnassignDriver = async () => {
    setDriverAssigning(true)
    try {
      const res = await fetch(`/api/trucks/${truckId}/assign`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ driverId: null }),
      })
      if (!handleAuthResponse(res)) return
      if (res.ok) await fetchTruck()
    } catch {}
    finally { setDriverAssigning(false) }
  }

  const openTripModal = () => {
    setTripError(null)
    const defaultDriverId = truck?.currentDriver?.id ?? ''
    setTripForm({ driverId: defaultDriverId, originAddress: '', originLat: '', originLng: '', destinationAddress: '', destinationLat: '', destinationLng: '', scheduledStart: '', scheduledEnd: '', notes: '' })
    setTripModalOpen(true)
    fetchDriversForTripModal()
  }

  const handleTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTripSubmitting(true)
    setTripError(null)
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          truckId,
          driverId: tripForm.driverId || null,
          originAddress: tripForm.originAddress,
          originLat: (() => { const n = parseFloat(tripForm.originLat); return !isNaN(n) ? n : null })(),
          originLng: (() => { const n = parseFloat(tripForm.originLng); return !isNaN(n) ? n : null })(),
          destinationAddress: tripForm.destinationAddress,
          destinationLat: (() => { const n = parseFloat(tripForm.destinationLat); return !isNaN(n) ? n : null })(),
          destinationLng: (() => { const n = parseFloat(tripForm.destinationLng); return !isNaN(n) ? n : null })(),
          scheduledStart: new Date(tripForm.scheduledStart).toISOString(),
          scheduledEnd: tripForm.scheduledEnd ? new Date(tripForm.scheduledEnd).toISOString() : null,
          notes: tripForm.notes || null,
        }),
      })
      if (!handleAuthResponse(res)) return
      if (!res.ok) { const d = await res.json(); setTripError(d.error || 'Failed to schedule trip'); return }
      setTripModalOpen(false)
      await refetchTrips()
    } catch { setTripError('An unexpected error occurred') }
    finally { setTripSubmitting(false) }
  }

  const openMaintModal = () => {
    setMaintError(null)
    setMaintForm({ type: 'OTHER', description: '', vendor: '', scheduledDate: '', notes: '' })
    setMaintModalOpen(true)
  }

  const handleMaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMaintSubmitting(true)
    setMaintError(null)
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          truckId,
          type: maintForm.type,
          description: maintForm.description,
          vendor: maintForm.vendor || null,
          scheduledDate: new Date(maintForm.scheduledDate).toISOString(),
          notes: maintForm.notes || null,
        }),
      })
      if (!handleAuthResponse(res)) return
      if (!res.ok) { const d = await res.json(); setMaintError(d.error || 'Failed to schedule maintenance'); return }
      setMaintModalOpen(false)
      await refetchMaintenance()
    } catch { setMaintError('An unexpected error occurred') }
    finally { setMaintSubmitting(false) }
  }

  const openFuelModal = () => {
    setFuelModalError(null)
    setFuelForm({ liters: '', pricePerLiter: '', odometer: '', station: '' })
    setFuelModalOpen(true)
    fetch('/api/fuel-stations', { headers: authHeaders() })
      .then((r) => { if (!handleAuthResponse(r)) return Promise.reject(); return r.ok ? r.json() : [] })
      .then((stations: { name: string }[]) => setOrgFuelStations(stations.map((s) => s.name)))
      .catch(() => {})
  }

  const handleFuelSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFuelSubmitting(true)
    setFuelModalError(null)
    try {
      const res = await fetch('/api/fuel', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          truckId,
          gallons: litersToGallons(parseFloat(fuelForm.liters)),
          pricePerGallon: parseFloat(fuelForm.pricePerLiter) * GALLONS_TO_LITERS,
          odometer: parseInt(fuelForm.odometer),
          station: fuelForm.station || null,
        }),
      })
      if (!handleAuthResponse(res)) return
      if (!res.ok) { const d = await res.json(); setFuelModalError(d.error || 'Failed to log fuel'); return }
      setFuelModalOpen(false)
      await refetchFuel()
    } catch { setFuelModalError('An unexpected error occurred') }
    finally { setFuelSubmitting(false) }
  }

  const fuelTotalCost = fuelForm.liters && fuelForm.pricePerLiter
    ? (parseFloat(fuelForm.liters) * parseFloat(fuelForm.pricePerLiter)).toFixed(2)
    : null

  const openInsuranceModal = () => {
    setInsuranceError(null)
    setInsuranceForm({ provider: '', policyNumber: '', coverageType: 'Liability', premium: '', deductible: '', coverageLimit: '', startDate: '', expiryDate: '', notes: '' })
    setInsuranceModalOpen(true)
  }

  const handleInsuranceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setInsuranceSubmitting(true)
    setInsuranceError(null)
    try {
      const res = await fetch('/api/insurance', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          truckId,
          organizationId: truck?.organizationId,
          provider: insuranceForm.provider,
          policyNumber: insuranceForm.policyNumber,
          coverageType: insuranceForm.coverageType,
          premium: parseFloat(insuranceForm.premium),
          deductible: parseFloat(insuranceForm.deductible),
          coverageLimit: parseFloat(insuranceForm.coverageLimit),
          startDate: new Date(insuranceForm.startDate).toISOString(),
          expiryDate: new Date(insuranceForm.expiryDate).toISOString(),
          notes: insuranceForm.notes || null,
        }),
      })
      if (!handleAuthResponse(res)) return
      if (!res.ok) { const d = await res.json(); setInsuranceError(d.error || 'Failed to add policy'); return }
      setInsuranceModalOpen(false)
      await refetchInsurance()
    } catch { setInsuranceError('An unexpected error occurred') }
    finally { setInsuranceSubmitting(false) }
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
        <span className="text-slate-900 font-medium">{truck.name || `${truck.make} ${truck.model}`}</span>
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
              {truck.name || <>{truck.make} {truck.model} <span className="text-slate-400 font-normal">({truck.year})</span></>}
            </h1>
            {truck.name && (
              <p className="mt-0.5 text-sm font-medium text-slate-600">
                {truck.make} {truck.model} ({truck.year})
              </p>
            )}
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
        <>
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
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Current Driver</h3>
              {truck.currentDriver && (
                <div className="flex items-center gap-2">
                  <button onClick={openDriverModal} className="rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition-colors">Reassign</button>
                  <button onClick={handleUnassignDriver} disabled={driverAssigning} className="rounded-xl border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors">Unassign</button>
                </div>
              )}
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
                  <button onClick={openDriverModal} className="mt-3 text-sm font-medium text-brand-600 hover:text-brand-700">Assign Driver</button>
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

        {/* Active Alerts for this truck */}
        {truckAlerts.length > 0 && (
          <div className="mt-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900">Active Alerts</h3>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-xs font-bold text-red-700">{truckAlerts.length}</span>
              </div>
              <Link href="/alerts" className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">View all</Link>
            </div>
            <div className="divide-y divide-slate-100">
              {truckAlerts.map((alert) => {
                const alertSev = alert.severity === 'CRITICAL'
                  ? { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' }
                  : alert.severity === 'WARNING'
                    ? { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' }
                    : { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' }
                return (
                  <div key={alert.id} className="px-6 py-3 flex items-start gap-3">
                    <span className={`mt-0.5 shrink-0 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${alertSev.bg} ${alertSev.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${alertSev.dot}`} />
                      {alert.severity}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{alert.title}</p>
                      <p className="mt-0.5 text-sm text-slate-500 truncate">{alert.message}</p>
                    </div>
                    <time className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                      {new Date(alert.createdAt).toLocaleDateString()}
                    </time>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        </>
      )}

      {activeTab === 'location' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h3 className="font-semibold text-slate-900">Current Location</h3>
              <button
                type="button"
                onClick={() => {
                  setLocationError(null)
                  setLocationForm({
                    latitude: truck.truckStatus?.latitude?.toString() ?? '',
                    longitude: truck.truckStatus?.longitude?.toString() ?? '',
                  })
                  setLocationFormOpen(true)
                }}
                className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
              >
                Update location manually
              </button>
            </div>
            {truck.truckStatus ? (
              <div>
                <div className="px-6 py-3 text-sm text-slate-500 bg-slate-50/50">
                  Coordinates: {truck.truckStatus.latitude.toFixed(6)}, {truck.truckStatus.longitude.toFixed(6)}
                </div>
                <div className="bg-slate-100 h-64 flex items-center justify-center">
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
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-slate-500 mb-4">No location data available</p>
                <button
                  type="button"
                  onClick={() => {
                    setLocationForm({ latitude: '', longitude: '' })
                    setLocationFormOpen(true)
                  }}
                  className="text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  Add location manually
                </button>
              </div>
            )}
          </div>

          {locationFormOpen && (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
              <h4 className="font-semibold text-slate-900 mb-3">Update Location</h4>
              {locationError && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{locationError}</div>
              )}
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  const lat = parseFloat(locationForm.latitude)
                  const lng = parseFloat(locationForm.longitude)
                  if (isNaN(lat) || isNaN(lng)) {
                    setLocationError('Enter valid latitude and longitude')
                    return
                  }
                  setLocationSubmitting(true)
                  setLocationError(null)
                  try {
                    const res = await fetch(`/api/trucks/${truckId}/location`, {
                      method: 'PATCH',
                      headers: authHeaders(),
                      body: JSON.stringify({ latitude: lat, longitude: lng }),
                    })
                    if (!handleAuthResponse(res)) return
                    const data = await res.json()
                    if (!res.ok) throw new Error(data.error || 'Failed to update')
                    setLocationForm({ latitude: '', longitude: '' })
                    setLocationFormOpen(false)
                    await fetchTruck()
                  } catch (err) {
                    setLocationError(err instanceof Error ? err.message : 'Failed to update')
                  } finally {
                    setLocationSubmitting(false)
                  }
                }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <div className="flex-1">
                  <label className={labelCls}>Latitude</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 37.7749"
                    value={locationForm.latitude}
                    onChange={(e) => setLocationForm({ ...locationForm, latitude: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div className="flex-1">
                  <label className={labelCls}>Longitude</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. -122.4194"
                    value={locationForm.longitude}
                    onChange={(e) => setLocationForm({ ...locationForm, longitude: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setLocationForm({ latitude: '', longitude: '' }); setLocationFormOpen(false) }}
                    className={secondaryBtnCls}
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={locationSubmitting} className={primaryBtnCls}>
                    {locationSubmitting ? 'Saving...' : 'Save Location'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {activeTab === 'trips' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Trips</h3>
            <button onClick={openTripModal} className={primaryBtnCls}>Schedule Trip</button>
          </div>
          {tripsLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
            </div>
          ) : trips.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm px-6 py-12 text-center">
              <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
              <p className="mt-3 text-sm text-slate-500">No trips found for this truck</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className="py-3 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Route</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Driver</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Scheduled</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="relative py-3 pl-3 pr-5"><span className="sr-only">View</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {trips.map((trip) => {
                    const ts = tripStatusConfig[trip.status] || tripStatusConfig.SCHEDULED
                    return (
                      <tr key={trip.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 pl-5 pr-3">
                          <div className="flex items-start gap-2">
                            <div className="mt-1 flex flex-col items-center gap-0.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span className="w-px h-4 bg-slate-300" />
                              <span className="w-2 h-2 rounded-full bg-red-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm text-slate-900 truncate max-w-[220px]">{trip.originAddress}</p>
                              <p className="text-sm text-slate-500 truncate max-w-[220px] mt-1">{trip.destinationAddress}</p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-700">
                          {trip.driver ? trip.driver.name : <span className="text-slate-400">Unassigned</span>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                          {new Date(trip.scheduledStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${ts.bg} ${ts.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${ts.dot}`} />
                            {trip.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="whitespace-nowrap py-4 pl-3 pr-5 text-right">
                          <Link href={`/trips/${trip.id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
                            View
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === 'maintenance' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Maintenance</h3>
            <button onClick={openMaintModal} className={primaryBtnCls}>Schedule Maintenance</button>
          </div>
          {maintenanceLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
            </div>
          ) : maintenance.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm px-6 py-12 text-center">
              <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384 5.384a2.625 2.625 0 01-3.712-3.712l5.384-5.384m0 0L11.42 15.17m-4.714-4.714a2.625 2.625 0 013.712-3.712l5.384 5.384m0 0l-5.384 5.384" />
              </svg>
              <p className="mt-3 text-sm text-slate-500">No maintenance records for this truck</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className="py-3 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Description</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Scheduled</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Cost</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Vendor</th>
                    <th className="relative py-3 pl-3 pr-5"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {maintenance.map((rec) => {
                    const ms = maintenanceStatusConfig[rec.status] || maintenanceStatusConfig.SCHEDULED
                    const canClose = rec.status === 'SCHEDULED' || rec.status === 'IN_PROGRESS'
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="whitespace-nowrap py-4 pl-5 pr-3 text-sm font-medium text-slate-900">
                          {maintenanceTypeLabels[rec.type] || rec.type}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${ms.bg} ${ms.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${ms.dot}`} />
                            {rec.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-sm text-slate-600 max-w-[240px] truncate">
                          {rec.description || <span className="text-slate-400">&mdash;</span>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                          {new Date(rec.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-900">
                          {rec.cost != null ? `₹${rec.cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : <span className="text-slate-400">&mdash;</span>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                          {rec.vendor || <span className="text-slate-400">&mdash;</span>}
                        </td>
                        <td className="whitespace-nowrap py-4 pl-3 pr-5">
                          <div className="flex items-center gap-2">
                            <Link href={`/maintenance/${rec.id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
                              View
                            </Link>
                            {canClose && (
                              <>
                                <span className="text-slate-300">|</span>
                                <button
                                  onClick={() => setCloseMaintId(rec.id)}
                                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                                >
                                  Close
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === 'fuel' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Fuel Logs</h3>
            <button onClick={openFuelModal} className={primaryBtnCls}>Log Fuel</button>
          </div>
          {fuelLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
            </div>
          ) : fuelLogs.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm px-6 py-12 text-center">
              <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
              </svg>
              <p className="mt-3 text-sm text-slate-500">No fuel logs for this truck</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Total Liters</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {gallonsToLiters(fuelLogs.reduce((s, f) => s + f.gallons, 0)).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Total Cost</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    ₹{fuelLogs.reduce((s, f) => s + f.totalCost, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Avg ₹/L</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    ₹{(fuelLogs.reduce((s, f) => s + f.totalCost, 0) / (gallonsToLiters(fuelLogs.reduce((s, f) => s + f.gallons, 0)) || 1)).toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr className="bg-slate-50/80">
                      <th className="py-3 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Station</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Liters</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Price/L</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Total</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 pr-5">Odometer (km)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fuelLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="whitespace-nowrap py-4 pl-5 pr-3 text-sm text-slate-900">
                          {formatFuelDate(log.fueledAt ?? log.date)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                          {log.station || <span className="text-slate-400">&mdash;</span>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-900 text-right">
                          {gallonsToLiters(log.gallons).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 text-right">
                          ₹{(log.pricePerGallon / GALLONS_TO_LITERS).toFixed(2)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-slate-900 text-right">
                          ₹{log.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 text-right pr-5">
                          {log.odometer != null ? `${log.odometer.toLocaleString()} km` : <span className="text-slate-400">&mdash;</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'insurance' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Insurance Policies</h3>
            <button onClick={openInsuranceModal} className={primaryBtnCls}>Add Policy</button>
          </div>
          {insuranceLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
            </div>
          ) : insurance.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm px-6 py-12 text-center">
              <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <p className="mt-3 text-sm text-slate-500">No insurance policies for this truck</p>
            </div>
          ) : (
            <div className="space-y-4">
              {insurance.map((policy) => (
                <div key={policy.id} className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-slate-900">{policy.provider}</h3>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                          policy.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${policy.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {policy.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">Policy #{policy.policyNumber}</p>
                    </div>
                    <div className="text-right text-sm">
                      {policy.premium != null && (
                        <p className="font-semibold text-slate-900">₹{policy.premium.toLocaleString('en-IN', { minimumFractionDigits: 2 })}<span className="text-slate-400 font-normal">/yr</span></p>
                      )}
                      <p className="text-slate-500">Expires {new Date(policy.expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="border-t border-slate-100 px-6 py-3 bg-slate-50/50">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Coverage</p>
                    <p className="text-sm font-medium text-slate-900 mt-0.5">{policy.coverageType}</p>
                  </div>
                  {policy.claims?.length > 0 && (
                    <div className="border-t border-slate-100 px-6 py-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Claims ({policy.claims.length})</p>
                      <div className="space-y-2">
                        {policy.claims.map((claim) => (
                          <div key={claim.id} className="flex items-start justify-between rounded-xl bg-slate-50 p-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900">#{claim.claimNumber}</p>
                              <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[280px]">{claim.description}</p>
                              <p className="text-xs text-slate-400 mt-1">Filed {new Date(claim.filedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                            </div>
                            <div className="text-right shrink-0 ml-4">
                              {claim.amount != null && (
                                <p className="text-sm font-medium text-slate-900">₹{claim.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                              )}
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium mt-1 ${
                                claim.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                                claim.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                                claim.status === 'DENIED' ? 'bg-red-50 text-red-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  claim.status === 'APPROVED' ? 'bg-emerald-500' :
                                  claim.status === 'PENDING' ? 'bg-amber-500' :
                                  claim.status === 'DENIED' ? 'bg-red-500' :
                                  'bg-slate-400'
                                }`} />
                                {claim.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ===== MODALS ===== */}

      {/* Driver Assign Modal */}
      {driverModalOpen && (
        <ModalOverlay onClose={() => setDriverModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">{truck.currentDriver ? 'Reassign Driver' : 'Assign Driver'}</h2>
            {driverError && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">{driverError}</div>}
            <div className="mb-4">
              <label className={labelCls}>Select Driver</label>
              <select value={selectedDriverId} onChange={(e) => setSelectedDriverId(e.target.value)} className={inputCls}>
                <option value="">Choose a driver...</option>
                {availableDrivers.map((d) => <option key={d.id} value={d.id}>{d.name} — {d.licenseNumber}</option>)}
              </select>
              {availableDrivers.length === 0 && <p className="mt-2 text-xs text-slate-400">No available drivers found</p>}
            </div>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDriverModalOpen(false)} className={secondaryBtnCls}>Cancel</button>
              <button onClick={handleAssignDriver} disabled={!selectedDriverId || driverAssigning} className={primaryBtnCls}>
                {driverAssigning ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Schedule Trip Modal */}
      {tripModalOpen && (
        <ModalOverlay onClose={() => setTripModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Schedule Trip</h2>
            {tripError && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">{tripError}</div>}
            <form onSubmit={handleTripSubmit} className="space-y-4">
              <div>
                <label className={labelCls}>Driver</label>
                <select required value={tripForm.driverId} onChange={(e) => setTripForm({ ...tripForm, driverId: e.target.value })} className={inputCls}>
                  <option value="">Select a driver</option>
                  {availableDrivers.map((d) => <option key={d.id} value={d.id}>{d.name} — {d.licenseNumber}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3 sm:col-span-1">
                  <label className={labelCls}>Origin Address</label>
                  <input required value={tripForm.originAddress} onChange={(e) => setTripForm({ ...tripForm, originAddress: e.target.value })} placeholder="123 Main St" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Origin Lat <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input type="number" step="any" value={tripForm.originLat} onChange={(e) => setTripForm({ ...tripForm, originLat: e.target.value })} placeholder="18.4386" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Origin Lng <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input type="number" step="any" value={tripForm.originLng} onChange={(e) => setTripForm({ ...tripForm, originLng: e.target.value })} placeholder="79.1288" className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3 sm:col-span-1">
                  <label className={labelCls}>Destination Address</label>
                  <input required value={tripForm.destinationAddress} onChange={(e) => setTripForm({ ...tripForm, destinationAddress: e.target.value })} placeholder="456 Oak Ave" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Dest Lat <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input type="number" step="any" value={tripForm.destinationLat} onChange={(e) => setTripForm({ ...tripForm, destinationLat: e.target.value })} placeholder="17.9689" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Dest Lng <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input type="number" step="any" value={tripForm.destinationLng} onChange={(e) => setTripForm({ ...tripForm, destinationLng: e.target.value })} placeholder="79.5941" className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Scheduled Start</label>
                  <input type="datetime-local" required value={tripForm.scheduledStart} onChange={(e) => setTripForm({ ...tripForm, scheduledStart: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Scheduled End <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input type="datetime-local" value={tripForm.scheduledEnd} onChange={(e) => setTripForm({ ...tripForm, scheduledEnd: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Notes <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea rows={2} value={tripForm.notes} onChange={(e) => setTripForm({ ...tripForm, notes: e.target.value })} placeholder="Special instructions..." className={`${inputCls} resize-none`} />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setTripModalOpen(false)} className={secondaryBtnCls}>Cancel</button>
                <button type="submit" disabled={tripSubmitting} className={primaryBtnCls}>
                  {tripSubmitting ? 'Scheduling...' : 'Schedule Trip'}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {/* Schedule Maintenance Modal */}
      {maintModalOpen && (
        <ModalOverlay onClose={() => setMaintModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Schedule Maintenance</h2>
            {maintError && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">{maintError}</div>}
            <form onSubmit={handleMaintSubmit} className="space-y-4">
              <div>
                <label className={labelCls}>Type</label>
                <select value={maintForm.type} onChange={(e) => setMaintForm({ ...maintForm, type: e.target.value })} className={inputCls}>
                  {Object.entries(maintenanceTypeLabels).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea required rows={3} value={maintForm.description} onChange={(e) => setMaintForm({ ...maintForm, description: e.target.value })} placeholder="Describe the maintenance needed..." className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className={labelCls}>Vendor</label>
                <input value={maintForm.vendor} onChange={(e) => setMaintForm({ ...maintForm, vendor: e.target.value })} placeholder="Service provider name" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Scheduled Date</label>
                <input type="date" required value={maintForm.scheduledDate} onChange={(e) => setMaintForm({ ...maintForm, scheduledDate: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Notes <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea rows={2} value={maintForm.notes} onChange={(e) => setMaintForm({ ...maintForm, notes: e.target.value })} placeholder="Additional notes..." className={`${inputCls} resize-none`} />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setMaintModalOpen(false)} className={secondaryBtnCls}>Cancel</button>
                <button type="submit" disabled={maintSubmitting} className={primaryBtnCls}>
                  {maintSubmitting ? 'Scheduling...' : 'Schedule Maintenance'}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {/* Log Fuel Modal */}
      {fuelModalOpen && (
        <ModalOverlay onClose={() => setFuelModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Log Fuel</h2>
            {fuelModalError && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">{fuelModalError}</div>}
            <form onSubmit={handleFuelSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Liters</label>
                  <input type="number" step="0.01" required placeholder="456" value={fuelForm.liters}
                    onChange={(e) => setFuelForm({ ...fuelForm, liters: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Price / Liter (₹)</label>
                  <input type="number" step="0.01" required placeholder="90" value={fuelForm.pricePerLiter}
                    onChange={(e) => setFuelForm({ ...fuelForm, pricePerLiter: e.target.value })} className={inputCls} />
                </div>
              </div>
              {fuelTotalCost && (
                <div className="rounded-xl bg-slate-50 px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-slate-600">Total Cost</span>
                  <span className="text-lg font-bold text-slate-900">₹{fuelTotalCost}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Odometer (km)</label>
                  <input type="number" required placeholder="245000" value={fuelForm.odometer}
                    onChange={(e) => setFuelForm({ ...fuelForm, odometer: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Station</label>
                  <input
                    type="text"
                    list="fuel-station-list"
                    placeholder="Select or type station name..."
                    value={fuelForm.station}
                    onChange={(e) => setFuelForm({ ...fuelForm, station: e.target.value })}
                    className={inputCls}
                  />
                  <datalist id="fuel-station-list">
                    {[...new Set([...orgFuelStations, ...FUEL_STATIONS])].map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setFuelModalOpen(false)} className={secondaryBtnCls}>Cancel</button>
                <button type="submit" disabled={fuelSubmitting} className={primaryBtnCls}>
                  {fuelSubmitting ? 'Saving...' : 'Log Fuel'}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {/* Close Maintenance Modal */}
      {closeMaintId && (
        <CloseMaintenanceModal
          maintenanceId={closeMaintId}
          maintenanceType={maintenance.find((m) => m.id === closeMaintId) ? maintenanceTypeLabels[maintenance.find((m) => m.id === closeMaintId)!.type] : undefined}
          onClose={() => setCloseMaintId(null)}
          onSuccess={refetchMaintenance}
        />
      )}

      {/* Add Insurance Policy Modal */}
      {insuranceModalOpen && (
        <ModalOverlay onClose={() => setInsuranceModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Add Insurance Policy</h2>
            {insuranceError && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">{insuranceError}</div>}
            <form onSubmit={handleInsuranceSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Provider</label>
                  <input required value={insuranceForm.provider} onChange={(e) => setInsuranceForm({ ...insuranceForm, provider: e.target.value })} placeholder="State Farm" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Policy Number</label>
                  <input required value={insuranceForm.policyNumber} onChange={(e) => setInsuranceForm({ ...insuranceForm, policyNumber: e.target.value })} placeholder="POL-123456" className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Coverage Type</label>
                <select value={insuranceForm.coverageType} onChange={(e) => setInsuranceForm({ ...insuranceForm, coverageType: e.target.value })} className={inputCls}>
                  {COVERAGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Premium (₹)</label>
                  <input type="number" step="0.01" required value={insuranceForm.premium} onChange={(e) => setInsuranceForm({ ...insuranceForm, premium: e.target.value })} placeholder="2400" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Deductible (₹)</label>
                  <input type="number" step="0.01" required value={insuranceForm.deductible} onChange={(e) => setInsuranceForm({ ...insuranceForm, deductible: e.target.value })} placeholder="1000" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Coverage Limit (₹)</label>
                  <input type="number" step="0.01" required value={insuranceForm.coverageLimit} onChange={(e) => setInsuranceForm({ ...insuranceForm, coverageLimit: e.target.value })} placeholder="100000" className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Start Date</label>
                  <input type="date" required value={insuranceForm.startDate} onChange={(e) => setInsuranceForm({ ...insuranceForm, startDate: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Expiry Date</label>
                  <input type="date" required value={insuranceForm.expiryDate} onChange={(e) => setInsuranceForm({ ...insuranceForm, expiryDate: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Notes <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea rows={2} value={insuranceForm.notes} onChange={(e) => setInsuranceForm({ ...insuranceForm, notes: e.target.value })} placeholder="Additional details..." className={`${inputCls} resize-none`} />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setInsuranceModalOpen(false)} className={secondaryBtnCls}>Cancel</button>
                <button type="submit" disabled={insuranceSubmitting} className={primaryBtnCls}>
                  {insuranceSubmitting ? 'Adding...' : 'Add Policy'}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}
