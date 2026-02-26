/**
 * POST /api/auth/logout
 * Owner: AUTH-01
 * 
 * Logout user by invalidating refresh token
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie
    const refreshToken = request.cookies.get('refreshToken')?.value

    if (refreshToken) {
      // Delete the refresh token from database
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      })
    }

    // Clear the refresh token cookie
    const response = NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    )

    response.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Logout error:', error)

    // Even if database operation fails, clear the cookie
    const response = NextResponse.json(
      { message: 'Logged out' },
      { status: 200 }
    )

    response.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })

    return response
  }
}
