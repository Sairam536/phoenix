import { describe, it, expect } from 'vitest';
import { reconciliationService } from '../src/services/reconciliation.service.js';
import { InvoiceExtraction, PurchaseOrderExtraction } from '../src/shared/index.js';

describe('Reconciliation Engine', () => {
  const samplePO: PurchaseOrderExtraction = {
    schema_version: 'purchase_order.v1',
    purchase_order_number: 'PO-8820',
    buyer_name: 'Apex Logistics',
    supplier_name: 'TechGear Solutions Inc.',
    issue_date: '2026-09-10',
    currency: 'USD',
    subtotal: '2360.00',
    tax_amount: '0.00',
    total_amount: '2360.00',
    line_items: [
      { description: 'UltraSharp 27" 4K Monitor', quantity: '4', unit_price: '450.00', line_total: '1800.00' },
      { description: 'Thunderbolt 4 Docking Station', quantity: '4', unit_price: '140.00', line_total: '560.00' },
    ],
    field_evidence: [],
    uncertainties: [],
    warnings: [],
  };

  it('matches identical invoice and purchase order', () => {
    const matchingInvoice: InvoiceExtraction = {
      schema_version: 'invoice.v1',
      invoice_number: 'INV-4401',
      supplier_name: 'TechGear Solutions Inc.',
      purchase_order_reference: 'PO-8820',
      currency: 'USD',
      subtotal: '2360.00',
      tax_amount: '0.00',
      total_amount: '2360.00',
      line_items: [
        { description: 'UltraSharp 27" 4K Monitor', quantity: '4', unit_price: '450.00', line_total: '1800.00' },
        { description: 'Thunderbolt 4 Docking Station', quantity: '4', unit_price: '140.00', line_total: '560.00' },
      ],
      field_evidence: [],
      uncertainties: [],
      warnings: [],
    };

    const result = reconciliationService.reconcile(matchingInvoice, samplePO);
    expect(result.match_status).toBe('matched');
    expect(result.supplier_match.matched).toBe(true);
    expect(result.currency_match.matched).toBe(true);
    expect(result.po_reference_match.matched).toBe(true);
    expect(result.discrepancies.length).toBe(0);
  });

  it('flags quantity differences in line items', () => {
    const qtyMismatchInvoice: InvoiceExtraction = {
      schema_version: 'invoice.v1',
      invoice_number: 'INV-4401',
      supplier_name: 'TechGear Solutions Inc.',
      purchase_order_reference: 'PO-8820',
      currency: 'USD',
      subtotal: '2810.00',
      tax_amount: '0.00',
      total_amount: '2810.00',
      line_items: [
        { description: 'UltraSharp 27" 4K Monitor', quantity: '5', unit_price: '450.00', line_total: '2250.00' }, // 5 instead of 4
        { description: 'Thunderbolt 4 Docking Station', quantity: '4', unit_price: '140.00', line_total: '560.00' },
      ],
      field_evidence: [],
      uncertainties: [],
      warnings: [],
    };

    const result = reconciliationService.reconcile(qtyMismatchInvoice, samplePO);
    expect(result.match_status).toBe('mismatched');
    expect(result.discrepancies.some(d => d.includes('Quantity difference'))).toBe(true);
    expect(result.amount_comparison.within_tolerance).toBe(false);
  });

  it('flags price variance in line items', () => {
    const priceMismatchInvoice: InvoiceExtraction = {
      schema_version: 'invoice.v1',
      invoice_number: 'INV-4401',
      supplier_name: 'TechGear Solutions Inc.',
      purchase_order_reference: 'PO-8820',
      currency: 'USD',
      subtotal: '2560.00',
      tax_amount: '0.00',
      total_amount: '2560.00',
      line_items: [
        { description: 'UltraSharp 27" 4K Monitor', quantity: '4', unit_price: '500.00', line_total: '2000.00' }, // $500 instead of $450
        { description: 'Thunderbolt 4 Docking Station', quantity: '4', unit_price: '140.00', line_total: '560.00' },
      ],
      field_evidence: [],
      uncertainties: [],
      warnings: [],
    };

    const result = reconciliationService.reconcile(priceMismatchInvoice, samplePO);
    expect(result.match_status).toBe('mismatched');
    expect(result.discrepancies.some(d => d.includes('Unit price variance'))).toBe(true);
  });

  it('flags supplier and currency mismatches', () => {
    const mismatchInvoice: InvoiceExtraction = {
      schema_version: 'invoice.v1',
      invoice_number: 'INV-4401',
      supplier_name: 'Completely Different Vendor LLC',
      purchase_order_reference: 'PO-8820',
      currency: 'EUR', // EUR vs USD
      subtotal: '2360.00',
      tax_amount: '0.00',
      total_amount: '2360.00',
      line_items: [],
      field_evidence: [],
      uncertainties: [],
      warnings: [],
    };

    const result = reconciliationService.reconcile(mismatchInvoice, samplePO);
    expect(result.supplier_match.matched).toBe(false);
    expect(result.currency_match.matched).toBe(false);
    expect(result.discrepancies.some(d => d.includes('Supplier mismatch'))).toBe(true);
    expect(result.discrepancies.some(d => d.includes('Currency mismatch'))).toBe(true);
  });
});
