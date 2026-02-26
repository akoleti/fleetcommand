/**
 * POST /api/auth/change-password - Change user password
 */

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { withAuth } from '@/middleware/auth'
import { prisma, handlePrismaError } from '@/lib/db'

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const { user } = request
    const body = await request.json()

    const { currentPassword, newPassword, confirmPassword } = body

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'Current password, new password, and confirmation are required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'New password and confirmation do not match', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { passwordHash: true },
    })

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    const isValid = await bcrypt.compare(currentPassword, dbUser.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect', code: 'INVALID_PASSWORD' },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
      where: { id: user.userId },
      data: { passwordHash },
    })

    return NextResponse.json({ success: true, message: 'Password updated successfully' })
  } catch (error) {
    console.error('POST /api/auth/change-password error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})
