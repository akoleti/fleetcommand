# React Native Conversion Plan — FleetCommand Mobile

**Goal**: Convert FleetCommand from Next.js web app to React Native for iOS (iPhone/iPad) + Android phones  
**Architecture**: Monorepo with shared backend, separate mobile frontend  
**Timeline**: 3 sprints (9 weeks) for MVP  
**Team**: MOBILE-01 agent (React Native specialist)

---

## Executive Summary

### Current State (Web)
- **Frontend**: Next.js 14 with App Router, React, Tailwind CSS
- **Backend**: API routes on Vercel, Prisma ORM, PostgreSQL (Neon), Socket.io
- **Database**: 14 tables (users, trucks, gps_locations, trips, alerts, etc.)
- **Real-time**: Socket.io for live map, Redis caching
- **Status**: 43% complete (104/243 story points), 4 agents deployed

### Target State (Mobile)
- **Frontend**: React Native with Expo (cross-platform)
- **Backend**: Same (no changes needed)
- **Platforms**: iOS 13+, Android 8+
- **Real-time**: Socket.io client (native support)
- **Status**: New effort, separate from web development

### Key Decision
- **Keep backend as-is** — No API changes, just add React Native client
- **Monorepo structure** — `apps/web` (Next.js) + `apps/mobile` (React Native)
- **Shared utilities** — Types, hooks, API client code in `packages/shared`
- **Parallel development** — Web and mobile can progress independently

---

## Architecture

### Monorepo Layout

```
fleetcommand/
├── apps/
│   ├── web/                    # Next.js 14 (existing)
│   │   ├── app/               # App Router
│   │   ├── lib/               # Web utilities
│   │   ├── public/            # Static assets
│   │   └── package.json
│   │
│   └── mobile/                # React Native (NEW)
│       ├── app/               # Expo Router screens
│       ├── components/        # UI components
│       ├── hooks/             # Custom hooks
│       ├── lib/               # Mobile utilities
│       ├── assets/            # Images, fonts
│       └── package.json
│
├── packages/
│   ├── shared/                # Shared code
│   │   ├── types/             # TypeScript types (User, Truck, Trip, etc.)
│   │   ├── api-client/        # Fetch wrapper, endpoints
│   │   ├── constants/         # Alert types, vehicle statuses
│   │   ├── utils/             # Helpers (date, number formatting)
│   │   └── package.json
│   │
│   └── eslint-config/         # Shared lint rules
│
├── prisma/                    # Database schema (shared)
├── REACT_NATIVE_PLAN.md       # This file
└── turbo.json                 # Monorepo config
```

### Tech Stack Decisions

| Layer | Web | Mobile | Shared |
|-------|-----|--------|--------|
| **UI Framework** | Next.js 14 | React Native (Expo) | TypeScript |
| **Navigation** | Next.js App Router | Expo Router | — |
| **Styling** | Tailwind CSS | NativeWind / Tamagui | TypeScript types |
| **HTTP Client** | fetch / axios | fetch / axios | `packages/shared/api-client` |
| **Real-time** | Socket.io | Socket.io client | — |
| **State Management** | Zustand | Zustand | Zustand stores |
| **Database** | Prisma (backend only) | — | — |
| **Auth** | JWT + httpOnly cookies | JWT + AsyncStorage | JWT utilities |

### API Layer Unchanged

All mobile requests go to same backend:

```
Mobile App → https://fleetcommand.vercel.app/api/* → Vercel Functions → Neon PostgreSQL
                                                      ↓
Web App ──→ Same API endpoints ←──────────────────────┘
```

No API changes needed. Mobile uses same `/api/` endpoints as web.

---

## Development Strategy

### Phase 1: Foundation (Sprint 1 — Weeks 1-2)

**Deliverables:**
- Expo project setup with Expo Router
- Monorepo structure (turbo, pnpm workspaces)
- Shared package with types and API client
- Auth flow (login/register/logout)
- Basic navigation (tabs: Dashboard, Trucks, Drivers, Alerts, Delivery)

