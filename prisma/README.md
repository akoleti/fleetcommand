# FleetCommand Database Documentation

**Author:** DB-01 (Database Agent)  
**Sprint:** 1  
**Date:** February 26, 2026  
**Status:** ✅ Complete

## Overview

This directory contains the complete Prisma database schema, migrations, and seed data for FleetCommand - a real-time fleet management platform.

## Database Stack

- **Database:** Neon PostgreSQL (Serverless)
- **ORM:** Prisma 5.8.0
- **Extensions:** PostGIS (spatial queries)
- **Connection:** Pooled connection via Neon

## Schema Summary

The database consists of **14 tables** with full RBAC, spatial indexing, and multi-tenant support:

### Core Tables
1. **organizations** — Multi-tenant root entity
2. **users** — Authentication and user profiles (Owner, Manager, Driver)
3. **trucks** — Fleet vehicles (30 trucks: TRK-001 to TRK-030)
4. **truck_status** — Real-time truck status and movement tracking
5. **gps_locations** — Time-series GPS pings with PostGIS support
6. **driver_profiles** — Driver details, licenses, and ratings

### Operations Tables
7. **trips** — Trip scheduling and tracking
8. **maintenance_logs** — Service history and scheduled maintenance
9. **fuel_logs** — Fuel purchases and consumption tracking
10. **alerts** — System alerts (idle, fuel, insurance, maintenance, etc.)

### Compliance Tables
11. **truck_insurance** — Insurance policies with expiry tracking
12. **insurance_claims** — Claims management
13. **delivery_proofs** — Proof of delivery with signatures
14. **delivery_media** — Photos/documents for deliveries

### Reporting
15. **reports** — Generated PDF reports storage

## Key Features

### 🗺️ Spatial Indexing (PostGIS)
- GPS coordinates stored as `GEOGRAPHY(Point, 4326)`
- Spatial indexes on all coordinate columns
- ST_Distance and ST_DWithin queries for proximity search
- Supports "Nearest Truck Finder" feature

### 🔐 Security
- UUID primary keys across all tables
- Foreign key constraints with CASCADE delete
- RBAC enforcement at schema level
- Multi-tenant isolation via `orgId`

### 📊 Performance Optimizations
- Indexes on all frequently queried fields
- Time-series optimization for GPS data (consider TimescaleDB extension)
- Composite indexes for multi-column queries
- DESC index on `gps_locations.recordedAt` for latest position queries

### 🔄 Real-Time Support
- Trigger-ready schema for change data capture
- Optimized for 1 ping/30 sec per truck (sustained ~1 req/sec)
- Redis caching strategy compatible

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Ensure `.env` or `.env.local` contains:

