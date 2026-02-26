/**
 * GPS Payload Ingestion & Normalization
 * Owner: GPS-01
 * 
 * Adapter pattern for multiple GPS tracker hardware formats:
 * - Samsara
 * - Geotab
 * - Verizon Connect
 * - Custom trackers
 * - MQTT bridge
 */

import { isValidCoordinates, normalizeHeading, mphToKmh } from './gps-utils'

/**
 * Normalized GPS payload format (internal standard)
 */
export type GpsPayload = {
  truckId: string
  lat: number
  lng: number
  speed: number // km/h
  heading: number // degrees 0-360
  fuelLevel: number // percentage 0-100
  ignitionOn: boolean
  timestamp: string // ISO 8601 UTC
}

/**
 * GPS Ingestion Error
 */
export class GpsIngestionError extends Error {
  constructor(
    message: string,
    public readonly source: string,
    public readonly payload: any
  ) {
    super(message)
    this.name = 'GpsIngestionError'
  }
}

/**
 * Detect tracker format and normalize payload
 */
export function normalizeGpsPayload(payload: any): GpsPayload {
  if (!payload || typeof payload !== 'object') {
    throw new GpsIngestionError('Invalid payload: not an object', 'unknown', payload)
  }

  // Auto-detect format based on payload structure
  if (payload.vehicle && payload.location) {
    return normalizeSamsara(payload)
  }

  if (payload.device && (payload.latitude !== undefined || payload.lat !== undefined)) {
    return normalizeGeotab(payload)
  }

  if (payload.asset_id && payload.gps) {
    return normalizeVerizonConnect(payload)
  }

  if (payload.topic && payload.payload) {
    return normalizeFromMQTT(payload)
  }

  // Default: assume custom format
  return normalizeCustom(payload)
}

/**
 * Samsara GPS Tracker Format
 * 
 * Example payload:
 * {
 *   vehicle: { id: "v123", name: "Truck 01" },
 *   location: { lat: 40.7128, lng: -74.0060 },
 *   speed: 45, // mph
 *   fuelLevel: 75 // percentage
 * }
 */
export function normalizeSamsara(payload: any): GpsPayload {
  try {
    const { vehicle, location, speed, fuelLevel, heading, ignitionOn, timestamp } = payload

    if (!vehicle?.id) {
      throw new Error('Missing vehicle.id')
    }

    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      throw new Error('Invalid location data')
    }

    if (!isValidCoordinates(location.lat, location.lng)) {
      throw new Error('Invalid GPS coordinates')
    }

    return {
      truckId: String(vehicle.id),
      lat: location.lat,
      lng: location.lng,
      speed: typeof speed === 'number' ? mphToKmh(speed) : 0, // Samsara uses mph
      heading: normalizeHeading(heading || 0),
      fuelLevel: typeof fuelLevel === 'number' ? Math.max(0, Math.min(100, fuelLevel)) : 0,
      ignitionOn: typeof ignitionOn === 'boolean' ? ignitionOn : speed > 0,
      timestamp: timestamp || new Date().toISOString()
    }
  } catch (error) {
    throw new GpsIngestionError(
      `Samsara normalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'samsara',
      payload
    )
  }
}

/**
 * Geotab GPS Tracker Format
 * 
 * Example payload:
 * {
 *   device: { id: "b123" },
 *   latitude: 40.7128,
 *   longitude: -74.0060,
 *   speed: 72, // km/h
 *   fuel: 75 // percentage
 * }
 */
export function normalizeGeotab(payload: any): GpsPayload {
  try {
    const { device, latitude, longitude, speed, fuel, bearing, ignition, dateTime } = payload

    // Geotab can use either 'latitude' or 'lat'
    const lat = latitude ?? payload.lat
    const lng = longitude ?? payload.lng ?? payload.lon

    if (!device?.id) {
      throw new Error('Missing device.id')
    }

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      throw new Error('Invalid location data')
    }

    if (!isValidCoordinates(lat, lng)) {
      throw new Error('Invalid GPS coordinates')
    }

    return {
      truckId: String(device.id),
      lat,
      lng,
      speed: typeof speed === 'number' ? speed : 0, // Geotab uses km/h
      heading: normalizeHeading(bearing || 0),
      fuelLevel: typeof fuel === 'number' ? Math.max(0, Math.min(100, fuel)) : 0,
      ignitionOn: typeof ignition === 'boolean' ? ignition : speed > 0,
      timestamp: dateTime || new Date().toISOString()
    }
  } catch (error) {
    throw new GpsIngestionError(
      `Geotab normalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'geotab',
      payload
    )
  }
}

/**
 * Verizon Connect GPS Tracker Format
 * 
 * Example payload:
 * {
 *   asset_id: "vc456",
 *   gps: { lat: 40.7128, lon: -74.0060 },
 *   speed: 45, // mph
 *   fuel_percent: 75
 * }
 */
