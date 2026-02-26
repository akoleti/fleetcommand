/**
 * JWT Utilities
 * Owner: AUTH-01
 * 
 * Handles JWT token creation, verification, and refresh logic.
 */

import jwt from 'jsonwebtoken'
import { UserRole } from '@prisma/client'

const JWT_SECRET = process.env.JWT_SECRET!
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!

// Token expiration times
export const ACCESS_TOKEN_EXPIRY = '15m'  // 15 minutes
export const REFRESH_TOKEN_EXPIRY = '7d'  // 7 days

export interface JWTPayload {
  userId: string
  email: string
  role: UserRole
  organizationId: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

/**
 * Generate an access token
 */
export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'fleetcommand',
    audience: 'fleetcommand-api',
  })
}

/**
 * Generate a refresh token
 */
export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: 'fleetcommand',
    audience: 'fleetcommand-refresh',
  })
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(payload: JWTPayload): TokenPair {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  }
}

/**
 * Verify an access token
 */
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'fleetcommand',
      audience: 'fleetcommand-api',
    })
    return decoded as JWTPayload
  } catch (error) {
    return null
  }
}

/**
 * Verify a refresh token
 */
export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'fleetcommand',
      audience: 'fleetcommand-refresh',
    })
    return decoded as JWTPayload
  } catch (error) {
    return null
  }
}

/**
 * Decode token without verification (for debugging/inspection)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload
  } catch {
    return null
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as { exp?: number }
    if (!decoded?.exp) return true
    return Date.now() >= decoded.exp * 1000
  } catch {
    return true
  }
}

/**
 * Get token expiration time
 */
export function getTokenExpiry(token: string): Date | null {
  try {
    const decoded = jwt.decode(token) as { exp?: number }
    if (!decoded?.exp) return null
    return new Date(decoded.exp * 1000)
  } catch {
    return null
  }
}

/**
 * Calculate refresh token expiry date
 */
export function getRefreshTokenExpiryDate(): Date {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
}
