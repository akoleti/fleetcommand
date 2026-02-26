/**
 * POST /api/auth/register
 * Owner: AUTH-01
 * 
 * Register a new user account
 */

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma, handlePrismaError } from '@/lib/db'
import { generateTokenPair, getRefreshTokenExpiryDate } from '@/lib/jwt'
import { UserRole } from '@prisma/client'

// Request validation schema
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['OWNER', 'MANAGER', 'DRIVER']),
  organizationId: z.string().uuid('Invalid organization ID').optional(),
  organizationName: z.string().min(2).optional(),
  phone: z.string().optional(),
})

type RegisterInput = z.infer<typeof registerSchema>

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validationResult = registerSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          code: 'VALIDATION_ERROR',
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const input: RegisterInput = validationResult.data

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered', code: 'EMAIL_EXISTS' },
        { status: 409 }
      )
    }

    // Handle organization
    let organizationId: string

    if (input.role === 'OWNER' && input.organizationName) {
      // Create new organization for owner
      const org = await prisma.organization.create({
        data: {
          name: input.organizationName,
          settings: {},
        },
      })
      organizationId = org.id
    } else if (input.organizationId) {
      // Verify organization exists
      const org = await prisma.organization.findUnique({
        where: { id: input.organizationId },
      })
      if (!org) {
        return NextResponse.json(
          { error: 'Organization not found', code: 'ORG_NOT_FOUND' },
          { status: 404 }
        )
      }
      organizationId = input.organizationId
    } else {
      return NextResponse.json(
        { error: 'Organization ID or name required', code: 'ORG_REQUIRED' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        role: input.role as UserRole,
        organizationId,
        phone: input.phone,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        phone: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    })

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: getRefreshTokenExpiryDate(),
      },
    })

    // Set refresh token as httpOnly cookie
    const response = NextResponse.json(
      {
        user,
        accessToken: tokens.accessToken,
        message: 'Registration successful',
      },
      { status: 201 }
    )

    response.cookies.set('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Registration error:', error)
    
    const prismaError = handlePrismaError(error)
    if (prismaError.code !== 'UNKNOWN_ERROR') {
      return NextResponse.json(
        { error: prismaError.message, code: prismaError.code },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Registration failed', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
