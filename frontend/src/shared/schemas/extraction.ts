import { z } from 'zod';
import { DOCUMENT_CATEGORIES } from '../constants/index.js';
import { ClassificationEvidenceSchema, SourceEvidenceSchema } from './evidence.js';

export const ClassificationResultSchema = z.object({
  category: z.enum(DOCUMENT_CATEGORIES),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
  evidence: z.array(ClassificationEvidenceSchema).default([]),
  recommended_schema: z.string(),
  requires_review: z.boolean().default(false),
});
export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

// Invoice Line Item
export const InvoiceLineItemSchema = z.object({
  description: z.string(),
  quantity: z.string().nullable().optional(),
  unit_price: z.string().nullable().optional(),
  line_total: z.string().nullable().optional(),
  page: z.number().int().positive().nullable().optional(),
  evidence_quote: z.string().nullable().optional(),
});
export type InvoiceLineItem = z.infer<typeof InvoiceLineItemSchema>;

// Invoice Schema v1
export const InvoiceExtractionSchema = z.object({
  schema_version: z.literal('invoice.v1').default('invoice.v1'),
  supplier_name: z.string().nullable().optional(),
  supplier_address: z.string().nullable().optional(),
  supplier_tax_id: z.string().nullable().optional(),
  invoice_number: z.string().nullable().optional(),
  invoice_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  subtotal: z.string().nullable().optional(),
  tax_amount: z.string().nullable().optional(),
  discount: z.string().nullable().optional(),
  total_amount: z.string().nullable().optional(),
  payment_terms: z.string().nullable().optional(),
  purchase_order_reference: z.string().nullable().optional(),
  line_items: z.array(InvoiceLineItemSchema).default([]),
  field_evidence: z.array(SourceEvidenceSchema).default([]),
  uncertainties: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});
export type InvoiceExtraction = z.infer<typeof InvoiceExtractionSchema>;

// Purchase Order Line Item
export const PurchaseOrderLineItemSchema = z.object({
  description: z.string(),
  quantity: z.string().nullable().optional(),
  unit_price: z.string().nullable().optional(),
  line_total: z.string().nullable().optional(),
  page: z.number().int().positive().nullable().optional(),
  evidence_quote: z.string().nullable().optional(),
});
export type PurchaseOrderLineItem = z.infer<typeof PurchaseOrderLineItemSchema>;

// Purchase Order Schema v1
export const PurchaseOrderExtractionSchema = z.object({
  schema_version: z.literal('purchase_order.v1').default('purchase_order.v1'),
  purchase_order_number: z.string().nullable().optional(),
  buyer_name: z.string().nullable().optional(),
  supplier_name: z.string().nullable().optional(),
  issue_date: z.string().nullable().optional(),
  expected_delivery_date: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  subtotal: z.string().nullable().optional(),
  tax_amount: z.string().nullable().optional(),
  total_amount: z.string().nullable().optional(),
  delivery_address: z.string().nullable().optional(),
  line_items: z.array(PurchaseOrderLineItemSchema).default([]),
  field_evidence: z.array(SourceEvidenceSchema).default([]),
  uncertainties: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});
export type PurchaseOrderExtraction = z.infer<typeof PurchaseOrderExtractionSchema>;

// Contract Schema v1
export const ContractExtractionSchema = z.object({
  schema_version: z.literal('contract.v1').default('contract.v1'),
  contract_title: z.string().nullable().optional(),
  parties: z.array(z.string()).default([]),
  effective_date: z.string().nullable().optional(),
  expiration_date: z.string().nullable().optional(),
  renewal_terms: z.string().nullable().optional(),
  termination_terms: z.string().nullable().optional(),
  payment_terms: z.string().nullable().optional(),
  obligations: z.array(z.string()).default([]),
  deadlines: z.array(z.string()).default([]),
  important_clauses: z.array(z.string()).default([]),
  field_evidence: z.array(SourceEvidenceSchema).default([]),
  uncertainties: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});
export type ContractExtraction = z.infer<typeof ContractExtractionSchema>;

// Receipt Schema v1
export const ReceiptExtractionSchema = z.object({
  schema_version: z.literal('receipt.v1').default('receipt.v1'),
  merchant: z.string().nullable().optional(),
  transaction_date: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  subtotal: z.string().nullable().optional(),
  tax_amount: z.string().nullable().optional(),
  total_amount: z.string().nullable().optional(),
  expense_category: z.string().nullable().optional(),
  payment_method: z.string().nullable().optional(),
  field_evidence: z.array(SourceEvidenceSchema).default([]),
  uncertainties: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});
export type ReceiptExtraction = z.infer<typeof ReceiptExtractionSchema>;

// Business Document (Report / Correspondence) Schema v1
export const BusinessDocumentExtractionSchema = z.object({
  schema_version: z.literal('business_document.v1').default('business_document.v1'),
  title: z.string().nullable().optional(),
  document_type: z.enum(['report', 'correspondence', 'other', 'unknown']).default('report'),
  author_or_sender: z.string().nullable().optional(),
  document_date: z.string().nullable().optional(),
  summary: z.string().default(''),
  topics: z.array(z.string()).default([]),
  entities: z.array(z.string()).default([]),
  key_findings: z.array(z.string()).default([]),
  action_items: z.array(z.string()).default([]),
  deadlines: z.array(z.string()).default([]),
  field_evidence: z.array(SourceEvidenceSchema).default([]),
  uncertainties: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});
export type BusinessDocumentExtraction = z.infer<typeof BusinessDocumentExtractionSchema>;

// Validation Advisory
export const ValidationAdvisoryItemSchema = z.object({
  code: z.string(),
  severity: z.enum(['info', 'warning', 'error', 'critical']),
  field_path: z.string().nullable().optional(),
  message: z.string(),
  evidence: z.array(SourceEvidenceSchema).default([]),
  recommended_action: z.string(),
});
export type ValidationAdvisoryItem = z.infer<typeof ValidationAdvisoryItemSchema>;

export const ValidationAdvisoryResponseSchema = z.object({
  advisories: z.array(ValidationAdvisoryItemSchema).default([]),
});
export type ValidationAdvisoryResponse = z.infer<typeof ValidationAdvisoryResponseSchema>;

// Semantic Matching
export const SemanticLineMatchSchema = z.object({
  invoice_line_index: z.number().int().min(0),
  purchase_order_line_index: z.number().int().min(0),
  semantic_similarity: z.number().min(0).max(1),
  reason: z.string(),
  requires_review: z.boolean().default(true),
});
export type SemanticLineMatch = z.infer<typeof SemanticLineMatchSchema>;

export const SemanticMatchResponseSchema = z.object({
  matches: z.array(SemanticLineMatchSchema).default([]),
  unmatched_invoice_lines: z.array(z.number().int().min(0)).default([]),
  unmatched_purchase_order_lines: z.array(z.number().int().min(0)).default([]),
});
export type SemanticMatchResponse = z.infer<typeof SemanticMatchResponseSchema>;
