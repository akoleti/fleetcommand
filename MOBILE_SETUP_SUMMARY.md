# React Native Mobile App — Setup Summary

**Branch**: `feature/react-native-mobile`  
**Status**: ✅ Scaffold complete, ready for implementation  
**Timeline**: 9 weeks (3 sprints × 2 weeks each)  
**Owner**: MOBILE-01 agent (when assigned)

---

## What's Been Created

### 1. Comprehensive Plan Document
**File**: `REACT_NATIVE_CONVERSION_PLAN.md` (970 lines)

Complete roadmap including:
- ✅ Architecture & monorepo structure
- ✅ Technology decisions (Expo, Socket.io, NativeWind, Zustand, SQLite)
- ✅ 3-phase development plan with deliverables
- ✅ Detailed 6-week sprint breakdown
- ✅ Risk mitigation strategies
- ✅ Success metrics for each phase

### 2. Monorepo Structure
**File**: `turbo.json`

Turborepo configuration for parallel web + mobile development:
- Shared dependencies across `apps/` and `packages/`
- Optimized build caching
- Convenient npm scripts for selective builds

### 3. Shared Package
**Directory**: `packages/shared/`

Code reused by web (Next.js) and mobile (React Native):

#### Types (`src/types/index.ts`)
- ✅ User, Truck, Trip, Driver, Alert, DeliveryProof (all 14 Prisma tables)
- ✅ Request/response DTOs
- ✅ Socket.io event types
- ✅ Form DTOs (LoginDto, CreateTripDto, etc.)

#### API Client (`src/api-client/index.ts`)
- ✅ Axios instance with token refresh logic
- ✅ 20+ API endpoints (auth, trucks, drivers, trips, alerts, delivery, etc.)
- ✅ Error handling and automatic token refresh
- ✅ Works for both web and mobile

#### Constants (`src/constants/index.ts`)
- ✅ 12 alert types with labels and colors
- ✅ Truck/trip/driver statuses with colors
- ✅ Maintenance types, insurance coverage types
- ✅ Timeouts, thresholds, file upload limits
- ✅ Socket.io event names

### 4. React Native Mobile App
**Directory**: `apps/mobile/`

Expo-based React Native project ready for iOS + Android:

#### Configuration
- ✅ `app.json` — Expo config with iOS/Android setup
- ✅ `package.json` — All dependencies (Expo Router, Maps, Camera, Notifications, etc.)
- ✅ Project scaffold ready for implementation

#### Documentation
- ✅ `README.md` — 350-line development guide
  - Quick start instructions
  - Project structure overview
  - Key screens (auth, dashboard, trucks, drivers, alerts, delivery)
  - Feature overview
  - Testing & deployment
  - Troubleshooting

---

## Project Structure

```
fleetcommand/
├── REACT_NATIVE_CONVERSION_PLAN.md  # 970-line detailed plan
├── MOBILE_SETUP_SUMMARY.md          # This file
├── turbo.json                       # Monorepo config
│
├── apps/
│   ├── web/                         # Next.js (existing)
│   │   ├── app/
│   │   ├── lib/
│   │   └── package.json
│   │
│   └── mobile/                      # React Native (NEW)
│       ├── app/                     # Screens (to be implemented)
│       ├── components/              # UI components (to be implemented)
│       ├── hooks/                   # Custom hooks (to be implemented)
│       ├── lib/                     # Utilities (to be implemented)
│       ├── assets/                  # Images, fonts (to be implemented)
│       ├── app.json                 # Expo config ✅
│       ├── package.json             # Dependencies ✅
│       └── README.md                # Development guide ✅
│
└── packages/
    └── shared/                      # Shared code (NEW)
        ├── src/
        │   ├── types/               # TypeScript types ✅
        │   ├── api-client/          # Axios client ✅
        │   ├── constants/           # Constants ✅
        │   └── utils/               # (stub)
        ├── package.json             # Shared package config ✅
        └── tsconfig.json            # TS config ✅
```

---

## Tech Stack Summary

