import { z } from 'zod';
import {
  DOCUMENT_CATEGORIES,
  EXTRACTION_METHODS,
  PROCESSING_STATUSES,
  REVIEW_STATUSES,
  VALIDATION_STATUSES,
} from '../constants/index.js';
import { SourceEvidenceSchema } from './evidence.js';

export const UploadDocumentMetadataSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  category: z.enum(DOCUMENT_CATEGORIES).optional().default('unknown'),
  tags: z.array(z.string()).optional().default([]),
  associated_po_id: z.string().uuid().optional(),
});
export type UploadDocumentMetadata = z.infer<typeof UploadDocumentMetadataSchema>;

export const UpdateDocumentMetadataSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  category: z.enum(DOCUMENT_CATEGORIES).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type UpdateDocumentMetadata = z.infer<typeof UpdateDocumentMetadataSchema>;

export const DocumentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  category: z.enum(DOCUMENT_CATEGORIES).optional(),
  processing_status: z.enum(PROCESSING_STATUSES).optional(),
  review_status: z.enum(REVIEW_STATUSES).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  sort_by: z.enum(['created_at', 'title', 'file_size_bytes', 'category']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});
export type DocumentQuery = z.infer<typeof DocumentQuerySchema>;

export const DocumentPageSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  document_id: z.string().uuid(),
  page_number: z.number().int().positive(),
  extracted_text: z.string(),
  extraction_method: z.enum(EXTRACTION_METHODS),
  extraction_metadata: z.record(z.unknown()).default({}),
  created_at: z.string(),
});
export type DocumentPage = z.infer<typeof DocumentPageSchema>;

export const ExtractedFieldSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  document_id: z.string().uuid(),
  extraction_result_id: z.string().uuid(),
  field_path: z.string(),
  field_value: z.unknown(),
  normalized_value: z.unknown(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  evidence: z.array(SourceEvidenceSchema).default([]),
  validation_status: z.enum(VALIDATION_STATUSES).default('unverified'),
  is_manually_edited: z.boolean().default(false),
  edited_by: z.string().uuid().nullable().optional(),
  edited_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ExtractedField = z.infer<typeof ExtractedFieldSchema>;

export const ExtractionResultRecordSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  document_id: z.string().uuid(),
  processing_job_id: z.string().uuid().nullable().optional(),
  schema_version: z.string(),
  extracted_data: z.record(z.unknown()).default({}),
  classification: z.record(z.unknown()).default({}),
  extraction_confidence: z.number().min(0).max(1).nullable().optional(),
  validation_summary: z.record(z.unknown()).default({}),
  model_name: z.string().nullable().optional(),
  prompt_version: z.string().nullable().optional(),
  created_at: z.string(),
});
export type ExtractionResultRecord = z.infer<typeof ExtractionResultRecordSchema>;

export const DocumentRecordSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  uploaded_by: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable().optional(),
  original_filename: z.string(),
  storage_path: z.string(),
  mime_type: z.string(),
  file_size_bytes: z.number().int().positive(),
  sha256_hash: z.string(),
  category: z.enum(DOCUMENT_CATEGORIES),
  processing_status: z.enum(PROCESSING_STATUSES),
  review_status: z.enum(REVIEW_STATUSES),
  extraction_schema_version: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({}),
  uploaded_at: z.string(),
  processed_at: z.string().nullable().optional(),
  approved_at: z.string().nullable().optional(),
  approved_by: z.string().uuid().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  // Joined fields
  pages_count: z.number().optional(),
  validation_issues_count: z.number().optional(),
  extraction_result: ExtractionResultRecordSchema.nullable().optional(),
  fields: z.array(ExtractedFieldSchema).optional(),
});
export type DocumentRecord = z.infer<typeof DocumentRecordSchema>;

export const UpdateExtractedFieldSchema = z.object({
  field_path: z.string(),
  field_value: z.unknown(),
});
export type UpdateExtractedFieldInput = z.infer<typeof UpdateExtractedFieldSchema>;

export const BulkUpdateFieldsSchema = z.object({
  fields: z.array(UpdateExtractedFieldSchema),
});
export type BulkUpdateFieldsInput = z.infer<typeof BulkUpdateFieldsSchema>;