export function normalizeVerizonConnect(payload: any): GpsPayload {
  try {
    const { asset_id, gps, speed, fuel_percent, heading, ignition_status, event_time } = payload

    if (!asset_id) {
      throw new Error('Missing asset_id')
    }

    if (!gps || typeof gps.lat !== 'number' || typeof gps.lon !== 'number') {
      throw new Error('Invalid GPS data')
    }

    if (!isValidCoordinates(gps.lat, gps.lon)) {
      throw new Error('Invalid GPS coordinates')
    }

    return {
      truckId: String(asset_id),
      lat: gps.lat,
      lng: gps.lon,
      speed: typeof speed === 'number' ? mphToKmh(speed) : 0, // Verizon uses mph
      heading: normalizeHeading(heading || 0),
      fuelLevel: typeof fuel_percent === 'number' ? Math.max(0, Math.min(100, fuel_percent)) : 0,
      ignitionOn: ignition_status === 'on' || ignition_status === true || speed > 0,
      timestamp: event_time || new Date().toISOString()
    }
  } catch (error) {
    throw new GpsIngestionError(
      `Verizon Connect normalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'verizon',
      payload
    )
  }
}

/**
 * Custom GPS Tracker Format (FleetCommand standard)
 * 
 * Example payload:
 * {
 *   truckId: "truck123",
 *   lat: 40.7128,
 *   lng: -74.0060,
 *   speed: 72, // km/h
 *   heading: 180,
 *   fuelLevel: 75,
 *   ignitionOn: true,
 *   timestamp: "2026-02-26T12:30:00Z"
 * }
 */
export function normalizeCustom(payload: any): GpsPayload {
  try {
    const { truckId, lat, lng, speed, heading, fuelLevel, ignitionOn, timestamp } = payload

    if (!truckId) {
      throw new Error('Missing truckId')
    }

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      throw new Error('Invalid location data')
    }

    if (!isValidCoordinates(lat, lng)) {
      throw new Error('Invalid GPS coordinates')
    }

    return {
      truckId: String(truckId),
      lat,
      lng,
      speed: typeof speed === 'number' ? Math.max(0, speed) : 0,
      heading: normalizeHeading(heading || 0),
      fuelLevel: typeof fuelLevel === 'number' ? Math.max(0, Math.min(100, fuelLevel)) : 0,
      ignitionOn: typeof ignitionOn === 'boolean' ? ignitionOn : speed > 0,
      timestamp: timestamp || new Date().toISOString()
    }
  } catch (error) {
    throw new GpsIngestionError(
      `Custom format normalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'custom',
      payload
    )
  }
}

/**
 * MQTT Bridge Format
 * 
 * Example payload:
 * {
 *   topic: "fleet/truck123/gps",
 *   payload: {
 *     lat: 40.7128,
 *     lng: -74.0060,
 *     speed: 72,
 *     heading: 180,
 *     fuel: 75,
 *     ignition: true
 *   },
 *   timestamp: "2026-02-26T12:30:00Z"
 * }
 */
export function normalizeFromMQTT(payload: any): GpsPayload {
  try {
    const { topic, payload: data, timestamp } = payload

    if (!topic) {
      throw new Error('Missing MQTT topic')
    }

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid MQTT payload')
    }

    // Extract truckId from topic (format: fleet/truckId/gps)
    const topicParts = topic.split('/')
    const truckId = topicParts[1]

    if (!truckId) {
      throw new Error('Cannot extract truckId from topic')
    }

    const { lat, lng, latitude, longitude, speed, heading, fuel, fuelLevel, ignition, ignitionOn } = data

    const finalLat = lat ?? latitude
    const finalLng = lng ?? longitude

    if (typeof finalLat !== 'number' || typeof finalLng !== 'number') {
      throw new Error('Invalid location data in MQTT payload')
    }

    if (!isValidCoordinates(finalLat, finalLng)) {
      throw new Error('Invalid GPS coordinates')
    }

    return {
      truckId: String(truckId),
      lat: finalLat,
      lng: finalLng,
      speed: typeof speed === 'number' ? Math.max(0, speed) : 0,
      heading: normalizeHeading(heading || 0),
      fuelLevel: typeof (fuel ?? fuelLevel) === 'number' 
        ? Math.max(0, Math.min(100, fuel ?? fuelLevel)) 
        : 0,
      ignitionOn: ignition ?? ignitionOn ?? speed > 0,
      timestamp: timestamp || new Date().toISOString()
    }
  } catch (error) {
    throw new GpsIngestionError(
      `MQTT normalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'mqtt',
      payload
    )
  }
}

/**
 * Validate normalized GPS payload
 */
export function validateGpsPayload(payload: GpsPayload): boolean {
  return (
    typeof payload.truckId === 'string' &&
    payload.truckId.length > 0 &&
    isValidCoordinates(payload.lat, payload.lng) &&
    typeof payload.speed === 'number' &&
    payload.speed >= 0 &&
    typeof payload.heading === 'number' &&
    payload.heading >= 0 &&
    payload.heading < 360 &&
    typeof payload.fuelLevel === 'number' &&
    payload.fuelLevel >= 0 &&
    payload.fuelLevel <= 100 &&
    typeof payload.ignitionOn === 'boolean' &&
    typeof payload.timestamp === 'string'
  )
}

/**
 * Log GPS ingestion event
 */
export function logGpsIngestion(
  payload: GpsPayload,
  source: string,
  success: boolean,
  error?: Error
): void {
  const logData = {
    timestamp: new Date().toISOString(),
    truckId: payload.truckId,
    source,
    success,
    coordinates: `${payload.lat},${payload.lng}`,
    speed: payload.speed,
    error: error?.message
  }

  if (success) {
    console.log('[GPS Ingestion] ✅', JSON.stringify(logData))
  } else {
    console.error('[GPS Ingestion] ❌', JSON.stringify(logData))
  }
}
