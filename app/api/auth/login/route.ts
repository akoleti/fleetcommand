/**
 * POST /api/auth/login
 * Owner: AUTH-01
 * 
 * Authenticate user and return tokens
 */

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma, handlePrismaError } from '@/lib/db'
import { generateTokenPair, getRefreshTokenExpiryDate } from '@/lib/jwt'

// Request validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validationResult = loginSchema.safeParse(body)

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

    const { email, password } = validationResult.data

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        role: true,
        organizationId: true,
        phone: true,
        isActive: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
        { status: 401 }
      )
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is disabled', code: 'ACCOUNT_DISABLED' },
        { status: 403 }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
        { status: 401 }
      )
    }

    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    })

    // Clean up expired refresh tokens for this user
    await prisma.refreshToken.deleteMany({
      where: {
        userId: user.id,
        expiresAt: { lt: new Date() },
      },
    })

    // Store new refresh token
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: getRefreshTokenExpiryDate(),
      },
    })

    // Remove passwordHash from response
    const { passwordHash, ...userResponse } = user

    // Set refresh token as httpOnly cookie
    const response = NextResponse.json(
      {
        user: userResponse,
        accessToken: tokens.accessToken,
        message: 'Login successful',
      },
      { status: 200 }
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
    console.error('Login error:', error)
    
    const prismaError = handlePrismaError(error)
    if (prismaError.code !== 'UNKNOWN_ERROR') {
      return NextResponse.json(
        { error: prismaError.message, code: prismaError.code },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Login failed', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
