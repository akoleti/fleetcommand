# AGENT_ROSTER.md — FleetCommand Agent Swarm

**Version:** 1.0  
**Last Updated:** February 26, 2026  
**Status:** Sprint 1 Kickoff

---

## 🤖 Orchestrator Agent — ORCH-01

**Name:** ORCH-01  
**Model:** Claude Opus 4.6  
**Status:** Always Running  
**Role:** Scrum Master + Tech Lead + Merge Gatekeeper

### Responsibilities

1. **Read SPEC.md at session start** — Source of truth for all work
2. **Break spec into sprint tasks** — Write to SPRINT_LOG.md
3. **Assign stories to sub-agents** — With correct context
4. **Review every PR** — Check story match, test pass, file ownership
5. **Resolve conflicts** — Between agents or with requirements
6. **Track velocity & blockers** — Update SPRINT_LOG.md + BLOCKERS.md
7. **Make architecture decisions** — When ambiguity exists
8. **Trigger QA-01** — After each feature merge
9. **Approve deployments** — Staging and production

### Tools Available

- Read/write all files in repo
- Create and manage GitHub branches
- Open, review, comment on, merge PRs
- Run shell commands (lint, test, build)
- Spawn and message sub-agents
- Read test results and coverage reports
- Access Neon DB console (schema inspection only)
- Trigger Vercel deployments + GitHub Actions

### Decision Rules

✅ Never merge to main without all tests passing  
✅ Never deploy to prod without staging validation  
✅ Block any agent that modifies files outside ownership  
✅ Escalate ambiguities to user before proceeding  
✅ Write to BLOCKERS.md if agent stuck > 1 attempt  
✅ Update SPRINT_LOG.md after every story completion

---

## 👥 Sub-Agent Roster (9 Specialists)

### 1️⃣ DB-01 — Database Agent

**Model:** Claude Sonnet 4.6  
**Sprint:** 1  
**Branch:** `feature/db-01-schema`

**Owns:**
- `prisma/schema.prisma`
- `prisma/migrations/`
- `prisma/seed.ts`
- `lib/db.ts`

**Stories (Sprint 1):**
- DB-01: Neon setup, connection, Prisma config (3 pts)
- DB-02: Define 13 tables with correct types, indexes, relations (8 pts)
- DB-03: Enable PostGIS extension, geography columns (3 pts)
- DB-04: Seed data — 30 trucks, drivers, sample trips (3 pts)
- DB-05: Migration scripts for dev/staging/prod (2 pts)
- DB-06: DB connection tests + query helper tests (2 pts)

**Total: 6 stories, 21 points**

---

### 2️⃣ AUTH-01 — Authentication Agent

**Model:** Claude Sonnet 4.6  
**Sprint:** 1–2  
**Branch:** `feature/auth-01-jwt`

**Owns:**
- `app/api/auth/`
- `middleware/auth.ts`
- `lib/jwt.ts`
- `lib/rbac.ts`

**Stories (Sprint 1–2):**
- AU-01: POST /api/auth/register (3 pts)
- AU-02: POST /api/auth/login + JWT (3 pts)
- AU-03: POST /api/auth/refresh (2 pts)
- AU-04: Auth middleware (3 pts)
- AU-05: RBAC middleware (3 pts)
- AU-06: Login/register UI (3 pts)
- AU-07: Auth tests (3 pts)

**Total: 7 stories, 20 points**

---

### 3️⃣ GPS-01 — GPS Integration Agent

**Model:** Claude Sonnet 4.6  
**Sprint:** 2–3  
**Branch:** `feature/gps-01-ingestion`

**Owns:**
- `app/api/gps/`
- `lib/gps-ingestion.ts`
- `lib/socket.ts`
- `lib/redis.ts`

**Stories (Sprint 2–3):**
- GP-01: GPS ingestion endpoint (5 pts)
- GP-02: Payload normalization (3 pts)
- GP-03: truck_status update on ping (3 pts)
- GP-04: Redis cache (2 pts)
- GP-05: Socket.io broadcast (5 pts)
- GP-06: GET /api/gps/fleet (2 pts)
- GP-07: GET /api/gps/[truckId]/history (2 pts)
- GP-08: Nearest truck (PostGIS) (3 pts)
- GP-09: GPS tests (3 pts)

**Total: 9 stories, 28 points**

---

### 4️⃣ FLEET-01 — Fleet & Driver Agent

**Model:** Claude Sonnet 4.6  
**Sprint:** 3–4  
**Branch:** `feature/fleet-01-trucks`

**Owns:**
- `app/api/trucks/`
- `app/api/drivers/`
- `app/api/trips/`
- `app/(dashboard)/trucks/`
- `app/(dashboard)/drivers/`
- `app/(dashboard)/trips/`

