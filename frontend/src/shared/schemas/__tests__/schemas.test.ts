import { describe, it, expect } from 'vitest';
import {
  InvoiceExtractionSchema,
  PurchaseOrderExtractionSchema,
  ClassificationResultSchema,
  ToleranceConfigSchema,
  ComparisonResultSchema,
  AskQuestionSchema,
} from '../../index.js';

describe('Shared Zod Schemas Validation', () => {
  it('validates invoice extraction schema correctly', () => {
    const validInvoice = {
      schema_version: 'invoice.v1',
      supplier_name: 'TechGear Solutions Inc.',
      invoice_number: 'INV-2026-4401',
      invoice_date: '2026-09-15',
      due_date: '2026-10-15',
      currency: 'USD',
      subtotal: '2360.00',
      tax_amount: '0.00',
      total_amount: '2360.00',
      line_items: [
        {
          description: 'Dell 27" 4K Monitor',
          quantity: '4',
          unit_price: '450.00',
          line_total: '1800.00',
        },
      ],
      field_evidence: [
        {
          field_path: 'invoice_number',
          page: 1,
          quote: 'INVOICE: INV-2026-4401',
          confidence: 0.99,
          verified: true,
        },
      ],
    };

    const parsed = InvoiceExtractionSchema.safeParse(validInvoice);
    expect(parsed.success).toBe(true);
  });

  it('validates classification schema with confidence bound between 0 and 1', () => {
    const validClassification = {
      category: 'invoice',
      confidence: 0.95,
      reason: 'Contains invoice number and payment totals',
      evidence: [{ page: 1, quote: 'Invoice #123' }],
      recommended_schema: 'invoice',
      requires_review: false,
    };
    expect(ClassificationResultSchema.safeParse(validClassification).success).toBe(true);

    const invalidConfidence = {
      ...validClassification,
      confidence: 1.5, // Invalid > 1
    };
    expect(ClassificationResultSchema.safeParse(invalidConfidence).success).toBe(false);
  });

  it('rejects unsupported categories in classification schema', () => {
    const invalidCategory = {
      category: 'crypto_wallet',
      confidence: 0.8,
      reason: 'Unknown file',
      evidence: [],
      recommended_schema: 'unknown',
    };
    expect(ClassificationResultSchema.safeParse(invalidCategory).success).toBe(false);
  });

  it('validates reconciliation comparison result structure', () => {
    const comparison = {
      match_status: 'matched',
      supplier_match: { matched: true, invoice_supplier: 'Acme', po_supplier: 'Acme' },
      currency_match: { matched: true, invoice_currency: 'USD', po_currency: 'USD' },
      po_reference_match: { matched: true, expected_po: 'PO-100', invoice_referenced_po: 'PO-100' },
      amount_comparison: {
        invoice_total: 100,
        po_total: 100,
        total_diff: 0,
        within_tolerance: true,
      },
      line_item_comparisons: [],
      discrepancies: [],
    };
    expect(ComparisonResultSchema.safeParse(comparison).success).toBe(true);
  });

  it('validates natural language knowledge question bounds', () => {
    expect(AskQuestionSchema.safeParse({ question: 'Hi' }).success).toBe(false); // min 3
    expect(AskQuestionSchema.safeParse({ question: 'What is the payment term for invoice 4401?' }).success).toBe(true);
  });
});
