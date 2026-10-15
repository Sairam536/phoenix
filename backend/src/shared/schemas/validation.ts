import { z } from 'zod';
import { ISSUE_STATUSES, VALIDATION_SEVERITY } from '../constants/index.js';

export const RULE_CODES = [
  'MISSING_REQUIRED_FIELD',
  'INVALID_DATE_FORMAT',
  'DUE_DATE_BEFORE_INVOICE_DATE',
  'LINE_ITEM_ARITHMETIC_MISMATCH',
  'TOTAL_TAX_SUBTOTAL_MISMATCH',
  'UNSUPPORTED_CURRENCY',
  'INVALID_NUMERICAL_VALUE',
  'DUPLICATE_INVOICE_NUMBER',
  'MISSING_PURCHASE_ORDER_REFERENCE',
  'SUPPLIER_MISMATCH',
  'LOW_EXTRACTION_CONFIDENCE',
  'EVIDENCE_UNAVAILABLE',
  'DISCOUNT_EXCEEDS_SUBTOTAL',
] as const;
export type RuleCode = (typeof RULE_CODES)[number];

export const ValidationIssueSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  document_id: z.string().uuid(),
  extraction_result_id: z.string().uuid().nullable().optional(),
  rule_code: z.string(),
  severity: z.enum(VALIDATION_SEVERITY),
  field_path: z.string().nullable().optional(),
  message: z.string(),
  expected_value: z.unknown().optional(),
  actual_value: z.unknown().optional(),
  status: z.enum(ISSUE_STATUSES).default('open'),
  resolved_by: z.string().uuid().nullable().optional(),
  resolved_at: z.string().nullable().optional(),
  created_at: z.string(),
});
export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;

export const CreateValidationIssueSchema = z.object({
  rule_code: z.string(),
  severity: z.enum(VALIDATION_SEVERITY),
  field_path: z.string().nullable().optional(),
  message: z.string(),
  expected_value: z.unknown().optional(),
  actual_value: z.unknown().optional(),
});
export type CreateValidationIssueInput = z.infer<typeof CreateValidationIssueSchema>;

export const ResolveIssueSchema = z.object({
  resolution_note: z.string().optional(),
});
export type ResolveIssueInput = z.infer<typeof ResolveIssueSchema>;
