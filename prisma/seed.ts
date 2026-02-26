/**
 * Prisma Seed Script
 * Owner: DB-01
 * 
 * Seeds the database with:
 * - 1 organization
 * - 3 users (1 owner, 1 manager, 1 driver)
 * - 30 trucks
 * - 30 drivers
 * - Sample trips, maintenance records, and fuel logs
 */

import { PrismaClient, UserRole, TruckStatus, DriverStatus, TripStatus, MaintenanceType, MaintenanceStatus, AlertType, AlertSeverity } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const TRUCK_MAKES = ['Freightliner', 'Peterbilt', 'Kenworth', 'Volvo', 'Mack', 'International']
const TRUCK_MODELS = ['Cascadia', '579', 'T680', 'VNL', 'Anthem', 'LT']

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals))
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateVIN(): string {
  const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'
  let vin = ''
  for (let i = 0; i < 17; i++) {
    vin += chars[Math.floor(Math.random() * chars.length)]
  }
  return vin
}

function generateLicensePlate(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  return `${letters[randomInt(0, 25)]}${letters[randomInt(0, 25)]}${letters[randomInt(0, 25)]}-${numbers[randomInt(0, 9)]}${numbers[randomInt(0, 9)]}${numbers[randomInt(0, 9)]}${numbers[randomInt(0, 9)]}`
}

// Texas cities with coordinates for realistic data
const TEXAS_CITIES = [
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
]

const DRIVER_NAMES = [
  'James Rodriguez', 'Maria Garcia', 'John Smith', 'Sarah Johnson', 'Michael Brown',
  'Emily Davis', 'David Wilson', 'Lisa Anderson', 'Robert Taylor', 'Jennifer Thomas',
  'William Jackson', 'Amanda White', 'Joseph Harris', 'Michelle Martin', 'Charles Thompson',
  'Ashley Garcia', 'Christopher Martinez', 'Jessica Robinson', 'Daniel Clark', 'Stephanie Lewis',
  'Matthew Lee', 'Nicole Walker', 'Andrew Hall', 'Samantha Allen', 'Joshua Young',
  'Elizabeth King', 'Kevin Wright', 'Brittany Scott', 'Ryan Green', 'Lauren Adams',
]

