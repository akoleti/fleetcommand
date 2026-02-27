/**
 * Delivery Proof Media API
 * Owner: DP-03
 *
 * GET /api/delivery-proof/[id]/media - List media with presigned download URLs
 * POST /api/delivery-proof/[id]/media - Create media record + presigned upload URL
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'
import { prisma, handlePrismaError } from '@/lib/db'
import {
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  S3_BUCKETS,
  generateS3Key,
} from '@/lib/s3'
import { DeliveryMediaType } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string }>
}

export const GET = withAuth(async (request: NextRequest, { params }: RouteParams) => {
  try {
    const { user } = request
    const { id: proofId } = await params

    const proof = await prisma.deliveryProof.findUnique({
      where: { id: proofId },
      include: {
        trip: {
          include: { truck: { select: { organizationId: true } } },
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

    const media = await prisma.deliveryMedia.findMany({
      where: { proofId },
      orderBy: { createdAt: 'asc' },
    })

    const mediaWithUrls = await Promise.all(
      media.map(async (m) => {
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

    return NextResponse.json({ media: mediaWithUrls })
  } catch (error) {
    console.error('GET /api/delivery-proof/[id]/media error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})

export const POST = withAuth(async (request: NextRequest, { params }: RouteParams) => {
  try {
    const { user } = request
    const { id: proofId } = await params
    const body = await request.json()

    const { type, filename, contentType } = body

    if (!type || !filename || !contentType) {
      return NextResponse.json(
        { error: 'Missing required fields: type, filename, contentType', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const validTypes: DeliveryMediaType[] = ['SIGNATURE', 'PHOTO', 'DOCUMENT']
    if (!validTypes.includes(type as DeliveryMediaType)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}`, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const proof = await prisma.deliveryProof.findUnique({
      where: { id: proofId },
      include: {
        trip: {
          include: { truck: { select: { organizationId: true } } },
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

    const s3Key = generateS3Key(`delivery/${proof.tripId}/${proofId}`, filename)
    const bucket = S3_BUCKETS.DELIVERY

    const { url: uploadUrl } = await generatePresignedUploadUrl(bucket, s3Key, contentType)

    const media = await prisma.deliveryMedia.create({
      data: {
        proofId,
        type: type as DeliveryMediaType,
        s3Key,
        s3Bucket: bucket,
        mimeType: contentType,
      },
    })

    return NextResponse.json(
      {
        media: {
          id: media.id,
          type: media.type,
          mimeType: media.mimeType,
          createdAt: media.createdAt,
        },
        uploadUrl,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/delivery-proof/[id]/media error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})
