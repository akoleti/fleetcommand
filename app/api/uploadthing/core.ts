/**
 * UploadThing FileRouter for delivery proof media (signatures, photos, documents)
 */

import { createUploadthing, type FileRouter } from 'uploadthing/next'
import { UploadThingError } from 'uploadthing/server'
import { z } from 'zod'
import { verifyAccessToken } from '@/lib/jwt'
import { prisma } from '@/lib/db'
import { DeliveryMediaType } from '@prisma/client'

const f = createUploadthing()

function getAuthUser(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  return verifyAccessToken(token)
}

export const ourFileRouter = {
  deliveryMedia: f({
    image: { maxFileSize: '4MB', maxFileCount: 4 },
  })
    .input(
      z.object({
        proofId: z.string().uuid(),
        type: z.enum(['SIGNATURE', 'PHOTO', 'DOCUMENT']),
      })
    )
    .middleware(async ({ req, input }) => {
      const user = getAuthUser(req)
      if (!user) {
        throw new UploadThingError('Unauthorized')
      }

      const proof = await prisma.deliveryProof.findUnique({
        where: { id: input.proofId },
        include: {
          trip: {
            include: { truck: { select: { organizationId: true } } },
          },
        },
      })

      if (!proof || proof.trip.truck.organizationId !== user.organizationId) {
        throw new UploadThingError('Forbidden')
      }

      if (proof.trip.status !== 'IN_PROGRESS') {
        throw new UploadThingError('Trip must be in progress to add proof media')
      }

      return { proofId: input.proofId, type: input.type as DeliveryMediaType }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await prisma.deliveryMedia.create({
        data: {
          proofId: metadata.proofId,
          type: metadata.type,
          fileUrl: file.ufsUrl,
          s3Key: file.key,
          s3Bucket: 'uploadthing',
          mimeType: file.type ?? null,
          fileSize: file.size ?? null,
        },
      })
      return { proofId: metadata.proofId }
    }),

  maintenanceMedia: f({
    image: { maxFileSize: '4MB', maxFileCount: 4 },
  })
    .input(
      z.object({
        proofId: z.string().uuid(),
        type: z.enum(['SIGNATURE', 'PHOTO', 'DOCUMENT']),
      })
    )
    .middleware(async ({ req, input }) => {
      const user = getAuthUser(req)
      if (!user) {
        throw new UploadThingError('Unauthorized')
      }

      const proof = await prisma.maintenanceProof.findUnique({
        where: { id: input.proofId },
        include: {
          maintenance: {
            include: { truck: { select: { organizationId: true } } },
          },
        },
      })

      if (!proof || proof.maintenance.truck.organizationId !== user.organizationId) {
        throw new UploadThingError('Forbidden')
      }

      if (!['SCHEDULED', 'IN_PROGRESS'].includes(proof.maintenance.status)) {
        throw new UploadThingError('Maintenance must be open to add proof media')
      }

      return { proofId: input.proofId, type: input.type as DeliveryMediaType }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await prisma.maintenanceMedia.create({
        data: {
          proofId: metadata.proofId,
          type: metadata.type,
          fileUrl: file.ufsUrl,
          s3Key: file.key,
          s3Bucket: 'uploadthing',
          mimeType: file.type ?? null,
          fileSize: file.size ?? null,
        },
      })
      return { proofId: metadata.proofId }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