**Key Files:**
```
apps/mobile/
├── app/
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (dashboard)/
│   │   ├── _layout.tsx       # Tab navigation
│   │   ├── index.tsx         # Dashboard
│   │   ├── trucks/index.tsx
│   │   ├── drivers/index.tsx
│   │   ├── alerts/index.tsx
│   │   └── delivery/index.tsx
│   └── _layout.tsx           # Root layout
├── lib/
│   ├── auth.ts              # JWT + AsyncStorage
│   ├── api.ts               # Axios client
│   └── socket.ts            # Socket.io client
└── package.json
```

**Tests:** Unit tests for auth logic, API client, navigation

---

### Phase 2: Core Modules (Sprint 2 — Weeks 3-4)

**Deliverables:**
- Dashboard with live map (Mapbox GL / Google Maps)
- Trucks list/detail (with tabs)
- Drivers list/profile
- Trips list and management
- Real-time GPS updates via Socket.io

**Key Features:**
- Live map showing 30 trucks with <1s latency
- Truck detail with 6 tabs (location, trips, maintenance, fuel, insurance, alerts)
- Driver profiles with trip history
- Pull-to-refresh on all lists
- Offline caching (AsyncStorage)

**UI Components:**
```
components/
├── Map/MapView.tsx           # Live truck map
├── Card/TruckCard.tsx        # Truck list item
├── Card/DriverCard.tsx       # Driver list item
├── Tab/TabNavigation.tsx     # Tab bar at bottom
├── Button/PrimaryButton.tsx  # Reusable buttons
├── Input/TextField.tsx       # Text inputs
└── Loading/Skeleton.tsx      # Loading states
```

---

### Phase 3: Features & Polish (Sprint 3 — Weeks 5-6)

**Deliverables:**
- Alerts with multi-channel notifications (push notifications via FCM)
- Maintenance logs / insurance policies
- Fuel logs with cost analysis
- Delivery proof capture (camera + signature canvas)
- Offline queue sync (background sync when online)
- Push notifications for critical alerts

**Key Features:**
- Camera integration for delivery photos
- Signature canvas (react-native-sketch-canvas)
- Push notifications (Expo Notifications + Firebase FCM)
- Background sync (Expo TaskManager)
- Offline storage (SQLite + AsyncStorage)

**New Components:**
```
components/
├── Camera/PhotoCapture.tsx
├── Canvas/SignaturePad.tsx
├── Alert/AlertList.tsx
├── Fuel/FuelLog.tsx
├── Maintenance/MaintenanceList.tsx
└── Delivery/DeliveryCapture.tsx
```

---

## Phase-by-Phase Breakdown

### Sprint 1: Foundation & Auth (Weeks 1-2)

#### 1.1 Monorepo Setup
- [ ] Convert to turborepo with pnpm workspaces
- [ ] Create `packages/shared` for types and API client
- [ ] Create `apps/mobile` with Expo
- [ ] Shared tsconfig and eslint rules

#### 1.2 Expo Project Init
```bash
cd apps/mobile
npx create-expo-app@latest
npm install expo-router expo-navigation expo-constants
```

#### 1.3 Auth System
- [ ] JWT utilities in `packages/shared`
- [ ] AsyncStorage for token persistence
- [ ] Login/register screens
- [ ] Protected route middleware
- [ ] Logout and token refresh

#### 1.4 Navigation Structure
- [ ] Tab navigation (Dashboard, Trucks, Drivers, Alerts, Delivery)
- [ ] Stack navigation within each tab
- [ ] Deep linking support

**Tests:**
- Auth flow unit tests (login, register, logout)
- Token refresh and expiry handling
- Route protection tests

---

### Sprint 2: Core Modules (Weeks 3-4)

#### 2.1 Dashboard
- [ ] Fleet status overview (active, idle, on-trip trucks)
- [ ] Live map (Mapbox GL or Google Maps)
- [ ] Real-time vehicle counter
- [ ] Recent alerts widget
- [ ] Pull-to-refresh

#### 2.2 Trucks Module
- [ ] Trucks list with search/filter
- [ ] Truck detail screen with swipeable tabs:
  - Location (map + GPS)
  - Trips (assigned, active, completed)
  - Maintenance (service history)
  - Fuel (recent logs)
  - Insurance (active policies)
  - Alerts (truck-specific alerts)
- [ ] Offline data caching

