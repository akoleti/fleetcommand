/**
 * POST /api/auth/refresh
 * Owner: AUTH-01
 * 
 * Refresh access token using refresh token from cookie
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma, handlePrismaError } from '@/lib/db'
import { 
  verifyRefreshToken, 
  generateAccessToken, 
  generateRefreshToken,
  getRefreshTokenExpiryDate 
} from '@/lib/jwt'

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie
    const refreshToken = request.cookies.get('refreshToken')?.value

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token not found', code: 'MISSING_REFRESH_TOKEN' },
        { status: 401 }
      )
    }

    // Verify the refresh token JWT
    const payload = verifyRefreshToken(refreshToken)
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token', code: 'INVALID_REFRESH_TOKEN' },
        { status: 401 }
      )
    }

    // Check if refresh token exists in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            organizationId: true,
            isActive: true,
          },
        },
      },
    })

    if (!storedToken) {
      return NextResponse.json(
        { error: 'Refresh token not found', code: 'TOKEN_NOT_FOUND' },
        { status: 401 }
      )
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      // Delete expired token
      await prisma.refreshToken.delete({
        where: { id: storedToken.id },
      })

      return NextResponse.json(
        { error: 'Refresh token expired', code: 'TOKEN_EXPIRED' },
        { status: 401 }
      )
    }

    // Check if user is still active
    if (!storedToken.user.isActive) {
      // Delete all user's refresh tokens
      await prisma.refreshToken.deleteMany({
        where: { userId: storedToken.user.id },
      })

      return NextResponse.json(
        { error: 'Account is disabled', code: 'ACCOUNT_DISABLED' },
        { status: 403 }
      )
    }

    // Generate new access token
    const newAccessToken = generateAccessToken({
      userId: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role,
      organizationId: storedToken.user.organizationId,
    })

    // Optionally rotate refresh token (more secure but may cause issues with concurrent requests)
    const shouldRotateRefreshToken = process.env.ROTATE_REFRESH_TOKEN === 'true'
    
    let newRefreshToken = refreshToken
    
    if (shouldRotateRefreshToken) {
      // Delete old token
      await prisma.refreshToken.delete({
        where: { id: storedToken.id },
      })

      // Generate and store new refresh token
      newRefreshToken = generateRefreshToken({
        userId: storedToken.user.id,
        email: storedToken.user.email,
        role: storedToken.user.role,
        organizationId: storedToken.user.organizationId,
      })

      await prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: storedToken.user.id,
          expiresAt: getRefreshTokenExpiryDate(),
        },
      })
    }

    // Build response
    const response = NextResponse.json(
      {
        accessToken: newAccessToken,
        message: 'Token refreshed successfully',
      },
      { status: 200 }
    )

    // Update refresh token cookie if rotated
    if (shouldRotateRefreshToken) {
      response.cookies.set('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      })
    }

    return response
  } catch (error) {
    console.error('Token refresh error:', error)
    
    const prismaError = handlePrismaError(error)
    if (prismaError.code !== 'UNKNOWN_ERROR') {
      return NextResponse.json(
        { error: prismaError.message, code: prismaError.code },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Token refresh failed', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
