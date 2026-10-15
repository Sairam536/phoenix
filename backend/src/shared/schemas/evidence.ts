import { z } from 'zod';

export const SourceEvidenceSchema = z.object({
  field_path: z.string().optional(),
  page: z.number().int().positive().nullable().optional(),
  quote: z.string().min(1, 'Evidence quote cannot be empty'),
  confidence: z.number().min(0).max(1).nullable().optional(),
  verified: z.boolean().default(false),
});
export type SourceEvidence = z.infer<typeof SourceEvidenceSchema>;

export const ClassificationEvidenceSchema = z.object({
  page: z.number().int().positive().nullable().optional(),
  quote: z.string(),
});
export type ClassificationEvidence = z.infer<typeof ClassificationEvidenceSchema>;