#### 2.3 Drivers Module
- [ ] Drivers list with search/filter
- [ ] Driver profile with:
  - Personal info
  - Assigned truck
  - Trip history
  - License info
- [ ] Offline data caching

#### 2.4 Trips Module
- [ ] Trips list with status filter (scheduled, active, completed, cancelled)
- [ ] Trip detail with:
  - Pickup/dropoff locations (map)
  - Status timeline
  - Driver/truck info
  - Delivery proof (if completed)

#### 2.5 Real-time Updates
- [ ] Socket.io client integration
- [ ] Live GPS updates (red dot on map moving in real-time)
- [ ] Vehicle status changes
- [ ] Alert notifications

**Tests:**
- Dashboard loads fleet data
- Live map updates in real-time
- Truck detail tabs render correctly
- RBAC enforcement (driver sees only assigned truck)
- Offline caching works

---

### Sprint 3: Features & Polish (Weeks 5-6)

#### 3.1 Alerts Module
- [ ] Alerts list with search/filter (by severity, type, status)
- [ ] Alert detail screen
- [ ] Resolve/dismiss actions
- [ ] Multi-channel notification handling
  - FCM push notification (for critical/warning)
  - In-app notification badge
- [ ] 12 alert types display correctly

#### 3.2 Maintenance Module
- [ ] Maintenance logs list/detail
- [ ] Insurance policies list/detail with renewal tracking
- [ ] Claims workflow (open → pending → settled)
- [ ] Expiry alerts (30-day warning, 7-day critical)

#### 3.3 Fuel Module
- [ ] Fuel logs list/detail
- [ ] Cost analysis dashboard
- [ ] Efficiency metrics
- [ ] Export to PDF (if driver needs offline access)

#### 3.4 Delivery Module
- [ ] Delivery proof capture flow:
  - Recipient info entry
  - Photo upload from camera/gallery
  - GPS embedding in photo
  - Signature canvas capture
  - Submit delivery proof
- [ ] Delivery history view
- [ ] S3 presigned URL image viewing
- [ ] Offline queue (queue delivery proofs when offline, sync when online)

#### 3.5 Push Notifications
- [ ] Firebase Cloud Messaging (FCM) setup
- [ ] Alert notifications in background
- [ ] Notification deep linking (tap alert → goes to alerts page)
- [ ] Badge count on app icon

#### 3.6 Offline Functionality
- [ ] SQLite for local data sync
- [ ] AsyncStorage for preferences
- [ ] Background sync task (syncs when online)
- [ ] Conflict resolution (server-side is authoritative)

#### 3.7 Polish & Performance
- [ ] Loading skeletons for all screens
- [ ] Smooth animations (React Native Reanimated)
- [ ] Error handling and retry logic
- [ ] Accessibility (VoiceOver for iOS, TalkBack for Android)

**Tests:**
- Alerts filter and resolve correctly
- Push notifications trigger on critical alerts
- Delivery capture saves photos and signatures
- Offline queue syncs when online
- Image viewing via S3 presigned URLs

---

## Technology Decisions

### Navigation: Expo Router
Why: File-based routing (like Next.js), supports deep linking, TypeScript friendly

```typescript
// apps/mobile/app/(dashboard)/trucks/[id].tsx
import { Stack, useLocalSearchParams } from 'expo-router';

export default function TruckDetail() {
  const { id } = useLocalSearchParams();
  // Component code
}
```

### Styling: NativeWind + Tamagui

Why: Tailwind-like syntax for React Native, consistent with web styling

```typescript
import { View, Text } from 'react-native';
import { tw } from 'nativewind';

export default function Card() {
  return (
    <View style={tw`p-4 bg-white rounded-lg shadow`}>
      <Text style={tw`text-lg font-bold`}>Title</Text>
    </View>
  );
}
```

### State Management: Zustand

Why: Lightweight, works for both web and mobile, already used in web app

```typescript
// packages/shared/stores/trucks.ts
import { create } from 'zustand';

interface TrucksStore {
  trucks: Truck[];
  fetchTrucks: () => Promise<void>;
}

export const useTrucksStore = create<TrucksStore>((set) => ({
  trucks: [],
  fetchTrucks: async () => {
    const trucks = await apiClient.get('/api/trucks');
    set({ trucks });
  },
}));

// Usage in both web and mobile
const { trucks, fetchTrucks } = useTrucksStore();
```

