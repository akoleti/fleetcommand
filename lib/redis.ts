/**
 * Redis Client
 * Owner: AUTH-01
 * 
 * Redis client for rate limiting, caching, and session management
 */

import { createClient } from 'redis'

const REDIS_URL = process.env.REDIS_URL

const isValidRedisUrl = REDIS_URL && (REDIS_URL.startsWith('redis://') || REDIS_URL.startsWith('rediss://'))

if (!isValidRedisUrl) {
  console.warn('⚠️  REDIS_URL not configured (or is a REST URL). Redis features will be disabled — the app works fine without it.')
}

export const redis = isValidRedisUrl
  ? createClient({
      url: REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) return new Error('Max reconnection attempts reached')
          return Math.min(retries * 100, 3000)
        },
      },
    })
  : null

if (redis) {
  redis.on('error', (err) => console.error('Redis Client Error:', err))
  redis.on('connect', () => console.log('✅ Redis connected'))
  redis.connect().catch((err) => {
    console.error('Failed to connect to Redis:', err)
  })
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return redis !== null && redis.isOpen
}

/**
 * Rate limiting: Increment failed login attempts
 * @returns Number of attempts after increment
 */
export async function incrementLoginAttempts(email: string): Promise<number> {
  if (!isRedisAvailable()) return 0

  const key = `auth:fails:${email}`
  const TTL_SECONDS = 15 * 60 // 15 minutes

  try {
    const attempts = await redis!.incr(key)
    
    // Set TTL on first attempt
    if (attempts === 1) {
      await redis!.expire(key, TTL_SECONDS)
    }

    return attempts
  } catch (error) {
    console.error('Redis incrementLoginAttempts error:', error)
    return 0
  }
}

/**
 * Rate limiting: Get current failed login attempts
 */
export async function getLoginAttempts(email: string): Promise<number> {
  if (!isRedisAvailable()) return 0

  const key = `auth:fails:${email}`

  try {
    const attempts = await redis!.get(key)
    return attempts ? parseInt(attempts, 10) : 0
  } catch (error) {
    console.error('Redis getLoginAttempts error:', error)
    return 0
  }
}

/**
 * Rate limiting: Reset failed login attempts
 */
export async function resetLoginAttempts(email: string): Promise<void> {
  if (!isRedisAvailable()) return

  const key = `auth:fails:${email}`

  try {
    await redis!.del(key)
  } catch (error) {
    console.error('Redis resetLoginAttempts error:', error)
  }
}

/**
 * Store refresh token hash in Redis
 */
export async function storeRefreshToken(
  userId: string,
  tokenHash: string,
  ttlSeconds: number = 7 * 24 * 60 * 60 // 7 days
): Promise<void> {
  if (!isRedisAvailable()) return

  const key = `auth:refresh:${userId}`

  try {
    await redis!.setEx(key, ttlSeconds, tokenHash)
  } catch (error) {
    console.error('Redis storeRefreshToken error:', error)
  }
}

/**
 * Get refresh token hash from Redis
 */
export async function getRefreshToken(userId: string): Promise<string | null> {
  if (!isRedisAvailable()) return null

  const key = `auth:refresh:${userId}`

  try {
    return await redis!.get(key)
  } catch (error) {
    console.error('Redis getRefreshToken error:', error)
    return null
  }
}

/**
 * Delete refresh token from Redis
 */
export async function deleteRefreshToken(userId: string): Promise<void> {
  if (!isRedisAvailable()) return

  const key = `auth:refresh:${userId}`

  try {
    await redis!.del(key)
  } catch (error) {
    console.error('Redis deleteRefreshToken error:', error)
  }
}

/**
 * Store latest GPS position in Redis (cache)
 * Enhanced by GPS-01 for full truck status caching
 */
export async function cacheGPSPosition(
  truckId: string,
  position: {
    lat: number
    lng: number
    speed: number
    heading: number
    fuelLevel: number
    ignitionOn: boolean
    movementStatus: string
    timestamp: string
  }
): Promise<void> {
  if (!isRedisAvailable()) return

  const key = `truck:pos:${truckId}`
  const TTL_SECONDS = 120 // 2 minutes

  try {
    await redis!.setEx(key, TTL_SECONDS, JSON.stringify(position))
  } catch (error) {
    console.error('Redis cacheGPSPosition error:', error)
  }
}

/**
 * Get latest GPS position from Redis cache
 */
export async function getGPSPosition(truckId: string): Promise<any | null> {
  if (!isRedisAvailable()) return null

  const key = `truck:pos:${truckId}`

  try {
    const data = await redis!.get(key)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error('Redis getGPSPosition error:', error)
    return null
  }
}

/**
 * Get all truck positions from Redis cache (fleet view)
 * GPS-01: Fast fleet dashboard without DB queries
 */
export async function getAllTruckPositions(): Promise<any[]> {
  if (!isRedisAvailable()) return []

  try {
    // Scan for all truck:pos:* keys
    const keys = await redis!.keys('truck:pos:*')
    
    if (keys.length === 0) {
      return []
    }

    // Batch get all positions
    const positions = await redis!.mGet(keys)
    
    return positions
      .filter((pos): pos is string => pos !== null)
      .map(pos => {
        try {
          return JSON.parse(pos)
        } catch {
          return null
        }
      })
      .filter(pos => pos !== null)
  } catch (error) {
    console.error('Redis getAllTruckPositions error:', error)
    return []
  }
}

/**
 * Delete truck position from cache
 */
export async function deleteTruckPosition(truckId: string): Promise<void> {
  if (!isRedisAvailable()) return

  const key = `truck:pos:${truckId}`

  try {
    await redis!.del(key)
  } catch (error) {
    console.error('Redis deleteTruckPosition error:', error)
  }
}

/**
 * Update truck position TTL (extend cache)
 */
export async function extendTruckPositionTTL(truckId: string, ttlSeconds: number = 120): Promise<void> {
  if (!isRedisAvailable()) return

  const key = `truck:pos:${truckId}`

  try {
    await redis!.expire(key, ttlSeconds)
  } catch (error) {
    console.error('Redis extendTruckPositionTTL error:', error)
  }
}

/**
 * Generic cache operations
 */
export async function setCache(key: string, value: string, ttlSeconds?: number): Promise<void> {
  if (!isRedisAvailable()) return

  try {
    if (ttlSeconds) {
      await redis!.setEx(key, ttlSeconds, value)
    } else {
      await redis!.set(key, value)
    }
  } catch (error) {
    console.error('Redis setCache error:', error)
  }
}

export async function getCache(key: string): Promise<string | null> {
  if (!isRedisAvailable()) return null

  try {
    return await redis!.get(key)
  } catch (error) {
    console.error('Redis getCache error:', error)
    return null
  }
}

export async function deleteCache(key: string): Promise<void> {
  if (!isRedisAvailable()) return

  try {
    await redis!.del(key)
  } catch (error) {
    console.error('Redis deleteCache error:', error)
  }
}

/**
 * Graceful shutdown
 */
export async function disconnectRedis(): Promise<void> {
  if (redis && redis.isOpen) {
    await redis.quit()
  }
}

// Graceful shutdown on process termination
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await disconnectRedis()
  })
}
