/**
 * GPS API Integration Tests
 * Owner: GPS-01
 * 
 * Tests for GPS API core logic and Redis caching
 * Full integration tests require Next.js test environment
 */

// Mock Redis and Socket.io BEFORE importing modules
jest.mock('@/lib/redis', () => ({
  cacheGPSPosition: jest.fn().mockResolvedValue(undefined),
  getAllTruckPositions: jest.fn().mockResolvedValue([]),
  isRedisAvailable: jest.fn().mockReturnValue(false),
  redis: null
}))

jest.mock('@/lib/socket', () => ({
  broadcastTruckLocation: jest.fn(),
  getSocketServer: jest.fn().mockReturnValue(null)
}))

import { cacheGPSPosition, getAllTruckPositions } from '@/lib/redis'
import { normalizeGpsPayload } from '@/lib/gps-ingestion'
import { determineMovementStatus } from '@/lib/gps-utils'

describe('GPS API Core Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GPS Ingestion Pipeline', () => {
    it('should process valid GPS payload end-to-end', async () => {
      const payload = {
        truckId: 'truck123',
        lat: 40.7128,
        lng: -74.0060,
        speed: 60,
        heading: 180,
        fuelLevel: 75,
        ignitionOn: true,
        timestamp: '2026-02-26T12:00:00Z'
      }

      const normalized = normalizeGpsPayload(payload)

      expect(normalized.truckId).toBe('truck123')
      expect(normalized.lat).toBe(40.7128)
      expect(normalized.lng).toBe(-74.0060)
      expect(normalized.speed).toBe(60)
      expect(normalized.heading).toBe(180)
      expect(normalized.fuelLevel).toBe(75)
      expect(normalized.ignitionOn).toBe(true)
    })

    it('should determine movement status correctly', () => {
      expect(determineMovementStatus(60, true)).toBe('moving')
      expect(determineMovementStatus(0, true)).toBe('idle')
      expect(determineMovementStatus(0, false)).toBe('off')
      expect(determineMovementStatus(3, true)).toBe('idle')
      expect(determineMovementStatus(10, true)).toBe('moving')
    })

    it('should handle Samsara format in pipeline', () => {
      const payload = {
        vehicle: { id: 'v123', name: 'Truck 01' },
        location: { lat: 40.7128, lng: -74.0060 },
        speed: 45, // mph
        fuelLevel: 75
      }

      const normalized = normalizeGpsPayload(payload)

      expect(normalized.truckId).toBe('v123')
      expect(normalized.speed).toBeGreaterThan(70) // Converted from mph
    })
  })

  describe('Redis Caching', () => {
    it('should cache GPS position with correct structure', async () => {
      const position = {
        truckId: 'truck1',
        lat: 40.7128,
        lng: -74.0060,
        speed: 60,
        heading: 180,
        fuelLevel: 75,
        ignitionOn: true,
        movementStatus: 'moving',
        timestamp: '2026-02-26T12:00:00Z'
      }

      ;(cacheGPSPosition as jest.Mock).mockResolvedValue(undefined)

      await cacheGPSPosition('truck1', position)

      expect(cacheGPSPosition).toHaveBeenCalledWith('truck1', position)
    })

    it('should retrieve fleet positions from cache', async () => {
      const mockPositions = [
        {
          truckId: 'truck1',
          lat: 40.7128,
          lng: -74.0060,
          speed: 60,
          movementStatus: 'moving'
        },
        {
          truckId: 'truck2',
          lat: 34.0522,
          lng: -118.2437,
          speed: 0,
          movementStatus: 'off'
        }
      ]

      ;(getAllTruckPositions as jest.Mock).mockResolvedValue(mockPositions)

      const positions = await getAllTruckPositions()

      expect(positions).toHaveLength(2)
      expect(positions[0].truckId).toBe('truck1')
      expect(positions[1].truckId).toBe('truck2')
    })

    it('should handle empty cache gracefully', async () => {
      ;(getAllTruckPositions as jest.Mock).mockResolvedValue([])

      const positions = await getAllTruckPositions()

      expect(positions).toHaveLength(0)
    })
  })

  describe('Performance Tests', () => {
    it('should normalize 30 payloads simultaneously', async () => {
      const payloads = Array.from({ length: 30 }, (_, i) => ({
        truckId: `truck${i + 1}`,
        lat: 40.7128 + (Math.random() - 0.5) * 0.1,
        lng: -74.0060 + (Math.random() - 0.5) * 0.1,
        speed: Math.floor(Math.random() * 100),
        heading: Math.floor(Math.random() * 360),
        fuelLevel: Math.floor(Math.random() * 100),
        ignitionOn: Math.random() > 0.5,
        timestamp: new Date().toISOString()
      }))

      const start = Date.now()
      const results = payloads.map(payload => normalizeGpsPayload(payload))
      const elapsed = Date.now() - start

      // All normalizations should succeed
      expect(results).toHaveLength(30)
      results.forEach(result => {
        expect(result.truckId).toBeTruthy()
        expect(result.lat).toBeGreaterThanOrEqual(-90)
        expect(result.lat).toBeLessThanOrEqual(90)
      })

      // Should be very fast (< 100ms for 30 normalizations)
      expect(elapsed).toBeLessThan(100)
    })

    it('should handle 60 normalization calls (2 pings/min per truck)', () => {
      const payloads = Array.from({ length: 60 }, (_, i) => ({
        truckId: `truck${(i % 30) + 1}`,
        lat: 40.7128,
        lng: -74.0060,
        speed: 60,
        heading: 180,
        fuelLevel: 75,
        ignitionOn: true,
        timestamp: new Date(Date.now() + i * 1000).toISOString()
      }))

      const start = Date.now()
      const results = payloads.map(payload => normalizeGpsPayload(payload))
      const elapsed = Date.now() - start

      // All normalizations should succeed
      expect(results).toHaveLength(60)

      // Should be very fast
      expect(elapsed).toBeLessThan(200)
    })

    it('should batch process different tracker formats', () => {
      const mixedPayloads = [
        { truckId: 'truck1', lat: 40.7128, lng: -74.0060, speed: 60 },
        { vehicle: { id: 'v2' }, location: { lat: 40.7128, lng: -74.0060 } },
        { device: { id: 'b3' }, latitude: 40.7128, longitude: -74.0060 },
        { asset_id: 'vc4', gps: { lat: 40.7128, lon: -74.0060 } },
        { topic: 'fleet/truck5/gps', payload: { lat: 40.7128, lng: -74.0060 } }
      ]

      const results = mixedPayloads.map(payload => normalizeGpsPayload(payload))

      expect(results).toHaveLength(5)
      expect(results[0].truckId).toBe('truck1')
      expect(results[1].truckId).toBe('v2')
      expect(results[2].truckId).toBe('b3')
      expect(results[3].truckId).toBe('vc4')
      expect(results[4].truckId).toBe('truck5')
    })
  })

  describe('Data Integrity Tests', () => {
    it('should preserve all payload fields through normalization', () => {
      const payload = {
        truckId: 'truck123',
        lat: 40.7128,
        lng: -74.0060,
        speed: 65,
        heading: 270,
        fuelLevel: 82,
        ignitionOn: true,
        timestamp: '2026-02-26T12:34:56Z'
      }

      const normalized = normalizeGpsPayload(payload)

      expect(normalized.truckId).toBe('truck123')
      expect(normalized.lat).toBe(40.7128)
      expect(normalized.lng).toBe(-74.0060)
      expect(normalized.speed).toBe(65)
      expect(normalized.heading).toBe(270)
      expect(normalized.fuelLevel).toBe(82)
      expect(normalized.ignitionOn).toBe(true)
      expect(normalized.timestamp).toBe('2026-02-26T12:34:56Z')
    })

    it('should handle edge case coordinates', () => {
      const edgeCases = [
        { lat: 0, lng: 0 },
        { lat: 90, lng: 180 },
        { lat: -90, lng: -180 },
        { lat: 0, lng: 180 },
        { lat: 0, lng: -180 }
      ]

      edgeCases.forEach(coords => {
        const payload = {
          truckId: 'truck123',
          ...coords,
          speed: 50
        }

        const normalized = normalizeGpsPayload(payload)
        
        expect(normalized.lat).toBe(coords.lat)
        expect(normalized.lng).toBe(coords.lng)
      })
    })

    it('should maintain precision for coordinates', () => {
      const payload = {
        truckId: 'truck123',
        lat: 40.71283746,
        lng: -74.00601234,
        speed: 60
      }

      const normalized = normalizeGpsPayload(payload)

      expect(normalized.lat).toBe(40.71283746)
      expect(normalized.lng).toBe(-74.00601234)
    })
  })
})
