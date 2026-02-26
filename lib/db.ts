/**
 * Database Client
 * Owner: DB-01 (Prisma), AUTH-01 (Error handling)
 * 
 * Centralized Prisma client with connection pooling and error handling
 */

import { PrismaClient, Prisma } from '@prisma/client'

// Prevent multiple instances in development (hot reload)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

/**
 * Error codes for common Prisma errors
 */
export enum PrismaErrorCode {
  UNIQUE_CONSTRAINT = 'P2002',
  FOREIGN_KEY_CONSTRAINT = 'P2003',
  RECORD_NOT_FOUND = 'P2025',
  TIMEOUT = 'P1008',
  CONNECTION_ERROR = 'P1001',
}

/**
 * Custom error response
 */
export interface DatabaseError {
  code: string
  message: string
  field?: string
}

/**
 * Handle Prisma errors and return user-friendly messages
 */
export function handlePrismaError(error: unknown): DatabaseError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case PrismaErrorCode.UNIQUE_CONSTRAINT:
        const target = (error.meta?.target as string[]) || []
        const field = target[0] || 'field'
        return {
          code: 'DUPLICATE_ERROR',
          message: `A record with this ${field} already exists`,
          field,
        }

      case PrismaErrorCode.FOREIGN_KEY_CONSTRAINT:
        return {
          code: 'REFERENCE_ERROR',
          message: 'Referenced record does not exist',
        }

      case PrismaErrorCode.RECORD_NOT_FOUND:
        return {
          code: 'NOT_FOUND',
          message: 'Record not found',
        }

      case PrismaErrorCode.TIMEOUT:
        return {
          code: 'TIMEOUT',
          message: 'Database operation timed out',
        }

      case PrismaErrorCode.CONNECTION_ERROR:
        return {
          code: 'CONNECTION_ERROR',
          message: 'Could not connect to database',
        }

      default:
        console.error('Unhandled Prisma error:', error)
        return {
          code: 'DATABASE_ERROR',
          message: 'A database error occurred',
        }
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Invalid data provided',
    }
  }

  console.error('Unknown error:', error)
  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
  }
}

/**
 * Helper to check if error is a Prisma error
 */
export function isPrismaError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError
}

/**
 * Helper to check for specific Prisma error code
 */
export function hasPrismaErrorCode(error: unknown, code: string): boolean {
  return isPrismaError(error) && error.code === code
}

/**
 * Disconnect Prisma client (for graceful shutdown)
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect()
}

// Graceful shutdown on process termination
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await disconnectDatabase()
  })
}
