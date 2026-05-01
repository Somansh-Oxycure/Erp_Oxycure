import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

interface PrismaClientKnownRequestError {
  code: string;
  meta?: Record<string, unknown>;
  message: string;
}

function isPrismaKnownError(error: unknown): error is PrismaClientKnownRequestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as Record<string, unknown>).code === 'string'
  );
}

/**
 * Maps common Prisma error codes to NestJS HTTP exceptions.
 * Call this in the catch blocks of service methods that do Prisma writes.
 *
 * P2002 — Unique constraint violation  → ConflictException
 * P2025 — Record not found             → NotFoundException
 * Other                                → InternalServerErrorException
 */
export function handlePrismaError(error: unknown): never {
  if (isPrismaKnownError(error)) {
    switch (error.code) {
      case 'P2002': {
        const fields = (error.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
        throw new ConflictException(`A record with this ${fields} already exists`);
      }
      case 'P2025':
        throw new NotFoundException(
          (error.meta?.cause as string | undefined) ?? 'Record not found',
        );
      default:
        throw new InternalServerErrorException('An unexpected database error occurred');
    }
  }
  throw new InternalServerErrorException('An unexpected error occurred');
}
