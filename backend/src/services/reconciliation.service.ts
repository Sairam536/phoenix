import {
  InvoiceExtraction,
  PurchaseOrderExtraction,
  ComparisonResult,
  LineItemComparison,
  ToleranceConfig,
  ReconciliationStatus,
} from '../shared/index.js';
import { toCents, fromCents, areAmountsEqualWithinTolerance } from '../utils/decimal.js';

export class ReconciliationService {
  /**
   * Reconciles an extracted invoice against an extracted purchase order
   */
  reconcile(
    invoice: InvoiceExtraction,
    po: PurchaseOrderExtraction,
    tolerance: ToleranceConfig = { amount_tolerance: 0.01, percentage_tolerance: 0.5 }
  ): ComparisonResult {
    const discrepancies: string[] = [];

    // 1. Supplier comparison
    const invSupplier = (invoice.supplier_name || '').trim();
    const poSupplier = (po.supplier_name || '').trim();
    const supplierMatched =
      invSupplier.length > 0 &&
      poSupplier.length > 0 &&
      (invSupplier.toLowerCase().includes(poSupplier.toLowerCase()) ||
        poSupplier.toLowerCase().includes(invSupplier.toLowerCase()));

    if (!supplierMatched) {
      discrepancies.push(`Supplier mismatch: Invoice lists "${invSupplier || 'Unknown'}" but PO lists "${poSupplier || 'Unknown'}".`);
    }

    // 2. Currency comparison
    const invCurrency = (invoice.currency || '').toUpperCase();
    const poCurrency = (po.currency || '').toUpperCase();
    const currencyMatched = invCurrency === poCurrency && invCurrency.length > 0;

    if (!currencyMatched) {
      discrepancies.push(`Currency mismatch: Invoice is in ${invCurrency || 'Unknown'} while PO is in ${poCurrency || 'Unknown'}.`);
    }

    // 3. PO reference check
    const expectedPo = (po.purchase_order_number || '').trim();
    const invPoRef = (invoice.purchase_order_reference || '').trim();
    const poRefMatched =
      expectedPo.length > 0 &&
      invPoRef.length > 0 &&
      (invPoRef.toLowerCase() === expectedPo.toLowerCase() || invPoRef.includes(expectedPo) || expectedPo.includes(invPoRef));

    if (!poRefMatched) {
      discrepancies.push(`PO Reference mismatch: Expected ${expectedPo || 'None'} but invoice referenced "${invPoRef || 'None'}".`);
    }

    // 4. Amounts comparison
    const invSubtotal = invoice.subtotal ? parseFloat(invoice.subtotal) : null;
    const poSubtotal = po.subtotal ? parseFloat(po.subtotal) : null;
    const subtotalDiff = invSubtotal !== null && poSubtotal !== null ? Math.round((invSubtotal - poSubtotal) * 100) / 100 : 0;

    const invTax = invoice.tax_amount ? parseFloat(invoice.tax_amount) : null;
    const poTax = po.tax_amount ? parseFloat(po.tax_amount) : null;
    const taxDiff = invTax !== null && poTax !== null ? Math.round((invTax - poTax) * 100) / 100 : 0;

    const invTotal = invoice.total_amount ? parseFloat(invoice.total_amount) : null;
    const poTotal = po.total_amount ? parseFloat(po.total_amount) : null;
    const totalDiff = invTotal !== null && poTotal !== null ? Math.round((invTotal - poTotal) * 100) / 100 : 0;

    const totalWithinTolerance =
      invTotal !== null &&
      poTotal !== null &&
      areAmountsEqualWithinTolerance(invTotal, poTotal, tolerance.amount_tolerance);

    if (!totalWithinTolerance) {
      discrepancies.push(
        `Total amount variance: Invoice total ($${invTotal?.toFixed(2) || '0.00'}) exceeds PO total ($${poTotal?.toFixed(2) || '0.00'}) by $${totalDiff.toFixed(2)}.`
      );
    }

    // 5. Line item comparisons
    const lineItemComparisons: LineItemComparison[] = [];
    const invItems = invoice.line_items || [];
    const poItems = po.line_items || [];

    const matchedPoIndexes = new Set<number>();

    invItems.forEach((invItem, invIdx) => {
      // Find matching PO item by description substring
      let foundPoIdx = -1;
      const invDesc = invItem.description.toLowerCase();

      for (let pIdx = 0; pIdx < poItems.length; pIdx++) {
        if (matchedPoIndexes.has(pIdx)) continue;
        const poDesc = poItems[pIdx].description.toLowerCase();
        if (invDesc.includes(poDesc) || poDesc.includes(invDesc)) {
          foundPoIdx = pIdx;
          break;
        }
      }

      // If not found by description, fallback to matching by exact index if lengths match
      if (foundPoIdx === -1 && invIdx < poItems.length && !matchedPoIndexes.has(invIdx)) {
        foundPoIdx = invIdx;
      }

      if (foundPoIdx !== -1) {
        matchedPoIndexes.add(foundPoIdx);
        const poItem = poItems[foundPoIdx];

        const invQty = invItem.quantity ? parseFloat(invItem.quantity) : null;
        const poQty = poItem.quantity ? parseFloat(poItem.quantity) : null;
        const qtyDiff = invQty !== null && poQty !== null ? invQty - poQty : null;

        const invPrice = invItem.unit_price ? parseFloat(invItem.unit_price) : null;
        const poPrice = poItem.unit_price ? parseFloat(poItem.unit_price) : null;
        const priceDiff = invPrice !== null && poPrice !== null ? Math.round((invPrice - poPrice) * 100) / 100 : null;

        let status: LineItemComparison['status'] = 'matched';
        let note = 'Line items match';

        if (qtyDiff !== null && Math.abs(qtyDiff) > 0.001) {
          status = 'quantity_diff';
          note = `Quantity difference: Invoice (${invQty}) vs PO (${poQty})`;
          discrepancies.push(`Line item "${invItem.description}": ${note}`);
        } else if (priceDiff !== null && Math.abs(priceDiff) > tolerance.amount_tolerance) {
          status = 'price_diff';
          note = `Unit price variance: Invoice ($${invPrice}) vs PO ($${poPrice})`;
          discrepancies.push(`Line item "${invItem.description}": ${note}`);
        }

        lineItemComparisons.push({
          invoice_line_index: invIdx,
          po_line_index: foundPoIdx,
          description: invItem.description,
          invoice_quantity: invQty,
          po_quantity: poQty,
          quantity_diff: qtyDiff,
          invoice_price: invPrice,
          po_price: poPrice,
          price_diff: priceDiff,
          status,
          note,
        });
      } else {
        // Line item on invoice not present on PO
        discrepancies.push(`Line item "${invItem.description}" on invoice does not appear in Purchase Order.`);
        lineItemComparisons.push({
          invoice_line_index: invIdx,
          po_line_index: null,
          description: invItem.description,
          invoice_quantity: invItem.quantity ? parseFloat(invItem.quantity) : null,
          po_quantity: null,
          quantity_diff: null,
          invoice_price: invItem.unit_price ? parseFloat(invItem.unit_price) : null,
          po_price: null,
          price_diff: null,
          status: 'missing_in_po',
          note: 'Item not listed on PO',
        });
      }
    });

    // Check for PO items missing in invoice
    poItems.forEach((poItem, pIdx) => {
      if (!matchedPoIndexes.has(pIdx)) {
        discrepancies.push(`PO line item "${poItem.description}" was not billed in this invoice.`);
        lineItemComparisons.push({
          invoice_line_index: null,
          po_line_index: pIdx,
          description: poItem.description,
          invoice_quantity: null,
          po_quantity: poItem.quantity ? parseFloat(poItem.quantity) : null,
          quantity_diff: null,
          invoice_price: null,
          po_price: poItem.unit_price ? parseFloat(poItem.unit_price) : null,
          price_diff: null,
          status: 'missing_in_invoice',
          note: 'Item on PO not found in Invoice',
        });
      }
    });

    // Final status
    const match_status: ReconciliationStatus =
      discrepancies.length === 0 ? 'matched' : 'mismatched';

    return {
      match_status,
      supplier_match: {
        matched: supplierMatched,
        invoice_supplier: invSupplier,
        po_supplier: poSupplier,
      },
      currency_match: {
        matched: currencyMatched,
        invoice_currency: invCurrency,
        po_currency: poCurrency,
      },
      po_reference_match: {
        matched: poRefMatched,
        expected_po: expectedPo,
        invoice_referenced_po: invPoRef,
      },
      amount_comparison: {
        invoice_subtotal: invSubtotal,
        po_subtotal: poSubtotal,
        subtotal_diff: subtotalDiff,
        invoice_tax: invTax,
        po_tax: poTax,
        tax_diff: taxDiff,
        invoice_total: invTotal,
        po_total: poTotal,
        total_diff: totalDiff,
        within_tolerance: totalWithinTolerance,
      },
      line_item_comparisons: lineItemComparisons,
      discrepancies,
    };
  }
}

export const reconciliationService = new ReconciliationService();
