# FleetCommand — Full Project Specification

**Version:** 2.0  
**Last Updated:** February 25, 2026  
**Stack:** Next.js 14 · TypeScript · Prisma · Neon PostgreSQL · Vercel

> This is the **source of truth** for all agents. Read this file before starting any work.

See the detailed specification document for:

1. **Project Overview** — Fleet size, user roles, core problems solved
2. **Platforms & Visual Style** — Web dashboard, mobile apps, design system
3. **Tech Stack** — Complete technology choices and reasoning
4. **User Roles & Permissions** — RBAC matrix (Owner, Manager, Driver)
5. **Core Modules** (10 modules):
   - Dashboard
   - Live Map
   - Trucks
   - Drivers
   - Maintenance
   - Fuel
   - Insurance
   - Reports
   - Alerts
   - Nearest Truck Finder

6. **GPS Tracker Hardware Integration** — Hardware-agnostic ingestion (webhook/4G/MQTT)
7. **Database Schema** — All 13 tables with fields and relationships
8. **System Architecture** — Data flow diagram, layer overview
9. **Real-Time & Alert Engine** — 12 alert types, notification channels
10. **Delivery Proof System** — Signature capture, photos, offline sync
11. **Insurance Module** — Policy tracking, claims, expiry alerts
12. **File Storage (AWS S3)** — Bucket structure, access security
13. **Security** — Auth, API security, data protection, RBAC enforcement
14. **Build Order** — 9-phase development sequence

---

## Quick Reference

### 30 Trucks, 12 Alert Types, 13 Database Tables, 67 User Stories

### GPS Ingestion
- **Frequency:** 1 ping / 30 seconds per truck
- **Throughput:** ~1 request/sec sustained
- **Payload:** `{ truckId, lat, lng, speed, heading, fuelLevel, ignitionOn, timestamp }`
- **Storage:** Neon + TimescaleDB (gps_locations hypertable)
- **Cache:** Redis (latest position per truck, TTL 120s)

### Idle Detection
- **Rule:** Truck stationary > 4 hours
- **Trigger:** Vercel Cron Job every 5 minutes
- **Action:** Create critical alert → FCM push → SMS to owner/manager

### Insurance Expiry
- **Warning:** 30 days before expiry (email)
- **Critical:** 7 days before (SMS + push)
- **Action:** On expiry → set `trucks.status = 'blocked'` (prevents trip assignment)

---

## Agents

| Agent | Role | Sprint(s) | Stories | Points |
|-------|------|-----------|---------|--------|
| ORCH-01 | Orchestrator | All | — | — |
| DB-01 | Database | 1 | 6 | 21 |
| AUTH-01 | Authentication | 1–2 | 7 | 20 |
| GPS-01 | GPS Integration | 2–3 | 9 | 28 |
| FLEET-01 | Fleet & Drivers | 3–4 | 8 | 35 |
| ALERT-01 | Alert Engine | 4–5 | 7 | 28 |
| MAINT-01 | Maintenance & Insurance | 5 | 7 | 29 |
| FUEL-01 | Fuel & Reports | 6 | 7 | 25 |
| DELIVERY-01 | Delivery Proof | 7–8 | 8 | 30 |
| QA-01 | Testing & QA | 9 | 8 | 27 |

---

## Key Files in This Repository

- **SPEC.md** ← You are here (source of truth)
- **SPRINT_LOG.md** — Current sprint progress
- **BLOCKERS.md** — Blocked stories and issues
- **AGENT_ROSTER.md** — Agent definitions and system prompts
- **prisma/schema.prisma** — Database schema (DB-01 owns)
- **app/api/*** — API routes (various agents own)
- **app/(dashboard)/** — UI pages (various agents own)
- **tests/e2e/** — E2E tests (QA-01 owns)
- **lib/*** — Shared utilities (agent-specific ownership)

---

## Rules (Golden)

✅ **No agent touches another agent's files**  
✅ **Read SPEC.md before starting any story**  
✅ **Never merge to main without QA-01 approval**  
✅ **Never deploy to prod without staging validation**  
✅ **Write tests for all new code**  
✅ **ORCH-01 reviews every PR**  
✅ **If stuck > 1 attempt, ORCH-01 writes to BLOCKERS.md**

---

## Full Specification

The complete specification (14 sections, 100+ KB) is maintained in a detailed document separate from this repo. Reference it for:

- Exact database table definitions
- All 12 alert rules with severity levels
- User permission matrix (RBAC)
- File storage bucket structure
- Security requirements
- API endpoint specifications

**Get full spec from ORCH-01 or the project wiki.**

---

**Source of truth. Last updated by ORCH-01.**
