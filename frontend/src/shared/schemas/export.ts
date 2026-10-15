import { z } from 'zod';
import { DOCUMENT_CATEGORIES } from '../constants/index.js';

export const ExportRequestSchema = z.object({
  data_type: z.enum(['documents', 'reconciliations', 'validation_issues', 'audit_events']),
  category: z.enum(DOCUMENT_CATEGORIES).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  limit: z.number().int().min(1).max(10000).default(1000),
});
export type ExportRequest = z.infer<typeof ExportRequestSchema>;
