# SYSTEM_ARCHITECTURE.md — FleetCommand Technical Architecture

**Version:** 1.0  
**Last Updated:** February 26, 2026  
**Author:** ORCH-01

---

## Overview

FleetCommand is a real-time fleet management platform built on Next.js 14 with a focus on:
- Real-time GPS tracking (30 trucks, 1 ping/30 sec)
- Multi-tenant architecture with RBAC
- Event-driven alert system
- Offline-capable delivery proof capture

---

## System Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  Web Dashboard (Next.js 14)  │  Mobile (React Native Expo)      │
│  - Owner/Manager views       │  - Driver app                    │
│  - Real-time map             │  - Delivery proof                │
│  - Reports & analytics       │  - Offline queue                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│  Next.js API Routes (/app/api/*)                                 │
│  ├── /auth/*        → JWT auth, RBAC                            │
│  ├── /gps/*         → GPS ingestion, fleet positions            │
│  ├── /trucks/*      → Fleet CRUD                                │
│  ├── /drivers/*     → Driver CRUD                               │
│  ├── /trips/*       → Trip scheduling                           │
│  ├── /alerts/*      → Alert management                          │
│  ├── /maintenance/* → Service records                           │
│  ├── /insurance/*   → Policies & claims                         │
│  ├── /fuel/*        → Fuel logs                                 │
│  ├── /reports/*     → PDF generation                            │
│  ├── /delivery-proof/* → Proof submission                       │
│  └── /cron/*        → Scheduled jobs (idle, expiry)             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     REALTIME LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  Socket.io Server                                                │
│  ├── room: truck:{truckId}   → Individual truck updates         │
│  ├── room: fleet             → All truck positions              │
│  ├── room: alerts:{userId}   → User-specific alerts             │
│  └── room: org:{orgId}       → Organization broadcasts          │
│                                                                  │
│  Redis (Upstash)                                                 │
│  ├── cache: truck:latest:{id} → Latest position (TTL 120s)      │
│  ├── cache: fleet:positions   → All positions (TTL 60s)         │
│  └── pubsub: gps-updates      → Cross-instance sync             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATA LAYER                                   │
├─────────────────────────────────────────────────────────────────┤
│  Neon PostgreSQL + PostGIS                                       │
│  ├── Users, Organizations (multi-tenant)                         │
│  ├── Trucks, Drivers, TruckStatus                                │
│  ├── Trips, GPS Locations (TimescaleDB hypertable)               │
│  ├── Alerts, Maintenance, FuelLogs                               │
│  ├── InsurancePolicies, InsuranceClaims                          │
│  └── DeliveryProofs, DeliveryMedia                               │
│                                                                  │
│  ORM: Prisma 5.8                                                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
├─────────────────────────────────────────────────────────────────┤
│  AWS S3           │ Firebase FCM    │ Twilio        │ SendGrid  │
│  - Delivery media │ - Push notifs   │ - SMS alerts  │ - Email   │
│  - Insurance docs │ - Mobile alerts │ - Critical    │ - Reports │
│  - PDF reports    │                 │               │           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: GPS Ping

```
GPS Tracker → POST /api/gps/ingest
                    │
                    ├─→ Validate payload + webhook secret
                    │
                    ├─→ Normalize vendor-specific format
                    │
                    ├─→ INSERT gps_locations (time-series)
                    │
                    ├─→ UPSERT truck_status (latest position)
                    │
                    ├─→ SET Redis cache (TTL 120s)
                    │
                    ├─→ PUBLISH Redis pubsub
                    │
                    └─→ Socket.io broadcast to fleet room
```

---

## Data Flow: Alert Generation

```
Vercel Cron (every 5 min) → /api/cron/idle-check
                                    │
                                    ├─→ Query trucks idle > 4 hours
                                    │
                                    ├─→ For each idle truck:
                                    │   ├─→ INSERT alert (severity: critical)
                                    │   ├─→ FCM push to owner/manager
                                    │   ├─→ SMS via Twilio (critical only)
                                    │   └─→ Email via SendGrid
                                    │
                                    └─→ Socket.io: room alerts:{userId}
```

---

## Database Schema Summary

| Table | Purpose | Key Fields |
|-------|---------|------------|
| organizations | Multi-tenant root | id, name, settings |
| users | Auth + profile | id, email, role, orgId |
| trucks | Fleet vehicles | id, vin, status, currentDriverId |
| drivers | Driver profiles | id, licenseNo, status, truckId |
| truck_status | Latest position | truckId, lat, lng, speed, updatedAt |
| gps_locations | Time-series | truckId, lat, lng, timestamp (hypertable) |
| trips | Scheduled routes | id, truckId, driverId, origin, destination |
| alerts | Notifications | id, truckId, type, severity, acknowledged |
| maintenance | Service records | id, truckId, type, cost, nextDueDate |
| fuel_logs | Fuel purchases | id, truckId, gallons, cost, odometer |
| insurance_policies | Coverage | id, truckId, provider, expiryDate |
| insurance_claims | Claims | id, policyId, amount, status |
| delivery_proofs | Proof of delivery | id, tripId, signature, timestamp |
| delivery_media | Photos/docs | id, proofId, s3Key, type |

---

## Security Model

### Authentication
- JWT access tokens (15 min expiry)
- Refresh tokens (7 day expiry, httpOnly cookie)
- bcrypt password hashing (cost 12)

### Authorization (RBAC)
| Role | Scope | Permissions |
|------|-------|-------------|
| OWNER | Full org | All CRUD, billing, settings |
| MANAGER | Assigned trucks | Read/write fleet, trips, alerts |
| DRIVER | Own data | Read own trips, submit delivery proof |

### API Security
- Rate limiting: 100 req/min per user
- GPS webhook: HMAC signature verification
- File uploads: presigned S3 URLs (5 min expiry)
- All inputs validated with Zod schemas

---

## Deployment

| Environment | Branch | URL | Auto-deploy |
|-------------|--------|-----|-------------|
| Development | feature/* | localhost:3000 | — |
| Staging | staging | staging.fleetcommand.app | ✓ on push |
| Production | main | app.fleetcommand.app | ✓ on merge |

### CI/CD Pipeline
1. Push to feature branch
2. GitHub Actions: lint + type-check + test
3. PR to staging → ORCH-01 review
4. Merge to staging → Auto-deploy to staging
5. QA-01 validation on staging
6. PR staging → main → ORCH-01 approval
7. Merge to main → Production deploy

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| GPS ingestion | < 100ms p95 | Vercel function logs |
| Map load (30 trucks) | < 2s | Lighthouse |
| Alert delivery | < 30s | Push receipt timestamp |
| API response | < 500ms p95 | Vercel analytics |
| Uptime | 99.9% | Vercel status |

---

## Agent File Ownership

See AGENT_ROSTER.md for complete file ownership map. Key principle: **No agent touches another agent's files.**

---

*SYSTEM_ARCHITECTURE.md — Technical reference for all FleetCommand agents*
