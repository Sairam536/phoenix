import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { standardRateLimiter } from './middleware/rate-limit.js';
import { errorHandler } from './middleware/error-handler.js';
import { apiRouter } from './routes/api.router.js';

export const app = express();

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Handled by frontend or configured for previews
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
app.use(
  cors({
    origin: [env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id', 'X-Request-Id'],
  })
);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID & Logging
app.use(requestIdMiddleware);
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: req => req.url?.includes('/health') || req.url?.includes('/ready'),
    },
  })
);

// Standard rate limiter for all general routes
app.use(standardRateLimiter);

// Mount versioned API
app.use(env.API_BASE_PATH, apiRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `The endpoint ${req.method} ${req.originalUrl} does not exist.`,
      requestId: req.id,
    },
  });
});

// Global error handler
app.use(errorHandler);