| Layer | Web (Next.js) | Mobile (React Native) | Shared |
|-------|---------------|----------------------|--------|
| **Framework** | Next.js 14 | Expo Router | — |
| **UI** | React + Tailwind | React Native + NativeWind | — |
| **Navigation** | App Router | Expo Router (file-based) | — |
| **State** | Zustand | Zustand | ✅ Same |
| **HTTP** | Axios | Axios | ✅ `@fleetcommand/shared` |
| **Real-time** | Socket.io | Socket.io client | ✅ Same |
| **Database** | Prisma + Neon | SQLite (local) | Schema shared |
| **Auth** | JWT + cookies | JWT + AsyncStorage | ✅ JWT utilities |
| **Types** | TypeScript | TypeScript | ✅ `@fleetcommand/shared` |

---

## Development Phases

### Phase 1: Foundation (Sprint 1 — Weeks 1-2)

**Deliverables:**
- [ ] Expo project init with Expo Router
- [ ] Monorepo setup (turbo, workspaces)
- [ ] Auth system (login/register/logout)
- [ ] Tab navigation (Dashboard, Trucks, Drivers, Alerts, Delivery)
- [ ] Basic type safety with shared types

**Files to Create:**
```
apps/mobile/
├── app/(auth)/login.tsx
├── app/(auth)/register.tsx
├── app/(dashboard)/_layout.tsx       # Tab nav
├── app/(dashboard)/index.tsx
├── app/_layout.tsx
├── lib/auth.ts
├── lib/api.ts
└── hooks/useAuth.ts
```

### Phase 2: Core Modules (Sprint 2 — Weeks 3-4)

**Deliverables:**
- [ ] Dashboard with live map (30 trucks, <1s latency)
- [ ] Trucks list/detail (6 tabs)
- [ ] Drivers list/profile
- [ ] Trips list and management
- [ ] Real-time GPS updates via Socket.io
- [ ] Offline caching (SQLite + AsyncStorage)

**Files to Create:**
```
apps/mobile/
├── app/(dashboard)/trucks/
├── app/(dashboard)/drivers/
├── app/(dashboard)/trips/
├── components/Map/MapView.tsx
├── components/Card/*.tsx
├── components/List/*.tsx
├── hooks/useTrucks.ts
├── hooks/useDrivers.ts
├── lib/socket.ts
├── lib/db.ts
└── ...
```

### Phase 3: Features & Polish (Sprint 3 — Weeks 5-6)

**Deliverables:**
- [ ] Alerts module with severity routing
- [ ] Maintenance logs / insurance policies
- [ ] Fuel logs with cost analysis
- [ ] Delivery proof capture (camera + signature)
- [ ] Push notifications (FCM)
- [ ] Offline queue sync
- [ ] Accessibility (VoiceOver, TalkBack)

**Files to Create:**
```
apps/mobile/
├── app/(dashboard)/alerts/
├── app/(dashboard)/maintenance/
├── app/(dashboard)/fuel/
├── app/(dashboard)/delivery/
├── components/Camera/PhotoCapture.tsx
├── components/Canvas/SignaturePad.tsx
├── lib/notifications.ts
├── lib/location.ts
└── ...
```

---

## Dependencies Included

### apps/mobile/package.json
```json
{
  "expo": "^50.0.0",
  "expo-router": "^2.4.0",
  "expo-camera": "^14.0.0",
  "expo-notifications": "^0.20.0",
  "react-native": "^0.73.0",
  "react-native-maps": "^1.7.0",
  "react-native-sketch-canvas": "^0.8.0",
  "axios": "^1.6.0",
  "socket.io-client": "^4.7.0",
  "zustand": "^4.4.0",
  "nativewind": "^2.0.0",
  "@react-native-async-storage/async-storage": "^1.21.0",
  "@fleetcommand/shared": "*"
}
```

---

## Key Decisions

### 1. Use Expo (vs. React Native CLI)
**Why:**
- ✅ Faster iteration (no native builds needed)
- ✅ Over-the-air updates
- ✅ Pre-configured with best practices
- ✅ Easy iOS and Android support

### 2. Monorepo Structure
**Why:**
- ✅ Share types and API client between web and mobile
- ✅ Parallel development (web and mobile teams independent)
- ✅ Single source of truth for business logic
- ✅ Easier dependency management with turbo

### 3. Socket.io for Real-Time
**Why:**
- ✅ Already used in web app
- ✅ Native support in React Native
- ✅ <1s latency for GPS updates
- ✅ Bidirectional communication

### 4. SQLite for Offline
**Why:**
- ✅ Structured data sync (not just key-value)
- ✅ Native performance
- ✅ Conflict resolution on server-side
- ✅ Deterministic offline-first experience

