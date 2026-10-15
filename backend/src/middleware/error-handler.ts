import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const statusCode = err.statusCode || err.status || 500;
  const requestId = req.id || 'unknown';

  logger.error(
    {
      requestId,
      err: {
        message: err.message,
        stack: err.stack,
        code: err.code,
      },
      url: req.originalUrl,
      method: req.method,
    },
    'Unhandled API Exception'
  );

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred while processing your request.',
      requestId,
      details: err.details || undefined,
    },
  });
}
