/**
 * Drivers API - List and Create
 * Owner: FLEET-01
 * 
 * GET /api/drivers - List all drivers
 * POST /api/drivers - Create new driver (owner only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRole } from '@/middleware/auth'
import { prisma } from '@/lib/db'
import { getPaginationParams, createPaginatedResult, handlePrismaError } from '@/lib/db'
import { UserRole, DriverStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

/**
 * GET /api/drivers
 * 
 * Query params:
 * - status: available|on_trip|off_duty|suspended|all (default: all)
 * - search: search by name, license number
 * - page: page number (default: 1)
 * - limit: items per page (default: 20, max: 100)
 * 
 * RBAC:
 * - OWNER/MANAGER: see all drivers
 * - DRIVER: see only themselves
 */
export const GET = withAuth(async (request) => {
  try {
    const { user } = request
    const { searchParams } = new URL(request.url)
    
    const statusParam = searchParams.get('status') || 'all'
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Build where clause
    const where: any = {
      organizationId: user.organizationId,
    }

    // RBAC: Drivers can only see themselves
    if (user.role === UserRole.DRIVER) {
      where.userId = user.userId
    }

    // Status filter
    if (statusParam !== 'all') {
      const statusMap: Record<string, DriverStatus> = {
        'available': DriverStatus.AVAILABLE,
        'on_trip': DriverStatus.ON_TRIP,
        'off_duty': DriverStatus.OFF_DUTY,
        'suspended': DriverStatus.SUSPENDED,
      }
      
      const mappedStatus = statusMap[statusParam]
      if (mappedStatus) {
        where.status = mappedStatus
      }
    }

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { licenseNumber: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Pagination
    const { skip, take } = getPaginationParams({ page, limit })

    // Fetch drivers with related data
    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        skip,
        take,
        include: {
          assignedTrucks: {
            select: {
              id: true,
              vin: true,
              licensePlate: true,
              make: true,
              model: true,
              status: true,
            },
          },
          trips: {
            where: {
              status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
            },
            select: {
              id: true,
              status: true,
              scheduledStart: true,
              destinationAddress: true,
            },
            orderBy: { scheduledStart: 'asc' },
            take: 1,
          },
        },
        orderBy: [
          { status: 'asc' },
          { name: 'asc' },
        ],
      }),
      prisma.driver.count({ where }),
    ])

    // Add computed fields
    const driversWithStats = await Promise.all(
      drivers.map(async (driver) => {
        // Get trip stats
        const tripStats = await prisma.trip.aggregate({
          where: {
            driverId: driver.id,
            status: 'COMPLETED',
          },
          _count: { id: true },
        })

        return {
          ...driver,
          totalTripsCompleted: tripStats._count.id,
          assignedTruck: driver.assignedTrucks[0] || null,
          currentTrip: driver.trips[0] || null,
        }
      })
    )

    return NextResponse.json(
      createPaginatedResult(driversWithStats, total, { page, limit })
    )
  } catch (error) {
    console.error('GET /api/drivers error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json(
      { error: message, code },
      { status: 500 }
    )
  }
})

/**
 * POST /api/drivers
 * 
 * Create new driver + user account (OWNER only)
 * 
 * Body:
 * - name: string
 * - email: string (unique)
 * - password: string (min 8 chars)
 * - licenseNumber: string
 * - licenseExpiry: ISO date string
 * - phone: string
 */
export const POST = withRole(UserRole.OWNER)(async (request) => {
  try {
    const { user } = request
    const body = await request.json()

    // Validate required fields
    const { name, email, password, licenseNumber, licenseExpiry, phone } = body
    
    if (!name || !email || !password || !licenseNumber || !licenseExpiry || !phone) {
      return NextResponse.json(
        { 
          error: 'Missing required fields: name, email, password, licenseNumber, licenseExpiry, phone',
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      )
    }

    // Validate password
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Validate license expiry date
    const expiryDate = new Date(licenseExpiry)
    if (isNaN(expiryDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid license expiry date', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Check for existing user with same email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists', code: 'DUPLICATE_EMAIL' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user + driver in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user account
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
          role: UserRole.DRIVER,
          organizationId: user.organizationId,
          phone,
        },
      })

      // Create driver profile
      const driver = await tx.driver.create({
        data: {
          organizationId: user.organizationId,
          userId: newUser.id,
          name,
          licenseNumber,
          licenseExpiry: expiryDate,
          phone,
          status: DriverStatus.AVAILABLE,
        },
        include: {
          assignedTrucks: {
            select: {
              id: true,
              vin: true,
              licensePlate: true,
              make: true,
              model: true,
            },
          },
        },
      })

      return { user: newUser, driver }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('POST /api/drivers error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json(
      { error: message, code },
      { status: 500 }
    )
  }
})
