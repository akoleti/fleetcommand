/**
 * Authentication Middleware
 * Owner: AUTH-01
 * 
 * Verifies JWT tokens and attaches user to request context.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, JWTPayload } from '@/lib/jwt'
import { Action, Resource, userHasPermission, requireRole, requirePermission } from '@/lib/rbac'
import { UserRole } from '@prisma/client'

/**
 * Extended request with user context
 */
export interface AuthenticatedRequest extends NextRequest {
  user: JWTPayload
}

/**
 * Response type for auth errors
 */
export interface AuthErrorResponse {
  error: string
  code: string
}

/**
 * Extract bearer token from Authorization header
 */
function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  return authHeader.slice(7)
}

/**
 * Create an unauthorized response
 */
function unauthorizedResponse(message: string, code: string): NextResponse<AuthErrorResponse> {
  return NextResponse.json(
    { error: message, code },
    { status: 401 }
  )
}

/**
 * Create a forbidden response
 */
function forbiddenResponse(message: string, code: string): NextResponse<AuthErrorResponse> {
  return NextResponse.json(
    { error: message, code },
    { status: 403 }
  )
}

/**
 * Middleware to verify authentication
 * Returns user payload if valid, or NextResponse error
 */
export function withAuth(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const token = extractBearerToken(request)
    
    if (!token) {
      return unauthorizedResponse('Missing authentication token', 'MISSING_TOKEN')
    }

    const payload = verifyAccessToken(token)
    
    if (!payload) {
      return unauthorizedResponse('Invalid or expired token', 'INVALID_TOKEN')
    }

    // Attach user to request
    const authenticatedRequest = request as AuthenticatedRequest
    authenticatedRequest.user = payload

    return handler(authenticatedRequest)
  }
}

/**
 * Middleware to verify authentication and role
 */
export function withRole(...allowedRoles: UserRole[]) {
  const roleCheck = requireRole(...allowedRoles)
  
  return function (
    handler: (request: AuthenticatedRequest) => Promise<NextResponse>
  ) {
    return async (request: NextRequest): Promise<NextResponse> => {
      const token = extractBearerToken(request)
      
      if (!token) {
        return unauthorizedResponse('Missing authentication token', 'MISSING_TOKEN')
      }

      const payload = verifyAccessToken(token)
      
      if (!payload) {
        return unauthorizedResponse('Invalid or expired token', 'INVALID_TOKEN')
      }

      if (!roleCheck(payload)) {
        return forbiddenResponse(
          `Access denied. Required roles: ${allowedRoles.join(', ')}`,
          'INSUFFICIENT_ROLE'
        )
      }

      const authenticatedRequest = request as AuthenticatedRequest
      authenticatedRequest.user = payload

      return handler(authenticatedRequest)
    }
  }
}

/**
 * Middleware to verify authentication and permission
 */
export function withPermission(action: Action, resource: Resource) {
  const permissionCheck = requirePermission(action, resource)
  
  return function (
    handler: (request: AuthenticatedRequest) => Promise<NextResponse>
  ) {
    return async (request: NextRequest): Promise<NextResponse> => {
      const token = extractBearerToken(request)
      
      if (!token) {
        return unauthorizedResponse('Missing authentication token', 'MISSING_TOKEN')
      }

      const payload = verifyAccessToken(token)
      
      if (!payload) {
        return unauthorizedResponse('Invalid or expired token', 'INVALID_TOKEN')
      }

      if (!permissionCheck(payload)) {
        return forbiddenResponse(
          `Permission denied: cannot ${action} ${resource}`,
          'INSUFFICIENT_PERMISSION'
        )
      }

      const authenticatedRequest = request as AuthenticatedRequest
      authenticatedRequest.user = payload

      return handler(authenticatedRequest)
    }
  }
}

/**
 * Helper to check organization ownership
 * Ensures user can only access their own organization's resources
 */
export function checkOrganizationAccess(
  user: JWTPayload,
  resourceOrganizationId: string
): boolean {
  return user.organizationId === resourceOrganizationId
}

/**
 * Get user from request (for use after withAuth)
 */
export function getRequestUser(request: NextRequest): JWTPayload | null {
  return (request as AuthenticatedRequest).user || null
}

/**
 * Verify token from cookies (for SSR pages)
 */
export function verifyTokenFromCookies(request: NextRequest): JWTPayload | null {
  const token = request.cookies.get('accessToken')?.value
  if (!token) return null
  return verifyAccessToken(token)
}

/**
 * Public route handler (no auth required)
 */
export function publicRoute(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return handler
}