### Maps: Expo Maps (Google Maps / Mapbox)

Why: Native performance, real-time truck tracking

```typescript
import MapView, { Marker } from 'react-native-maps';

<MapView style={{ flex: 1 }}>
  {trucks.map(truck => (
    <Marker
      key={truck.id}
      coordinate={{
        latitude: truck.gpsLocation.lat,
        longitude: truck.gpsLocation.lng,
      }}
      title={truck.licenseNumber}
    />
  ))}
</MapView>
```

### Push Notifications: Expo Notifications + FCM

Why: Cross-platform, integrates with Firebase backend

```typescript
import * as Notifications from 'expo-notifications';

// In app.json: setup Firebase project ID
// Backend sends via Firebase Admin SDK
// App receives via expo-notifications
```

### Camera: Expo Camera

Why: Native camera access, no third-party SDKs needed

```typescript
import { CameraView } from 'expo-camera';

<CameraView style={{ flex: 1 }} ref={cameraRef}>
  <Button title="Capture" onPress={() => {
    const photo = cameraRef.current?.takePictureAsync();
    // Upload to S3
  }} />
</CameraView>
```

### Offline Storage: SQLite + AsyncStorage

Why: SQLite for structured data sync, AsyncStorage for key-value

```typescript
// SQLite for trips, trucks, drivers
import SQLite from 'expo-sqlite';
const db = SQLite.openDatabase('fleetcommand.db');

// AsyncStorage for tokens, preferences
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.setItem('authToken', token);
```

---

## Monorepo Structure (Turbo)

### turbo.json

```json
{
  "extends": ["//"],
  "globalDependencies": ["**/.env.local"],
  "tasks": {
    "build": {
      "outputs": ["dist/**", ".next/**"],
      "cache": false
    },
    "test": {
      "outputs": ["coverage/**"],
      "cache": false
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": [".eslintcache"]
    },
    "type-check": {
      "outputs": []
    }
  }
}
```

### Root package.json

```json
{
  "name": "fleetcommand-monorepo",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev:web": "turbo run dev --filter=@fc/web",
    "dev:mobile": "turbo run dev --filter=@fc/mobile",
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check"
  },
  "devDependencies": {
    "turbo": "latest"
  }
}
```

---

## Shared Package Structure

### packages/shared/package.json

```json
{
  "name": "@fleetcommand/shared",
  "version": "1.0.0",
  "private": true,
  "exports": {
    "./types": "./src/types/index.ts",
    "./api": "./src/api-client/index.ts",
    "./constants": "./src/constants/index.ts",
    "./utils": "./src/utils/index.ts"
  }
}
```

### packages/shared/src/types/index.ts

```typescript
// Reuse Prisma types
export type User = {
  id: string;
  email: string;
  role: 'owner' | 'manager' | 'driver';
  firstName: string;
  lastName: string;
};

export type Truck = {
  id: string;
  licenseNumber: string;
  vin: string;
  status: 'active' | 'inactive' | 'maintenance';
  gpsLocation?: {
    lat: number;
    lng: number;
    speed: number;
    heading: number;
  };
};

// ... 12 more types from schema
```

### packages/shared/src/api-client/index.ts

```typescript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://fleetcommand.vercel.app';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Both web and mobile use same client
export const getTrucks = () => apiClient.get('/api/trucks');
export const getDrivers = () => apiClient.get('/api/drivers');
export const getTripUpdates = async (tripId: string) => 
  apiClient.get(`/api/trips/${tripId}`);
```

---

## Testing Strategy

### Unit Tests
- Auth logic (JWT, token refresh)
- API client and interceptors
- Store actions (Zustand)
- Utilities (date formatting, etc.)

**Framework**: Jest (already in package.json)

### Integration Tests
- Auth flow (login → navigate to dashboard)
- Truck list → detail flow
- Real-time updates via Socket.io

**Framework**: Detox (native E2E tests for React Native)

### E2E Tests
- Same Playwright suite adapted for mobile web (via Expo Web)
- Or use Detox for native testing

---

## Dependencies Added

