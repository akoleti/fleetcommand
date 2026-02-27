/**
 * Shared Type Definitions — FleetCommand
 * 
 * Used by both web (Next.js) and mobile (React Native) apps
 * Synced with Prisma schema: prisma/schema.prisma
 */

// ============ Auth & Users ============

export type UserRole = 'owner' | 'manager' | 'driver';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone?: string;
  profileImageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ============ Fleet Management ============

export type TruckStatus = 'active' | 'inactive' | 'maintenance';

export interface Truck {
  id: string;
  licenseNumber: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  status: TruckStatus;
  assignedDriverId?: string;
  lastGpsUpdate?: Date;
  gpsLocation?: GpsLocation;
  currentTrip?: Trip;
  createdAt: Date;
  updatedAt: Date;
}

export interface GpsLocation {
  id: string;
  truckId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  altitude?: number;
  accuracy?: number;
  fuelLevel?: number;
  ignitionOn: boolean;
  timestamp: Date;
}

export interface TruckStatus {
  id: string;
  truckId: string;
  status: TruckStatus;
  mileage: number;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  lastUpdated: Date;
}

// ============ Drivers ============

export interface DriverProfile {
  id: string;
  userId: string;
  licenseNumber: string;
  licenseExpiry: Date;
  assignedTruckId?: string;
  totalTrips: number;
  totalMiles: number;
  safetyRating: number; // 1-5
  createdAt: Date;
  updatedAt: Date;
}

// ============ Trips ============

export type TripStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

export interface Trip {
  id: string;
  truckId: string;
  driverId: string;
  pickupLocation: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffLocation: string;
  dropoffLatitude: number;
  dropoffLongitude: number;
  plannedStartTime: Date;
  plannedEndTime: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  status: TripStatus;
  distance?: number;
  duration?: number;
  deliveryProofId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============ Maintenance ============

export type MaintenanceType =
  | 'oil_change'
  | 'tire_rotation'
  | 'brake_service'
  | 'filter_replacement'
  | 'fluid_check'
  | 'inspection'
  | 'repair'
  | 'other';

export interface MaintenanceLog {
  id: string;
  truckId: string;
  type: MaintenanceType;
  description: string;
  cost: number;
  serviceDate: Date;
  nextServiceDate?: Date;
  mileageAtService?: number;
  notes?: string;
  insuranceClaimId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============ Insurance ============

export type InsuranceCoverageType = 'comprehensive' | 'collision' | 'liability' | 'full_coverage';

export interface TruckInsurance {
  id: string;
  truckId: string;
  provider: string;
  policyNumber: string;
  coverageType: InsuranceCoverageType;
  coverageAmount: number;
  deductible: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ClaimStatus = 'open' | 'pending' | 'settled' | 'denied';

export interface InsuranceClaim {
  id: string;
  insuranceId: string;
  truckId: string;
  claimNumber: string;
  type: string; // e.g., 'collision', 'damage', 'theft'
  description: string;
  incidentDate: Date;
  amount: number;
  status: ClaimStatus;
  notes?: string;
  maintenanceLogId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============ Fuel ============

export interface FuelLog {
  id: string;
  truckId: string;
  tripId?: string;
  quantity: number; // in gallons
  cost: number;
  fuelPrice: number; // price per gallon
  refuelDate: Date;
  location: string;
  mileage?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============ Alerts ============

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertType =
  | 'idle_alert'
  | 'low_fuel'
  | 'critical_fuel'
  | 'maintenance_due'
  | 'license_expiry'
  | 'insurance_expiry'
  | 'gps_lost'
  | 'pickup'
  | 'trip_complete'
  | 'claim_update'
  | 'theft'
  | 'emergency';
export type AlertStatus = 'active' | 'resolved' | 'dismissed';

export interface Alert {
  id: string;
  truckId: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  resolvedAt?: Date;
  dismissedAt?: Date;
}

// ============ Delivery ============

export interface DeliveryProof {
  id: string;
  tripId: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone?: string;
  signatureImageUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryMedia {
  id: string;
  deliveryProofId: string;
  mediaType: 'photo' | 'signature';
  mediaUrl: string;
  latitude?: number;
  longitude?: number;
  uploadedAt: Date;
}

// ============ API Response Wrappers ============

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============ Form DTOs ============

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface CreateTruckDto {
  licenseNumber: string;
  vin: string;
  make: string;
  model: string;
  year: number;
}

export interface UpdateTruckDto {
  licenseNumber?: string;
  status?: TruckStatus;
  assignedDriverId?: string;
}

export interface CreateTripDto {
  truckId: string;
  driverId: string;
  pickupLocation: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffLocation: string;
  dropoffLatitude: number;
  dropoffLongitude: number;
  plannedStartTime: string; // ISO date
  plannedEndTime: string; // ISO date
}

export interface UpdateTripStatusDto {
  status: TripStatus;
}

export interface CreateDeliveryProofDto {
  tripId: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone?: string;
  signatureImage?: Blob;
  photos?: Blob[];
  notes?: string;
}

// ============ Socket.io Events ============

export interface SocketGpsUpdate {
  truckId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  timestamp: number;
}

export interface SocketAlertEvent {
  alertId: string;
  truckId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
}

export interface SocketTripUpdateEvent {
  tripId: string;
  status: TripStatus;
  driverId: string;
  truckId: string;
}