```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

### 3. Generate Prisma Client

```bash
npm run prisma:generate
```

### 4. Run Migrations

For development:
```bash
npm run prisma:migrate
```

For production:
```bash
npx prisma migrate deploy
```

### 5. Seed Database

```bash
npm run prisma:seed
```

This will create:
- 1 organization (FleetCommand Demo Corp)
- 2 admin users (owner, manager)
- 30 drivers (driver1-driver30@fleetcommand.demo)
- 30 trucks (TRK-001 to TRK-030)
- 100 sample trips
- 330 GPS location pings
- 20 maintenance logs
- 30 fuel logs
- 10 alerts
- 5 insurance policies

### 6. Verify Setup

```bash
npm test -- tests/unit/db.test.ts
```

All 28 tests should pass.

## Test Credentials

After seeding, use these credentials:

| Role | Email | Password |
|------|-------|----------|
| Owner | owner@fleetcommand.demo | owner123 |
| Manager | manager@fleetcommand.demo | manager123 |
| Driver (sample) | driver1@fleetcommand.demo | driver123 |

## Migration Strategy

### Development Workflow
1. Modify `schema.prisma`
2. Run `npx prisma migrate dev --name <description>`
3. Prisma generates migration SQL and applies it
4. Commit both `schema.prisma` and `migrations/` directory

### Staging/Production Deployment
1. Merge PR to `staging` or `main`
2. CI/CD runs `npx prisma migrate deploy`
3. No interactive prompts - fully automated

### Rolling Back
- Never delete migration files
- Create a new migration to undo changes
- For dev, you can reset with `npx prisma migrate reset` (⚠️ deletes all data)

## Schema Conventions

### Naming
- Tables: snake_case (e.g., `truck_status`)
- Columns in DB: snake_case (via `@map`)
- Prisma models: PascalCase
- Prisma fields: camelCase
- Enums: UPPER_SNAKE_CASE

### Primary Keys
- All tables use UUID: `@default(uuid())`
- Indexed by default

### Timestamps
- All use `@db.Timestamp(6)` for UTC timestamps
- `createdAt: DateTime @default(now())`
- `updatedAt: DateTime @updatedAt`

### Foreign Keys
- Use `onDelete: Cascade` for dependent data
- Nullable FKs for optional relationships

### Indexes
- Added on all foreign keys
- Added on frequently queried fields
- Spatial indexes (GIST) on all PostGIS columns

## Utility Functions

The `lib/db.ts` file provides:

### Client Singleton
```typescript
import { db } from '@/lib/db';
```

### Coordinate Helpers
```typescript
coordsToGeography(lat: number, lng: number): string
geographyToCoords(geography: string): { lat, lng }
calculateDistance(lat1, lng1, lat2, lng2): number
```

### Common Queries
```typescript
getActiveTrucks(orgId: string)
getLatestTruckLocation(truckId: string)
getUnresolvedAlerts(orgId: string)
getMaintenanceDue(orgId: string, daysAhead: number)
getExpiringInsurance(orgId: string, daysAhead: number)
```

## Troubleshooting

### "Environment variable not found: DATABASE_URL"
- Ensure `.env` file exists in project root
- Prisma doesn't read `.env.local` - copy it to `.env`

### "Extension postgis not found"
- PostGIS must be enabled on your PostgreSQL server
- Neon: PostGIS is pre-installed, no action needed
- Self-hosted: `CREATE EXTENSION IF NOT EXISTS postgis;`

### Migration conflicts
- Resolve with `npx prisma migrate resolve --applied <migration_name>`
- Or reset dev DB: `npx prisma migrate reset` (⚠️ data loss)

### Seed fails with foreign key errors
- Ensure migrations ran successfully first
- Check data constraints (unique fields, etc.)
- Verify database is empty before seeding

## Performance Notes

### GPS Data Growth
With 30 trucks pinging every 30 seconds:
- ~2,592,000 records/month
- ~31 million records/year

Consider:
- Partitioning `gps_locations` by month (PostgreSQL 10+)
- Archiving old data to cold storage (S3 + Parquet)
- TimescaleDB hypertables for automatic partitioning

### Query Optimization
- Use `select: { ... }` to limit returned fields
- Use `take` and `skip` for pagination
- Batch inserts for GPS data (use `createMany`)
- Consider read replicas for analytics queries

## Related Files

- **prisma/schema.prisma** — Full schema definition
- **prisma/seed.ts** — Seed script with test data
- **prisma/migrations/** — Version-controlled migrations
- **lib/db.ts** — Prisma client singleton + utilities
- **tests/unit/db.test.ts** — Database tests (28 tests)

## Sprint 1 Completion Checklist

- [x] DB-01: Neon setup & Prisma config (3 pts)
- [x] DB-02: Define all 14 tables (8 pts)
- [x] DB-03: PostGIS extension (3 pts)
- [x] DB-04: Seed data (3 pts)
- [x] DB-05: Migration scripts (2 pts)
- [x] DB-06: Database tests (2 pts)

**Total: 21 story points ✅**

## Next Steps

- GPS-01 will build the GPS ingestion API (`/api/gps/ingest`)
- AUTH-01 will implement authentication against `users` table
- FLEET-01 will create CRUD operations for trucks/drivers
- ALERT-01 will build the alert engine using `alerts` table

---

**Questions?** Contact DB-01 or ORCH-01  
**Schema Changes?** Always create a PR with migration files
