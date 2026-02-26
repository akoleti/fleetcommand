/**
 * Truck Detail Page with 6 Tabs
 * Owner: FLEET-01
 * 
 * FL-06: Truck detail page with Overview, Location, Trips, Maintenance, Fuel, Insurance tabs
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

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

export default function TruckDetailPage() {
  const params = useParams()
  const truckId = params?.id as string
  
  const [truck, setTruck] = useState<Truck | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  useEffect(() => {
    if (truckId) {
      fetchTruck()
    }
  }, [truckId])

  const fetchTruck = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/trucks/${truckId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch truck')
      }

      const data: Truck = await response.json()
      setTruck(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'ACTIVE': 'bg-green-100 text-green-800',
      'IDLE': 'bg-yellow-100 text-yellow-800',
      'MAINTENANCE': 'bg-orange-100 text-orange-800',
      'BLOCKED': 'bg-red-100 text-red-800',
      'INACTIVE': 'bg-gray-100 text-gray-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📋' },
    { id: 'location', name: 'Location', icon: '📍' },
    { id: 'trips', name: 'Trips', icon: '🚚' },
    { id: 'maintenance', name: 'Maintenance', icon: '🔧' },
    { id: 'fuel', name: 'Fuel', icon: '⛽' },
    { id: 'insurance', name: 'Insurance', icon: '📄' },
  ]

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !truck) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">{error || 'Truck not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {truck.make} {truck.model} ({truck.year})
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {truck.licensePlate} • VIN: {truck.vin}
            </p>
          </div>
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getStatusColor(truck.status)}`}>
            {truck.status}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <span>{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Specifications */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Specifications</h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Make</dt>
                  <dd className="text-sm font-medium text-gray-900">{truck.make}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Model</dt>
                  <dd className="text-sm font-medium text-gray-900">{truck.model}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Year</dt>
                  <dd className="text-sm font-medium text-gray-900">{truck.year}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">VIN</dt>
                  <dd className="text-sm font-medium text-gray-900">{truck.vin}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">License Plate</dt>
                  <dd className="text-sm font-medium text-gray-900">{truck.licensePlate}</dd>
                </div>
              </dl>
            </div>

            {/* Current Driver */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Current Driver</h3>
              {truck.currentDriver ? (
                <div>
                  <div className="flex items-center mb-4">
                    <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
                      {truck.currentDriver.name.charAt(0)}
                    </div>
                    <div className="ml-4">
                      <p className="text-lg font-medium text-gray-900">{truck.currentDriver.name}</p>
                      <p className="text-sm text-gray-500">{truck.currentDriver.phone}</p>
                    </div>
                  </div>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">License Number</dt>
                      <dd className="text-sm font-medium text-gray-900">{truck.currentDriver.licenseNumber}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Status</dt>
                      <dd className="text-sm font-medium text-gray-900">{truck.currentDriver.status}</dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <p className="text-gray-500">No driver assigned</p>
              )}
            </div>

            {/* Current Status */}
            {truck.truckStatus && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Current Status</h3>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Speed</dt>
                    <dd className="text-sm font-medium text-gray-900">{truck.truckStatus.speed} km/h</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Heading</dt>
                    <dd className="text-sm font-medium text-gray-900">{truck.truckStatus.heading}°</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Fuel Level</dt>
                    <dd className="text-sm font-medium text-gray-900">{truck.truckStatus.fuelLevel || 'N/A'}%</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Ignition</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {truck.truckStatus.ignitionOn ? 'On' : 'Off'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Last Update</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {new Date(truck.truckStatus.lastPingAt).toLocaleString()}
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            {/* Insurance */}
            {truck.insurancePolicies && truck.insurancePolicies.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Active Insurance</h3>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Provider</dt>
                    <dd className="text-sm font-medium text-gray-900">{truck.insurancePolicies[0].provider}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Policy Number</dt>
                    <dd className="text-sm font-medium text-gray-900">{truck.insurancePolicies[0].policyNumber}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Coverage Type</dt>
                    <dd className="text-sm font-medium text-gray-900">{truck.insurancePolicies[0].coverageType}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Expiry Date</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {new Date(truck.insurancePolicies[0].expiryDate).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        )}

        {activeTab === 'location' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Current Location</h3>
            {truck.truckStatus ? (
              <div>
                <p className="text-sm text-gray-500 mb-4">
                  Coordinates: {truck.truckStatus.latitude.toFixed(6)}, {truck.truckStatus.longitude.toFixed(6)}
                </p>
                <div className="bg-gray-100 h-96 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Map integration with Google Maps API would go here</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No location data available</p>
            )}
          </div>
        )}

        {activeTab === 'trips' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Trip History</h3>
            <p className="text-gray-500">Integration with /api/trips?truckId={truckId}</p>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Maintenance History</h3>
            <p className="text-gray-500">Integration with /api/maintenance/{truckId} (MAINT-01)</p>
          </div>
        )}

        {activeTab === 'fuel' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Fuel Logs</h3>
            <p className="text-gray-500">Integration with /api/fuel/{truckId} (FUEL-01)</p>
          </div>
        )}

        {activeTab === 'insurance' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Insurance Policies</h3>
            <p className="text-gray-500">Integration with /api/insurance/{truckId} (MAINT-01)</p>
          </div>
        )}
      </div>
    </div>
  )
}