### 5. Zustand (same as web)
**Why:**
- ✅ Works for both web and mobile
- ✅ Lightweight and easy to learn
- ✅ Can reuse store patterns from web
- ✅ No prop drilling

---

## How to Use This

### For MOBILE-01 Agent

1. **Read the plan**: Open `REACT_NATIVE_CONVERSION_PLAN.md` (complete roadmap)
2. **Review scaffold**: Browse `apps/mobile/` and `packages/shared/`
3. **Implement Phase 1**: Start with auth and navigation
4. **Use shared types**: Import from `@fleetcommand/shared`
5. **Follow phases**: Each phase has clear deliverables

### For Web Dev Team

- **No changes needed** to existing Next.js app
- Backend API stays the same
- Types exported to `packages/shared` for consistency
- Can continue merging web features in parallel

### For DevOps/QA

- **Deploy**: Mobile app to TestFlight (iOS) and Play Store (Android)
- **API**: Same backend endpoint as web (no new infrastructure)
- **Testing**: E2E tests via Detox (native testing framework)
- **Monitoring**: Same Sentry project for error tracking

---

## Success Metrics

### Phase 1
- ✅ App installs on iOS and Android simulators/devices
- ✅ Auth flow works (login, register, logout)
- ✅ Tab navigation functional
- ✅ All unit tests passing

### Phase 2
- ✅ Dashboard loads fleet stats
- ✅ Live map shows 30 trucks
- ✅ GPS updates <1s latency
- ✅ Truck/driver lists searchable
- ✅ RBAC enforced (driver sees only assigned truck)
- ✅ Offline data persists

### Phase 3
- ✅ Alerts received with push notifications
- ✅ Delivery photos + signatures working
- ✅ Offline queue syncs when online
- ✅ <80MB app size
- ✅ 60 FPS on maps
- ✅ Accessibility passes (VoiceOver, TalkBack)

---

## Next Steps

### Immediate (Next Sprint)
1. ✅ Create `feature/react-native-mobile` branch — DONE
2. ✅ Scaffold monorepo and shared package — DONE
3. ✅ Set up Expo project — DONE
4. 🚧 **Install Expo CLI**: `npm install -g expo-cli`
5. 🚧 **Install mobile dependencies**: `npm install` (in apps/mobile/)
6. 🚧 **Test Expo setup**: `npm run dev` (should start on iOS/Android)

### Phase 1 (Weeks 1-2)
1. Implement login/register screens
2. Set up AsyncStorage for tokens
3. Add tab navigation
4. Implement useAuth hook
5. Write unit tests

### Phase 2 (Weeks 3-4)
1. Build dashboard
2. Implement live map (Google Maps or Mapbox)
3. Create trucks/drivers/trips screens
4. Set up Socket.io for real-time GPS
5. Add offline caching with SQLite

### Phase 3 (Weeks 5-6)
1. Implement alerts module
2. Add camera and signature canvas
3. Set up Firebase FCM for push notifications
4. Implement offline queue sync
5. Polish and accessibility

---

## Important Notes

### Backend API
- ✅ Same API endpoints as web app
- ✅ No changes needed to backend
- ✅ Use same base URL: `https://fleetcommand.vercel.app`
- ✅ API client shared via `@fleetcommand/shared`

### Database
- ✅ Prisma schema is source of truth
- ✅ Types exported to `packages/shared/types`
- ✅ Mobile uses SQLite for local caching, not Prisma

### Testing
- Unit tests: Jest (same as web)
- E2E tests: Detox (native React Native testing)
- Playwright tests: Can adapt for Expo Web

### Deployment
- **TestFlight** (iOS): `npm run build:ios`
- **Google Play** (Android): `npm run build:android`
- **EAS Build**: Managed build service for both platforms

---

## Questions?

Check the detailed plan in `REACT_NATIVE_CONVERSION_PLAN.md` for:
- Technology decisions & rationale
- Phase-by-phase task breakdown
- Architecture diagrams
- Risk mitigation strategies
- Testing approach
- CI/CD integration examples

---

**Created**: Feb 27, 2026  
**Branch**: `feature/react-native-mobile`  
**Status**: Ready for Phase 1 implementation  
**Estimated Effort**: 79 story points across 3 sprints (6 weeks)
