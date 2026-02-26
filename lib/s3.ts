/**
 * S3 Infrastructure
 * Owner: DP-01
 *
 * Provides S3 client singleton, presigned URL generation, and object management.
 */

import { S3 } from 'aws-sdk'
import { randomUUID } from 'crypto'

let s3Client: S3 | null = null

function getS3Client(): S3 {
  if (!s3Client) {
    s3Client = new S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      region: process.env.AWS_REGION!,
      signatureVersion: 'v4',
    })
  }
  return s3Client
}

export const S3_BUCKETS = {
  DELIVERY: process.env.S3_BUCKET_DELIVERY!,
  INSURANCE: process.env.S3_BUCKET_INSURANCE!,
  REPORTS: process.env.S3_BUCKET_REPORTS!,
} as const

export type S3BucketKey = keyof typeof S3_BUCKETS

export function generateS3Key(prefix: string, filename: string): string {
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `${prefix}/${randomUUID()}-${sanitized}`
}

export async function generatePresignedUploadUrl(
  bucket: string,
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<{ url: string; key: string }> {
  const s3 = getS3Client()
  const url = await s3.getSignedUrlPromise('putObject', {
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    Expires: expiresIn,
  })
  return { url, key }
}

export async function generatePresignedDownloadUrl(
  bucket: string,
  key: string,
  expiresIn = 3600
): Promise<string> {
  const s3 = getS3Client()
  return s3.getSignedUrlPromise('getObject', {
    Bucket: bucket,
    Key: key,
    Expires: expiresIn,
  })
}

export async function deleteObject(bucket: string, key: string): Promise<void> {
  const s3 = getS3Client()
  await s3.deleteObject({ Bucket: bucket, Key: key }).promise()
}