### Root package.json
```json
{
  "devDependencies": {
    "turbo": "^1.10.0",
    "typescript": "^5.3.0"
  }
}
```

### apps/mobile/package.json
```json
{
  "dependencies": {
    "expo": "^50.0.0",
    "expo-router": "^2.4.0",
    "expo-camera": "^14.0.0",
    "expo-notifications": "^0.20.0",
    "expo-task-manager": "^11.0.0",
    "react": "^18.2.0",
    "react-native": "^0.73.0",
    "react-native-maps": "^1.7.0",
    "react-native-sketch-canvas": "^0.8.0",
    "axios": "^1.6.0",
    "socket.io-client": "^4.7.0",
    "zustand": "^4.4.0",
    "nativewind": "^2.0.0",
    "@react-navigation/native": "^6.1.0",
    "@react-native-async-storage/async-storage": "^1.21.0",
    "expo-sqlite": "^13.0.0"
  },
  "devDependencies": {
    "@testing-library/react-native": "^12.4.0",
    "jest": "^29.7.0",
    "detox": "^20.13.0",
    "detox-cli": "^20.13.0"
  }
}
```

### packages/shared/package.json
```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "zustand": "^4.4.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
```

---

## Success Metrics

### Phase 1 (Auth & Navigation)
- ✅ Login/register flows work on iOS and Android
- ✅ Protected routes redirect unauthenticated users
- ✅ Tab navigation functioning
- ✅ All unit tests passing

### Phase 2 (Core Modules)
- ✅ Dashboard loads and displays fleet stats
- ✅ Live map updates 30 trucks in <1s
- ✅ Truck/driver lists searchable and filterable
- ✅ Offline data persists (AsyncStorage)
- ✅ RBAC enforced (driver sees only assigned data)

### Phase 3 (Features)
- ✅ Alerts received and displayed
- ✅ Delivery proof capture works (photos + signatures)
- ✅ Push notifications trigger on critical alerts
- ✅ Offline queue syncs when online
- ✅ <80MB app size
- ✅ 60 FPS performance on maps
- ✅ Accessibility passes (VoiceOver, TalkBack)

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Real-time map performance (30 trucks) | Use native maps library, cluster markers at low zoom, update only changed trucks |
| Offline sync conflicts | Server-side as authoritative, device uploads queued changes |
| Large app size | Tree-shake unused code, lazy-load modules, compress images |
| Push notification latency | Use Firebase Cloud Messaging (proven), test end-to-end |
| Battery drain (live map + GPS) | Stop tracking when app backgrounded, reduce update frequency at night |
| iOS App Store review | Ensure GDPR compliance, privacy policy, don't abuse push notifications |

---

## Timeline & Sprints

| Sprint | Duration | Deliverables | Story Points |
|--------|----------|--------------|--------------|
| 1 | 2 weeks | Monorepo, Auth, Navigation, Foundation | 21 |
| 2 | 2 weeks | Dashboard, Trucks, Drivers, Trips, Real-time | 28 |
| 3 | 2 weeks | Alerts, Maintenance, Fuel, Delivery, Push, Offline | 30 |
| **Total** | **6 weeks** | **MVP Release** | **79** |

---

## Next Steps

1. ✅ Create `feature/react-native-mobile` branch
2. ⏳ Create monorepo structure (turbo, pnpm workspaces)
3. ⏳ Set up Expo project
4. ⏳ Scaffold `packages/shared` with types
5. ⏳ Implement auth flow (Sprint 1)
6. ⏳ Build dashboard and core modules (Sprint 2)
7. ⏳ Add features and polish (Sprint 3)
8. ⏳ Test on iOS and Android devices
9. ⏳ Deploy to Expo, TestFlight, Google Play

---

## Notes for MOBILE-01 Agent

When ready to implement:
- Backend API is unchanged (use existing `/api/*` endpoints)
- Reuse Prisma types from `packages/shared`
- Keep web and mobile development in parallel
- Test on real devices (not simulator) for GPS and camera
- Use Expo for faster iteration (no native build setup)
- File an issue if API changes needed (coordinate with ORCH-01)

---

**Branch**: `feature/react-native-mobile`  
**Status**: 🚧 Planning & setup phase  
**Owner**: MOBILE-01 (when assigned)
