import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Catches every unhandled exception and returns a consistent JSON shape:
 * { statusCode, message, error, timestamp, path }
 *
 * Stack traces are never sent to the client in production.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx      = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request  = ctx.getRequest<Request>();

    let status  = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error   = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>;
        message = (body.message as string | string[]) ?? message;
        error   = (body.error as string) ?? HttpStatus[status] ?? error;
      }

      // Normalise validation arrays to keep the shape predictable
      if (Array.isArray(message)) {
        error   = 'Validation Failed';
        // message stays as string[] — callers can iterate
      }
    } else {
      // Unhandled / non-HTTP exception
      const isProduction = process.env.NODE_ENV === 'production';

      if (exception instanceof Error) {
        this.logger.error(
          `[${request.method}] ${request.url} — ${exception.message}`,
          isProduction ? undefined : exception.stack,
        );
        // Never leak internal error details in production
        message = isProduction ? 'Internal server error' : exception.message;
      } else {
        this.logger.error(`Unknown exception on ${request.url}`, String(exception));
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
