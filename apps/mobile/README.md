# FleetCommand Mobile App

React Native mobile application for iOS (iPhone/iPad) and Android phones using Expo.

## Overview

This is the mobile frontend for FleetCommand, a real-time fleet management platform. The mobile app allows drivers and fleet managers to:

- **View live fleet map** with all 30 trucks updated in real-time
- **Manage trucks** — View truck details, status, maintenance, fuel, insurance
- **Manage drivers** — View driver profiles and trip history
- **Track trips** — Create, update, and complete trips
- **Receive alerts** — Critical alerts with push notifications (FCM)
- **Capture delivery proofs** — Take photos, add signatures, submit proofs
- **Work offline** — Queue deliveries when offline, sync when online

## Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: Expo Router (file-based routing)
- **Maps**: React Native Maps (Google Maps / Mapbox)
- **State**: Zustand
- **Real-time**: Socket.io client
- **HTTP**: Axios
- **Styling**: NativeWind + Tailwind CSS
- **Database**: SQLite (local) + AsyncStorage
- **Camera**: Expo Camera + Canvas for signatures
- **Notifications**: Expo Notifications + Firebase FCM
- **Location**: Expo Location

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- Xcode (for iOS simulator) or Android Emulator

### Installation

```bash
# Install dependencies
npm install

# Or in monorepo root
npm run install:mobile

# Start development server
npm run dev

# Run on iOS simulator
npm run dev:ios

# Run on Android emulator
npm run dev:android

# Run on physical device (via QR code)
npm run dev
```

## Project Structure

```
apps/mobile/
├── app/                    # Expo Router screens
│   ├── (auth)/             # Auth screens
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (dashboard)/        # Main app screens
│   │   ├── _layout.tsx     # Tab navigation
│   │   ├── index.tsx       # Dashboard
│   │   ├── trucks/         # Trucks module
│   │   ├── drivers/        # Drivers module
│   │   ├── trips/          # Trips module
│   │   ├── alerts/         # Alerts module
│   │   └── delivery/       # Delivery module
│   ├── _layout.tsx         # Root layout
│   └── +not-found.tsx      # 404 screen
│
├── components/             # Reusable UI components
│   ├── ui/                 # Base UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   └── ...
│   ├── Map/               # Map components
│   ├── List/              # List components
│   └── ...
│
├── hooks/                 # Custom hooks
│   ├── useAuth.ts
│   ├── useTrucks.ts
│   ├── useLocation.ts
│   └── ...
│
├── lib/                   # Utilities
│   ├── auth.ts           # JWT + AsyncStorage
│   ├── socket.ts         # Socket.io setup
│   ├── db.ts             # SQLite setup
│   └── ...
│
├── assets/               # Images, fonts, icons
├── app.json              # Expo config
├── package.json
├── tsconfig.json
└── README.md
```

## Key Screens

### Authentication (Sprint 1)
- **Login** — Email + password
- **Register** — Create account
- **Logout** — Session cleanup

### Dashboard (Sprint 2)
- **Fleet Overview** — Vehicle counters (active, idle, on-trip)
- **Live Map** — 30 trucks with real-time GPS updates
- **Recent Alerts** — Last 5 alerts with action buttons

### Trucks (Sprint 2)
- **Trucks List** — Search, filter by status
- **Truck Detail** — 6 swipeable tabs:
  - Location (map + GPS coordinates)
  - Trips (assigned, active, completed)
  - Maintenance (service history)
  - Fuel (recent logs)
  - Insurance (policies, expiry alerts)
  - Alerts (truck-specific alerts)

### Drivers (Sprint 2)
- **Drivers List** — Search, filter
- **Driver Profile** — Personal info, assigned truck, trip history

### Trips (Sprint 2)
- **Trips List** — Filter by status (scheduled, active, completed, cancelled)
- **Trip Detail** — Pickup/dropoff, timeline, driver/truck info

### Alerts (Sprint 3)
- **Alerts List** — Search, filter by severity/type/status
- **Alert Detail** — Full info + resolve/dismiss actions
- **Push Notifications** — FCM integration for critical alerts

### Delivery Proof (Sprint 3)
- **Delivery Capture** — Recipient info entry
- **Camera** — Take photos (auto GPS embedding)
- **Signature** — Canvas-based signature capture
- **Submit** — Sync to S3 via presigned URLs
- **View** — Delivery history with photo gallery

