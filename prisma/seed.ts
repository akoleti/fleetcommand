import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

import {
  PrismaClient, UserRole, TruckStatus, DriverStatus, TripStatus,
  MaintenanceType, MaintenanceStatus, AlertType, AlertSeverity,
  ClaimStatus, DeliveryMediaType,
} from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const TRUCK_MAKES = ['Tata', 'Ashok Leyland', 'Mahindra', 'Eicher', 'BharatBenz', 'Volvo Eicher', 'SML Isuzu']
const TRUCK_MODELS: Record<string, string[]> = {
  Tata: ['Signa', 'Prima', 'Ultra', 'LPT', 'LPT 3118', '407 Gold SFC', 'Ace Gold'],
  'Ashok Leyland': ['Dost', 'Bada Dost', 'Partner', 'Boss', 'Captain', 'Ecomet', 'Ecomet 1615'],
  Mahindra: ['Blazo', 'Blazo X', 'Furio', 'Truxo', 'Jeeto', 'JAYO'],
  Eicher: ['Pro', 'Pro 6031', 'Pro 6042', 'Pro 2049', 'Pro 3015', 'Pro 3019', 'Skyline'],
  BharatBenz: ['3128R', '4828R', '3128T', '1617R', '1214R', '2528R'],
  'Volvo Eicher': ['Pro 6031', 'Pro 6042', 'Pro 2115', 'Pro 3015'],
  'SML Isuzu': ['S-Cab', 'MAGNUM', 'REX', 'D-MAX'],
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
  return `TS 02 ${L[randInt(0, 25)]}${L[randInt(0, 25)]} ${N[randInt(0, 9)]}${N[randInt(0, 9)]}${N[randInt(0, 9)]}${N[randInt(0, 9)]}`
}

const CITIES = [
  { name: 'Karimnagar', lat: 18.4386, lng: 79.1288 },
  { name: 'Warangal', lat: 17.9689, lng: 79.5941 },
  { name: 'Nizamabad', lat: 18.6715, lng: 78.0948 },
  { name: 'Sircilla', lat: 18.3885, lng: 78.8104 },
  { name: 'Jagtial', lat: 18.7897, lng: 78.9167 },
  { name: 'Peddapalli', lat: 18.6167, lng: 79.3833 },
  { name: 'Nirmal', lat: 18.9500, lng: 78.2000 },
  { name: 'Ramagundam', lat: 18.7550, lng: 79.4740 },
  { name: 'Mancherial', lat: 18.8700, lng: 79.4300 },
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { name: 'Khammam', lat: 17.2477, lng: 80.1437 },
  { name: 'Adilabad', lat: 19.6667, lng: 78.5333 },
]

const STREETS = ['Main Road', 'NH 563', 'Industrial Area', 'Godavarikhani Road', 'Depot Road', 'Warehouse Lane', 'Transport Nagar', 'RTC Depot Road']

const DRIVER_NAMES = [
  'Rajesh Kumar', 'Suresh Reddy', 'Venkatesh Goud', 'Murali Sharma', 'Prakash Naidu',
  'Lakshmi Devi', 'Anil Kumar', 'Srinivas Rao', 'Ramesh Patel', 'Kiran Reddy',
  'Vijay Bhaskar', 'Mahesh Yadav', 'Chandra Sekhar', 'Nageshwar Rao', 'Satish Kumar',
  'Ravi Teja', 'Siva Prasad', 'Madhu Sudhan', 'Krishna Mohan', 'Raju Goud',
  'Babu Rao', 'Narayana Swamy', 'Venkat Rao', 'Subba Rao', 'Hanumanthu',
  'Ramakrishna', 'Santhosh Kumar', 'Gopal Reddy', 'Mohan Reddy', 'Srinivas Goud',
]

const MAINTENANCE_DESCRIPTIONS: Record<string, string[]> = {
  OIL_CHANGE: ['Engine oil change', 'Oil change + filter replacement', 'Full service oil change'],
  TIRE_ROTATION: ['Tyre rotation and balance', 'Tyre rotation + alignment', 'Tyre replacement (2 worn)'],
  BRAKE_SERVICE: ['Brake pad replacement (front)', 'Full brake service', 'Brake inspection + disc resurfacing'],
  ENGINE_REPAIR: ['EGR valve replacement', 'Turbocharger service', 'Fuel injector cleaning'],
  TRANSMISSION: ['Gear oil change', 'Clutch plate replacement', 'Transmission overhaul'],
  ELECTRICAL: ['Alternator replacement', 'Starter motor repair', 'Battery and wiring repair'],
  BODY_WORK: ['Body panel repair', 'Bumper replacement', 'Windshield replacement'],
  INSPECTION: ['Fitness certificate renewal', 'PUC inspection', 'RTO annual inspection'],
  OTHER: ['AC compressor replacement', 'Exhaust repair', 'Fifth wheel maintenance'],
}

