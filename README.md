# FleetCommand

A real-time fleet management platform for trucking companies. Built by a 10-agent AI swarm using Next.js 14, Neon PostgreSQL, and Socket.io.

## Stack

- **Frontend:** Next.js 14 (App Router) · React · TypeScript · Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Neon PostgreSQL + PostGIS
- **Cache:** Redis (Upstash)
- **Real-time:** Socket.io
- **Maps:** Google Maps API
- **Notifications:** Firebase FCM · Twilio SMS · SendGrid Email
- **Files:** AWS S3
- **Deployment:** Vercel
- **CI/CD:** GitHub Actions

## Development

### Prerequisites

- Node.js 18+
- Git
- `SPEC.md` (source of truth)

### Setup

```bash
npm install
cp .env.example .env.local
# Fill in environment variables
npm run dev
```

### Agents

This project is built by 10 Claude agents:

1. **ORCH-01** — Orchestrator (Scrum Master + Tech Lead)
2. **DB-01** — Database (Schema · Migrations)
3. **AUTH-01** — Authentication (JWT · RBAC)
4. **GPS-01** — GPS Integration (Tracking · Real-time)
5. **FLEET-01** — Fleet & Drivers (Trucks · Drivers · Trips)
6. **ALERT-01** — Alert Engine (Rules · Cron · Notifications)
7. **MAINT-01** — Maintenance & Insurance
8. **FUEL-01** — Fuel & Reports
9. **DELIVERY-01** — Delivery Proof (Signatures · Photos)
10. **QA-01** — Testing & QA

### Key Files

- **SPEC.md** — Project specification (source of truth)
- **SPRINT_LOG.md** — Current sprint status
- **BLOCKERS.md** — Blocked stories and issues
- **AGENT_ROSTER.md** — Agent definitions and system prompts

### Branches

- `main` — Production (protected)
- `staging` — Pre-production testing
- `feature/db-01-*` — Database agent features
- `feature/auth-01-*` — Auth agent features
- etc.

### API Routes

- `POST /api/auth/register` — Register user
- `POST /api/auth/login` — Login
- `POST /api/gps/ping` — GPS tracker ingestion
- `GET /api/trucks` — List trucks
- `POST /api/trips` — Create trip
- See `SPEC.md` Section 5 for full API reference

## Deployment

### Vercel

```bash
vercel deploy --prod
```

### Database Migrations

```bash
prisma migrate deploy
```

## License

MIT
