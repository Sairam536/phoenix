import { z } from 'zod';
import { JOB_STATUSES, JOB_TYPES } from '../constants/index.js';

export const ProcessingJobRecordSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  document_id: z.string().uuid(),
  job_type: z.enum(JOB_TYPES),
  status: z.enum(JOB_STATUSES),
  stage: z.string().nullable().optional(),
  attempt_count: z.number().int().min(0),
  max_attempts: z.number().int().min(1),
  idempotency_key: z.string().nullable().optional(),
  error_code: z.string().nullable().optional(),
  error_message: z.string().nullable().optional(),
  worker_id: z.string().nullable().optional(),
  started_at: z.string().nullable().optional(),
  finished_at: z.string().nullable().optional(),
  next_retry_at: z.string().nullable().optional(),
  created_by: z.string().uuid().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  // Joined document title if available
  document_title: z.string().optional(),
});
export type ProcessingJobRecord = z.infer<typeof ProcessingJobRecordSchema>;

export const JobQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(JOB_STATUSES).optional(),
  job_type: z.enum(JOB_TYPES).optional(),
});
export type JobQuery = z.infer<typeof JobQuerySchema>;
