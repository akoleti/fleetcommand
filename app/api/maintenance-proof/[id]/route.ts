/**
 * Single Maintenance Proof API - Get proof with media URLs
 *
 * GET /api/maintenance-proof/[id] - Get proof with presigned/media URLs
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

    const proof = await prisma.maintenanceProof.findUnique({
      where: { id },
      include: {
        maintenance: {
          select: {
            id: true,
            status: true,
            type: true,
            truckId: true,
            truck: {
              select: {
                organizationId: true,
                make: true,
                model: true,
                licensePlate: true,
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
        { error: 'Maintenance proof not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    if (proof.maintenance.truck.organizationId !== user.organizationId) {
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
    console.error('GET /api/maintenance-proof/[id] error:', error)
    const { code, message } = handlePrismaError(error)
    return NextResponse.json({ error: message, code }, { status: 500 })
  }
})