## Features

### Real-Time
- **Live GPS Tracking** — 30 trucks updated every 30 seconds via Socket.io
- **Live Map** — <1s latency, clustered markers at low zoom
- **Alert Notifications** — Instant FCM push for critical alerts
- **Truck Status Changes** — Immediate UI updates

### Offline
- **Data Caching** — Trucks, drivers, trips cached in SQLite
- **Offline Queue** — Delivery proofs queued when offline
- **Background Sync** — Automatic sync when online via Expo TaskManager

### Notifications
- **Push Notifications** — Firebase FCM integration
- **Badge Count** — App icon badge for critical alerts
- **Deep Linking** — Tap alert → navigates to alerts page

### Performance
- **<80MB App Size** — Tree-shaken, optimized assets
- **60 FPS Maps** — Native map library, efficient rendering
- **Fast Startup** — <3s cold start on modern devices

### Accessibility
- **VoiceOver** (iOS) — Screen reader support
- **TalkBack** (Android) — Screen reader support
- **High Contrast** — Optional high-contrast theme

## Development

### API Configuration

The mobile app connects to the same backend as the web app. Set API URL in `.env.local`:

```bash
EXPO_PUBLIC_API_URL=https://fleetcommand.vercel.app
```

### Authentication

Tokens are stored securely:
- **Access Token**: 15m expiry, stored in memory
- **Refresh Token**: 7d expiry, stored in AsyncStorage
- **Automatic Refresh**: Interceptor refreshes token before expiry

### Socket.io Events

The app listens for real-time updates:

```typescript
// GPS updates
on('gps_update', (data) => {
  // Update truck location on map
});

// New alerts
on('alert_created', (alert) => {
  // Show push notification
  // Update alerts list
});

// Trip changes
on('trip_updated', (trip) => {
  // Update trip status
});
```

### Local Storage

Data is stored in three tiers:

1. **Memory** — Active data (trucks, drivers, trips)
2. **AsyncStorage** — Persistent preferences (theme, notifications)
3. **SQLite** — Structured offline data (full sync capability)

## Testing

### Unit Tests
```bash
npm run test
```

### Manual Testing on Device
```bash
# Scan QR code with Expo app (iOS) or camera (Android)
npm run dev
```

### Build for Testing
```bash
# TestFlight (iOS)
npm run build:ios

# Google Play Console (Android)
npm run build:android
```

## Debugging

### Expo DevTools
Shake device to open menu:
- **View Logs** — Console output
- **Reload** — Hot reload
- **Performance** — FPS monitor

### React Native Debugger
```bash
# Start debugger
npm run dev -- --debug

# Open React Native Debugger app and connect
```

### Network Inspection
```bash
# Inspect API calls in DevTools
# See Socket.io messages
```

## Performance Tips

- **Large Maps**: Use marker clustering at zoom < 12
- **GPS Updates**: Throttle to 1/30s on low battery
- **Images**: Use presigned URLs, not direct S3 URLs
- **Lists**: Implement FlatList with `removeClippedSubviews`
- **Animations**: Use Reanimated for 60 FPS animations

## Deployment

### Testflight (iOS)

```bash
npm run build:ios
# Submit to App Store via Transporter
```

### Google Play (Android)

```bash
npm run build:android
# Upload to Play Console
```

## Troubleshooting

### "Metro bundler failed"
```bash
# Clear cache
rm -rf .expo
expo start --clear
```

### Map not loading
- Check Google Maps / Mapbox API keys in app.json
- Verify API key has Maps SDK enabled
- Check geolocation permissions

### Camera not working
- iOS: Check NSCameraUsageDescription in Info.plist
- Android: Check CAMERA permission in AndroidManifest.xml
- On device: Grant camera permission in Settings

### Notifications not received
- Check Firebase project ID in app.json
- Verify FCM setup in backend
- On device: Check notification permissions

## Resources

- [Expo Documentation](https://docs.expo.dev)
- [Expo Router](https://docs.expo.dev/routing/introduction)
- [React Native Docs](https://reactnative.dev)
- [NativeWind](https://www.nativewind.dev)
- [Zustand](https://github.com/pmndrs/zustand)

## Support

For issues or feature requests, contact MOBILE-01 agent.
