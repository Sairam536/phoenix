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

// CORS configuration (supports local dev, configured FRONTEND_URL, and Vercel domains)
const allowedOrigins = [
  env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://frontend-beryl-ten-26.vercel.app',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        env.NODE_ENV !== 'production'
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
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

// Root health check for cloud platforms (Render, Fly.io, etc.)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'documind-api', timestamp: new Date().toISOString() });
});

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
