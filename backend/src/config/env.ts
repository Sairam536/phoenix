import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

// Load .env from cwd, backend/.env, or parent .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
if (typeof __dirname !== 'undefined') {
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  API_BASE_PATH: z.string().default('/api/v1'),
  APP_BASE_URL: z.string().default('http://localhost:5173'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  // Supabase
  SUPABASE_URL: z.string().url().default('https://placeholder-project.supabase.co'),
  SUPABASE_ANON_KEY: z.string().default('placeholder-anon-key'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default('placeholder-service-role-key'),
  SUPABASE_STORAGE_BUCKET: z.string().default('documents'),

  // Gemini AI
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),

  // Limits
  MAX_FILE_SIZE_MB: z.coerce.number().default(20),
  MAX_PDF_PAGES: z.coerce.number().default(100),
  MAX_BATCH_UPLOAD_FILES: z.coerce.number().default(20),

  // Job & Worker
  MAX_CONCURRENT_JOBS: z.coerce.number().default(3),
  MAX_JOB_ATTEMPTS: z.coerce.number().default(3),
  JOB_POLL_INTERVAL_MS: z.coerce.number().default(3000),

  // AI Controls
  MAX_AI_INPUT_CHARS: z.coerce.number().default(50000),
  MAX_AI_OUTPUT_TOKENS: z.coerce.number().default(8192),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().default(60000),
  AI_MAX_RETRIES: z.coerce.number().default(3),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // Export
  MAX_EXPORT_ROWS: z.coerce.number().default(10000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  ENABLE_DEMO_MODE: z.coerce.boolean().default(true),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  throw new Error('Environment configuration error.');
}

export const env = parsed.data;
export type Env = typeof env;