async function main() {
  console.log('🌱 Starting seed...')

  // Clean existing data
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

  // Create organization
  console.log('🏢 Creating organization...')
  const org = await prisma.organization.create({
    data: {
      name: 'Texas Freight Co.',
      settings: {
        timezone: 'America/Chicago',
        idleThresholdMinutes: 240,
        speedLimitMph: 75,
        defaultFuelUnit: 'gallons',
      },
    },
  })

  // Create users
  console.log('👤 Creating users...')
  const passwordHash = await bcrypt.hash('password123', 12)

  const owner = await prisma.user.create({
    data: {
      email: 'owner@texasfreight.com',
      passwordHash,
      name: 'John Owner',
      role: UserRole.OWNER,
      organizationId: org.id,
      phone: '+15551234567',
    },
  })

  const manager = await prisma.user.create({
    data: {
      email: 'manager@texasfreight.com',
      passwordHash,
      name: 'Jane Manager',
      role: UserRole.MANAGER,
      organizationId: org.id,
      phone: '+15552345678',
    },
  })

  await prisma.user.create({
    data: {
      email: 'driver@texasfreight.com',
      passwordHash,
      name: 'Bob Driver',
      role: UserRole.DRIVER,
      organizationId: org.id,
      phone: '+15553456789',
    },
  })

  // Create drivers
  console.log('🚚 Creating 30 drivers...')
  const drivers = await Promise.all(
    DRIVER_NAMES.map((name, index) =>
      prisma.driver.create({
        data: {
          organizationId: org.id,
          name,
          licenseNumber: `TX${String(100000 + index).padStart(7, '0')}`,
          licenseExpiry: new Date(Date.now() + randomInt(180, 730) * 24 * 60 * 60 * 1000),
          phone: `+1555${String(1000000 + index).slice(-7)}`,
          status: randomItem([DriverStatus.AVAILABLE, DriverStatus.AVAILABLE, DriverStatus.ON_TRIP, DriverStatus.OFF_DUTY]),
        },
      })
    )
  )

  // Create trucks
  console.log('🚛 Creating 30 trucks...')
  const trucks = await Promise.all(
    Array.from({ length: 30 }, (_, index) =>
      prisma.truck.create({
        data: {
          organizationId: org.id,
          vin: generateVIN(),
          licensePlate: generateLicensePlate(),
          make: randomItem(TRUCK_MAKES),
          model: randomItem(TRUCK_MODELS),
          year: randomInt(2018, 2024),
          status: randomItem([TruckStatus.ACTIVE, TruckStatus.ACTIVE, TruckStatus.ACTIVE, TruckStatus.IDLE, TruckStatus.MAINTENANCE]),
          currentDriverId: drivers[index]?.id,
        },
      })
    )
  )

  // Create truck status (latest position)
  console.log('📍 Creating truck status records...')
  await Promise.all(
    trucks.map((truck) => {
      const city = randomItem(TEXAS_CITIES)
      const lat = city.lat + randomFloat(-0.1, 0.1)
      const lng = city.lng + randomFloat(-0.1, 0.1)
      
      return prisma.truckStatusRecord.create({
        data: {
          truckId: truck.id,
          latitude: lat,
          longitude: lng,
          speed: truck.status === TruckStatus.ACTIVE ? randomFloat(45, 70) : 0,
          heading: randomFloat(0, 360),
          fuelLevel: randomFloat(20, 100),
          ignitionOn: truck.status === TruckStatus.ACTIVE,
          lastPingAt: new Date(Date.now() - randomInt(0, 300) * 1000),
        },
      })
    })
  )

  // Create GPS location history (last 24 hours)
  console.log('🗺️ Creating GPS history...')
  const now = Date.now()
  const oneDayAgo = now - 24 * 60 * 60 * 1000
  
  for (const truck of trucks.slice(0, 10)) { // Only first 10 trucks for performance
    const city = randomItem(TEXAS_CITIES)
    let lat = city.lat
    let lng = city.lng
    
    const locations = []
    for (let time = oneDayAgo; time < now; time += 30000) { // Every 30 seconds
      lat += randomFloat(-0.001, 0.001)
      lng += randomFloat(-0.001, 0.001)
      
      locations.push({
        truckId: truck.id,
        latitude: lat,
        longitude: lng,
        speed: randomFloat(0, 70),
        heading: randomFloat(0, 360),
        fuelLevel: randomFloat(20, 100),
        ignitionOn: Math.random() > 0.2,
        timestamp: new Date(time),
      })
    }
    
    await prisma.gpsLocation.createMany({ data: locations })
  }

  // Create trips
  console.log('🛣️ Creating trips...')
  const trips = await Promise.all(
    trucks.slice(0, 20).map((truck, index) => {
      const origin = randomItem(TEXAS_CITIES)
      let destination = randomItem(TEXAS_CITIES)
      while (destination.name === origin.name) {
        destination = randomItem(TEXAS_CITIES)
      }
      
      const scheduledStart = new Date(Date.now() + randomInt(-7, 7) * 24 * 60 * 60 * 1000)
      const status = scheduledStart < new Date() 
        ? randomItem([TripStatus.COMPLETED, TripStatus.IN_PROGRESS])
        : TripStatus.SCHEDULED
      
      return prisma.trip.create({
        data: {
          truckId: truck.id,
          driverId: drivers[index % drivers.length].id,
          originAddress: `${randomInt(100, 9999)} Main St, ${origin.name}, TX`,
          originLat: origin.lat,
          originLng: origin.lng,
          destinationAddress: `${randomInt(100, 9999)} Commerce St, ${destination.name}, TX`,
          destinationLat: destination.lat,
          destinationLng: destination.lng,
          scheduledStart,
          scheduledEnd: new Date(scheduledStart.getTime() + randomInt(4, 12) * 60 * 60 * 1000),
          status,
          actualStart: status !== TripStatus.SCHEDULED ? scheduledStart : null,
          actualEnd: status === TripStatus.COMPLETED 
            ? new Date(scheduledStart.getTime() + randomInt(4, 12) * 60 * 60 * 1000) 
            : null,
        },
      })
    })
  )

  // Create maintenance records
  console.log('🔧 Creating maintenance records...')
  await Promise.all(
    trucks.slice(0, 15).map((truck) =>
      prisma.maintenance.create({
        data: {
          truckId: truck.id,
          type: randomItem(Object.values(MaintenanceType)),
          status: randomItem([MaintenanceStatus.COMPLETED, MaintenanceStatus.SCHEDULED]),
          description: 'Routine maintenance',
          cost: randomFloat(100, 2000),
          vendor: randomItem(['Quick Lube', 'Truck Pro', 'Fleet Service', 'Highway Repair']),
          scheduledDate: new Date(Date.now() - randomInt(0, 90) * 24 * 60 * 60 * 1000),
          completedDate: new Date(Date.now() - randomInt(0, 30) * 24 * 60 * 60 * 1000),
          nextDueDate: new Date(Date.now() + randomInt(30, 180) * 24 * 60 * 60 * 1000),
          odometer: randomInt(100000, 500000),
        },
      })
    )
  )

  // Create fuel logs
  console.log('⛽ Creating fuel logs...')
  for (const truck of trucks) {
    const fuelLogs = Array.from({ length: randomInt(3, 10) }, () => ({
      truckId: truck.id,
      gallons: randomFloat(50, 150),
      pricePerGallon: randomFloat(3.2, 4.5),
      totalCost: 0,
      odometer: randomInt(100000, 500000),
      station: randomItem(['Pilot', 'Flying J', 'Love\'s', 'TA', 'Petro']),
      latitude: randomItem(TEXAS_CITIES).lat + randomFloat(-0.05, 0.05),
      longitude: randomItem(TEXAS_CITIES).lng + randomFloat(-0.05, 0.05),
      fueledAt: new Date(Date.now() - randomInt(0, 30) * 24 * 60 * 60 * 1000),
    }))
    
    // Calculate total cost
    fuelLogs.forEach(log => {
      log.totalCost = parseFloat((log.gallons * log.pricePerGallon).toFixed(2))
    })
    
    await prisma.fuelLog.createMany({ data: fuelLogs })
  }

  // Create insurance policies
  console.log('📋 Creating insurance policies...')
  const policies = await Promise.all(
    trucks.map((truck) =>
      prisma.insurancePolicy.create({
        data: {
          organizationId: org.id,
          truckId: truck.id,
          provider: randomItem(['State Farm', 'Progressive', 'Geico', 'Allstate', 'Liberty Mutual']),
          policyNumber: `POL-${randomInt(100000, 999999)}`,
          coverageType: randomItem(['Liability', 'Full Coverage', 'Comprehensive']),
          premium: randomFloat(500, 2000),
          deductible: randomItem([500, 1000, 2500]),
          coverageLimit: randomItem([100000, 250000, 500000, 1000000]),
          startDate: new Date(Date.now() - randomInt(30, 365) * 24 * 60 * 60 * 1000),
          expiryDate: new Date(Date.now() + randomInt(30, 365) * 24 * 60 * 60 * 1000),
          isActive: true,
        },
      })
    )
  )

  // Create some alerts
  console.log('🚨 Creating sample alerts...')
  await Promise.all([
    prisma.alert.create({
      data: {
        organizationId: org.id,
        truckId: trucks[0].id,
        userId: owner.id,
        type: AlertType.IDLE_ALERT,
        severity: AlertSeverity.WARNING,
        title: 'Truck Idle Alert',
        message: `Truck ${trucks[0].licensePlate} has been idle for more than 4 hours`,
        acknowledged: false,
      },
    }),
    prisma.alert.create({
      data: {
        organizationId: org.id,
        truckId: trucks[1].id,
        userId: manager.id,
        type: AlertType.MAINTENANCE_DUE,
        severity: AlertSeverity.INFO,
        title: 'Maintenance Due',
        message: `Truck ${trucks[1].licensePlate} is due for scheduled maintenance`,
        acknowledged: true,
        acknowledgedAt: new Date(),
      },
    }),
    prisma.alert.create({
      data: {
        organizationId: org.id,
        truckId: trucks[2].id,
        userId: owner.id,
        type: AlertType.INSURANCE_EXPIRY_WARNING,
        severity: AlertSeverity.WARNING,
        title: 'Insurance Expiring Soon',
        message: `Insurance policy for truck ${trucks[2].licensePlate} expires in 30 days`,
        acknowledged: false,
      },
    }),
  ])

  console.log('✅ Seed completed!')
  console.log(`   - 1 organization`)
  console.log(`   - 3 users`)
  console.log(`   - ${drivers.length} drivers`)
  console.log(`   - ${trucks.length} trucks`)
  console.log(`   - ${trips.length} trips`)
  console.log(`   - ${policies.length} insurance policies`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
