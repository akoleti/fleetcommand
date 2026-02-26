/**
 * Role-Based Access Control (RBAC)
 * Owner: AUTH-01
 * 
 * Defines permissions matrix and access control helpers.
 */

import { UserRole } from '@prisma/client'
import { JWTPayload } from './jwt'

/**
 * Permission actions that can be performed
 */
export type Action = 
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'manage'  // Full access including settings

/**
 * Resources that can be accessed
 */
export type Resource =
  | 'organization'
  | 'organization:settings'
  | 'organization:billing'
  | 'users'
  | 'trucks'
  | 'drivers'
  | 'trips'
  | 'trips:own'
  | 'alerts'
  | 'maintenance'
  | 'fuel'
  | 'insurance'
  | 'reports'
  | 'delivery-proof'
  | 'delivery-proof:own'
  | 'gps'

/**
 * Permission definition
 */
interface Permission {
  action: Action
  resource: Resource
}

/**
 * Role permissions matrix
 * 
 * OWNER: Full access to everything in the organization
 * MANAGER: Read/write access to fleet operations
 * DRIVER: Limited to own trips and delivery proof
 */
const rolePermissions: Record<UserRole, Permission[]> = {
  OWNER: [
    // Organization
    { action: 'manage', resource: 'organization' },
    { action: 'manage', resource: 'organization:settings' },
    { action: 'manage', resource: 'organization:billing' },
    // Users
    { action: 'create', resource: 'users' },
    { action: 'read', resource: 'users' },
    { action: 'update', resource: 'users' },
    { action: 'delete', resource: 'users' },
    // Fleet
    { action: 'create', resource: 'trucks' },
    { action: 'read', resource: 'trucks' },
    { action: 'update', resource: 'trucks' },
    { action: 'delete', resource: 'trucks' },
    // Drivers
    { action: 'create', resource: 'drivers' },
    { action: 'read', resource: 'drivers' },
    { action: 'update', resource: 'drivers' },
    { action: 'delete', resource: 'drivers' },
    // Trips
    { action: 'create', resource: 'trips' },
    { action: 'read', resource: 'trips' },
    { action: 'update', resource: 'trips' },
    { action: 'delete', resource: 'trips' },
    // Alerts
    { action: 'read', resource: 'alerts' },
    { action: 'update', resource: 'alerts' },
    { action: 'delete', resource: 'alerts' },
    // Maintenance
    { action: 'create', resource: 'maintenance' },
    { action: 'read', resource: 'maintenance' },
    { action: 'update', resource: 'maintenance' },
    { action: 'delete', resource: 'maintenance' },
    // Fuel
    { action: 'create', resource: 'fuel' },
    { action: 'read', resource: 'fuel' },
    { action: 'update', resource: 'fuel' },
    { action: 'delete', resource: 'fuel' },
    // Insurance
    { action: 'create', resource: 'insurance' },
    { action: 'read', resource: 'insurance' },
    { action: 'update', resource: 'insurance' },
    { action: 'delete', resource: 'insurance' },
    // Reports
    { action: 'create', resource: 'reports' },
    { action: 'read', resource: 'reports' },
    // Delivery Proof
    { action: 'read', resource: 'delivery-proof' },
    // GPS
    { action: 'read', resource: 'gps' },
  ],

  MANAGER: [
    // Users (read only)
    { action: 'read', resource: 'users' },
    // Fleet
    { action: 'create', resource: 'trucks' },
    { action: 'read', resource: 'trucks' },
    { action: 'update', resource: 'trucks' },
    // Drivers
    { action: 'create', resource: 'drivers' },
    { action: 'read', resource: 'drivers' },
    { action: 'update', resource: 'drivers' },
    // Trips
    { action: 'create', resource: 'trips' },
    { action: 'read', resource: 'trips' },
    { action: 'update', resource: 'trips' },
    // Alerts
    { action: 'read', resource: 'alerts' },
    { action: 'update', resource: 'alerts' },
    // Maintenance
    { action: 'create', resource: 'maintenance' },
    { action: 'read', resource: 'maintenance' },
    { action: 'update', resource: 'maintenance' },
    // Fuel
    { action: 'create', resource: 'fuel' },
    { action: 'read', resource: 'fuel' },
    // Insurance (read only)
    { action: 'read', resource: 'insurance' },
    // Reports
    { action: 'read', resource: 'reports' },
    // Delivery Proof
    { action: 'read', resource: 'delivery-proof' },
    // GPS
    { action: 'read', resource: 'gps' },
  ],

  DRIVER: [
    // Own trips
    { action: 'read', resource: 'trips:own' },
    { action: 'update', resource: 'trips:own' },
    // Delivery proof (own)
    { action: 'create', resource: 'delivery-proof:own' },
    { action: 'read', resource: 'delivery-proof:own' },
    // Fuel (can log own fuel)
    { action: 'create', resource: 'fuel' },
    // GPS (own location)
    { action: 'read', resource: 'gps' },
  ],
}

/**
 * Check if a role has permission for an action on a resource
 */
export function hasPermission(
  role: UserRole,
  action: Action,
  resource: Resource
): boolean {
  const permissions = rolePermissions[role]
  if (!permissions) return false

  return permissions.some(
    (p) => p.action === action && p.resource === resource
  )
}

/**
 * Check if user has permission (using JWT payload)
 */
export function userHasPermission(
  user: JWTPayload,
  action: Action,
  resource: Resource
): boolean {
  return hasPermission(user.role, action, resource)
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return rolePermissions[role] || []
}

/**
 * Check if role is at least the specified level
 * OWNER > MANAGER > DRIVER
 */
export function isRoleAtLeast(role: UserRole, minimumRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    OWNER: 3,
    MANAGER: 2,
    DRIVER: 1,
  }

  return roleHierarchy[role] >= roleHierarchy[minimumRole]
}

/**
 * Create a permission check for API routes
 */
export function requirePermission(action: Action, resource: Resource) {
  return (user: JWTPayload): boolean => {
    return userHasPermission(user, action, resource)
  }
}

/**
 * Create a role check for API routes
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (user: JWTPayload): boolean => {
    return allowedRoles.includes(user.role)
  }
}

/**
 * Permission error for unauthorized access
 */
export class PermissionError extends Error {
  constructor(
    public action: Action,
    public resource: Resource,
    public role: UserRole
  ) {
    super(`Role '${role}' does not have permission to '${action}' on '${resource}'`)
    this.name = 'PermissionError'
  }
}

/**
 * Assert permission, throw if not allowed
 */
export function assertPermission(
  user: JWTPayload,
  action: Action,
  resource: Resource
): void {
  if (!userHasPermission(user, action, resource)) {
    throw new PermissionError(action, resource, user.role)
  }
}
