import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = (result.error as ZodError).issues.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));

      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'The request body could not be validated.',
          requestId: req.id,
          details,
        },
      });
      return;
    }

    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const details = (result.error as ZodError).issues.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));

      res.status(400).json({
        success: false,
        error: {
          code: 'QUERY_VALIDATION_ERROR',
          message: 'Query parameters could not be validated.',
          requestId: req.id,
          details,
        },
      });
      return;
    }

    req.query = result.data as any;
    next();
  };
}
