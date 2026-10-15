import { z } from 'zod';
import { DOCUMENT_CATEGORIES } from '../constants/index.js';

export const KnowledgeSourceReferenceSchema = z.object({
  document_id: z.string().uuid(),
  document_title: z.string().optional(),
  page: z.number().int().positive().nullable().optional(),
  quote: z.string(),
});
export type KnowledgeSourceReference = z.infer<typeof KnowledgeSourceReferenceSchema>;

export const AskQuestionSchema = z.object({
  question: z.string().min(3, 'Question must be at least 3 characters').max(2000),
  document_ids: z.array(z.string().uuid()).optional(),
  category: z.enum(DOCUMENT_CATEGORIES).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});
export type AskQuestionInput = z.infer<typeof AskQuestionSchema>;

export const KnowledgeAnswerResponseSchema = z.object({
  answer: z.string(),
  supported: z.boolean(),
  sources: z.array(KnowledgeSourceReferenceSchema).default([]),
  limitations: z.array(z.string()).default([]),
});
export type KnowledgeAnswerResponse = z.infer<typeof KnowledgeAnswerResponseSchema>;

export const KnowledgeQueryRecordSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  user_id: z.string().uuid(),
  question: z.string(),
  answer: z.string().nullable().optional(),
  source_references: z.array(KnowledgeSourceReferenceSchema).default([]),
  status: z.enum(['pending', 'completed', 'failed']),
  model_name: z.string().nullable().optional(),
  error_code: z.string().nullable().optional(),
  created_at: z.string(),
  completed_at: z.string().nullable().optional(),
});
export type KnowledgeQueryRecord = z.infer<typeof KnowledgeQueryRecordSchema>;
