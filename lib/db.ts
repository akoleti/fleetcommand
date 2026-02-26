/**
 * Prisma Database Client Singleton
 * Owner: DB-01
 * 
 * This module provides a singleton instance of the Prisma client
 * to prevent connection pool exhaustion in serverless environments.
 */

import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  })
}

export const prisma = globalThis.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

export default prisma

/**
 * Helper to handle Prisma errors consistently
 */
export function handlePrismaError(error: unknown): { code: string; message: string } {
  if (error instanceof Error && 'code' in error) {
    const prismaError = error as { code: string; message: string }
    
    switch (prismaError.code) {
      case 'P2002':
        return { code: 'CONFLICT', message: 'A record with this value already exists' }
      case 'P2025':
        return { code: 'NOT_FOUND', message: 'Record not found' }
      case 'P2003':
        return { code: 'FOREIGN_KEY', message: 'Related record not found' }
      default:
        return { code: 'DATABASE_ERROR', message: prismaError.message }
    }
  }
  
  return { code: 'UNKNOWN_ERROR', message: 'An unexpected database error occurred' }
}

/**
 * Helper for pagination
 */
export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export function getPaginationParams(params: PaginationParams): { skip: number; take: number } {
  const page = Math.max(1, params.page || 1)
  const limit = Math.min(100, Math.max(1, params.limit || 20))
  
  return {
    skip: (page - 1) * limit,
    take: limit,
  }
}

export function createPaginatedResult<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResult<T> {
  const page = Math.max(1, params.page || 1)
  const limit = Math.min(100, Math.max(1, params.limit || 20))
  const totalPages = Math.ceil(total / limit)

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  }
}
