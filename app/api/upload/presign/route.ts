/**
 * Presigned Upload URL API
 * Owner: DP-01
 *
 * POST /api/upload/presign - Generate a presigned S3 upload URL
 */

import { NextResponse } from 'next/server'
import { withRole } from '@/middleware/auth'
import { S3_BUCKETS, S3BucketKey, generateS3Key, generatePresignedUploadUrl } from '@/lib/s3'
import { UserRole } from '@prisma/client'

export const POST = withRole(UserRole.OWNER, UserRole.MANAGER)(async (request) => {
  try {
    const body = await request.json()
    const { bucket, filename, contentType } = body as {
      bucket?: string
      filename?: string
      contentType?: string
    }

    if (!bucket || !filename || !contentType) {
      return NextResponse.json(
        { error: 'Missing required fields: bucket, filename, contentType', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    if (!(bucket in S3_BUCKETS)) {
      return NextResponse.json(
        { error: `Invalid bucket. Must be one of: ${Object.keys(S3_BUCKETS).join(', ')}`, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const bucketName = S3_BUCKETS[bucket as S3BucketKey]
    const key = generateS3Key(bucket.toLowerCase(), filename)
    const { url: uploadUrl } = await generatePresignedUploadUrl(bucketName, key, contentType)

    return NextResponse.json({ uploadUrl, key, bucket })
  } catch (error) {
    console.error('POST /api/upload/presign error:', error)
    return NextResponse.json(
      { error: 'Failed to generate presigned URL', code: 'S3_ERROR' },
      { status: 500 }
    )
  }
})
