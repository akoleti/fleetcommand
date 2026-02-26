/**
 * Driver Detail Page
 * Owner: FLEET-01
 * 
 * FL-07: Driver profile with stats and trip history
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Driver {
  id: string
  name: string
  licenseNumber: string
  licenseExpiry: string
  phone: string
  status: string
  assignedTrucks: Array<{
    id: string
    vin: string
    licensePlate: string
    make: string
    model: string
    year: number
  }>
  trips: Array<{
    id: string
    status: string
    scheduledStart: string
    destinationAddress: string
    truck: {
      id: string
      vin: string
      licensePlate: string
      make: string
      model: string
    }
  }>
  performanceStats: {
    totalTrips: number
    onTimeTrips: number
    avgDeliveryTime: number
  }
  licenseExpiryAlert: boolean
  daysUntilLicenseExpiry: number
}

export default function DriverDetailPage() {
  const params = useParams()
  const driverId = params?.id as string
  
  const [driver, setDriver] = useState<Driver | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (driverId) {
      fetchDriver()
    }
  }, [driverId])

  const fetchDriver = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/drivers/${driverId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch driver')
      }

      const data: Driver = await response.json()
      setDriver(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'AVAILABLE': 'bg-green-100 text-green-800',
      'ON_TRIP': 'bg-blue-100 text-blue-800',
      'OFF_DUTY': 'bg-gray-100 text-gray-800',
      'SUSPENDED': 'bg-red-100 text-red-800',
      'SCHEDULED': 'bg-yellow-100 text-yellow-800',
      'IN_PROGRESS': 'bg-blue-100 text-blue-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !driver) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">{error || 'Driver not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-3xl font-bold">
              {driver.name.charAt(0)}
            </div>
            <div className="ml-6">
              <h1 className="text-2xl font-bold text-gray-900">{driver.name}</h1>
              <p className="mt-1 text-sm text-gray-500">
                License: {driver.licenseNumber} • {driver.phone}
              </p>
            </div>
          </div>
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getStatusColor(driver.status)}`}>
            {driver.status}
          </span>
        </div>
      </div>

      {/* License Expiry Alert */}
      {driver.licenseExpiryAlert && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                License expires in {driver.daysUntilLicenseExpiry} days ({new Date(driver.licenseExpiry).toLocaleDateString()})
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Trips</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{driver.performanceStats.totalTrips}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500">On-Time Rate</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {driver.performanceStats.totalTrips > 0
              ? Math.round((driver.performanceStats.onTimeTrips / driver.performanceStats.totalTrips) * 100)
              : 0}%
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500">Avg Delivery Time</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {driver.performanceStats.avgDeliveryTime > 0
              ? `${Math.floor(driver.performanceStats.avgDeliveryTime / 60)}h ${driver.performanceStats.avgDeliveryTime % 60}m`
              : 'N/A'}
          </p>
        </div>
      </div>

      {/* Profile Details & Assigned Truck */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Details</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">License Number</dt>
              <dd className="text-sm font-medium text-gray-900">{driver.licenseNumber}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">License Expiry</dt>
              <dd className="text-sm font-medium text-gray-900">
                {new Date(driver.licenseExpiry).toLocaleDateString()}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Phone</dt>
              <dd className="text-sm font-medium text-gray-900">{driver.phone}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Status</dt>
              <dd className="text-sm font-medium text-gray-900">{driver.status}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Assigned Truck</h3>
          {driver.assignedTrucks && driver.assignedTrucks.length > 0 ? (
            <div>
              <Link href={`/trucks/${driver.assignedTrucks[0].id}`} className="text-blue-600 hover:text-blue-900">
                <p className="text-lg font-medium">{driver.assignedTrucks[0].make} {driver.assignedTrucks[0].model}</p>
                <p className="text-sm text-gray-500 mt-1">{driver.assignedTrucks[0].licensePlate}</p>
                <p className="text-xs text-gray-400 mt-1">VIN: {driver.assignedTrucks[0].vin}</p>
              </Link>
            </div>
          ) : (
            <p className="text-gray-500">No truck assigned</p>
          )}
          <button className="mt-4 w-full px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 text-sm font-medium">
            Assign Truck
          </button>
        </div>
      </div>

      {/* Recent Trips */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Trips</h3>
        {driver.trips && driver.trips.length > 0 ? (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th className="py-3 text-left text-sm font-semibold text-gray-900">Destination</th>
                  <th className="py-3 text-left text-sm font-semibold text-gray-900">Truck</th>
                  <th className="py-3 text-left text-sm font-semibold text-gray-900">Scheduled</th>
                  <th className="py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="py-3 text-left text-sm font-semibold text-gray-900"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {driver.trips.slice(0, 10).map((trip) => (
                  <tr key={trip.id}>
                    <td className="py-3 text-sm text-gray-900">{trip.destinationAddress}</td>
                    <td className="py-3 text-sm text-gray-500">
                      {trip.truck.make} {trip.truck.model}
                      <br />
                      <span className="text-xs">{trip.truck.licensePlate}</span>
                    </td>
                    <td className="py-3 text-sm text-gray-500">
                      {new Date(trip.scheduledStart).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-sm">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold ${getStatusColor(trip.status)}`}>
                        {trip.status}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-right">
                      <Link href={`/trips/${trip.id}`} className="text-blue-600 hover:text-blue-900">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No trips found</p>
        )}
      </div>
    </div>
  )
}
