/**
 * GET /api/auth/me - Current authenticated user
 * PATCH /api/auth/me - Update profile (name, email, phone)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'
import { prisma, handlePrismaError } from '@/lib/db'

export const GET = withAuth(async (request) => {
  try {
    const { user } = request

    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        organizationId: true,
        organization: {
          select: { id: true, name: true },
        },
      },
    })

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json(dbUser)
  } catch (error) {
    console.error('GET /api/auth/me error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})

export const PATCH = withAuth(async (request: NextRequest) => {
  try {
    const { user } = request
    const body = await request.json()

    const { name, email, phone } = body

    const updateData: { name?: string; email?: string; phone?: string | null } = {}

    if (name !== undefined) {
      const trimmed = typeof name === 'string' ? name.trim() : ''
      if (!trimmed) {
        return NextResponse.json(
          { error: 'Name is required', code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }
      updateData.name = trimmed
    }

    if (email !== undefined) {
      const trimmed = typeof email === 'string' ? email.trim() : ''
      if (!trimmed) {
        return NextResponse.json(
          { error: 'Email is required', code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }
      const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
      if (!emailRegex.test(trimmed)) {
        return NextResponse.json(
          { error: 'Invalid email address', code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }
      const existing = await prisma.user.findUnique({
        where: { email: trimmed },
      })
      if (existing && existing.id !== user.userId) {
        return NextResponse.json(
          { error: 'Email is already in use', code: 'EMAIL_TAKEN' },
          { status: 409 }
        )
      }
      updateData.email = trimmed
    }

    if (phone !== undefined) {
      updateData.phone = phone === '' || phone == null ? null : String(phone).trim()
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const updated = await prisma.user.update({
      where: { id: user.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        organizationId: true,
        organization: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/auth/me error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})
