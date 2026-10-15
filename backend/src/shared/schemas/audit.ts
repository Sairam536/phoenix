import { z } from 'zod';

export const AuditEventRecordSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  actor_id: z.string().uuid().nullable().optional(),
  action: z.string(),
  entity_type: z.string(),
  entity_id: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
  request_id: z.string().nullable().optional(),
  created_at: z.string(),
  actor_email: z.string().optional(),
});
export type AuditEventRecord = z.infer<typeof AuditEventRecordSchema>;

export const ReviewEventRecordSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  document_id: z.string().uuid(),
  actor_id: z.string().uuid(),
  action: z.enum(['field_edited', 'approved', 'rejected', 'reopened', 'validation_resolved']),
  reason: z.string().nullable().optional(),
  changes: z.array(z.record(z.unknown())).default([]),
  created_at: z.string(),
  actor_email: z.string().optional(),
});
export type ReviewEventRecord = z.infer<typeof ReviewEventRecordSchema>;

export const AuditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().optional(),
  entity_type: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});
export type AuditQuery = z.infer<typeof AuditQuerySchema>;
