/**
 * GPS Ingestion Tests
 * Owner: GPS-01
 * 
 * Tests for GPS payload normalization and ingestion logic
 */

import {
  normalizeGpsPayload,
  normalizeSamsara,
  normalizeGeotab,
  normalizeVerizonConnect,
  normalizeCustom,
  normalizeFromMQTT,
  validateGpsPayload,
  GpsIngestionError
} from '@/lib/gps-ingestion'

describe('GPS Payload Normalization', () => {
  describe('Samsara Format', () => {
    it('should normalize valid Samsara payload', () => {
      const payload = {
        vehicle: { id: 'v123', name: 'Truck 01' },
        location: { lat: 40.7128, lng: -74.0060 },
        speed: 45, // mph
        fuelLevel: 75,
        heading: 180,
        ignitionOn: true,
        timestamp: '2026-02-26T12:00:00Z'
      }

      const result = normalizeSamsara(payload)

      expect(result.truckId).toBe('v123')
      expect(result.lat).toBe(40.7128)
      expect(result.lng).toBe(-74.0060)
      expect(result.speed).toBeCloseTo(72.42, 1) // mph to km/h
      expect(result.heading).toBe(180)
      expect(result.fuelLevel).toBe(75)
      expect(result.ignitionOn).toBe(true)
    })

    it('should handle missing optional fields', () => {
      const payload = {
        vehicle: { id: 'v456' },
        location: { lat: 40.7128, lng: -74.0060 },
        speed: 0
      }

      const result = normalizeSamsara(payload)

      expect(result.truckId).toBe('v456')
      expect(result.speed).toBe(0)
      expect(result.heading).toBe(0)
      expect(result.fuelLevel).toBe(0)
      expect(result.ignitionOn).toBe(false)
    })

    it('should throw error on missing vehicle.id', () => {
      const payload = {
        vehicle: {},
        location: { lat: 40.7128, lng: -74.0060 }
      }

      expect(() => normalizeSamsara(payload)).toThrow(GpsIngestionError)
    })

    it('should throw error on invalid coordinates', () => {
      const payload = {
        vehicle: { id: 'v789' },
        location: { lat: 91, lng: -74.0060 }
      }

      expect(() => normalizeSamsara(payload)).toThrow(GpsIngestionError)
    })
  })

  describe('Geotab Format', () => {
    it('should normalize valid Geotab payload', () => {
      const payload = {
        device: { id: 'b123' },
        latitude: 40.7128,
        longitude: -74.0060,
        speed: 72, // km/h
        fuel: 80,
        bearing: 90,
        ignition: true,
        dateTime: '2026-02-26T12:00:00Z'
      }

      const result = normalizeGeotab(payload)

      expect(result.truckId).toBe('b123')
      expect(result.lat).toBe(40.7128)
      expect(result.lng).toBe(-74.0060)
      expect(result.speed).toBe(72)
      expect(result.heading).toBe(90)
      expect(result.fuelLevel).toBe(80)
      expect(result.ignitionOn).toBe(true)
    })

    it('should handle alternative field names (lat/lng)', () => {
      const payload = {
        device: { id: 'b456' },
        lat: 40.7128,
        lng: -74.0060,
        speed: 50
      }

      const result = normalizeGeotab(payload)

      expect(result.lat).toBe(40.7128)
      expect(result.lng).toBe(-74.0060)
    })
  })

  describe('Verizon Connect Format', () => {
    it('should normalize valid Verizon Connect payload', () => {
      const payload = {
        asset_id: 'vc456',
        gps: { lat: 40.7128, lon: -74.0060 },
        speed: 45, // mph
        fuel_percent: 75,
        heading: 270,
        ignition_status: 'on',
        event_time: '2026-02-26T12:00:00Z'
      }

      const result = normalizeVerizonConnect(payload)

      expect(result.truckId).toBe('vc456')
      expect(result.lat).toBe(40.7128)
      expect(result.lng).toBe(-74.0060)
      expect(result.speed).toBeCloseTo(72.42, 1)
      expect(result.heading).toBe(270)
      expect(result.fuelLevel).toBe(75)
      expect(result.ignitionOn).toBe(true)
    })

    it('should handle ignition_status variations', () => {
      const payloadOn = {
        asset_id: 'vc789',
        gps: { lat: 40.7128, lon: -74.0060 },
        speed: 50,
        ignition_status: 'on'
      }

      const payloadOff = {
        asset_id: 'vc789',
        gps: { lat: 40.7128, lon: -74.0060 },
        speed: 0,
        ignition_status: 'off'
      }

      expect(normalizeVerizonConnect(payloadOn).ignitionOn).toBe(true)
      expect(normalizeVerizonConnect(payloadOff).ignitionOn).toBe(false)
    })
  })

  describe('Custom Format', () => {
    it('should normalize valid custom payload', () => {
      const payload = {
        truckId: 'truck123',
        lat: 40.7128,
        lng: -74.0060,
        speed: 72,
        heading: 180,
        fuelLevel: 85,
        ignitionOn: true,
        timestamp: '2026-02-26T12:00:00Z'
      }

      const result = normalizeCustom(payload)

      expect(result.truckId).toBe('truck123')
      expect(result.lat).toBe(40.7128)
      expect(result.lng).toBe(-74.0060)
      expect(result.speed).toBe(72)
      expect(result.heading).toBe(180)
      expect(result.fuelLevel).toBe(85)
      expect(result.ignitionOn).toBe(true)
    })

    it('should clamp fuel level to 0-100 range', () => {
      const payload = {
        truckId: 'truck456',
        lat: 40.7128,
        lng: -74.0060,
        fuelLevel: 150
      }

      const result = normalizeCustom(payload)

      expect(result.fuelLevel).toBe(100)
    })
  })

  describe('MQTT Format', () => {
    it('should normalize valid MQTT payload', () => {
      const payload = {
        topic: 'fleet/truck123/gps',
        payload: {
          lat: 40.7128,
          lng: -74.0060,
          speed: 60,
          heading: 90,
          fuel: 70,
          ignition: true
        },
        timestamp: '2026-02-26T12:00:00Z'
      }

      const result = normalizeFromMQTT(payload)

      expect(result.truckId).toBe('truck123')
      expect(result.lat).toBe(40.7128)
      expect(result.lng).toBe(-74.0060)
      expect(result.speed).toBe(60)
      expect(result.heading).toBe(90)
      expect(result.fuelLevel).toBe(70)
      expect(result.ignitionOn).toBe(true)
    })

    it('should extract truckId from topic', () => {
      const payload = {
        topic: 'fleet/truck789/gps',
        payload: {
          lat: 40.7128,
          lng: -74.0060,
          speed: 50
        }
      }

      const result = normalizeFromMQTT(payload)

      expect(result.truckId).toBe('truck789')
    })

    it('should throw error on invalid topic format', () => {
      const payload = {
        topic: 'invalid',
        payload: {
          lat: 40.7128,
          lng: -74.0060
        }
      }

      expect(() => normalizeFromMQTT(payload)).toThrow(GpsIngestionError)
    })
  })

  describe('Auto-detection', () => {
    it('should auto-detect Samsara format', () => {
      const payload = {
        vehicle: { id: 'v123' },
        location: { lat: 40.7128, lng: -74.0060 }
      }

      const result = normalizeGpsPayload(payload)

      expect(result.truckId).toBe('v123')
    })

    it('should auto-detect Geotab format', () => {
      const payload = {
        device: { id: 'b123' },
        latitude: 40.7128,
        longitude: -74.0060
      }

      const result = normalizeGpsPayload(payload)

      expect(result.truckId).toBe('b123')
    })

    it('should auto-detect Verizon Connect format', () => {
      const payload = {
        asset_id: 'vc123',
        gps: { lat: 40.7128, lon: -74.0060 }
      }

      const result = normalizeGpsPayload(payload)

      expect(result.truckId).toBe('vc123')
    })

    it('should auto-detect MQTT format', () => {
      const payload = {
        topic: 'fleet/truck123/gps',
        payload: { lat: 40.7128, lng: -74.0060 }
      }

      const result = normalizeGpsPayload(payload)

      expect(result.truckId).toBe('truck123')
    })

    it('should default to custom format', () => {
      const payload = {
        truckId: 'truck123',
        lat: 40.7128,
        lng: -74.0060
      }

      const result = normalizeGpsPayload(payload)

      expect(result.truckId).toBe('truck123')
    })
  })

  describe('Payload Validation', () => {
    it('should validate correct payload', () => {
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

      expect(validateGpsPayload(payload)).toBe(true)
    })

    it('should reject payload with invalid coordinates', () => {
      const payload = {
        truckId: 'truck123',
        lat: 91,
        lng: -74.0060,
        speed: 60,
        heading: 180,
        fuelLevel: 75,
        ignitionOn: true,
        timestamp: '2026-02-26T12:00:00Z'
      }

      expect(validateGpsPayload(payload)).toBe(false)
    })

    it('should reject payload with invalid fuel level', () => {
      const payload = {
        truckId: 'truck123',
        lat: 40.7128,
        lng: -74.0060,
        speed: 60,
        heading: 180,
        fuelLevel: 150,
        ignitionOn: true,
        timestamp: '2026-02-26T12:00:00Z'
      }

      expect(validateGpsPayload(payload)).toBe(false)
    })

    it('should reject payload with missing truckId', () => {
      const payload = {
        truckId: '',
        lat: 40.7128,
        lng: -74.0060,
        speed: 60,
        heading: 180,
        fuelLevel: 75,
        ignitionOn: true,
        timestamp: '2026-02-26T12:00:00Z'
      }

      expect(validateGpsPayload(payload)).toBe(false)
    })
  })
})
