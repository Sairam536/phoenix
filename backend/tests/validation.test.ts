import { describe, it, expect } from 'vitest';
import { validationService } from '../src/services/validation.service.js';
import { InvoiceExtraction } from '../src/shared/index.js';

describe('Deterministic Domain Validation Service', () => {
  it('detects missing required fields', () => {
    const invalidInvoice: InvoiceExtraction = {
      schema_version: 'invoice.v1',
      invoice_number: null, // Missing!
      total_amount: null, // Missing!
      line_items: [],
      field_evidence: [],
      uncertainties: [],
      warnings: [],
    };

    const res = validationService.validateInvoice(invalidInvoice, 'org-1', 'doc-1');
    expect(res.isValid).toBe(false);
    expect(res.issues.some(i => i.rule_code === 'MISSING_REQUIRED_FIELD' && i.field_path === 'invoice_number')).toBe(true);
    expect(res.issues.some(i => i.rule_code === 'MISSING_REQUIRED_FIELD' && i.field_path === 'total_amount')).toBe(true);
  });

  it('detects line item arithmetic mismatch (qty * price != total)', () => {
    const arithmeticErrorInvoice: InvoiceExtraction = {
      schema_version: 'invoice.v1',
      invoice_number: 'INV-001',
      invoice_date: '2026-09-01',
      total_amount: '1000.00',
      currency: 'USD',
      line_items: [
        {
          description: 'Widget A',
          quantity: '10',
          unit_price: '50.00',
          line_total: '600.00', // 10 * 50 = 500, but says 600
        },
      ],
      field_evidence: [],
      uncertainties: [],
      warnings: [],
    };

    const res = validationService.validateInvoice(arithmeticErrorInvoice, 'org-1', 'doc-1');
    expect(res.isValid).toBe(false);
    expect(res.issues.some(i => i.rule_code === 'LINE_ITEM_ARITHMETIC_MISMATCH')).toBe(true);
  });

  it('detects total reconciliation mismatch (subtotal + tax - discount != total)', () => {
    const totalMismatchInvoice: InvoiceExtraction = {
      schema_version: 'invoice.v1',
      invoice_number: 'INV-002',
      invoice_date: '2026-09-01',
      subtotal: '1000.00',
      tax_amount: '100.00',
      discount: '50.00',
      total_amount: '1200.00', // Expected 1000 + 100 - 50 = 1050, but says 1200
      currency: 'USD',
      line_items: [],
      field_evidence: [],
      uncertainties: [],
      warnings: [],
    };

    const res = validationService.validateInvoice(totalMismatchInvoice, 'org-1', 'doc-1');
    expect(res.isValid).toBe(false);
    expect(res.issues.some(i => i.rule_code === 'TOTAL_TAX_SUBTOTAL_MISMATCH')).toBe(true);
  });

  it('detects due date preceding invoice date', () => {
    const dateMismatchInvoice: InvoiceExtraction = {
      schema_version: 'invoice.v1',
      invoice_number: 'INV-003',
      invoice_date: '2026-10-15',
      due_date: '2026-09-15', // Due before issued!
      total_amount: '500.00',
      currency: 'USD',
      line_items: [],
      field_evidence: [],
      uncertainties: [],
      warnings: [],
    };

    const res = validationService.validateInvoice(dateMismatchInvoice, 'org-1', 'doc-1');
    expect(res.issues.some(i => i.rule_code === 'DUE_DATE_BEFORE_INVOICE_DATE')).toBe(true);
  });
});
