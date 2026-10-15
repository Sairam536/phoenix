import { z } from 'zod';
import { RECONCILIATION_STATUSES } from '../constants/index.js';

export const ToleranceConfigSchema = z.object({
  amount_tolerance: z.number().min(0).default(0.01),
  percentage_tolerance: z.number().min(0).max(100).default(0.5),
});
export type ToleranceConfig = z.infer<typeof ToleranceConfigSchema>;

export const LineItemComparisonSchema = z.object({
  invoice_line_index: z.number().int().nullable().optional(),
  po_line_index: z.number().int().nullable().optional(),
  description: z.string(),
  invoice_quantity: z.number().nullable().optional(),
  po_quantity: z.number().nullable().optional(),
  quantity_diff: z.number().nullable().optional(),
  invoice_price: z.number().nullable().optional(),
  po_price: z.number().nullable().optional(),
  price_diff: z.number().nullable().optional(),
  status: z.enum(['matched', 'quantity_diff', 'price_diff', 'missing_in_po', 'missing_in_invoice']),
  note: z.string().optional(),
});
export type LineItemComparison = z.infer<typeof LineItemComparisonSchema>;

export const ComparisonResultSchema = z.object({
  match_status: z.enum(RECONCILIATION_STATUSES),
  supplier_match: z.object({
    matched: z.boolean(),
    invoice_supplier: z.string().nullable().optional(),
    po_supplier: z.string().nullable().optional(),
  }),
  currency_match: z.object({
    matched: z.boolean(),
    invoice_currency: z.string().nullable().optional(),
    po_currency: z.string().nullable().optional(),
  }),
  po_reference_match: z.object({
    matched: z.boolean(),
    expected_po: z.string().nullable().optional(),
    invoice_referenced_po: z.string().nullable().optional(),
  }),
  amount_comparison: z.object({
    invoice_subtotal: z.number().nullable().optional(),
    po_subtotal: z.number().nullable().optional(),
    subtotal_diff: z.number().default(0),
    invoice_tax: z.number().nullable().optional(),
    po_tax: z.number().nullable().optional(),
    tax_diff: z.number().default(0),
    invoice_total: z.number().nullable().optional(),
    po_total: z.number().nullable().optional(),
    total_diff: z.number().default(0),
    within_tolerance: z.boolean().default(true),
  }),
  line_item_comparisons: z.array(LineItemComparisonSchema).default([]),
  discrepancies: z.array(z.string()).default([]),
  notes: z.string().optional(),
});
export type ComparisonResult = z.infer<typeof ComparisonResultSchema>;

export const CreateReconciliationSchema = z.object({
  invoice_document_id: z.string().uuid(),
  purchase_order_document_id: z.string().uuid(),
  tolerance_config: ToleranceConfigSchema.optional(),
});
export type CreateReconciliationInput = z.infer<typeof CreateReconciliationSchema>;

export const ReviewReconciliationSchema = z.object({
  status: z.enum(['matched', 'mismatched', 'rejected']),
  review_note: z.string().optional(),
});
export type ReviewReconciliationInput = z.infer<typeof ReviewReconciliationSchema>;

export const ReconciliationRecordSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  invoice_document_id: z.string().uuid(),
  purchase_order_document_id: z.string().uuid(),
  status: z.enum(RECONCILIATION_STATUSES),
  comparison_result: ComparisonResultSchema,
  tolerance_config: ToleranceConfigSchema.default({}),
  created_by: z.string().uuid(),
  reviewed_by: z.string().uuid().nullable().optional(),
  reviewed_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  // Joined documents for UI
  invoice_document: z.record(z.unknown()).optional(),
  purchase_order_document: z.record(z.unknown()).optional(),
});
export type ReconciliationRecord = z.infer<typeof ReconciliationRecordSchema>;