**Stories (Sprint 3–4):**
- FL-01: Trucks CRUD API (5 pts)
- FL-02: Drivers CRUD API (5 pts)
- FL-03: Assign/unassign driver (2 pts)
- FL-04: Trip scheduling API (5 pts)
- FL-05: Trucks list page (5 pts)
- FL-06: Truck detail page (tabs) (5 pts)
- FL-07: Driver list + profile pages (5 pts)
- FL-08: Fleet + driver tests (3 pts)

**Total: 8 stories, 35 points**

---

### 5️⃣ ALERT-01 — Alert Engine Agent

**Model:** Claude Sonnet 4.6  
**Sprint:** 4–5  
**Branch:** `feature/alert-01-engine`

**Owns:**
- `lib/alert-engine.ts`
- `app/api/alerts/`
- `app/api/cron/`
- `lib/cron.ts`
- `lib/fcm.ts`
- `lib/twilio.ts`
- `lib/sendgrid.ts`

**Stories (Sprint 4–5):**
- AL-01: Idle detection cron (5 pts)
- AL-02: All 12 alert rules (8 pts)
- AL-03: FCM push notifications (3 pts)
- AL-04: SendGrid email (2 pts)
- AL-05: Twilio SMS (2 pts)
- AL-06: Alerts list page (3 pts)
- AL-07: Alert tests (5 pts)

**Total: 7 stories, 28 points**

---

### 6️⃣ MAINT-01 — Maintenance & Insurance Agent

**Model:** Claude Sonnet 4.6  
**Sprint:** 5  
**Branch:** `feature/maint-01-maintenance`

**Owns:**
- `app/api/maintenance/`
- `app/api/insurance/`
- `app/(dashboard)/maintenance/`
- `app/(dashboard)/insurance/`

**Stories (Sprint 5):**
- MA-01: Maintenance API (5 pts)
- MA-02: Maintenance list page (3 pts)
- MA-03: Insurance policies API (5 pts)
- MA-04: Insurance claims API (5 pts)
- MA-05: Maintenance-insurance link (3 pts)
- MA-06: Insurance module pages (5 pts)
- MA-07: Maintenance tests (3 pts)

**Total: 7 stories, 29 points**

---

### 7️⃣ FUEL-01 — Fuel & Reports Agent

**Model:** Claude Sonnet 4.6  
**Sprint:** 6  
**Branch:** `feature/fuel-01-fuel`

**Owns:**
- `app/api/fuel/`
- `app/api/reports/`
- `app/(dashboard)/fuel/`
- `app/(dashboard)/reports/`
- `lib/pdf.ts`

**Stories (Sprint 6):**
- FU-01: Fuel log API (3 pts)
- FU-02: Fuel history API (2 pts)
- FU-03: Fuel overview page (5 pts)
- FU-04: Reports page (5 pts)
- FU-05: PDF generation (5 pts)
- FU-06: S3 report storage (3 pts)
- FU-07: Fuel tests (2 pts)

**Total: 7 stories, 25 points**

---

### 8️⃣ DELIVERY-01 — Delivery Proof Agent

**Model:** Claude Sonnet 4.6  
**Sprint:** 7–8  
**Branch:** `feature/delivery-01-proof`

**Owns:**
- `app/api/delivery-proof/`
- `app/api/upload/`
- `lib/s3.ts`
- `mobile/screens/DeliveryProof/`

**Stories (Sprint 7–8):**
- DP-01: S3 infrastructure (presign endpoints) (3 pts) ⭐ CRITICAL — others depend
- DP-02: Delivery proof API (3 pts)
- DP-03: Delivery media API (3 pts)
- DP-04: Mobile signature screen (5 pts)
- DP-05: Mobile photo screen (5 pts)
- DP-06: Offline queue (5 pts)
- DP-07: Proof viewer (web) (3 pts)
- DP-08: Upload tests (3 pts)

**Total: 8 stories, 30 points**

---

### 9️⃣ QA-01 — QA & Testing Agent

**Model:** Claude Sonnet 4.6  
**Sprint:** Continuous (after every sprint) + Sprint 9  
**Branch:** `feature/qa-01-tests`

**Owns:**
- `tests/e2e/`
- `tests/integration/`
- `playwright.config.ts`
- `jest.config.ts`

**Stories (Sprint 9):**
- QA-01: E2E login + dashboard (3 pts)
- QA-02: E2E trip → delivery proof (5 pts)
- QA-03: E2E idle alert (3 pts)
- QA-04: Integration GPS → status → socket (5 pts)
- QA-05: Integration insurance → alert → block (3 pts)
- QA-06: RBAC security audit (3 pts)
- QA-07: Coverage ≥ 80% (2 pts)
- QA-08: Performance test (30 trucks) (3 pts)

**Total: 8 stories, 27 points**

---

## 📊 Summary

