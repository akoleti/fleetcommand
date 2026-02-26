/**
 * GPS & Geospatial Utilities
 * Owner: GPS-01
 * 
 * Helper functions for GPS coordinate calculations, distance, bearing, etc.
 */

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  return distance
}

/**
 * Calculate bearing between two GPS coordinates
 * @returns Bearing in degrees (0-360)
 */
export function calculateBearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLng = toRadians(lng2 - lng1)
  const lat1Rad = toRadians(lat1)
  const lat2Rad = toRadians(lat2)

  const y = Math.sin(dLng) * Math.cos(lat2Rad)
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng)

  let bearing = toDegrees(Math.atan2(y, x))
  bearing = (bearing + 360) % 360

  return bearing
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Convert radians to degrees
 */
function toDegrees(radians: number): number {
  return radians * (180 / Math.PI)
}

/**
 * Validate GPS coordinates
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}

/**
 * Normalize heading to 0-360 range
 */
export function normalizeHeading(heading: number): number {
  if (typeof heading !== 'number' || isNaN(heading)) {
    return 0
  }
  
  let normalized = heading % 360
  if (normalized < 0) {
    normalized += 360
  }
  
  return normalized
}

/**
 * Convert speed from mph to km/h
 */
export function mphToKmh(mph: number): number {
  return mph * 1.60934
}

/**
 * Convert speed from km/h to mph
 */
export function kmhToMph(kmh: number): number {
  return kmh / 1.60934
}

/**
 * Estimate ETA based on distance and average speed
 * @param distanceKm Distance in kilometers
 * @param averageSpeedKmh Average speed in km/h
 * @returns ETA in minutes
 */
export function estimateETA(
  distanceKm: number,
  averageSpeedKmh: number = 60
): number {
  if (averageSpeedKmh === 0) {
    return 0
  }
  
  const hours = distanceKm / averageSpeedKmh
  const minutes = Math.round(hours * 60)
  
  return minutes
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S'
  const lngDir = lng >= 0 ? 'E' : 'W'
  
  return `${Math.abs(lat).toFixed(6)}° ${latDir}, ${Math.abs(lng).toFixed(6)}° ${lngDir}`
}

/**
 * Check if a point is within a circular geofence
 */
export function isWithinGeofence(
  pointLat: number,
  pointLng: number,
  centerLat: number,
  centerLng: number,
  radiusKm: number
): boolean {
  const distance = calculateDistance(pointLat, pointLng, centerLat, centerLng)
  return distance <= radiusKm
}

/**
 * Convert meters to kilometers
 */
export function metersToKilometers(meters: number): number {
  return meters / 1000
}

/**
 * Convert kilometers to miles
 */
export function kilometersToMiles(km: number): number {
  return km * 0.621371
}

/**
 * Get compass direction from heading
 */
export function getCompassDirection(heading: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(heading / 45) % 8
  return directions[index]
}

/**
 * Determine movement status based on speed and ignition
 */
export function determineMovementStatus(
  speed: number,
  ignitionOn: boolean
): 'moving' | 'idle' | 'off' {
  if (!ignitionOn) {
    return 'off'
  }
  
  // Consider vehicle moving if speed > 5 km/h
  if (speed > 5) {
    return 'moving'
  }
  
  return 'idle'
}

/**
 * Calculate average speed from a series of GPS points
 */
export function calculateAverageSpeed(speeds: number[]): number {
  if (speeds.length === 0) {
    return 0
  }
  
  const sum = speeds.reduce((acc, speed) => acc + speed, 0)
  return sum / speeds.length
}

/**
 * Sanitize GPS data to prevent invalid values
 */
export function sanitizeGpsData(data: {
  lat?: number
  lng?: number
  speed?: number
  heading?: number
  fuelLevel?: number
}): {
  lat: number
  lng: number
  speed: number
  heading: number
  fuelLevel: number
} {
  return {
    lat: typeof data.lat === 'number' && !isNaN(data.lat) ? data.lat : 0,
    lng: typeof data.lng === 'number' && !isNaN(data.lng) ? data.lng : 0,
    speed: typeof data.speed === 'number' && !isNaN(data.speed) && data.speed >= 0 ? data.speed : 0,
    heading: normalizeHeading(data.heading || 0),
    fuelLevel: typeof data.fuelLevel === 'number' && !isNaN(data.fuelLevel) 
      ? Math.max(0, Math.min(100, data.fuelLevel)) 
      : 0
  }
}
