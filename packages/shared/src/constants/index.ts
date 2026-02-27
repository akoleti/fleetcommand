/**
 * Shared Constants — FleetCommand
 */

// Alert Types
export const ALERT_TYPES = {
  IDLE_ALERT: 'idle_alert',
  LOW_FUEL: 'low_fuel',
  CRITICAL_FUEL: 'critical_fuel',
  MAINTENANCE_DUE: 'maintenance_due',
  LICENSE_EXPIRY: 'license_expiry',
  INSURANCE_EXPIRY: 'insurance_expiry',
  GPS_LOST: 'gps_lost',
  PICKUP: 'pickup',
  TRIP_COMPLETE: 'trip_complete',
  CLAIM_UPDATE: 'claim_update',
  THEFT: 'theft',
  EMERGENCY: 'emergency',
} as const;

export const ALERT_TYPE_LABELS = {
  [ALERT_TYPES.IDLE_ALERT]: 'Idle Alert',
  [ALERT_TYPES.LOW_FUEL]: 'Low Fuel',
  [ALERT_TYPES.CRITICAL_FUEL]: 'Critical Fuel',
  [ALERT_TYPES.MAINTENANCE_DUE]: 'Maintenance Due',
  [ALERT_TYPES.LICENSE_EXPIRY]: 'License Expiry',
  [ALERT_TYPES.INSURANCE_EXPIRY]: 'Insurance Expiry',
  [ALERT_TYPES.GPS_LOST]: 'GPS Lost',
  [ALERT_TYPES.PICKUP]: 'Pickup',
  [ALERT_TYPES.TRIP_COMPLETE]: 'Trip Complete',
  [ALERT_TYPES.CLAIM_UPDATE]: 'Claim Update',
  [ALERT_TYPES.THEFT]: 'Theft Alert',
  [ALERT_TYPES.EMERGENCY]: 'Emergency',
} as const;

// Alert Severities
export const ALERT_SEVERITIES = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
} as const;

export const ALERT_SEVERITY_COLORS = {
  info: '#3B82F6', // Blue
  warning: '#F59E0B', // Amber
  critical: '#EF4444', // Red
} as const;

export const ALERT_SEVERITY_LABELS = {
  info: 'Info',
  warning: 'Warning',
  critical: 'Critical',
} as const;

// Alert Status
export const ALERT_STATUS = {
  ACTIVE: 'active',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
} as const;

// Truck Statuses
export const TRUCK_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  MAINTENANCE: 'maintenance',
} as const;

export const TRUCK_STATUS_LABELS = {
  active: 'Active',
  inactive: 'Inactive',
  maintenance: 'In Maintenance',
} as const;

export const TRUCK_STATUS_COLORS = {
  active: '#10B981', // Green
  inactive: '#6B7280', // Gray
  maintenance: '#F59E0B', // Amber
} as const;

// Trip Statuses
export const TRIP_STATUSES = {
  SCHEDULED: 'scheduled',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const TRIP_STATUS_LABELS = {
  scheduled: 'Scheduled',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
} as const;

export const TRIP_STATUS_COLORS = {
  scheduled: '#9CA3AF', // Gray
  active: '#3B82F6', // Blue
  completed: '#10B981', // Green
  cancelled: '#EF4444', // Red
} as const;

// User Roles
export const USER_ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  DRIVER: 'driver',
} as const;

export const USER_ROLE_LABELS = {
  owner: 'Owner',
  manager: 'Manager',
  driver: 'Driver',
} as const;

// Maintenance Types
export const MAINTENANCE_TYPES = {
  OIL_CHANGE: 'oil_change',
  TIRE_ROTATION: 'tire_rotation',
  BRAKE_SERVICE: 'brake_service',
  FILTER_REPLACEMENT: 'filter_replacement',
  FLUID_CHECK: 'fluid_check',
  INSPECTION: 'inspection',
  REPAIR: 'repair',
  OTHER: 'other',
} as const;

export const MAINTENANCE_TYPE_LABELS = {
  oil_change: 'Oil Change',
  tire_rotation: 'Tire Rotation',
  brake_service: 'Brake Service',
  filter_replacement: 'Filter Replacement',
  fluid_check: 'Fluid Check',
  inspection: 'Inspection',
  repair: 'Repair',
  other: 'Other',
} as const;

// Insurance Coverage Types
export const INSURANCE_COVERAGE_TYPES = {
  COMPREHENSIVE: 'comprehensive',
  COLLISION: 'collision',
  LIABILITY: 'liability',
  FULL_COVERAGE: 'full_coverage',
} as const;

export const INSURANCE_COVERAGE_LABELS = {
  comprehensive: 'Comprehensive',
  collision: 'Collision',
  liability: 'Liability',
  full_coverage: 'Full Coverage',
} as const;

// Claim Statuses
export const CLAIM_STATUSES = {
  OPEN: 'open',
  PENDING: 'pending',
  SETTLED: 'settled',
  DENIED: 'denied',
} as const;

export const CLAIM_STATUS_LABELS = {
  open: 'Open',
  pending: 'Pending',
  settled: 'Settled',
  denied: 'Denied',
} as const;

// Timeouts & Thresholds
export const TIMEOUTS = {
  IDLE_THRESHOLD_MINUTES: 240, // 4 hours
  GPS_LOST_THRESHOLD_SECONDS: 300, // 5 minutes
  LOW_FUEL_PERCENTAGE: 25,
  CRITICAL_FUEL_PERCENTAGE: 10,
  LICENSE_EXPIRY_DAYS: 30,
  INSURANCE_EXPIRY_DAYS: 30,
  INSURANCE_CRITICAL_DAYS: 7,
} as const;

// API
export const API_TIMEOUTS = {
  DEFAULT: 15000, // 15 seconds
  UPLOAD: 60000, // 60 seconds for file uploads
  DOWNLOAD: 30000, // 30 seconds for downloads
} as const;

// File Upload
export const FILE_UPLOAD = {
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_PDF_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf'],
  S3_PRESIGNED_URL_EXPIRY_SECONDS: {
    READ: 3600, // 1 hour
    WRITE: 300, // 5 minutes
  },
} as const;

// Maps
export const MAPS = {
  DEFAULT_ZOOM: 12,
  TRUCK_CLUSTER_RADIUS: 100,
  DEFAULT_CENTER: { latitude: 37.7749, longitude: -122.4194 }, // San Francisco
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// Socket.io
export const SOCKET_EVENTS = {
  GPS_UPDATE: 'gps_update',
  ALERT_CREATED: 'alert_created',
  TRIP_UPDATED: 'trip_updated',
  TRUCK_STATUS_CHANGED: 'truck_status_changed',
  FLEET_STATUS: 'fleet_status',
  DELIVERY_COMPLETED: 'delivery_completed',
} as const;

// Notification Channels
export const NOTIFICATION_CHANNELS = {
  PUSH: 'push', // FCM
  SMS: 'sms', // Twilio
  EMAIL: 'email', // SendGrid
  IN_APP: 'in_app',
} as const;

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  DISPLAY_WITH_TIME: 'MMM dd, yyyy HH:mm',
  INPUT: 'yyyy-MM-dd',
  ISO: 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'',
} as const;