| Agent | Stories | Points | Sprint(s) |
|-------|---------|--------|-----------|
| DB-01 | 6 | 21 | 1 |
| AUTH-01 | 7 | 20 | 1–2 |
| GPS-01 | 9 | 28 | 2–3 |
| FLEET-01 | 8 | 35 | 3–4 |
| ALERT-01 | 7 | 28 | 4–5 |
| MAINT-01 | 7 | 29 | 5 |
| FUEL-01 | 7 | 25 | 6 |
| DELIVERY-01 | 8 | 30 | 7–8 |
| QA-01 | 8 | 27 | 9 + continuous |
| **TOTAL** | **67** | **243** | **9 sprints** |

---

## 🔗 File Ownership Map

```
prisma/
  ├── schema.prisma        → DB-01
  ├── migrations/          → DB-01
  └── seed.ts              → DB-01

lib/
  ├── db.ts                → DB-01
  ├── jwt.ts               → AUTH-01
  ├── rbac.ts              → AUTH-01
  ├── gps-ingestion.ts     → GPS-01
  ├── socket.ts            → GPS-01
  ├── redis.ts             → GPS-01
  ├── alert-engine.ts      → ALERT-01
  ├── cron.ts              → ALERT-01
  ├── fcm.ts               → ALERT-01
  ├── twilio.ts            → ALERT-01
  ├── sendgrid.ts          → ALERT-01
  ├── s3.ts                → DELIVERY-01 (shared)
  └── pdf.ts               → FUEL-01

app/api/
  ├── auth/                → AUTH-01
  ├── gps/                 → GPS-01
  ├── trucks/              → FLEET-01
  ├── drivers/             → FLEET-01
  ├── trips/               → FLEET-01
  ├── alerts/              → ALERT-01
  ├── cron/                → ALERT-01
  ├── maintenance/         → MAINT-01
  ├── insurance/           → MAINT-01
  ├── fuel/                → FUEL-01
  ├── reports/             → FUEL-01
  ├── delivery-proof/      → DELIVERY-01
  └── upload/              → DELIVERY-01

app/(dashboard)/
  ├── trucks/              → FLEET-01
  ├── drivers/             → FLEET-01
  ├── trips/               → FLEET-01
  ├── maintenance/         → MAINT-01
  ├── insurance/           → MAINT-01
  ├── fuel/                → FUEL-01
  ├── reports/             → FUEL-01
  └── delivery-proof/      → DELIVERY-01

mobile/screens/DeliveryProof/ → DELIVERY-01

tests/
  ├── e2e/                 → QA-01
  ├── integration/         → QA-01
  ├── unit/                → Each agent (in their domain)
  ├── playwright.config.ts → QA-01
  └── jest.config.ts       → QA-01

middleware/
  └── auth.ts              → AUTH-01
```

---

## ✅ Parallel Work Rules

- **Sprint 1:** DB-01 ∥ AUTH-01 (no dependencies)
- **Sprint 2–3:** GPS-01 ∥ FLEET-01 (GPS-01 delivers location API first)
- **Sprint 4–5:** ALERT-01 ∥ MAINT-01 (independent)
- **Sprint 6:** FUEL-01 ∥ (DELIVERY-01 starts Sprint 7)
- **Sprint 7–8:** FUEL-01 ∥ DELIVERY-01 (DELIVERY-01 handles S3 infra first)
- **Sprint 9:** QA-01 full test suite + E2E

---

## 🎯 Critical Dependencies

**DP-01 (S3 Infrastructure) MUST ship first in Sprint 7:**
- MAINT-01 depends on `/api/upload/presign` for insurance PDFs (Sprint 5)
- FUEL-01 depends on `/api/upload/presign` for report PDFs (Sprint 6)
- DELIVERY-01 uses `/api/upload/presign` for signatures/photos (Sprint 7)

**Solution:** DELIVERY-01 ships DP-01 first (day 1 of Sprint 7), then other agents can use it.

---

## 📋 Communication Protocol

All agents communicate via shared files:

| File | Written By | Read By | Purpose |
|------|-----------|---------|---------|
| SPEC.md | User / ORCH-01 | All agents | Source of truth |
| SPRINT_LOG.md | ORCH-01 | All agents | Current sprint tasks + status |
| BLOCKERS.md | ORCH-01, QA-01 | All agents | Blocked stories + resolution |
| ARCHITECTURE.md | ORCH-01 | All agents | Architecture decisions |
| QA_REPORT_SPRINT_{n}.md | QA-01 | ORCH-01 | Test results per sprint |

---

## 🚀 Status

**Current Sprint:** Sprint 1 (Weeks 1–2)  
**Active Agents:** DB-01, AUTH-01 (parallel)  
**Estimated Completion:** 18 weeks (9 sprints × 2 weeks)  
**Last Updated:** February 26, 2026

---

*AGENT_ROSTER.md — Authoritative registry for all FleetCommand agents and story assignments*
