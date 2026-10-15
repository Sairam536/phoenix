import {
  InvoiceExtraction,
  PurchaseOrderExtraction,
  ValidationIssue,
  SUPPORTED_CURRENCIES,
} from '../shared/index.js';
import { v4 as uuidv4 } from 'uuid';
import { areAmountsEqualWithinTolerance, toCents, fromCents, safeMultiply } from '../utils/decimal.js';
import { inMemoryDb } from '../repositories/db.js';

export interface ValidationResult {
  isValid: boolean;
  issues: Array<Omit<ValidationIssue, 'id' | 'created_at'>>;
}

export class ValidationService {
  /**
   * Deterministic validation rules for invoices
   */
  validateInvoice(
    invoice: InvoiceExtraction,
    orgId: string,
    docId: string,
    toleranceAmount = 0.05
  ): ValidationResult {
    const issues: Array<Omit<ValidationIssue, 'id' | 'created_at'>> = [];

    // 1. Missing Required Fields
    if (!invoice.invoice_number || invoice.invoice_number.trim() === '') {
      issues.push({
        organization_id: orgId,
        document_id: docId,
        extraction_result_id: null,
        rule_code: 'MISSING_REQUIRED_FIELD',
        severity: 'critical',
        field_path: 'invoice_number',
        message: 'Invoice number is missing from extracted fields.',
        expected_value: 'Valid invoice identifier',
        actual_value: null,
        status: 'open',
      });
    }

    if (!invoice.total_amount || invoice.total_amount.trim() === '') {
      issues.push({
        organization_id: orgId,
        document_id: docId,
        extraction_result_id: null,
        rule_code: 'MISSING_REQUIRED_FIELD',
        severity: 'critical',
        field_path: 'total_amount',
        message: 'Total amount is missing from invoice.',
        expected_value: 'Monetary decimal value',
        actual_value: null,
        status: 'open',
      });
    }

    // 2. Date Format & Logical Order
    if (invoice.invoice_date) {
      const invDate = new Date(invoice.invoice_date);
      if (isNaN(invDate.getTime())) {
        issues.push({
          organization_id: orgId,
          document_id: docId,
          extraction_result_id: null,
          rule_code: 'INVALID_DATE_FORMAT',
          severity: 'error',
          field_path: 'invoice_date',
          message: `Invoice date "${invoice.invoice_date}" cannot be parsed into a valid date.`,
          expected_value: 'YYYY-MM-DD',
          actual_value: invoice.invoice_date,
          status: 'open',
        });
      }

      if (invoice.due_date) {
        const dueDate = new Date(invoice.due_date);
        if (isNaN(dueDate.getTime())) {
          issues.push({
            organization_id: orgId,
            document_id: docId,
            extraction_result_id: null,
            rule_code: 'INVALID_DATE_FORMAT',
            severity: 'error',
            field_path: 'due_date',
            message: `Due date "${invoice.due_date}" cannot be parsed into a valid date.`,
            expected_value: 'YYYY-MM-DD',
            actual_value: invoice.due_date,
            status: 'open',
          });
        } else if (dueDate < invDate) {
          issues.push({
            organization_id: orgId,
            document_id: docId,
            extraction_result_id: null,
            rule_code: 'DUE_DATE_BEFORE_INVOICE_DATE',
            severity: 'warning',
            field_path: 'due_date',
            message: `Invoice due date (${invoice.due_date}) occurs before the issue date (${invoice.invoice_date}).`,
            expected_value: `Date >= ${invoice.invoice_date}`,
            actual_value: invoice.due_date,
            status: 'open',
          });
        }
      }
    }

    // 3. Supported Currency Code
    if (invoice.currency) {
      const upperCurr = invoice.currency.toUpperCase();
      if (!SUPPORTED_CURRENCIES.includes(upperCurr as (typeof SUPPORTED_CURRENCIES)[number])) {
        issues.push({
          organization_id: orgId,
          document_id: docId,
          extraction_result_id: null,
          rule_code: 'UNSUPPORTED_CURRENCY',
          severity: 'warning',
          field_path: 'currency',
          message: `Currency code "${invoice.currency}" is not in the organization's recognized currency list.`,
          expected_value: SUPPORTED_CURRENCIES.join(', '),
          actual_value: invoice.currency,
          status: 'open',
        });
      }
    }

    // 4. Line Item Arithmetic
    if (invoice.line_items && invoice.line_items.length > 0) {
      invoice.line_items.forEach((item, index) => {
        if (item.quantity && item.unit_price && item.line_total) {
          const expectedTotal = safeMultiply(item.quantity, item.unit_price);
          const actualTotal = fromCents(toCents(item.line_total));

          if (!areAmountsEqualWithinTolerance(expectedTotal, actualTotal, toleranceAmount)) {
            issues.push({
              organization_id: orgId,
              document_id: docId,
              extraction_result_id: null,
              rule_code: 'LINE_ITEM_ARITHMETIC_MISMATCH',
              severity: 'error',
              field_path: `line_items[${index}].line_total`,
              message: `Line item #${index + 1} (${item.description}) total ($${actualTotal}) does not match Quantity (${item.quantity}) * Unit Price ($${item.unit_price}) = $${expectedTotal}.`,
              expected_value: expectedTotal.toFixed(2),
              actual_value: actualTotal.toFixed(2),
              status: 'open',
            });
          }
        }
      });
    }

    // 5. Total Reconciliation: Subtotal + Tax - Discount == Total
    if (invoice.total_amount) {
      const subtotalCents = toCents(invoice.subtotal);
      const taxCents = toCents(invoice.tax_amount);
      const discountCents = toCents(invoice.discount);
      const totalCents = toCents(invoice.total_amount);

      if (subtotalCents > 0) {
        const expectedTotalCents = subtotalCents + taxCents - discountCents;
        const diffCents = Math.abs(expectedTotalCents - totalCents);
        const maxTolCents = Math.round(toleranceAmount * 100);

        if (diffCents > maxTolCents) {
          issues.push({
            organization_id: orgId,
            document_id: docId,
            extraction_result_id: null,
            rule_code: 'TOTAL_TAX_SUBTOTAL_MISMATCH',
            severity: 'critical',
            field_path: 'total_amount',
            message: `Invoice total ($${fromCents(totalCents).toFixed(2)}) does not reconcile with Subtotal ($${fromCents(subtotalCents).toFixed(2)}) + Tax ($${fromCents(taxCents).toFixed(2)}) - Discount ($${fromCents(discountCents).toFixed(2)}). Variance: $${fromCents(diffCents).toFixed(2)}.`,
            expected_value: fromCents(expectedTotalCents).toFixed(2),
            actual_value: fromCents(totalCents).toFixed(2),
            status: 'open',
          });
        }
      }
    }

    // 6. Purchase Order Reference Advisory
    if (!invoice.purchase_order_reference) {
      issues.push({
        organization_id: orgId,
        document_id: docId,
        extraction_result_id: null,
        rule_code: 'MISSING_PURCHASE_ORDER_REFERENCE',
        severity: 'info',
        field_path: 'purchase_order_reference',
        message: 'No purchase order reference was extracted. Manual PO reconciliation may be required.',
        expected_value: 'PO reference number',
        actual_value: null,
        status: 'open',
      });
    }

    // 7. Duplicate Invoice Detection within Organization
    if (invoice.invoice_number) {
      const existing = inMemoryDb.extractedFields.find(
        f =>
          f.organization_id === orgId &&
          f.document_id !== docId &&
          f.field_path === 'invoice_number' &&
          String(f.normalized_value).toLowerCase() === invoice.invoice_number!.toLowerCase()
      );

      if (existing) {
        issues.push({
          organization_id: orgId,
          document_id: docId,
          extraction_result_id: null,
          rule_code: 'DUPLICATE_INVOICE_NUMBER',
          severity: 'warning',
          field_path: 'invoice_number',
          message: `Invoice number "${invoice.invoice_number}" was already processed in document ${existing.document_id}.`,
          expected_value: 'Unique invoice number',
          actual_value: invoice.invoice_number,
          status: 'open',
        });
      }
    }

    return {
      isValid: issues.filter(i => i.severity === 'critical' || i.severity === 'error').length === 0,
      issues,
    };
  }
}

export const validationService = new ValidationService();
