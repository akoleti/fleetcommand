/**
 * GPS Utilities Tests
 * Owner: GPS-01
 * 
 * Tests for geospatial calculations and GPS utilities
 */

import {
  calculateDistance,
  calculateBearing,
  isValidCoordinates,
  normalizeHeading,
  mphToKmh,
  kmhToMph,
  estimateETA,
  formatCoordinates,
  isWithinGeofence,
  metersToKilometers,
  kilometersToMiles,
  getCompassDirection,
  determineMovementStatus,
  calculateAverageSpeed,
  sanitizeGpsData
} from '@/lib/gps-utils'

describe('GPS Utilities', () => {
  describe('Distance Calculations', () => {
    it('should calculate distance between two points', () => {
      // New York to Los Angeles (approx 3936 km)
      const distance = calculateDistance(40.7128, -74.0060, 34.0522, -118.2437)
      
      expect(distance).toBeGreaterThan(3900)
      expect(distance).toBeLessThan(4000)
    })

    it('should return 0 for same point', () => {
      const distance = calculateDistance(40.7128, -74.0060, 40.7128, -74.0060)
      
      expect(distance).toBe(0)
    })

    it('should calculate short distances accurately', () => {
      // 1 km apart (approximately)
      const distance = calculateDistance(40.7128, -74.0060, 40.7228, -74.0060)
      
      expect(distance).toBeCloseTo(1.11, 1)
    })
  })

  describe('Bearing Calculations', () => {
    it('should calculate bearing North', () => {
      const bearing = calculateBearing(40.0, -74.0, 41.0, -74.0)
      
      expect(bearing).toBeCloseTo(0, 1)
    })

    it('should calculate bearing East', () => {
      const bearing = calculateBearing(40.0, -74.0, 40.0, -73.0)
      
      expect(bearing).toBeCloseTo(90, 0) // Less strict precision
    })

    it('should calculate bearing South', () => {
      const bearing = calculateBearing(40.0, -74.0, 39.0, -74.0)
      
      expect(bearing).toBeCloseTo(180, 0)
    })

    it('should calculate bearing West', () => {
      const bearing = calculateBearing(40.0, -74.0, 40.0, -75.0)
      
      expect(bearing).toBeCloseTo(270, 0)
    })
  })

  describe('Coordinate Validation', () => {
    it('should validate correct coordinates', () => {
      expect(isValidCoordinates(40.7128, -74.0060)).toBe(true)
      expect(isValidCoordinates(0, 0)).toBe(true)
      expect(isValidCoordinates(90, 180)).toBe(true)
      expect(isValidCoordinates(-90, -180)).toBe(true)
    })

    it('should reject invalid latitudes', () => {
      expect(isValidCoordinates(91, 0)).toBe(false)
      expect(isValidCoordinates(-91, 0)).toBe(false)
    })

    it('should reject invalid longitudes', () => {
      expect(isValidCoordinates(0, 181)).toBe(false)
      expect(isValidCoordinates(0, -181)).toBe(false)
    })

    it('should reject NaN values', () => {
      expect(isValidCoordinates(NaN, 0)).toBe(false)
      expect(isValidCoordinates(0, NaN)).toBe(false)
    })
  })

  describe('Heading Normalization', () => {
    it('should normalize heading to 0-360 range', () => {
      expect(normalizeHeading(0)).toBe(0)
      expect(normalizeHeading(180)).toBe(180)
      expect(normalizeHeading(360)).toBe(0)
      expect(normalizeHeading(450)).toBe(90)
      expect(normalizeHeading(-90)).toBe(270)
    })

    it('should handle invalid headings', () => {
      expect(normalizeHeading(NaN)).toBe(0)
    })
  })

  describe('Speed Conversions', () => {
    it('should convert mph to km/h', () => {
      expect(mphToKmh(60)).toBeCloseTo(96.56, 1)
      expect(mphToKmh(0)).toBe(0)
    })

    it('should convert km/h to mph', () => {
      expect(kmhToMph(100)).toBeCloseTo(62.14, 1)
      expect(kmhToMph(0)).toBe(0)
    })

    it('should be reversible', () => {
      const original = 75
      const converted = mphToKmh(original)
      const back = kmhToMph(converted)
      
      expect(back).toBeCloseTo(original, 1)
    })
  })

  describe('ETA Estimation', () => {
    it('should calculate ETA correctly', () => {
      // 100 km at 60 km/h = 100 minutes
      expect(estimateETA(100, 60)).toBe(100)
      
      // 50 km at 100 km/h = 30 minutes
      expect(estimateETA(50, 100)).toBe(30)
    })

    it('should handle zero speed', () => {
      expect(estimateETA(100, 0)).toBe(0)
    })

    it('should use default speed', () => {
      // Default 60 km/h
      expect(estimateETA(60)).toBe(60)
    })
  })

  describe('Coordinate Formatting', () => {
    it('should format coordinates correctly', () => {
      expect(formatCoordinates(40.7128, -74.0060)).toContain('40.7128')
      expect(formatCoordinates(40.7128, -74.0060)).toContain('N')
      expect(formatCoordinates(40.7128, -74.0060)).toContain('W')
    })

    it('should handle Southern hemisphere', () => {
      expect(formatCoordinates(-33.8688, 151.2093)).toContain('S')
    })

    it('should handle Eastern hemisphere', () => {
      expect(formatCoordinates(51.5074, 0.1278)).toContain('E')
    })
  })

  describe('Geofence Checks', () => {
    it('should detect point within geofence', () => {
      const center = { lat: 40.7128, lng: -74.0060 }
      const point = { lat: 40.7138, lng: -74.0070 }
      
      // Point is about 0.15 km away
      expect(isWithinGeofence(point.lat, point.lng, center.lat, center.lng, 1)).toBe(true)
    })

    it('should detect point outside geofence', () => {
      const center = { lat: 40.7128, lng: -74.0060 }
      const point = { lat: 41.0, lng: -74.0 }
      
      expect(isWithinGeofence(point.lat, point.lng, center.lat, center.lng, 1)).toBe(false)
    })
  })

  describe('Unit Conversions', () => {
    it('should convert meters to kilometers', () => {
      expect(metersToKilometers(1000)).toBe(1)
      expect(metersToKilometers(5500)).toBe(5.5)
    })

    it('should convert kilometers to miles', () => {
      expect(kilometersToMiles(10)).toBeCloseTo(6.21, 1)
      expect(kilometersToMiles(0)).toBe(0)
    })
  })

  describe('Compass Direction', () => {
    it('should return correct compass directions', () => {
      expect(getCompassDirection(0)).toBe('N')
      expect(getCompassDirection(45)).toBe('NE')
      expect(getCompassDirection(90)).toBe('E')
      expect(getCompassDirection(135)).toBe('SE')
      expect(getCompassDirection(180)).toBe('S')
      expect(getCompassDirection(225)).toBe('SW')
      expect(getCompassDirection(270)).toBe('W')
      expect(getCompassDirection(315)).toBe('NW')
    })

    it('should handle edge cases', () => {
      expect(getCompassDirection(360)).toBe('N')
      expect(getCompassDirection(22)).toBe('N')
      expect(getCompassDirection(23)).toBe('NE')
    })
  })

  describe('Movement Status', () => {
    it('should return "moving" when speed > 5 and ignition on', () => {
      expect(determineMovementStatus(50, true)).toBe('moving')
      expect(determineMovementStatus(10, true)).toBe('moving')
    })

    it('should return "idle" when speed <= 5 and ignition on', () => {
      expect(determineMovementStatus(0, true)).toBe('idle')
      expect(determineMovementStatus(3, true)).toBe('idle')
      expect(determineMovementStatus(5, true)).toBe('idle')
    })

    it('should return "off" when ignition off', () => {
      expect(determineMovementStatus(0, false)).toBe('off')
      expect(determineMovementStatus(50, false)).toBe('off')
    })
  })

  describe('Average Speed', () => {
    it('should calculate average speed', () => {
      expect(calculateAverageSpeed([50, 60, 70])).toBe(60)
      expect(calculateAverageSpeed([100])).toBe(100)
    })

    it('should handle empty array', () => {
      expect(calculateAverageSpeed([])).toBe(0)
    })

    it('should handle varying speeds', () => {
      expect(calculateAverageSpeed([10, 20, 30, 40])).toBe(25)
    })
  })

  describe('Data Sanitization', () => {
    it('should sanitize valid data', () => {
      const data = {
        lat: 40.7128,
        lng: -74.0060,
        speed: 60,
        heading: 180,
        fuelLevel: 75
      }

      const sanitized = sanitizeGpsData(data)

      expect(sanitized.lat).toBe(40.7128)
      expect(sanitized.lng).toBe(-74.0060)
      expect(sanitized.speed).toBe(60)
      expect(sanitized.heading).toBe(180)
      expect(sanitized.fuelLevel).toBe(75)
    })

    it('should handle missing fields', () => {
      const data = {}

      const sanitized = sanitizeGpsData(data)

      expect(sanitized.lat).toBe(0)
      expect(sanitized.lng).toBe(0)
      expect(sanitized.speed).toBe(0)
      expect(sanitized.heading).toBe(0)
      expect(sanitized.fuelLevel).toBe(0)
    })

    it('should clamp fuel level to 0-100', () => {
      expect(sanitizeGpsData({ fuelLevel: 150 }).fuelLevel).toBe(100)
      expect(sanitizeGpsData({ fuelLevel: -10 }).fuelLevel).toBe(0)
    })

    it('should reject negative speed', () => {
      expect(sanitizeGpsData({ speed: -50 }).speed).toBe(0)
    })

    it('should normalize heading', () => {
      expect(sanitizeGpsData({ heading: 450 }).heading).toBe(90)
      expect(sanitizeGpsData({ heading: -90 }).heading).toBe(270)
    })
  })
})