const FUEL_STATIONS = ['Indian Oil', 'Bharat Petroleum', 'Hindustan Petroleum', 'Reliance', 'Shell India', 'Essar', 'HP Petrol Pump Karimnagar', 'BPCL Sircilla']

function addr(city: typeof CITIES[0]) { return `${randInt(1, 999)} ${pick(STREETS)}, ${city.name}, Telangana ${randInt(505001, 505530)}` }

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
      name: 'Karimnagar Transport & Logistics',
      settings: { timezone: 'Asia/Kolkata', idleThresholdMinutes: 240, speedLimitKmh: 80, defaultFuelUnit: 'liters', defaultCurrency: 'INR' },
    },
  })

  // ── Users ──────────────────────────────────────────────────
  console.log('👤 Creating users...')
  const hash = await bcrypt.hash('password123', 12)

  const owner = await prisma.user.create({
    data: { email: 'owner@karimnagartransport.in', passwordHash: hash, name: 'Ramesh Agarwal', role: UserRole.OWNER, organizationId: org.id, phone: '+919876543210' },
  })
  const manager = await prisma.user.create({
    data: { email: 'manager@karimnagartransport.in', passwordHash: hash, name: 'Lakshmi Reddy', role: UserRole.MANAGER, organizationId: org.id, phone: '+919876543211' },
  })
  await prisma.user.create({
    data: { email: 'driver@karimnagartransport.in', passwordHash: hash, name: 'Rajesh Kumar', role: UserRole.DRIVER, organizationId: org.id, phone: '+919876543212' },
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
          licenseNumber: `TS02${String(2018000000 + i).slice(-10)}`,
          licenseExpiry: daysFromNow(expiresIn),
          phone: `+91${String(9876500000 + i).slice(-10)}`,
          status: pick(driverStatuses),
        },
      })
    })
  )

  // ── Trucks ─────────────────────────────────────────────────
  console.log('🚛 Creating 30 trucks...')
  const TRUCK_NAMES = [
    'Red Bull', 'Thunder', 'Road King', 'Maverick', 'Iron Horse',
    'Telangana Express', 'Blaze', 'Titan', 'Ranger', 'Shadow',
    'Bullet', 'Storm', 'Eagle', 'Patriot', 'Godavari',
    'Midnight', 'Viper', 'Phoenix', 'Summit', 'Atlas',
    'Ghost', 'Manjeera', 'Nomad', 'Stallion', 'Frontier',
    'Rebel', 'Canyon', 'Mustang', 'Dakota', 'Ironclad',
  ]
  const truckStatuses = [TruckStatus.ACTIVE, TruckStatus.ACTIVE, TruckStatus.ACTIVE, TruckStatus.IDLE, TruckStatus.MAINTENANCE, TruckStatus.ACTIVE]
  const trucks = await Promise.all(
    Array.from({ length: 30 }, (_, i) => {
      const make = pick(TRUCK_MAKES)
      return prisma.truck.create({
        data: {
          organizationId: org.id,
          name: TRUCK_NAMES[i],
          vin: generateVIN(),
          licensePlate: generatePlate(),
          make,
          model: pick(TRUCK_MODELS[make]),
          year: randInt(2018, 2025),
          status: pick(truckStatuses),
          currentDriverId: drivers[i]?.id,
          fuelTankCapacityGallons: randInt(40, 55),
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
          speed: truck.status === TruckStatus.ACTIVE ? randFloat(40, 80) : 0,
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
        createdById: pick([owner.id, manager.id]),
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
        recipientName: pick(['Srinivas Reddy', 'Lakshmi Devi', 'Ramesh Kumar', 'Anitha Rao', 'Prakash Goud', 'Venkatesh Sharma', 'Godown Manager', 'Front Office', 'Loading Bay #2']),
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
          cost: isCompleted ? randFloat(1500, 45000) : null,
          vendor: pick(['Karimnagar Auto Works', 'Warangal Truck Service', 'Sircilla Fleet Care', 'Jagtial Motors', 'Ramagundam Diesel Service', 'Telangana Transport Repairs']),
          scheduledDate,
          completedDate: isCompleted ? new Date(scheduledDate.getTime() + randInt(1, 5) * 86400000) : null,
          nextDueDate: daysFromNow(randInt(30, 240)),
          nextDueMileage: randInt(10000, 50000),
          odometer: randInt(80000, 600000),
          notes: pick([null, null, 'Parts on backorder — 2-day delay', 'Warranty claim submitted', 'Recurring issue — monitor closely', null]),
          createdById: pick([owner.id, manager.id]),
        },
      })
      maintCount++
    }
  }

  // ── Fuel Logs (rich history per truck) ─────────────────────
  console.log('⛽ Creating fuel logs...')
  let fuelCount = 0
  for (const truck of trucks) {
    let odo = randInt(50000, 250000)
    const entries = randInt(5, 15)
    const logs = []
    for (let f = 0; f < entries; f++) {
      odo += randInt(200, 800)
      const gallons = randFloat(40, 120)
      const ppg = randFloat(250, 380)
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
        createdById: pick([owner.id, manager.id]),
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
        provider: pick(['ICICI Lombard', 'Bajaj Allianz', 'New India Assurance', 'United India', 'Oriental Insurance', 'National Insurance']),
        policyNumber: `MTPL/TS/2024/${randInt(100000, 999999)}`,
        coverageType: pick(['Third Party Liability', 'Comprehensive', 'Package Policy', 'Cargo Insurance', 'Act Policy']),
        premium: randFloat(15000, 85000),
        deductible: pick([5000, 10000, 15000, 25000]),
        coverageLimit: pick([750000, 1500000, 2500000, 5000000]),
        startDate: daysAgo(startDays),
        expiryDate: daysFromNow(expiryDays),
        isActive: true,
        createdById: pick([owner.id, manager.id]),
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
          claimNumber: `CLM/TS/${randInt(2023, 2024)}/${randInt(10000, 99999)}`,
          incidentDate: daysAgo(randInt(10, 120)),
          description: pick([
            'Minor collision at godown loading area',
            'Windshield cracked by road debris on NH 563',
            'Side mirror damaged in Karimnagar market',
            'Cargo water damage during monsoon transit',
            'Tyre burst caused undercarriage damage',
            'Rear bumper collision at Sircilla truck stop',
            'Vandalism at overnight parking in Warangal',
            'Hail damage during storm near Nizamabad',
          ]),
          amount: randFloat(5000, 150000),
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
    { type: AlertType.IDLE_ALERT, severity: AlertSeverity.CRITICAL, title: 'Truck Idle > 4 Hours', msg: p => `${p} has been idle for 5 hours 23 minutes at Karimnagar` },
    { type: AlertType.IDLE_ALERT, severity: AlertSeverity.WARNING, title: 'Truck Idle > 4 Hours', msg: p => `${p} has been idle for 4 hours 12 minutes at Warangal` },
    { type: AlertType.SPEEDING, severity: AlertSeverity.WARNING, title: 'Speeding Detected', msg: p => `${p} clocked at 95 km/h in a 80 km/h zone on NH 563` },
    { type: AlertType.SPEEDING, severity: AlertSeverity.CRITICAL, title: 'Severe Speeding', msg: p => `${p} clocked at 110 km/h in a 60 km/h zone near Sircilla` },
    { type: AlertType.LOW_FUEL, severity: AlertSeverity.WARNING, title: 'Low Fuel Warning', msg: p => `${p} fuel level at 12% — nearest pump 35 km away` },
    { type: AlertType.LOW_FUEL, severity: AlertSeverity.CRITICAL, title: 'Critical Fuel Level', msg: p => `${p} fuel level at 5% — immediate refueling required` },
    { type: AlertType.MAINTENANCE_DUE, severity: AlertSeverity.INFO, title: 'Scheduled Maintenance Due', msg: p => `${p} oil change overdue by 1,200 km` },
    { type: AlertType.MAINTENANCE_DUE, severity: AlertSeverity.WARNING, title: 'Maintenance Overdue', msg: p => `${p} brake inspection overdue by 3 weeks` },
    { type: AlertType.INSURANCE_EXPIRY_WARNING, severity: AlertSeverity.WARNING, title: 'Insurance Expiring Soon', msg: p => `Insurance for ${p} expires in 21 days` },
    { type: AlertType.INSURANCE_EXPIRY_CRITICAL, severity: AlertSeverity.CRITICAL, title: 'Insurance Expires in 5 Days', msg: p => `Insurance for ${p} expires in 5 days — renew immediately` },
    { type: AlertType.LICENSE_EXPIRY, severity: AlertSeverity.WARNING, title: 'Driver License Expiring', msg: _ => `Driver Rajesh Kumar license expires in 18 days` },
    { type: AlertType.GEOFENCE_EXIT, severity: AlertSeverity.INFO, title: 'Geofence Exit', msg: p => `${p} exited the Karimnagar district service area` },
    { type: AlertType.GEOFENCE_ENTER, severity: AlertSeverity.INFO, title: 'Geofence Enter', msg: p => `${p} entered the Warangal depot zone` },
    { type: AlertType.UNAUTHORIZED_MOVEMENT, severity: AlertSeverity.CRITICAL, title: 'Unauthorized Movement', msg: p => `${p} ignition on and moving outside scheduled hours (2:47 AM)` },
    { type: AlertType.SOS, severity: AlertSeverity.CRITICAL, title: 'SOS Emergency', msg: _ => `Driver Suresh Reddy triggered SOS near Jagtial` },
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
  console.log(`   🏢 1 organization (Karimnagar Transport & Logistics)`)
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
  console.log(`\n   Login: owner@karimnagartransport.in / password123`)
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
