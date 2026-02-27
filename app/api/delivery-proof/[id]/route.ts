/**
 * Single Delivery Proof API - Get, Update
 * Owner: DP-02
 *
 * GET /api/delivery-proof/[id] - Get proof with presigned media URLs
 * PATCH /api/delivery-proof/[id] - Update proof (notes, syncedAt)
 */

import { NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/middleware/auth'
import { prisma, handlePrismaError } from '@/lib/db'
import { generatePresignedDownloadUrl } from '@/lib/s3'

interface RouteParams {
  params: Promise<{ id: string }>
}

export const GET = withAuth(async (request: AuthenticatedRequest, { params }: RouteParams) => {
  try {
    const { user } = request
    const { id } = await params

    const proof = await prisma.deliveryProof.findUnique({
      where: { id },
      include: {
        trip: {
          select: {
            id: true,
            originAddress: true,
            destinationAddress: true,
            status: true,
            scheduledStart: true,
            actualStart: true,
            actualEnd: true,
            truck: {
              select: {
                id: true,
                organizationId: true,
                make: true,
                model: true,
                licensePlate: true,
              },
            },
            driver: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        media: {
          select: {
            id: true,
            type: true,
            s3Key: true,
            s3Bucket: true,
            fileUrl: true,
            mimeType: true,
            fileSize: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!proof) {
      return NextResponse.json(
        { error: 'Delivery proof not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    if (proof.trip.truck.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    const mediaWithUrls = await Promise.all(
      proof.media.map(async (m) => {
        const downloadUrl =
          m.fileUrl ??
          (m.s3Bucket && m.s3Key ? await generatePresignedDownloadUrl(m.s3Bucket, m.s3Key) : null)
        return {
          id: m.id,
          type: m.type,
          mimeType: m.mimeType,
          fileSize: m.fileSize,
          createdAt: m.createdAt,
          downloadUrl,
        }
      })
    )

    return NextResponse.json({
      ...proof,
      media: mediaWithUrls,
    })
  } catch (error) {
    console.error('GET /api/delivery-proof/[id] error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})

export const PATCH = withAuth(async (request: AuthenticatedRequest, { params }: RouteParams) => {
  try {
    const { user } = request
    const { id } = await params
    const body = await request.json()

    const proof = await prisma.deliveryProof.findUnique({
      where: { id },
      include: {
        trip: {
          include: {
            truck: { select: { organizationId: true } },
          },
        },
      },
    })

    if (!proof) {
      return NextResponse.json(
        { error: 'Delivery proof not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    if (proof.trip.truck.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Access denied', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    const updateData: any = {}

    if (body.notes !== undefined) {
      updateData.notes = body.notes
    }

    if (body.syncedAt !== undefined) {
      updateData.syncedAt = body.syncedAt ? new Date(body.syncedAt) : new Date()
    }

    if (body.recipientName !== undefined) {
      updateData.recipientName = body.recipientName
    }

    const updated = await prisma.deliveryProof.update({
      where: { id },
      data: updateData,
      include: {
        trip: {
          select: {
            id: true,
            originAddress: true,
            destinationAddress: true,
            status: true,
          },
        },
        media: {
          select: {
            id: true,
            type: true,
            mimeType: true,
            createdAt: true,
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/delivery-proof/[id] error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})
