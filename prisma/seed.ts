import {
  PrismaClient, UserRole, TruckStatus, DriverStatus, TripStatus,
  MaintenanceType, MaintenanceStatus, AlertType, AlertSeverity,
  ClaimStatus, DeliveryMediaType,
} from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const TRUCK_MAKES = ['Freightliner', 'Peterbilt', 'Kenworth', 'Volvo', 'Mack', 'International']
const TRUCK_MODELS: Record<string, string[]> = {
  Freightliner: ['Cascadia', 'M2 106', 'Columbia'],
  Peterbilt: ['579', '389', '567'],
  Kenworth: ['T680', 'W990', 'T880'],
  Volvo: ['VNL 860', 'VNR 640', 'VHD'],
  Mack: ['Anthem', 'Pinnacle', 'Granite'],
  International: ['LT', 'HX', 'RH'],
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function randFloat(min: number, max: number, d = 2) { return parseFloat((Math.random() * (max - min) + min).toFixed(d)) }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function daysFromNow(d: number) { return new Date(Date.now() + d * 86400000) }
function daysAgo(d: number) { return new Date(Date.now() - d * 86400000) }

function generateVIN() {
  const c = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'
  return Array.from({ length: 17 }, () => c[Math.floor(Math.random() * c.length)]).join('')
}

function generatePlate() {
  const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const N = '0123456789'
  return `${L[randInt(0,25)]}${L[randInt(0,25)]}${L[randInt(0,25)]}-${N[randInt(0,9)]}${N[randInt(0,9)]}${N[randInt(0,9)]}${N[randInt(0,9)]}`
}

const CITIES = [
  { name: 'Houston', lat: 29.7604, lng: -95.3698 },
  { name: 'Dallas', lat: 32.7767, lng: -96.7970 },
  { name: 'Austin', lat: 30.2672, lng: -97.7431 },
  { name: 'San Antonio', lat: 29.4241, lng: -98.4936 },
  { name: 'Fort Worth', lat: 32.7555, lng: -97.3308 },
  { name: 'El Paso', lat: 31.7619, lng: -106.4850 },
  { name: 'Lubbock', lat: 33.5779, lng: -101.8552 },
  { name: 'Amarillo', lat: 35.2220, lng: -101.8313 },
  { name: 'Corpus Christi', lat: 27.8006, lng: -97.3964 },
  { name: 'Laredo', lat: 27.5036, lng: -99.5076 },
  { name: 'Midland', lat: 31.9973, lng: -102.0779 },
  { name: 'Beaumont', lat: 30.0802, lng: -94.1266 },
]

const STREETS = ['Main St', 'Commerce Dr', 'Industrial Blvd', 'Highway 10', 'Freight Rd', 'Depot Ave', 'Warehouse Ln', 'Terminal Way']

const DRIVER_NAMES = [
  'James Rodriguez', 'Maria Garcia', 'John Smith', 'Sarah Johnson', 'Michael Brown',
  'Emily Davis', 'David Wilson', 'Lisa Anderson', 'Robert Taylor', 'Jennifer Thomas',
  'William Jackson', 'Amanda White', 'Joseph Harris', 'Michelle Martin', 'Charles Thompson',
  'Ashley Garcia', 'Christopher Martinez', 'Jessica Robinson', 'Daniel Clark', 'Stephanie Lewis',
  'Matthew Lee', 'Nicole Walker', 'Andrew Hall', 'Samantha Allen', 'Joshua Young',
  'Elizabeth King', 'Kevin Wright', 'Brittany Scott', 'Ryan Green', 'Lauren Adams',
]

const MAINTENANCE_DESCRIPTIONS: Record<string, string[]> = {
  OIL_CHANGE: ['Full synthetic oil change', 'Standard oil change + filter', 'Oil change with multi-point inspection'],
  TIRE_ROTATION: ['Tire rotation and balance', 'Tire rotation + alignment check', 'Tire rotation, replaced 2 worn tires'],
  BRAKE_SERVICE: ['Brake pad replacement (front)', 'Full brake service (all axles)', 'Brake inspection + rotor resurfacing'],
  ENGINE_REPAIR: ['EGR valve replacement', 'Turbocharger rebuild', 'Fuel injector cleaning'],
  TRANSMISSION: ['Transmission fluid change', 'Clutch replacement', 'Transmission rebuild'],
  ELECTRICAL: ['Alternator replacement', 'Starter motor repair', 'Wiring harness repair'],
  BODY_WORK: ['Side panel repair from scrape', 'Bumper replacement', 'Windshield replacement'],
  INSPECTION: ['DOT annual inspection', 'Pre-trip safety inspection', 'State emissions inspection'],
  OTHER: ['AC compressor replacement', 'Exhaust system repair', 'Fifth wheel maintenance'],
}

const FUEL_STATIONS = ['Pilot Flying J', "Love's Travel Stop", 'TA Petro', 'Casey\'s', 'Buc-ee\'s', 'QuikTrip', 'Sheetz', 'RaceTrac']

function addr(city: typeof CITIES[0]) { return `${randInt(100, 9999)} ${pick(STREETS)}, ${city.name}, TX` }

async function main() {
  console.log('🌱 Starting seed...\n')

  console.log('🧹 Cleaning existing data...')
  await prisma.deliveryMedia.deleteMany()
  await prisma.deliveryProof.deleteMany()
  await prisma.gpsLocation.deleteMany()
  await prisma.truckStatusRecord.deleteMany()
  await prisma.trip.deleteMany()
  await prisma.fuelLog.deleteMany()
  await prisma.maintenance.deleteMany()
  await prisma.insuranceClaim.deleteMany()
  await prisma.insurancePolicy.deleteMany()
  await prisma.alert.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.truck.deleteMany()
  await prisma.driver.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()

  // ── Organization ───────────────────────────────────────────
  console.log('🏢 Creating organization...')
  const org = await prisma.organization.create({
    data: {
      name: 'Texas Freight Co.',
      settings: { timezone: 'America/Chicago', idleThresholdMinutes: 240, speedLimitMph: 75, defaultFuelUnit: 'gallons' },
    },
  })

  // ── Users ──────────────────────────────────────────────────
  console.log('👤 Creating users...')
  const hash = await bcrypt.hash('password123', 12)

  const owner = await prisma.user.create({
    data: { email: 'owner@texasfreight.com', passwordHash: hash, name: 'John Owner', role: UserRole.OWNER, organizationId: org.id, phone: '+15551234567' },
  })
  const manager = await prisma.user.create({
    data: { email: 'manager@texasfreight.com', passwordHash: hash, name: 'Jane Manager', role: UserRole.MANAGER, organizationId: org.id, phone: '+15552345678' },
  })
  await prisma.user.create({
    data: { email: 'driver@texasfreight.com', passwordHash: hash, name: 'Bob Driver', role: UserRole.DRIVER, organizationId: org.id, phone: '+15553456789' },
  })

  // ── Drivers ────────────────────────────────────────────────
  console.log('🚚 Creating 30 drivers...')
  const driverStatuses = [DriverStatus.AVAILABLE, DriverStatus.AVAILABLE, DriverStatus.ON_TRIP, DriverStatus.OFF_DUTY, DriverStatus.AVAILABLE]
  const drivers = await Promise.all(
    DRIVER_NAMES.map((name, i) => {
      const expiresIn = i < 3 ? randInt(5, 25) : randInt(60, 730)
      return prisma.driver.create({
        data: {
          organizationId: org.id,
          name,
          licenseNumber: `TX${String(100000 + i).padStart(7, '0')}`,
          licenseExpiry: daysFromNow(expiresIn),
          phone: `+1555${String(1000000 + i).slice(-7)}`,
          status: pick(driverStatuses),
        },
      })
    })
  )

  // ── Trucks ─────────────────────────────────────────────────
  console.log('🚛 Creating 30 trucks...')
  const truckStatuses = [TruckStatus.ACTIVE, TruckStatus.ACTIVE, TruckStatus.ACTIVE, TruckStatus.IDLE, TruckStatus.MAINTENANCE, TruckStatus.ACTIVE]
  const trucks = await Promise.all(
    Array.from({ length: 30 }, (_, i) => {
      const make = pick(TRUCK_MAKES)
      return prisma.truck.create({
        data: {
          organizationId: org.id,
          vin: generateVIN(),
          licensePlate: generatePlate(),
          make,
          model: pick(TRUCK_MODELS[make]),
          year: randInt(2018, 2025),
          status: pick(truckStatuses),
          currentDriverId: drivers[i]?.id,
        },
      })
    })
  )

  // ── Truck Status (live position) ───────────────────────────
  console.log('📍 Creating truck status records...')
  await Promise.all(
    trucks.map((truck) => {
      const city = pick(CITIES)
      return prisma.truckStatusRecord.create({
        data: {
          truckId: truck.id,
          latitude: city.lat + randFloat(-0.15, 0.15),
          longitude: city.lng + randFloat(-0.15, 0.15),
          speed: truck.status === TruckStatus.ACTIVE ? randFloat(35, 72) : 0,
          heading: randFloat(0, 360),
          fuelLevel: randFloat(15, 98),
          ignitionOn: truck.status === TruckStatus.ACTIVE || truck.status === TruckStatus.IDLE,
          lastPingAt: new Date(Date.now() - randInt(0, 600) * 1000),
        },
      })
    })
  )

  // ── GPS History (24h for 10 trucks) ────────────────────────
  console.log('🗺️  Creating GPS history (10 trucks × 24h)...')
  const now = Date.now()
  for (const truck of trucks.slice(0, 10)) {
    const city = pick(CITIES)
    let lat = city.lat, lng = city.lng
    const locs = []
    for (let t = now - 86400000; t < now; t += 30000) {
      lat += randFloat(-0.001, 0.001, 6)
      lng += randFloat(-0.001, 0.001, 6)
      locs.push({
        truckId: truck.id, latitude: lat, longitude: lng,
        speed: randFloat(0, 70), heading: randFloat(0, 360),
        fuelLevel: randFloat(20, 95), ignitionOn: Math.random() > 0.15,
        timestamp: new Date(t),
      })
    }
    await prisma.gpsLocation.createMany({ data: locs })
  }

  // ── Trips (60 trips — mix of past, active, future) ────────
  console.log('🛣️  Creating 60 trips...')
  const trips = []
  for (let i = 0; i < 60; i++) {
    const origin = pick(CITIES)
    let dest = pick(CITIES)
    while (dest.name === origin.name) dest = pick(CITIES)

    const dayOffset = randInt(-30, 14)
    const scheduledStart = daysFromNow(dayOffset)
    let status: TripStatus
    if (dayOffset < -5) status = pick([TripStatus.COMPLETED, TripStatus.COMPLETED, TripStatus.CANCELLED])
    else if (dayOffset < 0) status = pick([TripStatus.COMPLETED, TripStatus.IN_PROGRESS])
    else status = TripStatus.SCHEDULED

    const durationHours = randInt(3, 14)
    const trip = await prisma.trip.create({
      data: {
        truckId: trucks[i % 30].id,
        driverId: drivers[i % 30].id,
        originAddress: addr(origin),
        originLat: origin.lat + randFloat(-0.05, 0.05),
        originLng: origin.lng + randFloat(-0.05, 0.05),
        destinationAddress: addr(dest),
        destinationLat: dest.lat + randFloat(-0.05, 0.05),
        destinationLng: dest.lng + randFloat(-0.05, 0.05),
        scheduledStart,
        scheduledEnd: new Date(scheduledStart.getTime() + durationHours * 3600000),
        status,
        actualStart: status !== TripStatus.SCHEDULED ? new Date(scheduledStart.getTime() + randInt(-30, 60) * 60000) : null,
        actualEnd: status === TripStatus.COMPLETED ? new Date(scheduledStart.getTime() + (durationHours + randInt(-1, 2)) * 3600000) : null,
        notes: pick([null, null, 'Fragile cargo — handle with care', 'Oversized load permit required', 'Customer requested morning delivery', 'Refrigerated cargo at 35°F', null]),
      },
    })
    trips.push(trip)
  }

  // ── Delivery Proofs (for completed trips) ──────────────────
  console.log('📦 Creating delivery proofs...')
  const completedTrips = trips.filter(t => t.status === TripStatus.COMPLETED)
  const proofs = []
  for (const trip of completedTrips.slice(0, 20)) {
    const city = pick(CITIES)
    const proof = await prisma.deliveryProof.create({
      data: {
        tripId: trip.id,
        recipientName: pick(['Mike Johnson', 'Susan Lee', 'Carlos Ramirez', 'Angela Chen', 'Tom Baker', 'Patricia Wood', 'Warehouse Manager', 'Front Desk', 'Loading Dock #3']),
        notes: pick([null, 'Left at loading dock per instructions', 'Signed by warehouse supervisor', 'Delivered to back entrance', 'Recipient confirmed quantity', null]),
        latitude: city.lat + randFloat(-0.02, 0.02),
        longitude: city.lng + randFloat(-0.02, 0.02),
        capturedAt: trip.actualEnd || new Date(),
        syncedAt: trip.actualEnd ? new Date(trip.actualEnd.getTime() + randInt(5, 60) * 60000) : null,
      },
    })
    proofs.push(proof)

    const mediaCount = randInt(1, 3)
    for (let m = 0; m < mediaCount; m++) {
      const type = m === 0 ? DeliveryMediaType.SIGNATURE : pick([DeliveryMediaType.PHOTO, DeliveryMediaType.PHOTO, DeliveryMediaType.DOCUMENT])
      await prisma.deliveryMedia.create({
        data: {
          proofId: proof.id,
          type,
          s3Key: `delivery/${trip.id}/${proof.id}/${type.toLowerCase()}-${m}.${type === DeliveryMediaType.SIGNATURE ? 'png' : 'jpg'}`,
          s3Bucket: 'fleet-delivery-media',
          mimeType: type === DeliveryMediaType.DOCUMENT ? 'application/pdf' : 'image/png',
          fileSize: randInt(50000, 2000000),
        },
      })
    }
  }

  // ── Maintenance (multiple records per truck) ───────────────
  console.log('🔧 Creating maintenance records...')
  let maintCount = 0
  for (const truck of trucks) {
    const count = randInt(1, 4)
    for (let m = 0; m < count; m++) {
      const type = pick(Object.values(MaintenanceType))
      const isCompleted = Math.random() > 0.35
      const scheduledDate = daysAgo(randInt(0, 120))

      await prisma.maintenance.create({
        data: {
          truckId: truck.id,
          type,
          status: isCompleted ? MaintenanceStatus.COMPLETED : pick([MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS]),
          description: pick(MAINTENANCE_DESCRIPTIONS[type] || ['General maintenance']),
          cost: isCompleted ? randFloat(85, 3500) : null,
          vendor: pick(['Quick Lube Express', 'Truck Pro Service', 'Fleet Maintenance Inc.', 'Highway Diesel Repair', 'Lone Star Truck Care', 'Texas Fleet Service']),
          scheduledDate,
          completedDate: isCompleted ? new Date(scheduledDate.getTime() + randInt(1, 5) * 86400000) : null,
          nextDueDate: daysFromNow(randInt(30, 240)),
          nextDueMileage: randInt(10000, 50000),
          odometer: randInt(80000, 600000),
          notes: pick([null, null, 'Parts on backorder — 2-day delay', 'Warranty claim submitted', 'Recurring issue — monitor closely', null]),
        },
      })
      maintCount++
    }
  }

  // ── Fuel Logs (rich history per truck) ─────────────────────
  console.log('⛽ Creating fuel logs...')
  let fuelCount = 0
  for (const truck of trucks) {
    let odo = randInt(80000, 300000)
    const entries = randInt(5, 15)
    const logs = []
    for (let f = 0; f < entries; f++) {
      odo += randInt(200, 800)
      const gallons = randFloat(40, 160)
      const ppg = randFloat(3.05, 4.85)
      const city = pick(CITIES)
      logs.push({
        truckId: truck.id,
        gallons,
        pricePerGallon: ppg,
        totalCost: parseFloat((gallons * ppg).toFixed(2)),
        odometer: odo,
        station: pick(FUEL_STATIONS),
        latitude: city.lat + randFloat(-0.05, 0.05),
        longitude: city.lng + randFloat(-0.05, 0.05),
        fueledAt: daysAgo(randInt(0, 60)),
      })
    }
    await prisma.fuelLog.createMany({ data: logs })
    fuelCount += logs.length
  }

  // ── Insurance Policies (some expiring soon) ────────────────
  console.log('📋 Creating insurance policies...')
  const policies = []
  for (const truck of trucks) {
    const isExpiringSoon = Math.random() < 0.2
    const expiryDays = isExpiringSoon ? randInt(3, 28) : randInt(60, 365)
    const startDays = randInt(180, 365)
    const policy = await prisma.insurancePolicy.create({
      data: {
        organizationId: org.id,
        truckId: truck.id,
        provider: pick(['State Farm Commercial', 'Progressive Fleet', 'Geico Business', 'Allstate Trucking', 'Liberty Mutual Commercial', 'Nationwide Fleet']),
        policyNumber: `POL-${randInt(100000, 999999)}`,
        coverageType: pick(['Liability', 'Full Coverage', 'Comprehensive', 'Cargo Insurance', 'Physical Damage']),
        premium: randFloat(800, 3500),
        deductible: pick([500, 1000, 1500, 2500]),
        coverageLimit: pick([100000, 250000, 500000, 1000000]),
        startDate: daysAgo(startDays),
        expiryDate: daysFromNow(expiryDays),
        isActive: true,
      },
    })
    policies.push(policy)
  }

  // ── Insurance Claims ───────────────────────────────────────
  console.log('📄 Creating insurance claims...')
  let claimCount = 0
  for (const policy of policies.slice(0, 12)) {
    const count = randInt(1, 2)
    for (let c = 0; c < count; c++) {
      await prisma.insuranceClaim.create({
        data: {
          policyId: policy.id,
          claimNumber: `CLM-${randInt(10000, 99999)}`,
          incidentDate: daysAgo(randInt(10, 120)),
          description: pick([
            'Minor fender bender at loading dock',
            'Windshield cracked by road debris',
            'Side mirror damaged in parking lot',
            'Cargo water damage during transit',
            'Tire blowout caused undercarriage damage',
            'Rear bumper collision at truck stop',
            'Vandalism at overnight parking',
            'Hail damage during storm',
          ]),
          amount: randFloat(500, 15000),
          status: pick([ClaimStatus.PENDING, ClaimStatus.PENDING, ClaimStatus.APPROVED, ClaimStatus.PAID, ClaimStatus.DENIED]),
          notes: pick([null, 'Photos submitted', 'Adjuster assigned', 'Awaiting police report', 'Repair estimate received', null]),
          filedAt: daysAgo(randInt(5, 90)),
          resolvedAt: Math.random() > 0.5 ? daysAgo(randInt(1, 30)) : null,
        },
      })
      claimCount++
    }
  }

  // ── Alerts (diverse types and severities) ──────────────────
  console.log('🚨 Creating alerts...')
  const alertDefs: { type: AlertType; severity: AlertSeverity; title: string; msg: (plate: string) => string }[] = [
    { type: AlertType.IDLE_ALERT, severity: AlertSeverity.CRITICAL, title: 'Truck Idle > 4 Hours', msg: p => `${p} has been idle for 5 hours 23 minutes at Dallas, TX` },
    { type: AlertType.IDLE_ALERT, severity: AlertSeverity.WARNING, title: 'Truck Idle > 4 Hours', msg: p => `${p} has been idle for 4 hours 12 minutes at Houston, TX` },
    { type: AlertType.SPEEDING, severity: AlertSeverity.WARNING, title: 'Speeding Detected', msg: p => `${p} clocked at 82 mph in a 70 mph zone on I-35` },
    { type: AlertType.SPEEDING, severity: AlertSeverity.CRITICAL, title: 'Severe Speeding', msg: p => `${p} clocked at 91 mph in a 65 mph zone near Austin, TX` },
    { type: AlertType.LOW_FUEL, severity: AlertSeverity.WARNING, title: 'Low Fuel Warning', msg: p => `${p} fuel level at 12% — nearest station 45 miles away` },
    { type: AlertType.LOW_FUEL, severity: AlertSeverity.CRITICAL, title: 'Critical Fuel Level', msg: p => `${p} fuel level at 5% — immediate refueling required` },
    { type: AlertType.MAINTENANCE_DUE, severity: AlertSeverity.INFO, title: 'Scheduled Maintenance Due', msg: p => `${p} oil change overdue by 1,200 miles` },
    { type: AlertType.MAINTENANCE_DUE, severity: AlertSeverity.WARNING, title: 'Maintenance Overdue', msg: p => `${p} brake inspection overdue by 3 weeks` },
    { type: AlertType.INSURANCE_EXPIRY_WARNING, severity: AlertSeverity.WARNING, title: 'Insurance Expiring Soon', msg: p => `Insurance for ${p} expires in 21 days` },
    { type: AlertType.INSURANCE_EXPIRY_CRITICAL, severity: AlertSeverity.CRITICAL, title: 'Insurance Expires in 5 Days', msg: p => `Insurance for ${p} expires in 5 days — renew immediately` },
    { type: AlertType.LICENSE_EXPIRY, severity: AlertSeverity.WARNING, title: 'Driver License Expiring', msg: _ => `Driver James Rodriguez license expires in 18 days` },
    { type: AlertType.GEOFENCE_EXIT, severity: AlertSeverity.INFO, title: 'Geofence Exit', msg: p => `${p} exited the Dallas metro service area` },
    { type: AlertType.GEOFENCE_ENTER, severity: AlertSeverity.INFO, title: 'Geofence Enter', msg: p => `${p} entered the Houston depot zone` },
    { type: AlertType.UNAUTHORIZED_MOVEMENT, severity: AlertSeverity.CRITICAL, title: 'Unauthorized Movement', msg: p => `${p} ignition on and moving outside scheduled hours (2:47 AM)` },
    { type: AlertType.SOS, severity: AlertSeverity.CRITICAL, title: 'SOS Emergency', msg: _ => `Driver Maria Garcia triggered SOS near Laredo, TX` },
  ]

  let alertCount = 0
  for (let a = 0; a < alertDefs.length; a++) {
    const def = alertDefs[a]
    const truck = trucks[a % trucks.length]
    const isAcked = a > 8
    await prisma.alert.create({
      data: {
        organizationId: org.id,
        truckId: truck.id,
        userId: pick([owner.id, manager.id]),
        type: def.type,
        severity: def.severity,
        title: def.title,
        message: def.msg(truck.licensePlate),
        acknowledged: isAcked,
        acknowledgedAt: isAcked ? daysAgo(randInt(0, 3)) : null,
        acknowledgedBy: isAcked ? pick([owner.id, manager.id]) : null,
        createdAt: daysAgo(randInt(0, 14)),
      },
    })
    alertCount++
  }

  // ── Summary ────────────────────────────────────────────────
  console.log('\n✅ Seed completed!')
  console.log(`   🏢 1 organization (Texas Freight Co.)`)
  console.log(`   👤 3 users (owner/manager/driver — password: password123)`)
  console.log(`   🚚 ${drivers.length} drivers (3 with licenses expiring soon)`)
  console.log(`   🚛 ${trucks.length} trucks`)
  console.log(`   🛣️  ${trips.length} trips`)
  console.log(`   📦 ${proofs.length} delivery proofs with media`)
  console.log(`   🔧 ${maintCount} maintenance records`)
  console.log(`   ⛽ ${fuelCount} fuel logs`)
  console.log(`   📋 ${policies.length} insurance policies (~6 expiring soon)`)
  console.log(`   📄 ${claimCount} insurance claims`)
  console.log(`   🚨 ${alertCount} alerts (mixed severities, some acknowledged)`)
  console.log(`\n   Login: owner@texasfreight.com / password123`)
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
