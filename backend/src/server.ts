import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { jobProcessor } from './workers/job-processor.js';

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  logger.info(
    {
      port: PORT,
      env: env.NODE_ENV,
      apiBase: env.API_BASE_PATH,
    },
    `DocuMind AI Server listening on port ${PORT}`
  );

  // Start background job queue polling worker
  jobProcessor.startWorker(env.JOB_POLL_INTERVAL_MS);
});

// Graceful shutdown
const shutdown = (signal: string) => {
  logger.info({ signal }, 'Received shutdown signal. Closing server...');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });

  // Force close if still hanging after 10s
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
