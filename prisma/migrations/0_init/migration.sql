-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'MANAGER', 'DRIVER');

-- CreateEnum
CREATE TYPE "TruckStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "MovementStatus" AS ENUM ('MOVING', 'IDLE', 'STOPPED', 'OFFLINE');

-- CreateEnum
CREATE TYPE "DriverAvailability" AS ENUM ('AVAILABLE', 'ON_TRIP', 'OFF_DUTY', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'ARRIVED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('IDLE_WARNING', 'FUEL_LOW', 'INSURANCE_EXPIRING', 'INSURANCE_EXPIRED', 'MAINTENANCE_DUE', 'SPEEDING', 'ROUTE_DEVIATION', 'ENGINE_FAULT', 'GEOFENCE_EXIT', 'UNAUTHORIZED_MOVEMENT', 'GPS_OFFLINE', 'EMERGENCY_STOP');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('OIL_CHANGE', 'TIRE_ROTATION', 'BRAKE_SERVICE', 'TRANSMISSION', 'ENGINE_REPAIR', 'BATTERY_REPLACEMENT', 'AC_SERVICE', 'GENERAL_INSPECTION', 'BODY_REPAIR', 'OTHER');

-- CreateEnum
CREATE TYPE "PolicyType" AS ENUM ('COMPREHENSIVE', 'THIRD_PARTY', 'COLLISION', 'LIABILITY');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SETTLED');

-- CreateEnum
CREATE TYPE "ProofStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('PHOTO', 'VIDEO', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('FUEL_MONTHLY', 'FUEL_YEARLY', 'MAINTENANCE_SUMMARY', 'DRIVER_PERFORMANCE', 'TRIP_SUMMARY', 'INSURANCE_SUMMARY');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "phone" TEXT,
    "fcm_token" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMP(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trucks" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "truck_code" TEXT NOT NULL,
    "plate_number" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "vin" TEXT NOT NULL,
    "fuel_capacity_l" DOUBLE PRECISION NOT NULL,
    "status" "TruckStatus" NOT NULL,
    "current_driver_id" TEXT,
    "odometer_km" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trucks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "truck_status" (
    "id" TEXT NOT NULL,
    "truck_id" TEXT NOT NULL,
    "movement_status" "MovementStatus" NOT NULL DEFAULT 'STOPPED',
    "last_moved_at" TIMESTAMP(6),
    "idle_since" TIMESTAMP(6),
    "idle_duration_min" INTEGER DEFAULT 0,
    "current_fuel_pct" DOUBLE PRECISION,
    "last_location_id" TEXT,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "truck_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gps_locations" (
    "id" TEXT NOT NULL,
    "truck_id" TEXT NOT NULL,
    "coordinates" geography(Point, 4326),
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "speed_kmh" DOUBLE PRECISION,
    "heading_deg" DOUBLE PRECISION,
    "fuel_level_pct" DOUBLE PRECISION,
    "ignition_on" BOOLEAN NOT NULL DEFAULT false,
    "address_label" TEXT,
    "recordedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "gps_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "license_number" TEXT NOT NULL,
    "license_class" TEXT NOT NULL,
    "license_expiry" DATE NOT NULL,
    "hire_date" DATE NOT NULL,
    "availability" "DriverAvailability" NOT NULL DEFAULT 'AVAILABLE',
    "total_km_driven" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION DEFAULT 5.0,

    CONSTRAINT "driver_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "truck_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "origin_address" TEXT NOT NULL,
    "origin_coords" geography(Point, 4326),
    "dest_address" TEXT NOT NULL,
    "dest_coords" geography(Point, 4326),
    "status" "TripStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduled_at" TIMESTAMP(6) NOT NULL,
    "started_at" TIMESTAMP(6),
    "completed_at" TIMESTAMP(6),
    "distance_km" DOUBLE PRECISION,
    "cargo_description" TEXT,
    "delivery_proof_id" TEXT,
    "proof_required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_logs" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "truck_id" TEXT NOT NULL,
    "service_type" "ServiceType" NOT NULL,
    "description" TEXT,
    "service_date" DATE NOT NULL,
    "odometer_at_service" DOUBLE PRECISION NOT NULL,
    "cost_usd" DOUBLE PRECISION,
    "service_provider" TEXT,
    "next_service_date" DATE,
    "next_service_km" DOUBLE PRECISION,
    "is_insurance_related" BOOLEAN NOT NULL DEFAULT false,
    "insurance_claim_id" TEXT,
    "logged_by" TEXT NOT NULL,

    CONSTRAINT "maintenance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_logs" (
    "id" TEXT NOT NULL,
    "truck_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "liters_added" DOUBLE PRECISION NOT NULL,
    "fuel_level_before" DOUBLE PRECISION,
    "fuel_level_after" DOUBLE PRECISION,
    "cost_per_liter" DOUBLE PRECISION NOT NULL,
    "total_cost_usd" DOUBLE PRECISION NOT NULL,
    "station_name" TEXT,
    "location_coords" geography(Point, 4326),
    "filled_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "fuel_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "truck_id" TEXT,
    "alert_type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(6),
    "resolved_by" TEXT,
    "notif_sent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_proofs" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "signature_s3_key" TEXT,
    "signature_url" TEXT,
    "signed_at" TIMESTAMP(6) NOT NULL,
    "sign_latitude" DOUBLE PRECISION,
    "sign_longitude" DOUBLE PRECISION,
    "notes" TEXT,
    "status" "ProofStatus" NOT NULL DEFAULT 'PENDING',
    "userId" TEXT,

    CONSTRAINT "delivery_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_media" (
    "id" TEXT NOT NULL,
    "delivery_proof_id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "cdn_url" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "media_type" "MediaType" NOT NULL,
    "captured_at" TIMESTAMP(6) NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "delivery_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "truck_insurance" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "truck_id" TEXT NOT NULL,
    "provider_name" TEXT NOT NULL,
    "policy_number" TEXT NOT NULL,
    "policy_type" "PolicyType" NOT NULL,
    "coverage_amount_usd" DOUBLE PRECISION NOT NULL,
    "deductible_usd" DOUBLE PRECISION NOT NULL,
    "premium_monthly_usd" DOUBLE PRECISION NOT NULL,
    "start_date" DATE NOT NULL,
    "expiry_date" DATE NOT NULL,
    "agent_name" TEXT,
    "agent_phone" TEXT,
    "agent_email" TEXT,
    "policy_doc_s3_key" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "added_by" TEXT NOT NULL,

    CONSTRAINT "truck_insurance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_claims" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "insurance_id" TEXT NOT NULL,
    "truck_id" TEXT NOT NULL,
    "claim_number" TEXT NOT NULL,
    "incident_date" DATE NOT NULL,
    "incident_description" TEXT NOT NULL,
    "incident_location" TEXT,
    "claim_amount_usd" DOUBLE PRECISION NOT NULL,
    "settled_amount_usd" DOUBLE PRECISION,
    "claim_status" "ClaimStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submitted_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settled_at" TIMESTAMP(6),
    "docs_s3_keys" JSONB,
    "logged_by" TEXT NOT NULL,

    CONSTRAINT "insurance_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "s3_key" TEXT NOT NULL,
    "month" INTEGER,
    "year" INTEGER,
    "generated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_orgId_idx" ON "users"("orgId");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "trucks_truck_code_key" ON "trucks"("truck_code");

-- CreateIndex
CREATE UNIQUE INDEX "trucks_plate_number_key" ON "trucks"("plate_number");

-- CreateIndex
CREATE UNIQUE INDEX "trucks_vin_key" ON "trucks"("vin");

-- CreateIndex
CREATE INDEX "trucks_truck_code_idx" ON "trucks"("truck_code");

-- CreateIndex
CREATE INDEX "trucks_plate_number_idx" ON "trucks"("plate_number");

-- CreateIndex
CREATE INDEX "trucks_vin_idx" ON "trucks"("vin");

-- CreateIndex
CREATE INDEX "trucks_orgId_idx" ON "trucks"("orgId");

-- CreateIndex
CREATE INDEX "trucks_status_idx" ON "trucks"("status");

-- CreateIndex
CREATE INDEX "trucks_current_driver_id_idx" ON "trucks"("current_driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "truck_status_truck_id_key" ON "truck_status"("truck_id");

-- CreateIndex
CREATE INDEX "truck_status_movement_status_idx" ON "truck_status"("movement_status");

-- CreateIndex
CREATE INDEX "truck_status_idle_since_idx" ON "truck_status"("idle_since");

-- CreateIndex
CREATE INDEX "gps_locations_truck_id_idx" ON "gps_locations"("truck_id");

-- CreateIndex
CREATE INDEX "gps_locations_recordedAt_idx" ON "gps_locations"("recordedAt" DESC);

-- CreateIndex
CREATE INDEX "gps_locations_coordinates_idx" ON "gps_locations" USING GIST ("coordinates");

-- CreateIndex
CREATE UNIQUE INDEX "driver_profiles_user_id_key" ON "driver_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_profiles_license_number_key" ON "driver_profiles"("license_number");

-- CreateIndex
CREATE INDEX "driver_profiles_license_number_idx" ON "driver_profiles"("license_number");

-- CreateIndex
CREATE INDEX "driver_profiles_user_id_idx" ON "driver_profiles"("user_id");

-- CreateIndex
CREATE INDEX "driver_profiles_availability_idx" ON "driver_profiles"("availability");

-- CreateIndex
CREATE INDEX "driver_profiles_license_expiry_idx" ON "driver_profiles"("license_expiry");

-- CreateIndex
CREATE UNIQUE INDEX "trips_delivery_proof_id_key" ON "trips"("delivery_proof_id");

-- CreateIndex
CREATE INDEX "trips_truck_id_idx" ON "trips"("truck_id");

-- CreateIndex
CREATE INDEX "trips_driver_id_idx" ON "trips"("driver_id");

-- CreateIndex
CREATE INDEX "trips_status_idx" ON "trips"("status");

-- CreateIndex
CREATE INDEX "trips_scheduled_at_idx" ON "trips"("scheduled_at");

-- CreateIndex
CREATE INDEX "trips_origin_coords_idx" ON "trips" USING GIST ("origin_coords");

-- CreateIndex
CREATE INDEX "trips_dest_coords_idx" ON "trips" USING GIST ("dest_coords");

-- CreateIndex
CREATE INDEX "maintenance_logs_truck_id_idx" ON "maintenance_logs"("truck_id");

-- CreateIndex
CREATE INDEX "maintenance_logs_service_date_idx" ON "maintenance_logs"("service_date");

-- CreateIndex
CREATE INDEX "maintenance_logs_next_service_date_idx" ON "maintenance_logs"("next_service_date");

-- CreateIndex
CREATE INDEX "maintenance_logs_org_id_idx" ON "maintenance_logs"("org_id");

-- CreateIndex
CREATE INDEX "fuel_logs_truck_id_idx" ON "fuel_logs"("truck_id");

-- CreateIndex
CREATE INDEX "fuel_logs_driver_id_idx" ON "fuel_logs"("driver_id");

-- CreateIndex
CREATE INDEX "fuel_logs_filled_at_idx" ON "fuel_logs"("filled_at");

-- CreateIndex
CREATE INDEX "fuel_logs_location_coords_idx" ON "fuel_logs" USING GIST ("location_coords");

-- CreateIndex
CREATE INDEX "alerts_truck_id_idx" ON "alerts"("truck_id");

-- CreateIndex
CREATE INDEX "alerts_alert_type_idx" ON "alerts"("alert_type");

-- CreateIndex
CREATE INDEX "alerts_severity_idx" ON "alerts"("severity");

-- CreateIndex
CREATE INDEX "alerts_is_resolved_idx" ON "alerts"("is_resolved");

-- CreateIndex
CREATE INDEX "alerts_createdAt_idx" ON "alerts"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_proofs_trip_id_key" ON "delivery_proofs"("trip_id");

-- CreateIndex
CREATE INDEX "delivery_proofs_trip_id_idx" ON "delivery_proofs"("trip_id");

-- CreateIndex
CREATE INDEX "delivery_proofs_driver_id_idx" ON "delivery_proofs"("driver_id");

-- CreateIndex
CREATE INDEX "delivery_proofs_status_idx" ON "delivery_proofs"("status");

-- CreateIndex
CREATE INDEX "delivery_proofs_signed_at_idx" ON "delivery_proofs"("signed_at");

-- CreateIndex
CREATE INDEX "delivery_media_delivery_proof_id_idx" ON "delivery_media"("delivery_proof_id");

-- CreateIndex
CREATE INDEX "delivery_media_trip_id_idx" ON "delivery_media"("trip_id");

-- CreateIndex
CREATE INDEX "delivery_media_media_type_idx" ON "delivery_media"("media_type");

-- CreateIndex
CREATE UNIQUE INDEX "truck_insurance_policy_number_key" ON "truck_insurance"("policy_number");

-- CreateIndex
CREATE INDEX "truck_insurance_truck_id_idx" ON "truck_insurance"("truck_id");

-- CreateIndex
CREATE INDEX "truck_insurance_policy_number_idx" ON "truck_insurance"("policy_number");

-- CreateIndex
CREATE INDEX "truck_insurance_expiry_date_idx" ON "truck_insurance"("expiry_date");

-- CreateIndex
CREATE INDEX "truck_insurance_is_active_idx" ON "truck_insurance"("is_active");

-- CreateIndex
CREATE INDEX "truck_insurance_org_id_idx" ON "truck_insurance"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_claims_claim_number_key" ON "insurance_claims"("claim_number");

-- CreateIndex
CREATE INDEX "insurance_claims_insurance_id_idx" ON "insurance_claims"("insurance_id");

-- CreateIndex
CREATE INDEX "insurance_claims_truck_id_idx" ON "insurance_claims"("truck_id");

-- CreateIndex
CREATE INDEX "insurance_claims_claim_number_idx" ON "insurance_claims"("claim_number");

-- CreateIndex
CREATE INDEX "insurance_claims_claim_status_idx" ON "insurance_claims"("claim_status");

-- CreateIndex
CREATE INDEX "insurance_claims_org_id_idx" ON "insurance_claims"("org_id");

-- CreateIndex
CREATE INDEX "reports_org_id_idx" ON "reports"("org_id");

-- CreateIndex
CREATE INDEX "reports_type_idx" ON "reports"("type");

-- CreateIndex
CREATE INDEX "reports_year_month_idx" ON "reports"("year", "month");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trucks" ADD CONSTRAINT "trucks_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trucks" ADD CONSTRAINT "trucks_current_driver_id_fkey" FOREIGN KEY ("current_driver_id") REFERENCES "driver_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_status" ADD CONSTRAINT "truck_status_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_status" ADD CONSTRAINT "truck_status_last_location_id_fkey" FOREIGN KEY ("last_location_id") REFERENCES "gps_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gps_locations" ADD CONSTRAINT "gps_locations_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_logged_by_fkey" FOREIGN KEY ("logged_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_insurance_claim_id_fkey" FOREIGN KEY ("insurance_claim_id") REFERENCES "insurance_claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_proofs" ADD CONSTRAINT "delivery_proofs_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_proofs" ADD CONSTRAINT "delivery_proofs_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_proofs" ADD CONSTRAINT "delivery_proofs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_media" ADD CONSTRAINT "delivery_media_delivery_proof_id_fkey" FOREIGN KEY ("delivery_proof_id") REFERENCES "delivery_proofs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_media" ADD CONSTRAINT "delivery_media_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_insurance" ADD CONSTRAINT "truck_insurance_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_insurance" ADD CONSTRAINT "truck_insurance_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_insurance" ADD CONSTRAINT "truck_insurance_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_claims" ADD CONSTRAINT "insurance_claims_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_claims" ADD CONSTRAINT "insurance_claims_insurance_id_fkey" FOREIGN KEY ("insurance_id") REFERENCES "truck_insurance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_claims" ADD CONSTRAINT "insurance_claims_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "trucks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_claims" ADD CONSTRAINT "insurance_claims_logged_by_fkey" FOREIGN KEY ("logged_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

